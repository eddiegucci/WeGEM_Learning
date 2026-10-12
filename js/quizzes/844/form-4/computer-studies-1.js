// js/quizzes/844/form-4/computer-studies-1.js
// Form 4 Computer Studies — Set 1 (typed answers, markpoint scoring)

export default {
  exam: "KCSE",
  subject: "Computer Studies",
  grade: "Form 4",
  class: "form-4",
  curriculum: "844",
  title: "Computer Studies — Set 1",
  description:
    "KCSE Form 4 Computer Studies practice — databases, system analysis, networking, security, programming, architecture, and web design.",
  duration: 60 * 60,
  totalMarks: 20,
  status: "published",
  updatedAt: "2026-10-12",
  version: "1.1",

  questions: [
    {
      q: "State the database term used to describe a unique identifier for each record in a table.",
      marks: 1,
      topic: "Databases",
      markpoints: [{ text: "Primary Key", marks: 1 }],
    },
    {
      q: "Give two advantages of using fiber optic cables over twisted pair cables in computer networking.",
      marks: 2,
      topic: "Networking",
      markpoints: [
        { text: "High bandwidth or faster transmission speed", marks: 1 },
        {
          text: "Immune to electromagnetic interference or secure transmission",
          marks: 1,
        },
      ],
    },
    {
      q: "List the two main components of the Central Processing Unit (CPU).",
      marks: 2,
      topic: "Computer Architecture",
      markpoints: [
        { text: "Control Unit", marks: 1 },
        { text: "Arithmetic Logic Unit", marks: 1 },
      ],
    },
    {
      q: "During system analysis, state two methods of gathering information about an existing system.",
      marks: 2,
      topic: "System Analysis and Design",
      markpoints: [
        {
          text: "Interviews or Questionnaires or Observation or Document Review",
          marks: 2,
        },
      ],
    },
    {
      q: "Define the term 'data integrity' in the context of database security.",
      marks: 2,
      topic: "Data Security and Controls",
      markpoints: [
        { text: "Accuracy", marks: 1 },
        { text: "Consistency or validity of data", marks: 1 },
      ],
    },
    {
      q: "Identify the HTML tag used to create the largest heading on a web page.",
      marks: 1,
      topic: "Web Design",
      markpoints: [{ text: "<h1>", marks: 1 }],
    },
    {
      q: "State two types of errors that may occur during computer program execution or development.",
      marks: 2,
      topic: "Programming",
      markpoints: [
        { text: "Syntax error or Logical error or Run-time error", marks: 2 },
      ],
    },
    {
      q: "Distinguish between RAM and ROM in terms of volatility.",
      marks: 2,
      topic: "Computer Memory",
      markpoints: [
        {
          text: "RAM is volatile (loses data when power is turned off)",
          marks: 1,
        },
        {
          text: "ROM is non-volatile (retains data when power is turned off)",
          marks: 1,
        },
      ],
    },
    {
      q: "State two functions of an Operating System.",
      marks: 2,
      topic: "Operating Systems",
      markpoints: [
        {
          text: "Memory management or Processor management or Input/Output management or File management",
          marks: 2,
        },
      ],
    },
    {
      q: "Name two guided transmission media used in computer networks.",
      marks: 1,
      topic: "Networking",
      markpoints: [
        {
          text: "Twisted pair cable or Coaxial cable or Fiber optic cable",
          marks: 1,
        },
      ],
    },
    {
      q: "Give two reasons why software documentation is important during system development.",
      marks: 2,
      topic: "System Analysis and Design",
      markpoints: [
        { text: "Eases system maintenance or troubleshooting", marks: 1 },
        {
          text: "Guides user training or references how to operate the system",
          marks: 1,
        },
      ],
    },
    {
      q: "State the purpose of a firewall in network security.",
      marks: 1,
      topic: "Data Security and Controls",
      markpoints: [
        {
          text: "To monitor and filter incoming and outgoing network traffic based on security rules",
          marks: 1,
        },
      ],
    },
    {
      q: "Explain what is meant by 'desktop publishing' (DTP).",
      marks: 1,
      topic: "Desktop Publishing",
      markpoints: [
        {
          text: "The creation of documents using page layout software on a personal computer",
          marks: 1,
        },
      ],
    },
    {
      q: "List two examples of spreadsheet software used in data processing.",
      marks: 1,
      topic: "Spreadsheets",
      markpoints: [
        {
          text: "Microsoft Excel or Google Sheets or Lotus 1-2-3 or LibreOffice Calc",
          marks: 1,
        },
      ],
    },
    {
      q: "State one advantage and one disadvantage of the star network topology.",
      marks: 2,
      topic: "Networking",
      markpoints: [
        {
          text: "Advantage: Easy to add/remove devices or failure of one cable doesn't bring down the whole network",
          marks: 1,
        },
        {
          text: "Disadvantage: Requires more cable length or failure of the central hub/switch disables the entire network",
          marks: 1,
        },
      ],
    },
  ],
};
