// js/pages/notes.js
// Controller for notes.html.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import {
  fetchNotes,
  filterNotes,
  createNote,
  deleteNote,
  extractSubjects,
} from "../features/notes.js";
import {
  getSubjects,
  getSubjectIcon,
  getSubjectColor,
} from "../data/subjects.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import { bindShortcut, installTapShortcuts } from "../ui/shortcuts.js";
import {
  escapeHTML,
  firstName,
  initials,
  log,
  debounce,
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  notes: [],
  filtered: [],
  activeSubject: "all",
  query: "",
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  notesList: document.getElementById("notesList"),
  subjectFilterBar: document.getElementById("subjectFilterBar"),
  searchInput: document.getElementById("notesSearch"),

  tray: document.getElementById("noteTray"),
  trayBackdrop: document.getElementById("noteTrayBackdrop"),
  trayBadge: document.getElementById("noteTrayBadge"),
  trayCloseBtn: document.getElementById("noteTrayCloseBtn"),
  trayCancelBtn: document.getElementById("noteTrayCancelBtn"),
  traySaveBtn: document.getElementById("noteTraySaveBtn"),
  noteSubject: document.getElementById("noteSubject"),
  noteTopic: document.getElementById("noteTopic"),
  noteSummary: document.getElementById("noteSummary"),
  noteKeyPoints: document.getElementById("noteKeyPoints"),
  trayError: document.getElementById("noteTrayError"),
};

/* =========================================================
   SETUP USER
   ========================================================= */

async function setupUser() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace("login.html");
    return false;
  }

  state.user = user;

  const cached = getCachedUser();
  const displayName =
    cached?.displayName ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Student";

  if (els.userAvatar) els.userAvatar.textContent = initials(displayName);
  if (els.userNameTop) els.userNameTop.textContent = firstName(displayName);

  // Load full user doc
  try {
    let doc = await getCachedUserFromIDB(user.uid);
    if (!doc) {
      doc = await getUserDoc(user.uid);
      if (doc) await cacheUser(doc);
    }
    state.userDoc = doc;

    if (doc?.name) {
      if (els.userAvatar) els.userAvatar.textContent = initials(doc.name);
      if (els.userNameTop) els.userNameTop.textContent = firstName(doc.name);
    }
  } catch (e) {
    log.warn("Could not load user doc:", e);
  }

  return true;
}

/* =========================================================
   TAP BADGE
   ========================================================= */

function updateTrayBadge() {
  if (!els.trayBadge) return;
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  els.trayBadge.textContent = isTouch ? "Tap 6× to open" : "Ctrl+Shift+Alt+N";
}

/* =========================================================
   LOAD NOTES
   ========================================================= */

async function loadNotes() {
  const curriculum = state.userDoc?.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc?.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");

  try {
    state.notes = await fetchNotes(curriculum, level);
  } catch (e) {
    log.warn("Could not load notes:", e);
    state.notes = [];
  }

  applyFilters();
}

/* =========================================================
   FILTERS
   ========================================================= */

function applyFilters() {
  state.filtered = filterNotes(state.notes, {
    subject: state.activeSubject,
    query: state.query,
  });
  renderNotes();
}

/* =========================================================
   FILTER BAR
   ========================================================= */

function renderFilterBar() {
  if (!els.subjectFilterBar) return;

  const curriculum = state.userDoc?.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc?.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");

  // Preferred: user's selected subjects
  let subjects = state.userDoc?.subjects || [];

  // Fallback: all subjects for their level
  if (!subjects.length) subjects = getSubjects(curriculum, level);

  // Additional: subjects that actually have notes
  const noteSubjects = extractSubjects(state.notes);
  const combined = Array.from(new Set([...subjects, ...noteSubjects]));

  const html = `
    <button class="chip${state.activeSubject === "all" ? " active" : ""}" data-subject="all" type="button">
      All Subjects
    </button>
    ${combined
      .map(
        (s) => `
      <button class="chip${state.activeSubject === s ? " active" : ""}" data-subject="${escapeHTML(s)}" type="button">
        ${escapeHTML(s)}
      </button>
    `,
      )
      .join("")}
  `;

  els.subjectFilterBar.innerHTML = html;

  els.subjectFilterBar.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.activeSubject = chip.dataset.subject;
      renderFilterBar();
      applyFilters();
    });
  });
}

