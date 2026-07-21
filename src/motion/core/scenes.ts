/* eslint-disable */
// @ts-nocheck
/* ==========================================================================
 * Motion render core — VERBATIM scenes + helpers from the original Motion tool
 * (public/arabella/tools/motion/index.html). Preserved unchanged so recorded /
 * rendered output is identical. The React/Zustand layer feeds it via
 * syncState() and drives it with setCanvas()/applyRes()/start(). Do not refactor.
 * ======================================================================== */
const TAU = Math.PI * 2;
let W = 1920, H = 1080;
let canvas = null, ctx = null;

const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- color helpers ----------
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixHex(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;
}
// sample palette at position k in [0,1)
function colorAt(k) {
  const cols = state.palette.colors;
  k = ((k % 1) + 1) % 1;
  const f = k * cols.length;
  const i = Math.floor(f);
  return mixHex(cols[i % cols.length], cols[(i + 1) % cols.length], f - i);
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ---------- palettes ----------
const PALETTES = [
  { name: "Cyberpunk", colors: ["#00f0ff", "#ff2ee6", "#7b2eff", "#00ff9d"] },
  { name: "Sunset",    colors: ["#ff9a00", "#ff3c65", "#c724b1", "#5f0fff"] },
  { name: "Acid",      colors: ["#c8ff00", "#00ff9d", "#00e0ff", "#faff00"] },
  { name: "Inferno",   colors: ["#ffd000", "#ff6a00", "#ff1e00", "#ff0090"] },
  { name: "Ice",       colors: ["#ffffff", "#a0e8ff", "#3d9bff", "#7b6cff"] },
  { name: "Vapor",     colors: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff"] },
];

// ---------- state ----------
const state = {
  scene: "tunnel",
  palette: PALETTES[0],
  speed: 1,
  intensity: 1,
  text: "MOTION",
  showTitle: true,
};

// ---------- title overlay ----------
function drawTitle(t, opts = {}) {
  if (!state.showTitle || !state.text.trim()) return;
  const size = opts.size || Math.min(W, H) * 0.11;
  const y = opts.y !== undefined ? opts.y : H / 2;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", sans-serif`;
  const pulse = 1 + Math.sin(t * 2.2) * 0.012;
  ctx.translate(W / 2, y);
  ctx.scale(pulse, pulse);
  // glow layers
  ctx.shadowColor = state.palette.colors[0];
  ctx.shadowBlur = 40;
  ctx.fillStyle = "#fff";
  ctx.fillText(state.text, 0, 0);
  ctx.shadowColor = state.palette.colors[1];
  ctx.shadowBlur = 90;
  ctx.globalAlpha = 0.65;
  ctx.fillText(state.text, 0, 0);
  ctx.restore();
}

// fit font size so text fits within maxWidth
function fitFont(text, weightPx, maxWidth) {
  ctx.font = `900 ${weightPx}px "Arial Black", "Helvetica Neue", sans-serif`;
  const w = ctx.measureText(text).width;
  return w > maxWidth ? weightPx * (maxWidth / w) : weightPx;
}

// =====================================================================
// SCENES
// =====================================================================
const SCENES = {};

// ---------- 1. WARP TUNNEL ----------
SCENES.tunnel = {
  name: "Warp Tunnel", icon: "🌀", ownText: false,
  init() {},
  draw(t) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2 + Math.sin(t * 0.7) * W * 0.03;
    const cy = H / 2 + Math.cos(t * 0.9) * H * 0.03;
    const n = Math.round(26 * state.intensity) + 6;
    const maxR = Math.hypot(W, H) * 0.62;
    ctx.lineJoin = "round";
    for (let i = n - 1; i >= 0; i--) {
      const z = ((i / n + t * 0.22 * state.speed) % 1 + 1) % 1;
      const r = Math.pow(z, 2.4) * maxR;
      if (r < 2) continue;
      const sides = 6;
      const rot = t * 0.4 * state.speed + z * 4;
      ctx.beginPath();
      for (let s = 0; s <= sides; s++) {
        const a = (s / sides) * TAU + rot;
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r * 0.85;
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      const col = colorAt(z * 2 + t * 0.1);
      ctx.strokeStyle = col;
      ctx.lineWidth = lerp(1, 14, z) * state.intensity;
      ctx.globalAlpha = Math.pow(z, 0.6);
      ctx.shadowColor = col;
      ctx.shadowBlur = 25 * z;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // core glow
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.25);
    g.addColorStop(0, rgba(state.palette.colors[0], 0.5));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    drawTitle(t);
  },
};

// ---------- 2. PARTICLE NOVA ----------
SCENES.nova = {
  name: "Particle Nova", icon: "💥", ownText: false,
  parts: [], nextBurst: 0,
  init() { this.parts = []; this.nextBurst = 0; },
  burst(x, y, hueK) {
    const n = Math.round(140 * state.intensity);
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const sp = rand(1) ** 2 * Math.min(W, H) * 0.55;
      this.parts.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(1.6, 0.7), age: 0,
        k: hueK + rand(0.25),
        r: rand(5, 1.5) * state.intensity,
      });
    }
  },
  draw(t, dt) {
    // trails
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,5,0.22)";
    ctx.fillRect(0, 0, W, H);

    if (t > this.nextBurst) {
      this.nextBurst = t + rand(0.9, 0.45) / state.speed;
      this.burst(rand(W * 0.8, W * 0.1), rand(H * 0.75, H * 0.15), rand(1));
    }
    ctx.globalCompositeOperation = "lighter";
    const g = 320; // gravity
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt * state.speed;
      if (p.age > p.life) { this.parts.splice(i, 1); continue; }
      p.vy += g * dt * state.speed;
      p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx * dt * state.speed;
      p.y += p.vy * dt * state.speed;
      const fade = 1 - p.age / p.life;
      ctx.fillStyle = colorAt(p.k);
      ctx.globalAlpha = fade;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * fade + 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    drawTitle(t);
  },
};

