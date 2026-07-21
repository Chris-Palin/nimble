/* eslint-disable */
// @ts-nocheck
/* ==========================================================================
 * Stipple dither/halftone core — VERBATIM image-processing math from the
 * original tool (public/arabella/tools/dither/index.html). Preserved unchanged
 * so processed output and exports are identical. The React/Zustand layer feeds
 * it via setState()/setSourceImg()/setGradeImg()/setPalette() and calls
 * composeFrame()/encodeTIFF()/buildSVGVector()/extractPalette(). Do not refactor.
 * ======================================================================== */
let sourceImg = null, gradeImg = null, palette = null;

const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;
const mapRange = (v,inMin,inMax,outMin,outMax) => outMin + ((v-inMin)/(inMax-inMin))*(outMax-outMin);
const BAYER8 = [
  [ 0,32, 8,40, 2,34,10,42],
  [48,16,56,24,50,18,58,26],
  [12,44, 4,36,14,46, 6,38],
  [60,28,52,20,62,30,54,22],
  [ 3,35,11,43, 1,33, 9,41],
  [51,19,59,27,49,17,57,25],
  [15,47, 7,39,13,45, 5,37],
  [63,31,55,23,61,29,53,21]
];
function quantizeLevel(v, levels){
  const L = Math.max(2, Math.round(levels));
  const step = 255/(L-1);
  return clamp(Math.round(Math.round(v/step)*step), 0, 255);
}
function bayerPattern(rx, ry, scale){
  const s = clamp(scale, 2, 60);
  let bx = Math.floor(rx/s) % 8; if(bx<0) bx += 8;
  let by = Math.floor(ry/s) % 8; if(by<0) by += 8;
  return BAYER8[by][bx]/64 - 0.5;
}
function beamPattern(rx, ry, scale){
  const s = clamp(scale, 2, 60);
  return Math.sin((rx/(s*2)) * Math.PI*2) * 0.5;
}
function ditherOrdered(pre, W, H, state, patternFn){
  const levels = clamp(Math.round(state.colorLimit), 2, 8);
  const spread = mapRange(state.threshold, 0, 100, 20, 210);
  const out = new Uint8ClampedArray(pre.length);
  const cx = W/2, cy = H/2;
  const angleRad = -state.direction * Math.PI/180;
  const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
  for(let y=0; y<H; y++){
    for(let x=0; x<W; x++){
      const i = (y*W+x)*4;
      const dx = x-cx, dy = y-cy;
      const rx = cx + dx*cos - dy*sin;
      const ry = cy + dx*sin + dy*cos;
      const bias = patternFn(rx, ry, state.scale) * spread;
      out[i]   = quantizeLevel(clamp(pre[i]+bias, 0, 255), levels);
      out[i+1] = quantizeLevel(clamp(pre[i+1]+bias, 0, 255), levels);
      out[i+2] = quantizeLevel(clamp(pre[i+2]+bias, 0, 255), levels);
      out[i+3] = pre[i+3];
    }
  }
  return out;
}
const FS_KERNEL     = [[1,0,7/16],[-1,1,3/16],[0,1,5/16],[1,1,1/16]];
const SIERRA_KERNEL = [[1,0,5/32],[2,0,3/32],[-2,1,2/32],[-1,1,4/32],[0,1,5/32],[1,1,4/32],[2,1,2/32],[-1,2,2/32],[0,2,3/32],[1,2,2/32]];
function ditherErrorDiffusion(pre, W, H, state, kernel){
  const scale = clamp(state.scale, 1, 60);
  const bw = Math.max(1, Math.round(W/scale));
  const bh = Math.max(1, Math.round(H/scale));
  const buf = new Float32Array(bw*bh*3);
  const counts = new Float32Array(bw*bh);
  for(let y=0; y<H; y++){
    const by = Math.min(bh-1, Math.floor(y/scale));
    for(let x=0; x<W; x++){
      const bx = Math.min(bw-1, Math.floor(x/scale));
      const bi = by*bw+bx, si = (y*W+x)*4;
      buf[bi*3]+=pre[si]; buf[bi*3+1]+=pre[si+1]; buf[bi*3+2]+=pre[si+2];
      counts[bi]++;
    }
  }
  for(let i=0;i<bw*bh;i++){ const c=counts[i]||1; buf[i*3]/=c; buf[i*3+1]/=c; buf[i*3+2]/=c; }
  const thresholdBias = (state.threshold-50)*1.6;
  const levels = clamp(Math.round(state.colorLimit), 2, 8);
  const outSmall = new Uint8ClampedArray(bw*bh*3);
  for(let y=0; y<bh; y++){
    const serp = (y%2)===1;
    const xStart = serp ? bw-1 : 0, xEnd = serp ? -1 : bw, xStep = serp ? -1 : 1;
    for(let x=xStart; x!==xEnd; x+=xStep){
      const i = (y*bw+x)*3;
      for(let c=0;c<3;c++){
        const v = clamp(buf[i+c]+thresholdBias, 0, 255);
        const q = quantizeLevel(v, levels);
        const err = v-q;
        outSmall[i+c] = q;
        buf[i+c] = q;
        for(const [dx,dy,w] of kernel){
          const ddx = serp ? -dx : dx;
          const nx = x+ddx, ny = y+dy;
          if(nx>=0 && nx<bw && ny>=0 && ny<bh) buf[(ny*bw+nx)*3+c] += err*w;
        }
      }
    }
  }
  const out = new Uint8ClampedArray(W*H*4);
  for(let y=0; y<H; y++){
    const by = Math.min(bh-1, Math.floor(y/scale));
    for(let x=0; x<W; x++){
      const bx = Math.min(bw-1, Math.floor(x/scale));
      const bi = (by*bw+bx)*3, di = (y*W+x)*4;
      out[di]=outSmall[bi]; out[di+1]=outSmall[bi+1]; out[di+2]=outSmall[bi+2]; out[di+3]=pre[di+3];
    }
  }
  return out;
}

