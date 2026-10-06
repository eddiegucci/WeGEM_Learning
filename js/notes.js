// js/notes.js — WeGEM Learning notes page

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  getNotes,
  saveNote,
  deleteNote,
} from "./firebase.js";
import { NOTES, SUBJECTS_BY_CURRICULUM } from "./data.js";

/* =========================================================
   GUARD
   ========================================================= */

const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

/* =========================================================
   ELEMENTS
   ========================================================= */

const notesList = document.getElementById("notesList");
const subjectFilterBar = document.getElementById("subjectFilterBar");
const searchInput = document.getElementById("notesSearch");

const tray = document.getElementById("noteTray");
const trayBackdrop = document.getElementById("noteTrayBackdrop");
const trayCloseBtn = document.getElementById("noteTrayCloseBtn");
const trayCancelBtn = document.getElementById("noteTrayCancelBtn");
const traySaveBtn = document.getElementById("noteTraySaveBtn");
const noteSubject = document.getElementById("noteSubject");
const noteTopic = document.getElementById("noteTopic");
const noteSummary = document.getElementById("noteSummary");
const noteKeyPoints = document.getElementById("noteKeyPoints");
const noteTrayError = document.getElementById("noteTrayError");

const toast = document.getElementById("toast");

let allNotes = [];
let activeSubjectFilter = "all";
let searchQuery = "";

/* =========================================================
   TOPBAR USER
   ========================================================= */

if (user) {
  const av = document.getElementById("userAvatar");
  const nm = document.getElementById("userNameTop");
  if (av && user.name) av.textContent = user.name.charAt(0).toUpperCase();
  if (nm && user.name) nm.textContent = user.name.split(" ")[0];
  const cl = document.getElementById("curriculumLabel");
  const ll = document.getElementById("levelLabel");
  if (cl) cl.textContent = user.curriculum === "CBE" ? "CBE" : "8-4-4";
  if (ll) ll.textContent = user.level || user.form || user.grade || "Form 4";
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
   SUBJECT OPTIONS
   ========================================================= */

function getSubjectList() {
  const curriculum = user.curriculum === "CBE" ? "CBE" : "844";
  const byLevel = SUBJECTS_BY_CURRICULUM[curriculum] || {};
  const level =
    user.level || user.form || user.grade || Object.keys(byLevel)[0];
  return byLevel[level] || [];
}

function populateSubjectDropdown() {
  const subjects = getSubjectList();
  noteSubject.innerHTML =
    '<option value="">Select subject</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
}

/* =========================================================
   LOAD NOTES
   ========================================================= */

async function loadAllNotes() {
  // Static notes from data.js (organized by curriculum)
  const staticNotes = [];
  const curriculumKey = user.curriculum === "CBE" ? "CBE" : "8-4-4";
  const levelKey = user.level || user.form || user.grade;

  const staticByLevel = NOTES[curriculumKey]?.[levelKey] || {};
  Object.entries(staticByLevel).forEach(([subject, topics]) => {
    topics.forEach((t) => {
      staticNotes.push({
        id: "static_" + subject + "_" + t.topic,
        subject,
        topic: t.topic,
        summary: t.summary,
        keyPoints: t.keyPoints || [],
        source: "static",
        createdAt: new Date(2024, 0, 1).toISOString(),
      });
    });
  });

  // Dynamic notes from Firebase
  let firebaseNotes = [];
  try {
    firebaseNotes = await getNotes();
  } catch (e) {
    console.warn("Could not fetch custom notes:", e);
  }

  // Combine + sort
  allNotes = [...firebaseNotes, ...staticNotes];
}

/* =========================================================
   RENDER
   ========================================================= */

function renderFilterBar() {
  const subjects = getSubjectList();
  const html = `
    <button class="filter-chip${activeSubjectFilter === "all" ? " active" : ""}" data-filter="all" type="button">All Subjects</button>
    ${subjects
      .map(
        (s) => `
      <button class="filter-chip${activeSubjectFilter === s ? " active" : ""}" data-filter="${escapeAttr(s)}" type="button">${escapeHtml(s)}</button>
    `,
      )
      .join("")}
  `;
  subjectFilterBar.innerHTML = html;

  subjectFilterBar.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeSubjectFilter = chip.dataset.filter;
      renderFilterBar();
      renderNotes();
    });
  });
}

