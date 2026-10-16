// js/pages/admin.js
// Admin panel controller — Content, Users, Notes, Exam Links, Files, Bulk Add, Seed.

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
  getContentCounts,
  addNote,
  deleteNote,
  listNotes,
  addExamLink,
  deleteExamLink,
  listExamLinks,
} from "../features/admin.js";
import {
  addFile,
  removeFile,
  fetchFiles,
  getFileTypeMeta,
  FILE_TYPES,
  parseDriveUrl,
} from "../features/files.js";
import {
  SEED_QUESTIONS,
  SEED_NOTES,
  seedQuestions,
  seedNotes,
} from "../data/seed.js";
import {
  getSubjectIcon,
  getSubjectColor,
  getSubjects,
  EXAM_BY_LEVEL,
} from "../data/subjects.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import {
  escapeHTML,
  firstName,
  initials,
  log,
  debounce,
  isValidURL,
} from "../core/utils.js";

const state = {
  user: null,
  userDoc: null,
  activeTab: "content",
  users: [],
  questions: [],
  notes: [],
  examLinks: [],
  files: [],
  seeding: false,
};

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
  tabNotes: document.getElementById("tabNotes"),
  tabExamLinks: document.getElementById("tabExamLinks"),
  tabFiles: document.getElementById("tabFiles"),
  tabBulk: document.getElementById("tabBulk"),
  tabSeed: document.getElementById("tabSeed"),

  // Content
  addQuestionForm: document.getElementById("addQuestionForm"),
  toggleAddQuestion: document.getElementById("toggleAddQuestion"),
  qExam: document.getElementById("qExam"),
  qSubject: document.getElementById("qSubject"),
  qTopic: document.getElementById("qTopic"),
  qText: document.getElementById("qText"),
  qMarkpoints: document.getElementById("qMarkpoints"),
  qExplain: document.getElementById("qExplain"),
  qError: document.getElementById("qError"),
  addQuestionBtn: document.getElementById("addQuestionBtn"),
  questionsList: document.getElementById("questionsList"),
  refreshQuestions: document.getElementById("refreshQuestions"),

  // Users
  usersList: document.getElementById("usersList"),
  refreshUsers: document.getElementById("refreshUsers"),

  // Notes
  noteForm: document.getElementById("noteForm"),
  noteSubjectSelect: document.getElementById("noteSubjectSelect"),
  noteLevel: document.getElementById("noteLevel"),
  noteTopicInput: document.getElementById("noteTopicInput"),
  noteSummaryInput: document.getElementById("noteSummaryInput"),
  noteKeyPointsInput: document.getElementById("noteKeyPointsInput"),
  noteFormError: document.getElementById("noteFormError"),
  addNoteBtn: document.getElementById("addNoteBtn"),
  notesList: document.getElementById("notesList"),
  refreshNotes: document.getElementById("refreshNotes"),

  // Exam links
  examForm: document.getElementById("examForm"),
  examTitleInput: document.getElementById("examTitleInput"),
  examUrlInput: document.getElementById("examUrlInput"),
  examSubjectSelect: document.getElementById("examSubjectSelect"),
  examTypeSelect: document.getElementById("examTypeSelect"),
  examLevelInput: document.getElementById("examLevelInput"),
  examFormError: document.getElementById("examFormError"),
  addExamBtn: document.getElementById("addExamBtn"),
  examLinksList: document.getElementById("examLinksList"),
  refreshExamLinks: document.getElementById("refreshExamLinks"),

  // Files
  fileForm: document.getElementById("fileForm"),
  fileTitleInput: document.getElementById("fileTitleInput"),
  fileUrlInput: document.getElementById("fileUrlInput"),
  fileSubjectSelect: document.getElementById("fileSubjectSelect"),
  fileTypeSelect: document.getElementById("fileTypeSelect"),
  fileLevelInput: document.getElementById("fileLevelInput"),
  fileFormError: document.getElementById("fileFormError"),
  addFileBtn: document.getElementById("addFileBtn"),
  filesList: document.getElementById("filesList"),
  refreshFiles: document.getElementById("refreshFiles"),

  // Bulk
  bulkText: document.getElementById("bulkText"),
  bulkPreview: document.getElementById("bulkPreview"),
  bulkPreviewTitle: document.getElementById("bulkPreviewTitle"),
  bulkPreviewList: document.getElementById("bulkPreviewList"),
  bulkError: document.getElementById("bulkError"),
  bulkProgress: document.getElementById("bulkProgress"),
  bulkBar: document.getElementById("bulkBar"),
  bulkStatus: document.getElementById("bulkStatus"),
  bulkUploadBtn: document.getElementById("bulkUploadBtn"),
  bulkClearBtn: document.getElementById("bulkClearBtn"),
  showBulkFormat: document.getElementById("showBulkFormat"),
  bulkFormat: document.getElementById("bulkFormat"),

  // Seed
  seedAllBtn: document.getElementById("seedAllBtn"),
  seedQuestionsBtn: document.getElementById("seedQuestionsBtn"),
  seedNotesBtn: document.getElementById("seedNotesBtn"),
  seedProgress: document.getElementById("seedProgress"),
  seedBar: document.getElementById("seedBar"),
  seedStatus: document.getElementById("seedStatus"),
};

