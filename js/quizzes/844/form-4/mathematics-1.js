// js/quizzes/844/form-4/mathematics-1.js
// Form 4 Mathematics — Set 1 (typed answers, markpoint scoring)

export default {
  exam: "KCSE",
  subject: "Mathematics",
  grade: "Form 4",
  class: "form-4",
  curriculum: "844",
  title: "Mathematics — Set 1",
  description:
    "KCSE Form 4 Mathematics practice — integration, quadratics, trigonometry, sequences.",
  duration: 45 * 60,
  totalMarks: 12,
  status: "published",
  updatedAt: "2026-10-09",
  version: "1.0",

  questions: [
    {
      q: "Evaluate ∫(3x² + 2x) dx.",
      marks: 2,
      topic: "Integration",
      markpoints: [{ text: "x³ + x² + C", marks: 2 }],
    },
    {
      q: "Solve the quadratic equation: x² − 5x + 6 = 0.",
      marks: 2,
      topic: "Quadratic Equations",
      markpoints: [
        { text: "x = 2", marks: 1 },
        { text: "x = 3", marks: 1 },
      ],
    },
    {
      q: "If sin θ = 3/5 and θ is acute, find cos θ.",
      marks: 2,
      topic: "Trigonometry",
      markpoints: [{ text: "4/5", marks: 2 }],
    },
    {
      q: "Find the 10th term of the arithmetic progression: 3, 7, 11, ...",
      marks: 3,
      topic: "Sequences",
      markpoints: [
        { text: "a = 3 and d = 4", marks: 1 },
        { text: "T10 = a + 9d", marks: 1 },
        { text: "T10 = 39", marks: 1 },
      ],
    },
    {
      q: "A fair six-sided die is rolled once. What is the probability of getting an even number?",
      marks: 1,
      topic: "Probability",
      markpoints: [{ text: "1/2", marks: 1 }],
    },
    {
      q: "Find the magnitude of the vector a = (3, 4).",
      marks: 2,
      topic: "Vectors",
      markpoints: [
        { text: "square root of 3 squared plus 4 squared", marks: 1 },
        { text: "5", marks: 1 },
      ],
    },
  ],
};
