import { ToolHeader, useTheme } from '@arabella/ui';
import { MotionPanel } from './components/MotionPanel';
import { MotionCanvas } from './components/MotionCanvas';
import { toggleRecord, snapshot } from './recorder';

export function MotionApp() {
  const [theme, toggleTheme] = useTheme();
  const actions = (
    <>
      <button type="button" onClick={snapshot} title="Save PNG frame">📸 Frame</button>
      <button type="button" className="primary" onClick={toggleRecord} title="Record clip">⏺ Record</button>
    </>
  );
  return (
    <>
      <ToolHeader title="Motion" meta="Motion graphics" actions={actions} theme={theme} onToggleTheme={toggleTheme} />
      <div className="main">
        <MotionPanel />
        <MotionCanvas />
      </div>
    </>
  );
}
