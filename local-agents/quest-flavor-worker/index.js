// Polls The Guild Masters' Supabase project for postings needing flavor
// text (quest-flavor-queue), rewrites title/description via local Ollama
// (llama3.1), falling back to the Anthropic Messages API if Ollama is
// unreachable, and writes the result back (quest-flavor-apply). See
// local-agents/quest-flavor-worker/.env.example for required config.
//
// Auth: FLAVOR_WORKER_SECRET is the plaintext of the
// quest_flavor_worker_secret Vault secret (migration 0010) -- retrieve it
// yourself via the Supabase SQL editor, never via an automated tool. This
// worker never holds the Supabase service_role key.
process.loadEnvFile(new URL(".env", import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const FLAVOR_WORKER_SECRET = process.env.FLAVOR_WORKER_SECRET;
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_FALLBACK_MODEL = process.env.ANTHROPIC_FALLBACK_MODEL;
const POLL_INTERVAL_MS = 10_000;
const MAX_FAILURES_BEFORE_SKIP = 5;

if (!SUPABASE_URL || !FLAVOR_WORKER_SECRET) {
  console.error("SUPABASE_URL and FLAVOR_WORKER_SECRET are required (see .env.example).");
  process.exit(1);
}

const SYSTEM_PROMPT = `You rewrite quest-board posting text for a high-fantasy guild-quest app.
Rewrite the title and description ONLY for theme and fun -- guild-quest-board flavor.
Do NOT change, remove, or add any concrete requirement, quantity, deadline, location, or success criterion described in the original text. The reader must still know exactly what to do and how success is judged.
Respond with JSON only, no other text, in exactly this shape: {"title": "...", "description": "..."}`;

const failureCounts = new Map();

function withTimeout(ms) {
  return AbortSignal.timeout(ms);
}

async function callOllama(title, description) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ title, description }) },
      ],
      format: "json",
      stream: false,
    }),
    signal: withTimeout(30_000),
  });
  if (!res.ok) throw new Error(`ollama http ${res.status}`);
  const data = await res.json();
  const parsed = JSON.parse(data.message.content);
  if (!parsed.title || !parsed.description) throw new Error("ollama response missing title/description");
  return parsed;
}

async function callAnthropic(title, description) {
  if (!ANTHROPIC_API_KEY || !ANTHROPIC_FALLBACK_MODEL) {
    throw new Error("Anthropic fallback not configured (ANTHROPIC_API_KEY/ANTHROPIC_FALLBACK_MODEL)");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_FALLBACK_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify({ title, description }) }],
    }),
    signal: withTimeout(30_000),
  });
  if (!res.ok) throw new Error(`anthropic http ${res.status}`);
  const data = await res.json();
  const textBlock = data.content.find((b) => b.type === "text");
  const parsed = JSON.parse(textBlock.text);
  if (!parsed.title || !parsed.description) throw new Error("anthropic response missing title/description");
  return parsed;
}

async function fetchQueue() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/quest-flavor-queue`, {
    method: "POST",
    headers: { Authorization: `Bearer ${FLAVOR_WORKER_SECRET}` },
    signal: withTimeout(15_000),
  });
  if (!res.ok) throw new Error(`quest-flavor-queue http ${res.status}`);
  const data = await res.json();
  return data.postings || [];
}

async function applyFlavor(postingId, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/quest-flavor-apply`, {
    method: "POST",
    headers: { Authorization: `Bearer ${FLAVOR_WORKER_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({ posting_id: postingId, ...payload }),
    signal: withTimeout(15_000),
  });
  if (!res.ok) throw new Error(`quest-flavor-apply http ${res.status}`);
  const data = await res.json();
  return !!data.ok;
}

async function processPosting(posting) {
  let result;
  try {
    result = await callOllama(posting.title, posting.description);
  } catch (ollamaErr) {
    console.warn(`[${posting.id}] Ollama failed (${ollamaErr.message}), trying Anthropic fallback`);
    try {
      result = await callAnthropic(posting.title, posting.description);
    } catch (anthropicErr) {
      console.error(`[${posting.id}] both providers failed: ${anthropicErr.message}`);
      const count = (failureCounts.get(posting.id) || 0) + 1;
      failureCounts.set(posting.id, count);
      if (count >= MAX_FAILURES_BEFORE_SKIP) {
        await applyFlavor(posting.id, { skip: true });
        failureCounts.delete(posting.id);
        console.warn(`[${posting.id}] marked skipped after ${count} consecutive failures`);
      }
      return;
    }
  }
  failureCounts.delete(posting.id);
  const applied = await applyFlavor(posting.id, {
    flavor_title: result.title,
    flavor_description: result.description,
  });
  if (applied) {
    console.log(`[${posting.id}] flavored: "${posting.title}" -> "${result.title}"`);
  } else {
    console.log(`[${posting.id}] already handled by another pass, discarding this result`);
  }
}

async function pollOnce() {
  let postings;
  try {
    postings = await fetchQueue();
  } catch (err) {
    console.error(`queue fetch failed: ${err.message}`);
    return;
  }
  for (const posting of postings) {
    try {
      await processPosting(posting);
    } catch (err) {
      console.error(`[${posting.id}] unexpected error: ${err.message}`);
    }
  }
}

// Self-rescheduling timeout (not setInterval) so a poll that runs longer
// than POLL_INTERVAL_MS -- routine with Ollama's model-load + generation
// time -- can never overlap with the next one and double-process the same
// posting.
async function pollLoop() {
  await pollOnce();
  setTimeout(pollLoop, POLL_INTERVAL_MS);
}

console.log(`quest-flavor-worker started, polling every ${POLL_INTERVAL_MS / 1000}s`);
pollLoop();
