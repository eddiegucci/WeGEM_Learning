// js/quiz-builder.js — Admin quiz authoring

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  isAdmin,
  isAdminEmail,
  saveQuiz,
  listAllQuizzes,
  getQuiz,
  deleteQuiz,
} from "./firebase.js";
import { SUBJECTS_BY_CURRICULUM } from "./data.js";

/* =========================================================
   GUARD — must be signed in
   ========================================================= */

const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

/* =========================================================
   STATE
   ========================================================= */

const state = {
  unlocked: false,
  quizzes: [],
  editingId: null, // null = creating new
  currentCurriculum: null,
  currentLevel: null,
  currentSubject: null,
  filters: {
    curriculum: "",
    level: "",
    subject: "",
    search: "",
  },
};

/* =========================================================
   ELEMENTS
   ========================================================= */

const gateView = document.getElementById("gateView");
const builderMain = document.getElementById("builderMain");
const gateBtn = document.getElementById("gateBtn");
const gatePassword = document.getElementById("gatePassword");
const gateError = document.getElementById("gateError");

const listView = document.getElementById("listView");
const editorView = document.getElementById("editorView");
const quizList = document.getElementById("quizList");

const newQuizBtn = document.getElementById("newQuizBtn");
const backToListBtn = document.getElementById("backToListBtn");
const saveQuizBtn = document.getElementById("saveQuizBtn");
const previewQuizBtn = document.getElementById("previewQuizBtn");
const closePreviewBtn = document.getElementById("closePreviewBtn");
const previewPanel = document.getElementById("previewPanel");
const previewBody = document.getElementById("previewBody");

const filterCurriculum = document.getElementById("filterCurriculum");
const filterLevel = document.getElementById("filterLevel");
const filterSubject = document.getElementById("filterSubject");
const filterSearch = document.getElementById("filterSearch");

const quizTitle = document.getElementById("quizTitle");
const quizCurriculum = document.getElementById("quizCurriculum");
const quizLevel = document.getElementById("quizLevel");
const quizSubject = document.getElementById("quizSubject");
const quizHtml = document.getElementById("quizHtml");
const quizMarking = document.getElementById("quizMarking");
const editorTitle = document.getElementById("editorTitle");

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

const LEVELS_BY_CURRICULUM = {
  844: ["Form 1", "Form 2", "Form 3", "Form 4"],
  CBE: ["Grade 7", "Grade 8", "Grade 9"],
};

function getSubjects(curriculum, level) {
  if (!curriculum || !level) return [];
  const byCurriculum = SUBJECTS_BY_CURRICULUM[curriculum] || {};
  return byCurriculum[level] || [];
}

/* =========================================================
   GATE — PASSWORD UNLOCK
   ========================================================= */

gateBtn?.addEventListener("click", () => {
  const pw = gatePassword.value;
  gateError.classList.add("hidden");

  // Must be admin email AND correct password
  if (!isAdmin(user.email, pw)) {
    gateError.textContent = "Incorrect password or you are not an admin.";
    gateError.classList.remove("hidden");
    return;
  }

  state.unlocked = true;
  gateView.classList.add("hidden");
  builderMain.classList.remove("hidden");

  loadAllQuizzes();
});

gatePassword?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") gateBtn.click();
});

// If already admin email but not yet unlocked, focus the password field
if (isAdminEmail(user.email)) {
  setTimeout(() => gatePassword?.focus(), 200);
} else {
  gateError.textContent = "This page is only available to the site admin.";
  gateError.classList.remove("hidden");
  gateBtn.disabled = true;
  gatePassword.disabled = true;
}

/* =========================================================
   VIEW SWITCHING
   ========================================================= */

document.querySelectorAll(".builder-mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".builder-mode-tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    const view = tab.dataset.view;
    if (view === "list") {
      listView.classList.remove("hidden");
      editorView.classList.add("hidden");
      loadAllQuizzes();
    } else {
      listView.classList.add("hidden");
      editorView.classList.remove("hidden");
    }
  });
});

