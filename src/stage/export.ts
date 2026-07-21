import * as htmlToImage from 'html-to-image';
import * as RNS from './core/render';
import { useStage, type Comp, type ImageRec } from './store';

const R = RNS as unknown as Record<string, any>;

export type ExportFormat = 'png' | 'jpg' | 'webp';
export type ExportSettings = { format: ExportFormat; quality: number; scale: number };

// live export settings, edited by the export popover
export const exportSettings: ExportSettings = { format: 'png', quality: 0.92, scale: 1 };

async function dataURLtoBlob(url: string): Promise<Blob> { return (await fetch(url)).blob(); }

/** Renders a composition off-screen at full resolution and serialises it with
 *  html-to-image — the exact original export path, so output is pixel-identical. */
export async function renderCompToBlob(
  comp: Comp, images: Record<string, ImageRec>, scale: number, format: ExportFormat, quality: number,
): Promise<Blob> {
  // feed the renderer mirrors the export state (no hover-preview, images available)
  R.setImages(images);
  R.setRenderUi({ travel: false, previewLayout: null });
  useStage.setState(s => { s.ui.exporting = true; });
  const frozenT = performance.now() / 1000;
  const stage = document.createElement('div');
  Object.assign(stage.style, {
    position: 'fixed', left: '-100000px', top: '0', zIndex: '-1',
    width: comp.frame.width + 'px', height: comp.frame.height + 'px',
  });
  stage.appendChild(R.buildComposition(comp, { interactive: false, atmoTime: frozenT, atmoScale: scale }));
  document.body.appendChild(stage);
  try {
    await document.fonts.ready;
    await Promise.all([...stage.querySelectorAll('img')].map((i: any) => i.decode().catch(() => {})));
    const node = stage.firstChild as HTMLElement;
    const opts: any = {
      width: comp.frame.width, height: comp.frame.height,
      pixelRatio: scale, cacheBust: false,
      backgroundColor: comp.frame.transparent ? null : undefined,
    };
    let blob: Blob;
    if (format === 'jpg') {
      blob = await dataURLtoBlob(await htmlToImage.toJpeg(node, { ...opts, quality, backgroundColor: '#000000' }));
    } else if (format === 'webp') {
      const canvas = await htmlToImage.toCanvas(node, opts);
      blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/webp', quality));
    } else {
      blob = await dataURLtoBlob(await htmlToImage.toPng(node, opts));
    }
    return blob;
  } finally {
    stage.remove();
    // restore the mirrors to live state
    const st = useStage.getState();
    R.setImages(st.images);
    R.setRenderUi({ travel: false, previewLayout: st.ui.previewLayout });
    useStage.setState(s => { s.ui.exporting = false; });
  }
}

function exportFilename(comp: Comp, ext: string): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const preset = comp.layoutPresetId || 'custom';
  return `nimble-stage_${preset}_${comp.frame.width}x${comp.frame.height}_${ts}.${ext}`;
}

function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}

export async function doExport() {
  const { format, quality, scale } = exportSettings;
  const { comp, images, showToast } = useStage.getState();
  const f = comp.frame;
  showToast(`Rendering ${f.width * scale}×${f.height * scale}…`);
  try {
    const blob = await renderCompToBlob(comp, images, scale, format, quality);
    downloadBlob(blob, exportFilename(comp, format === 'jpg' ? 'jpg' : format));
    showToast(`Exported ${f.width * scale}×${f.height * scale} ${format.toUpperCase()} (${(blob.size / 1048576).toFixed(1)} MB)`);
  } catch (err: any) { showToast(err?.message || 'Export failed'); }
}

export async function doCopy() {
  const { comp, images, showToast } = useStage.getState();
  showToast('Rendering…');
  try {
    const blob = await renderCompToBlob(comp, images, exportSettings.scale, 'png', 1);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    showToast('Copied to clipboard');
  } catch { showToast('Clipboard blocked. Use Export instead'); }
}

export const BATCH_TARGETS = ['ig-square', 'ig-portrait', 'ig-story', 'x-post', 'og', 'yt-thumb', 'li-post'];

/** Batch export several social sizes, re-solving the layout for each ratio
 *  rather than naively cropping — the original doBatch(). */
export async function doBatch(selected: string[]) {
  const { comp, images, showToast } = useStage.getState();
  if (!selected.length) { showToast('Pick at least one size'); return; }
  const { format, quality, scale } = exportSettings;
  const DIM_BY_ID: Record<string, any> = R.DIM_BY_ID;
  showToast(`Batch: rendering ${selected.length} sizes…`);
  for (const id of selected) {
    const [, , w, h] = DIM_BY_ID[id];
    const c2: Comp = JSON.parse(JSON.stringify(comp));
    c2.frame.width = w; c2.frame.height = h; c2.frame.presetId = id;
    const lid = c2.layoutPresetId || 'centered';
    const solved: any[] = R.solvedFor(lid, c2.frame);
    while (c2.mockups.length < solved.length) {
      const cm = JSON.parse(JSON.stringify(c2.mockups[0])); cm.id = R.uid(); c2.mockups.push(cm);
    }
    c2.mockups.length = solved.length;
    solved.forEach((t, i) => Object.assign(c2.mockups[i].transform, {
      scale: t.scale, x: t.x, y: t.y, rotate: t.rotate || 0,
      rotateX: t.rotateX || 0, rotateY: t.rotateY || 0, perspective: t.perspective || 1200,
    }));
    c2.layoutPresetId = lid;
    try {
      const blob = await renderCompToBlob(c2, images, scale, format, quality);
      downloadBlob(blob, exportFilename(c2, format === 'jpg' ? 'jpg' : format));
      await new Promise(r => setTimeout(r, 450));
    } catch (err: any) { showToast(`Failed at ${w}×${h}: ${err?.message}`); return; }
  }
  showToast(`Batch done: ${selected.length} files`);
}
