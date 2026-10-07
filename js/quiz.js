// js/quiz.js — WeGEM Learning quiz runner
// Handles both authored quizzes (HTML + JS marking) and built-in quick practice.

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  listQuizzes,
  getQuiz,
  saveQuizResult,
} from "./firebase.js";
import { EXAMS, SUBJECTS_BY_CURRICULUM, shuffle } from "./data.js";

/* =========================================================
   GUARD
   ========================================================= */

const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

/* =========================================================
   STATE
   ========================================================= */

const state = {
  curriculum: user.curriculum === "CBE" ? "CBE" : "844",
  level: user.level || user.form || user.grade || "",
  subjectFilter: "all",
  authoredQuizzes: [],
  builtinQuizzes: [],
  activeQuiz: null, // { kind: 'authored'|'builtin', ...}
  answers: {},
  startTime: null,
};

/* =========================================================
   ELEMENTS
   ========================================================= */

const libraryScreen = document.getElementById("libraryScreen");
const activeScreen = document.getElementById("activeScreen");
const resultsScreen = document.getElementById("resultsScreen");

const subjectFilterBar = document.getElementById("subjectFilterBar");
const authoredQuizList = document.getElementById("authoredQuizList");
const builtinQuizList = document.getElementById("builtinQuizList");
const authoredCountEl = document.getElementById("authoredCount");
const builtinCountEl = document.getElementById("builtinCount");

const exitQuizBtn = document.getElementById("exitQuizBtn");
const activeMeta = document.getElementById("activeMeta");
const activeTitle = document.getElementById("activeTitle");
const activeProgress = document.getElementById("activeProgress");
const activeQuestions = document.getElementById("activeQuestions");
const submitQuizBtn = document.getElementById("submitQuizBtn");

const resultsTitle = document.getElementById("resultsTitle");
const finalScore = document.getElementById("finalScore");
const finalDetail = document.getElementById("finalDetail");
const syncStatus = document.getElementById("syncStatus");
const resultsBreakdown = document.getElementById("resultsBreakdown");
const retryQuizBtn = document.getElementById("retryQuizBtn");
const backToLibraryBtn = document.getElementById("backToLibraryBtn");

const toast = document.getElementById("toast");

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

function subjectIcon(name) {
  const map = {
    Mathematics: "📐",
    English: "📘",
    Kiswahili: "📕",
    Biology: "🧬",
    Chemistry: "⚗️",
    Physics: "⚛️",
    Geography: "🌍",
    History: "📜",
    CRE: "✝️",
    Business: "💼",
    Agriculture: "🌾",
    "Computer Studies": "💻",
    "Integrated Science": "🔬",
    "Social Studies": "🌐",
    "Life Skills": "💡",
  };
  return map[name] || "📚";
}

function getSubjectList() {
  const byLevel = SUBJECTS_BY_CURRICULUM[state.curriculum] || {};
  return byLevel[state.level] || [];
}

/* =========================================================
   LOAD QUIZZES
   ========================================================= */

async function loadAuthoredQuizzes() {
  const subjects = getSubjectList();
  const results = [];

  for (const subject of subjects) {
    try {
      const list = await listQuizzes(state.curriculum, state.level, subject);
      list.forEach((q) => results.push({ ...q, subject }));
    } catch (e) {
      // ignore
    }
  }

  results.sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt),
  );
  state.authoredQuizzes = results;
}

function loadBuiltinQuizzes() {
  const examKey =
    state.curriculum === "CBE"
      ? state.level === "Grade 9"
        ? "KJSEA"
        : "KPSEA"
      : "KCSE";

  const exam = EXAMS[examKey];
  if (!exam) {
    state.builtinQuizzes = [];
    return;
  }

  const userSubjects = getSubjectList();
  const list = exam.subjects
    .filter((s) => userSubjects.length === 0 || userSubjects.includes(s.name))
    .map((s) => ({
      kind: "builtin",
      examKey,
      subject: s.name,
      title: `${s.name} Practice`,
      questionCount: s.questions.length,
    }));

  state.builtinQuizzes = list;
}

/* =========================================================
   RENDER FILTER BAR
   ========================================================= */

function renderFilterBar() {
  const subjects = getSubjectList();
  const html = `
    <button class="filter-chip${state.subjectFilter === "all" ? " active" : ""}" data-filter="all" type="button">All Subjects</button>
    ${subjects
      .map(
        (s) => `
      <button class="filter-chip${state.subjectFilter === s ? " active" : ""}" data-filter="${escapeHtml(s)}" type="button">${escapeHtml(s)}</button>
    `,
      )
      .join("")}
  `;
  subjectFilterBar.innerHTML = html;

  subjectFilterBar.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.subjectFilter = chip.dataset.filter;
      renderFilterBar();
      renderLibrary();
    });
  });
}

