// js/data/seed.js
// One-time Firebase content seeder for WeGEM Learning.
// Called from admin.html. Requires admin role.

import {
  addQuestion,
  addNote,
  updateContentManifest,
} from "../features/admin.js";
import { log } from "../core/utils.js";

/* =========================================================
   STARTER QUESTIONS
   ========================================================= */

export const SEED_QUESTIONS = [
  // ==================== KCSE Mathematics ====================
  {
    exam: "KCSE",
    subject: "Mathematics",
    topic: "Integration",
    q: "Evaluate ∫(3x² + 2x) dx",
    options: ["x³ + x² + C", "6x + 2 + C", "3x³ + 2x² + C", "x³ + 2x + C"],
    answer: 0,
    explain:
      "Power rule: ∫xⁿ dx = xⁿ⁺¹/(n+1). So ∫3x² dx = x³ and ∫2x dx = x². Don't forget + C.",
  },
  {
    exam: "KCSE",
    subject: "Mathematics",
    topic: "Quadratic Equations",
    q: "Solve: x² − 5x + 6 = 0",
    options: ["x = 1, 6", "x = 2, 3", "x = −2, −3", "x = 0, 5"],
    answer: 1,
    explain: "Factorise: (x − 2)(x − 3) = 0, so x = 2 or x = 3.",
  },
  {
    exam: "KCSE",
    subject: "Mathematics",
    topic: "Trigonometry",
    q: "If sin θ = 3/5, what is cos θ (θ acute)?",
    options: ["4/5", "5/4", "3/4", "5/3"],
    answer: 0,
    explain:
      "Using the 3-4-5 triangle: if opposite = 3 and hypotenuse = 5, then adjacent = 4. cos θ = 4/5.",
  },
  {
    exam: "KCSE",
    subject: "Mathematics",
    topic: "Sequences",
    q: "Find the 10th term of the AP: 3, 7, 11, …",
    options: ["39", "40", "43", "35"],
    answer: 0,
    explain: "a = 3, d = 4. T₁₀ = a + 9d = 3 + 36 = 39.",
  },
  {
    exam: "KCSE",
    subject: "Mathematics",
    topic: "Probability",
    q: "A fair die is rolled. What is P(even number)?",
    options: ["1/6", "1/3", "1/2", "2/3"],
    answer: 2,
    explain: "Even numbers on a die: 2, 4, 6 → 3 outcomes. P = 3/6 = 1/2.",
  },
  {
    exam: "KCSE",
    subject: "Mathematics",
    topic: "Vectors",
    q: "If a = (3, 4), find |a|.",
    options: ["5", "7", "12", "25"],
    answer: 0,
    explain: "|a| = √(3² + 4²) = √(9 + 16) = √25 = 5.",
  },
  {
    exam: "KCSE",
    subject: "Mathematics",
    topic: "Logarithms",
    q: "Solve: log₁₀(100)",
    options: ["1", "2", "10", "100"],
    answer: 1,
    explain: "10² = 100, so log₁₀(100) = 2.",
  },
  {
    exam: "KCSE",
    subject: "Mathematics",
    topic: "Matrices",
    q: "Determinant of [[2, 3], [1, 4]]?",
    options: ["5", "8", "11", "−5"],
    answer: 0,
    explain: "det = (2)(4) − (3)(1) = 8 − 3 = 5.",
  },

  // ==================== KCSE Biology ====================
  {
    exam: "KCSE",
    subject: "Biology",
    topic: "Cell Biology",
    q: "Which structure controls what enters and leaves the cell?",
    options: ["Cell wall", "Cell membrane", "Nucleus", "Cytoplasm"],
    answer: 1,
    explain:
      "The cell membrane is selectively permeable — it controls transport in and out of the cell.",
  },
  {
    exam: "KCSE",
    subject: "Biology",
    topic: "Genetics",
    q: "What is the genotype ratio of a monohybrid cross Tt × Tt?",
    options: ["1:1", "3:1", "1:2:1", "2:1:1"],
    answer: 2,
    explain:
      "Cross Tt × Tt gives TT : Tt : tt = 1 : 2 : 1. Phenotype ratio is 3:1.",
  },
  {
    exam: "KCSE",
    subject: "Biology",
    topic: "Respiration",
    q: "Where in the cell does glycolysis occur?",
    options: ["Mitochondria", "Cytoplasm", "Nucleus", "Ribosome"],
    answer: 1,
    explain:
      "Glycolysis happens in the cytoplasm. The Krebs cycle happens in the mitochondria.",
  },
  {
    exam: "KCSE",
    subject: "Biology",
    topic: "Ecology",
    q: "What is the primary source of energy in an ecosystem?",
    options: ["Water", "Sun", "Soil", "Air"],
    answer: 1,
    explain: "The sun drives photosynthesis, the base of most food chains.",
  },
  {
    exam: "KCSE",
    subject: "Biology",
    topic: "Human Physiology",
    q: "Which blood vessel carries oxygenated blood away from the heart?",
    options: ["Pulmonary artery", "Pulmonary vein", "Vena cava", "Aorta"],
    answer: 3,
    explain:
      "The aorta carries oxygenated blood from the left ventricle to the body.",
  },

  // ==================== KCSE Chemistry ====================
  {
    exam: "KCSE",
    subject: "Chemistry",
    topic: "Moles",
    q: "How many moles are in 44 g of CO₂? (C=12, O=16)",
    options: ["0.5", "1", "2", "4"],
    answer: 1,
    explain: "Molar mass CO₂ = 12 + 32 = 44 g/mol. Moles = 44 ÷ 44 = 1.",
  },
  {
    exam: "KCSE",
    subject: "Chemistry",
    topic: "Acids & Bases",
    q: "What is the pH of a neutral solution at 25°C?",
    options: ["0", "7", "14", "1"],
    answer: 1,
    explain: "Neutral solutions (like pure water) have pH = 7 at 25°C.",
  },
  {
    exam: "KCSE",
    subject: "Chemistry",
    topic: "Organic Chemistry",
    q: "What is the general formula of alkanes?",
    options: ["CnH2n", "CnH2n+2", "CnH2n−2", "CnHn"],
    answer: 1,
    explain: "Alkanes are saturated hydrocarbons: CnH2n+2. E.g., methane CH₄.",
  },
  {
    exam: "KCSE",
    subject: "Chemistry",
    topic: "Bonding",
    q: "What type of bond forms between sodium and chlorine?",
    options: ["Covalent", "Ionic", "Metallic", "Hydrogen"],
    answer: 1,
    explain: "Na donates an electron to Cl — an ionic bond.",
  },

  // ==================== KCSE Physics ====================
  {
    exam: "KCSE",
    subject: "Physics",
    topic: "Motion",
    q: "A car accelerates from rest at 2 m/s² for 5 s. What is its final velocity?",
    options: ["5 m/s", "10 m/s", "15 m/s", "20 m/s"],
    answer: 1,
    explain: "v = u + at = 0 + (2)(5) = 10 m/s.",
  },
  {
    exam: "KCSE",
    subject: "Physics",
    topic: "Electricity",
    q: "A 12 V battery drives 3 A through a resistor. What is the resistance?",
    options: ["4 Ω", "9 Ω", "15 Ω", "36 Ω"],
    answer: 0,
    explain: "V = IR, so R = V/I = 12/3 = 4 Ω.",
  },
  {
    exam: "KCSE",
    subject: "Physics",
    topic: "Waves",
    q: "Which of these is a longitudinal wave?",
    options: ["Light", "Radio", "Sound", "X-ray"],
    answer: 2,
    explain:
      "Sound is longitudinal (particles vibrate parallel to wave direction). Light/radio/X-ray are transverse.",
  },
  {
    exam: "KCSE",
    subject: "Physics",
    topic: "Energy",
    q: "SI unit of work?",
    options: ["Newton", "Joule", "Watt", "Pascal"],
    answer: 1,
    explain: "Work = force × distance. Unit = Newton-metre = Joule.",
  },

  // ==================== KCSE English ====================
  {
    exam: "KCSE",
    subject: "English",
    topic: "Grammar",
    q: 'Identify the adverb: "She sings beautifully."',
    options: ["She", "sings", "beautifully", "none"],
    answer: 2,
    explain: '"Beautifully" modifies the verb "sings" — it is an adverb.',
  },
  {
    exam: "KCSE",
    subject: "English",
    topic: "Vocabulary",
    q: 'Synonym of "benevolent"?',
    options: ["Cruel", "Kind", "Lazy", "Angry"],
    answer: 1,
    explain: '"Benevolent" means well-meaning and kind.',
  },

  // ==================== KCSE Kiswahili ====================
  {
    exam: "KCSE",
    subject: "Kiswahili",
    topic: "Sarufi",
    q: 'Kitenzi cha "kula" katika wakati uliopita?',
    options: ["Atakula", "Alikula", "Anakula", "Ameila"],
    answer: 1,
    explain: '"Alikula" ni wakati uliopita.',
  },
  {
    exam: "KCSE",
    subject: "Kiswahili",
    topic: "Msamiati",
    q: 'Nini maana ya "furaha"?',
    options: ["Huzuni", "Shangwe", "Kicheko", "Hofu"],
    answer: 1,
    explain: '"Furaha" ni hali ya kuwa na shangwe au raha.',
  },

  // ==================== KCSE History ====================
  {
    exam: "KCSE",
    subject: "History",
    topic: "Independence",
    q: "Year Kenya gained independence?",
    options: ["1960", "1962", "1963", "1965"],
    answer: 2,
    explain: "Kenya gained independence on 12 December 1963.",
  },
  {
    exam: "KCSE",
    subject: "History",
    topic: "Pre-colonial",
    q: "Who was the first president of Kenya?",
    options: ["Jomo Kenyatta", "Daniel Moi", "Mwai Kibaki", "Uhuru Kenyatta"],
    answer: 0,
    explain: "Jomo Kenyatta was the first president (1964–1978).",
  },

  // ==================== KCSE Geography ====================
  {
    exam: "KCSE",
    subject: "Geography",
    topic: "Physical",
    q: "Longest river in Kenya?",
    options: ["Nile", "Tana", "Athii", "Mara"],
    answer: 1,
    explain: "The Tana River is the longest river entirely within Kenya.",
  },

  // ==================== KCSE CRE ====================
  {
    exam: "KCSE",
    subject: "CRE",
    topic: "Old Testament",
    q: "Who led the Israelites out of Egypt?",
    options: ["Abraham", "Moses", "David", "Joshua"],
    answer: 1,
    explain: "Moses led the Exodus from Egypt.",
  },

  // ==================== KPSEA Science ====================
  {
    exam: "KPSEA",
    subject: "Science",
    topic: "Plants",
    q: "What gas do plants take in during photosynthesis?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    answer: 1,
    explain:
      "Plants take in carbon dioxide and release oxygen during photosynthesis.",
  },
  {
    exam: "KPSEA",
    subject: "Science",
    topic: "Human Body",
    q: "How many bones does an adult human have?",
    options: ["186", "206", "226", "246"],
    answer: 1,
    explain: "An adult human has 206 bones. Babies are born with about 270.",
  },

  // ==================== KPSEA Mathematics ====================
  {
    exam: "KPSEA",
    subject: "Mathematics",
    topic: "Fractions",
    q: "What is 1/2 + 1/4?",
    options: ["2/6", "3/4", "1/6", "2/4"],
    answer: 1,
    explain:
      "Convert to a common denominator: 1/2 = 2/4. Then 2/4 + 1/4 = 3/4.",
  },
  {
    exam: "KPSEA",
    subject: "Mathematics",
    topic: "Multiplication",
    q: "What is 7 × 8?",
    options: ["48", "54", "56", "64"],
    answer: 2,
    explain: "7 × 8 = 56.",
  },

  // ==================== KJSEA Integrated Science ====================
  {
    exam: "KJSEA",
    subject: "Integrated Science",
    topic: "Cells",
    q: "Which organelle is known as the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Vacuole"],
    answer: 2,
    explain: "Mitochondria produce energy (ATP) through respiration.",
  },
  {
    exam: "KJSEA",
    subject: "Integrated Science",
    topic: "Matter",
    q: "Which of these is a chemical change?",
    options: ["Melting ice", "Boiling water", "Rusting iron", "Cutting paper"],
    answer: 2,
    explain:
      "Rusting creates a new substance (iron oxide). The others are physical changes.",
  },

  // ==================== KJSEA Mathematics ====================
  {
    exam: "KJSEA",
    subject: "Mathematics",
    topic: "Algebra",
    q: "Solve for x: 3x + 5 = 20",
    options: ["3", "5", "7", "15"],
    answer: 1,
    explain: "Subtract 5: 3x = 15. Divide by 3: x = 5.",
  },
];

