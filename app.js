/* ============================================================
   静海基地 TRQ-1 · 光滑精制版（Apollo / Artemis 主题）
   单文件 · three.js r128 全局版 · 无外部资源
   光滑几何 + PBR 材质 + 程序生成银河/地球
   ============================================================ */
(function(){
'use strict';

/* ---------------- 0. 工具 ---------------- */
var TAU = Math.PI*2;
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function sstep(a,b,v){ var t=clamp((v-a)/(b-a),0,1); return t*t*(3-2*t); }
function easeIO(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
function hash3(x,y,z){
  var n = (x*374761393 + y*668265263 + z*1442695041) | 0;
  n = Math.imul(n ^ (n>>>13), 1274126177);
  n = n ^ (n>>>16);
  return ((n>>>0)%10000)/10000;
}
var _seed = 19690720;
function rnd(){ _seed = (Math.imul(_seed,1103515245)+12345)|0; return ((_seed>>>16)&0x7fff)/0x8000; }
function rrange(a,b){ return a + rnd()*(b-a); }
function vhash(ix,iz){
  var n = (ix*3266489917 + iz*1013904223) | 0;
  n = Math.imul(n ^ (n>>>15), 2246822519);
  n = n ^ (n>>>13);
  return ((n>>>0)%10000)/10000;
}
function vnoise(x,z){
  var ix=Math.floor(x), iz=Math.floor(z), fx=x-ix, fz=z-iz;
  var sx=fx*fx*(3-2*fx), sz=fz*fz*(3-2*fz);
  var a=vhash(ix,iz), b=vhash(ix+1,iz), c=vhash(ix,iz+1), d=vhash(ix+1,iz+1);
  return lerp(lerp(a,b,sx), lerp(c,d,sx), sz);
}
function noise2(x,z){
  return (vnoise(x,z)*2-1)*0.72 + (vnoise(x*2.7+13.7, z*2.7+7.3)*2-1)*0.28;
}
function C(hex){ return new THREE.Color(hex).convertSRGBToLinear(); }

/* ---------------- 1. 高度场（网格与实体共用） ---------------- */
var TERRAIN_R = 88, BASE_Y = 9;
var CRATERS=[];
(function(){
  for(var i=0;i<16;i++){
    var a=rnd()*TAU, rr=rrange(56,82);
    CRATERS.push({x:Math.cos(a)*rr, z:Math.sin(a)*rr, r:rrange(3.5,10), dep:rrange(1.6,3.2)});
  }
  CRATERS.push({x:-56, z:-40, r:9, dep:3});
})();
var SITE_FLAT=[
  [36,-36,11],[54,0,8],[14,50,8],[18,-12,9],[-44,-20,14],[-52,4,10],
  [-46,28,10],[40,-14,12],[24,38,13],[26,18,11],[0,-30,11]
];
var ROADS=[
  [0,-16,0,-30,4],[-8,6,-28,2,4],[-10,10,-14,14,3],[-6,14,-8,30,4],
  [-2,16,6,36,3],[8,8,26,18,4],[10,-8,36,-36,4],[16,2,54,0,4],
  [6,14,14,50,4],[10,-4,18,-12,3],[12,-8,40,-14,4],[10,12,24,38,4],
  [-16,-8,-44,-20,4],[-20,-2,-52,4,3],[-16,10,-46,28,4]
];
var RS_CAP=340;
function terrainH(wx,wz){
  var dc=Math.sqrt(wx*wx+wz*wz);
  if(dc>TERRAIN_R) return null;
  var capDrop = RS_CAP - Math.sqrt(RS_CAP*RS_CAP - dc*dc);
  var h = 9 + noise2(wx*0.05, wz*0.05)*2.7 + noise2(wx*0.14+31, wz*0.14+17)*0.65 - capDrop*.24;
  for(var i=0;i<CRATERS.length;i++){
    var cr=CRATERS[i], dd=Math.sqrt((wx-cr.x)*(wx-cr.x)+(wz-cr.z)*(wz-cr.z));
    if(dd<cr.r){ h -= cr.dep*Math.cos(dd/cr.r*Math.PI/2); }
    else if(dd<cr.r*1.3){ h += cr.dep*0.4*(1-(dd-cr.r)/(cr.r*0.3)); }
  }
  h = lerp(h, BASE_Y, sstep(50,36,dc));
  for(i=0;i<SITE_FLAT.length;i++){
    var s=SITE_FLAT[i];
    var d2=Math.sqrt((wx-s[0])*(wx-s[0])+(wz-s[1])*(wz-s[1]));
    h = lerp(h, BASE_Y, sstep(s[2]+3.5, s[2]-1, d2));
  }
  for(i=0;i<ROADS.length;i++){
    var r=ROADS[i], dx=r[2]-r[0], dz=r[3]-r[1], len2=dx*dx+dz*dz;
    var t=clamp(((wx-r[0])*dx+(wz-r[1])*dz)/len2,0,1);
    var px=r[0]+dx*t, pz=r[1]+dz*t;
    var rd=Math.sqrt((wx-px)*(wx-px)+(wz-pz)*(wz-pz));
    h = lerp(h, BASE_Y, sstep(r[4]/2+1.2, r[4]/2-1, rd)*0.95);
  }
  return Math.max(-2, h);
}
function roadDist(wx,wz){
  var best=99;
  for(var i=0;i<ROADS.length;i++){
    var r=ROADS[i], dx=r[2]-r[0], dz=r[3]-r[1], len2=dx*dx+dz*dz;
    var t=clamp(((wx-r[0])*dx+(wz-r[1])*dz)/len2,0,1);
    var px=r[0]+dx*t, pz=r[1]+dz*t;
    var rd=Math.sqrt((wx-px)*(wx-px)+(wz-pz)*(wz-pz))/(r[4]/2);
    if(rd<best) best=rd;
  }
  return best;
}
function crustBottom(dc){
  return -16*Math.pow(Math.max(0,1-(dc/TERRAIN_R)*(dc/TERRAIN_R)),1.2);
}

/* ---------------- 2. 场景 / 光照 ---------------- */
var canvas=document.getElementById('c');
var renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=0.96;

var scene=new THREE.Scene();
scene.background=C(0x020308);
scene.fog=new THREE.Fog(0x020308, 520, 1500);
var camera=new THREE.PerspectiveCamera(window.innerWidth<700?60:42, window.innerWidth/window.innerHeight, 0.5, 2000);

var sun=new THREE.DirectionalLight(0xfff3e2, 1.35);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-120; sun.shadow.camera.right=120;
sun.shadow.camera.top=120; sun.shadow.camera.bottom=-120;
sun.shadow.camera.near=20; sun.shadow.camera.far=520;
sun.shadow.bias=-0.0005;
scene.add(sun); scene.add(sun.target);
var hemi=new THREE.HemisphereLight(0x8aa8d8, 0x3a3630, 0.4);
scene.add(hemi);
var amb=new THREE.AmbientLight(0x38404c, 0.2);
scene.add(amb);
var plTower=new THREE.PointLight(0x8fe6ff, 0, 55, 2); plTower.position.set(0, BASE_Y+22, -30); scene.add(plTower);
var plPlaza=new THREE.PointLight(0xffc46b, 0, 48, 2); plPlaza.position.set(0, BASE_Y+10, 2); scene.add(plPlaza);
var plPad=new THREE.PointLight(0xf2f6ff, 0, 48, 2); plPad.position.set(36, BASE_Y+11, -36); scene.add(plPad);
var plGrow=new THREE.PointLight(0xff70d8, 0, 26, 2); plGrow.position.set(-1, BASE_Y+5, 33); scene.add(plGrow);
var plFlame=new THREE.PointLight(0xff9040, 0, 40, 2); scene.add(plFlame);

/* ---------------- 3. 深空天穹（圆星柔光版） ---------------- */
var skyUni2={ sunDir:{value:new THREE.Vector3(0,1,0)}, sunVis:{value:1.0} };
(function(){
  var mat=new THREE.ShaderMaterial({
    uniforms:skyUni2, side:THREE.BackSide, depthWrite:false, fog:false,
    vertexShader:[
      'varying vec3 vDir;',
      'void main(){ vDir=normalize(position);',
      ' gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
    ].join('\n'),
    fragmentShader:[
      'uniform vec3 sunDir; uniform float sunVis;',
      'varying vec3 vDir;',
      'float hash13(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }',
      'float vnoise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);',
      ' float a=hash13(i), b=hash13(i+vec3(1,0,0)), c=hash13(i+vec3(0,1,0)), d=hash13(i+vec3(1,1,0));',
      ' float e=hash13(i+vec3(0,0,1)), f2=hash13(i+vec3(1,0,1)), g=hash13(i+vec3(0,1,1)), h=hash13(i+vec3(1,1,1));',
      ' return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,f2,f.x),mix(g,h,f.x),f.y), f.z); }',
      'void main(){',
      ' vec3 d=normalize(vDir);',
      ' vec3 col=vec3(0.010,0.013,0.024);',
      ' vec3 sp=d*230.0; vec3 cell=floor(sp); float h=hash13(cell);',
      ' vec3 fd=fract(sp)-0.5;',
      ' float rad=smoothstep(0.42,0.06,length(fd));',
      ' float st=smoothstep(0.994,0.9985,h);',
      ' vec3 scol=mix(vec3(1.0), vec3(0.72,0.82,1.0), step(0.5,hash13(cell+7.0)));',
      ' scol=mix(scol, vec3(1.0,0.85,0.62), step(0.86,hash13(cell+13.0)));',
      ' col+=scol*st*rad*(0.5+0.5*hash13(cell+3.0));',
      ' vec3 sp2=d*92.0; vec3 cell2=floor(sp2); float h2=hash13(cell2+5.0);',
      ' vec3 fd2=fract(sp2)-0.5;',
      ' col+=vec3(0.95,0.97,1.0)*smoothstep(0.9965,0.9992,h2)*smoothstep(0.35,0.05,length(fd2))*1.2;',
      ' vec3 mwN=normalize(vec3(0.42,1.0,0.28));',
      ' float bd=dot(d,mwN);',
      ' float band=exp(-bd*bd*16.0);',
      ' float n=vnoise(d*9.0)*0.6+vnoise(d*23.0)*0.4;',
      ' float lanes=vnoise(d*14.0+31.0);',
      ' vec3 mwCol=mix(vec3(0.10,0.12,0.22), vec3(0.38,0.40,0.55), n);',
      ' col+=mwCol*band*(0.035+n*0.09);',
      ' col-=vec3(0.005,0.005,0.007)*band*smoothstep(0.58,0.85,lanes);',
      ' float s=max(dot(d,normalize(sunDir)),0.0);',
      ' col+=vec3(1.0,0.98,0.92)*pow(s,3000.0)*3.0*sunVis;',
      ' col+=vec3(0.9,0.85,0.7)*pow(s,60.0)*0.32*sunVis;',
      ' gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n')
  });
  var m=new THREE.Mesh(new THREE.SphereGeometry(1000,48,28), mat);
  m.renderOrder=-10;
  scene.add(m);
})();

/* 地球（光滑纹理 + 大气壳） */
function earthSphereTex(){
  if(typeof MOON_ASSETS!=='undefined' && MOON_ASSETS.earth){
    var earthTexture=new THREE.TextureLoader().load(MOON_ASSETS.earth);
    earthTexture.encoding=THREE.sRGBEncoding;
    return earthTexture;
  }
  var cv=document.createElement('canvas'); cv.width=512; cv.height=256;
  var g=cv.getContext('2d');
  var grd=g.createLinearGradient(0,0,0,256);
  grd.addColorStop(0,'#2a5ea8'); grd.addColorStop(0.5,'#2456a0'); grd.addColorStop(1,'#1c3a6e');
  g.fillStyle=grd; g.fillRect(0,0,512,256);
  function blob(cx,cy,r,col,alp){
    for(var i=0;i<26;i++){
      var a=rnd()*TAU, rr=r*(0.35+rnd()*0.65);
      var x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*0.7;
      g.globalAlpha=alp*(0.35+rnd()*0.4);
      g.fillStyle=col;
      g.beginPath(); g.ellipse(x,y,r*rnd()*0.4+2,r*rnd()*0.26+2,rnd()*3,0,TAU); g.fill();
    }
    g.globalAlpha=1;
  }
  blob(120,110,52,'#3f7a3a',0.85); blob(150,86,20,'#5a8a4a',0.7);
  blob(330,90,44,'#8a7a4a',0.8); blob(360,120,26,'#3f7a3a',0.75);
  blob(250,170,38,'#3f7a3a',0.8); blob(60,190,30,'#8a7a4a',0.7);
  blob(430,180,34,'#5a8a4a',0.75); blob(460,70,22,'#3f7a3a',0.7);
  blob(200,150,20,'#5a8a4a',0.6); blob(90,70,18,'#8a7a4a',0.6);
  var ice1=g.createLinearGradient(0,0,0,44);
  ice1.addColorStop(0,'rgba(232,240,244,1)'); ice1.addColorStop(1,'rgba(232,240,244,0)');
  g.fillStyle=ice1; g.fillRect(0,0,512,44);
  var ice2=g.createLinearGradient(0,212,0,256);
  ice2.addColorStop(0,'rgba(232,240,244,0)'); ice2.addColorStop(1,'rgba(232,240,244,1)');
  g.fillStyle=ice2; g.fillRect(0,212,512,44);
  for(var i=0;i<40;i++){
    var x=rnd()*512, y=30+rnd()*196, w=20+rnd()*60;
    g.globalAlpha=0.10+rnd()*0.16;
    g.fillStyle='#ffffff';
    g.beginPath(); g.ellipse(x,y,w,w*0.22,rnd()*0.6-0.3,0,TAU); g.fill();
  }
  g.globalAlpha=1;
  return new THREE.CanvasTexture(cv);
}
function radialTex(inner, outer){
  var cv=document.createElement('canvas'); cv.width=cv.height=64;
  var g=cv.getContext('2d');
  var gr=g.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,inner); gr.addColorStop(1,outer);
  g.fillStyle=gr; g.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cv);
}
var earthMesh=null, earthL=null, orbiter=null, earthAtmosphere=null, earthHalo=null;
var EARTH_DIR=new THREE.Vector3(-0.1,-0.14,-0.98).normalize();
function buildSpace(){
  earthMesh=new THREE.Mesh(new THREE.SphereGeometry(39,40,28),
    new THREE.MeshStandardMaterial({map:earthSphereTex(), roughness:0.85, metalness:0, emissive:0xffffff, emissiveMap:earthSphereTex(), emissiveIntensity:0.16, fog:false}));
  earthMesh.position.copy(EARTH_DIR).multiplyScalar(560);
  earthMesh.rotation.z=0.41;
  scene.add(earthMesh);
  var atmo=new THREE.Mesh(new THREE.SphereGeometry(40.1,40,28),
    new THREE.ShaderMaterial({
      transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.FrontSide, fog:false,
      uniforms:{},
      vertexShader:'varying vec3 vN; varying vec3 vP; void main(){ vN=normalize(normalMatrix*normal); vP=(modelViewMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:'varying vec3 vN; varying vec3 vP; void main(){ float f=pow(1.0-abs(dot(normalize(vN),normalize(-vP))),2.6); gl_FragColor=vec4(vec3(0.45,0.65,1.0)*f*1.4,f*0.9); }'
    }));
  atmo.position.copy(earthMesh.position);
  earthAtmosphere=atmo;
  scene.add(atmo);
  var glow=new THREE.Sprite(new THREE.SpriteMaterial({map:radialTex('rgba(140,180,255,0.5)','rgba(140,180,255,0)'), color:0x8cb8ff, transparent:true, opacity:0.45, blending:THREE.AdditiveBlending, depthWrite:false, fog:false}));
  glow.scale.set(190,190,1);
  glow.position.copy(EARTH_DIR).multiplyScalar(570);
  earthHalo=glow;
  scene.add(glow);
  earthL=new THREE.DirectionalLight(0x7fa8d8, 0);
  earthL.position.copy(EARTH_DIR).multiplyScalar(200);
  scene.add(earthL); scene.add(earthL.target);
  orbiter=new THREE.Group();
  orbiter.position.set(-350,-70,-360);
  orbiter.scale.setScalar(.42);
  noShadow(mk(boxG(13,5,6), M.white, 0,0,0,orbiter));
  noShadow(mk(cylG(3.5,3.5,5,16), M.metal, 0,4.5,0,orbiter));
  noShadow(mk(sphG(2.8,20,12), M.glass, 0,7,0,orbiter));
  for(var side=-1;side<=1;side+=2){
    noShadow(mk(boxG(5,0.7,1.4), M.metal, side*9,0,0,orbiter));
    for(var panel=0;panel<3;panel++){
      var wing=noShadow(mk(boxG(10,0.28,11), M.solar, side*(19+panel*10.5),0,0,orbiter));
      wing.rotation.z=0.12*side;
      noShadow(mk(boxG(0.35,0.4,11.2), M.light, side*(19+panel*10.5),0,0,orbiter));
    }
  }
  noShadow(mk(sphG(1.2,12,8), M.gRed, 0,0,4,orbiter));
  scene.add(orbiter);
  positionEarthForViewport();
}
function positionEarthForViewport(){
  if(!earthMesh) return;
  var direction=new THREE.Vector3(camera.aspect<1?-.24:-.1,-.14,-.98).normalize();
  earthMesh.position.copy(direction).multiplyScalar(560);
  earthAtmosphere.position.copy(earthMesh.position);
  earthHalo.position.copy(direction).multiplyScalar(570);
}

/* ---------------- 4. 材质库 ---------------- */
function std(o){ return new THREE.MeshStandardMaterial(o); }
function glowMat(hex, i){ return std({color:0x0a0a0a, emissive:C(hex), emissiveIntensity:i||1.6, roughness:0.6, metalness:0}); }
var M={
  rego:   std({vertexColors:true, roughness:0.97, metalness:0}),
  white:  std({color:C(0xe9edf2), roughness:0.5, metalness:0.12}),
  light:  std({color:C(0xccd2da), roughness:0.6, metalness:0.1}),
  mid:    std({color:C(0x9aa2ae), roughness:0.55, metalness:0.2}),
  dark:   std({color:C(0x3a4048), roughness:0.6, metalness:0.35}),
  orange: std({color:C(0xe07b39), roughness:0.55, metalness:0.15}),
  metal:  std({color:C(0xaab2bc), roughness:0.32, metalness:0.8}),
  rail:   std({color:C(0x8a8e96), roughness:0.28, metalness:0.85}),
  sleeper:std({color:C(0x5d5148), roughness:0.9, metalness:0}),
  rock1:  std({color:C(0x5d636e), roughness:0.95, metalness:0}),
  rock2:  std({color:C(0x4a4f59), roughness:0.95, metalness:0}),
  solar:  std({color:C(0x1b3a5c), roughness:0.22, metalness:0.75}),
  solarF: std({color:C(0x24507c), roughness:0.22, metalness:0.75}),
  glass:  std({color:C(0xa8d8d0), roughness:0.08, metalness:0.05, transparent:true, opacity:0.34, emissive:C(0x2a4a44), emissiveIntensity:0.3}),
  glassGH:std({color:C(0xa8e0b8), roughness:0.08, metalness:0.05, transparent:true, opacity:0.36, emissive:C(0x2a5a3a), emissiveIntensity:0.3}),
  plant:  std({color:C(0x4e8a3f), roughness:0.85, metalness:0}),
  flagR:  std({color:C(0xc8352a), roughness:0.8, metalness:0}),
  gold:   std({color:C(0xffd23f), roughness:0.35, metalness:0.7}),
  gWarm:  glowMat(0xffd9a0),
  gCold:  glowMat(0x8fe6ff),
  gRed:   glowMat(0xff4d4d),
  gGreen: glowMat(0x66ff88),
  gCyan:  glowMat(0x46e0ff),
  gAmber: glowMat(0xffc46b),
  gWhite: glowMat(0xf2f6ff),
  gRad:   glowMat(0xff9a3c, 1.8),
  gGrow:  glowMat(0xff70d8),
  containers: [std({color:C(0xc05046),roughness:0.7,metalness:0.2}), std({color:C(0x4a6fb5),roughness:0.7,metalness:0.2}),
               std({color:C(0xd8b23f),roughness:0.7,metalness:0.2}), std({color:C(0x5a9e5a),roughness:0.7,metalness:0.2}),
               std({color:C(0xd6dade),roughness:0.7,metalness:0.2}), std({color:C(0xe07b39),roughness:0.7,metalness:0.2})]
};

/* ---------------- 5. 网格助手 ---------------- */
function mk(geo, mat, x,y,z, parent){
  var m=new THREE.Mesh(geo, mat);
  if(x!==undefined) m.position.set(x,y,z);
  m.castShadow=true; m.receiveShadow=true;
  (parent||scene).add(m);
  return m;
}
function noShadow(m){ m.castShadow=false; m.receiveShadow=false; return m; }
function cylG(r0,r1,h,seg){ return new THREE.CylinderGeometry(r0,r1,h,seg||20); }
function sphG(r,ws,hs){ return new THREE.SphereGeometry(r,ws||24,hs||18); }
function boxG(w,h,d){ return new THREE.BoxGeometry(w,h,d); }
function signTex(txt, sub, fg, bg){
  var cv=document.createElement('canvas'); cv.width=256; cv.height=64;
  var g=cv.getContext('2d');
  g.fillStyle=bg||'rgba(10,18,30,0.92)'; g.fillRect(0,0,256,64);
  g.strokeStyle=fg||'#46e0ff'; g.lineWidth=3; g.strokeRect(3,3,250,58);
  g.fillStyle=fg||'#46e0ff'; g.font='bold 26px monospace'; g.textAlign='center'; g.textBaseline='middle';
  g.fillText(txt,128,sub?26:32);
  if(sub){ g.font='15px monospace'; g.globalAlpha=0.75; g.fillText(sub,128,49); }
  return new THREE.CanvasTexture(cv);
}
function mkSign(txt, sub, w, fg, bg){
  var sign=noShadow(mk(new THREE.PlaneGeometry(w||8, (w||8)/4), new THREE.MeshBasicMaterial({map:signTex(txt,sub,fg,bg), transparent:true})));
  sign.visible=false;
  return sign;
}

/* ---------------- 6. 地形网格 ---------------- */
var POIS=[];
function addPOI(o){ POIS.push(o); }
var terrainMesh=null;
function buildTerrain(){
  var RINGS=112, SECT=240;
  var pos=[], col=[], idx=[], uv=[0,0];
  var cReg=[C(0xb4b8c0),C(0xa6abb6),C(0xc2c6ce),C(0x9aa0ab)];
  var cRoad=C(0x7a808c), cPlaza=C(0x969daa), cDark=C(0x697080), cTrack=C(0x7d838f);
  pos.push(0, terrainH(0,0), 0);
  var cc0=cReg[1]; col.push(cc0.r,cc0.g,cc0.b);
  for(var ri=1;ri<=RINGS;ri++){
    var rr=ri/RINGS*TERRAIN_R;
    for(var si=0;si<SECT;si++){
      var a=si/SECT*TAU;
      var boundary=0.955+0.025*Math.sin(a*3+0.7)+0.015*Math.sin(a*7-0.3);
      var x=Math.cos(a)*rr*boundary, z=Math.sin(a)*rr*boundary;
      var y=terrainH(x,z);
      pos.push(x,y,z);
      uv.push(x/14,z/14);
      var ns=noise2(x*0.3+91, z*0.3+47);
      var c;
      if(rr>TERRAIN_R-2.5) c=cDark;
      else if(rr>50) c = ns>0.35?cReg[2]:(ns>0.08?cReg[0]:(ns>-0.3?cReg[1]:cReg[3]));
      else c = ns>0.3?cPlaza:(ns>-0.2?cReg[0]:cReg[1]);
      var rd=roadDist(x,z);
      if(rd<1) c=cRoad;
      if(rd>0.42&&rd<0.62) c=cTrack;
      c=cReg[1].clone().lerp(cReg[3],clamp(0.4+ns*0.35,0,1));
      if(rd<1) c.lerp(cRoad,0.35);
      var shade=0.86+vnoise(x*0.6,z*0.6)*0.16;
      col.push(c.r*shade, c.g*shade, c.b*shade);
    }
  }
  function vid(ri,si){ return ri===0?0 : 1+(ri-1)*SECT+((si%SECT+SECT)%SECT); }
  for(var si2=0;si2<SECT;si2++) idx.push(0, vid(1,si2+1), vid(1,si2));
  for(var ri2=1;ri2<RINGS;ri2++){
    for(var si3=0;si3<SECT;si3++){
      var a0=vid(ri2,si3), b0=vid(ri2,si3+1), c0=vid(ri2+1,si3), d0=vid(ri2+1,si3+1);
      idx.push(a0,b0,c0, b0,d0,c0);
    }
  }
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos),3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col),3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv),2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  terrainMesh=new THREE.Mesh(geo, M.rego);
  terrainMesh.receiveShadow=true; terrainMesh.castShadow=true;
  scene.add(terrainMesh);
  /* 月壳 */
  var pts=[];
  var prof=[[88,0.8],[84,-1.5],[78,-4],[70,-7],[60,-10],[46,-13],[30,-15.5],[14,-17],[0,-17.5]];
  for(var i=0;i<prof.length;i++) pts.push(new THREE.Vector2(prof[i][0], prof[i][1]));
  var crust=mk(new THREE.LatheGeometry(pts, 96), M.rock2, 0,-0.8,0);
  var crustPositions=crust.geometry.attributes.position;
  for(var crustIndex=0;crustIndex<crustPositions.count;crustIndex++){
    var crustAngle=Math.atan2(crustPositions.getZ(crustIndex),crustPositions.getX(crustIndex));
    var crustRadius=0.955+0.025*Math.sin(crustAngle*3+0.7)+0.015*Math.sin(crustAngle*7-0.3);
    crustPositions.setX(crustIndex,crustPositions.getX(crustIndex)*crustRadius);
    crustPositions.setZ(crustIndex,crustPositions.getZ(crustIndex)*crustRadius);
  }
  crust.geometry.computeVertexNormals();
  crust.receiveShadow=true;
  /* 垂岩 */
  var spikeG=new THREE.IcosahedronGeometry(1,0);
  var spikes=new THREE.InstancedMesh(spikeG, M.rock1, 26);
  var dum=new THREE.Object3D();
  for(var s=0;s<26;s++){
    var aa=rnd()*TAU, dd=rrange(8,55);
    dum.position.set(Math.cos(aa)*dd, crustBottom(dd)-rrange(1,4), Math.sin(aa)*dd);
    dum.rotation.set(rnd()*3,rnd()*3,rnd()*3);
    var sc=rrange(1,3.4);
    dum.scale.set(sc,sc*rrange(1.2,2),sc);
    dum.updateMatrix();
    spikes.setMatrixAt(s, dum.matrix);
  }
  spikes.castShadow=true;
  scene.add(spikes);
  /* 散石 */
  var rocks=new THREE.InstancedMesh(spikeG, M.rock1, 44);
  for(var r2=0;r2<44;r2++){
    var a2=rnd()*TAU, d2=rrange(56,84);
    var rx=Math.cos(a2)*d2, rz=Math.sin(a2)*d2;
    dum.position.set(rx, terrainH(rx,rz)+0.1, rz);
    dum.rotation.set(rnd()*3,rnd()*3,rnd()*3);
    var sc2=rrange(0.5,2.2);
    dum.scale.set(sc2,sc2*0.8,sc2);
    dum.updateMatrix();
    rocks.setMatrixAt(r2, dum.matrix);
  }
  rocks.castShadow=true; rocks.receiveShadow=true;
  scene.add(rocks);
  var gravel=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0), M.rock2, 360);
  var gravelCount=0;
  for(var gi=0;gi<750 && gravelCount<360;gi++){
    var ga=rnd()*TAU, gr=rrange(12,84);
    var gx=Math.cos(ga)*gr, gz=Math.sin(ga)*gr;
    if(roadDist(gx,gz)<1.4) continue;
    var clear=true;
    for(var sf=0;sf<SITE_FLAT.length;sf++){
      var site=SITE_FLAT[sf];
      if(Math.hypot(gx-site[0],gz-site[1])<site[2]+1){ clear=false; break; }
    }
    if(!clear) continue;
    var gs=rrange(0.12,0.55);
    dum.position.set(gx,terrainH(gx,gz)+gs*0.24,gz);
    dum.rotation.set(rnd()*0.5,rnd()*TAU,rnd()*0.5);
    dum.scale.set(gs,gs*rrange(0.35,0.7),gs*rrange(0.8,1.6));
    dum.updateMatrix(); gravel.setMatrixAt(gravelCount++,dum.matrix);
  }
  gravel.count=gravelCount;
  gravel.receiveShadow=true;
  scene.add(gravel);
  /* 平顶山 */
  var mesas=[[-70,58,10,8],[72,48,8,6],[-20,-80,11,9]];
  for(var mI=0;mI<mesas.length;mI++){
    var mm=mesas[mI], mh=terrainH(mm[0],mm[1]);
    mk(cylG(mm[2]*0.72, mm[2], mm[3], 18), M.rock1, mm[0], mh+mm[3]/2-1, mm[1]);
    mk(cylG(mm[2]*0.72, mm[2]*0.8, 1.4, 18), M.rock2, mm[0], mh+mm[3]-0.8, mm[1]);
  }
}
/* ---------------- 7. 建筑（光滑装配） ---------------- */
function buildTower(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  mk(cylG(6.4,7,1.6,24), M.mid, 0,b+0.8,-30, g);
  mk(cylG(5,5.4,6,24), M.white, 0,b+3.8,-30, g);
  mk(cylG(5.06,5.46,0.9,24), M.gWarm, 0,b+4.6,-30, g);
  mk(cylG(4,4.5,5.4,24), M.light, 0,b+9.5,-30, g);
  for(var wi=0;wi<12;wi++){
    var wa=wi/12*TAU;
    var window=noShadow(mk(boxG(1.05,1.15,0.16), M.glass, Math.sin(wa)*4.22,b+9.9,-30+Math.cos(wa)*4.22,g));
    window.rotation.y=wa;
    var rib=mk(boxG(0.2,5.2,0.28), M.metal, Math.sin(wa+TAU/24)*4.25,b+9.5,-30+Math.cos(wa+TAU/24)*4.25,g);
    rib.rotation.y=wa+TAU/24;
  }
  mk(cylG(4.06,4.56,0.9,24), M.gCold, 0,b+10.2,-30, g);
  mk(cylG(6.2,6.2,0.8,24), M.mid, 0,b+12.6,-30, g);
  mk(new THREE.TorusGeometry(5.9,0.14,8,32), M.gCyan, 0,b+13.4,-30, g).rotation.x=Math.PI/2;
  mk(cylG(4.6,4.6,2.8,24), M.glass, 0,b+14.6,-30, g);
  mk(cylG(3.4,3.4,2.2,16), M.gWarm, 0,b+14.4,-30, g);
  mk(cylG(5,4.2,1,24), M.white, 0,b+16.5,-30, g);
  mk(cylG(0.8,1,9,10), M.dark, 0,b+21,-30, g);
  mk(sphG(0.9,14,10), M.gRed, 0,b+25.9,-30, g);
  mk(boxG(1.4,0.8,1.4), M.gWhite, -1.8,b+21.5,-30, g);
  mk(boxG(1.4,0.8,1.4), M.gWhite, 1.8,b+21.5,-30, g);
  mk(boxG(6,3,1.6), M.light, 0,b+1.5,-36.2, g);
  mk(boxG(1.2,1,0.3), M.gWarm, -1.6,b+1.8,-37.1, g);
  mk(boxG(1.2,1,0.3), M.gWarm, 1.6,b+1.8,-37.1, g);
  var sg=mkSign('HOUSTON','MISSION CONTROL',9); sg.position.set(0,b+7.6,-35.4); sg.rotation.x=-0.06; g.add(sg);
  addPOI({id:'tower', name:'指挥塔「休斯敦」', en:'MISSION CONTROL', hit:{x:0,y:b+13,z:-30,r:8,h:22},
    desc:'基地的神经中枢，向 1969 年 7 月 20 日那声呼叫致敬——「休斯顿，这里是静海基地，鹰已着陆」。三层塔身，观景台环绕冷蓝舷窗，顶部红色信标为归航飞行器指路。点击切换全基地灯光。',
    pos:new THREE.Vector3(0, b+22, -30)});
}
function buildDomes(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var domes=[{x:-28,z:2},{x:-14,z:14},{x:-30,z:20},{x:-44,z:10}];
  var domeG=sphG(7,28,14); domeG.scale(1,0.82,1);
  for(var i=0;i<domes.length;i++){
    var m=domes[i], y=terrainH(m.x,m.z);
    mk(new THREE.TorusGeometry(7.2,0.5,10,32), M.mid, m.x,y+0.4,m.z, g).rotation.x=Math.PI/2;
    mk(domeG, M.glass, m.x,y+0.6,m.z, g);
    for(var ribI=0;ribI<6;ribI++){
      var ribPts=[];
      var ribAngle=ribI/6*Math.PI;
      for(var seg=0;seg<=16;seg++){
        var arc=seg/16*Math.PI;
        ribPts.push(new THREE.Vector3(m.x+Math.cos(arc)*7*Math.cos(ribAngle),y+0.6+Math.sin(arc)*5.74,m.z+Math.cos(arc)*7*Math.sin(ribAngle)));
      }
      noShadow(mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts),24,0.075,5,false),M.metal,undefined,undefined,undefined,g));
    }
    mk(sphG(0.45,12,8), M.gCold, m.x,y+6.4,m.z,g);
    mk(cylG(5.6,5.6,0.5,20), M.gWarm, m.x,y+0.5,m.z, g);
    mk(boxG(1.8,1.2,1.4), M.white, m.x-2,y+1.2,m.z+1.5, g);
    mk(boxG(1.4,2,1.2), M.light, m.x+2.2,y+1.6,m.z-1, g);
    mk(cylG(1.2,1.5,2.6,10), M.light, m.x,y+1.3,m.z-7.4, g);
    mk(boxG(1,0.8,0.3), M.gGreen, m.x,y+1.6,m.z-8.4, g);
    mk(boxG(0.9,0.7,0.3), M.gWarm, m.x-3.4,y+2,m.z-5.6, g);
    mk(boxG(0.9,0.7,0.3), M.gWarm, m.x+3.4,y+2,m.z-5.6, g);
  }
  /* 通道 */
  var tun=[[-26,6,-16,12],[-16,12,-12.5,14],[-28,8,-28,14],[-42,10,-32,6]];
  for(var t=0;t<tun.length;t++){
    var s=tun[t];
    var dx=s[2]-s[0], dz=s[3]-s[1], len=Math.hypot(dx,dz);
    var y1=terrainH((s[0]+s[2])/2,(s[1]+s[3])/2);
    var tube=mk(cylG(1.7,1.7,len,14), M.light, (s[0]+s[2])/2,y1+1.6,(s[1]+s[3])/2, g);
    tube.rotation.z=Math.PI/2;
    tube.rotation.y=Math.atan2(dz,dx)+Math.PI/2;
    tube.rotation.order='YXZ';
  }
  var sg=mkSign('EAGLE','HABITAT',7); sg.position.set(-21,terrainH(-21,-3)+3.2,-4.4); g.add(sg);
  addPOI({id:'hab', name:'居住穹顶「天鹰」', en:'EAGLE HABITAT DOMES', hit:{x:-27,y:b+4,z:11,r:16,h:9},
    desc:'四座加压穹顶以登月舱「鹰」命名，由通道相连，舷窗透出暖光。没有大气的月球上，穹顶就是全部的大气。月尘再大，人也只能撤回这里。',
    pos:new THREE.Vector3(-27, b+9, 11)});
}
var growBar1, growBar2;
function buildGreenhouse(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var ghs=[{x:-8,z:30,r:7},{x:6,z:36,r:6}];
  for(var i=0;i<ghs.length;i++){
    var m=ghs[i], y=terrainH(m.x,m.z);
    mk(new THREE.TorusGeometry(m.r+0.2,0.5,10,32), M.mid, m.x,y+0.4,m.z, g).rotation.x=Math.PI/2;
    var dg=sphG(m.r,28,14); dg.scale(1,0.85,1);
    mk(dg, M.glassGH, m.x,y+0.6,m.z, g);
    for(var k=-2;k<=2;k++){
      mk(boxG(m.r*1.1,0.5,0.9), M.plant, m.x,y+1.1,m.z+k*2, g);
      mk(cylG(0.4,0.5,1,8), M.plant, m.x-2,y+1.9,m.z+k*2, g);
      mk(cylG(0.4,0.5,1,8), M.plant, m.x+2,y+1.9,m.z+k*2, g);
    }
    var bar=mk(boxG(m.r*1.3,0.35,0.5), M.gGrow, m.x,y+m.r*0.62,m.z, g);
    if(i===0) growBar1=bar; else growBar2=bar;
    mk(cylG(1.1,1.4,2.4,10), M.light, m.x,y+1.2,m.z-m.r-0.6, g);
  }
  var sg=mkSign('VEGGIE','GREENHOUSE',6.5); sg.position.set(-8,terrainH(-8,22)+3.4,22.4); g.add(sg);
  addPOI({id:'gh', name:'生态温室「田园」', en:'VEGGIE GREENHOUSE', hit:{x:-1,y:b+4,z:33,r:10,h:9},
    desc:'名字来自国际空间站的 Veggie 实验——2015 年，宇航员第一次吃到了自己在轨种出的红生菜。这里种的是生菜、番茄和土豆。点击切换品红生长灯。',
    pos:new THREE.Vector3(-1, b+9, 33)});
}
function buildGarage(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var y=terrainH(26,18);
  mk(boxG(14,0.8,12), M.mid, 26,y+0.4,18, g);
  mk(boxG(13,6,11), M.light, 26,y+3.8,18, g);
  mk(boxG(13.4,0.8,11.4), M.white, 26,y+7.2,18, g);
  mk(boxG(7,4.4,0.6), M.dark, 26,y+2.8,12.6, g);
  mk(boxG(7.8,0.5,0.5), M.gRed, 26,y+5.4,12.4, g);
  mk(boxG(1,0.8,0.3), M.gAmber, 19.6,y+4,12.6, g);
  mk(boxG(1,0.8,0.3), M.gAmber, 32.4,y+4,12.6, g);
  mk(boxG(2.4,1.8,2), M.mid, 34,y+1.3,22, g);
  mk(boxG(0.8,0.6,0.3), M.gGreen, 34,y+2.4,21, g);
  var sg=mkSign('LRV','ROVER GARAGE',7); sg.position.set(26,y+6.4,12.3); g.add(sg);
  addPOI({id:'garage', name:'车库「漫游者」', en:'LRV ROVER GARAGE', hit:{x:26,y:b+3,z:18,r:10,h:8},
    desc:'两辆月面越野车（LRV）的家。阿波罗 15 到 17 号的月球车在月面跑了 90 多公里，最高时速纪录 18 公里——在 1/6 重力下已经相当刺激。点击派出或召回车队。',
    pos:new THREE.Vector3(26, b+8, 18)});
}
function buildLaunchPad(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var y=terrainH(36,-36);
  mk(cylG(10,10.6,1.6,8), M.mid, 36,y+0.8,-36, g);
  mk(cylG(4.6,5,0.8,20), M.dark, 36,y+1.9,-36, g);
  mk(boxG(1.6,0.3,12), M.dark, 36,y+2,-36, g);
  for(var i=0;i<5;i++){
    mk(boxG(1,0.5,1), M.dark, 43.5,y+1.8+i*3.2,-33.5, g);
    mk(boxG(1,0.5,1), M.dark, 43.5,y+1.8+i*3.2,-38.5, g);
    mk(boxG(0.5,3.2,0.5), M.dark, 43.5,y+3.2+i*3.2,-33.5, g);
    mk(boxG(0.5,3.2,0.5), M.dark, 43.5,y+3.2+i*3.2,-38.5, g);
    mk(boxG(0.6,0.4,5.6), M.metal, 43.5,y+3.4+i*3.2,-36, g);
  }
  mk(boxG(5.4,0.7,0.9), M.orange, 40.4,y+15.4,-36, g);
  mk(boxG(5.4,0.7,0.9), M.orange, 40.4,y+11.4,-36, g);
  mk(sphG(0.8,12,8), M.gRed, 43.5,y+18.4,-36, g);
  var lp=[[-8.5,-8.5],[8.5,-8.5],[-8.5,8.5],[8.5,8.5]];
  for(var k=0;k<4;k++){
    mk(cylG(0.3,0.4,7,8), M.metal, 36+lp[k][0],y+3.5,-36+lp[k][1], g);
    mk(boxG(1.6,1,1.6), M.gWhite, 36+lp[k][0],y+7.4,-36+lp[k][1], g);
  }
  addPOI({id:'pad', name:'发射工位「星舰」', en:'STARSHIP HLS PAD', hit:{x:36,y:b+8,z:-36,r:12,h:20},
    desc:'星舰 HLS（载人着陆系统）的泊位——阿尔忒弥斯计划选中的登月器。双摆臂勤务塔、导流槽、四盏泛光灯。点击点火升空，它会绕一圈再自己落回来。',
    pos:new THREE.Vector3(36, b+19, -36)});
}
function buildLandingPad(wx,wz,id,name,en,desc){
  var g=new THREE.Group(); scene.add(g);
  var y=terrainH(wx,wz);
  mk(cylG(5.6,6,1.2,20), M.mid, wx,y+0.6,wz, g);
  mk(cylG(5.2,5.2,0.3,20), M.light, wx,y+1.35,wz, g);
  mk(boxG(1.2,0.15,5), M.white, wx,y+1.55,wz, g);
  mk(boxG(5,0.15,1.2), M.white, wx,y+1.55,wz, g);
  var lp=[[-4.6,0],[4.6,0],[0,-4.6],[0,4.6]];
  for(var i=0;i<4;i++) mk(sphG(0.45,10,8), M.gAmber, wx+lp[i][0],y+1.7,wz+lp[i][1], g);
  addPOI({id:id, name:name, en:en, hit:{x:wx,y:y+2,z:wz,r:7,h:5}, desc:desc,
    pos:new THREE.Vector3(wx, y+6, wz)});
}
function buildSolar(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var panelG=boxG(4.6,0.25,3.2);
  var panels=new THREE.InstancedMesh(panelG, M.solar, 20);
  var posts=new THREE.InstancedMesh(cylG(0.22,0.22,3.4,8), M.metal, 20);
  var dum=new THREE.Object3D(), n=0;
  for(var r=0;r<4;r++) for(var q=0;q<5;q++){
    var px=-44-10+q*5, pz=-20-8+r*5;
    var y=terrainH(px,pz);
    dum.position.set(px,y+3.4,pz);
    dum.rotation.set(0.35,0,-0.15);
    dum.scale.set(1,1,1);
    dum.updateMatrix();
    panels.setMatrixAt(n, dum.matrix);
    dum.position.set(px,y+1.7,pz);
    dum.rotation.set(0,0,0);
    dum.updateMatrix();
    posts.setMatrixAt(n, dum.matrix);
    n++;
  }
  panels.castShadow=true; posts.castShadow=true;
  g.add(panels); g.add(posts);
  mk(boxG(3,2.2,2.4), M.mid, -34,terrainH(-34,-12)+1.1,-12, g);
  mk(boxG(0.8,0.6,0.3), M.gRed, -34,terrainH(-34,-12)+2.5,-12, g);
  addPOI({id:'solar', name:'光伏阵列「日帆」', en:'SOLAR FIELD', hit:{x:-44,y:b+5,z:-20,r:14,h:8},
    desc:'20 块光伏板以固定倾角对着太阳。月昼长达 14 个地球日，充电时间管够；难的是接下来 14 天的月夜——所以基地还得靠那座裂变反应堆兜底。',
    pos:new THREE.Vector3(-44, b+8, -20)});
}
function buildReactor(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var y=terrainH(-52,4);
  mk(cylG(5.4,6,1.2,20), M.mid, -52,y+0.6,4, g);
  mk(cylG(3.4,3.8,6.4,20), M.dark, -52,y+4.4,4, g);
  mk(cylG(3.8,3.4,0.8,20), M.mid, -52,y+7.8,4, g);
  mk(sphG(1.2,14,10), M.gRad, -52,y+8.6,4, g);
  var fins=[[5.6,0],[-5.6,0],[0,5.6],[0,-5.6]];
  for(var i=0;i<4;i++){
    var fx=-52+fins[i][0], fz=4+fins[i][1];
    var fin=mk(boxG(fins[i][0]!==0?0.4:4.4, 6.4, fins[i][1]!==0?0.4:4.4), M.gRad, fx,y+4.4,fz, g);
    mk(boxG(0.5,0.5,Math.abs(fins[i][0])+Math.abs(fins[i][1])-2), M.metal, -52+fins[i][0]*0.55,y+3.4,4+fins[i][1]*0.55, g).rotation.y=fins[i][0]!==0?Math.PI/2:0;
  }
  mk(sphG(0.5,10,8), M.gRed, -56,y+1.6,0, g);
  mk(sphG(0.5,10,8), M.gAmber, -48,y+1.6,8, g);
  addPOI({id:'reactor', name:'裂变反应堆「烛龙」', en:'FISSION SURFACE POWER', hit:{x:-52,y:b+4,z:4,r:9,h:9},
    desc:'NASA 月面裂变电源的同款思路：40 千瓦级反应堆，四片橙色散热鳍片把废热辐射进漆黑的天空。月夜长达 14 天，没有它，光伏阵列再大一倍也撑不住。',
    pos:new THREE.Vector3(-52, b+10, 4),
    stat:function(){ return '输出 40 kW · 堆芯正常'; }});
}
function buildDepot(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var y=terrainH(-46,28);
  mk(boxG(14,0.8,10), M.mid, -46,y+0.4,28, g);
  for(var i=0;i<3;i++){
    var px=-50+i*4;
    mk(cylG(0.5,0.6,2.2,8), M.dark, px,y+1.5,28, g);
    mk(sphG(3.1,24,18), M.white, px,y+5.4,28, g);
    mk(boxG(1,0.7,0.5), M.gWhite, px,y+8.6,28, g);
    if(i<2) mk(cylG(0.3,0.3,4,8), M.metal, px+2,y+2.2,28, g).rotation.z=Math.PI/2;
  }
  mk(boxG(2.6,2,2.2), M.mid, -52,y+1.4,32, g);
  mk(boxG(0.7,0.5,0.3), M.gGreen, -52,y+2.6,31.2, g);
  var sg=mkSign('CRYO','PROPELLANT',6); sg.position.set(-46,y+3,23.2); g.add(sg);
  addPOI({id:'depot', name:'推进剂库「低温」', en:'CRYO PROPELLANT DEPOT', hit:{x:-46,y:b+5,z:28,r:9,h:10},
    desc:'三颗液氧/甲烷球罐，为星舰 HLS 和跳跃器补给。推进剂来自月壤水冰电解——喝的是处理厂的「舂月」牌矿泉水。',
    pos:new THREE.Vector3(-46, b+10, 28)});
}
function buildPlant(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var y=terrainH(40,-14);
  mk(boxG(14,8,12), M.mid, 40,y+4,-14, g);
  mk(boxG(14.4,0.8,12.4), M.dark, 40,y+8.4,-14, g);
  for(var x=35;x<=45;x+=2.5){ mk(boxG(1.2,0.8,0.3), M.gCold, x,y+5,-20.1, g); }
  mk(cylG(1.2,1.5,7,12), M.dark, 37,y+11.5,-11, g);
  mk(sphG(0.7,10,8), M.gAmber, 37,y+15.2,-11, g);
  mk(cylG(3,1.6,3,12), M.dark, 45,y+2,-19, g);
  mk(boxG(1,0.8,0.3), M.gRed, 33.2,y+6,-20.1, g);
  var sg=mkSign('ISRU','REGOLITH PLANT',7.5); sg.position.set(40,y+7,-20.2); g.add(sg);
  /* 装料龙门（跨铁路） */
  var ga=Math.atan2(-20.5,58.5), gx=Math.round(Math.cos(ga)*62), gz=Math.round(Math.sin(ga)*62);
  var nx=Math.round(Math.cos(ga+Math.PI/2)*5.5), nz=Math.round(Math.sin(ga+Math.PI/2)*5.5);
  var gy=terrainH(gx,gz);
  mk(boxG(1.2,19-gy,1.2), M.orange, gx+nx,(gy+19)/2,gz+nz, g);
  mk(boxG(1.2,19-gy,1.2), M.orange, gx-nx,(gy+19)/2,gz-nz, g);
  var beam=mk(boxG(Math.abs(nx)*2+2.4,1.4,1.6), M.orange, gx,19.6,gz, g);
  beam.rotation.y=Math.atan2(nz,nx);
  mk(boxG(1.6,1,1.6), M.dark, gx,18.4,gz, g);
  mk(boxG(0.8,0.6,0.8), M.gAmber, gx,17.6,gz, g);
  addPOI({id:'plant', name:'月壤处理厂「舂月」', en:'REGOLITH PROCESSING', hit:{x:40,y:b+5,z:-14,r:10,h:14},
    desc:'把月壤倒进去，出来的是氧气和建材。窗外的装料龙门横跨铁路，矿卡列车直接从它肚子底下接货，哐当哐当运往车站。',
    pos:new THREE.Vector3(40, b+13, -14)});
}
function buildYard(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var y=terrainH(24,38);
  mk(boxG(22,0.5,20), M.light, 24,y+0.25,38, g);
  var contG=boxG(4,2,2);
  for(var ci=0;ci<6;ci++){
    var inst=new THREE.InstancedMesh(contG, M.containers[ci], 6);
    var dum=new THREE.Object3D(), n=0;
    for(var s=0;s<8;s++){
      var px=24-8+(s%4)*5, pz=38-6+Math.floor(s/4)*6;
      var stack=2+Math.floor(hash3(s,7,3)*3);
      for(var k=0;k<stack;k++){
        if((s+k)%6!==ci) continue;
        dum.position.set(px, y+1.3+k*2.1, pz);
        dum.rotation.set(0, (hash3(s,k,1)-0.5)*0.1, 0);
        dum.updateMatrix();
        inst.setMatrixAt(n++, dum.matrix);
      }
    }
    inst.count=n;
    inst.castShadow=true; inst.receiveShadow=true;
    g.add(inst);
  }
  addPOI({id:'yard', name:'集装箱场「补给」', en:'SUPPLY YARD & CRANE', hit:{x:24,y:b+7,z:38,r:12,h:16},
    desc:'来自地球的补给在这里集散，门式起重机日夜吊运彩色集装箱。每次货运抵达，都是全基地的节日——新鲜咖啡豆永远最先被抢光。',
    pos:new THREE.Vector3(24, b+16, 38)});
}
function buildComms(){
  var b=BASE_Y, g=new THREE.Group(); scene.add(g);
  var y=terrainH(18,-12);
  mk(boxG(12,0.8,10), M.mid, 18,y+0.4,-12, g);
  mk(cylG(0.9,1.1,11,10), M.metal, 22,y+5.9,-10, g);
  mk(sphG(0.7,10,8), M.gRed, 22,y+11.8,-10, g);
  mk(sphG(0.55,10,8), M.gGreen, 22,y+10,-10, g);
  mk(boxG(3,2.4,2.6), M.mid, 13,y+1.6,-14, g);
  mk(boxG(0.9,0.7,0.3), M.gCold, 13,y+2.9,-14.8, g);
  mk(cylG(1.5,1.8,2.6,12), M.metal, 16,y+1.7,-14, g);
  mk(cylG(1.5,1.8,2.6,12), M.metal, 20,y+1.7,-9, g);
  var sg=mkSign('DSN','DEEP SPACE LINK',6.5); sg.position.set(18,y+4.2,-16.4); g.add(sg);
  addPOI({id:'comms', name:'通信阵列「深空网」', en:'DEEP SPACE NETWORK', hit:{x:18,y:b+6,z:-12,r:8,h:12},
    desc:'两面碟形天线缓缓转动，对准 38 万公里外的地球。深空网在戈德斯通、马德里和堪培拉各有一座 70 米大锅接力，信号单程只要 1.3 秒——比火星仁慈多了。',
    pos:new THREE.Vector3(18, b+12, -12)});
}
function flagTex(){
  var cv=document.createElement('canvas'); cv.width=180; cv.height=110;
  var g=cv.getContext('2d');
  var grd=g.createLinearGradient(0,0,180,110);
  grd.addColorStop(0,'#071c2c'); grd.addColorStop(1,'#123c52');
  g.fillStyle=grd; g.fillRect(0,0,180,110);
  g.strokeStyle='#46e0ff'; g.lineWidth=4; g.strokeRect(3,3,174,104);
  g.fillStyle='#ffc46b'; g.beginPath(); g.arc(90,55,24,0,Math.PI*2); g.fill();
  g.fillStyle='#17334a'; g.beginPath(); g.arc(90,55,18,0,Math.PI*2); g.fill();
  g.strokeStyle='#8fe6ff'; g.lineWidth=3; g.beginPath(); g.moveTo(90,26); g.lineTo(90,84); g.moveTo(61,55); g.lineTo(119,55); g.stroke();
  g.fillStyle='#d7ecff'; g.font='bold 12px monospace'; g.textAlign='center'; g.fillText('TRQ-1',90,101);
  return new THREE.CanvasTexture(cv);
}
function plaqueTex(){
  var cv=document.createElement('canvas'); cv.width=256; cv.height=160;
  var g=cv.getContext('2d');
  g.fillStyle='#1c2026'; g.fillRect(0,0,256,160);
  g.strokeStyle='#ffd23f'; g.lineWidth=4; g.strokeRect(6,6,244,148);
  g.fillStyle='#ffd23f'; g.font='bold 15px serif'; g.textAlign='center';
  g.fillText('HERE MEN FROM THE',128,44);
  g.fillText('PLANET EARTH FIRST',128,66);
  g.fillText('SET FOOT UPON THE MOON',128,88);
  g.fillText('JULY 1969, A.D.',128,110);
  g.font='13px serif'; g.globalAlpha=0.85;
  g.fillText('WE CAME IN PEACE FOR ALL MANKIND',128,134);
  return new THREE.CanvasTexture(cv);
}
function buildMemorial(){
  var g=new THREE.Group(); scene.add(g);
  var y=terrainH(-14,-4);
  mk(boxG(5,0.7,2.4), M.mid, -14,y+0.35,-4, g);
  var plq=mk(boxG(4.4,3.2,0.4), M.dark, -14,y+2.3,-4, g);
  var face=noShadow(mk(new THREE.PlaneGeometry(4,2.6), new THREE.MeshBasicMaterial({map:plaqueTex()}), -14,y+2.3,-4.24, g));
  face.rotation.y=Math.PI;
  var fy=terrainH(-10,-6);
  mk(cylG(0.14,0.18,9.5,8), M.white, -10,fy+4.75,-6, g);
  var flag=noShadow(mk(new THREE.PlaneGeometry(6.4,4.1), new THREE.MeshBasicMaterial({map:flagTex(), side:THREE.DoubleSide}), -6.7,fy+7.6,-6, g));
  for(var i=0;i<6;i++){
    mk(boxG(0.5,0.06,0.9), M.rock2, -20+i*1.6, terrainH(-20+i*1.6,-1+(i%2?0.7:-0.7))+0.06, -1+(i%2?0.7:-0.7), g);
  }
  var ry=terrainH(-20,-9);
  mk(boxG(2.2,0.5,2.2), M.mid, -20,ry+0.25,-9, g);
  var rr=mk(boxG(2,0.5,2), M.white, -20,ry+0.75,-9, g);
  mk(boxG(0.5,0.3,0.5), M.gWhite, -20.5,ry+1.15,-9.5, g);
  mk(boxG(0.5,0.3,0.5), M.gWhite, -19.5,ry+1.15,-9.5, g);
  mk(boxG(0.5,0.3,0.5), M.gWhite, -20.5,ry+1.15,-8.5, g);
  mk(boxG(0.5,0.3,0.5), M.gWhite, -19.5,ry+1.15,-8.5, g);
  mk(sphG(0.3,8,6), M.gCyan, -20,ry+1.3,-9, g);
  addPOI({id:'flag', name:'阿波罗纪念广场', en:'APOLLO MEMORIAL', hit:{x:-15,y:y+4,z:-5,r:9,h:11},
    desc:'铭牌上写着 1969 年那句话：HERE MEN FROM THE PLANET EARTH FIRST SET FOOT UPON THE MOON。旁边是静海基地 TRQ-1 的任务旗、一串靴印，和一台激光反射器——阿波罗 11 留下的那台，直到今天还在接收地球发来的激光测距。',
    pos:new THREE.Vector3(-13, y+9, -5)});
}
function buildFloods(){
  var postG=new THREE.InstancedMesh(cylG(0.28,0.36,8.6,8), M.metal, 6);
  var headG=new THREE.InstancedMesh(boxG(2.4,0.9,1), M.dark, 12);
  var lenses=new THREE.InstancedMesh(boxG(1.85,.36,.08),M.gWhite,12);
  var dum=new THREE.Object3D();
  for(var i=0;i<6;i++){
    var a=(30+i*60)*Math.PI/180;
    var x=Math.cos(a)*50, z=Math.sin(a)*50;
    var y=terrainH(x,z);
    dum.position.set(x,y+4.3,z); dum.rotation.set(0,0,0); dum.updateMatrix();
    postG.setMatrixAt(i, dum.matrix);
    dum.position.set(x-0.7,y+8.9,z); dum.rotation.set(0.5,-a+Math.PI/2,0); dum.updateMatrix();
    headG.setMatrixAt(i*2, dum.matrix);
    dum.position.add(new THREE.Vector3(0,0,.54).applyEuler(dum.rotation));dum.updateMatrix();lenses.setMatrixAt(i*2,dum.matrix);
    dum.position.set(x+0.7,y+8.9,z); dum.updateMatrix();
    headG.setMatrixAt(i*2+1, dum.matrix);
    dum.position.add(new THREE.Vector3(0,0,.54).applyEuler(dum.rotation));dum.updateMatrix();lenses.setMatrixAt(i*2+1,dum.matrix);
  }
  postG.castShadow=true;
  scene.add(postG); scene.add(headG); scene.add(lenses);
}
function buildRail(){
  var R=62, y=14, g=new THREE.Group(); scene.add(g);
  var r1=mk(new THREE.TorusGeometry(R-0.7,0.22,8,140), M.rail, 0,y,0, g); r1.rotation.x=Math.PI/2;
  var r2=mk(new THREE.TorusGeometry(R+0.7,0.22,8,140), M.rail, 0,y,0, g); r2.rotation.x=Math.PI/2;
  var sleeperG=new THREE.InstancedMesh(boxG(2.2,0.25,0.5), M.sleeper, 130);
  var pylonG=new THREE.InstancedMesh(cylG(0.5,0.65,1,8), M.mid, 36);
  var dum=new THREE.Object3D();
  for(var i=0;i<130;i++){
    var a=i/130*TAU;
    dum.position.set(Math.cos(a)*R, y-0.35, Math.sin(a)*R);
    dum.rotation.set(0,-a,0); dum.scale.set(1,1,1); dum.updateMatrix();
    sleeperG.setMatrixAt(i, dum.matrix);
  }
  for(var p=0;p<36;p++){
    var a2=p/36*TAU;
    var px=Math.cos(a2)*R, pz=Math.sin(a2)*R;
    var ty=terrainH(px,pz); if(ty===null) ty=2;
    var h=y-0.5-ty;
    dum.position.set(px, ty+h/2, pz);
    dum.scale.set(1,h,1); dum.rotation.set(0,0,0); dum.updateMatrix();
    pylonG.setMatrixAt(p, dum.matrix);
  }
  sleeperG.castShadow=true; pylonG.castShadow=true;
  g.add(sleeperG); g.add(pylonG);
  /* 静海站 */
  var sy=terrainH(0,62);
  mk(boxG(13,0.7,7), M.mid, 0,y-0.9,62, g);
  mk(boxG(0.5,4.6,0.5), M.light, -5,y+1.7,64.5, g);
  mk(boxG(0.5,4.6,0.5), M.light, 5,y+1.7,64.5, g);
  artBox(13,.35,5.8,M.dark,0,y+4.2,63.2,g,.18);
  artBox(12.6,.12,5.3,M.solar,0,y+4.43,63.2,g,.06);
  artBox(8,.22,1.2,M.dark,0,y+.55,64,g,.08);
  artBox(8,.95,.15,M.light,0,y+1.15,64.5,g,.08);
  mk(boxG(11,.1,.12),M.gWarm,0,y+3.95,61,g);
  mk(boxG(12,0.18,0.5), M.gCyan, 0,y-0.4,58.8, g);
  mk(boxG(1,0.8,0.3), M.gAmber, -4,y+0.4,64.8, g);
  mk(boxG(1,0.8,0.3), M.gAmber, 4,y+0.4,64.8, g);
  var sg=mkSign('TRANQUILITY','STATION',8.5); sg.position.set(0,y+2.6,65.4); sg.rotation.y=Math.PI; g.add(sg);
  addPOI({id:'station', name:'静海站', en:'TRANQUILITY STATION', hit:{x:0,y:y+1,z:62,r:8,h:8},
    desc:'环线在正前方的小站，月台的青白色灯带整夜亮着。矿卡列车每绕一圈都在这里停靠片刻，卸下去处理厂的矿石，装上要送去穹顶的补给。',
    pos:new THREE.Vector3(0, y+6, 62)});
  addPOI({id:'rail', name:'环线铁路「转运」', en:'ORBITAL TRAM LINE', hit:{x:40,y:y,z:47,r:8,h:8},
    desc:'绕基地一圈的高架环线，矿卡列车（车头 + 四节矿石车）昼夜不停地跑。点击列车本体可以让相机跟着它跑一整圈。',
    pos:new THREE.Vector3(40, y+5, 47)});
}
function buildRoadlights(){
  var pts=[];
  for(var i=0;i<ROADS.length;i++){
    var r=ROADS[i], dx=r[2]-r[0], dz=r[3]-r[1], len=Math.hypot(dx,dz);
    var nx=-dz/len, nz=dx/len;
    for(var s=4;s<len-2;s+=6){
      pts.push([r[0]+dx*(s/len)+nx*(r[4]/2+0.9), r[1]+dz*(s/len)+nz*(r[4]/2+0.9)]);
    }
  }
  var inst=new THREE.InstancedMesh(cylG(.13,.18,.28,8), M.gCyan, pts.length);
  var dum=new THREE.Object3D();
  for(var k=0;k<pts.length;k++){
    dum.position.set(pts[k][0], terrainH(pts[k][0],pts[k][1])+.18, pts[k][1]);
    dum.updateMatrix();
    inst.setMatrixAt(k, dum.matrix);
  }
  scene.add(inst);
  /* 周界灯 */
  var peri=new THREE.InstancedMesh(boxG(.2,.5,.2), M.gAmber, 14);
  for(var i2=0;i2<14;i2++){
    var a=i2/14*TAU+0.22;
    var x=Math.cos(a)*55, z=Math.sin(a)*55;
    dum.position.set(x, terrainH(x,z)+.38, z);
    dum.updateMatrix();
    peri.setMatrixAt(i2, dum.matrix);
  }
  scene.add(peri);
}
/* ---------------- 8. 动态实体（光滑） ---------------- */
var RAIL_R=62, RAIL_Y=14;