/* =========================================================
   SETUP USER — requires admin role
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

    if (doc?.role !== "admin") {
      toastErr("Admin access required.");
      setTimeout(function () {
        window.location.replace("home.html");
      }, 800);
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
   TABS
   ========================================================= */

function switchTab(tabId) {
  state.activeTab = tabId;

  document.querySelectorAll(".admin-tabs .lb-tab").forEach(function (t) {
    t.classList.toggle("active", t.dataset.tab === tabId);
  });

  const idMap = {
    content: "tabContent",
    users: "tabUsers",
    notes: "tabNotes",
    examLinks: "tabExamLinks",
    files: "tabFiles",
    bulk: "tabBulk",
    seed: "tabSeed",
  };

  document.querySelectorAll(".admin-tab-panel").forEach(function (panel) {
    panel.classList.toggle("hidden", panel.id !== idMap[tabId]);
  });

  if (tabId === "content") loadQuestions();
  if (tabId === "users") loadUsers();
  if (tabId === "notes") loadNotes();
  if (tabId === "examLinks") loadExamLinks();
  if (tabId === "files") loadFiles();
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
   SUBJECT OPTIONS HELPER
   ========================================================= */

function populateSubjectSelects() {
  const curriculum = state.userDoc?.curriculum === "CBE" ? "CBE" : "844";
  const level =
    state.userDoc?.level || (curriculum === "CBE" ? "Grade 9" : "Form 4");
  let subjects = getSubjects(curriculum, level);

  if (!subjects.length) {
    subjects = [
      "Mathematics",
      "English",
      "Kiswahili",
      "Biology",
      "Chemistry",
      "Physics",
      "Geography",
      "History",
      "CRE",
      "IRE",
      "Business Studies",
      "Agriculture",
      "Computer Studies",
    ];
  }

  const opts =
    '<option value="">Select subject</option>' +
    subjects
      .map(function (s) {
        return (
          '<option value="' + escapeHTML(s) + '">' + escapeHTML(s) + "</option>"
        );
      })
      .join("");

  if (els.noteSubjectSelect) els.noteSubjectSelect.innerHTML = opts;
  if (els.examSubjectSelect) els.examSubjectSelect.innerHTML = opts;
  if (els.fileSubjectSelect) els.fileSubjectSelect.innerHTML = opts;
}

/* =========================================================
   QUESTIONS (existing)
   ========================================================= */

async function loadQuestions() {
  if (!els.questionsList) return;
  els.questionsList.innerHTML = '<div class="spinner"></div>';

  try {
    const questions = await listQuestions({ limitCount: 50 });
    state.questions = questions;

    if (!questions.length) {
      els.questionsList.innerHTML =
        '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">📝</div><div class="empty-title">No questions yet</div><div class="empty-sub">Add one above or use Bulk Add.</div></div>';
      return;
    }

    els.questionsList.innerHTML = questions
      .map(function (q) {
        const color = getSubjectColor(q.subject);
        const icon = getSubjectIcon(q.subject);
        const type = q.type === "mcq" ? "MCQ" : "Open";
        const marks =
          q.totalMarks ||
          (q.markpoints || []).length ||
          (q.options || []).length;
        return (
          '<div style="padding:14px 0;border-bottom:1px solid var(--border);display:flex;gap:14px;align-items:flex-start;">' +
          '<div style="background:' +
          color +
          "22;color:" +
          color +
          ';width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' +
          icon +
          "</div>" +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;color:#fff;font-weight:600;margin-bottom:4px;">' +
          escapeHTML(q.q || "") +
          "</div>" +
          '<div style="font-size:11.5px;color:var(--text-mute);">' +
          escapeHTML(q.exam || "") +
          " · " +
          escapeHTML(q.subject || "") +
          " · " +
          escapeHTML(q.topic || "") +
          " · " +
          type +
          " · " +
          marks +
          " mark" +
          (marks === 1 ? "" : "s") +
          "</div>" +
          "</div>" +
          '<button class="elb-remove" type="button" data-delete-q="' +
          q.id +
          '" title="Delete">×</button>' +
          "</div>"
        );
      })
      .join("");

    els.questionsList
      .querySelectorAll("[data-delete-q]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          handleDeleteQuestion(btn.dataset.deleteQ);
        });
      });
  } catch (e) {
    log.warn("Could not load questions:", e);
    els.questionsList.innerHTML =
      '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load questions</div><div class="empty-sub">' +
      escapeHTML(e.message || "Check permissions.") +
      "</div></div>";
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
  const rawMarkpoints = (els.qMarkpoints?.value || "").trim();
  const explain = (els.qExplain?.value || "").trim();

  if (!subject) return showQuestionError("Subject is required.");
  if (!q) return showQuestionError("Question text is required.");

  const markpoints = rawMarkpoints
    .split("\n")
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);
  if (markpoints.length < 1)
    return showQuestionError("Please provide at least 1 markpoint.");

  els.addQuestionBtn.disabled = true;
  els.addQuestionBtn.textContent = "Adding…";

  try {
    await addQuestion({
      exam,
      subject,
      topic,
      q,
      markpoints,
      totalMarks: markpoints.length,
      explain,
      type: "open",
    });
    toastOk("Question added");
    if (els.qText) els.qText.value = "";
    if (els.qMarkpoints) els.qMarkpoints.value = "";
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
   USERS (existing)
   ========================================================= */

async function loadUsers() {
  if (!els.usersList) return;
  els.usersList.innerHTML = '<div class="spinner"></div>';

  try {
    const users = await listUsers({ limitCount: 200 });
    state.users = users;

    if (!users.length) {
      els.usersList.innerHTML =
        '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">👥</div><div class="empty-title">No users yet</div></div>';
      return;
    }

    els.usersList.innerHTML = users
      .map(function (u) {
        const isAdmin = u.role === "admin";
        const isMe = u.uid === state.user.uid;
        return (
          '<div style="padding:14px 0;border-bottom:1px solid var(--border);display:flex;gap:14px;align-items:center;">' +
          '<div class="user-avatar" style="width:34px;height:34px;font-size:13px;">' +
          initials(u.name || u.email || "?") +
          "</div>" +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;color:#fff;font-weight:600;">' +
          escapeHTML(u.name || "—") +
          (isMe ? " (you)" : "") +
          "</div>" +
          '<div style="font-size:11.5px;color:var(--text-mute);">' +
          escapeHTML(u.email || "") +
          " · " +
          escapeHTML(u.school || "—") +
          " · " +
          escapeHTML(u.curriculum || "") +
          " " +
          escapeHTML(u.level || "") +
          "</div>" +
          "</div>" +
          (isAdmin ? '<span class="badge badge-success">Admin</span>' : "") +
          '<button class="btn btn-sm ' +
          (isAdmin ? "btn-ghost" : "btn-primary") +
          '" type="button" data-toggle-admin="' +
          u.uid +
          '" data-role="' +
          (u.role || "student") +
          '">' +
          (isAdmin ? "Demote" : "Promote") +
          "</button>" +
          "</div>"
        );
      })
      .join("");

    els.usersList
      .querySelectorAll("[data-toggle-admin]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          handleToggleAdmin(btn.dataset.toggleAdmin, btn.dataset.role);
        });
      });
  } catch (e) {
    log.warn("Could not load users:", e);
    els.usersList.innerHTML =
      '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load users</div><div class="empty-sub">' +
      escapeHTML(e.message || "Check permissions.") +
      "</div></div>";
  }
}

