// js/pages/admin.js
// Controller for admin.html.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import {
  listUsers,
  promoteUser,
  demoteUser,
  addQuestion,
  deleteQuestion,
  listQuestions,
  addNote,
  listNotes,
  getContentCounts,
} from "../features/admin.js";
import {
  SEED_QUESTIONS,
  SEED_NOTES,
  seedEverything,
  seedQuestions,
  seedNotes,
} from "../data/seed.js";
import { getSubjectIcon, getSubjectColor } from "../data/subjects.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import {
  escapeHTML,
  firstName,
  initials,
  formatDateTime,
  timeAgo,
  log,
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  activeTab: "content",
  users: [],
  questions: [],
  seeding: false,
};

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),

  statQuestions: document.getElementById("statQuestions"),
  statNotes: document.getElementById("statNotes"),
  statUsers: document.getElementById("statUsers"),
  statLinks: document.getElementById("statLinks"),

  tabContent: document.getElementById("tabContent"),
  tabUsers: document.getElementById("tabUsers"),
  tabSeed: document.getElementById("tabSeed"),

  // Add question form
  addQuestionForm: document.getElementById("addQuestionForm"),
  toggleAddQuestion: document.getElementById("toggleAddQuestion"),
  qExam: document.getElementById("qExam"),
  qSubject: document.getElementById("qSubject"),
  qTopic: document.getElementById("qTopic"),
  qText: document.getElementById("qText"),
  qOptions: document.getElementById("qOptions"),
  qExplain: document.getElementById("qExplain"),
  qError: document.getElementById("qError"),
  addQuestionBtn: document.getElementById("addQuestionBtn"),

  questionsList: document.getElementById("questionsList"),
  refreshQuestions: document.getElementById("refreshQuestions"),

  usersList: document.getElementById("usersList"),
  refreshUsers: document.getElementById("refreshUsers"),

  seedAllBtn: document.getElementById("seedAllBtn"),
  seedQuestionsBtn: document.getElementById("seedQuestionsBtn"),
  seedNotesBtn: document.getElementById("seedNotesBtn"),
  seedProgress: document.getElementById("seedProgress"),
  seedBar: document.getElementById("seedBar"),
  seedStatus: document.getElementById("seedStatus"),
};

/* =========================================================
   SETUP — REQUIRES ADMIN ROLE
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
    "Admin";
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

    // Role check
    if (doc?.role !== "admin") {
      toastErr("Admin access required.");
      setTimeout(() => window.location.replace("home.html"), 800);
      return false;
    }
  } catch (e) {
    log.warn("Could not load user doc:", e);
    toastErr("Could not verify admin access.");
    return false;
  }

  return true;
}

/* =========================================================
   TAB SWITCHING
   ========================================================= */

function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll(".admin-tabs .lb-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === tabId);
  });

  document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
    const isActive =
      panel.id === "tab" + tabId.charAt(0).toUpperCase() + tabId.slice(1);
    panel.classList.toggle("hidden", !isActive);
  });

  if (tabId === "content") loadQuestions();
  if (tabId === "users") loadUsers();
}

/* =========================================================
   STATS
   ========================================================= */

async function loadStats() {
  try {
    const counts = await getContentCounts();
    if (els.statQuestions)
      els.statQuestions.textContent = counts.questions || 0;
    if (els.statNotes) els.statNotes.textContent = counts.notes || 0;
    if (els.statLinks) els.statLinks.textContent = counts.examLinks || 0;
  } catch (e) {
    log.warn("Could not load counts:", e);
  }

  try {
    const users = await listUsers({ limitCount: 500 });
    if (els.statUsers) els.statUsers.textContent = users.length;
  } catch (e) {
    log.warn("Could not load user count:", e);
  }
}

/* =========================================================
   QUESTIONS LIST
   ========================================================= */

async function loadQuestions() {
  if (!els.questionsList) return;

  els.questionsList.innerHTML = `<div class="spinner"></div>`;

  try {
    const questions = await listQuestions({ limitCount: 50 });
    state.questions = questions;

    if (!questions.length) {
      els.questionsList.innerHTML = `
        <div class="empty-state" style="border: none; background: none;">
          <div class="empty-icon">📝</div>
          <div class="empty-title">No questions yet</div>
          <div class="empty-sub">Add one above or seed starter content.</div>
        </div>
      `;
      return;
    }

    els.questionsList.innerHTML = questions
      .map((q) => {
        const color = getSubjectColor(q.subject);
        const icon = getSubjectIcon(q.subject);
        return `
        <div class="admin-list-row" style="padding: 14px 0; border-bottom: 1px solid var(--border); display: flex; gap: 14px; align-items: flex-start;">
          <div class="subject-icon" style="background: ${color}22; color: ${color}; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;">${icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13.5px; color: #fff; font-weight: 600; margin-bottom: 4px;">${escapeHTML(q.q || "")}</div>
            <div style="font-size: 11.5px; color: var(--text-mute);">${escapeHTML(q.exam || "")} · ${escapeHTML(q.subject || "")} · ${escapeHTML(q.topic || "")}</div>
          </div>
          <button class="elb-remove" type="button" data-delete-q="${q.id}" title="Delete">×</button>
        </div>
      `;
      })
      .join("");

    els.questionsList.querySelectorAll("[data-delete-q]").forEach((btn) => {
      btn.addEventListener("click", () =>
        handleDeleteQuestion(btn.dataset.deleteQ),
      );
    });
  } catch (e) {
    log.warn("Could not load questions:", e);
    els.questionsList.innerHTML = `
      <div class="empty-state" style="border: none; background: none;">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load questions</div>
        <div class="empty-sub">${escapeHTML(e.message || "Check permissions.")}</div>
      </div>
    `;
  }
}

