import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MAX_POINTS } from './core/gl';

export { MAX_POINTS };

export const PALETTES: [string, string[]][] = [
  ['Aurora', ['#0fd6a0', '#2b6cff', '#7a3cff', '#0a1030', '#39e6d0']],
  ['Sunset', ['#ff5e62', '#ff9966', '#ffc371', '#a44a9c', '#2b1055']],
  ['Ocean', ['#00c6ff', '#0072ff', '#00e0d0', '#003b73', '#8fe3ff']],
  ['Candy', ['#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#f368e0']],
  ['Peach', ['#ffd8be', '#ffb385', '#ff8e72', '#f9f1e7', '#e85d75']],
  ['Forest', ['#0b3d20', '#2e8b57', '#a3d977', '#e9f5db', '#14532d']],
  ['Midnight', ['#0f0c29', '#302b63', '#24243e', '#4b3f97', '#101020']],
  ['Neon', ['#00ffcc', '#ff00aa', '#7700ff', '#001020', '#00aaff']],
  ['Pastel', ['#a8e6cf', '#dcedc1', '#ffd3b6', '#ffaaa5', '#cdb4f6']],
  ['Ember', ['#1a0505', '#7a1e05', '#e2571e', '#ffb347', '#3d0c02']],
  ['Lavender', ['#e6e6fa', '#b57edc', '#8a6fd1', '#f3e8ff', '#5d3fd3']],
  ['Citrus', ['#f9ed69', '#f08a5d', '#b83b5e', '#6a2c70', '#ffe066']],
  ['Vaporwave', ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96']],
  ['Mono Slate', ['#0f1115', '#2c3140', '#5b6478', '#a7b0c4', '#e6e9f2']],
];

export const SIZE_PRESETS: [string, number, number][] = [
  ['Custom', 0, 0],
  ['HD · 1280×720', 1280, 720],
  ['Full HD · 1920×1080', 1920, 1080],
  ['QHD · 2560×1440', 2560, 1440],
  ['4K UHD · 3840×2160', 3840, 2160],
  ['5K · 5120×2880', 5120, 2880],
  ['8K UHD · 7680×4320', 7680, 4320],
  ['Square · 2048×2048', 2048, 2048],
  ['Square · 4096×4096', 4096, 4096],
  ['iPhone wallpaper · 1290×2796', 1290, 2796],
  ['Instagram post · 1080×1350', 1080, 1350],
  ['Instagram story · 1080×1920', 1080, 1920],
  ['X / Twitter header · 1500×500', 1500, 500],
  ['A4 @300dpi · 2480×3508', 2480, 3508],
];

export const defaultLook = { power: 3.2, warp: 0.0, warpScale: 1.6, grain: 0.05, sat: 1, bright: 1, contrast: 1, blur: 0, hue: 0 };
export const SHAPES = ['Round', 'Ellipse', 'Diamond', 'Square', 'Blob', 'Star', 'Stripe', 'Quad'];
export const QUAD = SHAPES.indexOf('Quad');

export type Point = { x: number; y: number; color: number[]; intensity: number; shape: number; angle: number };

export function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}
export function rgbToHex(c: number[]): string {
  return '#' + c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
}
function scatterPositions(n: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 1.2;
    const r = 0.18 + Math.random() * 0.42;
    pts.push([0.5 + Math.cos(a) * r * 0.55 + (Math.random() - 0.5) * 0.15,
              0.5 + Math.sin(a) * r * 0.55 + (Math.random() - 0.5) * 0.15]);
  }
  return pts.map(([x, y]) => [Math.min(0.96, Math.max(0.04, x)), Math.min(0.96, Math.max(0.04, y))]);
}
function maybeShape(varied: boolean) {
  if (varied) return { shape: Math.floor(Math.random() * SHAPES.length), angle: Math.random() * Math.PI * 2 };
  return { shape: QUAD, angle: Math.random() * Math.PI * 2 };
}
function varyAll(points: Point[]) {
  const order = [1, 2, 3, 4, 5, 6, 0].sort(() => Math.random() - 0.5);
  points.forEach((p, i) => { p.shape = order[i % order.length]; p.angle = Math.random() * Math.PI * 2; });
}
function pointsFromHexes(hexes: string[], varied: boolean): Point[] {
  const pos = scatterPositions(hexes.length);
  return hexes.map((h, i) => ({ x: pos[i][0], y: pos[i][1], color: hexToRgb(h), intensity: 1, ...maybeShape(varied) }));
}

