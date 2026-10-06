// js/data.js — WeGEM Learning question bank + notes

export const EXAMS = {
  KPSEA: {
    gradeLabel: "GRADE 6 · UPPER PRIMARY",
    color: "#3b82f6",
    description:
      "Gamified micro-quizzes aligned with the CBC upper-primary curriculum.",
    subjects: [
      {
        name: "Mathematics",
        questions: [
          {
            topic: "Fractions",
            q: "What is 1/2 + 1/4?",
            options: ["2/6", "3/4", "1/6", "2/4"],
            answer: 1,
            explain:
              "Convert to common denominator: 1/2 = 2/4. Then 2/4 + 1/4 = 3/4.",
          },
          {
            topic: "Multiplication",
            q: "What is 7 × 8?",
            options: ["48", "54", "56", "64"],
            answer: 2,
            explain: "7 × 8 = 56.",
          },
          {
            topic: "Geometry",
            q: "How many sides does a hexagon have?",
            options: ["5", "6", "7", "8"],
            answer: 1,
            explain: "Hexa- means six. A hexagon has 6 sides.",
          },
          {
            topic: "Decimals",
            q: "Which is bigger: 0.5 or 0.45?",
            options: ["0.5", "0.45", "Equal", "Cannot tell"],
            answer: 0,
            explain: "0.5 = 0.50, greater than 0.45.",
          },
          {
            topic: "Fractions",
            q: "Simplify 8/12.",
            options: ["2/3", "3/4", "4/6", "1/2"],
            answer: 0,
            explain: "Divide both by 4 → 2/3.",
          },
        ],
      },
      {
        name: "English",
        questions: [
          {
            topic: "Grammar",
            q: "Choose the correct sentence.",
            options: [
              "She go to school.",
              "She goes to school.",
              "She going.",
              "She gone.",
            ],
            answer: 1,
            explain: 'Third-person singular takes "goes".',
          },
          {
            topic: "Vocabulary",
            q: 'Opposite of "ancient"?',
            options: ["Old", "Modern", "Historic", "Aged"],
            answer: 1,
            explain: '"Ancient" = very old. Opposite = modern.',
          },
          {
            topic: "Punctuation",
            q: "Which is punctuated correctly?",
            options: [
              "Where are you going",
              "Where are you going?",
              "where are you going?",
              "Where are you going.",
            ],
            answer: 1,
            explain: "Questions end with ? and start with capital.",
          },
        ],
      },
      {
        name: "Science",
        questions: [
          {
            topic: "Plants",
            q: "What gas do plants take in during photosynthesis?",
            options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
            answer: 1,
            explain: "Plants take in CO₂ and release O₂.",
          },
          {
            topic: "Human Body",
            q: "How many bones does an adult human have?",
            options: ["186", "206", "226", "246"],
            answer: 1,
            explain: "Adults have 206 bones.",
          },
          {
            topic: "Water Cycle",
            q: "Water turning into vapour is called:",
            options: [
              "Condensation",
              "Evaporation",
              "Precipitation",
              "Filtration",
            ],
            answer: 1,
            explain: "Liquid → gas = evaporation.",
          },
        ],
      },
    ],
  },

  KJSEA: {
    gradeLabel: "GRADE 9 · JUNIOR SCHOOL",
    color: "#f59e0b",
    description: "Competency-based questions that ask you to apply knowledge.",
    subjects: [
      {
        name: "Mathematics",
        questions: [
          {
            topic: "Algebra",
            q: "Solve: 3x + 5 = 20",
            options: ["3", "5", "7", "15"],
            answer: 1,
            explain: "3x = 15, x = 5.",
          },
          {
            topic: "Geometry",
            q: "Triangle angles in 1:2:3. Largest?",
            options: ["30°", "60°", "90°", "120°"],
            answer: 2,
            explain: "Sum 180°, ratio 6. Largest = (3/6)×180 = 90°.",
          },
          {
            topic: "Statistics",
            q: "Mean of 4, 8, 10, 14?",
            options: ["8", "9", "10", "12"],
            answer: 1,
            explain: "Sum 36 ÷ 4 = 9.",
          },
          {
            topic: "Percentages",
            q: "KES 800 with 15% off?",
            options: ["680", "720", "760", "640"],
            answer: 0,
            explain: "15% of 800 = 120. 800 − 120 = 680.",
          },
        ],
      },
      {
        name: "Integrated Science",
        questions: [
          {
            topic: "Cells",
            q: "Powerhouse of the cell?",
            options: ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"],
            answer: 2,
            explain: "Mitochondria produce ATP.",
          },
          {
            topic: "Matter",
            q: "Which is a chemical change?",
            options: [
              "Melting ice",
              "Boiling water",
              "Rusting iron",
              "Cutting paper",
            ],
            answer: 2,
            explain: "Rusting = new substance.",
          },
          {
            topic: "Electricity",
            q: "Unit of electric current?",
            options: ["Volts", "Amperes", "Ohms", "Watts"],
            answer: 1,
            explain: "Current = amperes.",
          },
        ],
      },
      {
        name: "English",
        questions: [
          {
            topic: "Comprehension",
            q: '"The sun smiled." This is:',
            options: ["Simile", "Metaphor", "Personification", "Hyperbole"],
            answer: 2,
            explain: "Human quality to non-human = personification.",
          },
          {
            topic: "Grammar",
            q: 'Passive of "The chef cooked the meal."',
            options: [
              "The meal was cooked by the chef.",
              "The meal is cooked.",
              "The meal cooked.",
              "The chef was cooked.",
            ],
            answer: 0,
            explain: "Past active → past passive.",
          },
        ],
      },
    ],
  },

  KCSE: {
    gradeLabel: "FORM 4 · SENIOR SCHOOL",
    color: "#22c55e",
    description:
      "Interactive past-paper practice with step-by-step explanations.",
    subjects: [
      {
        name: "Mathematics",
        questions: [
          {
            topic: "Integration",
            q: "Evaluate ∫(3x² + 2x) dx",
            options: [
              "x³ + x² + C",
              "6x + 2 + C",
              "3x³ + 2x² + C",
              "x³ + 2x + C",
            ],
            answer: 0,
            explain: "Power rule: ∫3x² dx = x³, ∫2x dx = x².",
          },
          {
            topic: "Quadratic Equations",
            q: "Solve: x² − 5x + 6 = 0",
            options: ["1, 6", "2, 3", "−2, −3", "0, 5"],
            answer: 1,
            explain: "(x−2)(x−3) = 0 → x = 2 or 3.",
          },
          {
            topic: "Trigonometry",
            q: "sin θ = 3/5. cos θ (acute)?",
            options: ["4/5", "5/4", "3/4", "5/3"],
            answer: 0,
            explain: "3-4-5 triangle → cos = 4/5.",
          },
          {
            topic: "Sequences",
            q: "10th term of AP: 3, 7, 11, …",
            options: ["39", "40", "43", "35"],
            answer: 0,
            explain: "a=3, d=4. T₁₀ = 3 + 9×4 = 39.",
          },
          {
            topic: "Probability",
            q: "P(even) on fair die?",
            options: ["1/6", "1/3", "1/2", "2/3"],
            answer: 2,
            explain: "Evens: 2, 4, 6 → 3/6 = 1/2.",
          },
        ],
      },
      {
        name: "Biology",
        questions: [
          {
            topic: "Cell Biology",
            q: "Controls entry/exit of cell?",
            options: ["Cell wall", "Cell membrane", "Nucleus", "Cytoplasm"],
            answer: 1,
            explain: "Membrane is selectively permeable.",
          },
          {
            topic: "Genetics",
            q: "Genotype ratio Tt × Tt?",
            options: ["1:1", "3:1", "1:2:1", "2:1:1"],
            answer: 2,
            explain: "TT:Tt:tt = 1:2:1.",
          },
          {
            topic: "Respiration",
            q: "Where does glycolysis occur?",
            options: ["Mitochondria", "Cytoplasm", "Nucleus", "Ribosome"],
            answer: 1,
            explain: "Glycolysis is in the cytoplasm.",
          },
        ],
      },
      {
        name: "Chemistry",
        questions: [
          {
            topic: "Moles",
            q: "Moles in 44 g CO₂?",
            options: ["0.5", "1", "2", "4"],
            answer: 1,
            explain: "Molar mass = 44. 44÷44 = 1.",
          },
          {
            topic: "Acids & Bases",
            q: "pH of neutral solution?",
            options: ["0", "7", "14", "1"],
            answer: 1,
            explain: "Pure water = pH 7.",
          },
          {
            topic: "Organic",
            q: "General formula of alkanes?",
            options: ["CnH2n", "CnH2n+2", "CnH2n−2", "CnHn"],
            answer: 1,
            explain: "Saturated hydrocarbons: CnH2n+2.",
          },
        ],
      },
      {
        name: "Physics",
        questions: [
          {
            topic: "Motion",
            q: "Car from rest at 2 m/s² for 5 s. v?",
            options: ["5", "10", "15", "20"],
            answer: 1,
            explain: "v = u + at = 0 + 2×5 = 10 m/s.",
          },
          {
            topic: "Electricity",
            q: "12 V, 3 A. Resistance?",
            options: ["4 Ω", "9 Ω", "15 Ω", "36 Ω"],
            answer: 0,
            explain: "R = V/I = 12/3 = 4 Ω.",
          },
          {
            topic: "Waves",
            q: "Which is longitudinal?",
            options: ["Light", "Radio", "Sound", "X-ray"],
            answer: 2,
            explain: "Sound is longitudinal.",
          },
        ],
      },
    ],
  },
};

