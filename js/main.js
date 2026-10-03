// js/main.js — WeGEM Learning home page logic

import {
  getCurrentUser,
  clearCurrentUser,
  getUserAttempts,
} from "./firebase.js";
import { loadLocalProgress, computeStatsFromAttempts } from "./storage.js";

/* =========================================================
   GUARD — redirect to login if not identified
   ========================================================= */

const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

/* =========================================================
   NAV
   ========================================================= */

function renderNav() {
  const authLink = document.getElementById("auth-link");
  const userNameEl = document.getElementById("userName");
  const u = getCurrentUser();

  if (u) {
    if (authLink) {
      authLink.textContent = "Sign Out";
      authLink.href = "#";
      authLink.onclick = (e) => {
        e.preventDefault();
        clearCurrentUser();
        window.location.href = "login.html";
      };
    }
    if (userNameEl) {
      userNameEl.textContent = u.name.charAt(0).toUpperCase() + u.name.slice(1);
    }
  }
}

/* =========================================================
   STATS
   ========================================================= */

async function loadStats() {
  const u = getCurrentUser();
  if (!u) return;

  try {
    const attempts = await getUserAttempts(u.userId, 50);
    const stats = computeStatsFromAttempts(attempts);
    renderStats(stats);
    return;
  } catch (e) {
    console.error("Firebase fetch failed, using local:", e);
  }

  const p = loadLocalProgress();
  const stats = computeStatsFromAttempts(p.attempts);
  renderStats({ ...stats, streak: p.streak });
}

function renderStats(stats) {
  const streakEl = document.getElementById("homeStreak");
  const quizzesEl = document.getElementById("homeQuizzes");
  const avgEl = document.getElementById("homeAvg");

  if (streakEl) streakEl.textContent = (stats.streak || 0) + " days";
  if (quizzesEl) quizzesEl.textContent = stats.totalQuizzes || 0;
  if (avgEl) avgEl.textContent = (stats.averageScore || 0) + "%";
}

/* =========================================================
   INIT
   ========================================================= */

renderNav();
loadStats();
