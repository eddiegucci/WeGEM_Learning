// js/features/uploads.js
// Handles file uploads inside the notes section.
// - Images: display inline
// - PDF: render with pdf.js
// - DOCX: extract text with mammoth
// - XLS/XLSX: parse with SheetJS
// Libraries are loaded on-demand from CDN.

import { log } from "../core/utils.js";

/* =========================================================
   LIBRARY LOADERS (lazy, cached)
   ========================================================= */

const loadedLibs = {};

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = function () {
      resolve();
    };
    s.onerror = function () {
      reject(new Error("Failed to load " + src));
    };
    document.head.appendChild(s);
  });
}

async function ensurePdfJs() {
  if (loadedLibs.pdfjs) return loadedLibs.pdfjs;
  if (typeof window.pdfjsLib === "undefined") {
    await loadScript(
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs",
    );
    // The CDN version above is ESM. Fallback to the UMD build:
    if (typeof window.pdfjsLib === "undefined") {
      await loadScript(
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
      );
    }
  }
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  }
  loadedLibs.pdfjs = window.pdfjsLib;
  return window.pdfjsLib;
}

async function ensureMammoth() {
  if (loadedLibs.mammoth) return loadedLibs.mammoth;
  if (typeof window.mammoth === "undefined") {
    await loadScript(
      "https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js",
    );
  }
  loadedLibs.mammoth = window.mammoth;
  return window.mammoth;
}

async function ensureSheetJs() {
  if (loadedLibs.xlsx) return loadedLibs.xlsx;
  if (typeof window.XLSX === "undefined") {
    await loadScript(
      "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    );
  }
  loadedLibs.xlsx = window.XLSX;
  return window.XLSX;
}

/* =========================================================
   FILE TYPE DETECTION
   ========================================================= */

export function getFileKind(file) {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (
    type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)
  ) {
    return "image";
  }
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    type === "application/vnd.ms-excel" ||
    /\.(xlsx?|csv)$/i.test(name)
  ) {
    return "xls";
  }
  if (name.endsWith(".doc")) {
    return "legacy-doc";
  }
  return "unknown";
}

/* =========================================================
   READ FILE AS DATA URL (for images)
   ========================================================= */

function readAsDataURL(file) {
  return new Promise(function (resolve, reject) {
    const r = new FileReader();
    r.onload = function () {
      resolve(r.result);
    };
    r.onerror = function () {
      reject(r.error);
    };
    r.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file) {
  return new Promise(function (resolve, reject) {
    const r = new FileReader();
    r.onload = function () {
      resolve(r.result);
    };
    r.onerror = function () {
      reject(r.error);
    };
    r.readAsArrayBuffer(file);
  });
}

function readAsText(file) {
  return new Promise(function (resolve, reject) {
    const r = new FileReader();
    r.onload = function () {
      resolve(r.result);
    };
    r.onerror = function () {
      reject(r.error);
    };
    r.readAsText(file);
  });
}

/* =========================================================
   PARSE PDF → array of { text } blocks
   ========================================================= */

async function parsePdf(file) {
  const pdfjs = await ensurePdfJs();
  if (!pdfjs) throw new Error("PDF library could not be loaded.");

  const buf = await readAsArrayBuffer(file);
  const doc = await pdfjs.getDocument({ data: buf }).promise;

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map(function (item) {
        return item.str;
      })
      .join(" ");
    pages.push({ page: i, text: text.trim() });
  }

  return {
    pageCount: doc.numPages,
    pages: pages,
    // Full text, joined by page breaks
    text: pages
      .map(function (p) {
        return p.text;
      })
      .join("\n\n"),
  };
}

/* =========================================================
   PARSE DOCX → plain text
   ========================================================= */

async function parseDocx(file) {
  const mammoth = await ensureMammoth();
  if (!mammoth) throw new Error("DOCX library could not be loaded.");

  const buf = await readAsArrayBuffer(file);
  const result = await mammoth.extractRawText({ arrayBuffer: buf });

  return {
    text: String(result.value || "").trim(),
    messages: result.messages || [],
  };
}

/* =========================================================
   PARSE XLS/XLSX/CSV → array of sheets
   ========================================================= */

async function parseXls(file) {
  const XLSX = await ensureSheetJs();
  if (!XLSX) throw new Error("XLSX library could not be loaded.");

  const buf = await readAsArrayBuffer(file);
  const wb = XLSX.read(buf, { type: "array" });

  const sheets = wb.SheetNames.map(function (name) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    return { name: name, rows: rows };
  });

  return { sheets: sheets };
}

/* =========================================================
   PUBLIC API — parseFile
   Returns: { kind, ...parsedData }
   ========================================================= */

export async function parseFile(file) {
  if (!file) throw new Error("No file provided.");
  const kind = getFileKind(file);

  if (kind === "image") {
    const dataUrl = await readAsDataURL(file);
    return {
      kind: "image",
      dataUrl: dataUrl,
      name: file.name,
      size: file.size,
    };
  }

  if (kind === "pdf") {
    const parsed = await parsePdf(file);
    return {
      kind: "pdf",
      name: file.name,
      size: file.size,
      text: parsed.text,
      pageCount: parsed.pageCount,
      pages: parsed.pages,
    };
  }

  if (kind === "docx") {
    const parsed = await parseDocx(file);
    return {
      kind: "docx",
      name: file.name,
      size: file.size,
      text: parsed.text,
    };
  }

  if (kind === "xls") {
    const parsed = await parseXls(file);
    return {
      kind: "xls",
      name: file.name,
      size: file.size,
      sheets: parsed.sheets,
    };
  }

  if (kind === "legacy-doc") {
    throw new Error(".doc is not supported. Please save as .docx first.");
  }

  throw new Error("Unsupported file type: " + (file.type || file.name));
}

/* =========================================================
   SUMMARY — turn parsed content into a note body
   ========================================================= */

export function buildNoteDraftFromParsed(parsed) {
  const baseName = (parsed.name || "").replace(/\.[^.]+$/, "");

  if (parsed.kind === "image") {
    return {
      topic: baseName,
      summary: "Uploaded image: " + parsed.name,
      keyPoints: ["See image content."],
    };
  }

  if (parsed.kind === "pdf") {
    const firstLines = String(parsed.text || "")
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean)
      .slice(0, 4);
    return {
      topic: baseName,
      summary: "PDF · " + (parsed.pageCount || 0) + " pages",
      keyPoints: firstLines,
    };
  }

  if (parsed.kind === "docx") {
    const lines = String(parsed.text || "")
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    const summary = lines.slice(0, 2).join(" ") || "Uploaded document";
    return {
      topic: baseName,
      summary: summary.slice(0, 200),
      keyPoints: lines.slice(0, 6),
    };
  }

  if (parsed.kind === "xls") {
    const firstSheet = (parsed.sheets && parsed.sheets[0]) || { rows: [] };
    const rows = firstSheet.rows || [];
    const header = rows[0] || [];
    return {
      topic: baseName,
      summary: "Spreadsheet · " + (parsed.sheets || []).length + " sheet(s)",
      keyPoints: header.slice(0, 6).map(function (c) {
        return String(c);
      }),
    };
  }

  return {
    topic: baseName,
    summary: "",
    keyPoints: [],
  };
}
