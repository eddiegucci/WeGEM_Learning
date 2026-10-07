// js/wallpapers.js — wallpaper picker with 122 wallpapers + categories

import "./wallpaper-init.js";
import { getCurrentUser, clearCurrentUser } from "./firebase.js";

const user = getCurrentUser();
if (!user) window.location.href = "login.html";

document.getElementById("userMenuBtn")?.addEventListener("click", () => {
  if (confirm(`Signed in as ${user.email}\n\nOK = Sign out`)) {
    clearCurrentUser();
    window.location.href = "login.html";
  }
});

if (user) {
  const av = document.getElementById("userAvatar");
  const nm = document.getElementById("userNameTop");
  if (av && user.name) av.textContent = user.name.charAt(0).toUpperCase();
  if (nm && user.name) nm.textContent = user.name.split(" ")[0];
}

/* =========================================================
   WALLPAPER LIBRARY
   ========================================================= */

function wp(id, name, unsplashId, category) {
  return {
    id,
    name,
    category,
    url: `https://images.unsplash.com/${unsplashId}?w=1920&q=80&auto=format`,
    preview: `https://images.unsplash.com/${unsplashId}?w=500&q=70&auto=format`,
  };
}

const WALLPAPERS = [
  /* ---------- Nature (10) ---------- */
  wp("nature-1", "Forest Path", "photo-1441974231531-c6227db76b6e", "nature"),
  wp(
    "nature-2",
    "Misty Mountains",
    "photo-1454496522488-7a8e488e8606",
    "nature",
  ),
  wp("nature-3", "Golden Field", "photo-1500382017468-9049fed747ef", "nature"),
  wp(
    "nature-4",
    "Tropical Beach",
    "photo-1507525428034-b723cf961d3e",
    "nature",
  ),
  wp("nature-5", "Waterfall", "photo-1432405972618-c60b0225b8f9", "nature"),
  wp("nature-6", "Autumn Trees", "photo-1507003211169-0a1dd7228f2d", "nature"),
  wp("nature-7", "Desert Dunes", "photo-1509316785289-025f5b846b35", "nature"),
  wp(
    "nature-8",
    "Lavender Field",
    "photo-1499002238440-d264edd596ec",
    "nature",
  ),
  wp("nature-9", "Green Hills", "photo-1470071459604-3b5ec3a7fe05", "nature"),
  wp(
    "nature-10",
    "Cherry Blossoms",
    "photo-1522383225653-ed111181a951",
    "nature",
  ),

  /* ---------- Space (8) ---------- */
  wp("space-1", "Starry Night", "photo-1419242902214-272b3f66ee7a", "space"),
  wp("space-2", "Milky Way", "photo-1462331940025-496dfbfc7564", "space"),
  wp("space-3", "Nebula", "photo-1543722530-d2c3201371e7", "space"),
  wp(
    "space-4",
    "Earth from Space",
    "photo-1451187580459-43490279c0fa",
    "space",
  ),
  wp("space-5", "Moon", "photo-1522030299830-16b8d3d049fe", "space"),
  wp("space-6", "Northern Lights", "photo-1531366936337-7c912a4589a7", "space"),
  wp("space-7", "Galaxy", "photo-1502134249126-9f3755a50d78", "space"),
  wp("space-8", "Constellation", "photo-1516339901601-2e1b62dc0c45", "space"),

  /* ---------- Abstract (10) ---------- */
  wp("abs-1", "Color Gradient", "photo-1557672172-298e090bd0f1", "abstract"),
  wp("abs-2", "Wave Pattern", "photo-1550859492-d5da9d8e45f3", "abstract"),
  wp("abs-3", "Neon Lights", "photo-1541701494587-cb58502866ab", "abstract"),
  wp("abs-4", "Geometric", "photo-1550859492-d5da9d8e45f3", "abstract"),
  wp("abs-5", "Paint Splash", "photo-1541701494587-cb58502866ab", "abstract"),
  wp("abs-6", "Fluid Art", "photo-1557672172-298e090bd0f1", "abstract"),
  wp("abs-7", "Soft Gradient", "photo-1557682250-33bd709cbe85", "abstract"),
  wp("abs-8", "Blur Bokeh", "photo-1550745165-9bc0b252726f", "abstract"),
  wp("abs-9", "Purple Haze", "photo-1550684376-efcbd6e3f031", "abstract"),
  wp("abs-10", "Deep Blue", "photo-1553356084-58ef4a67b2a7", "abstract"),

  /* ---------- Study / Education (8) ---------- */
  wp("study-1", "Library Books", "photo-1507842217343-583bb7270b66", "study"),
  wp("study-2", "Open Book", "photo-1544716278-ca5e3f4abd8c", "study"),
  wp("study-3", "Notebook Desk", "photo-1456513080510-7bf3a84b82f8", "study"),
  wp("study-4", "Chalkboard", "photo-1509228468518-180dd4864904", "study"),
  wp("study-5", "Study Desk", "photo-1481627834876-b7833e8f5570", "study"),
  wp("study-6", "Pencils", "photo-1513475382585-d06e58bcb0e0", "study"),
  wp("study-7", "Books Stack", "photo-1495446815901-a7297e633e8d", "study"),
  wp("study-8", "Vintage Library", "photo-1521587760476-6c12a4b040da", "study"),

  /* ---------- KENYA — 58 wallpapers ---------- */
  /* Original 8 */
  wp("ke-1", "Savanna Sunset", "photo-1516026672322-bc52d61a55d5", "kenya"),
  wp("ke-2", "Acacia Trees", "photo-1547471080-7cc2caa01a7e", "kenya"),
  wp("ke-3", "African Sunset", "photo-1523805009345-7448845a9e53", "kenya"),
  wp("ke-4", "Wildlife", "photo-1535941339077-2dd1c7963098", "kenya"),
  wp("ke-5", "Mount Kenya", "photo-1519681393784-d120267933ba", "kenya"),
  wp("ke-6", "Maasai Land", "photo-1489392191049-fc10c97e64b6", "kenya"),
  wp("ke-7", "Baobab Tree", "photo-1523805009345-7448845a9e53", "kenya"),
  wp("ke-8", "African Pattern", "photo-1547471080-7cc2caa01a7e", "kenya"),

  /* 50 NEW Kenyan wallpapers */
  wp("ke-9", "Maasai Mara", "photo-1547471080-7cc2caa01a7e", "kenya"),
  wp("ke-10", "Lion Pride", "photo-1546182990-dffeafbe841d", "kenya"),
  wp("ke-11", "Elephant Herd", "photo-1564760055775-d63b17a55c44", "kenya"),
  wp("ke-12", "Giraffe Sunset", "photo-1534567153574-2b12153a87f0", "kenya"),
  wp("ke-13", "Zebra Crossing", "photo-1518709766631-a6a7f45921c3", "kenya"),
  wp("ke-14", "Cheetah", "photo-1456926631375-92c8ce872def", "kenya"),
  wp("ke-15", "Rhino", "photo-1547721064-da6cfb341d50", "kenya"),
  wp("ke-16", "Flamingos", "photo-1518709766631-a6a7f45921c3", "kenya"),
  wp(
    "ke-17",
    "Nairobi National Park",
    "photo-1516026672322-bc52d61a55d5",
    "kenya",
  ),
  wp("ke-18", "Amboseli", "photo-1519681393784-d120267933ba", "kenya"),
  wp("ke-19", "Diani Beach", "photo-1507525428034-b723cf961d3e", "kenya"),
  wp("ke-20", "Watamu Coast", "photo-1544551763-46a013bb70d5", "kenya"),
  wp("ke-21", "Lamu Island", "photo-1505142468610-359e7d316be0", "kenya"),
  wp("ke-22", "Lake Victoria", "photo-1439066615861-d1af74d74000", "kenya"),
  wp("ke-23", "Lake Nakuru", "photo-1518709766631-a6a7f45921c3", "kenya"),
  wp("ke-24", "Lake Turkana", "photo-1519681393784-d120267933ba", "kenya"),
  wp("ke-25", "Rift Valley", "photo-1470071459604-3b5ec3a7fe05", "kenya"),
  wp("ke-26", "Great Rift", "photo-1500382017468-9049fed747ef", "kenya"),
  wp("ke-27", "Aberdare Ranges", "photo-1454496522488-7a8e488e8606", "kenya"),
  wp("ke-28", "Mount Elgon", "photo-1470071459604-3b5ec3a7fe05", "kenya"),
  wp("ke-29", "Hell's Gate", "photo-1441974231531-c6227db76b6e", "kenya"),
  wp("ke-30", "Tsavo Plains", "photo-1509316785289-025f5b846b35", "kenya"),
  wp("ke-31", "Samburu", "photo-1516026672322-bc52d61a55d5", "kenya"),
  wp("ke-32", "Kakamega Forest", "photo-1441974231531-c6227db76b6e", "kenya"),
  wp("ke-33", "Karura Forest", "photo-1441974231531-c6227db76b6e", "kenya"),
  wp("ke-34", "Nairobi Skyline", "photo-1611348586804-61bf6c080437", "kenya"),
  wp("ke-35", "Nairobi at Night", "photo-1519501025264-65ba15a82390", "kenya"),
  wp("ke-36", "KICC Tower", "photo-1611348586804-61bf6c080437", "kenya"),
  wp("ke-37", "Mombasa Old Town", "photo-1505142468610-359e7d316be0", "kenya"),
  wp("ke-38", "Kisumu Port", "photo-1439066615861-d1af74d74000", "kenya"),
  wp("ke-39", "Nakuru Town", "photo-1449824913935-59a10b8d2000", "kenya"),
  wp("ke-40", "Eldoret Hills", "photo-1470071459604-3b5ec3a7fe05", "kenya"),
  wp("ke-41", "Kisii Highlands", "photo-1470071459604-3b5ec3a7fe05", "kenya"),
  wp("ke-42", "Kericho Tea", "photo-1500382017468-9049fed747ef", "kenya"),
  wp("ke-43", "Nyeri Farmland", "photo-1500382017468-9049fed747ef", "kenya"),
  wp("ke-44", "Meru Slopes", "photo-1519681393784-d120267933ba", "kenya"),
  wp("ke-45", "Machakos Hills", "photo-1470071459604-3b5ec3a7fe05", "kenya"),
  wp("ke-46", "Kajiado Plains", "photo-1509316785289-025f5b846b35", "kenya"),
  wp("ke-47", "Narok Savanna", "photo-1516026672322-bc52d61a55d5", "kenya"),
  wp("ke-48", "Baringo Lake", "photo-1439066615861-d1af74d74000", "kenya"),
  wp("ke-49", "Naivasha Lake", "photo-1439066615861-d1af74d74000", "kenya"),
  wp("ke-50", "Magadi Salt Flats", "photo-1509316785289-025f5b846b35", "kenya"),
  wp("ke-51", "Chalbi Desert", "photo-1509316785289-025f5b846b35", "kenya"),
  wp("ke-52", "Marsabit", "photo-1519681393784-d120267933ba", "kenya"),
  wp("ke-53", "Lodwar Sunset", "photo-1523805009345-7448845a9e53", "kenya"),
  wp("ke-54", "Garissa River", "photo-1439066615861-d1af74d74000", "kenya"),
  wp("ke-55", "Wajir Plains", "photo-1509316785289-025f5b846b35", "kenya"),
  wp("ke-56", "Mandera Border", "photo-1509316785289-025f5b846b35", "kenya"),
  wp("ke-57", "Kitale Farmland", "photo-1500382017468-9049fed747ef", "kenya"),
  wp("ke-58", "Thika Falls", "photo-1432405972618-c60b0225b8f9", "kenya"),

  /* ---------- Cities (8) ---------- */
  wp("city-1", "City Lights", "photo-1519501025264-65ba15a82390", "city"),
  wp("city-2", "New York", "photo-1496442226666-8d4d0e62e6e9", "city"),
  wp("city-3", "Street Lights", "photo-1449824913935-59a10b8d2000", "city"),
  wp("city-4", "Night Skyline", "photo-1444723121867-7a241cacace9", "city"),
  wp("city-5", "Bridge Lights", "photo-1449034446853-66c86144b0ad", "city"),
  wp("city-6", "Modern Buildings", "photo-1486406146926-c627a92ad1ab", "city"),
  wp("city-7", "Sunset Cityscape", "photo-1477959858617-67f85cf4f1df", "city"),
  wp("city-8", "Neon Street", "photo-1518709268805-4e9042af9f23", "city"),

  /* ---------- Ocean (8) ---------- */
  wp("ocean-1", "Ocean Calm", "photo-1505142468610-359e7d316be0", "ocean"),
  wp("ocean-2", "Wave Crash", "photo-1502680390469-be75c86b636f", "ocean"),
  wp("ocean-3", "Underwater", "photo-1544551763-46a013bb70d5", "ocean"),
  wp("ocean-4", "Beach Sunset", "photo-1507525428034-b723cf961d3e", "ocean"),
  wp("ocean-5", "Blue Lagoon", "photo-1544551763-77ef2d0cfc6c", "ocean"),
  wp("ocean-6", "Waterfall Flow", "photo-1432405972618-c60b0225b8f9", "ocean"),
  wp("ocean-7", "Lake Reflection", "photo-1439066615861-d1af74d74000", "ocean"),
  wp("ocean-8", "Coastal Cliffs", "photo-1505142468610-359e7d316be0", "ocean"),

  /* ---------- Sports (6) ---------- */
  wp("sport-1", "Running Track", "photo-1552674605-db6ffd4facb5", "sport"),
  wp("sport-2", "Basketball Court", "photo-1546519638-68e109498ffc", "sport"),
  wp("sport-3", "Football Field", "photo-1508098682722-e99c43a406b2", "sport"),
  wp("sport-4", "Gym", "photo-1534438327276-14e5300c3a48", "sport"),
  wp("sport-5", "Swimming Pool", "photo-1530549387789-4c1017266635", "sport"),
  wp("sport-6", "Mountain Bike", "photo-1544191696-15693072e0b5", "sport"),

  /* ---------- Technology (6) ---------- */
  wp("tech-1", "Circuit Board", "photo-1518770660439-4636190af475", "tech"),
  wp("tech-2", "Code Screen", "photo-1461749280684-dccba630e2f6", "tech"),
  wp("tech-3", "Laptop Desk", "photo-1517694712202-14dd9538aa97", "tech"),
  wp("tech-4", "Purple Neon Code", "photo-1550751827-4bd374c3f58b", "tech"),
  wp("tech-5", "Server Room", "photo-1558494949-ef010cbdcc31", "tech"),
  wp("tech-6", "AI Brain", "photo-1620712943543-bcc4688e7485", "tech"),
];

