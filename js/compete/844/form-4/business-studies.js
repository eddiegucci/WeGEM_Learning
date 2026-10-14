// js/compete/844/form-4/computer-studies.js
// Form 4 Computer Studies — Compete Question Bank

export default {
  exam: "KCSE",
  subject: "Business Studies",
  grade: "Form 4",
  class: "form-4",
  curriculum: "844",
  title: "Business Studies — Compete Bank",
  description:
    "Real-time MCQ bank — databases, networking, system analysis, security.",
  status: "published",
  updatedAt: "2026-10-12",
  version: "1.0",

  questions: [
    {
      q: "What is the unique identifier for each record in a database table?",
      options: ["Foreign Key", "Primary Key", "Composite Key", "Candidate Key"],
      answer: 1,
      topic: "Databases",
      points: 100,
      timeLimit: 20,
      explain: "A Primary Key uniquely identifies each record in a table.",
    },
    {
      q: "Which of these is NOT an advantage of fiber optic cable over twisted pair?",
      options: [
        "Higher bandwidth",
        "Immune to EMI",
        "Cheaper to install",
        "Longer transmission distance",
      ],
      answer: 2,
      topic: "Networking",
      points: 100,
      timeLimit: 20,
      explain: "Fiber optic is more expensive to install than twisted pair.",
    },
    {
      q: "What are the two main components of a CPU?",
      options: [
        "RAM and ROM",
        "Control Unit and ALU",
        "Cache and Registers",
        "Input and Output",
      ],
      answer: 1,
      topic: "Computer Architecture",
      points: 100,
      timeLimit: 15,
      explain:
        "The CPU consists of the Control Unit (CU) and the Arithmetic Logic Unit (ALU).",
    },
    {
      q: "Which method of system analysis involves watching users perform their tasks?",
      options: ["Interview", "Questionnaire", "Observation", "Document Review"],
      answer: 2,
      topic: "System Analysis",
      points: 100,
      timeLimit: 15,
      explain:
        "Observation involves watching users directly to understand workflows.",
    },
    {
      q: "What is data integrity?",
      options: [
        "Speed of data retrieval",
        "Accuracy and consistency of data",
        "Amount of data stored",
        "Type of storage media",
      ],
      answer: 1,
      topic: "Data Security",
      points: 100,
      timeLimit: 15,
      explain: "Data integrity refers to the accuracy and consistency of data.",
    },
    {
      q: "Which HTML tag creates the largest heading?",
      options: ["<h6>", "<head>", "<h1>", "<title>"],
      answer: 2,
      topic: "Web Design",
      points: 100,
      timeLimit: 10,
      explain: "<h1> produces the largest heading in HTML.",
    },
    {
      q: "Which of these is a logical error in programming?",
      options: [
        "Missing semicolon",
        "Using a variable without declaring it",
        "Using wrong formula for a calculation",
        "Mismatched brackets",
      ],
      answer: 2,
      topic: "Programming",
      points: 100,
      timeLimit: 20,
      explain:
        "Logical errors produce wrong results but the program still runs.",
    },
    {
      q: "Which memory is volatile?",
      options: ["ROM", "RAM", "Hard Disk", "Flash Drive"],
      answer: 1,
      topic: "Computer Memory",
      points: 100,
      timeLimit: 10,
      explain: "RAM is volatile — data is lost when power is switched off.",
    },
    {
      q: "Which is a function of an operating system?",
      options: [
        "Writing emails",
        "Managing files and memory",
        "Creating spreadsheets",
        "Browsing the internet",
      ],
      answer: 1,
      topic: "Operating Systems",
      points: 100,
      timeLimit: 15,
      explain:
        "Operating systems manage files, memory, processes, and devices.",
    },
    {
      q: "Which topology has all devices connected to a single central hub?",
      options: ["Bus", "Ring", "Star", "Mesh"],
      answer: 2,
      topic: "Networking",
      points: 100,
      timeLimit: 15,
      explain:
        "In a star topology, all devices connect to a central hub or switch.",
    },
    {
      q: "What is the main purpose of a firewall?",
      options: [
        "Speed up internet",
        "Monitor and filter network traffic",
        "Store backups",
        "Scan for malware",
      ],
      answer: 1,
      topic: "Data Security",
      points: 100,
      timeLimit: 15,
      explain:
        "Firewalls monitor and control incoming and outgoing network traffic.",
    },
    {
      q: "Which spreadsheet function adds a range of numbers?",
      options: ["COUNT", "AVERAGE", "SUM", "MAX"],
      answer: 2,
      topic: "Spreadsheets",
      points: 100,
      timeLimit: 10,
      explain: "SUM() adds all numbers in a range.",
    },
  ],
};
