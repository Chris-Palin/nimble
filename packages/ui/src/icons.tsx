import type { ReactNode } from 'react';

/* Sidebar + footer icons — Tabler icons (tabler.io/icons), supplied by the user.
   Tools with a filled variant swap to it when selected; the rest stay outline
   (the active button already inverts, so they still read as selected). */
export type ToolIcon = (filled: boolean) => ReactNode;

function Svg({ filled, sw = 2, size = 20, children }: { filled: boolean; sw?: number; size?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const TOOL_ICONS: Record<string, ToolIcon> = {
  // Home — house (outline / filled)
  home: f => f
    ? <Svg filled><path d="m12.707 2.293l9 9c.63.63.184 1.707-.707 1.707h-1v6a3 3 0 0 1-3 3h-1v-7a3 3 0 0 0-2.824-2.995L13 12h-2a3 3 0 0 0-3 3v7H7a3 3 0 0 1-3-3v-6H3c-.89 0-1.337-1.077-.707-1.707l9-9a1 1 0 0 1 1.414 0M13 14a1 1 0 0 1 1 1v7h-4v-7a1 1 0 0 1 .883-.993L11 14z" /></Svg>
    : <Svg filled={false}><path d="M5 12H3l9-9l9 9h-2M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /><path d="M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" /></Svg>,

  // Mash — mesh gradient
  mash: () => <Svg filled={false}>
    <path d="M3 9h18M3 15h18M8 4c.485.445 3.5 3.312 3.5 8c0 .663-.07 4.848-3.5 8m7-16a17 17 0 0 1 2.004 8c0 1.51-.201 4.628-2.004 8" />
    <path d="M18.778 20H5.222A2.22 2.22 0 0 1 3 17.778V6.222C3 4.995 3.995 4 5.222 4h13.556C20.005 4 21 4.995 21 6.222v11.556A2.22 2.22 0 0 1 18.778 20" />
  </Svg>,

  // Stage — photo/screenshot (outline / filled)
  stage: f => f
    ? <Svg filled><path d="M8.813 11.612c.457-.38.918-.38 1.386.011l.108.098l4.986 4.986l.094.083a1 1 0 0 0 1.403-1.403l-.083-.094L15.415 14l.292-.293l.106-.095c.457-.38.918-.38 1.386.011l.108.098l4.674 4.675a4 4 0 0 1-3.775 3.599L18 22H6a4 4 0 0 1-3.98-3.603l6.687-6.69zM18 2a4 4 0 0 1 3.995 3.8L22 6v9.585l-3.293-3.292l-.15-.137c-1.256-1.095-2.85-1.097-4.096-.017l-.154.14l-.307.306l-2.293-2.292l-.15-.137c-1.256-1.095-2.85-1.097-4.096-.017l-.154.14L2 15.585V6a4 4 0 0 1 3.8-3.995L6 2zm-2.99 5l-.127.007a1 1 0 0 0 0 1.986L15 9l.127-.007a1 1 0 0 0 0-1.986z" /></Svg>
    : <Svg filled={false}><path d="M15 8h.01M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" /><path d="m3 16l5-5c.928-.893 2.072-.893 3 0l5 5" /><path d="m14 14l1-1c.928-.893 2.072-.893 3 0l3 3" /></Svg>,

  // Digit — hands (relaxed idle → pointing when selected)
  digit: f => f
    ? <Svg filled={false}>
      <path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12m0-.5v-2a1.5 1.5 0 1 1 3 0V12m0-1.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2h.208a6 6 0 0 1-5.012-2.7L7 19q-.468-.718-3.286-5.728a1.5 1.5 0 0 1 .536-2.022a1.87 1.87 0 0 1 2.28.28L8 13" />
    </Svg>
    : <Svg filled={false}>
      <path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12m0-.5v-2a1.5 1.5 0 0 1 3 0V12m0-1.5a1.5 1.5 0 0 1 3 0V12" />
      <path d="M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2h.208a6 6 0 0 1-5.012-2.7L7 19q-.468-.718-3.286-5.728a1.5 1.5 0 0 1 .536-2.022a1.87 1.87 0 0 1 2.28.28L8 13M2.541 5.594a13.5 13.5 0 0 1 2.46-1.427M14 3.458a13.4 13.4 0 0 1 3.685 1.612" />
    </Svg>,

  // Motion — colour swatch (its defining control is the colour theme picker)
  motion: () => <Svg filled={false}>
    <path d="M19 3h-4a2 2 0 0 0-2 2v12a4 4 0 0 0 8 0V5a2 2 0 0 0-2-2" />
    <path d="m13 7.35l-2-2a2 2 0 0 0-2.828 0L5.344 8.178a2 2 0 0 0 0 2.828l9 9" />
    <path d="M7.3 13H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h12m0-4v.01" />
  </Svg>,

  // Stipple — grain / halftone dots
  stipple: () => <Svg filled={false}>
    <path d="M3.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m5-5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m0 10a1 1 0 1 0 2 0a1 1 0 1 0-2 0m-5 5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m10-10a1 1 0 1 0 2 0a1 1 0 1 0-2 0m5-5a1 1 0 1 0 2 0a1 1 0 1 0-2 0m-5 15a1 1 0 1 0 2 0a1 1 0 1 0-2 0m5-5a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
  </Svg>,
};

/** Footer: sun (in dark mode → switch to light) / moon (in light mode → switch to dark). */
export function SunMoon({ dark, size = 18 }: { dark: boolean; size?: number }) {
  return dark
    ? <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor"><path d="M12 19a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1m-4.95-2.05a1 1 0 0 1 0 1.414l-1.414 1.414a1 1 0 1 1-1.414-1.414l1.414-1.414a1 1 0 0 1 1.414 0m11.314 0l1.414 1.414a1 1 0 0 1-1.414 1.414l-1.414-1.414a1 1 0 0 1 1.414-1.414m-5.049-9.836a5 5 0 1 1-2.532 9.674a5 5 0 0 1 2.532-9.674M4 11a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2zm18 0a1 1 0 0 1 0 2h-2a1 1 0 0 1 0-2zM5.636 4.222L7.05 5.636A1 1 0 0 1 5.636 7.05L4.222 5.636a1 1 0 0 1 1.414-1.414m14.142 0a1 1 0 0 1 0 1.414L18.364 7.05a1 1 0 0 1-1.414-1.414l1.414-1.414a1 1 0 0 1 1.414 0M12 1a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V2a1 1 0 0 1 1-1" /></svg>
    : <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor"><path d="M12 1.992a10 10 0 1 0 9.236 13.838c.341-.82-.476-1.644-1.298-1.31a6.5 6.5 0 0 1-6.864-10.787l.077-.08c.551-.63.113-1.653-.758-1.653h-.266l-.068-.006z" /></svg>;
}

/** Footer: badge arrow — outline pointing left to collapse, filled pointing right (flipped) to expand. */
export function CollapseArrow({ collapsed, size = 18 }: { collapsed: boolean; size?: number }) {
  return collapsed
    ? <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor" style={{ transform: 'scaleX(-1)' }}><path d="M17 6h-6a1 1 0 0 0-.78.375l-4 5a1 1 0 0 0 0 1.25l4 5A1 1 0 0 0 11 18h6l.112-.006a1 1 0 0 0 .669-1.619L14.28 12l3.5-4.375A1 1 0 0 0 17 6" /></svg>
    : <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17h6l-4-5l4-5h-6l-4 5z" /></svg>;
}
