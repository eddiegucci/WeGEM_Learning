// js/wallpaper-init.js — apply saved wallpaper on page load

const STORAGE_KEY = "wegem_wallpaper";
const DEFAULT_URL =
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80";

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
