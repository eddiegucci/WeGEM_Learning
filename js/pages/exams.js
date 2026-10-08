// js/pages/exams.js
// Controller for exams.html.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc, getQuestionsForSubject } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
  cacheQuestions,
  getCachedQuestions,
} from "../core/cache.js";
import {
  fetchExamLinks,
  filterExamLinks,
  createExamLink,
  removeExamLink,
  getLinkMeta,
} from "../features/exams.js";
import {
  getSubjects,
  getSubjectIcon,
  EXAM_BY_LEVEL,
} from "../data/subjects.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import { bindShortcut, installTapShortcuts } from "../ui/shortcuts.js";
import {
  escapeHTML,
  firstName,
  initials,
  isValidURL,
  log,
  debounce,
  isOnline,
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  links: [],
  filtered: [],
  activeFilter: "all",
  query: "",
  subjectQuestionCounts: {}, // { "Mathematics": 12, ... }
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),

  searchInput: document.getElementById("examSearch"),
  examLinksGrid: document.getElementById("examLinksGrid"),
  subjectPapersGrid: document.getElementById("subjectPapersGrid"),
  paperCount: document.getElementById("paperCount"),

  // Tray
  tray: document.getElementById("linkTray"),
  trayBackdrop: document.getElementById("linkTrayBackdrop"),
  trayBadge: document.getElementById("trayBadge"),
  trayCloseBtn: document.getElementById("trayCloseBtn"),
  trayCancelBtn: document.getElementById("trayCancelBtn"),
  traySaveBtn: document.getElementById("traySaveBtn"),
  trayTitle: document.getElementById("trayTitle"),
  trayUrl: document.getElementById("trayUrl"),
  traySubject: document.getElementById("traySubject"),
  trayType: document.getElementById("trayType"),
  trayError: document.getElementById("trayError"),
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
   TRAY BADGE
   ========================================================= */

function updateTrayBadge() {
  if (!els.trayBadge) return;
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  els.trayBadge.textContent = isTouch ? "Tap 5× to open" : "Ctrl+Shift+Alt+V";
}

/* =========================================================
   LOAD LINKS
   ========================================================= */

async function loadLinks() {
  try {
    state.links = await fetchExamLinks();
  } catch (e) {
    log.warn("Could not load exam links:", e);
    state.links = [];
  }
  applyFilters();
}

/* =========================================================
   FILTERS
   ========================================================= */

function applyFilters() {
  state.filtered = filterExamLinks(state.links, {
    type: state.activeFilter,
    query: state.query,
  });
  renderLinks();
}

/* =========================================================
   RENDER LINKS
   ========================================================= */

