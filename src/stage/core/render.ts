/* eslint-disable */
// @ts-nocheck
/* ==========================================================================
 * Stage composition renderer — VERBATIM extraction from the original vanilla
 * Stage tool (public/arabella/tools/stage/index.html). This is the pixel-exact
 * export path: html-to-image serialises the DOM that buildComposition() builds,
 * so this code is copied unchanged to guarantee identical output. Do not
 * refactor. The only additions are the module-level state mirrors + setters at
 * the top and the export list at the bottom, which let the React/Zustand layer
 * feed state in without touching the renderer.
 * ======================================================================== */

/* ---- state mirrors: the store syncs these before every render ---- */
let IMAGES = {};                       // imageId -> { src, w, h }
let ui = { travel: false, previewLayout: null };
function imgOf(m){ return m.screenshot && IMAGES[m.screenshot.src] || null; }

export function setImages(next){ IMAGES = next || {}; }
export function getImages(){ return IMAGES; }
export function setRenderUi(next){ ui = { travel: false, previewLayout: null, ...next }; }

const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const uid = () => Math.random().toString(36).slice(2,9);
const el = (tag, cls, css) => {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (css) Object.assign(d.style, css);
  return d;
};
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const OKLAB_OK = CSS.supports('background', 'linear-gradient(in oklab, red, blue)');

