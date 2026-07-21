import { useMemo, useRef, useState } from 'react';
import { Section, Row, Slider, Segmented, Checkbox, Select, ColorField } from '@arabella/ui';
import * as RNS from '../core/render';
import { useStage } from '../store';

const R = RNS as unknown as Record<string, any>;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const BRAND: string[] = R.BRAND;
const NEUTRALS: string[] = R.NEUTRALS;
const DIM_GROUPS: any[] = R.DIM_GROUPS;
const DIM_BY_ID: Record<string, any> = R.DIM_BY_ID;
const GRAD_PRESETS: string[][] = R.GRAD_PRESETS;
const ATMO_DEFS: Record<string, any> = R.ATMO_DEFS;
const ATMO_PAINTERS: Record<string, any> = R.ATMO_PAINTERS;
const TEXTURE_IDS: [string, string][] = R.TEXTURE_IDS;

function Swatch({ color, on, onClick }: { color: string; on?: boolean; onClick: () => void }) {
  return <button className={'sw' + (on ? ' on' : '')} style={{ background: color }} title={color} onClick={onClick} />;
}

export function FramePanel() {
  const frame = useStage(s => s.comp.frame);
  const mutate = useStage(s => s.mutate);
  const reSolveLayout = useStage(s => s.reSolveLayout);
  const showToast = useStage(s => s.showToast);
  const pushRecent = useStage(s => s.pushRecent);
  const recentColors = useStage(s => s.ui.recentColors);
  const selStop = useStage(s => s.ui.selStop);
  const selMesh = useStage(s => s.ui.selMesh);
  const setUi = useStage(s => s.setUi);

  const f = frame;
  const bg = f.background;
  const type = bg.type;

  return (
    <>
      <Dimensions f={f} mutate={mutate} reSolveLayout={reSolveLayout} />

      <Section title="Background">
        <Segmented mini
          options={[['solid', 'Solid'], ['gradient', 'Grad'], ['atmosphere', 'Atmos'], ['texture', 'Texture'], ['image', 'Image']]}
          value={type}
          onChange={v => mutate(c => { c.frame.background.type = v as any; c.frame.transparent = false; })}
        />
        <div style={{ marginTop: 10 }}>
          {type === 'solid' && (
            <>
              <div className="swatches">
                {[...BRAND, '#FFFFFF', '#0B0B0F', ...NEUTRALS].map((colr, i) => (
                  <Swatch key={i} color={colr} on={f.solid.color.toUpperCase() === colr.toUpperCase()}
                    onClick={() => { mutate(c => { c.frame.solid.color = colr; }); pushRecent(colr); }} />
                ))}
              </div>
              <ColorField label="Colour" value={f.solid.color}
                onChange={v => mutate(c => { c.frame.solid.color = v; })} onCommit={pushRecent} />
              {recentColors.length > 0 && (
                <Section title="Recent">
                  <div className="swatches">
                    {recentColors.map((colr, i) => (
                      <Swatch key={i} color={colr} onClick={() => mutate(c => { c.frame.solid.color = colr; })} />
                    ))}
                  </div>
                </Section>
              )}
            </>
          )}

          {type === 'gradient' && (
            <GradientBg f={f} mutate={mutate} showToast={showToast} selStop={selStop} selMesh={selMesh} setUi={setUi} />
          )}

          {type === 'atmosphere' && (
            <AtmosphereBg f={f} mutate={mutate} />
          )}

          {type === 'texture' && (
            <>
              <div className="chips">
                {TEXTURE_IDS.map(([tid, label]) => (
                  <button key={tid} className={'chip' + (f.texture.textureId === tid ? ' on' : '')}
                    onClick={() => mutate(c => { c.frame.texture.textureId = tid; })}>
                    <div className="cthumb" style={{ backgroundImage: `url(${R.textureURL(tid)})`, backgroundSize: '160px' }} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <ColorField label="Base" value={f.texture.base} onChange={v => mutate(c => { c.frame.texture.base = v; })} />
              <Select label="Blend"
                options={['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'color-burn', 'color-dodge', 'luminosity'].map(b => [b, b] as [string, string])}
                value={f.texture.blendMode} onChange={v => mutate(c => { c.frame.texture.blendMode = v; })} />
              <Slider label="Opacity" min={0} max={100} value={f.texture.opacity} def={40}
                onChange={v => mutate(c => { c.frame.texture.opacity = v; })} />
              <Row label="Tint">
                <input type="color" value={f.texture.tint || '#645DD7'}
                  onChange={e => mutate(c => { c.frame.texture.tint = e.target.value; })} />
                <button className="small" onClick={() => mutate(c => { c.frame.texture.tint = c.frame.texture.tint ? null : (f.texture.tint || '#645DD7'); })}>
                  {f.texture.tint ? 'Clear' : 'Apply'}
                </button>
              </Row>
            </>
          )}

          {type === 'image' && (
            <ImageBg f={f} mutate={mutate} />
          )}
        </div>
      </Section>

      <Section title="Finish">
        <Slider label="Grain" min={0} max={100} value={f.grain} def={10} onChange={v => mutate(c => { c.frame.grain = v; })} />
        <Slider label="Vignette" min={0} max={100} value={f.vignette.amount} def={0} onChange={v => mutate(c => { c.frame.vignette.amount = v; })} />
        <Slider label="Vig. radius" min={0} max={100} value={f.vignette.radius} def={60} onChange={v => mutate(c => { c.frame.vignette.radius = v; })} />
        <Checkbox label="Dither (kills banding)" checked={f.dither} onChange={v => mutate(c => { c.frame.dither = v; })} />
        <Slider label="Padding" min={0} max={20} value={f.padding} def={0} onChange={v => mutate(c => { c.frame.padding = v; })} />
        <Slider label="Corner radius" min={0} max={200} value={f.cornerRadius} def={0} onChange={v => mutate(c => { c.frame.cornerRadius = v; })} />
        <Slider label="Border" min={0} max={40} value={f.border.width} def={0} onChange={v => mutate(c => { c.frame.border.width = v; })} />
        {f.border.width > 0 && (
          <ColorField label="Border colour" value={f.border.color} onChange={v => mutate(c => { c.frame.border.color = v; })} />
        )}
        <Checkbox label="Transparent background" checked={f.transparent} onChange={v => mutate(c => { c.frame.transparent = v; })} />
        {f.transparent && <div className="note">Export as PNG to keep the alpha channel.</div>}
      </Section>
    </>
  );
}

function Dimensions({ f, mutate, reSolveLayout }: any) {
  const [locked, setLocked] = useState(false);
  const selValue = f.presetId && DIM_BY_ID[f.presetId] ? f.presetId : '__custom';

  const applySize = (nextW: number, nextH: number, fromW: boolean) => {
    let w = clamp(Math.round(nextW) || 1080, 64, 4096);
    let h = clamp(Math.round(nextH) || 1080, 64, 4096);
    if (locked) {
      const ratio = f.width / f.height;
      if (fromW) h = clamp(Math.round(w / ratio), 64, 4096);
      else w = clamp(Math.round(h * ratio), 64, 4096);
    }
    const match: any = Object.values(DIM_BY_ID).find((d: any) => d[2] === w && d[3] === h);
    mutate((c: any) => { c.frame.width = w; c.frame.height = h; c.frame.presetId = match ? match[0] : null; });
    reSolveLayout();
  };

  return (
    <Section title="Dimensions">
      <Row>
        <select value={selValue} onChange={e => {
          const v = e.target.value;
          if (v === '__custom') return;
          const [, , w, h] = DIM_BY_ID[v];
          mutate((c: any) => { c.frame.width = w; c.frame.height = h; c.frame.presetId = v; });
          reSolveLayout();
        }}>
          {DIM_GROUPS.map(([group, list]: any) => (
            <optgroup key={group} label={group}>
              {list.map(([id, name, w, h]: any) => <option key={id} value={id}>{`${name} · ${w}×${h}`}</option>)}
            </optgroup>
          ))}
          <option value="__custom">Custom</option>
        </select>
      </Row>
      <Row>
        <input type="number" min={64} max={4096} value={f.width} style={{ width: 76 }}
          onChange={e => applySize(+e.target.value, f.height, true)} />
        <span style={{ color: 'var(--muted)' }}>×</span>
        <input type="number" min={64} max={4096} value={f.height} style={{ width: 76 }}
          onChange={e => applySize(f.width, +e.target.value, false)} />
        <button className="small" title="Swap orientation" onClick={() => {
          const w = f.height, h = f.width;
          const match: any = Object.values(DIM_BY_ID).find((d: any) => d[2] === w && d[3] === h);
          setLocked(false);
          mutate((c: any) => { c.frame.width = w; c.frame.height = h; c.frame.presetId = match ? match[0] : null; });
          reSolveLayout();
        }}>⇄</button>
        <button className="small" title="Lock aspect ratio" style={{ color: locked ? 'var(--ink)' : 'var(--faint)' }}
          onClick={() => setLocked(l => !l)}>{locked ? '🔒' : '🔓'}</button>
      </Row>
    </Section>
  );
}

function GradientBg({ f, mutate, showToast, selStop, selMesh, setUi }: any) {
  const bg = f.background;
  const barRef = useRef<HTMLDivElement>(null);

  const dragStop = (i: number) => (ev: React.PointerEvent) => {
    ev.preventDefault(); ev.stopPropagation();
    setUi({ selStop: i });
    const rect = barRef.current!.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      const pos = clamp(Math.round((e.clientX - rect.left) / rect.width * 100), 0, 100);
      mutate((c: any) => { c.frame.background.stops[i].position = pos; });
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };

  const addStopAt = (ev: React.MouseEvent) => {
    if (ev.target !== barRef.current) return;
    const rect = barRef.current!.getBoundingClientRect();
    const pos = clamp(Math.round((ev.clientX - rect.left) / rect.width * 100), 0, 100);
    const sorted = bg.stops.slice().sort((a: any, b: any) => a.position - b.position);
    let colr = sorted[0].color;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (pos >= sorted[i].position && pos <= sorted[i + 1].position) {
        const t = (pos - sorted[i].position) / Math.max(1, (sorted[i + 1].position - sorted[i].position));
        colr = R.mixHex(sorted[i].color, sorted[i + 1].color, t); break;
      }
    }
    mutate((c: any) => { c.frame.background.stops.push({ color: colr, position: pos }); });
    setUi({ selStop: bg.stops.length });
  };

  const stopIdx = bg.stops[selStop] == null ? 0 : selStop;

  return (
    <>
      <Segmented mini options={[['linear', 'Linear'], ['radial', 'Radial'], ['conic', 'Conic'], ['mesh', 'Mesh']]}
        value={bg.mode} onChange={v => mutate((c: any) => { c.frame.background.mode = v; })} />
      <div className="swatches" style={{ marginTop: 10 }}>
        {GRAD_PRESETS.map((cols, i) => (
          <button key={i} className="sw" title={cols.join(' → ')}
            style={{ background: `linear-gradient(135deg, ${cols.join(',')})` }}
            onClick={() => mutate((c: any) => {
              const g = c.frame.background;
              g.stops = cols.map((col, j) => ({ color: col, position: Math.round(j * 100 / (cols.length - 1)) }));
              if (g.mode === 'mesh') {
                const pts = [[.2, .22], [.82, .24], [.24, .8], [.8, .78], [.5, .5], [.65, .4]];
                g.meshPoints = cols.concat(cols.length < 4 ? cols : []).slice(0, Math.max(4, cols.length))
                  .map((col, j) => ({ x: pts[j % 6][0], y: pts[j % 6][1], color: col }));
              }
            })} />
        ))}
      </div>

      {bg.mode === 'mesh' ? (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
            {bg.meshPoints.map((p: any, i: number) => (
              <button key={i} title={`Point ${i + 1}`} style={{
                width: 26, height: 26, borderRadius: '50%', padding: 0, background: p.color,
                border: selMesh === i ? '2px solid var(--focus)' : '2px solid rgba(255,255,255,.2)',
              }} onClick={() => setUi({ selMesh: i })} />
            ))}
          </div>
          {selMesh >= 0 && bg.meshPoints[selMesh] && (
            <ColorField label="Colour" value={bg.meshPoints[selMesh].color}
              onChange={v => mutate((c: any) => { c.frame.background.meshPoints[selMesh].color = v; })} />
          )}
          <Row>
            <button className="small" style={{ flex: 1 }} onClick={() => {
              if (bg.meshPoints.length >= 6) return showToast('Mesh holds 4–6 points');
              mutate((c: any) => c.frame.background.meshPoints.push({ x: .3 + Math.random() * .4, y: .3 + Math.random() * .4, color: BRAND[Math.floor(Math.random() * BRAND.length)] }));
            }}>+ Point</button>
            <button className="small" style={{ flex: 1 }} onClick={() => {
              if (bg.meshPoints.length <= 4) return showToast('Mesh needs at least 4 points');
              mutate((c: any) => c.frame.background.meshPoints.splice(selMesh >= 0 ? selMesh : bg.meshPoints.length - 1, 1));
              setUi({ selMesh: -1 });
            }}>− Point</button>
          </Row>
          <div className="note">Drag the points directly on the canvas.</div>
        </>
      ) : (
        <>
          <div className="stopsbar" ref={barRef} style={{ background: `linear-gradient(90deg, ${R.stopsCSS(bg.stops)})` }} onClick={addStopAt}>
            {bg.stops.map((s: any, i: number) => (
              <button key={i} className={'stop' + (selStop === i ? ' sel' : '')}
                style={{ left: s.position + '%', background: s.color }} onPointerDown={dragStop(i)} />
            ))}
          </div>
          <ColorField label={`Stop ${stopIdx + 1}`} value={bg.stops[stopIdx].color}
            onChange={v => mutate((c: any) => { c.frame.background.stops[stopIdx].color = v; })} />
          <Row>
            <button className="small" style={{ flex: 1 }} onClick={() => {
              if (bg.stops.length <= 2) return showToast('Keep at least 2 stops');
              mutate((c: any) => c.frame.background.stops.splice(stopIdx, 1));
              setUi({ selStop: 0 });
            }}>Remove stop</button>
          </Row>
          {(bg.mode === 'linear' || bg.mode === 'conic') && (
            <Slider label="Angle" min={0} max={360} value={bg.angle} def={135} onChange={v => mutate((c: any) => { c.frame.background.angle = v; })} />
          )}
          {(bg.mode === 'radial' || bg.mode === 'conic') && (
            <>
              <Slider label="Centre X" min={0} max={100} value={bg.x ?? 50} def={50} onChange={v => mutate((c: any) => { c.frame.background.x = v; })} />
              <Slider label="Centre Y" min={0} max={100} value={bg.y ?? 50} def={50} onChange={v => mutate((c: any) => { c.frame.background.y = v; })} />
            </>
          )}
          {R.OKLAB_OK && <div className="note">Blending in OKLab keeps brand colours clean through the middle.</div>}
        </>
      )}
    </>
  );
}

function AtmosphereBg({ f, mutate }: any) {
  // memoise the effect preview thumbnails; they only depend on the frame ratio
  const thumbs = useMemo(() => {
    const out: Record<string, string> = {};
    Object.entries(ATMO_DEFS).forEach(([eid, def]: any) => {
      const mini = document.createElement('canvas'); mini.width = 96; mini.height = 60;
      const mctx = mini.getContext('2d')!;
      mctx.scale(96 / f.width, 60 / f.height);
      try {
        ATMO_PAINTERS[eid](mctx, f.width, f.height, Object.fromEntries(Object.entries(def.params).map(([k, v]: any) => [k, v[4]])), 4);
      } catch { /* ignore */ }
      out[eid] = mini.toDataURL();
    });
    return out;
  }, [f.width, f.height]);

  const def = ATMO_DEFS[f.atmo.effect];
  return (
    <>
      <div className="chips" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {Object.entries(ATMO_DEFS).map(([eid, d]: any) => (
          <button key={eid} className={'chip' + (f.atmo.effect === eid ? ' on' : '')}
            onClick={() => mutate((c: any) => { c.frame.atmo.effect = eid; c.frame.atmo.params = {}; })}>
            <div className="cthumb" style={{ backgroundImage: `url(${thumbs[eid]})` }} />
            <span>{d.label}</span>
          </button>
        ))}
      </div>
      {Object.entries(def.params).map(([k, arr]: any) => {
        const [label, min, max, step, dflt] = arr;
        return <Slider key={k} label={label} min={min} max={max} step={step} value={f.atmo.params[k] ?? dflt} def={dflt}
          onChange={v => mutate((c: any) => { c.frame.atmo.params[k] = v; })} />;
      })}
      {f.atmo.effect === 'spotlight' && <div className="note">Drag the light source directly on the canvas.</div>}
      <div className="note">{R.REDUCED ? 'Ambient motion disabled (reduced motion).' : 'Drifts slowly, and freezes at the current moment on export.'}</div>
    </>
  );
}

function ImageBg({ f, mutate }: any) {
  const im = f.image;
  const openBgPick = () => document.getElementById('bgFilePick')?.click();
  return (
    <>
      <Row>
        <button className="small" style={{ flex: 1 }} onClick={openBgPick}>{im.src ? 'Replace image' : 'Choose image…'}</button>
        {im.src && <button className="small" title="Remove" onClick={() => mutate((c: any) => { c.frame.image.src = null; })}>✕</button>}
      </Row>
      {im.src && (
        <>
          <Row label="Fit"><span /></Row>
          <Segmented mini options={[['cover', 'Cover'], ['contain', 'Contain'], ['tile', 'Tile']]}
            value={im.fit} onChange={v => mutate((c: any) => { c.frame.image.fit = v; })} />
          <Slider label="Scale" min={20} max={300} value={im.scale} def={100} onChange={v => mutate((c: any) => { c.frame.image.scale = v; })} />
          <Slider label="X" min={-50} max={50} value={im.x} def={0} onChange={v => mutate((c: any) => { c.frame.image.x = v; })} />
          <Slider label="Y" min={-50} max={50} value={im.y} def={0} onChange={v => mutate((c: any) => { c.frame.image.y = v; })} />
          <Slider label="Blur" min={0} max={60} value={im.blur} def={0} onChange={v => mutate((c: any) => { c.frame.image.blur = v; })} />
          <Slider label="Brightness" min={30} max={170} value={im.brightness} def={100} onChange={v => mutate((c: any) => { c.frame.image.brightness = v; })} />
          <ColorField label="Tint" value={im.tint || '#0B0B0F'} onChange={v => mutate((c: any) => { c.frame.image.tint = v; })} />
          <Slider label="Tint opacity" min={0} max={100} value={im.tintOpacity} def={0} onChange={v => mutate((c: any) => { c.frame.image.tintOpacity = v; })} />
        </>
      )}
    </>
  );
}