/* 矿卡列车 */
var train=(function(){
  var g=new THREE.Group(); scene.add(g);
  var cars=[];
  function loco(){
    var c=new THREE.Group();
    mk(boxG(2.6,2.4,6.4), M.white, 0,1.9,0, c);
    mk(boxG(2.2,1,5.6), M.light, 0,3.4,0, c);
    mk(boxG(2.7,0.5,6.5), M.dark, 0,0.6,0, c);
    mk(boxG(2.65,0.8,4.6), M.orange, 0,1.5,0.2, c);
    mk(boxG(2.62,0.9,3.8), M.gCold, 0,2.6,-0.6, c);
    mk(cylG(1.2,1.3,0.8,12), M.light, 0,1.7,-3.5, c).rotation.x=Math.PI/2;
    mk(boxG(1.6,0.7,0.4), M.gWhite, 0,1.8,-3.3, c);
    mk(sphG(0.4,8,6), M.gRed, 0,4.1,1.6, c);
    g.add(c); cars.push(c); return c;
  }
  function oreCar(){
    var c=new THREE.Group();
    mk(boxG(2.6,1.6,5.4), M.dark, 0,1.1,0, c);
    mk(boxG(2.7,0.5,5.5), M.mid, 0,0.5,0, c);
    mk(boxG(2.3,0.9,5), M.rock1, 0,2.1,0, c);
    mk(sphG(1.4,12,8), M.rock2, -0.4,2.5,-0.8, c).scale.set(1,0.55,1.4);
    mk(sphG(1.2,12,8), M.rock1, 0.5,2.4,1.2, c).scale.set(1,0.5,1.2);
    g.add(c); cars.push(c); return c;
  }
  loco(); for(var i=0;i<4;i++) oreCar();
  return {group:g, cars:cars, ang:0, speed:0.04};
})();

