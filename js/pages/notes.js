// js/pages/notes.js
// Notes page controller — reads notes AND files, both from Firestore.
// Students see a read-only view. Admins add content via admin.html.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import { fetchNotes, filterNotes, extractSubjects } from "../features/notes.js";
import { fetchFiles, getFileTypeMeta } from "../features/files.js";
import {
  getSubjects,
  getSubjectIcon,
  getSubjectColor,
} from "../data/subjects.js";
import { initNav } from "../ui/nav.js";
import { toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import {
  escapeHTML,
  firstName,
  initials,
  log,
  debounce,
} from "../core/utils.js";

const state = {
  user: null,
  userDoc: null,
  notes: [],
  files: [],
  filteredNotes: [],
  filteredFiles: [],
  activeSubject: "all",
  query: "",
};

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  notesList: document.getElementById("notesList"),
  notesCount: document.getElementById("notesCount"),
  filesGrid: document.getElementById("filesGrid"),
  filesCount: document.getElementById("filesCount"),
  subjectFilterBar: document.getElementById("subjectFilterBar"),
  searchInput: document.getElementById("notesSearch"),

  fileViewer: document.getElementById("fileViewer"),
  fileViewerTitle: document.getElementById("fileViewerTitle"),
  fileViewerBody: document.getElementById("fileViewerBody"),
  fileViewerClose: document.getElementById("fileViewerClose"),
  fileViewerDownload: document.getElementById("fileViewerDownload"),
};

/* =========================================================
   USER
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
   LOAD
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

async function loadFiles() {
  try {
    state.files = await fetchFiles({ limitCount: 200 });
  } catch (e) {
    log.warn("Could not load files:", e);
    state.files = [];
  }
  applyFilters();
}

/* =========================================================
   FILTERS
   ========================================================= */

function applyFilters() {
  // Filter notes
  state.filteredNotes = filterNotes(state.notes, {
    subject: state.activeSubject,
    query: state.query,
  });

  // Filter files
  const q = (state.query || "").toLowerCase();
  state.filteredFiles = state.files.filter(function (f) {
    if (state.activeSubject !== "all" && f.subject !== state.activeSubject)
      return false;
    if (q) {
      const hay = (
        (f.title || "") +
        " " +
        (f.subject || "") +
        " " +
        (f.level || "") +
        " " +
        (f.createdByName || "")
      ).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  renderFiles();
  renderNotes();
  updateCounts();
}

function updateCounts() {
  if (els.filesCount) {
    els.filesCount.textContent =
      state.filteredFiles.length +
      " file" +
      (state.filteredFiles.length === 1 ? "" : "s");
  }
  if (els.notesCount) {
    els.notesCount.textContent =
      state.filteredNotes.length +
      " note" +
      (state.filteredNotes.length === 1 ? "" : "s");
  }
}

/* =========================================================
   SUBJECT FILTER BAR
   ========================================================= */

function renderFilterBar() {
  if (!els.subjectFilterBar) return;

  const curriculum = state.userDoc?.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc?.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");

  let subjects = state.userDoc?.subjects || [];
  if (!subjects.length) subjects = getSubjects(curriculum, level);

  const noteSubjects = extractSubjects(state.notes);
  const fileSubjects = state.files
    .map(function (f) {
      return f.subject;
    })
    .filter(Boolean);
  const combined = Array.from(
    new Set([].concat(subjects, noteSubjects, fileSubjects)),
  );

  const html =
    '<button class="chip' +
    (state.activeSubject === "all" ? " active" : "") +
    '" data-subject="all" type="button">All Subjects</button>' +
    combined
      .map(function (s) {
        return (
          '<button class="chip' +
          (state.activeSubject === s ? " active" : "") +
          '" data-subject="' +
          escapeHTML(s) +
          '" type="button">' +
          escapeHTML(s) +
          "</button>"
        );
      })
      .join("");

  els.subjectFilterBar.innerHTML = html;

  els.subjectFilterBar.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      state.activeSubject = chip.dataset.subject;
      renderFilterBar();
      applyFilters();
    });
  });
}

/* =========================================================
   RENDER FILES
   ========================================================= */

function renderFiles() {
  if (!els.filesGrid) return;

  if (!state.filteredFiles.length) {
    const hasAny = state.files.length > 0;
    els.filesGrid.innerHTML =
      '<div class="empty-state" style="grid-column: 1 / -1;">' +
      '<div class="empty-icon">📁</div>' +
      '<div class="empty-title">' +
      (hasAny ? "No files match your filter" : "No files yet") +
      "</div>" +
      '<div class="empty-sub">' +
      (hasAny
        ? "Try a different subject or clear the search."
        : "Files added by admins will appear here.") +
      "</div>" +
      "</div>";
    return;
  }

  els.filesGrid.innerHTML = state.filteredFiles.map(renderFileCard).join("");

  els.filesGrid.querySelectorAll("[data-file-open]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openFileViewer(btn.dataset.fileOpen);
    });
  });
}

function renderFileCard(file) {
  const meta = getFileTypeMeta(file.type);
  const color = getSubjectColor(file.subject);
  return (
    '<button class="file-card" type="button" data-file-open="' +
    escapeHTML(file.id) +
    '" style="--accent: ' +
    meta.color +
    ';">' +
    '<div class="file-card-top">' +
    '<div class="file-card-icon" style="background: ' +
    meta.color +
    "22; color: " +
    meta.color +
    ';">' +
    meta.icon +
    "</div>" +
    '<div class="file-card-type" style="color: ' +
    meta.color +
    ';">' +
    escapeHTML(meta.label) +
    "</div>" +
    "</div>" +
    '<div class="file-card-title">' +
    escapeHTML(file.title || "Untitled") +
    "</div>" +
    '<div class="file-card-meta">' +
    '<span class="file-card-subject" style="background: ' +
    color +
    "22; color: " +
    color +
    ';">' +
    escapeHTML(file.subject || "General") +
    "</span>" +
    (file.level
      ? '<span class="file-card-level">' + escapeHTML(file.level) + "</span>"
      : "") +
    "</div>" +
    '<div class="file-card-action">Preview →</div>' +
    "</button>"
  );
}

