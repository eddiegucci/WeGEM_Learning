// js/progress.js — WeGEM Learning progress dashboard
// Merges legacy quiz attempts + new authored quiz results.

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  getUserAttempts,
  getUserQuizResults,
} from "./firebase.js";
import { loadLocalProgress, clearLocalProgress } from "./storage.js";

/* =========================================================
   GUARD
   ========================================================= */

const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

/* =========================================================
   ELEMENTS
   ========================================================= */

const progressSearch = document.getElementById("progressSearch");
const pStreak = document.getElementById("pStreak");
const pStreakSub = document.getElementById("pStreakSub");
const pAvg = document.getElementById("pAvg");
const pAvgSub = document.getElementById("pAvgSub");
const pQuizzes = document.getElementById("pQuizzes");
const pQuizzesSub = document.getElementById("pQuizzesSub");
const pHours = document.getElementById("pHours");
const pHoursSub = document.getElementById("pHoursSub");

const progressChart = document.getElementById("progressChart");
const chartEmpty = document.getElementById("chartEmpty");
const chartAvg = document.getElementById("chartAvg");

const topicList = document.getElementById("topicList");
const historyList = document.getElementById("historyList");
const subjectBreakdown = document.getElementById("subjectBreakdown");
const subjectBreakdownCount = document.getElementById("subjectBreakdownCount");

const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const toast = document.getElementById("toast");

let searchQuery = "";

/* =========================================================
   TOPBAR USER
   ========================================================= */

if (user) {
  const av = document.getElementById("userAvatar");
  const nm = document.getElementById("userNameTop");
  if (av && user.name) av.textContent = user.name.charAt(0).toUpperCase();
  if (nm && user.name) nm.textContent = user.name.split(" ")[0];
}

document.getElementById("userMenuBtn")?.addEventListener("click", () => {
  if (confirm(`Signed in as ${user.email}\n\nOK = Sign out`)) {
    clearCurrentUser();
    window.location.href = "login.html";
  }
});

/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;
function showToast(msg, kind = "ok") {
  if (!toast) return;
  toast.textContent = msg;
  toast.className = "toast " + (kind === "err" ? "toast-err" : "toast-ok");
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

/* =========================================================
   HELPERS
   ========================================================= */

function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
  return date.toLocaleDateString();
}