/* =========================================================
   RENDER LIBRARY
   ========================================================= */

function renderLibrary() {
  renderAuthored();
  renderBuiltin();
}

function renderAuthored() {
  let filtered = state.authoredQuizzes;
  if (state.subjectFilter !== "all") {
    filtered = filtered.filter((q) => q.subject === state.subjectFilter);
  }

  authoredCountEl.textContent =
    filtered.length + (filtered.length === 1 ? " quiz" : " quizzes");

  if (!filtered.length) {
    authoredQuizList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📝</div>
        <div class="empty-title">No custom quizzes yet</div>
        <div class="empty-sub">Check back soon — new quizzes are added regularly.</div>
      </div>
    `;
    return;
  }

  authoredQuizList.innerHTML = filtered
    .map((q) => {
      const icon = subjectIcon(q.subject);
      const updated = new Date(q.updatedAt || q.createdAt).toLocaleDateString();
      const qCount = countQuestionsInHtml(q.html || "");

      return `
      <button class="quiz-library-card" data-kind="authored" data-id="${q.id}" type="button">
        <div class="qlc-icon">${icon}</div>
        <div class="qlc-body">
          <div class="qlc-subject">${escapeHtml(q.subject)} · ${escapeHtml(q.level)}</div>
          <div class="qlc-title">${escapeHtml(q.title || "Untitled")}</div>
          <div class="qlc-meta">
            <span>📋 ${qCount} ${qCount === 1 ? "question" : "questions"}</span>
            <span>· Updated ${updated}</span>
          </div>
        </div>
        <div class="qlc-cta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></svg>
        </div>
      </button>
    `;
    })
    .join("");

  authoredQuizList.querySelectorAll('[data-kind="authored"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const quiz = state.authoredQuizzes.find((q) => q.id === btn.dataset.id);
      if (quiz) startAuthoredQuiz(quiz);
    });
  });
}

function renderBuiltin() {
  let filtered = state.builtinQuizzes;
  if (state.subjectFilter !== "all") {
    filtered = filtered.filter((q) => q.subject === state.subjectFilter);
  }

  builtinCountEl.textContent =
    filtered.length + (filtered.length === 1 ? " quiz" : " quizzes");

  if (!filtered.length) {
    builtinQuizList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">⚡</div>
        <div class="empty-title">No built-in quizzes for your subjects</div>
        <div class="empty-sub">Update your subjects in Settings to see more.</div>
      </div>
    `;
    return;
  }

  builtinQuizList.innerHTML = filtered
    .map((q) => {
      const icon = subjectIcon(q.subject);
      return `
      <button class="quiz-library-card" data-kind="builtin" data-subject="${escapeHtml(q.subject)}" type="button">
        <div class="qlc-icon">${icon}</div>
        <div class="qlc-body">
          <div class="qlc-subject">${escapeHtml(q.examKey)} · ${escapeHtml(q.subject)}</div>
          <div class="qlc-title">${escapeHtml(q.title)}</div>
          <div class="qlc-meta">
            <span>⚡ ${q.questionCount} ${q.questionCount === 1 ? "question" : "questions"}</span>
            <span>· Instant feedback</span>
          </div>
        </div>
        <div class="qlc-cta">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 L15 12 L9 18"/></svg>
        </div>
      </button>
    `;
    })
    .join("");

  builtinQuizList.querySelectorAll('[data-kind="builtin"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = state.builtinQuizzes.find(
        (x) => x.subject === btn.dataset.subject,
      );
      if (q) startBuiltinQuiz(q);
    });
  });
}

/* =========================================================
   COUNT QUESTIONS INSIDE AUTHORED HTML
   ========================================================= */

