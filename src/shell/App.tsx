import { useEffect, useMemo, useState } from 'react';
import { create } from 'zustand';
import { Home } from '../home/Home';
import './shell.css';

/* React port of the Arabella. shell. Tools keep shipping as static pages
   from public/arabella/tools and load in kept-alive iframes, exactly like the
   static shell did — the sidebar, theming, and routing are React now. */

export type Tool = { id: string; name: string; meta: string; src: string };
export const TOOLS: Tool[] = [
  { id: 'home',    name: 'Home',    meta: 'Studio overview',    src: '/arabella/home.html' },
  { id: 'mash',    name: 'Mash',    meta: 'Mesh gradients',     src: '/arabella/tools/mesh-gradient/index.html' },
  { id: 'stage',   name: 'Stage',   meta: 'Screenshot mockups', src: '/arabella/tools/stage/index.html' },
  { id: 'digit',   name: 'Digit',   meta: 'Gesture FX',         src: '/arabella/tools/digit/index.html' },
  { id: 'motion',  name: 'Motion',  meta: 'Motion graphics',    src: '/arabella/tools/motion/index.html' },
  { id: 'stipple', name: 'Stipple', meta: 'Dither & halftone',  src: '/arabella/tools/dither/index.html' },
];
const NIMBLE_PALETTE = ['#F42C04', '#FF6FAE', '#FCCA46', '#2DC7FF', '#645DD7', '#CBA0FF'];

type ShellState = {
  active: string;
  opened: string[];               // iframes stay mounted once visited
  theme: 'light' | 'dark';
  collapsed: boolean;
  open: (id: string) => void;
  toggleTheme: () => void;
  toggleCollapsed: () => void;
};
const initialTool = () => {
  const h = location.hash.slice(1);
  if (TOOLS.some(t => t.id === h)) return h;
  const last = localStorage.getItem('arabella-last-tool');
  return TOOLS.some(t => t.id === last) ? last! : 'home';
};
export const useShell = create<ShellState>((set, get) => ({
  active: initialTool(),
  opened: [initialTool()],
  theme: (localStorage.getItem('nimble-theme') as 'light' | 'dark') ??
    (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  collapsed: localStorage.getItem('arabella-collapsed') === '1',
  open: id => {
    if (!TOOLS.some(t => t.id === id)) return;
    const { opened } = get();
    set({ active: id, opened: opened.includes(id) ? opened : [...opened, id] });
    history.replaceState(null, '', '#' + id);
    localStorage.setItem('arabella-last-tool', id);
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('nimble-theme', next);
    set({ theme: next });
  },
  toggleCollapsed: () => {
    const next = !get().collapsed;
    localStorage.setItem('arabella-collapsed', next ? '1' : '0');
    set({ collapsed: next });
  },
}));

function syncFrameTheme(frame: HTMLIFrameElement, theme: string) {
  try {
    const doc = frame.contentDocument!;
    doc.documentElement.dataset.theme = theme;
    doc.documentElement.style.colorScheme = theme;
    if (!doc.getElementById('shell-css')) {
      const s = doc.createElement('style');
      s.id = 'shell-css';
      s.textContent = '.tool-home-slot,#nimbleSplash,.tool-header .theme-toggle{display:none !important;}';
      doc.head.appendChild(s);
    }
  } catch { /* cross-origin frames stay as they are */ }
}

export function App() {
  const { active, opened, theme, collapsed, open, toggleTheme, toggleCollapsed } = useShell();
  const [pillColor] = useState(() => NIMBLE_PALETTE[Math.floor(Math.random() * NIMBLE_PALETTE.length)]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll<HTMLIFrameElement>('iframe[data-tool]').forEach(f => syncFrameTheme(f, theme));
  }, [theme]);

  useEffect(() => {
    const onHash = () => open(location.hash.slice(1));
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  }, [open]);

  useEffect(() => {
    const t = TOOLS.find(t => t.id === active)!;
    document.title = t.id === 'home' ? 'Arabella.' : `${t.name} — Arabella.`;
  }, [active]);

  const tools = useMemo(() => TOOLS.filter(t => t.id !== 'home'), []);

  return (
    <div className={'shell' + (collapsed ? ' collapsed' : '')}>
      <aside>
        <div className="brand">
          <div className="mark aonic">A.</div>
          <div className="name">
            <b className="aonic">Arabella.</b>
            <span>Creative tools</span>
          </div>
        </div>

        <nav aria-label="Home">
          <button className={'tool-btn' + (active === 'home' ? ' active' : '')} onClick={() => open('home')}>
            <span className="ico-home" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 10.8 12 3.5l8.5 7.3" />
                <path d="M5.8 9.6V20a.6.6 0 0 0 .6.6h11.2a.6.6 0 0 0 .6-.6V9.6" />
              </svg>
            </span>
            <span className="txt">Home<small>Studio overview</small></span>
          </button>
        </nav>

        <div className="navlabel">Tools</div>
        <nav aria-label="Tools">
          {tools.map(t => (
            <button key={t.id} className={'tool-btn' + (active === t.id ? ' active' : '')} onClick={() => open(t.id)}>
              <span className="dot" aria-hidden="true" />
              <span className="txt">{t.name}<small>{t.meta}</small></span>
            </button>
          ))}
          <button className="tool-btn soon" tabIndex={-1}>
            <span className="txt">More soon<small>New tools land here</small></span>
          </button>
        </nav>

        <div className="spacer" />

        <div className="side-foot">
          <button className="foot-btn" onClick={toggleTheme}>
            <span className="ico">{theme === 'dark' ? '☀' : '☾'}</span>
            <span className="lbl">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
          <button className="foot-btn" onClick={toggleCollapsed}>
            <span className="ico">{collapsed ? '⟩' : '⟨'}</span>
            <span className="lbl">Collapse</span>
          </button>
          <a className="nimble-pill porkys" href="/index.html" style={{ ['--pill-c' as string]: pillColor }}>
            <span className="pill-full">Nimble</span><span className="pill-mini">N</span>
          </a>
        </div>
      </aside>

      <main>
        {opened.includes('home') && (
          <div className={'home-host' + (active === 'home' ? ' visible' : '')}>
            <Home onOpen={open} />
          </div>
        )}
        {TOOLS.filter(t => t.id !== 'home' && opened.includes(t.id)).map(t => (
          <iframe
            key={t.id}
            data-tool={t.id}
            src={t.src}
            title={t.name}
            className={active === t.id ? 'visible' : ''}
            allow="camera; microphone; fullscreen; clipboard-write; display-capture"
            onLoad={e => syncFrameTheme(e.currentTarget, useShell.getState().theme)}
          />
        ))}
      </main>
    </div>
  );
}
