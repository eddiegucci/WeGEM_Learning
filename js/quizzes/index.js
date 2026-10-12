// js/quizzes/index.js
// Hybrid quiz registry — reads published quizzes AND exposes
// every subject slot (so empty ones still appear in dropdowns).

import { PUBLISHED_PATHS } from "./_published.js";
import { SUBJECTS_BY_CURRICULUM } from "../data/subjects.js";

/* =========================================================
   LOAD PUBLISHED QUIZZES
   ========================================================= */

const modules = await Promise.all(
  PUBLISHED_PATHS.map((path) => import(path).catch(() => null)),
);

export const QUIZZES = modules
  .filter((m) => m && m.default)
  .map((m) => m.default);

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
   GET ALL SUBJECTS (INCLUDING EMPTY ONES)
   ========================================================= */

/**
 * Returns every subject the user's class should study,
 * whether or not there's a published quiz for it.
 */
export function getAllSubjectsForUser(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) return [];

  // For 844 curriculum, subjects.js has keys like "844"
  // For CBE, keys are "CBE" with grade entries
  let subjectSource = SUBJECTS_BY_CURRICULUM[resolved.curriculum];
  if (!subjectSource) return [];

  // subjects.js may use either "Form 4" or "Grade 9" as key
  const classKey = resolved.level; // e.g., "Form 4" or "Grade 9"
  let subjects = subjectSource[classKey];

  // If not found directly, try alternative keys
  if (!subjects) {
    const keys = Object.keys(subjectSource);
    const match = keys.find((k) =>
      k.toLowerCase().includes(classKey.toLowerCase().split(" ")[1]),
    );
    if (match) subjects = subjectSource[match];
  }

  return subjects || [];
}

/* =========================================================
   FILTER PUBLISHED QUIZZES
   ========================================================= */

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
