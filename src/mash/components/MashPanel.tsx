import { useRef } from 'react';
import { Slider } from '@arabella/ui';
import { useMash, PALETTES, SIZE_PRESETS, SHAPES, rgbToHex } from '../store';
import { doExport, doCopy, gpuMaxSize, savePreset, loadPreset } from '../pipeline';

export function MashPanel() {
  const s = useMash();
  const presetFileRef = useRef<HTMLInputElement>(null);

  const paletteCols = s.activePalette >= 0 ? PALETTES[s.activePalette][1] : s.customPalette;
  const sizeIdx = SIZE_PRESETS.findIndex(([, pw, ph]) => pw === s.w && ph === s.h);
  const sel = s.points[s.selected];

  return (
    <aside>
      <section>
        <h2>Canvas</h2>
        <div className="btnrow">
          <button className="small" onClick={s.toggleHideHandles}>{s.hideHandles ? 'Show points' : 'Hide points'}</button>
          <button className="small" onClick={s.randomAll}>Randomize</button>
        </div>
      </section>

      <section>
        <h2>Canvas size</h2>
        <div className="row">
          <select value={sizeIdx > 0 ? sizeIdx : 0} onChange={e => { const [, pw, ph] = SIZE_PRESETS[+e.target.value]; if (pw) s.setSize(pw, ph); }}>
            {SIZE_PRESETS.map(([label], i) => <option key={i} value={i}>{label}</option>)}
          </select>
        </div>
        <div className="row">
          <input type="number" min={16} max={16384} value={s.w} aria-label="Width px" onChange={e => s.setSize(+e.target.value, s.h)} />
          <span style={{ color: 'var(--muted)' }}>×</span>
          <input type="number" min={16} max={16384} value={s.h} aria-label="Height px" onChange={e => s.setSize(s.w, +e.target.value)} />
          <button className="small" title="Swap width/height" onClick={s.swap}>⇄</button>
        </div>
        <div className="note">GPU max export: {gpuMaxSize()}×{gpuMaxSize()}px on this machine.</div>
      </section>

      <section>
        <h2>Palettes</h2>
        <div className="row">
          <select value={s.activePalette} onChange={e => s.setActivePalette(+e.target.value)}>
            {PALETTES.map(([name], i) => <option key={i} value={i}>{name}</option>)}
            <option value={-1}>Custom palette</option>
          </select>
        </div>
        <div className="row"><span className="strip">{paletteCols.map((c, i) => <span key={i} style={{ background: c }} />)}</span></div>
      </section>

      {s.activePalette < 0 && (
        <section>
          <h2>Custom palette</h2>
          <div className="chips">
            {s.customPalette.map((hex, i) => (
              <span className="chip" key={i}>
                <input type="color" value={hex} onChange={e => s.setCustomColor(i, e.target.value)} />
                <button className="rm" onClick={() => s.removeColor(i)}>×</button>
              </span>
            ))}
          </div>
          <div className="btnrow">
            <button className="small" onClick={s.addColor}>+ Colour</button>
            <button className="small" onClick={s.applyCustom}>Apply palette</button>
          </div>
        </section>
      )}

      <section>
        <h2>Colour points</h2>
        <div className="points">
          {s.points.map((p, i) => (
            <button key={i} className={'pt-chip' + (i === s.selected ? ' sel' : '')} title={`Point ${i + 1}`}
              style={{ background: rgbToHex(p.color) }} onClick={() => s.selectPoint(i)} />
          ))}
        </div>
        <div className="btnrow">
          <button className="small" onClick={s.addPoint}>+ Point</button>
          <button className="small" onClick={s.scatter}>Scatter</button>
          <button className="small" onClick={s.shuffleColors}>Shuffle colours</button>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label style={{ minWidth: 0 }}>Varied shapes</label>
          <input type="checkbox" style={{ marginLeft: 'auto' }} checked={s.varied} onChange={e => s.setVaried(e.target.checked)} />
          <button className="small" title="Re-roll shapes & rotations" onClick={s.reroll}>🎲</button>
        </div>
        {sel && (
          <div className="selpoint">
            <div className="row"><label>Colour</label><input type="color" value={rgbToHex(sel.color)} onChange={e => s.setPointColor(e.target.value)} /></div>
            <div className="row"><label>Shape</label>
              <select value={sel.shape} onChange={e => s.setPointShape(+e.target.value)}>
                {SHAPES.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <Slider label="Rotation" min={0} max={6.283} step={0.02} value={sel.angle} onChange={s.setPointAngle} />
            <Slider label="Strength" min={0.1} max={4} step={0.05} value={sel.intensity} onChange={s.setPointIntensity} />
            <div className="btnrow"><button className="small danger" onClick={s.deletePoint}>Delete point</button></div>
          </div>
        )}
        <div className="note">Drag points on the canvas. Double-click the canvas to add a point. Varied shapes gives every point a different emission shape — ellipse, diamond, blob, star, stripe…</div>
      </section>

      <section>
        <h2>Appearance</h2>
        <Slider label="Softness" min={1} max={8} step={0.05} value={s.power} onChange={v => s.setLook('power', v)} />
        <Slider label="Warp" min={0} max={1.2} step={0.01} value={s.warp} onChange={v => s.setLook('warp', v)} />
        <Slider label="Warp scale" min={0.3} max={6} step={0.05} value={s.warpScale} onChange={v => s.setLook('warpScale', v)} />
        <Slider label="Blur" min={0} max={0.35} step={0.005} value={s.blur} onChange={v => s.setLook('blur', v)} />
        <Slider label="Hue shift" min={-3.14} max={3.14} step={0.02} value={s.hue} onChange={v => s.setLook('hue', v)} />
        <Slider label="Grain" min={0} max={0.3} step={0.005} value={s.grain} onChange={v => s.setLook('grain', v)} />
        <Slider label="Saturation" min={0} max={2} step={0.02} value={s.sat} onChange={v => s.setLook('sat', v)} />
        <Slider label="Brightness" min={0.4} max={1.7} step={0.02} value={s.bright} onChange={v => s.setLook('bright', v)} />
        <Slider label="Contrast" min={0.5} max={1.8} step={0.02} value={s.contrast} onChange={v => s.setLook('contrast', v)} />
        <div className="btnrow">
          <button className="small" onClick={s.newSeed}>🎲 New warp seed</button>
          <button className="small" onClick={s.resetLook}>Reset look</button>
        </div>
      </section>

      <section>
        <h2>Export</h2>
        <div className="row">
          <label>Format</label>
          <select value={s.exFormat} onChange={e => s.setExFormat(e.target.value)}>
            <option value="image/png">PNG (lossless)</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </div>
        {s.exFormat !== 'image/png' && (
          <Slider label="Quality" min={0.5} max={1} step={0.01} value={s.exQuality} onChange={s.setExQuality} />
        )}
        <button className="primary" style={{ width: '100%' }} onClick={doExport}>Export at exact size</button>
        <div className="btnrow" style={{ marginTop: 8 }}><button className="small" onClick={doCopy}>📋 Copy image to clipboard</button></div>
        <div className="note">Exports render at the full pixel dimensions above. The preview is only a scaled view.<br />Shortcuts: <b>R</b> randomize · <b>V</b> vary shapes · <b>S</b> scatter · <b>E</b> export · <b>H</b> hide points</div>
      </section>

      <section>
        <h2>Presets</h2>
        <div className="btnrow">
          <button className="small" onClick={savePreset}>Save .json</button>
          <button className="small" onClick={() => presetFileRef.current?.click()}>Load .json</button>
        </div>
        <input ref={presetFileRef} type="file" accept="application/json" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) loadPreset(f); e.target.value = ''; }} />
      </section>
    </aside>
  );
}
