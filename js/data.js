// js/data.js — WeGEM Learning content: questions, notes, subjects

/* =========================================================
   EXAMS — question bank for quiz + exams section
   ========================================================= */

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
          {
            topic: "Division",
            q: "What is 72 ÷ 8?",
            options: ["7", "8", "9", "10"],
            answer: 2,
            explain: "8 × 9 = 72, so 72 ÷ 8 = 9.",
          },
          {
            topic: "Rounding",
            q: "Round 4.67 to the nearest whole number.",
            options: ["4", "5", "4.6", "4.7"],
            answer: 1,
            explain: "0.67 ≥ 0.5, so round up to 5.",
          },
          {
            topic: "Perimeter",
            q: "Perimeter of a square with side 5 cm?",
            options: ["10 cm", "15 cm", "20 cm", "25 cm"],
            answer: 2,
            explain: "Perimeter = 4 × side = 4 × 5 = 20 cm.",
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
          {
            topic: "Tenses",
            q: 'Which is past tense of "eat"?',
            options: ["Eated", "Ate", "Eaten", "Eating"],
            answer: 1,
            explain: 'Simple past of eat is "ate". Past participle is "eaten".',
          },
          {
            topic: "Plurals",
            q: 'Plural of "child"?',
            options: ["Childs", "Childes", "Children", "Child"],
            answer: 2,
            explain: '"Child" has an irregular plural: "children".',
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
          {
            topic: "Animals",
            q: "Which animal is a mammal?",
            options: ["Frog", "Snake", "Whale", "Fish"],
            answer: 2,
            explain:
              "Whales are mammals — they breathe air, produce milk, and have hair.",
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
          {
            topic: "Sequences",
            q: "Next term: 2, 6, 12, 20, …",
            options: ["28", "30", "32", "36"],
            answer: 1,
            explain:
              "Differences: 4, 6, 8, so next difference = 10. 20 + 10 = 30.",
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
          {
            topic: "Photosynthesis",
            q: "Where in the plant does photosynthesis mainly occur?",
            options: ["Roots", "Stem", "Leaves", "Flowers"],
            answer: 2,
            explain:
              "Leaves contain chloroplasts with chlorophyll for photosynthesis.",
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
          {
            topic: "Vocabulary",
            q: 'A word that means "to make better" is:',
            options: ["Worsen", "Improve", "Destroy", "Reduce"],
            answer: 1,
            explain: '"Improve" means to make or become better.',
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
          {
            topic: "Vectors",
            q: "If a = (3, 4), find |a|.",
            options: ["5", "7", "12", "25"],
            answer: 0,
            explain: "|a| = √(3² + 4²) = √25 = 5.",
          },
          {
            topic: "Logarithms",
            q: "Solve: log₁₀(100)",
            options: ["1", "2", "10", "100"],
            answer: 1,
            explain: "10² = 100, so log₁₀(100) = 2.",
          },
          {
            topic: "Matrices",
            q: "Determinant of [[2, 3], [1, 4]]?",
            options: ["5", "8", "11", "−5"],
            answer: 0,
            explain: "det = (2)(4) − (3)(1) = 8 − 3 = 5.",
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
          {
            topic: "Ecology",
            q: "What is the primary source of energy in an ecosystem?",
            options: ["Water", "Sun", "Soil", "Air"],
            answer: 1,
            explain:
              "The sun drives photosynthesis, the base of most food chains.",
          },
          {
            topic: "Human Physiology",
            q: "Which blood vessel carries oxygenated blood away from the heart?",
            options: [
              "Pulmonary artery",
              "Pulmonary vein",
              "Vena cava",
              "Aorta",
            ],
            answer: 3,
            explain:
              "The aorta carries oxygenated blood from the left ventricle to the body.",
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
          {
            topic: "Bonding",
            q: "What type of bond forms between sodium and chlorine?",
            options: ["Covalent", "Ionic", "Metallic", "Hydrogen"],
            answer: 1,
            explain: "Na donates an electron to Cl — an ionic bond.",
          },
          {
            topic: "Gas Laws",
            q: "At constant T, if pressure doubles, volume:",
            options: ["Doubles", "Halves", "Stays same", "Quadruples"],
            answer: 1,
            explain: "Boyle's Law: P₁V₁ = P₂V₂. Double P → half V.",
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
          {
            topic: "Energy",
            q: "SI unit of work?",
            options: ["Newton", "Joule", "Watt", "Pascal"],
            answer: 1,
            explain: "Work = force × distance. Unit = Newton-metre = Joule.",
          },
          {
            topic: "Optics",
            q: "A concave mirror is also called:",
            options: ["Diverging", "Converging", "Plane", "Flat"],
            answer: 1,
            explain: "A concave mirror converges light rays to a focal point.",
          },
        ],
      },
      {
        name: "English",
        questions: [
          {
            topic: "Grammar",
            q: 'Identify the adverb: "She sings beautifully."',
            options: ["She", "sings", "beautifully", "none"],
            answer: 2,
            explain:
              '"Beautifully" modifies the verb "sings" — it is an adverb.',
          },
          {
            topic: "Vocabulary",
            q: 'Synonym of "benevolent"?',
            options: ["Cruel", "Kind", "Lazy", "Angry"],
            answer: 1,
            explain: '"Benevolent" means well-meaning and kind.',
          },
        ],
      },
      {
        name: "Kiswahili",
        questions: [
          {
            topic: "Sarufi",
            q: 'Kitenzi cha "kula" katika wakati uliopita?',
            options: ["Atakula", "Alikula", "Anakula", "Ameila"],
            answer: 1,
            explain: '"Alikula" ni wakati uliopita.',
          },
          {
            topic: "Msamiati",
            q: 'Nini maana ya "furaha"?',
            options: ["Huzuni", "Shangwe", "Kicheko", "Hofu"],
            answer: 1,
            explain: '"Furaha" ni hali ya kuwa na shangwe au raha.',
          },
        ],
      },
      {
        name: "Geography",
        questions: [
          {
            topic: "Physical",
            q: "Longest river in Kenya?",
            options: ["Nile", "Tana", "Athii", "Mara"],
            answer: 1,
            explain:
              "The Tana River is the longest river entirely within Kenya.",
          },
          {
            topic: "Climate",
            q: "Which region receives the highest rainfall in Kenya?",
            options: ["Northern", "Coastal", "Central highlands", "Eastern"],
            answer: 2,
            explain:
              "Central highlands receive high rainfall due to altitude and relief.",
          },
        ],
      },
      {
        name: "History",
        questions: [
          {
            topic: "Independence",
            q: "Year Kenya gained independence?",
            options: ["1960", "1962", "1963", "1965"],
            answer: 2,
            explain: "Kenya gained independence on 12 December 1963.",
          },
          {
            topic: "Pre-colonial",
            q: "Who was the first president of Kenya?",
            options: [
              "Jomo Kenyatta",
              "Daniel Moi",
              "Mwai Kibaki",
              "Uhuru Kenyatta",
            ],
            answer: 0,
            explain: "Jomo Kenyatta was the first president (1964–1978).",
          },
        ],
      },
      {
        name: "CRE",
        questions: [
          {
            topic: "Old Testament",
            q: "Who led the Israelites out of Egypt?",
            options: ["Abraham", "Moses", "David", "Joshua"],
            answer: 1,
            explain: "Moses led the Exodus from Egypt.",
          },
          {
            topic: "New Testament",
            q: "How many disciples did Jesus choose?",
            options: ["7", "10", "12", "14"],
            answer: 2,
            explain: "Jesus chose 12 disciples (apostles).",
          },
        ],
      },
      {
        name: "Business",
        questions: [
          {
            topic: "Commerce",
            q: "What is the primary goal of a business?",
            options: [
              "To lose money",
              "To make profit",
              "To hire staff",
              "To close down",
            ],
            answer: 1,
            explain: "Businesses exist primarily to make a profit.",
          },
          {
            topic: "Accounting",
            q: "Assets = Liabilities + ______",
            options: ["Capital", "Expenses", "Revenue", "Cash"],
            answer: 0,
            explain: "The accounting equation: Assets = Liabilities + Capital.",
          },
        ],
      },
    ],
  },
};

/* =========================================================
   SUBJECTS BY CURRICULUM — for signup + dashboard
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
      "Business",
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
      "Business",
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
      "Business",
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
      "Business",
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
      "Business",
      "Agriculture",
      "Computer Studies",
      "Life Skills",
    ],
    "Grade 8": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Integrated Science",
      "Social Studies",
      "CRE",
      "Business",
      "Agriculture",
      "Computer Studies",
      "Life Skills",
    ],
    "Grade 9": [
      "Mathematics",
      "English",
      "Kiswahili",
      "Integrated Science",
      "Social Studies",
      "CRE",
      "Business",
      "Agriculture",
      "Computer Studies",
      "Life Skills",
    ],
  },
};

/* =========================================================
   NOTES — study content organized by curriculum/level/subject
   Edit this to add your own notes anytime
   ========================================================= */

export const NOTES = {
  "8-4-4": {
    "Form 1": {
      Mathematics: [
        {
          topic: "Natural Numbers",
          summary: "Numbers used for counting and their properties.",
          keyPoints: [
            "Natural numbers start from 1, 2, 3, …",
            "Whole numbers include 0",
            "Integers add negatives (−3, −2, −1, 0, 1, 2, 3)",
            "Place value: units, tens, hundreds, thousands",
          ],
        },
        {
          topic: "Fractions",
          summary: "Parts of a whole and operations with them.",
          keyPoints: [
            "Proper fractions: numerator < denominator (e.g., 3/4)",
            "Improper fractions: numerator ≥ denominator (e.g., 5/4)",
            "Mixed numbers combine whole and fraction (e.g., 1½)",
            "To add fractions: find LCM of denominators",
          ],
        },
        {
          topic: "Algebraic Expressions",
          summary: "Using letters to represent numbers.",
          keyPoints: [
            "A variable is a letter representing an unknown value",
            "A coefficient is a number multiplied by a variable",
            "Like terms can be added: 3x + 5x = 8x",
            "Simplify by combining like terms only",
          ],
        },
      ],
      Biology: [
        {
          topic: "Introduction to Biology",
          summary: "Biology is the study of living things.",
          keyPoints: [
            "Branches: botany (plants), zoology (animals), microbiology",
            "Living things: move, respire, grow, reproduce, excrete",
            "Applied in medicine, agriculture, conservation",
            "Uses scientific method: observation → hypothesis → experiment",
          ],
        },
      ],
      Chemistry: [
        {
          topic: "Introduction to Chemistry",
          summary: "Chemistry studies matter and its changes.",
          keyPoints: [
            "Matter has mass and occupies space",
            "Three states: solid, liquid, gas",
            "Physical changes: reversible (melting)",
            "Chemical changes: create new substances (burning)",
          ],
        },
      ],
    },
    "Form 2": {
      Mathematics: [
        {
          topic: "Quadratic Expressions",
          summary: "Expressions with degree 2 (x²).",
          keyPoints: [
            "General form: ax² + bx + c",
            "Factorise by finding two numbers that multiply to ac and add to b",
            "e.g., x² + 5x + 6 = (x + 2)(x + 3)",
            "Solve by setting each factor to zero",
          ],
        },
      ],
      Biology: [
        {
          topic: "Cell Structure",
          summary: "The cell is the basic unit of life.",
          keyPoints: [
            "Cell membrane: selectively permeable",
            "Nucleus: contains DNA, controls activity",
            "Mitochondria: energy (ATP) production",
            "Ribosomes: protein synthesis",
            "Plant cells: cell wall, chloroplasts, large vacuole",
          ],
        },
      ],
    },
    "Form 3": {
      Mathematics: [
        {
          topic: "Trigonometry",
          summary: "Relationships between triangle sides and angles.",
          keyPoints: [
            "SOH CAH TOA: sin = opp/hyp, cos = adj/hyp, tan = opp/adj",
            "3-4-5 triangle is a common right-triangle reference",
            "Pythagoras: a² + b² = c² (c is hypotenuse)",
            "Use inverse functions to find angles",
          ],
        },
      ],
      Chemistry: [
        {
          topic: "The Mole",
          summary: "A unit for measuring amount of substance.",
          keyPoints: [
            "Avogadro's number: 6.022 × 10²³ particles per mole",
            "Molar mass = mass of 1 mole in g/mol",
            "n = mass / molar mass",
            "Applies to atoms, molecules, ions",
          ],
        },
      ],
    },
    "Form 4": {
      Mathematics: [
        {
          topic: "Integration",
          summary: "Reverse of differentiation — finding areas and totals.",
          keyPoints: [
            "Power rule: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C",
            "Always add constant C for indefinite integrals",
            "Definite integrals find area under a curve",
            "∫(3x² + 2x) dx = x³ + x² + C",
          ],
        },
      ],
      Biology: [
        {
          topic: "Genetics",
          summary: "Study of heredity and variation.",
          keyPoints: [
            "Genes are units of inheritance on chromosomes",
            "Dominant alleles mask recessive ones",
            "Monohybrid cross Tt × Tt gives 1:2:1 genotype ratio",
            "Phenotype ratio for that cross is 3:1",
          ],
        },
      ],
    },
  },

  CBE: {
    "Grade 7": {
      "Integrated Science": [
        {
          topic: "Living Things",
          summary: "Characteristics that define life.",
          keyPoints: [
            "Movement, respiration, growth, reproduction",
            "Cells are the basic unit of life",
            "Plants make food; animals consume it",
            "Adaptation helps organisms survive",
          ],
        },
      ],
      Mathematics: [
        {
          topic: "Numbers",
          summary: "Foundation of all mathematics.",
          keyPoints: [
            "Whole numbers, integers, fractions, decimals",
            "Order of operations: BODMAS",
            "Place value determines number size",
            "Estimation helps check answers",
          ],
        },
      ],
    },
    "Grade 8": {
      Mathematics: [
        {
          topic: "Algebra",
          summary: "Using symbols to represent quantities.",
          keyPoints: [
            "Variables represent unknown values",
            "Solve equations by doing the same on both sides",
            "Inequalities use <, >, ≤, ≥",
            "Simplify before substituting values",
          ],
        },
      ],
      "Integrated Science": [
        {
          topic: "Matter",
          summary: "Everything that has mass and takes up space.",
          keyPoints: [
            "Three states: solid, liquid, gas",
            "Particles behave differently in each state",
            "Physical vs. chemical changes",
            "Mixtures can be separated physically",
          ],
        },
      ],
    },
    "Grade 9": {
      Mathematics: [
        {
          topic: "Geometry",
          summary: "Shapes, sizes, and spatial relationships.",
          keyPoints: [
            "Angles in a triangle sum to 180°",
            "Circle: 360° total, radius, diameter, circumference",
            "Congruent = same size and shape",
            "Similar = same shape, different size",
          ],
        },
      ],
      "Integrated Science": [
        {
          topic: "Energy",
          summary: "The ability to do work.",
          keyPoints: [
            "Forms: kinetic, potential, thermal, chemical",
            "Energy is conserved (not created or destroyed)",
            "Transformations: e.g., chemical → kinetic",
            "Renewable vs. non-renewable sources",
          ],
        },
      ],
    },
  },
};

/* =========================================================
   UTILITY
   ========================================================= */

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