async function handleToggleAdmin(uid, currentRole) {
  const isAdmin = currentRole === "admin";
  const verb = isAdmin ? "demote" : "promote";

  const ok = await confirmDialog({
    title: (isAdmin ? "Demote" : "Promote") + " user?",
    message:
      "Do you want to " +
      verb +
      " this user to " +
      (isAdmin ? "student" : "admin") +
      "?",
    okLabel: isAdmin ? "Demote" : "Promote",
    cancelLabel: "Cancel",
  });
  if (!ok) return;

  try {
    if (isAdmin) await demoteUser(uid);
    else await promoteUser(uid);
    toastOk("User " + (isAdmin ? "demoted" : "promoted"));
    loadUsers();
  } catch (e) {
    log.warn("Toggle admin failed:", e);
    toastErr("Could not change role.");
  }
}

/* =========================================================
   NOTES TAB
   ========================================================= */

async function loadNotes() {
  if (!els.notesList) return;
  els.notesList.innerHTML = '<div class="spinner"></div>';

  try {
    const notes = await listNotes({ limitCount: 200 });
    state.notes = notes;

    if (!notes.length) {
      els.notesList.innerHTML =
        '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">📖</div><div class="empty-title">No notes yet</div><div class="empty-sub">Add one above.</div></div>';
      return;
    }

    els.notesList.innerHTML = notes
      .map(function (n) {
        const color = getSubjectColor(n.subject);
        const icon = getSubjectIcon(n.subject);
        return (
          '<div style="padding:14px 0;border-bottom:1px solid var(--border);display:flex;gap:14px;align-items:flex-start;">' +
          '<div style="background:' +
          color +
          "22;color:" +
          color +
          ';width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' +
          icon +
          "</div>" +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;color:#fff;font-weight:600;margin-bottom:4px;">' +
          escapeHTML(n.topic || "Untitled") +
          "</div>" +
          '<div style="font-size:11.5px;color:var(--text-mute);">' +
          escapeHTML(n.subject || "") +
          " · " +
          escapeHTML(n.curriculum || "") +
          " " +
          escapeHTML(n.level || "") +
          " · " +
          (n.keyPoints || []).length +
          " key points</div>" +
          "</div>" +
          '<button class="elb-remove" type="button" data-delete-note="' +
          n.id +
          '" title="Delete">×</button>' +
          "</div>"
        );
      })
      .join("");

    els.notesList
      .querySelectorAll("[data-delete-note]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          handleDeleteNote(btn.dataset.deleteNote);
        });
      });
  } catch (e) {
    log.warn("Could not load notes:", e);
    els.notesList.innerHTML =
      '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load notes</div><div class="empty-sub">' +
      escapeHTML(e.message || "Check permissions.") +
      "</div></div>";
  }
}

