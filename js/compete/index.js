// js/compete/index.js
// Lazy-loaded compete registry — does NOT import all banks at page load.

import { SUBJECTS_BY_CURRICULUM } from "../data/subjects.js";

/* =========================================================
   LAZY LOADER
   ========================================================= */

let _loaded = false;
let _BANKS = [];

export async function loadBanks() {
  if (_loaded) return _BANKS;

  const { COMPETE_PATHS } = await import("./_compete.js");

  const modules = await Promise.all(
    COMPETE_PATHS.map((path) => import(path).catch(() => null)),
  );

  _BANKS = modules.filter((m) => m && m.default).map((m) => m.default);

  _loaded = true;
  return _BANKS;
}

export function getLoadedBanks() {
  return _BANKS;
}

/* =========================================================
   RESOLVE USER CLASS
   ========================================================= */

export function resolveUserClass(curriculum, level) {
  if (!curriculum || !level) return null;
  const curr = String(curriculum).trim();
  const lvl = String(level).trim().toLowerCase();

  if (curr === "CBE" || curr.toLowerCase() === "cbe") {
    const m = lvl.match(/^grade\s*(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 6 && n <= 12)
        return {
          curriculum: "cbe",
          classId: `grade-${n}`,
          level: `Grade ${n}`,
        };
    }
    return null;
  }

  if (curr === "8-4-4" || curr === "844") {
    const m = lvl.match(/^form\s*(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 4)
        return { curriculum: "844", classId: `form-${n}`, level: `Form ${n}` };
    }
    return null;
  }

  return null;
}

/* =========================================================
   FILTERING
   ========================================================= */

export function getBanksForUser(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) return [];
  return _BANKS.filter(
    (b) =>
      b &&
      b.status === "published" &&
      b.curriculum === resolved.curriculum &&
      b.class === resolved.classId &&
      Array.isArray(b.questions) &&
      b.questions.length > 0,
  );
}

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

export function hasAnyBank(curriculum, level) {
  return getBanksForUser(curriculum, level).length > 0;
}

export function getAllSubjectsForUser(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) return [];

  const source =
    SUBJECTS_BY_CURRICULUM[resolved.curriculum === "cbe" ? "CBE" : "844"];
  if (!source) return [];

  const classKey = resolved.level;
  let subjects = source[classKey];

  if (!subjects) {
    const numMatch = String(classKey).match(/\d+/);
    if (numMatch) {
      const matchKey = Object.keys(source).find((k) => k.includes(numMatch[0]));
      if (matchKey) subjects = source[matchKey];
    }
  }
  return subjects || [];
}
