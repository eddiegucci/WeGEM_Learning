# WeGEM Learning

> Interactive exam preparation for Kenyan students — built for the **8-4-4** and **CBE** curricula.

WeGEM Learning is a free, offline-first web app that helps learners prepare for **KPSEA**, **KJSEA**, and **KCSE** exams. It combines long-form study notes, interactive quizzes, past papers, and progress tracking in one clean, fast experience.

**Live app:** https://wegemlearning.vercel.app

---

## ✨ Features

### 📖 Notes
- **Long-form canvas notes** — Word-style paginated documents with auto-flow pages
- **Quick notes** — short subject/topic cards for fast revision
- **Search** across titles, subjects, and inside page content
- **Subject filter** chips for navigation

### ⚡ Practice (Quiz)
- **Custom quizzes** authored by admin — HTML questions + JS marking schemes
- **Built-in practice** — instant-feedback quizzes from the static question bank
- **Automatic marking** with detailed answer breakdown
- **Score recording** — every attempt saved to Firebase

### 📄 Exams
- **Long-form exam documents** (canvas, same paginated system)
- **Linked resources** — add external papers, PDFs, or videos
- **Papers by Subject** — grid view of available material

### 📊 Progress
- Streak tracking, average score, study time
- Performance chart (last 10 attempts)
- Topic-level performance — weakest-first
- Subject breakdown with attempt counts
- Recent activity feed

### 🎨 Personalization
- 8 curated wallpapers (default: world map & globe)
- Choice saved to device

### 🎓 Curriculum Support
- **8-4-4** — Form 1 to Form 4
- **CBE** — Grade 7 to Grade 9

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (ES modules) |
| Backend | Firebase Realtime Database |
| Auth | Email + SHA-256 hashed password |
| Hosting | Vercel (auto-deploys on push) |
| Version control | GitHub |

**No build step. No bundler. No npm.**

---

## 📁 Project Structure
wegem-learning/
├── index.html Slideshow intro (landing)
├── signup.html Curriculum → level → subjects → details
├── login.html Sign in
├── home.html Dashboard
├── notes.html Notes browser
├── exams.html Exams browser
├── quiz.html Quiz library + runner
├── quiz-builder.html Admin — author quizzes
├── canvas.html Word-style canvas editor
├── progress.html Progress dashboard
├── wallpapers.html Wallpaper picker
├── settings.html Profile & preferences
│
├── css/
│ └── style.css Complete design system
│
├── js/
│ ├── firebase.js Firebase config + API
│ ├── data.js Question bank, notes, subjects
│ ├── storage.js localStorage fallback
│ ├── wallpaper-init.js Apply saved wallpaper on load
│ ├── slideshow.js Intro slideshow
│ ├── signup.js Signup flow
│ ├── login.js Login
│ ├── main.js Dashboard
│ ├── notes.js Notes
│ ├── exams.js Exams
│ ├── quiz.js Quiz library + runner
│ ├── quiz-builder.js Admin quiz authoring
│ ├── canvas.js Canvas editor
│ ├── progress.js Progress dashboard
│ └── settings.js Settings
│
├── assets/images/ Your own images (optional)
├── .gitignore
└── README.md

---

## 🚀 Local Development

No build tools required. Pick one method:

### Option A — VS Code Live Server
1. Install **Live Server** in VS Code
2. Right-click `index.html` → **Open with Live Server**
3. Opens at `http://127.0.0.1:5500`

### Option B — Python
```bash
python -m http.server 5500