/* =========================================================
   RENDER NOTES
   ========================================================= */

function renderNotes() {
  if (!els.notesList) return;

  if (!state.filtered.length) {
    const hasAnyNotes = state.notes.length > 0;
    els.notesList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📖</div>
        <div class="empty-title">${hasAnyNotes ? "No notes match your filter" : "No notes here yet"}</div>
        <div class="empty-sub">
          ${
            hasAnyNotes
              ? "Try clearing the search or choosing a different subject."
              : `On desktop press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>N</kbd> · On mobile tap this page 6 times`
          }
        </div>
      </div>
    `;
    return;
  }

  els.notesList.innerHTML = state.filtered
    .map((note) => renderNoteCard(note))
    .join("");

  els.notesList.querySelectorAll("[data-note-delete]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteNote(btn.dataset.noteDelete);
    });
  });
}

function renderNoteCard(note) {
  const color = getSubjectColor(note.subject);
  const icon = getSubjectIcon(note.subject);
  const canDelete = note.source !== "static";

  const keyPointsHtml =
    Array.isArray(note.keyPoints) && note.keyPoints.length
      ? `<ul class="note-keypoints">${note.keyPoints.map((k) => `<li>${escapeHTML(k)}</li>`).join("")}</ul>`
      : "";

  const quizUrl = `quiz.html?subject=${encodeURIComponent(note.subject || "")}`;

  return `
    <article class="note-card-v2" data-note-id="${note.id || ""}">
      <header class="note-v2-head">
        <div class="note-v2-icon" style="background: ${color}22; color: ${color};">${icon}</div>
        <div class="note-v2-meta">
          <div class="note-v2-subject">${escapeHTML(note.subject || "General")}</div>
          <div class="note-v2-topic">${escapeHTML(note.topic || "Untitled")}</div>
        </div>
        ${canDelete ? `<button class="note-v2-remove" type="button" data-note-delete="${note.id}" title="Delete" aria-label="Delete note">×</button>` : ""}
      </header>
      ${note.summary ? `<p class="note-v2-summary">${escapeHTML(note.summary)}</p>` : ""}
      ${keyPointsHtml}
      <div class="note-v2-actions">
        <a class="note-v2-link" href="${quizUrl}">
          Test yourself
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M5 12 H19 M13 6 L19 12 L13 18"/>
          </svg>
        </a>
      </div>
    </article>
  `;
}

/* =========================================================
   DELETE NOTE
   ========================================================= */

async function handleDeleteNote(id) {
  if (!id) return;

  const ok = await confirmDialog({
    title: "Delete note?",
    message: "This note will be removed from your device.",
    okLabel: "Delete",
    cancelLabel: "Cancel",
    danger: true,
  });

  if (!ok) return;

  try {
    const success = await deleteNote(id);
    if (success) {
      toastOk("Note deleted");
      state.notes = state.notes.filter((n) => n.id !== id);
      applyFilters();
      renderFilterBar();
    } else {
      toastErr("Could not delete note");
    }
  } catch (e) {
    log.warn("Delete failed:", e);
    toastErr("Could not delete note");
  }
}

/* =========================================================
   TRAY
   ========================================================= */

function openTray() {
  if (!els.tray || !els.trayBackdrop) return;

  // Populate subject dropdown
  populateSubjectDropdown();

  els.trayBackdrop.classList.add("open");
  els.tray.classList.add("open");
  els.tray.setAttribute("aria-hidden", "false");

  // Clear fields
  if (els.noteTopic) els.noteTopic.value = "";
  if (els.noteSummary) els.noteSummary.value = "";
  if (els.noteKeyPoints) els.noteKeyPoints.value = "";
  clearTrayError();

  setTimeout(() => els.noteTopic?.focus(), 300);
}

function closeTray() {
  if (!els.tray || !els.trayBackdrop) return;
  els.tray.classList.remove("open");
  els.trayBackdrop.classList.remove("open");
  els.tray.setAttribute("aria-hidden", "true");
}

function populateSubjectDropdown() {
  if (!els.noteSubject) return;

  const curriculum = state.userDoc?.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc?.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");

  let subjects = state.userDoc?.subjects || [];
  if (!subjects.length) subjects = getSubjects(curriculum, level);

  els.noteSubject.innerHTML =
    `<option value="">Select subject</option>` +
    subjects
      .map((s) => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`)
      .join("");
}