/* halftone: shared cell computation used by both the canvas renderer and the SVG vector exporter */
function halftoneInks(levels, angleRad){
  if(levels<=2) return [{ch:'k', angle:angleRad+Math.PI/4, color:[17,17,17]}];
  if(levels===3) return [
    {ch:'c', angle:angleRad+15*Math.PI/180, color:[0,174,239]},
    {ch:'m', angle:angleRad+75*Math.PI/180, color:[236,0,140]},
    {ch:'y', angle:angleRad+0,              color:[255,241,0]}
  ];
  return [
    {ch:'c', angle:angleRad+15*Math.PI/180, color:[0,174,239]},
    {ch:'m', angle:angleRad+75*Math.PI/180, color:[236,0,140]},
    {ch:'y', angle:angleRad+0,              color:[255,241,0]},
    {ch:'k', angle:angleRad+45*Math.PI/180, color:[17,17,17]}
  ];
}
function inkAmount(ch, r, g, b){
  const c=255-r, m=255-g, y=255-b, k=Math.min(c,m,y)*0.6;
  if(ch==='k') return clamp(k,0,255);
  if(ch==='c') return clamp(c-k,0,255);
  if(ch==='m') return clamp(m-k,0,255);
  if(ch==='y') return clamp(y-k,0,255);
  return 0;
}
function computeHalftoneCells(pre, W, H, state, cap){
  const diag = Math.hypot(W,H);
  const maxSteps = cap || 900;
  let scale = clamp(state.scale, 2, 60);
  if(diag/scale > maxSteps) scale = diag/maxSteps;
  const levels = clamp(Math.round(state.colorLimit), 2, 8);
  const angleRad = state.direction*Math.PI/180;
  const cx=W/2, cy=H/2, R=diag*0.75;
  const spread = mapRange(state.threshold, 0, 100, -0.3, 0.3);
  const grainAmt = state.grain/100*0.5;
  const inks = halftoneInks(levels, angleRad);
  function sample(px,py){
    const xi=Math.round(clamp(px,0,W-1)), yi=Math.round(clamp(py,0,H-1));
    const i=(yi*W+xi)*4;
    return [pre[i],pre[i+1],pre[i+2]];
  }
  const cells = [];
  for(const ink of inks){
    const cos=Math.cos(ink.angle), sin=Math.sin(ink.angle);
    for(let ly=-R; ly<=R; ly+=scale){
      for(let lx=-R; lx<=R; lx+=scale){
        const px = cx + lx*cos - ly*sin;
        const py = cy + lx*sin + ly*cos;
        if(px<-scale||py<-scale||px>W+scale||py>H+scale) continue;
        const [r,g,b] = sample(px,py);
        let amt = inkAmount(ink.ch,r,g,b)/255;
        amt = clamp(amt+spread, 0, 1);
        if(grainAmt>0) amt = clamp(amt + (Math.random()-0.5)*grainAmt, 0, 1);
        if(amt<=0.025) continue;
        const radius = Math.sqrt(amt) * (scale/2) * 1.05;
        cells.push({x:px, y:py, r:radius, color:ink.color});
      }
    }
  }
  return {cells, scale};
}
function renderHalftone(pre, W, H, state){
  const {cells} = computeHalftoneCells(pre, W, H, state, 900);
  const inkC = document.createElement("canvas"); inkC.width=W; inkC.height=H;
  const inkCtx = inkC.getContext("2d");
  inkCtx.fillStyle = "#ffffff"; inkCtx.fillRect(0,0,W,H);
  inkCtx.globalCompositeOperation = "multiply";
  const maskC = document.createElement("canvas"); maskC.width=W; maskC.height=H;
  const maskCtx = maskC.getContext("2d");
  maskCtx.fillStyle = "#000000"; maskCtx.fillRect(0,0,W,H);
  maskCtx.globalCompositeOperation = "lighter";
  for(const c of cells){
    inkCtx.fillStyle = `rgb(${c.color[0]},${c.color[1]},${c.color[2]})`;
    inkCtx.beginPath(); inkCtx.arc(c.x,c.y,c.r,0,Math.PI*2); inkCtx.fill();
    maskCtx.fillStyle = "#ffffff";
    maskCtx.beginPath(); maskCtx.arc(c.x,c.y,c.r,0,Math.PI*2); maskCtx.fill();
  }
  const inkData = inkCtx.getImageData(0,0,W,H).data;
  const maskData = state.transparent ? maskCtx.getImageData(0,0,W,H).data : null;
  const out = new Uint8ClampedArray(W*H*4);
  for(let i=0;i<out.length;i+=4){
    out[i]=inkData[i]; out[i+1]=inkData[i+1]; out[i+2]=inkData[i+2];
    out[i+3] = state.transparent ? maskData[i] : 255;
  }
  return out;
}

