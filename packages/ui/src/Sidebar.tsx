import { ThemeToggle } from './ThemeToggle';
import { TOOL_ICONS } from './icons';
import type { Theme } from './theme';

export type SidebarTool = { id: string; name: string; meta: string };

type Props = {
  tools: SidebarTool[];
  active: string;
  onOpen: (id: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  pillColor: string;
  homeMeta?: string;
  homeHref?: string;
};

/** The studio sidebar: brand, Home, tool list, and the footer controls. Pure
 *  presentation — the host owns routing, theme, and collapse state. */
export function Sidebar({
  tools, active, onOpen, theme, onToggleTheme, collapsed, onToggleCollapsed,
  pillColor, homeMeta = 'Studio overview', homeHref = '/index.html',
}: Props) {
  return (
    <aside>
      <div className="brand">
        <div className="mark aonic">A.</div>
        <div className="name">
          <b className="aonic">Arabella.</b>
          <span>Creative tools</span>
        </div>
      </div>

      <nav aria-label="Home">
        <button className={'tool-btn' + (active === 'home' ? ' active' : '')} onClick={() => onOpen('home')}>
          <span className="tool-ico" aria-hidden="true">{TOOL_ICONS.home(active === 'home')}</span>
          <span className="txt">Home<small>{homeMeta}</small></span>
        </button>
      </nav>

      <div className="navlabel">Tools</div>
      <nav aria-label="Tools">
        {tools.map(t => (
          <button key={t.id} className={'tool-btn' + (active === t.id ? ' active' : '')} onClick={() => onOpen(t.id)}>
            <span className="tool-ico" aria-hidden="true">{(TOOL_ICONS[t.id] ?? (() => <span className="dot" />))(active === t.id)}</span>
            <span className="txt">{t.name}<small>{t.meta}</small></span>
          </button>
        ))}
        <button className="tool-btn soon" tabIndex={-1}>
          <span className="tool-ico" aria-hidden="true" />
          <span className="txt">More soon<small>New tools land here</small></span>
        </button>
      </nav>

      <div className="spacer" />

      <div className="side-foot">
        <button className="foot-btn" onClick={onToggleTheme}>
          <span className="ico">{theme === 'dark' ? '☀' : '☾'}</span>
          <span className="lbl">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button className="foot-btn" onClick={onToggleCollapsed}>
          <span className="ico">{collapsed ? '⟩' : '⟨'}</span>
          <span className="lbl">Collapse</span>
        </button>
        <a className="nimble-pill porkys" href={homeHref} style={{ ['--pill-c' as string]: pillColor }}>
          <span className="pill-full">Nimble</span><span className="pill-mini">N</span>
        </a>
      </div>
    </aside>
  );
}

// ThemeToggle is re-exported for hosts that want the standalone pill.
export { ThemeToggle };