export type LookKey = 'power' | 'warp' | 'warpScale' | 'grain' | 'sat' | 'bright' | 'contrast' | 'blur' | 'hue';

type MashState = {
  w: number; h: number; seed: number; points: Point[];
  power: number; warp: number; warpScale: number; grain: number;
  sat: number; bright: number; contrast: number; blur: number; hue: number;
  selected: number; customPalette: string[]; activePalette: number;
  varied: boolean; hideHandles: boolean;
  exFormat: string; exQuality: number;
  toast: { msg: string; seq: number };
  // actions
  showToast: (m: string) => void;
  applyPaletteColors: (hexes: string[], regen: boolean) => void;
  setActivePalette: (i: number) => void;
  randomAll: () => void;
  scatter: () => void;
  shuffleColors: () => void;
  addPoint: () => void;
  addPointAt: (x: number, y: number) => void;
  deletePoint: () => void;
  selectPoint: (i: number) => void;
  movePoint: (i: number, x: number, y: number) => void;
  setPointColor: (hex: string) => void;
  setPointShape: (v: number) => void;
  setPointAngle: (v: number) => void;
  setPointIntensity: (v: number) => void;
  setVaried: (v: boolean) => void;
  reroll: () => void;
  setLook: (key: LookKey, v: number) => void;
  resetLook: () => void;
  newSeed: () => void;
  setSize: (w: number, h: number) => void;
  swap: () => void;
  addColor: () => void;
  setCustomColor: (i: number, hex: string) => void;
  removeColor: (i: number) => void;
  applyCustom: () => void;
  setExFormat: (f: string) => void;
  setExQuality: (q: number) => void;
  toggleHideHandles: () => void;
  loadPresetData: (data: any) => void;
};

function colorSource(st: MashState): string[] {
  return st.customPalette.length ? st.customPalette : PALETTES[st.activePalette >= 0 ? st.activePalette : 0][1];
}

