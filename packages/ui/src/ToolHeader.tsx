import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from './theme';

type Props = {
  title: string;
  meta?: ReactNode;
  /** action buttons rendered before the theme toggle */
  actions?: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
};

/** The three-column tool header: an empty spacer · centred title/meta · actions.
 *  The 1fr/auto/1fr grid keeps the title dead-centre and the actions hard-right,
 *  whether standalone or embedded in the studio shell (which hides only the
 *  theme toggle, since it supplies its own). */
export function ToolHeader({ title, meta, actions, theme, onToggleTheme }: Props) {
  return (
    <header className="tool-header">
      <div className="tool-spacer" aria-hidden="true" />
      <div className="tool-heading">
        <h1 className="tool-title">{title}</h1>
        {meta != null && <div className="tool-meta">{meta}</div>}
      </div>
      <div className="tool-actions">
        {actions}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
