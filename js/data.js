// js/data.js — WeGEM Learning question bank

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
              "Convert to a common denominator: 1/2 = 2/4. Then 2/4 + 1/4 = 3/4.",
          },
          {
            topic: "Multiplication",
            q: "What is 7 × 8?",
            options: ["48", "54", "56", "64"],
            answer: 2,
            explain: "7 × 8 = 56. Remember: 7 × 8 is one less than 7 × 9 (63).",
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
            options: ["0.5", "0.45", "They are equal", "Cannot tell"],
            answer: 0,
            explain: "0.5 = 0.50, which is greater than 0.45.",
          },
          {
            topic: "Fractions",
            q: "Simplify 8/12.",
            options: ["2/3", "3/4", "4/6", "1/2"],
            answer: 0,
            explain:
              "Divide numerator and denominator by 4: 8÷4 = 2, 12÷4 = 3. So 2/3.",
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
              "She going to school.",
              "She gone to school.",
            ],
            answer: 1,
            explain: 'Third-person singular takes "goes" in present tense.',
          },
          {
            topic: "Vocabulary",
            q: 'What is the opposite of "ancient"?',
            options: ["Old", "Modern", "Historic", "Aged"],
            answer: 1,
            explain: '"Ancient" means very old. Its opposite is "modern".',
          },
          {
            topic: "Punctuation",
            q: "Which sentence is punctuated correctly?",
            options: [
              "Where are you going",
              "Where are you going?",
              "Where are you going.",
              "where are you going?",
            ],
            answer: 1,
            explain:
              "Questions end with a question mark, and the first word is capitalised.",
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
            explain:
              "Plants take in carbon dioxide and release oxygen during photosynthesis.",
          },
          {
            topic: "Human Body",
            q: "How many bones does an adult human have?",
            options: ["186", "206", "226", "246"],
            answer: 1,
            explain: "An adult human has 206 bones. Babies are born with ~270.",
          },
          {
            topic: "Water Cycle",
            q: "What is the process of water turning into vapour called?",
            options: [
              "Condensation",
              "Evaporation",
              "Precipitation",
              "Filtration",
            ],
            answer: 1,
            explain:
              "Evaporation is liquid water turning into water vapour (gas).",
          },
        ],
      },
    ],
  },

  KJSEA: {
    gradeLabel: "GRADE 9 · JUNIOR SCHOOL",
    color: "#f59e0b",
    description:
      "Competency-based questions that ask you to apply knowledge, not just recall it.",
    subjects: [
      {
        name: "Mathematics",
        questions: [
          {
            topic: "Algebra",
            q: "Solve for x: 3x + 5 = 20",
            options: ["3", "5", "7", "15"],
            answer: 1,
            explain: "Subtract 5: 3x = 15. Divide by 3: x = 5.",
          },
          {
            topic: "Geometry",
            q: "The angles of a triangle are in ratio 1:2:3. What is the largest angle?",
            options: ["30°", "60°", "90°", "120°"],
            answer: 2,
            explain:
              "Sum = 180°. Ratio total = 6. Largest = (3/6) × 180 = 90°.",
          },
          {
            topic: "Statistics",
            q: "Find the mean of 4, 8, 10, 14.",
            options: ["8", "9", "10", "12"],
            answer: 1,
            explain: "Sum = 36. Count = 4. Mean = 36 ÷ 4 = 9.",
          },
          {
            topic: "Percentages",
            q: "A shirt costs KES 800 and is discounted 15%. What is the new price?",
            options: ["KES 680", "KES 720", "KES 760", "KES 640"],
            answer: 0,
            explain: "15% of 800 = 120. 800 − 120 = KES 680.",
          },
        ],
      },
      {
        name: "Integrated Science",
        questions: [
          {
            topic: "Cells",
            q: "Which organelle is known as the powerhouse of the cell?",
            options: ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"],
            answer: 2,
            explain: "Mitochondria produce energy (ATP) through respiration.",
          },
          {
            topic: "Matter",
            q: "Which of these is a chemical change?",
            options: [
              "Melting ice",
              "Boiling water",
              "Rusting iron",
              "Cutting paper",
            ],
            answer: 2,
            explain:
              "Rusting creates a new substance (iron oxide). The others are physical changes.",
          },
          {
            topic: "Electricity",
            q: "What unit is electric current measured in?",
            options: ["Volts", "Amperes", "Ohms", "Watts"],
            answer: 1,
            explain:
              "Current is measured in amperes (A). Voltage = volts, resistance = ohms.",
          },
        ],
      },
      {
        name: "English",
        questions: [
          {
            topic: "Comprehension",
            q: '"The sun smiled on us." This is an example of:',
            options: ["Simile", "Metaphor", "Personification", "Hyperbole"],
            answer: 2,
            explain:
              'Personification gives human qualities to non-human things — the sun "smiled".',
          },
          {
            topic: "Grammar",
            q: 'Choose the correct passive form: "The chef cooked the meal."',
            options: [
              "The meal was cooked by the chef.",
              "The meal is cooked by the chef.",
              "The meal cooked the chef.",
              "The chef was cooked.",
            ],
            answer: 0,
            explain: 'Past tense active → past tense passive: "was cooked".',
          },
        ],
      },
    ],
  },

  KCSE: {
    gradeLabel: "FORM 4 · SENIOR SCHOOL",
    color: "#22c55e",
    description:
      "Interactive past-paper practice with step-by-step explanations and weakness tracking.",
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
            explain:
              "Power rule: ∫xⁿ dx = xⁿ⁺¹/(n+1). So ∫3x² dx = x³, ∫2x dx = x². Don't forget + C.",
          },
          {
            topic: "Quadratic Equations",
            q: "Solve: x² − 5x + 6 = 0",
            options: ["x = 1, 6", "x = 2, 3", "x = −2, −3", "x = 0, 5"],
            answer: 1,
            explain: "Factorise: (x − 2)(x − 3) = 0, so x = 2 or x = 3.",
          },
          {
            topic: "Trigonometry",
            q: "If sin θ = 3/5, what is cos θ (θ acute)?",
            options: ["4/5", "5/4", "3/4", "5/3"],
            answer: 0,
            explain:
              "Using 3-4-5 triangle: if opposite = 3, hypotenuse = 5, adjacent = 4. cos θ = 4/5.",
          },
          {
            topic: "Sequences",
            q: "Find the 10th term of the AP: 3, 7, 11, …",
            options: ["39", "40", "43", "35"],
            answer: 0,
            explain: "a = 3, d = 4. T₁₀ = a + 9d = 3 + 36 = 39.",
          },
          {
            topic: "Probability",
            q: "A fair die is rolled. What is P(even number)?",
            options: ["1/6", "1/3", "1/2", "2/3"],
            answer: 2,
            explain:
              "Even numbers on a die: 2, 4, 6 → 3 outcomes. P = 3/6 = 1/2.",
          },
        ],
      },
      {
        name: "Biology",
        questions: [
          {
            topic: "Cell Biology",
            q: "Which structure controls what enters and leaves the cell?",
            options: ["Cell wall", "Cell membrane", "Nucleus", "Cytoplasm"],
            answer: 1,
            explain:
              "The cell membrane is selectively permeable — it controls transport in and out of the cell.",
          },
          {
            topic: "Genetics",
            q: "What is the genotype ratio of a monohybrid cross Tt × Tt?",
            options: ["1:1", "3:1", "1:2:1", "2:1:1"],
            answer: 2,
            explain:
              "Cross Tt × Tt gives TT : Tt : tt = 1 : 2 : 1. Phenotype is 3:1.",
          },
          {
            topic: "Respiration",
            q: "Where in the cell does glycolysis occur?",
            options: ["Mitochondria", "Cytoplasm", "Nucleus", "Ribosome"],
            answer: 1,
            explain:
              "Glycolysis happens in the cytoplasm. The Krebs cycle happens in the mitochondria.",
          },
        ],
      },
      {
        name: "Chemistry",
        questions: [
          {
            topic: "Moles",
            q: "How many moles are in 44 g of CO₂? (C=12, O=16)",
            options: ["0.5", "1", "2", "4"],
            answer: 1,
            explain:
              "Molar mass CO₂ = 12 + 32 = 44 g/mol. Moles = 44 ÷ 44 = 1.",
          },
          {
            topic: "Acids & Bases",
            q: "What is the pH of a neutral solution at 25°C?",
            options: ["0", "7", "14", "1"],
            answer: 1,
            explain: "Neutral solutions (like pure water) have pH = 7 at 25°C.",
          },
          {
            topic: "Organic Chemistry",
            q: "What is the general formula of alkanes?",
            options: ["CnH2n", "CnH2n+2", "CnH2n−2", "CnHn"],
            answer: 1,
            explain:
              "Alkanes are saturated hydrocarbons: CnH2n+2. E.g., methane CH₄.",
          },
        ],
      },
      {
        name: "Physics",
        questions: [
          {
            topic: "Motion",
            q: "A car accelerates from rest at 2 m/s² for 5 s. What is its final velocity?",
            options: ["5 m/s", "10 m/s", "15 m/s", "20 m/s"],
            answer: 1,
            explain: "v = u + at = 0 + (2)(5) = 10 m/s.",
          },
          {
            topic: "Electricity",
            q: "A 12 V battery drives 3 A through a resistor. What is the resistance?",
            options: ["4 Ω", "9 Ω", "15 Ω", "36 Ω"],
            answer: 0,
            explain: "V = IR, so R = V/I = 12/3 = 4 Ω.",
          },
          {
            topic: "Waves",
            q: "Which of these is a longitudinal wave?",
            options: ["Light", "Radio", "Sound", "X-ray"],
            answer: 2,
            explain:
              "Sound is longitudinal (particles vibrate parallel to wave direction). Light/radio/X-ray are transverse.",
          },
        ],
      },
    ],
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
