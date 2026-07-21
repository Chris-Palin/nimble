import { Slider } from '@arabella/ui';
import { useMotion, PALETTES, SCENES } from '../store';
import { toggleRecord, snapshot, fullscreen } from '../recorder';

/** Motion's left control column: export, title, scene, palette, tweaks. */
export function MotionPanel() {
  const s = useMotion();
  const sceneEntries = Object.entries(SCENES);

  return (
    <aside>
      <div>
        <div className="section-label">Export</div>
        <div className="export-field">
          <div className="field-label">Resolution</div>
          <select value={s.resolution} onChange={e => s.setResolution(e.target.value)} title="Resolution">
            <option value="1280x720">720p</option>
            <option value="1920x1080">1080p</option>
            <option value="1080x1920">Vertical (Shorts)</option>
            <option value="1080x1080">Square</option>
          </select>
        </div>
        <div className="export-field">
          <div className="field-label">Clip length</div>
          <select value={String(s.duration)} onChange={e => s.setDuration(+e.target.value)} title="Recording length">
            <option value="3">3s clip</option>
            <option value="5">5s clip</option>
            <option value="10">10s clip</option>
            <option value="15">15s clip</option>
            <option value="0">Manual stop</option>
          </select>
        </div>
        <button id="recordBtn" className={'primary' + (s.recording ? ' recording' : '')} onClick={toggleRecord}>
          {s.recording ? '⏹ Stop' : '⏺ Record'}
        </button>
        <div className="export-actions">
          <button onClick={snapshot} title="Save PNG frame">📸 Save frame</button>
          <button onClick={fullscreen} title="Fullscreen canvas">⛶ Fullscreen</button>
        </div>
        <div className={'timer' + (s.recording ? ' on' : '')}>{s.timer}</div>
      </div>

      <div>
        <div className="section-label">Title Text</div>
        <input type="text" value={s.text} maxLength={60} onChange={e => s.setText(e.target.value)} />
      </div>

      <div>
        <div className="section-label">Scene</div>
        <div className="scene-grid">
          {sceneEntries.map(([id, sc]) => (
            <div key={id} className={'scene-card' + (s.scene === id ? ' active' : '')} onClick={() => s.setScene(id)}>
              <div className="icon">{sc.icon}</div>
              <div className="name">{sc.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="section-label">Color Theme</div>
        <div className="palette-row">
          {PALETTES.map((p, i) => (
            <div key={p.name} className={'palette' + (s.paletteIndex === i ? ' active' : '')} title={p.name}
              onClick={() => s.setPaletteIndex(i)}>
              {p.colors.map(c => <div key={c} style={{ background: c }} />)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="section-label">Tweak It</div>
        <Slider label="Speed" min={0.2} max={3} step={0.1} value={s.speed} def={1} onChange={s.setSpeed} />
        <Slider label="Intensity" min={0.2} max={2} step={0.1} value={s.intensity} def={1} onChange={s.setIntensity} />
        <div className="toggle-row">
          <label htmlFor="titleToggle">Show title overlay</label>
          <input id="titleToggle" type="checkbox" checked={s.showTitle} onChange={e => s.setShowTitle(e.target.checked)} />
        </div>
      </div>

      <button id="randomBtn" onClick={s.randomise}>🎲 SURPRISE ME</button>
    </aside>
  );
}
