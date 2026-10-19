// js/ui/nav.js
// Top navigation. Reads cached name from localStorage for instant display.

import { onAuthChange, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import { getCurrentPage } from "../core/router.js";
import { initials, firstName, log } from "../core/utils.js";

const NAME_CACHE_KEY = "wegem_display_name";

/* =========================================================
   NAME CACHE — instant display, no flash
   ========================================================= */

function getCachedDisplayName() {
  try {
    return localStorage.getItem(NAME_CACHE_KEY) || null;
  } catch {
    return null;
  }
}

function setCachedDisplayName(name) {
  try {
    if (name) {
      localStorage.setItem(NAME_CACHE_KEY, name);
    }
  } catch {}
}

function clearCachedDisplayName() {
  try {
    localStorage.removeItem(NAME_CACHE_KEY);
  } catch {}
}

/* =========================================================
   MARK ACTIVE LINK
   ========================================================= */

export function markActiveLink() {
  const current = getCurrentPage();
  document.querySelectorAll(".top-nav-links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    if (href === current) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    } else {
      link.classList.remove("active");
      link.removeAttribute("aria-current");
    }
  });
}

/* =========================================================
   FILL USER CHIP — synchronously first, then enrich
   ========================================================= */

function paintName(name) {
  const avatarEl = document.getElementById("userAvatar");
  const nameEl = document.getElementById("userNameTop");
  if (!name) {
    if (avatarEl) avatarEl.textContent = "?";
    if (nameEl) nameEl.textContent = "Guest";
    return;
  }
  if (avatarEl) avatarEl.textContent = initials(name);
  if (nameEl) nameEl.textContent = firstName(name);
}

function fillUserChip(user) {
  if (!user) {
    paintName(null);
    return;
  }

  // 1) INSTANT: cached name from localStorage (no flash, no async)
  const cachedName = getCachedDisplayName();
  if (cachedName) {
    paintName(cachedName);
  } else {
    // Fallback if nothing cached yet
    const authUser = getCachedUser();
    const fallback =
      authUser?.displayName || authUser?.email?.split("@")[0] || "Student";
    paintName(fallback);
  }

  // 2) Then enrich from IDB cache (fast) or Firestore (slower)
  enrichUserChip(user).catch(function (e) {
    log.warn("Could not enrich user chip:", e);
  });
}

async function enrichUserChip(user) {
  // Try IndexedDB cache first
  let doc = null;
  try {
    doc = await getCachedUserFromIDB(user.uid);
  } catch {}

  if (doc?.name) {
    setCachedDisplayName(doc.name);
    paintName(doc.name);
    return;
  }

  // Fall back to Firestore
  try {
    const fresh = await getUserDoc(user.uid);
    if (fresh?.name) {
      await cacheUser(fresh);
      setCachedDisplayName(fresh.name);
      paintName(fresh.name);
    }
  } catch (e) {
    log.warn("Could not fetch user doc:", e);
  }
}

/* =========================================================
   MOBILE SWIPE
   ========================================================= */

function installMobileSwipe() {
  if (!("ontouchstart" in window)) return;
  const nav = document.querySelector(".top-nav");
  if (!nav) return;

  let startY = 0;
  let startTime = 0;

  nav.addEventListener(
    "touchstart",
    (e) => {
      startY = e.touches[0].clientY;
      startTime = Date.now();
    },
    { passive: true },
  );

  nav.addEventListener(
    "touchend",
    (e) => {
      const endY = e.changedTouches[0].clientY;
      const deltaY = startY - endY;
      const duration = Date.now() - startTime;
      if (deltaY > 50 && duration < 300) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    { passive: true },
  );
}

/* =========================================================
   INIT
   ========================================================= */

export function initNav() {
  markActiveLink();

  // Paint immediately from cache (no async needed)
  const cachedName = getCachedDisplayName();
  if (cachedName) {
    paintName(cachedName);
  }

  // Then listen for auth changes
  onAuthChange(function (user) {
    fillUserChip(user);
  });

  installMobileSwipe();

  window.addEventListener("popstate", markActiveLink);
}

/* =========================================================
   EXPORTED HELPER — call when name changes in settings
   ========================================================= */

export function refreshDisplayNameCache(name) {
  if (name) {
    setCachedDisplayName(name);
    paintName(name);
  }
}

export function clearDisplayNameCache() {
  clearCachedDisplayName();
}