/* =========================================================
   STARTER NOTES
   ========================================================= */

export const SEED_NOTES = [
  {
    curriculum: "844",
    level: "Form 4",
    subject: "Mathematics",
    topic: "Integration",
    summary: "Reverse of differentiation — finding areas and totals.",
    keyPoints: [
      "Power rule: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C",
      "Always add constant C for indefinite integrals",
      "Definite integrals find area under a curve",
      "Example: ∫(3x² + 2x) dx = x³ + x² + C",
    ],
  },
  {
    curriculum: "844",
    level: "Form 4",
    subject: "Biology",
    topic: "Genetics",
    summary: "Study of heredity and variation.",
    keyPoints: [
      "Genes are units of inheritance on chromosomes",
      "Dominant alleles mask recessive ones",
      "Monohybrid cross Tt × Tt gives 1:2:1 genotype ratio",
      "Phenotype ratio for that cross is 3:1",
    ],
  },
  {
    curriculum: "844",
    level: "Form 3",
    subject: "Mathematics",
    topic: "Trigonometry",
    summary: "Relationships between triangle sides and angles.",
    keyPoints: [
      "SOH CAH TOA: sin = opp/hyp, cos = adj/hyp, tan = opp/adj",
      "3-4-5 triangle is a common right-triangle reference",
      "Pythagoras: a² + b² = c² (c is hypotenuse)",
      "Use inverse functions to find angles",
    ],
  },
  {
    curriculum: "844",
    level: "Form 2",
    subject: "Biology",
    topic: "Cell Structure",
    summary: "The cell is the basic unit of life.",
    keyPoints: [
      "Cell membrane: selectively permeable",
      "Nucleus: contains DNA, controls cell activity",
      "Mitochondria: energy (ATP) production",
      "Plant cells: cell wall, chloroplasts, large vacuole",
    ],
  },
  {
    curriculum: "844",
    level: "Form 1",
    subject: "Chemistry",
    topic: "Introduction to Chemistry",
    summary: "Chemistry studies matter and its changes.",
    keyPoints: [
      "Matter has mass and occupies space",
      "Three states: solid, liquid, gas",
      "Physical changes are reversible (melting)",
      "Chemical changes create new substances (burning)",
    ],
  },
  {
    curriculum: "CBE",
    level: "Grade 9",
    subject: "Integrated Science",
    topic: "Energy",
    summary: "The ability to do work.",
    keyPoints: [
      "Forms: kinetic, potential, thermal, chemical",
      "Energy is conserved (not created or destroyed)",
      "Transformations: e.g., chemical → kinetic",
      "Renewable vs. non-renewable sources",
    ],
  },
  {
    curriculum: "CBE",
    level: "Grade 8",
    subject: "Mathematics",
    topic: "Algebra",
    summary: "Using symbols to represent quantities.",
    keyPoints: [
      "Variables represent unknown values",
      "Solve equations by doing the same on both sides",
      "Inequalities use <, >, ≤, ≥",
      "Simplify before substituting values",
    ],
  },
  {
    curriculum: "CBE",
    level: "Grade 7",
    subject: "Integrated Science",
    topic: "Living Things",
    summary: "Characteristics that define life.",
    keyPoints: [
      "Movement, respiration, growth, reproduction",
      "Cells are the basic unit of life",
      "Plants make food; animals consume it",
      "Adaptation helps organisms survive",
    ],
  },
];

/* =========================================================
   SEED FUNCTIONS
   ========================================================= */

export async function seedQuestions() {
  log.info(`Seeding ${SEED_QUESTIONS.length} questions…`);
  const results = { added: 0, failed: 0 };
  for (const q of SEED_QUESTIONS) {
    try {
      await addQuestion(q);
      results.added += 1;
    } catch (e) {
      log.warn("Question seed failed:", e);
      results.failed += 1;
    }
  }
  return results;
}

export async function seedNotes() {
  log.info(`Seeding ${SEED_NOTES.length} notes…`);
  const results = { added: 0, failed: 0 };
  for (const n of SEED_NOTES) {
    try {
      await addNote(n);
      results.added += 1;
    } catch (e) {
      log.warn("Note seed failed:", e);
      results.failed += 1;
    }
  }
  return results;
}

export async function seedEverything() {
  const q = await seedQuestions();
  const n = await seedNotes();
  await updateContentManifest({
    questions: { all: new Date().toISOString() },
    notes: { all: new Date().toISOString() },
    examLinks: new Date().toISOString(),
    leaderboard: new Date().toISOString(),
  });
  return { questions: q, notes: n };
}
