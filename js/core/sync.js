// js/core/sync.js
// Delta sync engine for WeGEM Learning.
// First load: fetches everything. Later loads: only changes.

import {
  getContentMeta,
  getQuestionsForSubject,
  getNotesForLevel,
  getExamLinks,
  getLeaderboard,
} from "./db.js";
import {
  cacheQuestions,
  cacheNotes,
  getCachedQuestions,
  getCachedNotes,
  setMeta,
  getMeta,
  clear,
  STORES,
  putMany,
} from "./cache.js";
import { log, isOnline } from "./utils.js";

/* =========================================================
   SYNC STATE
   ========================================================= */

const SYNC_FLAG = "wegem_synced_once";
const SYNC_STATUS_KEY = "wegem_sync_status";
const MANIFEST_KEY = "content_manifest";

let syncing = false;
const listeners = new Set();

function notify(status) {
  listeners.forEach((cb) => {
    try {
      cb(status);
    } catch (e) {
      log.error(e);
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
  return localStorage.getItem(SYNC_FLAG) === "1";
}

function markSynced() {
  try {
    localStorage.setItem(SYNC_FLAG, "1");
    localStorage.setItem(SYNC_STATUS_KEY, String(Date.now()));
  } catch {}
}

/* =========================================================
   MANIFEST-BASED DELTA SYNC
   ========================================================= */

/**
 * The manifest looks like:
 * {
 *   version: "2026-10-08T10:00:00Z",
 *   questions: { "KCSE-Mathematics": "2026-10-08T09:00:00Z", ... },
 *   notes: { "844-Form 4": "2026-10-08T08:00:00Z", ... },
 *   examLinks: "2026-10-08T07:00:00Z",
 *   leaderboard: "2026-10-08T06:00:00Z"
 * }
 */

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
    log.info("Offline, using cache only");
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
    const isFirstSync = !hasSyncedBefore();
    const localManifest = await getLocalManifest();

    let remoteManifest = null;
    try {
      remoteManifest = await getContentMeta();
    } catch (e) {
      log.warn("Could not fetch manifest, using local cache only:", e);
      notify({ state: "error", error: e });
      return { ...result, error: "manifest-failed" };
    }

    // If first sync, or forced, or no manifest — do a full sync
    if (isFirstSync || force || !remoteManifest || !localManifest.version) {
      log.info("Performing full sync");
      result.fullSync = true;
      await fullSync({ exam, subject, curriculum, level });
      if (remoteManifest) await saveLocalManifest(remoteManifest);
      markSynced();
      notify({ state: "done", fullSync: true });
      return result;
    }

    // Otherwise, only fetch what changed
    if (remoteManifest.version === localManifest.version) {
      log.info("Already up to date");
      notify({ state: "done", upToDate: true });
      return result;
    }

    log.info("Performing delta sync");

    // Questions changed?
    const questionsChanged = detectChanges(
      localManifest.questions,
      remoteManifest.questions,
    );
    if (questionsChanged.length) {
      for (const key of questionsChanged) {
        const [examKey, subjectKey] = key.split("::");
        try {
          const qs = await getQuestionsForSubject(examKey, subjectKey);
          await cacheQuestions(qs);
          result.questionsUpdated += qs.length;
        } catch (e) {
          log.warn(`Could not sync questions for ${key}:`, e);
        }
      }
    }

    // Notes changed?
    const notesChanged = detectChanges(
      localManifest.notes,
      remoteManifest.notes,
    );
    if (notesChanged.length) {
      for (const key of notesChanged) {
        const [currKey, levelKey] = key.split("::");
        try {
          const ns = await getNotesForLevel(currKey, levelKey);
          await cacheNotes(ns);
          result.notesUpdated += ns.length;
        } catch (e) {
          log.warn(`Could not sync notes for ${key}:`, e);
        }
      }
    }

    // Exam links changed?
    if (remoteManifest.examLinks !== localManifest.examLinks) {
      try {
        const links = await getExamLinks();
        await putMany(
          STORES.CONTENT,
          links.map((l) => ({ ...l, type: "examLink" })),
        );
        result.examLinksUpdated = links.length;
      } catch (e) {
        log.warn("Could not sync exam links:", e);
      }
    }

    // Leaderboard changed?
    if (remoteManifest.leaderboard !== localManifest.leaderboard) {
      try {
        const lb = await getLeaderboard(100);
        const { cacheLeaderboard } = await import("./cache.js");
        await cacheLeaderboard(lb);
        result.leaderboardUpdated = lb.length;
      } catch (e) {
        log.warn("Could not sync leaderboard:", e);
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
   FULL SYNC (first launch or forced)
   ========================================================= */

async function fullSync({ exam, subject, curriculum, level } = {}) {
  log.info("Full sync starting");

  // Default scope if not provided
  const exams = exam ? [exam] : ["KCSE", "KJSEA", "KPSEA"];
  const subjectsByExam = {
    KCSE: subject
      ? [subject]
      : [
          "Mathematics",
          "English",
          "Kiswahili",
          "Biology",
          "Chemistry",
          "Physics",
          "Geography",
          "History",
          "CRE",
          "Business",
        ],
    KJSEA: subject
      ? [subject]
      : ["Mathematics", "Integrated Science", "English"],
    KPSEA: subject ? [subject] : ["Mathematics", "English", "Science"],
  };
  const curriculumList = curriculum ? [curriculum] : ["844", "CBE"];
  const levelsByCurriculum = {
    844: level ? [level] : ["Form 1", "Form 2", "Form 3", "Form 4"],
    CBE: level ? [level] : ["Grade 7", "Grade 8", "Grade 9"],
  };

  // Fetch questions
  for (const e of exams) {
    for (const s of subjectsByExam[e] || []) {
      try {
        const qs = await getQuestionsForSubject(e, s);
        if (qs.length) await cacheQuestions(qs);
      } catch (err) {
        log.warn(`Full sync: questions failed for ${e}/${s}:`, err);
      }
    }
  }

  // Fetch notes
  for (const c of curriculumList) {
    for (const lv of levelsByCurriculum[c] || []) {
      try {
        const ns = await getNotesForLevel(c, lv);
        if (ns.length) await cacheNotes(ns);
      } catch (err) {
        log.warn(`Full sync: notes failed for ${c}/${lv}:`, err);
      }
    }
  }

  // Exam links
  try {
    const links = await getExamLinks();
    if (links.length) {
      await putMany(
        STORES.CONTENT,
        links.map((l) => ({ ...l, type: "examLink" })),
      );
    }
  } catch (err) {
    log.warn("Full sync: exam links failed:", err);
  }

  // Leaderboard
  try {
    const lb = await getLeaderboard(100);
    const { cacheLeaderboard } = await import("./cache.js");
    if (lb.length) await cacheLeaderboard(lb);
  } catch (err) {
    log.warn("Full sync: leaderboard failed:", err);
  }

  log.info("Full sync complete");
}

/* =========================================================
   HELPERS
   ========================================================= */

function detectChanges(local = {}, remote = {}) {
  const changed = [];
  for (const key of Object.keys(remote)) {
    if (local[key] !== remote[key]) changed.push(key);
  }
  return changed;
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

export function forceFullSync() {
  try {
    localStorage.removeItem(SYNC_FLAG);
  } catch {}
  return clear(STORES.CONTENT).then(() => syncContent({ force: true }));
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