// ---------- 3. KINETIC TYPE ----------
SCENES.kinetic = {
  name: "Kinetic Type", icon: "🔤", ownText: true,
  init() {},
  draw(t) {
    const words = state.text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) words.push("TYPE");
    const per = 0.55 / state.speed;
    const idx = Math.floor(t / per) % words.length;
    const prog = (t % per) / per;
    const word = words[idx].toUpperCase();

    // bg flash on word entry
    const flash = Math.max(0, 1 - prog * 5);
    const bgCol = state.palette.colors[idx % state.palette.colors.length];
    ctx.fillStyle = mixHex("#050508", bgCol, flash * 0.35);
    ctx.fillRect(0, 0, W, H);

    // diagonal stripes sweeping
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.35);
    const stripeW = H * 0.16;
    for (let i = -8; i < 8; i++) {
      const off = ((t * state.speed * 0.6 + i * 0.5) % 8) * stripeW;
      ctx.fillStyle = colorAt(i * 0.13);
      ctx.fillRect(-W, -H + off, W * 2, stripeW * 0.5);
    }
    ctx.restore();

    // word slam: scale 2.6 -> 1 with overshoot
    const e = 1 - Math.pow(1 - Math.min(prog * 3.2, 1), 3);
    const scale = lerp(2.6, 1, e) + Math.sin(Math.min(prog * 3.2, 1) * Math.PI) * -0.06;
    const shake = Math.max(0, 1 - prog * 4) * state.intensity;
    const sx = rand(shake * 22, -shake * 22);
    const sy = rand(shake * 22, -shake * 22);

    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.rotate(lerp(0.12, 0, e) * (idx % 2 ? 1 : -1));
    ctx.scale(scale, scale);
    const fs = fitFont(word, Math.min(W, H) * 0.24, W * 0.82);
    ctx.font = `900 ${fs}px "Arial Black", "Helvetica Neue", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // shadow copy
    ctx.fillStyle = rgba(bgCol, 0.85);
    ctx.fillText(word, 10 * state.intensity, 10 * state.intensity);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = bgCol;
    ctx.shadowBlur = 60 * flash + 15;
    ctx.fillText(word, 0, 0);
    ctx.restore();

    // progress ticks
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    const tw = W * 0.3, tx = W / 2 - tw / 2;
    for (let i = 0; i < words.length; i++) {
      ctx.globalAlpha = i === idx ? 1 : 0.25;
      ctx.fillRect(tx + (i / words.length) * tw, H * 0.92, tw / words.length - 6, 5);
    }
    ctx.globalAlpha = 1;
  },
};

// ---------- 4. NEON GRID ----------
SCENES.grid = {
  name: "Neon Grid", icon: "🌆", ownText: false,
  stars: [],
  init() {
    this.stars = Array.from({ length: 140 }, () => ({ x: rand(1), y: rand(1), s: rand(2.2, 0.4), tw: rand(TAU) }));
  },
  draw(t) {
    const horizon = H * 0.55;
    const c0 = state.palette.colors[0], c1 = state.palette.colors[1], c2 = state.palette.colors[2];
    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#020208");
    sky.addColorStop(1, mixHex("#020208", c2, 0.35));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizon);
    // stars
    for (const s of this.stars) {
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + s.tw));
      ctx.fillStyle = "#fff";
      ctx.fillRect(s.x * W, s.y * horizon * 0.85, s.s, s.s);
    }
    ctx.globalAlpha = 1;
    // sun
    const sunR = H * 0.24;
    const sunY = horizon - sunR * 0.25;
    const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    sun.addColorStop(0, c0);
    sun.addColorStop(1, c1);
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, sunY, sunR, 0, TAU);
    ctx.clip();
    ctx.fillStyle = sun;
    ctx.shadowColor = c1; ctx.shadowBlur = 80;
    ctx.fillRect(W / 2 - sunR, sunY - sunR, sunR * 2, sunR * 2);
    // slice lines through sun
    ctx.fillStyle = "#020208";
    for (let i = 0; i < 7; i++) {
      const yy = sunY + sunR * (0.05 + i * 0.14) - ((t * 20 * state.speed) % (sunR * 0.14));
      ctx.fillRect(W / 2 - sunR, yy, sunR * 2, 3 + i * 2.2);
    }
    ctx.restore();
    ctx.shadowBlur = 0;
    // ground
    const gnd = ctx.createLinearGradient(0, horizon, 0, H);
    gnd.addColorStop(0, mixHex("#050510", c2, 0.25));
    gnd.addColorStop(1, "#050510");
    ctx.fillStyle = gnd;
    ctx.fillRect(0, horizon, W, H - horizon);
    // grid
    ctx.strokeStyle = c0;
    ctx.shadowColor = c0;
    ctx.shadowBlur = 12 * state.intensity;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = 0.9;
    // horizontal moving lines
    const rows = 14;
    for (let i = 0; i < rows; i++) {
      const z = ((i / rows + t * 0.35 * state.speed) % 1 + 1) % 1;
      const y = horizon + Math.pow(z, 3) * (H - horizon);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // vertical converging lines
    const cols = 22;
    for (let i = -cols; i <= cols; i++) {
      const x0 = W / 2 + (i / cols) * W * 2.2;
      ctx.beginPath();
      ctx.moveTo(W / 2 + (i / cols) * W * 0.06, horizon);
      ctx.lineTo(x0, H);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // horizon glow line
    ctx.fillStyle = c1;
    ctx.shadowColor = c1; ctx.shadowBlur = 30;
    ctx.fillRect(0, horizon - 2, W, 4);
    ctx.shadowBlur = 0;
    drawTitle(t, { y: H * 0.3 });
  },
};

// ---------- 5. PLASMA FLOW ----------
SCENES.plasma = {
  name: "Plasma Flow", icon: "🫠", ownText: false,
  blobs: [],
  init() {
    this.blobs = Array.from({ length: 7 }, (_, i) => ({
      fx: rand(0.9, 0.25), fy: rand(0.9, 0.25),
      px: rand(TAU), py: rand(TAU),
      r: rand(0.55, 0.3), k: i / 7,
    }));
  },
  draw(t) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#03030a";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const tt = t * state.speed;
    for (const b of this.blobs) {
      const x = W * (0.5 + 0.38 * Math.sin(tt * b.fx + b.px));
      const y = H * (0.5 + 0.38 * Math.sin(tt * b.fy + b.py));
      const r = Math.min(W, H) * b.r * state.intensity;
      const col = colorAt(b.k + t * 0.04);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, col.replace("rgb", "rgba").replace(")", ",0.55)"));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    // subtle vignette
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    drawTitle(t);
  },
};

// ---------- 6. GLITCH TITLE ----------
SCENES.glitch = {
  name: "Glitch Title", icon: "📺", ownText: true,
  off: null, offCtx: null,
  init() {
    this.off = document.createElement("canvas");
    this.offCtx = this.off.getContext("2d");
  },
  draw(t) {
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, W, H);
    const text = (state.text || "GLITCH").toUpperCase();
    // render text to offscreen
    this.off.width = W; this.off.height = H;
    const o = this.offCtx;
    const fs = (() => {
      o.font = `900 ${Math.min(W, H) * 0.18}px "Arial Black", sans-serif`;
      const w = o.measureText(text).width;
      const base = Math.min(W, H) * 0.18;
      return w > W * 0.85 ? base * (W * 0.85 / w) : base;
    })();
    o.font = `900 ${fs}px "Arial Black", "Helvetica Neue", sans-serif`;
    o.textAlign = "center"; o.textBaseline = "middle";
    o.fillStyle = "#fff";
    o.fillText(text, W / 2, H / 2);

    const glitchAmt = (Math.sin(t * 3.7) > 0.55 || Math.sin(t * 9.1) > 0.9 ? 1 : 0.15) * state.intensity;
    const seed = Math.floor(t * 14 * state.speed);
    const rng = (i) => { const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453; return x - Math.floor(x); };

    // rgb split
    ctx.globalCompositeOperation = "lighter";
    const split = 8 * glitchAmt + 2;
    const c0 = state.palette.colors[0], c1 = state.palette.colors[1];
    for (const [col, dx] of [[c0, -split], [c1, split], ["#ffffff", 0]]) {
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 25;
      ctx.filter = "none";
      // tint via composite trick: draw text, then overlay color
      const tint = document.createElement("canvas");
      tint.width = W; tint.height = H;
      const tc = tint.getContext("2d");
      tc.drawImage(this.off, 0, 0);
      tc.globalCompositeOperation = "source-in";
      tc.fillStyle = col;
      tc.fillRect(0, 0, W, H);
      ctx.drawImage(tint, dx, rng(99) * 4 * glitchAmt - 2 * glitchAmt);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";

    // horizontal slice displacement
    const slices = Math.round(6 * glitchAmt);
    for (let i = 0; i < slices; i++) {
      const sy = rng(i * 3) * H;
      const sh = rng(i * 3 + 1) * H * 0.06 + 4;
      const dx = (rng(i * 3 + 2) - 0.5) * W * 0.12 * glitchAmt;
      const img = ctx.getImageData(0, sy, W, sh);
      ctx.putImageData(img, dx, sy);
    }
    // scanlines
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 0; y < H; y += 5) ctx.fillRect(0, y, W, 2);
    // random noise blocks
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 10 * glitchAmt; i++) {
      ctx.fillStyle = rng(i * 7) > 0.5 ? c0 : c1;
      ctx.fillRect(rng(i * 7 + 1) * W, rng(i * 7 + 2) * H, rng(i * 7 + 3) * 90 + 8, rng(i * 7 + 4) * 8 + 2);
    }
    ctx.globalAlpha = 1;
  },
};

// ---------- 7. STARFIELD WARP ----------
SCENES.warp = {
  name: "Hyperdrive", icon: "🚀", ownText: false,
  stars: [],
  init() {
    this.stars = Array.from({ length: 500 }, () => ({
      x: rand(2, -1), y: rand(2, -1), z: rand(1, 0.02), pz: 0,
    }));
    for (const s of this.stars) s.pz = s.z;
  },
  draw(t, dt) {
    ctx.fillStyle = "rgba(0,0,6,0.45)";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const f = Math.min(W, H) * 0.5;
    ctx.lineCap = "round";
    for (const s of this.stars) {
      s.pz = s.z;
      s.z -= dt * 0.45 * state.speed;
      if (s.z <= 0.02) {
        s.x = rand(2, -1); s.y = rand(2, -1);
        s.z = 1; s.pz = 1;
      }
      const sx = cx + (s.x - 0.5) * f / s.z;
      const sy = cy + (s.y - 0.5) * f / s.z;
      const px = cx + (s.x - 0.5) * f / s.pz;
      const py = cy + (s.y - 0.5) * f / s.pz;
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      const depth = 1 - s.z;
      ctx.strokeStyle = colorAt(depth * 0.5 + t * 0.05);
      ctx.globalAlpha = clamp(depth * 1.4, 0.05, 1);
      ctx.lineWidth = depth * 5 * state.intensity + 0.4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // center flare
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.3);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    drawTitle(t);
  },
};

// ---------- 8. SPECTRUM BARS ----------
SCENES.bars = {
  name: "Beat Bars", icon: "🎚️", ownText: false,
  init() {},
  draw(t) {
    ctx.fillStyle = "#04040c";
    ctx.fillRect(0, 0, W, H);
    const n = 56;
    const bw = W / n;
    const mid = H * 0.58;
    const tt = t * state.speed;
    // beat kick
    const beat = Math.pow(Math.abs(Math.sin(tt * Math.PI * 2 * 1.1)), 12);
    for (let i = 0; i < n; i++) {
      const x = i * bw;
      const c = Math.abs(i - n / 2) / (n / 2);
      const hgt = (
        Math.abs(Math.sin(i * 0.55 + tt * 2.4)) * 0.5 +
        Math.abs(Math.sin(i * 1.7 - tt * 3.7)) * 0.3 +
        Math.abs(Math.sin(i * 3.1 + tt * 5.2)) * 0.2
      ) * (1 - c * 0.55) * (0.35 + beat * 0.75) * H * 0.42 * state.intensity + 6;
      const col = colorAt(i / n + tt * 0.05);
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 18;
      const w2 = bw * 0.62;
      // up bar
      ctx.fillRect(x + (bw - w2) / 2, mid - hgt, w2, hgt);
      // reflection
      ctx.globalAlpha = 0.28;
      ctx.fillRect(x + (bw - w2) / 2, mid + 4, w2, hgt * 0.5);
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
    // floor line
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, mid, W, 2);
    drawTitle(t, { y: H * 0.22, size: Math.min(W, H) * 0.09 });
  },
};

// ---------- 9. ORBITALS ----------
SCENES.orbitals = {
  name: "Orbitals", icon: "🪐", ownText: false,
  init() {},
  draw(t) {
    ctx.fillStyle = "rgba(2,2,10,0.3)";
    ctx.fillRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2;
    const base = Math.min(W, H) * 0.36;
    const tt = t * state.speed;
    ctx.globalCompositeOperation = "lighter";
    const rings = 5;
    for (let r = 0; r < rings; r++) {
      const radius = base * (0.3 + r * 0.2) * (1 + Math.sin(tt * 1.3 + r) * 0.06);
      const dots = 6 + r * 4;
      const rot = tt * (r % 2 ? 0.5 : -0.4) * (1 + r * 0.15);
      const col = colorAt(r / rings + tt * 0.03);
      // ring path
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius, radius * 0.92, rot * 0.2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // dots + connecting chords
      const pts = [];
      for (let d = 0; d < dots; d++) {
        const a = (d / dots) * TAU + rot;
        pts.push([cx + Math.cos(a) * radius, cy + Math.sin(a) * radius * 0.92]);
      }
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let d = 0; d < dots; d++) {
        const [x1, y1] = pts[d];
        const [x2, y2] = pts[(d + 2) % dots];
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 14 * state.intensity;
      for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, 4 * state.intensity + Math.sin(tt * 3 + x) * 1.5, 0, TAU);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    // core
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.28);
    g.addColorStop(0, rgba(state.palette.colors[0], 0.8));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, base * 0.28, 0, TAU);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    drawTitle(t, { y: H * 0.88, size: Math.min(W, H) * 0.07 });
  },
};

// ---------- 10. CODE RAIN ----------
SCENES.rain = {
  name: "Code Rain", icon: "🌧️", ownText: false,
  cols: [],
  glyphs: "アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF<>[]{}#$%",
  init() {
    const fs = Math.max(14, Math.round(Math.min(W, H) / 45));
    this.fs = fs;
    const n = Math.ceil(W / fs);
    this.cols = Array.from({ length: n }, () => ({
      y: rand(H / fs), sp: rand(1.4, 0.5),
    }));
  },
  draw(t, dt) {
    ctx.fillStyle = "rgba(0,2,4,0.14)";
    ctx.fillRect(0, 0, W, H);
    const fs = this.fs;
    ctx.font = `700 ${fs}px "Courier New", monospace`;
    ctx.textAlign = "center";
    for (let i = 0; i < this.cols.length; i++) {
      const c = this.cols[i];
      c.y += c.sp * dt * 28 * state.speed;
      const rows = H / fs;
      if (c.y > rows + rand(30)) { c.y = -rand(20); c.sp = rand(1.4, 0.5); }
      const x = i * fs + fs / 2;
      const y = c.y * fs;
      const ch = this.glyphs[Math.floor(rand(this.glyphs.length))];
      // head
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = state.palette.colors[0];
      ctx.shadowBlur = 12 * state.intensity;
      ctx.fillText(ch, x, y);
      ctx.shadowBlur = 0;
      // second glyph tinted
      ctx.fillStyle = colorAt(i / this.cols.length * 0.4 + 0.1);
      ctx.fillText(this.glyphs[Math.floor(rand(this.glyphs.length))], x, y - fs);
    }
    drawTitle(t);
  },
};

/* ---- module glue for the React layer ---- */
let startTime = performance.now() / 1000;
let lastT = 0, rafId = 0, running = false;

export function setCanvas(c) { canvas = c; ctx = c.getContext("2d"); }
export function getCanvas() { return canvas; }
export function getDims() { return { W, H }; }
export function syncState(next) { Object.assign(state, next); }
export function resetScene() { SCENES[state.scene].init(); startTime = performance.now() / 1000; }
export function applyRes(w, h) {
  W = w; H = h;
  if (canvas) { canvas.width = W; canvas.height = H; canvas.style.aspectRatio = `${W} / ${H}`; }
  resetScene();
}
function loop() {
  if (!running) return;
  const now = performance.now() / 1000;
  const t = now - startTime;
  const dt = Math.min(now - lastT, 0.05) || 0.016;
  lastT = now;
  if (ctx) SCENES[state.scene].draw(t, dt);
  rafId = requestAnimationFrame(loop);
}
export function start() { if (running) return; running = true; lastT = performance.now() / 1000; rafId = requestAnimationFrame(loop); }
export function stop() { running = false; cancelAnimationFrame(rafId); }

export { state, PALETTES, SCENES };
