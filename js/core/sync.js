// js/core/sync.js
// Delta sync engine for WeGEM Learning.
// Fixes: manifest key format now matches what seed.js writes.

import {
  getContentMeta,
  getQuestionsForSubject,
  getNotesForLevel,
  getExamLinks,
  getLeaderboard,
  saveAttempt,
  updateLeaderboardEntry,
} from "./db.js";
import {
  cacheQuestions,
  cacheNotes,
  cacheLeaderboard,
  cacheAttempt,
  getCachedQuestions,
  getCachedNotes,
  getPendingAttempts,
  setMeta,
  getMeta,
  clear,
  remove,
  STORES,
  putMany,
} from "./cache.js";
import { log, isOnline } from "./utils.js";

/* =========================================================
   CONSTANTS
   ========================================================= */

const SYNC_FLAG = "wegem_synced_once";
const SYNC_STATUS_KEY = "wegem_sync_status";
const MANIFEST_KEY = "content_manifest";

// Default scope when no manifest exists yet.
// Kept small — content is added via admin panel over time.
const DEFAULT_EXAMS = ["KCSE", "KJSEA", "KPSEA"];
const SUBJECTS_BY_EXAM = {
  KCSE: [
    "Mathematics",
    "English",
    "Kiswahili",
    "Biology",
    "Chemistry",
    "Physics",
    "Geography",
    "History",
    "CRE",
    "Business Studies",
  ],
  KJSEA: ["Mathematics", "Integrated Science", "English"],
  KPSEA: ["Mathematics", "English", "Science"],
};

/* =========================================================
   SYNC STATE
   ========================================================= */

let syncing = false;
const listeners = new Set();

function notify(status) {
  listeners.forEach((cb) => {
    try {
      cb(status);
    } catch (e) {
      log.error("Sync listener error:", e);
    }
  });
}

export function onSyncChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function isSyncing() {
  return syncing;
}

export function hasSyncedBefore() {
  try {
    return localStorage.getItem(SYNC_FLAG) === "1";
  } catch {
    return false;
  }
}

function markSynced() {
  try {
    localStorage.setItem(SYNC_FLAG, "1");
    localStorage.setItem(SYNC_STATUS_KEY, String(Date.now()));
  } catch {}
}

/* =========================================================
   MANIFEST HANDLING
   ========================================================= */

async function getLocalManifest() {
  const stored = await getMeta(MANIFEST_KEY);
  return (
    stored || {
      version: null,
      questions: {},
      notes: {},
      examLinks: null,
      leaderboard: null,
    }
  );
}

async function saveLocalManifest(manifest) {
  await setMeta(MANIFEST_KEY, manifest);
}

/**
 * Manifest shape (what seed.js / admin panel writes):
 * {
 *   version: "2026-10-13T10:00:00Z",
 *   questions: { "KCSE::Mathematics": "2026-10-13T09:00:00Z", ... },
 *   notes: { "844::Form 4": "2026-10-13T08:00:00Z", ... },
 *   examLinks: "2026-10-13T07:00:00Z",
 *   leaderboard: "2026-10-13T06:00:00Z"
 * }
 */
function detectChanges(local = {}, remote = {}) {
  const changed = [];
  for (const key of Object.keys(remote)) {
    if (local[key] !== remote[key]) changed.push(key);
  }
  return changed;
}

/* =========================================================
   MAIN SYNC
   ========================================================= */

export async function syncContent({
  force = false,
  exam,
  subject,
  curriculum,
  level,
} = {}) {
  if (syncing) {
    log.info("Sync already in progress, skipping");
    return { skipped: true };
  }

  if (!isOnline()) {
    notify({ state: "offline" });
    return { offline: true };
  }

  syncing = true;
  notify({ state: "start" });

  const result = {
    questionsUpdated: 0,
    notesUpdated: 0,
    examLinksUpdated: 0,
    leaderboardUpdated: 0,
    fullSync: false,
  };

  try {
    // First: flush any pending offline attempts to Firestore.
    await flushPendingAttempts();

    const isFirstSync = !hasSyncedBefore();
    const localManifest = await getLocalManifest();

    let remoteManifest = null;
    try {
      remoteManifest = await getContentMeta();
    } catch (e) {
      log.warn("Could not fetch manifest:", e);
    }

    // Full sync on first run, forced, or no remote manifest.
    if (isFirstSync || force || !remoteManifest || !localManifest.version) {
      log.info("Performing full sync");
      result.fullSync = true;
      const counts = await fullSync({ exam, subject, curriculum, level });
      result.questionsUpdated = counts.questions;
      result.notesUpdated = counts.notes;
      result.examLinksUpdated = counts.examLinks;
      result.leaderboardUpdated = counts.leaderboard;
      if (remoteManifest) await saveLocalManifest(remoteManifest);
      markSynced();
      notify({ state: "done", fullSync: true });
      return result;
    }

    // Up to date?
    if (remoteManifest.version === localManifest.version) {
      notify({ state: "done", upToDate: true });
      return result;
    }

    // Delta sync
    log.info("Performing delta sync");

    const questionsChanged = detectChanges(
      localManifest.questions,
      remoteManifest.questions,
    );
    for (const key of questionsChanged) {
      const [examKey, subjectKey] = key.split("::");
      if (!examKey || !subjectKey) continue;
      try {
        const qs = await getQuestionsForSubject(examKey, subjectKey);
        await cacheQuestions(qs);
        result.questionsUpdated += qs.length;
      } catch (e) {
        log.warn(`Sync questions failed for ${key}:`, e);
      }
    }

    const notesChanged = detectChanges(
      localManifest.notes,
      remoteManifest.notes,
    );
    for (const key of notesChanged) {
      const [currKey, levelKey] = key.split("::");
      if (!currKey || !levelKey) continue;
      try {
        const ns = await getNotesForLevel(currKey, levelKey);
        await cacheNotes(ns);
        result.notesUpdated += ns.length;
      } catch (e) {
        log.warn(`Sync notes failed for ${key}:`, e);
      }
    }

    if (remoteManifest.examLinks !== localManifest.examLinks) {
      try {
        const links = await getExamLinks();
        await putMany(
          STORES.CONTENT,
          links.map((l) => ({ ...l, type: "examLink" })),
        );
        result.examLinksUpdated = links.length;
      } catch (e) {
        log.warn("Sync exam links failed:", e);
      }
    }

    if (remoteManifest.leaderboard !== localManifest.leaderboard) {
      try {
        const lb = await getLeaderboard(100);
        await cacheLeaderboard(lb);
        result.leaderboardUpdated = lb.length;
      } catch (e) {
        log.warn("Sync leaderboard failed:", e);
      }
    }

    await saveLocalManifest(remoteManifest);
    markSynced();
    notify({ state: "done", result });
    return result;
  } catch (e) {
    log.error("Sync failed:", e);
    notify({ state: "error", error: e });
    return { ...result, error: e.message };
  } finally {
    syncing = false;
  }
}

