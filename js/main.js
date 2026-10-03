// js/main.js — WeGEM Learning home page logic

import { watchAuth, logOut, getUserAttempts, auth } from "./firebase.js";
import { loadLocalProgress, computeStatsFromAttempts } from "./storage.js";

/* =========================================================
   AUTH — update nav and greeting
   ========================================================= */

watchAuth(async (user) => {
  const authLink = document.getElementById("auth-link");
  const userNameEl = document.getElementById("userName");

  if (user) {
    // Signed in
    if (authLink) {
      authLink.textContent = "Sign Out";
      authLink.href = "#";
      authLink.onclick = async (e) => {
        e.preventDefault();
        await logOut();
        window.location.reload();
      };
    }

    if (userNameEl) {
      const name = user.email.split("@")[0];
      userNameEl.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    }

    // Load stats from Firebase
    await loadFirebaseStats(user.uid);
  } else {
    // Signed out
    if (authLink) {
      authLink.textContent = "Sign In";
      authLink.href = "login.html";
      authLink.onclick = null;
    }
    if (userNameEl) userNameEl.textContent = "Student";

    // Load stats from localStorage
    loadLocalStats();
  }
});

/* =========================================================
   STATS — Home page dashboard
   ========================================================= */

async function loadFirebaseStats(userId) {
  try {
    const attempts = await getUserAttempts(userId);

    // Adapt Firebase docs to the shape our stats helper expects
    const formatted = attempts.map((a) => ({
      exam: a.exam,
      subject: a.subject,
      correct: a.correct,
      total: a.total,
      topicResults: a.topicResults || {},
      date: a.createdAt,
    }));

    const stats = computeStatsFromAttempts(formatted);
    renderStats(stats);
  } catch (e) {
    console.error("Firebase stats failed, falling back to local:", e);
    loadLocalStats();
  }
}

function loadLocalStats() {
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
