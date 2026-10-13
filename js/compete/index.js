// js/compete/index.js
// Lazy-loaded compete registry. Only loads current user's curriculum.

import { SUBJECTS_BY_CURRICULUM } from "../data/subjects.js";

/* =========================================================
   STATE
   ========================================================= */

let _loadedCurriculum = null;
let _BANKS = [];
let _loadingPromise = null;

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
      if (n >= 7 && n <= 9) {
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
        return {
          curriculum: "844",
          classId: `form-${n}`,
          level: `Form ${n}`,
        };
      }
    }
    return null;
  }

  return null;
}

/* =========================================================
   LAZY LOADER
   ========================================================= */

async function loadModulesForCurriculum(curriculumKey) {
  const { COMPETE_PATHS } = await import("./_compete.js");

  const prefix = curriculumKey === "cbe" ? "./cbe/" : "./844/";
  const paths = COMPETE_PATHS.filter((p) => p.startsWith(prefix));

  const modules = await Promise.all(
    paths.map((p) =>
      import(/* @vite-ignore */ p).catch((err) => {
        console.warn("[compete] Failed to load:", p, err);
        return null;
      }),
    ),
  );

  return modules.filter((m) => m && m.default).map((m) => m.default);
}

export async function loadBanks(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) {
    _BANKS = [];
    _loadedCurriculum = null;
    return _BANKS;
  }

  if (_loadedCurriculum === resolved.curriculum && _BANKS.length) {
    return _BANKS;
  }

  if (_loadingPromise && _loadedCurriculum === resolved.curriculum) {
    await _loadingPromise;
    return _BANKS;
  }

  _loadedCurriculum = resolved.curriculum;
  _loadingPromise = loadModulesForCurriculum(resolved.curriculum);

  try {
    _BANKS = await _loadingPromise;
  } catch (e) {
    console.warn("[compete] Failed to load banks:", e);
    _BANKS = [];
  } finally {
    _loadingPromise = null;
  }

  return _BANKS;
}

export function getLoadedBanks() {
  return _BANKS;
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