function countQuestionsInHtml(html) {
  if (!html) return 0;
  // Count radio input names (each unique name = one question)
  const matches = html.match(/name=["']([^"']+)["']/g) || [];
  const names = new Set(matches.map((m) => m.replace(/name=["']|["']/g, "")));
  return names.size || 0;
}

/* =========================================================
   SWITCH SCREENS
   ========================================================= */

function showLibrary() {
  libraryScreen.classList.remove("hidden");
  activeScreen.classList.add("hidden");
  resultsScreen.classList.add("hidden");
  window.scrollTo(0, 0);
}

function showActive() {
  libraryScreen.classList.add("hidden");
  activeScreen.classList.remove("hidden");
  resultsScreen.classList.add("hidden");
  window.scrollTo(0, 0);
}

function showResults() {
  libraryScreen.classList.add("hidden");
  activeScreen.classList.add("hidden");
  resultsScreen.classList.remove("hidden");
  window.scrollTo(0, 0);
}

/* =========================================================
   START AUTHORED QUIZ
   ========================================================= */

function startAuthoredQuiz(quiz) {
  state.activeQuiz = {
    kind: "authored",
    id: quiz.id,
    curriculum: quiz.curriculum,
    level: quiz.level,
    subject: quiz.subject,
    title: quiz.title,
    html: quiz.html,
    markingJS: quiz.markingJS,
  };

  state.answers = {};
  state.startTime = Date.now();

  activeMeta.textContent = `${quiz.curriculum === "844" ? "8-4-4" : quiz.curriculum} · ${quiz.subject} · ${quiz.level}`;
  activeTitle.textContent = quiz.title;

  // Render HTML questions
  activeQuestions.innerHTML = quiz.html;

  // Attach change listeners to capture answers
  activeQuestions.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.answers[input.name] = input.value;
      updateActiveProgress();
    });
  });

  // Also support checkboxes and text inputs
  activeQuestions
    .querySelectorAll('input[type="checkbox"]')
    .forEach((input) => {
      input.addEventListener("change", () => {
        const name = input.name;
        if (!state.answers[name]) state.answers[name] = [];
        if (input.checked) {
          state.answers[name].push(input.value);
        } else {
          state.answers[name] = state.answers[name].filter(
            (v) => v !== input.value,
          );
        }
        updateActiveProgress();
      });
    });

  activeQuestions
    .querySelectorAll('input[type="text"], textarea')
    .forEach((input) => {
      input.addEventListener("input", () => {
        state.answers[input.name] = input.value;
        updateActiveProgress();
      });
    });

  updateActiveProgress();
  showActive();
}

/* =========================================================
   START BUILT-IN QUIZ (with instant feedback)
   ========================================================= */

function startBuiltinQuiz(q) {
  // Pick 5 random questions from the subject
  const exam = EXAMS[q.examKey];
  const subject = exam.subjects.find((s) => s.name === q.subject);
  if (!subject) return;

  const questions = shuffle(subject.questions).slice(
    0,
    Math.min(5, subject.questions.length),
  );

  state.activeQuiz = {
    kind: "builtin",
    examKey: q.examKey,
    subject: q.subject,
    title: q.title,
    questions,
  };

  state.answers = {};
  state.startTime = Date.now();

  activeMeta.textContent = `${q.examKey} · ${q.subject}`;
  activeTitle.textContent = q.title;

  // Render built-in questions as radio inputs
  activeQuestions.innerHTML = questions
    .map(
      (qn, idx) => `
    <div class="builtin-question" data-idx="${idx}">
      <div class="bq-topic">${escapeHtml(qn.topic.toUpperCase())}</div>
      <div class="bq-text">${escapeHtml(qn.q)}</div>
      <div class="bq-options">
        ${qn.options
          .map(
            (opt, i) => `
          <label class="bq-option">
            <input type="radio" name="q${idx}" value="${i}">
            <span class="bq-letter">${"ABCD"[i]}</span>
            <span class="bq-label">${escapeHtml(opt)}</span>
          </label>
        `,
          )
          .join("")}
      </div>
    </div>
  `,
    )
    .join("");

  activeQuestions.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.answers[input.name] = parseInt(input.value, 10);
      updateActiveProgress();
    });
  });

  updateActiveProgress();
  showActive();
}

/* =========================================================
   PROGRESS
   ========================================================= */

function updateActiveProgress() {
  if (!state.activeQuiz) return;

  let total = 0;
  if (state.activeQuiz.kind === "authored") {
    const names = new Set();
    activeQuestions
      .querySelectorAll('input[type="radio"]')
      .forEach((i) => names.add(i.name));
    activeQuestions
      .querySelectorAll('input[type="text"], textarea')
      .forEach((i) => names.add(i.name));
    total = names.size;
  } else {
    total = state.activeQuiz.questions.length;
  }

  const answered = Object.keys(state.answers).length;
  activeProgress.textContent = `${answered} / ${total}`;

  // Enable/disable submit
  submitQuizBtn.disabled = answered < total;
}

/* =========================================================
   SUBMIT QUIZ
   ========================================================= */

submitQuizBtn?.addEventListener("click", () => {
  if (!state.activeQuiz) return;

  if (state.activeQuiz.kind === "authored") {
    submitAuthored();
  } else {
    submitBuiltin();
  }
});

/* =========================================================
   SUBMIT — AUTHORED
   ========================================================= */

