// js/main.js — WeGEM Learning home page logic

import {
  getCurrentUser,
  clearCurrentUser,
  getUserAttempts,
} from "./firebase.js";
import { loadLocalProgress, computeStatsFromAttempts } from "./storage.js";

/* =========================================================
   NAV — show user state
   ========================================================= */

function renderNav() {
  const authLink = document.getElementById("auth-link");
  const userNameEl = document.getElementById("userName");
  const user = getCurrentUser();

  if (user) {
    if (authLink) {
      authLink.textContent = "Sign Out";
      authLink.href = "#";
      authLink.onclick = (e) => {
        e.preventDefault();
        clearCurrentUser();
        window.location.reload();
      };
    }
    if (userNameEl) {
      userNameEl.textContent =
        user.name.charAt(0).toUpperCase() + user.name.slice(1);
    }
  } else {
    if (authLink) {
      authLink.textContent = "Sign In";
      authLink.href = "login.html";
      authLink.onclick = null;
    }
    if (userNameEl) userNameEl.textContent = "Student";
  }
}

/* =========================================================
   STATS
   ========================================================= */

async function loadStats() {
  const user = getCurrentUser();

  if (user) {
    try {
      const attempts = await getUserAttempts(user.userId, 50);
      const stats = computeStatsFromAttempts(attempts);
      renderStats(stats);
      return;
    } catch (e) {
      console.error("Firestore fetch failed, using local:", e);
    }
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
