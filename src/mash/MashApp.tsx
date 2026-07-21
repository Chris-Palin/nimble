import { useEffect, useState } from 'react';
import { ToolHeader, useTheme } from '@arabella/ui';
import { useMash } from './store';
import { MashPanel } from './components/MashPanel';
import { MashStage } from './components/MashStage';
import { doExport } from './pipeline';

function Toast() {
  const toast = useMash(s => s.toast);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!toast.seq) return;
    setShow(true);
    const id = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(id);
  }, [toast.seq]);
  return <div className={'toast' + (show ? ' show' : '')}>{toast.msg}</div>;
}

export function MashApp() {
  const [theme, toggleTheme] = useTheme();
  const randomAll = useMash(s => s.randomAll);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test((e.target as HTMLElement)?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const st = useMash.getState();
      const k = e.key.toLowerCase();
      if (k === 'r') st.randomAll();
      else if (k === 'v') st.reroll();
      else if (k === 's') st.scatter();
      else if (k === 'e') doExport();
      else if (k === 'h') st.toggleHideHandles();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const actions = (
    <>
      <button type="button" onClick={randomAll} title="Randomize (R)">🎲 Random</button>
      <button type="button" className="primary" onClick={doExport} title="Export (E)">Export ↓</button>
    </>
  );

  return (
    <>
      <ToolHeader title="Mash" meta="Mesh gradients" actions={actions} theme={theme} onToggleTheme={toggleTheme} />
      <div className="app">
        <MashPanel />
        <MashStage />
      </div>
      <Toast />
    </>
  );
}
