import { useEffect, useRef, useState } from 'react';
import { ToolHeader, useTheme } from '@arabella/ui';
import { useStipple } from './store';
import { StipplePanel } from './components/StipplePanel';
import { StippleStage } from './components/StippleStage';
import { doExport } from './pipeline';

function Toast() {
  const toast = useStipple(s => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast.seq) return;
    setShow(true);
    const id = setTimeout(() => setShow(false), 3200);
    return () => clearTimeout(id);
  }, [toast.seq]);
  return <div className={'toast' + (show ? ' show' : '')}>{toast.msg}</div>;
}

export function StippleApp() {
  const [theme, toggleTheme] = useTheme();
  const randomize = useStipple(s => s.randomize);
  const flipRef = useRef({ flipped: false, before: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target as HTMLElement)?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const st = useStipple.getState();
      const k = e.key.toLowerCase();
      if (k === 'r') st.randomize();
      else if (k === 'x') st.reset();
      else if (k === 'c') {
        const f = flipRef.current;
        if (!f.flipped) { f.before = st.comparePos; st.setComparePos(100); f.flipped = true; }
        else { st.setComparePos(f.before); f.flipped = false; }
      } else if (k === 'e') doExport();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const actions = (
    <>
      <button type="button" onClick={randomize} title="Randomize">🎲 Random</button>
      <button type="button" className="primary" onClick={doExport} title="Export">Export ↓</button>
    </>
  );

  return (
    <>
      <ToolHeader title="Stipple" meta="Dither & halftone" actions={actions} theme={theme} onToggleTheme={toggleTheme} />
      <div className="app">
        <StipplePanel />
        <StippleStage />
      </div>
      <Toast />
    </>
  );
}