async function handleDeleteNote(id) {
  const ok = await confirmDialog({
    title: "Delete note?",
    message: "This will remove it for everyone.",
    okLabel: "Delete",
    cancelLabel: "Cancel",
    danger: true,
  });
  if (!ok) return;

  try {
    await deleteNote(id);
    toastOk("Note deleted");
    loadNotes();
    loadStats();
  } catch (e) {
    log.warn("Delete failed:", e);
    toastErr("Could not delete note.");
  }
}

function showNoteError(msg) {
  if (!els.noteFormError) return;
  els.noteFormError.textContent = msg;
  els.noteFormError.classList.remove("hidden");
}

function clearNoteError() {
  if (!els.noteFormError) return;
  els.noteFormError.classList.add("hidden");
  els.noteFormError.textContent = "";
}

async function handleAddNote() {
  clearNoteError();

  const subject = els.noteSubjectSelect?.value || "";
  const level = (els.noteLevel?.value || "").trim();
  const topic = (els.noteTopicInput?.value || "").trim();
  const summary = (els.noteSummaryInput?.value || "").trim();
  const keyPoints = (els.noteKeyPointsInput?.value || "")
    .split("\n")
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean);

  if (!subject) return showNoteError("Please choose a subject.");
  if (!topic) return showNoteError("Topic is required.");
  if (!level) return showNoteError("Level is required (e.g. Form 4, Grade 8).");

  els.addNoteBtn.disabled = true;
  els.addNoteBtn.textContent = "Adding…";

  try {
    await addNote({
      subject,
      topic,
      summary,
      keyPoints,
      curriculum: subject.match(/^(Grade)/) ? "CBE" : "844",
      level,
    });
    toastOk("Note added");
    if (els.noteTopicInput) els.noteTopicInput.value = "";
    if (els.noteSummaryInput) els.noteSummaryInput.value = "";
    if (els.noteKeyPointsInput) els.noteKeyPointsInput.value = "";
    loadNotes();
    loadStats();
  } catch (e) {
    log.warn("Add note failed:", e);
    showNoteError(e.message || "Could not add note.");
  } finally {
    els.addNoteBtn.disabled = false;
    els.addNoteBtn.textContent = "Add Note →";
  }
}

/* =========================================================
   EXAM LINKS TAB
   ========================================================= */