/* =========================================================
   TRAY ERROR
   ========================================================= */

function showTrayError(msg) {
  if (!els.trayError) return;
  els.trayError.textContent = msg;
  els.trayError.classList.remove("hidden");
}

function clearTrayError() {
  if (!els.trayError) return;
  els.trayError.classList.add("hidden");
  els.trayError.textContent = "";
}

/* =========================================================
   SAVE NOTE
   ========================================================= */

async function saveNote() {
  clearTrayError();

  const subject = els.noteSubject?.value || "";
  const topic = (els.noteTopic?.value || "").trim();
  const summary = (els.noteSummary?.value || "").trim();
  const keyPoints = (els.noteKeyPoints?.value || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!subject) return showTrayError("Please choose a subject.");
  if (!topic) return showTrayError("Please enter a topic.");

  if (els.traySaveBtn) {
    els.traySaveBtn.disabled = true;
    els.traySaveBtn.textContent = "Saving…";
  }

  try {
    const note = await createNote({
      subject,
      topic,
      summary,
      keyPoints,
      curriculum: state.userDoc?.curriculum || "844",
      level: state.userDoc?.level || "",
      createdBy: state.user?.uid || "",
      createdByName: state.userDoc?.name || "",
    });

    // Add to local state
    state.notes.unshift({ ...note, source: "user" });

    toastOk("✓ Note saved");
    closeTray();
    applyFilters();
    renderFilterBar();
  } catch (e) {
    log.error("Save note failed:", e);
    showTrayError(e.message || "Could not save. Try again.");
  } finally {
    if (els.traySaveBtn) {
      els.traySaveBtn.disabled = false;
      els.traySaveBtn.textContent = "Save Note →";
    }
  }
}

/* =========================================================
   USER MENU
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message: `Signed in as ${state.user?.email || "Student"}.\n\nDo you want to sign out?`,
    okLabel: "Sign Out",
    cancelLabel: "Stay",
    danger: true,
  });

  if (ok) {
    try {
      await signOutNow();
      window.location.replace("login.html");
    } catch (e) {
      log.error("Sign out failed:", e);
      toastErr("Could not sign out.");
    }
  }
}

/* =========================================================
   SEARCH
   ========================================================= */

const debouncedSearch = debounce((value) => {
  state.query = value;
  applyFilters();
}, 200);

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();
    updateTrayBadge();

    // Wire search
    els.searchInput?.addEventListener("input", (e) => {
      debouncedSearch(e.target.value.trim());
    });

    // Wire tray controls
    els.trayCloseBtn?.addEventListener("click", closeTray);
    els.trayCancelBtn?.addEventListener("click", closeTray);
    els.trayBackdrop?.addEventListener("click", closeTray);
    els.traySaveBtn?.addEventListener("click", saveNote);

    // Keyboard shortcut
    bindShortcut("ctrl+shift+alt+n", () => {
      if (els.tray.classList.contains("open")) closeTray();
      else openTray();
    });

    // Mobile tap shortcut — 6 taps
    installTapShortcuts({
      6: () => {
        if (!els.tray.classList.contains("open")) openTray();
      },
    });

    // Escape closes tray
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.tray.classList.contains("open"))
        closeTray();
    });

    // User menu
    els.userMenuBtn?.addEventListener("click", handleUserMenu);

    // Load notes
    await loadNotes();
    renderFilterBar();

    log.info(`Notes ready: ${state.notes.length} notes`);
  } catch (e) {
    log.error("Notes init failed:", e);
    toastErr("Could not load notes. Please refresh.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
