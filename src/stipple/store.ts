import { create } from 'zustand';
import * as RNS from './core/dither';

const R = RNS as unknown as Record<string, any>;
export const MODES: { id: string; name: string; hint: string }[] = R.MODES;
export const DEFAULTS: Record<string, any> = R.DEFAULTS;
export const QUICK_PRESETS: [string, Record<string, any>][] = R.QUICK_PRESETS;
export const PRINT_PRESETS: [string, number][] = R.PRINT_PRESETS;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mapRange = (v: number, iMin: number, iMax: number, oMin: number, oMax: number) => oMin + ((v - iMin) / (iMax - iMin)) * (oMax - oMin);

export type StippleFields = {
  mode: string; scale: number; intensity: number; threshold: number; contrast: number;
  grain: number; direction: number; colorLimit: number;
  grade: boolean; gradeSource: string; gradeBias: number;
  exportLongEdge: number; exportFormat: string; transparent: boolean;
};

export type StippleState = StippleFields & {
  hasImage: boolean; imgName: string; imgDims: string;
  paletteColors: number[][] | null; comparePos: number;
  toast: { msg: string; seq: number };
  showToast: (msg: string) => void;
  patch: (p: Partial<StippleFields>) => void;
  setGrade: (v: boolean) => void;
  setGradeSource: (src: string) => void;
  reExtract: () => void;
  randomize: () => void;
  reset: () => void;
  applyPreset: (cfg: Record<string, any>) => void;
  setComparePos: (v: number) => void;
  onImageLoaded: (name: string, w: number, h: number) => void;
  onGradeLoaded: () => void;
};

function paletteFromCore(): number[][] | null {
  const p = R.ensurePalette();
  return p ? p.map((c: number[]) => c.slice()) : null;
}

export const useStipple = create<StippleState>((set, get) => ({
  ...(DEFAULTS as StippleFields),
  hasImage: false,
  imgName: '—',
  imgDims: '—',
  paletteColors: null,
  comparePos: 0,
  toast: { msg: '', seq: 0 },

  showToast: msg => set(s => ({ toast: { msg, seq: s.toast.seq + 1 } })),
  patch: p => set(p as any),
  setGrade: v => set({ grade: v, paletteColors: v ? paletteFromCore() : get().paletteColors }),
  setGradeSource: src => {
    set({ gradeSource: src });
    if (get().grade) set({ paletteColors: paletteFromCore() });
  },
  reExtract: () => set({ paletteColors: paletteFromCore() }),

  randomize: () => {
    const modes = MODES.map(m => m.id);
    const next: any = {
      mode: modes[Math.floor(Math.random() * modes.length)],
      scale: Math.round(mapRange(Math.random(), 0, 1, 3, 24)),
      intensity: Math.round(mapRange(Math.random(), 0, 1, 70, 100)),
      threshold: Math.round(mapRange(Math.random(), 0, 1, 30, 70)),
      contrast: Math.round(mapRange(Math.random(), 0, 1, -30, 40)),
      grain: Math.round(mapRange(Math.random(), 0, 1, 0, 35)),
      direction: Math.round(Math.random() * 359),
      colorLimit: [2, 2, 3, 4, 4, 6][Math.floor(Math.random() * 6)],
    };
    if (Math.random() < 0.35) { next.grade = true; next.gradeBias = Math.round(mapRange(Math.random(), 0, 1, 20, 70)); }
    else next.grade = false;
    R.setState(next);
    if (next.grade) next.paletteColors = paletteFromCore();
    set(next);
  },
  reset: () => set({ ...(DEFAULTS as StippleFields) }),
  applyPreset: cfg => {
    set(cfg as any);
    if (get().grade) set({ paletteColors: paletteFromCore() });
  },
  setComparePos: v => set({ comparePos: clamp(v, 0, 100) }),

  onImageLoaded: (name, w, h) => {
    set({ hasImage: true, imgName: name.length > 22 ? name.slice(0, 19) + '…' : name, imgDims: `${w}×${h}` });
    if (get().grade && get().gradeSource === 'image') set({ paletteColors: paletteFromCore() });
  },
  onGradeLoaded: () => { if (get().grade) set({ paletteColors: paletteFromCore() }); },
}));

/** Push the reactive fields into the render core's plain state object. */
export function syncCore(s: StippleFields) {
  R.setState({
    mode: s.mode, scale: s.scale, intensity: s.intensity, threshold: s.threshold,
    contrast: s.contrast, grain: s.grain, direction: s.direction, colorLimit: s.colorLimit,
    grade: s.grade, gradeSource: s.gradeSource, gradeBias: s.gradeBias,
    exportLongEdge: s.exportLongEdge, exportFormat: s.exportFormat, transparent: s.transparent,
  });
}