/* 星舰 HLS */
var rocket=(function(){
  var g=new THREE.Group();
  mk(cylG(1.6,1.6,15,20), M.white, 0,7.5,0, g);
  mk(cylG(1.62,1.62,0.9,20), M.light, 0,6,0, g);
  mk(cylG(1.62,1.62,0.9,20), M.light, 0,12,0, g);
  mk(cylG(0.4,1.6,3.4,20), M.white, 0,16.7,0, g);
  mk(cylG(1.61,1.61,0.8,20), M.gCold, 0,14,0, g);
  var finG=boxG(0.5,3.6,1.4);
  var fins=[[1.9,0],[-1.9,0],[0,1.9],[0,-1.9]];
  for(var i=0;i<4;i++){
    var f=mk(finG, M.dark, fins[i][0],1.8,fins[i][1], g);
    if(fins[i][1]!==0) f.rotation.y=Math.PI/2;
  }
  mk(cylG(1.7,1.3,1,16), M.dark, 0,-0.5,0, g);
  var eng=mk(cylG(0.9,1.5,2.2,14), M.gRad, 0,-2,0, g);
  eng.visible=false;
  g.position.set(36, BASE_Y+3, -36);
  scene.add(g);
  return {group:g, engine:eng, state:'idle', t:0};
})();

