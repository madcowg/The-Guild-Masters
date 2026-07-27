// Returns postings needing flavor text, for the local quest-flavor worker
// to pick up. Not user-invoked, so it checks a shared secret instead of a
// Supabase JWT -- this function has "Verify JWT" turned off in its
// settings, same as quest-expire-sweep. The secret lives only in Supabase
// Vault (migration 0010), verified via check_flavor_secret() -- never held
// as a literal value in this function's own env or code.
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

  const { data: pending } = await admin
    .from("postings")
    .select("id, title, description")
    .eq("flavor_status", "pending")
    .order("created_at")
    .limit(10);

  return new Response(JSON.stringify({ postings: pending ?? [] }), {
    headers: { "Content-Type": "application/json" },
  });
});
