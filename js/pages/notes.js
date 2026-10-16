// js/pages/notes.js
// Notes page controller. Supports file uploads and attachments.

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
import { parseFile, buildNoteDraftFromParsed } from "../features/uploads.js";
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

const state = {
  user: null,
  userDoc: null,
  notes: [],
  filtered: [],
  activeSubject: "all",
  query: "",
};

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  notesList: document.getElementById("notesList"),
  subjectFilterBar: document.getElementById("subjectFilterBar"),
  searchInput: document.getElementById("notesSearch"),
  openAddBtn: document.getElementById("openAddBtn"),

  tray: document.getElementById("noteTray"),
  trayBackdrop: document.getElementById("noteTrayBackdrop"),
  trayCloseBtn: document.getElementById("noteTrayCloseBtn"),
  trayCancelBtn: document.getElementById("noteTrayCancelBtn"),
  traySaveBtn: document.getElementById("noteTraySaveBtn"),
  noteSubject: document.getElementById("noteSubject"),
  noteTopic: document.getElementById("noteTopic"),
  noteSummary: document.getElementById("noteSummary"),
  noteKeyPoints: document.getElementById("noteKeyPoints"),
  trayError: document.getElementById("noteTrayError"),

  noteUploadBtn: document.getElementById("noteUploadBtn"),
  noteFileInput: document.getElementById("noteFileInput"),
  noteChooseFileBtn: document.getElementById("noteChooseFileBtn"),
  noteUploadPreview: document.getElementById("noteUploadPreview"),
};

/* =========================================================
   UPLOAD STATE
   ========================================================= */

let pendingUpload = null;

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

function applyFilters() {
  state.filtered = filterNotes(state.notes, {
    subject: state.activeSubject,
    query: state.query,
  });
  renderNotes();
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
  const combined = Array.from(new Set([...subjects, ...noteSubjects]));

  const html = `
    <button class="chip${state.activeSubject === "all" ? " active" : ""}" data-subject="all" type="button">All Subjects</button>
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
    const hasAny = state.notes.length > 0;
    els.notesList.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📖</div>
        <div class="empty-title">${hasAny ? "No notes match your filter" : "No notes yet"}</div>
        <div class="empty-sub">${hasAny ? "Try clearing the search or choosing a different subject." : 'Tap "Add Note" to create your first study note, or press Ctrl+Shift+Alt+N to upload a file.'}</div>
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

  els.notesList.querySelectorAll("[data-attachment-open]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAttachmentViewer(btn.dataset.attachmentOpen);
    });
  });
}

function renderNoteCard(note) {
  const color = getSubjectColor(note.subject);
  const icon = getSubjectIcon(note.subject);
  const canDelete = note.source !== "static";

  const keyPointsHtml =
    Array.isArray(note.keyPoints) && note.keyPoints.length
      ? `<ul class="note-keypoints">${note.keyPoints
          .slice(0, 5)
          .map((k) => `<li>${escapeHTML(k)}</li>`)
          .join("")}</ul>`
      : "";

  const attachmentHtml =
    note.attachment && note.attachment.kind
      ? `
      <button class="note-v2-link" type="button" data-attachment-open="${note.id}" style="margin-top:var(--sp-2);background:none;border:none;cursor:pointer;color:var(--gold);font-weight:700;font-size:var(--text-sm);display:inline-flex;align-items:center;gap:var(--sp-2);">
        📎 ${escapeHTML(note.attachment.name || "Attachment")}
      </button>
    `
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
      ${attachmentHtml}
      <div class="note-v2-actions">
        <a class="note-v2-link" href="${quizUrl}">
          Test yourself
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12 H19 M13 6 L19 12 L13 18"/></svg>
        </a>
      </div>
    </article>
  `;
}

/* =========================================================
   ATTACHMENT VIEWER
   ========================================================= */

