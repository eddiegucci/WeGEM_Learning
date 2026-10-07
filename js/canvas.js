// js/canvas.js — WeGEM Learning paginated canvas
// Handles both Notes and Exams modes.

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  isAdmin,
  isAdminEmail,
  saveCanvas,
  getCanvas,
  listCanvases,
  deleteCanvas,
} from "./firebase.js";
import { SUBJECTS_BY_CURRICULUM } from "./data.js";

/* =========================================================
   GUARD
   ========================================================= */

const user = getCurrentUser();
if (!user) {
  window.location.href = "login.html";
}

/* =========================================================
   PARSE URL PARAMS
   ========================================================= */

const params = new URLSearchParams(window.location.search);
const MODE = params.get("mode") === "exams" ? "exams" : "notes"; // 'notes' | 'exams'
const URL_CURRICULUM = params.get("curriculum") || null;
const URL_LEVEL = params.get("level") || null;
const URL_SUBJECT = params.get("subject") || null;
const URL_ID = params.get("id") || null;
const IS_NEW = params.get("new") === "1";
const WANT_EDIT = params.get("edit") === "1";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  mode: MODE,
  curriculum: URL_CURRICULUM || getDefaultCurriculum(),
  level: URL_LEVEL || getDefaultLevel(),
  subject: URL_SUBJECT || null,
  id: URL_ID || null,
  title: "",
  pages: [""], // array of HTML strings (one per page)
  currentPage: 0,
  isEditMode: false, // true while editing
  isAdmin: isAdminEmail(user.email),
  savedAt: null,
  dirty: false,
};

/* =========================================================
   ELEMENTS
   ========================================================= */

const backBtn = document.getElementById("backBtn");
const modeLabel = document.getElementById("modeLabel");
const titleInput = document.getElementById("titleInput");
const pagesContainer = document.getElementById("pagesContainer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageCurrent = document.getElementById("pageCurrent");
const pageTotal = document.getElementById("pageTotal");
const saveBtn = document.getElementById("saveBtn");
const addPageBtn = document.getElementById("addPageBtn");
const editToggleBtn = document.getElementById("editToggleBtn");
const editToggleText = document.getElementById("editToggleText");
const cancelBtn = document.getElementById("cancelBtn");
const statusBadge = document.getElementById("statusBadge");
const wordCount = document.getElementById("wordCount");
const savedAt = document.getElementById("savedAt");

const passwordModal = document.getElementById("passwordModal");
const pwInput = document.getElementById("pwInput");
const pwError = document.getElementById("pwError");
const pwCloseBtn = document.getElementById("pwCloseBtn");
const pwCancelBtn = document.getElementById("pwCancelBtn");
const pwSubmitBtn = document.getElementById("pwSubmitBtn");

const titleModal = document.getElementById("titleModal");
const titleError = document.getElementById("titleError");
const titleCloseBtn = document.getElementById("titleCloseBtn");
const titleCancelBtn = document.getElementById("titleCancelBtn");
const titleCreateBtn = document.getElementById("titleCreateBtn");
const newTitleInput = document.getElementById("newTitleInput");
const newSubjectSelect = document.getElementById("newSubjectSelect");

const toast = document.getElementById("toast");

/* =========================================================
   DEFAULTS
   ========================================================= */

function getDefaultCurriculum() {
  return user.curriculum === "CBE" ? "CBE" : "844";
}

function getDefaultLevel() {
  return user.level || user.form || user.grade || "";
}

function getSubjectsForCurriculum() {
  const byLevel = SUBJECTS_BY_CURRICULUM[state.curriculum] || {};
  return byLevel[state.level] || [];
}

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
   RENDER — PAGES
   ========================================================= */

function renderPages() {
  pagesContainer.innerHTML = "";

  state.pages.forEach((html, i) => {
    const pageEl = document.createElement("div");
    pageEl.className = "canvas-page";
    pageEl.dataset.page = i;

    const numEl = document.createElement("div");
    numEl.className = "canvas-page-number";
    numEl.textContent = i + 1;

    const contentEl = document.createElement("div");
    contentEl.className = "canvas-page-content";
    contentEl.dataset.pageContent = i;
    contentEl.innerHTML = html || "";

    // In edit mode: make it editable
    if (state.isEditMode) {
      contentEl.setAttribute("contenteditable", "true");
      contentEl.classList.add("editing");

      // Auto-flow: when this page overflows, spill into the next page
      contentEl.addEventListener("input", () => {
        state.dirty = true;
        updateWordCount();
        handleOverflow(i);
      });

      // Paste as plain text to keep things clean
      contentEl.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData(
          "text/plain",
        );
        document.execCommand("insertText", false, text);
      });
    }

    pageEl.appendChild(numEl);
    pageEl.appendChild(contentEl);
    pagesContainer.appendChild(pageEl);
  });

  // Update counter
  pageCurrent.textContent = state.currentPage + 1;
  pageTotal.textContent = state.pages.length;
}

