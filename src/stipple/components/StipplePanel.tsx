import { useRef } from 'react';
import { Slider } from '@arabella/ui';
import { useStipple, MODES, DEFAULTS, QUICK_PRESETS, PRINT_PRESETS } from '../store';
import { loadImageFile, setSourceImage, setGradeImage, doExport, computeExportSize } from '../pipeline';

export function StipplePanel() {
  const s = useStipple();
  const fileRef = useRef<HTMLInputElement>(null);
  const gradeFileRef = useRef<HTMLInputElement>(null);
  const presetFileRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined, cb: (img: HTMLImageElement, name: string) => void) => {
    if (!f) return;
    loadImageFile(f).then(img => cb(img, f.name)).catch(() => s.showToast('Could not load that image'));
  };

  const L = Math.round(s.colorLimit);
  const colorLimitHint = s.mode === 'halftone'
    ? (L <= 2 ? '2 = single black ink screen.' : L === 3 ? '3 = full-colour CMY screen.' : '4+ = CMY with black generation (CMYK).')
    : `${L} tonal levels per channel — higher keeps more detail, lower reads more graphic.`;
  const modeHint = MODES.find(m => m.id === s.mode);

  const { w: exW, h: exH } = computeExportSize();
  const exSizeNote = !s.hasImage ? 'Load an image first.'
    : `${exW} × ${exH}px → ${(exW / 300).toFixed(2)} × ${(exH / 300).toFixed(2)}in @ 300 DPI`;
  const exFormatNote = s.exportFormat === 'svg'
    ? (s.mode === 'halftone' ? 'Halftone exports as true vector dots — infinitely scalable for print.'
      : 'This mode exports SVG as a high-resolution embedded raster (per-pixel dithering has no vector form).')
    : s.exportFormat === 'tiff' ? 'Uncompressed RGBA TIFF, tagged at 300 DPI for professional print workflows.'
      : 'Lossless raster PNG at the exact pixel size above.';
  const presetIdx = PRINT_PRESETS.findIndex(([, px]) => px === s.exportLongEdge);

  const savePreset = () => {
    const fields = Object.fromEntries(Object.keys(DEFAULTS).map(k => [k, (s as any)[k]]));
    const data = { version: 1, tool: 'stipple', state: fields };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'stipple-preset.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  const loadPreset = (f: File | undefined) => {
    if (!f) return;
    f.text().then(txt => {
      try {
        const data = JSON.parse(txt);
        if (!data.state) throw 0;
        s.applyPreset({ ...DEFAULTS, ...data.state });
        s.showToast('Preset loaded');
      } catch { s.showToast('Not a valid preset file'); }
    });
  };

  return (
    <aside>
      <section>
        <h2>Image</h2>
        <div className="dropzone" onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('drag'); }}
          onDragLeave={e => (e.currentTarget as HTMLElement).classList.remove('drag')}
          onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.remove('drag'); pick(e.dataTransfer.files[0], setSourceImage); }}>
          <b>Drop an image, or click to browse</b>
          PNG, JPG, WebP, processed entirely on your device
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { pick(e.target.files?.[0], setSourceImage); e.target.value = ''; }} />
        {s.hasImage && (
          <div className="imgmeta"><span>{s.imgName}</span><span>{s.imgDims}</span></div>
        )}
      </section>

      <section>
        <div className="btnrow">
          <button className="small" onClick={s.randomize}>🎲 Randomize</button>
          <button className="small" onClick={s.reset}>Reset</button>
        </div>
      </section>

      <section>
        <h2>Mode</h2>
        <div className="mode-grid">
          {MODES.map(m => (
            <button key={m.id} className={s.mode === m.id ? 'active' : ''} onClick={() => s.patch({ mode: m.id })}>
              <b>{m.name}</b><small>{m.id}</small>
            </button>
          ))}
        </div>
        <div className="mode-hint">{modeHint && <><b>{modeHint.name}.</b> {modeHint.hint}</>}</div>
      </section>

      <section>
        <h2>Adjust</h2>
        <Slider label="Scale" min={2} max={48} value={s.scale} onChange={v => s.patch({ scale: v })} />
        <Slider label="Intensity" min={0} max={100} value={s.intensity} def={100} onChange={v => s.patch({ intensity: v })} />
        <Slider label="Threshold" min={0} max={100} value={s.threshold} def={50} onChange={v => s.patch({ threshold: v })} />
        <Slider label="Contrast" min={-100} max={100} value={s.contrast} def={0} onChange={v => s.patch({ contrast: v })} />
        <Slider label="Grain" min={0} max={100} value={s.grain} def={0} onChange={v => s.patch({ grain: v })} />
        <Slider label="Direction" min={0} max={359} value={s.direction} def={0} onChange={v => s.patch({ direction: v })} />
        <Slider label="Color limit" min={2} max={8} value={s.colorLimit} onChange={v => s.patch({ colorLimit: v })} />
        <div className="note">{colorLimitHint}</div>
      </section>

      <section>
        <h2>Colour grade</h2>
        <div className="grade-row"><b>Grade from palette</b>
          <label className="switch">
            <input type="checkbox" checked={s.grade} onChange={e => s.setGrade(e.target.checked)} />
            <span className="track" /><span className="thumb" />
          </label>
        </div>
        {s.grade && (
          <div>
            <div className="segmented">
              <button className={s.gradeSource === 'image' ? 'active' : ''} onClick={() => s.setGradeSource('image')}>From image</button>
              <button className={s.gradeSource === 'custom' ? 'active' : ''} onClick={() => s.setGradeSource('custom')}>Custom source</button>
            </div>
            {s.gradeSource === 'custom' && (
              <div className="dropzone" style={{ marginBottom: 10 }} onClick={() => gradeFileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); pick(e.dataTransfer.files[0], img => { setGradeImage(img); s.showToast('Grade source loaded'); }); }}>
                <b>Drop a grade-source image</b>
                Its dominant colours become the target palette
              </div>
            )}
            <input ref={gradeFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { pick(e.target.files?.[0], img => { setGradeImage(img); s.showToast('Grade source loaded'); }); e.target.value = ''; }} />
            <Slider label="Grade bias" min={0} max={100} value={s.gradeBias} def={40} onChange={v => s.patch({ gradeBias: v })} />
            <div className="palette-strip">
              {(s.paletteColors || []).map((c, i) => <span key={i} style={{ background: `rgb(${c[0]},${c[1]},${c[2]})` }} />)}
            </div>
            <div className="btnrow" style={{ marginTop: 8 }}>
              <button className="small" onClick={() => { s.reExtract(); s.showToast('Palette re-extracted'); }}>↻ Re-extract palette</button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2>Compare</h2>
        <div className="note">Drag the handle on the canvas to reveal the original, or press <b>C</b> to flip fully.</div>
        <div className="btnrow" style={{ marginTop: 8 }}>
          <button className="small" onClick={() => s.setComparePos(0)}>Reset compare</button>
        </div>
      </section>

      <section>
        <h2>Presets</h2>
        <div className="preset-grid">
          {QUICK_PRESETS.map(([name, cfg]) => (
            <button key={name} className="small" onClick={() => s.applyPreset(cfg)}>{name}</button>
          ))}
        </div>
        <div className="btnrow">
          <button className="small" onClick={savePreset}>Save .json</button>
          <button className="small" onClick={() => presetFileRef.current?.click()}>Load .json</button>
        </div>
        <input ref={presetFileRef} type="file" accept="application/json" className="hidden"
          onChange={e => { loadPreset(e.target.files?.[0]); e.target.value = ''; }} />
      </section>

      <section>
        <h2>Export</h2>
        <div className="row">
          <select value={presetIdx >= 0 ? presetIdx : 0} onChange={e => s.patch({ exportLongEdge: PRINT_PRESETS[+e.target.value][1] })}>
            {PRINT_PRESETS.map(([label], i) => <option key={i} value={i}>{label}</option>)}
          </select>
        </div>
        <div className="row">
          <label style={{ minWidth: 'auto' }}>Long edge (px)</label>
          <input type="number" min={0} step={10} value={s.exportLongEdge} style={{ maxWidth: 110 }}
            onChange={e => s.patch({ exportLongEdge: +e.target.value })} />
        </div>
        <div className="meta">{exSizeNote}</div>
        <div className="row" style={{ marginTop: 10 }}>
          <select value={s.exportFormat} onChange={e => s.patch({ exportFormat: e.target.value })}>
            <option value="png">PNG (raster, lossless)</option>
            <option value="svg">SVG (vector where possible)</option>
            <option value="tiff">TIFF (uncompressed, 300 DPI)</option>
          </select>
        </div>
        <div className="check-row">
          <input type="checkbox" id="exTransparent" checked={s.transparent} onChange={e => s.patch({ transparent: e.target.checked })} />
          <label htmlFor="exTransparent">Transparent background where possible</label>
        </div>
        <button className="primary" style={{ width: '100%', marginTop: 10 }} onClick={doExport}>Export</button>
        <div className="note">{exFormatNote}</div>
      </section>
    </aside>
  );
}
