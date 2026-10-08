// js/exams.js — WeGEM Learning exams page
// Desktop: Ctrl+Shift+Alt+V opens the Add Link tray
// Mobile:  Tap 5 times on the page opens the Add Link tray

import "./wallpaper-init.js";
import {
  getCurrentUser,
  clearCurrentUser,
  getExamLinks,
  saveExamLink,
  deleteExamLink,
} from "./firebase.js";
import { EXAMS, SUBJECTS_BY_CURRICULUM } from "./data.js";
import { installTapShortcuts, flashToast } from "./mobile-shortcuts.js";

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
const trayBadge = document.getElementById("trayBadge");

const linksGrid = document.getElementById("examLinksGrid");
const subjectPapersGrid = document.getElementById("subjectPapersGrid");
const paperCountEl = document.getElementById("paperCount");
const toast = document.getElementById("toast");

let activeFilter = "all";
let allLinks = [];

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
   DETECT TOUCH DEVICE — update tray badge text
   ========================================================= */

const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
if (trayBadge) {
  trayBadge.textContent = isTouch ? "Tap 5× to open" : "Ctrl+Shift+Alt+V";
}

/* =========================================================
   SUBJECT SELECT
   ========================================================= */

function buildSubjectOptions() {
  if (!traySubject) return;

  const curriculum = user.curriculum === "CBE" ? "CBE" : "844";
  const byLevel = SUBJECTS_BY_CURRICULUM[curriculum] || {};
  const level =
    user.level || user.form || user.grade || Object.keys(byLevel)[0];
  const subjects = byLevel[level] || [];

  traySubject.innerHTML =
    '<option value="">Select subject</option>' +
    subjects.map((s) => `<option value="${s}">${s}</option>`).join("");
}

/* =========================================================
   TRAY OPEN/CLOSE
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
   DESKTOP KEYBOARD SHORTCUT — Ctrl+Shift+Alt+V
   ========================================================= */

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === "V" || e.key === "v")) {
    e.preventDefault();
    if (tray?.classList.contains("hidden")) openTray();
    else closeTray();
  }
  if (e.key === "Escape" && tray && !tray.classList.contains("hidden")) {
    closeTray();
  }
});

/* =========================================================
   MOBILE TAP SHORTCUT — Tap 5 times anywhere on the page
   ========================================================= */

installTapShortcuts({
  "add-link": () => {
    flashToast("🔗 Opening Add Link…");
    setTimeout(() => {
      if (tray?.classList.contains("hidden")) openTray();
    }, 280);
  },
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
    showToast("✓ Link saved — button added", "ok");
    closeTray();
    await loadLinks();
  } catch (e) {
    console.error(e);
    showTrayError("Could not save. Check your connection and try again.");
  } finally {
    traySaveBtn.disabled = false;
    traySaveBtn.textContent = originalText;
  }
});

/* =========================================================
   LOAD LINKS
   ========================================================= */

async function loadLinks() {
  try {
    allLinks = await getExamLinks();
    renderLinks();
  } catch (e) {
    console.error("Failed to load links:", e);
    renderLinks(true);
  }
}

/* =========================================================
   RENDER LINKS
   ========================================================= */

const TYPE_META = {
  papers: { icon: "📝", label: "Past Paper", color: "#3b82f6" },
  notes: { icon: "📚", label: "Notes", color: "#a855f7" },
  revision: { icon: "📖", label: "Revision", color: "#f59e0b" },
  video: { icon: "🎥", label: "Video", color: "#ec4899" },
};

function renderLinks(hasError = false) {
  if (!linksGrid) return;

  const filtered =
    activeFilter === "all"
      ? allLinks
      : allLinks.filter((l) => l.type === activeFilter);

  if (!filtered.length) {
    linksGrid.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-icon">${hasError ? "⚠️" : "📄"}</div>
        <div class="empty-title">${hasError ? "Could not load links" : "No exam links yet"}</div>
        <div class="empty-sub">
          ${
            hasError
              ? "Check your connection and refresh the page."
              : `On desktop press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>V</kbd> · On mobile tap this page 5 times`
          }
        </div>
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
      } catch (err) {
        console.error(err);
        showToast("Could not delete link", "err");
      }
    });
  });
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
   PAPERS BY SUBJECT
   ========================================================= */

function renderSubjectPapers() {
  if (!subjectPapersGrid) return;

  const curriculum = user.curriculum === "CBE" ? "CBE" : "844";
  const byLevel = SUBJECTS_BY_CURRICULUM[curriculum] || {};
  const level =
    user.level || user.form || user.grade || Object.keys(byLevel)[0];
  const userSubjects = user.subjects?.length
    ? user.subjects
    : byLevel[level] || [];

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
   SEARCH
   ========================================================= */

const searchInput = document.getElementById("examSearch");
searchInput?.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  const cards = linksGrid.querySelectorAll(".exam-link-btn");
  cards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(q) ? "" : "none";
  });
});

/* =========================================================
   INIT
   ========================================================= */

buildSubjectOptions();
loadLinks();
renderSubjectPapers();
