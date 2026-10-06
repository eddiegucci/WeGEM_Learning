// js/exams.js
import "./wallpaper-init.js";
import { EXAMS } from "./data.js";
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

const container = document.getElementById("examList");

Object.entries(EXAMS).forEach(([key, exam]) => {
  const card = document.createElement("div");
  card.className = "exam-detail-card";
  card.style.setProperty("--accent", exam.color);

  const subjectsHtml = exam.subjects
    .map((s) => {
      const count = s.questions.length;
      return `<a class="chip" href="quiz.html?exam=${key}&subject=${encodeURIComponent(s.name)}">${s.name} <span class="chip-count">${count}</span></a>`;
    })
    .join("");

  card.innerHTML = `
    <div class="exam-detail-head">
      <div>
        <div class="exam-grade">${exam.gradeLabel}</div>
        <div class="exam-name">${key}</div>
      </div>
      <div class="exam-count">${exam.subjects.length} subjects</div>
    </div>
    <p class="exam-desc">${exam.description}</p>
    <div class="subject-chips">${subjectsHtml}</div>
  `;
  container.appendChild(card);
});
