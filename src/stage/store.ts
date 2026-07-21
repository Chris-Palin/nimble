import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import * as RNS from './core/render';

// The renderer is a verbatim, intentionally untyped extraction — treat its
// exports as an `any` boundary so the store's typed model doesn't fight it.
const R = RNS as unknown as Record<string, any>;

/* ==========================================================================
 * Stage state — the vanilla `comp` / `ui` / `IMAGES` model + mutate / history /
 * persistence, ported onto Zustand (immer). The renderer stays a pure function
 * of `comp`; the canvas syncs the render-time mirrors (setImages / setRenderUi)
 * right before it builds, so the exported DOM is identical to the original.
 * ======================================================================== */

// ---- data model (mirrors defaultComp / defaultMockup in the renderer) ----
export type Stop = { color: string; position: number };
export type MeshPoint = { x: number; y: number; color: string };
export type Background = {
  type: 'gradient' | 'solid' | 'atmosphere' | 'texture' | 'image';
  mode: 'linear' | 'radial' | 'conic' | 'mesh';
  angle: number;
  stops: Stop[];
  meshPoints: MeshPoint[];
  x?: number;
  y?: number;
};
export type Chrome = {
  radius: number; innerBorder: boolean; url: string; tab: string; traffic: boolean;
  statusBar: boolean; time: string; island: boolean; orientation: string; sidebar: boolean;
};
export type Device = {
  category: string; modelId: string; variant: string; theme: 'light' | 'dark'; chrome: Chrome;
};
export type Screenshot = { src: string; scale: number; x: number; y: number } | null;
export type Transform = {
  scale: number; x: number; y: number; rotate: number; rotateX: number; rotateY: number; perspective: number;
};
export type Shadow = { presetId: string | null; x: number; y: number; blur: number; color: string; opacity: number };
export type Mockup = {
  id: string; device: Device; screenshot: Screenshot; transform: Transform; shadow: Shadow;
  reflection: { enabled: boolean; opacity: number; falloff: number };
  glow: { enabled: boolean; strength: number };
};
export type Frame = {
  width: number; height: number; presetId: string | null;
  background: Background;
  atmo: { effect: string; params: Record<string, number> };
  texture: { textureId: string; blendMode: string; opacity: number; tint: string | null; base: string };
  image: { src: string | null; fit: string; scale: number; x: number; y: number; blur: number; brightness: number; tint: string; tintOpacity: number };
  solid: { color: string };
  grain: number;
  vignette: { amount: number; radius: number };
  dither: boolean;
  padding: number;
  cornerRadius: number;
  border: { width: number; color: string };
  transparent: boolean;
};
export type Comp = { version: number; frame: Frame; mockups: Mockup[]; layoutPresetId: string | null };
export type ImageRec = { src: string; w: number; h: number };

export type Panel = 'mockup' | 'frame';
export type UI = {
  panel: Panel;
  zoom: 'fit' | number;
  panX: number; panY: number;
  selStop: number; selMesh: number;
  recentColors: string[];
  previewLayout: string | null;
  exporting: boolean;
  spacePan: boolean;
};

export type MutateOpts = { customLayout?: boolean; rebuildPanels?: boolean; commit?: boolean };
export type Suggestion = { text: string; actionLabel: string; action: () => void; seq: number } | null;

type StageState = {
  comp: Comp;
  images: Record<string, ImageRec>;
  ui: UI;
  toast: { msg: string; seq: number };
  suggestion: Suggestion;
  stylesRev: number;
  // actions
  mutate: (fn: (c: Comp) => void, opts?: MutateOpts) => void;
  setUi: (patch: Partial<UI>) => void;
  setPanel: (p: Panel) => void;
  pushRecent: (color: string) => void;
  showToast: (msg: string) => void;
  setSuggestion: (s: Omit<NonNullable<Suggestion>, 'seq'> | null) => void;
  bumpStyles: () => void;
  addImage: (id: string, rec: ImageRec) => void;
  applyLayout: (id: string, animate?: boolean) => void;
  reSolveLayout: () => void;
  randomise: () => void;
  loadComp: (c: Comp, keepScreenshot?: boolean) => void;
  undo: () => void;
  redo: () => void;
  commitNow: () => void;
};

