import { useEffect, useRef } from 'react';
import { ToolHeader, useTheme } from '@arabella/ui';
import { runDigit } from './core/digit';

/** Digit — gesture FX. The MediaPipe/camera/FX render core is preserved verbatim
 *  (see core/digit.ts) and bound to this DOM on mount; the header, theme and
 *  slider styling come from @arabella/ui. */
export function DigitApp() {
  const [theme, toggleTheme] = useTheme();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runDigit();
  }, []);

  const actions = (
    <button type="button" className="primary" onClick={() => document.getElementById('recordBtn')?.click()} title="Record (R)">⏺ Record</button>
  );

  return (
    <>
      <ToolHeader title="Digit" meta="Gesture FX" actions={actions} theme={theme} onToggleTheme={toggleTheme} />
      <div className="appwrap">
        <aside id="sidebar">
          <button className="chip primary" id="recordBtn"><span className="dot" />Record</button>

          <section className="control-card mode-card">
            <div className="step-title">How to interact</div>
            <div id="modeTabs">
              <div className="mode-group"><span className="mode-group-label">Create</span>
                <button className="chip modeTab active" data-activemode="shape">Shape</button>
                <button className="chip modeTab" data-activemode="framer">Frame</button>
                <button className="chip modeTab" data-activemode="facets">Facets</button>
              </div>
              <div className="mode-group"><span className="mode-group-label">Track</span>
                <button className="chip modeTab" data-activemode="face">Face</button>
                <button className="chip modeTab" data-activemode="zoneedit">Edit zones</button>
              </div>
              <div className="mode-group"><span className="mode-group-label">Automate</span>
                <button className="chip modeTab" data-activemode="shortcuts">Shortcuts</button>
                <button className="chip modeTab" data-activemode="macro">Macro</button>
              </div>
            </div>
            <div id="modeHint">Fingertips paint the live effect shape. Pick a corner scheme below.</div>
          </section>

          <section className="control-card effect-card">
            <div className="step-title">Effect</div>
            <details id="fxPicker">
              <summary><span>Current effect</span><strong id="currentFxLabel">Pixelate</strong></summary>
              <div id="fxRow">
                <button className="chip active" data-fx="pixelate">Pixelate</button>
                <button className="chip" data-fx="blur">Blur</button>
                <button className="chip" data-fx="invert">Invert</button>
                <button className="chip" data-fx="grayscale">Grayscale</button>
                <button className="chip" data-fx="sepia">Sepia</button>
                <button className="chip" data-fx="duotone">Duotone</button>
                <button className="chip" data-fx="posterize">Posterize</button>
                <button className="chip" data-fx="thermal">Thermal</button>
                <button className="chip" data-fx="edges">Edge Detect</button>
                <button className="chip" data-fx="chroma">Chroma Shift</button>
                <button className="chip" data-fx="kaleidoscope">Kaleidoscope</button>
                <button className="chip" data-fx="rainbow">Rainbow</button>
                <button className="chip" data-fx="neon">Neon Glow</button>
                <button className="chip" data-fx="vhs">VHS</button>
                <button className="chip" data-fx="solarize">Solarize</button>
                <button className="chip" data-fx="halftone">Halftone</button>
                <button className="chip" data-fx="echo">Echo Trail</button>
                <button className="chip" data-fx="ascii">ASCII</button>
                <button className="chip" data-fx="colorpop">Color Pop</button>
                <button className="chip" data-fx="none">None</button>
              </div>
            </details>
            <p className="effect-help">Open the picker to browse all effects. Use <b>[</b> and <b>]</b> to switch quickly.</p>
          </section>

          <section className="control-card tune-card">
            <div className="step-title">Tune</div>
            <div className="tuning-grid">
              <label className="inline">Sensitivity <input id="sensitivity" className="ui-range" type="range" min={1} max={100} defaultValue={50} /></label>
              <label className="inline">Intensity <input id="intensity" className="ui-range" type="range" min={1} max={100} defaultValue={50} /></label>
            </div>
            <div className="context-controls">
              <div className="segmented" id="modeRow">
                <button className="chip" data-mode="thumbIndex">Thumb + index</button>
                <button className="chip active" data-mode="allTips">All fingertips</button>
                <button className="chip" data-mode="pinchAny">Any pinch</button>
              </div>
              <div className="segmented hidden" id="faceRegionRow">
                <button className="chip active" data-faceregion="oval">Face oval</button>
                <button className="chip" data-faceregion="eyes">Eyes</button>
                <button className="chip" data-faceregion="mouth">Mouth</button>
              </div>
              <div className="bar-row hidden" id="macroControls" style={{ gap: 8 }}>
                <button className="chip" id="macroRecordBtn">● Record macro</button>
                <button className="chip" id="macroPlayBtn">▶ Play macro</button>
                <span id="macroStatus" style={{ fontSize: 11, color: 'var(--muted)' }}>no macro saved</span>
              </div>
              <div className="secondary-actions">
                <button className="chip" id="distanceToggle" title="Spread your two hands apart to drive Intensity live instead of the slider">Hand distance: off</button>
                <button className="chip" id="clearZones">Clear zones</button>
              </div>
            </div>
          </section>
        </aside>

        <div id="stage" className="mode-shape">
          <video id="webcam" autoPlay playsInline muted />
          <canvas id="output" />
          <div id="status">Loading hand tracking…</div>
          <div id="kbdHint"><kbd>Tab</kbd> mode · <kbd>[</kbd> <kbd>]</kbd> effect · <kbd>R</kbd> record · <kbd>C</kbd> clear</div>
        </div>
      </div>
    </>
  );
}