async function loadExamLinks() {
  if (!els.examLinksList) return;
  els.examLinksList.innerHTML = '<div class="spinner"></div>';

  try {
    const links = await listExamLinks({ limitCount: 200 });
    state.examLinks = links;

    if (!links.length) {
      els.examLinksList.innerHTML =
        '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">🔗</div><div class="empty-title">No exam links yet</div><div class="empty-sub">Add one above.</div></div>';
      return;
    }

    els.examLinksList.innerHTML = links
      .map(function (l) {
        return (
          '<div style="padding:14px 0;border-bottom:1px solid var(--border);display:flex;gap:14px;align-items:center;">' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;color:#fff;font-weight:600;margin-bottom:4px;">' +
          escapeHTML(l.title || "") +
          "</div>" +
          '<div style="font-size:11.5px;color:var(--text-mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
          escapeHTML(l.subject || "") +
          " · " +
          escapeHTML(l.type || "") +
          " · " +
          escapeHTML(l.url || "") +
          "</div>" +
          "</div>" +
          '<button class="elb-remove" type="button" data-delete-exam="' +
          l.id +
          '" title="Delete">×</button>' +
          "</div>"
        );
      })
      .join("");

    els.examLinksList
      .querySelectorAll("[data-delete-exam]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          handleDeleteExamLink(btn.dataset.deleteExam);
        });
      });
  } catch (e) {
    log.warn("Could not load exam links:", e);
    els.examLinksList.innerHTML =
      '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load exam links</div></div>';
  }
}

async function handleDeleteExamLink(id) {
  const ok = await confirmDialog({
    title: "Delete exam link?",
    message: "This will remove it for everyone.",
    okLabel: "Delete",
    cancelLabel: "Cancel",
    danger: true,
  });
  if (!ok) return;

  try {
    await deleteExamLink(id);
    toastOk("Exam link deleted");
    loadExamLinks();
    loadStats();
  } catch (e) {
    log.warn("Delete failed:", e);
    toastErr("Could not delete exam link.");
  }
}

function showExamError(msg) {
  if (!els.examFormError) return;
  els.examFormError.textContent = msg;
  els.examFormError.classList.remove("hidden");
}

function clearExamError() {
  if (!els.examFormError) return;
  els.examFormError.classList.add("hidden");
  els.examFormError.textContent = "";
}

async function handleAddExamLink() {
  clearExamError();

  const title = (els.examTitleInput?.value || "").trim();
  const url = (els.examUrlInput?.value || "").trim();
  const subject = els.examSubjectSelect?.value || "";
  const type = els.examTypeSelect?.value || "papers";
  const level = (els.examLevelInput?.value || "").trim();

  if (!title) return showExamError("Title is required.");
  if (!url) return showExamError("URL is required.");
  if (!isValidURL(url)) return showExamError("Please paste a valid URL.");
  if (!subject) return showExamError("Please choose a subject.");

  els.addExamBtn.disabled = true;
  els.addExamBtn.textContent = "Adding…";

  try {
    await addExamLink({
      title,
      url,
      subject,
      type,
      level,
      curriculum: state.userDoc?.curriculum || "844",
      createdBy: state.user?.uid || "",
      createdByName: state.userDoc?.name || "",
    });
    toastOk("Exam link added");
    if (els.examTitleInput) els.examTitleInput.value = "";
    if (els.examUrlInput) els.examUrlInput.value = "";
    loadExamLinks();
    loadStats();
  } catch (e) {
    log.warn("Add exam link failed:", e);
    showExamError(e.message || "Could not add exam link.");
  } finally {
    els.addExamBtn.disabled = false;
    els.addExamBtn.textContent = "Add Exam Link →";
  }
}

/* =========================================================
   FILES TAB
   ========================================================= */

function populateFileTypeSelect() {
  if (!els.fileTypeSelect) return;
  els.fileTypeSelect.innerHTML = Object.keys(FILE_TYPES)
    .map(function (key) {
      const meta = FILE_TYPES[key];
      return (
        '<option value="' +
        key +
        '">' +
        meta.icon +
        " " +
        meta.label +
        "</option>"
      );
    })
    .join("");
  els.fileTypeSelect.value = "pastPaper";
}

