import { useEffect, useRef, useState, type ReactNode } from 'react';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Props = {
  label?: ReactNode;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  /** double-click the track to reset to this value */
  def?: number;
};

/** Range + numeric spinbox with the shared ink-fill track.
 *  Mirrors the old sliderRow(): live drag on the range, commit-on-blur on the
 *  number, double-click to reset. */
export function Slider({ label, min, max, step = 1, value, onChange, def }: Props) {
  const [text, setText] = useState(String(value));
  const editing = useRef(false);

  // reflect external changes into the number box unless the user is mid-edit
  useEffect(() => { if (!editing.current) setText(String(value)); }, [value]);

  const progress = max === min ? 0 : clamp(((value - min) / (max - min)) * 100, 0, 100);

  const apply = (raw: number | string) => {
    const v = clamp(+raw, min, max);
    if (Number.isNaN(v)) return;
    setText(String(v));
    onChange(v);
  };

  return (
    <div className="row">
      {label != null && <label>{label}</label>}
      <input
        className="ui-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--range-progress' as string]: progress + '%' }}
        onChange={e => apply(e.currentTarget.value)}
        onDoubleClick={() => { if (def != null) apply(def); }}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={text}
        style={{ width: '56px' }}
        onFocus={() => { editing.current = true; }}
        onChange={e => setText(e.currentTarget.value)}
        onBlur={() => { editing.current = false; apply(text); }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
    </div>
  );
}
