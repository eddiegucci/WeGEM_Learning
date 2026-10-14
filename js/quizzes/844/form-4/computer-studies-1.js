// js/compete/844/form-4/computer-studies.js
// Compete question bank for Computer Studies (Form 4)
// Format: MCQ with points + time limit per question.

export default {
  exam: "KCSE",
  subject: "Computer Studies",
  grade: "Form 4",
  class: "form-4",
  curriculum: "844",
  title: "Computer Studies — Compete Bank",
  description: "Real-time MCQ bank for compete mode.",
  status: "draft", // change to "published" when ready
  updatedAt: "2026-10-13",
  version: "1.0",

  questions: [
    {
      q: "Which generation of computers used vacuum tubes?",
      options: [
        "First Generation",
        "Second Generation",
        "Third Generation",
        "Fourth Generation",
      ],
      answer: 0,
      topic: "Computer Evolution",
      points: 100,
      timeLimit: 20,
      explain:
        "First generation computers (1940-1958) used thermionic valves or vacuum tubes for processing and storage.",
    },
    {
      q: "What is the binary equivalent of decimal number 25?",
      options: ["11001", "11010", "10101", "10011"],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 25,
      explain:
        "25 ÷ 2 = 12 rem 1, 12 ÷ 2 = 6 rem 0, 6 ÷ 2 = 3 rem 0, 3 ÷ 2 = 1 rem 1, 1 ÷ 2 = 0 rem 1. Reading from bottom: 11001.",
    },
    {
      q: "Which of the following is NOT an input device?",
      options: ["Monitor", "Keyboard", "Mouse", "Scanner"],
      answer: 0,
      topic: "Computer Architecture",
      points: 100,
      timeLimit: 15,
      explain:
        "A monitor is an output device that displays information. Keyboard, mouse, and scanner are all input devices.",
    },
    {
      q: "What does GIGO stand for in computing?",
      options: [
        "Garbage In Garbage Out",
        "General Input General Output",
        "Graphics Input Graphics Output",
        "Gigabyte In Gigabyte Out",
      ],
      answer: 0,
      topic: "Data Processing",
      points: 100,
      timeLimit: 15,
      explain:
        "GIGO means 'Garbage In Garbage Out' — the accuracy of output depends on the accuracy of input data.",
    },
    {
      q: "Which type of software manages computer hardware resources?",
      options: [
        "Operating System",
        "Application Software",
        "Utility Software",
        "Programming Software",
      ],
      answer: 0,
      topic: "Operating Systems",
      points: 100,
      timeLimit: 20,
      explain:
        "An operating system is system software that manages computer hardware and software resources.",
    },
    {
      q: "What is the decimal equivalent of binary 1111?",
      options: ["15", "16", "14", "13"],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 20,
      explain:
        "1111₂ = (1×2³) + (1×2²) + (1×2¹) + (1×2⁰) = 8 + 4 + 2 + 1 = 15.",
    },
    {
      q: "Which network topology connects all devices to a central hub?",
      options: ["Star", "Bus", "Ring", "Mesh"],
      answer: 0,
      topic: "Networking",
      points: 100,
      timeLimit: 20,
      explain:
        "In a star topology, all devices connect to a central hub or switch which manages communication.",
    },
    {
      q: "What does HTML stand for?",
      options: [
        "HyperText Markup Language",
        "High Tech Modern Language",
        "HyperText Machine Language",
        "Home Tool Markup Language",
      ],
      answer: 0,
      topic: "Internet and Email",
      points: 100,
      timeLimit: 15,
      explain:
        "HTML stands for HyperText Markup Language, used for creating web pages.",
    },
    {
      q: "Which storage device uses laser technology to read and write data?",
      options: ["CD-ROM", "Hard disk", "Floppy disk", "Magnetic tape"],
      answer: 0,
      topic: "Computer Memory",
      points: 100,
      timeLimit: 20,
      explain:
        "CD-ROM uses laser technology (optical storage) to read data. Hard disks, floppy disks, and magnetic tapes use magnetic technology.",
    },
    {
      q: "What is the full meaning of ICT?",
      options: [
        "Information and Communication Technology",
        "International Computer Technology",
        "Integrated Computer Terminal",
        "Information Control Technology",
      ],
      answer: 0,
      topic: "Impact of ICT on Society",
      points: 100,
      timeLimit: 15,
      explain:
        "ICT stands for Information and Communication Technology — the integration of computers and telecommunication facilities.",
    },
    {
      q: "Which of the following is a volatile memory?",
      options: ["RAM", "ROM", "Hard Disk", "Flash Disk"],
      answer: 0,
      topic: "Computer Memory",
      points: 100,
      timeLimit: 15,
      explain:
        "RAM (Random Access Memory) is volatile — it loses its contents when power is switched off. ROM, hard disks, and flash disks are non-volatile.",
    },
    {
      q: "How many bits make one nibble?",
      options: ["4", "8", "16", "2"],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 15,
      explain: "A nibble consists of 4 bits (half a byte).",
    },
    {
      q: "Which key combination is used to copy text in most applications?",
      options: ["Ctrl + C", "Ctrl + V", "Ctrl + X", "Ctrl + P"],
      answer: 0,
      topic: "Productivity Tools",
      points: 100,
      timeLimit: 10,
      explain:
        "Ctrl + C is the shortcut for copying. Ctrl + V is paste, Ctrl + X is cut, and Ctrl + P is print.",
    },
    {
      q: "What does CPU stand for?",
      options: [
        "Central Processing Unit",
        "Computer Personal Unit",
        "Central Program Utility",
        "Control Processing Unit",
      ],
      answer: 0,
      topic: "Computer Architecture",
      points: 100,
      timeLimit: 10,
      explain:
        "CPU stands for Central Processing Unit — the brain of the computer that processes data and controls operations.",
    },
    {
      q: "Which of the following is an example of system software?",
      options: ["Windows 10", "Microsoft Word", "Excel", "Photoshop"],
      answer: 0,
      topic: "Operating Systems",
      points: 100,
      timeLimit: 15,
      explain:
        "Windows 10 is an operating system (system software). Microsoft Word, Excel, and Photoshop are application software.",
    },
    {
      q: "Which protocol is used for transferring web pages on the internet?",
      options: ["HTTP", "FTP", "SMTP", "TCP"],
      answer: 0,
      topic: "Internet and Email",
      points: 100,
      timeLimit: 20,
      explain:
        "HTTP (HyperText Transfer Protocol) is used for transferring web pages. FTP is for file transfer, SMTP is for email, and TCP is for transmission control.",
    },
    {
      q: "What is the base of the hexadecimal number system?",
      options: ["16", "8", "2", "10"],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 15,
      explain:
        "Hexadecimal uses base 16 with digits 0-9 and letters A-F (where A=10, B=11, ..., F=15).",
    },
    {
      q: "Which of the following is NOT a computer crime?",
      options: ["Programming", "Hacking", "Piracy", "Fraud"],
      answer: 0,
      topic: "Data Security and Controls",
      points: 100,
      timeLimit: 15,
      explain:
        "Programming is a legitimate activity. Hacking, piracy, and fraud are all computer crimes.",
    },
    {
      q: "What is the function of the ALU in the CPU?",
      options: [
        "Perform arithmetic and logic operations",
        "Control data flow",
        "Store data permanently",
        "Manage input devices",
      ],
      answer: 0,
      topic: "Computer Architecture",
      points: 100,
      timeLimit: 20,
      explain:
        "The Arithmetic Logic Unit (ALU) performs arithmetic calculations and logical comparisons on data.",
    },
    {
      q: "Which file organization method stores records in a sorted order using a key field?",
      options: ["Sequential", "Random", "Serial", "Indexed"],
      answer: 0,
      topic: "Data Processing",
      points: 100,
      timeLimit: 20,
      explain:
        "In sequential file organization, records are stored and accessed in a particular order sorted using a key field.",
    },
    {
      q: "What does URL stand for?",
      options: [
        "Uniform Resource Locator",
        "Universal Reference Link",
        "Uniform Reference Locator",
        "Universal Resource Link",
      ],
      answer: 0,
      topic: "Internet and Email",
      points: 100,
      timeLimit: 15,
      explain:
        "URL stands for Uniform Resource Locator — the address given to every resource on the internet.",
    },
    {
      q: "Which of the following is a non-impact printer?",
      options: [
        "Laser Printer",
        "Dot Matrix Printer",
        "Daisy Wheel Printer",
        "Golf Ball Printer",
      ],
      answer: 0,
      topic: "Computer Architecture",
      points: 100,
      timeLimit: 20,
      explain:
        "A laser printer is a non-impact printer (uses laser technology). Dot matrix, daisy wheel, and golf ball are impact printers.",
    },
    {
      q: "What is the purpose of a firewall in network security?",
      options: [
        "Filter data between networks",
        "Store backup data",
        "Increase network speed",
        "Connect to the internet",
      ],
      answer: 0,
      topic: "Data Security and Controls",
      points: 100,
      timeLimit: 20,
      explain:
        "A firewall filters data and information exchanged between different networks by enforcing access control policies.",
    },
    {
      q: "Which type of operating system allows multiple users to access the computer simultaneously?",
      options: ["Multi-user", "Single-user", "Single-tasking", "Real-time"],
      answer: 0,
      topic: "Operating Systems",
      points: 100,
      timeLimit: 20,
      explain:
        "A multi-user operating system allows more than one user to access the computer at the same time, e.g., UNIX, Linux.",
    },
    {
      q: "What is the binary equivalent of hexadecimal number A?",
      options: ["1010", "1111", "1001", "1100"],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 20,
      explain:
        "In hexadecimal, A represents decimal 10, which is 1010 in binary.",
    },
    {
      q: "Which of the following is a secondary storage device?",
      options: ["Hard Disk", "RAM", "ROM", "Cache Memory"],
      answer: 0,
      topic: "Computer Memory",
      points: 100,
      timeLimit: 15,
      explain:
        "A hard disk is a secondary storage device. RAM, ROM, and cache memory are primary storage.",
    },
    {
      q: "What is the full meaning of ASCII?",
      options: [
        "American Standard Code for Information Interchange",
        "American Standard Computer Information Code",
        "Automated Standard Code for Information Interchange",
        "American System Code for Information Interchange",
      ],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 20,
      explain:
        "ASCII stands for American Standard Code for Information Interchange — a 7-bit coding scheme for representing characters.",
    },
    {
      q: "Which of the following is an example of guided transmission media?",
      options: ["Twisted pair cable", "Microwave", "Radio waves", "Infrared"],
      answer: 0,
      topic: "Networking",
      points: 100,
      timeLimit: 20,
      explain:
        "Twisted pair cable is a guided (bounded) medium. Microwave, radio waves, and infrared are unguided (wireless) media.",
    },
    {
      q: "What is the purpose of a compiler?",
      options: [
        "Translate source code to machine code",
        "Execute programs line by line",
        "Store data permanently",
        "Manage computer memory",
      ],
      answer: 0,
      topic: "Programming",
      points: 100,
      timeLimit: 20,
      explain:
        "A compiler translates the entire source program into object code (machine code) before execution.",
    },
    {
      q: "Which of the following is a valid IP address?",
      options: ["192.168.1.1", "256.100.50.25", "192.168.1", "192.168.1.1.1"],
      answer: 0,
      topic: "Networking",
      points: 100,
      timeLimit: 25,
      explain:
        "A valid IP address consists of four numbers separated by dots, each ranging from 0-255. 192.168.1.1 is valid.",
    },
    {
      q: "What is the purpose of the recycle bin in Windows?",
      options: [
        "Store deleted files temporarily",
        "Store system files",
        "Increase memory",
        "Manage network connections",
      ],
      answer: 0,
      topic: "Operating Systems",
      points: 100,
      timeLimit: 15,
      explain:
        "The recycle bin contains files and folders that have been deleted and can be used to restore them if needed.",
    },
    {
      q: "Which of the following is NOT a type of data validation check?",
      options: [
        "Calculation check",
        "Range check",
        "Presence check",
        "Type check",
      ],
      answer: 0,
      topic: "Data Processing",
      points: 100,
      timeLimit: 20,
      explain:
        "Calculation check is not a standard validation type. Common validation checks include range, presence, type, and consistency checks.",
    },
    {
      q: "What is the function of a modem in data communication?",
      options: [
        "Convert digital signals to analog and vice versa",
        "Store data permanently",
        "Increase processing speed",
        "Manage network security",
      ],
      answer: 0,
      topic: "Networking",
      points: 100,
      timeLimit: 20,
      explain:
        "A modem (modulator-demodulator) converts digital signals to analog for transmission and analog back to digital on reception.",
    },
    {
      q: "Which of the following is an example of an output device?",
      options: ["Plotter", "Scanner", "Joystick", "Microphone"],
      answer: 0,
      topic: "Computer Architecture",
      points: 100,
      timeLimit: 15,
      explain:
        "A plotter is an output device used for producing large graphical output. Scanner, joystick, and microphone are input devices.",
    },
    {
      q: "What is the main function of the control unit in the CPU?",
      options: [
        "Coordinate and control all computer operations",
        "Perform arithmetic calculations",
        "Store data temporarily",
        "Display output",
      ],
      answer: 0,
      topic: "Computer Architecture",
      points: 100,
      timeLimit: 20,
      explain:
        "The Control Unit coordinates all activities of the computer by fetching, decoding, and executing instructions.",
    },
    {
      q: "Which of the following is a characteristic of a good password?",
      options: [
        "Contains letters and numbers",
        "Is easy to guess",
        "Is short and simple",
        "Is the same for all accounts",
      ],
      answer: 0,
      topic: "Data Security and Controls",
      points: 100,
      timeLimit: 15,
      explain:
        "A good password should be at least 6 characters long, contain both letters and numbers, and not be easy to guess.",
    },
    {
      q: "What is the octal equivalent of decimal number 64?",
      options: ["100", "80", "64", "44"],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 25,
      explain:
        "64 ÷ 8 = 8 rem 0, 8 ÷ 8 = 1 rem 0, 1 ÷ 8 = 0 rem 1. Reading from bottom: 100₈.",
    },
    {
      q: "Which of the following is an example of application software?",
      options: ["Microsoft Excel", "Windows 10", "Linux", "UNIX"],
      answer: 0,
      topic: "Operating Systems",
      points: 100,
      timeLimit: 15,
      explain:
        "Microsoft Excel is application software. Windows 10, Linux, and UNIX are operating systems (system software).",
    },
    {
      q: "What is the purpose of data encryption?",
      options: [
        "Protect data from unauthorized access",
        "Increase data storage",
        "Speed up data processing",
        "Compress data",
      ],
      answer: 0,
      topic: "Data Security and Controls",
      points: 100,
      timeLimit: 20,
      explain:
        "Data encryption transforms data into a coded form that only authorized parties can decode, protecting it from unauthorized access.",
    },
    {
      q: "Which network device connects multiple networks and routes data between them?",
      options: ["Router", "Hub", "Repeater", "Bridge"],
      answer: 0,
      topic: "Networking",
      points: 100,
      timeLimit: 20,
      explain:
        "A router interconnects different networks and directs the transfer of data packets from source to destination based on network addresses.",
    },
    {
      q: "What is the binary equivalent of decimal number 100?",
      options: ["1100100", "1010000", "1100010", "1001100"],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 25,
      explain:
        "100 ÷ 2 = 50 rem 0, 50 ÷ 2 = 25 rem 0, 25 ÷ 2 = 12 rem 1, 12 ÷ 2 = 6 rem 0, 6 ÷ 2 = 3 rem 0, 3 ÷ 2 = 1 rem 1, 1 ÷ 2 = 0 rem 1. Reading from bottom: 1100100.",
    },
    {
      q: "Which of the following is a type of system software?",
      options: ["Utility program", "Word processor", "Spreadsheet", "Database"],
      answer: 0,
      topic: "Operating Systems",
      points: 100,
      timeLimit: 15,
      explain:
        "Utility programs are system software that perform maintenance tasks. Word processors, spreadsheets, and databases are application software.",
    },
    {
      q: "What does the acronym DBMS stand for?",
      options: [
        "Database Management System",
        "Data Backup Management System",
        "Digital Base Management System",
        "Database Memory System",
      ],
      answer: 0,
      topic: "Databases",
      points: 100,
      timeLimit: 15,
      explain:
        "DBMS stands for Database Management System — software used to create, organize, and manage databases.",
    },
    {
      q: "Which of the following is a benefit of using a computer network?",
      options: [
        "Resource sharing",
        "Increased isolation",
        "Slower communication",
        "Higher costs",
      ],
      answer: 0,
      topic: "Networking",
      points: 100,
      timeLimit: 15,
      explain:
        "Computer networks enable resource sharing (printers, files, internet), faster communication, and centralized data management.",
    },
    {
      q: "What is the purpose of a flowchart in programming?",
      options: [
        "Graphical representation of program logic",
        "Store program data",
        "Execute program code",
        "Compile source code",
      ],
      answer: 0,
      topic: "Programming",
      points: 100,
      timeLimit: 20,
      explain:
        "A flowchart is a graphical representation of the step-by-step processing logic of a program using standard symbols.",
    },
    {
      q: "Which of the following is NOT a characteristic of a computer?",
      options: ["Emotional intelligence", "Speed", "Accuracy", "Diligence"],
      answer: 0,
      topic: "Computer Evolution",
      points: 100,
      timeLimit: 20,
      explain:
        "Computers do not have emotional intelligence. They are characterized by speed, accuracy, diligence, storage, and versatility.",
    },
    {
      q: "What is the purpose of disk defragmentation?",
      options: [
        "Rearrange scattered files for faster access",
        "Delete unnecessary files",
        "Increase disk capacity",
        "Format the disk",
      ],
      answer: 0,
      topic: "Operating Systems",
      points: 100,
      timeLimit: 20,
      explain:
        "Disk defragmentation rearranges scattered files and folders on storage media to speed up access and retrieval.",
    },
    {
      q: "Which of the following is an example of a web browser?",
      options: [
        "Google Chrome",
        "Microsoft Word",
        "Windows Explorer",
        "Adobe Photoshop",
      ],
      answer: 0,
      topic: "Internet and Email",
      points: 100,
      timeLimit: 15,
      explain:
        "Google Chrome is a web browser. Microsoft Word, Windows Explorer, and Adobe Photoshop are not web browsers.",
    },
    {
      q: "What is the decimal equivalent of octal number 17?",
      options: ["15", "17", "14", "16"],
      answer: 0,
      topic: "Data Representation",
      points: 100,
      timeLimit: 20,
      explain: "17₈ = (1×8¹) + (7×8⁰) = 8 + 7 = 15₁₀.",
    },
    {
      q: "Which of the following is a feature of a word processor?",
      options: [
        "Spell checking",
        "Database management",
        "Network administration",
        "Disk formatting",
      ],
      answer: 0,
      topic: "Productivity Tools",
      points: 100,
      timeLimit: 15,
      explain:
        "Spell checking is a word processing feature. Database management, network administration, and disk formatting are not word processor features.",
    },
  ],
};
