import { createRoot } from 'react-dom/client';
import { applyTheme, initialTheme } from '@arabella/ui';
import '@arabella/ui/ui.css';
import './motion.css';
import { MotionApp } from './MotionApp';

applyTheme(initialTheme());
createRoot(document.getElementById('root')!).render(<MotionApp />);
