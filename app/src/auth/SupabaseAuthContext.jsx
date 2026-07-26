import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseEnabled } from "../supabaseClient.js";

const SupabaseAuthContext = createContext(null);

export function useSupabaseAuth() {
  return useContext(SupabaseAuthContext);
}

// Gates access behind real Supabase Auth (Google OAuth) + a profiles row,
// so `is_admin`/`is_steward` and everything the Admin Console reads is
// real, not a client-side flag. If no Supabase project is configured yet
// (VITE_SUPABASE_URL/ANON_KEY unset), this steps aside entirely and
// renders children directly — the existing prototype's own mock landing
// flow (email/phone/OTP/ID stub) keeps working exactly as before. See
// CLAUDE.md "Beta -> launch technical requirements" for why both exist
// side by side during this migration.
export function SupabaseAuthGate({ children }) {
  let [session, setSession] = useState(null),
    [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(supabaseEnabled),
    [onboardAge, setOnboardAge] = useState(false),
    [onboardName, setOnboardName] = useState(""),
    [idFile, setIdFile] = useState(null),
    [onboardError, setOnboardError] = useState("");

  let loadProfile = async (userId) => {
    let { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data ?? null);
  };

  useEffect(() => {
    if (!supabaseEnabled) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    let { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) loadProfile(newSession.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Stripe redirects here with ?stripe=return after hosted Connect
  // onboarding. Don't wait on the account.updated webhook to reflect
  // completion — actively re-check status against Stripe right away (the
  // webhook can lag or, for classic Express accounts, may not reach an
  // account-scoped destination at all under newer Stripe API versions).
  useEffect(() => {
    if (!session) return;
    let params = new URLSearchParams(window.location.search);
    if (params.get("stripe") !== "return") return;
    supabase.functions
      .invoke("stripe-connect-refresh-status", { method: "POST" })
      .finally(() => {
        let url = new URL(window.location.href);
        url.searchParams.delete("stripe");
        window.history.replaceState({}, "", url);
      });
  }, [session]);

  if (!supabaseEnabled) return children;
  if (loading) return null;

  if (!session) {
    return (
      <div className="gate">
        <div className="gate-card">
          <div className="crest">✦</div>
          <h1 className="brand">The Guild Masters</h1>
          <p className="brand-sub">Companion to The Tavern · High Fantasy Chapter</p>
          <p className="gate-copy">
            Real quests. Real neighbors. Real progression. Sign in to begin.
          </p>
          <button
            className="btn gold"
            onClick={() => supabase.auth.signInWithOAuth({ provider: "google" })}
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    let submitOnboarding = async () => {
      setOnboardError("");
      if (!onboardAge || !onboardName.trim()) {
        setOnboardError("Confirm you're 18+ and choose an adventurer name.");
        return;
      }
      let { error: insertErr } = await supabase.from("profiles").insert({
        id: session.user.id,
        display_name: onboardName.trim(),
        age_confirmed: true,
      });
      if (insertErr) {
        setOnboardError(insertErr.message);
        return;
      }
      if (idFile) {
        let path = `${session.user.id}/${Date.now()}-${idFile.name}`;
        let { error: uploadErr } = await supabase.storage
          .from("id-verifications")
          .upload(path, idFile);
        if (!uploadErr) {
          await supabase.from("id_verifications").insert({
            profile_id: session.user.id,
            file_path: path,
          });
          await supabase.from("profiles").update({ id_verification_status: "pending" }).eq("id", session.user.id);
        }
      }
      await loadProfile(session.user.id);
    };

    return (
      <div className="gate">
        <div className="gate-card">
          <div className="crest">✦</div>
          <h1 className="brand">The Guild Masters</h1>
          <p className="gate-copy">Welcome, recruit. Every legend begins at Rank F.</p>
          <label className="field-label">Adventurer name</label>
          <input
            className="field"
            value={onboardName}
            onChange={(e) => setOnboardName(e.target.value)}
            placeholder="e.g. Wren of the North Market"
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={onboardAge}
              onChange={(e) => setOnboardAge(e.target.checked)}
            />
            <span>I confirm I am 18 years or older</span>
          </label>
          <label className="field-label">
            Government ID (optional now, required for D+ rank — reviewed
            manually by guild staff, never shown to other adventurers)
          </label>
          <input
            className="field"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
          />
          {onboardError && <p className="fine">{onboardError}</p>}
          <button className="btn gold" onClick={submitOnboarding}>
            Take the Guild Oath
          </button>
        </div>
      </div>
    );
  }

  return (
    <SupabaseAuthContext.Provider
      value={{
        session,
        profile,
        refreshProfile: () => loadProfile(session.user.id),
        signOut: () => supabase.auth.signOut(),
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}
