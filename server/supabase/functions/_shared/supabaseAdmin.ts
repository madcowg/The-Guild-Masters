// Service-role client for use inside Edge Functions only — never ship the
// service role key to the frontend. Bypasses RLS, so every call site here
// must do its own authorization check before writing.
import { createClient } from "npm:@supabase/supabase-js@2";

export function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

// Resolves the calling user's profile from the request's Authorization
// header (the frontend's user-scoped Supabase session JWT), so an Edge
// Function can verify who's asking before doing anything privileged.
export async function callerProfile(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return null;
  const admin = supabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();
  return profile ?? null;
}