/* =========================================================
   OFFLINE ATTEMPT FLUSH
   ========================================================= */

export async function flushPendingAttempts() {
  if (!isOnline()) return { flushed: 0 };

  let pending = [];
  try {
    pending = await getPendingAttempts();
  } catch {
    return { flushed: 0 };
  }

  if (!pending.length) return { flushed: 0 };

  // Group by uid — we only flush the current user's attempts.
  const byUid = {};
  pending.forEach((a) => {
    if (!a.uid) return;
    if (!byUid[a.uid]) byUid[a.uid] = [];
    byUid[a.uid].push(a);
  });

  let flushed = 0;

  for (const uid of Object.keys(byUid)) {
    for (const attempt of byUid[uid]) {
      try {
        const cloudId = await saveAttempt(uid, attempt);
        // Remove the local copy, replace with cloud-id one
        await remove(STORES.ATTEMPTS, attempt.id);
        await cacheAttempt({ ...attempt, id: cloudId, synced: true });

        await updateLeaderboardEntry(uid, {
          scoreDelta: attempt.score || 0,
          quizDelta: 1,
          correctDelta: attempt.correct || 0,
          totalDelta: attempt.total || 0,
        });

        flushed += 1;
      } catch (e) {
        log.warn("Could not flush attempt:", e);
      }
    }
  }

  if (flushed) log.info(`Flushed ${flushed} offline attempts`);
  return { flushed };
}

/* =========================================================
   FULL SYNC
   ========================================================= */

async function fullSync({ exam, subject, curriculum, level } = {}) {
  log.info("Full sync starting");

  const exams = exam ? [exam] : DEFAULT_EXAMS;
  const curriculumList = curriculum ? [curriculum] : ["844", "CBE"];

  let questions = 0;
  let notes = 0;
  let examLinks = 0;
  let leaderboard = 0;

  for (const e of exams) {
    const subjects = subject ? [subject] : SUBJECTS_BY_EXAM[e] || [];
    for (const s of subjects) {
      try {
        const qs = await getQuestionsForSubject(e, s);
        if (qs.length) {
          await cacheQuestions(qs);
          questions += qs.length;
        }
      } catch (e2) {
        log.warn(`Full sync questions failed ${e}/${s}:`, e2);
      }
    }
  }

  for (const c of curriculumList) {
    const levelKeys =
      c === "844"
        ? level
          ? [level]
          : ["Form 1", "Form 2", "Form 3", "Form 4"]
        : level
          ? [level]
          : ["Grade 7", "Grade 8", "Grade 9"];
    for (const lv of levelKeys) {
      try {
        const ns = await getNotesForLevel(c, lv);
        if (ns.length) {
          await cacheNotes(ns);
          notes += ns.length;
        }
      } catch (e2) {
        log.warn(`Full sync notes failed ${c}/${lv}:`, e2);
      }
    }
  }

  try {
    const links = await getExamLinks();
    if (links.length) {
      await putMany(
        STORES.CONTENT,
        links.map((l) => ({ ...l, type: "examLink" })),
      );
      examLinks = links.length;
    }
  } catch (e2) {
    log.warn("Full sync exam links failed:", e2);
  }

  try {
    const lb = await getLeaderboard(100);
    if (lb.length) {
      await cacheLeaderboard(lb);
      leaderboard = lb.length;
    }
  } catch (e2) {
    log.warn("Full sync leaderboard failed:", e2);
  }

  log.info("Full sync complete");
  return { questions, notes, examLinks, leaderboard };
}

/* =========================================================
   BACKGROUND SYNC
   ========================================================= */

export function scheduleBackgroundSync() {
  if (!isOnline()) return;
  setTimeout(() => {
    syncContent({ force: false }).catch((e) =>
      log.warn("Background sync failed:", e),
    );
  }, 2000);
}

export async function forceFullSync() {
  try {
    localStorage.removeItem(SYNC_FLAG);
  } catch {}
  await clear(STORES.CONTENT);
  return syncContent({ force: true });
}

/* =========================================================
   AUTO SYNC ON RECONNECT
   ========================================================= */

window.addEventListener("online", () => {
  log.info("Back online, syncing");
  scheduleBackgroundSync();
});

window.addEventListener("offline", () => {
  notify({ state: "offline" });
});