// ---- history / persistence timers (kept out of reactive state) ----
let histStack: string[] = [];
let histIdx = -1;
let commitTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

// ---- one-shot "spring travel" flag consumed by the canvas on next build ----
let pendingTravel = false;
export function requestTravel() { pendingTravel = true; }
export function consumeTravel() { const t = pendingTravel; pendingTravel = false; return t; }

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---- share link + boot restore ----
export function compForShare(comp: Comp): Comp {
  const c2 = clone(comp);
  c2.mockups.forEach(mk => { mk.screenshot = null; });
  c2.frame.image.src = null;
  return c2;
}
export function shareURL(comp: Comp): string {
  const json = JSON.stringify(compForShare(comp));
  const enc = btoa(unescape(encodeURIComponent(json)));
  return location.origin + location.pathname + '#s=' + enc;
}

function tryLoadHash(): Comp | null {
  if (!location.hash.startsWith('#s=')) return null;
  try {
    const json = decodeURIComponent(escape(atob(location.hash.slice(3))));
    const c2 = JSON.parse(json);
    if (c2 && c2.version === 1 && c2.frame && c2.mockups) {
      history.replaceState(null, '', location.pathname);
      return c2;
    }
  } catch { /* ignore */ }
  return null;
}

function restoreSession(): { comp: Comp; images: Record<string, ImageRec> } | null {
  try {
    const raw = localStorage.getItem('stage-session');
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.comp || data.comp.version !== 1) return null;
    const comp: Comp = data.comp;
    const images: Record<string, ImageRec> = data.images || {};
    comp.mockups.forEach(mk => { if (mk.screenshot && !images[mk.screenshot.src]) mk.screenshot = null; });
    if (comp.frame.image.src && !images[comp.frame.image.src]) comp.frame.image.src = null;
    return { comp, images };
  } catch { return null; }
}

function boot(): { comp: Comp; images: Record<string, ImageRec> } {
  const fromHash = tryLoadHash();
  if (fromHash) return { comp: fromHash, images: {} };
  const session = restoreSession();
  if (session) return session;
  return { comp: R.defaultComp(), images: {} };
}

const initial = boot();

function scheduleSave(get: () => StageState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { comp, images } = get();
    try {
      const usedIds = new Set<string>();
      comp.mockups.forEach(mk => { if (mk.screenshot) usedIds.add(mk.screenshot.src); });
      if (comp.frame.image.src) usedIds.add(comp.frame.image.src);
      const keep: Record<string, ImageRec> = {};
      usedIds.forEach(id => { if (images[id]) keep[id] = images[id]; });
      const payload = JSON.stringify({ comp, images: keep });
      if (payload.length < 4200000) localStorage.setItem('stage-session', payload);
      else localStorage.setItem('stage-session', JSON.stringify({ comp, images: {} }));
    } catch {
      try { localStorage.setItem('stage-session', JSON.stringify({ comp, images: {} })); } catch { /* full */ }
    }
  }, 800);
}

