// js/ui/tray.js
// Bottom tray component (kept for future use, currently unused).

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
  closeTray();

  const backdrop = document.createElement("div");
  backdrop.className = "tray-backdrop";
  backdrop.id = "wegemTrayBackdrop";

  const tray = document.createElement("aside");
  tray.className = "link-tray";
  tray.id = "wegemTray";
  tray.setAttribute("aria-hidden", "true");

  // Header (safer DOM construction)
  const handle = document.createElement("div");
  handle.className = "tray-handle";

  const header = document.createElement("div");
  header.className = "tray-header";

  const headerLeft = document.createElement("div");

  if (badge) {
    const badgeEl = document.createElement("div");
    badgeEl.className = "tray-badge";
    badgeEl.textContent = badge;
    headerLeft.appendChild(badgeEl);
  }

  const titleEl = document.createElement("h2");
  titleEl.className = "tray-title";
  titleEl.textContent = title;
  headerLeft.appendChild(titleEl);

  if (subtitle) {
    const subEl = document.createElement("p");
    subEl.className = "tray-sub";
    subEl.textContent = subtitle;
    headerLeft.appendChild(subEl);
  }

  const closeBtn = document.createElement("button");
  closeBtn.className = "tray-close";
  closeBtn.id = "wegemTrayClose";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>';

  header.appendChild(headerLeft);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "tray-body";
  body.id = "wegemTrayBody";
  body.innerHTML = bodyHTML;

  // Actions
  if (actions.length) {
    const actionsEl = document.createElement("div");
    actionsEl.className = "tray-actions";

    actions.forEach((a, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn ${a.variant === "primary" ? "btn-primary" : "btn-ghost"}`;
      btn.dataset.trayAction = String(i);
      btn.textContent = a.label;
      btn.addEventListener("click", async () => {
        try {
          const result = a.onClick ? await a.onClick() : true;
          if (result !== false) closeTray();
        } catch (e) {
          console.error(e);
        }
      });
      actionsEl.appendChild(btn);
    });

    body.appendChild(actionsEl);
  }

  tray.appendChild(handle);
  tray.appendChild(header);
  tray.appendChild(body);

  document.body.appendChild(backdrop);
  document.body.appendChild(tray);

  closeBtn.addEventListener("click", closeTray);
  backdrop.addEventListener("click", closeTray);

  requestAnimationFrame(() => {
    backdrop.classList.add("open");
    tray.classList.add("open");
    tray.setAttribute("aria-hidden", "false");
  });

  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeTray();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  setTimeout(() => {
    const input = tray.querySelector("input, textarea, select");
    input?.focus();
  }, 300);

  return tray;
}

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

export function trayValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return el.value.trim();
}
