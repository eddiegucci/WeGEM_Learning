# WeGEM Learning

> Interactive exam preparation for Kenyan students — KCSE, KJSEA, and KPSEA.

A production-grade web app with offline support, real-time multiplayer quizzes, and comprehensive progress tracking.

**Live:** https://wegemlearning.vercel.app

---

## ✨ Features

- 📚 **Notes** — structured study notes by subject and topic
- ⚡ **Solo Quiz** — practice with instant feedback and explanations
- 🏆 **Compete Quiz** — real-time multiplayer via Firebase Realtime DB
- 📄 **Exam Links** — collect and share past papers, revision notes, and videos
- 📈 **Progress** — analytics, streaks, topic performance, and history
- 📊 **Leaderboard** — national rankings filtered by timeframe and curriculum
- 🎨 **Wallpapers** — 142 curated backgrounds across 11 categories
- 🔐 **Firebase Auth** — email + password with password reset
- 📱 **PWA** — installable, offline-capable, mobile-first
- ⚙️ **Admin Panel** — content management and user administration

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML, CSS, JavaScript (ES modules) |
| Auth | Firebase Authentication |
| Content DB | Firestore |
| Real-time | Firebase Realtime Database |
| Caching | IndexedDB + Service Worker |
| Hosting | Vercel |
| Version control | GitHub |

**No build step. No npm. No bundler.** Pure web standards.

---

## 📁 Project Structure
wegem-learning/
├── index.html Slideshow intro (landing)
├── signup.html Multi-step signup
├── login.html Sign in
├── forgot-password.html Password reset
├── home.html Dashboard
├── notes.html Study notes
├── exams.html Exam resources
├── quiz.html Solo quiz
├── compete.html Multiplayer compete quiz
├── leaderboard.html Rankings
├── progress.html Analytics
├── wallpapers.html Wallpaper picker
├── settings.html Account settings
├── admin.html Admin panel
│
├── css/
│ ├── base.css Reset + tokens
│ ├── layout.css Top nav, container
│ ├── components.css Buttons, cards, forms, modals
│ ├── pages.css Page-specific layouts
│ ├── mobile.css Mobile bottom nav + responsive
│ └── main.css Imports all of the above
│
├── js/
│ ├── config/
│ │ └── firebase-config.js
│ │
│ ├── core/
│ │ ├── utils.js Helpers
│ │ ├── auth.js Firebase Auth wrapper
│ │ ├── db.js Firestore wrapper
│ │ ├── cache.js IndexedDB caching
│ │ ├── sync.js Delta sync engine
│ │ └── router.js Route guards
│ │
│ ├── ui/
│ │ ├── nav.js Top nav
│ │ ├── toast.js Notifications
│ │ ├── modal.js Dialogs
│ │ ├── tray.js Bottom tray
│ │ └── shortcuts.js Keyboard + tap shortcuts
│ │
│ ├── features/
│ │ ├── quiz-engine.js Pure quiz logic
│ │ ├── quiz-single.js Solo quiz flow
│ │ ├── quiz-compete.js Multiplayer
│ │ ├── leaderboard.js Rankings
│ │ ├── notes.js Notes logic
│ │ ├── exams.js Exam links logic
│ │ ├── progress.js Analytics
│ │ └── admin.js Admin actions
│ │
│ ├── pages/
│ │ ├── intro.js
│ │ ├── signup.js
│ │ ├── login.js
│ │ ├── forgot-password.js
│ │ ├── home.js
│ │ ├── notes.js
│ │ ├── exams.js
│ │ ├── quiz.js
│ │ ├── compete.js
│ │ ├── leaderboard.js
│ │ ├── progress.js
│ │ ├── wallpapers.js
│ │ ├── settings.js
│ │ └── admin.js
│ │
│ └── data/
│ ├── subjects.js Subject lists
│ ├── wallpapers.js 142 wallpapers
│ └── seed.js Starter content
│
├── assets/
│ └── icons/ PWA icons
│
├── firestore.rules Firestore security rules
├── firebase.rules Realtime DB rules (reference)
├── manifest.webmanifest PWA manifest
├── service-worker.js Offline support
├── vercel.json Deployment config
├── .gitignore
└── README.md

---

## 🚀 Local Development

No build tools required.

### Option A — VS Code Live Server
1. Install **Live Server** extension
2. Right-click `index.html` → **Open with Live Server**
3. Browser opens at `http://127.0.0.1:5500`

### Option B — Python
```bash
python -m http.server 5500