/* =========================================================
   RENDER NOTES
   ========================================================= */

function renderNotes() {
  if (!els.notesList) return;

  if (!state.filteredNotes.length) {
    const hasAny = state.notes.length > 0;
    els.notesList.innerHTML =
      '<div class="empty-state" style="grid-column: 1 / -1;">' +
      '<div class="empty-icon">📖</div>' +
      '<div class="empty-title">' +
      (hasAny ? "No notes match your filter" : "No notes yet") +
      "</div>" +
      '<div class="empty-sub">' +
      (hasAny
        ? "Try a different subject or clear the search."
        : "Notes added by admins will appear here.") +
      "</div>" +
      "</div>";
    return;
  }

  els.notesList.innerHTML = state.filteredNotes.map(renderNoteCard).join("");
}

function renderNoteCard(note) {
  const color = getSubjectColor(note.subject);
  const icon = getSubjectIcon(note.subject);

  const keyPointsHtml =
    Array.isArray(note.keyPoints) && note.keyPoints.length
      ? '<ul class="note-keypoints">' +
        note.keyPoints
          .slice(0, 5)
          .map(function (k) {
            return "<li>" + escapeHTML(k) + "</li>";
          })
          .join("") +
        "</ul>"
      : "";

  const quizUrl = "quiz.html?subject=" + encodeURIComponent(note.subject || "");

  return (
    '<article class="note-card-v2">' +
    '<header class="note-v2-head">' +
    '<div class="note-v2-icon" style="background: ' +
    color +
    "22; color: " +
    color +
    ';">' +
    icon +
    "</div>" +
    '<div class="note-v2-meta">' +
    '<div class="note-v2-subject">' +
    escapeHTML(note.subject || "General") +
    "</div>" +
    '<div class="note-v2-topic">' +
    escapeHTML(note.topic || "Untitled") +
    "</div>" +
    "</div>" +
    "</header>" +
    (note.summary
      ? '<p class="note-v2-summary">' + escapeHTML(note.summary) + "</p>"
      : "") +
    keyPointsHtml +
    '<div class="note-v2-actions">' +
    '<a class="note-v2-link" href="' +
    quizUrl +
    '">' +
    "Test yourself" +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12 H19 M13 6 L19 12 L13 18"/></svg>' +
    "</a>" +
    "</div>" +
    "</article>"
  );
}

/* =========================================================
   FILE VIEWER (Drive embed)
   ========================================================= */

function openFileViewer(fileId) {
  const file = state.files.find(function (f) {
    return f.id === fileId;
  });
  if (!file) return;

  if (els.fileViewerTitle)
    els.fileViewerTitle.textContent = file.title || "File";

  if (els.fileViewerDownload) {
    els.fileViewerDownload.href = file.openUrl || file.driveUrl || "#";
  }

  const previewUrl =
    file.previewUrl ||
    (file.fileId
      ? "https://drive.google.com/file/d/" + file.fileId + "/preview"
      : null);

  if (!previewUrl) {
    if (els.fileViewerBody) {
      els.fileViewerBody.innerHTML =
        '<div class="alert alert-warn">This file cannot be previewed. <a href="' +
        escapeHTML(file.openUrl || "#") +
        '" target="_blank" rel="noopener">Open in Drive</a></div>';
    }
  } else {
    if (els.fileViewerBody) {
      els.fileViewerBody.innerHTML =
        '<iframe src="' +
        escapeHTML(previewUrl) +
        '" ' +
        'style="width:100%;height:75vh;border:1px solid var(--border);border-radius:var(--radius);background:#fff;" ' +
        'allow="autoplay" allowfullscreen></iframe>';
    }
  }

  if (els.fileViewer) els.fileViewer.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeFileViewer() {
  if (els.fileViewer) els.fileViewer.classList.add("hidden");
  if (els.fileViewerBody) els.fileViewerBody.innerHTML = "";
  document.body.style.overflow = "";
}

/* =========================================================
   USER MENU
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message:
      "Signed in as " +
      (state.user?.email || "Student") +
      ".\n\nDo you want to sign out?",
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

const debouncedSearch = debounce(function (value) {
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

    // Search
    if (els.searchInput) {
      els.searchInput.addEventListener("input", function (e) {
        debouncedSearch(e.target.value.trim());
      });
    }

    // User menu
    if (els.userMenuBtn)
      els.userMenuBtn.addEventListener("click", handleUserMenu);

    // File viewer close
    if (els.fileViewerClose)
      els.fileViewerClose.addEventListener("click", closeFileViewer);
    if (els.fileViewer) {
      els.fileViewer.addEventListener("click", function (e) {
        if (e.target === els.fileViewer) closeFileViewer();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (
        e.key === "Escape" &&
        els.fileViewer &&
        !els.fileViewer.classList.contains("hidden")
      ) {
        closeFileViewer();
      }
    });

    // Load both, in parallel
    await Promise.all([loadNotes(), loadFiles()]);
    renderFilterBar();
    updateCounts();

    log.info(
      "Notes page ready: " +
        state.notes.length +
        " notes, " +
        state.files.length +
        " files",
    );
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