function renderNotes() {
  let filtered = allNotes;

  if (activeSubjectFilter !== "all") {
    filtered = filtered.filter((n) => n.subject === activeSubjectFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        (n.topic || "").toLowerCase().includes(q) ||
        (n.subject || "").toLowerCase().includes(q) ||
        (n.summary || "").toLowerCase().includes(q),
    );
  }

  if (!filtered.length) {
    notesList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📖</div>
        <div class="empty-title">No notes here yet</div>
        <div class="empty-sub">
          Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>N</kbd> to add your first note, or switch subjects.
        </div>
      </div>
    `;
    return;
  }

  notesList.innerHTML = filtered
    .map((note) => {
      const icon = subjectIcon(note.subject);
      const canDelete = note.source !== "static";
      const keyPointsHtml = (note.keyPoints || []).length
        ? `<ul class="note-keypoints">${note.keyPoints.map((k) => `<li>${escapeHtml(k)}</li>`).join("")}</ul>`
        : "";

      return `
      <article class="note-card-v2" data-id="${note.id}">
        <header class="note-v2-head">
          <div class="note-v2-icon">${icon}</div>
          <div class="note-v2-meta">
            <div class="note-v2-subject">${escapeHtml(note.subject || "General")}</div>
            <div class="note-v2-topic">${escapeHtml(note.topic || "Untitled")}</div>
          </div>
          ${canDelete ? `<button class="note-v2-remove" data-remove-id="${note.id}" title="Delete">×</button>` : ""}
        </header>
        ${note.summary ? `<p class="note-v2-summary">${escapeHtml(note.summary)}</p>` : ""}
        ${keyPointsHtml}
        <div class="note-v2-actions">
          <a class="note-v2-link" href="quiz.html?exam=KCSE&subject=${encodeURIComponent(note.subject || "")}">
            Test yourself
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12 H19 M13 6 L19 12 L13 18"/></svg>
          </a>
        </div>
      </article>
    `;
    })
    .join("");

  notesList.querySelectorAll(".note-v2-remove").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = btn.dataset.removeId;
      if (!confirm("Delete this note?")) return;
      try {
        await deleteNote(id);
        showToast("Note deleted", "ok");
        await loadAllNotes();
        renderNotes();
      } catch (err) {
        console.error(err);
        showToast("Could not delete", "err");
      }
    });
  });
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

/* =========================================================
   ESCAPE HELPERS
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
function escapeAttr(str) {
  return escapeHtml(str);
}

/* =========================================================
   TRAY
   ========================================================= */

function openTray() {
  tray.classList.remove("hidden");
  trayBackdrop.classList.remove("hidden");
  tray.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    tray.classList.add("open");
    trayBackdrop.classList.add("open");
  });
  noteTopic.value = "";
  noteSummary.value = "";
  noteKeyPoints.value = "";
  hideTrayError();
  setTimeout(() => noteTopic.focus(), 260);
}

function closeTray() {
  tray.classList.remove("open");
  trayBackdrop.classList.remove("open");
  tray.setAttribute("aria-hidden", "true");
  setTimeout(() => {
    tray.classList.add("hidden");
    trayBackdrop.classList.add("hidden");
  }, 260);
}

trayCloseBtn?.addEventListener("click", closeTray);
trayCancelBtn?.addEventListener("click", closeTray);
trayBackdrop?.addEventListener("click", closeTray);
document.getElementById("addNoteBtn")?.addEventListener("click", openTray);

/* =========================================================
   KEYBOARD SHORTCUT Ctrl+Shift+Alt+N
   ========================================================= */

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "N" || e.key === "n")) {
    e.preventDefault();
    if (tray.classList.contains("hidden")) openTray();
    else closeTray();
  }
  if (e.key === "Escape" && !tray.classList.contains("hidden")) closeTray();
});

/* =========================================================
   TRAY ERROR
   ========================================================= */

function showTrayError(msg) {
  noteTrayError.textContent = msg;
  noteTrayError.classList.remove("hidden");
}
function hideTrayError() {
  noteTrayError.classList.add("hidden");
  noteTrayError.textContent = "";
}

/* =========================================================
   SAVE NOTE
   ========================================================= */

traySaveBtn?.addEventListener("click", async () => {
  hideTrayError();

  const subject = noteSubject.value;
  const topic = noteTopic.value.trim();
  const summary = noteSummary.value.trim();
  const rawPoints = noteKeyPoints.value.trim();
  const keyPoints = rawPoints
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!subject) return showTrayError("Please choose a subject.");
  if (!topic) return showTrayError("Please enter a topic.");

  traySaveBtn.disabled = true;
  const originalText = traySaveBtn.textContent;
  traySaveBtn.textContent = "Saving…";

  try {
    await saveNote({
      subject,
      topic,
      summary,
      keyPoints,
      curriculum: user.curriculum || "844",
      level: user.level || "",
      createdBy: user.userId || "anon",
      createdByName: user.name || "Anonymous",
    });
    showToast("✓ Note saved", "ok");
    closeTray();
    await loadAllNotes();
    renderFilterBar();
    renderNotes();
  } catch (e) {
    console.error(e);
    showTrayError("Could not save. Check your connection and try again.");
  } finally {
    traySaveBtn.disabled = false;
    traySaveBtn.textContent = originalText;
  }
});

/* =========================================================
   SEARCH
   ========================================================= */

searchInput?.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderNotes();
});

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  populateSubjectDropdown();
  await loadAllNotes();
  renderFilterBar();
  renderNotes();
}

init();
