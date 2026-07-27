// Writes the local quest-flavor worker's result back, or marks a posting
// skipped. Same secret-based auth as quest-flavor-queue (see that file's
// comment) -- "Verify JWT" is off here too. The actual write goes through
// apply_quest_flavor() (migration 0010), which only ever touches
// flavor_title/flavor_description/flavor_status and only while a posting
// is still 'pending' -- this function has no broader UPDATE reach than
// that one RPC call.
import { createClient } from "npm:@supabase/supabase-js@2";

function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  const presented = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!presented) return new Response("unauthorized", { status: 401 });

  const admin = supabaseAdmin();
  const { data: validSecret } = await admin.rpc("check_flavor_secret", { token: presented });
  if (!validSecret) return new Response("unauthorized", { status: 401 });

  const { posting_id, flavor_title, flavor_description, skip } = await req.json();
  if (!posting_id) return new Response(JSON.stringify({ error: "posting_id is required" }), { status: 400 });

  const { data: updated, error } = await admin.rpc("apply_quest_flavor", {
    p_posting_id: posting_id,
    p_flavor_title: flavor_title ?? null,
    p_flavor_description: flavor_description ?? null,
    p_skip: !!skip,
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ ok: !!updated }), {
    headers: { "Content-Type": "application/json" },
  });
});
