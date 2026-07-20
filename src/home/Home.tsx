import type { ReactNode } from 'react';
import './home.css';

/* Arabella. home — native React port of public/studio/home.html */

const CARDS: { id: string; name: string; blurb: string; art: ReactNode }[] = [
  {
    id: 'mash', name: 'Mash',
    blurb: 'Organic mesh gradients, rendered on the GPU, exported at any size.',
    art: <span className="art art-mash"><i /><i /><i /><i /></span>,
  },
  {
    id: 'stage', name: 'Stage',
    blurb: 'Frame a screenshot in a device mockup and make it postable in 30 seconds.',
    art: (
      <span className="art art-stage">
        <span className="win">
          <span className="bar"><b /><b /><b /></span>
          <span className="blk" style={{ background: 'var(--nimble-yellow)' }} />
          <span className="blk" style={{ background: 'var(--nimble-red)' }} />
          <span className="blk" style={{ background: 'var(--nimble-blue)' }} />
        </span>
      </span>
    ),
  },
  {
    id: 'digit', name: 'Digit',
    blurb: 'Camera effects you control by pinching. Hands are the interface.',
    art: <span className="art art-digit"><b /><b /><b /><b /><s /><s /></span>,
  },
  {
    id: 'motion', name: 'Motion',
    blurb: 'Kinetic type and looping title scenes, recorded straight to video.',
    art: <span className="art art-motion"><span className="aonic">M</span></span>,
  },
  {
    id: 'stipple', name: 'Stipple',
    blurb: 'Dither, halftone and retro print treatments for any image.',
    art: <span className="art art-stipple-wrap"><span className="art art-stipple" /></span>,
  },
];

export function Home({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="home">
      <div className="sky" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="wrap">
        <header className="hero">
          <div className="kicker"><span className="live" /> Five tools · zero uploads · all browser</div>
          <h1 className="aonic">Arabella.</h1>
          <p>A workbench of <b>small, playful, seriously capable</b> creative tools. Pick one on the left, or dive in below.</p>
        </header>

        <div className="seclabel">The tools</div>
        <div className="grid">
          {CARDS.map(c => (
            <button key={c.id} className="card" onClick={() => onOpen(c.id)}>
              {c.art}
              <span className="body">
                <span className="txt"><h3>{c.name}</h3><p>{c.blurb}</p></span>
                <span className="go">→</span>
              </span>
            </button>
          ))}
          <button className="card soon" tabIndex={-1} aria-disabled="true">
            <span className="art art-soon"><span>More soon</span></span>
            <span className="body">
              <span className="txt"><h3>Unnamed</h3><p>The next tool lands right here.</p></span>
              <span className="go">·</span>
            </span>
          </button>
        </div>

        <footer className="foot">
          <span className="lock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            Everything runs on your device. No uploads, no accounts, no telemetry.
          </span>
          <span className="grow" />
          <a href="/index.html">nimble ↗</a>
        </footer>
      </div>
    </div>
  );
}