/* LRV 月面越野车 */
function makeLRV(){
  var c=new THREE.Group();
  mk(boxG(3.4,0.5,2.2), M.light, 0,1.1,0, c);
  mk(boxG(1.2,0.9,0.9), M.dark, -0.8,1.7,0.6, c);
  mk(boxG(1.2,0.9,0.9), M.dark, 0.8,1.7,0.6, c);
  var wheelG=cylG(0.75,0.75,0.5,14);
  var wp=[[-1.7,-1],[1.7,-1],[-1.7,1],[1.7,1]];
  for(var i=0;i<4;i++){
    var w=mk(wheelG, M.dark, wp[i][0],0.75,wp[i][1], c);
    w.rotation.z=Math.PI/2;
    mk(cylG(0.3,0.3,0.56,8), M.metal, wp[i][0],0.75,wp[i][1], c).rotation.z=Math.PI/2;
  }
  mk(boxG(3.6,0.35,0.5), M.orange, 0,1.5,-1.1, c);
  mk(boxG(3.6,0.35,0.5), M.orange, 0,1.5,1.1, c);
  mk(cylG(0.12,0.12,2.2,6), M.metal, 0,2.6,-0.8, c);
  mk(boxG(1.4,0.6,0.5), M.mid, 0,3.8,-0.8, c);
  mk(boxG(0.4,0.4,0.2), M.gCold, -0.4,3.8,-1.1, c);
  mk(boxG(0.4,0.4,0.2), M.gCold, 0.4,3.8,-1.1, c);
  mk(boxG(1,0.2,0.8), M.white, 0,1.6,1.3, c);
  mk(boxG(0.9,0.1,0.7), M.solarF, 1.1,2.2,1.3, c).rotation.x=-0.4;
  mk(boxG(0.5,0.4,0.2), M.gWhite, -1.2,1.6,-1.15, c);
  mk(boxG(0.5,0.4,0.2), M.gWhite, 1.2,1.6,-1.15, c);
  scene.add(c);
  return c;
}
var rovers=[{m:makeLRV(), u:0},{m:makeLRV(), u:0.5}];
var ROVER_ROUTE=[[16,8],[26,10],[40,-8],[36,-24],[20,-6],[8,4],[2,14],[-6,28],[-8,30],[2,16],[16,8]];
var ROUTE_LEN=[];
(function(){ var L=0; for(var i=0;i<ROVER_ROUTE.length-1;i++){ var a=ROVER_ROUTE[i],b=ROVER_ROUTE[i+1]; L+=Math.hypot(b[0]-a[0],b[1]-a[1]); ROUTE_LEN.push(L);} })();
var ROUTE_TOTAL=ROUTE_LEN[ROUTE_LEN.length-1];
function routePos(u){
  var d=u*ROUTE_TOTAL, i=0;
  while(i<ROUTE_LEN.length-1 && d>ROUTE_LEN[i]) i++;
  var l0=i?ROUTE_LEN[i-1]:0;
  var t=(d-l0)/(ROUTE_LEN[i]-l0);
  var a=ROVER_ROUTE[i], b=ROVER_ROUTE[i+1];
  return {x:lerp(a[0],b[0],t), z:lerp(a[1],b[1],t), yaw:Math.atan2(b[0]-a[0], b[1]-a[1])};
}

