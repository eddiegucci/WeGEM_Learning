// js/progress.js
import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  getUserAttempts,
} from "./firebase.js";
import {
  loadLocalProgress,
  computeStatsFromAttempts,
  clearLocalProgress,
} from "./storage.js";

const user = getCurrentUser();
if (!user) window.location.href = "signup.html";

const authLink = document.getElementById("auth-link");
if (authLink) {
  authLink.onclick = (e) => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = "signup.html";
  };
}

async function render() {
  let attempts = [];
  try {
    attempts = await getUserAttempts(user.userId, 50);
  } catch (e) {
    console.error(e);
    attempts = loadLocalProgress().attempts;
  }

  const stats = computeStatsFromAttempts(attempts);

  document.getElementById("pStreak").textContent = stats.streak || 0;
  document.getElementById("pQuizzes").textContent = stats.totalQuizzes || 0;
  document.getElementById("pAvg").textContent = (stats.averageScore || 0) + "%";
  document.getElementById("pTopics").textContent = Object.keys(
    stats.topics,
  ).length;

  const topicList = document.getElementById("topicList");
  topicList.innerHTML = "";
  const topics = Object.entries(stats.topics).sort(
    (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total,
  );

  if (!topics.length) {
    topicList.innerHTML =
      '<div class="empty-state">Take a quiz to see performance.</div>';
  } else {
    topics.forEach(([name, s]) => {
      const pct = Math.round((s.correct / s.total) * 100);
      const cls = pct >= 70 ? "good" : pct >= 40 ? "mid" : "bad";
      const div = document.createElement("div");
      div.className = "topic-item";
      div.innerHTML = `
        <div>
          <div class="topic-name">${name}</div>
          <div class="topic-meta">${s.correct} correct of ${s.total}</div>
        </div>
        <div class="topic-score ${cls}">${pct}%</div>
      `;
      topicList.appendChild(div);
    });
  }

  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";
  if (!stats.attempts.length) {
    historyList.innerHTML =
      '<div class="empty-state">Your history will appear here.</div>';
  } else {
    stats.attempts.forEach((a) => {
      const pct = Math.round((a.correct / a.total) * 100);
      const cls = pct >= 70 ? "good" : pct >= 40 ? "mid" : "bad";
      const date = new Date(a.date || a.createdAt).toLocaleString();
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div>
          <div style="color:#fff;font-weight:600;">${a.exam} · ${a.subject}</div>
          <div class="h-date">${date}</div>
        </div>
        <div class="h-score ${cls}">${pct}%</div>
      `;
      historyList.appendChild(div);
    });
  }
}

render();

document.getElementById("resetBtn").addEventListener("click", async () => {
  if (confirm("Reset all local quiz data? (Firebase data stays)")) {
    clearLocalProgress();
    render();
  }
});
