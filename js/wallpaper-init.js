// js/wallpaper-init.js — apply saved wallpaper or run default slideshow

const STORAGE_KEY = "wegem_wallpaper";
const SLIDE_DURATION = 2000; // 2 seconds between swaps
const FADE_MS = 1200; // crossfade duration

/* =========================================================
   DEFAULT SLIDESHOW IMAGES — full-size for sharpness
   ========================================================= */

const DEFAULT_SLIDES = [
  "https://media.istockphoto.com/id/2195693214/photo/nairobi-city-county-kenyas-capital-night-sunset-sunrise-cityscapes-skyscrapers-skyline-kenya.jpg?s=1920x1080&w=0&k=20&c=qRDNCNudSN5p4Mj08Ei-7-gMyLJccUnJ-C8YHLsXnzQ=",
  "https://media.istockphoto.com/id/2195460420/photo/wild-african-giraffe-stands-tall-against-urban-nairobi-dawn-view.jpg?s=1920x1080&w=0&k=20&c=GLe38UAxalJqxPEc0OnXFuFsWhvplaO6LN83g-3wSvE=",
  "https://media.istockphoto.com/id/2222298267/photo/elephant-silhouettes-beneath-a-lone-tree-maasai-mara-kenya.jpg?s=1920x1080&w=0&k=20&c=CNVUdxGn_RSyYFhQ3lJKVdMAxg74OeyAUXKTtlmYNV4=",
  "https://media.istockphoto.com/id/1752145797/photo/palm-trees-along-the-coast.jpg?s=1920x1080&w=0&k=20&c=Prz7EMRpAq3atokVPI6ikqnRwUOsraJmds8yixQJp_Q=",
  "https://media.istockphoto.com/id/1455430684/photo/drone-shot-over-the-beach-of-the-coastal-part-of-mombasa-kenya-at-sunrise.jpg?s=1920x1080&w=0&k=20&c=Qq2Mfvk850PwrothLUruu4q2hzbaNDlPex2V79MnY1Y=",
  "https://media.istockphoto.com/id/1416834065/photo/african-elephant-walking-with-tourist-car-stop-by-watching-during-sunset-at-masai-mara.jpg?s=1920x1080&w=0&k=20&c=OoRz5qTlXU4UTqhrXQ-c4bTO-avWBG-QE30iSOE_1Hg=",
];

/* =========================================================
   READ USER CHOICE
   ========================================================= */

let savedWallpaper = null;
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  savedWallpaper = raw ? JSON.parse(raw) : null;
} catch {
  savedWallpaper = null;
}

/* =========================================================
   IF USER HAS CHOSEN A WALLPAPER → APPLY STATIC IMAGE
   ========================================================= */

if (savedWallpaper && savedWallpaper.url) {
  document.documentElement.style.setProperty(
    "--wallpaper",
    `url('${savedWallpaper.url}')`,
  );
} else {
  /* =========================================================
     NO USER CHOICE → RUN DEFAULT SLIDESHOW
     ========================================================= */

  document.documentElement.style.setProperty("--wallpaper", "none");

  function setupSlideshow() {
    // Outer container
    const wrap = document.createElement("div");
    wrap.id = "defaultWallpaperSlideshow";
    wrap.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: -2;
      overflow: hidden;
      pointer-events: none;
      background: #060a15;
    `;

    // Create slides with initial opacity 0 (except first after preload)
    const slideEls = DEFAULT_SLIDES.map((url, i) => {
      const slide = document.createElement("div");
      slide.className = "wp-slide";
      slide.style.cssText = `
        position: absolute;
        inset: 0;
        background-image: url('${url}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 0;
        transition: opacity ${FADE_MS}ms ease-in-out;
        will-change: opacity;
      `;
      wrap.appendChild(slide);
      return slide;
    });

    document.body.appendChild(wrap);

    // Preload all images, THEN start the slideshow
    let loaded = 0;
    DEFAULT_SLIDES.forEach((url, i) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded === DEFAULT_SLIDES.length) start();
      };
      img.src = url;
    });

    // Fallback: start anyway after 3s even if some images fail
    setTimeout(() => {
      if (loaded < DEFAULT_SLIDES.length && !wrap.dataset.started) {
        start();
      }
    }, 3000);

    function start() {
      if (wrap.dataset.started) return;
      wrap.dataset.started = "1";

      let current = 0;
      slideEls[0].style.opacity = "1";

      setInterval(() => {
        slideEls[current].style.opacity = "0";
        current = (current + 1) % slideEls.length;
        slideEls[current].style.opacity = "1";
      }, SLIDE_DURATION);
    }
  }

  if (document.body) {
    setupSlideshow();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupSlideshow);
  } else {
    window.addEventListener("load", setupSlideshow);
  }
}