function switchToList() {
  document
    .querySelectorAll(".builder-mode-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelector('.builder-mode-tab[data-view="list"]')
    ?.classList.add("active");
  listView.classList.remove("hidden");
  editorView.classList.add("hidden");
  state.editingId = null;
}

function switchToEditor() {
  document
    .querySelectorAll(".builder-mode-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelector('.builder-mode-tab[data-view="editor"]')
    ?.classList.add("active");
  listView.classList.add("hidden");
  editorView.classList.remove("hidden");
}

backToListBtn?.addEventListener("click", () => {
  if (quizTitle.value.trim() || quizHtml.value.trim()) {
    if (!confirm("Leave the editor? Unsaved changes will be lost.")) return;
  }
  resetEditor();
  switchToList();
});

/* =========================================================
   LOAD QUIZZES
   ========================================================= */

async function loadAllQuizzes() {
  try {
    state.quizzes = await listAllQuizzes();
    renderQuizList();
  } catch (e) {
    console.error(e);
    quizList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load quizzes</div>
        <div class="empty-sub">Check your connection and try again.</div>
      </div>
    `;
  }
}

/* =========================================================
   RENDER QUIZ LIST
   ========================================================= */

function renderQuizList() {
  let filtered = state.quizzes;

  if (state.filters.curriculum) {
    filtered = filtered.filter(
      (q) => q.curriculum === state.filters.curriculum,
    );
  }
  if (state.filters.level) {
    filtered = filtered.filter((q) => q.level === state.filters.level);
  }
  if (state.filters.subject) {
    filtered = filtered.filter((q) => q.subject === state.filters.subject);
  }
  if (state.filters.search) {
    const s = state.filters.search.toLowerCase();
    filtered = filtered.filter((q) =>
      (q.title || "").toLowerCase().includes(s),
    );
  }

  if (!filtered.length) {
    quizList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📝</div>
        <div class="empty-title">No quizzes yet</div>
        <div class="empty-sub">Click "+ New Quiz" to author your first one.</div>
      </div>
    `;
    return;
  }

  quizList.innerHTML = filtered
    .map((q) => {
      const updated = new Date(q.updatedAt || q.createdAt).toLocaleDateString();
      const subjectIcon = getSubjectIcon(q.subject);

      return `
      <article class="builder-quiz-card" data-id="${q.id}">
        <div class="builder-quiz-icon">${subjectIcon}</div>
        <div class="builder-quiz-info">
          <div class="builder-quiz-tags">
            <span class="builder-tag">${escapeHtml(q.curriculum === "844" ? "8-4-4" : q.curriculum)}</span>
            <span class="builder-tag">${escapeHtml(q.level || "")}</span>
            <span class="builder-tag builder-tag-subject">${escapeHtml(q.subject || "")}</span>
          </div>
          <div class="builder-quiz-title">${escapeHtml(q.title || "Untitled")}</div>
          <div class="builder-quiz-meta">Updated ${updated}</div>
        </div>
        <div class="builder-quiz-actions">
          <button class="builder-icon-btn" data-action="edit" data-id="${q.id}" title="Edit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20 H21 M16.5 3.5 A2.121 2.121 0 0 1 19.5 6.5 L7 19 L3 20 L4 16 L16.5 3.5 Z"/></svg>
          </button>
          <button class="builder-icon-btn builder-icon-danger" data-action="delete" data-id="${q.id}" title="Delete">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6 H21 M8 6 V4 A1 1 0 0 1 9 3 H15 A1 1 0 0 1 16 4 V6 M19 6 L18 20 A2 2 0 0 1 16 22 H8 A2 2 0 0 1 6 20 L5 6 M10 11 V17 M14 11 V17"/></svg>
          </button>
        </div>
      </article>
    `;
    })
    .join("");

  // Wire actions
  quizList.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => editQuiz(btn.dataset.id));
  });
  quizList.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => confirmDelete(btn.dataset.id));
  });
}

