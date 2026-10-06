// js/slideshow.js — WeGEM Learning intro slideshow (robust)

const SLIDE_DURATION = 1800;
const REDIRECT_URL = "signup.html";
const REDIRECT_AFTER_LAST = 900;
const MAX_PRELOAD_WAIT = 2000;

const SLIDES = [
  {
    subject: "Kiswahili",
    img: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1600&q=70&auto=format",
  },
  {
    subject: "Mathematics",
    img: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1600&q=70&auto=format",
  },
  {
    subject: "English",
    img: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1600&q=70&auto=format",
  },
  {
    subject: "Biology",
    img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1600&q=70&auto=format",
  },
  {
    subject: "Chemistry",
    img: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=1600&q=70&auto=format",
  },
  {
    subject: "Physics",
    img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1600&q=70&auto=format",
  },
  {
    subject: "Geography",
    img: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1600&q=70&auto=format",
  },
  {
    subject: "History",
    img: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=1600&q=70&auto=format",
  },
  {
    subject: "CRE",
    img: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1600&q=70&auto=format",
  },
  {
    subject: "Agriculture",
    img: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1600&q=70&auto=format",
  },
  {
    subject: "Business",
    img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=70&auto=format",
  },
  {
    subject: "Computer Studies",
    img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&q=70&auto=format",
  },
  {
    subject: "Woodwork",
    img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&q=70&auto=format",
  },
  {
    subject: "Metalwork",
    img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=70&auto=format",
  },
  {
    subject: "Music",
    img: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1600&q=70&auto=format",
  },
  {
    subject: "Fine Art",
    img: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1600&q=70&auto=format",
  },
  {
    subject: "Home Science",
    img: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=1600&q=70&auto=format",
  },
  {
    subject: "Physical Education",
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=70&auto=format",
  },
  {
    subject: "French",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=70&auto=format",
  },
  {
    subject: "German",
    img: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=70&auto=format",
  },
  {
    subject: "Spanish",
    img: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1600&q=70&auto=format",
  },
  {
    subject: "Chinese",
    img: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1600&q=70&auto=format",
  },
  {
    subject: "Indian",
    img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1600&q=70&auto=format",
  },
  {
    subject: "Life Skills",
    img: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=70&auto=format",
  },
];

const slideshowEl = document.getElementById("slideshow");
const subjectLabel = document.getElementById("subjectLabel");
const dotsEl = document.getElementById("dots");
const skipBtn = document.getElementById("skipBtn");

let currentIndex = 0;
let timerId = null;
let isDone = false;
let slideEls = [];

function preloadWithTimeout(url, timeoutMs = MAX_PRELOAD_WAIT) {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve("timeout"), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve("loaded");
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve("error");
    };
    img.src = url;
  });
}

function buildDOM() {
  SLIDES.forEach((slide, i) => {
    const div = document.createElement("div");
    div.className = "slide";
    div.style.backgroundImage = `url('${slide.img}')`;
    div.dataset.index = i;
    slideshowEl.appendChild(div);
    slideEls.push(div);

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.dataset.index = i;
    dotsEl.appendChild(dot);
  });
}

function showSlide(index) {
  const dots = dotsEl.querySelectorAll(".dot");
  slideEls.forEach((s, i) => s.classList.toggle("active", i === index));
  dots.forEach((d, i) => d.classList.toggle("active", i === index));

  subjectLabel.textContent = SLIDES[index].subject;
  subjectLabel.classList.remove("fade-in");
  void subjectLabel.offsetWidth;
  subjectLabel.classList.add("fade-in");
}

function next() {
  if (isDone) return;
  currentIndex++;
  if (currentIndex >= SLIDES.length) {
    finish();
    return;
  }
  showSlide(currentIndex);
  timerId = setTimeout(next, SLIDE_DURATION);
}

function finish() {
  isDone = true;
  if (timerId) clearTimeout(timerId);
  setTimeout(() => {
    window.location.href = REDIRECT_URL;
  }, REDIRECT_AFTER_LAST);
}

skipBtn.addEventListener("click", () => {
  isDone = true;
  if (timerId) clearTimeout(timerId);
  window.location.href = REDIRECT_URL;
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " " || e.key === "Escape") {
    e.preventDefault();
    skipBtn.click();
  }
});

function start() {
  buildDOM();
  showSlide(0);
  preloadWithTimeout(SLIDES[0].img, 8000);
  SLIDES.slice(1).forEach((slide) => preloadWithTimeout(slide.img, 8000));
  timerId = setTimeout(next, SLIDE_DURATION);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
