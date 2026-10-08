// js/data/subjects.js
// Subject lists for WeGEM Learning, organized by curriculum and level.

/* =========================================================
   SUBJECTS BY CURRICULUM
   ========================================================= */

export const SUBJECTS_BY_CURRICULUM = {
  844: {
    "Form 1": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Biology",
      "Chemistry",
      "Physics",
      "Geography",
      "History",
      "CRE",
      "IRE",
      "Business Studies",
      "Agriculture",
      "Computer Studies",
    ],
    "Form 2": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Biology",
      "Chemistry",
      "Physics",
      "Geography",
      "History",
      "CRE",
      "IRE",
      "Business Studies",
      "Agriculture",
      "Computer Studies",
    ],
    "Form 3": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Biology",
      "Chemistry",
      "Physics",
      "Geography",
      "History",
      "CRE",
      "IRE",
      "Business Studies",
      "Agriculture",
      "Computer Studies",
    ],
    "Form 4": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Biology",
      "Chemistry",
      "Physics",
      "Geography",
      "History",
      "CRE",
      "IRE",
      "Business Studies",
      "Agriculture",
      "Computer Studies",
    ],
  },
  CBE: {
    "Grade 7": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Integrated Science",
      "Social Studies",
      "CRE",
      "IRE",
      "Business",
      "Agriculture",
      "Computer Studies",
      "Life Skills",
      "Pre-Technical",
    ],
    "Grade 8": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Integrated Science",
      "Social Studies",
      "CRE",
      "IRE",
      "Business",
      "Agriculture",
      "Computer Studies",
      "Life Skills",
      "Pre-Technical",
    ],
    "Grade 9": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Integrated Science",
      "Social Studies",
      "CRE",
      "IRE",
      "Business",
      "Agriculture",
      "Computer Studies",
      "Life Skills",
      "Pre-Technical",
    ],
  },
};

/* =========================================================
   SUBJECT ICONS
   ========================================================= */

export const SUBJECT_ICONS = {
  Mathematics: "📐",
  English: "📘",
  Kiswahili: "📕",
  Biology: "🧬",
  Chemistry: "⚗️",
  Physics: "⚛️",
  Geography: "🌍",
  History: "📜",
  CRE: "✝️",
  IRE: "☪️",
  Business: "💼",
  "Business Studies": "💼",
  Agriculture: "🌾",
  "Computer Studies": "💻",
  "Integrated Science": "🔬",
  "Social Studies": "🌐",
  "Life Skills": "💡",
  "Pre-Technical": "🔧",
};

/* =========================================================
   SUBJECT COLORS
   ========================================================= */

export const SUBJECT_COLORS = {
  Mathematics: "#fbbf24",
  English: "#3b82f6",
  Kiswahili: "#ef4444",
  Biology: "#10b981",
  Chemistry: "#14b8a6",
  Physics: "#8b5cf6",
  Geography: "#22c55e",
  History: "#f97316",
  CRE: "#a855f7",
  IRE: "#06b6d4",
  Business: "#ec4899",
  "Business Studies": "#ec4899",
  Agriculture: "#84cc16",
  "Computer Studies": "#06b6d4",
  "Integrated Science": "#14b8a6",
  "Social Studies": "#22c55e",
  "Life Skills": "#a78bfa",
  "Pre-Technical": "#f59e0b",
};

/* =========================================================
   EXAM TYPES BY CURRICULUM + LEVEL
   ========================================================= */

export const EXAM_BY_LEVEL = {
  844: {
    "Form 1": "KCSE",
    "Form 2": "KCSE",
    "Form 3": "KCSE",
    "Form 4": "KCSE",
  },
  CBE: {
    "Grade 7": "KPSEA",
    "Grade 8": "KPSEA",
    "Grade 9": "KJSEA",
  },
};

/* =========================================================
   HELPERS
   ========================================================= */

export function getSubjects(curriculum, level) {
  const byCurriculum = SUBJECTS_BY_CURRICULUM[curriculum] || {};
  return byCurriculum[level] || [];
}

export function getSubjectIcon(name) {
  return SUBJECT_ICONS[name] || "📚";
}

export function getSubjectColor(name) {
  return SUBJECT_COLORS[name] || "#fbbf24";
}

export function getExamForLevel(curriculum, level) {
  const byCurriculum = EXAM_BY_LEVEL[curriculum] || {};
  return byCurriculum[level] || "KCSE";
}

export function getLevelsForCurriculum(curriculum) {
  return Object.keys(SUBJECTS_BY_CURRICULUM[curriculum] || {});
}