async function loadFiles() {
  if (!els.filesList) return;
  els.filesList.innerHTML = '<div class="spinner"></div>';

  try {
    const files = await fetchFiles({ limitCount: 200 });
    state.files = files;

    if (!files.length) {
      els.filesList.innerHTML =
        '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">📁</div><div class="empty-title">No files yet</div><div class="empty-sub">Paste a Google Drive link above to create the first file button.</div></div>';
      return;
    }

    els.filesList.innerHTML = files
      .map(function (f) {
        const meta = getFileTypeMeta(f.type);
        return (
          '<div style="padding:14px 0;border-bottom:1px solid var(--border);display:flex;gap:14px;align-items:center;">' +
          '<div style="background:' +
          meta.color +
          "22;color:" +
          meta.color +
          ';width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' +
          meta.icon +
          "</div>" +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13.5px;color:#fff;font-weight:600;margin-bottom:4px;">' +
          escapeHTML(f.title || "") +
          "</div>" +
          '<div style="font-size:11.5px;color:var(--text-mute);">' +
          escapeHTML(f.subject || "") +
          " · " +
          escapeHTML(meta.label) +
          " · " +
          escapeHTML(f.level || "") +
          "</div>" +
          "</div>" +
          '<button class="elb-remove" type="button" data-delete-file="' +
          f.id +
          '" title="Delete">×</button>' +
          "</div>"
        );
      })
      .join("");

    els.filesList
      .querySelectorAll("[data-delete-file]")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          handleDeleteFile(btn.dataset.deleteFile);
        });
      });
  } catch (e) {
    log.warn("Could not load files:", e);
    els.filesList.innerHTML =
      '<div class="empty-state" style="border:none;background:none;"><div class="empty-icon">⚠️</div><div class="empty-title">Could not load files</div></div>';
  }
}

async function handleDeleteFile(id) {
  const ok = await confirmDialog({
    title: "Delete file?",
    message: "This removes the button for everyone.",
    okLabel: "Delete",
    cancelLabel: "Cancel",
    danger: true,
  });
  if (!ok) return;

  try {
    const success = await removeFile(id);
    if (success) {
      toastOk("File deleted");
      loadFiles();
    } else {
      toastErr("Could not delete file.");
    }
  } catch (e) {
    log.warn("Delete file failed:", e);
    toastErr("Could not delete file.");
  }
}

function showFileError(msg) {
  if (!els.fileFormError) return;
  els.fileFormError.textContent = msg;
  els.fileFormError.classList.remove("hidden");
}

function clearFileError() {
  if (!els.fileFormError) return;
  els.fileFormError.classList.add("hidden");
  els.fileFormError.textContent = "";
}

async function handleAddFile() {
  clearFileError();

  const title = (els.fileTitleInput?.value || "").trim();
  const driveUrl = (els.fileUrlInput?.value || "").trim();
  const subject = els.fileSubjectSelect?.value || "";
  const type = els.fileTypeSelect?.value || "other";
  const level = (els.fileLevelInput?.value || "").trim();

  if (!title) return showFileError("Title is required.");
  if (!driveUrl) return showFileError("Google Drive link is required.");
  if (!parseDriveUrl(driveUrl)) {
    return showFileError(
      "Invalid Google Drive link. Make sure it's a share link like https://drive.google.com/file/d/.../view",
    );
  }
  if (!subject) return showFileError("Please choose a subject.");

  els.addFileBtn.disabled = true;
  els.addFileBtn.textContent = "Adding…";

  try {
    await addFile({
      title,
      driveUrl,
      subject,
      type,
      level,
      curriculum: state.userDoc?.curriculum || "844",
      createdBy: state.user?.uid || "",
      createdByName: state.userDoc?.name || "",
    });
    toastOk("File added — check the notes page");
    if (els.fileTitleInput) els.fileTitleInput.value = "";
    if (els.fileUrlInput) els.fileUrlInput.value = "";
    loadFiles();
  } catch (e) {
    log.warn("Add file failed:", e);
    showFileError(e.message || "Could not add file.");
  } finally {
    els.addFileBtn.disabled = false;
    els.addFileBtn.textContent = "Add File Button →";
  }
}

/* =========================================================
   BULK ADD (existing)
   ========================================================= */