function renderLinks() {
  if (!els.examLinksGrid) return;

  if (!state.filtered.length) {
    const hasLinks = state.links.length > 0;
    els.examLinksGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📄</div>
        <div class="empty-title">${hasLinks ? "No links match your filter" : "No exam resources yet"}</div>
        <div class="empty-sub">
          ${
            hasLinks
              ? "Try clearing the search or choosing a different type."
              : `On desktop press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd> · On mobile tap this page 5 times`
          }
        </div>
      </div>
    `;
    return;
  }

  els.examLinksGrid.innerHTML = state.filtered
    .map((link) => renderLinkButton(link))
    .join("");

  // Attach delete handlers
  els.examLinksGrid.querySelectorAll("[data-link-delete]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDeleteLink(btn.dataset.linkDelete);
    });
  });
}

function renderLinkButton(link) {
  const meta = getLinkMeta(link.type);
  const safeTitle = escapeHTML(link.title || "Untitled");
  const safeSubject = escapeHTML(link.subject || "");
  const safeUrl = escapeHTML(link.url || "#");

  return `
    <a class="exam-link-btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer"
       style="--accent: ${meta.color};" data-link-id="${link.id || ""}">
      <div class="elb-top">
        <div class="elb-icon">${meta.icon}</div>
        <button class="elb-remove" type="button" data-link-delete="${link.id}" title="Remove">×</button>
      </div>
      <div class="elb-title">${safeTitle}</div>
      <div class="elb-meta">
        <span class="elb-type">${meta.label}</span>
        <span class="elb-subject">${safeSubject}</span>
      </div>
      <div class="elb-open">
        Open
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <path d="M7 17 L17 7 M9 7 H17 V15"/>
        </svg>
      </div>
    </a>
  `;
}

/* =========================================================
   DELETE LINK
   ========================================================= */

async function handleDeleteLink(id) {
  if (!id) return;

  const ok = await confirmDialog({
    title: "Delete resource?",
    message: "This link will be removed for everyone.",
    okLabel: "Delete",
    cancelLabel: "Cancel",
    danger: true,
  });

  if (!ok) return;

  try {
    const success = await removeExamLink(id);
    if (success) {
      toastOk("Resource removed");
      state.links = state.links.filter((l) => l.id !== id);
      applyFilters();
    } else {
      toastErr("Could not remove resource");
    }
  } catch (e) {
    log.warn("Delete failed:", e);
    toastErr("Could not remove resource");
  }
}

/* =========================================================
   RENDER SUBJECT PAPERS
   ========================================================= */

async function loadSubjectQuestionCounts() {
  if (!state.userDoc) return;

  const curriculum = state.userDoc.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");
  const exam = EXAM_BY_LEVEL[curriculum]?.[level] || "KCSE";

  const subjects =
    state.userDoc.subjects && state.userDoc.subjects.length
      ? state.userDoc.subjects
      : getSubjects(curriculum, level);

  state.subjectQuestionCounts = {};
  const uniqueSubjects = Array.from(new Set(subjects));
  const examKey =
    exam === "KPSEA" ? "KPSEA" : exam === "KJSEA" ? "KJSEA" : "KCSE";

  // Try cache first
  await Promise.all(
    uniqueSubjects.map(async (subjectName) => {
      let count = 0;

      try {
        const cached = await getCachedQuestions(examKey, subjectName);
        count = cached.length;
      } catch {}

      // If empty, fetch from cloud
      if (!count && isOnline()) {
        try {
          const fresh = await getQuestionsForSubject(examKey, subjectName);
          if (fresh.length) {
            await cacheQuestions(fresh);
            count = fresh.length;
          }
        } catch {}
      }

      state.subjectQuestionCounts[subjectName] = count;
    }),
  );

  renderSubjectPapers(examKey, uniqueSubjects);
}

function renderSubjectPapers(examKey, subjects) {
  if (!els.subjectPapersGrid) return;

  if (!subjects.length) {
    els.subjectPapersGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">📚</div>
        <div class="empty-title">No subjects selected</div>
        <div class="empty-sub">Update your subjects in Settings to see practice options.</div>
      </div>
    `;
    if (els.paperCount) els.paperCount.textContent = "0 questions";
    return;
  }

  els.subjectPapersGrid.innerHTML = subjects
    .map((subjName) => {
      const count = state.subjectQuestionCounts[subjName] || 0;
      const icon = getSubjectIcon(subjName);
      const hasQuestions = count > 0;

      return `
      <a class="paper-card${hasQuestions ? "" : " is-empty"}" href="quiz.html?exam=${encodeURIComponent(examKey)}&subject=${encodeURIComponent(subjName)}">
        <div class="paper-icon">${icon}</div>
        <div class="paper-body">
          <div class="paper-name">${escapeHTML(subjName)}</div>
          <div class="paper-meta">
            ${
              hasQuestions
                ? `${count} ${count === 1 ? "question" : "questions"} available`
                : "Coming soon"
            }
          </div>
        </div>
        <div class="paper-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M9 6 L15 12 L9 18"/>
          </svg>
        </div>
      </a>
    `;
    })
    .join("");

  const totalQ = Object.values(state.subjectQuestionCounts).reduce(
    (s, n) => s + n,
    0,
  );
  if (els.paperCount) {
    els.paperCount.textContent = `${totalQ} ${totalQ === 1 ? "question" : "questions"}`;
  }
}

