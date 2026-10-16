// js/features/files.js
// Files feature — Google Drive links managed by admins, viewed by students.

import { db, COLLECTIONS } from "../core/db.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { log, isOnline, withTimeout } from "../core/utils.js";

/* =========================================================
   DRIVE URL PARSING
   ========================================================= */

/**
 * Extracts the file ID from any Google Drive share URL.
 * Handles:
 *   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/uc?id=FILE_ID&export=download
 *   https://docs.google.com/document/d/FILE_ID/edit
 *   https://docs.google.com/spreadsheets/d/FILE_ID/edit
 *   https://docs.google.com/presentation/d/FILE_ID/edit
 */
export function extractDriveFileId(url) {
  if (!url) return null;
  const s = String(url).trim();

  // /file/d/ID/  or  /document/d/ID/  or  /spreadsheets/d/ID/  etc.
  const dMatch = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (dMatch) return dMatch[1];

  // ?id=ID or &id=ID
  const idMatch = s.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (idMatch) return idMatch[1];

  return null;
}

/**
 * Builds the embeddable preview URL for a Drive file.
 * Google Docs / Sheets / Slides need /preview, everything else /preview too.
 */
export function buildDrivePreviewUrl(fileId) {
  if (!fileId) return null;
  return "https://drive.google.com/file/d/" + fileId + "/preview";
}

/**
 * Builds the "open in Drive" URL.
 */
export function buildDriveOpenUrl(fileId) {
  if (!fileId) return null;
  return "https://drive.google.com/file/d/" + fileId + "/view";
}

/**
 * Given any Drive URL, returns { fileId, previewUrl, openUrl }
 * or null if not a valid Drive URL.
 */
export function parseDriveUrl(url) {
  const id = extractDriveFileId(url);
  if (!id) return null;
  return {
    fileId: id,
    previewUrl: buildDrivePreviewUrl(id),
    openUrl: buildDriveOpenUrl(id),
  };
}

/* =========================================================
   FILE TYPE METADATA
   ========================================================= */

export const FILE_TYPES = {
  pastPaper: { icon: "📄", label: "Past Paper", color: "#3b82f6" },
  notes: { icon: "📚", label: "Notes", color: "#a855f7" },
  revision: { icon: "📖", label: "Revision", color: "#f59e0b" },
  video: { icon: "🎥", label: "Video", color: "#ec4899" },
  image: { icon: "🖼️", label: "Image", color: "#10b981" },
  other: { icon: "📎", label: "Other", color: "#6b7590" },
};

export function getFileTypeMeta(type) {
  return FILE_TYPES[type] || FILE_TYPES.other;
}

/* =========================================================
   FETCH
   ========================================================= */

export async function fetchFiles({ limitCount = 200 } = {}) {
  if (!isOnline()) return [];
  const ref = collection(db, COLLECTIONS.FILES || "files");
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await withTimeout(getDocs(q), 10000, "Get files");
  return snap.docs.map(function (d) {
    const data = d.data() || {};
    return Object.assign({ id: d.id }, data, {
      createdAt:
        data.createdAt && data.createdAt.toDate
          ? data.createdAt.toDate().toISOString()
          : null,
    });
  });
}

/* =========================================================
   CREATE (admin only, enforced by Firestore rules)
   ========================================================= */

export async function addFile(input) {
  if (!isOnline()) throw new Error("Internet required.");
  if (!input || !input.title) throw new Error("Title is required.");
  if (!input.driveUrl) throw new Error("Drive URL is required.");

  const parsed = parseDriveUrl(input.driveUrl);
  if (!parsed) {
    throw new Error(
      "Invalid Google Drive URL. Paste a shared link like https://drive.google.com/file/d/.../view",
    );
  }

  const ref = collection(db, COLLECTIONS.FILES || "files");
  const docRef = await withTimeout(
    addDoc(ref, {
      title: input.title.trim(),
      driveUrl: input.driveUrl.trim(),
      fileId: parsed.fileId,
      previewUrl: parsed.previewUrl,
      openUrl: parsed.openUrl,
      subject: input.subject || "General",
      curriculum: input.curriculum || "844",
      level: input.level || "",
      type: input.type || "other",
      createdBy: input.createdBy || "",
      createdByName: input.createdByName || "",
      createdAt: serverTimestamp(),
    }),
    12000,
    "Add file",
  );

  return {
    id: docRef.id,
    title: input.title.trim(),
    driveUrl: input.driveUrl.trim(),
    fileId: parsed.fileId,
    previewUrl: parsed.previewUrl,
    openUrl: parsed.openUrl,
    subject: input.subject || "General",
    curriculum: input.curriculum || "844",
    level: input.level || "",
    type: input.type || "other",
    createdBy: input.createdBy || "",
    createdByName: input.createdByName || "",
    createdAt: new Date().toISOString(),
  };
}

/* =========================================================
   DELETE
   ========================================================= */

export async function removeFile(fileId) {
  if (!fileId) return false;
  if (!isOnline()) throw new Error("Internet required.");
  try {
    const ref = doc(db, COLLECTIONS.FILES || "files", fileId);
    await withTimeout(deleteDoc(ref), 10000, "Delete file");
    return true;
  } catch (e) {
    log.warn("Could not delete file:", e);
    return false;
  }
}
