// js/ui/modal.js
// Modal dialogs.

/* =========================================================
   CORE MODAL
   ========================================================= */

export function openModal({
  title = "",
  content = "",
  actions = [],
  onClose = null,
  size = "default",
} = {}) {
  closeModal();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "wegemModal";

  const maxWidth = size === "lg" ? 640 : size === "sm" ? 380 : 480;

  const card = document.createElement("div");
  card.className = "modal-card";
  card.style.maxWidth = maxWidth + "px";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");

  const head = document.createElement("div");
  head.className = "modal-head";

  const titleEl = document.createElement("h3");
  titleEl.className = "modal-title";
  titleEl.textContent = title;

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "modal-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.innerHTML = "&times;";

  head.appendChild(titleEl);
  head.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "modal-body";
  if (typeof content === "string") body.innerHTML = content;
  else if (content instanceof Node) body.appendChild(content);

  card.appendChild(head);
  card.appendChild(body);

  if (actions.length) {
    const actionsEl = document.createElement("div");
    actionsEl.className = "modal-actions";

    actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "btn " +
        (action.variant === "primary"
          ? "btn-primary"
          : action.variant === "danger"
            ? "btn-danger"
            : "btn-ghost");
      btn.textContent = action.label;
      btn.onclick = async () => {
        try {
          const shouldClose = action.onClick ? await action.onClick() : true;
          if (shouldClose !== false) closeModal();
        } catch (e) {
          console.error(e);
        }
      };
      actionsEl.appendChild(btn);
    });

    card.appendChild(actionsEl);
  }

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  document.body.style.overflow = "hidden";

  // Backdrop click closes
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeModal();
      if (onClose) onClose();
    }
  });

  closeBtn.addEventListener("click", () => {
    closeModal();
    if (onClose) onClose();
  });

  // ESC closes
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeModal();
      if (onClose) onClose();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  // Focus trap
  const focusTrap = (e) => {
    if (e.key !== "Tab") return;
    const focusables = card.querySelectorAll(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", focusTrap);

  setTimeout(() => {
    const focusable = card.querySelector("input, textarea, select, button");
    focusable?.focus();
  }, 100);

  return {
    close: closeModal,
    card,
    body,
  };
}

export function closeModal() {
  const existing = document.getElementById("wegemModal");
  if (existing) existing.remove();
  document.body.style.overflow = "";
}

/* =========================================================
   CONFIRM
   ========================================================= */

export function confirmDialog({
  title = "Are you sure?",
  message = "",
  okLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    openModal({
      title,
      content: `<p style="color: var(--text-dim); font-size: 14.5px; line-height: 1.6;">${message}</p>`,
      actions: [
        {
          label: cancelLabel,
          variant: "ghost",
          onClick: () => settle(false),
        },
        {
          label: okLabel,
          variant: danger ? "danger" : "primary",
          onClick: () => settle(true),
        },
      ],
      onClose: () => settle(false),
    });
  });
}

/* =========================================================
   ALERT
   ========================================================= */

export function alertDialog({
  title = "Notice",
  message = "",
  okLabel = "OK",
} = {}) {
  return new Promise((resolve) => {
    openModal({
      title,
      content: `<p style="color: var(--text-dim); font-size: 14.5px; line-height: 1.6;">${message}</p>`,
      actions: [
        {
          label: okLabel,
          variant: "primary",
          onClick: () => resolve(true),
        },
      ],
      onClose: () => resolve(true),
    });
  });
}

/* =========================================================
   PROMPT
   ========================================================= */

export function promptDialog({
  title = "Enter value",
  label = "",
  placeholder = "",
  defaultValue = "",
  okLabel = "Submit",
  type = "text",
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const inputId = "modalPromptInput_" + Date.now();
    const input = document.createElement("input");
    input.type = type;
    input.id = inputId;
    input.placeholder = placeholder;
    input.value = defaultValue;

    const wrap = document.createElement("label");
    wrap.className = "field";
    wrap.style.marginBottom = "0";

    if (label) {
      const span = document.createElement("span");
      span.textContent = label;
      wrap.appendChild(span);
    }
    wrap.appendChild(input);

    openModal({
      title,
      content: wrap,
      actions: [
        {
          label: "Cancel",
          variant: "ghost",
          onClick: () => settle(null),
        },
        {
          label: okLabel,
          variant: "primary",
          onClick: () => {
            const doc = document.getElementById(inputId);
            settle((doc?.value || "").trim());
          },
        },
      ],
      onClose: () => settle(null),
    });
  });
}
