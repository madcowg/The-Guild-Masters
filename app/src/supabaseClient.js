import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Real backend is optional during this migration — the existing
// prototype game (boards/quests/party/etc.) still runs entirely on
// window.storage/localStorage. Only Supabase Auth + the Admin Console
// (venues, roles, ID verification) go through this client so far.
export const supabaseEnabled = Boolean(url && anonKey);

export const supabase = supabaseEnabled ? createClient(url, anonKey) : null;
