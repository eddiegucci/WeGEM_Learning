// js/main.js — WeGEM Learning dashboard logic

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  getUserAttempts,
  getUser,
} from "./firebase.js";
import { loadLocalProgress, computeStatsFromAttempts } from "./storage.js";
import { SUBJECTS_BY_CURRICULUM } from "./data.js";

/* =========================================================
   GUARD
   ========================================================= */

const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

/* =========================================================
   GREETING
   ========================================================= */

function setGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  else if (hour >= 17) greeting = "Good evening";

  const greetEl = document.getElementById("greeting");
  if (greetEl) greetEl.textContent = greeting;

  const heroNameEl = document.getElementById("heroName");
  const topNameEl = document.getElementById("userNameTop");
  const avatarEl = document.getElementById("userAvatar");

  if (user.name) {
    const firstName = user.name.split(" ")[0];
    if (heroNameEl) heroNameEl.textContent = firstName;
    if (topNameEl) topNameEl.textContent = firstName;
    if (avatarEl) avatarEl.textContent = firstName.charAt(0).toUpperCase();
  }
}

/* =========================================================
   HERO STATS
   ========================================================= */

async function loadHeroStats() {
  let attempts = [];

  try {
    attempts = await getUserAttempts(user.userId, 200);
  } catch (e) {
    console.warn("Firebase failed, using local:", e);
    attempts = loadLocalProgress().attempts;
  }

  const stats = computeStatsFromAttempts(attempts);

  const streakEl = document.getElementById("heroStreak");
  if (streakEl) streakEl.textContent = stats.streak || 0;

  const avgEl = document.getElementById("heroAvg");
  if (avgEl)
    avgEl.innerHTML = `${stats.averageScore || 0}<span class="hs-unit">%</span>`;

  const quizzesEl = document.getElementById("heroQuizzes");
  if (quizzesEl) quizzesEl.textContent = stats.totalQuizzes || 0;

  const hoursEl = document.getElementById("heroHours");
  if (hoursEl) {
    const hours = Math.max(
      1,
      Math.round((((stats.totalQuizzes || 0) * 2) / 60) * 10) / 10,
    );
    hoursEl.innerHTML = `${hours}<span class="hs-unit">h</span>`;
  }

  return { attempts, stats };
}

/* =========================================================
   REVISE NEXT
   ========================================================= */

