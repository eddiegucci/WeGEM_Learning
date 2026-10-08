// js/pages/intro.js
// Controller for index.html — the WeGEM Learning intro slideshow.
// Loads a rotating slideshow of subject images, then redirects to signup.

import { getCachedUser, waitForAuth } from "../core/auth.js";
import { log, sleep } from "../core/utils.js";

/* =========================================================
   CONFIG
   ========================================================= */

const SLIDE_DURATION = 1700; // ms visible per slide
const REDIRECT_URL = "signup.html"; // where to go after slideshow
const REDIRECT_AFTER_LAST = 700; // ms delay after last slide
const SKIP_REDIRECT_DELAY = 400; // ms delay when user skips
const AUTH_CHECK_TIMEOUT = 900; // ms max wait for Firebase Auth
const FIRST_IMAGE_TIMEOUT = 4000; // ms max wait for first slide image
const MAX_SESSION_CACHE_AGE = 1000 * 60 * 60 * 24; // 24 hours

const STORAGE_KEY_INTRO_SEEN = "wegem_intro_seen";
const STORAGE_KEY_INTRO_TIMESTAMP = "wegem_intro_last";

/* =========================================================
   SLIDES
   Each slide shows a subject name and a background image.
   Images are 1400px wide (fast load, still crisp on retina).
   ========================================================= */

const SLIDES = [
  {
    subject: "Kiswahili",
    img: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1400&q=60&auto=format",
  },
  {
    subject: "Mathematics",
    img: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1400&q=60&auto=format",
  },
  {
    subject: "English",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1400&q=60&auto=format",
  },
  {
    subject: "Biology",
    img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1400&q=60&auto=format",
  },
  {
    subject: "Chemistry",
    img: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=1400&q=60&auto=format",
  },
  {
    subject: "Physics",
    img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1400&q=60&auto=format",
  },
  {
    subject: "Geography",
    img: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1400&q=60&auto=format",
  },
  {
    subject: "History",
    img: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=1400&q=60&auto=format",
  },
  {
    subject: "CRE",
    img: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1400&q=60&auto=format",
  },
  {
    subject: "Agriculture",
    img: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1400&q=60&auto=format",
  },
  {
    subject: "Business",
    img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1400&q=60&auto=format",
  },
  {
    subject: "Computer Studies",
    img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1400&q=60&auto=format",
  },
  {
    subject: "Woodwork",
    img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1400&q=60&auto=format",
  },
  {
    subject: "Metalwork",
    img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1400&q=60&auto=format",
  },
  {
    subject: "Music",
    img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1400&q=60&auto=format",
  },
  {
    subject: "Fine Art",
    img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1400&q=60&auto=format",
  },
  {
    subject: "Home Science",
    img: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1400&q=60&auto=format",
  },
  {
    subject: "Physical Education",
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=60&auto=format",
  },
  {
    subject: "French",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=60&auto=format",
  },
  {
    subject: "German",
    img: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&q=60&auto=format",
  },
  {
    subject: "Spanish",
    img: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1400&q=60&auto=format",
  },
  {
    subject: "Chinese",
    img: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1400&q=60&auto=format",
  },
  {
    subject: "Indian",
    img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1400&q=60&auto=format",
  },
  {
    subject: "Life Skills",
    img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1400&q=60&auto=format",
  },
];

/* =========================================================
   STATE
   ========================================================= */

const state = {
  slideEls: [],
  dotEls: [],
  currentIndex: 0,
  timerId: null,
  isDone: false,
  hasStarted: false,
  isPaused: false,
  lastUserInteraction: Date.now(),
};

/* =========================================================
   DOM REFERENCES
   ========================================================= */

const els = {
  slideshow: document.getElementById("slideshow"),
  subjectLabel: document.getElementById("subjectLabel"),
  dots: document.getElementById("dots"),
  skipBtn: document.getElementById("skipBtn"),
  loading: document.getElementById("introLoading"),
  wrap: document.getElementById("introWrap"),
};

/* =========================================================
   EARLY SESSION REDIRECT
   ========================================================= */

async function checkExistingSession() {
  // Fast path: check local cache first
  try {
    const cached = getCachedUser();
    if (cached) {
      log.info("Session found in cache, redirecting to home");
      window.location.replace("home.html");
      return true;
    }
  } catch (e) {
    log.warn("Cache check failed:", e);
  }

  // Slow path: wait for Firebase Auth, but cap the wait time
  try {
    const user = await Promise.race([
      waitForAuth(),
      sleep(AUTH_CHECK_TIMEOUT).then(() => null),
    ]);

    if (user) {
      log.info("Firebase session found, redirecting to home");
      window.location.replace("home.html");
      return true;
    }
  } catch (e) {
    log.warn("Auth check failed:", e);
  }

  return false;
}

/* =========================================================
   IMAGE PRELOADING
   ========================================================= */

function preloadImage(url, timeoutMs = FIRST_IMAGE_TIMEOUT) {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;

    const finish = (status) => {
      if (settled) return;
      settled = true;
      img.onload = null;
      img.onerror = null;
      resolve(status);
    };

    const timer = setTimeout(() => finish("timeout"), timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      finish("loaded");
    };

    img.onerror = () => {
      clearTimeout(timer);
      finish("error");
    };

    img.src = url;
  });
}

async function preloadFirstImage() {
  if (!SLIDES[0]) return;
  await preloadImage(SLIDES[0].img);
}

function preloadRemainingImages() {
  // Background preloading — staggered to avoid saturating the network
  SLIDES.slice(1).forEach((slide, i) => {
    setTimeout(() => {
      const img = new Image();
      img.src = slide.img;
    }, i * 100);
  });
}