function getSubjectIcon(name) {
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

/* =========================================================
   FILTERS
   ========================================================= */

filterCurriculum?.addEventListener("change", () => {
  state.filters.curriculum = filterCurriculum.value;
  state.filters.level = "";
  state.filters.subject = "";
  filterLevel.value = "";
  filterSubject.value = "";

  // Update level options
  const levels = state.filters.curriculum
    ? LEVELS_BY_CURRICULUM[state.filters.curriculum] || []
    : Object.values(LEVELS_BY_CURRICULUM).flat();

  filterLevel.innerHTML =
    '<option value="">All Levels</option>' +
    levels.map((l) => `<option value="${l}">${l}</option>`).join("");
  filterSubject.innerHTML = '<option value="">All Subjects</option>';

  renderQuizList();
});

filterLevel?.addEventListener("change", () => {
  state.filters.level = filterLevel.value;
  state.filters.subject = "";
  filterSubject.value = "";

  const subjects =
    state.filters.curriculum && state.filters.level
      ? getSubjects(state.filters.curriculum, state.filters.level)
      : [];

  filterSubject.innerHTML =
    '<option value="">All Subjects</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");

  renderQuizList();
});

filterSubject?.addEventListener("change", () => {
  state.filters.subject = filterSubject.value;
  renderQuizList();
});

filterSearch?.addEventListener("input", () => {
  state.filters.search = filterSearch.value.trim();
  renderQuizList();
});

/* =========================================================
   NEW QUIZ
   ========================================================= */

newQuizBtn?.addEventListener("click", () => {
  resetEditor();
  switchToEditor();
});

function resetEditor() {
  state.editingId = null;
  editorTitle.textContent = "New Quiz";
  quizTitle.value = "";
  quizCurriculum.value = "";
  quizLevel.innerHTML = '<option value="">Select level</option>';
  quizSubject.innerHTML = '<option value="">Select subject</option>';
  quizHtml.value = "";
  quizMarking.value = "";
  previewPanel.classList.add("hidden");
}

/* =========================================================
   EDIT EXISTING QUIZ
   ========================================================= */

async function editQuiz(quizId) {
  const quiz = state.quizzes.find((q) => q.id === quizId);
  if (!quiz) return;

  state.editingId = quizId;
  editorTitle.textContent = "Edit Quiz";

  quizTitle.value = quiz.title || "";
  quizCurriculum.value = quiz.curriculum || "";

  // Build level options
  const levels = LEVELS_BY_CURRICULUM[quiz.curriculum] || [];
  quizLevel.innerHTML =
    '<option value="">Select level</option>' +
    levels.map((l) => `<option value="${l}">${l}</option>`).join("");
  quizLevel.value = quiz.level || "";

  // Build subject options
  const subjects = getSubjects(quiz.curriculum, quiz.level);
  quizSubject.innerHTML =
    '<option value="">Select subject</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
  quizSubject.value = quiz.subject || "";

  quizHtml.value = quiz.html || "";
  quizMarking.value = quiz.markingJS || "";

  previewPanel.classList.add("hidden");
  switchToEditor();
}

/* =========================================================
   DELETE
   ========================================================= */

async function confirmDelete(quizId) {
  const quiz = state.quizzes.find((q) => q.id === quizId);
  if (!quiz) return;

  if (!confirm(`Delete "${quiz.title}"?\n\nThis cannot be undone.`)) return;

  try {
    await deleteQuiz(quiz.curriculum, quiz.level, quiz.subject, quizId);
    showToast("Quiz deleted", "ok");
    await loadAllQuizzes();
  } catch (e) {
    console.error(e);
    showToast("Could not delete", "err");
  }
}

/* =========================================================
   META DROPDOWNS
   ========================================================= */

quizCurriculum?.addEventListener("change", () => {
  const curriculum = quizCurriculum.value;
  const levels = LEVELS_BY_CURRICULUM[curriculum] || [];

  quizLevel.innerHTML =
    '<option value="">Select level</option>' +
    levels.map((l) => `<option value="${l}">${l}</option>`).join("");
  quizSubject.innerHTML = '<option value="">Select subject</option>';
});

quizLevel?.addEventListener("change", () => {
  const curriculum = quizCurriculum.value;
  const level = quizLevel.value;
  const subjects = getSubjects(curriculum, level);

  quizSubject.innerHTML =
    '<option value="">Select subject</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
});

/* =========================================================
   INSERT TEMPLATES
   ========================================================= */

document.querySelectorAll(".builder-insert-btn[data-insert]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const kind = btn.dataset.insert;
    if (kind === "template") insertHtmlTemplate();
    if (kind === "marking") insertMarkingTemplate();
  });
});