/* 跳跃器 */
var hopper=(function(){
  var g=new THREE.Group();
  mk(boxG(2.6,1.6,2.6), M.white, 0,1.6,0, g);
  mk(sphG(1.1,16,12), M.glass, 0,2.9,0, g);
  var lp=[[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]];
  for(var i=0;i<4;i++){
    mk(cylG(0.14,0.14,1.8,6), M.metal, lp[i][0],0.7,lp[i][1], g).rotation.z=lp[i][0]>0?0.4:-0.4;
    mk(cylG(0.5,0.6,0.3,8), M.dark, lp[i][0]*1.2,0.15,lp[i][1], g);
  }
  mk(boxG(1.8,0.5,1.8), M.dark, 0,0.6,0, g);
  mk(boxG(0.6,0.5,0.2), M.gCold, 0,1.7,-1.35, g);
  mk(sphG(0.35,8,6), M.gRed, 0,3.9,0, g);
  var eng=mk(cylG(0.6,1,1.4,10), M.gRad, 0,-0.4,0, g);
  eng.visible=false;
  g.position.set(54, BASE_Y+2, 0);
  scene.add(g);
  return {group:g, engine:eng, state:'idle', t:0, from:[54,0], to:[14,50], at:'A'};
})();

/* 无人机 */
var drone=(function(){
  var g=new THREE.Group();
  mk(boxG(0.8,0.4,0.8), M.dark, 0,0,0, g);
  mk(boxG(2.6,0.12,0.2), M.metal, 0,0.2,0, g);
  mk(boxG(0.2,0.12,2.6), M.metal, 0,0.2,0, g);
  mk(sphG(0.22,8,6), M.gRed, -1.3,0.35,0, g);
  mk(sphG(0.22,8,6), M.gGreen, 1.3,0.35,0, g);
  mk(sphG(0.22,8,6), M.gGreen, 0,0.35,-1.3, g);
  mk(sphG(0.22,8,6), M.gRed, 0,0.35,1.3, g);
  mk(boxG(0.5,0.3,0.3), M.gCold, 0,-0.2,-0.45, g);
  g.position.set(0, BASE_Y+22, -24);
  scene.add(g);
  return {group:g, ang:0};
})();

/* 宇航员（阿波罗式，关节可动） */
function makeAstronaut(){
  var g=new THREE.Group();
  var body=new THREE.Group();
  mk(cylG(0.85,1,1.9,14), M.white, 0,3.1,0, body);
  mk(sphG(1.02,18,14), M.white, 0,4.9,0, body);
  var visor=mk(sphG(0.86,18,14), M.gold, 0,4.9,-0.3, body);
  visor.scale.set(0.82,0.72,0.72);
  mk(boxG(1.3,1.7,0.8), M.light, 0,3.3,0.95, body);
  mk(boxG(0.5,0.4,0.2), M.gCold, 0,3.6,-1.05, body);
  mk(boxG(0.3,0.2,0.1), M.gRed, 0.5,5.9,0, body);
  g.add(body);
  function limb(len,r){
    var piv=new THREE.Group();
    var m=mk(cylG(r,r*1.1,len,10), M.white, 0,-len/2,0, piv);
    return piv;
  }
  var armL=limb(1.7,0.34), armR=limb(1.7,0.34), legL=limb(2,0.42), legR=limb(2,0.42);
  armL.position.set(-1.15,4,0); armR.position.set(1.15,4,0);
  legL.position.set(-0.5,2.1,0); legR.position.set(0.5,2.1,0);
  g.add(armL); g.add(armR); g.add(legL); g.add(legR);
  scene.add(g);
  return {group:g, armL:armL, armR:armR, legL:legL, legR:legR, wave:0};
}
var astros=[
  {o:makeColonyRobot(), kind:'wave', home:[-12,-1]},
  {o:makeColonyRobot(), kind:'walk', home:[0,0], u:0},
  {o:makeColonyRobot(), kind:'walk2', home:[0,0], u:0.45},
  {o:makeColonyRobot(), kind:'work', home:[36,-3]}
];
var WALK_ROUTE=[[-10,-4],[-10,12.5],[9,12.5],[9,3],[9,-4],[-10,-4]];
var WALK2_ROUTE=[[-9,-11],[-1,-11],[8,-10],[8,-5],[-9,-11]];

/* 门式起重机 */
var crane=(function(){
  var g=new THREE.Group(); scene.add(g);
  var y=terrainH(24,38), beamY=y+13.5;
  var legs=[[-8.5,-7.5],[8.5,-7.5],[-8.5,7.5],[8.5,7.5]];
  for(var i=0;i<4;i++)
    mk(boxG(1,13.5,1), M.orange, 24+legs[i][0], y+6.75, 38+legs[i][1], g);
  mk(boxG(18.4,1.2,1.4), M.orange, 24, beamY, 38-7.5, g);
  mk(boxG(18.4,1.2,1.4), M.orange, 24, beamY, 38+7.5, g);
  mk(boxG(0.8,0.5,0.8), M.gRed, 24-8.5, beamY+0.9, 38-7.5, g);
  mk(boxG(0.8,0.5,0.8), M.gRed, 24+8.5, beamY+0.9, 38+7.5, g);
  var trolley=new THREE.Group();
  trolley.position.x=24;
  mk(boxG(2.2,1,2), M.dark, 0,0,0, trolley);
  mk(boxG(0.6,0.4,0.6), M.gAmber, 0,-0.7,0, trolley);
  g.add(trolley);
  var cable=mk(cylG(0.08,0.08,1,6), M.dark, 0,0,0, g);
  var hook=mk(boxG(0.7,0.7,0.7), M.gold, 0,0,0, g);
  var load=mk(boxG(4,2,2), M.containers[1], 0,0,0, g);
  return {group:g, trolley:trolley, cable:cable, hook:hook, load:load, beamY:beamY, baseY:y};
})();

/* 采矿机器人「掘进」 */
var miner=(function(){
  var g=new THREE.Group(); scene.add(g);
  mk(boxG(3.6,1.4,2.6), M.dark, 0,1,0, g);
  mk(boxG(4,0.8,3), M.rock2, 0,0.4,0, g);
  mk(boxG(2,1.4,1.8), M.orange, -0.2,2.2,0.2, g);
  mk(sphG(0.4,8,6), M.gAmber, 0.6,3.1,0.2, g);
  var arm=new THREE.Group();
  mk(boxG(0.7,0.7,4.6), M.orange, 0,0,2.3, arm);
  mk(boxG(0.9,0.9,1.2), M.dark, 0,-0.3,4.8, arm);
  arm.position.set(0, 2.4, -1.2);
  g.add(arm);
  g.position.set(-56, 8, -40);
  g.rotation.y=0.8;
  return {group:g, arm:arm};
})();