function preloadNextImage(index) {
  const nextIdx = index + 1;
  if (nextIdx >= SLIDES.length) return;
  const img = new Image();
  img.src = SLIDES[nextIdx].img;
}

/* =========================================================
   BUILD SLIDES
   ========================================================= */

function buildSlides() {
  if (!els.slideshow) return;

  els.slideshow.innerHTML = "";
  state.slideEls = [];

  const fragment = document.createDocumentFragment();

  SLIDES.forEach((slide, i) => {
    const el = document.createElement("div");
    el.className = "slide";
    el.style.backgroundImage = `url('${slide.img}')`;
    el.dataset.index = String(i);
    el.setAttribute("aria-hidden", "true");
    fragment.appendChild(el);
    state.slideEls.push(el);
  });

  els.slideshow.appendChild(fragment);
}

function buildDots() {
  if (!els.dots) return;

  els.dots.innerHTML = "";
  state.dotEls = [];

  const fragment = document.createDocumentFragment();

  SLIDES.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.dataset.index = String(i);
    dot.setAttribute("aria-hidden", "true");
    fragment.appendChild(dot);
    state.dotEls.push(dot);
  });

  els.dots.appendChild(fragment);
}

/* =========================================================
   SHOW SLIDE
   ========================================================= */

function showSlide(index) {
  if (!state.slideEls.length) return;
  if (index < 0 || index >= state.slideEls.length) return;

  // Toggle slides
  state.slideEls.forEach((el, i) => {
    const isActive = i === index;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  // Toggle dots
  state.dotEls.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });

  // Subject label with fade animation
  if (els.subjectLabel) {
    els.subjectLabel.textContent = SLIDES[index].subject;
    els.subjectLabel.classList.remove("fade-in");
    // Force reflow to restart animation
    void els.subjectLabel.offsetWidth;
    els.subjectLabel.classList.add("fade-in");
  }

  // Preload the next image
  preloadNextImage(index);
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function scheduleNext() {
  if (state.isDone || state.isPaused) return;
  clearTimer();
  state.timerId = setTimeout(advance, SLIDE_DURATION);
}

function clearTimer() {
  if (state.timerId) {
    clearTimeout(state.timerId);
    state.timerId = null;
  }
}

function advance() {
  if (state.isDone) return;

  state.currentIndex += 1;

  if (state.currentIndex >= SLIDES.length) {
    finish();
    return;
  }

  showSlide(state.currentIndex);
  scheduleNext();
}

function finish() {
  if (state.isDone) return;
  state.isDone = true;
  clearTimer();

  try {
    localStorage.setItem(STORAGE_KEY_INTRO_SEEN, "1");
    localStorage.setItem(STORAGE_KEY_INTRO_TIMESTAMP, String(Date.now()));
  } catch {}

  setTimeout(() => {
    window.location.href = REDIRECT_URL;
  }, REDIRECT_AFTER_LAST);
}

function skip() {
  if (state.isDone) return;
  state.isDone = true;
  clearTimer();

  try {
    localStorage.setItem(STORAGE_KEY_INTRO_SEEN, "1");
    localStorage.setItem(STORAGE_KEY_INTRO_TIMESTAMP, String(Date.now()));
  } catch {}

  setTimeout(() => {
    window.location.href = REDIRECT_URL;
  }, SKIP_REDIRECT_DELAY);
}

/* =========================================================
   PAUSE / RESUME
   ========================================================= */

function pause() {
  state.isPaused = true;
  clearTimer();
}

function resume() {
  if (state.isDone) return;
  state.isPaused = false;
  if (!state.timerId) scheduleNext();
}

/* =========================================================
   LOADING SCREEN
   ========================================================= */

function hideLoading() {
  if (!els.loading) return;
  els.loading.style.opacity = "0";
  setTimeout(() => {
    if (els.loading?.parentNode) els.loading.remove();
  }, 300);
}

/* =========================================================
   EVENT WIRING
   ========================================================= */

function wireEvents() {
  // Skip button
  els.skipBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    skip();
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (state.isDone) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
      e.preventDefault();
      skip();
    }
  });

  // Tap anywhere to skip (once)
  document.addEventListener(
    "touchstart",
    (e) => {
      if (state.isDone) return;
      if (e.target.closest("button")) return;
      state.lastUserInteraction = Date.now();
      skip();
    },
    { passive: true },
  );

  // Click anywhere to skip (desktop)
  document.addEventListener("click", (e) => {
    if (state.isDone) return;
    if (e.target.closest("button")) return;
    skip();
  });

  // Pause when tab hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else resume();
  });

  // Pause on window blur (another app opened)
  window.addEventListener("blur", pause);
  window.addEventListener("focus", resume);

  // Handle page unload gracefully
  window.addEventListener("beforeunload", () => {
    clearTimer();
  });
}

/* =========================================================
   START
   ========================================================= */

async function start() {
  if (state.hasStarted) return;
  state.hasStarted = true;

  log.info("Intro starting");

  // Check if user is already signed in
  const hasSession = await checkExistingSession();
  if (hasSession) return;

  // Wait for the first image so the slideshow doesn't flash
  await preloadFirstImage();

  // Build the DOM
  buildSlides();
  buildDots();

  // Show the first slide
  showSlide(0);
  hideLoading();

  // Begin autoplay
  scheduleNext();

  // Preload the rest in the background
  preloadRemainingImages();

  // Wire up events
  wireEvents();

  log.info(`Intro running with ${SLIDES.length} slides`);
}

/* =========================================================
   BOOT
   ========================================================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