/* ============================ colour grade ============================ */
function extractPalette(img, k){
  const sc = document.createElement("canvas"); sc.width=64; sc.height=64;
  const sctx = sc.getContext("2d");
  sctx.drawImage(img, 0, 0, 64, 64);
  const d = sctx.getImageData(0,0,64,64).data;
  const samples = [];
  for(let i=0;i<d.length;i+=4) samples.push([d[i],d[i+1],d[i+2]]);
  const shuffled = samples.slice().sort(()=>Math.random()-0.5);
  let centroids = shuffled.slice(0,k).map(c=>c.slice());
  for(let iter=0; iter<8; iter++){
    const sums = centroids.map(()=>[0,0,0,0]);
    for(const s of samples){
      let bi=0, bd=Infinity;
      for(let ci=0; ci<centroids.length; ci++){
        const c = centroids[ci];
        const dd = (s[0]-c[0])**2 + (s[1]-c[1])**2 + (s[2]-c[2])**2;
        if(dd<bd){ bd=dd; bi=ci; }
      }
      sums[bi][0]+=s[0]; sums[bi][1]+=s[1]; sums[bi][2]+=s[2]; sums[bi][3]++;
    }
    centroids = centroids.map((c,ci)=> sums[ci][3]>0
      ? [sums[ci][0]/sums[ci][3], sums[ci][1]/sums[ci][3], sums[ci][2]/sums[ci][3]]
      : c);
  }
  return centroids.map(c=>c.map(v=>Math.round(clamp(v,0,255))));
}
function applyGradeBias(data, palette, amount){
  if(amount<=0 || !palette || !palette.length) return;
  for(let i=0;i<data.length;i+=4){
    const r=data[i], g=data[i+1], b=data[i+2];
    let best=palette[0], bd=Infinity;
    for(const p of palette){
      const dd=(r-p[0])**2+(g-p[1])**2+(b-p[2])**2;
      if(dd<bd){ bd=dd; best=p; }
    }
    data[i]   = lerp(r, best[0], amount);
    data[i+1] = lerp(g, best[1], amount);
    data[i+2] = lerp(b, best[2], amount);
  }
}
function applyTransparency(data){
  for(let i=0;i<data.length;i+=4){
    const lum = 0.299*data[i]+0.587*data[i+1]+0.114*data[i+2];
    data[i+3] = clamp(255-lum, 0, 255);
  }
}
const MODES = [
  {id:'beam',     name:'Beam Modulation', hint:'A sweeping threshold wave mimics CRT raster scanning — great for glitchy scanline textures.'},
  {id:'byte',     name:'Byte Wave',       hint:'Floyd–Steinberg error diffusion at a chunky block size — the noisy, organic look of early 8-bit displays.'},
  {id:'matrix',   name:'Matrix',          hint:'Ordered dot-matrix (Bayer) dithering with a repeating threshold grid — clean, retro, print-safe.'},
  {id:'sierra',   name:'Sierra',          hint:'The classic Sierra error-diffusion filter — a softer, smoother spread than Byte Wave.'},
  {id:'halftone', name:'Halftone',        hint:'Print-style halftone screen — rotates ink layers per channel for authentic CMYK reproduction.'}
];
const DEFAULTS = {
  mode:'matrix', scale:8, intensity:100, threshold:50, contrast:0, grain:0, direction:0, colorLimit:2,
  grade:false, gradeSource:'image', gradeBias:40,
  exportLongEdge:0, exportFormat:'png', transparent:false
};
const state = { ...DEFAULTS };
const QUICK_PRESETS = [
  ["Newsprint",           {mode:'halftone', scale:7, intensity:100, threshold:52, contrast:18, grain:6,  direction:45, colorLimit:2, grade:false}],
  ["Riso Duo",            {mode:'matrix',   scale:6, intensity:95,  threshold:50, contrast:10, grain:10, direction:15, colorLimit:3, grade:true, gradeBias:55}],
  ["CRT Scan",            {mode:'beam',     scale:4, intensity:100, threshold:50, contrast:15, grain:20, direction:0,  colorLimit:2, grade:false}],
  ["Byte Fade",           {mode:'byte',     scale:3, intensity:100, threshold:48, contrast:5,  grain:8,  direction:0,  colorLimit:3, grade:false}],
  ["Sierra Print",        {mode:'sierra',   scale:4, intensity:90,  threshold:55, contrast:12, grain:4,  direction:0,  colorLimit:4, grade:false}],
  ["Full Colour Halftone",{mode:'halftone', scale:9, intensity:100, threshold:50, contrast:8,  grain:0,  direction:15, colorLimit:4, grade:false}],
];
const PRINT_PRESETS = [
  ["Native resolution", 0],
  ["4in long edge @300dpi", 1200],
  ["6in long edge @300dpi", 1800],
  ["8in long edge @300dpi", 2400],
  ["10in long edge @300dpi", 3000],
  ["12in long edge @300dpi", 3600],
  ["16in long edge @300dpi", 4800],
  ["A4 long edge @300dpi", 3508],
];
function buildBaseImageData(canvas, ctx, img, W, H){
  canvas.width = W; canvas.height = H;
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0,0,W,H);
  ctx.drawImage(img, 0, 0, W, H);
  return ctx.getImageData(0,0,W,H);
}
function preprocess(imgData, st){
  const d = imgData.data;
  const mul = 1 + st.contrast/100;
  const grainAmt = st.grain/100 * 60;
  for(let i=0;i<d.length;i+=4){
    for(let c=0;c<3;c++){
      let v = d[i+c];
      v = (v-128)*mul + 128;
      if(grainAmt>0) v += (Math.random()-0.5)*grainAmt;
      d[i+c] = clamp(v,0,255);
    }
  }
  return imgData;
}
const workCanvas = document.createElement("canvas");
const workCtx = workCanvas.getContext("2d");
const origWorkCanvas = document.createElement("canvas");
const origWorkCtx = origWorkCanvas.getContext("2d");

