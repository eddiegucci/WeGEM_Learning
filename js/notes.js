// js/notes.js
import "./wallpaper-init.js";
import { NOTES } from "./data.js";
import { getCurrentUser, clearCurrentUser } from "./firebase.js";

const user = getCurrentUser();
if (!user) window.location.href = "signup.html";

const authLink = document.getElementById("auth-link");
if (authLink && user) {
  authLink.onclick = (e) => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = "signup.html";
  };
}

const container = document.getElementById("notesList");
const curriculum = user.curriculum || "844";
const levels = NOTES[curriculum] || {};

if (Object.keys(levels).length === 0) {
  container.innerHTML =
    '<div class="empty-state">Notes are being added. Check back soon!</div>';
} else {
  Object.entries(levels).forEach(([levelName, subjects]) => {
    Object.entries(subjects).forEach(([subjectName, topics]) => {
      const card = document.createElement("div");
      card.className = "note-card";
      card.style.setProperty("--accent", "#a855f7");

      const topicsHtml = topics
        .map(
          (t) => `
        <div class="note-topic">
          <div class="note-topic-name">${t.topic}</div>
          <div class="note-topic-summary">${t.summary}</div>
          <ul class="note-keypoints">
            ${t.keyPoints.map((k) => `<li>${k}</li>`).join("")}
          </ul>
        </div>
      `,
        )
        .join("");

      card.innerHTML = `
        <div class="exam-detail-head">
          <div>
            <div class="exam-grade">${levelName}</div>
            <div class="exam-name">${subjectName}</div>
          </div>
          <div class="exam-count">${topics.length} topics</div>
        </div>
        <div class="note-topics">${topicsHtml}</div>
      `;
      container.appendChild(card);
    });
  });
}
