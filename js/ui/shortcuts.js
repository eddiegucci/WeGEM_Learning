// js/ui/shortcuts.js
// Keyboard + tap shortcuts for WeGEM Learning.

import { isTouchDevice } from "../core/utils.js";

/* =========================================================
   KEYBOARD SHORTCUTS (desktop)
   ========================================================= */

const keyboardBindings = new Map();

export function bindShortcut(combo, handler) {
  // combo format: "ctrl+shift+alt+v" or "ctrl+k" or "escape"
  const key = combo.toLowerCase().trim();
  if (!keyboardBindings.has(key)) keyboardBindings.set(key, new Set());
  keyboardBindings.get(key).add(handler);
  return () => keyboardBindings.get(key)?.delete(handler);
}

function installKeyboard() {
  document.addEventListener("keydown", (e) => {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push("ctrl");
    if (e.shiftKey) parts.push("shift");
    if (e.altKey) parts.push("alt");

    let keyName = e.key.toLowerCase();
    if (keyName === " ") keyName = "space";
    if (keyName === "esc") keyName = "escape";
    if (keyName === "arrowup") keyName = "up";
    if (keyName === "arrowdown") keyName = "down";
    if (keyName === "arrowleft") keyName = "left";
    if (keyName === "arrowright") keyName = "right";

    if (!["ctrl", "shift", "alt", "meta"].includes(keyName)) {
      parts.push(keyName);
    }

    const combo = parts.join("+");
    const handlers = keyboardBindings.get(combo);

    if (handlers && handlers.size) {
      e.preventDefault();
      handlers.forEach((fn) => {
        try {
          fn(e);
        } catch (err) {
          console.error(err);
        }
      });
    }
  });
}

/* =========================================================
   TAP SHORTCUTS (mobile)
   ========================================================= */

const TAP_WINDOW_MS = 2500;
let tapTimes = [];

export function installTapShortcuts(handlers = {}) {
  if (!isTouchDevice()) return;

  document.addEventListener(
    "touchstart",
    (e) => {
      const t = e.target;
      // Ignore taps on interactive elements
      if (
        t.closest(
          "button, a, input, textarea, select, .link-tray, .tray-backdrop, .modal-backdrop",
        )
      ) {
        return;
      }

      const now = Date.now();
      tapTimes.push(now);
      tapTimes = tapTimes.filter((time) => now - time < TAP_WINDOW_MS);

      const count = tapTimes.length;
      const action = handlers[count];

      if (typeof action === "function") {
        e.preventDefault();
        tapTimes = [];
        action();
      }

      if (count > 6) tapTimes = [];
    },
    { passive: false },
  );
}

/* =========================================================
   LOGO DOUBLE-TAP
   ========================================================= */

export function installLogoTap(handler) {
  if (!isTouchDevice()) return;

  const brand = document.querySelector(".top-nav-brand");
  if (!brand) return;

  let lastTap = 0;

  brand.addEventListener("click", (e) => {
    const now = Date.now();
    const delta = now - lastTap;
    lastTap = now;

    if (delta < 400) {
      e.preventDefault();
      handler();
    }
  });
}

/* =========================================================
   SWIPE GESTURES
   ========================================================= */

export function installSwipe(
  element,
  { onLeft, onRight, onUp, onDown, threshold = 60 } = {},
) {
  if (!element) return;

  let startX = 0;
  let startY = 0;

  element.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    },
    { passive: true },
  );

  element.addEventListener(
    "touchend",
    (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > threshold && onRight) onRight();
        else if (dx < -threshold && onLeft) onLeft();
      } else {
        if (dy > threshold && onDown) onDown();
        else if (dy < -threshold && onUp) onUp();
      }
    },
    { passive: true },
  );
}

/* =========================================================
   AUTO-INSTALL KEYBOARD LISTENER
   ========================================================= */

installKeyboard();
