// js/core/wallpaper-init.js
// Applies saved wallpaper on every page load.

(function () {
  const STORAGE_KEY = "wegem_wallpaper";
  const DEFAULT_URL =
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1400&q=60&auto=format";

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const url = saved && saved.url ? saved.url : DEFAULT_URL;
    document.documentElement.style.setProperty("--wallpaper", `url('${url}')`);
  } catch {
    document.documentElement.style.setProperty(
      "--wallpaper",
      `url('${DEFAULT_URL}')`,
    );
  }
})();
