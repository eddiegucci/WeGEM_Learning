// js/compete/index.js
// Compete question bank registry — reads from _compete.js

import { COMPETE_PATHS } from "./_compete.js";

/* =========================================================
   LOAD ALL COMPETE BANKS
   ========================================================= */

const modules = await Promise.all(
  COMPETE_PATHS.map((path) => import(path).catch(() => null)),
);

export const COMPETE_BANKS = modules
  .filter((m) => m && m.default)
  .map((m) => m.default);

/* =========================================================
   RESOLVE USER CLASS
   Same logic as js/quizzes/index.js — kept identical.
   ========================================================= */

export function resolveUserClass(curriculum, level) {
  if (!curriculum || !level) return null;
  const curr = String(curriculum).trim();
  const lvl = String(level).trim().toLowerCase();

  if (curr === "CBE" || curr.toLowerCase() === "cbe") {
    const m = lvl.match(/^grade\s*(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 6 && n <= 12) {
        return {
          curriculum: "cbe",
          classId: `grade-${n}`,
          level: `Grade ${n}`,
        };
      }
    }
    return null;
  }

  if (curr === "8-4-4" || curr === "844") {
    const m = lvl.match(/^form\s*(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 4) {
        return { curriculum: "844", classId: `form-${n}`, level: `Form ${n}` };
      }
    }
    return null;
  }

  return null;
}

/* =========================================================
   FILTERING
   ========================================================= */

/**
 * All published compete banks for a specific class.
 */
export function getBanksForClass(curriculum, classId) {
  return COMPETE_BANKS.filter(
    (b) =>
      b &&
      b.status === "published" &&
      b.curriculum === curriculum &&
      b.class === classId &&
      Array.isArray(b.questions) &&
      b.questions.length > 0,
  );
}

/**
 * All published compete banks for the current user.
 */
export function getBanksForUser(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) return [];
  return getBanksForClass(resolved.curriculum, resolved.classId);
}

/**
 * Get a single bank for a subject.
 */
export function getBank(curriculum, level, subject) {
  const banks = getBanksForUser(curriculum, level);
  return banks.find((b) => b.subject === subject) || null;
}

/**
 * All subjects that have a published compete bank.
 */
export function getSubjectsWithBanks(curriculum, level) {
  return [...new Set(getBanksForUser(curriculum, level).map((b) => b.subject))];
}

/**
 * For each subject in the given list, attach its compete bank
 * (or null if no bank is published yet).
 * Returns: [{ subject, hasBank, bank }, ...]
 */
export function getAllSubjectsWithBankStatus(curriculum, level, allSubjects) {
  const banks = getBanksForUser(curriculum, level);
  const bankMap = {};
  banks.forEach((b) => {
    if (!bankMap[b.subject]) bankMap[b.subject] = b;
  });

  return (allSubjects || []).map((subject) => ({
    subject,
    hasBank: !!bankMap[subject],
    bank: bankMap[subject] || null,
  }));
}

/**
 * Quick check — does the user have any compete banks published?
 */
export function hasAnyBank(curriculum, level) {
  return getBanksForUser(curriculum, level).length > 0;
}
