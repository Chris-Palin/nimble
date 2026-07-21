/* eslint-disable */
// @ts-nocheck
/* ==========================================================================
 * Mash mesh-gradient WebGL core — VERBATIM shaders + renderer from the original
 * tool (public/arabella/tools/mesh-gradient/index.html). Preserved unchanged so
 * rendered/exported output is identical. createRenderer(canvas).render(state,w,h)
 * takes the composition state explicitly, so the React/Zustand layer just passes
 * its store state — no mirror needed. Do not refactor.
 * ======================================================================== */
export const MAX_POINTS = 16;

const VS = `attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }`;
const FS = `
precision highp float;
uniform vec2  u_res;
uniform int   u_count;
uniform vec2  u_pos[${MAX_POINTS}];
uniform vec3  u_color[${MAX_POINTS}];
uniform float u_intensity[${MAX_POINTS}];
uniform float u_shape[${MAX_POINTS}];
uniform float u_angle[${MAX_POINTS}];
uniform float u_power, u_warp, u_warpScale, u_grain, u_seed;
uniform float u_sat, u_bright, u_contrast, u_blur, u_hue;

vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0*fract(p*C.www)-1.0;
  vec3 h = abs(x)-0.5;
  vec3 ox = floor(x+0.5);
  vec3 a0 = x-ox;
  m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x*x0.x + h.x*x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float fbm(vec2 p){
  float f = 0.0, a = 0.55;
  for(int i=0;i<3;i++){ f += a*snoise(p); p = p*2.03 + 11.17; a *= 0.5; }
  return f;
}
float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}
// per-point shaped "distance" — each shape bends the falloff field differently
float shapeDist(vec2 v, float s, float idx){
  if(s < 0.5) return length(v);                                   // round
  if(s < 1.5) return length(v * vec2(1.0, 2.4));                  // ellipse
  if(s < 2.5) return (abs(v.x) + abs(v.y)) * 0.79;                // diamond
  if(s < 3.5) return max(abs(v.x), abs(v.y)) * 1.28;              // square
  if(s < 4.5) return length(v) * (1.0 + 0.5 * snoise(normalize(v + 1e-4) * 1.7 + u_seed + idx * 7.3)); // blob
  if(s < 5.5) return length(v) * (1.0 + 0.35 * cos(5.0 * atan(v.y, v.x + 1e-6)));                      // star
  if(s < 6.5) return abs(v.y) * 1.6 + length(v) * 0.12;          // stripe
  // quad (7): randomised irregular quadrilateral — sheared, non-uniform box
  float qa = hash(vec2(idx, 1.7) + u_seed);
  float qb = hash(vec2(idx, 4.3) + u_seed);
  float qc = hash(vec2(idx, 8.1) + u_seed);
  float sx = mix(0.8, 1.9, qa);
  float sy = mix(0.8, 1.9, qb);
  float sh = (qc - 0.5) * 1.2;
  vec2 vv = vec2(v.x + sh * v.y, v.y);
  return max(abs(vv.x) * sx, abs(vv.y) * sy) * 1.2;
}
// inverse-distance-weighted blend of colour points, in ~linear light
vec3 field(vec2 q, float aspect){
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for(int i=0;i<${MAX_POINTS};i++){
    if(i >= u_count) break;
    vec2 pp = vec2(u_pos[i].x * aspect, u_pos[i].y);
    vec2 v = q - pp;
    float ca = cos(u_angle[i]), sa = sin(u_angle[i]);
    v = vec2(ca*v.x - sa*v.y, sa*v.x + ca*v.y);
    float d = shapeDist(v, u_shape[i], float(i));
    float w = u_intensity[i] / (pow(max(d, 0.0), u_power) + 1e-5);
    acc += pow(u_color[i], vec3(2.2)) * w;
    wsum += w;
  }
  return acc / max(wsum, 1e-6);
}
void main(){
  vec2 uv = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_res; // y-down, matches UI coords
  float aspect = u_res.x / u_res.y;
  vec2 q = vec2(uv.x * aspect, uv.y);

  // domain warp — this is what makes it "mesh"-like and organic
  if(u_warp > 0.001){
    vec2 w = vec2(fbm(q * u_warpScale + u_seed),
                  fbm(q * u_warpScale + u_seed + 47.13));
    q += w * u_warp * 0.5;
  }

  // blur: golden-angle spiral taps over the analytic field
  vec3 lin;
  if(u_blur > 0.0005){
    lin = vec3(0.0);
    for(int t=0;t<12;t++){
      float ft = float(t);
      float ang = ft * 2.39996323;
      float rr = sqrt((ft + 0.5) / 12.0) * u_blur;
      lin += field(q + vec2(cos(ang), sin(ang)) * rr, aspect);
    }
    lin /= 12.0;
  } else {
    lin = field(q, aspect);
  }
  vec3 col = pow(lin, vec3(1.0/2.2));

  // post
  float luma = dot(col, vec3(0.2126,0.7152,0.0722));
  col = mix(vec3(luma), col, u_sat);
  col *= u_bright;
  col = (col - 0.5) * u_contrast + 0.5;
  if(abs(u_hue) > 0.002){ // hue rotation around the grey axis
    float hc = cos(u_hue), hs = sin(u_hue);
    vec3 k = vec3(0.57735);
    col = col*hc + cross(k, col)*hs + k*dot(k, col)*(1.0-hc);
  }

  // film grain + dither (kills banding at any export size)
  float g = hash(gl_FragCoord.xy + fract(u_seed)*100.0) - 0.5;
  col += g * u_grain;
  col += (hash(gl_FragCoord.yx * 1.37) - 0.5) / 255.0;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function createRenderer(canvas){
  const gl = canvas.getContext("webgl", {antialias:false, preserveDrawingBuffer:true, premultipliedAlpha:false});
  if(!gl) return null;
  function sh(type, src){
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ["u_res","u_count","u_pos","u_color","u_intensity","u_shape","u_angle","u_power","u_warp",
   "u_warpScale","u_grain","u_seed","u_sat","u_bright","u_contrast","u_blur","u_hue"]
   .forEach(n => U[n] = gl.getUniformLocation(prog, n));
  const posArr = new Float32Array(MAX_POINTS*2);
  const colArr = new Float32Array(MAX_POINTS*3);
  const intArr = new Float32Array(MAX_POINTS);
  const shpArr = new Float32Array(MAX_POINTS);
  const angArr = new Float32Array(MAX_POINTS);

  return {
    gl,
    maxSize: Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]),
    render(s, w, h){
      if(canvas.width !== w || canvas.height !== h){ canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.useProgram(prog);
      gl.uniform2f(U.u_res, w, h);
      gl.uniform1i(U.u_count, s.points.length);
      s.points.forEach((p,i)=>{
        posArr[i*2]=p.x; posArr[i*2+1]=p.y;
        colArr[i*3]=p.color[0]; colArr[i*3+1]=p.color[1]; colArr[i*3+2]=p.color[2];
        intArr[i]=p.intensity;
        shpArr[i]=p.shape||0;
        angArr[i]=p.angle||0;
      });
      gl.uniform2fv(U.u_pos, posArr);
      gl.uniform3fv(U.u_color, colArr);
      gl.uniform1fv(U.u_intensity, intArr);
      gl.uniform1fv(U.u_shape, shpArr);
      gl.uniform1fv(U.u_angle, angArr);
      gl.uniform1f(U.u_power, s.power);
      gl.uniform1f(U.u_warp, s.warp);
      gl.uniform1f(U.u_warpScale, s.warpScale);
      gl.uniform1f(U.u_grain, s.grain);
      gl.uniform1f(U.u_seed, s.seed);
      gl.uniform1f(U.u_sat, s.sat);
      gl.uniform1f(U.u_bright, s.bright);
      gl.uniform1f(U.u_contrast, s.contrast);
      gl.uniform1f(U.u_blur, s.blur);
      gl.uniform1f(U.u_hue, s.hue);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };
}

export { createRenderer };