function parseBulkText(text) {
  const questions = [];
  const errors = [];
  const blocks = text
    .split(/\n\s*---\s*\n|\n\n\n+/)
    .map(function (b) {
      return b.trim();
    })
    .filter(Boolean);

  blocks.forEach(function (block, blockIdx) {
    const lines = block.split("\n").map(function (l) {
      return l.trim();
    });
    const q = {
      exam: "",
      subject: "",
      topic: "",
      question: "",
      markpoints: [],
      explain: "",
    };
    let inQuestion = false;

    lines.forEach(function (line) {
      if (!line) return;
      const match = line.match(/^([A-Z][A-Z\s]*?):\s*(.*)$/i);
      if (match) {
        const key = match[1].toUpperCase().trim();
        const value = match[2].trim();
        switch (key) {
          case "EXAM":
            q.exam = value.toUpperCase();
            inQuestion = false;
            break;
          case "SUBJECT":
            q.subject = value;
            inQuestion = false;
            break;
          case "TOPIC":
            q.topic = value;
            inQuestion = false;
            break;
          case "QUESTION":
          case "Q":
            q.question = value;
            inQuestion = true;
            break;
          case "MARKPOINT":
          case "MARK":
          case "MP":
            if (value) q.markpoints.push(value);
            inQuestion = false;
            break;
          case "EXPLAIN":
          case "EXPLANATION":
            q.explain = value;
            inQuestion = false;
            break;
          default:
            if (inQuestion) q.question += " " + line;
        }
      } else if (inQuestion) {
        q.question += " " + line;
      }
    });

    const blockErrors = [];
    if (!q.exam) blockErrors.push("missing EXAM");
    else if (["KCSE", "KJSEA", "KPSEA"].indexOf(q.exam) === -1)
      blockErrors.push('invalid EXAM "' + q.exam + '"');
    if (!q.subject) blockErrors.push("missing SUBJECT");
    if (!q.topic) blockErrors.push("missing TOPIC");
    if (!q.question) blockErrors.push("missing QUESTION");
    if (q.markpoints.length < 1) blockErrors.push("needs at least 1 MARKPOINT");

    if (blockErrors.length)
      errors.push(
        "Question #" + (blockIdx + 1) + ": " + blockErrors.join(", "),
      );
    else
      questions.push(
        Object.assign({}, q, { totalMarks: q.markpoints.length, type: "open" }),
      );
  });

  return { questions: questions, errors: errors };
}

function previewBulk() {
  if (!els.bulkText || !els.bulkPreview || !els.bulkUploadBtn) return;
  const text = els.bulkText.value.trim();
  if (!text) {
    els.bulkPreview.classList.add("hidden");
    els.bulkUploadBtn.disabled = true;
    return;
  }

  const parsed = parseBulkText(text);
  const questions = parsed.questions;
  const errors = parsed.errors;
  els.bulkPreview.classList.remove("hidden");

  if (errors.length) {
    els.bulkPreviewTitle.textContent =
      "⚠️ " + errors.length + " problem" + (errors.length === 1 ? "" : "s");
    els.bulkPreviewTitle.style.color = "#fca5a5";
    els.bulkPreviewList.innerHTML = errors
      .map(function (e) {
        return '<div class="bulk-error-line">' + escapeHTML(e) + "</div>";
      })
      .join("");
    els.bulkUploadBtn.disabled = true;
  } else {
    els.bulkPreviewTitle.textContent =
      "✓ " +
      questions.length +
      " question" +
      (questions.length === 1 ? "" : "s") +
      " ready";
    els.bulkPreviewTitle.style.color = "var(--green-2)";
    els.bulkPreviewList.innerHTML = questions
      .map(function (q, i) {
        return (
          '<div class="bulk-preview-item"><div class="bulk-preview-num">' +
          (i + 1) +
          '</div><div class="bulk-preview-body"><div class="bulk-preview-meta">' +
          escapeHTML(q.exam) +
          " · " +
          escapeHTML(q.subject) +
          " · " +
          escapeHTML(q.topic) +
          '</div><div class="bulk-preview-q">' +
          escapeHTML(q.question) +
          '</div><div class="bulk-preview-marks">' +
          q.markpoints.length +
          " markpoint" +
          (q.markpoints.length === 1 ? "" : "s") +
          "</div></div></div>"
        );
      })
      .join("");
    els.bulkUploadBtn.disabled = false;
  }
}

