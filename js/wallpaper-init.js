// js/wallpaper-init.js — apply saved wallpaper on page load

const STORAGE_KEY = "wegem_wallpaper";
const DEFAULT_URL =
  "https://images.unsplash.com/photo-1531266752426-aad472b7bbf4?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

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
