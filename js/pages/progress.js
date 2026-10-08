// js/pages/progress.js
// Controller for progress.html.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import {
  fetchAttempts,
  buildStats,
  subjectBreakdown,
  chartData,
  filterByRange,
} from "../features/progress.js";
import { clearAllCache, STORES, clear } from "../core/cache.js";
import { getSubjectIcon, getSubjectColor } from "../data/subjects.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import {
  escapeHTML,
  firstName,
  initials,
  timeAgo,
  formatDateTime,
  log,
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  attempts: [],
  filtered: [],
  range: "all",
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),

  pStreak: document.getElementById("pStreak"),
  pStreakSub: document.getElementById("pStreakSub"),
  pAvg: document.getElementById("pAvg"),
  pAvgSub: document.getElementById("pAvgSub"),
  pQuizzes: document.getElementById("pQuizzes"),
  pQuizzesSub: document.getElementById("pQuizzesSub"),
  pHours: document.getElementById("pHours"),
  pHoursSub: document.getElementById("pHoursSub"),

  progressChart: document.getElementById("progressChart"),
  chartEmpty: document.getElementById("chartEmpty"),
  chartAvg: document.getElementById("chartAvg"),

  topicList: document.getElementById("topicList"),
  topicCount: document.getElementById("topicCount"),
  historyList: document.getElementById("historyList"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),

  subjectBreakdown: document.getElementById("subjectBreakdown"),
  subjectCount: document.getElementById("subjectCount"),
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
   LOAD ATTEMPTS
   ========================================================= */

async function loadAttempts() {
  try {
    state.attempts = await fetchAttempts(state.user.uid, 200);
  } catch (e) {
    log.warn("Could not load attempts:", e);
    state.attempts = [];
  }

  applyRange();
}

function applyRange() {
  state.filtered = filterByRange(state.attempts, state.range);
  renderAll();
}

/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {
  renderStats();
  renderChart();
  renderTopics();
  renderHistory();
  renderSubjectBreakdown();
}

/* =========================================================
   STATS
   ========================================================= */

function renderStats() {
  const stats = buildStats(state.filtered);

  if (els.pStreak) els.pStreak.textContent = stats.streak;
  if (els.pStreakSub) {
    if (stats.streak === 0) els.pStreakSub.textContent = "Start today";
    else if (stats.streak === 1) els.pStreakSub.textContent = "Just started";
    else if (stats.streak < 7) els.pStreakSub.textContent = "Keep it going!";
    else if (stats.streak < 30) els.pStreakSub.textContent = "On fire! 🔥";
    else els.pStreakSub.textContent = "Unstoppable!";
  }

  if (els.pAvg) {
    els.pAvg.innerHTML = `${stats.averageScore}<span class="st-unit">%</span>`;
  }
  if (els.pAvgSub) {
    const a = stats.averageScore;
    if (!stats.totalAttempts) els.pAvgSub.textContent = "No data yet";
    else if (a >= 80) els.pAvgSub.textContent = "Excellent! 🎉";
    else if (a >= 60) els.pAvgSub.textContent = "Good work!";
    else if (a >= 40) els.pAvgSub.textContent = "Room to grow";
    else els.pAvgSub.textContent = "Keep practicing";
  }

  if (els.pQuizzes) els.pQuizzes.textContent = stats.totalAttempts;
  if (els.pQuizzesSub) {
    if (!stats.totalAttempts) els.pQuizzesSub.textContent = "Take your first";
    else if (stats.totalAttempts < 10)
      els.pQuizzesSub.textContent = "Building momentum";
    else els.pQuizzesSub.textContent = "Great consistency!";
  }

  if (els.pHours) {
    els.pHours.innerHTML = `${stats.studyHours}<span class="st-unit">h</span>`;
  }
  if (els.pHoursSub) {
    if (stats.studyMinutes === 0) els.pHoursSub.textContent = "Keep going!";
    else els.pHoursSub.textContent = `~${stats.studyMinutes} min total`;
  }

  if (els.chartAvg) els.chartAvg.textContent = `${stats.averageScore}%`;
}

/* =========================================================
   CHART
   ========================================================= */