async function handleDeleteQuestion(id) {
  const ok = await confirmDialog({
    title: "Delete question?",
    message: "This cannot be undone.",
    okLabel: "Delete",
    cancelLabel: "Cancel",
    danger: true,
  });

  if (!ok) return;

  try {
    await deleteQuestion(id);
    toastOk("Question deleted");
    loadQuestions();
    loadStats();
  } catch (e) {
    log.warn("Delete failed:", e);
    toastErr("Could not delete question.");
  }
}

/* =========================================================
   ADD QUESTION
   ========================================================= */

function showQuestionError(msg) {
  if (!els.qError) return;
  els.qError.textContent = msg;
  els.qError.classList.remove("hidden");
}

function clearQuestionError() {
  if (!els.qError) return;
  els.qError.classList.add("hidden");
  els.qError.textContent = "";
}

async function handleAddQuestion() {
  clearQuestionError();

  const exam = els.qExam?.value || "KCSE";
  const subject = (els.qSubject?.value || "").trim();
  const topic = (els.qTopic?.value || "").trim() || "General";
  const q = (els.qText?.value || "").trim();
  const optionsRaw = (els.qOptions?.value || "").trim();
  const explain = (els.qExplain?.value || "").trim();

  if (!subject) return showQuestionError("Subject is required.");
  if (!q) return showQuestionError("Question text is required.");

  const options = optionsRaw
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);
  if (options.length < 2)
    return showQuestionError(
      "Please provide at least 2 options (one per line).",
    );

  els.addQuestionBtn.disabled = true;
  els.addQuestionBtn.textContent = "Adding…";

  try {
    await addQuestion({
      exam,
      subject,
      topic,
      q,
      options,
      answer: 0, // first option is always correct in this simple form
      explain,
    });

    toastOk("Question added");
    // Clear form
    if (els.qText) els.qText.value = "";
    if (els.qOptions) els.qOptions.value = "";
    if (els.qExplain) els.qExplain.value = "";
    loadQuestions();
    loadStats();
  } catch (e) {
    log.warn("Add question failed:", e);
    showQuestionError(e.message || "Could not add question.");
  } finally {
    els.addQuestionBtn.disabled = false;
    els.addQuestionBtn.textContent = "Add Question →";
  }
}

/* =========================================================
   USERS
   ========================================================= */

async function loadUsers() {
  if (!els.usersList) return;
  els.usersList.innerHTML = `<div class="spinner"></div>`;

  try {
    const users = await listUsers({ limitCount: 200 });
    state.users = users;

    if (!users.length) {
      els.usersList.innerHTML = `
        <div class="empty-state" style="border: none; background: none;">
          <div class="empty-icon">👥</div>
          <div class="empty-title">No users yet</div>
        </div>
      `;
      return;
    }

    els.usersList.innerHTML = users
      .map((u) => {
        const isAdmin = u.role === "admin";
        const isMe = u.uid === state.user.uid;
        return `
        <div class="admin-list-row" style="padding: 14px 0; border-bottom: 1px solid var(--border); display: flex; gap: 14px; align-items: center;">
          <div class="user-avatar" style="width: 34px; height: 34px; font-size: 13px;">${initials(u.name || u.email || "?")}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13.5px; color: #fff; font-weight: 600;">${escapeHTML(u.name || "—")}${isMe ? " (you)" : ""}</div>
            <div style="font-size: 11.5px; color: var(--text-mute);">${escapeHTML(u.email || "")} · ${escapeHTML(u.school || "—")} · ${escapeHTML(u.curriculum || "")} ${escapeHTML(u.level || "")}</div>
          </div>
          ${isAdmin ? `<span class="badge badge-success">Admin</span>` : ""}
          <button class="btn btn-sm ${isAdmin ? "btn-ghost" : "btn-primary"}" type="button" data-toggle-admin="${u.uid}" data-role="${u.role || "student"}">
            ${isAdmin ? "Demote" : "Promote"}
          </button>
        </div>
      `;
      })
      .join("");

    els.usersList.querySelectorAll("[data-toggle-admin]").forEach((btn) => {
      btn.addEventListener("click", () =>
        handleToggleAdmin(btn.dataset.toggleAdmin, btn.dataset.role),
      );
    });
  } catch (e) {
    log.warn("Could not load users:", e);
    els.usersList.innerHTML = `
      <div class="empty-state" style="border: none; background: none;">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Could not load users</div>
        <div class="empty-sub">${escapeHTML(e.message || "Check permissions.")}</div>
      </div>
    `;
  }
}