export const useStage = create<StageState>()(immer((set, get) => {
  function commitNow() {
    if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
    const s = JSON.stringify(get().comp);
    if (histStack[histIdx] === s) return;
    histStack = histStack.slice(0, histIdx + 1);
    histStack.push(s);
    if (histStack.length > 80) histStack.shift();
    histIdx = histStack.length - 1;
  }
  function scheduleCommit() {
    if (commitTimer) clearTimeout(commitTimer);
    commitTimer = setTimeout(commitNow, 380);
  }
  function restoreFrom(json: string) {
    set(st => { st.comp = JSON.parse(json); });
    scheduleSave(get);
  }

  return {
    comp: initial.comp,
    images: initial.images,
    ui: {
      panel: 'mockup',
      zoom: 'fit',
      panX: 0, panY: 0,
      selStop: 0, selMesh: -1,
      recentColors: [],
      previewLayout: null,
      exporting: false,
      spacePan: false,
    },
    toast: { msg: '', seq: 0 },
    suggestion: null,
    stylesRev: 0,

    mutate: (fn, opts = {}) => {
      set(st => {
        fn(st.comp);
        if (opts.customLayout) st.comp.layoutPresetId = null;
      });
      scheduleCommit();
      scheduleSave(get);
    },

    setUi: patch => set(st => { Object.assign(st.ui, patch); }),
    setPanel: p => set(st => { st.ui.panel = p; }),
    pushRecent: color => set(st => {
      const c = color.toUpperCase();
      st.ui.recentColors = [c, ...st.ui.recentColors.filter(x => x !== c)].slice(0, 8);
    }),

    showToast: msg => set(st => { st.toast = { msg, seq: st.toast.seq + 1 }; }),
    setSuggestion: s => set(st => { st.suggestion = s ? { ...s, seq: (st.suggestion?.seq ?? 0) + 1 } : null; }),
    bumpStyles: () => set(st => { st.stylesRev++; }),

    addImage: (id, rec) => {
      set(st => { st.images[id] = rec; });
      scheduleSave(get);
    },

    applyLayout: (id, animate = true) => {
      const solved: any[] = R.solvedFor(id, get().comp.frame);
      set(st => { st.ui.previewLayout = null; });
      if (animate) requestTravel();
      get().mutate(c => {
        while (c.mockups.length < solved.length) {
          const cloneM = clone(c.mockups[0]);
          cloneM.id = R.uid();
          c.mockups.push(cloneM);
        }
        c.mockups.length = solved.length;
        // duo stack pairs a big device with a phone in front
        if (solved.some(t => t.deviceHint)) {
          const cat = c.mockups[0].device.category;
          solved.forEach((t, i) => {
            const mk = c.mockups[i];
            if (t.deviceHint === 'back' && (cat === 'phone' || cat === 'bare')) {
              mk.device = { ...mk.device, category: 'laptop', modelId: 'macbook-pro-14', variant: 'space' };
            }
            if (t.deviceHint === 'front' && cat !== 'phone') {
              mk.device = { ...mk.device, category: 'phone', modelId: 'iphone-17', variant: 'space' };
            }
          });
        }
        solved.forEach((t, i) => {
          const mk = c.mockups[i];
          Object.assign(mk.transform, {
            scale: t.scale, x: t.x, y: t.y, rotate: t.rotate || 0,
            rotateX: t.rotateX || 0, rotateY: t.rotateY || 0, perspective: t.perspective || 1200,
          });
          if (t.shadow) mk.shadow = { presetId: t.shadow, ...R.SHADOW_PRESETS[t.shadow], color: mk.shadow.color };
        });
        c.layoutPresetId = id;
      }, { rebuildPanels: true });
    },

    reSolveLayout: () => {
      const id = get().comp.layoutPresetId;
      if (id) get().applyLayout(id, false);
    },

    randomise: () => {
      const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
      const BRAND: string[] = R.BRAND;
      const GRAD_PRESETS: string[][] = R.GRAD_PRESETS;
      const brandGrads = GRAD_PRESETS.slice(0, 15);
      const bgRoll = Math.random();
      get().mutate(c => {
        const f = c.frame;
        f.transparent = false;
        if (bgRoll < 0.42) {
          const cols = pick(brandGrads);
          f.background = {
            ...f.background, type: 'gradient',
            mode: Math.random() < 0.25 ? 'mesh' : pick(['linear', 'linear', 'radial']) as any,
            angle: Math.round(Math.random() * 360),
            stops: cols.map((col, i) => ({ color: col, position: Math.round(i * 100 / (cols.length - 1)) })),
          };
          if (f.background.mode === 'mesh') {
            const base = cols.length >= 4 ? cols : cols.concat(pick(brandGrads)).slice(0, 4);
            const pts = [[.18, .2], [.84, .22], [.2, .82], [.82, .8], [.5, .45], [.62, .62]];
            f.background.meshPoints = base.map((col, i) => ({ x: pts[i][0] + (Math.random() - .5) * .1, y: pts[i][1] + (Math.random() - .5) * .1, color: col }));
          }
          f.grain = 6 + Math.round(Math.random() * 16);
        } else if (bgRoll < 0.62) {
          const eff = pick(['aurora', 'cosmic', 'grid', 'spotlight']);
          f.background = { ...f.background, type: 'atmosphere' };
          f.atmo = {
            effect: eff, params: eff === 'aurora' ? { hue: Math.round(Math.random() * 80) }
              : eff === 'grid' ? { hue: pick([205, 260, 330, 40]) }
                : eff === 'cosmic' ? { hue: pick([258, 300, 210]) } : {},
          };
          f.grain = 8 + Math.round(Math.random() * 10);
        } else if (bgRoll < 0.82) {
          f.background = { ...f.background, type: 'solid' };
          f.solid.color = pick(['#0B0B0F', '#14141A', '#1C1C22', '#FAFAF8', '#EFEFEA', pick(BRAND)]);
          f.grain = 8 + Math.round(Math.random() * 14);
        } else {
          f.background = { ...f.background, type: 'texture' };
          f.texture = {
            textureId: pick(['paper', 'riso', 'halftone', 'concrete', 'linen']),
            blendMode: pick(['overlay', 'soft-light', 'multiply']),
            opacity: 30 + Math.round(Math.random() * 35),
            tint: Math.random() < 0.5 ? pick(BRAND) : null,
            base: pick(['#14141A', '#EFEFEA', '#FAFAF8', '#1C1C22']),
          };
          f.grain = 4 + Math.round(Math.random() * 10);
        }
        f.vignette.amount = Math.random() < 0.4 ? Math.round(Math.random() * 22) : 0;
        const dark = R.luma(R.bgAccent(f)) < 0.45;
        c.mockups.forEach(mk => {
          const sp = pick(['soft', 'dramatic', 'floating', 'long']);
          mk.shadow = {
            presetId: sp, ...R.SHADOW_PRESETS[sp],
            color: Math.random() < 0.5 ? R.darken(R.bgAccent(f), .55) : '#000000',
            opacity: R.SHADOW_PRESETS[sp].opacity * (dark ? 1.15 : 0.9),
          };
        });
      }, { rebuildPanels: true });
      const RANDOM_LAYOUT_POOL = ['centered', 'hero', 'tilted', 'float', 'diagonal', 'corner', 'bleed-bottom'];
      const frame = get().comp.frame;
      const pool = frame.height > frame.width ? RANDOM_LAYOUT_POOL : RANDOM_LAYOUT_POOL.filter(l => l !== 'bleed-bottom');
      get().applyLayout(pick(pool), true);
    },

    loadComp: (c, keepScreenshot = true) => {
      set(st => {
        const keepShot = keepScreenshot ? st.comp.mockups[0].screenshot : null;
        const next: Comp = clone(c);
        next.mockups.forEach(mk => { mk.screenshot = keepShot ? clone(keepShot) : null; });
        st.comp = next;
      });
      commitNow();
      scheduleSave(get);
    },

    undo: () => {
      commitNow();
      if (histIdx <= 0) { get().showToast('Nothing to undo'); return; }
      histIdx--;
      restoreFrom(histStack[histIdx]);
    },
    redo: () => {
      if (histIdx >= histStack.length - 1) { get().showToast('Nothing to redo'); return; }
      histIdx++;
      restoreFrom(histStack[histIdx]);
    },
    commitNow,
  };
}));

