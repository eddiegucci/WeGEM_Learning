// js/exams.js — WeGEM Learning exams page

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  getExamLinks,
  saveExamLink,
  deleteExamLink,
  listCanvases,
} from "./firebase.js";
import { EXAMS, SUBJECTS_BY_CURRICULUM } from "./data.js";
import { installTapShortcuts, flashToast } from './mobile-shortcuts.js';

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

let activeFilter = "all";
let allLinks = [];
let allCanvases = [];

/* =========================================================
   ELEMENTS
   ========================================================= */

const tray = document.getElementById("linkTray");
const trayBackdrop = document.getElementById("linkTrayBackdrop");
const trayCloseBtn = document.getElementById("trayCloseBtn");
const trayCancelBtn = document.getElementById("trayCancelBtn");
const traySaveBtn = document.getElementById("traySaveBtn");
const trayTitle = document.getElementById("trayTitle");
const trayUrl = document.getElementById("trayUrl");
const traySubject = document.getElementById("traySubject");
const trayType = document.getElementById("trayType");
const trayError = document.getElementById("trayError");

const canvasList = document.getElementById("canvasList");
const canvasCountEl = document.getElementById("canvasCount");
const linksGrid = document.getElementById("examLinksGrid");
const linkCountEl = document.getElementById("linkCount");
const subjectPapersGrid = document.getElementById("subjectPapersGrid");
const paperCountEl = document.getElementById("paperCount");
const searchInput = document.getElementById("examSearch");
const toast = document.getElementById("toast");

let searchQuery = "";

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

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || "";
}

/* =========================================================
   BUILD SUBJECT OPTIONS FOR TRAY
   ========================================================= */

function buildSubjectOptions() {
  if (!traySubject) return;
  const subjects = getSubjectList();
  traySubject.innerHTML =
    '<option value="">Select subject</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
}

/* =========================================================
   TRAY — OPEN / CLOSE
   ========================================================= */

function openTray() {
  if (!tray || !trayBackdrop) return;

  tray.classList.remove("hidden");
  trayBackdrop.classList.remove("hidden");
  tray.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    tray.classList.add("open");
    trayBackdrop.classList.add("open");
  });

  if (trayTitle) trayTitle.value = "";
  if (trayUrl) trayUrl.value = "";
  if (traySubject) traySubject.value = "";
  if (trayType) trayType.value = "papers";
  hideTrayError();

  setTimeout(() => trayTitle?.focus(), 260);
}

function closeTray() {
  if (!tray || !trayBackdrop) return;

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

/* =========================================================
   SECRET SHORTCUTS (silent)
   ========================================================= */

document.addEventListener("keydown", (e) => {
  // Ctrl+Shift+Alt+V → open exam-link tray
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "V" || e.key === "v")) {
    e.preventDefault();
    if (tray?.classList.contains("hidden")) openTray();
    else closeTray();
    return;
  }

  // Ctrl+Shift+Alt+N → open canvas for exams (read mode / start new)
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "N" || e.key === "n")) {
    e.preventDefault();
    window.location.href = "canvas.html?mode=exams&new=1";
    return;
  }

  // Ctrl+Shift+Alt+E → open canvas list in edit mode
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "E" || e.key === "e")) {
    e.preventDefault();
    window.location.href = "canvas.html?mode=exams&edit=1";
    return;
  }

  if (e.key === "Escape" && tray && !tray.classList.contains("hidden")) {
    closeTray();
  }
});

/* =========================================================
   TRAY ERROR
   ========================================================= */

function showTrayError(msg) {
  if (!trayError) return;
  trayError.textContent = msg;
  trayError.classList.remove("hidden");
}
function hideTrayError() {
  if (!trayError) return;
  trayError.classList.add("hidden");
  trayError.textContent = "";
}

/* =========================================================
   SAVE LINK
   ========================================================= */

traySaveBtn?.addEventListener("click", async () => {
  hideTrayError();

  const title = trayTitle.value.trim();
  const url = trayUrl.value.trim();
  const subject = traySubject.value;
  const type = trayType.value;

  if (!title) return showTrayError("Please enter a title.");
  if (!url) return showTrayError("Please paste a link.");
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return showTrayError("Link must start with http:// or https://");
  }
  if (!subject) return showTrayError("Please choose a subject.");

  traySaveBtn.disabled = true;
  const originalText = traySaveBtn.textContent;
  traySaveBtn.textContent = "Saving…";

  const link = {
    title,
    url,
    subject,
    type,
    curriculum: user.curriculum || "844",
    level: user.level || "",
    createdBy: user.userId || "anon",
    createdByName: user.name || "Anonymous",
  };

  try {
    await saveExamLink(link);
    showToast("✓ Link saved", "ok");
    closeTray();
    await loadLinks();
    renderLinks();
  } catch (e) {
    console.error(e);
    showTrayError("Could not save. Check your connection and try again.");
  } finally {
    traySaveBtn.disabled = false;
    traySaveBtn.textContent = originalText;
  }
});

/* =========================================================
   LOAD — EXAM LINKS
   ========================================================= */

async function loadLinks() {
  try {
    allLinks = await getExamLinks();
  } catch (e) {
    console.error("Failed to load links:", e);
    allLinks = [];
  }
}

/* =========================================================
   LOAD — CANVASES (exams)
   ========================================================= */

