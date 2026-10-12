// js/quizzes/index.js
// Central registry for all published quizzes.
//
// HOW TO ADD A QUIZ:
//   1. Edit a slot file (e.g., 844/form-4/biology-1.js)
//   2. Change status to "published"
//   3. Add an import line below
//   4. Add it to the QUIZZES array
//   5. git push

/* =========================================================
   IMPORTS — uncomment or add a line as you publish quizzes
   ========================================================= */

import form4Mathematics1 from "./844/form-4/mathematics-1.js";

// import form4Biology1 from "./844/form-4/biology-1.js";
// import form4Chemistry1 from "./844/form-4/chemistry-1.js";
// import form4Physics1 from "./844/form-4/physics-1.js";
// import form4English1 from "./844/form-4/english-1.js";
// import form4Kiswahili1 from "./844/form-4/kiswahili-1.js";

/* =========================================================
   REGISTRY
   ========================================================= */

export const QUIZZES = [form4Mathematics1];

/* =========================================================
   RESOLVE USER CLASS
   Maps a user's profile to a quiz folder key.
   ========================================================= */

export function resolveUserClass(curriculum, level) {
  if (!curriculum || !level) return null;

  const curr = String(curriculum).trim();
  const lvl = String(level).trim().toLowerCase();

  // CBE curriculum
  if (curr === "CBE" || curr.toLowerCase() === "cbe") {
    const m = lvl.match(/^grade\s*(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 6 && n <= 12)
        return { curriculum: "cbe", classId: `grade-${n}` };
    }
    return null;
  }

  // 8-4-4 curriculum
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

/* =========================================================
   FILTERING
   ========================================================= */

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
