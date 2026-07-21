import { useMotion } from './store';

/* Frame snapshot + clip recording — ported from the original Motion tool.
   Records the live canvas via captureStream + MediaRecorder, downloads .webm. */

const CANVAS_ID = 'motionCanvas';
const getCanvas = () => document.getElementById(CANVAS_ID) as HTMLCanvasElement | null;

let recorder: MediaRecorder | null = null;
let recTimeout: ReturnType<typeof setTimeout> | null = null;
let timerInt: ReturnType<typeof setInterval> | null = null;
let recStart = 0;

export function snapshot() {
  const canvas = getCanvas();
  if (!canvas) return;
  const a = document.createElement('a');
  a.download = `motionforge-${useMotion.getState().scene}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
}

export function fullscreen() {
  getCanvas()?.requestFullscreen?.();
}

export function toggleRecord() {
  if (recorder) { stopRecording(); return; }
  const canvas = getCanvas();
  if (!canvas) return;
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(m => MediaRecorder.isTypeSupported(m)) || '';
  const stream = canvas.captureStream(60);
  const chunks: BlobPart[] = [];
  const [w, h] = useMotion.getState().resolution.split('x');
  const scene = useMotion.getState().scene;
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 14_000_000 });
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.download = `motionforge-${scene}-${w}x${h}.webm`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  recorder.start();
  recStart = performance.now();
  useMotion.getState().setRecording(true);
  useMotion.getState().setTimer('0.0s');
  timerInt = setInterval(() => {
    useMotion.getState().setTimer(((performance.now() - recStart) / 1000).toFixed(1) + 's');
  }, 100);
  const dur = useMotion.getState().duration;
  if (dur > 0) recTimeout = setTimeout(stopRecording, dur * 1000);
}

export function stopRecording() {
  if (!recorder) return;
  if (recTimeout) clearTimeout(recTimeout);
  if (timerInt) clearInterval(timerInt);
  recorder.stop();
  recorder = null;
  useMotion.getState().setRecording(false);
}