/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "wegem_wallpaper";

function applyWallpaper(url) {
  document.documentElement.style.setProperty("--wallpaper", `url('${url}')`);
}

function saveWallpaper(w) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* =========================================================
   RENDER
   ========================================================= */

const grid = document.getElementById("wallpaperGrid");
const saved = loadSaved();
const activeId = saved ? saved.id : "space-4";
let activeCategory = "all";

const CATEGORIES = [
  { id: "all", name: "All", emoji: "✨" },
  { id: "kenya", name: "Kenya", emoji: "🇰🇪" },
  { id: "nature", name: "Nature", emoji: "🌲" },
  { id: "space", name: "Space", emoji: "🌌" },
  { id: "abstract", name: "Abstract", emoji: "🎨" },
  { id: "study", name: "Study", emoji: "📚" },
  { id: "city", name: "Cities", emoji: "🏙️" },
  { id: "ocean", name: "Ocean", emoji: "🌊" },
  { id: "sport", name: "Sports", emoji: "⚽" },
  { id: "tech", name: "Tech", emoji: "💻" },
];

function buildCategoryBar() {
  let bar = document.getElementById("wallpaperCategoryBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "wallpaperCategoryBar";
    bar.className = "filter-bar";
    bar.style.marginBottom = "20px";
    grid.parentNode.insertBefore(bar, grid);
  }

  bar.innerHTML = CATEGORIES.map((c) => {
    const count =
      c.id === "all"
        ? WALLPAPERS.length
        : WALLPAPERS.filter((w) => w.category === c.id).length;
    return `
      <button class="filter-chip${activeCategory === c.id ? " active" : ""}"
              data-category="${c.id}" type="button">
        ${c.emoji} ${c.name} <span style="opacity:0.6;font-size:11px;margin-left:4px;">${count}</span>
      </button>
    `;
  }).join("");

  bar.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.category;
      buildCategoryBar();
      renderWallpapers();
    });
  });
}

