// js/quizzes/index.js
// Lazy-loaded quiz registry — does NOT import all quizzes at page load.

import { SUBJECTS_BY_CURRICULUM } from "../data/subjects.js";

/* =========================================================
   LAZY LOADER
   ========================================================= */

let _loaded = false;
let _QUIZZES = [];

export async function loadQuizzes() {
  if (_loaded) return _QUIZZES;

  const { PUBLISHED_PATHS } = await import("./_published.js");

  const modules = await Promise.all(
    PUBLISHED_PATHS.map((path) => import(path).catch(() => null)),
  );

  _QUIZZES = modules.filter((m) => m && m.default).map((m) => m.default);

  _loaded = true;
  return _QUIZZES;
}

export function getLoadedQuizzes() {
  return _QUIZZES;
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
