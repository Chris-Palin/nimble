import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as RNS from '../core/render';
import { useStage, consumeTravel } from '../store';
import { setScreenshot, setBgImage } from '../files';

const R = RNS as unknown as Record<string, any>;
const REDUCED: boolean = R.REDUCED;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Guide = { axis: 'v' | 'h'; pct: number };

/** The centre stage: builds the live composition DOM with the preserved
 *  renderer, sizes/zooms the scaler, drives the ambient atmosphere clock, and
 *  handles all direct-manipulation (drag, pan, handles, drops). Export is a
 *  separate path but reuses buildComposition(), so they never diverge. */
export function StageCanvas() {
  const comp = useStage(s => s.comp);
  const previewLayout = useStage(s => s.ui.previewLayout);
  const images = useStage(s => s.images);
  const zoom = useStage(s => s.ui.zoom);
  const panX = useStage(s => s.ui.panX);
  const panY = useStage(s => s.ui.panY);
  const panel = useStage(s => s.ui.panel);
  const mutate = useStage(s => s.mutate);
  const setUi = useStage(s => s.setUi);

  const wrapRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const liveAtmo = useRef<{ canvas: HTMLCanvasElement; scale: number }[]>([]);
  const lastDims = useRef<string | null>(null);
  const kRef = useRef(1);
  const [zoomLabel, setZoomLabel] = useState('—');
  const [resizeNonce, setResizeNonce] = useState(0);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dropShow, setDropShow] = useState(false);

  const viewScale = (f: any): number => {
    const wrapEl = wrapRef.current!;
    if (zoom === 'fit') {
      const k = Math.min((wrapEl.clientWidth - 70) / f.width, (wrapEl.clientHeight - 70) / f.height);
      return Math.min(k, 1.4);
    }
    return zoom as number;
  };

  // build the composition DOM + size the scaler (the vanilla renderMain)
  useLayoutEffect(() => {
    const f = comp.frame;
    const scaler = scalerRef.current!;
    const host = hostRef.current!;
    const k = viewScale(f);
    kRef.current = k;

    const dimKey = f.width + 'x' + f.height;
    if (lastDims.current && lastDims.current !== dimKey && !REDUCED) {
      scaler.classList.add('reshape');
      setTimeout(() => scaler.classList.remove('reshape'), 550);
    }
    lastDims.current = dimKey;

    scaler.style.width = (f.width * k) + 'px';
    scaler.style.height = (f.height * k) + 'px';
    scaler.classList.toggle('transparent-bg', f.transparent);
    host.style.width = f.width + 'px';
    host.style.height = f.height + 'px';
    host.style.transform = `scale(${k})`;

    R.setImages(images);
    R.setRenderUi({ travel: consumeTravel(), previewLayout });
    liveAtmo.current = [];
    host.textContent = '';
    host.appendChild(R.buildComposition(comp, {
      interactive: true,
      atmoTime: performance.now() / 1000,
      registerAtmo: (canvas: HTMLCanvasElement, scale: number) => liveAtmo.current.push({ canvas, scale }),
    }));
    setZoomLabel(Math.round(k * 100) + '%');
  }, [comp, previewLayout, images, zoom, resizeNonce]);

  // pan is just a transform on the scaler — never triggers a rebuild
  useLayoutEffect(() => {
    if (scalerRef.current) scalerRef.current.style.transform = `translate(${panX}px, ${panY}px)`;
  }, [panX, panY]);

  // ambient drift ~30fps, only while an atmosphere is live
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const st = useStage.getState();
      if (REDUCED || st.ui.exporting || document.hidden) return;
      if (st.comp.frame.background.type !== 'atmosphere' || !liveAtmo.current.length) return;
      if (now - last < 33) return;
      last = now;
      liveAtmo.current.forEach(({ canvas, scale }) => R.paintAtmo(canvas, st.comp.frame, now / 1000, scale));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // refit on resize
  useEffect(() => {
    const onResize = () => { if (useStage.getState().ui.zoom === 'fit') setResizeNonce(n => n + 1); };
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  // space-to-pan
  useEffect(() => {
    const wrap = wrapRef.current!;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !/^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement as HTMLElement)?.tagName)) {
        useStage.setState(s => { s.ui.spacePan = true; }); wrap.classList.add('panning'); e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') { useStage.setState(s => { s.ui.spacePan = false; }); wrap.classList.remove('panning'); } };
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, []);

  // clipboard paste, drag-drop, and file-pick intake
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
      if (!item) return;
      if (/^(INPUT|TEXTAREA)$/.test((document.activeElement as HTMLElement)?.tagName)) return;
      e.preventDefault(); setScreenshot(item.getAsFile()!); useStage.getState().showToast('Screenshot placed');
    };
    let depth = 0;
    const onEnter = (e: DragEvent) => { if (![...(e.dataTransfer?.types || [])].includes('Files')) return; depth++; setDropShow(true); };
    const onLeave = () => { depth = Math.max(0, depth - 1); if (!depth) setDropShow(false); };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); depth = 0; setDropShow(false);
      const fl = [...(e.dataTransfer?.files || [])].find(f => f.type.startsWith('image/'));
      if (fl) setScreenshot(fl);
    };
    document.addEventListener('paste', onPaste);
    addEventListener('dragenter', onEnter); addEventListener('dragleave', onLeave);
    addEventListener('dragover', onOver); addEventListener('drop', onDrop);

    const filePick = document.getElementById('filePick') as HTMLInputElement | null;
    const bgPick = document.getElementById('bgFilePick') as HTMLInputElement | null;
    const onFile = (e: Event) => { const fl = (e.target as HTMLInputElement).files?.[0]; if (fl) setScreenshot(fl); (e.target as HTMLInputElement).value = ''; };
    const onBg = (e: Event) => { const fl = (e.target as HTMLInputElement).files?.[0]; if (fl) setBgImage(fl); (e.target as HTMLInputElement).value = ''; };
    filePick?.addEventListener('change', onFile);
    bgPick?.addEventListener('change', onBg);

    return () => {
      document.removeEventListener('paste', onPaste);
      removeEventListener('dragenter', onEnter); removeEventListener('dragleave', onLeave);
      removeEventListener('dragover', onOver); removeEventListener('drop', onDrop);
      filePick?.removeEventListener('change', onFile); bgPick?.removeEventListener('change', onBg);
    };
  }, []);

  // ---- mockup drag (position, with snap guides) + shift-drag screenshot pan ----
  const onHostPointerDown = (ev: React.PointerEvent) => {
    if (ev.button !== 0 || useStage.getState().ui.spacePan) return;
    const target = ev.target as HTMLElement;
    if (target.closest('.screen-empty')) return;   // handled by click → file pick
    const hit = target.closest('.mockup-hit') as HTMLElement | null;
    if (!hit) return;
    ev.preventDefault();
    const idx = +hit.dataset.mockupIdx!;
    const st = useStage.getState();
    const m = st.comp.mockups[idx];
    const k = kRef.current;
    const f = st.comp.frame;

    if (ev.shiftKey && m.screenshot) {
      const box = (hit.querySelector('.screen-box') as HTMLElement) || hit;
      const rect = box.getBoundingClientRect();
      const sx = ev.clientX, sy = ev.clientY, ox = m.screenshot.x, oy = m.screenshot.y;
      const move = (e: PointerEvent) => {
        const nx = clamp(Math.round(ox + (e.clientX - sx) / rect.width * 100), -80, 80);
        const ny = clamp(Math.round(oy + (e.clientY - sy) / rect.height * 100), -80, 80);
        mutate(c => { const s2 = c.mockups[idx].screenshot; if (s2) { s2.x = nx; s2.y = ny; } });
      };
      const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
      return;
    }

    const sx = ev.clientX, sy = ev.clientY, ox = m.transform.x, oy = m.transform.y;
    const SNAPS = [0, -1 / 6, 1 / 6];
    const move = (e: PointerEvent) => {
      let nx = ox + (e.clientX - sx) / k / f.width;
      let ny = oy + (e.clientY - sy) / k / f.height;
      const g: Guide[] = [];
      const tol = 7 / k;
      SNAPS.forEach(sv => {
        if (Math.abs(nx - sv) * f.width < tol) { nx = sv; g.push({ axis: 'v', pct: (0.5 + sv) * 100 }); }
        if (Math.abs(ny - sv) * f.height < tol) { ny = sv; g.push({ axis: 'h', pct: (0.5 + sv) * 100 }); }
      });
      [-0.5, 0.5].forEach(edge => {
        if (Math.abs(nx - edge) * f.width < tol) { nx = edge; g.push({ axis: 'v', pct: (0.5 + edge) * 100 }); }
        if (Math.abs(ny - edge) * f.height < tol) { ny = edge; g.push({ axis: 'h', pct: (0.5 + edge) * 100 }); }
      });
      setGuides(g);
      mutate(c => { c.mockups[idx].transform.x = clamp(nx, -0.75, 0.75); c.mockups[idx].transform.y = clamp(ny, -0.75, 0.75); }, { customLayout: true });
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); setGuides([]); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  const onHostClick = (ev: React.MouseEvent) => {
    if ((ev.target as HTMLElement).closest('.screen-empty')) document.getElementById('filePick')?.click();
  };

  // space-pan drag on the wrap
  const onWrapPointerDown = (e: React.PointerEvent) => {
    if (!useStage.getState().ui.spacePan) return;
    e.preventDefault();
    const { panX: px, panY: py } = useStage.getState().ui;
    const sx = e.clientX - px, sy = e.clientY - py;
    const scaler = scalerRef.current!;
    const move = (ev: PointerEvent) => { scaler.style.transform = `translate(${ev.clientX - sx}px, ${ev.clientY - sy}px)`; };
    const up = (ev: PointerEvent) => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      setUi({ panX: ev.clientX - sx, panY: ev.clientY - sy });
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  const f = comp.frame;
  const suggestion = useStage(s => s.suggestion);

  return (
    <main className="stage">
      <div id="canvasWrap" ref={wrapRef} onPointerDown={onWrapPointerDown}>
        <div id="compScaler" ref={scalerRef}>
          <div id="compHost" ref={hostRef} onPointerDown={onHostPointerDown} onClick={onHostClick} />
          {guides.map((g, i) => (
            <div key={i} className={'guide ' + g.axis}
              style={g.axis === 'v' ? { left: g.pct + '%' } : { top: g.pct + '%' }} />
          ))}
          {panel === 'frame' && <BgHandles />}
        </div>
        <div id="dropOverlay" className={dropShow ? 'show' : ''}>Drop to place</div>
        <SuggestChip suggestion={suggestion} />
      </div>
      <div className="canvas-bar">
        <span className="dims">{f.width} × {f.height}</span>
        <span>·</span>
        <div className="zoomctl">
          <button onClick={() => setUi({ zoom: 'fit', panX: 0, panY: 0 })} title="Zoom to fit (⌘0)">Fit</button>
          <button onClick={() => setUi({ zoom: 1 })} title="Zoom to 100%">100%</button>
          <span id="zoomLabel" style={{ minWidth: 38, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{zoomLabel}</span>
        </div>
        <div className="grow" />
        <span className="privacy">Images never leave your browser. No uploads, no server.</span>
      </div>
    </main>
  );
}

/** Draggable background handles: mesh points, radial/conic centre, spotlight. */
function BgHandles() {
  const frame = useStage(s => s.comp.frame);
  const mutate = useStage(s => s.mutate);
  const setUi = useStage(s => s.setUi);
  const selMesh = useStage(s => s.ui.selMesh);
  const bg = frame.background;

  const drag = (onMove: (nx: number, ny: number) => void, onDone?: () => void) => (ev: React.PointerEvent) => {
    ev.preventDefault(); ev.stopPropagation();
    const scaler = (ev.currentTarget as HTMLElement).closest('#compScaler') as HTMLElement;
    const rect = scaler.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const ny = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      onMove(nx, ny);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); onDone?.(); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  const Handle = ({ x, y, color, sel, onDown }: any) => (
    <div className={'bghandle' + (sel ? ' sel' : '')} style={{ left: x * 100 + '%', top: y * 100 + '%', background: color }} onPointerDown={onDown} />
  );

  if (bg.type === 'gradient' && bg.mode === 'mesh') {
    return <>{bg.meshPoints.map((p, i) => (
      <Handle key={i} x={p.x} y={p.y} color={p.color} sel={selMesh === i}
        onDown={drag((nx, ny) => mutate(c => { c.frame.background.meshPoints[i].x = nx; c.frame.background.meshPoints[i].y = ny; }), () => setUi({ selMesh: i }))} />
    ))}</>;
  }
  if (bg.type === 'gradient' && (bg.mode === 'radial' || bg.mode === 'conic')) {
    return <Handle x={(bg.x ?? 50) / 100} y={(bg.y ?? 50) / 100} color="#ffffff"
      onDown={drag((nx, ny) => mutate(c => { c.frame.background.x = Math.round(nx * 100); c.frame.background.y = Math.round(ny * 100); }))} />;
  }
  if (bg.type === 'atmosphere' && frame.atmo.effect === 'spotlight') {
    return <Handle x={frame.atmo.params.x ?? 0.5} y={frame.atmo.params.y ?? 0.3} color="#FCCA46"
      onDown={drag((nx, ny) => mutate(c => { c.frame.atmo.params.x = nx; c.frame.atmo.params.y = ny; }))} />;
  }
  return null;
}

function SuggestChip({ suggestion }: { suggestion: ReturnType<typeof useStage.getState>['suggestion'] }) {
  const setSuggestion = useStage(s => s.setSuggestion);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!suggestion) { setVisible(false); return; }
    setVisible(true);
    const id = setTimeout(() => setVisible(false), 12000);
    return () => clearTimeout(id);
  }, [suggestion?.seq]);
  if (!suggestion) return <div id="suggestChip" role="status" />;
  return (
    <div id="suggestChip" role="status" className={visible ? 'show' : ''}>
      <span>{suggestion.text}</span>
      <button className="primary" onClick={() => { suggestion.action(); setSuggestion(null); }}>{suggestion.actionLabel}</button>
      <button className="x" title="Dismiss" onClick={() => setSuggestion(null)}>✕</button>
    </div>
  );
}
