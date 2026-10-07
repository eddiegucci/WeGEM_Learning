// js/mobile-shortcuts.js — mobile tap shortcuts for WeGEM Learning

/* =========================================================
   HOW IT WORKS
   - On mobile (touch devices), keyboard shortcuts don't exist
   - This script lets you trigger the same actions by TAPPING
   - Tap 5 times quickly on Exams → opens Add Link tray
   - Tap 6 times quickly on Notes → opens Add Note tray
   - Tap the logo once → opens a quick "Add" menu
   ========================================================= */

const TAP_WINDOW_MS = 2500;   // taps must happen within 2.5 seconds
const TAP_COUNTS = {
  5: 'add-link',
  6: 'add-note'
};

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/* =========================================================
   TAP DETECTOR — on the whole page background
   ========================================================= */

export function installTapShortcuts(handlers = {}) {
  if (!isTouchDevice()) return;  // desktop uses keyboard shortcuts

  let tapTimes = [];
  let lastTarget = null;

  document.addEventListener('touchstart', (e) => {
    // Ignore taps on interactive elements (buttons, inputs, links)
    const t = e.target;
    if (t.closest('button, a, input, textarea, select, .link-tray, .tray-backdrop')) {
      return;
    }

    const now = Date.now();
    tapTimes.push(now);

    // Keep only taps within the window
    tapTimes = tapTimes.filter(time => now - time < TAP_WINDOW_MS);

    lastTarget = t;

    // Check for a match
    const count = tapTimes.length;
    const action = TAP_COUNTS[count];

    if (action && handlers[action]) {
      e.preventDefault();
      tapTimes = [];  // reset
      handlers[action]();
    }

    // Reset after 5 taps exceeded
    if (count > 6) tapTimes = [];
  }, { passive: false });
}

/* =========================================================
   LOGO TAP — single tap opens quick menu
   ========================================================= */

export function installLogoTap(menuHandler) {
  if (!isTouchDevice()) return;

  const brand = document.querySelector('.top-nav-brand');
  if (!brand) return;

  let lastTap = 0;

  brand.addEventListener('click', (e) => {
    const now = Date.now();
    const delta = now - lastTap;
    lastTap = now;

    // Double tap within 400ms → show quick add menu
    if (delta < 400) {
      e.preventDefault();
      menuHandler();
    }
  });
}

/* =========================================================
   TOAST HELPER — show feedback after taps
   ========================================================= */

export function flashToast(message, duration = 1400) {
  let toast = document.getElementById('tapToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'tapToast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(19, 26, 46, 0.98);
      border: 1px solid rgba(251, 191, 36, 0.4);
      color: #fbbf24;
      padding: 10px 20px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      transition: opacity .25s ease, transform .25s ease;
      opacity: 0;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
  }, duration);
}

/* =========================================================
   ADD MENU — modal that lets you choose Add Link / Add Note
   ========================================================= */

export function showAddMenu(onAddLink, onAddNote) {
  // Remove existing menu
  document.getElementById('addActionMenu')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'addActionMenu';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 9999;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 20px;
    padding-bottom: 100px;
    animation: fadeIn .2s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="
      width: 100%;
      max-width: 400px;
      background: linear-gradient(180deg, #0f1729 0%, #0a1020 100%);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px;
      padding: 22px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.7);
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 18px;
      ">
        <div style="
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
        ">Quick Add</div>
        <button id="addMenuClose" style="
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          color: #8a95b0;
          width: 30px;
          height: 30px;
          border-radius: 10px;
          font-size: 18px;
          cursor: pointer;
          line-height: 1;
        ">×</button>
      </div>

      <button id="addMenuLink" style="
        width: 100%;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.28);
        border-radius: 12px;
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        margin-bottom: 10px;
        text-align: left;
        font-family: inherit;
      ">
        <span style="font-size: 22px;">🔗</span>
        <span style="display:flex;flex-direction:column;gap:2px;flex:1;">
          <span>Add Exam Link</span>
          <span style="font-size:11px;font-weight:500;color:#8a95b0;font-family:inherit;">Tap 5× on Exams page</span>
        </span>
      </button>

      <button id="addMenuNote" style="
        width: 100%;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 16px;
        background: rgba(168, 85, 247, 0.1);
        border: 1px solid rgba(168, 85, 247, 0.28);
        border-radius: 12px;
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
      ">
        <span style="font-size: 22px;">📝</span>
        <span style="display:flex;flex-direction:column;gap:2px;flex:1;">
          <span>Add Note</span>
          <span style="font-size:11px;font-weight:500;color:#8a95b0;font-family:inherit;">Tap 6× on Notes page</span>
        </span>
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('addMenuClose').onclick = close;
  document.getElementById('addMenuLink').onclick = () => { close(); onAddLink?.(); };
  document.getElementById('addMenuNote').onclick = () => { close(); onAddNote?.(); };
}