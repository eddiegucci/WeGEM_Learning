// js/wallpapers.js — wallpaper picker

import "./wallpaper-init.js";
import { getCurrentUser, clearCurrentUser } from "./firebase.js";

const user = getCurrentUser();
if (!user) window.location.href = "signup.html";

const authLink = document.getElementById("auth-link");
if (authLink) {
  authLink.onclick = (e) => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = "signup.html";
  };
}

/* =========================================================
   WALLPAPERS — add your own later by dropping into
   assets/images/ and using 'assets/images/yourfile.jpg'
   ========================================================= */

const WALLPAPERS = [
  {
    id: "default",
    name: "World Map & Globe",
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80",
    tag: "Default",
  },
  {
    id: "africa",
    name: "African Pattern",
    url: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&q=80",
  },
  {
    id: "nairobi",
    name: "Nairobi Skyline",
    url: "https://images.unsplash.com/photo-1611348586804-61bf6c080437?w=1920&q=80",
  },
  {
    id: "books",
    name: "Library Books",
    url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1920&q=80",
  },
  {
    id: "mountains",
    name: "Mount Kenya",
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80",
  },
  {
    id: "stars",
    name: "Starry Night",
    url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80",
  },
  {
    id: "abstract",
    name: "Abstract Gradient",
    url: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1920&q=80",
  },
  {
    id: "forest",
    name: "Forest Path",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80",
  },
];

const STORAGE_KEY = "wegem_wallpaper";

function applyWallpaper(url) {
  document.documentElement.style.setProperty("--wallpaper", `url('${url}')`);
}

function saveWallpaper(w) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const grid = document.getElementById("wallpaperGrid");
const saved = loadSaved();
const activeId = saved ? saved.id : "default";

WALLPAPERS.forEach((w) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "wallpaper-card" + (w.id === activeId ? " active" : "");
  card.style.backgroundImage = `url('${w.url}')`;
  card.dataset.id = w.id;
  card.innerHTML = `
    <div class="wallpaper-overlay"></div>
    <div class="wallpaper-meta">
      ${w.tag ? `<span class="wallpaper-tag">${w.tag}</span>` : ""}
      <span class="wallpaper-name">${w.name}</span>
    </div>
    ${w.id === activeId ? '<div class="wallpaper-check">✓</div>' : ""}
  `;
  card.addEventListener("click", () => {
    applyWallpaper(w.url);
    saveWallpaper(w);
    document.querySelectorAll(".wallpaper-card").forEach((c) => {
      c.classList.remove("active");
      const oldCheck = c.querySelector(".wallpaper-check");
      if (oldCheck) oldCheck.remove();
    });
    card.classList.add("active");
    card.insertAdjacentHTML(
      "beforeend",
      '<div class="wallpaper-check">✓</div>',
    );
  });
  grid.appendChild(card);
});

document.getElementById("resetWallpaperBtn").addEventListener("click", () => {
  const def = WALLPAPERS.find((w) => w.id === "default");
  applyWallpaper(def.url);
  saveWallpaper(def);
  window.location.reload();
});
