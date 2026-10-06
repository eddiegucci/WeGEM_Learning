// js/progress.js — WeGEM Learning progress dashboard

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  getUserAttempts,
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
   TOPBAR
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

  // If no attempt today, still allow streak from yesterday
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/* =========================================================
   LOAD DATA
   ========================================================= */

let attempts = [];

async function loadData() {
  try {
    attempts = await getUserAttempts(user.userId, 200);
    if (!attempts.length) {
      // fall back to local
      const local = loadLocalProgress();
      if (local.attempts?.length) attempts = local.attempts;
    }
  } catch (e) {
    console.warn("Firebase failed, using local:", e);
    attempts = loadLocalProgress().attempts || [];
  }
}

/* =========================================================
   RENDER STATS
   ========================================================= */

function renderStats() {
  const total = attempts.length;
  const avg = total
    ? Math.round(
        attempts.reduce((s, a) => s + (a.correct / a.total) * 100, 0) / total,
      )
    : 0;
  const streak = computeStreak(attempts);

  // Study time estimate: 2 min per quiz
  const hours = Math.round(((total * 2) / 60) * 10) / 10;

  document.getElementById("pStreak").textContent = streak;
  document.getElementById("pAvg").innerHTML =
    `${avg}<span class="st-unit">%</span>`;
  document.getElementById("pQuizzes").textContent = total;
  document.getElementById("pHours").innerHTML =
    `${hours}<span class="st-unit">h</span>`;

  // Subtitles
  document.getElementById("pStreakSub").textContent =
    streak === 0
      ? "Start today"
      : streak === 1
        ? "Just getting started"
        : streak < 7
          ? "Keep it going!"
          : streak < 30
            ? "On fire!"
            : "Unstoppable!";

  document.getElementById("pAvgSub").textContent =
    avg === 0
      ? "No data yet"
      : avg >= 80
        ? "Excellent!"
        : avg >= 60
          ? "Good work!"
          : avg >= 40
            ? "Room to grow"
            : "Keep practicing";

  document.getElementById("pQuizzesSub").textContent =
    total === 0 ? "Take your first quiz" : "Keep going!";

  document.getElementById("pHoursSub").textContent =
    hours === 0 ? "This week" : `~${Math.round(hours * 60)} minutes total`;

  const chartAvg = document.getElementById("chartAvg");
  if (chartAvg) chartAvg.textContent = avg + "%";
}

/* =========================================================
   RENDER CHART
   ========================================================= */

function renderChart() {
  const svg = document.getElementById("progressChart");
  const emptyEl = document.getElementById("chartEmpty");
  const recent = attempts.slice(0, 10).reverse(); // oldest → newest

  if (recent.length < 2) {
    svg.innerHTML = "";
    emptyEl?.classList.remove("hidden");
    return;
  }
  emptyEl?.classList.add("hidden");

  const W = 800;
  const H = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  const scores = recent.map((a) => Math.round((a.correct / a.total) * 100));
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

  // Gridlines
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

  // Dots
  const dots = points
    .map(
      (p) => `
    <circle cx="${p.x}" cy="${p.y}" r="4" fill="#fbbf24" stroke="#0a1020" stroke-width="2"/>
    <title>${p.s}%</title>
  `,
    )
    .join("");

  svg.innerHTML = `
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
   RENDER TOPIC LIST
   ========================================================= */

function renderTopics() {
  const container = document.getElementById("topicList");
  if (!container) return;

  // Aggregate topics
  const topics = {};
  attempts.forEach((a) => {
    if (a.topicResults) {
      Object.entries(a.topicResults).forEach(([t, s]) => {
        if (!topics[t]) topics[t] = { correct: 0, total: 0 };
        topics[t].correct += s.correct;
        topics[t].total += s.total;
      });
    }
  });

  const rows = Object.entries(topics)
    .map(([name, s]) => ({
      name,
      pct: Math.round((s.correct / s.total) * 100),
      correct: s.correct,
      total: s.total,
    }))
    .sort((a, b) => a.pct - b.pct);

  if (!rows.length) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">🎯</div>
        <div class="empty-title">No topic data yet</div>
        <div class="empty-sub">Take a quiz to see your topic performance.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = rows
    .map((r) => {
      const cls = r.pct >= 70 ? "good" : r.pct >= 40 ? "mid" : "bad";
      const color =
        r.pct >= 70 ? "#10b981" : r.pct >= 40 ? "#f59e0b" : "#ef4444";
      return `
      <div class="topic-row-v2">
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
   RENDER HISTORY
   ========================================================= */

function renderHistory() {
  const container = document.getElementById("historyList");
  if (!container) return;

  if (!attempts.length) {
    container.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">🕐</div>
        <div class="empty-title">No attempts yet</div>
        <div class="empty-sub">Your quiz history will appear here.</div>
      </div>
    `;
    return;
  }

  const recent = attempts.slice(0, 12);
  container.innerHTML = recent
    .map((a) => {
      const pct = Math.round((a.correct / a.total) * 100);
      const cls = pct >= 70 ? "good" : pct >= 40 ? "mid" : "bad";
      return `
      <div class="history-row-v2">
        <div class="history-row-left">
          <div class="history-row-subject">${escapeHtml(a.subject)}</div>
          <div class="history-row-meta">
            ${a.exam} · ${a.correct}/${a.total} · ${timeAgo(a.createdAt || a.date)}
          </div>
        </div>
        <div class="history-row-score ${cls}">${pct}%</div>
      </div>
    `;
    })
    .join("");
}

/* =========================================================
   CLEAR HISTORY
   ========================================================= */

document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
  if (
    confirm("Clear local quiz history?\n\nNote: Firebase records will remain.")
  ) {
    clearLocalProgress();
    attempts = [];
    renderAll();
  }
});

/* =========================================================
   SEARCH (filter topics only)
   ========================================================= */

document.getElementById("progressSearch")?.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".topic-row-v2").forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q) ? "" : "none";
  });
});

/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {
  renderStats();
  renderChart();
  renderTopics();
  renderHistory();
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  await loadData();
  renderAll();
}

init();
