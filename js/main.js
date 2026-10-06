// js/main.js
import {
  getCurrentUser,
  clearCurrentUser,
  getUserAttempts,
} from "./firebase.js";
import { loadLocalProgress, computeStatsFromAttempts } from "./storage.js";

const user = getCurrentUser();
if (!user) {
  window.location.href = "signup.html";
}

const userNameEl = document.getElementById("userName");
const userContextEl = document.getElementById("userContext");
const authLink = document.getElementById("auth-link");

if (user) {
  if (userNameEl)
    userNameEl.textContent = user.name ? user.name.split(" ")[0] : "Student";
  if (userContextEl) {
    const ctx =
      user.curriculum === "844"
        ? `${user.form || ""} · ${user.school || ""}`
        : `${user.grade || ""} · ${user.school || ""}`;
    userContextEl.textContent = ctx || "Pick an exam and start practicing.";
  }
  if (authLink) {
    authLink.onclick = (e) => {
      e.preventDefault();
      clearCurrentUser();
      window.location.href = "signup.html";
    };
  }
}

async function loadStats() {
  try {
    const attempts = await getUserAttempts(user.userId, 50);
    const stats = computeStatsFromAttempts(attempts);
    renderStats(stats);
    return;
  } catch (e) {
    console.error(e);
  }
  const p = loadLocalProgress();
  const stats = computeStatsFromAttempts(p.attempts);
  renderStats({ ...stats, streak: p.streak });
}

function renderStats(stats) {
  document.getElementById("homeStreak").textContent =
    (stats.streak || 0) + " days";
  document.getElementById("homeQuizzes").textContent = stats.totalQuizzes || 0;
  document.getElementById("homeAvg").textContent =
    (stats.averageScore || 0) + "%";
}

loadStats();