/* =========================================================
   TRAY
   ========================================================= */

function populateSubjectDropdown() {
  if (!els.traySubject) return;

  const curriculum = state.userDoc?.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc?.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");

  let subjects = state.userDoc?.subjects || [];
  if (!subjects.length) subjects = getSubjects(curriculum, level);

  els.traySubject.innerHTML =
    `<option value="">Select subject</option>` +
    subjects
      .map((s) => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`)
      .join("");
}

function openTray() {
  if (!els.tray || !els.trayBackdrop) return;

  populateSubjectDropdown();

  els.trayBackdrop.classList.add("open");
  els.tray.classList.add("open");
  els.tray.setAttribute("aria-hidden", "false");

  // Reset
  if (els.trayTitle) els.trayTitle.value = "";
  if (els.trayUrl) els.trayUrl.value = "";
  if (els.traySubject) els.traySubject.value = "";
  if (els.trayType) els.trayType.value = "papers";
  clearTrayError();

  setTimeout(() => els.trayTitle?.focus(), 300);
}

function closeTray() {
  if (!els.tray || !els.trayBackdrop) return;
  els.tray.classList.remove("open");
  els.trayBackdrop.classList.remove("open");
  els.tray.setAttribute("aria-hidden", "true");
}

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
   SAVE LINK
   ========================================================= */

async function saveLink() {
  clearTrayError();

  const title = (els.trayTitle?.value || "").trim();
  const url = (els.trayUrl?.value || "").trim();
  const subject = els.traySubject?.value || "";
  const type = els.trayType?.value || "papers";

  if (!title) return showTrayError("Please enter a title.");
  if (title.length < 2) return showTrayError("Title is too short.");
  if (!url) return showTrayError("Please paste a link.");
  if (!isValidURL(url))
    return showTrayError(
      "Please paste a valid URL starting with http:// or https://",
    );
  if (!subject) return showTrayError("Please choose a subject.");

  if (els.traySaveBtn) {
    els.traySaveBtn.disabled = true;
    els.traySaveBtn.textContent = "Saving…";
  }

  try {
    const link = await createExamLink({
      title,
      url,
      subject,
      type,
      curriculum: state.userDoc?.curriculum || "844",
      level: state.userDoc?.level || "",
      createdBy: state.user?.uid || "",
      createdByName: state.userDoc?.name || "",
    });

    state.links.unshift(link);
    toastOk("✓ Resource added");
    closeTray();
    applyFilters();
  } catch (e) {
    log.error("Save link failed:", e);
    showTrayError(e.message || "Could not save. Try again.");
  } finally {
    if (els.traySaveBtn) {
      els.traySaveBtn.disabled = false;
      els.traySaveBtn.textContent = "Save & Add Button →";
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
   FILTER CHIPS
   ========================================================= */

function wireFilterChips() {
  document.querySelectorAll(".filter-bar .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".filter-bar .chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.activeFilter = chip.dataset.filter;
      applyFilters();
    });
  });
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();
    updateTrayBadge();
    wireFilterChips();

    // Search
    els.searchInput?.addEventListener("input", (e) => {
      debouncedSearch(e.target.value.trim());
    });

    // Tray controls
    els.trayCloseBtn?.addEventListener("click", closeTray);
    els.trayCancelBtn?.addEventListener("click", closeTray);
    els.trayBackdrop?.addEventListener("click", closeTray);
    els.traySaveBtn?.addEventListener("click", saveLink);

    // Keyboard shortcut
    bindShortcut("ctrl+shift+alt+v", () => {
      if (els.tray.classList.contains("open")) closeTray();
      else openTray();
    });

    // Mobile tap shortcut — 5 taps
    installTapShortcuts({
      5: () => {
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

    // Load data
    await loadLinks();
    await loadSubjectQuestionCounts();

    log.info(`Exams page ready: ${state.links.length} links`);
  } catch (e) {
    log.error("Exams init failed:", e);
    toastErr("Could not load exams page. Please refresh.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
