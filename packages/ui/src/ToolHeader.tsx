import type { ReactNode } from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { Theme } from './theme';

type Props = {
  title: string;
  meta?: ReactNode;
  /** link back to the Nimble marketing site (hidden by the shell when embedded) */
  homeHref?: string;
  /** action buttons rendered before the theme toggle */
  actions?: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
};

/** The three-column tool header (home · title/meta · actions) shared by tools.
 *  When embedded in the studio shell, the shell hides the home pill and the
 *  theme toggle since it supplies its own. */
export function ToolHeader({ title, meta, homeHref = '../../index.html', actions, theme, onToggleTheme }: Props) {
  return (
    <header className="tool-header">
      <div className="tool-home-slot">
        <a className="nimble-home" href={homeHref}>Nimble</a>
      </div>
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
