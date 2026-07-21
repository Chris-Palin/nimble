import { useEffect, useRef } from 'react';
import * as RNS from '../core/dither';
import { useStipple, syncCore } from '../store';
import { loadImageFile, setSourceImage } from '../pipeline';

const R = RNS as unknown as Record<string, any>;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const PREVIEW_MAX = 1000;

/** The preview stage: original vs processed canvases with a drag-to-compare
 *  handle. Rendering runs the preserved composeFrame() at preview resolution. */
export function StippleStage() {
  const hasImage = useStipple(s => s.hasImage);
  const comparePos = useStipple(s => s.comparePos);
  const mainRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const origRef = useRef<HTMLCanvasElement>(null);
  const procRef = useRef<HTMLCanvasElement>(null);
  const rendering = useRef(false);

  const computePreviewSize = () => {
    const src = R.getSourceImg();
    const main = mainRef.current;
    if (!src || !main) return { w: 0, h: 0 };
    const ar = src.naturalWidth / src.naturalHeight;
    const availW = Math.max(120, main.clientWidth - 56), availH = Math.max(120, main.clientHeight - 56);
    let w = Math.min(availW, PREVIEW_MAX), h = w / ar;
    if (h > availH) { h = Math.min(availH, PREVIEW_MAX); w = h * ar; }
    return { w: Math.max(40, Math.round(w)), h: Math.max(40, Math.round(h)) };
  };

  const layoutStage = () => {
    const stage = stageRef.current!;
    if (!R.getSourceImg()) { stage.style.width = '560px'; stage.style.height = '360px'; return; }
    const { w, h } = computePreviewSize();
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    requestRender();
  };

  const updateCompareClip = () => {
    const pos = useStipple.getState().comparePos;
    if (procRef.current) procRef.current.style.clipPath = `inset(0 0 0 ${pos}%)`;
  };

  const requestRender = () => {
    if (!R.getSourceImg() || rendering.current) return;
    rendering.current = true;
    requestAnimationFrame(() => {
      rendering.current = false;
      const { w, h } = computePreviewSize();
      if (w < 10 || h < 10) return;
      syncCore(useStipple.getState() as any);
      const { finalData, origData } = R.composeFrame(w, h);
      const proc = procRef.current!, orig = origRef.current!;
      proc.width = w; proc.height = h; orig.width = w; orig.height = h;
      proc.getContext('2d')!.putImageData(finalData, 0, 0);
      orig.getContext('2d')!.putImageData(origData, 0, 0);
      updateCompareClip();
    });
  };

  // re-render on any control change; re-layout on image change
  useEffect(() => {
    const unsub = useStipple.subscribe(() => requestRender());
    return unsub;
  }, []);
  useEffect(() => { layoutStage(); }, [hasImage]);
  useEffect(() => { updateCompareClip(); }, [comparePos]);
  useEffect(() => {
    const onResize = () => layoutStage();
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  // drag-to-compare
  const onHandleDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = stageRef.current!.getBoundingClientRect();
      useStipple.getState().setComparePos(((ev.clientX - rect.left) / rect.width) * 100);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) loadImageFile(f).then(img => setSourceImage(img, f.name)).catch(() => useStipple.getState().showToast('Could not load that image'));
  };

  return (
    <main className="stipple-main" ref={mainRef}>
      <div id="stage" ref={stageRef} onDragOver={e => e.preventDefault()} onDrop={onDrop}>
        <canvas id="origCanvas" ref={origRef} />
        <canvas id="procCanvas" ref={procRef} style={{ clipPath: `inset(0 0 0 ${comparePos}%)` }} />
        {hasImage && (
          <div id="compareHandle" style={{ left: comparePos + '%' }} onPointerDown={onHandleDown} />
        )}
        {!hasImage && (
          <div id="stagePlaceholder"><b>No image loaded</b>Drop a photo into the panel on the left to begin dithering.</div>
        )}
        <div id="kbdHint"><kbd>R</kbd> randomize · <kbd>X</kbd> reset · <kbd>C</kbd> compare · <kbd>E</kbd> export</div>
      </div>
    </main>
  );
}
