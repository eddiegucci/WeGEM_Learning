// js/pages/wallpapers.js
// Controller for wallpapers.html.

import { waitForAuth, signOutNow, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import {
  WALLPAPERS,
  WALLPAPER_CATEGORIES,
  DEFAULT_WALLPAPER_ID,
  getDefaultWallpaper,
  getWallpaperById,
  getWallpapersByCategory,
} from "../data/wallpapers.js";
import { initNav } from "../ui/nav.js";
import { toastOk, toastErr } from "../ui/toast.js";
import { confirmDialog } from "../ui/modal.js";
import {
  escapeHTML,
  firstName,
  initials,
  log,
  lsGet,
  lsSet,
} from "../core/utils.js";

/* =========================================================
   STATE
   ========================================================= */

const state = {
  user: null,
  userDoc: null,
  activeCategory: "all",
  currentWallpaperId: DEFAULT_WALLPAPER_ID,
};

const STORAGE_KEY = "wegem_wallpaper";

/* =========================================================
   DOM REFS
   ========================================================= */

const els = {
  userAvatar: document.getElementById("userAvatar"),
  userNameTop: document.getElementById("userNameTop"),
  userMenuBtn: document.getElementById("userMenuBtn"),
  categoryBar: document.getElementById("categoryBar"),
  wallpaperGrid: document.getElementById("wallpaperGrid"),
  resetWallpaperBtn: document.getElementById("resetWallpaperBtn"),
};

/* =========================================================
   SETUP USER
   ========================================================= */

async function setupUser() {
  const user = await waitForAuth();
  if (!user) {
    window.location.replace("login.html");
    return false;
  }

  state.user = user;

  const cached = getCachedUser();
  const displayName =
    cached?.displayName ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "Student";

  if (els.userAvatar) els.userAvatar.textContent = initials(displayName);
  if (els.userNameTop) els.userNameTop.textContent = firstName(displayName);

  try {
    let doc = await getCachedUserFromIDB(user.uid);
    if (!doc) {
      doc = await getUserDoc(user.uid);
      if (doc) await cacheUser(doc);
    }
    state.userDoc = doc;

    if (doc?.name) {
      if (els.userAvatar) els.userAvatar.textContent = initials(doc.name);
      if (els.userNameTop) els.userNameTop.textContent = firstName(doc.name);
    }
  } catch (e) {
    log.warn("Could not load user doc:", e);
  }

  return true;
}

/* =========================================================
   LOAD SAVED WALLPAPER
   ========================================================= */

function loadSavedWallpaper() {
  const saved = lsGet(STORAGE_KEY, null);
  if (saved && saved.id) {
    state.currentWallpaperId = saved.id;
  } else {
    state.currentWallpaperId = DEFAULT_WALLPAPER_ID;
  }
}

function applyWallpaperToPage(url) {
  document.documentElement.style.setProperty("--wallpaper", `url('${url}')`);
}

function saveWallpaper(wallpaper) {
  lsSet(STORAGE_KEY, wallpaper);
  state.currentWallpaperId = wallpaper.id;
}

/* =========================================================
   CATEGORY BAR
   ========================================================= */

function renderCategoryBar() {
  if (!els.categoryBar) return;

  els.categoryBar.innerHTML = WALLPAPER_CATEGORIES.map((cat) => {
    const count =
      cat.id === "all"
        ? WALLPAPERS.length
        : WALLPAPERS.filter((w) => w.category === cat.id).length;
    const isActive = state.activeCategory === cat.id;
    return `
      <button class="chip${isActive ? " active" : ""}" data-category="${cat.id}" type="button">
        ${cat.emoji} ${cat.name}
        <span class="chip-count">${count}</span>
      </button>
    `;
  }).join("");

  els.categoryBar.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      state.activeCategory = chip.dataset.category;
      renderCategoryBar();
      renderWallpaperGrid();
    });
  });
}

/* =========================================================
   WALLPAPER GRID
   ========================================================= */

function renderWallpaperGrid() {
  if (!els.wallpaperGrid) return;

  const list = getWallpapersByCategory(state.activeCategory);

  if (!list.length) {
    els.wallpaperGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎨</div>
        <div class="empty-title">No wallpapers here</div>
        <div class="empty-sub">Try a different category.</div>
      </div>
    `;
    return;
  }

  els.wallpaperGrid.innerHTML = list
    .map((w) => {
      const isActive = w.id === state.currentWallpaperId;
      const isDefault = w.id === DEFAULT_WALLPAPER_ID;
      return `
      <button
        class="wallpaper-card${isActive ? " active" : ""}"
        type="button"
        data-wallpaper-id="${w.id}"
        style="background-image: url('${w.preview}');"
        aria-label="${escapeHTML(w.name)}"
      >
        <div class="wallpaper-overlay"></div>
        <div class="wallpaper-meta">
          ${isDefault ? `<span class="wallpaper-tag">Default</span>` : ""}
          <span class="wallpaper-name">${escapeHTML(w.name)}</span>
        </div>
        ${isActive ? `<div class="wallpaper-check" aria-hidden="true">✓</div>` : ""}
      </button>
    `;
    })
    .join("");

  els.wallpaperGrid.querySelectorAll(".wallpaper-card").forEach((card) => {
    card.addEventListener("click", () => {
      handleSelectWallpaper(card.dataset.wallpaperId);
    });
  });
}

/* =========================================================
   SELECT WALLPAPER
   ========================================================= */

function handleSelectWallpaper(id) {
  const wallpaper = getWallpaperById(id);
  if (!wallpaper) return;

  // Apply
  applyWallpaperToPage(wallpaper.url);
  saveWallpaper(wallpaper);

  // Update UI
  renderWallpaperGrid();

  toastOk(`✓ ${wallpaper.name} applied`);
}

/* =========================================================
   RESET
   ========================================================= */

async function handleReset() {
  const ok = await confirmDialog({
    title: "Reset wallpaper?",
    message: "Return to the default background (Earth from Space).",
    okLabel: "Reset",
    cancelLabel: "Cancel",
  });

  if (!ok) return;

  const def = getDefaultWallpaper();
  applyWallpaperToPage(def.url);
  saveWallpaper(def);
  renderWallpaperGrid();
  toastOk("Wallpaper reset to default");
}

/* =========================================================
   USER MENU
   ========================================================= */

async function handleUserMenu() {
  const ok = await confirmDialog({
    title: "Sign out?",
    message: `Signed in as ${state.user?.email || "Student"}.\n\nDo you want to sign out?`,
    okLabel: "Sign Out",
    cancelLabel: "Stay",
    danger: true,
  });

  if (ok) {
    try {
      await signOutNow();
      window.location.replace("login.html");
    } catch (e) {
      log.error("Sign out failed:", e);
      toastErr("Could not sign out.");
    }
  }
}

/* =========================================================
   INIT
   ========================================================= */

async function init() {
  try {
    const ready = await setupUser();
    if (!ready) return;

    initNav();
    loadSavedWallpaper();

    els.userMenuBtn?.addEventListener("click", handleUserMenu);
    els.resetWallpaperBtn?.addEventListener("click", handleReset);

    // Apply current wallpaper (in case it wasn't set on page load)
    const current =
      getWallpaperById(state.currentWallpaperId) || getDefaultWallpaper();
    applyWallpaperToPage(current.url);

    renderCategoryBar();
    renderWallpaperGrid();

    log.info(`Wallpapers ready: ${WALLPAPERS.length} total`);
  } catch (e) {
    log.error("Wallpapers init failed:", e);
    toastErr("Could not load wallpapers.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
