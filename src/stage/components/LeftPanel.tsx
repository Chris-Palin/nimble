import { useStage } from '../store';
import { MockupPanel } from './MockupPanel';
import { FramePanel } from './FramePanel';

/** Left editor column: Mockup / Frame tabs. */
export function LeftPanel() {
  const panel = useStage(s => s.ui.panel);
  const setPanel = useStage(s => s.setPanel);
  return (
    <aside className="left" id="panelLeft">
      <div className="panel-tabs" role="tablist" aria-label="Editor panels">
        <button className={'ptab' + (panel === 'mockup' ? ' on' : '')} role="tab"
          aria-selected={panel === 'mockup'} onClick={() => setPanel('mockup')}>Mockup</button>
        <button className={'ptab' + (panel === 'frame' ? ' on' : '')} role="tab"
          aria-selected={panel === 'frame'} onClick={() => setPanel('frame')}>Frame</button>
      </div>
      <div className="panel-body" role="tabpanel" hidden={panel !== 'mockup'}>
        {panel === 'mockup' && <MockupPanel />}
      </div>
      <div className="panel-body" role="tabpanel" hidden={panel !== 'frame'}>
        {panel === 'frame' && <FramePanel />}
      </div>
    </aside>
  );
}
