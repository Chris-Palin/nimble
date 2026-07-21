import * as RNS from './core/render';
import { useStage } from './store';

const R = RNS as unknown as Record<string, any>;

export type ImgInfo = { src: string; w: number; h: number };

export function loadImageBlob(blob: Blob, cb: (info: ImgInfo) => void) {
  const rd = new FileReader();
  rd.onload = () => {
    const img = new Image();
    img.onload = () => cb({ src: rd.result as string, w: img.naturalWidth, h: img.naturalHeight });
    img.src = rd.result as string;
  };
  rd.readAsDataURL(blob);
}

/** Device suggestion — never automatic, offered as a dismissible chip. */
function maybeSuggestDevice(info: ImgInfo) {
  const st = useStage.getState();
  const aspect = info.w / info.h;
  const cat = st.comp.mockups[0].device.category;
  if (aspect < 0.68 && cat !== 'phone') {
    st.setSuggestion({
      text: 'This looks like a phone screenshot.', actionLabel: 'Switch to iPhone 17',
      action: () => useStage.getState().mutate(c => c.mockups.forEach(mk => { mk.device.category = 'phone'; mk.device.modelId = 'iphone-17'; mk.device.variant = 'space'; })),
    });
  } else if (aspect > 1.25 && cat === 'phone') {
    st.setSuggestion({
      text: 'This looks like a desktop screenshot.', actionLabel: 'Switch to Safari frame',
      action: () => useStage.getState().mutate(c => c.mockups.forEach(mk => { mk.device.category = 'browser'; mk.device.modelId = 'browser-safari'; })),
    });
  }
}

export function setScreenshot(blob: Blob) {
  loadImageBlob(blob, info => {
    const id = 'img_' + R.uid();
    const st = useStage.getState();
    st.addImage(id, info);
    st.mutate(c => { c.mockups.forEach(mk => { mk.screenshot = { src: id, fit: 'cover', scale: 100, x: 0, y: 0 } as any; }); });
    maybeSuggestDevice(info);
  });
}

export function setBgImage(blob: Blob) {
  loadImageBlob(blob, info => {
    const id = 'img_' + R.uid();
    const st = useStage.getState();
    st.addImage(id, info);
    st.mutate(c => { c.frame.background.type = 'image'; c.frame.image.src = id; c.frame.transparent = false; });
  });
}
