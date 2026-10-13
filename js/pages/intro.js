// js/pages/intro.js
// Intro slideshow controller for index.html.

import { getCachedUser, waitForAuth } from "../core/auth.js";
import { log, sleep } from "../core/utils.js";

const SLIDE_DURATION = 1700;
const REDIRECT_URL = "signup.html";
const REDIRECT_AFTER_LAST = 700;
const SKIP_REDIRECT_DELAY = 400;
const AUTH_CHECK_TIMEOUT = 900;
const FIRST_IMAGE_TIMEOUT = 4000;

const STORAGE_KEY_INTRO_SEEN = "wegem_intro_seen";
const STORAGE_KEY_INTRO_TIMESTAMP = "wegem_intro_last";

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
    subject: "Music",
    img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1400&q=60&auto=format",
  },
  {
    subject: "Fine Art",
    img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1400&q=60&auto=format",
  },
];

const state = {
  slideEls: [],
  dotEls: [],
  currentIndex: 0,
  timerId: null,
  isDone: false,
  hasStarted: false,
  isPaused: false,
};

const els = {
  slideshow: document.getElementById("slideshow"),
  subjectLabel: document.getElementById("subjectLabel"),
  dots: document.getElementById("dots"),
  skipBtn: document.getElementById("skipBtn"),
  loading: document.getElementById("introLoading"),
};

async function checkExistingSession() {
  try {
    const cached = getCachedUser();
    if (cached) {
      window.location.replace("home.html");
      return true;
    }
  } catch (e) {
    log.warn("Cache check failed:", e);
  }

  try {
    const user = await Promise.race([
      waitForAuth(),
      sleep(AUTH_CHECK_TIMEOUT).then(() => null),
    ]);
    if (user) {
      window.location.replace("home.html");
      return true;
    }
  } catch (e) {
    log.warn("Auth check failed:", e);
  }

  return false;
}

function preloadImage(url, timeoutMs = FIRST_IMAGE_TIMEOUT) {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (s) => {
      if (settled) return;
      settled = true;
      img.onload = null;
      img.onerror = null;
      resolve(s);
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

function showSlide(index) {
  if (!state.slideEls.length) return;
  if (index < 0 || index >= state.slideEls.length) return;

  state.slideEls.forEach((el, i) => {
    const isActive = i === index;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-hidden", isActive ? "false" : "true");
  });

  state.dotEls.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });

  if (els.subjectLabel) {
    els.subjectLabel.textContent = SLIDES[index].subject;
    els.subjectLabel.classList.remove("fade-in");
    void els.subjectLabel.offsetWidth;
    els.subjectLabel.classList.add("fade-in");
  }

  preloadNextImage(index);
}

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

function pause() {
  state.isPaused = true;
  clearTimer();
}

function resume() {
  if (state.isDone) return;
  state.isPaused = false;
  if (!state.timerId) scheduleNext();
}

function hideLoading() {
  if (!els.loading) return;
  els.loading.style.opacity = "0";
  setTimeout(() => {
    if (els.loading?.parentNode) els.loading.remove();
  }, 300);
}

function wireEvents() {
  els.skipBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    skip();
  });

  document.addEventListener("keydown", (e) => {
    if (state.isDone) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
      e.preventDefault();
      skip();
    }
  });

  document.addEventListener(
    "touchstart",
    (e) => {
      if (state.isDone) return;
      if (e.target.closest("button")) return;
      skip();
    },
    { passive: true },
  );

  document.addEventListener("click", (e) => {
    if (state.isDone) return;
    if (e.target.closest("button")) return;
    skip();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else resume();
  });

  window.addEventListener("blur", pause);
  window.addEventListener("focus", resume);
  window.addEventListener("beforeunload", clearTimer);
}

async function start() {
  if (state.hasStarted) return;
  state.hasStarted = true;

  const hasSession = await checkExistingSession();
  if (hasSession) return;

  await preloadFirstImage();
  buildSlides();
  buildDots();
  showSlide(0);
  hideLoading();
  scheduleNext();
  preloadRemainingImages();
  wireEvents();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
