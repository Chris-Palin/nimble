import { useEffect, useRef, useState } from 'react';
import * as RNS from '../core/render';
import { useStage, loadStyles, saveStyles, saveStyleWithPrompt, type SavedStyle } from '../store';

const R = RNS as unknown as Record<string, any>;
const LAYOUTS: any[] = R.LAYOUTS;
const clone = (v: any) => JSON.parse(JSON.stringify(v));

export function RightPanel() {
  const custom = useStage(s => s.comp.layoutPresetId == null);
  return (
    <aside className={'right' + (custom ? ' custom' : '')} id="panelRight">
      <div className="rp-head">Layout <span className="custom-flag">Custom</span></div>
      <LayoutRail />
      <SavedStyles />
    </aside>
  );
}

function LayoutRail() {
  const comp = useStage(s => s.comp);
  const images = useStage(s => s.images);
  const layoutPresetId = useStage(s => s.comp.layoutPresetId);
  const applyLayout = useStage(s => s.applyLayout);
  const setUi = useStage(s => s.setUi);
  const railRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoverT = useRef<ReturnType<typeof setTimeout> | null>(null);

  // live miniatures of the real composition under each layout (debounced)
  useEffect(() => {
    const id = setTimeout(() => {
      const rail = railRef.current;
      if (!rail) return;
      const f = comp.frame;
      const tw = rail.clientWidth ? rail.clientWidth - 28 : 152;
      const k = tw / f.width;
      const thH = Math.min(Math.round(f.height * k), 280);
      R.setImages(images);
      LAYOUTS.forEach((L, i) => {
        const th = thumbRefs.current[i];
        if (!th) return;
        const mini = clone(comp);
        const solved = L.solve(mini.frame);
        while (mini.mockups.length < solved.length) { const cm = clone(mini.mockups[0]); cm.id = R.uid(); mini.mockups.push(cm); }
        mini.mockups.length = solved.length;
        if (solved.some((t: any) => t.deviceHint)) {
          const cat = mini.mockups[0].device.category;
          solved.forEach((t: any, j: number) => {
            const mk = mini.mockups[j];
            if (t.deviceHint === 'back' && (cat === 'phone' || cat === 'bare')) mk.device = { ...mk.device, category: 'laptop', modelId: 'macbook-pro-14', variant: 'space' };
            if (t.deviceHint === 'front' && cat !== 'phone') mk.device = { ...mk.device, category: 'phone', modelId: 'iphone-17', variant: 'space' };
          });
        }
        solved.forEach((t: any, j: number) => {
          Object.assign(mini.mockups[j].transform, {
            scale: t.scale, x: t.x, y: t.y, rotate: t.rotate || 0,
            rotateX: t.rotateX || 0, rotateY: t.rotateY || 0, perspective: t.perspective || 1200,
          });
          if (t.shadow) mini.mockups[j].shadow = { presetId: t.shadow, ...R.SHADOW_PRESETS[t.shadow], color: mini.mockups[j].shadow.color };
        });
        th.style.height = thH + 'px';
        th.textContent = '';
        const holder = document.createElement('div');
        Object.assign(holder.style, { width: f.width + 'px', height: f.height + 'px', transform: `scale(${k})`, transformOrigin: '0 0', flex: 'none', pointerEvents: 'none' });
        R.setRenderUi({ travel: false, previewLayout: null });
        holder.appendChild(R.buildComposition(mini, { interactive: false, atmoScale: Math.min(0.3, tw / f.width * 2), atmoTime: performance.now() / 1000 }));
        const clip = document.createElement('div');
        Object.assign(clip.style, { width: tw + 'px', height: thH + 'px', overflow: 'hidden', position: 'relative' });
        clip.appendChild(holder);
        th.appendChild(clip);
      });
    }, 180);
    return () => clearTimeout(id);
  }, [comp, images]);

  return (
    <div id="presetRail" ref={railRef}>
      {LAYOUTS.map((L, i) => (
        <button key={L.id} className={'lp' + (layoutPresetId === L.id ? ' on' : '')} title={`${L.name} (${i + 1 <= 9 ? i + 1 : ''})`}
          onClick={() => applyLayout(L.id, true)}
          onMouseEnter={() => { hoverT.current = setTimeout(() => setUi({ previewLayout: L.id }), 150); }}
          onMouseLeave={() => { if (hoverT.current) clearTimeout(hoverT.current); if (useStage.getState().ui.previewLayout === L.id) setUi({ previewLayout: null }); }}>
          <div className="lp-thumb" ref={el => { thumbRefs.current[i] = el; }} />
          <div className="lp-name">{L.name}</div>
        </button>
      ))}
    </div>
  );
}

function SavedStyles() {
  const loadComp = useStage(s => s.loadComp);
  const showToast = useStage(s => s.showToast);
  const bumpStyles = useStage(s => s.bumpStyles);
  const stylesRev = useStage(s => s.stylesRev);
  const [list, setList] = useState<SavedStyle[]>(() => loadStyles());

  useEffect(() => { setList(loadStyles()); }, [stylesRev]);

  return (
    <div className="rp-foot">
      <h3>Saved styles</h3>
      <div id="savedList">
        {list.length === 0
          ? <div className="note">Save a look you use often. Screenshots stay out of it.</div>
          : list.map((item, i) => (
            <div className="saved-item" key={i}>
              <button className="load" onClick={() => { loadComp(item.comp); showToast(`Loaded “${item.name}”`); }}>{item.name}</button>
              <button className="del" title="Delete" onClick={() => {
                const l = loadStyles(); l.splice(i, 1); saveStyles(l); bumpStyles();
              }}>✕</button>
            </div>
          ))}
      </div>
      <div className="btnrow">
        <button className="small" title="Save composition style (⌘S)" onClick={saveStyleWithPrompt}>Save current</button>
      </div>
    </div>
  );
}
