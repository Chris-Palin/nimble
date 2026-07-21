import { useEffect, useRef } from 'react';
import { createRenderer } from '../core/gl';
import { useMash, rgbToHex } from '../store';

/** WebGL preview + draggable colour-point handles. The renderer core is
 *  preserved verbatim; this component just sizes the stage, feeds it the store
 *  state each frame, and maps pointer drags to point positions. */
export function MashStage() {
  const points = useMash(s => s.points);
  const selected = useMash(s => s.selected);
  const hideHandles = useMash(s => s.hideHandles);
  const w = useMash(s => s.w);
  const h = useMash(s => s.h);

  const mainRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handlesRef = useRef<HTMLDivElement>(null);
  const preview = useRef<any>(null);
  const size = useRef({ w: 100, h: 100 });
  const queued = useRef(false);

  const requestRender = () => {
    if (queued.current || !preview.current) return;
    queued.current = true;
    requestAnimationFrame(() => {
      queued.current = false;
      const pw = Math.max(2, Math.round(size.current.w * devicePixelRatio));
      const ph = Math.max(2, Math.round(size.current.h * devicePixelRatio));
      preview.current.render(useMash.getState(), pw, ph);
    });
  };

  const layoutStage = () => {
    const main = mainRef.current, stage = stageRef.current;
    if (!main || !stage) return;
    const st = useMash.getState();
    const availW = main.clientWidth - 56, availH = main.clientHeight - 56;
    const ar = st.w / st.h;
    let ww = availW, hh = ww / ar;
    if (hh > availH) { hh = availH; ww = hh * ar; }
    size.current = { w: Math.max(60, ww), h: Math.max(60, hh) };
    stage.style.width = size.current.w + 'px';
    stage.style.height = size.current.h + 'px';
    requestRender();
  };

  useEffect(() => {
    preview.current = createRenderer(canvasRef.current);
    layoutStage();
    const unsub = useMash.subscribe(() => requestRender());
    const onResize = () => layoutStage();
    addEventListener('resize', onResize);
    return () => { unsub(); removeEventListener('resize', onResize); };
  }, []);
  useEffect(() => { layoutStage(); }, [w, h]);

  const onHandleDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    useMash.getState().selectPoint(i);
    const rect = handlesRef.current!.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const x = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
      useMash.getState().movePoint(i, x, y);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  const onDblClick = (e: React.MouseEvent) => {
    const rect = handlesRef.current!.getBoundingClientRect();
    useMash.getState().addPointAt((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
  };

  return (
    <main className={'mash-main' + (hideHandles ? ' hide-handles' : '')} ref={mainRef}>
      <div id="stage" ref={stageRef}>
        <canvas id="glcanvas" ref={canvasRef} />
        <div id="handles" ref={handlesRef} onDoubleClick={onDblClick}>
          {points.map((p, i) => (
            <div key={i} className={'handle' + (i === selected ? ' sel' : '')}
              style={{ left: p.x * 100 + '%', top: p.y * 100 + '%', background: rgbToHex(p.color) }}
              onPointerDown={onHandleDown(i)} />
          ))}
        </div>
        <div id="hint">drag points · double-click to add · R random · V vary shapes</div>
      </div>
    </main>
  );
}
