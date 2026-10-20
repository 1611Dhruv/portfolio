// ═══════════════════════════════════════════════════════
//  EASTER-EGG SCENES
// ═══════════════════════════════════════════════════════
// Each scene lives in its own folder, public/scenes/<name>/, with a scene.js
// and a scene.css, and registers itself here:
//
//   Scenes.register({
//     word: "nahidwin",                         // typing this anywhere starts it
//     aliases: ["purple"],                      // optional: other words that start it
//     css: "/scenes/hollow-purple/scene.css",   // fetched up front
//     markup: `<div class="hp-overlay">...`,    // the scene's DOM, added on first play
//     preload: ["/penguin-gojo-400.png"],       // optional: images to fetch early
//     scripts: ["/scenes/x/engine.js"],         // optional: extra code, fetched on first play
//     flashy: "Hollow Purple has flashing...",  // optional: ask first under reduced motion
//     play(end) { ... end(); },                 // run it; call end() once it's over
//   });
//
// The markup only goes into the page once its CSS has loaded. Adding it at
// page load would show it unstyled for a moment, then fade it out.
//
// then add its <script src="/scenes/<name>/scene.js"> to index.html, after
// this file. Only one scene plays at a time.
window.Scenes = (() => {
  const scenes = [];
  let playing = null;

  function register(scene) {
    scenes.push(scene);
    scene.ready = Promise.resolve();
    if (scene.css) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = scene.css;
      scene.ready = new Promise((done) => {
        link.onload = link.onerror = done;
      });
      document.head.appendChild(link);
    }
    (scene.preload || []).forEach((src) => (new Image().src = src));
  }

  // Fed the visitor's recent keystrokes. True when they spelled a scene's word.
  function check(typed) {
    const scene = scenes.find((s) => [s.word, ...(s.aliases || [])].some((w) => typed.endsWith(w)));
    if (scene) play(scene);
    return !!scene;
  }

  function play(scene, confirmed) {
    if (playing) return;
    if (scene.flashy && !confirmed && !motionOk()) {
      confirmMotion(scene);
      return;
    }
    playing = scene;
    scene.ready.then(() => loadScripts(scene)).then(() => {
      if (scene.markup && !scene.mounted) {
        scene.mounted = true;
        document.body.insertAdjacentHTML("beforeend", scene.markup);
        void document.body.offsetWidth; // so the first fade-in still transitions
      }
      try { localStorage.setItem("sceneSeen", "1"); } catch {}
      let ended = false;
      scene.play(() => {
        if (ended) return;
        ended = true;
        playing = null;
      });
    });
  }

  // A big scene can keep most of its code in extra files, so visitors who
  // never trigger it never download it. They load in order, once.
  function loadScripts(scene) {
    if (!scene.scripts || scene.loaded) return scene.loaded;
    scene.loaded = scene.scripts.reduce(
      (prev, src) => prev.then(() => new Promise((done, fail) => {
        const el = document.createElement("script");
        el.src = src;
        el.onload = done;
        el.onerror = () => fail(new Error("couldn't load " + src));
        document.body.appendChild(el);
      })),
      Promise.resolve(),
    );
    scene.loaded.catch(() => { playing = null; scene.loaded = null; }); // let a later try fetch again
    return scene.loaded;
  }

  // ─── Reduced motion ───
  // If the visitor's device asks for reduced motion, a flashy scene checks
  // first. Choosing "Play it" is remembered for the rest of the visit.
  function motionOk() {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    try { return sessionStorage.getItem("sceneMotionOk") === "1"; } catch { return false; }
  }
  function confirmMotion(scene) {
    if (document.querySelector(".scene-warn")) return;
    const wrap = document.createElement("div");
    wrap.className = "scene-warn";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "scene-warn-title");
    wrap.innerHTML = `
      <div class="scene-warn-card">
        <div class="scene-warn-title" id="scene-warn-title">Heads up</div>
        <div class="scene-warn-text"></div>
        <div class="scene-warn-actions">
          <button type="button" data-act="skip">Skip</button>
          <button type="button" class="primary" data-act="play">Play it</button>
        </div>
      </div>`;
    wrap.querySelector(".scene-warn-text").textContent =
      scene.flashy + " Your device is set to reduce motion.";
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("show"));
    const close = () => {
      document.removeEventListener("keydown", onKey, true);
      wrap.classList.remove("show");
      setTimeout(() => wrap.remove(), 200);
    };
    const go = () => {
      try { sessionStorage.setItem("sceneMotionOk", "1"); } catch {}
      close();
      setTimeout(() => play(scene, true), 220);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "Enter" && !e.target.closest?.("button")) { e.preventDefault(); go(); }
    };
    document.addEventListener("keydown", onKey, true);
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (b) (b.dataset.act === "play" ? go : close)();
      else if (e.target === wrap) close();
    });
    wrap.querySelector('[data-act="play"]').focus();
  }

  // ─── Cameos ───
  // After a scene, its character pops in from the screen edge a few times
  // and says one line each time.
  //   make()       builds the character element (an <img> or <svg> wrapper)
  //   look         class for the character, e.g. its glow
  //   bubbleLook   class for the speech bubble, which sets the --cameo-* colours
  //   faceY        where the face is, as a fraction of the character's height
  const DEFAULT_APPEARANCES = [
    { side: "left", bottom: "12%", delay: 1200 },
    { side: "right", bottom: "30%", delay: 8500 },
    { side: "left", bottom: "45%", delay: 16000 },
    { side: "right", bottom: "18%", delay: 23500 },
  ];
  function cameos({ make, quotes, look, bubbleLook, faceY = 0.32, appearances = DEFAULT_APPEARANCES }) {
    appearances.forEach((app, idx) => {
      setTimeout(() => {
        const who = make();
        who.classList.add("cameo");
        if (look) who.classList.add(look);
        who.style.bottom = app.bottom;
        who.style[app.side] = "20px";
        who.style.animation =
          (app.side === "left" ? "cameoEnterLeft" : "cameoEnterRight") + " 6.5s ease-in-out forwards";

        const bub = document.createElement("div");
        bub.classList.add("cameo-bubble", "from-" + app.side);
        if (bubbleLook) bub.classList.add(bubbleLook);
        bub.textContent = quotes[idx % quotes.length];

        document.body.appendChild(who);
        document.body.appendChild(bub);
        // once they've walked in, put the bubble beside the face,
        // on the side facing into the screen
        setTimeout(() => {
          const g = who.getBoundingClientRect();
          const room = app.side === "left" ? window.innerWidth - g.right - 24 : g.left - 24;
          bub.style.maxWidth = Math.min(260, room) + "px";
          const face = g.top + g.height * faceY;
          const top = Math.max(8, Math.min(window.innerHeight - 8 - bub.offsetHeight, face - 18));
          bub.style.top = top + "px";
          if (app.side === "left") bub.style.left = g.right + 10 + "px";
          else bub.style.right = window.innerWidth - g.left + 10 + "px";
          bub.style.setProperty("--tail-y", Math.max(8, face - top - 5) + "px");
          bub.classList.add("show");
        }, 1500);
        setTimeout(() => bub.classList.remove("show"), 4800);
        setTimeout(() => {
          who.remove();
          bub.remove();
        }, 6800);
      }, app.delay);
    });
  }

  return {
    register,
    // has this visitor ever played a scene? (the "psst..." hint stops nagging)
    seen: () => {
      try { return localStorage.getItem("sceneSeen") === "1"; } catch { return false; }
    },
    check,
    cameos,
    // start a scene by its word, e.g. from a terminal command
    play: (word) => {
      const scene = scenes.find((s) => s.word === word);
      if (scene) play(scene);
    },
  };
})();
