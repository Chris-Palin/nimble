import { useEffect, useRef, type CSSProperties } from 'react';
import './home.css';

const v = (o: Record<string, string>) => o as CSSProperties;

const LOGO: [string, string, string][] = [
  ['N', 'var(--red)', '-5deg'], ['I', 'var(--pink)', '4deg'], ['M', 'var(--yellow)', '-3deg'],
  ['B', 'var(--blue)', '4deg'], ['L', 'var(--indigo)', '-4deg'], ['E', 'var(--lavender)', '5deg'],
];
const HERO: [string, string][] = [
  ['N', 'var(--red)'], ['i', 'var(--pink)'], ['m', 'var(--yellow)'],
  ['b', 'var(--blue)'], ['l', 'var(--indigo)'], ['e', 'var(--lavender)'],
];
const Logo = () => <>{LOGO.map(([ch, c, r], i) => <span key={i} style={v({ '--c': c, '--r': r })}>{ch}</span>)}</>;

export function NimbleHome() {
  const navRef = useRef<HTMLElement>(null);

  // nav border on scroll
  useEffect(() => {
    const nav = navRef.current;
    const onScroll = () => nav?.classList.toggle('scrolled', scrollY > 12);
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  // reveal on scroll
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  // hero letters drift up and weave through the air like floaty cards — VERBATIM
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const word = document.querySelector('h1 .fun.porkys');
    if (!word) return;
    const letters = [...word.querySelectorAll('i')] as HTMLElement[];
    const n = letters.length;
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const ss = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    const back = (t: number) => { t = Math.max(0, Math.min(1, t)); const c1 = 2.0, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    const spline = (p: number[], u: number) => {
      const n = p.length - 1;
      const i = Math.min(Math.floor(u * n), n - 1);
      const lt = u * n - i;
      const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)];
      const t2 = lt * lt, t3 = t2 * lt;
      return 0.5 * (2 * b + (c - a) * lt + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    };
    const perm = () => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };

    function keyframes(i: number, off: number[], p1: number[], p2: number[], p3: number[]) {
      const dx1 = off[p1[i]] - off[i];
      const dx2 = off[p2[i]] - off[i];
      const dx3 = off[p3[i]] - off[i];
      const way = [0, dx1, dx2, dx3, 0];
      const yUp = -56 + rnd(-8, 8);
      const amp = 15 + Math.random() * 9;
      const rot = 7 + Math.random() * 5;
      const ph = Math.random() * Math.PI * 2;
      const dir = i % 2 ? 1 : -1;
      const HOLD = .86;
      const STEPS = 36, kf = [];
      for (let s = 0; s <= STEPS; s++) {
        const t = s / STEPS;
        let x;
        if (t < .12) x = 0;
        else if (t < .74) x = spline(way, ss((t - .12) / .62));
        else x = 0;
        const calm = t < .66 ? 1 : t < .76 ? ss((.76 - t) / .10) : 0;
        let y, rz, sc;
        if (t <= HOLD) {
          const env = t < .12 ? ss(t / .12) : 1;
          y = env * (yUp + Math.sin(t * Math.PI * 5 + ph) * amp * calm);
          rz = env * calm * Math.sin(t * Math.PI * 4 + ph) * rot * dir;
          sc = 1 + env * calm * (0.05 + Math.sin(t * Math.PI * 5 + ph) * 0.03);
        } else {
          const p = (t - HOLD) / (1 - HOLD);
          y = yUp * (1 - back(p));
          rz = 0; sc = 1;
        }
        kf.push({ offset: +t.toFixed(3), transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${rz.toFixed(1)}deg) scale(${sc.toFixed(3)})` });
      }
      return kf;
    }
    let running = false;
    let stopped = false;
    async function run() {
      if (running) return; running = true;
      const off = letters.map(l => l.offsetLeft);
      const p1 = perm(), p2 = perm(), p3 = perm();
      letters.forEach(l => l.style.willChange = 'transform');
      const anims = letters.map((l, i) => l.animate(keyframes(i, off, p1, p2, p3),
        { duration: 6000, delay: i * 80, easing: 'linear', fill: 'none' }));
      await Promise.allSettled(anims.map(a => a.finished));
      letters.forEach(l => l.style.willChange = '');
      running = false;
    }
    (function loop() { setTimeout(async () => { if (stopped) return; await run(); loop(); }, 6500 + Math.random() * 5000); })();
    return () => { stopped = true; };
  }, []);

  // outlined cursor in a random Nimble colour — VERBATIM
  useEffect(() => {
    const cols = ['%23F42C04', '%23FF6FAE', '%23FCCA46', '%232DC7FF', '%23645DD7', '%23CBA0FF'];
    const c = cols[Math.floor(Math.random() * cols.length)];
    const d = 'M6 3 L6 21 L11 16.5 L14.2 23.5 L17.6 22 L14.4 15 L21 14.6 Z';
    const arrow = () =>
      "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2228%22 height=%2228%22 viewBox=%220 0 28 28%22>" +
      "<path d=%22" + d + "%22 fill=%22none%22 stroke=%22rgba(0,0,0,0.32)%22 stroke-width=%225.5%22 stroke-linejoin=%22round%22/>" +
      "<path d=%22" + d + "%22 fill=%22" + c + "%22 stroke=%22white%22 stroke-width=%222.2%22 stroke-linejoin=%22round%22/></svg>') 5 3";
    const st = document.createElement('style');
    st.textContent = 'body{cursor:' + arrow() + ',auto}a,button,.cta,.card,[role=button]{cursor:' + arrow() + ',pointer}';
    document.head.appendChild(st);
    return () => { st.remove(); };
  }, []);

  return (
    <>
      <nav id="nav" ref={navRef}>
        <a className="logo porkys" href="#" aria-label="Nimble"><Logo /></a>
        <div className="links">
          <a href="#overview">About</a>
          <a href="#projects">Projects</a>
          <a href="/poem.html">Poem</a>
          <a className="cta" href="/arabella/index.html">Visit Arabella. <span className="arr">→</span></a>
        </div>
      </nav>

      <header className="hero">
        <div className="blobs" aria-hidden="true">
          <div className="blob b1" /><div className="blob b2" />
          <div className="blob b3" /><div className="blob b4" />
        </div>

        <h1>
          <span className="fun porkys" style={v({ '--r': '-2deg' })}>
            {HERO.map(([ch, c], i) => <i key={i} style={v({ '--c': c })}>{ch}</i>)}
          </span> by name.<br />
          <span className="fun" style={v({ '--c': 'var(--red)', '--r': '2deg' })}>
            Brave
            <svg className="squiggle" viewBox="0 0 220 14" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2 9 Q 15 2, 30 8 T 58 8 T 86 8 T 114 8 T 142 8 T 170 8 T 198 8 T 218 7"
                fill="none" stroke="var(--yellow)" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </span> by nature.
        </h1>

        <div className="actions">
          <a className="cta" href="#overview">Have a wander <span className="arr">→</span></a>
        </div>
      </header>

      <div className="marquee" aria-hidden="true" />

      <section className="overview reveal" id="overview">
        <div className="kicker" style={v({ '--kc': 'var(--pink)' })}>Overview</div>
        <h2>Hey, what's nimble?</h2>
        <p className="lede">Nimble is a home for everything: every experiment, every idea worth chasing. No roadmap, no meetings, no uploads. I build small, handmade tools and share them freely, right here in your browser.</p>
        <div className="ovgrid">
          <div className="ov" style={v({ '--oc': 'var(--red)' })}><b>Small tools</b><span>Each one does a single thing properly, and stays out of your way.</span></div>
          <div className="ov" style={v({ '--oc': 'var(--blue)' })}><b>Nothing leaves your device</b><span>Every pixel is processed locally. No accounts, no telemetry.</span></div>
          <div className="ov" style={v({ '--oc': 'var(--indigo)' })}><b>Free to wander</b><span>Open Arabella., poke around, make something, take it with you.</span></div>
        </div>
      </section>

      <div className="genesis-band" id="projects">
        <div className="cover-wrap reveal">
          <div className="cover">
            <div className="glow" aria-hidden="true" />
            <div>
              <div className="kicker" style={v({ '--kc': 'var(--ab-green)' })}>00 - Project Genesis</div>
              <h2>Meet<br /><span className="aonic">Arabella.</span></h2>
              <p className="lede">Arabella. is my workbench, a single web app where all of my tools live side by side. Open it up and have a wander.</p>
              <a className="cta" href="/arabella/index.html">Step inside <span className="arr">→</span></a>
            </div>
            <div className="mock" aria-hidden="true">
              <div className="titlebar"><i /><i /><i /></div>
              <div className="app">
                <div className="side">
                  <div className="item active" style={v({ '--ic': 'var(--ab-green)' })}><i /><b /></div>
                  <div className="item" style={v({ '--ic': 'var(--ab-purple)' })}><i /><b /></div>
                  <div className="item" style={v({ '--ic': 'var(--ab-green)' })}><i /><b /></div>
                  <div className="item" style={v({ '--ic': 'var(--ab-purple)' })}><i /><b /></div>
                </div>
                <div className="canvas"><div className="art" /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="cover-wrap reveal">
          <div className="cover teaser">
            <div>
              <div className="kicker">01 - Project Lazarus</div>
              <h2>Coming soon.</h2>
              <p className="lede">Something new is waking up on the workbench. No details yet — check back soon.</p>
            </div>
            <div className="mock-empty" aria-hidden="true"><span>Coming soon</span></div>
          </div>
        </div>
      </div>

      <footer>
        <div className="inner">
          <div className="logo biglogo porkys reveal" aria-label="Nimble"><Logo /></div>
          <div className="row">
            <span>© Nimble. Made with far too much enthusiasm.</span>
            <div className="flinks">
              <a href="/arabella/index.html">Arabella.</a>
              <a href="/poem.html">Poem</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
