// js/quizzes/index.js
// Central registry. Import all published quizzes here.

/* =========================================================
   IMPORTS — add a line for each quiz you publish
   ========================================================= */

// Example (uncomment when you have a published quiz):
// import cbeGrade9Biology1 from "./cbe/grade-9/biology-1.js";

/* =========================================================
   REGISTRY
   ========================================================= */

export const QUIZZES = [
  // cbeGrade9Biology1,
];

/* =========================================================
   QUERY HELPERS
   ========================================================= */

/**
 * Convert user curriculum + level into a folder path key.
 * Returns { curriculum, classId } or null if the combo is invalid.
 */
export function resolveUserClass(curriculum, level) {
  if (!curriculum || !level) return null;

  const curr = String(curriculum).trim();
  const lvl = String(level).trim().toLowerCase();

  // CBE: "CBE" + "Grade 9" → { curriculum: "cbe", classId: "grade-9" }
  if (curr === "CBE" || curr.toLowerCase() === "cbe") {
    const match = lvl.match(/^grade\s*(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= 6 && n <= 12) {
        return { curriculum: "cbe", classId: `grade-${n}` };
      }
    }
    return null;
  }

  // 8-4-4: "8-4-4" + "Form 4" → { curriculum: "844", classId: "form-4" }
  if (curr === "8-4-4" || curr === "844") {
    const match = lvl.match(/^form\s*(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= 4) {
        return { curriculum: "844", classId: `form-${n}` };
      }
    }
    return null;
  }

  return null;
}

/**
 * All published quizzes for a specific curriculum + class.
 */
export function getQuizzesForClass(curriculum, classId) {
  return QUIZZES.filter(
    (q) =>
      q.status === "published" &&
      q.curriculum === curriculum &&
      q.class === classId &&
      Array.isArray(q.questions) &&
      q.questions.length > 0,
  );
}

/**
 * Get quizzes for the current user based on their profile.
 */
export function getQuizzesForUser(curriculum, level) {
  const resolved = resolveUserClass(curriculum, level);
  if (!resolved) return [];
  return getQuizzesForClass(resolved.curriculum, resolved.classId);
}

/**
 * Unique subject names from a quiz list.
 */
export function getSubjects(quizzes) {
  return [...new Set(quizzes.map((q) => q.subject))];
}

/**
 * Quizzes matching a specific subject from a list.
 */
export function getSets(quizzes, subject) {
  return quizzes.filter((q) => q.subject === subject);
}