/* 碟形天线（Lathe 抛物面，会转动） */
function makeDish(wx,wz,ry){
  var pts=[];
  for(var i=0;i<=8;i++){
    var r=i*0.62;
    pts.push(new THREE.Vector2(r, r*r*0.065));
  }
  var piv=new THREE.Group();
  var y=terrainH(wx,wz);
  var dish=new THREE.Group();
  var dm=noShadow(mk(new THREE.LatheGeometry(pts, 28), std({color:C(0xe9edf2), roughness:0.4, metalness:0.3, side:THREE.DoubleSide}), 0,0,0, dish));
  dm.castShadow=true;
  mk(new THREE.TorusGeometry(4.96,.07,6,48),M.metal,0,1.6,0,dish).rotation.x=Math.PI/2;
  for(var spoke=0;spoke<3;spoke++){
    var spokeAngle=spoke/3*TAU;
    artBeam(new THREE.Vector3(Math.cos(spokeAngle)*4.2,1.2,Math.sin(spokeAngle)*4.2),new THREE.Vector3(0,3.5,0),.055,M.dark,dish);
  }
  mk(cylG(0.1,0.1,2.4,6), M.metal, 0,1.2,0, dish).rotation.x=0.5;
  mk(boxG(0.4,0.3,0.4), M.gCold, 0,2,0.6, dish);
  dish.rotation.x=-0.72;
  dish.position.y=2.2;
  piv.add(dish);
  piv.position.set(wx, y+2.6, wz);
  piv.rotation.y=ry;
  scene.add(piv);
  return piv;
}
var dish1, dish2;

/* ---------------- 9. 粒子 ---------------- */
var smokeTex=radialTex('rgba(255,255,255,0.85)','rgba(255,255,255,0)');
var puffPool=[];
(function(){
  for(var i=0;i<90;i++){
    var m=new THREE.SpriteMaterial({map:smokeTex, transparent:true, opacity:0, depthWrite:false});
    var sp=new THREE.Sprite(m);
    sp.visible=false; scene.add(sp);
    puffPool.push({sp:sp, life:0, ttl:1, vel:new THREE.Vector3(), grow:1, o0:0.6});
  }
})();
function puff(x,y,z, color, scale, ttl, vy, o0){
  for(var i=0;i<puffPool.length;i++){
    var p=puffPool[i];
    if(p.life<=0){
      p.life=ttl; p.ttl=ttl; p.o0=o0==null?0.55:o0;
      p.sp.visible=true;
      p.sp.position.set(x+rrange(-1,1), y+rrange(-0.5,0.5), z+rrange(-1,1));
      p.sp.material.color.set(color);
      p.sp.scale.set(scale,scale,1);
      p.vel.set(rrange(-1.4,1.4), vy||rrange(1,2.4), rrange(-1.4,1.4));
      p.grow=scale*rrange(0.8,1.4);
      return;
    }
  }
}
function updatePuffs(dt){
  for(var i=0;i<puffPool.length;i++){
    var p=puffPool[i];
    if(p.life>0){
      p.life-=dt;
      var t=1-p.life/p.ttl;
      p.sp.position.addScaledVector(p.vel, dt);
      var s=p.sp.scale.x + p.grow*dt;
      p.sp.scale.set(s,s,1);
      p.sp.material.opacity=p.o0*(1-t);
      if(p.life<=0) p.sp.visible=false;
    }
  }
}
var meteors=[];
(function(){
  var geo=new THREE.BoxGeometry(0.35,0.35,9);
  for(var i=0;i<26;i++){
    var m=new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:C(0xbfe8ff), transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, fog:false}));
    m.visible=false; scene.add(m);
    meteors.push({m:m, life:0, ttl:1, vel:new THREE.Vector3()});
  }
})();
var meteorTimer=2;
function spawnMeteor(){
  for(var i=0;i<meteors.length;i++){
    var mt=meteors[i];
    if(mt.life<=0){
      var a=rnd()*TAU;
      mt.m.position.set(Math.cos(a)*rrange(120,320), rrange(120,240), Math.sin(a)*rrange(120,320));
      mt.vel.set(rrange(-1,1), -rrange(0.4,0.8), rrange(-1,1)).normalize().multiplyScalar(rrange(110,180));
      mt.m.lookAt(mt.m.position.clone().add(mt.vel));
      mt.life=mt.ttl=rrange(0.8,1.6);
      mt.m.visible=true;
      return;
    }
  }
}
function updateMeteors(dt){
  for(var i=0;i<meteors.length;i++){
    var mt=meteors[i];
    if(mt.life>0){
      mt.life-=dt;
      mt.m.position.addScaledVector(mt.vel, dt);
      mt.m.material.opacity=clamp(mt.life/mt.ttl,0,1)*0.9;
      if(mt.life<=0) mt.m.visible=false;
    }
  }
}
function terrainTopWorld(wx,wz){
  var t=terrainH(wx,wz);
  return t===null?0:t;
}

/* ---------------- 10. 音频 ---------------- */
var AU={
  ctx:null, master:null, on:true, _humGain:null,
  init:function(){
    if(this.ctx) return;
    var AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    this.ctx=new AC();
    this.master=this.ctx.createGain(); this.master.gain.value=0.5;
    this.master.connect(this.ctx.destination);
    var o=this.ctx.createOscillator(), gn=this.ctx.createGain();
    o.type='sine'; o.frequency.value=46; gn.gain.value=0;
    o.connect(gn); gn.connect(this.master); o.start();
    this._humGain=gn;
    this._humGain.gain.value=this.on?0.014:0;
  },
  beep:function(f,d,type,g){
    if(!this.ctx||!this.on) return;
    var o=this.ctx.createOscillator(), gn=this.ctx.createGain();
    o.type=type||'square'; o.frequency.value=f||660;
    gn.gain.setValueAtTime(g||0.045, this.ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.0005, this.ctx.currentTime+(d||0.08));
    o.connect(gn); gn.connect(this.master);
    o.start(); o.stop(this.ctx.currentTime+(d||0.08)+0.02);
  },
  noise:function(dur,f,g){
    if(!this.ctx||!this.on) return;
    var n=Math.floor(this.ctx.sampleRate*dur);
    var buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
    var ch=buf.getChannelData(0);
    for(var i=0;i<n;i++) ch[i]=(Math.random()*2-1)*(1-i/n);
    var src=this.ctx.createBufferSource(); src.buffer=buf;
    var fl=this.ctx.createBiquadFilter(); fl.type='lowpass'; fl.frequency.value=f||600;
    var gn=this.ctx.createGain(); gn.gain.value=g||0.2;
    src.connect(fl); fl.connect(gn); gn.connect(this.master);
    src.start();
  },
  setOn:function(v){ this.on=v; if(this._humGain) this._humGain.gain.value=v?0.014:0; }
};

/* ---------------- 11. 相机 / 交互 ---------------- */
var camT=new THREE.Vector3(0,8,0), camYaw=0.48, camPitch=0.55, camDist=180;
var cinematicOrbit=false;
var camAnim=null, followObj=null, lastInput=0;
var PRESETS=[
  {y:0.48,p:0.55, d:180, t:[0,8,0]},
  {y:-0.78,p:0.28, d:62,  t:[36,10,-36]},
  {y:0.35, p:0.26, d:50,  t:[0,14,-30]},
  {y:0.45,p:0.55, d:64, t:[-27,11,11]},
  {y:0.1,  p:0.24, d:45,  t:[0,16,62]},
  {y:0.8,  p:0.3,  d:60,  t:[-48,8,-8]},
  {y:-2.2, p:0.3,  d:42,  t:[24,10,38]},
  {y:2.2,  p:0.14, d:13,  t:[-12,9,-1]},
  {y:0.7,  p:0.26, d:330, t:[0,10,0]},
  {y:-0.5, p:1.45, d:210, t:[0,0,0]}
];
function flyTo(yaw,pitch,dist,target,dur){
  camAnim={t:0, dur:dur||1.6,
    from:{yaw:camYaw,pitch:camPitch,dist:camDist,t:camT.clone()},
    to:{yaw:yaw,pitch:pitch,dist:dist,t:target.clone()}};
}
function applyCam(){
  var cp=clamp(camPitch,0.06,1.5);
  var cd=clamp(camDist,8,660);
  camera.position.set(
    camT.x + Math.sin(camYaw)*Math.cos(cp)*cd,
    camT.y + Math.sin(cp)*cd,
    camT.z + Math.cos(camYaw)*Math.cos(cp)*cd
  );
  camera.lookAt(camT);
}
function perfNow(){ return performance.now()/1000; }
var dragging=0, pmx=0, pmy=0, moved=0;
canvas.addEventListener('pointerdown', function(e){
  AU.init(); if(AU.ctx&&AU.ctx.state==='suspended') AU.ctx.resume();
  dragging = (e.button===2||e.button===1||e.shiftKey)?2:1;
  pmx=e.clientX; pmy=e.clientY; moved=0;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('drag');
  lastInput=perfNow();
});
canvas.addEventListener('pointermove', function(e){
  if(!dragging) return;
  var dx=e.clientX-pmx, dy=e.clientY-pmy; pmx=e.clientX; pmy=e.clientY;
  moved+=Math.abs(dx)+Math.abs(dy);
  if(dragging===1){ camYaw+=dx*0.0052; camPitch=clamp(camPitch+dy*0.004,0.06,1.5); }
  else {
    var s=camDist*0.0011;
    camT.x += -Math.cos(camYaw)*dx*s + Math.sin(camYaw)*dy*s;
    camT.z +=  Math.sin(camYaw)*dx*s + Math.cos(camYaw)*dy*s;
    camT.x=clamp(camT.x,-160,160); camT.z=clamp(camT.z,-160,160);
  }
  camAnim=null; followObj=null; lastInput=perfNow();
});
canvas.addEventListener('pointerup', function(e){
  canvas.classList.remove('drag');
  if(dragging===1 && moved<6) pick(e.clientX, e.clientY);
  dragging=0; lastInput=perfNow();
});
canvas.addEventListener('wheel', function(e){
  e.preventDefault();
  camDist=clamp(camDist*(1+Math.sign(e.deltaY)*0.09), 8, 660);
  camAnim=null; lastInput=perfNow();
}, {passive:false});
canvas.addEventListener('dblclick', function(){ resetView(); });
canvas.addEventListener('contextmenu', function(e){ e.preventDefault(); });
function resetView(){
  followObj=null;
  flyTo(PRESETS[0].y, PRESETS[0].p, PRESETS[0].d, new THREE.Vector3(0,8,0), 1.2);
  toast('视角已复位');
}
var ray=new THREE.Raycaster();
var hitMeshes=[];
function pick(cx,cy){
  var ndc=new THREE.Vector2((cx/window.innerWidth)*2-1, -(cy/window.innerHeight)*2+1);
  ray.setFromCamera(ndc, camera);
  var hits=ray.intersectObjects(hitMeshes, true);
  if(hits.length){
    var o=hits[0].object;
    while(o && !o.userData.poi && !o.userData.ent) o=o.parent;
    if(o && o.userData.poi){ activatePOI(o.userData.poi); return; }
    if(o && o.userData.ent){ activateEnt(o.userData.ent); return; }
  }
  var th=ray.intersectObject(terrainMesh, false);
  if(th.length){
    var pt=th[0].point;
    for(var i=0;i<6;i++) puff(pt.x, pt.y+1, pt.z, 0x9aa0aa, rrange(2,4), rrange(1,1.8), rrange(1.5,3), 0.4);
    AU.noise(0.25, 500, 0.08);
  }
}
var lightsOn=true, growOn=true, patrolOn=true;
function activatePOI(poi){
  showInspect(poi);
  var p=poi.pos;
  flyTo(camYaw, 0.3, clamp(camDist*0.5,26,85), new THREE.Vector3(p.x, Math.max(p.y-4,7), p.z), 1.4);
  switch(poi.id){
    case 'pad': doLaunch(); break;
    case 'tower': toggleLights(); break;
    case 'garage': togglePatrol(); break;
    case 'gh': toggleGrow(); break;
    case 'padA': case 'padB': callHopper(); break;
    case 'cargo-port': if(ecology.cargo&&!ecology.cargo.active){ecology.cargo.active=true;ecology.cargo.time=0;toast('短程货船出港 · 完成巡回后自动返航');} break;
  }
}
var ents={};
function activateEnt(ent){
  if(ent.kind==='astro'){
    ent.o.wave=3.2;
    flyTo(camYaw, 0.18, 13, ent.o.group.position.clone().add(new THREE.Vector3(0,3,0)), 1.2);
    AU.beep(880,0.1,'square',0.05);
    showInspect({name:'伙伴型机器人', en:'COMPANION / R-07', desc:'陶瓷装甲下的电驱关节负责行走与精细维修。双目深度相机观察周围，胸前的蓝色指示灯代表任务正常。它正在向你挥手。',
      stat:function(){ return '状态：交互中 · 电池 98% · 自主协作在线'; }});
    return;
  }
  followObj=ent.obj;
  showInspect(ent.poiLike);
  AU.beep(660,0.08,'square',0.04);
}

/* ---------------- 12. 行为 ---------------- */
function doLaunch(){
  if(rocket.state!=='idle'){ toast('「星舰」不在发射台上'); return; }
  rocket.state='count'; rocket.t=2.2;
  toast('点火程序启动 · <b>3…2…1…</b>');
  AU.beep(520,0.3,'square',0.06);
}
function callHopper(){
  if(hopper.state!=='idle'){ toast('跳跃器正在转场中'); return; }
  hopper.from = hopper.at==='A'? [54,0] : [14,50];
  hopper.to   = hopper.at==='A'? [14,50] : [54,0];
  hopper.state='hop'; hopper.t=0;
  toast('跳跃器转场 · 目标 <b>鹰-'+(hopper.at==='A'?'B':'A')+'</b>');
  AU.noise(0.6, 400, 0.15);
}
function togglePatrol(){
  patrolOn=!patrolOn;
  document.getElementById('bPatrol').classList.toggle('on', patrolOn);
  toast(patrolOn?'巡视车 <b>出发巡逻</b>':'巡视车 <b>返回车库</b>');
  AU.beep(patrolOn?760:420, 0.09,'square',0.05);
}
function toggleLights(){ setLights(!lightsOn); }
function setLights(v){
  lightsOn=v;
  document.getElementById('bLights').classList.toggle('on', v);
  toast(v?'基地灯光 <b>开启</b>':'基地灯光 <b>关闭</b>');
  AU.beep(v?900:340,0.07,'square',0.04);
}
function toggleGrow(){
  growOn=!growOn;
  growBar1.visible=growOn; growBar2.visible=growOn;
  toast(growOn?'温室生长灯 <b>开启</b> · 生菜长势喜人':'温室生长灯 <b>关闭</b>');
  AU.beep(growOn?980:300,0.09,'square',0.05);
}
var showerUntil=-1, stormOn=false;
function meteorShower(){
  showerUntil=simT+14;
  toast('流星雨来临 · 注意许愿');
  AU.noise(1.2, 1200, 0.05);
}
function toggleStorm(){
  stormOn=!stormOn;
  document.getElementById('bStorm').classList.toggle('on', stormOn);
  toast(stormOn?'静电尘暴 <b>扬起了</b>':'尘暴落定');
  AU.noise(2, 300, 0.12);
}

