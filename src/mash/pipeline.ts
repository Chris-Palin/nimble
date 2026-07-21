import { createRenderer } from './core/gl';
import { useMash } from './store';

/* Export + clipboard — renders at the exact pixel size in its own GL context
   (lazily created) so huge exports never disturb the preview. */

const exportCanvas = document.createElement('canvas');
let exporter: any = null;
function getExporter() { if (!exporter) exporter = createRenderer(exportCanvas); return exporter; }

const toast = (m: string) => useMash.getState().showToast(m);

export function doExport() {
  const st = useMash.getState();
  const { w, h } = st;
  const ex = getExporter();
  if (w > ex.maxSize || h > ex.maxSize) {
    toast(`This GPU caps exports at ${ex.maxSize}px per side. Requested ${w}×${h}.`);
    return;
  }
  const fmt = st.exFormat;
  const q = st.exQuality;
  toast(`Rendering ${w}×${h}…`);
  setTimeout(() => {
    ex.render(st, w, h);
    const gl = ex.gl;
    if (gl.drawingBufferWidth !== w || gl.drawingBufferHeight !== h) {
      toast(`GPU could not allocate ${w}×${h}. Got ${gl.drawingBufferWidth}×${gl.drawingBufferHeight}. Try a smaller size.`);
      return;
    }
    exportCanvas.toBlob(blob => {
      if (!blob) { toast('Export failed. The format may be unsupported.'); return; }
      const ext = fmt === 'image/png' ? 'png' : fmt === 'image/jpeg' ? 'jpg' : 'webp';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `mesh-gradient-${w}x${h}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast(`Exported ${w}×${h} ${ext.toUpperCase()} (${(blob.size / 1048576).toFixed(1)} MB)`);
    }, fmt, fmt === 'image/png' ? undefined : q);
  }, 30);
}

export function doCopy() {
  const st = useMash.getState();
  const { w, h } = st;
  const ex = getExporter();
  if (w > ex.maxSize || h > ex.maxSize) { toast(`Too large for this GPU (max ${ex.maxSize}px)`); return; }
  toast(`Rendering ${w}×${h}…`);
  setTimeout(() => {
    ex.render(st, w, h);
    exportCanvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob! })]);
        toast(`Copied ${w}×${h} PNG to clipboard`);
      } catch { toast('Clipboard blocked by browser. Use Export instead'); }
    }, 'image/png');
  }, 30);
}

export function gpuMaxSize(): number { return getExporter()?.maxSize ?? 0; }

export function savePreset() {
  const st = useMash.getState();
  const data = {
    version: 1,
    state: {
      w: st.w, h: st.h, seed: st.seed, points: st.points,
      power: st.power, warp: st.warp, warpScale: st.warpScale, grain: st.grain,
      sat: st.sat, bright: st.bright, contrast: st.contrast, blur: st.blur, hue: st.hue,
    },
    customPalette: st.customPalette,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'mesh-gradient-preset.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function loadPreset(file: File) {
  file.text().then(txt => {
    try {
      const data = JSON.parse(txt);
      if (!data.state || !Array.isArray(data.state.points)) throw 0;
      useMash.getState().loadPresetData(data);
      toast('Preset loaded');
    } catch { toast('Not a valid preset file'); }
  });
}