function hexToRgb(hex){
  let h = hex.replace('#','');
  if (h.length === 3) h = h.split('').map(c=>c+c).join('');
  const n = parseInt(h, 16);
  return [n>>16&255, n>>8&255, n&255];
}
function rgbToHex(r,g,b){ return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join(''); }
function withAlpha(hex, a){ const [r,g,b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function luma(hex){ const [r,g,b] = hexToRgb(hex); return (0.2126*r + 0.7152*g + 0.0722*b)/255; }
function mixHex(a, b, t){
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t);
}
function darken(hex, t){ return mixHex(hex, '#000000', t); }
function fmtPx(w,h){ return `${w} × ${h}`; }

/* ---- brand ---- */
const BRAND = ['#F42C04','#FF6FAE','#FCCA46','#2DC7FF','#645DD7','#CBA0FF'];
const NEUTRALS = ['#FAFAF8','#EFEFEA','#D8D8D4','#A6A6A8','#6E6E74','#3A3A42','#1C1C22','#0B0B0F'];

/* ---- frame dimension presets ---- */
const DIM_GROUPS = [
  ['Instagram', [
    ['ig-square','Square 1:1',1080,1080],
    ['ig-portrait','Portrait 4:5',1080,1350],
    ['ig-story','Story / Reel 9:16',1080,1920],
  ]],
  ['X / Twitter', [
    ['x-post','Post 16:9',1600,900],
    ['x-post43','Post 4:3',1200,900],
    ['x-header','Header 3:1',1500,500],
  ]],
  ['YouTube', [
    ['yt-thumb','Thumbnail 16:9',1280,720],
    ['yt-art','Channel art',2560,1440],
  ]],
  ['LinkedIn', [
    ['li-post','Post 1.91:1',1200,627],
    ['li-square','Square',1200,1200],
  ]],
  ['Web', [
    ['og','OG image',1200,630],
    ['hero','Hero 21:9',2520,1080],
    ['dribbble','Dribbble 4:3',1600,1200],
  ]],
  ['Print-ish', [
    ['a4-p','A4 portrait 150dpi',1240,1754],
    ['a4-l','A4 landscape 150dpi',1754,1240],
  ]],
];
const DIM_BY_ID = {};
DIM_GROUPS.forEach(([,list]) => list.forEach(p => DIM_BY_ID[p[0]] = p));

/* ---- gradient presets: brand pairs/trios + neutrals ---- */
const GRAD_PRESETS = [
  ['#F42C04','#FF6FAE'], ['#F42C04','#FCCA46'], ['#F42C04','#645DD7'],
  ['#FF6FAE','#FCCA46'], ['#FF6FAE','#645DD7'], ['#FF6FAE','#2DC7FF'],
  ['#FCCA46','#2DC7FF'], ['#2DC7FF','#645DD7'], ['#2DC7FF','#CBA0FF'],
  ['#645DD7','#CBA0FF'], ['#CBA0FF','#FCCA46'],
  ['#F42C04','#FF6FAE','#FCCA46'], ['#FCCA46','#FF6FAE','#645DD7'],
  ['#2DC7FF','#645DD7','#CBA0FF'], ['#F42C04','#645DD7','#2DC7FF'],
  ['#14141A','#31313E'], ['#0B0B0F','#2A2450'], ['#EFEFEA','#CFCFDA'], ['#FAFAF8','#DCE9F2'],
];

/* ---- shadow presets ---- */
const SHADOW_PRESETS = {
  none:      { x:0,  y:0,  blur:0,   color:'#000000', opacity:0 },
  soft:      { x:0,  y:26, blur:60,  color:'#000000', opacity:0.34 },
  dramatic:  { x:0,  y:44, blur:96,  color:'#000000', opacity:0.52 },
  long:      { x:46, y:62, blur:70,  color:'#000000', opacity:0.38 },
  floating:  { x:0,  y:70, blur:130, color:'#000000', opacity:0.42 },
};

/* ---- atmosphere effect defs (params: key → [label,min,max,step,default]) ---- */
const ATMO_DEFS = {
  aurora:    { label:'Aurora',    params:{ intensity:['Intensity',0,100,1,70], blur:['Blur',20,100,1,62], speed:['Speed',0,100,1,30], hue:['Palette shift',0,360,1,0] } },
  cosmic:    { label:'Cosmic',    params:{ density:['Star density',0,100,1,55], hue:['Hue',0,360,1,258], drift:['Drift',0,100,1,25] } },
  glass:     { label:'Glass',     params:{ blur:['Blur',10,100,1,58], tint:['Tint',0,100,1,30], edge:['Edge light',0,100,1,55] } },
  spotlight: { label:'Spotlight', params:{ size:['Size',20,100,1,62], warmth:['Warmth',0,100,1,35], floor:['Floor',0,100,1,14] } },
  grid:      { label:'Grid glow', params:{ glow:['Glow',0,100,1,60], hue:['Hue',0,360,1,205], lines:['Lines',4,40,1,16] } },
};

/* ---- procedural texture ids (built in PART B) ---- */
const TEXTURE_IDS = [
  ['paper','Paper'], ['kraft','Kraft'], ['concrete','Concrete'], ['metal','Brushed metal'],
  ['linen','Linen'], ['marble','Marble'], ['halftone','Halftone'], ['riso','Riso grain'],
  ['scanline','Scanline'], ['foil','Crumpled foil'], ['wood','Wood'], ['denim','Denim'],
];

/* ---- default composition ---- */
function defaultMockup(){
  return {
    id: uid(),
    device: { category:'bare', modelId:'bare', variant:'default', theme:'dark',
              chrome:{ radius:18, innerBorder:true, url:'nimble.studio', tab:'Nimble — Stage', traffic:true,
                       statusBar:true, time:'9:41', island:true, orientation:'portrait', sidebar:false } },
    screenshot: null,
    transform: { scale:100, x:0, y:0, rotate:0, rotateX:0, rotateY:0, perspective:1200 },
    shadow: { presetId:'soft', ...SHADOW_PRESETS.soft },
    reflection: { enabled:false, opacity:30, falloff:40 },
    glow: { enabled:false, strength:40 },
  };
}
function defaultComp(){
  return {
    version: 1,
    frame: {
      width:1080, height:1350, presetId:'ig-portrait',
      background: { type:'gradient', mode:'linear', angle:135,
        stops:[ {color:'#FF6FAE', position:0}, {color:'#645DD7', position:100} ],
        meshPoints:[
          {x:0.2,y:0.25,color:'#F42C04'}, {x:0.85,y:0.2,color:'#FCCA46'},
          {x:0.25,y:0.85,color:'#645DD7'}, {x:0.8,y:0.8,color:'#2DC7FF'},
        ] },
      atmo: { effect:'aurora', params:{} },
      texture: { textureId:'paper', blendMode:'overlay', opacity:40, tint:null, base:'#14141A' },
      image: { src:null, fit:'cover', scale:100, x:0, y:0, blur:0, brightness:100, tint:'#0B0B0F', tintOpacity:0 },
      solid: { color:'#0B0B0F' },
      grain: 10,
      vignette: { amount:0, radius:60 },
      dither: true,
      padding: 0,
      cornerRadius: 0,
      border: { width:0, color:'#FAFAF8' },
      transparent: false,
    },
    mockups: [ defaultMockup() ],
    layoutPresetId: 'centered',
  };
}
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hueShift(hex, deg){
  if (!deg) return hex;
  let [r,g,b] = hexToRgb(hex).map(v=>v/255);
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
  let h = 0;
  if (d){
    if (mx === r) h = ((g-b)/d) % 6;
    else if (mx === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (mx+mn)/2, s = d === 0 ? 0 : d/(1-Math.abs(2*l-1));
  h = (h + deg) % 360;
  const c = (1-Math.abs(2*l-1))*s, x = c*(1-Math.abs((h/60)%2-1)), m = l-c/2;
  let rgb = h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return rgbToHex((rgb[0]+m)*255,(rgb[1]+m)*255,(rgb[2]+m)*255);
}

/* ---------- gradient CSS ---------- */
function stopsCSS(stops){
  return stops.slice().sort((a,b)=>a.position-b.position)
    .map(s=>`${s.color} ${s.position}%`).join(', ');
}
function gradientCSS(bg){
  const interp = OKLAB_OK ? ' in oklab' : '';
  const x = bg.x ?? 50, y = bg.y ?? 50;
  if (bg.mode === 'linear') return `linear-gradient(${bg.angle}deg${interp}, ${stopsCSS(bg.stops)})`;
  if (bg.mode === 'radial') return `radial-gradient(circle at ${x}% ${y}%${interp}, ${stopsCSS(bg.stops)})`;
  if (bg.mode === 'conic')  return `conic-gradient(from ${bg.angle}deg at ${x}% ${y}%${interp}, ${stopsCSS(bg.stops)})`;
  return meshCSS(bg);
}
function meshCSS(bg){
  const pts = bg.meshPoints || [];
  const layers = pts.map(p =>
    `radial-gradient(at ${(p.x*100).toFixed(1)}% ${(p.y*100).toFixed(1)}%, ${p.color} 0%, ${withAlpha(p.color,0)} 62%)`);
  // base = blend of all points so uncovered corners never go black
  let base = pts.length ? pts.reduce((acc,p)=>mixHex(acc,p.color,1/2), pts[0].color) : '#645DD7';
  return layers.join(', ') + `, linear-gradient(${base}, ${base})`;
}

/* ---------- grain / dither tiles ---------- */
let _grainURL = null, _ditherURL = null;
function grainURL(){
  if (_grainURL) return _grainURL;
  const s = 192, c = el('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d'), d = ctx.createImageData(s,s);
  const rnd = mulberry32(7);
  for (let i=0;i<d.data.length;i+=4){
    const v = rnd()*255;
    d.data[i]=v; d.data[i+1]=v; d.data[i+2]=v; d.data[i+3]=255*(0.35+rnd()*0.65);
  }
  ctx.putImageData(d,0,0);
  return _grainURL = c.toDataURL();
}
function ditherURL(){
  if (_ditherURL) return _ditherURL;
  const s = 128, c = el('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d'), d = ctx.createImageData(s,s);
  const rnd = mulberry32(31);
  for (let i=0;i<d.data.length;i+=4){
    const v = rnd() > 0.5 ? 255 : 0;
    d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=14;
  }
  ctx.putImageData(d,0,0);
  return _ditherURL = c.toDataURL();
}

/* ---------- procedural textures ---------- */
const TEX_CACHE = {};
function textureURL(id){
  if (TEX_CACHE[id]) return TEX_CACHE[id];
  const s = 420, c = el('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  const rnd = mulberry32(id.length * 977 + id.charCodeAt(0));
  const noise = (alpha, n=9000, lo=0, hi=255) => {
    for (let i=0;i<n;i++){
      const v = lo + rnd()*(hi-lo);
      x.fillStyle = `rgba(${v},${v},${v},${alpha})`;
      x.fillRect(rnd()*s, rnd()*s, 1.4, 1.4);
    }
  };
  switch(id){
    case 'paper':
      x.fillStyle = '#ECEAE4'; x.fillRect(0,0,s,s); noise(.10, 14000);
      x.strokeStyle = 'rgba(120,115,105,.06)';
      for (let i=0;i<300;i++){
        x.beginPath();
        const px = rnd()*s, py = rnd()*s, a = rnd()*Math.PI;
        x.moveTo(px,py); x.lineTo(px+Math.cos(a)*(4+rnd()*10), py+Math.sin(a)*(4+rnd()*10)); x.stroke();
      }
      break;
    case 'kraft':
      x.fillStyle = '#B98A54'; x.fillRect(0,0,s,s); noise(.12, 16000, 60, 210);
      x.strokeStyle = 'rgba(90,60,25,.09)';
      for (let i=0;i<160;i++){
        const py = rnd()*s;
        x.beginPath(); x.moveTo(rnd()*s, py); x.lineTo(rnd()*s, py + (rnd()-.5)*6); x.stroke();
      }
      break;
    case 'concrete':{
      x.fillStyle = '#9C9C9A'; x.fillRect(0,0,s,s);
      for (let i=0;i<60;i++){
        const g = x.createRadialGradient(rnd()*s, rnd()*s, 0, rnd()*s, rnd()*s, 30+rnd()*90);
        const v = 120+rnd()*70;
        g.addColorStop(0, `rgba(${v},${v},${v},.20)`); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.fillRect(0,0,s,s);
      }
      noise(.16, 15000, 30, 200);
      break;
    }
    case 'metal':{
      const g = x.createLinearGradient(0,0,0,s);
      g.addColorStop(0,'#B9BCC2'); g.addColorStop(.5,'#D8DBE0'); g.addColorStop(1,'#AEB1B8');
      x.fillStyle = g; x.fillRect(0,0,s,s);
      for (let i=0;i<1400;i++){
        const py = rnd()*s, a = .02+rnd()*.09, v = rnd()>.5?255:60;
        x.strokeStyle = `rgba(${v},${v},${v},${a})`;
        x.beginPath(); x.moveTo(0,py); x.lineTo(s,py+(rnd()-.5)*1.5); x.stroke();
      }
      break;
    }
    case 'linen':{
      x.fillStyle = '#D9D2C4'; x.fillRect(0,0,s,s);
      x.strokeStyle = 'rgba(115,105,85,.16)';
      for (let i=0;i<s;i+=3){ x.beginPath(); x.moveTo(i,0); x.lineTo(i,s); x.stroke(); }
      x.strokeStyle = 'rgba(255,252,240,.14)';
      for (let i=0;i<s;i+=3){ x.beginPath(); x.moveTo(0,i); x.lineTo(s,i); x.stroke(); }
      noise(.05, 6000);
      break;
    }
    case 'marble':{
      x.fillStyle = '#EDEDF0'; x.fillRect(0,0,s,s);
      for (let v=0; v<10; v++){
        x.strokeStyle = `rgba(120,125,140,${.08+rnd()*.12})`;
        x.lineWidth = .6 + rnd()*1.8;
        x.beginPath();
        let px = rnd()*s, py = 0;
        x.moveTo(px,py);
        while (py < s){ px += (rnd()-.5)*46; py += 14+rnd()*26; x.lineTo(px,py); }
        x.stroke();
      }
      noise(.04, 5000);
      break;
    }
    case 'halftone':{
      x.fillStyle = '#F2F0EA'; x.fillRect(0,0,s,s);
      x.fillStyle = 'rgba(30,30,35,.75)';
      const step = 14;
      for (let ry=0; ry<s+step; ry+=step) for (let rx=0; rx<s+step; rx+=step){
        const ox = (Math.floor(ry/step)%2)*step/2;
        const r = 1.2 + 2.2*(0.5+0.5*Math.sin(rx*.045)*Math.cos(ry*.045));
        x.beginPath(); x.arc(rx+ox, ry, r, 0, 7); x.fill();
      }
      break;
    }
    case 'riso':
      x.fillStyle = '#E8E4DA'; x.fillRect(0,0,s,s); noise(.28, 26000, 20, 160);
      break;
    case 'scanline':{
      x.fillStyle = '#101014'; x.fillRect(0,0,s,s);
      for (let py=0; py<s; py+=4){
        x.fillStyle = 'rgba(210,215,230,.10)'; x.fillRect(0,py,s,1.4);
        x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0,py+2,s,1);
      }
      noise(.05, 4000);
      break;
    }
    case 'foil':{
      x.fillStyle = '#BFC3CC'; x.fillRect(0,0,s,s);
      for (let i=0;i<240;i++){
        const px = rnd()*s, py = rnd()*s, r = 8+rnd()*34, v = 120+rnd()*135;
        x.fillStyle = `rgba(${v},${v},${v+8},${.25+rnd()*.4})`;
        x.beginPath();
        x.moveTo(px+r*Math.cos(0), py+r*Math.sin(0));
        for (let k=1;k<5;k++){ const a = k*1.257 + rnd()*.7; x.lineTo(px+r*Math.cos(a)*(.5+rnd()*.7), py+r*Math.sin(a)*(.5+rnd()*.7)); }
        x.closePath(); x.fill();
      }
      break;
    }
    case 'wood':{
      const g = x.createLinearGradient(0,0,s,0);
      g.addColorStop(0,'#8A5A34'); g.addColorStop(.5,'#9C6A40'); g.addColorStop(1,'#84552F');
      x.fillStyle = g; x.fillRect(0,0,s,s);
      for (let i=0;i<70;i++){
        const px = rnd()*s;
        x.strokeStyle = `rgba(55,32,12,${.10+rnd()*.20})`;
        x.lineWidth = .7+rnd()*2;
        x.beginPath(); x.moveTo(px,0);
        let cx = px;
        for (let py=0; py<=s; py+=22){ cx += (rnd()-.5)*7; x.lineTo(cx,py); }
        x.stroke();
      }
      noise(.06, 6000, 30, 120);
      break;
    }
    case 'denim':{
      x.fillStyle = '#33517A'; x.fillRect(0,0,s,s);
      x.strokeStyle = 'rgba(210,220,240,.13)'; x.lineWidth = 1.2;
      for (let i=-s;i<s*2;i+=4){ x.beginPath(); x.moveTo(i,0); x.lineTo(i+s,s); x.stroke(); }
      x.strokeStyle = 'rgba(10,20,40,.22)';
      for (let i=-s;i<s*2;i+=8){ x.beginPath(); x.moveTo(i+2,0); x.lineTo(i+2+s,s); x.stroke(); }
      noise(.05, 5000);
      break;
    }
  }
  return TEX_CACHE[id] = c.toDataURL();
}

/* ---------- atmosphere painters ---------- */
/* Each paints logical frame units onto ctx already scaled; t in seconds. */
const ATMO_PAINTERS = {
  aurora(ctx, w, h, p, t){
    const speed = (p.speed ?? 30)/100, inten = (p.intensity ?? 70)/100;
    const blur = (p.blur ?? 62)/100, shift = p.hue ?? 0;
    ctx.fillStyle = hueShift('#0B0A14', shift*.3); ctx.fillRect(0,0,w,h);
    const cols = ['#645DD7','#2DC7FF','#FF6FAE','#F42C04'].map(c=>hueShift(c, shift));
    const R = Math.max(w,h);
    ctx.save();
    ctx.filter = `blur(${Math.round(R*0.055*(0.4+blur))}px)`;
    ctx.globalCompositeOperation = 'lighter';
    cols.forEach((col,i)=>{
      const a = t*speed*0.25 + i*1.7;
      const cx = w*(0.5 + 0.34*Math.cos(a + i));
      const cy = h*(0.5 + 0.34*Math.sin(a*0.8 + i*2.1));
      const r = R*(0.26 + 0.1*Math.sin(a*1.3 + i));
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      g.addColorStop(0, withAlpha(col, 0.62*inten));
      g.addColorStop(1, withAlpha(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
    });
    ctx.restore();
  },
  cosmic(ctx, w, h, p, t){
    const density = (p.density ?? 55)/100, hue = p.hue ?? 258, drift = (p.drift ?? 25)/100;
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0, hueShift('#070512', hue-258));
    g.addColorStop(1, hueShift('#191040', hue-258));
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    // nebula washes
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    [[.28,.3,'#645DD7'],[.72,.62,'#FF6FAE'],[.5,.85,'#2DC7FF']].forEach(([fx,fy,col],i)=>{
      const r = Math.max(w,h)*0.42;
      const ng = ctx.createRadialGradient(w*fx,h*fy,0,w*fx,h*fy,r);
      ng.addColorStop(0, withAlpha(hueShift(col, hue-258), .17));
      ng.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ng; ctx.fillRect(0,0,w,h);
    });
    ctx.restore();
    // stars
    const rnd = mulberry32(42), n = Math.round(90 + density*360);
    const off = (t*drift*8);
    for (let i=0;i<n;i++){
      const sx = (rnd()*w + off*(0.3+rnd()*0.7)) % w;
      const sy = rnd()*h;
      const tw = 0.55 + 0.45*Math.sin(t*(0.5+rnd()*1.5) + i);
      const sz = rnd()*1.6 + 0.4;
      ctx.fillStyle = `rgba(235,238,255,${(0.25+rnd()*0.7)*tw})`;
      ctx.fillRect(sx, sy, sz, sz);
    }
  },
  glass(ctx, w, h, p, t){
    const blur = (p.blur ?? 58)/100, tint = (p.tint ?? 30)/100, edge = (p.edge ?? 55)/100;
    // colour field behind the pane
    const field = (c) => {
      c.fillStyle = '#141322'; c.fillRect(0,0,w,h);
      c.save(); c.globalCompositeOperation = 'lighter';
      [['#F42C04',.22,.3],['#FCCA46',.78,.24],['#645DD7',.3,.8],['#2DC7FF',.78,.76]].forEach(([col,fx,fy],i)=>{
        const a = t*0.05 + i;
        const cx = w*fx + Math.cos(a)*w*0.04, cy = h*fy + Math.sin(a)*h*0.04;
        const r = Math.max(w,h)*0.38;
        const g = c.createRadialGradient(cx,cy,0,cx,cy,r);
        g.addColorStop(0, withAlpha(col,.75)); g.addColorStop(1, withAlpha(col,0));
        c.fillStyle = g; c.beginPath(); c.arc(cx,cy,r,0,7); c.fill();
      });
      c.restore();
    };
    field(ctx);
    // frosted pane
    const m = Math.min(w,h)*0.07, rx = m, ry = m, rw = w-m*2, rh = h-m*2, rad = Math.min(w,h)*0.045;
    const off = el('canvas'); off.width = Math.max(2, Math.round(w/4)); off.height = Math.max(2, Math.round(h/4));
    const oc = off.getContext('2d'); oc.scale(off.width/w, off.height/h); field(oc);
    ctx.save();
    ctx.beginPath(); ctx.roundRect(rx,ry,rw,rh,rad); ctx.clip();
    ctx.filter = `blur(${Math.round(Math.min(w,h)*0.05*(.3+blur))}px)`;
    ctx.drawImage(off, -w*0.02, -h*0.02, w*1.04, h*1.04);
    ctx.filter = 'none';
    ctx.fillStyle = `rgba(255,255,255,${0.05 + tint*0.22})`;
    ctx.fillRect(rx,ry,rw,rh);
    ctx.restore();
    // specular edge + chromatic fringe
    ctx.save();
    ctx.lineWidth = Math.max(1.2, Math.min(w,h)*0.0028);
    const eg = ctx.createLinearGradient(rx,ry,rx+rw,ry+rh);
    eg.addColorStop(0, `rgba(255,255,255,${.75*edge})`);
    eg.addColorStop(.4, `rgba(255,255,255,${.12*edge})`);
    eg.addColorStop(1, `rgba(255,255,255,${.4*edge})`);
    ctx.strokeStyle = eg;
    ctx.beginPath(); ctx.roundRect(rx,ry,rw,rh,rad); ctx.stroke();
    ctx.globalAlpha = .3*edge;
    ctx.strokeStyle = 'rgba(255,80,80,.8)';
    ctx.beginPath(); ctx.roundRect(rx-1.2,ry-1.2,rw+2.4,rh+2.4,rad); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,160,255,.8)';
    ctx.beginPath(); ctx.roundRect(rx+1.2,ry+1.2,rw-2.4,rh-2.4,rad); ctx.stroke();
    ctx.restore();
  },
  spotlight(ctx, w, h, p, t){
    const size = (p.size ?? 62)/100, warmth = (p.warmth ?? 35)/100, floor = (p.floor ?? 14)/100;
    const sx = (p.x ?? 0.5)*w, sy = (p.y ?? 0.3)*h;
    ctx.fillStyle = '#0A0A0D'; ctx.fillRect(0,0,w,h);
    const warm = mixHex('#FFFFFF', '#FCCA46', warmth);
    const r = Math.max(w,h)*(0.35+size*0.75);
    const g = ctx.createRadialGradient(sx,sy,0,sx,sy,r);
    g.addColorStop(0, withAlpha(warm,.85));
    g.addColorStop(.35, withAlpha(warm,.28));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    if (floor > 0.01){
      const fg = ctx.createLinearGradient(0,h*.62,0,h);
      fg.addColorStop(0,'rgba(0,0,0,0)');
      fg.addColorStop(1, withAlpha(warm, floor*.9));
      ctx.fillStyle = fg; ctx.fillRect(0,h*.62,w,h*.38);
    }
  },
  grid(ctx, w, h, p, t){
    const glow = (p.glow ?? 60)/100, hue = p.hue ?? 205, lines = Math.round(p.lines ?? 16);
    const col = hueShift('#2DC7FF', hue-197);
    ctx.fillStyle = '#08080D'; ctx.fillRect(0,0,w,h);
    const horizon = h*0.46;
    // bloom
    const g = ctx.createRadialGradient(w/2,horizon,0,w/2,horizon,Math.max(w,h)*.6);
    g.addColorStop(0, withAlpha(col, .5*glow));
    g.addColorStop(.4, withAlpha(col, .12*glow));
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = withAlpha(col, .55);
    ctx.lineWidth = Math.max(1, Math.min(w,h)/900);
    // verticals converging on vanishing point
    for (let i=-lines;i<=lines;i++){
      ctx.beginPath();
      ctx.moveTo(w/2 + (i/lines)*w*1.6, h);
      ctx.lineTo(w/2 + (i/lines)*w*0.05, horizon);
      ctx.stroke();
    }
    // horizontals racing toward viewer
    const phase = (t*0.05) % 1;
    for (let i=0;i<14;i++){
      const f = ((i + phase)/14);
      const y = horizon + Math.pow(f, 2.4)*(h-horizon);
      ctx.globalAlpha = 0.15 + f*0.85;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // horizon line
    ctx.strokeStyle = withAlpha(col,.9); ctx.lineWidth *= 1.6;
    ctx.beginPath(); ctx.moveTo(0,horizon); ctx.lineTo(w,horizon); ctx.stroke();
  },
};
function atmoParams(frame){
  // merge stored params over defaults
  const def = ATMO_DEFS[frame.atmo.effect];
  const out = {};
  Object.entries(def.params).forEach(([k, [,,,,dflt]]) => out[k] = frame.atmo.params[k] ?? dflt);
  ['x','y'].forEach(k => { if (frame.atmo.params[k] != null) out[k] = frame.atmo.params[k]; });
  return out;
}
function paintAtmo(canvas, frame, t, scaleFactor = 1){
  const w = frame.width, h = frame.height;
  // preview quality cap for perf; export passes higher scaleFactor
  const bw = Math.round(w*scaleFactor), bh = Math.round(h*scaleFactor);
  if (canvas.width !== bw || canvas.height !== bh){ canvas.width = bw; canvas.height = bh; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(scaleFactor,0,0,scaleFactor,0,0);
  ATMO_PAINTERS[frame.atmo.effect](ctx, w, h, atmoParams(frame), t);
}
function screenContent(m, opts, fontBase){
  const box = el('div','screen-box',{position:'absolute', inset:'0', overflow:'hidden'});
  const info = imgOf(m);
  if (info){
    const s = m.screenshot;
    const img = el('img');
    img.src = info.src;
    img.draggable = false;
    Object.assign(img.style, {
      width:'100%', height:'100%', display:'block',
      objectFit: s.fit === 'fill' ? 'fill' : s.fit,
      transform:`translate(${s.x}%, ${s.y}%) scale(${s.scale/100})`,
      transformOrigin:'center center',
    });
    box.style.background = '#0b0b0e';
    box.appendChild(img);
    if (opts.interactive) box.classList.add('screen-pan');
  } else {
    const fs = Math.round(fontBase);
    Object.assign(box.style, {
      background: m.device.theme === 'light' ? '#ECECEF' : '#131318',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap: fs*0.5+'px', color: m.device.theme === 'light' ? '#8a8a92' : '#6a6a74',
      cursor: opts.interactive ? 'pointer' : 'default',
    });
    const plus = el('div', null, {
      width:fs*2+'px', height:fs*2+'px', borderRadius:'50%',
      border:`${Math.max(2,fs*0.09)}px solid currentColor`, display:'flex',
      alignItems:'center', justifyContent:'center', fontSize:fs*1.2+'px', lineHeight:'1', fontWeight:'300',
    });
    plus.textContent = '+';
    const t1 = el('div', null, {fontSize:fs+'px', fontWeight:'700', letterSpacing:'-0.01em'});
    t1.textContent = 'Paste a screenshot to start';
    const t2 = el('div', null, {fontSize:fs*0.62+'px', fontWeight:'500', opacity:.7});
    t2.textContent = '⌘V anywhere · drop an image · or click here';
    box.append(plus, t1, t2);
    if (opts.interactive){ box.classList.add('screen-empty'); box.setAttribute('title','Choose an image'); }
  }
  return box;
}
function screenshotAspect(m, fallback){
  const info = imgOf(m);
  return info ? info.w / info.h : fallback;
}

/* ---- shared chrome bits ---- */
function trafficLights(size){
  const wrap = el('div', null, {display:'flex', gap:size*0.62+'px', alignItems:'center', flex:'none'});
  ['#FF5F57','#FEBC2E','#28C840'].forEach(c=>{
    wrap.appendChild(el('div', null, {width:size+'px', height:size+'px', borderRadius:'50%', background:c}));
  });
  return wrap;
}
function statusBarSVG(color, h){
  const w = h*3.4;
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 68 20" fill="${color}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="11" width="3" height="5" rx="1"/><rect x="5" y="8.5" width="3" height="7.5" rx="1"/>
    <rect x="10" y="6" width="3" height="10" rx="1"/><rect x="15" y="3.5" width="3" height="12.5" rx="1"/>
    <path d="M30.5 8.2a8.6 8.6 0 0 1 10.8 0l-1.6 1.9a6.2 6.2 0 0 0-7.6 0z"/>
    <path d="M32.7 10.9a5.2 5.2 0 0 1 6.4 0l-1.7 2a2.7 2.7 0 0 0-3 0z"/>
    <circle cx="35.9" cy="14.6" r="1.6"/>
    <rect x="46" y="4.5" width="18" height="11" rx="3.4" fill="none" stroke="${color}" stroke-opacity=".45" stroke-width="1.4"/>
    <rect x="48" y="6.5" width="12.5" height="7" rx="1.8"/>
    <path d="M65.5 8 v4 a2.2 2.2 0 0 0 0 -4z" fill-opacity=".45"/>
  </svg>`;
  const d = el('div', null, {display:'flex', alignItems:'center'});
  d.innerHTML = svg;
  return d;
}

/* ---- device catalogue ----
   Each builder returns { root, devW, devH }. The screenshot slot is built
   via screenContent(). New devices: add one entry, no renderer changes.  */
const DEVICES = {};

DEVICES.bare = {
  category:'bare', label:'None — bare shot',
  build(m, opts){
    const aspect = screenshotAspect(m, 1.5);
    const devW = 1200, devH = Math.round(devW/aspect);
    const ch = m.device.chrome;
    const root = el('div', null, {
      position:'relative', width:devW+'px', height:devH+'px',
      borderRadius:(ch.radius ?? 18)+'px', overflow:'hidden',
      boxShadow: ch.innerBorder ? 'inset 0 0 0 1.5px rgba(255,255,255,.14)' : 'none',
    });
    const screen = screenContent(m, opts, 34);
    screen.style.borderRadius = 'inherit';
    root.appendChild(screen);
    if (ch.innerBorder){
      root.appendChild(el('div', null, {position:'absolute', inset:0, borderRadius:'inherit',
        boxShadow:'inset 0 0 0 1.5px rgba(255,255,255,.14)', pointerEvents:'none', zIndex:5}));
    }
    return { root, devW, devH };
  }
};

function browserBuilder(style){
  return {
    category:'browser', label:style[0].toUpperCase()+style.slice(1),
    build(m, opts){
      const ch = m.device.chrome;
      const dark = m.device.theme === 'dark';
      const aspect = screenshotAspect(m, 1.6);
      const devW = 1280;
      const sidebar = style === 'arc' && ch.sidebar;
      const sbW = sidebar ? 250 : 0;
      const contentW = devW - sbW;
      const contentH = Math.round(contentW/aspect);
      const C = dark
        ? { bar:'#26262C', bar2:'#1D1D22', line:'rgba(255,255,255,.09)', txt:'#D6D6DE', txt2:'#8B8B95', field:'#333339', body:'#151519' }
        : { bar:'#F2F2F4', bar2:'#E7E7EA', line:'rgba(0,0,0,.09)',       txt:'#3E3E44', txt2:'#8E8E96', field:'#FFFFFF', body:'#FBFBFC' };
      const barH = style === 'chrome' || style === 'firefox' ? 118 : style === 'minimal' ? 56 : 74;
      const devH = (sidebar ? Math.max(contentH, 620) : contentH) + (sidebar ? 0 : barH);
      const root = el('div', null, {
        position:'relative', width:devW+'px', height:devH+'px', borderRadius:'20px', overflow:'hidden',
        background:C.body, boxShadow:`inset 0 0 0 1.5px ${C.line}`,
        fontFamily:"'Inter',-apple-system,sans-serif",
      });
      const pill = (w, center) => {
        const p = el('div', null, {
          height:'40px', borderRadius: style==='firefox' ? '8px' : '20px', background:C.field,
          display:'flex', alignItems:'center', justifyContent: center?'center':'flex-start',
          padding:'0 18px', color:C.txt, fontSize:'17px', fontWeight:'500', letterSpacing:'-0.01em',
          boxShadow:`inset 0 0 0 1px ${C.line}`, minWidth:'0',
          width: w, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis',
        });
        const lock = el('span', null, {fontSize:'14px', marginRight:'8px', opacity:.55, flex:'none'});
        lock.textContent = '🔒';
        const u = el('span', null, {overflow:'hidden', textOverflow:'ellipsis'});
        u.textContent = ch.url || 'nimble.studio';
        p.append(lock, u);
        return p;
      };
      const favicon = () => {
        const letter = (ch.tab || ch.url || 'N').trim().charAt(0).toUpperCase() || 'N';
        const f = el('div', null, {
          width:'26px', height:'26px', borderRadius:'7px', flex:'none',
          background:'linear-gradient(135deg,#645DD7,#2DC7FF)', color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:'800',
        });
        f.textContent = letter;
        return f;
      };

      let contentTop = barH;
      if (style === 'safari' || style === 'minimal'){
        const bar = el('div', null, {
          position:'absolute', left:0, top:0, right:0, height:barH+'px', background:C.bar,
          display:'flex', alignItems:'center', gap:'18px', padding:'0 20px',
          borderBottom:`1.5px solid ${C.line}`,
        });
        if (ch.traffic !== false) bar.appendChild(trafficLights(15));
        if (style === 'safari'){
          const nav = el('div', null, {display:'flex', gap:'16px', color:C.txt2, fontSize:'20px', flex:'none'});
          nav.innerHTML = '<span>‹</span><span>›</span>';
          bar.appendChild(nav);
          const spacer1 = el('div', null, {flex:'1'});
          const spacer2 = el('div', null, {flex:'1'});
          const p = pill('46%', true);
          bar.append(spacer1, p, spacer2);
          const acts = el('div', null, {display:'flex', gap:'16px', color:C.txt2, fontSize:'17px', flex:'none'});
          acts.innerHTML = '<span>⇪</span><span>+</span>';
          bar.appendChild(acts);
        } else {
          const spacer1 = el('div', null, {flex:'1'});
          const dom = el('div', null, {color:C.txt2, fontSize:'15px', fontWeight:'600', letterSpacing:'.02em'});
          dom.textContent = ch.url || 'nimble.studio';
          const spacer2 = el('div', null, {flex:'1'});
          bar.append(spacer1, dom, spacer2);
        }
        root.appendChild(bar);
      }
      else if (style === 'chrome' || style === 'firefox'){
        const strip = el('div', null, {
          position:'absolute', left:0, top:0, right:0, height:'58px', background:C.bar2,
          display:'flex', alignItems:'flex-end', padding:'0 16px', gap:'10px',
        });
        if (ch.traffic !== false){
          const tl = trafficLights(15); tl.style.marginBottom = '19px'; tl.style.marginRight = '8px';
          strip.appendChild(tl);
        }
        const tab = el('div', null, {
          height:'44px', minWidth:'250px', maxWidth:'340px',
          borderRadius: style==='chrome' ? '14px 14px 0 0' : '10px',
          marginBottom: style==='chrome' ? '0' : '7px',
          background: style==='chrome' ? C.bar : C.field,
          display:'flex', alignItems:'center', gap:'10px', padding:'0 14px',
          color:C.txt, fontSize:'15.5px', fontWeight:'600',
          boxShadow: style==='firefox' ? `inset 0 0 0 1px ${C.line}` : 'none',
        });
        tab.appendChild(favicon());
        const tt = el('span', null, {overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'});
        tt.textContent = ch.tab || 'Nimble — Stage';
        tab.appendChild(tt);
        const closeX = el('span', null, {marginLeft:'auto', color:C.txt2, fontSize:'14px', flex:'none'});
        closeX.textContent = '✕';
        tab.appendChild(closeX);
        strip.appendChild(tab);
        const plus = el('div', null, {color:C.txt2, fontSize:'22px', marginBottom:'14px'});
        plus.textContent = '+';
        strip.appendChild(plus);
        root.appendChild(strip);
        const bar = el('div', null, {
          position:'absolute', left:0, top:'58px', right:0, height:'60px', background:C.bar,
          display:'flex', alignItems:'center', gap:'16px', padding:'0 18px',
          borderBottom:`1.5px solid ${C.line}`,
        });
        const nav = el('div', null, {display:'flex', gap:'18px', color:C.txt2, fontSize:'19px', flex:'none'});
        nav.innerHTML = '<span>‹</span><span>›</span><span>⟳</span>';
        bar.appendChild(nav);
        bar.appendChild(pill('1', false)).style.flex = '1';
        const av = el('div', null, {width:'28px', height:'28px', borderRadius:'50%', flex:'none',
          background:'linear-gradient(135deg,#FF6FAE,#FCCA46)'});
        bar.appendChild(av);
        root.appendChild(bar);
      }
      else if (style === 'arc'){
        if (sidebar){
          contentTop = 0;
          const sb = el('div', null, {
            position:'absolute', left:0, top:0, bottom:0, width:sbW+'px',
            background: dark ? 'linear-gradient(165deg,#2A2140,#1C1B2E)' : 'linear-gradient(165deg,#E8E2F6,#DDE8F4)',
            padding:'18px 14px', display:'flex', flexDirection:'column', gap:'14px',
          });
          if (ch.traffic !== false) sb.appendChild(trafficLights(14));
          sb.appendChild(pill('100%', false));
          const tabName = el('div', null, {
            display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', borderRadius:'12px',
            background: dark ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.65)',
            color:C.txt, fontSize:'15.5px', fontWeight:'600',
          });
          tabName.appendChild(favicon());
          const tn = el('span', null, {overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis'});
          tn.textContent = ch.tab || 'Nimble — Stage';
          tabName.appendChild(tn);
          sb.appendChild(tabName);
          for (let i=0;i<2;i++){
            sb.appendChild(el('div', null, {height:'38px', borderRadius:'12px',
              background: dark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.4)'}));
          }
          root.appendChild(sb);
        } else {
          const bar = el('div', null, {
            position:'absolute', left:0, top:0, right:0, height:barH+'px',
            background: dark ? 'linear-gradient(90deg,#2A2140,#22203A)' : 'linear-gradient(90deg,#EDE7F8,#E3ECF7)',
            display:'flex', alignItems:'center', gap:'18px', padding:'0 20px',
          });
          if (ch.traffic !== false) bar.appendChild(trafficLights(15));
          const spacer1 = el('div', null, {flex:'1'}), spacer2 = el('div', null, {flex:'1'});
          bar.append(spacer1, pill('44%', true), spacer2);
          root.appendChild(bar);
        }
      }

      const content = el('div', null, {
        position:'absolute', left:sbW+'px', top:contentTop+'px', right:0, bottom:0, overflow:'hidden',
        borderRadius: sidebar ? '14px 0 0 0' : '0',
      });
      content.appendChild(screenContent(m, opts, 30));
      root.appendChild(content);
      return { root, devW, devH };
    }
  };
}
['safari','chrome','arc','firefox','minimal'].forEach(s => DEVICES['browser-'+s] = browserBuilder(s));

const PHONE_FINISHES = {
  space: { frame:'#3A3A3E', edge:'#232326', label:'Space Black' },
  sky:   { frame:'#BFD3E4', edge:'#93AEC6', label:'Sky Blue' },
  gold:  { frame:'#E8DCC8', edge:'#C9B896', label:'Light Gold' },
  cloud: { frame:'#E9E9EC', edge:'#C4C4CA', label:'Cloud White' },
};
function phoneBuilder(air){
  return {
    category:'phone', label: air ? 'iPhone 17 Air' : 'iPhone 17',
    variants: PHONE_FINISHES,
    build(m, opts){
      const ch = m.device.chrome;
      const fin = PHONE_FINISHES[m.device.variant] || PHONE_FINISHES.space;
      const devW = air ? 446 : 462, devH = air ? 936 : 948;
      const R = air ? 82 : 76, frameW = air ? 7 : 9, bezel = air ? 9 : 11;
      const root = el('div', null, {position:'relative', width:devW+'px', height:devH+'px'});
      // side buttons (behind body)
      const btn = (side, top, hgt) => el('div', null, {
        position:'absolute', [side]:'-3px', top:top+'px', width:'4px', height:hgt+'px',
        borderRadius:'2.5px', background:fin.edge,
      });
      root.append(btn('left',188,34), btn('left',248,62), btn('left',322,62), btn('right',258,96));
      // body
      const body = el('div', null, {
        position:'absolute', inset:'0', borderRadius:R+'px',
        background:`linear-gradient(145deg, ${fin.frame}, ${darken(fin.frame,.25)})`,
        boxShadow:`inset 0 0 0 2px ${withAlpha('#ffffff', .18)}, inset 0 0 0 ${frameW}px ${fin.edge}`,
      });
      root.appendChild(body);
      const bezelEl = el('div', null, {
        position:'absolute', inset:frameW+'px', borderRadius:(R-frameW)+'px', background:'#050506',
      });
      root.appendChild(bezelEl);
      const screen = el('div', null, {
        position:'absolute', inset:(frameW+bezel)+'px', borderRadius:(R-frameW-bezel+4)+'px', overflow:'hidden',
        background:'#0b0b0e',
      });
      screen.appendChild(screenContent(m, opts, 24));
      root.appendChild(screen);
      // dynamic island
      if (ch.island !== false){
        root.appendChild(el('div', null, {
          position:'absolute', left:'50%', top:(frameW+bezel+16)+'px', transform:'translateX(-50%)',
          width:'118px', height:'34px', borderRadius:'18px', background:'#020203', zIndex:6,
        }));
      }
      // status bar
      if (ch.statusBar !== false){
        const sbCol = '#FFFFFF';
        const time = el('div', null, {
          position:'absolute', left:(frameW+bezel+34)+'px', top:(frameW+bezel+20)+'px',
          color:sbCol, fontSize:'24px', fontWeight:'700', letterSpacing:'-.01em', zIndex:6,
          fontVariantNumeric:'tabular-nums', textShadow:'0 0 8px rgba(0,0,0,.35)',
        });
        time.textContent = ch.time || '9:41';
        const icons = el('div', null, {
          position:'absolute', right:(frameW+bezel+28)+'px', top:(frameW+bezel+22)+'px', zIndex:6,
          filter:'drop-shadow(0 0 6px rgba(0,0,0,.3))',
        });
        icons.appendChild(statusBarSVG(sbCol, 22));
        root.append(time, icons);
      }
      return { root, devW, devH };
    }
  };
}
DEVICES['iphone-17'] = phoneBuilder(false);
DEVICES['iphone-17-air'] = phoneBuilder(true);

DEVICES['ipad-pro'] = {
  category:'tablet', label:'iPad Pro 13"',
  variants:{ space:{frame:'#43434A', label:'Space Grey'}, silver:{frame:'#D7D7DC', label:'Silver'} },
  build(m, opts){
    const ch = m.device.chrome;
    const land = ch.orientation === 'landscape';
    const devW = land ? 1180 : 850, devH = land ? 850 : 1180;
    const fin = this.variants[m.device.variant] || this.variants.space;
    const bezel = 42, R = 46;
    const root = el('div', null, {position:'relative', width:devW+'px', height:devH+'px'});
    root.appendChild(el('div', null, {
      position:'absolute', inset:0, borderRadius:R+'px',
      background:`linear-gradient(150deg, ${fin.frame}, ${darken(fin.frame,.3)})`,
      boxShadow:'inset 0 0 0 2px rgba(255,255,255,.16)',
    }));
    root.appendChild(el('div', null, {
      position:'absolute', inset:'6px', borderRadius:(R-6)+'px', background:'#050506',
    }));
    const screen = el('div', null, {
      position:'absolute', inset:bezel+'px', borderRadius:'20px', overflow:'hidden', background:'#0b0b0e',
    });
    screen.appendChild(screenContent(m, opts, 26));
    root.appendChild(screen);
    // camera
    root.appendChild(el('div', null, {
      position:'absolute', left: land ? '18px' : '50%', top: land ? '50%' : '18px',
      transform: land ? 'translateY(-50%)' : 'translateX(-50%)',
      width:'9px', height:'9px', borderRadius:'50%', background:'#1c1c22',
      boxShadow:'inset 0 0 2px rgba(140,160,200,.8)',
    }));
    return { root, devW, devH };
  }
};

DEVICES['macbook-pro-14'] = {
  category:'laptop', label:'MacBook Pro 14"',
  variants:{ space:{frame:'#2E2E33', deck:'#3A3A40', label:'Space Black'}, silver:{frame:'#C9CBD1', deck:'#D8DADF', label:'Silver'} },
  build(m, opts){
    const fin = this.variants[m.device.variant] || this.variants.space;
    const dispW = 1150, bez = 18, scrW = dispW - bez*2;
    const scrH = Math.round(scrW / 1.6), dispH = scrH + bez*2 + 6;
    const baseH = 34, devW = 1400, devH = dispH + baseH;
    const root = el('div', null, {position:'relative', width:devW+'px', height:devH+'px'});
    const disp = el('div', null, {
      position:'absolute', left:((devW-dispW)/2)+'px', top:'0', width:dispW+'px', height:dispH+'px',
      borderRadius:'26px 26px 10px 10px', background:'#050507',
      boxShadow:`inset 0 0 0 3px ${fin.frame}, inset 0 0 0 4px rgba(255,255,255,.07)`,
    });
    const screen = el('div', null, {
      position:'absolute', left:bez+'px', top:bez+'px', width:scrW+'px', height:scrH+'px',
      borderRadius:'10px', overflow:'hidden', background:'#0b0b0e',
    });
    screen.appendChild(screenContent(m, opts, 28));
    disp.appendChild(screen);
    // notch
    disp.appendChild(el('div', null, {
      position:'absolute', left:'50%', top:bez+'px', transform:'translateX(-50%)',
      width:'150px', height:'22px', borderRadius:'0 0 12px 12px', background:'#050507', zIndex:6,
    }));
    root.appendChild(disp);
    const base = el('div', null, {
      position:'absolute', left:'0', top:dispH+'px', width:devW+'px', height:baseH+'px',
      borderRadius:'3px 3px 18px 18px',
      background:`linear-gradient(180deg, ${mixHex(fin.deck,'#ffffff',.25)} 0%, ${fin.deck} 22%, ${darken(fin.deck,.28)} 100%)`,
    });
    base.appendChild(el('div', null, {
      position:'absolute', left:'50%', top:'0', transform:'translateX(-50%)',
      width:'190px', height:'11px', borderRadius:'0 0 12px 12px',
      background:`linear-gradient(180deg, ${darken(fin.deck,.35)}, ${fin.deck})`,
    }));
    root.appendChild(base);
    return { root, devW, devH };
  }
};

/* iMac 24" — geometry & finish adapted from devices.css (MIT, picturepan2) */
DEVICES['imac-24'] = {
  category:'desktop', label:'iMac 24"',
  variants:{
    silver:{accent:'#D4D5D7', label:'Silver'},
    blue:  {accent:'#B4C7DA', label:'Blue'},
    green: {accent:'#BBD0C8', label:'Green'},
    pink:  {accent:'#EDCCC6', label:'Pink'},
    yellow:{accent:'#F4D595', label:'Yellow'},
    orange:{accent:'#E9B5A0', label:'Orange'},
    purple:{accent:'#C4C4E5', label:'Purple'},
  },
  build(m, opts){
    const fin = this.variants[m.device.variant] || this.variants.silver;
    // devices.css iMac is 640×540 (frame 640×440, screen 608×342, chin 63, stand 92+6); scale ×1.84
    const K = 1.84;
    const devW = Math.round(640*K);                     // 1178
    const frameH = Math.round(440*K);                   // 810
    const bez = Math.round(16*K);                       // 29
    const scrW = devW - bez*2, scrH = Math.round(342*K);// 1119×629 (16:9)
    const chinH = Math.round(63*K);                     // 116
    const standW = Math.round(152*K), standH = Math.round(92*K), footH = Math.round(6*K);
    const devH = frameH + standH + footH;               // ~985
    const R = Math.round(18*K);
    const silver = '#EDEEF0', silverDark = '#D4D5D7';
    const root = el('div', null, {position:'relative', width:devW+'px', height:devH+'px'});
    // stand column: brushed-metal vertical gradient (matte front face)
    root.appendChild(el('div', null, {
      position:'absolute', left:'50%', top:(frameH-2)+'px', transform:'translateX(-50%)',
      width:standW+'px', height:(standH+2)+'px',
      background:`linear-gradient(to bottom, ${darken(fin.accent,.2)} 0, ${darken(fin.accent,.05)} 40%, ${darken(fin.accent,.05)} 85%, ${mixHex(silver,'#ffffff',.6)} 90%, ${darken(fin.accent,.4)} 100%)`,
    }));
    // foot: shallow plate with a soft radial sheen
    root.appendChild(el('div', null, {
      position:'absolute', left:'50%', bottom:'0', transform:'translateX(-50%)',
      width:standW+'px', height:footH+'px',
      background:`radial-gradient(ellipse at center, ${fin.accent} 60%, ${darken(fin.accent,.25)} 100%)`,
      borderRadius:'3px 3px 6px 6px',
      borderTop:`1px solid ${fin.accent}`,
    }));
    // body: silver-white front, hairline ring, colored chin band
    const body = el('div', null, {
      position:'absolute', left:'0', top:'0', width:devW+'px', height:frameH+'px',
      borderRadius:R+'px', background:silver,
      boxShadow:`inset 0 0 0 2px ${fin.accent === silverDark ? silverDark : fin.accent}, 0 1px 0 rgba(255,255,255,.4)`,
      overflow:'hidden',
    });
    const screen = el('div', null, {
      position:'absolute', left:bez+'px', top:bez+'px', width:scrW+'px', height:scrH+'px',
      borderRadius:'4px', overflow:'hidden', background:'#0b0b0e',
      boxShadow:'0 0 0 2.5px #111113',
    });
    screen.appendChild(screenContent(m, opts, 30));
    body.appendChild(screen);
    // chin: the pastel band with a soft inner glow, like the aluminium face
    body.appendChild(el('div', null, {
      position:'absolute', left:'1px', right:'1px', bottom:'1px', height:chinH+'px',
      borderRadius:`0 0 ${R-1}px ${R-1}px`,
      background:fin.accent,
      boxShadow:`inset 0 0 ${Math.round(18*K)}px 0 ${darken(fin.accent,.06)}`,
    }));
    root.appendChild(body);
    // camera dot centred vertically in the top bezel, clear of the screen ring
    root.appendChild(el('div', null, {
      position:'absolute', left:'50%', top:Math.round((bez-8)/2)+'px', transform:'translateX(-50%)',
      width:'8px', height:'8px', borderRadius:'50%', background:'#0a0a0a', zIndex:6,
    }));
    return { root, devW, devH };
  }
};

const DEVICE_CATEGORIES = [
  ['bare','None', ['bare']],
  ['browser','Browser', ['browser-safari','browser-chrome','browser-arc','browser-firefox','browser-minimal']],
  ['phone','Phone', ['iphone-17','iphone-17-air']],
  ['tablet','Tablet', ['ipad-pro']],
  ['laptop','Laptop', ['macbook-pro-14']],
  ['desktop','Desktop', ['imac-24']],
];

/* ---- background accent (for shadow sampling / glow) ---- */
function bgAccent(f){
  const bg = f.background;
  if (bg.type === 'solid') return f.solid.color;
  if (bg.type === 'gradient'){
    if (bg.mode === 'mesh' && bg.meshPoints?.length)
      return bg.meshPoints.reduce((a,p)=>mixHex(a,p.color,.5), bg.meshPoints[0].color);
    return bg.stops.reduce((a,s)=>mixHex(a,s.color,.5), bg.stops[0].color);
  }
  if (bg.type === 'atmosphere'){
    const e = f.atmo.effect;
    if (e === 'spotlight') return '#FCCA46';
    if (e === 'grid') return hueShift('#2DC7FF', (f.atmo.params.hue ?? 205)-197);
    return '#645DD7';
  }
  if (bg.type === 'texture') return f.texture.base;
  if (bg.type === 'image') return f.image.tint || '#404048';
  return '#26262E';
}

/* ---- background layer stack ---- */
function buildBackgroundLayers(f, opts){
  const wrap = el('div', null, {position:'absolute', inset:'0'});
  const bg = f.background;
  if (bg.type === 'solid'){
    wrap.style.background = f.solid.color;
  }
  else if (bg.type === 'gradient'){
    wrap.style.backgroundImage = gradientCSS(bg);
  }
  else if (bg.type === 'atmosphere'){
    const canvas = el('canvas', null, {position:'absolute', inset:'0', width:'100%', height:'100%'});
    const scale = opts.atmoScale ?? Math.min(1, 1280/Math.max(f.width,f.height));
    paintAtmo(canvas, f, opts.atmoTime ?? performance.now()/1000, scale);
    if (opts.registerAtmo) opts.registerAtmo(canvas, scale);
    wrap.appendChild(canvas);
  }
  else if (bg.type === 'texture'){
    const t = f.texture;
    wrap.style.background = t.base;
    const tex = el('div', null, {
      position:'absolute', inset:'0',
      backgroundImage:`url(${textureURL(t.textureId)})`,
      backgroundSize: `${Math.max(280, Math.round(f.width/4))}px auto`,
      mixBlendMode: t.blendMode || 'normal',
      opacity: (t.opacity ?? 100)/100,
    });
    wrap.appendChild(tex);
    if (t.tint){
      wrap.appendChild(el('div', null, {
        position:'absolute', inset:'0', background:t.tint, mixBlendMode:'color', opacity:.85,
      }));
    }
  }
  else if (bg.type === 'image'){
    const im = f.image;
    wrap.style.background = '#101014';
    if (im.src && IMAGES[im.src]){
      const img = el('img');
      img.src = IMAGES[im.src].src;
      Object.assign(img.style, {
        position:'absolute', inset:'0', width:'100%', height:'100%',
        objectFit: im.fit === 'tile' ? 'none' : im.fit,
        transform:`translate(${im.x}%, ${im.y}%) scale(${im.scale/100})`,
        filter:`blur(${im.blur}px) brightness(${im.brightness}%)`,
      });
      if (im.fit === 'tile'){
        img.remove();
        wrap.appendChild(el('div', null, {
          position:'absolute', inset:'0',
          backgroundImage:`url(${IMAGES[im.src].src})`,
          backgroundSize:`${Math.round(f.width*im.scale/300)}px auto`,
          filter:`blur(${im.blur}px) brightness(${im.brightness}%)`,
        }));
      } else wrap.appendChild(img);
      if (im.tint && im.tintOpacity > 0){
        wrap.appendChild(el('div', null, {
          position:'absolute', inset:'0', background:im.tint, opacity:im.tintOpacity/100,
        }));
      }
    }
  }
  return wrap;
}

/* ---- one mockup: shadow wrap → transform → device (+reflection) ---- */
function buildMockup(compRef, m, idx, opts){
  const f = compRef.frame;
  const dev = DEVICES[m.device.modelId] || DEVICES.bare;
  const layout = layoutOverride(compRef, idx);
  const t = layout || m.transform;
  const sh = layout?.shadow ? {...m.shadow, ...SHADOW_PRESETS[layout.shadow], presetId:layout.shadow} : m.shadow;

  const { root: deviceEl, devW, devH } = dev.build(m, opts);
  const pad = f.padding/100 * Math.min(f.width, f.height);
  const availW = Math.max(50, f.width - pad*2), availH = Math.max(50, f.height - pad*2);
  const baseFit = Math.min(availW/devW, availH/devH) * 0.78;
  const s = baseFit * (t.scale/100);

  // shadow/glow live on an untransformed wrapper so offsets stay in frame space
  const shadowWrap = el('div', null, {position:'absolute', inset:'0', pointerEvents:'none'});
  const filters = [];
  if (sh.opacity > 0 && (sh.blur > 0 || sh.x || sh.y)){
    filters.push(`drop-shadow(${sh.x}px ${sh.y}px ${sh.blur}px ${withAlpha(sh.color, sh.opacity)})`);
    if (sh.blur > 30) filters.push(`drop-shadow(${sh.x*0.3}px ${Math.max(2,sh.y*0.25)}px ${sh.blur*0.3}px ${withAlpha(sh.color, sh.opacity*0.55)})`);
  }
  if (m.glow?.enabled){
    filters.push(`drop-shadow(0 0 ${Math.round(f.width*0.045*(m.glow.strength/100)+8)}px ${withAlpha(mixHex(bgAccent(f), '#ffffff', .25), .8*(m.glow.strength/100)+.1)})`);
  }
  if (filters.length) shadowWrap.style.filter = filters.join(' ');

  const holder = el('div', 'mockup-hit', {
    position:'absolute', left:'50%', top:'50%', width:devW+'px', height:devH+'px',
    marginLeft:(-devW/2)+'px', marginTop:(-devH/2)+'px',
    transform:
      `translate(${(t.x*f.width).toFixed(1)}px, ${(t.y*f.height).toFixed(1)}px) `+
      `rotate(${t.rotate}deg) perspective(${t.perspective}px) `+
      `rotateX(${t.rotateX}deg) rotateY(${t.rotateY}deg) scale(${s.toFixed(4)})`,
    transformOrigin:'center center',
    pointerEvents: opts.interactive ? 'auto' : 'none',
  });
  if (opts.interactive){
    holder.dataset.mockupIdx = idx;
    if (ui.travel && !REDUCED) holder.style.transition = 'transform .55s cubic-bezier(.3,1.3,.42,1)';
  }
  holder.appendChild(deviceEl);

  if (m.reflection?.enabled){
    const { root: reflEl } = dev.build(m, {...opts, interactive:false});
    const fall = clamp(m.reflection.falloff, 5, 95);
    const refl = el('div', null, {
      position:'absolute', left:'0', top:'100%', width:devW+'px', height:devH+'px',
      transform:'scaleY(-1)', marginTop:'6px',
      opacity: m.reflection.opacity/100,
      maskImage:`linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0) ${fall}%)`,
      webkitMaskImage:`linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0) ${fall}%)`,
      pointerEvents:'none',
    });
    refl.style.webkitMaskImage = `linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0) ${fall}%)`;
    refl.appendChild(reflEl);
    holder.appendChild(refl);
  }
  shadowWrap.appendChild(holder);
  holder.style.pointerEvents = opts.interactive ? 'auto' : 'none';
  return shadowWrap;
}

/* ---- full composition (pure function of comp) ---- */
function buildComposition(compRef, opts = {}){
  const f = compRef.frame;
  const root = el('div', null, {
    position:'relative', width:f.width+'px', height:f.height+'px', overflow:'hidden',
    borderRadius:f.cornerRadius+'px',
    background:'transparent',
    fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  });
  if (!f.transparent) root.appendChild(buildBackgroundLayers(f, opts));

  const mockLayer = el('div', null, {position:'absolute', inset:'0'});
  compRef.mockups.forEach((m,i)=> mockLayer.appendChild(buildMockup(compRef, m, i, opts)));
  root.appendChild(mockLayer);

  if (!f.transparent){
    if (f.dither && (f.background.type === 'gradient' || f.background.type === 'atmosphere')){
      root.appendChild(el('div', null, {
        position:'absolute', inset:'0', backgroundImage:`url(${ditherURL()})`, backgroundSize:'128px',
        opacity:.5, mixBlendMode:'overlay', pointerEvents:'none',
      }));
    }
    if (f.grain > 0){
      root.appendChild(el('div', null, {
        position:'absolute', inset:'0', backgroundImage:`url(${grainURL()})`, backgroundSize:'192px',
        opacity:(f.grain/100)*0.55, mixBlendMode:'overlay', pointerEvents:'none',
      }));
    }
    if (f.vignette.amount > 0){
      const r = 55 + f.vignette.radius*0.6;
      root.appendChild(el('div', null, {
        position:'absolute', inset:'0', pointerEvents:'none',
        background:`radial-gradient(ellipse ${r}% ${r}% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,${(f.vignette.amount/100)*0.75}) 100%)`,
      }));
    }
  }
  if (f.border && f.border.width > 0){
    root.appendChild(el('div', null, {
      position:'absolute', inset:'0', borderRadius:'inherit', pointerEvents:'none',
      boxShadow:`inset 0 0 0 ${f.border.width}px ${f.border.color}`,
    }));
  }
  return root;
}
const LAYOUTS = [
  { id:'centered', name:'Centred', solve(f){ return [{scale:86, x:0, y:0}]; } },
  { id:'hero', name:'Hero', solve(f){ return [{scale:112, x:0, y:0.045}]; } },
  { id:'bleed-bottom', name:'Bleed bottom', solve(f){
      const tall = f.height >= f.width;
      return [{scale: tall?150:135, x:0, y: tall?0.34:0.38, rotate:0, shadow:'dramatic'}];
  }},
  { id:'bleed-right', name:'Bleed right', solve(f){ return [{scale:130, x:0.33, y:0.04, rotate:-4, shadow:'soft'}]; } },
  { id:'bleed-left', name:'Bleed left', solve(f){ return [{scale:130, x:-0.33, y:0.04, rotate:4, shadow:'soft'}]; } },
  { id:'tilted', name:'Tilted', solve(f){ return [{scale:88, x:0, y:-0.015, rotateX:10, rotateY:-16, perspective:1400, shadow:'long'}]; } },
  { id:'float', name:'Perspective float', solve(f){ return [{scale:90, x:-0.03, y:-0.03, rotateY:24, rotateX:4, perspective:1100, shadow:'floating'}]; } },
  { id:'diagonal', name:'Diagonal', solve(f){ return [{scale:98, x:-0.05, y:-0.05, rotate:-8, shadow:'soft'}]; } },
  { id:'corner', name:'Corner peek', solve(f){ return [{scale:56, x:0.26, y:0.29, rotate:-3, shadow:'dramatic'}]; } },
  { id:'duo-stack', name:'Duo stack', solve(f){ return [
      {scale:92, x:-0.05, y:-0.06, rotate:0, shadow:'soft', deviceHint:'back'},
      {scale:46, x:0.24, y:0.2, rotate:0, shadow:'dramatic', deviceHint:'front'},
  ]; } },
  { id:'duo-split', name:'Duo split', solve(f){ return [
      {scale:64, x:-0.2, y:0.01, rotateY:16, perspective:1400, shadow:'soft'},
      {scale:64, x:0.2, y:0.01, rotateY:-16, perspective:1400, shadow:'soft'},
  ]; } },
  { id:'trio', name:'Trio cascade', solve(f){ return [
      {scale:74, x:0.24, y:0.06, rotateY:-20, perspective:1500, shadow:'soft'},
      {scale:80, x:0.02, y:0.02, rotateY:-20, perspective:1500, shadow:'soft'},
      {scale:86, x:-0.22, y:-0.02, rotateY:-20, perspective:1500, shadow:'dramatic'},
  ]; } },
  { id:'grid4', name:'Grid', solve(f){ return [
      {scale:42, x:-0.2, y:-0.21, rotate:0, shadow:'soft'},
      {scale:42, x:0.22, y:-0.17, rotate:0, shadow:'soft'},
      {scale:42, x:-0.22, y:0.19, rotate:0, shadow:'soft'},
      {scale:42, x:0.2, y:0.23, rotate:0, shadow:'soft'},
  ]; } },
];
const LAYOUT_BY_ID = Object.fromEntries(LAYOUTS.map(l=>[l.id,l]));

function solvedFor(id, f){ return LAYOUT_BY_ID[id].solve(f); }

function layoutOverride(compRef, idx){
  if (!ui.previewLayout) return null;
  const solved = solvedFor(ui.previewLayout, compRef.frame);
  const t = solved[Math.min(idx, solved.length-1)];
  return { scale:t.scale, x:t.x, y:t.y, rotate:t.rotate||0, rotateX:t.rotateX||0,
           rotateY:t.rotateY||0, perspective:t.perspective||1200, shadow:t.shadow };
}


/* ---- exports for the React/Zustand layer ---- */
export {
  el, clamp, uid, fmtPx,
  hexToRgb, rgbToHex, withAlpha, luma, mixHex, darken, hueShift,
  REDUCED, OKLAB_OK,
  BRAND, NEUTRALS, DIM_GROUPS, DIM_BY_ID, GRAD_PRESETS,
  SHADOW_PRESETS, ATMO_DEFS, TEXTURE_IDS,
  defaultMockup, defaultComp,
  mulberry32, stopsCSS, gradientCSS, meshCSS, grainURL, ditherURL, textureURL,
  ATMO_PAINTERS, atmoParams, paintAtmo,
  screenContent, screenshotAspect, DEVICES, DEVICE_CATEGORIES,
  bgAccent, buildBackgroundLayers, buildMockup, buildComposition,
  imgOf,
  LAYOUTS, LAYOUT_BY_ID, solvedFor, layoutOverride,
};
