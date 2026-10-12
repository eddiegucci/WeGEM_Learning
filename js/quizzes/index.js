// js/quizzes/index.js
// Loads quizzes dynamically from the manual publish list.

import { PUBLISHED_PATHS } from "./_published.js";

const modules = await Promise.all(
  PUBLISHED_PATHS.map((path) => import(path).catch(() => null)),
);

export const QUIZZES = modules
  .filter((m) => m && m.default)
  .map((m) => m.default);

/* =========================================================
   HELPERS
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
        return { curriculum: "cbe", classId: `grade-${n}` };
    }
    return null;
  }

  if (curr === "8-4-4" || curr === "844") {
    const m = lvl.match(/^form\s*(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 4) return { curriculum: "844", classId: `form-${n}` };
    }
    return null;
  }

  return null;
}

export function getQuizzesForClass(curriculum, classId) {
  return QUIZZES.filter(
    (q) =>
      q &&
      q.status === "published" &&
      q.curriculum === curriculum &&
      q.class === classId &&
      Array.isArray(q.questions) &&
      q.questions.length > 0,
  );
}

export function getQuizzesForUser(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) return [];
  return getQuizzesForClass(resolved.curriculum, resolved.classId);
}

export function getSubjects(quizzes) {
  return [...new Set(quizzes.map((q) => q.subject))];
}

export function getSets(quizzes, subject) {
  return quizzes.filter((q) => q.subject === subject);
}

export function hasAnyQuiz(curriculum, level) {
  return getQuizzesForUser(curriculum, level).length > 0;
}
