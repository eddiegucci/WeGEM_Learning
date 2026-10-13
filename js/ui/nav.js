// js/ui/nav.js
// Top navigation. Does NOT wire the user menu — pages own that.

import { onAuthChange, getCachedUser } from "../core/auth.js";
import { getUserDoc } from "../core/db.js";
import {
  cacheUser,
  getCachedUser as getCachedUserFromIDB,
} from "../core/cache.js";
import { getCurrentPage } from "../core/router.js";
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
   FILL USER CHIP
   ========================================================= */

async function fillUserChip(user) {
  const avatarEl = document.getElementById("userAvatar");
  const nameEl = document.getElementById("userNameTop");
  if (!avatarEl && !nameEl) return;

  if (!user) {
    if (avatarEl) avatarEl.textContent = "?";
    if (nameEl) nameEl.textContent = "Guest";
    return;
  }

  const cached = getCachedUser();
  const displayName =
    cached?.displayName || cached?.email?.split("@")[0] || "Student";

  if (avatarEl) avatarEl.textContent = initials(displayName);
  if (nameEl) nameEl.textContent = firstName(displayName);

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
}

/* =========================================================
   MOBILE SWIPE (bottom nav → scroll to top)
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

  onAuthChange(async (user) => {
    await fillUserChip(user);
  });

  installMobileSwipe();

  window.addEventListener("popstate", markActiveLink);
}