// seed the history baseline
useStage.getState().commitNow();

// ---- saved styles (composition minus screenshot), localStorage ----
export type SavedStyle = { name: string; comp: Comp };
export function loadStyles(): SavedStyle[] {
  try { return JSON.parse(localStorage.getItem('stage-styles') || '[]'); } catch { return []; }
}
export function saveStyles(list: SavedStyle[]) {
  try { localStorage.setItem('stage-styles', JSON.stringify(list)); } catch { useStage.getState().showToast('Could not save — storage full'); }
}
export function saveCurrentStyle(name: string) {
  const comp = useStage.getState().comp;
  const list = loadStyles();
  list.unshift({ name: name.slice(0, 40), comp: compForShare(comp) });
  saveStyles(list.slice(0, 20));
}

/** Prompt for a name and save the current composition as a reusable style. */
export function saveStyleWithPrompt() {
  const st = useStage.getState();
  const LAYOUT_BY_ID: Record<string, any> = (R as any).LAYOUT_BY_ID;
  const id = st.comp.layoutPresetId;
  const suggested = id ? `${LAYOUT_BY_ID[id]?.name || 'Stage'} look` : 'My look';
  const name = prompt('Name this style:', suggested);
  if (!name) return;
  saveCurrentStyle(name);
  st.bumpStyles();
  st.showToast('Style saved');
}
