// js/quizzes/index.js
// Lazy-loaded quiz registry.
// Loads only the current user's curriculum.
// Resolves all module paths to absolute URLs so dynamic import works
// regardless of what page calls it.

import { SUBJECTS_BY_CURRICULUM } from "../data/subjects.js";

/* =========================================================
   STATE
   ========================================================= */

let _loadedCurriculum = null;
let _QUIZZES = [];
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
   PATH RESOLUTION
   Converts "./844/form-1/english-1.js" → "/js/quizzes/844/form-1/english-1.js"
   ========================================================= */

function toAbsoluteUrl(relativePath) {
  // Strip leading "./" if present
  let clean = String(relativePath || "").trim();
  if (clean.startsWith("./")) clean = clean.slice(2);
  if (clean.startsWith("/")) clean = clean.slice(1);

  // Build absolute URL
  return new URL(`/js/quizzes/${clean}`, window.location.origin).href;
}

/* =========================================================
   LAZY LOADER
   ========================================================= */

async function loadModulesForCurriculum(curriculumKey) {
  const { PUBLISHED_PATHS } = await import("./_published.js");

  const prefix = curriculumKey === "cbe" ? "./cbe/" : "./844/";
  const paths = PUBLISHED_PATHS.filter((p) => p.startsWith(prefix));

  if (!paths.length) {
    console.warn(`[quiz] No paths listed for ${curriculumKey}`);
    return [];
  }

  const modules = await Promise.all(
    paths.map(async (p) => {
      const url = toAbsoluteUrl(p);
      try {
        return await import(url);
      } catch (err) {
        // 404s are expected until content is written — log at debug level
        console.warn(`[quiz] Failed to load: ${url}`, err.message || err);
        return null;
      }
    }),
  );

  return modules.filter((m) => m && m.default).map((m) => m.default);
}

export async function loadQuizzes(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) {
    _QUIZZES = [];
    _loadedCurriculum = null;
    return _QUIZZES;
  }

  // Already loaded this curriculum?
  if (_loadedCurriculum === resolved.curriculum && _QUIZZES.length) {
    return _QUIZZES;
  }

  // In-flight load? Wait for it.
  if (_loadingPromise && _loadedCurriculum === resolved.curriculum) {
    await _loadingPromise;
    return _QUIZZES;
  }

  _loadedCurriculum = resolved.curriculum;
  _loadingPromise = loadModulesForCurriculum(resolved.curriculum);

  try {
    _QUIZZES = await _loadingPromise;
    console.log(
      `[quiz] Loaded ${_QUIZZES.length} quizzes for ${resolved.curriculum}`,
    );
  } catch (e) {
    console.warn("[quiz] Failed to load quizzes:", e);
    _QUIZZES = [];
  } finally {
    _loadingPromise = null;
  }

  return _QUIZZES;
}

export function getLoadedQuizzes() {
  return _QUIZZES;
}

/* =========================================================
   FILTERING
   ========================================================= */

export function getQuizzesForUser(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) return [];
  return _QUIZZES.filter(
    (q) =>
      q &&
      q.status === "published" &&
      q.curriculum === resolved.curriculum &&
      q.class === resolved.classId &&
      Array.isArray(q.questions) &&
      q.questions.length > 0,
  );
}

export function getSubjects(quizzes) {
  return [...new Set(quizzes.map((q) => q.subject))];
}

export function getSets(quizzes, subject) {
  return quizzes.filter((q) => q.subject === subject);
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

export function hasAnyQuiz(curriculum, level) {
  return getQuizzesForUser(curriculum, level).length > 0;
}
