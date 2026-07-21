import type { Theme } from './theme';

type Props = {
  theme: Theme;
  onToggle: () => void;
  /** show the word "Light"/"Dark" beside the glyph */
  withLabel?: boolean;
  className?: string;
};

/** The pill theme toggle shared by every tool header. */
export function ThemeToggle({ theme, onToggle, withLabel = false, className }: Props) {
  const isLight = theme === 'light';
  const next = isLight ? 'dark' : 'light';
  return (
    <button
      type="button"
      className={'theme-toggle' + (className ? ' ' + className : '')}
      onClick={onToggle}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <span className="theme-toggle__icon">{isLight ? '☀' : '☾'}</span>
      {withLabel && <span className="theme-toggle__label">{isLight ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
