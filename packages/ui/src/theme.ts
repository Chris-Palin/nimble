import { useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'nimble-theme';

/** Resolve the theme the page should boot with: an already-applied
 *  data-theme (e.g. set by the shell on an embedded iframe) wins, then the
 *  saved choice, then the OS preference. */
export function initialTheme(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === 'light' || attr === 'dark') return attr;
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

/** Theme state bound to <html data-theme>. Persists the user's choice and
 *  stays in sync when something external (the shell) flips the attribute. */
export function useTheme(): [Theme, () => void, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => { applyTheme(theme); }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => {
      const attr = root.dataset.theme;
      if ((attr === 'light' || attr === 'dark') && attr !== theme) setThemeState(attr);
    });
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return [theme, toggle, setTheme];
}
