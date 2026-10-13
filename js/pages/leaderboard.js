// js/pages/leaderboard.js
// Leaderboard — premium redesign with podium + full list.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import { fetchLeaderboard, fetchMyRank } from "../features/leaderboard.js";
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

  myRankCard: document.getElementById("myRankCard"),
  myRankAvatar: document.getElementById("myRankAvatar"),
  myRankName: document.getElementById("myRankName"),
  myRankValue: document.getElementById("myRankValue"),
  myRankScore: document.getElementById("myRankScore"),

  podiumSection: document.getElementById("podiumSection"),
  podiumInner: document.getElementById("podiumInner"),

  lbList: document.getElementById("lbList"),
  lbCount: document.getElementById("lbCount"),
};

/* =========================================================
   USER
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

  renderLoading();

  try {
    const curriculumFilter =
      state.curriculum === "all" ? null : state.curriculum;

    const entries = await fetchLeaderboard({
      timeframe: state.timeframe,
      curriculum: curriculumFilter,
      limit: 200,
    });

    state.entries = entries;
    state.myRank =
      entries.find(
        (e) => e.uid === state.user.uid || e.id === state.user.uid,
      ) || null;

    renderPodium();
    renderList();
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

function renderLoading() {
  if (els.lbList) {
    els.lbList.innerHTML = `
      <div class="glass-loading">
        <div class="spinner"></div>
        <div>Loading rankings…</div>
      </div>
    `;
  }
  els.podiumSection?.classList.add("hidden");
  els.myRankCard?.classList.add("hidden");
}

function renderError() {
  if (els.lbList) {
    els.lbList.innerHTML = `
      <div class="glass-empty">
        <span class="glass-empty-icon">⚠️</span>
        <div class="glass-empty-title">Could not load rankings</div>
        <div class="glass-empty-sub">Check your connection and refresh the page.</div>
      </div>
    `;
  }
}

/* =========================================================
   PODIUM — Top 3
   ========================================================= */

function renderPodium() {
  if (!els.podiumSection || !els.podiumInner) return;

  const top3 = state.entries.slice(0, 3);

  if (top3.length === 0) {
    els.podiumSection.classList.add("hidden");
    return;
  }

  els.podiumSection.classList.remove("hidden");

  // Arrange visually: 2nd, 1st, 3rd
  const arrangement = [];
  if (top3[1]) arrangement.push({ ...top3[1], rank: 2 });
  if (top3[0]) arrangement.push({ ...top3[0], rank: 1 });
  if (top3[2]) arrangement.push({ ...top3[2], rank: 3 });

  els.podiumInner.innerHTML = arrangement
    .map((p) => {
      const medal = p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉";
      const isMe = (p.uid || p.id) === state.user.uid;
      return `
        <div class="lb-podium-card rank-${p.rank}">
          <div class="lb-podium-medal">${medal}</div>
          <div class="lb-podium-avatar">${initials(p.name || "P")}</div>
          <div class="lb-podium-name">
            ${escapeHTML(p.name || "Anonymous")}
            ${isMe ? '<div class="lb-row-you-badge" style="margin-top: 4px;">You</div>' : ""}
          </div>
          <div class="lb-podium-school">${escapeHTML(p.school || "—")}</div>
          <div class="lb-podium-score">${formatNumber(p.totalScore || 0)}</div>
          <div class="lb-podium-score-label">points</div>
        </div>
      `;
    })
    .join("");
}

/* =========================================================
   FULL LIST — Ranks 4+
   ========================================================= */

