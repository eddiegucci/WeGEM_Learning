// js/ui/modal.js
// Modal dialogs for WeGEM Learning.

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
  // Remove any existing modal
  closeModal();

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "wegemModal";

  const maxWidth = size === "lg" ? 640 : size === "sm" ? 380 : 480;

  const card = document.createElement("div");
  card.className = "modal-card";
  card.style.maxWidth = maxWidth + "px";

  // Head
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
  closeBtn.onclick = () => {
    closeModal();
    if (onClose) onClose();
  };

  head.appendChild(titleEl);
  head.appendChild(closeBtn);

  // Body
  const body = document.createElement("div");
  body.className = "modal-body";
  if (typeof content === "string") body.innerHTML = content;
  else if (content instanceof Node) body.appendChild(content);

  card.appendChild(head);
  card.appendChild(body);

  // Actions
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
        const shouldClose = action.onClick ? await action.onClick() : true;
        if (shouldClose !== false) closeModal();
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

  // ESC closes
  const escHandler = (e) => {
    if (e.key === "Escape") {
      closeModal();
      if (onClose) onClose();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  // Focus first focusable element
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

/* =========================================================
   CLOSE
   ========================================================= */

export function closeModal() {
  const existing = document.getElementById("wegemModal");
  if (existing) existing.remove();
  document.body.style.overflow = "";
}

/* =========================================================
   CONVENIENCE — CONFIRM
   ========================================================= */

export function confirmDialog({
  title = "Are you sure?",
  message = "",
  okLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    openModal({
      title,
      content: `<p style="color: var(--text-dim); font-size: 14.5px; line-height: 1.6;">${message}</p>`,
      actions: [
        {
          label: cancelLabel,
          variant: "ghost",
          onClick: () => {
            resolve(false);
          },
        },
        {
          label: okLabel,
          variant: danger ? "danger" : "primary",
          onClick: () => {
            resolve(true);
          },
        },
      ],
      onClose: () => resolve(false),
    });
  });
}

/* =========================================================
   CONVENIENCE — ALERT
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
   CONVENIENCE — PROMPT
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
    const inputId = "modalPromptInput_" + Date.now();
    openModal({
      title,
      content: `
        <label class="field" style="margin-bottom: 0;">
          ${label ? `<span>${label}</span>` : ""}
          <input type="${type}" id="${inputId}" placeholder="${placeholder}" value="${defaultValue}" />
        </label>
      `,
      actions: [
        {
          label: "Cancel",
          variant: "ghost",
          onClick: () => resolve(null),
        },
        {
          label: okLabel,
          variant: "primary",
          onClick: () => {
            const input = document.getElementById(inputId);
            resolve(input?.value?.trim() || "");
          },
        },
      ],
      onClose: () => resolve(null),
    });
  });
}
