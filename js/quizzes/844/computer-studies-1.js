export default {
  exam: "KCSE",
  subject: "Computer Studies",
  grade: "Grades 10-12",
  curriculum: "CBE",
  title: "Computer Studies — Set 1",
  description: "KCSE-style typed-answer assessment.",
  duration: 45 * 60,
  totalMarks: 5,
  status: "published", // ← CHANGE THIS
  updatedAt: "2026-10-08",
  version: "1.0",

  questions: [
    {
      q: "State two characteristics of a computer.",
      marks: 2,
      topic: "Introduction to Computers",
      markpoints: [
        { text: "speed", marks: 1 },
        { text: "accuracy", marks: 1 },
      ],
    },
    {
      q: "Define a computer.",
      marks: 3,
      topic: "Introduction to Computers",
      markpoints: [
        { text: "electronic device", marks: 1 },
        { text: "accepts data", marks: 1 },
        { text: "produces information", marks: 1 },
      ],
    },
  ],
};
