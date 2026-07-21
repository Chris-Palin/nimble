import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Slider, Segmented } from '@arabella/ui';
import * as RNS from '../core/render';
import { useStage, shareURL } from '../store';
import { doExport, doCopy, doBatch, exportSettings, BATCH_TARGETS, type ExportFormat } from '../export';

const R = RNS as unknown as Record<string, any>;
const DIM_BY_ID: Record<string, any> = R.DIM_BY_ID;

export function ExportPopover() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const pop = document.getElementById('exportPop');
      if (pop && !pop.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  return (
    <>
      <button ref={btnRef} className="icon-btn export-btn" title="Export (⌘E)"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>Export ↓</button>
      {open && createPortal(<Popover onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function Popover({ onClose }: { onClose: () => void }) {
  const comp = useStage(s => s.comp);
  const showToast = useStage(s => s.showToast);
  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);
  const [batch, setBatch] = useState<Set<string>>(() => new Set(['ig-square', 'ig-story', 'x-post', 'og']));

  const s = exportSettings;
  const outW = comp.frame.width * s.scale;
  const outH = comp.frame.height * s.scale;

  return (
    <div id="exportPop" className="show" role="dialog" aria-label="Export">
      <h3>Format</h3>
      <Segmented mini options={[['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WebP']]}
        value={s.format} onChange={v => { s.format = v as ExportFormat; rerender(); }} />
      {s.format !== 'png' && (
        <Slider label="Quality" min={50} max={100} value={Math.round(s.quality * 100)} def={92}
          onChange={v => { s.quality = v / 100; rerender(); }} />
      )}
      <h3>Scale</h3>
      <Segmented mini options={[['1', '1×'], ['2', '2×'], ['3', '3×']]}
        value={String(s.scale)} onChange={v => { s.scale = +v; rerender(); }} />
      <div className="note">Output: {outW} × {outH}px</div>
      <div className="btnrow" style={{ marginTop: 12 }}>
        <button className="primary" onClick={() => { onClose(); doExport(); }}>Export</button>
        <button onClick={() => { onClose(); doCopy(); }}>Copy</button>
      </div>

      <h3>Batch export</h3>
      <div id="batchList">
        {BATCH_TARGETS.map(id => {
          const [, name, w, h] = DIM_BY_ID[id];
          return (
            <label key={id} title={`${w}×${h}`}>
              <input type="checkbox" checked={batch.has(id)} onChange={e => {
                setBatch(prev => { const n = new Set(prev); e.target.checked ? n.add(id) : n.delete(id); return n; });
              }} />
              <span>{name}</span>
            </label>
          );
        })}
      </div>
      <button style={{ width: '100%' }} onClick={() => { onClose(); doBatch([...batch]); }}>Export batch</button>

      <h3>Share</h3>
      <button style={{ width: '100%' }} title="Everything except your images, encoded in the URL"
        onClick={async () => {
          try { await navigator.clipboard.writeText(shareURL(comp)); showToast('Link copied. Images are not included'); }
          catch { showToast('Clipboard blocked'); }
          onClose();
        }}>Copy link to this composition</button>
    </div>
  );
}