function renderList() {
  if (!els.lbList) return;

  const rest = state.entries.slice(3); // ranks 4+

  if (rest.length === 0) {
    if (state.entries.length === 0) {
      els.lbList.innerHTML = `
        <div class="glass-empty">
          <span class="glass-empty-icon">📊</span>
          <div class="glass-empty-title">No rankings yet</div>
          <div class="glass-empty-sub">Be the first to top the leaderboard — take a quiz!</div>
        </div>
      `;
    } else {
      els.lbList.innerHTML = `
        <div class="glass-empty">
          <span class="glass-empty-icon">🎉</span>
          <div class="glass-empty-title">You're in the top 3!</div>
          <div class="glass-empty-sub">Keep it up.</div>
        </div>
      `;
    }
    if (els.lbCount)
      els.lbCount.textContent = `${state.entries.length} learner${state.entries.length === 1 ? "" : "s"}`;
    return;
  }

  els.lbList.innerHTML = rest
    .map((entry) => {
      const uid = entry.uid || entry.id;
      const isMe = uid === state.user.uid;
      const rank = entry.rank || "—";
      const totalScore = entry.totalScore || 0;
      const totalQuizzes = entry.totalQuizzes || 0;

      return `
        <div class="lb-row-v2${isMe ? " is-me" : ""}">
          <div class="lb-row-rank">${rank}</div>
          <div class="lb-row-user">
            <div class="lb-row-avatar">${initials(entry.name || "?")}</div>
            <div class="lb-row-info">
              <div class="lb-row-name">
                ${escapeHTML(entry.name || "Anonymous")}
                ${isMe ? '<span class="lb-row-you-badge">You</span>' : ""}
              </div>
              <div class="lb-row-meta">
                ${escapeHTML(entry.school || "—")} · ${totalQuizzes} ${totalQuizzes === 1 ? "quiz" : "quizzes"}
              </div>
            </div>
          </div>
          <div class="lb-row-score">
            <div class="lb-row-score-value">${formatNumber(totalScore)}</div>
            <div class="lb-row-score-label">points</div>
          </div>
        </div>
      `;
    })
    .join("");

  if (els.lbCount) {
    els.lbCount.textContent = `${state.entries.length} learner${state.entries.length === 1 ? "" : "s"}`;
  }
}

/* =========================================================
   MY RANK CARD
   ========================================================= */

function renderMyRank() {
  if (!els.myRankCard) return;

  if (!state.myRank) {
    els.myRankCard.classList.remove("hidden");
    if (els.myRankAvatar)
      els.myRankAvatar.textContent = initials(state.userDoc?.name || "You");
    if (els.myRankName) els.myRankName.textContent = "You're not ranked yet";
    if (els.myRankValue) els.myRankValue.textContent = "#—";
    if (els.myRankScore) els.myRankScore.textContent = "Take a quiz to enter";
    return;
  }

  els.myRankCard.classList.remove("hidden");

  const entry = state.myRank;
  const displayName = entry.name || state.userDoc?.name || "You";
  const totalScore = entry.totalScore || 0;
  const rank = entry.rank || 0;

  if (els.myRankAvatar) els.myRankAvatar.textContent = initials(displayName);
  if (els.myRankName) els.myRankName.textContent = displayName;
  if (els.myRankValue)
    els.myRankValue.textContent = rank <= 3 ? `#${rank}` : `#${rank}`;
  if (els.myRankScore)
    els.myRankScore.textContent = `${formatNumber(totalScore)} points`;
}

/* =========================================================
   HELPERS
   ========================================================= */

function formatNumber(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString();
}

/* =========================================================
   TABS + CHIPS
   ========================================================= */

function wireTimeframeTabs() {
  document.querySelectorAll(".lb-time-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".lb-time-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.timeframe = tab.dataset.timeframe || "all";
      loadLeaderboard();
    });
  });
}

function wireCurriculumChips() {
  document.querySelectorAll(".lb-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".lb-chip")
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
    message: `Signed in as ${state.user?.email || "Student"}.\n\nSign out?`,
    okLabel: "Sign Out",
    cancelLabel: "Stay",
    danger: true,
  });

  if (ok) {
    try {
      await signOutNow();
      window.location.replace("login.html");
    } catch (e) {
      toastErr("Could not sign out.");
    }
  }
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  const ready = await setupUser();
  if (!ready) return;

  initNav();
  wireTimeframeTabs();
  wireCurriculumChips();
  els.userMenuBtn?.addEventListener("click", handleUserMenu);

  await loadLeaderboard();
  log.info(`Leaderboard ready: ${state.entries.length} entries`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
