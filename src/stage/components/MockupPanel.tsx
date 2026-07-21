import { Section, Row, Slider, Segmented, Checkbox, TextField, ColorField } from '@arabella/ui';
import * as RNS from '../core/render';
import { useStage } from '../store';

const R = RNS as unknown as Record<string, any>;
const DEVICE_CATEGORIES: any[] = R.DEVICE_CATEGORIES;
const DEVICES: Record<string, any> = R.DEVICES;
const SHADOW_PRESETS: Record<string, any> = R.SHADOW_PRESETS;

export function MockupPanel() {
  const m = useStage(s => s.comp.mockups[0]);
  const count = useStage(s => s.comp.mockups.length);
  const images = useStage(s => s.images);
  const mutate = useStage(s => s.mutate);

  const ch = m.device.chrome;
  const dev = DEVICES[m.device.modelId];
  const models: string[] = DEVICE_CATEGORIES.find(([id]) => id === m.device.category)![2];
  const hasImg = !!(m.screenshot && images[m.screenshot.src]);

  const openPick = () => document.getElementById('filePick')?.click();

  return (
    <>
      {/* device */}
      <Section title="Device">
        <Segmented mini options={DEVICE_CATEGORIES.map(([id, label]: any) => [id, label])}
          value={m.device.category}
          onChange={v => {
            const first = DEVICE_CATEGORIES.find(([id]) => id === v)![2][0];
            mutate(c => c.mockups.forEach(mk => {
              mk.device.category = v; mk.device.modelId = first;
              mk.device.variant = Object.keys(DEVICES[first].variants || { default: 1 })[0];
            }));
          }} />
        {models.length > 1 && (
          <div className="chips" style={{ marginTop: 10, gridTemplateColumns: `repeat(${Math.min(3, models.length)},1fr)` }}>
            {models.map(mid => (
              <button key={mid} className={'chip' + (m.device.modelId === mid ? ' on' : '')} style={{ padding: '10px 4px' }}
                onClick={() => mutate(c => c.mockups.forEach(mk => {
                  mk.device.modelId = mid;
                  mk.device.variant = Object.keys(DEVICES[mid].variants || { default: 1 })[0];
                }))}>
                <span>{DEVICES[mid].label}</span>
              </button>
            ))}
          </div>
        )}
        {dev.variants && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {Object.entries(dev.variants).map(([vid, v]: any) => (
              <button key={vid} className={'small' + (m.device.variant === vid ? ' primary' : '')} style={{ fontSize: '10.5px' }}
                onClick={() => mutate(c => c.mockups.forEach(mk => { mk.device.variant = vid; }))}>{v.label}</button>
            ))}
          </div>
        )}

        {m.device.category === 'browser' && (
          <>
            <Row label="Chrome"><span /></Row>
            <Segmented mini options={[['light', 'Light'], ['dark', 'Dark']]} value={m.device.theme}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.theme = v as any; }))} />
            <TextField label="URL" value={ch.url} placeholder="nimble.studio"
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.url = v; }))} />
            {m.device.modelId !== 'browser-minimal' && (
              <TextField label="Tab title" value={ch.tab} placeholder="Page title"
                onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.tab = v; }))} />
            )}
            <Checkbox label="Traffic lights" checked={ch.traffic !== false}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.traffic = v; }))} />
            {m.device.modelId === 'browser-arc' && (
              <Checkbox label="Sidebar layout" checked={!!ch.sidebar}
                onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.sidebar = v; }))} />
            )}
          </>
        )}
        {m.device.category === 'phone' && (
          <>
            <Checkbox label="Status bar" checked={ch.statusBar !== false}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.statusBar = v; }))} />
            {ch.statusBar !== false && (
              <TextField label="Time" value={ch.time} placeholder="9:41"
                onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.time = v; }))} />
            )}
            <Checkbox label="Dynamic Island" checked={ch.island !== false}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.island = v; }))} />
          </>
        )}
        {m.device.category === 'tablet' && (
          <>
            <Row label="Orientation"><span /></Row>
            <Segmented mini options={[['portrait', 'Portrait'], ['landscape', 'Landscape']]}
              value={ch.orientation || 'portrait'}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.orientation = v; }))} />
          </>
        )}
        {m.device.category === 'bare' && (
          <>
            <Slider label="Radius" min={0} max={80} value={ch.radius ?? 18} def={18}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.radius = v; }))} />
            <Checkbox label="Inner border" checked={ch.innerBorder !== false}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.device.chrome.innerBorder = v; }))} />
          </>
        )}
      </Section>

      {/* screenshot */}
      <Section title="Screenshot">
        <Row>
          <button className="small" style={{ flex: 1 }} onClick={openPick}>{hasImg ? 'Replace…' : 'Choose…'}</button>
          {hasImg && <button className="small" title="Remove screenshot"
            onClick={() => mutate(c => c.mockups.forEach(mk => { mk.screenshot = null; }))}>✕</button>}
        </Row>
        {hasImg && m.screenshot && (
          <>
            <Segmented mini options={[['cover', 'Cover'], ['contain', 'Contain'], ['fill', 'Fill']]}
              value={(m.screenshot as any).fit}
              onChange={v => mutate(c => c.mockups.forEach(mk => { if (mk.screenshot) (mk.screenshot as any).fit = v; }))} />
            <Slider label="Scale" min={50} max={300} value={m.screenshot.scale} def={100}
              onChange={v => mutate(c => c.mockups.forEach(mk => { if (mk.screenshot) mk.screenshot.scale = v; }))} />
            <Slider label="Pan X" min={-50} max={50} value={m.screenshot.x} def={0}
              onChange={v => mutate(c => c.mockups.forEach(mk => { if (mk.screenshot) mk.screenshot.x = v; }))} />
            <Slider label="Pan Y" min={-50} max={50} value={m.screenshot.y} def={0}
              onChange={v => mutate(c => c.mockups.forEach(mk => { if (mk.screenshot) mk.screenshot.y = v; }))} />
            <Row>
              <button className="small" style={{ flex: 1 }}
                onClick={() => mutate(c => c.mockups.forEach(mk => { if (mk.screenshot) Object.assign(mk.screenshot, { scale: 100, x: 0, y: 0 }); }))}>Reset position</button>
            </Row>
            <div className="note">Shift-drag on the screen to pan the screenshot.</div>
          </>
        )}
      </Section>

      {/* transform */}
      <Section title="Transform">
        <Slider label="UI scale" min={10} max={200} value={m.transform.scale} def={100}
          onChange={v => mutate(c => { c.mockups[0].transform.scale = v; }, { customLayout: true })} />
        <Slider label="X" min={-60} max={60} step={0.5} value={Math.round(m.transform.x * 200) / 2} def={0}
          onChange={v => mutate(c => { c.mockups[0].transform.x = v / 100; }, { customLayout: true })} />
        <Slider label="Y" min={-60} max={60} step={0.5} value={Math.round(m.transform.y * 200) / 2} def={0}
          onChange={v => mutate(c => { c.mockups[0].transform.y = v / 100; }, { customLayout: true })} />
        <Slider label="Rotate" min={-45} max={45} value={m.transform.rotate} def={0}
          onChange={v => mutate(c => { c.mockups[0].transform.rotate = Math.abs(v) < 2 ? 0 : v; }, { customLayout: true })} />
        <Slider label="Tilt X" min={-32} max={32} value={m.transform.rotateX} def={0}
          onChange={v => mutate(c => { c.mockups[0].transform.rotateX = v; }, { customLayout: true })} />
        <Slider label="Tilt Y" min={-32} max={32} value={m.transform.rotateY} def={0}
          onChange={v => mutate(c => { c.mockups[0].transform.rotateY = v; }, { customLayout: true })} />
        <Slider label="Depth" min={500} max={2400} step={20} value={m.transform.perspective} def={1200}
          onChange={v => mutate(c => { c.mockups[0].transform.perspective = v; }, { customLayout: true })} />
        <Row>
          <button className="small" style={{ flex: 1 }}
            onClick={() => mutate(c => { Object.assign(c.mockups[0].transform, { scale: 100, x: 0, y: 0, rotate: 0, rotateX: 0, rotateY: 0, perspective: 1200 }); })}>Reset transform</button>
        </Row>
      </Section>

      {/* shadow */}
      <Section title="Shadow">
        <Segmented mini options={Object.keys(SHADOW_PRESETS).map(k => [k, k[0].toUpperCase() + k.slice(1)] as [string, string])}
          value={m.shadow.presetId || ''}
          onChange={v => mutate(c => c.mockups.forEach(mk => {
            mk.shadow = { presetId: v, ...SHADOW_PRESETS[v], color: mk.shadow.color };
            if (v === 'none') mk.shadow.color = '#000000';
          }))} />
        <ShadowManual field="x" label="X" min={-120} max={120} def={0} m={m} mutate={mutate} />
        <ShadowManual field="y" label="Y" min={-60} max={180} def={26} m={m} mutate={mutate} />
        <ShadowManual field="blur" label="Blur" min={0} max={220} def={60} m={m} mutate={mutate} />
        <ShadowManual field="opacity" label="Opacity" min={0} max={100} def={34} scale={100} m={m} mutate={mutate} />
        <ColorField label="Colour" value={m.shadow.color}
          onChange={v => mutate(c => c.mockups.forEach(mk => { mk.shadow.color = v; mk.shadow.presetId = null; }))} />
        <Row>
          <button className="small" style={{ flex: 1 }} title="Colour the shadow with the backdrop so it reads as light, not soot"
            onClick={() => {
              const c2 = R.darken(R.bgAccent(useStage.getState().comp.frame), .55);
              mutate(c => c.mockups.forEach(mk => { mk.shadow.color = c2; mk.shadow.presetId = null; }));
            }}>Sample from background</button>
        </Row>
      </Section>

      {/* reflection + glow */}
      <Section title="Reflection & glow">
        <Checkbox label="Reflection" checked={m.reflection.enabled}
          onChange={v => mutate(c => c.mockups.forEach(mk => { mk.reflection.enabled = v; }))} />
        {m.reflection.enabled && (
          <>
            <Slider label="Opacity" min={0} max={80} value={m.reflection.opacity} def={30}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.reflection.opacity = v; }))} />
            <Slider label="Falloff" min={5} max={95} value={m.reflection.falloff} def={40}
              onChange={v => mutate(c => c.mockups.forEach(mk => { mk.reflection.falloff = v; }))} />
          </>
        )}
        <Checkbox label="Rim glow" checked={m.glow.enabled}
          onChange={v => mutate(c => c.mockups.forEach(mk => { mk.glow.enabled = v; }))} />
        {m.glow.enabled && (
          <Slider label="Strength" min={5} max={100} value={m.glow.strength} def={40}
            onChange={v => mutate(c => c.mockups.forEach(mk => { mk.glow.strength = v; }))} />
        )}
      </Section>

      {count > 1 && (
        <div className="note">This layout uses {count} copies of the mockup. Device and style edits apply to all of them.</div>
      )}
    </>
  );
}

function ShadowManual({ field, label, min, max, def, scale = 1, m, mutate }: any) {
  return (
    <Slider label={label} min={min} max={max} value={Math.round(m.shadow[field] * scale)} def={def}
      onChange={v => mutate((c: any) => c.mockups.forEach((mk: any) => { mk.shadow[field] = v / scale; mk.shadow.presetId = null; }))} />
  );
}
