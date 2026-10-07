// js/wallpapers.js — wallpaper picker

import "./wallpaper-init.js";
import { getCurrentUser, clearCurrentUser } from "./firebase.js";

const user = getCurrentUser();
if (!user) window.location.href = "login.html";

/* =========================================================
   WALLPAPERS — full list (sharp 1920px URLs)
   ========================================================= */

const WALLPAPERS = [
  {
    id: "wp01",
    name: "Nairobi Skyline",
    url: "https://media.istockphoto.com/id/2195693214/photo/nairobi-city-county-kenyas-capital-night-sunset-sunrise-cityscapes-skyscrapers-skyline-kenya.jpg?s=1920x1080&w=0&k=20&c=qRDNCNudSN5p4Mj08Ei-7-gMyLJccUnJ-C8YHLsXnzQ=",
    tag: "Default",
  },
  {
    id: "wp02",
    name: "Giraffe in Nairobi",
    url: "https://media.istockphoto.com/id/2195460420/photo/wild-african-giraffe-stands-tall-against-urban-nairobi-dawn-view.jpg?s=1920x1080&w=0&k=20&c=GLe38UAxalJqxPEc0OnXFuFsWhvplaO6LN83g-3wSvE=",
  },
  {
    id: "wp03",
    name: "Elephant Silhouette",
    url: "https://media.istockphoto.com/id/2222298267/photo/elephant-silhouettes-beneath-a-lone-tree-maasai-mara-kenya.jpg?s=1920x1080&w=0&k=20&c=CNVUdxGn_RSyYFhQ3lJKVdMAxg74OeyAUXKTtlmYNV4=",
  },
  {
    id: "wp04",
    name: "Palm Trees Coast",
    url: "https://media.istockphoto.com/id/1752145797/photo/palm-trees-along-the-coast.jpg?s=1920x1080&w=0&k=20&c=Prz7EMRpAq3atokVPI6ikqnRwUOsraJmds8yixQJp_Q=",
  },
  {
    id: "wp05",
    name: "Mombasa Beach",
    url: "https://media.istockphoto.com/id/1455430684/photo/drone-shot-over-the-beach-of-the-coastal-part-of-mombasa-kenya-at-sunrise.jpg?s=1920x1080&w=0&k=20&c=Qq2Mfvk850PwrothLUruu4q2hzbaNDlPex2V79MnY1Y=",
  },
  {
    id: "wp06",
    name: "Maasai Mara Elephant",
    url: "https://media.istockphoto.com/id/1416834065/photo/african-elephant-walking-with-tourist-car-stop-by-watching-during-sunset-at-masai-mara.jpg?s=1920x1080&w=0&k=20&c=OoRz5qTlXU4UTqhrXQ-c4bTO-avWBG-QE30iSOE_1Hg=",
  },
  {
    id: "wp07",
    name: "Kenya Landscape",
    url: "https://plus.unsplash.com/premium_photo-1664304370557-233bccc0ac85?w=1920&auto=format&fit=crop&q=80&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8a2VueWF8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: "wp08",
    name: "Kenya Scene",
    url: "https://images.unsplash.com/photo-1624493176575-7a5a3b74460a?w=1920&auto=format&fit=crop&q=80&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGtlbnlhfGVufDB8fDB8fHww",
  },
  {
    id: "wp09",
    name: "Kenya View",
    url: "https://images.unsplash.com/photo-1623745493572-ef78d94249f3?w=1920&auto=format&fit=crop&q=80&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGtlbnlhfGVufDB8fDB8fHww",
  },
  {
    id: "wp10",
    name: "Kenya Premium",
    url: "https://plus.unsplash.com/premium_photo-1670689708073-995104fd2e8d?w=1920&auto=format&fit=crop&q=80&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8a2VueWF8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: "wp11",
    name: "Kenya Premium 2",
    url: "https://plus.unsplash.com/premium_photo-1661903828880-9ac0281ee00d?w=1920&auto=format&fit=crop&q=80&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8a2VueWF8ZW58MHx8MHx8fDA%3D",
  },
  {
    id: "wp12",
    name: "Kenya Landscape 2",
    url: "https://images.unsplash.com/photo-1620693776767-e929c5724b49?w=1920&auto=format&fit=crop&q=80&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjB8fGtlbnlhfGVufDB8fDB8fHww",
  },
  {
    id: "wp13",
    name: "Kenya Landscape 3",
    url: "https://images.unsplash.com/photo-1728042107033-76b13feac547?w=1920&auto=format&fit=crop&q=80&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fGtlbnlhfGVufDB8fDB8fHww",
  },
  {
    id: "wp14",
    name: "Giraffes in the Park",
    url: "https://media.istockphoto.com/id/697689066/photo/three-giraffe-in-national-park-of-kenya.webp?a=1&b=1&s=1920x1080&w=0&k=20&c=IJObgFOANRKSIxYSNqnR3JmGLjpQDm5IFd7zr7CGdT0=",
  },
  {
    id: "wp15",
    name: "Kenyan Cuisine",
    url: "https://media.istockphoto.com/id/2176917166/photo/kenyan-food-cuisines-foods-meals-dishes-dinner-supper-breakfast-snacks-yummy-delicious-lunch.jpg?s=1920x1080&w=0&k=20&c=xF9vXDDRtYRHqlv60nHtwKRML-rxcpepTsVF0rtnhFs=",
  },
  {
    id: "wp16",
    name: "Women at the Well",
    url: "https://media.istockphoto.com/id/2240096456/photo/african-women-collecting-water-from-the-well-kenya-east-africa.jpg?s=1920x1080&w=0&k=20&c=jy_v3rgL6-T9kAs6M_mxVSe4jeBkQ-5Z2ky20I2NBhU=",
  },
  {
    id: "wp17",
    name: "Kilimanjaro Backdrop",
    url: "https://media.istockphoto.com/id/2160005491/photo/stylish-hipster-girl-in-hat-walking-against-the-backdrop-of-peak-of-kilimanjaro-happy-young.jpg?s=1920x1080&w=0&k=20&c=t6u2ECwferucqD53XC57yctwoTiDygoRGz7MT4QJVmg=",
  },
  {
    id: "wp18",
    name: "Safari in Maasai Mara",
    url: "https://media.istockphoto.com/id/2224265777/photo/elephant-and-safari-vehicle-in-maasai-mara.jpg?s=1920x1080&w=0&k=20&c=eWZfwN0aslOvWeiP68S5LSh_141OooJVuKsvQQ71NCs=",
  },
  {
    id: "wp19",
    name: "Mount Kenya",
    url: "https://media.istockphoto.com/id/183281038/photo/mount-kenya-late-in-day-looking-south.jpg?s=1920x1080&w=0&k=20&c=ILPpA7a7hdnYNuAvSFNHy9138yUr5tIy1iXs7sxvONg=",
  },
  {
    id: "wp20",
    name: "Pilau",
    url: "https://media.istockphoto.com/id/1030110292/photo/pilaf-pilau-or-plov-with-beef-meat.jpg?s=1920x1080&w=0&k=20&c=8o9-G0GVmSNfJ72WzIO8gLCziarVI1OLU2xarkZtmj4=",
  },
  {
    id: "wp21",
    name: "Roasted Fish",
    url: "https://media.istockphoto.com/id/1440695432/photo/roasted-fish-served-on-a-white-plate-on-wooden-table-top.jpg?s=1920x1080&w=0&k=20&c=76SJnWXDblyemxq_NGM4vWDx9B2u31kjj2g_6XUQxl0=",
  },
  {
    id: "wp22",
    name: "Nyama Choma",
    url: "https://media.istockphoto.com/id/882186476/photo/sharing-platter-of-a-traditional-kenyan-dish-nyama-choma-and-accompaniments-of-kachumbari.jpg?s=1920x1080&w=0&k=20&c=QUcFRMsRHotIRVompgUbV1wnU1eadl0uE72myRVpfjk=",
  },
  {
    id: "wp23",
    name: "Chicken Stew & Rice",
    url: "https://media.istockphoto.com/id/1440695430/photo/chicken-stew-and-rice-dish-served-on-a-white-place-on-a-wooden-table-delicia-african-chicken.jpg?s=1920x1080&w=0&k=20&c=bUhlLF0vMzFkrsHMF5FeJqgr9VKRc1GfasdsV-eLwrc=",
  },
  {
    id: "wp24",
    name: "Potato Harvest",
    url: "https://media.istockphoto.com/id/545653582/photo/potato-farmer-harvesting.jpg?s=1920x1080&w=0&k=20&c=2AfTKyA4exsbJLFZWdadmgTTSXtR3Tic7dAtpU0Se-Y=",
  },
  {
    id: "wp25",
    name: "Ugali & Greens",
    url: "https://media.istockphoto.com/id/1388531127/photo/ugali-and-traditionl-greens.jpg?s=1920x1080&w=0&k=20&c=zQUNx58N5oih17SjGjt8lXBU5KTZxCJez0wZU6R6NIg=",
  },
  {
    id: "wp26",
    name: "Kuku Paka",
    url: "https://media.istockphoto.com/id/1277327714/photo/kenyan-kuku-paka-is-a-chicken-roasted-over-charcoal-and-then-cooked-in-a-coconut-curry.jpg?s=1920x1080&w=0&k=20&c=PvGsvVsdqC6rMOK5X-2vW1GXLx294UY1DG0-8zN1mOg=",
  },
  {
    id: "wp27",
    name: "Kenyan Food II",
    url: "https://media.istockphoto.com/id/2176916390/photo/kenyan-food-cuisines-foods-meals-dishes-dinner-supper-breakfast-snacks-yummy-delicious-lunch.jpg?s=1920x1080&w=0&k=20&c=JivjO5oCjP5CNdyjN7q6h7gZNi25HbKiTPGgFlRw7bs=",
  },
  {
    id: "wp28",
    name: "Mombasa Market",
    url: "https://media.istockphoto.com/id/899923440/photo/mombasa-market-kenya.jpg?s=1920x1080&w=0&k=20&c=wYpTfvZLGPEiz6LMrGniiDVajpP1K7pkJ8kzOD_C6oo=",
  },
  {
    id: "wp29",
    name: "Coffee Harvest",
    url: "https://media.istockphoto.com/id/2280147389/photo/young-african-woman-collecting-coffee-cherries-kenya-east-africa.jpg?s=1920x1080&w=0&k=20&c=LpJpPj4CV683zIM1YtoR3A5MULG3x-GomtUst3OJcW4=",
  },
  {
    id: "wp30",
    name: "Maasai Jump",
    url: "https://media.istockphoto.com/id/1412580753/photo/maasai-mara-man-showing-traditional-maasai-jumping-dance.jpg?s=1920x1080&w=0&k=20&c=Twus0f8IbS_7ttxUDzybr6TiVAAR7LIJFtWIujR8qK8=",
  },
  {
    id: "wp31",
    name: "Tribal Village I",
    url: "https://media.istockphoto.com/id/637900534/photo/traditional-tribal-village-of-kenyan-people.jpg?s=1920x1080&w=0&k=20&c=5SXghXD2KuNHELTWU2I2752QWRM4RxQj47AvlvmCK68=",
  },
  {
    id: "wp32",
    name: "Tribal Village II",
    url: "https://media.istockphoto.com/id/637905132/photo/traditional-tribal-village-of-kenyan-people.jpg?s=1920x1080&w=0&k=20&c=UBi5zZ5hC6Z3C4GVTQWMbrXDX_xRkOKuBw4XVRieWWE=",
  },
  {
    id: "wp33",
    name: "Traditional Hut",
    url: "https://media.istockphoto.com/id/637910084/photo/traditional-tribal-hut-of-kenyan-people.jpg?s=1920x1080&w=0&k=20&c=Jr19Mpd2D0NWqg3U1VPjxoKwV62zA0rND2OueBY2CcI=",
  },
  {
    id: "wp34",
    name: "Maasai Warrior",
    url: "https://media.istockphoto.com/id/1341332662/photo/warrior-from-maasai-tribe-performing-traditional-jumping-dance-kenya-africa.jpg?s=1920x1080&w=0&k=20&c=ojVMvEcXFafSGquzeZ_OW8U0R1okA7Z8FXGrH5--PC8=",
  },
  {
    id: "wp35",
    name: "Giraffe & Balloon",
    url: "https://media.istockphoto.com/id/532180530/photo/giraffe-and-balloon.jpg?s=1920x1080&w=0&k=20&c=uIOubNKJnt4QgPmWozgoiXLkaw5nPwHnChDjUBkulZI=",
  },
  {
    id: "wp36",
    name: "Wild Figs",
    url: "https://media.istockphoto.com/id/2211260160/photo/a-bunch-of-wild-ripe-figs-hanging-from-a-fig-tree.jpg?s=1920x1080&w=0&k=20&c=QBBryWnso4qUSK97pQdwGmeonvlApIxmuf8lmuXaGFU=",
  },
  {
    id: "wp37",
    name: "Lake Nakuru Flamingoes",
    url: "https://media.istockphoto.com/id/2168651527/photo/kenya-lake-nakaru-flamingoes.jpg?s=1920x1080&w=0&k=20&c=Rw3McyYKqOlvneA8AYPP_vgbrBvJfswIzV9E8Ry3zys=",
  },
  {
    id: "wp38",
    name: "Thomson Falls",
    url: "https://media.istockphoto.com/id/2230335945/photo/thomson-kenya-cataract.jpg?s=1920x1080&w=0&k=20&c=ZhJm87ZrIl060DNysXQ9ajasGFPVapOcuRLdaEXJXKQ=",
  },
  {
    id: "wp39",
    name: "Zebras at Dawn",
    url: "https://media.istockphoto.com/id/533345827/photo/zebras-in-the-morning.jpg?s=1920x1080&w=0&k=20&c=qoKibFhadCNRnZ0Wpfw3gTj4HATO16NEPJfts2rbm2Y=",
  },
  {
    id: "wp40",
    name: "Swahili Snacks – Lamu",
    url: "https://media.istockphoto.com/id/2266155787/photo/swahili-snacks-during-ramadan-in-lamu-island.jpg?s=1920x1080&w=0&k=20&c=75S59QJ04myz5ob4NXxrpA9K_CQ8_D3HjFAccD1Ey2g=",
  },
  {
    id: "wp41",
    name: "Chacma Baboon",
    url: "https://media.istockphoto.com/id/2268634805/photo/a-black-and-white-image-of-a-chacma-baboon-grooming-himself.jpg?s=1920x1080&w=0&k=20&c=USxoB5DW4lkK8-WCGqx7b54WLyi0OA0S3THmmOhmbWQ=",
  },
  {
    id: "wp42",
    name: "Kuku na Nazi",
    url: "https://media.istockphoto.com/id/1277325923/photo/kuku-paka-is-a-chicken-dish-with-a-coconut-based-curry-and-is-also-called-kuku-na-nazi.jpg?s=1920x1080&w=0&k=20&c=Sre1XrAMzVQxX_hJGNvjYK2atGt34V5Ft6dFTT_4VFY=",
  },
  {
    id: "wp43",
    name: "Tea Plantation",
    url: "https://media.istockphoto.com/id/2240066348/photo/african-women-plucking-tea-leaves-on-plantation-east-africa.jpg?s=1920x1080&w=0&k=20&c=udcXa1640SF5-S3hzQ4qG7D9KnH7Tw4QORJOjDuEeuw=",
  },
  {
    id: "wp44",
    name: "Martial Eagle",
    url: "https://media.istockphoto.com/id/2256241008/photo/juvenile-martial-eagle-flying-through-blue-sky.jpg?s=1920x1080&w=0&k=20&c=f83UBEjIWUtNY4_SM5MKTB7yEo0rHNjKmL7biQXcgo4=",
  },
  {
    id: "wp45",
    name: "Serval Cat at Night",
    url: "https://media.istockphoto.com/id/2295622587/photo/wild-serval-cat-drinks-from-a-watering-hole-at-night.jpg?s=1920x1080&w=0&k=20&c=2wYYwNowwfFunolD6pro8wKERzdOr8XPE9_ORMufbKo=",
  },
  {
    id: "wp46",
    name: "Zebra at Mara River",
    url: "https://media.istockphoto.com/id/2296816793/photo/vain-zebra-at-the-mara-river.jpg?s=1920x1080&w=0&k=20&c=sAjTfVqTj9pO7xFbrJbEMHgeNu5kHfS9fmda51XxFGo=",
  },
  {
    id: "wp47",
    name: "Chameleon",
    url: "https://media.istockphoto.com/id/2296753866/photo/brown-chameleon-walking-on-leaf-in-profile-kenya.jpg?s=1920x1080&w=0&k=20&c=F0lfZzKG4YBDX39DsXtfutFeJVl7llf2-KmLtGTb1iE=",
  },
  {
    id: "wp48",
    name: "Cheetah in the Grass",
    url: "https://media.istockphoto.com/id/2295906147/photo/mono-cheetah-sitting-in-grass-turning-right.jpg?s=1920x1080&w=0&k=20&c=SuIEF4jHLmeNZvg9qaA9z8SjMUZdcDD0rtMROrsqVYw=",
  },
  {
    id: "wp49",
    name: "Chilli Samosa",
    url: "https://media.istockphoto.com/id/1322628916/photo/chilli-samosa.jpg?s=1920x1080&w=0&k=20&c=7SNSmrRH05Z721uljsX4a9Zr-d5QQsGV942TVPLKCjk=",
  },
  {
    id: "wp50",
    name: "Tamarillo Plants",
    url: "https://media.istockphoto.com/id/1328081409/photo/tamarillo-plants-also-known-as-tree-tomato.jpg?s=1920x1080&w=0&k=20&c=W22SKy7INoOHNIW1GfmRsuFw5zmbE54gL_aW1bAo3RM=",
  },
  {
    id: "wp51",
    name: "Mango & Mint Juice",
    url: "https://media.istockphoto.com/id/2285610864/photo/mango-and-mint-juices-with-orange-garnish.jpg?s=1920x1080&w=0&k=20&c=auWy0T0h295Qtj41osLISIpHYUY5V0liqi6PFxdDAg0=",
  },
  {
    id: "wp52",
    name: "Wedding Cakes",
    url: "https://media.istockphoto.com/id/2240075579/photo/wedding-cakes-setup-birthday-details-delicious-yummy-kenya-east-africa.jpg?s=1920x1080&w=0&k=20&c=wDWGzf99G_U_5peItdEE9-5eZQoTPs0P5-EQAM6nsyA=",
  },
  {
    id: "wp53",
    name: "Cottage Cheese Pancakes",
    url: "https://media.istockphoto.com/id/2254349050/photo/traditional-cottage-cheese-pancakes-served-with-sour-cream-and-chocolate.jpg?s=1920x1080&w=0&k=20&c=yb24eJYGn6EdSCCFIYCEWno9H67eXp922neCEZiYNd8=",
  },
];

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

const grid = document.getElementById("wallpaperGrid");
const saved = loadSaved();
const activeId = saved ? saved.id : "wp01";

WALLPAPERS.forEach((w) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "wallpaper-card" + (w.id === activeId ? " active" : "");
  card.style.backgroundImage = `url('${w.url}')`;

  card.innerHTML = `
    <div class="wallpaper-overlay"></div>
    <div class="wallpaper-meta">
      ${w.tag ? `<span class="wallpaper-tag">${w.tag}</span>` : ""}
      <span class="wallpaper-name">${w.name}</span>
    </div>
    ${w.id === activeId ? '<div class="wallpaper-check">✓</div>' : ""}
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

  grid.appendChild(card);
});

document.getElementById("resetWallpaperBtn")?.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
});
