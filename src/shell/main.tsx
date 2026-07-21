import { createRoot } from 'react-dom/client';
import '@ui/tokens.css';
import '@arabella/ui/ui.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