async function uploadBulk() {
  if (!els.bulkText || !els.bulkUploadBtn) return;
  const text = els.bulkText.value.trim();
  const parsed = parseBulkText(text);
  const questions = parsed.questions;
  const errors = parsed.errors;

  if (errors.length) return toastErr("Fix the errors before uploading.");
  if (!questions.length) return toastErr("Nothing to upload.");

  els.bulkUploadBtn.disabled = true;
  els.bulkUploadBtn.textContent = "Uploading…";
  if (els.bulkProgress) els.bulkProgress.classList.remove("hidden");

  let success = 0,
    failed = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const pct = Math.round(((i + 1) / questions.length) * 100);
    if (els.bulkBar) els.bulkBar.style.width = pct + "%";
    if (els.bulkStatus)
      els.bulkStatus.textContent =
        "Uploading " + (i + 1) + " of " + questions.length + "…";
    try {
      await addQuestion({
        exam: q.exam,
        subject: q.subject,
        topic: q.topic,
        q: q.question,
        markpoints: q.markpoints,
        totalMarks: q.totalMarks,
        explain: q.explain,
        type: "open",
      });
      success++;
    } catch (e) {
      log.warn("Upload failed for question", i + 1, e);
      failed++;
    }
  }

  if (els.bulkStatus)
    els.bulkStatus.textContent =
      "Done. " + success + " added, " + failed + " failed.";
  toastOk(
    "✓ " +
      success +
      " questions added" +
      (failed ? ", " + failed + " failed" : ""),
  );

  if (success > 0) {
    setTimeout(function () {
      if (els.bulkText) els.bulkText.value = "";
      previewBulk();
      if (els.bulkProgress) els.bulkProgress.classList.add("hidden");
      if (els.bulkBar) els.bulkBar.style.width = "0%";
    }, 2200);
  }

  els.bulkUploadBtn.disabled = false;
  els.bulkUploadBtn.textContent = "Add All to Firestore →";
  loadQuestions();
  loadStats();
}

function wireBulk() {
  els.bulkText?.addEventListener("input", debounce(previewBulk, 300));
  els.bulkUploadBtn?.addEventListener("click", uploadBulk);
  els.bulkClearBtn?.addEventListener("click", function () {
    if (els.bulkText) els.bulkText.value = "";
    previewBulk();
  });
  els.showBulkFormat?.addEventListener("click", function () {
    els.bulkFormat?.classList.toggle("hidden");
  });
}

/* =========================================================
   SEED
   ========================================================= */

function setSeedProgress(pct, message) {
  if (!els.seedProgress || !els.seedBar || !els.seedStatus) return;
  els.seedProgress.classList.remove("hidden");
  els.seedBar.style.width = pct + "%";
  els.seedStatus.textContent = message;
}

async function handleSeedQuestions() {
  if (state.seeding) return;
  state.seeding = true;
  setSeedProgress(10, "Seeding " + SEED_QUESTIONS.length + " questions…");
  try {
    const result = await seedQuestions();
    setSeedProgress(
      100,
      "Added " + result.added + " · " + result.failed + " failed",
    );
    toastOk("✓ Seeded " + result.added + " questions");
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
  setSeedProgress(10, "Seeding " + SEED_NOTES.length + " notes…");
  try {
    const result = await seedNotes();
    setSeedProgress(
      100,
      "Added " + result.added + " · " + result.failed + " failed",
    );
    toastOk("✓ Seeded " + result.added + " notes");
    loadStats();
    loadNotes();
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
    message:
      "This will add " +
      SEED_QUESTIONS.length +
      " questions and " +
      SEED_NOTES.length +
      " notes.",
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
      "Done! " + qResult.added + " questions, " + nResult.added + " notes.",
    );
    toastOk("✓ Seeded " + (qResult.added + nResult.added) + " items");
    loadStats();
    loadQuestions();
    loadNotes();
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
    message:
      "Signed in as " +
      (state.user?.email || "Admin") +
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
   INIT
   ========================================================= */

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();
    populateSubjectSelects();
    populateFileTypeSelect();

    document.querySelectorAll(".admin-tabs .lb-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        switchTab(tab.dataset.tab);
      });
    });

    // Content
    els.toggleAddQuestion?.addEventListener("click", function () {
      els.addQuestionForm?.classList.toggle("hidden");
    });
    els.addQuestionBtn?.addEventListener("click", handleAddQuestion);
    els.refreshQuestions?.addEventListener("click", loadQuestions);
    els.refreshUsers?.addEventListener("click", loadUsers);

    // Notes
    els.addNoteBtn?.addEventListener("click", handleAddNote);
    els.refreshNotes?.addEventListener("click", loadNotes);

    // Exam links
    els.addExamBtn?.addEventListener("click", handleAddExamLink);
    els.refreshExamLinks?.addEventListener("click", loadExamLinks);

    // Files
    els.addFileBtn?.addEventListener("click", handleAddFile);
    els.refreshFiles?.addEventListener("click", loadFiles);

    // Bulk
    wireBulk();

    // Seed
    els.seedAllBtn?.addEventListener("click", handleSeedAll);
    els.seedQuestionsBtn?.addEventListener("click", handleSeedQuestions);
    els.seedNotesBtn?.addEventListener("click", handleSeedNotes);

    els.userMenuBtn?.addEventListener("click", handleUserMenu);

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
