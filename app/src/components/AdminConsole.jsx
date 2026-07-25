import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

// Real backend-backed admin control panel — separate from the existing
// prototype Steward's Ledger (which still runs on local/simulated game
// data). Gated on profiles.is_admin, a rank-independent flag set only via
// the admin_set_role RPC (never self-service). See CLAUDE.md "Beta ->
// launch technical requirements", Tier 1 #2.
export function AdminConsole({ profile, onBack }) {
  let [chapter, setChapter] = useState(null),
    [venues, setVenues] = useState([]),
    [verifications, setVerifications] = useState([]),
    [error, setError] = useState(""),
    [newVenue, setNewVenue] = useState({
      name: "",
      address: "",
      lat: "",
      lng: "",
      geofence_radius_m: 150,
      promo_terms: "",
    });

  let loadAll = async () => {
    if (!profile.chapter_id) return;
    let [{ data: chapterRow }, { data: venueRows }, { data: pendingIds }] = await Promise.all([
      supabase.from("chapters").select("*").eq("id", profile.chapter_id).maybeSingle(),
      supabase.from("venues").select("*").eq("chapter_id", profile.chapter_id).order("created_at"),
      supabase
        .from("id_verifications")
        .select("*, profiles!id_verifications_profile_id_fkey(display_name)")
        .eq("status", "pending"),
    ]);
    setChapter(chapterRow ?? null);
    setVenues(venueRows ?? []);
    setVerifications(pendingIds ?? []);
  };

  useEffect(() => {
    loadAll();
  }, [profile.chapter_id]);

  let setActiveVenue = async (venueId) => {
    setError("");
    let { error: rpcErr } = await supabase.rpc("admin_set_active_venue", {
      p_chapter_id: profile.chapter_id,
      p_venue_id: venueId,
    });
    if (rpcErr) setError(rpcErr.message);
    else loadAll();
  };

  let createVenue = async () => {
    setError("");
    let lat = Number(newVenue.lat),
      lng = Number(newVenue.lng);
    if (!newVenue.name.trim() || !newVenue.address.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Name, address, and numeric coordinates are required.");
      return;
    }
    let { error: rpcErr } = await supabase.rpc("admin_create_venue", {
      p_chapter_id: profile.chapter_id,
      p_name: newVenue.name.trim(),
      p_address: newVenue.address.trim(),
      p_lat: lat,
      p_lng: lng,
      p_geofence_radius_m: Number(newVenue.geofence_radius_m) || 150,
      p_promo_terms: newVenue.promo_terms.trim() || null,
    });
    if (rpcErr) setError(rpcErr.message);
    else {
      setNewVenue({ name: "", address: "", lat: "", lng: "", geofence_radius_m: 150, promo_terms: "" });
      loadAll();
    }
  };

  let reviewVerification = async (id, approve) => {
    setError("");
    let { error: rpcErr } = await supabase.rpc("admin_review_id_verification", {
      p_verification_id: id,
      p_approve: approve,
    });
    if (rpcErr) setError(rpcErr.message);
    else loadAll();
  };

  let [signedUrls, setSignedUrls] = useState({});
  let viewDocument = async (filePath) => {
    let { data } = await supabase.storage.from("id-verifications").createSignedUrl(filePath, 120);
    if (data?.signedUrl) setSignedUrls((s) => ({ ...s, [filePath]: data.signedUrl }));
  };

  if (!profile.is_admin) return null;

  return (
    <section>
      <div className="profile-head">
        <h2 className="h2" style={{ margin: 0 }}>
          Admin Console
        </h2>
        <button className="btn ghost" onClick={onBack}>
          Back
        </button>
      </div>
      {error && <p className="fine">{error}</p>}

      <div className="bucket steward-ledger">
        <h3 className="h3">The Tavern — venue management</h3>
        <p className="qr-sub">
          One active venue per chapter at a time. Only the Guild Council can
          change it — no player or steward has this control, regardless of
          rank.
        </p>
        <h4 className="h4">
          Current chapter: {chapter?.name ?? "—"}
        </h4>
        <p className="qr-sub">
          Active venue:{" "}
          {venues.find((v) => v.id === chapter?.active_venue_id)?.name ?? "None set yet"}
        </p>
        {venues.map((v) => (
          <div key={v.id} className="quest-row">
            <div className="qr-main">
              <div className="qr-title">{v.name}</div>
              <div className="qr-sub">
                {v.address} · {v.lat}, {v.lng} · {v.geofence_radius_m}m geofence
              </div>
            </div>
            {v.id === chapter?.active_venue_id ? (
              <div className="qr-sub">Active</div>
            ) : (
              <button className="btn tiny gold" onClick={() => setActiveVenue(v.id)}>
                Make active
              </button>
            )}
          </div>
        ))}
        {venues.length === 0 && <p className="empty">No partner venues yet.</p>}

        <h4 className="h4">Add a partner venue</h4>
        <input
          className="field"
          placeholder="Venue name"
          value={newVenue.name}
          onChange={(e) => setNewVenue((n) => ({ ...n, name: e.target.value }))}
        />
        <input
          className="field"
          placeholder="Address"
          value={newVenue.address}
          onChange={(e) => setNewVenue((n) => ({ ...n, address: e.target.value }))}
        />
        <input
          className="field"
          placeholder="Latitude"
          value={newVenue.lat}
          onChange={(e) => setNewVenue((n) => ({ ...n, lat: e.target.value }))}
        />
        <input
          className="field"
          placeholder="Longitude"
          value={newVenue.lng}
          onChange={(e) => setNewVenue((n) => ({ ...n, lng: e.target.value }))}
        />
        <input
          className="field"
          placeholder="Geofence radius (meters)"
          value={newVenue.geofence_radius_m}
          onChange={(e) => setNewVenue((n) => ({ ...n, geofence_radius_m: e.target.value }))}
        />
        <input
          className="field"
          placeholder="Promo terms (optional)"
          value={newVenue.promo_terms}
          onChange={(e) => setNewVenue((n) => ({ ...n, promo_terms: e.target.value }))}
        />
        <button className="btn gold" onClick={createVenue}>
          Add venue
        </button>
      </div>

      <div className="bucket steward-ledger">
        <h3 className="h3">ID verification queue</h3>
        <p className="qr-sub">
          Manual review for now — no third-party verification vendor
          integrated yet (deferred pending vendor choice + legal review).
        </p>
        {verifications.length === 0 && <p className="empty">Nothing pending.</p>}
        {verifications.map((v) => (
          <div key={v.id} className="quest-row">
            <div className="qr-main">
              <div className="qr-title">{v.profiles?.display_name ?? "Unknown member"}</div>
              {signedUrls[v.file_path] ? (
                <a className="qr-sub" href={signedUrls[v.file_path]} target="_blank" rel="noreferrer">
                  View uploaded document
                </a>
              ) : (
                <button className="btn tiny ghost" onClick={() => viewDocument(v.file_path)}>
                  Load document
                </button>
              )}
            </div>
            <div className="pet-actions">
              <button className="btn tiny gold" onClick={() => reviewVerification(v.id, true)}>
                Verify
              </button>
              <button className="btn tiny ghost" onClick={() => reviewVerification(v.id, false)}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bucket steward-ledger">
        <h3 className="h3">User accounts</h3>
        <p className="qr-sub">Coming soon — account search, suspension, role grants.</p>
      </div>
      <div className="bucket steward-ledger">
        <h3 className="h3">Global moderation</h3>
        <p className="qr-sub">
          Coming soon — cross-chapter view of all postings/disputes/steward
          actions (the in-game Steward's Ledger only shows one player's own
          activity today).
        </p>
      </div>
      <div className="bucket steward-ledger">
        <h3 className="h3">Payments oversight</h3>
        <p className="qr-sub">Coming soon — Stripe Connect account status, transaction history, refunds.</p>
      </div>
    </section>
  );
}
