// js/ui/tray.js
// Bottom tray component for WeGEM Learning.

/* =========================================================
   CREATE TRAY
   ========================================================= */

export function createTray({
  title = "",
  badge = "",
  subtitle = "",
  bodyHTML = "",
  actions = [],
} = {}) {
  // Remove any existing tray
  closeTray();

  const backdrop = document.createElement("div");
  backdrop.className = "tray-backdrop";
  backdrop.id = "wegemTrayBackdrop";

  const tray = document.createElement("aside");
  tray.className = "link-tray";
  tray.id = "wegemTray";
  tray.setAttribute("aria-hidden", "true");

  const headerHTML = `
    <div class="tray-header">
      <div>
        ${badge ? `<div class="tray-badge">${badge}</div>` : ""}
        <h2 class="tray-title">${title}</h2>
        ${subtitle ? `<p class="tray-sub">${subtitle}</p>` : ""}
      </div>
      <button class="tray-close" id="wegemTrayClose" type="button" aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M6 6 L18 18 M18 6 L6 18"/>
        </svg>
      </button>
    </div>
  `;

  const actionsHTML = actions.length
    ? `<div class="tray-actions">
        ${actions
          .map(
            (a, i) => `
          <button type="button" class="btn ${a.variant === "primary" ? "btn-primary" : "btn-ghost"}" data-tray-action="${i}">
            ${a.label}
          </button>
        `,
          )
          .join("")}
      </div>`
    : "";

  tray.innerHTML = `
    <div class="tray-handle"></div>
    ${headerHTML}
    <div class="tray-body" id="wegemTrayBody">
      ${bodyHTML}
      ${actionsHTML}
    </div>
  `;

  document.body.appendChild(backdrop);
  document.body.appendChild(tray);

  // Wire up
  document
    .getElementById("wegemTrayClose")
    ?.addEventListener("click", closeTray);
  backdrop.addEventListener("click", closeTray);

  actions.forEach((action, i) => {
    const btn = tray.querySelector(`[data-tray-action="${i}"]`);
    if (btn) {
      btn.addEventListener("click", async () => {
        const result = action.onClick ? await action.onClick() : true;
        if (result !== false) closeTray();
      });
    }
  });

  // Animate in
  requestAnimationFrame(() => {
    backdrop.classList.add("open");
    tray.classList.add("open");
    tray.setAttribute("aria-hidden", "false");
  });

  // ESC closes
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeTray();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  // Focus first input
  setTimeout(() => {
    const input = tray.querySelector("input, textarea, select");
    input?.focus();
  }, 300);

  return tray;
}

/* =========================================================
   CLOSE
   ========================================================= */

export function closeTray() {
  const tray = document.getElementById("wegemTray");
  const backdrop = document.getElementById("wegemTrayBackdrop");
  if (!tray || !backdrop) return;

  tray.classList.remove("open");
  backdrop.classList.remove("open");
  tray.setAttribute("aria-hidden", "true");

  setTimeout(() => {
    tray.remove();
    backdrop.remove();
  }, 300);
}

/* =========================================================
   GET VALUE HELPER
   ========================================================= */

export function trayValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return el.value.trim();
}
