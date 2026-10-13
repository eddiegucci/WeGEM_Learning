// js/core/wallpaper-init.js
// Applies saved wallpaper on every page load.
// Runs synchronously in <head> — must be fast.

(function () {
  const STORAGE_KEY = "wegem_wallpaper";
  const DEFAULT_URL =
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=60&auto=format";

  function apply(url) {
    const safe = String(url || "").replace(/'/g, "%27");
    document.documentElement.style.setProperty("--wallpaper", `url('${safe}')`);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const url = saved && saved.url ? saved.url : DEFAULT_URL;
    apply(url);
  } catch {
    apply(DEFAULT_URL);
  }
})();