function renderReviseNext(stats) {
  const container = document.getElementById("reviseList");
  if (!container) return;

  const topics = Object.entries(stats.topics || {})
    .map(([name, s]) => ({
      name,
      pct: Math.round((s.correct / s.total) * 100),
      correct: s.correct,
      total: s.total,
    }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3);

  if (!topics.length) {
    const curriculum = user.curriculum === "CBE" ? "CBE" : "844";
    const subjectList = SUBJECTS_BY_CURRICULUM[curriculum] || {};
    const gradeKey =
      user.level || user.form || user.grade || Object.keys(subjectList)[0];
    const subjects = subjectList[gradeKey] || [];

    container.innerHTML = `
      <div class="empty-state" style="padding:8px 0;text-align:left;color:var(--text-mute);font-size:13px;">
        Take a quiz to see your weak topics here.
      </div>
      ${subjects
        .slice(0, 3)
        .map((s, i) => {
          const colors = ["#ef4444", "#f59e0b", "#10b981"];
          const barColor = colors[i % colors.length];
          return `
          <div class="revise-item">
            <div class="revise-left">
              <div class="revise-bar" style="background:${barColor};"></div>
              <div style="min-width:0;">
                <div class="revise-topic">${s}</div>
                <div class="revise-subtopic">Start practicing</div>
              </div>
            </div>
            <div class="revise-score" style="background:${barColor}22;color:${barColor};">NEW</div>
          </div>
        `;
        })
        .join("")}
    `;
    return;
  }

  const barColors = ["#ef4444", "#f97316", "#f59e0b"];
  const scoreStyles = [
    { bg: "rgba(239,68,68,0.15)", color: "#fca5a5" },
    { bg: "rgba(249,115,22,0.15)", color: "#fdba74" },
    { bg: "rgba(245,158,11,0.15)", color: "#fcd34d" },
  ];

  container.innerHTML = topics
    .map(
      (t, i) => `
    <div class="revise-item">
      <div class="revise-left">
        <div class="revise-bar" style="background:${barColors[i % barColors.length]};"></div>
        <div style="min-width:0;">
          <div class="revise-topic">${t.name}</div>
          <div class="revise-subtopic">${t.correct} of ${t.total} correct</div>
        </div>
      </div>
      <div class="revise-score" style="background:${scoreStyles[i].bg};color:${scoreStyles[i].color};">
        ${t.pct}%
      </div>
    </div>
  `,
    )
    .join("");
}

/* =========================================================
   SUBJECT PERFORMANCE
   ========================================================= */

const SUBJECT_COLORS = {
  English: "#3b82f6",
  Mathematics: "#fbbf24",
  Chemistry: "#14b8a6",
  Biology: "#10b981",
  Kiswahili: "#ef4444",
  Physics: "#8b5cf6",
  History: "#f97316",
  CRE: "#a855f7",
  Geography: "#22c55e",
  Business: "#ec4899",
  Agriculture: "#84cc16",
  Computer: "#06b6d4",
  "Computer Studies": "#06b6d4",
  "Integrated Science": "#14b8a6",
  "Home Science": "#f472b6",
  "Life Skills": "#a78bfa",
};

const SUBJECT_ICONS = {
  English: "📘",
  Mathematics: "📐",
  Chemistry: "⚗️",
  Biology: "🧬",
  Kiswahili: "📕",
  Physics: "⚛️",
  History: "📜",
  CRE: "✝️",
  Geography: "🌍",
  Business: "💼",
  Agriculture: "🌾",
  Computer: "💻",
  "Computer Studies": "💻",
  "Integrated Science": "🔬",
  "Home Science": "🏠",
  "Life Skills": "💡",
};

function renderSubjectPerformance(stats) {
  const container = document.getElementById("subjectList");
  if (!container) return;

  const bySubject = {};
  (stats.attempts || []).forEach((a) => {
    if (!bySubject[a.subject]) bySubject[a.subject] = { correct: 0, total: 0 };
    bySubject[a.subject].correct += a.correct || 0;
    bySubject[a.subject].total += a.total || 0;
  });

  const rows = Object.entries(bySubject)
    .map(([name, s]) => ({
      name,
      pct: Math.round((s.correct / s.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  if (!rows.length) {
    const defaults = [
      { name: "English", pct: 80 },
      { name: "Mathematics", pct: 46 },
      { name: "Kiswahili", pct: 50 },
      { name: "Biology", pct: 67 },
      { name: "Chemistry", pct: 45 },
      { name: "History", pct: 76 },
      { name: "CRE", pct: 74 },
      { name: "Computer", pct: 92 },
    ];
    renderSubjectRows(container, defaults, 72);
    return;
  }

  const avg = Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length);
  renderSubjectRows(container, rows, avg);
}

function renderSubjectRows(container, rows, avg) {
  container.innerHTML = rows
    .map((r) => {
      const color = SUBJECT_COLORS[r.name] || "#fbbf24";
      const icon = SUBJECT_ICONS[r.name] || "📚";
      return `
      <div class="subject-row">
        <div class="subject-info">
          <div class="subject-icon" style="background:${color}22;color:${color};">${icon}</div>
          <div class="subject-name">${r.name}</div>
        </div>
        <div class="subject-bar-wrap">
          <div class="subject-bar" style="width:${r.pct}%;background:${color};box-shadow:0 0 10px ${color}66;"></div>
        </div>
        <div class="subject-score" style="color:${color};">${r.pct}%</div>
      </div>
    `;
    })
    .join("");

  const overallEl = document.getElementById("overallAvg");
  if (overallEl) overallEl.textContent = avg + "%";

  const progressTotalEl = document.getElementById("progressTotal");
  if (progressTotalEl) progressTotalEl.textContent = avg + "%";
}

/* =========================================================
   RECENT ACTIVITY
   ========================================================= */

function renderActivity(stats) {
  const container = document.getElementById("activityList");
  if (!container) return;

  const attempts = (stats.attempts || []).slice(0, 4);

  if (!attempts.length) {
    container.innerHTML = `
      <div style="padding:12px 0;text-align:left;color:var(--text-mute);font-size:13px;">
        No recent activity yet. Take a quiz to see your history.
      </div>
    `;
    return;
  }

  container.innerHTML = attempts
    .map((a) => {
      const pct = Math.round((a.correct / a.total) * 100);
      const date = new Date(a.date || a.createdAt);
      const timeAgo = getTimeAgo(date);
      const icon = SUBJECT_ICONS[a.subject] || "📚";
      const color = SUBJECT_COLORS[a.subject] || "#fbbf24";
      return `
      <div class="activity-item">
        <div class="activity-icon" style="background:${color}22;color:${color};">${icon}</div>
        <div class="activity-text">
          <div class="activity-title">${a.subject} Quiz</div>
          <div class="activity-meta">Score: ${pct}% · ${timeAgo}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + " min ago";
  if (diff < 86400) return Math.floor(diff / 3600) + " hours ago";
  if (diff < 172800) return "yesterday";
  return Math.floor(diff / 86400) + " days ago";
}

/* =========================================================
   USER MENU
   ========================================================= */

function setupUserMenu() {
  const btn = document.getElementById("userMenuBtn");
  if (!btn) return;

  btn.onclick = () => {
    const choice = confirm(
      `Signed in as ${user.email || user.name}\n\nOK = Sign out\nCancel = Stay signed in`,
    );
    if (choice) {
      clearCurrentUser();
      window.location.href = "login.html";
    }
  };
}

/* =========================================================
   CONTINUE BUTTON
   ========================================================= */

function setupContinue() {
  const btn = document.getElementById("continueBtn");
  if (!btn) return;
  btn.onclick = () => {
    window.location.href = "notes.html";
  };
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  setGreeting();
  setupUserMenu();
  setupContinue();

  const { stats } = await loadHeroStats();
  renderReviseNext(stats);
  renderSubjectPerformance(stats);
  renderActivity(stats);

  if (!user.name && user.userId) {
    try {
      const fresh = await getUser(user.userId);
      if (fresh && fresh.name) {
        user.name = fresh.name;
        localStorage.setItem("wegem_user", JSON.stringify(user));
        setGreeting();
      }
    } catch (e) {}
  }
}

init();