async function submitAuthored() {
  const quiz = state.activeQuiz;

  let result;
  try {
    const markingFn = new Function("answers", quiz.markingJS);
    result = markingFn(state.answers);
  } catch (e) {
    console.error("Marking scheme error:", e);
    showToast("Marking scheme error: " + e.message, "err");
    return;
  }

  if (!result || typeof result.score !== "number") {
    showToast("Marking scheme did not return a valid score", "err");
    return;
  }

  const total = result.total || countQuestionsInHtml(quiz.html);
  const percent = total > 0 ? Math.round((result.score / total) * 100) : 0;

  // Save to Firebase
  let syncMsg = "";
  try {
    await saveQuizResult(user.userId, {
      quizId: quiz.id,
      quizTitle: quiz.title,
      curriculum: quiz.curriculum,
      level: quiz.level,
      subject: quiz.subject,
      score: result.score,
      total,
      percent,
      answers: state.answers,
    });
    syncMsg = '<span class="sync-ok">✓ Saved to your account</span>';
  } catch (e) {
    console.error(e);
    syncMsg = '<span class="sync-warn">Saved locally (sync failed)</span>';
  }

  renderResults({
    title: quiz.title,
    score: result.score,
    total,
    percent,
    details: result.details || [],
    syncMsg,
  });
}

/* =========================================================
   SUBMIT — BUILT-IN
   ========================================================= */

async function submitBuiltin() {
  const quiz = state.activeQuiz;
  const questions = quiz.questions;

  let correct = 0;
  const details = [];

  questions.forEach((qn, idx) => {
    const given = state.answers[`q${idx}`];
    const ok = given === qn.answer;
    if (ok) correct++;
    details.push({
      q: `Q${idx + 1}: ${qn.q}`,
      correct: qn.options[qn.answer],
      given: given != null ? qn.options[given] : "—",
      ok,
      explain: qn.explain,
    });
  });

  const total = questions.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Save to Firebase (both legacy attempts path and quiz-results path)
  let syncMsg = "";
  try {
    await saveQuizResult(user.userId, {
      quizId: "builtin_" + quiz.subject,
      quizTitle: quiz.title,
      curriculum: state.curriculum,
      level: state.level,
      subject: quiz.subject,
      score: correct,
      total,
      percent,
      answers: state.answers,
    });
    syncMsg = '<span class="sync-ok">✓ Saved to your account</span>';
  } catch (e) {
    console.error(e);
    syncMsg = '<span class="sync-warn">Saved locally (sync failed)</span>';
  }

  renderResults({
    title: quiz.title,
    score: correct,
    total,
    percent,
    details,
    syncMsg,
  });
}

/* =========================================================
   RENDER RESULTS
   ========================================================= */

function renderResults({ title, score, total, percent, details, syncMsg }) {
  finalScore.textContent = percent + "%";
  finalDetail.textContent = `${score} / ${total} correct`;
  syncStatus.innerHTML = syncMsg;

  let headline = "Keep going!";
  if (percent >= 80) headline = "Outstanding! 🎉";
  else if (percent >= 60) headline = "Good job!";
  else if (percent >= 40) headline = "Keep practicing.";
  else headline = "Let's review together.";
  resultsTitle.textContent = headline;

  // Breakdown
  if (details && details.length) {
    resultsBreakdown.innerHTML = `
      <h3 class="weak-heading">Answer breakdown</h3>
      <div class="breakdown-list">
        ${details
          .map(
            (d) => `
          <div class="breakdown-item ${d.ok ? "bd-ok" : "bd-bad"}">
            <div class="bd-mark">${d.ok ? "✓" : "✗"}</div>
            <div class="bd-body">
              <div class="bd-q">${escapeHtml(typeof d.q === "string" ? d.q : "")}</div>
              ${
                !d.ok
                  ? `
                <div class="bd-row"><span class="bd-label">Correct:</span> <strong>${escapeHtml(String(d.correct))}</strong></div>
                <div class="bd-row"><span class="bd-label">You gave:</span> <em>${escapeHtml(String(d.given))}</em></div>
              `
                  : ""
              }
              ${d.explain ? `<div class="bd-explain">${escapeHtml(d.explain)}</div>` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  } else {
    resultsBreakdown.innerHTML = "";
  }

  showResults();
}

/* =========================================================
   RESULT ACTIONS
   ========================================================= */

retryQuizBtn?.addEventListener("click", () => {
  if (!state.activeQuiz) return;
  if (state.activeQuiz.kind === "authored") {
    const quiz = state.authoredQuizzes.find(
      (q) => q.id === state.activeQuiz.id,
    );
    if (quiz) startAuthoredQuiz(quiz);
  } else {
    const q = state.builtinQuizzes.find(
      (x) => x.subject === state.activeQuiz.subject,
    );
    if (q) startBuiltinQuiz(q);
  }
});

backToLibraryBtn?.addEventListener("click", () => {
  state.activeQuiz = null;
  state.answers = {};
  showLibrary();
  renderLibrary();
});

exitQuizBtn?.addEventListener("click", () => {
  if (confirm("Exit this quiz? Your progress will not be saved.")) {
    state.activeQuiz = null;
    state.answers = {};
    showLibrary();
    renderLibrary();
  }
});

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  await loadAuthoredQuizzes();
  loadBuiltinQuizzes();
  renderFilterBar();
  renderLibrary();
  showLibrary();
}

init();