function composeFrame(W, H){
  const baseForOrig = buildBaseImageData(origWorkCanvas, origWorkCtx, sourceImg, W, H);
  const origData = new Uint8ClampedArray(baseForOrig.data);
  const baseImgData = buildBaseImageData(workCanvas, workCtx, sourceImg, W, H);
  const pre = preprocess(baseImgData, state).data;

  let processed;
  if(state.mode==='matrix')        processed = ditherOrdered(pre, W, H, state, bayerPattern);
  else if(state.mode==='beam')     processed = ditherOrdered(pre, W, H, state, beamPattern);
  else if(state.mode==='byte')     processed = ditherErrorDiffusion(pre, W, H, state, FS_KERNEL);
  else if(state.mode==='sierra')   processed = ditherErrorDiffusion(pre, W, H, state, SIERRA_KERNEL);
  else                              processed = renderHalftone(pre, W, H, state);

  const t = clamp(state.intensity, 0, 100)/100;
  const finalData = new Uint8ClampedArray(pre.length);
  for(let i=0;i<pre.length;i+=4){
    finalData[i]   = lerp(pre[i],   processed[i],   t);
    finalData[i+1] = lerp(pre[i+1], processed[i+1], t);
    finalData[i+2] = lerp(pre[i+2], processed[i+2], t);
    finalData[i+3] = processed[i+3]!==undefined ? processed[i+3] : pre[i+3];
  }
  if(state.grade && palette && palette.length) applyGradeBias(finalData, palette, state.gradeBias/100);
  if(state.transparent && state.mode!=='halftone') applyTransparency(finalData);

  return {
    finalData: new ImageData(finalData, W, H),
    origData: new ImageData(origData, W, H),
    pre
  };
}
function encodeTIFF(w, h, rgba){
  const numEntries = 14;
  const ifdStart = 8;
  const ifdSize = 2 + numEntries*12 + 4;
  const extraStart = ifdStart + ifdSize;
  const bitsPerSampleOff = extraStart;
  const xResOff = bitsPerSampleOff + 8;
  const yResOff = xResOff + 8;
  const stripOff = yResOff + 8;
  const stripByteCount = w*h*4;
  const totalSize = stripOff + stripByteCount;
  const buf = new ArrayBuffer(totalSize);
  const dv = new DataView(buf);
  dv.setUint8(0,0x49); dv.setUint8(1,0x49);
  dv.setUint16(2,42,true);
  dv.setUint32(4,ifdStart,true);
  let off = ifdStart;
  dv.setUint16(off,numEntries,true); off+=2;
  function entry(tag,type,count,value){
    dv.setUint16(off,tag,true); off+=2;
    dv.setUint16(off,type,true); off+=2;
    dv.setUint32(off,count,true); off+=4;
    if(type===3) dv.setUint16(off,value,true); else dv.setUint32(off,value,true);
    off+=4;
  }
  entry(256,4,1,w);
  entry(257,4,1,h);
  entry(258,3,4,bitsPerSampleOff);
  entry(259,3,1,1);
  entry(262,3,1,2);
  entry(273,4,1,stripOff);
  entry(277,3,1,4);
  entry(278,4,1,h);
  entry(279,4,1,stripByteCount);
  entry(282,5,1,xResOff);
  entry(283,5,1,yResOff);
  entry(284,3,1,1);
  entry(296,3,1,2);
  entry(338,3,1,2);
  dv.setUint32(off,0,true); off+=4;
  dv.setUint16(bitsPerSampleOff,8,true); dv.setUint16(bitsPerSampleOff+2,8,true);
  dv.setUint16(bitsPerSampleOff+4,8,true); dv.setUint16(bitsPerSampleOff+6,8,true);
  dv.setUint32(xResOff,300,true); dv.setUint32(xResOff+4,1,true);
  dv.setUint32(yResOff,300,true); dv.setUint32(yResOff+4,1,true);
  new Uint8Array(buf, stripOff, stripByteCount).set(rgba);
  return new Blob([buf], {type:"image/tiff"});
}
function buildSVGVector(w, h, pre, dataURLFallback){
  const dpi = 300;
  let body;
  if(state.mode==='halftone'){
    const {cells} = computeHalftoneCells(pre, w, h, state, 320);
    const bg = state.transparent ? "" : `<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`;
    const circles = cells.map(c=>
      `<circle cx="${c.x.toFixed(2)}" cy="${c.y.toFixed(2)}" r="${c.r.toFixed(2)}" fill="rgb(${c.color[0]},${c.color[1]},${c.color[2]})" fill-opacity="0.82"/>`
    ).join("");
    body = bg + circles;
  } else {
    body = `<image x="0" y="0" width="${w}" height="${h}" href="${dataURLFallback}" preserveAspectRatio="none"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${(w/dpi).toFixed(3)}in" height="${(h/dpi).toFixed(3)}in" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

/* ---- module glue for the React layer ---- */
export function setState(next) { Object.assign(state, next); }
export function getState() { return state; }
export function setSourceImg(img) { sourceImg = img; }
export function getSourceImg() { return sourceImg; }
export function setGradeImg(img) { gradeImg = img; }
export function getGradeImg() { return gradeImg; }
export function setPalette(p) { palette = p; }
export function getPalette() { return palette; }
export function ensurePalette() {
  const src = (state.gradeSource === 'custom' && gradeImg) ? gradeImg : sourceImg;
  if (!src) { palette = null; return null; }
  palette = extractPalette(src, 6);
  return palette;
}

export {
  clamp, lerp, mapRange,
  MODES, DEFAULTS, QUICK_PRESETS, PRINT_PRESETS,
  state,
  composeFrame, computeHalftoneCells, extractPalette,
  encodeTIFF, buildSVGVector,
};