async function handleToggleAdmin(uid, currentRole) {
  const isAdmin = currentRole === "admin";
  const verb = isAdmin ? "demote" : "promote";

  const ok = await confirmDialog({
    title: `${isAdmin ? "Demote" : "Promote"} user?`,
    message: `Do you want to ${verb} this user to ${isAdmin ? "student" : "admin"}?`,
    okLabel: isAdmin ? "Demote" : "Promote",
    cancelLabel: "Cancel",
  });

  if (!ok) return;

  try {
    if (isAdmin) await demoteUser(uid);
    else await promoteUser(uid);
    toastOk(`User ${isAdmin ? "demoted" : "promoted"}`);
    loadUsers();
  } catch (e) {
    log.warn("Toggle admin failed:", e);
    toastErr("Could not change role.");
  }
}

/* =========================================================
   SEED
   ========================================================= */

function setSeedProgress(pct, message) {
  if (!els.seedProgress || !els.seedBar || !els.seedStatus) return;
  els.seedProgress.classList.remove("hidden");
  els.seedBar.style.width = `${pct}%`;
  els.seedStatus.textContent = message;
}

async function handleSeedQuestions() {
  if (state.seeding) return;
  state.seeding = true;

  setSeedProgress(10, `Seeding ${SEED_QUESTIONS.length} questions…`);

  try {
    const result = await seedQuestions();
    setSeedProgress(
      100,
      `Added ${result.added} questions · ${result.failed} failed`,
    );
    toastOk(`✓ Seeded ${result.added} questions`);
    loadStats();
    loadQuestions();
  } catch (e) {
    log.error("Seed questions failed:", e);
    toastErr("Seed failed.");
    setSeedProgress(0, "Failed.");
  } finally {
    state.seeding = false;
  }
}

async function handleSeedNotes() {
  if (state.seeding) return;
  state.seeding = true;

  setSeedProgress(10, `Seeding ${SEED_NOTES.length} notes…`);

  try {
    const result = await seedNotes();
    setSeedProgress(
      100,
      `Added ${result.added} notes · ${result.failed} failed`,
    );
    toastOk(`✓ Seeded ${result.added} notes`);
    loadStats();
  } catch (e) {
    log.error("Seed notes failed:", e);
    toastErr("Seed failed.");
    setSeedProgress(0, "Failed.");
  } finally {
    state.seeding = false;
  }
}

async function handleSeedAll() {
  if (state.seeding) return;

  const ok = await confirmDialog({
    title: "Seed all content?",
    message: `This will add ${SEED_QUESTIONS.length} questions and ${SEED_NOTES.length} notes to Firestore.`,
    okLabel: "Seed Everything",
    cancelLabel: "Cancel",
  });

  if (!ok) return;

  state.seeding = true;
  setSeedProgress(5, "Starting…");

  try {
    setSeedProgress(20, "Seeding questions…");
    const qResult = await seedQuestions();

    setSeedProgress(70, "Seeding notes…");
    const nResult = await seedNotes();

    setSeedProgress(
      100,
      `Done! Added ${qResult.added} questions, ${nResult.added} notes.`,
    );
    toastOk(`✓ Seeded ${qResult.added + nResult.added} items`);
    loadStats();
    loadQuestions();
  } catch (e) {
    log.error("Seed all failed:", e);
    toastErr("Seed failed.");
    setSeedProgress(0, "Failed.");
  } finally {
    state.seeding = false;
  }
}

/* =========================================================
   USER MENU
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message: `Signed in as ${state.user?.email || "Admin"}.\n\nDo you want to sign out?`,
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
   INIT
   ========================================================= */

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();

    // Wire tab switching
    document.querySelectorAll(".admin-tabs .lb-tab").forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });

    // Wire content
    els.toggleAddQuestion?.addEventListener("click", () => {
      els.addQuestionForm?.classList.toggle("hidden");
    });
    els.addQuestionBtn?.addEventListener("click", handleAddQuestion);
    els.refreshQuestions?.addEventListener("click", loadQuestions);
    els.refreshUsers?.addEventListener("click", loadUsers);

    // Wire seed
    els.seedAllBtn?.addEventListener("click", handleSeedAll);
    els.seedQuestionsBtn?.addEventListener("click", handleSeedQuestions);
    els.seedNotesBtn?.addEventListener("click", handleSeedNotes);

    // Wire user menu
    els.userMenuBtn?.addEventListener("click", handleUserMenu);

    // Initial load
    await loadStats();
    await loadQuestions();

    log.info("Admin panel ready");
  } catch (e) {
    log.error("Admin init failed:", e);
    toastErr("Could not load admin panel.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
