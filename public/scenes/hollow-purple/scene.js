(() => {
  // ─── HOLLOW PURPLE (Gojo Satoru) ───
  // Type "nahidwin". Everything is drawn on one canvas: Blue pulls, Red
  // pushes, they collide into Purple, and Purple erases a strip of the page.

  const MARKUP = `<div class="hp-overlay" id="hp-overlay">
      <canvas class="hp-canvas" id="hp-canvas"></canvas>
      <div class="hp-card" id="hp-card">
        <div class="hp-card-cap" id="hp-card-cap"></div>
      </div>
      <img src="/penguin-gojo-400.png" alt="Gojo Penguin" class="hp-gojo" id="hp-gojo" />
      <div class="hp-thought" id="hp-thought">
        <div class="hp-thought-main">Nah, I'd Win.</div>
        <div class="hp-thought-sub">Hollow Purple</div>
      </div>
    </div>`;

  const HP_TL = {
    dark: 0, gojo: 700, blue: 1300, red: 3200, converge: 6000,
    merge: 8800, explode: 8800, retreat: 9900, fire: 10800, exit: 13400,
    open: 13500, panel: 13500, heal: 17200, end: 18700,
  };
  const HP_BLUE = ["#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"];
  const HP_RED = ["#b91c1c", "#ef4444", "#f87171", "#fca5a5", "#fee2e2"];
  const HP_PURPLE = ["#6d28d9", "#9333ea", "#a855f7", "#c084fc", "#e9d5ff", "#f5d0fe"];

  const hpClamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const hpSmooth = (a, b, t) => { const x = hpClamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
  const hpPick = (arr) => arr[(Math.random() * arr.length) | 0];

  const hpGlowCache = {};
  function hpGlow(color) {
    if (hpGlowCache[color]) return hpGlowCache[color];
    const s = document.createElement("canvas");
    s.width = s.height = 64;
    const g = s.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,0.95)");
    gr.addColorStop(0.18, color);
    gr.addColorStop(0.5, color + "55");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return (hpGlowCache[color] = s);
  }

  const hpTintCache = {};
  function hpTint(color) {
    if (hpTintCache[color]) return hpTintCache[color];
    const s = document.createElement("canvas");
    s.width = s.height = 64;
    const g = s.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color + "e6");
    gr.addColorStop(0.5, color + "66");
    gr.addColorStop(1, color + "00");
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    return (hpTintCache[color] = s);
  }

  function hpCard(cap, glow, xPct) {
    const card = document.getElementById("hp-card");
    card.classList.remove("show");
    if (!cap) return;
    document.getElementById("hp-card-cap").textContent = cap;
    card.style.setProperty("--hp-glow", glow);
    card.style.left = xPct + "%";
    requestAnimationFrame(() => card.classList.add("show"));
  }

  function gojoCameos() {
    Scenes.cameos({
      quotes: [
        "Throughout heaven and earth, I alone am the honored penguin",
        "You are weak",
        "Nah, I'd deploy",
        "Domain Expansion: Infinite Loop",
      ],
      make: () => {
        const img = document.createElement("img");
        img.src = "/penguin-gojo-400.png";
        img.alt = "";
        return img;
      },
      look: "hp-cameo",
      bubbleLook: "hp-cameo-bubble",
    });
  }

  function playHollowPurple(end) {
    const overlay = document.getElementById("hp-overlay");
    const gojo = document.getElementById("hp-gojo");
    const thought = document.getElementById("hp-thought");
    const app = document.getElementById("app");
    const cv = document.getElementById("hp-canvas");
    const ctx = cv.getContext("2d");

    let W = 0, H = 0;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    overlay.style.transition = "opacity 0.6s ease";
    overlay.style.background = "rgba(1, 0, 4, 0.985)";
    overlay.classList.add("active");
    const later = (ms, fn) => setTimeout(fn, ms);
    later(HP_TL.gojo, () => gojo.classList.add("enter"));

    function finish() {
      window.removeEventListener("resize", resize);
      overlay.classList.remove("active");
      later(700, () => {
        ctx.clearRect(0, 0, W, H);
        overlay.style.background = "";
        overlay.style.transition = "";
        overlay.style.transform = "";
        gojo.classList.remove("enter", "power", "ascend", "speak");
        thought.classList.remove("show");
        hpCard(null);
        end();
        gojoCameos();
      });
    }

    // The visitor typed the secret word, so the full attack always plays,
    // even when the OS asks for reduced motion.

    const scale = Math.min(W, H) / 900;
    const parts = [];
    const rings = [];
    const stars = Array.from({ length: 900 }, () => ({
      x: Math.random(), y: Math.random() * 2 - 1, r: Math.random() * 1.4 + 0.3, tw: Math.random() * 6,
    }));
    let flash = 0;
    // ── Purple's route: a jagged, electrified zig-zag that sweeps across
    // the panel row by row, so the cut itself uncovers Gojo
    const voidCv = document.createElement("canvas");
    voidCv.width = W;
    voidCv.height = H;
    const vctx = voidCv.getContext("2d");
    // rims + void are flattened here first, so fading them out is clean
    const dmgCv = document.createElement("canvas");
    dmgCv.width = W;
    dmgCv.height = H;
    const dctx = dmgCv.getContext("2d");
    const cy0 = H * 0.42;
    const manga = new Image();
    manga.src = "/img/hp/nah-id-win.jpg";
    const mangaH = H * 0.94;
    const mangaW = mangaH * (639 / 744);
    const mangaX = (W - mangaW) / 2;
    const mangaY = (H - mangaH) / 2;
    const ROWS = 5;
    const rowH = mangaH / ROWS;

    // midpoint displacement: a straight segment becomes a lightning bolt
    function bolt(a, b, rough, depth, out) {
      if (depth === 0) { out.push(b); return; }
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const off = (Math.random() - 0.5) * 2 * rough * len;
      const mid = { x: (a.x + b.x) / 2 - (dy / len) * off, y: (a.y + b.y) / 2 + (dx / len) * off };
      bolt(a, mid, rough, depth - 1, out);
      bolt(mid, b, rough, depth - 1, out);
    }
    const trail = [{ x: W * 0.1, y: cy0 }];
    (function buildTrail() {
      const pad = 30 * scale;
      const way = [];
      const jit = (k) => (Math.random() - 0.5) * 2 * k;
      for (let r = 0; r < ROWS; r++) {
        const y = mangaY + rowH * (r + 0.5);
        const tilt = jit(rowH * 0.22);
        const L = { x: mangaX - pad - Math.random() * 70 * scale, y: y - tilt + jit(rowH * 0.12) };
        const R = { x: mangaX + mangaW + pad + Math.random() * 70 * scale, y: y + tilt + jit(rowH * 0.12) };
        const m1 = { x: mangaX + mangaW * (0.3 + jit(0.08)), y: y + jit(rowH * 0.28) };
        const m2 = { x: mangaX + mangaW * (0.66 + jit(0.08)), y: y + jit(rowH * 0.28) };
        way.push(...(r % 2 ? [R, m2, m1, L] : [L, m1, m2, R]));
      }
      way.push({ x: W * 1.1 + 200 * scale, y: mangaY + mangaH * (0.3 + Math.random() * 0.4) });
      let prev = trail[0];
      for (const w of way) {
        bolt(prev, w, 0.09, 3, trail);
        prev = w;
      }
    })();
    // a torn, angular edge: every vertex pushed in or out by its own amount
    const edgeL = trail.map(() => 0.7 + Math.random() * 0.6);
    const edgeR = trail.map(() => 0.7 + Math.random() * 0.6);
    const nrm = trail.map((_, i) => {
      const a = trail[Math.max(0, i - 1)], b = trail[Math.min(trail.length - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    });
    const trailLen = [0];
    for (let i = 1; i < trail.length; i++) {
      trailLen.push(trailLen[i - 1] + Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y));
    }
    let trailIdx = 0;

    // collateral damage: forked cracks and punched-out holes
    const cracks = [];
    const shards = [];
    let lastCrack = 0, lastShard = 0;
    function addCrack(x, y) {
      const pts = [{ x, y }];
      let a = Math.random() * Math.PI * 2;
      const n = 5 + ((Math.random() * 7) | 0);
      for (let i = 0; i < n; i++) {
        a += (Math.random() - 0.5) * 1.2;
        const step = (18 + Math.random() * 30) * scale;
        const last = pts[pts.length - 1];
        pts.push({ x: last.x + Math.cos(a) * step, y: last.y + Math.sin(a) * step });
      }
      cracks.push({ pts, w: (4 + Math.random() * 9) * scale });
    }
    function addShard(x, y) {
      const n = 6 + ((Math.random() * 4) | 0), r = (14 + Math.random() * 40) * scale;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const rr = r * (0.45 + Math.random() * 0.75);
        pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
      }
      shards.push({ pts, x, y });
    }
    // fill the carved route as a chain of quads; neighbours share an edge,
    // so there are no gaps, and each quad is filled on its own so
    // overlapping sweeps never cancel out
    const fillTrail = (c, half, grow) => {
      const edge = (i, side) => {
        const k = side > 0 ? edgeL[i] : edgeR[i];
        const d = side * (half * k + grow);
        return [trail[i].x + nrm[i].x * d, trail[i].y + nrm[i].y * d];
      };
      c.strokeStyle = c.fillStyle;
      c.lineWidth = 1.5;
      for (let i = 0; i < trailIdx; i++) {
        const a = edge(i, 1), b = edge(i + 1, 1), cc = edge(i + 1, -1), d = edge(i, -1);
        c.beginPath();
        c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]);
        c.closePath();
        c.fill();
        c.stroke();
      }
    };
    const tracePoly = (c, pts, close) => {
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
      if (close) c.closePath();
    };
    let healK = 1;
    // Hollow Purple is a vortex of particles: positions are in orb units,
    // inner particles spin faster and glow paler
    const vortex = Array.from({ length: 900 }, () => {
      const rho = Math.sqrt(Math.random());
      return {
        th: Math.random() * Math.PI * 2, rho,
        w: 0.006 + 0.03 * (1 - rho) + Math.random() * 0.006,
        s: 0.9 + Math.random() * 1.7, tw: Math.random() * 6,
      };
    });
    // debris whipped around inside it
    const debris = Array.from({ length: 28 }, () => {
      const n = 4 + ((Math.random() * 3) | 0);
      const pts = Array.from({ length: n }, (_, i) => ({
        a: (i / n) * Math.PI * 2 + Math.random() * 0.5, d: 0.5 + Math.random() * 0.6,
      }));
      return {
        th: Math.random() * Math.PI * 2, rho: 0.3 + Math.random() * 1.0,
        w: 0.01 + Math.random() * 0.02, spin: (Math.random() - 0.5) * 0.15, rot: Math.random() * 6,
        size: 0.035 + Math.random() * 0.06, pts,
        color: Math.random() < 0.3 ? "#9a3412" : Math.random() < 0.5 ? "#2e1065" : "#1e0b36",
      };
    });
    let prevSphere = null;
    let lastRedBurst = 0;
    let sphere = null;
    let bandHalf = 0;
    const t0 = performance.now();
    let last = t0;

    function spawn(x, y, vx, vy, color, size, life) {
      if (parts.length > 2600) return;
      parts.push({ x, y, vx, vy, color, size, life, max: life, pull: null });
    }

    later(HP_TL.converge, () => gojo.classList.add("power"));
    later(HP_TL.merge, () => gojo.classList.remove("enter", "power", "ascend"));
    // penguin Gojo ducks out; the real one gets the line

    new Image().src = "/img/hp/nah-id-win.jpg";

    later(HP_TL.end, finish);

    function frame(now) {
      const t = now - t0;
      const dt = Math.min(3, (now - last) / 16.67);
      last = now;
      if (t > HP_TL.end + 200) return;

      const cx = W / 2;
      const cy = H * 0.42;
      const sBlue = hpSmooth(HP_TL.blue, HP_TL.blue + 1300, t) * (t < HP_TL.merge ? 1 : 0);
      const sRed = hpSmooth(HP_TL.red, HP_TL.red + 900, t) * (t < HP_TL.merge ? 1 : 0);

      // orb positions: home spots, then a tightening spiral into the centre
      const c = hpClamp((t - HP_TL.converge) / (HP_TL.merge - HP_TL.converge));
      const spin = 11 * c * c;
      const R = W * 0.23 * (1 - Math.pow(c, 1.5));
      const blue = { x: cx + R * Math.cos(Math.PI + spin), y: cy + R * 0.5 * Math.sin(Math.PI + spin) };
      const red = { x: cx + R * Math.cos(spin), y: cy + R * 0.5 * Math.sin(spin) };

      // ── overlay tone: dark while charging, gone once Purple fires
      if (t >= HP_TL.fire - 120) overlay.style.background = "rgba(1, 0, 4, 0)";
      else if (t >= HP_TL.merge && t < HP_TL.explode + 150) overlay.style.background = "rgba(0, 0, 2, 0.995)";
      else if (t >= HP_TL.converge) overlay.style.background = `rgba(${1 + 5 * c | 0}, 0, ${4 + 12 * c | 0}, 0.985)`;

      // ── shake: rising through the convergence, a kick on merge and fire
      let shake = 0;
      if (t > HP_TL.merge - 1300 && t < HP_TL.merge) shake = 7 * hpSmooth(HP_TL.merge - 1300, HP_TL.merge, t);
      if (t >= HP_TL.merge && t < HP_TL.explode) shake = 3 + 9 * hpSmooth(HP_TL.merge, HP_TL.explode, t);
      if (t >= HP_TL.explode && t < HP_TL.explode + 650) shake = 16 * (1 - (t - HP_TL.explode) / 650);
      if (t >= HP_TL.fire && t < HP_TL.exit) shake = 9;
      const sx = (Math.random() - 0.5) * shake * scale;
      const sy = (Math.random() - 0.5) * shake * scale;
      overlay.style.transform = shake ? `translate(${sx}px, ${sy}px)` : "";
      app.style.transform = t >= HP_TL.fire && t < HP_TL.exit ? `translate(${sx}px, ${sy}px)` : "";

      // ── Blue: particles spiral inward
      if (sBlue > 0) {
        for (let i = 0; i < 14 * sBlue * dt; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = (140 + Math.random() * 280) * scale;
          const p = { x: blue.x + Math.cos(a) * d, y: blue.y + Math.sin(a) * d };
          spawn(p.x, p.y, -Math.sin(a) * 2.2, Math.cos(a) * 2.2, hpPick(HP_BLUE), 1.5 + Math.random() * 3.5, 140);
          parts[parts.length - 1].pull = "blue";
        }
      }
      // ── Red: steady spray plus periodic bursts outward
      if (sRed > 0) {
        for (let i = 0; i < 7 * sRed * dt; i++) {
          const a = Math.random() * Math.PI * 2, v = (2.5 + Math.random() * 6) * scale;
          spawn(red.x, red.y, Math.cos(a) * v, Math.sin(a) * v, hpPick(HP_RED), 1.5 + Math.random() * 3, 60 + Math.random() * 30);
        }
        if (t - lastRedBurst > 700) {
          lastRedBurst = t;
          for (let i = 0; i < 90 * sRed; i++) {
            const a = Math.random() * Math.PI * 2, v = (7 + Math.random() * 11) * scale;
            spawn(red.x, red.y, Math.cos(a) * v, Math.sin(a) * v, hpPick(HP_RED), 2 + Math.random() * 3, 45);
          }
          rings.push({ x: red.x, y: red.y, r: 20 * scale, v: 9 * scale, a: 0.5, color: "#f87171" });
        }
      }

      // ── COLLISION: Blue and Red crush into a single compressed point
      if (t >= HP_TL.merge && !sphere) {
        sphere = { x: cx, y: cy, r: 0, exploded: false };
        flash = 0.12;
        for (const p of parts) { p.pull = "sphere"; p.life = Math.max(p.life, 60); p.max = Math.max(p.max, p.life); }
      }
      // compression: everything is dragged into the point, rings collapse inward
      if (sphere && !sphere.exploded && t < HP_TL.explode) {
        const k = hpSmooth(HP_TL.merge, HP_TL.explode, t);
        for (let i = 0; i < (4 + 10 * k) * dt; i++) {
          const a = Math.random() * Math.PI * 2, d = Math.max(W, H) * (0.45 + Math.random() * 0.3);
          spawn(cx + Math.cos(a) * d, cy + Math.sin(a) * d, -Math.sin(a) * 3 * scale, Math.cos(a) * 3 * scale, hpPick(HP_PURPLE.concat(HP_BLUE[2], HP_RED[2])), 1.5 + Math.random() * 3, 160);
          parts[parts.length - 1].pull = "sphere";
        }
        if (t - (sphere.lastRing || 0) > 240) {
          sphere.lastRing = t;
          rings.push({ x: cx, y: cy, r: Math.max(W, H) * 0.6, v: -(16 + 10 * k) * scale, a: 0.35 + 0.3 * k, color: hpPick(["#a855f7", "#c084fc", "#e9d5ff"]) });
        }
      }
      // ── DETONATION: the point explodes into Hollow Purple
      if (sphere && !sphere.exploded && t >= HP_TL.explode) {
        sphere.exploded = true;
        flash = 0.4;
        for (let i = 0; i < 560; i++) {
          const a = Math.random() * Math.PI * 2, v = (5 + Math.random() * 22) * scale;
          spawn(cx, cy, Math.cos(a) * v, Math.sin(a) * v, hpPick(HP_PURPLE), 2 + Math.random() * 4, 50 + Math.random() * 40);
        }
        for (const p of parts) if (p.pull === "sphere") { p.pull = null; const a = Math.atan2(p.y - cy, p.x - cx); p.vx = Math.cos(a) * 14 * scale; p.vy = Math.sin(a) * 14 * scale; }
        for (let i = 0; i < 6; i++) {
          rings.push({ x: cx, y: cy, r: (10 + i * 25) * scale, v: (16 + i * 3) * scale, a: 0.75, color: hpPick(["#a855f7", "#60a5fa", "#ef4444", "#e9d5ff"]) });
        }
      }

      // ── Purple sphere: grows, pulls back, then fires across the page
      if (sphere) {
        const rMax = Math.min(W, H) * 0.11;
        if (!sphere.exploded) {
          sphere.r = rMax * 0.07 * (1 + 0.3 * Math.sin(t / 25));
        } else {
          const g = hpSmooth(HP_TL.explode, HP_TL.explode + 380, t);
          sphere.r = rMax * (0.07 + 0.93 * g) * (1 + 0.2 * Math.sin(Math.PI * g));
        }
        if (t >= HP_TL.retreat && t < HP_TL.fire) {
          const k = hpSmooth(HP_TL.retreat, HP_TL.fire, t);
          sphere.x = cx + (W * 0.1 - cx) * k;
          sphere.r *= 1 - 0.18 * k;
        } else if (t >= HP_TL.fire) {
          const k = hpClamp((t - HP_TL.fire) / (HP_TL.exit - HP_TL.fire));
          const e = k * k * (3 - 2 * k);
          const target = e * trailLen[trailLen.length - 1];
          while (trailIdx < trail.length - 1 && trailLen[trailIdx + 1] <= target) trailIdx++;
          sphere.x = trail[trailIdx].x;
          sphere.y = trail[trailIdx].y;
          sphere.r = rMax * 0.82;
          bandHalf = rowH * 0.82;
          if (k < 1 && t - lastCrack > 90) {
            lastCrack = t;
            addCrack(sphere.x, sphere.y);
          }
          if (k < 1 && t - lastShard > 160) {
            lastShard = t;
            addShard(Math.random() * W, Math.random() * H);
          }
          // debris thrown off the carved edges
          if (k < 1) {
            for (let i = 0; i < 7 * dt; i++) {
              const a = Math.random() * Math.PI * 2;
              spawn(sphere.x + Math.cos(a) * bandHalf, sphere.y + Math.sin(a) * bandHalf, Math.cos(a) * (1 + Math.random() * 3), Math.sin(a) * (1 + Math.random() * 3), hpPick(HP_PURPLE), 1.5 + Math.random() * 2.5, 50);
            }
          }
        }
        // charge swirl around the sphere until it leaves
        if (t < HP_TL.exit) {
          for (let i = 0; i < 6 * dt; i++) {
            const a = Math.random() * Math.PI * 2, d = sphere.r * (1.5 + Math.random() * 0.9);
            spawn(sphere.x + Math.cos(a) * d, sphere.y + Math.sin(a) * d, -Math.sin(a) * 4 * scale, Math.cos(a) * 4 * scale, hpPick(HP_PURPLE), 1.5 + Math.random() * 2.5, 36);
            parts[parts.length - 1].pull = "sphere";
          }
        }
      }
      // everything carved seals back up at the end
      healK = t >= HP_TL.heal ? 1 - hpSmooth(HP_TL.heal, HP_TL.heal + 1100, t) : 1;

      // ── draw ──────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      // what Purple destroyed: the route, forked cracks, punched-out holes
      if (sphere && trailIdx > 0 && healK > 0.01) {
        const shrink = 0.6 + 0.4 * healK;
        const half = bandHalf * shrink;
        const flick = 0.75 + Math.random() * 0.25;
        dctx.clearRect(0, 0, W, H);
        const drawCuts = (c, extra, fill) => {
          c.lineCap = "butt";
          c.lineJoin = "miter";
          fillTrail(c, half, extra / 2);
          for (const cr of cracks) {
            c.lineWidth = cr.w * shrink + extra;
            tracePoly(c, cr.pts, false); c.stroke();
          }
          for (const sh of shards) {
            c.save();
            c.translate(sh.x, sh.y);
            c.scale(shrink, shrink);
            c.translate(-sh.x, -sh.y);
            tracePoly(c, sh.pts, true);
            if (fill) c.fill();
            if (extra) { c.lineWidth = extra; c.stroke(); }
            c.restore();
          }
        };
        // electric rim
        dctx.strokeStyle = `rgba(139, 92, 246, ${0.25 * flick})`;
        dctx.fillStyle = dctx.strokeStyle;
        drawCuts(dctx, 30, true);
        dctx.strokeStyle = `rgba(221, 214, 254, ${0.95 * flick})`;
        dctx.fillStyle = dctx.strokeStyle;
        drawCuts(dctx, 6, true);
        // the hole itself
        vctx.globalCompositeOperation = "source-over";
        vctx.clearRect(0, 0, W, H);
        vctx.strokeStyle = vctx.fillStyle = "#020008";
        drawCuts(vctx, 0, true);
        vctx.globalCompositeOperation = "source-atop";
        vctx.fillStyle = "#e9d5ff";
        for (const s of stars) {
          vctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.tw + t / 400));
          vctx.fillRect(s.x * W, (s.y * 0.5 + 0.5) * H, s.r, s.r);
        }
        vctx.globalAlpha = 1;
        if (manga.complete && manga.naturalWidth) {
          vctx.drawImage(manga, mangaX, mangaY, mangaW, mangaH);
          vctx.strokeStyle = "#0a0a0a";
          vctx.lineWidth = 5;
          vctx.strokeRect(mangaX, mangaY, mangaW, mangaH);
        }
        dctx.drawImage(voidCv, 0, 0);
        ctx.globalAlpha = healK;
        ctx.drawImage(dmgCv, 0, 0, W, H);
        ctx.globalAlpha = 1;

        // live lightning: around the sphere while it carves, then sporadic
        // sparks along the damage until it heals
        ctx.globalCompositeOperation = "lighter";
        const zap = (from, len, n) => {
          for (let b = 0; b < n; b++) {
            const a = Math.random() * Math.PI * 2;
            const to = { x: from.x + Math.cos(a) * len * (0.5 + Math.random()), y: from.y + Math.sin(a) * len * (0.5 + Math.random()) };
            const pts = [from];
            bolt(from, to, 0.25, 4, pts);
            ctx.strokeStyle = Math.random() < 0.5 ? "rgba(255, 255, 255, 0.85)" : "rgba(196, 181, 253, 0.85)";
            ctx.lineWidth = 1 + Math.random() * 1.8;
            tracePoly(ctx, pts, false); ctx.stroke();
          }
        };
        if (t < HP_TL.exit) zap({ x: sphere.x, y: sphere.y }, sphere.r * 2.4, 4);
        else if (healK > 0.9 && Math.random() < 0.35) {
          const src = Math.random() < 0.5 && cracks.length
            ? hpPick(cracks).pts[0]
            : trail[(Math.random() * trail.length) | 0];
          zap(src, 70 * scale, 2);
        }
        ctx.globalCompositeOperation = "source-over";
      }

      ctx.globalCompositeOperation = "lighter";

      // colour washes: Blue floods the left side, Red the right
      if (sBlue > 0 || sRed > 0) {
        const side = ctx.createLinearGradient(0, 0, W, 0);
        side.addColorStop(0, `rgba(29, 78, 216, ${0.3 * sBlue})`);
        side.addColorStop(0.45, `rgba(29, 78, 216, ${0.05 * sBlue})`);
        side.addColorStop(0.55, `rgba(185, 28, 28, ${0.05 * sRed})`);
        side.addColorStop(1, `rgba(185, 28, 28, ${0.3 * sRed})`);
        ctx.fillStyle = side;
        ctx.fillRect(0, 0, W, H);
        const nebula = (o, s, rgb) => {
          if (s <= 0) return;
          const R = Math.max(W, H) * 0.38;
          const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, R);
          g.addColorStop(0, `rgba(${rgb}, ${0.5 * s})`);
          g.addColorStop(0.25, `rgba(${rgb}, ${0.2 * s})`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = g;
          ctx.fillRect(o.x - R, o.y - R, R * 2, R * 2);
        };
        nebula(blue, sBlue, "37, 99, 235");
        nebula(red, sRed, "220, 38, 38");
      }

      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.pull) {
          const target = p.pull === "blue" ? blue : sphere;
          if (target) {
            const dx = target.x - p.x, dy = target.y - p.y;
            const d = Math.hypot(dx, dy) || 1;
            const f = (p.pull === "blue" ? 0.9 : 0.6) * scale;
            p.vx = p.vx * 0.94 + (dx / d) * f * dt;
            p.vy = p.vy * 0.94 + (dy / d) * f * dt;
            if (d < 8 * scale) p.life = 0;
          }
        } else {
          p.vx *= 0.985;
          p.vy *= 0.985;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        const k = p.life / p.max;
        const s = p.size * 4 * (0.4 + 0.6 * k) * scale;
        ctx.globalAlpha = Math.min(p.pull === "sphere" ? 0.6 : 0.8, k * 1.1);
        ctx.drawImage(hpGlow(p.color), p.x - s / 2, p.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      // orbs
      const orb = (o, strength, colors, pulse) => {
        if (strength <= 0) return;
        const r = (32 + pulse) * strength * scale;
        ctx.globalAlpha = 0.6;
        ctx.drawImage(hpGlow(colors[0]), o.x - r * 7, o.y - r * 7, r * 14, r * 14);
        ctx.globalAlpha = 0.85;
        ctx.drawImage(hpGlow(colors[1]), o.x - r * 4, o.y - r * 4, r * 8, r * 8);
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
        g.addColorStop(0, "#fff");
        g.addColorStop(0.45, colors[3]);
        g.addColorStop(1, colors[0] + "00");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = colors[2] + "99";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const a0 = t / (260 - i * 50) + i * 2;
          ctx.beginPath(); ctx.arc(o.x, o.y, r * (1.5 + i * 0.25), a0, a0 + 1.6); ctx.stroke();
        }
      };
      orb(blue, sBlue, HP_BLUE, 3 * Math.sin(t / 120));
      orb(red, sRed, HP_RED, 6 * Math.max(0, 1 - (t - lastRedBurst) / 220));

      // purple sphere: lit body, fused Blue/Red swirling inside, white-hot
      // core, flaring corona and crackling surface
      if (sphere && sphere.x < W + sphere.r * 6 && sphere.r > 0.5) {
        const r = sphere.r, x = sphere.x, y = sphere.y;

        // comet wake: a purple streak behind it while it flies
        if (prevSphere && t >= HP_TL.fire && t < HP_TL.exit) {
          const dx = x - prevSphere.x, dy = y - prevSphere.y, sp = Math.hypot(dx, dy);
          if (sp > 0.5) {
            const ux = dx / sp, uy = dy / sp, len = r * 4.5;
            const g = ctx.createLinearGradient(x, y, x - ux * len, y - uy * len);
            g.addColorStop(0, "rgba(216, 180, 254, 0.55)");
            g.addColorStop(0.4, "rgba(147, 51, 234, 0.25)");
            g.addColorStop(1, "rgba(88, 28, 135, 0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x - uy * r * 0.9, y + ux * r * 0.9);
            ctx.lineTo(x - ux * len, y - uy * len);
            ctx.lineTo(x + uy * r * 0.9, y - ux * r * 0.9);
            ctx.closePath();
            ctx.fill();
          }
        }
        prevSphere = { x, y };

        ctx.globalAlpha = 0.4;
        ctx.drawImage(hpGlow("#9333ea"), x - r * 4, y - r * 4, r * 8, r * 8);
        ctx.globalAlpha = 1;

        // a faint body so the particles have some mass behind them
        const haze = ctx.createRadialGradient(x, y, 0, x, y, r * 1.05);
        haze.addColorStop(0, "rgba(237, 233, 254, 0.55)");
        haze.addColorStop(0.5, "rgba(147, 51, 234, 0.28)");
        haze.addColorStop(1, "rgba(76, 29, 149, 0)");
        ctx.fillStyle = haze;
        ctx.beginPath(); ctx.arc(x, y, r * 1.05, 0, Math.PI * 2); ctx.fill();

        // the vortex: dense speckles, pale at the heart, violet at the edge
        const ps = Math.max(0.7, Math.sqrt(scale));
        for (const v of vortex) v.th += v.w * dt;
        const bands = [[0, 0.25, "#f5f3ff"], [0.25, 0.5, "#e9d5ff"], [0.5, 0.78, "#c084fc"], [0.78, 1.01, "#8b5cf6"]];
        // each speck is a short streak along its spin; faster ones streak longer
        ctx.lineCap = "round";
        for (const [lo, hi, color] of bands) {
          ctx.strokeStyle = color;
          for (const bright of [0, 1]) {
            ctx.globalAlpha = bright ? 0.9 : 0.5;
            ctx.lineWidth = (bright ? 1.6 : 1.1) * ps;
            ctx.beginPath();
            for (const v of vortex) {
              if (v.rho < lo || v.rho >= hi) continue;
              if ((Math.sin(t / 140 + v.tw) > 0) !== !!bright) continue;
              const tail = v.th - v.w * 4.5;
              ctx.moveTo(x + Math.cos(tail) * v.rho * r, y + Math.sin(tail) * v.rho * r * 0.96);
              ctx.lineTo(x + Math.cos(v.th) * v.rho * r, y + Math.sin(v.th) * v.rho * r * 0.96);
            }
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;

        // energetic heart: always pulsing, and flaring hard right after birth
        const age = t - HP_TL.explode;
        const birth = age >= 0 && age < 1000 ? 1 - age / 1000 : 0;
        const beat = 1 + 0.09 * Math.sin(t / 55);
        const hr = r * (0.55 + 0.7 * birth) * beat;
        ctx.globalAlpha = 0.45 + 0.4 * birth;
        ctx.drawImage(hpTint("#c4b5fd"), x - hr * 1.7, y - hr * 1.7, hr * 3.4, hr * 3.4);
        ctx.globalAlpha = 0.7 + 0.3 * birth;
        ctx.drawImage(hpTint("#ede9fe"), x - hr, y - hr, hr * 2, hr * 2);
        ctx.globalAlpha = 0.55 + 0.3 * birth;
        ctx.drawImage(hpTint("#faf5ff"), x - hr * 0.45, y - hr * 0.45, hr * 0.9, hr * 0.9);
        ctx.globalAlpha = 1;
        // rays bursting out of the centre as it is born
        if (birth > 0) {
          ctx.lineCap = "round";
          for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2 + Math.sin(i * 3.7) * 0.2 + age / 900;
            const len = r * (1.3 + 1.2 * birth * (0.6 + 0.4 * Math.sin(i * 5.1)));
            ctx.strokeStyle = `rgba(233, 213, 255, ${0.5 * birth})`;
            ctx.lineWidth = (1.5 + (i % 3)) * birth + 0.5;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
            ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
            ctx.stroke();
          }
        }

        // swirling rim: dark streaks with a few light ones, like the edge of a whirlpool
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.lineCap = "round";
        for (let i = 0; i < 14; i++) {
          const a0 = t / (300 + (i % 4) * 60) + i * 0.9;
          const rr = r * (0.9 + (i % 5) * 0.06);
          ctx.strokeStyle = `rgba(30, 10, 54, ${0.35 + (i % 3) * 0.12})`;
          ctx.lineWidth = r * (0.05 + (i % 3) * 0.025);
          ctx.beginPath(); ctx.arc(x, y, rr, a0, a0 + 0.6 + (i % 4) * 0.25); ctx.stroke();
        }
        ctx.restore();
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
          const a0 = t / (260 + i * 30) + i * 1.7;
          ctx.strokeStyle = "rgba(233, 213, 255, 0.45)";
          ctx.beginPath(); ctx.arc(x, y, r * (0.98 + i * 0.03), a0, a0 + 0.5); ctx.stroke();
        }

        // debris: jagged chunks tumbling round the vortex
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        for (const d of debris) {
          d.th += d.w * dt;
          d.rot += d.spin * dt;
          const px = x + Math.cos(d.th) * d.rho * r, py = y + Math.sin(d.th) * d.rho * r * 0.96;
          const sz = d.size * r;
          ctx.fillStyle = d.color;
          ctx.beginPath();
          d.pts.forEach((pt, i) => {
            const qx = px + Math.cos(pt.a + d.rot) * pt.d * sz, qy = py + Math.sin(pt.a + d.rot) * pt.d * sz;
            if (i === 0) ctx.moveTo(qx, qy); else ctx.lineTo(qx, qy);
          });
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // shockwave rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.r += g.v * dt;
        g.a -= (g.v < 0 ? 0.003 : 0.012) * dt;
        if (g.a <= 0 || g.r < 3) { rings.splice(i, 1); continue; }
        ctx.globalAlpha = g.a;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // flash on merge
      if (flash > 0) {
        ctx.fillStyle = `rgba(245, 230, 255, ${flash})`;
        ctx.fillRect(0, 0, W, H);
        flash = Math.max(0, flash - 0.03 * dt);
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  Scenes.register({
    word: "nahidwin",
    markup: MARKUP,
    preload: ["/penguin-gojo-400.png", "/img/hp/nah-id-win.jpg"],
    css: "/scenes/hollow-purple/scene.css",
    flashy: "Hollow Purple has flashing lights and screen shake.",
    play: playHollowPurple,
  });
})();
