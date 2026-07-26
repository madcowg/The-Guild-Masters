import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  RANKS,
  RANK_COLORS,
  XP_PER_RANK,
  RANK_XP_THRESHOLD,
  STAT_KEYS,
  STAT_NAMES,
  STAT_DESCRIPTIONS,
  tierForStat,
  SEED_QUESTS,
  SEED_ROSTER,
  SEED_PETITIONERS,
  SEED_FORUM_POSTS,
  SEED_DM_THREADS,
  ACHIEVEMENTS,
  BUFFS,
  INITIAL_PLAYER,
  statRewardForRank,
  xpForLevel,
  levelFromXp,
} from "./constants.js";
import { Logo, StatIcon, NavIcon, BellIcon } from "./icons.jsx";
import { QuestCard } from "./components/QuestCard.jsx";
import { AdminConsole } from "./components/AdminConsole.jsx";
import { PostContractPaymentField } from "./components/PostContractPaymentField.jsx";
import { useSupabaseAuth } from "./auth/SupabaseAuthContext.jsx";
import { supabase } from "./supabaseClient.js";
import { generateNickname } from "./nickname.js";
  function App() {
    let supabaseAuth = useSupabaseAuth(),
      // Real quests/petitions/disputes flow through the backend built this
      // session whenever a real Supabase session exists; useSupabaseAuth()
      // returns null unless the user is fully authenticated with a profiles
      // row (SupabaseAuthGate renders its own landing/onboarding screens
      // otherwise), so this single flag is sufficient -- no need to also
      // check supabaseEnabled or .session here.
      usingRealBackend = !!supabaseAuth,
      cardFieldRef = useRef(null),
      [realBoard, setRealBoard] = useState([]),
      [realMyPostings, setRealMyPostings] = useState([]),
      [realMyPetitions, setRealMyPetitions] = useState([]),
      [realStewardQueue, setRealStewardQueue] = useState([]),
      [realDisputes, setRealDisputes] = useState([]),
      [realBackendError, setRealBackendError] = useState(""),
      [connectingPayout, setConnectingPayout] = useState(false),
      [connectPayoutError, setConnectPayoutError] = useState(""),
      [authScreen, setAuthScreen] = useState("landing"),
      [tab, setTab] = useState("boards"),
      [player, setPlayer] = useState(INITIAL_PLAYER),
      [hasLoaded, setHasLoaded] = useState(false),
      [contact, setContact] = useState(""),
      [ageConfirmed, setAgeConfirmed] = useState(false),
      [verifyCode, setVerifyCode] = useState(""),
      [nameInput, setNameInput] = useState(""),
      [toast, setToast] = useState(null),
      [ratingTarget, setRatingTarget] = useState(null),
      [openQuest, setOpenQuest] = useState(null),
      [forumPosts, setForumPosts] = useState(SEED_FORUM_POSTS),
      [dmThreads, setDmThreads] = useState(SEED_DM_THREADS),
      [activeThreadId, setActiveThreadId] = useState(null),
      [messageDraft, setMessageDraft] = useState(""),
      [noticeDraft, setNoticeDraft] = useState(""),
      [petitionDraft, setPetitionDraft] = useState(""),
      [rankFilter, setRankFilter] = useState("ALL"),
      [boardTab, setBoardTab] = useState("jobs"),
      [sheetStatTab, setSheetStatTab] = useState("STR"),
      [statGainPopup, setStatGainPopup] = useState(null),
      [draftPosting, setDraftPosting] = useState(null),
      [settingsOpen, setSettingsOpen] = useState(false),
      [notifOpen, setNotifOpen] = useState(false),
      allQuests = useMemo(
        () => [
          ...SEED_QUESTS,
          ...(player.myPostings || []),
          ...(player.stewardQueue || []),
        ],
        [player.myPostings, player.stewardQueue],
      );
    (useEffect(() => {
      (async () => {
        try {
          let s = await window.storage.get("gm:player");
          if (s && s.value) {
            let S = JSON.parse(s.value);
            ((S = {
              ...INITIAL_PLAYER,
              ...S,
              profile: {
                ...INITIAL_PLAYER.profile,
                ...(S.profile || {}),
              },
              doneSinceRefresh: S.doneSinceRefresh ?? S.completed ?? [],
              myPostings: (S.myPostings || []).map((N) => ({
                status: "open",
                petitions: [],
                taker: null,
                myRating: null,
                ...N,
              })),
            }),
              S.name && (setPlayer(S), setAuthScreen("app")));
          }
        } catch {}
        setHasLoaded(true);
      })();
    }, []),
      useEffect(() => {
        !hasLoaded ||
          !player.name ||
          (async () => {
            try {
              await window.storage.set("gm:player", JSON.stringify(player));
            } catch (s) {
              console.error(s);
            }
          })();
      }, [player, hasLoaded]));
    let loadRealBoardData = async () => {
        if (!usingRealBackend) return;
        setRealBackendError("");
        try {
          let chapterId = supabaseAuth.profile.chapter_id,
            myId = supabaseAuth.profile.id,
            [
              { data: board },
              { data: mine },
              { data: myPetitions },
              { data: stewardQueue },
              { data: disputes },
            ] = await Promise.all([
              supabase
                .from("postings")
                .select("*, employer:profiles!postings_employer_id_fkey(display_name,rank)")
                .eq("chapter_id", chapterId)
                .eq("status", "open")
                .order("created_at", { ascending: false }),
              supabase
                .from("postings")
                .select(
                  "*, petitions:posting_petitions(*, petitioner:profiles!posting_petitions_petitioner_id_fkey(display_name,rank))",
                )
                .eq("employer_id", myId)
                .order("created_at", { ascending: false }),
              supabase
                .from("posting_petitions")
                .select(
                  "*, posting:postings(*, employer:profiles!postings_employer_id_fkey(display_name,rank))",
                )
                .eq("petitioner_id", myId)
                .order("created_at", { ascending: false }),
              supabase
                .from("postings")
                .select("*, employer:profiles!postings_employer_id_fkey(display_name,rank)")
                .eq("status", "pendingReview")
                .order("created_at"),
              supabase
                .from("disputes")
                .select(
                  "*, posting:postings(title), raised_by_profile:profiles!disputes_raised_by_fkey(display_name), against_profile:profiles!disputes_against_fkey(display_name)",
                )
                .eq("status", "open")
                .order("created_at"),
            ]);
          (setRealBoard(board ?? []),
            setRealMyPostings(mine ?? []),
            setRealMyPetitions(myPetitions ?? []),
            setRealStewardQueue(stewardQueue ?? []),
            setRealDisputes(disputes ?? []));
        } catch (err) {
          setRealBackendError(err.message || "Could not load the guild board.");
        }
      };
    useEffect(() => {
      loadRealBoardData();
    }, [usingRealBackend, supabaseAuth?.profile?.chapter_id]);
    let showToast = (s) => {
        (setToast(s), setTimeout(() => setToast(null), 2600));
      },
      pushNotification = (text) =>
        setPlayer((S) => ({
          ...S,
          notifications: [
            { id: "n" + Date.now() + Math.random(), text, ts: Date.now(), read: false },
            ...(S.notifications || []),
          ].slice(0, 50),
        })),
      currentLevel = levelFromXp(player.xp),
      unreadNotifications = (player.notifications || []).filter((n) => !n.read).length,
      rankIndex = RANKS.indexOf(player.rank),
      nextRank = RANKS[rankIndex + 1],
      canAttemptTrial = nextRank && player.xp >= RANK_XP_THRESHOLD[nextRank],
      effectiveRankIndex = rankIndex + (player.party ? 1 : 0),
      canBeSteward = rankIndex >= 4,
      isActingSteward = canBeSteward && !!player.profile.isSteward,
      // Rank B/A/S requests always need the Guild Council (admin), never a
      // ranked guild member; below that, a steward may only approve requests
      // strictly below their own rank (never their own, never a peer's).
      canStewardApprove = (s) =>
        isActingSteward &&
        RANKS.indexOf(s.rank) < 4 &&
        rankIndex > RANKS.indexOf(s.rank),
      // Real-mode equivalents, sourced from the real profile rather than
      // the mock player object. These only drive UI gating -- the actual
      // security boundary is enforced server-side (review_posting RPC /
      // quest-review Edge Function), which re-checks all of this itself.
      realIsActingSteward =
        usingRealBackend &&
        (supabaseAuth.profile.is_admin ||
          (supabaseAuth.profile.is_steward &&
            RANKS.indexOf(supabaseAuth.profile.rank) >= 4)),
      realCanStewardApprove = (s) =>
        supabaseAuth.profile.is_admin ||
        (supabaseAuth.profile.is_steward &&
          RANKS.indexOf(supabaseAuth.profile.rank) >= 4 &&
          RANKS.indexOf(s.rank) < 4 &&
          RANKS.indexOf(supabaseAuth.profile.rank) > RANKS.indexOf(s.rank) &&
          s.employer_id !== supabaseAuth.profile.id),
      addAchievements = (s) => {
        let freshlyEarned = s.filter((id) => !player.achievements.includes(id));
        setPlayer((S) => ({
          ...S,
          achievements: [...new Set([...S.achievements, ...s])],
        }));
        freshlyEarned.forEach((id) => {
          let a = ACHIEVEMENTS.find((x) => x.id === id);
          if (a) pushNotification(`Achievement unlocked: ${a.name} — ${a.desc}.`);
        });
      },
      saveToSatchel = (s) => {
        (setPlayer((S) => ({
          ...S,
          saved: [...new Set([...S.saved, s.id])],
        })),
          showToast("Card saved to your satchel."));
      },
      removeFromSatchel = (s) =>
        setPlayer((S) => ({
          ...S,
          saved: S.saved.filter((N) => N !== s.id),
        })),
      rerollNicknameReal = async () => {
        let name = generateNickname(),
          { error } = await supabase
            .from("profiles")
            .update({ display_name: name })
            .eq("id", supabaseAuth.profile.id);
        if (error) return showToast(error.message);
        (await supabaseAuth.refreshProfile(), showToast(`Your name is now ${name}.`));
      },
      rerollNickname = () => {
        if (usingRealBackend) return rerollNicknameReal();
        setPlayer((S) => ({ ...S, name: generateNickname() }));
      },
      petitionForQuestReal = async (posting) => {
        if (posting.employer_id === supabaseAuth.profile.id) {
          return showToast(
            "You cannot take your own posting — but another adventurer soon will.",
          );
        }
        let { error } = await supabase.from("posting_petitions").insert({
          posting_id: posting.id,
          petitioner_id: supabaseAuth.profile.id,
        });
        if (error) return showToast(error.message);
        (setOpenQuest(null),
          showToast("Petition sent — awaiting the employer's seal."),
          loadRealBoardData());
      },
      petitionForQuest = (s) => {
        if (usingRealBackend) return petitionForQuestReal(s);
        if (s.mine)
          return showToast(
            "You cannot take your own posting \u2014 but another adventurer soon will.",
          );
        if (RANKS.indexOf(s.rank) > effectiveRankIndex)
          return showToast(
            player.party
              ? "Beyond even your party's reach \u2014 for now."
              : "Above your rank. Save it, or form a party.",
          );
        if (s.tavernOnly && !player.atTavern)
          return showToast(
            "This contract is only offered within the Tavern's walls. Check in first.",
          );
        let viaParty = !!player.party && RANKS.indexOf(s.rank) > rankIndex;
        (setPlayer((N) => ({
          ...N,
          pending: [...N.pending, s.id],
          saved: N.saved.filter((U) => U !== s.id),
          partyAssisted: viaParty
            ? { ...N.partyAssisted, [s.id]: true }
            : N.partyAssisted,
        })),
          setOpenQuest(null),
          showToast("Petition sent \u2014 awaiting the employer's seal."));
      },
      refreshBoardReal = async () => {
        await loadRealBoardData();
        showToast("The boards are refreshed.");
      },
      refreshBoard = () => {
        if (usingRealBackend) return refreshBoardReal();
        let recycled = (player.doneSinceRefresh || []).length,
          pending = player.myPostings.filter((s) => s.status === "pendingReview"),
          disputedPostings = player.myPostings.filter((s) => s.disputed),
          takerDisputes = player.disputes || [],
          // Anything a ranked steward couldn't touch (rank too low, B/A/S
          // tier, or simply never toggled on) still needs to move —
          // the Guild Council sweeps whatever's left on every refresh.
          queuedLeftover = (player.stewardQueue || []).filter(
            (s) => s.status === "pendingReview",
          );
        if (
          !recycled &&
          !pending.length &&
          !disputedPostings.length &&
          !takerDisputes.length &&
          !queuedLeftover.length
        )
          return showToast("The boards are already full of fresh postings.");
        let ts = Date.now(),
          logEntries = [
            ...pending.map((s) => ({
              id: "sl" + s.id + "-approve",
              action: "approved",
              title: s.title,
              actor: "the Guild Council",
              ts,
            })),
            ...disputedPostings.map((s) => ({
              id: "sl" + s.id + "-resolve",
              action: "resolved the dispute on",
              title: s.title,
              actor: "the Guild Council",
              ts,
            })),
            ...takerDisputes.map((d) => ({
              id: "sl" + d.id + "-resolve",
              action: "resolved the dispute on",
              title: d.title,
              actor: "the Guild Council",
              ts,
            })),
            ...queuedLeftover.map((s) => ({
              id: "sl" + s.id + "-approve",
              action: "approved",
              title: s.title,
              actor: "the Guild Council",
              ts,
            })),
          ];
        // Postings/disputes the player themselves filed or took part in are
        // never self-approved by the player's own Steward Tools (conflict of
        // interest) — the Guild Council clears that backlog whenever fresh
        // postings are pulled instead.
        (setPlayer((S) => ({
          ...S,
          doneSinceRefresh: [],
          myPostings: S.myPostings.map((s) =>
            s.status === "pendingReview"
              ? { ...s, status: "open" }
              : s.disputed
                ? { ...s, disputed: false }
                : s,
          ),
          disputes: [],
          stewardQueue: (S.stewardQueue || []).map((s) =>
            s.status === "pendingReview" ? { ...s, status: "open" } : s,
          ),
          stewardLog: [...logEntries, ...(S.stewardLog || [])].slice(0, 20),
        })),
          recycled
            ? showToast(
                `The Guild Council pins ${recycled} fresh posting${recycled > 1 ? "s" : ""} to the boards.`,
              )
            : showToast("The Guild Council clears the steward's backlog."),
          pending.forEach((s) =>
            pushNotification(
              `The Guild Council approved your posting "${s.title}" — it's now live.`,
            ),
          ));
      },
      reviewPostingReal = async (posting, approve) => {
        let { data, error } = await supabase.functions.invoke("quest-review", {
          method: "POST",
          body: { posting_id: posting.id, approve },
        });
        if (error || data?.error) {
          return showToast((data && data.error) || error.message);
        }
        (showToast(
          approve
            ? `"${posting.title}" approved and pinned to the board.`
            : `"${posting.title}" was rejected.`,
        ),
          loadRealBoardData());
      },
      approveQueuedPostingReal = (s) => reviewPostingReal(s, true),
      rejectQueuedPostingReal = (s) => reviewPostingReal(s, false),
      approveQueuedPosting = (s) => {
        if (usingRealBackend) return approveQueuedPostingReal(s);
        (setPlayer((N) => ({
          ...N,
          stewardQueue: N.stewardQueue.map((U) =>
            U.id === s.id ? { ...U, status: "open" } : U,
          ),
          stewardLog: [
            {
              id: "sl" + s.id + "-approve",
              action: "approved",
              title: s.title,
              actor: N.name,
              ts: Date.now(),
            },
            ...(N.stewardLog || []),
          ].slice(0, 20),
        })),
          showToast(`"${s.title}" approved and pinned to the board.`));
      },
      rejectQueuedPosting = (s) => {
        if (usingRealBackend) return rejectQueuedPostingReal(s);
        (setPlayer((N) => ({
          ...N,
          stewardQueue: N.stewardQueue.filter((U) => U.id !== s.id),
          stewardLog: [
            {
              id: "sl" + s.id + "-reject",
              action: "rejected",
              title: s.title,
              actor: N.name,
              ts: Date.now(),
            },
            ...(N.stewardLog || []),
          ].slice(0, 20),
        })),
          showToast(`"${s.title}" was rejected.`));
      },
      submitPostingReal = async () => {
        let statInfo = statRewardForRank(draftPosting.rank),
          computedStats = {};
        for (let i = 0; i < statInfo.pts; i++) {
          let key = draftPosting.stats[i % draftPosting.stats.length];
          computedStats[key] = (computedStats[key] || 0) + 1;
        }

        let employerPaymentMethodId = null;
        if (!draftPosting.barter) {
          if (!cardFieldRef.current) {
            return showToast(
              "Payment collection isn't set up yet — card details are required for a scrip contract.",
            );
          }
          let { paymentMethodId, error: tokenizeError } = await cardFieldRef.current.tokenize();
          if (tokenizeError) return showToast(tokenizeError);
          employerPaymentMethodId = paymentMethodId;
        }

        let { error: insertError } = await supabase.from("postings").insert({
          chapter_id: supabaseAuth.profile.chapter_id,
          employer_id: supabaseAuth.profile.id,
          rank: draftPosting.rank,
          title: draftPosting.title.trim(),
          description: draftPosting.desc.trim(),
          type: draftPosting.type,
          stats: computedStats,
          scrip: draftPosting.barter ? 0 : Number(draftPosting.scrip) || 0,
          is_barter: draftPosting.barter,
          barter_for: draftPosting.barter ? draftPosting.barterFor.trim() : null,
          tavern_only: RANKS.indexOf(draftPosting.rank) >= 4,
          employer_payment_method_id: employerPaymentMethodId,
        });
        if (insertError) return showToast(insertError.message);

        (setDraftPosting(null),
          setBoardTab(draftPosting.barter ? "barter" : "jobs"),
          showToast(
            "Your contract is queued for the Steward's Ledger, pending guild review.",
          ),
          loadRealBoardData());
      },
      submitPosting = () => {
        if (usingRealBackend) return submitPostingReal();
        let s = statRewardForRank(draftPosting.rank),
          S = {};
        for (let U = 0; U < s.pts; U++) {
          let pt = draftPosting.stats[U % draftPosting.stats.length];
          S[pt] = (S[pt] || 0) + 1;
        }
        let N = {
          id: "u" + Date.now(),
          rank: draftPosting.rank,
          title: draftPosting.title.trim(),
          desc: draftPosting.desc.trim(),
          type: draftPosting.type,
          stats: S,
          scrip: draftPosting.barter ? 0 : Number(draftPosting.scrip) || 0,
          employer: player.name,
          barter: draftPosting.barter,
          barterFor: draftPosting.barter
            ? draftPosting.barterFor.trim()
            : void 0,
          tavernOnly: RANKS.indexOf(draftPosting.rank) >= 4,
          mine: true,
          status: "pendingReview",
          petitions: [],
          taker: null,
          myRating: null,
          disputed: false,
        };
        (setPlayer((U) => ({
          ...U,
          myPostings: [...(U.myPostings || []), N],
        })),
          setDraftPosting(null),
          setBoardTab(N.barter ? "barter" : "jobs"),
          showToast(
            "Your contract is queued for the Steward's Ledger, pending guild review.",
          ));
      },
      updateMyPosting = (s, S) =>
        setPlayer((N) => ({
          ...N,
          myPostings: N.myPostings.map((U) => (U.id === s ? S(U) : U)),
        })),
      crierBringsPetitions = (s) => {
        let S = SEED_PETITIONERS.filter(
          (pt) =>
            RANKS.indexOf(pt.rank) >= RANKS.indexOf(s.rank) &&
            !s.petitions.some((Bl) => Bl.name === pt.name),
        );
        if (!S.length)
          return showToast(
            "The crier calls, but every eligible adventurer has already petitioned.",
          );
        let N = Math.min(S.length, 1 + Math.floor(Math.random() * 2)),
          U = [...S].sort(() => Math.random() - 0.5).slice(0, N);
        (updateMyPosting(s.id, (pt) => ({
          ...pt,
          petitions: [...pt.petitions, ...U],
        })),
          showToast(
            `The town crier calls your contract \u2014 ${N} petition${N > 1 ? "s" : ""} arrive${N > 1 ? "" : "s"}.`,
          ));
      },
      sealPetitionReal = async (posting, petition) => {
        let { data, error } = await supabase.functions.invoke("quest-seal", {
          method: "POST",
          body: { posting_id: posting.id, taker_id: petition.petitioner_id },
        });
        if (error || data?.error) {
          return showToast((data && data.error) || error.message);
        }
        (showToast(
          `You press your seal. ${petition.petitioner?.display_name ?? "The petitioner"} takes up the contract.`,
        ),
          loadRealBoardData());
      },
      declinePetitionReal = async (petition) => {
        let { error } = await supabase
          .from("posting_petitions")
          .update({ status: "declined" })
          .eq("id", petition.id);
        if (error) return showToast(error.message);
        (showToast(
          `You decline ${petition.petitioner?.display_name ?? "the petitioner"}'s petition, with the guild's courtesy.`,
        ),
          loadRealBoardData());
      },
      confirmAndReleaseReal = async (posting, rating) => {
        let { data, error } = await supabase.functions.invoke("quest-complete", {
          method: "POST",
          body: { posting_id: posting.id, rating },
        });
        if (error || data?.error) {
          return showToast((data && data.error) || error.message);
        }
        if (rating <= 2) {
          await supabase.rpc("raise_dispute", { p_posting_id: posting.id, p_rating: rating });
        }
        (showToast(
          posting.is_barter
            ? "Trade fulfilled. You and your taker part as friends of the guild."
            : `Work confirmed. ${posting.scrip} scrip released to your taker.`,
        ),
          loadRealBoardData());
      },
      sealPetition = (s, S) => {
        if (usingRealBackend) return sealPetitionReal(s, S);
        (updateMyPosting(s.id, (N) => ({
          ...N,
          status: "sealed",
          taker: S,
          petitions: [],
        })),
          showToast(`You press your seal. ${S.name} takes up the contract.`));
      },
      declinePetition = (s, S) => {
        if (usingRealBackend) return declinePetitionReal(S);
        (updateMyPosting(s.id, (N) => ({
          ...N,
          petitions: N.petitions.filter((U) => U.name !== S.name),
        })),
          showToast(
            `You decline ${S.name}'s petition, with the guild's courtesy.`,
          ));
      },
      confirmAndRelease = (s, S) => {
        if (usingRealBackend) return confirmAndReleaseReal(s, S);
        (updateMyPosting(s.id, (N) => ({
          ...N,
          status: "done",
          myRating: S,
          disputed: S <= 2,
        })),
          setPlayer((N) => ({
            ...N,
            scrip: N.scrip - (s.barter ? 0 : s.scrip),
            achievements: [...new Set([...N.achievements, "patron"])],
          })),
          showToast(
            s.barter
              ? `Trade fulfilled. You and ${s.taker.name} part as friends of the guild.`
              : `Work confirmed. ${s.scrip} scrip released to ${s.taker.name}.`,
          ),
          S <= 2 &&
            pushNotification(
              `Low rating recorded on "${s.title}" — flagged for the Steward's Ledger.`,
            ));
      },
      handleAvatarUpload = (s) => {
        let S = s.target.files && s.target.files[0];
        if (!S) return;
        let N = new Image();
        ((N.onload = () => {
          let U = document.createElement("canvas"),
            pt = 128;
          ((U.width = pt), (U.height = pt));
          let Bl = U.getContext("2d"),
            Hl = Math.min(N.width, N.height);
          (Bl.drawImage(
            N,
            (N.width - Hl) / 2,
            (N.height - Hl) / 2,
            Hl,
            Hl,
            0,
            0,
            pt,
            pt,
          ),
            setPlayer((yu) => ({
              ...yu,
              avatar: U.toDataURL("image/jpeg", 0.82),
            })),
            showToast("Your portrait now hangs in the guild registry."));
        }),
          (N.src = URL.createObjectURL(S)));
      },
      petitionAccepted = (s) => {
        (setPlayer((S) => ({
          ...S,
          pending: S.pending.filter((N) => N !== s),
          active: [...S.active, s],
        })),
          showToast("The employer has pressed their seal. Quest active!"),
          pushNotification("Your seal was pressed — a quest is now active."));
      },
      openRatingModal = (s) => setRatingTarget(s),
      // Real quests don't have a taker-side "mark complete" self-report --
      // quest-complete (triggered by the employer confirming) is the sole
      // authoritative "done" event and already credited real xp/scrip/stats
      // server-side. The taker's own action here is just rating the
      // employer once the posting is already 'done'.
      rateEmployerReal = async (posting, rating) => {
        let { error } = await supabase.rpc("rate_employer", {
          p_posting_id: posting.id,
          p_rating: rating,
        });
        if (error) return showToast(error.message);
        (setRatingTarget(null),
          showToast("Rating recorded."),
          loadRealBoardData());
      },
      resolveDisputeReal = async (dispute) => {
        let { error } = await supabase.rpc("resolve_dispute", {
          p_dispute_id: dispute.id,
        });
        if (error) return showToast(error.message);
        (showToast(`Dispute on "${dispute.title}" resolved.`), loadRealBoardData());
      },
      completeQuestAndRate = (s, S) => {
        if (usingRealBackend) return rateEmployerReal(s, S);
        // Party quests were only reachable because the party bumped effective
        // rank by one (see petitionForQuest); the reward pool is split across
        // the party rather than paid out in full to each member, since there's
        // no separate persisted account for the NPC roster members here.
        let partySize = 1 + (player.party ? player.party.members.length : 0),
          assisted = partySize > 1 && !!(player.partyAssisted || {})[s.id],
          myXp = assisted ? Math.ceil(XP_PER_RANK[s.rank] / partySize) : XP_PER_RANK[s.rank],
          myScrip = assisted ? Math.ceil(s.scrip / partySize) : s.scrip,
          statKeys = Object.keys(s.stats),
          totalPts = Object.values(s.stats).reduce((a, b) => a + b, 0),
          myPts = assisted ? Math.ceil(totalPts / partySize) : totalPts,
          myStatGain = {};
        for (let i = 0; i < myPts; i++) {
          let k = statKeys[i % statKeys.length];
          myStatGain[k] = (myStatGain[k] || 0) + 1;
        }
        (setPlayer((N) => {
          let U = {
            ...N.stats,
          };
          Object.entries(myStatGain).forEach(([Hl, yu]) => (U[Hl] += yu));
          let pt = [...N.completed, s.id],
            Bl = [];
          return (
            pt.length >= 1 && Bl.push("first"),
            pt.length >= 3 && Bl.push("trio"),
            s.barter && Bl.push("barter"),
            {
              ...N,
              stats: U,
              xp: N.xp + myXp,
              scrip: N.scrip + myScrip,
              active: N.active.filter((Hl) => Hl !== s.id),
              completed: pt,
              doneSinceRefresh: [...(N.doneSinceRefresh || []), s.id],
              achievements: [...new Set([...N.achievements, ...Bl])],
              ratingsGiven: {
                ...N.ratingsGiven,
                [s.id]: S,
              },
              partyAssisted: Object.fromEntries(
                Object.entries(N.partyAssisted || {}).filter(([k]) => k !== s.id),
              ),
              disputes:
                S <= 2
                  ? [
                      ...(N.disputes || []),
                      {
                        id: "d" + Date.now(),
                        questId: s.id,
                        title: s.title,
                        employer: s.employer,
                        rating: S,
                        ts: Date.now(),
                      },
                    ]
                  : N.disputes,
            }
          );
        }),
          setRatingTarget(null),
          setStatGainPopup([
            ...Object.entries(myStatGain).map(([N, U]) => ({
              k: N,
              v: U,
            })),
            {
              k: "XP",
              v: myXp,
            },
          ]),
          setTimeout(() => setStatGainPopup(null), 2400),
          showToast(
            `Quest complete! +${myXp} XP${myScrip ? `, +${myScrip} scrip` : s.barter ? ", barter fulfilled" : ""}${assisted ? ` (split among your party of ${partySize})` : ""}.`,
          ),
          pushNotification(
            `Quest "${s.title}" complete — +${myXp} XP${myScrip ? `, +${myScrip} scrip` : ""}.`,
          ),
          S <= 2 &&
            pushNotification(
              `You flagged a low rating for "${s.title}" — sent to the Steward's Ledger.`,
            ));
      },
      attemptRankTrial = () => {
        (setPlayer((s) => {
          let S = RANKS[RANKS.indexOf(s.rank) + 1],
            N = [];
          return (
            S === "E" && N.push("erank"),
            S === "D" && N.push("drank"),
            {
              ...s,
              rank: S,
              achievements: [...new Set([...s.achievements, ...N])],
            }
          );
        }),
          showToast(`Trial passed. You are now Rank ${nextRank}.`),
          pushNotification(`Trial passed — you are now Rank ${nextRank}.`));
      },
      formParty = () => {
        (setPlayer((s) => ({
          ...s,
          party: {
            name: "New Fellowship",
            members: [],
          },
        })),
          addAchievements(["party"]));
      },
      recruitToParty = (s) =>
        setPlayer((S) => ({
          ...S,
          party: {
            ...S.party,
            members: [...S.party.members, s.id],
          },
        })),
      signOut = async () => {
        try {
          await window.storage.delete("gm:player");
        } catch {}
        (setPlayer(INITIAL_PLAYER),
          setAuthScreen("landing"),
          setContact(""),
          setVerifyCode(""),
          setAgeConfirmed(false),
          setNameInput(""));
      },
      findQuestById = (s) => allQuests.find((S) => S.id === s),
      // Adapts a real postings row onto the mock quest shape's field names
      // (desc/barter/barterFor/tavernOnly/mine/employer) so QuestCard and
      // the quest-detail modal can render either one unchanged -- the
      // original real fields (id, employer_id, is_barter, scrip, rank,
      // stats...) stay spread onto the same object too, since the real
      // mutator functions (sealPetitionReal, etc.) read those directly.
      toCardShape = (posting) => ({
        ...posting,
        desc: posting.description,
        barter: posting.is_barter,
        barterFor: posting.barter_for,
        tavernOnly: posting.tavern_only,
        mine: posting.employer_id === supabaseAuth?.profile?.id,
        employer: posting.employer?.display_name ?? "Unknown",
      });
    return (
      <div className="gm-root">
        {toast && <div className="toast">{toast}</div>}
        {statGainPopup && (
          <div className="gains" aria-hidden="true">
            {statGainPopup.map((s, S) => (
              <div
                key={S}
                className="gain-chip"
                style={{
                  animationDelay: `${S * 0.18}s`,
                }}
              >
                {s.k !== "XP" && <StatIcon s={s.k} />}
                <b>+{s.v}</b> {s.k}
              </div>
            ))}
          </div>
        )}
        {authScreen !== "app" && (
          <div className="gate">
            <div className="gate-card">
              <div className="crest">✦</div>
              <h1 className="brand">The Guild Masters</h1>
              <p className="brand-sub">
                Companion to The Tavern · High Fantasy Chapter
              </p>
              {authScreen === "landing" && (
                <React.Fragment>
                  <p className="gate-copy">
                    Real quests. Real neighbors. Real progression. Rise from
                    Rank F to Rank S by lending your hands, wits, and company to
                    the city.
                  </p>
                  <label className="field-label">Email or phone</label>
                  <input
                    className="field"
                    value={contact}
                    onChange={(s) => setContact(s.target.value)}
                    placeholder="you@realm.com or +1 555 0100"
                  />
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(s) => setAgeConfirmed(s.target.checked)}
                    />
                    <span>I confirm I am 18 years or older</span>
                  </label>
                  <button
                    className="btn gold"
                    disabled={!contact || !ageConfirmed}
                    onClick={() => setAuthScreen("verify")}
                  >
                    Send verification code
                  </button>
                  <p className="fine">
                    Membership requires government ID verification. Guild
                    membership covers job insurance for active members and
                    Tavern club entry from Rank D.
                  </p>
                </React.Fragment>
              )}
              {authScreen === "verify" && (
                <React.Fragment>
                  <p className="gate-copy">
                    A six-digit sigil was sent to <b>{contact}</b>. (Demo: enter
                    any 6 digits.)
                  </p>
                  <input
                    className="field code"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(s) =>
                      setVerifyCode(s.target.value.replace(/\D/g, ""))
                    }
                    placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022"}
                  />
                  <button
                    className="btn gold"
                    disabled={verifyCode.length !== 6}
                    onClick={() => setAuthScreen("idcheck")}
                  >
                    Verify
                  </button>
                  <button
                    className="btn ghost"
                    onClick={() => setAuthScreen("landing")}
                  >
                    Back
                  </button>
                </React.Fragment>
              )}
              {authScreen === "idcheck" && (
                <React.Fragment>
                  <p className="gate-copy">
                    The Guild requires a valid government ID to protect all
                    members. Your documents are reviewed by guild staff and
                    never shown to other adventurers.
                  </p>
                  <button
                    className="btn gold"
                    onClick={() => setAuthScreen("create")}
                  >
                    Upload ID (demo: mark as verified)
                  </button>
                </React.Fragment>
              )}
              {authScreen === "create" && (
                <React.Fragment>
                  <p className="gate-copy">
                    ID verified ✓ — Welcome, recruit. Every legend begins at
                    Rank F. Choose your adventurer name.
                  </p>
                  <input
                    className="field"
                    value={nameInput}
                    onChange={(s) => setNameInput(s.target.value)}
                    placeholder="e.g. Wren of the North Market"
                  />
                  <button
                    className="btn gold"
                    disabled={!nameInput.trim()}
                    onClick={() => {
                      (setPlayer({
                        ...INITIAL_PLAYER,
                        name: nameInput.trim(),
                        profile: {
                          ...INITIAL_PLAYER.profile,
                          email: contact.includes("@") ? contact : "",
                          phone: contact.includes("@") ? "" : contact,
                        },
                      }),
                        setAuthScreen("app"));
                    }}
                  >
                    Take the Guild Oath
                  </button>
                </React.Fragment>
              )}
            </div>
          </div>
        )}
        {authScreen === "app" && (
          <React.Fragment>
            <div className="banner">
              <Logo />
              <div>
                <div className="banner-title">The Guild Masters</div>
                <div className="banner-sub">
                  Quests among neighbors · High Fantasy Chapter
                </div>
              </div>
            </div>
            <header className="topbar">
              <button
                className="topbar-left"
                onClick={() => setTab("sheet")}
                title="Open your profile"
              >
                {player.avatar ? (
                  <img className="tb-ava" src={player.avatar} alt="" />
                ) : (
                  <span className="crest small">✦</span>
                )}
                <span className="tb-id">
                  <span className="tb-name">
                    {usingRealBackend ? supabaseAuth.profile.display_name : player.name}
                  </span>
                  <span className="tb-sub">
                    Rank{" "}
                    <b
                      style={{
                        color: RANK_COLORS[player.rank],
                      }}
                    >
                      {player.rank}
                    </b>{" "}
                    · Lv {currentLevel}
                  </span>
                </span>
              </button>
              <div className="topbar-right">
                <span className="scrip">⛁ {player.scrip} scrip</span>
                <span
                  className={"tavern-dot " + (player.atTavern ? "in" : "")}
                  title={player.atTavern ? "At the Tavern" : "Away"}
                >
                  ◉
                </span>
                <div className="notif-wrap">
                  <button
                    className="icon-btn"
                    title="Notifications"
                    aria-label="Notifications"
                    onClick={() => {
                      let opening = !notifOpen;
                      setNotifOpen(opening);
                      if (opening)
                        setPlayer((S) => ({
                          ...S,
                          notifications: (S.notifications || []).map((n) => ({
                            ...n,
                            read: true,
                          })),
                        }));
                    }}
                  >
                    <BellIcon />
                    {unreadNotifications > 0 && (
                      <span className="notif-badge">{unreadNotifications}</span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="notif-panel">
                      <div className="notif-panel-title">Notifications</div>
                      {(player.notifications || []).length === 0 ? (
                        <p className="empty">No notifications yet.</p>
                      ) : (
                        (player.notifications || []).map((n) => (
                          <div key={n.id} className="notif-row">
                            {n.text}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </header>
            <main className="content">
              {tab === "boards" && (
                <section>
                  <div className="board-head">
                    <h2 className="h2">
                      {boardTab === "jobs"
                        ? "The Job Board"
                        : "The Barter Board"}
                    </h2>
                    <div className="board-actions">
                      <button
                        className="btn tiny gold"
                        onClick={() =>
                          setDraftPosting({
                            title: "",
                            desc: "",
                            rank: usingRealBackend ? supabaseAuth.profile.rank : player.rank,
                            type: "Labor",
                            barter: boardTab === "barter",
                            scrip: 50,
                            barterFor: "",
                            stats: [],
                          })
                        }
                      >
                        Post a contract
                      </button>
                      <button className="btn tiny ghost" onClick={refreshBoard}>
                        Fresh postings
                      </button>
                    </div>
                  </div>
                  <div className="subtabs">
                    <button
                      className={"subtab " + (boardTab === "jobs" ? "on" : "")}
                      onClick={() => setBoardTab("jobs")}
                    >
                      Jobs · scrip
                    </button>
                    <button
                      className={
                        "subtab " + (boardTab === "barter" ? "on" : "")
                      }
                      onClick={() => setBoardTab("barter")}
                    >
                      Barter · trade
                    </button>
                  </div>
                  <p className="lede">
                    {boardTab === "jobs"
                      ? "Contracts posted by your neighbors, hung on the guild pegs. Take what your rank allows; save the rest for later or for a party."
                      : "No coin changes hands here. These quests are paid in trades, lessons, and favors \u2014 offer what you have, gain what you lack."}
                  </p>
                  <div className="filters">
                    {["ALL", ...RANKS].map((s) => (
                      <button
                        key={s}
                        className={"chip " + (rankFilter === s ? "on" : "")}
                        style={
                          s === "ALL"
                            ? {}
                            : {
                                color: RANK_COLORS[s],
                                borderColor:
                                  rankFilter === s ? RANK_COLORS[s] : "#4A3550",
                                background:
                                  rankFilter === s
                                    ? "rgba(255,255,255,.06)"
                                    : "transparent",
                              }
                        }
                        onClick={() => setRankFilter(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="card-grid">
                    {(usingRealBackend
                      ? realBoard.map(toCardShape)
                      : allQuests
                          .filter((s) => s.status !== "pendingReview")
                          .filter(
                            (s) =>
                              !(player.doneSinceRefresh || []).includes(s.id) &&
                              !player.active.includes(s.id) &&
                              !player.pending.includes(s.id),
                          )
                    )
                      .filter((s) =>
                        boardTab === "barter" ? s.barter : !s.barter,
                      )
                      .filter(
                        (s) => rankFilter === "ALL" || s.rank === rankFilter,
                      )
                      .map((s, S) => (
                        <QuestCard
                          key={s.id}
                          q={s}
                          i={S}
                          locked={
                            !s.mine &&
                            RANKS.indexOf(s.rank) >
                              (usingRealBackend
                                ? RANKS.indexOf(supabaseAuth.profile.rank)
                                : effectiveRankIndex)
                          }
                          saved={!usingRealBackend && player.saved.includes(s.id)}
                          onOpen={() => setOpenQuest(s)}
                        />
                      ))}
                  </div>
                </section>
              )}
              {tab === "quests" && usingRealBackend && (
                <section>
                  <h2 className="h2">My Quests</h2>
                  {realBackendError && <p className="warn">{realBackendError}</p>}
                  {realMyPostings.length > 0 && (
                    <div className="bucket">
                      <h3 className="h3">
                        The Employer's Desk — your postings
                      </h3>
                      {realMyPostings.map((s) => {
                        let pendingPetitions = (s.petitions || []).filter(
                          (p) => p.status === "pending",
                        );
                        return (
                          <div key={s.id} className="panel desk">
                            <div className="desk-head">
                              <span
                                className="qr-rank"
                                style={{ background: RANK_COLORS[s.rank] }}
                              >
                                {s.rank}
                              </span>
                              <div className="qr-main">
                                <div className="qr-title">{s.title}</div>
                                <div className="qr-sub">
                                  {s.is_barter
                                    ? `Barter: ${s.barter_for}`
                                    : `${s.scrip} scrip in escrow`}{" "}
                                  ·{" "}
                                  {s.status === "pendingReview"
                                    ? "Awaiting guild review — not yet visible on the board"
                                    : s.status === "open"
                                      ? pendingPetitions.length
                                        ? `${pendingPetitions.length} petition${pendingPetitions.length > 1 ? "s" : ""} await your seal`
                                        : "Open — awaiting petitions"
                                      : s.status === "sealed"
                                        ? "Sealed — at work"
                                        : s.status === "done"
                                          ? `Fulfilled \xB7 You rated ${"★".repeat(s.my_rating || 0)}${s.disputed ? " \xB7 Disputed" : ""}`
                                          : s.status === "expired"
                                            ? "Expired — no taker within 7 days, refunded"
                                            : "Rejected"}
                                </div>
                              </div>
                            </div>
                            {s.status === "open" &&
                              pendingPetitions.map((p) => (
                                <div key={p.id} className="petition">
                                  <span
                                    className="qr-rank"
                                    style={{
                                      background: RANK_COLORS[p.petitioner?.rank],
                                    }}
                                  >
                                    {p.petitioner?.rank}
                                  </span>
                                  <div className="qr-main">
                                    <div className="qr-title">
                                      {p.petitioner?.display_name ?? "Unknown"}
                                    </div>
                                  </div>
                                  <div className="pet-actions">
                                    <button
                                      className="btn tiny gold"
                                      onClick={() => sealPetition(s, p)}
                                    >
                                      Press seal
                                    </button>
                                    <button
                                      className="btn tiny ghost"
                                      onClick={() => declinePetition(s, p)}
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              ))}
                            {s.status === "sealed" && (
                              <div className="petition confirm-row">
                                <div className="qr-main">
                                  <div className="qr-sub">
                                    When your taker delivers the deed, confirm
                                    & rate to release{" "}
                                    {s.is_barter ? "your trade" : "the scrip"}:
                                  </div>
                                </div>
                                <div className="mini-stars">
                                  {[1, 2, 3, 4, 5].map((S) => (
                                    <button
                                      key={S}
                                      className="mini-star"
                                      title={`${S} star${S > 1 ? "s" : ""}`}
                                      onClick={() => confirmAndRelease(s, S)}
                                    >
                                      ★
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="bucket">
                    <h3 className="h3">Your petitions</h3>
                    {realMyPetitions.length === 0 && (
                      <p className="empty">
                        Nothing here yet. The board awaits.
                      </p>
                    )}
                    {realMyPetitions.map((p) => {
                      let posting = p.posting || {};
                      return (
                        <div key={p.id} className="quest-row">
                          <span
                            className="qr-rank"
                            style={{ background: RANK_COLORS[posting.rank] }}
                          >
                            {posting.rank}
                          </span>
                          <div className="qr-main">
                            <div className="qr-title">{posting.title}</div>
                            <div className="qr-sub">
                              {posting.is_barter
                                ? `Barter: ${posting.barter_for}`
                                : `${posting.scrip} scrip`}
                              {" \xB7 "}
                              {p.status === "declined"
                                ? "Declined"
                                : posting.status === "open"
                                  ? "Awaiting employer's seal"
                                  : posting.status === "sealed"
                                    ? "Sealed to you — at work"
                                    : posting.status === "done"
                                      ? posting.taker_rating
                                        ? `Rated \xB7 You rated the employer ${"★".repeat(posting.taker_rating)}`
                                        : "Awaiting your rating"
                                      : posting.status}
                            </div>
                          </div>
                          {posting.status === "done" && !posting.taker_rating && (
                            <button
                              className="btn tiny gold"
                              onClick={() =>
                                openRatingModal({
                                  ...posting,
                                  employer: posting.employer?.display_name ?? "your employer",
                                })
                              }
                            >
                              Rate employer
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {tab === "quests" && !usingRealBackend && (
                <section>
                  <h2 className="h2">My Quests</h2>
                  {(player.myPostings || []).length > 0 && (
                    <div className="bucket">
                      <h3 className="h3">
                        The Employer's Desk — your postings
                      </h3>
                      {player.myPostings.map((s) => (
                        <div key={s.id} className="panel desk">
                          <div className="desk-head">
                            <span
                              className="qr-rank"
                              style={{
                                background: RANK_COLORS[s.rank],
                              }}
                            >
                              {s.rank}
                            </span>
                            <div className="qr-main">
                              <div className="qr-title">{s.title}</div>
                              <div className="qr-sub">
                                {s.barter
                                  ? `Barter: ${s.barterFor}`
                                  : `${s.scrip} scrip in escrow`}{" "}
                                ·{" "}
                                {s.status === "pendingReview"
                                  ? "Awaiting guild review \u2014 not yet visible on the board"
                                  : s.status === "open"
                                    ? s.petitions.length
                                      ? `${s.petitions.length} petition${s.petitions.length > 1 ? "s" : ""} await your seal`
                                      : "Open \u2014 awaiting petitions"
                                    : s.status === "sealed"
                                      ? `Sealed to ${s.taker.name} \u2014 at work`
                                      : `Fulfilled by ${s.taker.name} \xB7 You rated ${"\u2605".repeat(s.myRating)}${s.disputed ? " \xB7 Disputed" : ""}`}
                              </div>
                            </div>
                            {s.status === "open" && (
                              <button
                                className="btn tiny"
                                onClick={() => crierBringsPetitions(s)}
                              >
                                Call the crier (demo)
                              </button>
                            )}
                          </div>
                          {s.status === "open" &&
                            s.petitions.map((S) => (
                              <div key={S.name} className="petition">
                                <span
                                  className="qr-rank"
                                  style={{
                                    background: RANK_COLORS[S.rank],
                                  }}
                                >
                                  {S.rank}
                                </span>
                                <div className="qr-main">
                                  <div className="qr-title">
                                    {S.name}{" "}
                                    <span className="pet-meta">
                                      ★ {S.rating} · {S.deeds} deeds
                                    </span>
                                  </div>
                                  <div className="qr-sub">“{S.note}”</div>
                                </div>
                                <div className="pet-actions">
                                  <button
                                    className="btn tiny gold"
                                    onClick={() => sealPetition(s, S)}
                                  >
                                    Press seal
                                  </button>
                                  <button
                                    className="btn tiny ghost"
                                    onClick={() => declinePetition(s, S)}
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          {s.status === "sealed" && (
                            <div className="petition confirm-row">
                              <div className="qr-main">
                                <div className="qr-sub">
                                  When {s.taker.name} delivers the deed, confirm
                                  & rate to release{" "}
                                  {s.barter ? "your trade" : "the scrip"}:
                                </div>
                              </div>
                              <div className="mini-stars">
                                {[1, 2, 3, 4, 5].map((S) => (
                                  <button
                                    key={S}
                                    className="mini-star"
                                    title={`${S} star${S > 1 ? "s" : ""}`}
                                    onClick={() => confirmAndRelease(s, S)}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {["saved", "pending", "active", "completed"].map((s) => (
                    <div key={s} className="bucket">
                      <h3 className="h3">
                        {
                          {
                            saved: "Satchel (saved cards)",
                            pending: "Awaiting employer's seal",
                            active: "Active contracts",
                            completed: "Deeds done",
                          }[s]
                        }
                      </h3>
                      {player[s].length === 0 && (
                        <p className="empty">
                          Nothing here yet. The board awaits.
                        </p>
                      )}
                      {player[s].map((S, N) => {
                        let U = findQuestById(S);
                        return (
                          <div key={S + "-" + N} className="quest-row">
                            <span
                              className="qr-rank"
                              style={{
                                background: RANK_COLORS[U.rank],
                              }}
                            >
                              {U.rank}
                            </span>
                            <div className="qr-main">
                              <div className="qr-title">{U.title}</div>
                              <div className="qr-sub">
                                {U.employer} ·{" "}
                                {U.barter
                                  ? `Barter: ${U.barterFor}`
                                  : `${U.scrip} scrip`}
                                {s === "completed" && player.ratingsGiven[S]
                                  ? ` \xB7 You rated ${"\u2605".repeat(player.ratingsGiven[S])}`
                                  : ""}
                              </div>
                            </div>
                            {s === "saved" && (
                              <React.Fragment>
                                <button
                                  className="btn tiny"
                                  onClick={() => petitionForQuest(U)}
                                >
                                  Take
                                </button>
                                <button
                                  className="btn tiny ghost"
                                  onClick={() => removeFromSatchel(U)}
                                >
                                  Drop
                                </button>
                              </React.Fragment>
                            )}
                            {s === "pending" && (
                              <button
                                className="btn tiny"
                                onClick={() => petitionAccepted(S)}
                              >
                                Simulate seal (demo)
                              </button>
                            )}
                            {s === "active" && (
                              <button
                                className="btn tiny gold"
                                onClick={() => openRatingModal(U)}
                              >
                                Mark complete
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </section>
              )}
              {tab === "party" && (
                <section>
                  <h2 className="h2">Fellowship</h2>
                  <p className="lede">
                    Some quests outmatch a lone adventurer. A party lets you
                    attempt contracts one rank above your own, and pool
                    different skills.
                  </p>
                  {player.party ? (
                    <React.Fragment>
                      <div className="panel">
                        <b>{player.party.name}</b> ·{" "}
                        {player.party.members.length + 1} member
                        {player.party.members.length ? "s" : ""}
                        <div
                          className="qr-sub"
                          style={{
                            marginTop: 6,
                          }}
                        >
                          Party bonus active: you may take quests up to Rank{" "}
                          {RANKS[Math.min(rankIndex + 1, 6)]}.
                        </div>
                      </div>
                      <h3 className="h3">Adventurers seeking parties</h3>
                      {SEED_ROSTER.filter(
                        (s) => !player.party.members.includes(s.id),
                      ).map((s) => (
                        <div key={s.id} className="quest-row">
                          <span
                            className="qr-rank"
                            style={{
                              background: RANK_COLORS[s.rank],
                            }}
                          >
                            {s.rank}
                          </span>
                          <div className="qr-main">
                            <div className="qr-title">{s.name}</div>
                            <div className="qr-sub">
                              {s.cls} · {s.note}
                            </div>
                          </div>
                          <button
                            className="btn tiny"
                            onClick={() => recruitToParty(s)}
                          >
                            Invite
                          </button>
                        </div>
                      ))}
                      {SEED_ROSTER.filter((s) =>
                        player.party.members.includes(s.id),
                      ).map((s) => (
                        <div key={s.id} className="quest-row inparty">
                          <span
                            className="qr-rank"
                            style={{
                              background: RANK_COLORS[s.rank],
                            }}
                          >
                            {s.rank}
                          </span>
                          <div className="qr-main">
                            <div className="qr-title">{s.name}</div>
                            <div className="qr-sub">In your party ✓</div>
                          </div>
                        </div>
                      ))}
                    </React.Fragment>
                  ) : (
                    <button className="btn gold" onClick={formParty}>
                      Form a party
                    </button>
                  )}
                </section>
              )}
              {tab === "sheet" && (
                <section>
                  <div className="profile-head">
                    <div className="ava-wrap">
                      {player.avatar ? (
                        <img
                          className="ava"
                          src={player.avatar}
                          alt="Your portrait"
                        />
                      ) : (
                        <div className="ava ava-empty">✦</div>
                      )}
                      <label className="ava-edit" title="Change portrait">
                        Change
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          style={{
                            display: "none",
                          }}
                        />
                      </label>
                    </div>
                    <div className="profile-id">
                      <h2
                        className="h2"
                        style={{
                          margin: 0,
                        }}
                      >
                        {player.name}
                      </h2>
                      <div className="qr-sub">
                        Adventurer of the {player.profile.city}
                      </div>
                    </div>
                    <button
                      className={"gear " + (settingsOpen ? "on" : "")}
                      onClick={() => setSettingsOpen(!settingsOpen)}
                      title="Account settings"
                      aria-label="Account settings"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3.2" />
                        <path d="M12 2.8 l1.2 2.6 2.8 .5 2 -2 1.1 1.1 -2 2 .5 2.8 2.6 1.2 -2.6 1.2 -.5 2.8 2 2 -1.1 1.1 -2 -2 -2.8 .5 -1.2 2.6 -1.2 -2.6 -2.8 -.5 -2 2 -1.1 -1.1 2 -2 -.5 -2.8 -2.6 -1.2 2.6 -1.2 .5 -2.8 -2 -2 1.1 -1.1 2 2 2.8 -.5 z" />
                      </svg>
                    </button>
                  </div>
                  {settingsOpen && (
                    <div className="panel settings">
                      <h3
                        className="h3"
                        style={{
                          marginTop: 0,
                        }}
                      >
                        Personal details
                      </h3>
                      <div className="set-grid">
                        <label>
                          Adventurer name
                          <div style={{ display: "flex", gap: "8px" }}>
                            <input
                              className="field"
                              value={
                                usingRealBackend
                                  ? supabaseAuth.profile.display_name
                                  : player.name
                              }
                              readOnly={usingRealBackend}
                              onChange={(s) =>
                                !usingRealBackend &&
                                setPlayer((S) => ({
                                  ...S,
                                  name: s.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="btn tiny"
                              onClick={rerollNickname}
                              title="Get a new adventurer nickname"
                            >
                              🎲 Reroll
                            </button>
                          </div>
                        </label>
                        <label>
                          Email
                          <input
                            className="field"
                            value={player.profile.email}
                            onChange={(s) =>
                              setPlayer((S) => ({
                                ...S,
                                profile: {
                                  ...S.profile,
                                  email: s.target.value,
                                },
                              }))
                            }
                            placeholder="you@realm.com"
                          />
                        </label>
                        <label>
                          Phone
                          <input
                            className="field"
                            value={player.profile.phone}
                            onChange={(s) =>
                              setPlayer((S) => ({
                                ...S,
                                profile: {
                                  ...S.profile,
                                  phone: s.target.value,
                                },
                              }))
                            }
                            placeholder="+1 555 0100"
                          />
                        </label>
                      </div>
                      <h3 className="h3">Payment & tax</h3>
                      <p
                        className="fine"
                        style={{
                          marginTop: 0,
                        }}
                      >
                        Prototype only — do not enter real bank, card, or tax
                        details here. In production this connects to a secure
                        payment processor and identity vault.
                      </p>
                      <div className="set-grid">
                        <label>
                          Payout preference
                          <select
                            className="field"
                            value={player.profile.payout}
                            onChange={(s) =>
                              setPlayer((S) => ({
                                ...S,
                                profile: {
                                  ...S.profile,
                                  payout: s.target.value,
                                },
                              }))
                            }
                          >
                            <option>Guild scrip</option>
                            <option>Bank transfer (demo)</option>
                            <option>Barter only</option>
                          </select>
                        </label>
                        <label>
                          Tax ID (demo)
                          <input
                            className="field"
                            value={player.profile.taxId}
                            onChange={(s) =>
                              setPlayer((S) => ({
                                ...S,
                                profile: {
                                  ...S.profile,
                                  taxId: s.target.value,
                                },
                              }))
                            }
                            placeholder="XX-XXXXXXX"
                          />
                        </label>
                      </div>
                      {supabaseAuth?.session && (
                        <>
                          <p className="fine">
                            Real backend infrastructure (Stripe test mode — no
                            payment methods attached yet): connect a payout
                            account to see the onboarding flow end-to-end.
                          </p>
                          <button
                            className="btn gold"
                            disabled={connectingPayout}
                            onClick={async () => {
                              setConnectingPayout(true);
                              setConnectPayoutError("");
                              try {
                                let { data, error } =
                                  await supabase.functions.invoke(
                                    "stripe-connect-onboarding",
                                    { method: "POST" },
                                  );
                                if (error) throw error;
                                if (data?.url) window.location.href = data.url;
                              } catch (err) {
                                setConnectPayoutError(
                                  err.message || "Could not start onboarding.",
                                );
                              } finally {
                                setConnectingPayout(false);
                              }
                            }}
                          >
                            {connectingPayout
                              ? "Connecting…"
                              : "Connect payout account (Stripe)"}
                          </button>
                          {connectPayoutError && (
                            <p className="fine">{connectPayoutError}</p>
                          )}
                        </>
                      )}
                      <h3 className="h3">Preferences</h3>
                      <div className="set-grid">
                        <label>
                          Chapter theme
                          <select
                            className="field"
                            value={player.profile.city}
                            onChange={(s) =>
                              setPlayer((S) => ({
                                ...S,
                                profile: {
                                  ...S.profile,
                                  city: s.target.value,
                                },
                              }))
                            }
                          >
                            <option>High Fantasy Chapter</option>
                            <option disabled={true}>
                              Neo-Kyoto (cyberpunk) — coming soon
                            </option>
                            <option disabled={true}>
                              The Athenaeum (Victorian) — coming soon
                            </option>
                            <option disabled={true}>
                              The Speakeasy (roaring '20s) — coming soon
                            </option>
                          </select>
                        </label>
                        <label
                          className="check-row"
                          style={{
                            margin: "20px 0 0",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={player.profile.notify}
                            onChange={(s) =>
                              setPlayer((S) => ({
                                ...S,
                                profile: {
                                  ...S.profile,
                                  notify: s.target.checked,
                                },
                              }))
                            }
                          />
                          <span>
                            Ravens (notifications) about new postings & seals
                          </span>
                        </label>
                        <label
                          className={
                            "check-row" + (canBeSteward ? "" : " disabled")
                          }
                          style={{
                            margin: "8px 0 0",
                          }}
                        >
                          <input
                            type="checkbox"
                            disabled={!canBeSteward}
                            checked={!!player.profile.isSteward}
                            onChange={(s) =>
                              setPlayer((S) => ({
                                ...S,
                                profile: {
                                  ...S.profile,
                                  isSteward: s.target.checked,
                                },
                              }))
                            }
                          />
                          <span>
                            Steward tools (prototype-only: approve other
                            members' postings below your own rank in the
                            Guildhall — Rank {RANKS[4]}/{RANKS[5]}/{RANKS[6]}{" "}
                            requests always need the Guild Council)
                            {!canBeSteward &&
                              ` — requires Rank ${RANKS[4]} or higher`}
                          </span>
                        </label>
                        {supabaseAuth?.profile?.is_admin && (
                          <button
                            className="btn gold"
                            style={{ marginTop: "12px" }}
                            onClick={() => setTab("admin")}
                          >
                            Open Admin Console
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <h2 className="h2">Character Sheet</h2>
                  <div className="panel sheet-head">
                    <div
                      className="rank-seal"
                      style={{
                        borderColor: RANK_COLORS[player.rank],
                        color: RANK_COLORS[player.rank],
                      }}
                    >
                      {player.rank}
                    </div>
                    <div>
                      <div
                        className="qr-title"
                        style={{
                          fontSize: 18,
                        }}
                      >
                        {player.name}
                      </div>
                      <div className="qr-sub">
                        Level {currentLevel} Adventurer ·{" "}
                        {player.completed.length} deeds done
                      </div>
                      <div className="xpbar">
                        <div
                          className="xpfill"
                          style={{
                            width: `${Math.round(((player.xp - xpForLevel(currentLevel)) / (xpForLevel(currentLevel + 1) - xpForLevel(currentLevel))) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="qr-sub">
                        {player.xp - xpForLevel(currentLevel)}/
                        {xpForLevel(currentLevel + 1) -
                          xpForLevel(currentLevel)}{" "}
                        XP to Level {currentLevel + 1} · {player.xp} total XP
                      </div>
                    </div>
                  </div>
                  {nextRank && (
                    <div className="panel">
                      <b>
                        Rank Trial — {player.rank} → {nextRank}
                      </b>
                      <div
                        className="qr-sub"
                        style={{
                          margin: "4px 0 8px",
                        }}
                      >
                        Requires {RANK_XP_THRESHOLD[nextRank]} total XP — each
                        rank demands far more than the last.{" "}
                        {canAttemptTrial
                          ? "You are ready."
                          : `${RANK_XP_THRESHOLD[nextRank] - player.xp} XP remains.`}
                      </div>
                      <button
                        className="btn tiny gold"
                        disabled={!canAttemptTrial}
                        onClick={attemptRankTrial}
                      >
                        Undertake the trial
                      </button>
                    </div>
                  )}
                  <h3 className="h3">Attributes — Select</h3>
                  <p className="qr-sub">
                    Deeds shape you. Attributes grow without limit; their frames
                    ascend from Novice to Legendary as they climb.
                  </p>
                  <div className="mvc-wrap">
                    <div className="mvc-grid">
                      {STAT_KEYS.map((s) => {
                        let [, , S] = tierForStat(player.stats[s]);
                        return (
                          <button
                            key={s}
                            className={
                              "mvc-tile " + (sheetStatTab === s ? "sel" : "")
                            }
                            style={{
                              "--tc": S,
                            }}
                            onClick={() => setSheetStatTab(s)}
                          >
                            <span className="mvc-ico">
                              <StatIcon s={s} />
                            </span>
                            <span className="mvc-abbr">{s}</span>
                            <span className="mvc-val">{player.stats[s]}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div
                      className="mvc-detail"
                      style={{
                        "--tc": tierForStat(player.stats[sheetStatTab])[2],
                      }}
                    >
                      <div className="mvc-big">
                        {player.stats[sheetStatTab]}
                      </div>
                      <div className="mvc-dname">
                        <span className="mvc-dico">
                          <StatIcon s={sheetStatTab} />
                        </span>
                        {STAT_NAMES[sheetStatTab]}
                      </div>
                      <div className="mvc-tier">
                        {tierForStat(player.stats[sheetStatTab])[1]} frame
                      </div>
                      <p className="mvc-lore">
                        {STAT_DESCRIPTIONS[sheetStatTab]}
                      </p>
                    </div>
                  </div>
                  <h3 className="h3">Achievements</h3>
                  <div className="ach-grid">
                    {ACHIEVEMENTS.map((s) => (
                      <div
                        key={s.id}
                        className={
                          "ach " +
                          (player.achievements.includes(s.id) ? "got" : "")
                        }
                      >
                        <span className="ach-ico">{s.icon}</span>
                        <div>
                          <b>{s.name}</b>
                          <div className="qr-sub">{s.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="btn ghost"
                    style={{
                      marginTop: 20,
                    }}
                    onClick={signOut}
                  >
                    Leave the guild (reset demo)
                  </button>
                </section>
              )}
              {tab === "tavern" && (
                <section>
                  <h2 className="h2">The Tavern</h2>
                  {rankIndex < 1 ? (
                    <div className="panel locked-panel">
                      <div className="big-lock">🚪</div>
                      <b>The doors are barred to Rank F.</b>
                      <p
                        className="qr-sub"
                        style={{
                          marginTop: 6,
                        }}
                      >
                        Prove yourself with F-rank quests and pass your trial
                        into Rank E. Then the hearth, the hall, and the higher
                        contracts await.
                      </p>
                    </div>
                  ) : (
                    <React.Fragment>
                      <div className="panel">
                        <b>
                          {player.atTavern
                            ? "You are inside the Tavern."
                            : "You are away from the Tavern."}
                        </b>
                        <p
                          className="qr-sub"
                          style={{
                            margin: "4px 0 10px",
                          }}
                        >
                          Rank B and above contracts can only be accepted within
                          these walls.
                        </p>
                        <button
                          className="btn tiny gold"
                          onClick={() =>
                            setPlayer((s) => ({
                              ...s,
                              atTavern: !s.atTavern,
                            }))
                          }
                        >
                          {player.atTavern
                            ? "Check out"
                            : "Check in (demo: geolocated at door)"}
                        </button>
                      </div>
                      <div className="panel">
                        <b>Guild Membership</b>
                        <ul className="perk-list">
                          <li>✓ Job insurance for all sanctioned quests</li>
                          <li>
                            {rankIndex >= 2 ? "\u2713" : "\u2717"} Club entry
                            after dark (Rank D and above)
                          </li>
                          <li>✓ Access to the barter board & seasonal buffs</li>
                        </ul>
                      </div>
                      <h3 className="h3">Buffs & Boons — redeem at the bar</h3>
                      {BUFFS.map((s) => (
                        <div key={s.id} className="quest-row">
                          <span className="ach-ico">{s.icon}</span>
                          <div className="qr-main">
                            <div className="qr-title">{s.name}</div>
                            <div className="qr-sub">{s.desc}</div>
                          </div>
                          <button
                            className="btn tiny"
                            disabled={!player.atTavern}
                            onClick={() =>
                              showToast(
                                `Redeemed: ${s.redeem}. Show this to the barkeep.`,
                              )
                            }
                          >
                            Redeem
                          </button>
                        </div>
                      ))}
                      <p className="fine">
                        Other chapters coming: Neo-Kyoto (cyberpunk), The
                        Athenaeum (Victorian), The Speakeasy (roaring '20s) —
                        each city, its own tavern and theme.
                      </p>
                    </React.Fragment>
                  )}
                </section>
              )}
              {tab === "hall" && (
                <section>
                  <h2 className="h2">The Guildhall</h2>
                  {usingRealBackend && (
                    <React.Fragment>
                      {realIsActingSteward && (
                        <div className="bucket steward-ledger">
                          <h3 className="h3">Steward's Ledger</h3>
                          <p className="qr-sub">
                            Visible only to stewards (Rank {RANKS[4]}+) and
                            the Guild Council. A steward may never review
                            their own postings, and may only approve
                            requests strictly below their own rank. Rank{" "}
                            {RANKS[4]}/{RANKS[5]}/{RANKS[6]} requests always
                            need the Guild Council instead of a ranked guild
                            member.
                          </p>
                          <h4 className="h4">
                            Other guild members' postings —{" "}
                            {realStewardQueue.filter((s) => s.employer_id !== supabaseAuth.profile.id).length}
                          </h4>
                          {realStewardQueue.filter((s) => s.employer_id !== supabaseAuth.profile.id).length === 0 && (
                            <p className="empty">Nothing awaiting review.</p>
                          )}
                          {realStewardQueue
                            .filter((s) => s.employer_id !== supabaseAuth.profile.id)
                            .map((s) => (
                              <div key={s.id} className="quest-row">
                                <span
                                  className="qr-rank"
                                  style={{ background: RANK_COLORS[s.rank] }}
                                >
                                  {s.rank}
                                </span>
                                <div className="qr-main">
                                  <div className="qr-title">{s.title}</div>
                                  <div className="qr-sub">
                                    {s.employer?.display_name ?? "Unknown"} ·{" "}
                                    {s.is_barter ? `Barter: ${s.barter_for}` : `${s.scrip} scrip`}
                                  </div>
                                </div>
                                {realCanStewardApprove(s) ? (
                                  <div className="pet-actions">
                                    <button
                                      className="btn tiny gold"
                                      onClick={() => approveQueuedPosting(s)}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="btn tiny ghost"
                                      onClick={() => rejectQueuedPosting(s)}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <div className="qr-sub">
                                    {RANKS.indexOf(s.rank) >= 4
                                      ? "Requires Guild Council approval"
                                      : "Requires a higher-ranked steward"}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                      {realStewardQueue.filter((s) => s.employer_id === supabaseAuth.profile.id).length > 0 && (
                        <div className="bucket">
                          <h4 className="h4">Your postings awaiting Council review</h4>
                          {realStewardQueue
                            .filter((s) => s.employer_id === supabaseAuth.profile.id)
                            .map((s) => (
                              <div key={s.id} className="quest-row">
                                <span
                                  className="qr-rank"
                                  style={{ background: RANK_COLORS[s.rank] }}
                                >
                                  {s.rank}
                                </span>
                                <div className="qr-main">
                                  <div className="qr-title">{s.title}</div>
                                  <div className="qr-sub">
                                    {s.is_barter ? `Barter: ${s.barter_for}` : `${s.scrip} scrip`}
                                  </div>
                                </div>
                                <div className="qr-sub">Awaiting the Council</div>
                              </div>
                            ))}
                        </div>
                      )}
                      {realDisputes.length > 0 && (
                        <div className="bucket">
                          <h4 className="h4">Open disputes — {realDisputes.length}</h4>
                          {realDisputes.map((d) => (
                            <div key={d.id} className="quest-row">
                              <div className="qr-main">
                                <div className="qr-title">{d.posting?.title}</div>
                                <div className="qr-sub">
                                  {d.raised_by_profile?.display_name ?? "Someone"} rated{" "}
                                  {d.against_profile?.display_name ?? "someone"}{" "}
                                  {"★".repeat(d.rating)}
                                </div>
                              </div>
                              {realIsActingSteward && (
                                <button
                                  className="btn tiny gold"
                                  onClick={() => resolveDisputeReal(d)}
                                >
                                  Resolve
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  )}
                  {!usingRealBackend && isActingSteward && (
                    <div className="bucket steward-ledger">
                      <h3 className="h3">Steward's Ledger</h3>
                      <p className="qr-sub">
                        Visible only to stewards (Rank {RANKS[4]}+). A steward
                        may never review their own postings or disputes, and
                        may only approve requests strictly below their own
                        rank. Rank {RANKS[4]}/{RANKS[5]}/{RANKS[6]} requests
                        always need the Guild Council instead of a ranked
                        guild member.
                      </p>
                      <h4 className="h4">
                        Your postings awaiting Council review —{" "}
                        {player.myPostings.filter((s) => s.status === "pendingReview").length}
                      </h4>
                      {player.myPostings.filter((s) => s.status === "pendingReview").length === 0 && (
                        <p className="empty">Nothing awaiting review.</p>
                      )}
                      {player.myPostings
                        .filter((s) => s.status === "pendingReview")
                        .map((s) => (
                          <div key={s.id} className="quest-row">
                            <span
                              className="qr-rank"
                              style={{ background: RANK_COLORS[s.rank] }}
                            >
                              {s.rank}
                            </span>
                            <div className="qr-main">
                              <div className="qr-title">{s.title}</div>
                              <div className="qr-sub">
                                {s.employer} ·{" "}
                                {s.barter ? `Barter: ${s.barterFor}` : `${s.scrip} scrip`}
                              </div>
                            </div>
                            <div className="qr-sub">Awaiting the Council</div>
                          </div>
                        ))}
                      <h4 className="h4">
                        Your own disputed postings —{" "}
                        {player.myPostings.filter((s) => s.disputed).length}
                      </h4>
                      {player.myPostings.filter((s) => s.disputed).length === 0 && (
                        <p className="empty">No open disputes on your postings.</p>
                      )}
                      {player.myPostings
                        .filter((s) => s.disputed)
                        .map((s) => (
                          <div key={s.id} className="quest-row">
                            <div className="qr-main">
                              <div className="qr-title">{s.title}</div>
                              <div className="qr-sub">
                                You rated {s.taker && s.taker.name}{" "}
                                {"★".repeat(s.myRating)} as employer
                              </div>
                            </div>
                            <div className="qr-sub">Awaiting the Council</div>
                          </div>
                        ))}
                      <h4 className="h4">
                        Your disputes as a taker —{" "}
                        {(player.disputes || []).length}
                      </h4>
                      {(player.disputes || []).length === 0 && (
                        <p className="empty">No open disputes.</p>
                      )}
                      {(player.disputes || []).map((d) => (
                        <div key={d.id} className="quest-row">
                          <div className="qr-main">
                            <div className="qr-title">{d.title}</div>
                            <div className="qr-sub">
                              You rated {d.employer} {"★".repeat(d.rating)} as
                              their taker
                            </div>
                          </div>
                          <div className="qr-sub">Awaiting the Council</div>
                        </div>
                      ))}
                      <h4 className="h4">
                        Other guild members' postings —{" "}
                        {(player.stewardQueue || []).filter((s) => s.status === "pendingReview").length}
                      </h4>
                      {(player.stewardQueue || []).filter((s) => s.status === "pendingReview").length === 0 && (
                        <p className="empty">Nothing awaiting review.</p>
                      )}
                      {(player.stewardQueue || [])
                        .filter((s) => s.status === "pendingReview")
                        .map((s) => (
                          <div key={s.id} className="quest-row">
                            <span
                              className="qr-rank"
                              style={{ background: RANK_COLORS[s.rank] }}
                            >
                              {s.rank}
                            </span>
                            <div className="qr-main">
                              <div className="qr-title">{s.title}</div>
                              <div className="qr-sub">
                                {s.employer} ·{" "}
                                {s.barter ? `Barter: ${s.barterFor}` : `${s.scrip} scrip`}
                              </div>
                            </div>
                            {canStewardApprove(s) ? (
                              <div className="pet-actions">
                                <button
                                  className="btn tiny gold"
                                  onClick={() => approveQueuedPosting(s)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn tiny ghost"
                                  onClick={() => rejectQueuedPosting(s)}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="qr-sub">
                                {RANKS.indexOf(s.rank) >= 4
                                  ? "Requires Guild Council approval"
                                  : "Requires a higher-ranked steward"}
                              </div>
                            )}
                          </div>
                        ))}
                      <h4 className="h4">Recent steward actions</h4>
                      {(player.stewardLog || []).length === 0 && (
                        <p className="empty">No actions logged yet.</p>
                      )}
                      {(player.stewardLog || []).slice(0, 8).map((l) => (
                        <div key={l.id} className="qr-sub steward-log-row">
                          {l.actor} {l.action} "{l.title}" —{" "}
                          {new Date(l.ts).toLocaleDateString()}
                        </div>
                      ))}
                    </div>
                  )}
                  <h3 className="h3">Notice Board (forum)</h3>
                  {forumPosts.map((s) => (
                    <div key={s.id} className="quest-row">
                      <div className="qr-main">
                        <div className="qr-title">{s.title}</div>
                        <div className="qr-sub">
                          {s.tag} · {s.author} · {s.replies} replies
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="composer">
                    <input
                      className="field"
                      placeholder={"Pin a new notice\u2026"}
                      value={noticeDraft}
                      onChange={(s) => setNoticeDraft(s.target.value)}
                    />
                    <button
                      className="btn tiny"
                      disabled={!noticeDraft.trim()}
                      onClick={() => {
                        (setForumPosts([
                          {
                            id: "f" + Date.now(),
                            title: noticeDraft,
                            author: player.name,
                            replies: 0,
                            tag: "General",
                          },
                          ...forumPosts,
                        ]),
                          setNoticeDraft(""));
                      }}
                    >
                      Pin
                    </button>
                  </div>
                  <h3 className="h3">Ravens (messages)</h3>
                  {activeThreadId ? (
                    <div className="panel">
                      <button
                        className="btn tiny ghost"
                        onClick={() => setActiveThreadId(null)}
                      >
                        ← All ravens
                      </button>
                      {dmThreads
                        .find((s) => s.id === activeThreadId)
                        .msgs.map((s, S) => (
                          <div
                            key={S}
                            className={"bubble " + (s.me ? "me" : "")}
                          >
                            {s.t}
                          </div>
                        ))}
                      <div className="composer">
                        <input
                          className="field"
                          placeholder={"Write a message\u2026"}
                          value={messageDraft}
                          onChange={(s) => setMessageDraft(s.target.value)}
                        />
                        <button
                          className="btn tiny"
                          disabled={!messageDraft.trim()}
                          onClick={() => {
                            (setDmThreads(
                              dmThreads.map((s) =>
                                s.id === activeThreadId
                                  ? {
                                      ...s,
                                      msgs: [
                                        ...s.msgs,
                                        {
                                          me: true,
                                          t: messageDraft,
                                        },
                                      ],
                                    }
                                  : s,
                              ),
                            ),
                              setMessageDraft(""));
                          }}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  ) : (
                    dmThreads.map((s) => (
                      <div
                        key={s.id}
                        className="quest-row"
                        style={{
                          cursor: "pointer",
                        }}
                        onClick={() => setActiveThreadId(s.id)}
                      >
                        <div className="qr-main">
                          <div className="qr-title">{s.withWhom}</div>
                          <div className="qr-sub">
                            {s.msgs[s.msgs.length - 1].t.slice(0, 60)}…
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <h3 className="h3">
                    Petition the Guild Council (contact admin)
                  </h3>
                  <div className="composer">
                    <input
                      className="field"
                      placeholder={"Report an issue, dispute a quest, request support\u2026"}
                      value={petitionDraft}
                      onChange={(s) => setPetitionDraft(s.target.value)}
                    />
                    <button
                      className="btn tiny"
                      disabled={!petitionDraft.trim()}
                      onClick={() => {
                        (setPetitionDraft(""),
                          showToast(
                            "Petition delivered to the Council. Expect a raven within 2 days.",
                          ));
                      }}
                    >
                      Send
                    </button>
                  </div>
                </section>
              )}
              {tab === "admin" && supabaseAuth?.profile?.is_admin && (
                <AdminConsole profile={supabaseAuth.profile} onBack={() => setTab("sheet")} />
              )}
            </main>
            <nav className="tabs">
              {[
                ["boards", "Boards"],
                ["quests", "Quests"],
                ["party", "Party"],
                ["tavern", "Tavern"],
                ["hall", "Hall"],
              ].map(([s, S]) => (
                <button
                  key={s}
                  className={"tab " + (tab === s ? "on" : "")}
                  onClick={() => setTab(s)}
                >
                  <NavIcon k={s} />
                  <span>{S}</span>
                </button>
              ))}
            </nav>
          </React.Fragment>
        )}
        {openQuest && (
          <div className="overlay" onClick={() => setOpenQuest(null)}>
            <div className="modal" onClick={(s) => s.stopPropagation()}>
              <div
                className="modal-rank"
                style={{
                  color: RANK_COLORS[openQuest.rank],
                }}
              >
                RANK {openQuest.rank} · {openQuest.type.toUpperCase()}
              </div>
              <h3 className="modal-title">{openQuest.title}</h3>
              <p className="modal-desc">{openQuest.desc}</p>
              <div className="modal-meta">
                <div>
                  <b>Employer</b> {openQuest.employer}
                </div>
                <div>
                  <b>Reward</b>{" "}
                  {openQuest.barter
                    ? `Barter \u2014 ${openQuest.barterFor}`
                    : `${openQuest.scrip} scrip`}
                </div>
                <div>
                  <b>Grants</b> +{XP_PER_RANK[openQuest.rank]} XP ·{" "}
                  {Object.entries(openQuest.stats)
                    .map(([s, S]) => `+${S} ${s}`)
                    .join(" \xB7 ")}
                </div>
                {openQuest.tavernOnly && (
                  <div className="warn">⚑ Accepted only inside the Tavern</div>
                )}
                {openQuest.partyAdvised && (
                  <div className="warn">⚑ Party strongly advised</div>
                )}
              </div>
              <div className="modal-actions">
                {openQuest.mine ? (
                  <button className="btn ghost" disabled={true}>
                    Your posting — awaiting takers
                  </button>
                ) : (
                  <React.Fragment>
                    {!usingRealBackend && !player.saved.includes(openQuest.id) && (
                      <button
                        className="btn ghost"
                        onClick={() => {
                          saveToSatchel(openQuest);
                        }}
                      >
                        Save card
                      </button>
                    )}
                    <button
                      className="btn gold"
                      onClick={() => petitionForQuest(openQuest)}
                    >
                      Petition to take
                    </button>
                  </React.Fragment>
                )}
              </div>
            </div>
          </div>
        )}
        {draftPosting && (
          <div className="overlay" onClick={() => setDraftPosting(null)}>
            <div className="modal" onClick={(s) => s.stopPropagation()}>
              <div
                className="modal-rank"
                style={{
                  color: RANK_COLORS[draftPosting.rank],
                }}
              >
                NEW CONTRACT · RANK {draftPosting.rank}
              </div>
              <h3 className="modal-title">Post to the boards</h3>
              <input
                className="field wood-field"
                placeholder={"Title \u2014 e.g. The Leaning Bookshelf"}
                value={draftPosting.title}
                onChange={(s) =>
                  setDraftPosting({
                    ...draftPosting,
                    title: s.target.value,
                  })
                }
              />
              <input
                className="field wood-field"
                placeholder={"Describe the deed to be done\u2026"}
                value={draftPosting.desc}
                onChange={(s) =>
                  setDraftPosting({
                    ...draftPosting,
                    desc: s.target.value,
                  })
                }
              />
              <div className="form-row">
                <span className="form-label">Rank</span>
                <div className="pick-row">
                  {RANKS.map((s) => (
                    <button
                      key={s}
                      className={
                        "chip " + (draftPosting.rank === s ? "on" : "")
                      }
                      style={{
                        color: RANK_COLORS[s],
                        borderColor:
                          draftPosting.rank === s ? RANK_COLORS[s] : "#8a7a5e",
                      }}
                      onClick={() =>
                        setDraftPosting({
                          ...draftPosting,
                          rank: s,
                          stats: draftPosting.stats.slice(
                            0,
                            statRewardForRank(s).cap,
                          ),
                        })
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <span className="form-label">Nature of the deed</span>
                <div className="pick-row">
                  {[
                    "Search",
                    "Labor",
                    "Social",
                    "Craft",
                    "Scholarly",
                    "Adventure",
                    "Grand",
                  ].map((s) => (
                    <button
                      key={s}
                      className={
                        "chip " + (draftPosting.type === s ? "on" : "")
                      }
                      style={{
                        color: "#3A1408",
                        borderColor:
                          draftPosting.type === s
                            ? "#571E0C"
                            : "rgba(30,17,5,.4)",
                      }}
                      onClick={() =>
                        setDraftPosting({
                          ...draftPosting,
                          type: s,
                        })
                      }
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <span className="form-label">
                  Trains ({draftPosting.stats.length}/
                  {statRewardForRank(draftPosting.rank).cap} ·{" "}
                  {statRewardForRank(draftPosting.rank).pts} pts total)
                </span>
                <div className="pick-row">
                  {STAT_KEYS.map((s) => {
                    let S = draftPosting.stats.includes(s),
                      N =
                        !S &&
                        draftPosting.stats.length >=
                          statRewardForRank(draftPosting.rank).cap;
                    return (
                      <button
                        key={s}
                        className={"stat-pick " + (S ? "on" : "")}
                        disabled={N}
                        onClick={() =>
                          setDraftPosting({
                            ...draftPosting,
                            stats: S
                              ? draftPosting.stats.filter((U) => U !== s)
                              : [...draftPosting.stats, s],
                          })
                        }
                      >
                        <StatIcon s={s} />
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-row">
                <span className="form-label">Payment</span>
                <div className="pick-row">
                  <button
                    className={"chip " + (draftPosting.barter ? "" : "on")}
                    onClick={() =>
                      setDraftPosting({
                        ...draftPosting,
                        barter: false,
                      })
                    }
                  >
                    Scrip
                  </button>
                  <button
                    className={"chip " + (draftPosting.barter ? "on" : "")}
                    onClick={() =>
                      setDraftPosting({
                        ...draftPosting,
                        barter: true,
                      })
                    }
                  >
                    Barter
                  </button>
                </div>
              </div>
              {draftPosting.barter ? (
                <input
                  className="field wood-field"
                  placeholder="What do you offer in trade?"
                  value={draftPosting.barterFor}
                  onChange={(s) =>
                    setDraftPosting({
                      ...draftPosting,
                      barterFor: s.target.value,
                    })
                  }
                />
              ) : (
                <input
                  className="field wood-field"
                  type="number"
                  min="0"
                  placeholder="Scrip offered"
                  value={draftPosting.scrip}
                  onChange={(s) =>
                    setDraftPosting({
                      ...draftPosting,
                      scrip: s.target.value,
                    })
                  }
                />
              )}
              {usingRealBackend && !draftPosting.barter && (
                <PostContractPaymentField ref={cardFieldRef} />
              )}
              {RANKS.indexOf(draftPosting.rank) >= 4 && (
                <div
                  className="warn"
                  style={{
                    fontSize: 13,
                    marginTop: 8,
                  }}
                >
                  ⚑ Rank B+ contracts are only offered inside the Tavern.
                </div>
              )}
              <div className="modal-actions">
                <button
                  className="btn ghost"
                  onClick={() => setDraftPosting(null)}
                >
                  Discard
                </button>
                <button
                  className="btn gold"
                  disabled={
                    !draftPosting.title.trim() ||
                    !draftPosting.desc.trim() ||
                    draftPosting.stats.length === 0 ||
                    (draftPosting.barter && !draftPosting.barterFor.trim())
                  }
                  onClick={submitPosting}
                >
                  Pin to the board
                </button>
              </div>
            </div>
          </div>
        )}
        {ratingTarget && (
          <div className="overlay">
            <div className="modal">
              <h3 className="modal-title">Rate your employer</h3>
              <p className="modal-desc">
                {ratingTarget.employer} — “{ratingTarget.title}”. They will rate
                you as well; your standing shapes the contracts offered to you.
              </p>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    className="star"
                    onClick={() => completeQuestAndRate(ratingTarget, s)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

export default App;
