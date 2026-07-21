import { useEffect } from 'react';
import { ToolHeader, useTheme } from '@arabella/ui';
import * as RNS from './core/render';
import { useStage, saveStyleWithPrompt } from './store';
import { StageCanvas } from './components/StageCanvas';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { ExportPopover } from './components/ExportPopover';
import { Toast } from './components/Toast';
import { doCopy, doExport } from './export';

const R = RNS as unknown as Record<string, any>;

export function StageApp() {
  const [theme, toggleTheme] = useTheme();
  const comp = useStage(s => s.comp);
  const randomise = useStage(s => s.randomise);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStage.getState();
      const inField = /^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement as HTMLElement)?.tagName);
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        if (inField) return;
        e.preventDefault(); e.shiftKey ? st.redo() : st.undo();
      } else if (mod && key === 'e') { e.preventDefault(); doExport(); }
      else if (mod && key === 's') { e.preventDefault(); saveStyleWithPrompt(); }
      else if (mod && e.key === '0') { e.preventDefault(); st.setUi({ zoom: 'fit', panX: 0, panY: 0 }); }
      else if (mod && key === 'c') {
        if (inField || String(getSelection() || '')) return;
        e.preventDefault(); doCopy();
      } else if (!mod && !inField) {
        if (key === 'r') { e.preventDefault(); st.randomise(); }
        else if (/^[1-9]$/.test(e.key)) { const L = R.LAYOUTS[+e.key - 1]; if (L) st.applyLayout(L.id, true); }
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  const actions = (
    <>
      <button className="icon-btn" onClick={randomise} title="Randomise (R)">🎲<span className="hide-sm"> Random</span></button>
      <button className="icon-btn" onClick={doCopy} title="Copy image to clipboard (⌘C)">Copy</button>
      <ExportPopover />
    </>
  );

  return (
    <>
      <ToolHeader
        title="Stage"
        meta={`${comp.frame.width} × ${comp.frame.height}`}
        actions={actions}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="app">
        <LeftPanel />
        <StageCanvas />
        <RightPanel />
      </div>
      <Toast />
      <input type="file" id="filePick" accept="image/*" style={{ display: 'none' }} />
      <input type="file" id="bgFilePick" accept="image/*" style={{ display: 'none' }} />
    </>
  );
}