function computeStreak(attempts) {
  if (!attempts.length) return 0;
  const days = new Set(
    attempts.map((a) => new Date(a.createdAt || a.date).toDateString()),
  );
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getScorePercent(a) {
  if (typeof a.percent === "number") return a.percent;
  if (typeof a.correct === "number" && a.total > 0) {
    return Math.round((a.correct / a.total) * 100);
  }
  if (typeof a.score === "number" && a.total > 0) {
    return Math.round((a.score / a.total) * 100);
  }
  return 0;
}

function getScoreValue(a) {
  if (typeof a.score === "number") return a.score;
  if (typeof a.correct === "number") return a.correct;
  return 0;
}

/* =========================================================
   LOAD DATA
   ========================================================= */

let legacyAttempts = [];
let authoredResults = [];

async function loadData() {
  // Legacy attempts (built-in quizzes)
  try {
    legacyAttempts = await getUserAttempts(user.userId, 200);
  } catch (e) {
    console.warn("Firebase attempts failed:", e);
    legacyAttempts = loadLocalProgress().attempts || [];
  }

  // Authored quiz results
  try {
    authoredResults = await getUserQuizResults(user.userId, 200);
  } catch (e) {
    console.warn("Firebase quiz results failed:", e);
    authoredResults = [];
  }

  // If we got nothing from Firebase, fall back to localStorage
  if (!legacyAttempts.length) {
    const local = loadLocalProgress();
    if (local.attempts && local.attempts.length) {
      legacyAttempts = local.attempts;
    }
  }
}

/* =========================================================
   MERGED ATTEMPTS — for stats, chart, history
   ========================================================= */

function getMergedAttempts() {
  const merged = [];

  legacyAttempts.forEach((a) => {
    merged.push({
      source: "legacy",
      date: a.createdAt || a.date,
      subject: a.subject || "Unknown",
      exam: a.exam || "",
      score: getScoreValue(a),
      total: a.total || 0,
      percent: getScorePercent(a),
      title: a.subject ? `${a.subject} Quiz` : "Quiz",
      topicResults: a.topicResults || {},
    });
  });

  authoredResults.forEach((r) => {
    merged.push({
      source: "authored",
      date: r.createdAt,
      subject: r.subject || "Unknown",
      exam: r.curriculum === "844" ? "8-4-4" : r.curriculum || "",
      score: r.score || 0,
      total: r.total || 0,
      percent: r.percent || getScorePercent(r),
      title: r.quizTitle || "Custom Quiz",
      topicResults: {},
    });
  });

  merged.sort((a, b) => new Date(b.date) - new Date(a.date));
  return merged;
}

/* =========================================================
   RENDER — STATS
   ========================================================= */

function renderStats(merged) {
  const total = merged.length;
  const avg = total
    ? Math.round(merged.reduce((s, a) => s + a.percent, 0) / total)
    : 0;
  const streak = computeStreak(merged);
  const hours = Math.round(((total * 2) / 60) * 10) / 10;

  pStreak.textContent = streak;
  pAvg.innerHTML = `${avg}<span class="st-unit">%</span>`;
  pQuizzes.textContent = total;
  pHours.innerHTML = `${hours}<span class="st-unit">h</span>`;

  pStreakSub.textContent =
    streak === 0
      ? "Start today"
      : streak === 1
        ? "Just getting started"
        : streak < 7
          ? "Keep it going!"
          : streak < 30
            ? "On fire!"
            : "Unstoppable!";

  pAvgSub.textContent =
    avg === 0
      ? "No data yet"
      : avg >= 80
        ? "Excellent!"
        : avg >= 60
          ? "Good work!"
          : avg >= 40
            ? "Room to grow"
            : "Keep practicing";

  pQuizzesSub.textContent =
    total === 0 ? "Take your first quiz" : "Keep going!";

  pHoursSub.textContent =
    hours === 0 ? "This week" : `~${Math.round(hours * 60)} minutes total`;

  chartAvg.textContent = avg + "%";
}

/* =========================================================
   RENDER — CHART
   ========================================================= */

function renderChart(merged) {
  const recent = merged.slice(0, 10).reverse();

  if (recent.length < 2) {
    progressChart.innerHTML = "";
    chartEmpty?.classList.remove("hidden");
    return;
  }
  chartEmpty?.classList.add("hidden");

  const W = 800;
  const H = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  const scores = recent.map((a) => a.percent);
  const maxScore = 100;
  const points = scores.map((s, i) => {
    const x = padding.left + (i / (scores.length - 1)) * chartW;
    const y = padding.top + chartH - (s / maxScore) * chartH;
    return { x, y, s };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const gridlines = [0, 25, 50, 75, 100]
    .map((v) => {
      const y = padding.top + chartH - (v / maxScore) * chartH;
      return `
      <line x1="${padding.left}" y1="${y}" x2="${W - padding.right}" y2="${y}"
            stroke="rgba(255,255,255,0.05)" stroke-dasharray="3 5"/>
      <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end"
            fill="#5a6480" font-size="10" font-family="inherit">${v}</text>
    `;
    })
    .join("");

  const dots = points
    .map(
      (p) => `
    <circle cx="${p.x}" cy="${p.y}" r="4" fill="#fbbf24" stroke="#0a1020" stroke-width="2"/>
    <title>${p.s}%</title>
  `,
    )
    .join("");

  progressChart.innerHTML = `
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
   RENDER — TOPIC PERFORMANCE
   ========================================================= */

function renderTopics(merged) {
  const topics = {};
  merged.forEach((a) => {
    if (a.topicResults && Object.keys(a.topicResults).length) {
      Object.entries(a.topicResults).forEach(([t, s]) => {
        if (!topics[t]) topics[t] = { correct: 0, total: 0 };
        topics[t].correct += s.correct || 0;
        topics[t].total += s.total || 0;
      });
    } else {
      // For authored quizzes without topic breakdown, aggregate by subject
      const t = a.subject || "General";
      if (!topics[t]) topics[t] = { correct: 0, total: 0 };
      topics[t].correct += a.score;
      topics[t].total += a.total;
    }
  });

  const rows = Object.entries(topics)
    .map(([name, s]) => ({
      name,
      pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      correct: s.correct,
      total: s.total,
    }))
    .sort((a, b) => a.pct - b.pct);

  if (!rows.length) {
    topicList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">🎯</div>
        <div class="empty-title">No topic data yet</div>
        <div class="empty-sub">Take a quiz to see your topic performance.</div>
      </div>
    `;
    return;
  }

  topicList.innerHTML = rows
    .map((r) => {
      const cls = r.pct >= 70 ? "good" : r.pct >= 40 ? "mid" : "bad";
      const color =
        r.pct >= 70 ? "#10b981" : r.pct >= 40 ? "#f59e0b" : "#ef4444";
      return `
      <div class="topic-row-v2" data-topic="${escapeHtml(r.name.toLowerCase())}">
        <div class="topic-row-info">
          <div class="topic-row-name">${escapeHtml(r.name)}</div>
          <div class="topic-row-meta">${r.correct} of ${r.total} correct</div>
        </div>
        <div class="topic-row-bar-wrap">
          <div class="topic-row-bar" style="width:${r.pct}%;background:${color};box-shadow:0 0 10px ${color}66;"></div>
        </div>
        <div class="topic-row-score ${cls}">${r.pct}%</div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   RENDER — RECENT ATTEMPTS
   ========================================================= */

function renderHistory(merged) {
  if (!merged.length) {
    historyList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">🕐</div>
        <div class="empty-title">No attempts yet</div>
        <div class="empty-sub">Your quiz history will appear here.</div>
      </div>
    `;
    return;
  }

  const recent = merged.slice(0, 12);
  historyList.innerHTML = recent
    .map((a) => {
      const cls = a.percent >= 70 ? "good" : a.percent >= 40 ? "mid" : "bad";
      const kind = a.source === "authored" ? "📝" : "⚡";
      return `
      <div class="history-row-v2" data-subject="${escapeHtml((a.subject || "").toLowerCase())}">
        <div class="history-row-left">
          <div class="history-row-subject">${kind} ${escapeHtml(a.title)}</div>
          <div class="history-row-meta">
            ${escapeHtml(a.exam)} · ${a.score}/${a.total} · ${timeAgo(a.date)}
          </div>
        </div>
        <div class="history-row-score ${cls}">${a.percent}%</div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   RENDER — SUBJECT BREAKDOWN
   ========================================================= */

function renderSubjectBreakdown(merged) {
  const bySubject = {};
  merged.forEach((a) => {
    const s = a.subject || "Unknown";
    if (!bySubject[s])
      bySubject[s] = { attempts: 0, totalScore: 0, totalPercent: 0 };
    bySubject[s].attempts++;
    bySubject[s].totalScore += a.score;
    bySubject[s].totalPercent += a.percent;
  });

  const rows = Object.entries(bySubject)
    .map(([name, s]) => ({
      name,
      attempts: s.attempts,
      avgPercent: Math.round(s.totalPercent / s.attempts),
    }))
    .sort((a, b) => b.avgPercent - a.avgPercent);

  subjectBreakdownCount.textContent =
    rows.length + (rows.length === 1 ? " subject" : " subjects");

  if (!rows.length) {
    subjectBreakdown.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📚</div>
        <div class="empty-title">No subject data yet</div>
        <div class="empty-sub">Take quizzes across subjects to see your strengths.</div>
      </div>
    `;
    return;
  }

  subjectBreakdown.innerHTML = rows
    .map((r) => {
      const cls =
        r.avgPercent >= 70 ? "good" : r.avgPercent >= 40 ? "mid" : "bad";
      const color =
        r.avgPercent >= 70
          ? "#10b981"
          : r.avgPercent >= 40
            ? "#f59e0b"
            : "#ef4444";
      return `
      <div class="subject-breakdown-row" data-subject="${escapeHtml(r.name.toLowerCase())}">
        <div class="sbr-name">${escapeHtml(r.name)}</div>
        <div class="sbr-bar-wrap">
          <div class="sbr-bar" style="width:${r.avgPercent}%;background:${color};box-shadow:0 0 10px ${color}66;"></div>
        </div>
        <div class="sbr-attempts">${r.attempts} ${r.attempts === 1 ? "try" : "tries"}</div>
        <div class="sbr-score ${cls}">${r.avgPercent}%</div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {
  const merged = getMergedAttempts();
  renderStats(merged);
  renderChart(merged);
  renderTopics(merged);
  renderHistory(merged);
  renderSubjectBreakdown(merged);
}

/* =========================================================
   SEARCH
   ========================================================= */

progressSearch?.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim().toLowerCase();

  document
    .querySelectorAll(".topic-row-v2, .history-row-v2, .subject-breakdown-row")
    .forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(searchQuery) ? "" : "none";
    });
});

/* =========================================================
   CLEAR LOCAL
   ========================================================= */

clearHistoryBtn?.addEventListener("click", () => {
  if (confirm("Clear local quiz history?\n\nFirebase records will remain.")) {
    clearLocalProgress();
    showToast("Local data cleared", "ok");
    init();
  }
});

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  await loadData();
  renderAll();
}

init();
