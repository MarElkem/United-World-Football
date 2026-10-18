// "Ink globe" shaders: a hand-drawn football with marker-green continents,
// following the reference sketch rather than a photoreal Earth.

const noise = /* glsl */ `
// 3D simplex noise, Ashima Arts / Stefan Gustavson (MIT).
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

export const ballVertex = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main(){
  vObj = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalV = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`

export const ballFragment = /* glsl */ `
precision highp float;
uniform vec4 uFaces[32];
uniform sampler2D uLand;
uniform sampler2D uIds;
uniform float uHover;
uniform float uSelected;
uniform float uConf;
uniform vec3 uRed;
uniform vec3 uLight;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uGreen;
uniform vec3 uGreenDeep;
uniform float uPixel;
varying vec3 vObj;
varying vec3 vNormalV;
varying vec3 vViewDir;
${noise}

void main(){
  vec3 p = normalize(vObj);

  // Which football panel are we on, and how close to its seam?
  float best = -1e9; float second = -1e9; int bestIdx = 0;
  for (int i = 0; i < 32; i++) {
    float s = dot(p, uFaces[i].xyz) * uFaces[i].w;
    if (s > best) { second = best; best = s; bestIdx = i; }
    else if (s > second) { second = s; }
  }
  bool pentagon = bestIdx < 12;
  float wobble = snoise(p * 9.0) * 0.004 + snoise(p * 31.0) * 0.002;
  float seam = 1.0 - smoothstep(0.003, 0.0058, best - second + wobble);

  // Land mask from the equirectangular Natural Earth texture.
  float lon = atan(p.x, p.z);
  float lat = asin(clamp(p.y, -1.0, 1.0));
  vec2 uv = vec2(lon / 6.2831853 + 0.5, lat / 3.1415927 + 0.5);
  vec4 landTex = texture2D(uLand, uv);
  float edgeJitter = snoise(p * 60.0) * 0.18;
  float land = smoothstep(0.35, 0.65, landTex.r + edgeJitter);
  float coast = smoothstep(0.25, 0.75, landTex.g);
  float border = smoothstep(0.2, 0.8, landTex.b);
  vec4 idt = texture2D(uIds, uv);
  float cid = floor(idt.r * 255.0 + 0.5);
  float cconf = floor(idt.g * 255.0 + 0.5);
  float isSel = (uSelected > 0.5 && abs(cid - uSelected) < 0.5) ? 1.0 : 0.0;
  float isHov = (uHover > 0.5 && abs(cid - uHover) < 0.5) ? 1.0 : 0.0;
  float inConf = (uConf > 0.5 && abs(cconf - uConf) < 0.5) ? 1.0 : 0.0;
  float dimmed = (uConf > 0.5 && inConf < 0.5) ? 1.0 : 0.0;

  // Marker strokes: noise stretched along a slanted axis.
  vec3 sp = vec3(p.x * 0.8 + p.y * 0.6, p.y * 0.8 - p.x * 0.6, p.z);
  float stroke = snoise(sp * vec3(7.0, 70.0, 7.0)) * 0.5 + 0.5;
  float grain = snoise(p * 140.0) * 0.5 + 0.5;

  vec3 col = uPaper;

  if (pentagon) {
    vec3 ink = uInk + vec3(0.025) * stroke;
    // Small paper specks, like dry brush in the sketch.
    float speck = smoothstep(0.9, 0.97, grain) * step(0.6, stroke);
    col = mix(ink, uPaper, speck * 0.85);
  }

  if (land > 0.0) {
    vec3 g = mix(uGreenDeep, uGreen, smoothstep(0.2, 0.85, stroke));
    g = mix(g, uGreen * 1.18, inConf * 0.6);
    g = mix(g, mix(uGreen, uPaper, 0.35), isHov * 0.7);
    g = mix(g, mix(uRed * 0.8, uRed, smoothstep(0.2, 0.85, stroke)), isSel);
    g = mix(g, mix(g, uPaper, 0.5), dimmed * (1.0 - isSel) * (1.0 - isHov));
    if (pentagon) g = mix(g, uInk, 0.5);
    float gap = smoothstep(0.80, 0.92, stroke * 0.7 + grain * 0.45);
    g = mix(g, pentagon ? uInk * 1.6 : uPaper, gap * 0.75);
    col = mix(col, g, land);
  }

  // Ink seams, country borders and coastline.
  col = mix(col, uInk, border * land * 0.55);
  col = mix(col, uInk, seam * 0.9);
  col = mix(col, mix(uInk, uGreenDeep, 0.35), coast * 0.8);

  // Soft illustrative lighting with screen-space hatching in the shade.
  float nl = dot(normalize(vNormalV), normalize(uLight));
  float lit = smoothstep(-0.45, 0.9, nl);
  float shade = mix(0.66, 1.03, lit);
  if (pentagon && land < 0.5) shade = mix(0.8, 1.0, lit);
  vec2 fc = gl_FragCoord.xy / uPixel;
  float hatch = step(0.55, fract((fc.x + fc.y) * 0.16)) * (1.0 - smoothstep(-0.2, 0.35, nl));
  col *= shade;
  col = mix(col, uInk, hatch * 0.18);

  // Darken towards the silhouette for depth.
  float rim = 1.0 - max(dot(normalize(vNormalV), normalize(vViewDir)), 0.0);
  col = mix(col, uInk, smoothstep(0.55, 1.0, rim) * 0.55);

  // Specular glint, kept soft so it reads as a lacquered ball, not glass.
  vec3 h = normalize(normalize(uLight) + normalize(vViewDir));
  float spec = pow(max(dot(normalize(vNormalV), h), 0.0), 60.0);
  col += spec * 0.07 * (1.0 - land * 0.6);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

// Rough ink outline: an inflated back-facing shell with noisy thickness.
export const outlineVertex = /* glsl */ `
uniform float uThickness;
varying vec3 vObj;
${noise}
void main(){
  vObj = normalize(position);
  float n = snoise(vObj * 6.0) * 0.5 + 0.5;
  float n2 = snoise(vObj * 23.0) * 0.5 + 0.5;
  vec3 pos = position * (1.0 + uThickness * (0.35 + 0.9 * n + 0.4 * n2));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

export const outlineFragment = /* glsl */ `
uniform vec3 uInk;
varying vec3 vObj;
${noise}
void main(){
  float n = snoise(vObj * 80.0);
  if (n > 0.72) discard;
  gl_FragColor = vec4(uInk, 1.0);
  #include <colorspace_fragment>
}
`