function openAttachmentViewer(noteId) {
  const note = state.notes.find((n) => n.id === noteId);
  if (!note || !note.attachment) return;

  const a = note.attachment;
  const overlay = document.createElement("div");
  overlay.className = "modal-backdrop";
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:5000;display:flex;align-items:center;justify-content:center;padding:var(--sp-5);overflow-y:auto;";

  let bodyHtml = "";

  if (a.kind === "image" && a.dataUrl) {
    bodyHtml = `<img src="${a.dataUrl}" alt="${escapeHTML(a.name)}" style="max-width:100%;max-height:80vh;border-radius:var(--radius);">`;
  } else if ((a.kind === "pdf" || a.kind === "docx") && a.text) {
    bodyHtml = `
      <div style="background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:var(--radius);padding:var(--sp-4);max-height:75vh;overflow-y:auto;width:100%;max-width:800px;">
        <pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-dim);line-height:1.6;margin:0;">${escapeHTML(a.text)}</pre>
      </div>
    `;
  } else if (a.kind === "xls" && a.sheets) {
    const first = a.sheets[0] || { name: "", rows: [] };
    const rows = first.rows || [];
    bodyHtml = `
      <div style="background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:var(--radius);padding:var(--sp-4);max-height:75vh;overflow:auto;width:100%;max-width:900px;">
        <div style="font-size:var(--text-xs);color:var(--text-mute);margin-bottom:var(--sp-3);">${a.sheets.length} sheet(s) · showing "${escapeHTML(first.name)}"</div>
        <table style="border-collapse:collapse;font-size:var(--text-xs);color:var(--text-dim);width:100%;">
          <tbody>
            ${rows.map((r) => `<tr>${(r || []).map((c) => `<td style="border:1px solid var(--border);padding:6px 10px;">${escapeHTML(String(c == null ? "" : c))}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else {
    bodyHtml = `<div class="alert alert-warn">This attachment type cannot be previewed.</div>`;
  }

  overlay.innerHTML = `
    <div style="width:100%;max-width:900px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3);">
        <div style="color:#fff;font-weight:800;font-size:var(--text-lg);">📎 ${escapeHTML(a.name || "Attachment")}</div>
        <button type="button" id="attachCloseBtn" class="modal-close" style="width:36px;height:36px;">×</button>
      </div>
      ${bodyHtml}
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const close = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.getElementById("attachCloseBtn")?.addEventListener("click", close);
  document.addEventListener("keydown", function onEsc(e) {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onEsc);
    }
  });
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

  populateSubjectDropdown();

  els.trayBackdrop.classList.add("open");
  els.tray.classList.add("open");
  els.tray.setAttribute("aria-hidden", "false");

  if (els.noteTopic) els.noteTopic.value = "";
  if (els.noteSummary) els.noteSummary.value = "";
  if (els.noteKeyPoints) els.noteKeyPoints.value = "";
  clearTrayError();

  pendingUpload = null;
  if (els.noteUploadPreview) {
    els.noteUploadPreview.classList.add("hidden");
    els.noteUploadPreview.innerHTML = "";
  }

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
   FILE UPLOAD
   ========================================================= */

function openFilePicker() {
  if (els.noteFileInput) els.noteFileInput.click();
}

async function handleFileChosen(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  clearTrayError();

  if (els.noteUploadPreview) {
    els.noteUploadPreview.classList.remove("hidden");
    els.noteUploadPreview.innerHTML =
      '<div class="loading-wrap"><div class="spinner"></div><p>Reading ' +
      escapeHTML(file.name) +
      "…</p></div>";
  }

  try {
    const parsed = await parseFile(file);
    pendingUpload = parsed;
    renderUploadPreview(parsed);

    const draft = buildNoteDraftFromParsed(parsed);
    if (els.noteTopic && !els.noteTopic.value)
      els.noteTopic.value = draft.topic || "";
    if (els.noteSummary && !els.noteSummary.value)
      els.noteSummary.value = draft.summary || "";
    if (els.noteKeyPoints && !els.noteKeyPoints.value) {
      els.noteKeyPoints.value = (draft.keyPoints || []).join("\n");
    }
  } catch (err) {
    log.warn("Upload parse failed:", err);
    if (els.noteUploadPreview) {
      els.noteUploadPreview.classList.add("hidden");
      els.noteUploadPreview.innerHTML = "";
    }
    showTrayError(err.message || "Could not read that file.");
    pendingUpload = null;
  } finally {
    if (els.noteFileInput) els.noteFileInput.value = "";
  }
}

function renderUploadPreview(parsed) {
  const container = els.noteUploadPreview;
  if (!container) return;
  container.classList.remove("hidden");

  const head =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3);">' +
    '<strong style="color:var(--gold);font-size:var(--text-sm);">📎 ' +
    escapeHTML(parsed.name) +
    "</strong>" +
    '<button type="button" id="noteUploadRemove" style="background:none;border:none;color:var(--danger-2);cursor:pointer;font-weight:700;font-size:var(--text-sm);">Remove</button>' +
    "</div>";

  let body = "";

  if (parsed.kind === "image") {
    body =
      '<img src="' +
      parsed.dataUrl +
      '" alt="' +
      escapeHTML(parsed.name) +
      '" style="max-width:100%;border-radius:var(--radius-sm);border:1px solid var(--border);">';
  } else if (parsed.kind === "pdf") {
    body =
      '<div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--sp-3);max-height:240px;overflow-y:auto;">' +
      '<div style="font-size:var(--text-xs);color:var(--text-mute);margin-bottom:var(--sp-2);">' +
      (parsed.pageCount || 0) +
      " pages</div>" +
      '<pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-dim);line-height:1.5;margin:0;">' +
      escapeHTML((parsed.text || "").slice(0, 1500)) +
      "</pre>" +
      "</div>";
  } else if (parsed.kind === "docx") {
    body =
      '<div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--sp-3);max-height:240px;overflow-y:auto;">' +
      '<pre style="white-space:pre-wrap;font-family:var(--font-sans);font-size:var(--text-sm);color:var(--text-dim);line-height:1.5;margin:0;">' +
      escapeHTML((parsed.text || "").slice(0, 1500)) +
      "</pre>" +
      "</div>";
  } else if (parsed.kind === "xls") {
    const sheets = parsed.sheets || [];
    const first = sheets[0] || { name: "", rows: [] };
    const rows = (first.rows || []).slice(0, 12);
    body =
      '<div style="background:rgba(0,0,0,0.3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--sp-3);max-height:240px;overflow:auto;">' +
      '<div style="font-size:var(--text-xs);color:var(--text-mute);margin-bottom:var(--sp-2);">' +
      sheets.length +
      ' sheet(s) — first 12 rows of "' +
      escapeHTML(first.name) +
      '"</div>' +
      '<table style="border-collapse:collapse;font-size:var(--text-xs);color:var(--text-dim);"><tbody>' +
      rows
        .map(function (r) {
          return (
            "<tr>" +
            (r || [])
              .map(function (c) {
                return (
                  '<td style="border:1px solid var(--border);padding:4px 8px;">' +
                  escapeHTML(String(c == null ? "" : c)) +
                  "</td>"
                );
              })
              .join("") +
            "</tr>"
          );
        })
        .join("") +
      "</tbody></table>" +
      "</div>";
  } else {
    body = '<div class="alert alert-warn">Unsupported file type.</div>';
  }

  container.innerHTML = head + body;

  const removeBtn = document.getElementById("noteUploadRemove");
  if (removeBtn) {
    removeBtn.addEventListener("click", function () {
      pendingUpload = null;
      container.classList.add("hidden");
      container.innerHTML = "";
    });
  }
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
      attachment: pendingUpload
        ? {
            kind: pendingUpload.kind,
            name: pendingUpload.name,
            size: pendingUpload.size,
            text: pendingUpload.text || null,
            dataUrl: pendingUpload.dataUrl || null,
            sheets: pendingUpload.sheets || null,
            pageCount: pendingUpload.pageCount || null,
          }
        : null,
    });

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
      els.traySaveBtn.textContent = "Save Note";
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

    els.searchInput?.addEventListener("input", (e) => {
      debouncedSearch(e.target.value.trim());
    });

    els.openAddBtn?.addEventListener("click", openTray);
    els.trayCloseBtn?.addEventListener("click", closeTray);
    els.trayCancelBtn?.addEventListener("click", closeTray);
    els.trayBackdrop?.addEventListener("click", closeTray);
    els.traySaveBtn?.addEventListener("click", saveNote);

    if (els.noteUploadBtn)
      els.noteUploadBtn.addEventListener("click", openFilePicker);
    if (els.noteChooseFileBtn)
      els.noteChooseFileBtn.addEventListener("click", openFilePicker);
    if (els.noteFileInput)
      els.noteFileInput.addEventListener("change", handleFileChosen);

    // Ctrl+Shift+Alt+N — opens tray and file picker
    bindShortcut("ctrl+shift+alt+n", function () {
      if (els.tray && els.tray.classList.contains("open")) {
        openFilePicker();
      } else {
        openTray();
        setTimeout(openFilePicker, 400);
      }
    });

    installTapShortcuts({
      6: () => {
        if (els.tray && !els.tray.classList.contains("open")) openTray();
      },
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.tray && els.tray.classList.contains("open"))
        closeTray();
    });

    els.userMenuBtn?.addEventListener("click", handleUserMenu);

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
