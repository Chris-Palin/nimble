import { useEffect, useRef, useState, type ReactNode } from 'react';

/* Small form primitives shared across tool panels. They render the same markup
   the old imperative panel builders produced (section/h2, .row, .seg, …) so the
   existing panel CSS styles them unchanged. */

export function Section({ title, action, children }: { title: string; action?: ReactNode; children?: ReactNode }) {
  return (
    <section>
      <h2>{title}{action}</h2>
      {children}
    </section>
  );
}

export function Row({ label, children }: { label?: ReactNode; children?: ReactNode }) {
  return (
    <div className="row">
      {label != null && <label>{label}</label>}
      {children}
    </div>
  );
}

type Opt = [value: string, label: string];

export function Segmented({ options, value, onChange, mini }: {
  options: Opt[]; value: string; onChange: (v: string) => void; mini?: boolean;
}) {
  return (
    <div className={'seg' + (mini ? ' mini' : '')}>
      {options.map(([id, label]) => (
        <button key={id} type="button" className={value === id ? 'on' : ''} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({ label, checked, onChange }: {
  label?: ReactNode; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="row">
      {label != null && <label>{label}</label>}
      <input type="checkbox" style={{ marginLeft: 'auto' }} checked={checked}
        onChange={e => onChange(e.currentTarget.checked)} />
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder }: {
  label?: ReactNode; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="row">
      {label != null && <label>{label}</label>}
      <input type="text" value={value ?? ''} placeholder={placeholder || ''}
        onChange={e => onChange(e.currentTarget.value)} />
    </div>
  );
}

export function Select({ label, options, value, onChange }: {
  label?: ReactNode; options: Opt[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="row">
      {label != null && <label>{label}</label>}
      <select value={value} onChange={e => onChange(e.currentTarget.value)}>
        {options.map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}
      </select>
    </div>
  );
}

const hexOK = (v: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);

/** Colour swatch + hex text field. onChange fires live from the picker; onCommit
 *  fires when a value is confirmed (picker close / valid hex entry) — used to
 *  push recent colours. Mirrors the old colorRow(). */
export function ColorField({ label, value, onChange, onCommit }: {
  label?: ReactNode; value: string; onChange: (v: string) => void; onCommit?: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const editing = useRef(false);
  useEffect(() => { if (!editing.current) setText(value); }, [value]);

  const commitHex = () => {
    editing.current = false;
    let v = text.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (hexOK(v)) {
      const full = v.length === 4 ? '#' + [...v.slice(1)].map(x => x + x).join('') : v;
      setText(full); onChange(full); onCommit?.(full);
    } else {
      setText(value);
    }
  };

  return (
    <div className="row">
      {label != null && <label>{label}</label>}
      <input type="color" value={value}
        onChange={e => { setText(e.currentTarget.value); onChange(e.currentTarget.value); }}
        onBlur={() => onCommit?.(value)} />
      <input type="text" spellCheck={false} value={text} style={{ width: '80px', flex: 'none' }}
        onFocus={() => { editing.current = true; }}
        onChange={e => setText(e.currentTarget.value)}
        onBlur={commitHex}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
    </div>
  );
}