async function loadCanvases() {
  try {
    const curriculum = getCurrentCurriculum();
    const level = getCurrentLevel();
    const subjects = getSubjectList();

    const results = [];
    for (const subject of subjects) {
      try {
        const list = await listCanvases("exams", curriculum, level, subject);
        list.forEach((c) => results.push({ ...c, subject }));
      } catch (e) {
        // ignore
      }
    }
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
   RENDER — CANVAS CARDS
   ========================================================= */

function renderCanvases() {
  let filtered = allCanvases;

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((c) => {
      const titleMatch = (c.title || "").toLowerCase().includes(q);
      const subjectMatch = (c.subject || "").toLowerCase().includes(q);
      const pagesText = (c.pages || [])
        .map((p) => stripHtml(p))
        .join(" ")
        .toLowerCase();
      return titleMatch || subjectMatch || pagesText.includes(q);
    });
  }

  canvasCountEl.textContent =
    filtered.length + (filtered.length === 1 ? " doc" : " docs");

  if (!filtered.length) {
    canvasList.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📄</div>
        <div class="empty-title">No long-form exam documents yet</div>
        <div class="empty-sub">Check back soon for full papers and revision material.</div>
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
      <a class="canvas-card" href="canvas.html?mode=exams&curriculum=${encodeURIComponent(canvas.curriculum)}&level=${encodeURIComponent(canvas.level)}&subject=${encodeURIComponent(canvas.subject)}&id=${encodeURIComponent(canvas.id)}">
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

/* =========================================================
   RENDER — EXAM LINKS
   ========================================================= */

const TYPE_META = {
  papers: { icon: "📝", label: "Past Paper", color: "#3b82f6" },
  notes: { icon: "📚", label: "Notes", color: "#a855f7" },
  revision: { icon: "📖", label: "Revision", color: "#f59e0b" },
  video: { icon: "🎥", label: "Video", color: "#ec4899" },
};

function renderLinks() {
  if (!linksGrid) return;

  let filtered = allLinks;

  if (activeFilter !== "all") {
    filtered = filtered.filter((l) => l.type === activeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        (l.title || "").toLowerCase().includes(q) ||
        (l.subject || "").toLowerCase().includes(q),
    );
  }

  linkCountEl.textContent =
    filtered.length + (filtered.length === 1 ? " link" : " links");

  if (!filtered.length) {
    linksGrid.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">📄</div>
        <div class="empty-title">No exam links</div>
        <div class="empty-sub">Check back soon for curated resources.</div>
      </div>
    `;
    return;
  }

  linksGrid.innerHTML = filtered
    .map((link) => {
      const meta = TYPE_META[link.type] || TYPE_META.papers;
      const safeTitle = escapeHtml(link.title);
      const safeSubject = escapeHtml(link.subject || "");
      const safeUrl = escapeHtml(link.url);

      return `
      <a class="exam-link-btn" href="${safeUrl}" target="_blank" rel="noopener noreferrer"
         style="--accent:${meta.color};" data-link-id="${link.id}">
        <div class="elb-top">
          <div class="elb-icon">${meta.icon}</div>
          <button class="elb-remove" type="button" data-remove-id="${link.id}" title="Remove">×</button>
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
    })
    .join("");

  linksGrid.querySelectorAll(".elb-remove").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.removeId;
      if (!confirm("Delete this link?")) return;
      try {
        await deleteExamLink(id);
        showToast("Link removed", "ok");
        await loadLinks();
        renderLinks();
      } catch (err) {
        console.error(err);
        showToast("Could not delete link", "err");
      }
    });
  });
}

/* =========================================================
   FILTER CHIPS
   ========================================================= */

document.querySelectorAll(".filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    renderLinks();
  });
});

/* =========================================================
   RENDER — PAPERS BY SUBJECT
   ========================================================= */

function renderSubjectPapers() {
  if (!subjectPapersGrid) return;

  const curriculum = getCurrentCurriculum();
  const level = getCurrentLevel();
  const userSubjects = getSubjectList();

  const examKey =
    curriculum === "CBE" ? (level === "Grade 9" ? "KJSEA" : "KPSEA") : "KCSE";

  const examBank = EXAMS[examKey];

  const cards = userSubjects
    .map((subjName) => {
      const bankSubject = examBank?.subjects?.find((s) => s.name === subjName);
      const count = bankSubject ? bankSubject.questions.length : 0;
      const icon = subjectIcon(subjName);

      return `
      <a class="paper-card" href="quiz.html?exam=${examKey}&subject=${encodeURIComponent(subjName)}">
        <div class="paper-icon">${icon}</div>
        <div class="paper-body">
          <div class="paper-name">${escapeHtml(subjName)}</div>
          <div class="paper-meta">${count} ${count === 1 ? "question" : "questions"} available</div>
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

  subjectPapersGrid.innerHTML =
    cards || '<div class="empty-state">No subjects selected yet.</div>';

  if (paperCountEl) {
    const totalQ = userSubjects.reduce((sum, name) => {
      const bankSubject = examBank?.subjects?.find((s) => s.name === name);
      return sum + (bankSubject ? bankSubject.questions.length : 0);
    }, 0);
    paperCountEl.textContent = `${totalQ} questions`;
  }
}

/* =========================================================
   SEARCH
   ========================================================= */

searchInput?.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderCanvases();
  renderLinks();
});

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  buildSubjectOptions();
  await Promise.all([loadLinks(), loadCanvases()]);
  renderCanvases();
  renderLinks();
  renderSubjectPapers();
}

init();

/* =========================================================
   MOBILE TAP SHORTCUTS
   Tap 5 times on the page → opens the Add Link tray
   ========================================================= */

installTapShortcuts({
  'add-link': () => {
    flashToast('🔗 Opening Add Link…');
    setTimeout(openTray, 300);
  }
});