(() => {
  // ─── SAY MY NAME (Heisenberg) ───
  // Type "saymyname".
  // The penguin puts on the hat, walks into the desert and makes the
  // visitor say his name. It waits until they do; Esc is the only way out.

  const MARKUP = `<div class="bb-overlay" id="bb-overlay" aria-hidden="true">
      <canvas class="bb-canvas" id="bb-canvas"></canvas>
      <div class="bb-bar top"></div>
      <div class="bb-bar bottom"></div>
      <div class="bb-walt" id="bb-walt"></div>
      <div class="bb-sub" id="bb-sub" aria-live="polite"></div>
    </div>`;

  // Heisenberg penguin, drawn as vector so it stays sharp in the close-up.
  // Same style as penguin-400.png, with the eyes at 37% of the height
  // because the creep zooms in on them.
  function heisenbergPenguin(el) {
    el.innerHTML = `
      <svg viewBox="0 0 400 400" role="img" aria-label="Heisenberg penguin">
        <g stroke="#23272a" stroke-width="6" stroke-linejoin="round">
          <ellipse cx="160" cy="318" rx="28" ry="12" fill="#f4a24a" />
          <ellipse cx="240" cy="318" rx="28" ry="12" fill="#f4a24a" />
          <path d="M120 186 C92 212 86 252 98 268 C112 264 122 238 128 212 Z" fill="#7a4e2b" />
          <path d="M280 186 C308 212 314 252 302 268 C288 264 278 238 272 212 Z" fill="#7a4e2b" />
          <path d="M200 62 C264 62 286 114 286 168 C286 200 298 236 294 266 C290 300 252 314 200 314 C148 314 110 300 106 266 C102 236 114 200 114 168 C114 114 136 62 200 62 Z" fill="#3f474d" />
        </g>
        <path d="M200 112 C180 96 142 102 138 140 C135 168 146 188 154 204 Q200 224 246 204 C254 188 265 168 262 140 C258 102 220 96 200 112 Z" fill="#fbf3e4" />
        <!-- blue shirt, then the brown jacket open over it -->
        <path d="M152 200 Q200 220 248 200 L246 312 L154 312 Z" fill="#3d6aa8" />
        <path d="M200 236 L200 312" stroke="#2c5189" stroke-width="2" />
        <circle cx="200" cy="252" r="2.5" fill="#dbe7f7" />
        <circle cx="200" cy="278" r="2.5" fill="#dbe7f7" />
        <g fill="#8a5a32" stroke="#23272a" stroke-width="5" stroke-linejoin="round">
          <path d="M114 192 Q146 208 180 212 L174 314 C138 312 109 299 106 266 C103 246 110 228 114 192 Z" />
          <path d="M286 192 Q254 208 220 212 L226 314 C262 312 291 299 294 266 C297 246 290 228 286 192 Z" />
        </g>
        <g fill="#6e4524" stroke="#23272a" stroke-width="3.5" stroke-linejoin="round">
          <path d="M146 203 L182 212 L166 246 Z" />
          <path d="M254 203 L218 212 L234 246 Z" />
        </g>
        <g fill="#6f9ad3" stroke="#23272a" stroke-width="2.5" stroke-linejoin="round">
          <path d="M180 208 L200 222 L184 230 Z" />
          <path d="M220 208 L200 222 L216 230 Z" />
        </g>
        <g stroke="#5c3a1d" stroke-width="3" stroke-linecap="round" fill="none">
          <path d="M126 272 L158 276" />
          <path d="M274 272 L242 276" />
          <path d="M98 262 L112 258" />
          <path d="M302 262 L288 258" />
        </g>
        <!-- narrowed eyes under a hard brow -->
        <g fill="#1b1d1f">
          <path d="M157 146 h22 a11 10 0 0 1 -22 0 z" />
          <path d="M221 146 h22 a11 10 0 0 1 -22 0 z" />
        </g>
        <circle cx="172" cy="149" r="2.6" fill="#fff" />
        <circle cx="236" cy="149" r="2.6" fill="#fff" />
        <g stroke="#23272a" stroke-width="7" stroke-linecap="round">
          <path d="M150 129 L186 139" />
          <path d="M250 129 L214 139" />
        </g>
        <!-- thin rectangular frames -->
        <g fill="#cfe6ff" fill-opacity="0.14" stroke="#141414" stroke-width="4.5">
          <rect x="143" y="130" width="50" height="34" rx="8" />
          <rect x="207" y="130" width="50" height="34" rx="8" />
        </g>
        <g fill="none" stroke="#141414" stroke-width="4.5" stroke-linecap="round">
          <path d="M193 141 Q200 135 207 141" />
          <path d="M143 140 L124 136" />
          <path d="M257 140 L276 136" />
        </g>
        <path d="M151 135 l13 -2" stroke="#fff" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round" />
        <path d="M215 135 l13 -2" stroke="#fff" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round" />
        <!-- circle beard: a ring round the beak, with a short chin tuft -->
        <path d="M180 163 Q175 184 186 198 Q193 209 200 213 Q207 209 214 198 Q225 184 220 163 L213 166 Q215 182 207 190 Q200 195 193 190 Q185 182 187 166 Z" fill="#4b3b2f" stroke="#241b14" stroke-width="2.5" stroke-linejoin="round" />
        <g stroke="#a39a90" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.8">
          <path d="M183 176 l3 9" />
          <path d="M217 176 l-3 9" />
          <path d="M196 200 l2 7" />
          <path d="M205 199 l-1 7" />
        </g>
        <path d="M187 167 Q200 159 213 167 Q207 181 200 183 Q193 181 187 167 Z" fill="#f4a24a" stroke="#23272a" stroke-width="3.5" stroke-linejoin="round" />
        <path class="bb-sweat" d="M280 104 q-12 20 0 26 q12 -6 0 -26 z" fill="#9fd8ff" stroke="#3a6f99" stroke-width="2" />
        <!-- pork pie hat -->
        <path d="M146 86 L154 36 Q200 26 246 36 L254 86 Z" fill="#161616" />
        <path d="M168 40 Q200 50 232 40" stroke="#000" stroke-width="3" fill="none" />
        <rect x="148" y="70" width="104" height="14" fill="#3a3a3a" />
        <ellipse cx="200" cy="88" rx="104" ry="15" fill="#161616" />
        <path d="M104 88 Q200 110 296 88" stroke="#2c2c2c" stroke-width="2" fill="none" />
      </svg>`;
  }

  // what he mutters afterwards depends on which name you said
  const bbRoamQuotes = {
    heisenberg: [
      "I am the one who deploys",
      "I am not in danger. I am the danger",
      "Tread lightly",
      "We're done when I say we're done",
    ],
    walter: [
      "Walter? Never heard of him",
      "Just a chemistry teacher. Penguin. Chemistry penguin",
      "Please don't tell Hank",
      "If anyone asks, I lost my pants in the desert. Long story",
    ],
  };
  function heisenbergCameos(name) {
    Scenes.cameos({
      quotes: bbRoamQuotes[name],
      make: () => {
        const el = document.createElement("div");
        heisenbergPenguin(el);
        return el;
      },
      look: "bb-cameo",
      bubbleLook: "bb-cameo-bubble",
      faceY: 0.38,
      appearances: [
        { side: "right", bottom: "16%", delay: 1200 },
        { side: "left", bottom: "38%", delay: 8500 },
        { side: "right", bottom: "26%", delay: 16000 },
        { side: "left", bottom: "20%", delay: 23500 },
      ],
    });
  }

  function playSayMyName(end) {
    const overlay = document.getElementById("bb-overlay");
    const cv = document.getElementById("bb-canvas");
    const ctx = cv.getContext("2d");
    const walt = document.getElementById("bb-walt");
    const sub = document.getElementById("bb-sub");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    let raf = 0;
    let done = false;

    // ── the desert: painted once per resize, animated bits on top
    let W = 0, H = 0, bg = null;
    function paintDesert() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bg = document.createElement("canvas");
      bg.width = W * dpr;
      bg.height = H * dpr;
      const g = bg.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const hz = H * 0.62;
      const sky = g.createLinearGradient(0, 0, 0, hz);
      sky.addColorStop(0, "#c98a2e");
      sky.addColorStop(0.6, "#e8bb5f");
      sky.addColorStop(1, "#f6dd96");
      g.fillStyle = sky;
      g.fillRect(0, 0, W, hz);
      const sun = g.createRadialGradient(W * 0.78, H * 0.2, 0, W * 0.78, H * 0.2, H * 0.35);
      sun.addColorStop(0, "rgba(255, 252, 230, 1)");
      sun.addColorStop(0.12, "rgba(255, 244, 200, 0.9)");
      sun.addColorStop(0.4, "rgba(255, 230, 150, 0.25)");
      sun.addColorStop(1, "rgba(255, 230, 150, 0)");
      g.fillStyle = sun;
      g.fillRect(0, 0, W, hz);
      // two ranges of flat-topped mesas
      const mesas = (base, color, peaks) => {
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(0, hz);
        for (const [x0, x1, h] of peaks) {
          g.lineTo(W * x0, hz);
          g.lineTo(W * (x0 + 0.03), hz - H * h);
          g.lineTo(W * (x1 - 0.03), hz - H * h);
          g.lineTo(W * x1, hz);
        }
        g.lineTo(W, hz);
        g.closePath();
        g.fill();
      };
      mesas(hz, "#c48a4a", [[0.02, 0.2, 0.09], [0.32, 0.5, 0.06], [0.62, 0.95, 0.11]]);
      mesas(hz, "#a86a33", [[-0.05, 0.12, 0.05], [0.18, 0.3, 0.035], [0.8, 1.08, 0.06]]);
      const ground = g.createLinearGradient(0, hz, 0, H);
      ground.addColorStop(0, "#d6a25a");
      ground.addColorStop(1, "#8f5e28");
      g.fillStyle = ground;
      g.fillRect(0, hz, W, H - hz);
      // scrub
      g.fillStyle = "rgba(92, 70, 30, 0.55)";
      for (let i = 0; i < 40; i++) {
        const y = hz + Math.random() * (H - hz);
        const s = (3 + Math.random() * 10) * (0.4 + (y - hz) / (H - hz));
        g.beginPath();
        g.ellipse(Math.random() * W, y, s * 1.6, s * 0.6, 0, 0, Math.PI * 2);
        g.fill();
      }
      // the RV, parked on the horizon
      const u = Math.max(0.6, Math.min(W, H) / 900);
      const rx = W * 0.14, ry = hz + 6 * u;
      g.fillStyle = "rgba(60, 40, 15, 0.35)";
      g.fillRect(rx - 4 * u, ry - 2 * u, 112 * u, 6 * u);
      g.fillStyle = "#efe6cf";
      g.fillRect(rx, ry - 44 * u, 96 * u, 40 * u);
      g.fillRect(rx + 84 * u, ry - 30 * u, 22 * u, 26 * u);
      g.fillStyle = "#8a6a3a";
      g.fillRect(rx, ry - 22 * u, 96 * u, 5 * u);
      g.fillStyle = "#3b3226";
      g.fillRect(rx + 10 * u, ry - 38 * u, 14 * u, 10 * u);
      g.fillRect(rx + 34 * u, ry - 38 * u, 14 * u, 10 * u);
      g.fillRect(rx + 90 * u, ry - 27 * u, 12 * u, 9 * u);
      g.beginPath();
      g.arc(rx + 20 * u, ry - 4 * u, 6 * u, 0, Math.PI * 2);
      g.arc(rx + 78 * u, ry - 4 * u, 6 * u, 0, Math.PI * 2);
      g.fill();
    }
    paintDesert();
    window.addEventListener("resize", paintDesert);

    const dust = Array.from({ length: 70 }, () => ({
      x: Math.random(), y: Math.random(), v: 0.0004 + Math.random() * 0.001, r: 0.6 + Math.random() * 1.6,
    }));
    const weed = Array.from({ length: 26 }, () => ({
      a: Math.random() * Math.PI * 2, r: 0.4 + Math.random() * 0.6, span: 1 + Math.random() * 2,
    }));
    const t0 = performance.now();
    function frame(now) {
      const t = now - t0;
      ctx.drawImage(bg, 0, 0, W, H);
      // drifting dust
      ctx.fillStyle = "rgba(255, 240, 200, 0.5)";
      for (const d of dust) {
        if (!still) d.x = (d.x + d.v) % 1;
        ctx.fillRect(d.x * W, d.y * H, d.r, d.r);
      }
      // a tumbleweed rolls through, bouncing
      if (!still && t > 1200 && t < 9200) {
        const k = (t - 1200) / 8000;
        const R = Math.max(14, Math.min(W, H) * 0.035);
        const x = -R + k * (W + 2 * R);
        const y = H * 0.8 - Math.abs(Math.sin(k * Math.PI * 5)) * R * 1.6;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(k * 40);
        ctx.strokeStyle = "#7a5626";
        ctx.lineWidth = 1.4;
        for (const w of weed) {
          ctx.beginPath();
          ctx.arc(0, 0, R * w.r, w.a, w.a + w.span);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (!done) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function say(text, other) {
      sub.classList.remove("show");
      later(180, () => {
        sub.textContent = text;
        sub.classList.toggle("other", !!other);
        sub.classList.add("show");
      });
    }

    // roam: which name was said ("heisenberg" / "walter"), or null on Esc
    function finish(roam = null) {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      clearInterval(creepTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", paintDesert);
      window.removeEventListener("resize", applyCreep);
      document.removeEventListener("keydown", onEsc, true);
      document.removeEventListener("keydown", onType, true);
      overlay.classList.remove("active");
      overlay.setAttribute("aria-hidden", "true");
      setTimeout(() => {
        walt.className = "bb-walt";
        walt.style.transform = "";
        walt.style.transition = "";
        walt.innerHTML = "";
        sub.className = "bb-sub";
        sub.textContent = "";
        overlay.classList.remove("tense", "thud");
        overlay.style.removeProperty("--k");
        end();
        if (roam) heisenbergCameos(roam);
      }, 900);
    }
    const onEsc = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      finish();
    };
    document.addEventListener("keydown", onEsc, true);

    // ── he creeps closer the longer you stall, until his eyes fill the
    // screen. creepK runs 0 → 1; the zoom is centred on his eyes.
    let creepK = 0;
    let creepTimer = 0;
    function applyCreep() {
      const P = walt.offsetWidth;
      // he stops once his face fills the frame: glasses (30% of the
      // sprite) at most 45% of the screen, and never past 2.8x
      const sMax = Math.max(1, Math.min(2.8, (0.45 * W) / (0.3 * P)));
      const s = 1 + (sMax - 1) * Math.pow(creepK, 1.4);
      // like someone walking up to the camera: his eyes settle just
      // above the horizon and his feet drop out of frame
      const eyeY = walt.offsetTop + 0.37 * P;
      const ty = (H * 0.52 - eyeY) * Math.min(1, creepK * 1.6);
      walt.style.transform = `translateX(-50%) translateY(${ty}px) scale(${s})`;
      overlay.style.setProperty("--k", creepK);
      overlay.classList.toggle("tense", creepK > 0.45);
    }
    function creep(dk, cap = 0.85) {
      const k = Math.min(cap, creepK + dk);
      if (k === creepK) return; // he's as close as he gets
      creepK = k;
      walt.classList.add("creep");
      // restart the footstep bob and the thud as he lands
      walt.classList.remove("step");
      overlay.classList.remove("thud");
      void walt.offsetWidth;
      walt.classList.add("step");
      later(450, () => overlay.classList.add("thud"));
      applyCreep();
    }
    window.addEventListener("resize", applyCreep);

    // ── the name, then the payoff
    let wrong = 0;
    let answered = false;
    function payoff() {
      if (answered) return;
      answered = true;
      clearInterval(creepTimer);
      asking = false;
      say("Heisenberg", true);
      later(1700, () => {
        creep(1, 1);
        say("You're goddamn right");
      });
      later(5200, () => sub.classList.remove("show"));
      later(5600, () => finish("heisenberg"));
    }
    // the other name. He wasn't ready for that one.
    function caught(v) {
      answered = true;
      clearInterval(creepTimer);
      asking = false;
      say(/white/.test(v) ? "Walter White" : "Walter", true);
      later(900, () => {
        // he jerks back, sweating
        creepK = 0.12;
        walt.style.transition = "transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2)";
        applyCreep();
        overlay.classList.remove("tense");
        walt.classList.add("shocked");
        say("...!");
      });
      later(2000, () => say("Oh god. How did you know that?"));
      later(3800, () => {
        walt.classList.remove("shocked");
        walt.classList.add("shy");
        say("I... I have to go. The RV is double-parked");
      });
      later(5600, () => {
        walt.classList.remove("shy");
        walt.classList.add("flee");
      });
      later(7500, () => say("He'll deny this ever happened", true));
      later(9900, () => finish("walter"));
    }

    // deep cuts only; they cycle from the second miss on
    const hints = [
      "Hint: not the W.W. in Gale's notebook",
      "Hint: Werner. Not Ziegler",
      "Hint: Tuco learned it in his office. Krazy-8 never got the chance",
      "Hint: Nobel Prize in Physics, 1932. Famously unsure where things are",
    ];
    // no text box: the visitor just types, and it shows as their subtitle
    let asking = false;
    let typed = "";
    function showTyped() {
      sub.textContent = typed;
      sub.classList.add("show", "other", "typing");
      sub.classList.remove("wrong");
    }
    const onType = (e) => {
      if (!asking || e.ctrlKey || e.metaKey || e.altKey || e.key === "Escape") return;
      if (e.key === "Enter") return void (e.preventDefault(), e.stopPropagation(), submit());
      if (e.key === "Backspace") typed = typed.slice(0, -1);
      else if (e.key.length === 1 && typed.length < 24) typed += e.key;
      else return;
      e.preventDefault();
      e.stopPropagation();
      showTyped();
      // the two names that matter land without needing Enter
      if (/heis[ea]nb[ue]rg|walter|white/.test(typed.toLowerCase())) submit();
    };
    document.addEventListener("keydown", onType, true);
    function submit() {
      const v = typed.trim().toLowerCase();
      typed = "";
      sub.classList.remove("typing");
      if (!v) return;
      if (/heis[ea]nb[ue]rg/.test(v)) return payoff();
      if (/\bwalt(er)?\b|white/.test(v)) return caught(v);
      wrong++;
      sub.classList.add("wrong");
      if (/dhruv|desai/.test(v)) say("That's the name on the résumé");
      else say("Wrong. Say. My. Name");
      creep(0.15);
      // the hint waits if they've already started typing again
      if (wrong >= 2) later(1700, () => { if (!typed) say(hints[(wrong - 2) % hints.length]); });
    }

    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("active");
    heisenbergPenguin(walt);
    later(700, () => walt.classList.add("enter"));
    later(3200, () => say("You all know exactly who I am"));
    later(6000, () => say("Say my name"));
    later(7600, () => {
      asking = true;
      creepTimer = setInterval(() => creep(0.1), 3200);
    });
  }

  Scenes.register({
    word: "saymyname",
    markup: MARKUP,
    css: "/scenes/say-my-name/scene.css",
    play: playSayMyName,
  });
})();
