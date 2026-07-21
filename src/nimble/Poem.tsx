import type { CSSProperties } from 'react';
import './poem.css';
import { POEM_BODY } from './poemBody';

/** The "Braver" poem page — static parchment markup (moss SVG + verse) rendered
 *  verbatim. display:contents lets the content sit directly in body's grid so the
 *  manuscript panel stays centred. Blue + orange flowers bloom on the vines
 *  (VineFlowers) as a matched SVG overlay. No scripts (CSS animations only). */

type Bloom = { x: number; y: number; s: number; rot: number; c: 'blue' | 'orange' };

// blooms placed at the vine tips + along the vines, varying size and quantity
const BLOOMS: Bloom[] = [
  { x: 127, y: 158, s: 1.15, rot: 12, c: 'blue' },
  { x: 110, y: 150, s: 0.7, rot: -34, c: 'orange' },
  { x: 143, y: 92, s: 0.55, rot: 26, c: 'orange' },
  { x: 336, y: 157, s: 0.95, rot: -18, c: 'orange' },
  { x: 349, y: 82, s: 0.6, rot: 14, c: 'blue' },
  { x: 593, y: 221, s: 1.35, rot: 8, c: 'blue' },
  { x: 610, y: 206, s: 0.82, rot: -14, c: 'orange' },
  { x: 579, y: 114, s: 0.7, rot: 20, c: 'orange' },
  { x: 567, y: 60, s: 0.5, rot: -8, c: 'blue' },
  { x: 675, y: 193, s: 1.05, rot: 24, c: 'orange' },
  { x: 697, y: 100, s: 0.55, rot: -22, c: 'blue' },
  { x: 871, y: 206, s: 1.2, rot: -10, c: 'orange' },
  { x: 888, y: 194, s: 0.62, rot: 32, c: 'blue' },
  { x: 896, y: 56, s: 0.52, rot: 10, c: 'blue' },
  { x: 1105, y: 205, s: 1.0, rot: 16, c: 'blue' },
  { x: 1102, y: 106, s: 0.68, rot: -16, c: 'orange' },
  { x: 1281, y: 239, s: 1.3, rot: -6, c: 'orange' },
  { x: 1262, y: 224, s: 0.66, rot: 22, c: 'blue' },
  { x: 1296, y: 100, s: 0.55, rot: -12, c: 'orange' },
];

const PALETTE = {
  blue: { petal: '#3BA9FF', inner: '#9BD8FF', center: '#FFD860' },
  orange: { petal: '#FF8A3D', inner: '#FFC38C', center: '#7C2E0B' },
};

function Flower({ x, y, s, rot, c, i }: Bloom & { i: number }) {
  const p = PALETTE[c];
  const petals = 6;
  return (
    <g className="fl" style={{ ['--d' as keyof CSSProperties]: `${(i % 7) * 0.6}s`, ['--dur' as keyof CSSProperties]: `${6 + (i % 5)}s` } as CSSProperties}>
      <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rot})`}>
        {Array.from({ length: petals }).map((_, k) => (
          <g key={k} transform={`rotate(${k * (360 / petals)})`}>
            <ellipse cx={0} cy={-7.6} rx={4.3} ry={7.6} fill={p.petal} />
            <ellipse cx={0} cy={-8.6} rx={1.9} ry={4.4} fill={p.inner} opacity={0.9} />
          </g>
        ))}
        <circle r={3.6} fill={p.center} />
        <circle cx={-1} cy={-1} r={1.3} fill="#ffffff" opacity={0.55} />
      </g>
    </g>
  );
}

function VineFlowers() {
  return (
    <div className="vine-flowers" aria-hidden="true">
      <svg viewBox="0 0 1440 260" preserveAspectRatio="xMidYMin slice">
        {BLOOMS.map((b, i) => <Flower key={i} {...b} i={i} />)}
      </svg>
    </div>
  );
}

export function Poem() {
  return (
    <>
      <div style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: POEM_BODY }} />
      <VineFlowers />
    </>
  );
}