/* =========================================================
   NOTES — structure for the notes page
   Add new notes here as you go
   ========================================================= */

export const NOTES = {
  "8-4-4": {
    "Form 1": {
      Mathematics: [
        {
          topic: "Numbers",
          summary: "Natural numbers, integers, and their properties.",
          keyPoints: [
            "Natural numbers: 1, 2, 3…",
            "Integers include negatives",
            "Place value matters",
          ],
        },
        {
          topic: "Fractions",
          summary: "Operations with fractions and decimals.",
          keyPoints: ["LCM for denominators", "Simplify by GCD"],
        },
      ],
      Biology: [
        {
          topic: "Introduction to Biology",
          summary: "Branches and importance of biology.",
          keyPoints: [
            "Study of living things",
            "Branches: botany, zoology",
            "Applied in medicine, agriculture",
          ],
        },
      ],
    },
    "Form 2": {
      Mathematics: [
        {
          topic: "Algebra",
          summary: "Equations, inequalities, and expressions.",
          keyPoints: ["Solve linear equations", "Quadratic expressions"],
        },
      ],
    },
  },
  CBE: {
    "Grade 7": {
      "Integrated Science": [
        {
          topic: "Living Things",
          summary: "Characteristics of living things.",
          keyPoints: ["Movement, respiration, growth", "Cells as basic unit"],
        },
      ],
    },
    "Grade 8": {
      Mathematics: [
        {
          topic: "Algebra",
          summary: "Introduction to algebraic expressions.",
          keyPoints: ["Variables and constants", "Simplify expressions"],
        },
      ],
    },
  },
};

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