function insertHtmlTemplate() {
  const template = `<div class="q" data-q="q1">
  <p>What is the capital of Kenya?</p>
  <label><input type="radio" name="q1" value="A"> Nairobi</label>
  <label><input type="radio" name="q1" value="B"> Mombasa</label>
  <label><input type="radio" name="q1" value="C"> Kisumu</label>
  <label><input type="radio" name="q1" value="D"> Nakuru</label>
</div>

<div class="q" data-q="q2">
  <p>What is 12 × 12?</p>
  <label><input type="radio" name="q2" value="A"> 124</label>
  <label><input type="radio" name="q2" value="B"> 144</label>
  <label><input type="radio" name="q2" value="C"> 132</label>
  <label><input type="radio" name="q2" value="D"> 154</label>
</div>`;
  quizHtml.value = template;
}

function insertMarkingTemplate() {
  const template = `// answers = { q1: 'A', q2: 'B', ... }
// return { score, total, details }

const correct = {
  q1: 'A',
  q2: 'B'
};

let score = 0;
const details = [];

for (const q in correct) {
  const ok = answers[q] === correct[q];
  if (ok) score++;
  details.push({ q, correct: correct[q], given: answers[q] || null, ok });
}

return {
  score,
  total: Object.keys(correct).length,
  details
};`;
  quizMarking.value = template;
}

/* =========================================================
   PREVIEW
   ========================================================= */

previewQuizBtn?.addEventListener("click", () => {
  const html = quizHtml.value.trim();
  if (!html) {
    showToast("Add some HTML questions first", "err");
    return;
  }

  // Render HTML safely inside the preview panel
  previewBody.innerHTML = html;
  previewPanel.classList.remove("hidden");
  previewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

closePreviewBtn?.addEventListener("click", () => {
  previewPanel.classList.add("hidden");
});

/* =========================================================
   SAVE QUIZ
   ========================================================= */

saveQuizBtn?.addEventListener("click", async () => {
  const title = quizTitle.value.trim();
  const curriculum = quizCurriculum.value;
  const level = quizLevel.value;
  const subject = quizSubject.value;
  const html = quizHtml.value.trim();
  const markingJS = quizMarking.value.trim();

  if (!title) return showToast("Please enter a title", "err");
  if (!curriculum) return showToast("Please choose a curriculum", "err");
  if (!level) return showToast("Please choose a level", "err");
  if (!subject) return showToast("Please choose a subject", "err");
  if (!html) return showToast("Please write the question HTML", "err");
  if (!markingJS) return showToast("Please write the marking scheme", "err");

  // Validate marking scheme syntax by attempting a dry run
  try {
    const fn = new Function("answers", markingJS);
    const testResult = fn({});
    if (
      !testResult ||
      typeof testResult !== "object" ||
      typeof testResult.score !== "number"
    ) {
      throw new Error("Marking scheme must return { score, total, details }");
    }
  } catch (e) {
    showToast("Marking scheme error: " + e.message, "err");
    return;
  }

  saveQuizBtn.disabled = true;
  saveQuizBtn.textContent = "Saving…";

  try {
    await saveQuiz({
      id: state.editingId,
      curriculum,
      level,
      subject,
      title,
      html,
      markingJS,
      createdBy: user.userId || "anon",
      createdByName: user.name || "Anonymous",
    });

    showToast("✓ Quiz saved", "ok");
    await loadAllQuizzes();
    resetEditor();
    switchToList();
  } catch (e) {
    console.error(e);
    showToast("Could not save. Try again.", "err");
  } finally {
    saveQuizBtn.disabled = false;
    saveQuizBtn.textContent = "💾 Save Quiz";
  }
});
