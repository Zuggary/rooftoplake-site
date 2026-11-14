/* RooftopLake v2 — hero layered parallax and lazy-loaded scroll-scrubbed dive interlude.
   Safe no-op on pages (such as how-it-works.html) where .v2-hero / .v2-dive are absent. */
(() => {
  'use strict';

  const hero = document.querySelector('.v2-hero');
  const dive = document.querySelector('.v2-dive');
  if (!hero && !dive) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  /* ----- Hero layered parallax ----- */
  const duskImg = hero ? hero.querySelector('.v2-hero-dusk img') : null;
  const lightLayer = hero ? hero.querySelector('.v2-hero-light') : null;

  /* ----- Dive scroll-scrubbed frames ----- */
  const FRAME_COUNT = 41;
  const canvas = dive ? dive.querySelector('.v2-dive-canvas') : null;
  const ctx = canvas ? canvas.getContext('2d') : null;
  const frames = new Array(FRAME_COUNT);
  let lastDrawn = -1;

  function frameSrc(index) {
    const num = String(index + 1).padStart(3, '0');
    return `media/dive/${num}.webp`;
  }

  function drawFrame(index) {
    if (!ctx || !canvas) return;
    const img = frames[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    if (index === lastDrawn) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    lastDrawn = index;
  }

  function preloadFrames() {
    if (!dive || !ctx || reduced) return;

    // Draw frame 1 first so the canvas is ready before the remaining 40 frames arrive.
    const first = new Image();
    first.decoding = 'async';
    first.onload = () => {
      frames[0] = first;
      dive.classList.add('is-ready');
      drawFrame(0);
      loadBatch(1);
    };
    first.src = frameSrc(0);
  }

  function loadBatch(startIndex) {
    const BATCH = 4;
    let remaining = Math.min(BATCH, FRAME_COUNT - startIndex);
    if (remaining <= 0) return;

    for (let i = startIndex; i < startIndex + BATCH && i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = img.onerror = () => {
        remaining -= 1;
        if (remaining === 0 && startIndex + BATCH < FRAME_COUNT) {
          loadBatch(startIndex + BATCH);
        }
      };
      frames[i] = img;
      img.src = frameSrc(i);
    }
  }

  function schedulePreload() {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preloadFrames, { timeout: 1500 });
    } else {
      window.setTimeout(preloadFrames, 200);
    }
  }

  if (dive && !reduced) {
    if (document.readyState === 'complete') {
      schedulePreload();
    } else {
      window.addEventListener('load', schedulePreload, { once: true });
    }
  }

  /* ----- Scroll update loop (rAF + passive listener) ----- */
  let ticking = false;

  function update() {
    ticking = false;
    if (reduced) return;

    const y = window.scrollY || window.pageYOffset || 0;
    const vh = window.innerHeight || 800;

    if (hero && duskImg) {
      const t = clamp(y / vh, 0, 1.25);
      const scale = 1 + t * 0.14;
      const duskY = y * 0.22;
      const opacity = clamp(1 - t * 0.92, 0, 1);
      duskImg.style.transform = `translate3d(0, ${duskY.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      duskImg.style.opacity = opacity.toFixed(3);

      if (lightLayer) {
        const lightY = y * -0.16;
        lightLayer.style.transform = `translate3d(0, ${lightY.toFixed(1)}px, 0)`;
      }
    }

    if (dive) {
      const rect = dive.getBoundingClientRect();
      const span = dive.offsetHeight - vh;
      const progress = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;

      // Scrub 41 frames across scroll progress
      const target = Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT));
      if (frames[target] && frames[target].complete && frames[target].naturalWidth > 0) {
        drawFrame(target);
      } else {
        // Fallback to nearest loaded frame so scrubbing never flashes blank
        for (let offset = 1; offset < FRAME_COUNT; offset++) {
          const prev = target - offset;
          if (prev >= 0 && frames[prev] && frames[prev].complete && frames[prev].naturalWidth > 0) {
            drawFrame(prev);
            break;
          }
        }
      }

      // Fade in the underwater statement smoothly as the user dives
      const textOpacity = clamp((progress - 0.12) / 0.28, 0, 1);
      const textLift = (1 - textOpacity) * 18;
      dive.style.setProperty('--dive-text-o', textOpacity.toFixed(3));
      dive.style.setProperty('--dive-text-y', `${textLift.toFixed(1)}px`);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  if (!reduced) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }
})();