function renderChart() {
  if (!els.progressChart) return;

  const data = chartData(state.filtered, 12);

  if (data.length < 2) {
    els.progressChart.innerHTML = "";
    els.chartEmpty?.classList.remove("hidden");
    return;
  }
  els.chartEmpty?.classList.add("hidden");

  const W = 800;
  const H = 220;
  const padTop = 20;
  const padRight = 30;
  const padBottom = 30;
  const padLeft = 40;

  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const scores = data.map((d) => d.score);
  const points = scores.map((s, i) => {
    const x = padLeft + (i / (scores.length - 1)) * chartW;
    const y = padTop + chartH - (s / 100) * chartH;
    return { x, y, score: s };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

  // Gridlines
  const gridlines = [0, 25, 50, 75, 100]
    .map((v) => {
      const y = padTop + chartH - (v / 100) * chartH;
      return `
      <line x1="${padLeft}" y1="${y}" x2="${W - padRight}" y2="${y}"
            stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 5"/>
      <text x="${padLeft - 10}" y="${y + 4}" text-anchor="end"
            fill="#6b7590" font-size="10">${v}</text>
    `;
    })
    .join("");

  // Dots with hover titles
  const dots = points
    .map((p, i) => {
      const d = new Date(data[i].date || Date.now());
      const label = `${d.getDate()}/${d.getMonth() + 1} — ${p.score}%`;
      return `
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="#fbbf24" stroke="#0a1020" stroke-width="2">
        <title>${label}</title>
      </circle>
    `;
    })
    .join("");

  els.progressChart.innerHTML = `
    <defs>
      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridlines}
    <path d="${areaPath}" fill="url(#areaGradient)"/>
    <path d="${linePath}" fill="none" stroke="#fbbf24" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
  `;
}

/* =========================================================
   TOPIC LIST
   ========================================================= */

function renderTopics() {
  if (!els.topicList) return;

  const stats = buildStats(state.filtered);
  const topics = Object.entries(stats.topics || {})
    .map(([name, s]) => ({
      name,
      pct: s.total ? Math.round((s.correct / s.total) * 100) : 0,
      correct: s.correct,
      total: s.total,
    }))
    .sort((a, b) => a.pct - b.pct);

  if (els.topicCount) {
    els.topicCount.textContent = `${topics.length} ${topics.length === 1 ? "topic" : "topics"}`;
  }

  if (!topics.length) {
    els.topicList.innerHTML = `
      <div class="empty-state" style="border: none; background: none;">
        <div class="empty-icon">🎯</div>
        <div class="empty-title">No topics yet</div>
        <div class="empty-sub">Take a quiz to see your topic performance.</div>
      </div>
    `;
    return;
  }

  els.topicList.innerHTML = topics
    .slice(0, 15)
    .map((t) => {
      const cls = t.pct >= 70 ? "good" : t.pct >= 40 ? "mid" : "bad";
      const color =
        t.pct >= 70 ? "#10b981" : t.pct >= 40 ? "#f59e0b" : "#ef4444";
      return `
      <div class="topic-row-v2">
        <div class="topic-row-info">
          <div class="topic-row-name">${escapeHTML(t.name)}</div>
          <div class="topic-row-meta">${t.correct} of ${t.total} correct</div>
        </div>
        <div class="topic-row-bar-wrap">
          <div class="topic-row-bar" style="width: ${t.pct}%; background: ${color}; box-shadow: 0 0 10px ${color}66;"></div>
        </div>
        <div class="topic-row-score ${cls}">${t.pct}%</div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   HISTORY
   ========================================================= */

function renderHistory() {
  if (!els.historyList) return;

  const recent = state.filtered.slice(0, 12);

  if (!recent.length) {
    els.historyList.innerHTML = `
      <div class="empty-state" style="border: none; background: none;">
        <div class="empty-icon">🕐</div>
        <div class="empty-title">No attempts yet</div>
        <div class="empty-sub">Your quiz history will appear here.</div>
      </div>
    `;
    return;
  }

  els.historyList.innerHTML = recent
    .map((a) => {
      const pct = a.score || 0;
      const cls = pct >= 70 ? "good" : pct >= 40 ? "mid" : "bad";
      return `
      <div class="history-row-v2">
        <div class="history-row-left">
          <div class="history-row-subject">${escapeHTML(a.subject || "Quiz")}</div>
          <div class="history-row-meta">
            ${escapeHTML(a.exam || "")} · ${a.correct}/${a.total} · ${timeAgo(a.createdAt)}
          </div>
        </div>
        <div class="history-row-score ${cls}">${pct}%</div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   SUBJECT BREAKDOWN
   ========================================================= */

function renderSubjectBreakdown() {
  if (!els.subjectBreakdown) return;

  const subjects = subjectBreakdown(state.filtered);

  if (els.subjectCount) {
    els.subjectCount.textContent = `${subjects.length} ${subjects.length === 1 ? "subject" : "subjects"}`;
  }

  if (!subjects.length) {
    els.subjectBreakdown.innerHTML = `
      <div class="empty-state" style="border: none; background: none;">
        <div class="empty-icon">📚</div>
        <div class="empty-title">No subject data yet</div>
        <div class="empty-sub">Take a few quizzes to see your subject breakdown.</div>
      </div>
    `;
    return;
  }

  els.subjectBreakdown.innerHTML = subjects
    .map((s) => {
      const color = getSubjectColor(s.subject);
      const icon = getSubjectIcon(s.subject);
      return `
      <div class="subject-row">
        <div class="subject-info">
          <div class="subject-icon" style="background: ${color}22; color: ${color};">${icon}</div>
          <div class="subject-name">${escapeHTML(s.subject)}</div>
        </div>
        <div class="subject-bar-wrap">
          <div class="subject-bar" style="width: ${s.averageScore}%; background: ${color}; box-shadow: 0 0 10px ${color}66;"></div>
        </div>
        <div class="subject-score" style="color: ${color};">${s.averageScore}%</div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   RANGE TABS
   ========================================================= */

function wireRangeTabs() {
  document.querySelectorAll(".lb-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".lb-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.range = tab.dataset.range || "all";
      applyRange();
    });
  });
}

/* =========================================================
   CLEAR HISTORY
   ========================================================= */

async function handleClearHistory() {
  const ok = await confirmDialog({
    title: "Clear local history?",
    message:
      "This clears locally cached attempts. Your Firebase records remain intact.",
    okLabel: "Clear",
    cancelLabel: "Cancel",
    danger: true,
  });

  if (!ok) return;

  try {
    await clear(STORES.ATTEMPTS);
    toastOk("Local history cleared");
    await loadAttempts();
  } catch (e) {
    log.warn("Could not clear history:", e);
    toastErr("Could not clear history");
  }
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
    wireRangeTabs();

    els.userMenuBtn?.addEventListener("click", handleUserMenu);
    els.clearHistoryBtn?.addEventListener("click", handleClearHistory);

    await loadAttempts();

    log.info(`Progress loaded: ${state.attempts.length} attempts`);
  } catch (e) {
    log.error("Progress init failed:", e);
    toastErr("Could not load progress.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