/* ---------------- 13. UI ---------------- */
var toastTimer=null;
function toast(html){
  var el=document.getElementById('toast');
  el.innerHTML=html; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ el.classList.remove('show'); }, 2600);
}
var curInspect=null;
function showInspect(p){
  curInspect=p;
  document.getElementById('insName').textContent=p.name;
  document.getElementById('insEn').textContent=p.en||'';
  document.getElementById('insDesc').textContent=p.desc;
  document.getElementById('insStat').textContent=p.stat?p.stat():'';
  document.getElementById('inspect').classList.add('show');
}
document.getElementById('inspectX').onclick=function(){
  document.getElementById('inspect').classList.remove('show');
  curInspect=null; followObj=null;
};
var labelEls=[];
function makeLabels(){
  var boxEl=document.getElementById('labels');
  for(var i=0;i<POIS.length;i++){
    var el=document.createElement('div');
    el.className='lbl';
    el.innerHTML=POIS[i].name.replace(/「.*」/,'')+'<i>'+(POIS[i].en||'')+'</i>';
    boxEl.appendChild(el);
    labelEls.push(el);
  }
}
var labelsOn=false;
function updateLabels(){
  var w=window.innerWidth, h=window.innerHeight;
  var v=new THREE.Vector3();
  for(var i=0;i<POIS.length;i++){
    var el=labelEls[i];
    if(!labelsOn || camDist>240){ el.style.display='none'; continue; }
    v.copy(POIS[i].pos).project(camera);
    if(v.z>1 || v.x<-1.05 || v.x>1.05 || v.y<-1.05 || v.y>1.05){ el.style.display='none'; continue; }
    el.style.display='block';
    el.style.left=((v.x*0.5+0.5)*w)+'px';
    el.style.top=((-v.y*0.5+0.5)*h-8)+'px';
    el.style.opacity = camDist>240? 0.55:1;
  }
}
function bind(id, fn){ document.getElementById(id).addEventListener('click', function(){ AU.init(); fn(); }); }
var paused=false, speed=1, cycleOn=true;
bind('bPause', function(){ setPaused(!paused); });
function setPaused(v){
  paused=v;
  document.getElementById('bPause').textContent=v?'继续':'暂停';
  toast(v?'已暂停':'继续运转');
}
bind('bSpeed', function(){
  speed = speed>=4?1:speed*2;
  document.getElementById('bSpeed').textContent=speed+'×';
  AU.beep(700,0.06,'square',0.04);
});
bind('bCycle', function(){
  cycleOn=!cycleOn;
  document.getElementById('bCycle').classList.toggle('on', cycleOn);
});
bind('bLaunch', doLaunch);
bind('bHopper', callHopper);
bind('bPatrol', togglePatrol);
bind('bMeteor', meteorShower);
bind('bStorm', toggleStorm);
bind('bLights', toggleLights);
bind('bLabels', function(){
  labelsOn=!labelsOn;
  document.getElementById('bLabels').classList.toggle('on', labelsOn);
  document.getElementById('bLabels').setAttribute('aria-pressed',String(labelsOn));
});
bind('bShadows', function(){
  renderer.shadowMap.enabled=!renderer.shadowMap.enabled;
  document.getElementById('bShadows').classList.toggle('on', renderer.shadowMap.enabled);
  scene.traverse(function(o){ if(o.material) o.material.needsUpdate=true; });
});
bind('bSound', function(){
  AU.setOn(!AU.on);
  document.getElementById('bSound').classList.toggle('on', AU.on);
});
bind('bReset', resetView);
bind('bHelp', function(){ document.getElementById('help').classList.add('show'); });
document.getElementById('helpClose').onclick=function(){ document.getElementById('help').classList.remove('show'); };
document.getElementById('help').addEventListener('click', function(e){ if(e.target.id==='help') this.classList.remove('show'); });
document.getElementById('time').addEventListener('input', function(){
  dayT=this.value/1000;
  if(cycleOn){ cycleOn=false; document.getElementById('bCycle').classList.remove('on'); }
});
addEventListener('keydown', function(e){
  if(e.target && e.target.tagName==='INPUT') return;
  AU.init();
  var k=e.key;
  if(k===' '){ e.preventDefault(); setPaused(!paused); }
  else if(k>='1'&&k<='9') goPreset(+k);
  else if(k==='0') goPreset(10);
  else if(k==='s'||k==='S') document.getElementById('bSpeed').click();
  else if(k==='t'||k==='T') document.getElementById('bCycle').click();
  else if(k==='g'||k==='G') doLaunch();
  else if(k==='j'||k==='J') callHopper();
  else if(k==='p'||k==='P') togglePatrol();
  else if(k==='m'||k==='M') meteorShower();
  else if(k==='l'||k==='L') toggleLights();
  else if(k==='b'||k==='B') document.getElementById('bLabels').click();
  else if(k==='r'||k==='R') resetView();
  else if(k==='h'||k==='H'||k==='?') document.getElementById('help').classList.toggle('show');
});
function goPreset(n){
  var P=PRESETS[(n-1+10)%10];
  followObj=null;
  flyTo(P.y, P.p, P.d, new THREE.Vector3(P.t[0],P.t[1],P.t[2]), 1.5);
}

