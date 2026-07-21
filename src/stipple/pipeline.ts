import * as RNS from './core/dither';
import { useStipple } from './store';

const R = RNS as unknown as Record<string, any>;

const toast = (msg: string) => useStipple.getState().showToast(msg);
function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = url;
  });
}

export function setSourceImage(img: HTMLImageElement, name: string) {
  R.setSourceImg(img);
  useStipple.getState().onImageLoaded(name || 'image', img.naturalWidth, img.naturalHeight);
}

export function setGradeImage(img: HTMLImageElement) {
  R.setGradeImg(img);
  useStipple.getState().onGradeLoaded();
}

export function computeExportSize() {
  const src = R.getSourceImg();
  if (!src) return { w: 0, h: 0 };
  const nW = src.naturalWidth, nH = src.naturalHeight;
  const chosen = useStipple.getState().exportLongEdge || 0;
  if (!chosen) return { w: nW, h: nH };
  const ar = nW / nH;
  return nW >= nH
    ? { w: chosen, h: Math.max(1, Math.round(chosen / ar)) }
    : { w: Math.max(1, Math.round(chosen * ar)), h: chosen };
}

const exportCanvas = document.createElement('canvas');
const exportCtx = exportCanvas.getContext('2d')!;

export function doExport() {
  const st = useStipple.getState();
  if (!R.getSourceImg()) { toast('Load an image first'); return; }
  const { w, h } = computeExportSize();
  if (w < 1 || h < 1) { toast('Invalid export size'); return; }
  toast(`Rendering ${w}×${h}…`);
  setTimeout(() => {
    let frame;
    try { frame = R.composeFrame(w, h); }
    catch { toast('Export failed — try a smaller size'); return; }
    exportCanvas.width = w; exportCanvas.height = h;
    exportCtx.putImageData(frame.finalData, 0, 0);
    const fmt = st.exportFormat;
    if (fmt === 'tiff') {
      const blob = R.encodeTIFF(w, h, frame.finalData.data);
      downloadBlob(blob, `stipple-${st.mode}-${w}x${h}.tiff`);
      toast(`Exported ${w}×${h} TIFF (300 DPI)`);
      return;
    }
    if (fmt === 'svg') {
      const dataURL = st.mode === 'halftone' ? '' : exportCanvas.toDataURL('image/png');
      const svg = R.buildSVGVector(w, h, frame.pre, dataURL);
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `stipple-${st.mode}-${w}x${h}.svg`);
      toast(`Exported ${w}×${h} SVG`);
      return;
    }
    exportCanvas.toBlob(blob => {
      if (!blob) { toast('Export failed'); return; }
      downloadBlob(blob, `stipple-${st.mode}-${w}x${h}.png`);
      toast(`Exported ${w}×${h} PNG (${(blob.size / 1048576).toFixed(1)} MB)`);
    }, 'image/png');
  }, 30);
}
