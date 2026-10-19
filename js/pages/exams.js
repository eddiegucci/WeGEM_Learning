// js/pages/exams.js
// Controller for exams.html. Read-only view for students.

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
  getLinkMeta,
} from "../features/exams.js";
import {
  getSubjects,
  getSubjectIcon,
  EXAM_BY_LEVEL,
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
  isOnline,
} from "../core/utils.js";

const state = {
  user: null,
  userDoc: null,
  links: [],
  filtered: [],
  activeFilter: "all",
  query: "",
  subjectQuestionCounts: {},
};

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  searchInput: document.getElementById("examSearch"),
  examLinksGrid: document.getElementById("examLinksGrid"),
  subjectPapersGrid: document.getElementById("subjectPapersGrid"),
  paperCount: document.getElementById("paperCount"),
};

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

async function loadLinks() {
  try {
    state.links = await fetchExamLinks();
  } catch (e) {
    log.warn("Could not load exam links:", e);
    state.links = [];
  }
  applyFilters();
}

function applyFilters() {
  state.filtered = filterExamLinks(state.links, {
    type: state.activeFilter,
    query: state.query,
  });
  renderLinks();
}

function renderLinks() {
  if (!els.examLinksGrid) return;

  if (!state.filtered.length) {
    const hasLinks = state.links.length > 0;
    els.examLinksGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; background: rgba(20,25,45,0.4); backdrop-filter: blur(10px); border-radius: var(--radius-lg); border: 1px dashed var(--border-hi);">
        <div class="empty-icon">📄</div>
        <div class="empty-title">${hasLinks ? "No resources match your filter" : "No exam resources yet"}</div>
        <div class="empty-sub">${hasLinks ? "Try clearing the search or choosing a different type." : "Check back later for new papers and revision materials."}</div>
      </div>
    `;
    return;
  }

  els.examLinksGrid.innerHTML = state.filtered
    .map((link) => renderLinkButton(link))
    .join("");
}

function renderLinkButton(link) {
  const meta = getLinkMeta(link.type);

  return `
    <a class="premium-exam-card" href="${escapeHTML(link.url || "#")}" target="_blank" rel="noopener noreferrer" style="--accent: ${meta.color};">
      <div class="pec-top">
        <div class="pec-icon">${meta.icon}</div>
        <div class="pec-type">${meta.label}</div>
      </div>
      <div class="pec-title">${escapeHTML(link.title || "Untitled Resource")}</div>
      <div class="pec-subject">${escapeHTML(link.subject || "")}</div>
      <div class="pec-action">
        Open Resource
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 17 L17 7 M9 7 H17 V15"/>
        </svg>
      </div>
    </a>
  `;
}

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

  await Promise.all(
    uniqueSubjects.map(async (subjectName) => {
      let count = 0;
      try {
        const cached = await getCachedQuestions(examKey, subjectName);
        count = cached.length;
      } catch {}

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
      <div class="empty-state" style="grid-column: 1 / -1; background: rgba(20,25,45,0.4); backdrop-filter: blur(10px); border-radius: var(--radius-lg); border: 1px dashed var(--border-hi);">
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
      <a class="premium-subject-card${hasQuestions ? "" : " is-empty"}" href="quiz.html?exam=${encodeURIComponent(examKey)}&subject=${encodeURIComponent(subjName)}">
        <div class="psc-icon">${icon}</div>
        <div class="psc-body">
          <div class="psc-name">${escapeHTML(subjName)}</div>
          <div class="psc-meta">
            ${hasQuestions ? `${count} ${count === 1 ? "question" : "questions"} available` : "Coming soon"}
          </div>
        </div>
        <div class="psc-arrow">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
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

const debouncedSearch = debounce((value) => {
  state.query = value;
  applyFilters();
}, 200);

function wireFilterChips() {
  document.querySelectorAll(".exams-filters .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document
        .querySelectorAll(".exams-filters .chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.activeFilter = chip.dataset.filter;
      applyFilters();
    });
  });
}

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();
    wireFilterChips();

    els.searchInput?.addEventListener("input", (e) => {
      debouncedSearch(e.target.value.trim());
    });

    els.userMenuBtn?.addEventListener("click", handleUserMenu);

    await loadLinks();
    await loadSubjectQuestionCounts();
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