/* ---------------- 14. 时间与光照 ---------------- */
var dayT=0.2535, simT=0, dayCount=1, lastDayT=0.2535, DAY_LEN=1600;
var sunDirV=new THREE.Vector3(0,1,0);
function updateTime(sdt, rdt){
  if(cycleOn && sdt>0) dayT=(dayT + sdt/DAY_LEN)%1;
  if(dayT<lastDayT) dayCount++;
  lastDayT=dayT;
  var a=(dayT-0.25)*TAU;
  var se=Math.sin(a);
  sunDirV.set(Math.cos(a)*0.94, se, Math.cos(a)*0.34+0.2).normalize();
  var dayF=sstep(-0.04,0.1,se);
  sun.position.copy(sunDirV).multiplyScalar(240);
  sun.target.position.set(0,0,0);
  var stormDim = stormOn? 0.6:1;
  sun.intensity=1.65*dayF*stormDim;
  sun.color.copy(C(0xfff3e2)).lerp(C(0xffbf83), 1-dayF);
  hemi.intensity=lerp(0.22,0.28,dayF);
  amb.intensity=lerp(0.05,0.08,dayF);
  skyUni2.sunDir.value.copy(sunDirV);
  skyUni2.sunVis.value=dayF;
  if(earthL) earthL.intensity=0.5*(1-dayF)+0.16;
  var nl=sstep(0.12,-0.03,se)*(lightsOn?1:0);
  plTower.intensity=nl*(1.05+0.2*Math.sin(simT*2.2));
  plPlaza.intensity=nl*(0.9+0.12*Math.sin(simT*1.4+1.2));
  plPad.intensity=nl*(1+0.15*Math.sin(simT*1.8+2.6));
  plGrow.intensity=(growOn?1.2:0)*Math.max(nl, growOn?0.55:0);
  if(earthMesh) earthMesh.rotation.y+=rdt*0.004;
  if(orbiter){
    orbiter.position.x=-350+Math.sin(simT*0.008)*45;
    orbiter.position.y=-70+Math.cos(simT*0.008)*9;
    orbiter.rotation.y=0.15+Math.sin(simT*0.025)*0.08;
  }
  var hh=Math.floor(dayT*24), mm=Math.floor((dayT*24-hh)*60);
  var phase=(dayT>0.02&&dayT<0.52)?'月昼':'月夜';
  var txt=phase+' '+dayCount+' · '+(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
  var el=document.getElementById('clock');
  if(el.textContent!==txt) el.textContent=txt;
  if(cycleOn) document.getElementById('time').value=Math.round(dayT*1000);
  return {dayF:dayF};
}

/* ---------------- 15. 实体更新 ---------------- */
var trainState={mode:'run', t:0, served:false};
function updateTrain(dt){
  var stationA=Math.PI/2;
  var dAng=Math.abs(((train.ang-stationA)%TAU+TAU)%TAU);
  if(dAng>Math.PI) dAng=TAU-dAng;
  var sp=train.speed;
  if(dAng>0.18) trainState.served=false;
  if(trainState.mode==='run' && !trainState.served && dAng<0.05){ trainState.mode='stop'; trainState.t=4; trainState.served=true; AU.beep(440,0.15,'square',0.04); }
  if(trainState.mode==='stop'){
    trainState.t-=dt;
    sp=0;
    if(trainState.t<=0) trainState.mode='run';
  } else if(dAng<0.35){
    sp=train.speed*(0.35+0.65*dAng/0.35);
  }
  train.ang=(train.ang + dt*sp)%TAU;
  for(var i=0;i<train.cars.length;i++){
    var a=train.ang - i*0.112;
    var c=train.cars[i];
    c.position.set(Math.cos(a)*RAIL_R, RAIL_Y+0.2, Math.sin(a)*RAIL_R);
    c.rotation.y=Math.PI-a;
  }
}
function updateRovers(dt){
  for(var i=0;i<rovers.length;i++){
    var r=rovers[i];
    if(patrolOn){
      r.u=(r.u + dt*0.007)%1;
      var p=routePos(r.u);
      r.m.position.set(p.x, terrainTopWorld(p.x,p.z)+Math.sin(simT*6+i)*0.05, p.z);
      r.m.rotation.y=p.yaw;
      if(Math.random()<dt*3) puff(p.x-Math.sin(p.yaw)*2, terrainTopWorld(p.x,p.z)+0.5, p.z-Math.cos(p.yaw)*2, 0x9aa0aa, rrange(0.8,1.6), rrange(0.6,1.2), rrange(0.5,1.2), 0.3);
    } else {
      var pk=i? [30,21]:[22,15];
      r.m.position.lerp(new THREE.Vector3(pk[0], terrainTopWorld(pk[0],pk[1]), pk[1]), dt*1.2);
      r.m.rotation.y=lerp(r.m.rotation.y, Math.PI, dt*2);
    }
  }
}
function updateHopper(dt){
  hopper.engine.visible = hopper.state==='hop';
  if(hopper.state==='hop'){
    hopper.t+=dt/6.5;
    var t=clamp(hopper.t,0,1);
    var fx=hopper.from[0], fz=hopper.from[1], tx=hopper.to[0], tz=hopper.to[1];
    var x=lerp(fx,tx,t), z=lerp(fz,tz,t);
    var y=BASE_Y+2 + Math.sin(t*Math.PI)*28;
    hopper.group.position.set(x,y,z);
    hopper.group.rotation.y+=dt*1.5;
    plFlame.position.set(x,y-1,z);
    plFlame.intensity=1.4*Math.sin(t*Math.PI);
    if(Math.random()<dt*22) puff(x,y-1.5,z, 0xd8c8a0, rrange(1.5,2.6), 0.7, -1, 0.5);
    if(hopper.t>=1){
      hopper.state='idle';
      hopper.at=hopper.at==='A'?'B':'A';
      plFlame.intensity=0;
      for(var i=0;i<10;i++) puff(x,BASE_Y+2,z, 0x9aa0aa, rrange(2.5,4.5), rrange(1,2), rrange(1,2.6), 0.5);
      AU.noise(0.5, 350, 0.16);
      toast('跳跃器已抵达 <b>鹰-'+hopper.at+'</b>');
    }
  }
}
function updateRocket(dt){
  var g=rocket.group;
  rocket.engine.visible = (rocket.state==='up'||rocket.state==='down'||rocket.state==='count');
  if(rocket.state==='count'){
    rocket.t-=dt;
    g.position.x=36+rrange(-0.06,0.06);
    if(Math.random()<dt*8) puff(36+rrange(-2,2), BASE_Y+2, -36+rrange(-2,2), 0xd8d8d8, rrange(1.6,2.6), 1.1, rrange(0.5,1.4), 0.4);
    if(rocket.t<=0){
      rocket.state='up'; rocket.t=0;
      AU.noise(2.6, 240, 0.3);
      toast('「星舰」<b>点火升空</b>');
    }
  } else if(rocket.state==='up'){
    rocket.t+=dt;
    var vy=2+rocket.t*7;
    g.position.y+=vy*dt;
    g.position.x=lerp(g.position.x,36,dt*2);
    plFlame.position.copy(g.position); plFlame.position.y-=2;
    plFlame.intensity=2.2;
    for(var i=0;i<3;i++)
      puff(g.position.x+rrange(-0.8,0.8), g.position.y-2.4, g.position.z+rrange(-0.8,0.8),
           Math.random()<0.4?0xffb060:0xcccccc, rrange(1.8,3.2), rrange(0.5,1.1), rrange(-6,-3), 0.6);
    if(g.position.y<BASE_Y+20 && Math.random()<dt*30)
      puff(36+rrange(-3,3), BASE_Y+2, -36+rrange(-3,3), 0x9aa0aa, rrange(2.5,4.5), rrange(1,2), rrange(2,4), 0.5);
    if(g.position.y>170){
      rocket.state='away'; rocket.t=22;
      g.visible=false; plFlame.intensity=0;
      toast('「星舰」入轨 · 稍后自动返回着陆');
    }
  } else if(rocket.state==='away'){
    rocket.t-=dt;
    if(rocket.t<=0){
      rocket.state='down';
      g.visible=true;
      g.position.set(36, 165, -36);
      AU.noise(1.6, 300, 0.2);
      toast('「星舰」再入 · 着陆点火');
    }
  } else if(rocket.state==='down'){
    var dtv=clamp((g.position.y-(BASE_Y+3))*0.16, 2.2, 16);
    g.position.y-=dtv*dt;
    plFlame.position.copy(g.position); plFlame.position.y-=2;
    plFlame.intensity=1.8;
    if(Math.random()<dt*26)
      puff(g.position.x+rrange(-0.8,0.8), g.position.y-2.2, g.position.z+rrange(-0.8,0.8),
           Math.random()<0.5?0xffb060:0xbbbbbb, rrange(1.6,2.8), rrange(0.5,1), rrange(-5,-2), 0.55);
    if(g.position.y<BASE_Y+11 && Math.random()<dt*40)
      puff(36+rrange(-4,4), BASE_Y+2, -36+rrange(-4,4), 0x9aa0aa, rrange(2.5,5), rrange(1,2.2), rrange(2,4), 0.5);
    if(g.position.y<=BASE_Y+3.01){
      g.position.y=BASE_Y+3;
      rocket.state='idle'; plFlame.intensity=0;
      for(var i=0;i<12;i++) puff(36+rrange(-4,4), BASE_Y+2, -36+rrange(-4,4), 0x9aa0aa, rrange(3,5.5), rrange(1.2,2.2), rrange(2,4.5), 0.55);
      AU.noise(0.7, 300, 0.2);
      toast('「星舰」<b>着陆成功</b> · 待命再次发射');
    }
  }
}
function updateDrone(dt){
  drone.ang+=dt*0.5;
  drone.group.position.set(Math.cos(drone.ang)*9, BASE_Y+22+Math.sin(simT*1.3)*0.8, -30+Math.sin(drone.ang)*9);
  drone.group.rotation.y=-drone.ang+Math.PI/2;
}
function updateAstros(dt){
  var a0=astros[0];
  a0.o.group.position.set(a0.home[0], terrainTopWorld(a0.home[0],a0.home[1]), a0.home[1]);
  a0.o.group.rotation.y=Math.sin(simT*0.4)*0.6+2.4;
  if(a0.o.wave>0) a0.o.wave-=dt;
  var w=a0.o.wave>0? 1 : (Math.sin(simT*0.5)>0.55?0.6:0);
  a0.o.armR.rotation.z = -Math.PI*0.8*w + Math.sin(simT*7)*0.5*w;
  a0.o.armL.rotation.z = 0.12;
  for(var k=1;k<=2;k++){
    var A=astros[k], wp=k===1?WALK_ROUTE:WALK2_ROUTE, sp=k===1?0.02:0.03;
    A.u=(A.u+dt*sp)%1;
    var fi=A.u*(wp.length-1), i0=Math.floor(fi), ft=fi-i0;
    var x=lerp(wp[i0][0], wp[i0+1][0], ft), z=lerp(wp[i0][1], wp[i0+1][1], ft);
    A.o.group.position.set(x, BASE_Y+Math.abs(Math.sin(simT*5+k))*.045, z);
    var heading=Math.atan2(wp[i0][0]-wp[i0+1][0],wp[i0][1]-wp[i0+1][1]);
    A.o.group.rotation.y+=Math.atan2(Math.sin(heading-A.o.group.rotation.y),Math.cos(heading-A.o.group.rotation.y))*Math.min(1,dt*7);
    A.o.legL.rotation.x=Math.sin(simT*5+k)*0.7;
    A.o.legR.rotation.x=-Math.sin(simT*5+k)*0.7;
    A.o.armL.rotation.x=-Math.sin(simT*5+k)*0.5;
    A.o.armR.rotation.x=Math.sin(simT*5+k)*0.5;
  }
  var a3=astros[3];
  a3.o.group.position.set(a3.home[0], terrainTopWorld(a3.home[0],a3.home[1]), a3.home[1]);
  a3.o.group.rotation.y=-0.6;
  a3.o.armL.rotation.x=-0.7+Math.sin(simT*2.2)*0.35;
  a3.o.armR.rotation.x=-0.7-Math.sin(simT*2.2)*0.35;
}
var craneState={phase:'move', t:0, hookY:11, targetX:-6, hasLoad:false};
function updateCrane(dt){
  var cs=craneState, beamY=crane.beamY;
  if(cs.phase==='move'){
    crane.trolley.position.x = lerp(crane.trolley.position.x, 24+cs.targetX, dt*1.4);
    if(Math.abs(crane.trolley.position.x-24-cs.targetX)<0.3){ cs.phase='down'; }
  } else if(cs.phase==='down'){
    cs.hookY-=dt*6;
    if(cs.hookY<=3){ cs.hookY=3; cs.hasLoad=!cs.hasLoad; crane.load.visible=cs.hasLoad; cs.phase='up'; AU.beep(520,0.07,'square',0.04); }
  } else if(cs.phase==='up'){
    cs.hookY+=dt*5;
    if(cs.hookY>=11){ cs.hookY=11; cs.targetX=rrange(-7,7); cs.phase='move'; }
  }
  crane.trolley.position.y=beamY;
  crane.trolley.position.z=38;
  crane.cable.position.set(crane.trolley.position.x, beamY-cs.hookY/2-0.5, 38);
  crane.cable.scale.y=cs.hookY;
  crane.hook.position.set(crane.trolley.position.x, beamY-cs.hookY-0.8, 38);
  crane.load.position.set(crane.trolley.position.x, beamY-cs.hookY-2.6, 38);
}
function updateMiner(dt){
  miner.group.position.y=terrainTopWorld(-56,-40);
  miner.arm.rotation.x=-0.35+Math.sin(simT*1.6)*0.55;
  if(Math.sin(simT*1.6)>0.9 && Math.random()<dt*10){
    var wp=new THREE.Vector3(0,0,5.5);
    miner.arm.localToWorld(wp);
    puff(wp.x, wp.y-1, wp.z, 0x9aa0aa, rrange(1,2), rrange(0.7,1.3), rrange(1,2), 0.4);
  }
}
var ventTimer=5;
function updatePlant(dt){
  ventTimer-=dt;
  if(ventTimer<=0){
    ventTimer=rrange(6,10);
    for(var i=0;i<4;i++) puff(37+rrange(-1,1), BASE_Y+15.5, -11+rrange(-1,1), 0xc8ccd4, rrange(1.4,2.4), rrange(1.2,2), rrange(1.5,3), 0.4);
  }
}
function updateDishes(dt){
  if(dish1) dish1.rotation.y+=dt*0.07;
  if(dish2) dish2.rotation.y-=dt*0.05;
}

/* ---------------- 16. 主循环 ---------------- */
var clock=new THREE.Clock();
var fpsA=60, frame=0;
function animate(){
  requestAnimationFrame(animate);
  var elapsed=clock.getDelta();
  var dt=Math.min(elapsed, 0.1);
  var sdt=paused?0:dt*speed;
  simT+=sdt;
  if(camAnim){
    camAnim.t+=dt/camAnim.dur;
    var k=easeIO(clamp(camAnim.t,0,1));
    camYaw=lerp(camAnim.from.yaw, camAnim.to.yaw, k);
    camPitch=lerp(camAnim.from.pitch, camAnim.to.pitch, k);
    camDist=lerp(camAnim.from.dist, camAnim.to.dist, k);
    camT.lerpVectors(camAnim.from.t, camAnim.to.t, k);
    if(camAnim.t>=1) camAnim=null;
  }
  if(followObj){
    camT.lerp(new THREE.Vector3(followObj.position.x, followObj.position.y+2, followObj.position.z), dt*3);
  }
  if(cinematicOrbit && !camAnim && !followObj && !dragging){ camYaw+=dt*0.035; }
  if(!window.__freeze) applyCam();
  var tm=updateTime(sdt, dt);
  updateArt(simT,tm.dayF);
  if(sdt>0){
    updateTrain(sdt);
    updateRovers(sdt);
    updateHopper(sdt);
    updateRocket(sdt);
    updateDrone(sdt);
    updateAstros(sdt);
    updateColonyLife(sdt);
    updateEcology(sdt);
    updateCrane(sdt);
    updateMiner(sdt);
    updatePlant(sdt);
    updateDishes(sdt);
    meteorTimer-=sdt;
    var night=tm.dayF<0.3;
    var rate = simT<showerUntil? 0.12 : (night? 5 : 16);
    if(meteorTimer<=0){ spawnMeteor(); meteorTimer=rate*rrange(0.5,1.4); }
    if(stormOn && Math.random()<sdt*26){
      var a=rnd()*TAU, rr=rrange(20,88);
      var sx=Math.cos(a)*rr, sz=Math.sin(a)*rr;
      puff(sx, terrainTopWorld(sx,sz)+rrange(0,8), sz, 0x9aa0aa, rrange(5,10), rrange(1.5,3), rrange(0.2,1), 0.14);
    }
  }
  updateMeteors(dt);
  updatePuffs(dt);
  updateLabels();
  if(curInspect && curInspect.stat) document.getElementById('insStat').textContent=curInspect.stat();
  frame++;
  fpsA=lerp(fpsA, 1/Math.max(elapsed,1e-4), 0.05);
  if(frame===30){
    document.getElementById('helpStats').textContent='场景统计 · 三角面 '+Math.round(renderer.info.render.triangles/1000)+'k · 绘制调用 '+renderer.info.render.calls+' · 机器人 '+(astros.length+colonyLife.robots.length)+' 台 · 无人机 '+colonyLife.drones.length+' 架 · 补给车 '+colonyLife.carts.length+' 辆';
  }
  if(frame%30===0){
    var f=Math.round(fpsA);
    var el=document.getElementById('fps');
    el.textContent=f;
    el.className=f>45?'good':(f>24?'mid':'bad');
  }
  renderArtFrame();
}

/* ---------------- 17. 装配 ---------------- */
function assemble(){
  var steps=[
    ['雕刻月面与陨石坑……', function(){ buildLunarTerrain(); }],
    ['建造指挥舱与栖居区……', function(){ buildCommandHabitat(); buildHabitatCluster(); }],
    ['搭起生态舱与车库……', function(){ buildHydroponics(); buildVehicleHangar(); }],
    ['修建发射场与着陆场……', function(){
      buildLaunchPad();
      buildLandingPad(54,0,'padA','着陆场「鹰-A」','LANDING PAD A','跳跃器的两个家之一。白色十字标线夜里会被琥珀边界灯点亮。点击呼叫跳跃器转场。');
      buildLandingPad(14,50,'padB','着陆场「鹰-B」','LANDING PAD B','跳跃器的两个家之一，建在南缘高地上，视野开阔。点击呼叫跳跃器转场。');
    }],
    ['竖起反应堆与燃料库……', function(){ buildSolar(); buildFissionUnit(); buildDepot(); }],
    ['开动处理厂与起重机……', function(){ buildProcessingPlant(); buildYard(); }],
    ['架设天线与纪念广场……', function(){ buildComms(); buildMemorial(); buildFloods(); }],
    ['铺设环线铁路……', function(){ buildRail(); buildRoadlights(); }],
    ['装配管线与地表细节……', function(){ dressIndustrialFacilities(); buildColonyLife(); buildEcology(); }],
    ['挂起地球与银河……', function(){ buildSpace(); }],
    ['竖起碟形天线……', function(){ dish1=makeDish(16,-14,0.5); dish2=makeDish(20,-9,2.4); }],
    ['注册可点击目标……', function(){
      for(var i=0;i<POIS.length;i++){
        var p=POIS[i], hk=p.hit;
        var hg=new THREE.Mesh(new THREE.BoxGeometry(hk.r*2, hk.h, hk.r*2),
          new THREE.MeshBasicMaterial({visible:false}));
        hg.position.set(hk.x, hk.y, hk.z);
        hg.userData.poi=p;
        scene.add(hg); hitMeshes.push(hg);
      }
      ents.train={obj:train.cars[0], poiLike:{name:'矿卡列车「转运」', en:'ORE TRAM', desc:'车头挂着四节矿石车的环线列车，在静海站和处理厂装料龙门之间循环。相机已挂载跟随模式——晃一下鼠标即可脱离。',
        stat:function(){ return trainState.mode==='stop'?'静海站停靠中':'环线运行中 · 5 节编组'; }}};
      ents.rover={obj:rovers[0].m, poiLike:{name:'月面越野车 LRV', en:'LUNAR ROVING VEHICLE', desc:'阿波罗同款敞篷月球车：钢丝轮、折叠座椅、桅杆相机。当年宇航员开着它飙到 18 公里时速，扬起一路月尘。',
        stat:function(){ return patrolOn?'巡逻中 · 电量 87%':'已召回 · 车库充电中'; }}};
      ents.drone={obj:drone.group, poiLike:{name:'巡检无人机', en:'INSPECTION DRONE', desc:'绕指挥塔盘旋的巡检无人机，红绿航灯交替闪烁。月球上没有空气，它其实靠微型推进器飞——模型里就别较真了。',
        stat:function(){ return '巡航高度 '+Math.round(drone.group.position.y-BASE_Y)+' m'; }}};
      ents.hopper={obj:hopper.group, poiLike:{name:'跳跃器「跳蚤」', en:'SUBORBITAL HOPPER', desc:'货运跳跃器，在鹰-A 与鹰-B 之间抛物线往返，一次能运半吨补给。1/6 重力下，跳跃是最经济的运输方式。',
        stat:function(){ return hopper.state==='hop'?'转场飞行中':'停靠 · 鹰-'+hopper.at; }}};
      ents.miner={obj:miner.group, poiLike:{name:'采矿机器人「掘进」', en:'EXCAVATOR BOT', desc:'在环形山里刨土的无人矿机，挖出的月壤送去处理厂提炼氧气。机械臂每挥一下，就扬起一小片灰白的尘。',
        stat:function(){ return '作业中 · 今日已采 2.4 吨'; }}};
      train.cars[0].userData.ent=ents.train; hitMeshes.push(train.cars[0]);
      rovers[0].m.userData.ent=ents.rover; hitMeshes.push(rovers[0].m);
      rovers[1].m.userData.ent=ents.rover; hitMeshes.push(rovers[1].m);
      hopper.group.userData.ent=ents.hopper; hitMeshes.push(hopper.group);
      miner.group.userData.ent=ents.miner; hitMeshes.push(miner.group);
      astros[0].o.group.userData.ent={kind:'astro', o:astros[0].o}; hitMeshes.push(astros[0].o.group);
      astros[1].o.group.userData.ent={kind:'astro', o:astros[1].o}; hitMeshes.push(astros[1].o.group);
      astros[2].o.group.userData.ent={kind:'astro', o:astros[2].o}; hitMeshes.push(astros[2].o.group);
      astros[3].o.group.userData.ent={kind:'astro', o:astros[3].o}; hitMeshes.push(astros[3].o.group);
    }],
    ['点亮标签……', function(){ makeLabels(); }]
  ];
  var tips=[
    '1969 年 7 月 20 日，阿波罗 11 号着陆静海：「休斯顿，静海基地，鹰已着陆」。',
    '阿波罗 11 号留下的激光反射器，至今仍在做地月测距。',
    '阿波罗月球车 LRV 的最高时速纪录是 18 公里（阿波罗 17 号）。',
    '1968 年，阿波罗 8 号在月球轨道拍下了著名的「地出」。',
    'LCROSS 于 2009 年撞月确认水冰；月球南极是阿尔忒弥斯的目标。',
    '国际空间站 Veggie 实验，2015 年第一次吃到太空生菜。',
    '月球没有大气，影子边缘锋利如刀；地球在月面天空始终不动。'
  ];
  var tipEl=document.getElementById('ptip');
  var tipI=0;
  tipEl.textContent='小贴士 · '+tips[0];
  var tipTimer=setInterval(function(){ tipI=(tipI+1)%tips.length; tipEl.textContent='小贴士 · '+tips[tipI]; }, 2200);
  var i=0;
  function step(){
    if(i<steps.length){
      document.getElementById('pstat').textContent=steps[i][0];
      document.getElementById('pfill').style.width=Math.round(i/steps.length*100)+'%';
      setTimeout(function(){
        steps[i][1]();
        i++; step();
      }, 30);
    } else {
      clearInterval(tipTimer);
      document.getElementById('pfill').style.width='100%';
      document.getElementById('pstat').textContent='就绪 · 基地运转中';
      document.getElementById('vox').textContent='运行中';
      var lo=document.getElementById('loading');
      lo.style.opacity='0';
      setTimeout(function(){ lo.style.display='none'; window.__ready=true; }, 750);
      animate();
    }
  }
  step();
}

/* ---------------- 18. 调试出口 ---------------- */
window.__dbg=function(){
  return {
    errors:window.__errors.slice(0,8),
    fps:Math.round(fpsA),
    draws:renderer.info.render.calls,
    tris:renderer.info.render.triangles,
    pois:POIS.length,
    ready:!!window.__ready
  };
};
window.__three={THREE:THREE, scene:scene, camera:camera, renderer:renderer};
window.__freeze=false;
window.__setTime=function(t){ dayT=t; if(cycleOn){cycleOn=false; document.getElementById('bCycle').classList.remove('on');} };

/* ---------------- 19. 启动 ---------------- */
window.addEventListener('resize', function(){
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.fov=window.innerWidth<700?60:42;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  positionEarthForViewport();
});
/*__SCENE_DESIGN__*/
configureArtDirection();
applyCam();
assemble();

})();
