import type { ReactNode } from 'react';

/** Sidebar icons. Each renders filled (selected) or outline (idle) from the same
 *  shape, tinted with currentColor so it inherits the tool-button state colour. */
export type ToolIcon = (filled: boolean) => ReactNode;

const svg = (filled: boolean, sw: number, children: ReactNode): ReactNode => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"
    fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export const TOOL_ICONS: Record<string, ToolIcon> = {
  // Home — house
  home: f => svg(f, 1.9, <path d="M4 11.4 12 4l8 7.4V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />),

  // Mash — overlapping mesh blobs
  mash: f => svg(f, 1.7, <>
    <circle cx="9" cy="9.5" r="4.3" />
    <circle cx="15" cy="9.5" r="4.3" />
    <circle cx="12" cy="14.6" r="4.3" />
  </>),

  // Stage — framed screenshot
  stage: f => svg(f, 1.7, <>
    <rect x="3.4" y="5" width="17.2" height="14" rx="2.4" />
    <circle cx="8.6" cy="10" r="1.5" />
    <path d="M4 17.5l4.6-4 3 2.4 3.4-4.4 5 5.6" />
  </>),

  // Digit — raised hand (gesture)
  digit: f => svg(f, 1.5, <path d="M10.5 1.9a1.13 1.13 0 0 1 2.25 0v8.2c.52.16 1.02.38 1.5.66V3.4a1.13 1.13 0 0 1 2.25 0v10.94a4.5 4.5 0 0 0-3.25 2.37 8.96 8.96 0 0 1 4-.93.75.75 0 0 0 .75-.75v-2.27c0-.9.35-1.75.99-2.38a1.13 1.13 0 0 1 1.59 1.59c-.21.21-.33.5-.33.8v3a6 6 0 0 1-1.75 4l-1.74 1.74a6 6 0 0 1-4.24 1.76H10.5a7.5 7.5 0 0 1-7.5-7.5V6.4a1.13 1.13 0 0 1 2.25 0v5.52c.46-.45.97-.83 1.5-1.14V3.4a1.13 1.13 0 0 1 2.25 0v6.53c.5-.1 1-.15 1.5-.15z" />),

  // Motion — play
  motion: f => svg(f, 1.8, <path d="M8 5.4v13.2l11-6.6z" />),

  // Stipple — halftone dots of varying size
  stipple: f => svg(f, 1.5, <>
    <circle cx="7" cy="7" r="2.4" />
    <circle cx="13.4" cy="7" r="1.4" />
    <circle cx="18" cy="8" r="1" />
    <circle cx="7.4" cy="13" r="1.6" />
    <circle cx="13" cy="13.4" r="2.6" />
    <circle cx="17.6" cy="14" r="1.3" />
    <circle cx="9" cy="18.2" r="1.1" />
    <circle cx="15" cy="18.4" r="1.8" />
  </>),
};
