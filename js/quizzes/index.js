// js/quizzes/index.js
// Central registry for all quiz files.
// Uncomment imports as you finish each quiz and add it to QUIZZES.

/* =========================================================
   CBE — Grade 6 (KPSEA)
   ========================================================= */
// import cbeGrade6English1 from "./cbe-grade6/english-1.js";

/* =========================================================
   CBE — Grades 7-9 (KJSEA)
   ========================================================= */
// import cbeGrade79English1 from "./cbe-grade79/english-1.js";

/* =========================================================
   CBE — Grades 10-12 (KCSE)
   ========================================================= */
// import cbeGrade1012English1 from "./cbe-grade1012/english-1.js";

/* =========================================================
   8-4-4 — Form 1-4
   ========================================================= */
// import form844English1 from "./844/english-1.js";

/* =========================================================
   QUIZ REGISTRY
   ========================================================= */

export const QUIZZES = [
  // cbeGrade6English1,
  // cbeGrade79English1,
  // cbeGrade1012English1,
  // form844English1,
];

/* =========================================================
   LOOKUP HELPERS
   ========================================================= */

export function getPublishedQuizzes() {
  return QUIZZES.filter((q) => q.status === "published");
}

export function getQuizzesByExam(exam) {
  return QUIZZES.filter((q) => q.exam === exam && q.status === "published");
}

export function getQuizzesByExamAndSubject(exam, subject) {
  return QUIZZES.filter(
    (q) => q.exam === exam && q.subject === subject && q.status === "published",
  );
}

export function getQuizzesByCurriculum(curriculum) {
  return QUIZZES.filter(
    (q) => q.curriculum === curriculum && q.status === "published",
  );
}

export function getQuizzesByGrade(grade) {
  return QUIZZES.filter((q) => q.grade === grade && q.status === "published");
}

export function getAllSubjectsForExam(exam) {
  return [...new Set(getQuizzesByExam(exam).map((q) => q.subject))];
}

export function hasQuiz(exam, subject) {
  return getQuizzesByExamAndSubject(exam, subject).length > 0;
}
