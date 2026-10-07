// js/notes.js — WeGEM Learning notes page

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  getNotes,
  deleteNote,
  listCanvases,
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
   STATE
   ========================================================= */

let allQuickNotes = [];
let allCanvases = [];
let activeSubjectFilter = "all";
let searchQuery = "";

/* =========================================================
   ELEMENTS
   ========================================================= */

const notesList = document.getElementById("notesList");
const canvasList = document.getElementById("canvasList");
const subjectFilterBar = document.getElementById("subjectFilterBar");
const searchInput = document.getElementById("notesSearch");
const canvasCountEl = document.getElementById("canvasCount");
const quickCountEl = document.getElementById("quickCount");
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
function escapeAttr(str) {
  return escapeHtml(str);
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
  const curriculum = user.curriculum === "CBE" ? "CBE" : "844";
  const byLevel = SUBJECTS_BY_CURRICULUM[curriculum] || {};
  const level =
    user.level || user.form || user.grade || Object.keys(byLevel)[0];
  return byLevel[level] || [];
}

function getCurrentCurriculum() {
  return user.curriculum === "CBE" ? "CBE" : "844";
}

function getCurrentLevel() {
  return user.level || user.form || user.grade || "";
}

/* =========================================================
   LOAD — QUICK NOTES (static + firebase)
   ========================================================= */

async function loadQuickNotes() {
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

  let firebaseNotes = [];
  try {
    firebaseNotes = await getNotes();
  } catch (e) {
    console.warn("Could not fetch custom notes:", e);
  }

  allQuickNotes = [...firebaseNotes, ...staticNotes];
}

/* =========================================================
   LOAD — CANVASES (long-form notes from Firebase)
   ========================================================= */

async function loadCanvases() {
  try {
    const curriculum = getCurrentCurriculum();
    const level = getCurrentLevel();
    const subjects = getSubjectList();

    const results = [];
    for (const subject of subjects) {
      try {
        const list = await listCanvases("notes", curriculum, level, subject);
        list.forEach((c) => results.push({ ...c, subject }));
      } catch (e) {
        // ignore per-subject failures
      }
    }
    // Sort newest first
    results.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    );
    allCanvases = results;
  } catch (e) {
    console.warn("Could not load canvases:", e);
    allCanvases = [];
  }
}

/* =========================================================
   RENDER — FILTER BAR
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
      renderAll();
    });
  });
}

/* =========================================================
   RENDER — CANVAS CARDS
   ========================================================= */

function renderCanvases() {
  let filtered = allCanvases;

  if (activeSubjectFilter !== "all") {
    filtered = filtered.filter((c) => c.subject === activeSubjectFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((c) => {
      const titleMatch = (c.title || "").toLowerCase().includes(q);
      const subjectMatch = (c.subject || "").toLowerCase().includes(q);
      // Search inside pages too
      const pagesText = (c.pages || [])
        .map((p) => stripHtml(p))
        .join(" ")
        .toLowerCase();
      return titleMatch || subjectMatch || pagesText.includes(q);
    });
  }

  canvasCountEl.textContent =
    filtered.length + (filtered.length === 1 ? " note" : " notes");

  if (!filtered.length) {
    canvasList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📚</div>
        <div class="empty-title">No long-form notes yet</div>
        <div class="empty-sub">Check back soon for detailed study material.</div>
      </div>
    `;
    return;
  }

  canvasList.innerHTML = filtered
    .map((canvas) => {
      const icon = subjectIcon(canvas.subject);
      const pageCount = (canvas.pages || []).length;
      const preview =
        canvas.pages && canvas.pages[0]
          ? stripHtml(canvas.pages[0]).slice(0, 140)
          : "";

      return `
      <a class="canvas-card" href="canvas.html?mode=notes&curriculum=${encodeURIComponent(canvas.curriculum)}&level=${encodeURIComponent(canvas.level)}&subject=${encodeURIComponent(canvas.subject)}&id=${encodeURIComponent(canvas.id)}">
        <div class="canvas-card-icon">${icon}</div>
        <div class="canvas-card-body">
          <div class="canvas-card-subject">${escapeHtml(canvas.subject)} · ${escapeHtml(canvas.level)}</div>
          <div class="canvas-card-title">${escapeHtml(canvas.title || "Untitled")}</div>
          <div class="canvas-card-preview">${escapeHtml(preview)}${preview.length >= 140 ? "…" : ""}</div>
          <div class="canvas-card-meta">
            <span class="canvas-card-pages">📄 ${pageCount} ${pageCount === 1 ? "page" : "pages"}</span>
            <span class="canvas-card-cta">
              Read
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12 H19 M13 6 L19 12 L13 18"/></svg>
            </span>
          </div>
        </div>
      </a>
    `;
    })
    .join("");
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || "";
}

/* =========================================================
   RENDER — QUICK NOTES CARDS
   ========================================================= */

function renderQuickNotes() {
  let filtered = allQuickNotes;

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

  quickCountEl.textContent =
    filtered.length + (filtered.length === 1 ? " note" : " notes");

  if (!filtered.length) {
    notesList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">⚡</div>
        <div class="empty-title">No quick notes here yet</div>
        <div class="empty-sub">Try another subject or check back soon.</div>
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
        await loadQuickNotes();
        renderQuickNotes();
      } catch (err) {
        console.error(err);
        showToast("Could not delete", "err");
      }
    });
  });
}

/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {
  renderCanvases();
  renderQuickNotes();
}

/* =========================================================
   SEARCH
   ========================================================= */

searchInput?.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderAll();
});

/* =========================================================
   SECRET SHORTCUTS (silent — no visible hints)
   ========================================================= */

document.addEventListener("keydown", (e) => {
  // Ctrl+Shift+Alt+N → open canvas in read/preview mode (start new)
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "N" || e.key === "n")) {
    e.preventDefault();
    window.location.href = "canvas.html?mode=notes&new=1";
    return;
  }

  // Ctrl+Shift+Alt+E → open canvas list in edit mode (password protected)
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "E" || e.key === "e")) {
    e.preventDefault();
    window.location.href = "canvas.html?mode=notes&edit=1";
    return;
  }
});

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  await Promise.all([loadQuickNotes(), loadCanvases()]);
  renderFilterBar();
  renderAll();
}

init();
