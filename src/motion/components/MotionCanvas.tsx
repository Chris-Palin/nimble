import { useEffect, useRef } from 'react';
import * as RNS from '../core/scenes';
import { useMotion, syncCore } from '../store';

const R = RNS as unknown as Record<string, any>;

/** Mounts the render canvas, feeds the core the current store state, and runs
 *  the animation loop. The core (scenes) is preserved verbatim, so output is
 *  identical to the original tool. */
export function MotionCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    R.setCanvas(ref.current);
    syncCore(useMotion.getState());
    const [w, h] = useMotion.getState().resolution.split('x').map(Number);
    R.applyRes(w, h);
    R.start();
    const unsub = useMotion.subscribe((s: any, prev: any) => {
      syncCore(s);
      if (s.scene !== prev.scene) R.resetScene();
      if (s.resolution !== prev.resolution) {
        const [nw, nh] = s.resolution.split('x').map(Number);
        R.applyRes(nw, nh);
      }
    });
    return () => { unsub(); R.stop(); };
  }, []);

  return (
    <div className="stage">
      <canvas id="motionCanvas" ref={ref} />
      <div className="hint">Recordings download as .webm — drop straight into your editor / YouTube</div>
    </div>
  );
}
