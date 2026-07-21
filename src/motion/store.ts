import { create } from 'zustand';
import * as RNS from './core/scenes';

const R = RNS as unknown as Record<string, any>;
export const PALETTES: { name: string; colors: string[] }[] = R.PALETTES;
export const SCENES: Record<string, { name: string; icon: string }> = R.SCENES;

const rand = (a = 1, b = 0) => b + Math.random() * (a - b);

export type MotionState = {
  scene: string;
  paletteIndex: number;
  speed: number;
  intensity: number;
  text: string;
  showTitle: boolean;
  resolution: string;
  duration: number;
  recording: boolean;
  timer: string;
  setScene: (id: string) => void;
  setPaletteIndex: (i: number) => void;
  setSpeed: (v: number) => void;
  setIntensity: (v: number) => void;
  setText: (v: string) => void;
  setShowTitle: (v: boolean) => void;
  setResolution: (v: string) => void;
  setDuration: (v: number) => void;
  setRecording: (v: boolean) => void;
  setTimer: (v: string) => void;
  randomise: () => void;
};

export const useMotion = create<MotionState>((set) => ({
  scene: 'tunnel',
  paletteIndex: 0,
  speed: 1,
  intensity: 1,
  text: 'MOTION',
  showTitle: true,
  resolution: '1920x1080',
  duration: 5,
  recording: false,
  timer: '0.0s',
  setScene: id => set({ scene: id }),
  setPaletteIndex: i => set({ paletteIndex: i }),
  setSpeed: v => set({ speed: v }),
  setIntensity: v => set({ intensity: v }),
  setText: v => set({ text: v }),
  setShowTitle: v => set({ showTitle: v }),
  setResolution: v => set({ resolution: v }),
  setDuration: v => set({ duration: v }),
  setRecording: v => set({ recording: v }),
  setTimer: v => set({ timer: v }),
  randomise: () => set({
    scene: Object.keys(SCENES)[Math.floor(rand(Object.keys(SCENES).length))],
    paletteIndex: Math.floor(rand(PALETTES.length)),
    speed: +rand(1.8, 0.6).toFixed(1),
    intensity: +rand(1.6, 0.6).toFixed(1),
  }),
}));

/** Map the reactive store into the render core's plain state object. */
export function syncCore(s: MotionState) {
  R.syncState({
    scene: s.scene,
    palette: PALETTES[s.paletteIndex],
    speed: s.speed,
    intensity: s.intensity,
    text: s.text,
    showTitle: s.showTitle,
  });
}