export const useMash = create<MashState>()(immer((set, get) => ({
  w: 1920, h: 1080, seed: Math.random() * 100,
  points: pointsFromHexes(PALETTES[0][1], false),
  ...defaultLook,
  selected: -1,
  customPalette: ['#7c6cff', '#4dd6c1', '#ff6b9d', '#0e1030'],
  activePalette: 0,
  varied: false, hideHandles: false,
  exFormat: 'image/png', exQuality: 0.95,
  toast: { msg: '', seq: 0 },

  showToast: m => set(s => { s.toast = { msg: m, seq: s.toast.seq + 1 }; }),

  applyPaletteColors: (hexes, regen) => set(s => {
    if (regen || s.points.length !== hexes.length) s.points = pointsFromHexes(hexes, s.varied);
    else s.points.forEach((p, i) => { p.color = hexToRgb(hexes[i % hexes.length]); });
    s.selected = -1;
  }),
  setActivePalette: i => {
    set(s => { s.activePalette = i; });
    const s = get();
    if (i < 0) { if (s.customPalette.length >= 2) s.applyPaletteColors(s.customPalette, s.points.length !== s.customPalette.length); }
    else s.applyPaletteColors(PALETTES[i][1], s.points.length !== PALETTES[i][1].length);
  },
  randomAll: () => set(s => {
    const i = Math.floor(Math.random() * PALETTES.length);
    s.activePalette = i;
    s.seed = Math.random() * 100;
    s.warp = 0.2 + Math.random() * 0.7;
    s.warpScale = 0.8 + Math.random() * 2.4;
    s.power = 2.4 + Math.random() * 2.2;
    s.points = pointsFromHexes(PALETTES[i][1], s.varied);
    s.selected = -1;
  }),
  scatter: () => set(s => { const pos = scatterPositions(s.points.length); s.points.forEach((p, i) => { p.x = pos[i][0]; p.y = pos[i][1]; }); }),
  shuffleColors: () => set(s => {
    const cols = s.points.map(p => p.color);
    for (let i = cols.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cols[i], cols[j]] = [cols[j], cols[i]]; }
    s.points.forEach((p, i) => { p.color = cols[i]; });
  }),
  addPoint: () => {
    const src = colorSource(get());
    set(s => {
      if (s.points.length >= MAX_POINTS) { s.toast = { msg: `Maximum ${MAX_POINTS} points`, seq: s.toast.seq + 1 }; return; }
      s.points.push({ x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6, color: hexToRgb(src[Math.floor(Math.random() * src.length)]), intensity: 1, ...maybeShape(s.varied) });
      s.selected = s.points.length - 1;
    });
  },
  addPointAt: (x, y) => {
    const src = colorSource(get());
    set(s => {
      if (s.points.length >= MAX_POINTS) { s.toast = { msg: `Maximum ${MAX_POINTS} points`, seq: s.toast.seq + 1 }; return; }
      s.points.push({ x, y, color: hexToRgb(src[Math.floor(Math.random() * src.length)]), intensity: 1, ...maybeShape(s.varied) });
      s.selected = s.points.length - 1;
    });
  },
  deletePoint: () => set(s => {
    if (s.selected < 0) return;
    if (s.points.length <= 2) { s.toast = { msg: 'Keep at least 2 points', seq: s.toast.seq + 1 }; return; }
    s.points.splice(s.selected, 1); s.selected = -1;
  }),
  selectPoint: i => set(s => { s.selected = i; }),
  movePoint: (i, x, y) => set(s => { if (s.points[i]) { s.points[i].x = x; s.points[i].y = y; } }),
  setPointColor: hex => set(s => { if (s.points[s.selected]) s.points[s.selected].color = hexToRgb(hex); }),
  setPointShape: v => set(s => { if (s.points[s.selected]) s.points[s.selected].shape = v; }),
  setPointAngle: v => set(s => { if (s.points[s.selected]) s.points[s.selected].angle = v; }),
  setPointIntensity: v => set(s => { if (s.points[s.selected]) s.points[s.selected].intensity = v; }),
  setVaried: v => set(s => {
    s.varied = v;
    if (v) varyAll(s.points);
    else s.points.forEach(p => { p.shape = QUAD; p.angle = Math.random() * Math.PI * 2; });
  }),
  reroll: () => set(s => { s.varied = true; varyAll(s.points); }),
  setLook: (key, v) => set(s => { (s as any)[key] = v; }),
  resetLook: () => set(s => { Object.assign(s, defaultLook); }),
  newSeed: () => set(s => { s.seed = Math.random() * 100; }),
  setSize: (w, h) => set(s => {
    if (w >= 16 && h >= 16 && w <= 16384 && h <= 16384) { s.w = Math.round(w); s.h = Math.round(h); }
  }),
  swap: () => set(s => { const t = s.w; s.w = s.h; s.h = t; }),
  addColor: () => set(s => {
    if (s.customPalette.length >= MAX_POINTS) { s.toast = { msg: `Maximum ${MAX_POINTS} colours`, seq: s.toast.seq + 1 }; return; }
    s.customPalette.push('#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'));
  }),
  setCustomColor: (i, hex) => set(s => { s.customPalette[i] = hex; }),
  removeColor: i => set(s => { s.customPalette.splice(i, 1); }),
  applyCustom: () => {
    const s = get();
    if (s.customPalette.length < 2) { s.showToast('Add at least 2 colours'); return; }
    set(st => { st.activePalette = -1; });
    s.applyPaletteColors(s.customPalette, s.points.length !== s.customPalette.length);
  },
  setExFormat: f => set(s => { s.exFormat = f; }),
  setExQuality: q => set(s => { s.exQuality = q; }),
  toggleHideHandles: () => set(s => { s.hideHandles = !s.hideHandles; }),
  loadPresetData: data => set(s => {
    Object.assign(s, defaultLook, data.state);
    s.points = data.state.points.slice(0, MAX_POINTS).map((p: any) => ({
      x: +p.x || 0.5, y: +p.y || 0.5, color: p.color || [1, 1, 1],
      intensity: +p.intensity || 1, shape: +p.shape || 0, angle: +p.angle || 0,
    }));
    if (Array.isArray(data.customPalette)) s.customPalette = data.customPalette;
    s.selected = -1;
  }),
})));
