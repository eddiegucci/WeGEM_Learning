export default {
  subject: "Computer Studies",
  exam: "KCSE",
  curriculum: "844",
  class: "form-4", // ← must be exactly "form-4"
  grade: "Form 4",
  status: "published", // ← must be exactly "published"
  questions: [
    {
      q: "What is a computer?",
      options: ["...", "...", "...", "..."],
      answer: 1, // index of correct option
      topic: "Introduction",
      explain: "...",
    },
    // ... more
  ],
};
