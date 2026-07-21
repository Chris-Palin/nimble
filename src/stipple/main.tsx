import { createRoot } from 'react-dom/client';
import { applyTheme, initialTheme } from '@arabella/ui';
import '@arabella/ui/ui.css';
import './stipple.css';
import { StippleApp } from './StippleApp';

applyTheme(initialTheme());
createRoot(document.getElementById('root')!).render(<StippleApp />);

(function hideSplash() {
  const s = document.getElementById('nimbleSplash');
  if (!s) return;
  let done = false;
  const hide = () => { if (done) return; done = true; setTimeout(() => { s.classList.add('hide'); setTimeout(() => s.remove(), 500); }, 250); };
  if (document.readyState === 'complete') hide(); else window.addEventListener('load', hide);
  setTimeout(hide, 2600);
})();