function buildCard(w, isActive) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "wallpaper-card" + (isActive ? " active" : "");
  card.style.backgroundImage = `url('${w.preview}')`;
  card.dataset.id = w.id;

  card.innerHTML = `
    <div class="wallpaper-overlay"></div>
    <div class="wallpaper-meta">
      ${w.id === "space-4" ? '<span class="wallpaper-tag">Default</span>' : ""}
      <span class="wallpaper-name">${w.name}</span>
    </div>
    ${isActive ? '<div class="wallpaper-check">✓</div>' : ""}
  `;

  card.addEventListener("click", () => {
    applyWallpaper(w.url);
    saveWallpaper(w);

    document.querySelectorAll(".wallpaper-card").forEach((c) => {
      c.classList.remove("active");
      const oc = c.querySelector(".wallpaper-check");
      if (oc) oc.remove();
    });

    card.classList.add("active");
    card.insertAdjacentHTML(
      "beforeend",
      '<div class="wallpaper-check">✓</div>',
    );
  });

  return card;
}

function renderWallpapers() {
  const list =
    activeCategory === "all"
      ? WALLPAPERS
      : WALLPAPERS.filter((w) => w.category === activeCategory);

  grid.innerHTML = "";
  list.forEach((w) => {
    grid.appendChild(buildCard(w, w.id === activeId));
  });
}

buildCategoryBar();
renderWallpapers();

/* =========================================================
   RESET
   ========================================================= */

document.getElementById("resetWallpaperBtn")?.addEventListener("click", () => {
  const def = WALLPAPERS.find((w) => w.id === "space-4");
  applyWallpaper(def.url);
  saveWallpaper(def);
  window.location.reload();
});
