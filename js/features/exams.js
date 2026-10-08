// js/features/exams.js
// Exams feature logic for WeGEM Learning.

import { addExamLink, getExamLinks, deleteExamLink } from "../core/db.js";
import { put, remove, getAllByIndex, STORES } from "../core/cache.js";
import { log, isOnline, isValidURL } from "../core/utils.js";

/* =========================================================
   FETCH EXAM LINKS
   ========================================================= */

export async function fetchExamLinks() {
  let links = [];

  try {
    const cached = await getAllByIndex(STORES.CONTENT, "type", "examLink");
    links = cached || [];
  } catch (e) {
    log.warn("Could not read cached exam links:", e);
  }

  if (isOnline()) {
    try {
      const fresh = await getExamLinks();
      if (fresh.length) {
        await Promise.all(
          fresh.map((l) => put(STORES.CONTENT, { ...l, type: "examLink" })),
        );
        links = fresh;
      }
    } catch (e) {
      log.warn("Could not fetch exam links:", e);
    }
  }

  return links.sort((a, b) => {
    const at = new Date(a.createdAt || 0).getTime();
    const bt = new Date(b.createdAt || 0).getTime();
    return bt - at;
  });
}

/* =========================================================
   FILTER LINKS
   ========================================================= */

export function filterExamLinks(links, { type = "all", query = "" } = {}) {
  let filtered = links;

  if (type !== "all") {
    filtered = filtered.filter((l) => l.type === type);
  }

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        (l.title || "").toLowerCase().includes(q) ||
        (l.subject || "").toLowerCase().includes(q),
    );
  }

  return filtered;
}

/* =========================================================
   CREATE EXAM LINK
   ========================================================= */

export async function createExamLink(link) {
  const prepared = {
    title: (link.title || "").trim(),
    url: (link.url || "").trim(),
    subject: link.subject || "",
    type: link.type || "papers",
    curriculum: link.curriculum || "844",
    level: link.level || "",
    createdBy: link.createdBy || "",
    createdByName: link.createdByName || "",
    createdAt: new Date().toISOString(),
  };

  if (!prepared.title) throw new Error("Title is required.");
  if (!prepared.url) throw new Error("URL is required.");
  if (!isValidURL(prepared.url)) throw new Error("Invalid URL.");
  if (!prepared.subject) throw new Error("Subject is required.");

  let cloudId = null;
  if (isOnline()) {
    try {
      cloudId = await addExamLink(prepared);
    } catch (e) {
      log.warn("Could not save link to cloud:", e);
    }
  }

  const id = cloudId || "link_" + Date.now();
  const stored = { ...prepared, id };
  await put(STORES.CONTENT, { ...stored, type: "examLink" });
  return stored;
}

/* =========================================================
   DELETE EXAM LINK
   ========================================================= */

export async function removeExamLink(linkId) {
  if (!linkId) return false;
  try {
    if (isOnline() && !String(linkId).startsWith("link_")) {
      await deleteExamLink(linkId);
    }
    await remove(STORES.CONTENT, linkId);
    return true;
  } catch (e) {
    log.warn("Could not delete link:", e);
    return false;
  }
}

/* =========================================================
   TYPE METADATA
   ========================================================= */

export const LINK_TYPES = {
  papers: { icon: "📝", label: "Past Paper", color: "#3b82f6" },
  notes: { icon: "📚", label: "Notes", color: "#a855f7" },
  revision: { icon: "📖", label: "Revision", color: "#f59e0b" },
  video: { icon: "🎥", label: "Video", color: "#ec4899" },
};

export function getLinkMeta(type) {
  return LINK_TYPES[type] || LINK_TYPES.papers;
}
