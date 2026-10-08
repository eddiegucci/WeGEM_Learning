// js/ui/toast.js
// Toast notifications for WeGEM Learning.

/* =========================================================
   TOAST CONTAINER
   ========================================================= */

let container = null;
let activeToasts = new Set();

function ensureContainer() {
  if (container && document.body.contains(container)) return container;

  container = document.createElement("div");
  container.id = "toastContainer";
  container.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 32px;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    width: calc(100vw - 40px);
    max-width: 500px;
  `;

  document.body.appendChild(container);
  return container;
}

/* =========================================================
   SHOW TOAST
   ========================================================= */

export function toast(message, kind = "info", duration = 2600) {
  const root = ensureContainer();

  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  el.style.cssText = `
    padding: 12px 22px;
    border-radius: 100px;
    font-size: 13.5px;
    font-weight: 600;
    background: rgba(19, 26, 46, 0.98);
    backdrop-filter: blur(10px);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.14);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
    text-align: center;
    max-width: 100%;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  if (kind === "ok" || kind === "success") {
    el.style.borderColor = "rgba(16, 185, 129, 0.5)";
    el.style.color = "#34d399";
  } else if (kind === "err" || kind === "error") {
    el.style.borderColor = "rgba(239, 68, 68, 0.5)";
    el.style.color = "#fca5a5";
  } else if (kind === "warn") {
    el.style.borderColor = "rgba(249, 115, 22, 0.5)";
    el.style.color = "#fdba74";
  } else if (kind === "info") {
    el.style.borderColor = "rgba(251, 191, 36, 0.4)";
    el.style.color = "#fbbf24";
  }

  root.appendChild(el);
  activeToasts.add(el);

  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });

  const remove = () => {
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    setTimeout(() => {
      el.remove();
      activeToasts.delete(el);
    }, 300);
  };

  setTimeout(remove, duration);
  return remove;
}

/* =========================================================
   SHORTCUTS
   ========================================================= */

export const toastOk = (msg, d) => toast(msg, "ok", d);
export const toastErr = (msg, d) => toast(msg, "err", d);
export const toastInfo = (msg, d) => toast(msg, "info", d);
export const toastWarn = (msg, d) => toast(msg, "warn", d);

/* =========================================================
   CLEAR
   ========================================================= */

export function clearToasts() {
  activeToasts.forEach((el) => el.remove());
  activeToasts.clear();
}