/* =========================================================
   AUTO-FLOW — spill content into the next page
   ========================================================= */

function handleOverflow(pageIndex) {
  const contentEls = pagesContainer.querySelectorAll(".canvas-page-content");
  const currentEl = contentEls[pageIndex];
  if (!currentEl) return;

  // Check if content height exceeds the page height
  const maxHeight = currentEl.clientHeight;
  if (currentEl.scrollHeight <= maxHeight + 4) {
    // No overflow — update stored HTML
    state.pages[pageIndex] = currentEl.innerHTML;
    return;
  }

  // Overflow detected — split content
  const nodes = Array.from(currentEl.childNodes);
  const overflowNodes = [];
  let removed = false;

  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    currentEl.removeChild(node);

    if (currentEl.scrollHeight <= maxHeight) {
      // Still fits — put it back
      currentEl.appendChild(node);
      // Everything after this node overflows
      for (let j = i + 1; j < nodes.length; j++) {
        // Already removed - handled below
      }
      break;
    }

    overflowNodes.unshift(node);
    removed = true;
  }

  if (!removed) {
    state.pages[pageIndex] = currentEl.innerHTML;
    return;
  }

  // Save what remains on this page
  state.pages[pageIndex] = currentEl.innerHTML;

  // Create the next page if needed
  if (pageIndex + 1 >= state.pages.length) {
    state.pages.push("");
  }

  // Prepend the overflow nodes to the next page's stored HTML
  const overflowHtml = overflowNodes
    .map((n) =>
      n.outerHTML !== undefined ? n.outerHTML : escapeHtml(n.textContent || ""),
    )
    .join("");

  state.pages[pageIndex + 1] =
    overflowHtml + (state.pages[pageIndex + 1] || "");

  // Re-render so the next page shows the overflow
  // (Preserve cursor focus on the current page)
  const focusIndex = pageIndex;
  renderPages();

  // Restore focus to the end of the current page
  const newEls = pagesContainer.querySelectorAll(".canvas-page-content");
  const targetEl = newEls[focusIndex];
  if (targetEl && state.isEditMode) {
    targetEl.focus();
    // Move caret to end
    const range = document.createRange();
    range.selectNodeContents(targetEl);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

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

/* =========================================================
   WORD COUNT
   ========================================================= */

function updateWordCount() {
  const text = state.pages.join(" ").replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  wordCount.textContent = words + (words === 1 ? " word" : " words");
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function goToPage(n) {
  if (n < 0 || n >= state.pages.length) return;
  state.currentPage = n;
  pageCurrent.textContent = n + 1;

  // Scroll the page into view
  const pageEl = pagesContainer.querySelector(`.canvas-page[data-page="${n}"]`);
  if (pageEl) {
    pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

prevBtn.addEventListener("click", () => goToPage(state.currentPage - 1));
nextBtn.addEventListener("click", () => goToPage(state.currentPage + 1));

/* =========================================================
   TOPBAR — MODE LABEL
   ========================================================= */

function updateModeUI() {
  modeLabel.textContent =
    state.mode === "exams" ? "Exam Document" : "Study Notes";

  if (!state.isAdmin) {
    editToggleBtn.classList.add("hidden");
  }

  updateStatusBadge();
}

function updateStatusBadge() {
  if (state.isEditMode) {
    statusBadge.textContent = "✏️ Editing";
    statusBadge.className = "canvas-status canvas-status-editing";
  } else {
    statusBadge.textContent = "🔒 Read-only";
    statusBadge.className = "canvas-status canvas-status-readonly";
  }
}

/* =========================================================
   TITLE
   ========================================================= */

titleInput.addEventListener("input", () => {
  if (!state.isEditMode) return;
  state.title = titleInput.value;
  state.dirty = true;
});

/* =========================================================
   BACK
   ========================================================= */

backBtn.addEventListener("click", () => {
  if (
    state.dirty &&
    !confirm("You have unsaved changes. Leave without saving?")
  ) {
    return;
  }
  const backUrl = state.mode === "exams" ? "exams.html" : "notes.html";
  window.location.href = backUrl;
});

/* =========================================================
   PASSWORD MODAL — request admin password before editing
   ========================================================= */

function openPasswordModal() {
  passwordModal.classList.remove("hidden");
  pwInput.value = "";
  pwError.classList.add("hidden");
  setTimeout(() => pwInput.focus(), 100);
}

function closePasswordModal() {
  passwordModal.classList.add("hidden");
}

pwCloseBtn?.addEventListener("click", closePasswordModal);
pwCancelBtn?.addEventListener("click", closePasswordModal);
passwordModal?.addEventListener("click", (e) => {
  if (e.target === passwordModal) closePasswordModal();
});

pwSubmitBtn?.addEventListener("click", () => {
  const pw = pwInput.value;
  if (isAdmin(user.email, pw)) {
    closePasswordModal();
    enterEditMode();
    showToast("✓ Unlocked — you can edit now", "ok");
  } else {
    pwError.textContent = "Incorrect password.";
    pwError.classList.remove("hidden");
  }
});

pwInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") pwSubmitBtn.click();
});

/* =========================================================
   ENTER / EXIT EDIT MODE
   ========================================================= */

function enterEditMode() {
  state.isEditMode = true;

  // Show save/add/cancel, hide edit toggle, make title editable
  saveBtn.classList.remove("hidden");
  addPageBtn.classList.remove("hidden");
  cancelBtn.classList.remove("hidden");
  editToggleBtn.classList.add("hidden");
  titleInput.removeAttribute("readonly");

  updateStatusBadge();
  renderPages();
}

function exitEditMode() {
  state.isEditMode = false;

  // Reverse visibility
  saveBtn.classList.add("hidden");
  addPageBtn.classList.add("hidden");
  cancelBtn.classList.add("hidden");
  editToggleBtn.classList.remove("hidden");
  editToggleText.textContent = "Edit";
  titleInput.setAttribute("readonly", "true");

  updateStatusBadge();
  renderPages();
  updateWordCount();
}

editToggleBtn?.addEventListener("click", () => {
  if (!state.isAdmin) {
    showToast("Only admin can edit", "err");
    return;
  }
  openPasswordModal();
});

cancelBtn?.addEventListener("click", () => {
  if (state.dirty && !confirm("Discard unsaved changes?")) return;
  // Reload the original canvas
  if (state.id) {
    window.location.reload();
  } else {
    window.location.href = state.mode === "exams" ? "exams.html" : "notes.html";
  }
});

/* =========================================================
   ADD PAGE (manual)
   ========================================================= */

addPageBtn?.addEventListener("click", () => {
  state.pages.push("");
  state.dirty = true;
  renderPages();
  goToPage(state.pages.length - 1);
});

/* =========================================================
   SAVE
   ========================================================= */

saveBtn?.addEventListener("click", async () => {
  // Pull latest HTML from the DOM
  const contentEls = pagesContainer.querySelectorAll(".canvas-page-content");
  state.pages = Array.from(contentEls).map((el) => el.innerHTML);

  if (!state.title.trim()) {
    showToast("Please add a title first", "err");
    titleInput.focus();
    return;
  }

  if (!state.subject) {
    showToast("Please pick a subject", "err");
    return;
  }

  saveBtn.disabled = true;
  const originalText = saveBtn.innerHTML;
  saveBtn.textContent = "Saving…";

  try {
    const canvasId = await saveCanvas({
      id: state.id,
      mode: state.mode,
      curriculum: state.curriculum,
      level: state.level,
      subject: state.subject,
      title: state.title.trim(),
      pages: state.pages,
      createdBy: user.userId || "anon",
      createdByName: user.name || "Anonymous",
    });

    state.id = canvasId;
    state.dirty = false;
    state.savedAt = new Date();
    savedAt.textContent = "Saved " + state.savedAt.toLocaleTimeString();

    showToast("✓ Canvas saved", "ok");

    // Update URL to include the ID so future loads work
    const newUrl = `canvas.html?mode=${state.mode}&curriculum=${encodeURIComponent(state.curriculum)}&level=${encodeURIComponent(state.level)}&subject=${encodeURIComponent(state.subject)}&id=${encodeURIComponent(canvasId)}`;
    window.history.replaceState({}, "", newUrl);
  } catch (e) {
    console.error(e);
    showToast("Could not save. Try again.", "err");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
});

/* =========================================================
   TITLE MODAL — for new canvas
   ========================================================= */

function openTitleModal() {
  titleModal.classList.remove("hidden");
  titleError.classList.add("hidden");
  newTitleInput.value = "";

  // Populate subjects
  const subjects = getSubjectsForCurriculum();
  newSubjectSelect.innerHTML =
    '<option value="">Select subject</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");

  // Preselect if we have a URL subject
  if (state.subject) newSubjectSelect.value = state.subject;

  setTimeout(() => newTitleInput.focus(), 100);
}

function closeTitleModal() {
  titleModal.classList.add("hidden");
}

titleCloseBtn?.addEventListener("click", closeTitleModal);
titleCancelBtn?.addEventListener("click", () => {
  closeTitleModal();
  window.location.href = state.mode === "exams" ? "exams.html" : "notes.html";
});
titleModal?.addEventListener("click", (e) => {
  if (e.target === titleModal) closeTitleModal();
});

titleCreateBtn?.addEventListener("click", () => {
  const title = newTitleInput.value.trim();
  const subject = newSubjectSelect.value;

  if (!title) {
    titleError.textContent = "Please enter a title.";
    titleError.classList.remove("hidden");
    return;
  }
  if (!subject) {
    titleError.textContent = "Please pick a subject.";
    titleError.classList.remove("hidden");
    return;
  }

  state.title = title;
  state.subject = subject;
  state.dirty = true;

  titleInput.value = title;

  closeTitleModal();

  // Auto-enter edit mode (admin is already verified via edit URL param,
  // or we can prompt for password here)
  if (isAdminEmail(user.email)) {
    // Ask for password
    openPasswordModal();
  }
});

/* =========================================================
   LOAD EXISTING CANVAS
   ========================================================= */

async function loadExistingCanvas() {
  try {
    const canvas = await getCanvas(
      state.mode,
      state.curriculum,
      state.level,
      state.subject,
      state.id,
    );

    if (!canvas) {
      showToast("Canvas not found", "err");
      setTimeout(() => {
        window.location.href =
          state.mode === "exams" ? "exams.html" : "notes.html";
      }, 1200);
      return;
    }

    state.title = canvas.title || "Untitled";
    state.pages = canvas.pages && canvas.pages.length ? canvas.pages : [""];
    state.savedAt = new Date(canvas.updatedAt || canvas.createdAt);

    titleInput.value = state.title;
    savedAt.textContent = "Saved " + state.savedAt.toLocaleString();
  } catch (e) {
    console.error(e);
    showToast("Could not load canvas", "err");
  }
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  updateModeUI();

  if (IS_NEW) {
    // Fresh canvas — show title modal
    state.pages = [""];
    openTitleModal();

    // If edit param is also passed (Ctrl+Shift+Alt+E), open password first
    if (WANT_EDIT && isAdminEmail(user.email)) {
      openPasswordModal();
    }
  } else if (state.id && state.subject) {
    // Load existing canvas
    await loadExistingCanvas();

    // If edit param was passed, open password prompt
    if (WANT_EDIT && isAdminEmail(user.email)) {
      openPasswordModal();
    }
  } else {
    // No ID, no new flag — treat as new
    openTitleModal();
  }

  renderPages();
  updateWordCount();
}

init();

/* =========================================================
   WINDOW KEYBOARD SHORTCUTS (edit-mode helpers)
   ========================================================= */

document.addEventListener("keydown", (e) => {
  // Ctrl+S → save (when editing)
  if (
    e.ctrlKey &&
    !e.shiftKey &&
    !e.altKey &&
    (e.key === "s" || e.key === "S")
  ) {
    e.preventDefault();
    if (state.isEditMode) saveBtn.click();
    return;
  }

  // Escape → close modals
  if (e.key === "Escape") {
    if (!passwordModal.classList.contains("hidden")) {
      closePasswordModal();
    } else if (!titleModal.classList.contains("hidden")) {
      closeTitleModal();
    }
  }

  // Page navigation with arrow keys (view mode)
  if (!state.isEditMode && e.target === document.body) {
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      goToPage(state.currentPage + 1);
    }
    if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      goToPage(state.currentPage - 1);
    }
  }
});

/* =========================================================
   WARN BEFORE LEAVING WITH UNSAVED CHANGES
   ========================================================= */

window.addEventListener("beforeunload", (e) => {
  if (state.dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
