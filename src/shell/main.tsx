import { createRoot } from 'react-dom/client';
import '@ui/tokens.css';
import '@arabella/ui/ui.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);

// fade out the opening splash once the studio is up (with a brief minimum so it reads)
(function hideSplash() {
  const s = document.getElementById('arabellaSplash');
  if (!s) return;
  const hide = () => { s.classList.add('hide'); setTimeout(() => s.remove(), 550); };
  setTimeout(hide, 700);
})();
