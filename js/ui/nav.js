// js/ui/nav.js
// Top navigation behavior for WeGEM Learning.

import { onAuthChange, getCachedUser, signOutNow } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import { getCurrentPage, goTo } from "../core/router.js";
import { initials, firstName, log } from "../core/utils.js";

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
   UPDATE USER CHIP
   ========================================================= */

async function fillUserChip(user) {
  const avatarEl = document.getElementById("userAvatar");
  const nameEl = document.getElementById("userNameTop");
  const menuBtn = document.getElementById("userMenuBtn");

  if (!avatarEl && !nameEl) return;

  if (!user) {
    if (avatarEl) avatarEl.textContent = "?";
    if (nameEl) nameEl.textContent = "Guest";
    return;
  }

  // Show cached display name immediately
  const cached = getCachedUser();
  const displayName =
    cached?.displayName || cached?.email?.split("@")[0] || "Student";

  if (avatarEl) avatarEl.textContent = initials(displayName);
  if (nameEl) nameEl.textContent = firstName(displayName);

  // Try to enrich from Firestore
  try {
    let doc = await getCachedUserFromIDB(user.uid);
    if (!doc) {
      doc = await getUserDoc(user.uid);
      if (doc) await cacheUser(doc);
    }
    if (doc?.name) {
      if (avatarEl) avatarEl.textContent = initials(doc.name);
      if (nameEl) nameEl.textContent = firstName(doc.name);
    }
  } catch (e) {
    log.warn("Could not enrich user chip:", e);
  }

  // Wire up sign-out
  if (menuBtn && !menuBtn._wired) {
    menuBtn._wired = true;
    menuBtn.addEventListener("click", handleUserMenuClick);
  }
}

/* =========================================================
   USER MENU CLICK
   ========================================================= */

async function handleUserMenuClick() {
  const user = getCachedUser();
  const label = user?.displayName || user?.email || "Student";

  const choice = window.confirm(
    `Signed in as ${label}\n\nOK = Sign out\nCancel = Stay signed in`,
  );

  if (choice) {
    try {
      await signOutNow();
      goTo("login.html", true);
    } catch (e) {
      log.error("Sign out failed:", e);
      alert("Could not sign out. Try again.");
    }
  }
}

/* =========================================================
   MOBILE NAV — swipe-up gesture from bottom bar
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

      // Fast swipe up (over 50px in under 300ms) triggers "back to top"
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

  onAuthChange(async (user) => {
    await fillUserChip(user);
  });

  installMobileSwipe();

  // Keep active link in sync on route changes
  window.addEventListener("popstate", markActiveLink);
}
