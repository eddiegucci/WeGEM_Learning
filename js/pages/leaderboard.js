// js/pages/leaderboard.js
// Controller for leaderboard.html.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import {
  fetchLeaderboard,
  fetchMyRank,
  formatRank,
} from "../features/leaderboard.js";
import { initNav } from "../ui/nav.js";
import { toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import { escapeHTML, firstName, initials, log } from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  entries: [],
  myRank: null,
  timeframe: "all",
  curriculum: "all",
  loading: false,
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  lbList: document.getElementById("lbList"),
  myRankCard: document.getElementById("myRankCard"),
  myRankAvatar: document.getElementById("myRankAvatar"),
  myRankName: document.getElementById("myRankName"),
  myRankValue: document.getElementById("myRankValue"),
  myRankScore: document.getElementById("myRankScore"),
};

/* =========================================================
   SETUP USER
   ========================================================= */

async function setupUser() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace("login.html");
    return false;
  }

  state.user = user;

  const cached = getCachedUser();
  const displayName =
    cached?.displayName ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Student";

  if (els.userAvatar) els.userAvatar.textContent = initials(displayName);
  if (els.userNameTop) els.userNameTop.textContent = firstName(displayName);

  try {
    let doc = await getCachedUserFromIDB(user.uid);
    if (!doc) {
      doc = await getUserDoc(user.uid);
      if (doc) await cacheUser(doc);
    }
    state.userDoc = doc;

    if (doc?.name) {
      if (els.userAvatar) els.userAvatar.textContent = initials(doc.name);
      if (els.userNameTop) els.userNameTop.textContent = firstName(doc.name);
    }
  } catch (e) {
    log.warn("Could not load user doc:", e);
  }

  return true;
}

/* =========================================================
   LOAD LEADERBOARD
   ========================================================= */

async function loadLeaderboard() {
  if (state.loading) return;
  state.loading = true;

  showLoading();

  try {
    const curriculumFilter =
      state.curriculum === "all" ? null : state.curriculum;

    const entries = await fetchLeaderboard({
      timeframe: state.timeframe,
      curriculum: curriculumFilter,
      limit: 100,
    });

    state.entries = entries;

    // Find my rank
    const myEntry = entries.find(
      (e) => e.uid === state.user.uid || e.id === state.user.uid,
    );
    state.myRank = myEntry || null;

    renderLeaderboard();
    renderMyRank();
  } catch (e) {
    log.warn("Could not load leaderboard:", e);
    renderError();
  } finally {
    state.loading = false;
  }
}

/* =========================================================
   RENDER
   ========================================================= */

function showLoading() {
  if (!els.lbList) return;
  els.lbList.innerHTML = `
    <div class="loading-wrap">
      <div class="spinner spinner-lg"></div>
      <div>Loading rankings…</div>
    </div>
  `;
}

function renderError() {
  if (!els.lbList) return;
  els.lbList.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-title">Could not load rankings</div>
      <div class="empty-sub">Check your connection and refresh the page.</div>
    </div>
  `;
}

function renderLeaderboard() {
  if (!els.lbList) return;

  if (!state.entries.length) {
    els.lbList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">No rankings yet</div>
        <div class="empty-sub">Be the first to top the leaderboard — take a quiz!</div>
      </div>
    `;
    return;
  }

  const myUid = state.user.uid;

  els.lbList.innerHTML = state.entries
    .map((entry) => {
      const uid = entry.uid || entry.id;
      const isMe = uid === myUid;
      const name = entry.name || "Anonymous";
      const school = entry.school || "—";
      const totalScore = entry.totalScore || 0;
      const totalQuizzes = entry.totalQuizzes || 0;

      // Rank class for top 3
      let rankClass = "";
      if (entry.rank === 1) rankClass = "top-1";
      else if (entry.rank === 2) rankClass = "top-2";
      else if (entry.rank === 3) rankClass = "top-3";

      const rankIcon =
        entry.rank === 1
          ? "🥇"
          : entry.rank === 2
            ? "🥈"
            : entry.rank === 3
              ? "🥉"
              : `#${entry.rank}`;

      return `
      <div class="lb-row ${rankClass}${isMe ? " is-me" : ""}">
        <div class="lb-rank">${rankIcon}</div>
        <div class="lb-user">
          <div class="lb-avatar">${initials(name)}</div>
          <div style="min-width: 0;">
            <div class="lb-name">${escapeHTML(name)}${isMe ? ' <span style="color: var(--gold); font-weight: 700; font-size: 11px;">YOU</span>' : ""}</div>
            <div class="lb-school">${escapeHTML(school)} · ${totalQuizzes} ${totalQuizzes === 1 ? "quiz" : "quizzes"}</div>
          </div>
        </div>
        <div>
          <div class="lb-score">${formatNumber(totalScore)}</div>
          <div class="lb-score-label">points</div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderMyRank() {
  if (!els.myRankCard) return;

  if (!state.myRank) {
    // Show "unranked" state
    els.myRankCard.classList.remove("hidden");
    if (els.myRankAvatar)
      els.myRankAvatar.textContent = initials(state.userDoc?.name || "You");
    if (els.myRankName) els.myRankName.textContent = "You're not ranked yet";
    if (els.myRankValue) els.myRankValue.textContent = "#—";
    if (els.myRankScore) els.myRankScore.textContent = "Take a quiz to enter";
    return;
  }

  els.myRankCard.classList.remove("hidden");

  const myUid = state.user.uid;
  const myEntry = state.entries.find((e) => (e.uid || e.id) === myUid);
  const displayName = myEntry?.name || state.userDoc?.name || "You";
  const totalScore = myEntry?.totalScore || 0;
  const rank = myEntry?.rank || 0;

  if (els.myRankAvatar) els.myRankAvatar.textContent = initials(displayName);
  if (els.myRankName) els.myRankName.textContent = displayName;
  if (els.myRankValue) els.myRankValue.textContent = formatRank(rank);
  if (els.myRankScore)
    els.myRankScore.textContent = `${formatNumber(totalScore)} pts`;
}

function formatNumber(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString();
}

/* =========================================================
   TIMEFRAME TABS
   ========================================================= */

function wireTimeframeTabs() {
  document.querySelectorAll(".lb-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".lb-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.timeframe = tab.dataset.timeframe || "all";
      loadLeaderboard();
    });
  });
}

/* =========================================================
   CURRICULUM FILTER
   ========================================================= */

function wireCurriculumChips() {
  document.querySelectorAll(".filter-bar .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-bar .chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.curriculum = chip.dataset.curriculum || "all";
      loadLeaderboard();
    });
  });
}

/* =========================================================
   USER MENU
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message: `Signed in as ${state.user?.email || "Student"}.\n\nDo you want to sign out?`,
    okLabel: "Sign Out",
    cancelLabel: "Stay",
    danger: true,
  });

  if (ok) {
    try {
      await signOutNow();
      window.location.replace("login.html");
    } catch (e) {
      log.error("Sign out failed:", e);
      toastErr("Could not sign out.");
    }
  }
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();
    wireTimeframeTabs();
    wireCurriculumChips();

    els.userMenuBtn?.addEventListener("click", handleUserMenu);

    await loadLeaderboard();

    log.info(`Leaderboard loaded: ${state.entries.length} entries`);
  } catch (e) {
    log.error("Leaderboard init failed:", e);
    toastErr("Could not load leaderboard.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
