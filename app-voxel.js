/* ============================================================
   静海基地 TRQ-1 · 体素月面基地（Apollo / Artemis 主题）
   单文件 · three.js r128 全局版 · 无外部资源
   依据：Apollo 11 静海基地、阿波罗月球车 LRV、激光反射器、
   NASA 月面裂变电源、Starship HLS、深空网 DSN、LCROSS 水冰、
   ISS Veggie 生菜、阿波罗 8 号「地出」
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

/* ---------------- 1. 调色板 ---------------- */
function C(hex){ return new THREE.Color(hex).convertSRGBToLinear(); }
var PAL = [
  null,
  /* 1-4 月壤 */   {h:0xb4b8c0},{h:0xa6abb6},{h:0xc2c6ce},{h:0x9aa0ab},
  /* 5-6 暗壤/坑 */ {h:0x7d838f},{h:0x697080},
  /* 7-9 地下 */   {h:0x828897},{h:0x6a707c},{h:0x565c66},
  /* 10-11 岩石 */ {h:0x5d636e},{h:0x4a4f59},
  /* 12 道路 */    {h:0x7a808c},
  /* 13 广场 */    {h:0x969daa},
  /* 14 混凝 */    {h:0x9aa0a6},
  /* 15-17 白/浅/深 */ {h:0xe9edf2},{h:0xccd2da},{h:0x3a4048},
  /* 18 橙 */      {h:0xe07b39},
  /* 19-20 光伏 */ {h:0x16324f},{h:0x1f4e79},
  /* 21-22 木桌 */ {h:0xa07043},{h:0x845730},
  /* 23 旗红 */    {h:0xc8352a},
  /* 24 金 */      {h:0xffd23f},
  /* 25 标线 */    {h:0xe8e4da},
  /* 26 轨 */      {h:0x7a7e88},
  /* 27 枕 */      {h:0x5d5148},
  /* 28 车体 */    {h:0xd6dade},
  /* 29 青 */      {h:0x35e6ff},
  /* 30 架 */      {h:0xb8c4c4},
  /* 31 苗 */      {h:0x4e8a3f},
  /* 32 箱 */      {h:0x8a9096},
  /* 33-36 集装箱 */ {h:0xc05046},{h:0x4a6fb5},{h:0xd8b23f},{h:0x5a9e5a},
  /* 37 旗蓝 */    {h:0x2a4a8a},
  /* ---- 自发光 ---- */
  /* 38 暖窗 */    {h:0xffd9a0, g:1},
  /* 39 冷窗 */    {h:0x8fe6ff, g:1},
  /* 40 红 */      {h:0xff4d4d, g:1},
  /* 41 绿 */      {h:0x66ff88, g:1},
  /* 42 青带 */    {h:0x46e0ff, g:1},
  /* 43 品红 */    {h:0xff70d8, g:1},
  /* 44 琥珀 */    {h:0xffc46b, g:1},
  /* 45 白灯 */    {h:0xf2f6ff, g:1},
  /* 46 散热橙 */  {h:0xff9a3c, g:1},
  /* 47 温室玻璃 */ {h:0xb8e8cc, g:1}
];
var PALC = [];
(function(){ for(var i=1;i<PAL.length;i++) PALC[i] = C(PAL[i].h); })();

/* ---------------- 2. 体素世界 ---------------- */
var W=224, D=224, H=68, BASE_Y=9, HX=W/2, HZ=D/2, YOFF=20;
var solid = new Uint8Array(W*H*D);
var colr  = new Uint8Array(W*H*D);
function vid(x,y,z){ return ((y+YOFF)*D + z)*W + x; }
function inW(x,y,z){ return x>=0 && x<W && z>=0 && z<D && (y+YOFF)>=0 && (y+YOFF)<H; }
function setV(x,y,z,c){
  x|=0; y|=0; z|=0;
  if(!inW(x,y,z)) return;
  var i=vid(x,y,z); solid[i]=1; colr[i]=c;
}
function clearV(x,y,z){ if(inW(x,y,z)) solid[vid(x,y,z)]=0; }
function getSolid(x,y,z){ return inW(x,y,z) && solid[vid(x,y,z)]; }
function box(x0,y0,z0,x1,y1,z1,c){
  var x,y,z;
  for(x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)
  for(y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)
  for(z=Math.min(z0,z1);z<=Math.max(z0,z1);z++) setV(x,y,z,c);
}
function shell(x0,y0,z0,x1,y1,z1,c){
  var x,y,z, xa=Math.min(x0,x1), xb=Math.max(x0,x1), ya=Math.min(y0,y1), yb=Math.max(y0,y1), za=Math.min(z0,z1), zb=Math.max(z0,z1);
  for(x=xa;x<=xb;x++) for(y=ya;y<=yb;y++) for(z=za;z<=zb;z++)
    if(x===xa||x===xb||y===ya||y===yb||z===za||z===zb) setV(x,y,z,c);
}
function cyl(cx,cz,y0,y1,r,c){
  var x,z,y;
  for(x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)
  for(z=Math.floor(cz-r);z<=Math.ceil(cz+r);z++){
    var dx=x-cx, dz=z-cz;
    if(dx*dx+dz*dz <= r*r+0.4) for(y=y0;y<=y1;y++) setV(x,y,z,c);
  }
}
function cylShell(cx,cz,y0,y1,r,c){
  var x,z,y;
  for(x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)
  for(z=Math.floor(cz-r);z<=Math.ceil(cz+r);z++){
    var dx=x-cx, dz=z-cz, d=dx*dx+dz*dz;
    if(d <= r*r+0.4 && d >= (r-1.15)*(r-1.15)) for(y=y0;y<=y1;y++) setV(x,y,z,c);
  }
}
function ball(cx,cy,cz,r,c){
  var x,y,z;
  for(x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)
  for(y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)
  for(z=Math.floor(cz-r);z<=Math.ceil(cz+r);z++){
    var dx=x-cx,dy=y-cy,dz=z-cz;
    if(dx*dx+dy*dy+dz*dz <= r*r+0.5) setV(x,y,z,c);
  }
}
function dome(cx,cyb,cz,r,cShell,cPane){
  var x,y,z;
  for(x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)
  for(y=cyb;y<=Math.ceil(cyb+r);y++)
  for(z=Math.floor(cz-r);z<=Math.ceil(cz+r);z++){
    var dx=x-cx,dy=(y-cyb)*1.12,dz=z-cz, d=Math.sqrt(dx*dx+dy*dy+dz*dz);
    if(d<=r+0.35 && d>=r-1.0){
      var isRib = (Math.abs(dx)<0.6)||(Math.abs(dz)<0.6)||(y===cyb);
      setV(x,y,z, isRib?cShell:cPane);
    }
  }
}
function colTop(x,z){ for(var y=H-1-YOFF;y>=-YOFF;y--) if(getSolid(x,y,z)) return y; return -1; }
function colTopW(wx,wz){ return colTop(Math.round(wx+HX), Math.round(wz+HZ)); }
function setTop(x,z,y,c){
  x|=0; z|=0;
  for(var yy=H-1-YOFF;yy>y;yy--) clearV(x,yy,z);
  setV(x,y,z,c);
}
function paintW(wx,wz,c){
  var x=Math.round(wx+HX), z=Math.round(wz+HZ);
  var t=colTop(x,z);
  if(t>=0) setV(x,t,z,c);
}

/* ---------------- 3. 地形 ---------------- */
var TERRAIN_R = 88;
function siteFlatten(cx,cz,r,y){
  for(var x=Math.floor(cx-r-4);x<=Math.ceil(cx+r+4);x++)
  for(var z=Math.floor(cz-r-4);z<=Math.ceil(cz+r+4);z++){
    var d=Math.sqrt((x-cx)*(x-cx)+(z-cz)*(z-cz));
    if(d<r+4){
      var t = sstep(r+3.5, r-1, d);
      var vx=Math.round(x+HX), vz=Math.round(z+HZ);
      var h0 = colTop(vx,vz); if(h0<0) h0=BASE_Y;
      var nh = Math.round(lerp(h0, y, t));
      setTop(vx,vz,nh, t>0.7?14:2);
    }
  }
}
function buildMesa(mx,mz,r,hgt){
  var layers=[2,1,6,10,1,2,6,1,10,2];
  for(var x=Math.floor(mx-r-2);x<=Math.ceil(mx+r+2);x++)
  for(var z=Math.floor(mz-r-2);z<=Math.ceil(mz+r+2);z++){
    var dx=x-mx, dz=z-mz, d=Math.sqrt(dx*dx+dz*dz);
    var rr = r + noise2(x*0.4, z*0.4)*1.6;
    if(d<rr){
      var vx=Math.round(x+HX), vz=Math.round(z+HZ);
      var t = colTop(vx,vz); if(t<0) t=BASE_Y;
      var top = Math.round(BASE_Y-2 + hgt*(1 - Math.pow(d/rr,3)*0.35));
      for(var y=t+1;y<=top;y++) setV(vx, y, vz, layers[((y-t)%layers.length+layers.length)%layers.length]);
    }
  }
}
function genTerrain(){
  var x,z,y,i;
  var craters=[];
  for(i=0;i<16;i++){
    var a=rnd()*TAU, rr=rrange(56,82);
    craters.push({x:Math.cos(a)*rr, z:Math.sin(a)*rr, r:rrange(3.5,10), dep:rrange(1.6,3.2)});
  }
  craters.push({x:-56, z:-40, r:9, dep:3});
  var RS=340;   /* 球冠半径：边缘下弯，月球是圆的 */
  for(x=0;x<W;x++) for(z=0;z<D;z++){
    var wx=x-HX+0.5, wz=z-HZ+0.5;
    var dc=Math.sqrt(wx*wx+wz*wz);
    if(dc>TERRAIN_R) continue;
    var capDrop = RS - Math.sqrt(RS*RS - dc*dc);
    var h = 9 + noise2(wx*0.05, wz*0.05)*1.8 + noise2(wx*0.14+31, wz*0.14+17)*0.7 - capDrop;
    for(i=0;i<craters.length;i++){
      var cr=craters[i], dd=Math.sqrt((wx-cr.x)*(wx-cr.x)+(wz-cr.z)*(wz-cr.z));
      if(dd<cr.r){ h -= cr.dep*Math.cos(dd/cr.r*Math.PI/2); }
      else if(dd<cr.r*1.3){ h += cr.dep*0.4*(1-(dd-cr.r)/(cr.r*0.3)); }
    }
    var f = sstep(50,36,dc);
    h = lerp(h, BASE_Y, f);
    var hi = Math.max(1, Math.round(h));
    /* 星胚月壳：中心厚、边缘薄、带垂岩 */
    var bot = -Math.round(16*Math.pow(1-(dc/TERRAIN_R)*(dc/TERRAIN_R),1.2));
    if(dc<55 && vhash(x,z)>0.9) bot -= 2+Math.floor(vhash(z,x)*4);
    var nshade = noise2(wx*0.3+91, wz*0.3+47);
    for(y=bot;y<=hi;y++){
      var c;
      if(y===hi){
        if(dc>50){ c = nshade>0.35?3:(nshade>0.08?1:(nshade>-0.3?2:4)); }
        else { c = nshade>0.3?13:(nshade>-0.2?1:2); }
        if(dc>TERRAIN_R-2.2) c = 6;
      }
      else if(y<bot+2) c = hash3(x,y,z)>0.5?10:11;
      else if(y>hi-2) c=7; else if(y>hi-4) c=8; else c=9;
      setV(x,y,z,c);
    }
  }
  siteFlatten( 36,-36, 11, BASE_Y);
  siteFlatten( 54,  0,  8, BASE_Y);
  siteFlatten( 14, 50,  8, BASE_Y);
  siteFlatten( 18,-12,  9, BASE_Y);
  siteFlatten(-44,-20, 14, BASE_Y);
  siteFlatten(-52,  4, 10, BASE_Y);
  siteFlatten(-46, 28, 10, BASE_Y);
  siteFlatten( 40,-14, 12, BASE_Y);
  siteFlatten( 24, 38, 13, BASE_Y);
  siteFlatten( 26, 18, 11, BASE_Y);
  siteFlatten(  0,-30, 11, BASE_Y);
  buildMesa(-70, 58, 10, 8);
  buildMesa( 72, 48,  8, 6);
  buildMesa(-20,-80, 11, 9);
  for(i=0;i<52;i++){
    var aa=rnd()*TAU, rr2=rrange(58,84);
    var rx=Math.round(Math.cos(aa)*rr2), rz=Math.round(Math.sin(aa)*rr2);
    var tp=colTopW(rx, rz);
    if(tp>0){
      var s=Math.round(rrange(1,2.6));
      box(rx+HX, tp+1, rz+HZ, rx+HX+s-1, tp+s, rz+HZ+s-1, rnd()>0.5?10:11);
    }
  }
}
function road(x0,z0,x1,z1,w){
  var minx=Math.floor(Math.min(x0,x1)-w-1), maxx=Math.ceil(Math.max(x0,x1)+w+1);
  var minz=Math.floor(Math.min(z0,z1)-w-1), maxz=Math.ceil(Math.max(z0,z1)+w+1);
  var dx=x1-x0, dz=z1-z0, len2=dx*dx+dz*dz;
  var y0=colTopW(x0,z0), y1=colTopW(x1,z1);
  if(y0<0) y0=BASE_Y; if(y1<0) y1=BASE_Y;
  for(var x=minx;x<=maxx;x++) for(var z=minz;z<=maxz;z++){
    var t = len2? clamp(((x-x0)*dx+(z-z0)*dz)/len2,0,1):0;
    var px=x0+dx*t, pz=z0+dz*t;
    var dd=Math.sqrt((x-px)*(x-px)+(z-pz)*(z-pz));
    if(dd<=w/2){
      var y = Math.round(lerp(y0, y1, t));
      setTop(Math.round(x+HX), Math.round(z+HZ), y, 12);
    }
  }
  /* 车辙 + 路缘灯带 */
  var len=Math.sqrt(len2), nx=-dz/len, nz=dx/len;
  for(var s=1;s<len-1;s+=1){
    var t2=s/len, bx=lerp(x0,x1,t2), bz=lerp(z0,z1,t2);
    if(s%2===0){
      paintW(bx+nx*(w*0.28), bz+nz*(w*0.28), 5);
      paintW(bx-nx*(w*0.28), bz-nz*(w*0.28), 5);
    }
    if(s%5===0){
      paintW(bx+nx*(w/2+0.8), bz+nz*(w/2+0.8), 42);
    }
  }
}
function genRoads(){
  road(  0,-16,  0,-30, 4);
  road( -8,  6, -28,  2, 4);
  road(-10, 10, -14, 14, 3);
  road( -6, 14,  -8, 30, 4);
  road( -2, 16,   6, 36, 3);
  road(  8,  8,  26, 18, 4);
  road( 10, -8,  36,-36, 4);
  road( 16,  2,  54,  0, 4);
  road(  6, 14,  14, 50, 4);
  road( 10, -4,  18,-12, 3);
  road( 12, -8,  40,-14, 4);
  road( 10, 12,  24, 38, 4);
  road(-16, -8, -44,-20, 4);
  road(-20, -2, -52,  4, 3);
  road(-16, 10, -46, 28, 4);
}

/* ---------------- 4. 静态建筑 A ---------------- */
var POIS = [];
function addPOI(o){ POIS.push(o); }

/* 指挥塔「休斯敦」 */
function buildTower(){
  var cx=0+HX, cz=-30+HZ, b=BASE_Y;
  box(cx-6,b,cz-6, cx+6,b,cz+6, 14);
  cyl(cx,cz, b+1, b+6, 5.5, 15);
  cylShell(cx,cz, b+3, b+3, 5.5, 38);
  cyl(cx,cz, b+7, b+12, 4.5, 16);
  cylShell(cx,cz, b+9, b+9, 4.5, 39);
  cyl(cx,cz, b+13, b+13, 6.2, 14);
  cylShell(cx,cz, b+14, b+14, 6.2, 42);
  cylShell(cx,cz, b+15, b+17, 5.2, 39);
  cyl(cx,cz, b+18, b+18, 5.5, 15);
  box(cx-1,b+19,cz-1, cx+1,b+27, cz+1, 17);
  setV(cx, b+28, cz, 40);
  setV(cx-1,b+24,cz-1,45); setV(cx+1,b+24,cz+1,45);
  box(cx-3,b+7,cz-7, cx+3,b+9, cz-6, 15);
  setV(cx-2,b+8,cz-7,38); setV(cx+2,b+8,cz-7,38);
  box(cx+5,b+2,cz+3, cx+8,b+3, cz+6, 32);
  setV(cx+6,b+4,cz+4,41);
  addPOI({id:'tower', name:'指挥塔「休斯敦」', en:'MISSION CONTROL', hit:{x:0,y:b+13,z:-30,r:8,h:22},
    desc:'基地的神经中枢，向 1969 年 7 月 20 日那声呼叫致敬——「休斯顿，这里是静海基地，鹰已着陆」。三层塔身，观景台环绕冷蓝舷窗，顶部红色信标为归航飞行器指路。点击切换全基地灯光。',
    pos:new THREE.Vector3(0, b+20, -30)});
}
/* 穹顶×4「天鹰」 */
function buildDomes(){
  var b=BASE_Y;
  var domes=[{x:-28,z:2},{x:-14,z:14},{x:-30,z:20},{x:-44,z:10}];
  for(var i=0;i<domes.length;i++){
    var m=domes[i], cx=m.x+HX, cz=m.z+HZ;
    cyl(cx,cz,b,b,7.6,14);
    dome(cx,b+1,cz,7,30,47);
    cyl(cx,cz,b+1,b+1,6.4,13);
    box(cx-1,b+1,cz-8,cx+1,b+3,cz-6,16); setV(cx,b+2,cz-8,41);
    setV(cx-3,b+3,cz-5,38); setV(cx+3,b+3,cz-5,38); setV(cx-5,b+3,cz+3,38); setV(cx+5,b+3,cz+3,38);
  }
  /* 连接通道 */
  shell(-26+HX,b+1,6+HZ, -16+HX,b+3,12+HZ, 16);
  shell(-16+HX,b+1,12+HZ, -12+HX,b+3,14+HZ, 16);
  shell(-28+HX,b+1,8+HZ, -28+HX,b+3,14+HZ, 16);
  shell(-42+HX,b+1,6+HZ, -32+HX,b+3,10+HZ, 16);
  /* 气闸 */
  box(-22+HX,b+1,-2+HZ, -20+HX,b+3,0+HZ, 17); setV(-21+HX,b+2,-3+HZ,41);
  addPOI({id:'hab', name:'居住穹顶「天鹰」', en:'EAGLE HABITAT DOMES', hit:{x:-27,y:b+4,z:11,r:16,h:9},
    desc:'四座加压穹顶以登月舱「鹰」命名，由通道相连，舷窗透出暖光。没有大气的月球上，穹顶就是全部的大气。沙尘……不，月尘再大，人也只能撤回这里。',
    pos:new THREE.Vector3(-27, b+8, 11)});
}
/* 温室×2「田园」 */
function buildGreenhouse(){
  var b=BASE_Y;
  var ghs=[{x:-8,z:30,r:7},{x:6,z:36,r:6}];
  for(var i=0;i<ghs.length;i++){
    var m=ghs[i], cx=m.x+HX, cz=m.z+HZ, r=m.r;
    cyl(cx,cz,b,b,r+0.4,14);
    dome(cx,b+1,cz,r,30,47);
    cyl(cx,cz,b+1,b+1,r-0.8,31);
    for(var k=0;k<8;k++){
      var a=k/8*TAU;
      setV(Math.round(cx+Math.cos(a)*(r-2.5)), b+2, Math.round(cz+Math.sin(a)*(r-2.5)), 31);
    }
    box(cx-1,b+1,cz-r-1,cx+1,b+3,cz-r+1,16); setV(cx,b+2,cz-r-1,41);
  }
  addPOI({id:'gh', name:'生态温室「田园」', en:'VEGGIE GREENHOUSE', hit:{x:-1,y:b+4,z:33,r:10,h:9},
    desc:'名字来自国际空间站的 Veggie 实验——2015 年，宇航员第一次吃到了自己在轨种出的红生菜。这里种的是生菜、番茄和土豆。点击切换品红生长灯。',
    pos:new THREE.Vector3(-1, b+8, 33)});
}
/* 车库「漫游者」 */
function buildGarage(){
  var cx=26+HX, cz=18+HZ, b=BASE_Y;
  box(cx-7,b,cz-6, cx+7,b,cz+6, 14);
  shell(cx-7,b+1,cz-6, cx+7,b+6,cz+6, 16);
  box(cx-7,b+7,cz-6, cx+7,b+7,cz+6, 15);
  box(cx-4,b+1,cz-7, cx+4,b+5,cz-6, 17);
  for(var x=cx-3;x<=cx+3;x++) for(var y=b+1;y<=b+4;y++) clearV(x,y,cz-6);
  setV(cx-5,b+6,cz-7,40); setV(cx+5,b+6,cz-7,40);
  setV(cx-6,b+4,cz+6,44); setV(cx+6,b+4,cz+6,44);
  box(cx+8,b+1,cz-3, cx+10,b+2,cz+3, 32);
  setV(cx+9,b+3,cz,41);
  addPOI({id:'garage', name:'车库「漫游者」', en:'LRV ROVER GARAGE', hit:{x:26,y:b+3,z:18,r:10,h:8},
    desc:'两辆月面越野车（LRV）的家。阿波罗 15 到 17 号的月球车在月面跑了 90 多公里，最高时速纪录 18 公里——在 1/6 重力下已经相当刺激。点击派出或召回车队。',
    pos:new THREE.Vector3(26, b+8, 18)});
}
/* 发射场「星舰」 */
function buildLaunchPad(){
  var cx=36+HX, cz=-36+HZ, b=BASE_Y;
  for(var x=cx-10;x<=cx+10;x++) for(var z=cz-10;z<=cz+10;z++){
    var dx=Math.abs(x-cx), dz=Math.abs(z-cz);
    if(Math.max(dx,dz)<=10 && dx+dz<15) setTop(x,z,b+1,14);
  }
  cyl(cx,cz,b+2,b+2,4.6,17);
  box(cx-1,b+2,cz-7,cx+1,b+2,cz+7,9);
  /* 捕获/勤务塔 */
  box(cx+7,b+2,cz+2,cx+8,b+18,cz+3,17);
  for(var y=b+3;y<=b+18;y+=3){ box(cx+6,y,cz+1,cx+9,y,cz+4,26); }
  box(cx+2,b+15,cz+2,cx+7,b+15,cz+3,18);
  box(cx+2,b+11,cz+2,cx+7,b+11,cz+3,18);
  setV(cx+7,b+19,cz+2,40);
  var lp=[[-9,-9],[9,-9],[-9,9],[9,9]];
  for(var i=0;i<4;i++){ box(cx+lp[i][0],b+2,cz+lp[i][1],cx+lp[i][0],b+7,cz+lp[i][1],17); setV(cx+lp[i][0],b+8,cz+lp[i][1],45); }
  addPOI({id:'pad', name:'发射工位「星舰」', en:'STARSHIP HLS PAD', hit:{x:36,y:b+8,z:-36,r:12,h:20},
    desc:'星舰 HLS（载人着陆系统）的泊位——阿尔忒弥斯计划选中的登月器。双摆臂勤务塔、导流槽、四盏泛光灯。点击点火升空，它会绕一圈再自己落回来。',
    pos:new THREE.Vector3(36, b+18, -36)});
}
function buildLandingPad(wx,wz,id,name,en,desc){
  var cx=wx+HX, cz=wz+HZ, b=BASE_Y;
  cyl(cx,cz,b,b+1,5.5,14);
  cyl(cx,cz,b+1,b+1,5.5,13);
  box(cx-1,b+2,cz-3,cx+1,b+2,cz+3,25); box(cx-3,b+2,cz-1,cx+3,b+2,cz+1,25);
  var lp=[[-5,0],[5,0],[0,-5],[0,5]];
  for(var i=0;i<4;i++){ setV(cx+lp[i][0],b+2,cz+lp[i][1],44); }
  addPOI({id:id, name:name, en:en, hit:{x:wx,y:b+2,z:wz,r:7,h:5}, desc:desc,
    pos:new THREE.Vector3(wx, b+5, wz)});
}
/* 光伏「日帆」 */
function buildSolar(){
  var cx=-44+HX, cz=-20+HZ, b=BASE_Y;
  box(cx-13,b,cz-11, cx+13,b,cz+11, 13);
  for(var r=0;r<4;r++) for(var q=0;q<5;q++){
    var px=cx-10+q*5, pz=cz-8+r*5;
    box(px,b+1,pz, px,b+3,pz, 17);
    for(var s=0;s<4;s++){
      var yy=b+4+Math.floor(s/2);
      box(px-2, yy, pz-2+s, px+1, yy, pz-2+s, s%2?19:20);
    }
  }
  box(cx+9,b+1,cz+7, cx+12,b+3,cz+10, 32); setV(cx+10,b+4,cz+8,40);
  addPOI({id:'solar', name:'光伏阵列「日帆」', en:'SOLAR FIELD', hit:{x:-44,y:b+5,z:-20,r:14,h:8},
    desc:'20 块阶梯光伏板。月昼长达 14 个地球日，充电时间管够；难的是接下来 14 天的月夜——所以基地还得靠那座裂变反应堆兜底。',
    pos:new THREE.Vector3(-44, b+8, -20)});
}
/* 反应堆「裂变」 */
function buildReactor(){
  var cx=-52+HX, cz=4+HZ, b=BASE_Y;
  box(cx-5,b,cz-5, cx+5,b,cz+5, 14);
  cyl(cx,cz, b+1, b+6, 3.6, 17);
  cyl(cx,cz, b+7, b+7, 4.0, 16);
  setV(cx,b+8,cz,46);
  /* 四片散热板（橙色发光鳍片） */
  var fins=[[5,0],[-5,0],[0,5],[0,-5]];
  for(var i=0;i<4;i++){
    var fx=cx+fins[i][0], fz=cz+fins[i][1];
    if(fins[i][0]!==0){ box(fx,b+2,fz-2, fx,b+8,fz+2, 46); }
    else { box(fx-2,b+2,fz, fx+2,b+8,fz, 46); }
    box(cx+fins[i][0]*0.6, b+3, cz+fins[i][1]*0.6, cx+fins[i][0], b+3, cz+fins[i][1], 26);
  }
  setV(cx-4,b+1,cz-4,40); setV(cx+4,b+1,cz+4,40);
  addPOI({id:'reactor', name:'裂变反应堆「烛龙」', en:'FISSION SURFACE POWER', hit:{x:-52,y:b+4,z:4,r:9,h:9},
    desc:'NASA 月面裂变电源的同款思路：40 千瓦级反应堆，四片橙色散热鳍片把废热辐射进漆黑的天空。月夜长达 14 天，没有它，光伏阵列再大一倍也撑不住。',
    pos:new THREE.Vector3(-52, b+10, 4),
    stat:function(){ return '输出 40 kW · 堆芯正常'; }});
}
/* 推进剂库「低温」 */
function buildDepot(){
  var cx=-46+HX, cz=28+HZ, b=BASE_Y;
  box(cx-7,b,cz-5, cx+7,b,cz+5, 14);
  for(var i=0;i<3;i++){
    var px=cx-4+i*4;
    box(px-1,b+1,cz-1, px+1,b+2,cz+1, 17);
    ball(px, b+6, cz, 3.4, 15);
    setV(px,b+9,cz,45);
    box(px,b+1,cz+1, px,b+3,cz+1, 26);
  }
  box(cx-4,b+2,cz+2, cx+4,b+2,cz+2, 26);
  box(cx-6,b+1,cz+3, cx-4,b+2,cz+5, 32); setV(cx-5,b+3,cz+4,41);
  addPOI({id:'depot', name:'推进剂库「低温」', en:'CRYO PROPELLANT DEPOT', hit:{x:-46,y:b+5,z:28,r:9,h:10},
    desc:'三颗液氧/甲烷球罐，为星舰 HLS 和跳跃器补给。推进剂来自月壤水冰电解——喝的是处理厂的「舂月」牌矿泉水。',
    pos:new THREE.Vector3(-46, b+10, 28)});
}
/* 处理厂「舂月」+ 装料龙门 */
function buildPlant(){
  var cx=40+HX, cz=-14+HZ, b=BASE_Y;
  box(cx-7,b,cz-6, cx+7,b,cz+6, 14);
  shell(cx-7,b+1,cz-6, cx+7,b+8,cz+6, 32);
  box(cx-7,b+9,cz-6, cx+7,b+9,cz+6, 17);
  for(var x=cx-6;x<=cx+6;x+=2){ setV(x,b+3,cz-6,39); setV(x,b+6,cz-6,39); }
  box(cx-3,b+10,cz-3, cx-1,b+15,cz-1, 17);
  setV(cx-2,b+16,cz-2,44);
  box(cx+4,b+1,cz-8, cx+6,b+4,cz-6, 17);
  box(cx-5,b+2,cz+7, cx+5,b+3,cz+7, 26);
  setV(cx+5,b+5,cz+6,40); setV(cx-5,b+5,cz+6,40);
  /* 装料龙门（跨铁路） */
  var ga=Math.atan2(-20.5,58.5), gx=Math.round(Math.cos(ga)*62), gz=Math.round(Math.sin(ga)*62);
  var nx=Math.round(Math.cos(ga+Math.PI/2)*5), nz=Math.round(Math.sin(ga+Math.PI/2)*5);
  box(gx+nx-1+HX,b+1,gz+nz-1+HZ, gx+nx+1+HX,20,gz+nz+1+HZ, 18);
  box(gx-nx-1+HX,b+1,gz-nz-1+HZ, gx-nx+1+HX,20,gz-nz+1+HZ, 18);
  box(gx-nx-1+HX,20,gz-nz-1+HZ, gx+nx+1+HX,21,gz+nz+1+HZ, 18);
  box(gx-1+HX,19,gz-1+HZ, gx+1+HX,19,gz+1+HZ, 17);
  setV(gx+HX,18,gz+HZ,44);
  addPOI({id:'plant', name:'月壤处理厂「舂月」', en:'REGOLITH PROCESSING', hit:{x:40,y:b+5,z:-14,r:10,h:14},
    desc:'把月壤倒进去，出来的是氧气和建材。窗外的装料龙门横跨铁路，矿卡列车直接从它肚子底下接货，哐当哐当运往车站。',
    pos:new THREE.Vector3(40, b+12, -14)});
}
/* 集装箱场「补给」+ 门式起重机 */
function buildYard(){
  var cx=24+HX, cz=38+HZ, b=BASE_Y;
  box(cx-11,b,cz-10, cx+11,b,cz+10, 13);
  var cols=[33,34,35,36,15,18];
  for(var s=0;s<8;s++){
    var px=cx-8+(s%4)*5, pz=cz-6+Math.floor(s/4)*6;
    var n=2+Math.floor(hash3(s,7,3)*3);
    for(var k=0;k<n;k++){
      box(px-2,b+1+k*2,pz-1, px+1,b+2+k*2,pz+1, cols[(s+k)%cols.length]);
    }
  }
  /* 起重机门架（动态部分在实体里） */
  box(cx-9,b+1,cz-8, cx-8,b+14,cz-7, 18);
  box(cx+8,b+1,cz-8, cx+9,b+14,cz-7, 18);
  box(cx+8,b+1,cz+7, cx+9,b+14,cz+7, 18);
  box(cx-8,b+1,cz+7, cx-9,b+14,cz+7, 18);
  box(cx-9,b+14,cz-8, cx+9,b+15,cz-7, 17);
  box(cx-9,b+14,cz+7, cx+9,b+15,cz+8, 17);
  setV(cx-8,b+16,cz-7,40); setV(cx+8,b+16,cz+7,40);
  addPOI({id:'yard', name:'集装箱场「补给」', en:'SUPPLY YARD & CRANE', hit:{x:24,y:b+7,z:38,r:12,h:16},
    desc:'来自地球的补给在这里集散，门式起重机日夜吊运彩色集装箱。每次货运抵达，都是全基地的节日——新鲜咖啡豆永远最先被抢光。',
    pos:new THREE.Vector3(24, b+16, 38)});
}
/* 通信「深空网」 */
var dishGroups=[];
function buildComms(){
  var cx=18+HX, cz=-12+HZ, b=BASE_Y;
  box(cx-6,b,cz-5, cx+6,b,cz+5, 14);
  box(cx+4,b+1,cz+2, cx+4,b+12,cz+2, 17);
  setV(cx+4,b+13,cz+2,40); setV(cx+4,b+11,cz+2,41);
  box(cx-5,b+1,cz-3, cx-2,b+3,cz+1, 32);
  setV(cx-3,b+4,cz-1,39);
  /* 碟形天线基座（碟面是动态实体，会转动） */
  cyl(cx-2,cz-2, b+1, b+3, 1.6, 17);
  cyl(cx+2,cz+3, b+1, b+3, 1.6, 17);
  addPOI({id:'comms', name:'通信阵列「深空网」', en:'DEEP SPACE NETWORK', hit:{x:18,y:b+6,z:-12,r:8,h:12},
    desc:'两面碟形天线缓缓转动，对准 38 万公里外的地球。深空网在戈德斯通、马德里和堪培拉各有一座 70 米大锅接力，信号单程只要 1.3 秒——比火星仁慈多了。',
    pos:new THREE.Vector3(18, b+11, -12)});
}
/* 纪念碑广场：铭牌 + 星条旗 + 脚印 + 激光反射器 */
function buildMemorial(){
  var b=BASE_Y;
  /* 铭牌 */
  var cx=-14+HX, cz=-4+HZ;
  box(cx-2,b,cz-1, cx+2,b,cz+1, 14);
  box(cx-2,b+1,cz, cx+2,b+4,cz, 16);
  setV(cx-1,b+3,cz-0,24); setV(cx+1,b+3,cz,24); setV(cx,b+2,cz,24);
  /* 星条旗：蓝区 + 红白条 */
  var fx=-10+HX, fz=-6+HZ;
  box(fx,b,fz, fx,b+9,fz, 25);
  for(var x=1;x<=7;x++) for(var y=0;y<=4;y++){
    var c;
    if(x<=3 && y<=2){ c=37; }
    else { c=(y%2===0)?23:25; }
    setV(fx+x, b+9-y, fz, c);
  }
  setV(fx+1,b+9,fz,25); setV(fx+2,b+8,fz,25); setV(fx+1,b+7,fz,25); setV(fx+3,b+9,fz,25);
  /* 脚印（向纪念碑走去） */
  for(var i=0;i<6;i++){
    paintW(-20+i*1.6, -1+((i%2)?0.7:-0.7), 5);
  }
  /* 激光反射器 */
  var rx=-20+HX, rz=-9+HZ;
  box(rx-1,b,rz-1, rx+1,b,rz+1, 14);
  box(rx-1,b+1,rz-1, rx+1,b+2,rz+1, 25);
  setV(rx-1,b+3,rz-1,45); setV(rx+1,b+3,rz-1,45);
  setV(rx-1,b+3,rz+1,45); setV(rx+1,b+3,rz+1,45);
  setV(rx,b+3,rz,42);
  addPOI({id:'flag', name:'阿波罗纪念广场', en:'APOLLO MEMORIAL', hit:{x:-15,y:b+4,z:-5,r:9,h:11},
    desc:'铭牌上写着 1969 年那句话：HERE MEN FROM THE PLANET EARTH FIRST SET FOOT UPON THE MOON。旁边是星条旗、一串靴印，和一台激光反射器——阿波罗 11 留下的那台，直到今天还在接收地球发来的激光测距。',
    pos:new THREE.Vector3(-13, b+8, -5)});
}
/* 泛光塔×6 */
function buildFloods(){
  for(var i=0;i<6;i++){
    var a=(30+i*60)*Math.PI/180;
    var x=Math.round(Math.cos(a)*50), z=Math.round(Math.sin(a)*50);
    var t=colTopW(x,z); if(t<0) continue;
    var vx=x+HX, vz=z+HZ;
    box(vx,t+1,vz, vx,t+8,vz, 17);
    box(vx-1,t+9,vz-1, vx+1,t+9,vz+1, 16);
    setV(vx-1,t+10,vz,45); setV(vx+1,t+10,vz,45);
    setV(vx,t+10,vz-1,45); setV(vx,t+10,vz+1,44);
  }
}
/* 环线铁路 + 静海站 */
function buildRail(){
  var R=62, y=14, a;
  for(a=0;a<TAU;a+=0.5/R){
    var x=Math.round(Math.cos(a)*R)+HX, z=Math.round(Math.sin(a)*R)+HZ;
    var x2=Math.round(Math.cos(a)*(R-1.4))+HX, z2=Math.round(Math.sin(a)*(R-1.4))+HZ;
    setV(x,y,z,26); setV(x2,y,z2,26);
    if(Math.floor(a*R)%3===0) box(x2,y-1,z2, x,y-1,z, 27);
  }
  for(a=0;a<TAU;a+=TAU/36){
    var px=Math.round(Math.cos(a)*R), pz=Math.round(Math.sin(a)*R);
    var t=colTopW(px,pz); if(t<0) t=1;
    box(px+HX,t+1,pz+HZ, px+HX,y-2,pz+HZ, 16);
    box(px-1+HX,y-2,pz+HZ, px+1+HX,y-1,pz+HZ, 14);
  }
  /* 静海站（正前方） */
  var sx=0, sz=R;
  box(sx-6+HX,y-1,sz-3+HZ, sx+6+HX,y-1,sz+3+HZ, 14);
  box(sx-5+HX,y,sz+2+HZ, sx-5+HX,y+4,sz+2+HZ, 16);
  box(sx+5+HX,y,sz+2+HZ, sx+5+HX,y+4,sz+2+HZ, 16);
  box(sx-6+HX,y+5,sz-3+HZ, sx+6+HX,y+5,sz+3+HZ, 15);
  setV(sx-4+HX,y+1,sz+2+HZ,44); setV(sx+4+HX,y+1,sz+2+HZ,44);
  box(sx-3+HX,y+3,sz+2+HZ, sx+3+HX,y+3,sz+2+HZ, 42);
  addPOI({id:'station', name:'静海站', en:'TRANQUILITY STATION', hit:{x:0,y:y+1,z:62,r:8,h:8},
    desc:'环线在正前方的小站，月台的青白色灯带整夜亮着。矿卡列车每绕一圈都在这里停 20 秒，卸下去处理厂的矿石，装上要送去穹顶的补给。',
    pos:new THREE.Vector3(0, y+7, 62)});
  addPOI({id:'rail', name:'环线铁路「转运」', en:'ORBITAL TRAM LINE', hit:{x:40,y:y,z:47,r:8,h:8},
    desc:'绕基地一圈的高架环线，矿卡列车（车头 + 四节矿石车）昼夜不停地跑。点击列车本体可以让相机跟着它跑一整圈。',
    pos:new THREE.Vector3(40, y+5, 47)});
}
function buildPerimeter(){
  for(var i=0;i<14;i++){
    var a=i/14*TAU+0.22;
    var x=Math.round(Math.cos(a)*55), z=Math.round(Math.sin(a)*55);
    var t=colTopW(x,z); if(t<0) continue;
    box(x+HX,t+1,z+HZ, x+HX,t+2,z+HZ, 17);
    setV(x+HX,t+3,z+HZ, 44);
  }
}

/* ---------------- 5. 网格输出（逐顶点 AO） ---------------- */
var FACE_SHADE = [0.82,0.82, 1.0,0.55, 0.72,0.72];
var AO_MUL = [0.45, 0.62, 0.8, 1.0];
var FV=[
  [[1,0,1],[1,0,0],[1,1,0],[1,1,1]],
  [[0,0,0],[0,0,1],[0,1,1],[0,1,0]],
  [[0,1,1],[1,1,1],[1,1,0],[0,1,0]],
  [[0,0,0],[1,0,0],[1,0,1],[0,0,1]],
  [[0,0,1],[1,0,1],[1,1,1],[0,1,1]],
  [[1,0,0],[0,0,0],[0,1,0],[1,1,0]]
];
var DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
/* 每个面每个顶点的两条切向偏移（用于 AO 三邻域） */
var AO_T=[
  [[[0,-1,0],[0,0,1]], [[0,-1,0],[0,0,-1]], [[0,1,0],[0,0,-1]], [[0,1,0],[0,0,1]]],
  [[[0,-1,0],[0,0,-1]], [[0,-1,0],[0,0,1]], [[0,1,0],[0,0,1]], [[0,1,0],[0,0,-1]]],
  [[[-1,0,0],[0,0,1]], [[1,0,0],[0,0,1]], [[1,0,0],[0,0,-1]], [[-1,0,0],[0,0,-1]]],
  [[[-1,0,0],[0,0,-1]], [[1,0,0],[0,0,-1]], [[1,0,0],[0,0,1]], [[-1,0,0],[0,0,1]]],
  [[[-1,0,0],[0,-1,0]], [[1,0,0],[0,-1,0]], [[1,0,0],[0,1,0]], [[-1,0,0],[0,1,0]]],
  [[[1,0,0],[0,-1,0]], [[-1,0,0],[0,-1,0]], [[-1,0,0],[0,1,0]], [[1,0,0],[0,1,0]]]
];
function emitWorld(){
  var pos=[],nor=[],col=[],idx=[], gpos=[],gnor=[],gcol=[],gidx=[];
  for(var y=0;y<H;y++) for(var z=0;z<D;z++) for(var x=0;x<W;x++){
    var i=vid(x,y,z);
    if(!solid[i]) continue;
    var ci=colr[i], glow=PAL[ci].g;
    var shade=0.92+hash3(x,y,z)*0.14;
    for(var d=0;d<6;d++){
      var nx=x+DIRS[d][0], ny=y+DIRS[d][1], nz=z+DIRS[d][2];
      if(getSolid(nx,ny,nz)) continue;
      var c=PALC[ci];
      var m0 = glow? (0.94+hash3(x,y,z)*0.12) : shade*FACE_SHADE[d];
      var P,N,K,I;
      if(glow){ P=gpos;N=gnor;K=gcol;I=gidx; } else { P=pos;N=nor;K=col;I=idx; }
      var base=P.length/3, v=FV[d], nrm=DIRS[d], at=AO_T[d];
      for(var k=0;k<4;k++){
        var mm=m0;
        if(!glow){
          var t1=at[k][0], t2=at[k][1];
          var s1=getSolid(x+nrm[0]+t1[0], y+nrm[1]+t1[1], z+nrm[2]+t1[2])?1:0;
          var s2=getSolid(x+nrm[0]+t2[0], y+nrm[1]+t2[1], z+nrm[2]+t2[2])?1:0;
          var cc=getSolid(x+nrm[0]+t1[0]+t2[0], y+nrm[1]+t1[1]+t2[1], z+nrm[2]+t1[2]+t2[2])?1:0;
          var ao=(s1&&s2)?0:3-(s1+s2+cc);
          mm*=AO_MUL[ao];
        }
        P.push(x+v[k][0]-HX+0.5, y+v[k][1], z+v[k][2]-HZ+0.5);
        N.push(nrm[0],nrm[1],nrm[2]);
        K.push(c.r*mm, c.g*mm, c.b*mm);
      }
      I.push(base,base+1,base+2, base,base+2,base+3);
    }
  }
  return {pos:pos,nor:nor,col:col,idx:idx, gpos:gpos,gnor:gnor,gcol:gcol,gidx:gidx};
}

/* ---------------- 6. 动态体素模型 ---------------- */
function buildBoxMesh(specs, opts){
  opts=opts||{};
  var pos=[],nor=[],col=[];
  for(var s=0;s<specs.length;s++){
    var sp=specs[s], c=PALC[sp[6]];
    var glow=PAL[sp[6]].g;
    if(!!opts.glowOnly !== !!glow) continue;
    var shade=0.92+hash3(sp[0],sp[1],sp[2])*0.16;
    for(var d=0;d<6;d++){
      var m = glow? 1 : shade*FACE_SHADE[d];
      var v=FV[d], nrm=DIRS[d];
      for(var k=0;k<4;k++){
        pos.push( sp[0]+v[k][0]*(sp[3]-sp[0]+1), sp[1]+v[k][1]*(sp[4]-sp[1]+1), sp[2]+v[k][2]*(sp[5]-sp[2]+1) );
        nor.push(nrm[0],nrm[1],nrm[2]);
        col.push(c.r*m, c.g*m, c.b*m);
      }
    }
  }
  var geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos),3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor),3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col),3));
  var tri=[];
  for(var q=0;q<pos.length/3;q+=4){ tri.push(q,q+1,q+2, q,q+2,q+3); }
  geo.setIndex(tri);
  var mat = opts.glowOnly
    ? new THREE.MeshBasicMaterial({vertexColors:true})
    : new THREE.MeshLambertMaterial({vertexColors:true});
  var mesh=new THREE.Mesh(geo,mat);
  mesh.castShadow=!opts.glowOnly;
  return mesh;
}
function buildModel(specs){
  var g=new THREE.Group();
  g.add(buildBoxMesh(specs,{glowOnly:false}));
  g.add(buildBoxMesh(specs,{glowOnly:true}));
  return g;
}

/* ---------------- 7. 场景 / 房间 ---------------- */
var canvas=document.getElementById('c');
var renderer=new THREE.WebGLRenderer({canvas:canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.6));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;

var scene=new THREE.Scene();
scene.background=C(0x020308);
scene.fog=new THREE.Fog(0x020308, 520, 1500);
var camera=new THREE.PerspectiveCamera(46, window.innerWidth/window.innerHeight, 0.5, 1400);

var sun=new THREE.DirectionalLight(0xfff3e2, 1.3);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-130; sun.shadow.camera.right=130;
sun.shadow.camera.top=130; sun.shadow.camera.bottom=-130;
sun.shadow.camera.near=20; sun.shadow.camera.far=520;
sun.shadow.bias=-0.0006;
scene.add(sun); scene.add(sun.target);
var hemi=new THREE.HemisphereLight(0x8aa8d8, 0x3a3630, 0.4);
scene.add(hemi);
var amb=new THREE.AmbientLight(0x38404c, 0.2);
scene.add(amb);
/* 基地夜间点光 */
var plTower=new THREE.PointLight(0x8fe6ff, 0, 52, 2); plTower.position.set(0, BASE_Y+20, -30); scene.add(plTower);
var plPlaza=new THREE.PointLight(0xffc46b, 0, 44, 2); plPlaza.position.set(0, BASE_Y+10, 2); scene.add(plPlaza);
var plPad=new THREE.PointLight(0xf2f6ff, 0, 44, 2); plPad.position.set(36, BASE_Y+10, -36); scene.add(plPad);
var plGrow=new THREE.PointLight(0xff70d8, 0, 24, 2); plGrow.position.set(-1, BASE_Y+5, 33); scene.add(plGrow);
var plFlame=new THREE.PointLight(0xff9040, 0, 36, 2); scene.add(plFlame);

/* 深空：银河天穹 + 地球（潮汐锁定，固定不动） */
var skyUni2={
  sunDir:{value:new THREE.Vector3(0,1,0)},
  sunVis:{value:1.0}
};
var skyDome2=(function(){
  var mat=new THREE.ShaderMaterial({
    uniforms:skyUni2, side:THREE.BackSide, depthWrite:false, fog:false,
    vertexShader:[
      'varying vec3 vDir;',
      'void main(){ vDir=normalize(position);',
      ' gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }'
    ].join('\n'),
    fragmentShader:[
      'uniform vec3 sunDir;',
      'uniform float sunVis;',
      'varying vec3 vDir;',
      'float hash13(vec3 p){ p=fract(p*0.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }',
      'float vnoise(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);',
      ' float a=hash13(i), b=hash13(i+vec3(1,0,0)), c=hash13(i+vec3(0,1,0)), d=hash13(i+vec3(1,1,0));',
      ' float e=hash13(i+vec3(0,0,1)), f2=hash13(i+vec3(1,0,1)), g=hash13(i+vec3(0,1,1)), h=hash13(i+vec3(1,1,1));',
      ' return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y), mix(mix(e,f2,f.x),mix(g,h,f.x),f.y), f.z); }',
      'void main(){',
      ' vec3 d=normalize(vDir);',
      ' vec3 col=vec3(0.012,0.014,0.026);',
      // 星野（两层）
      ' vec3 sp=d*230.0; vec3 cell=floor(sp); float h=hash13(cell);',
      ' float star=smoothstep(0.994,0.999,h);',
      ' vec3 scol=mix(vec3(1.0), vec3(0.72,0.82,1.0), step(0.5,hash13(cell+7.0)));',
      ' scol=mix(scol, vec3(1.0,0.85,0.62), step(0.86,hash13(cell+13.0)));',
      ' col+=scol*star*(0.45+0.55*hash13(cell+3.0));',
      ' vec3 sp2=d*90.0; vec3 cell2=floor(sp2); float h2=hash13(cell2+5.0);',
      ' col+=vec3(0.9,0.95,1.0)*smoothstep(0.9965,0.9995,h2)*1.1;',
      // 银河带
      ' vec3 mwN=normalize(vec3(0.42,1.0,0.28));',
      ' float bd=dot(d,mwN);',
      ' float band=exp(-bd*bd*16.0);',
      ' float n=vnoise(d*9.0)*0.6+vnoise(d*23.0)*0.4;',
      ' float lanes=vnoise(d*14.0+31.0);',
      ' vec3 mwCol=mix(vec3(0.10,0.12,0.22), vec3(0.38,0.40,0.55), n);',
      ' col+=mwCol*band*(0.55+n*0.9);',
      ' col-=vec3(0.035,0.035,0.05)*band*smoothstep(0.58,0.85,lanes);',
      // 太阳
      ' float s=max(dot(d,normalize(sunDir)),0.0);',
      ' col+=vec3(1.0,0.98,0.92)*pow(s,3000.0)*3.0*sunVis;',
      ' col+=vec3(0.9,0.85,0.7)*pow(s,60.0)*0.32*sunVis;',
      ' gl_FragColor=vec4(col,1.0);',
      '}'
    ].join('\n')
  });
  var m=new THREE.Mesh(new THREE.SphereGeometry(900,48,28), mat);
  m.renderOrder=-10;
  scene.add(m);
  return m;
})();
function earthSphereTex(){
  var cv=document.createElement('canvas'); cv.width=256; cv.height=128;
  var g=cv.getContext('2d');
  g.fillStyle='#2456a0'; g.fillRect(0,0,256,128);
  for(var x=0;x<256;x+=2) for(var y=0;y<128;y+=2){
    var nx=Math.min(x,256-x);
    var n=noise2(nx*0.045,y*0.06)+noise2(nx*0.11+40,y*0.13)*0.5;
    var col=null;
    if(y<16||y>112) col='#e8f0f4';
    else if(n>0.34) col= noise2(nx*0.3,y*0.3)>0.1?'#3f7a3a':'#8a7a4a';
    else if(n>0.24) col='#5a8a4a';
    else if(n<-0.3) col='#1c3a6e';
    if(noise2(nx*0.2+80,y*0.2+11)>0.46) col='#dfe8ee';
    if(col){ g.fillStyle=col; g.fillRect(x,y,2,2); }
  }
  var tex=new THREE.CanvasTexture(cv);
  return tex;
}
var earthMesh=null, earthL=null;
var EARTH_DIR=new THREE.Vector3(0.55,0.5,-0.6).normalize();
function buildSpace(){
  earthMesh=new THREE.Mesh(new THREE.SphereGeometry(30,24,18),
    new THREE.MeshBasicMaterial({map:earthSphereTex(), fog:false}));
  earthMesh.position.copy(EARTH_DIR).multiplyScalar(520);
  scene.add(earthMesh);
  var glowTex=radialTex('rgba(140,180,255,0.55)','rgba(140,180,255,0)');
  var glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex, color:0x8cb8ff, transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, depthWrite:false, fog:false}));
  glow.scale.set(130,130,1);
  glow.position.copy(EARTH_DIR).multiplyScalar(528);
  scene.add(glow);
  /* 地照（地球反照的微蓝填充光） */
  earthL=new THREE.DirectionalLight(0x7fa8d8, 0);
  earthL.position.copy(EARTH_DIR).multiplyScalar(200);
  scene.add(earthL); scene.add(earthL.target);
}

/* ---------------- 8. 动态实体 ---------------- */
var RAIL_R=62, RAIL_Y=14;

/* 矿卡列车（车头 + 4 节矿石车） */
var train=(function(){
  var g=new THREE.Group(); scene.add(g);
  var cars=[];
  function loco(){
    var s=[];
    s.push([-1,0,-3, 1,2,2, 28]);
    s.push([-1,3,-2, 1,3,2, 16]);
    s.push([-1,1,-3, 1,1,-3, 17]);
    s.push([-1,0,-3, 1,0,-3, 26]);
    s.push([-1,2,-2, -1,2,2, 39]); s.push([1,2,-2, 1,2,2, 39]);
    s.push([-1,1,-1, 1,1,1, 29]);
    s.push([-1,0,-4, 1,1,-4, 28]); s.push([-1,1,-4, 0,1,-4, 45]);
    s.push([0,4,0, 0,4,0, 40]);
    var m=buildModel(s); g.add(m); cars.push(m); return m;
  }
  function oreCar(){
    var s=[];
    s.push([-1,0,-2, 1,1,2, 17]);
    s.push([-1,2,-2, -1,2,2, 16]); s.push([1,2,-2, 1,2,2, 16]);
    s.push([-1,2,-2, 1,2,-2, 16]); s.push([-1,2,2, 1,2,2, 16]);
    s.push([-1,0,-2, 1,0,-2, 26]);
    s.push([-1,2,-1, 1,2,1, 6]);
    s.push([0,3,0, 0,3,0, 10]);
    var m=buildModel(s); g.add(m); cars.push(m); return m;
  }
  loco(); for(var i=0;i<4;i++) oreCar();
  return {group:g, cars:cars, ang:0, speed:0.04};
})();

/* 星舰 HLS */
var rocket=(function(){
  var s=[];
  s.push([-1,0,-1, 1,15,1, 15]);
  s.push([-1,6,-1, 1,6,1, 25]);
  s.push([-1,12,-1, 1,12,1, 25]);
  s.push([0,16,0, 0,17,0, 16]);
  s.push([0,18,0, 0,18,0, 25]);
  s.push([-2,0,0, -2,4,0, 17]); s.push([2,0,0, 2,4,0, 17]);
  s.push([0,0,-2, 0,4,-2, 17]); s.push([0,0,2, 0,4,2, 17]);
  s.push([-1,-1,-1, 1,-1,1, 17]);
  s.push([0,-2,0, 0,-2,0, 46]);
  s.push([-1,14,-1, 1,14,1, 39]);
  var g=buildModel(s);
  g.position.set(36, BASE_Y+3, -36);
  g.children[1].visible=false;
  scene.add(g);
  return {group:g, state:'idle', t:0};
})();

/* LRV 月面越野车 */
function makeLRV(){
  var s=[];
  s.push([-2,1,-1, 2,1,1, 16]);
  s.push([-2,2,0, -2,2,0, 17]); s.push([2,2,0, 2,2,0, 17]);
  s.push([-1,2,-1, 1,2,-1, 17]);
  s.push([-2,0,-2, -2,1,-2, 10]); s.push([2,0,-2, 2,1,-2, 10]);
  s.push([-2,0,2, -2,1,2, 10]); s.push([2,0,2, 2,1,2, 10]);
  s.push([-2,1,-2, -2,1,-2, 18]); s.push([2,1,-2, 2,1,-2, 18]);
  s.push([-2,1,2, -2,1,2, 18]); s.push([2,1,2, 2,1,2, 18]);
  s.push([0,3,-1, 0,4,-1, 17]);
  s.push([-1,5,-1, 1,5,-1, 16]);
  s.push([-1,5,-2, -1,5,-2, 39]); s.push([1,5,-2, 1,5,-2, 39]);
  s.push([0,3,1, 0,3,2, 25]);
  s.push([1,4,1, 2,4,1, 25]);
  s.push([-2,2,-2, -2,2,-2, 45]); s.push([2,2,-2, 2,2,-2, 45]);
  var m=buildModel(s);
  scene.add(m);
  return m;
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
  var s=[];
  s.push([-1,1,-1, 1,2,1, 15]); s.push([0,3,0, 0,3,0, 16]);
  s.push([-2,0,-2, -2,1,-2, 17]); s.push([2,0,-2, 2,1,-2, 17]);
  s.push([-2,0,2, -2,1,2, 17]); s.push([2,0,2, 2,1,2, 17]);
  s.push([-1,0,-1, 1,0,1, 10]);
  s.push([0,1,-1, 0,1,-1, 39]); s.push([0,4,0, 0,4,0, 40]);
  s.push([0,0,0, 0,0,0, 44]);
  var g=buildModel(s);
  g.position.set(54, BASE_Y+2, 0);
  scene.add(g);
  return {group:g, state:'idle', t:0, from:[54,0], to:[14,50], at:'A'};
})();

/* 无人机 */
var drone=(function(){
  var s=[];
  s.push([0,0,0, 0,0,0, 17]);
  s.push([-1,0,0, 1,0,0, 16]); s.push([0,0,-1, 0,0,1, 16]);
  s.push([-1,1,0, -1,1,0, 40]); s.push([1,1,0, 1,1,0, 41]);
  s.push([0,1,-1, 0,1,-1, 41]); s.push([0,1,1, 0,1,1, 40]);
  var g=buildModel(s);
  g.position.set(0, BASE_Y+22, -24);
  scene.add(g);
  return {group:g, ang:0};
})();

/* 宇航员（阿波罗式） */
function makeAstronaut(){
  var g=new THREE.Group();
  var bodyS=[];
  bodyS.push([-1,2,-1, 1,4,0, 15]);
  bodyS.push([-1,4,-1, 1,4,0, 24]);
  bodyS.push([-1,5,-1, 1,5,0, 15]);
  bodyS.push([-1,2,1, 1,4,1, 16]);
  bodyS.push([0,6,0, 0,6,0, 39]);
  g.add(buildModel(bodyS));
  function limb(){
    var m=buildModel([[0,-2,0, 0,0,0, 15]]);
    var piv=new THREE.Group();
    piv.add(m);
    return piv;
  }
  var armL=limb(), armR=limb(), legL=limb(), legR=limb();
  armL.position.set(-2,4,0); armR.position.set(2,4,0);
  legL.position.set(-1,2,0); legR.position.set(1,2,0);
  g.add(armL); g.add(armR); g.add(legL); g.add(legR);
  scene.add(g);
  return {group:g, armL:armL, armR:armR, legL:legL, legR:legR, wave:0};
}
var astros=[
  {o:makeAstronaut(), kind:'wave', home:[-12,-1]},
  {o:makeAstronaut(), kind:'walk', home:[0,0], u:0},
  {o:makeAstronaut(), kind:'walk2', home:[0,0], u:0.45},
  {o:makeAstronaut(), kind:'work', home:[36,-9]}
];
var WALK_ROUTE=[[-20,0],[-12,12],[-6,26],[2,14],[8,2],[0,-8],[-20,0]];
var WALK2_ROUTE=[[-8,30],[6,36],[2,20],[-10,14],[-8,30]];

/* 起重机（动态） */
var crane=(function(){
  var g=new THREE.Group(); scene.add(g);
  var beam=buildBoxMesh([[-8,0,0, 8,1,1, 18]],{glowOnly:false});
  beam.position.set(24, BASE_Y+13, 38); g.add(beam);
  var trolley=buildBoxMesh([[-1,0,0, 1,0,1, 17],[0,-1,0, 0,-1,0, 44]],{glowOnly:false});
  var cable=new THREE.Mesh(new THREE.BoxGeometry(0.25,1,0.25), new THREE.MeshLambertMaterial({color:C(0x333333)}));
  var hookBox=buildBoxMesh([[0,0,0, 0,0,0, 24]],{glowOnly:false});
  var loadBox=buildBoxMesh([[-2,0,-1, 1,1,1, 34]],{glowOnly:false});
  g.add(trolley); g.add(cable); g.add(hookBox); g.add(loadBox);
  return {group:g, beam:beam, trolley:trolley, cable:cable, hook:hookBox, load:loadBox, t:0};
})();

/* 采矿机器人「掘进」 */
var miner=(function(){
  var g=new THREE.Group(); scene.add(g);
  var baseS=[];
  baseS.push([-2,0,-1, 2,1,1, 17]);
  baseS.push([-2,0,-2, -2,0,2, 10]); baseS.push([2,0,-2, 2,0,2, 10]);
  baseS.push([-1,2,-1, 1,3,1, 18]);
  baseS.push([0,4,0, 0,4,0, 44]);
  g.add(buildModel(baseS));
  var arm=new THREE.Group();
  var armM=buildBoxMesh([[0,0,0, 0,0,4, 18],[0,-1,4, 0,0,4, 17]],{glowOnly:false});
  arm.add(armM);
  arm.position.set(0, 3, -1);
  g.add(arm);
  g.position.set(-56, 8, -40);
  g.rotation.y=0.8;
  return {group:g, arm:arm};
})();

/* 旋转碟形天线×2 */
function makeDish(wx,wz,ry){
  var g=new THREE.Group();
  var s=[];
  for(var ring=0;ring<4;ring++){
    var rr=1.2+ring*0.95, yy=ring;
    for(var x=-Math.ceil(rr);x<=Math.ceil(rr);x++) for(var z=-Math.ceil(rr);z<=Math.ceil(rr);z++){
      var d=Math.sqrt(x*x+z*z);
      if(d<=rr && d>rr-1.1) s.push([x,yy,z,x,yy,z, ring===3?25:15]);
    }
  }
  s.push([0,1,1, 0,2,1, 17]);
  s.push([0,2,1, 0,2,1, 39]);
  g.add(buildModel(s));
  g.rotation.x=-0.6;
  g.position.set(wx, BASE_Y+4, wz);
  var piv=new THREE.Group();
  piv.add(g);
  piv.rotation.y=ry;
  scene.add(piv);
  return piv;
}
var dish1, dish2;
/* ---------------- 9. 粒子 ---------------- */
function radialTex(inner, outer){
  var cv=document.createElement('canvas'); cv.width=cv.height=64;
  var g=cv.getContext('2d');
  var gr=g.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,inner); gr.addColorStop(1,outer);
  g.fillStyle=gr; g.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(cv);
}
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
/* 流星（房间上方的「全息天幕」） */
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
      mt.m.position.set(Math.cos(a)*rrange(60,160), rrange(70,130), Math.sin(a)*rrange(60,160)-40);
      mt.vel.set(rrange(-1,1), -rrange(0.4,0.8), rrange(-1,1)).normalize().multiplyScalar(rrange(70,120));
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
  var t=colTopW(wx,wz);
  return t<0?0:t+1;
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
var camT=new THREE.Vector3(0,8,0), camYaw=0, camPitch=0.3, camDist=128;
var camAnim=null, followObj=null, lastInput=0;
var PRESETS=[
  {y:0,    p:0.3,  d:128, t:[0,8,0]},
  {y:-0.78,p:0.28, d:62,  t:[36,10,-36]},
  {y:0.35, p:0.26, d:50,  t:[0,14,-30]},
  {y:2.5,  p:0.3,  d:55,  t:[-27,8,11]},
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
  var cd=clamp(camDist,8,560);
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
  camDist=clamp(camDist*(1+Math.sign(e.deltaY)*0.09), 8, 560);
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
  var plane=new THREE.Plane(new THREE.Vector3(0,1,0), -BASE_Y);
  var pt=new THREE.Vector3();
  if(ray.ray.intersectPlane(plane, pt) && Math.hypot(pt.x,pt.z)<92){
    for(var i=0;i<6;i++) puff(pt.x, pt.y+1, pt.z, 0x9aa0aa, rrange(2,4), rrange(1,1.8), rrange(1.5,3), 0.4);
    AU.noise(0.25, 500, 0.08);
  }
}
var lightsOn=true, growOn=false, patrolOn=true;
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
  }
}
var ents={};
function activateEnt(ent){
  if(ent.kind==='astro'){
    ent.o.wave=3.2;
    flyTo(camYaw, 0.18, 13, ent.o.group.position.clone().add(new THREE.Vector3(0,3,0)), 1.2);
    AU.beep(880,0.1,'square',0.05);
    showInspect({name:'舱外宇航员', en:'EVA ASTRONAUT', desc:'穿着阿波罗式白色舱外服的宇航员，金色面窗后冲你挥手。出舱必须两人同行——这是用教训换来的规矩。',
      stat:function(){ return '状态：挥手致意中 · suit O₂ 98%'; }});
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
var labelsOn=true;
function updateLabels(){
  var w=window.innerWidth, h=window.innerHeight;
  var v=new THREE.Vector3();
  for(var i=0;i<POIS.length;i++){
    var el=labelEls[i];
    if(!labelsOn){ el.style.display='none'; continue; }
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
  document.getElementById('bPause').innerHTML=v?'▶ 继续':'⏸ 暂停';
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
var dayT=0.33, simT=0, dayCount=1, lastDayT=0.33, DAY_LEN=200;
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
  sun.intensity=1.35*dayF*stormDim;
  sun.color.copy(C(0xfff3e2)).lerp(C(0xffd9b0), 1-dayF);
  hemi.intensity=lerp(0.08,0.4,dayF);
  amb.intensity=lerp(0.12,0.22,dayF);
  /* 深空天穹：太阳方位 + 地照 */
  skyUni2.sunDir.value.copy(sunDirV);
  skyUni2.sunVis.value=dayF;
  if(earthL) earthL.intensity=0.08*(1-dayF);
  /* 基地夜灯 */
  var nl=sstep(0.12,-0.03,se)*(lightsOn?1:0);
  plTower.intensity=nl*1.2; plPlaza.intensity=nl*1.0; plPad.intensity=nl*1.1;
  plGrow.intensity=(growOn?1.2:0)*Math.max(nl, growOn?0.55:0);
  /* 时钟：月昼/月夜 */
  var hh=Math.floor(dayT*24), mm=Math.floor((dayT*24-hh)*60);
  var phase=(dayT>0.02&&dayT<0.52)?'月昼':'月夜';
  var txt=phase+' '+dayCount+' · '+(hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm;
  var el=document.getElementById('clock');
  if(el.textContent!==txt) el.textContent=txt;
  if(cycleOn) document.getElementById('time').value=Math.round(dayT*1000);
  return {dayF:dayF};
}

/* ---------------- 15. 实体更新 ---------------- */
var trainState={mode:'run', t:0};
function updateTrain(dt){
  /* 到静海站（角度 π/2）停靠 4 秒 */
  var stationA=Math.PI/2;
  var dAng=Math.abs(((train.ang-stationA)%TAU+TAU)%TAU);
  if(dAng>Math.PI) dAng=TAU-dAng;
  var sp=train.speed;
  if(trainState.mode==='run' && dAng<0.05){ trainState.mode='stop'; trainState.t=4; AU.beep(440,0.15,'square',0.04); }
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
    c.position.set(Math.cos(a)*RAIL_R, RAIL_Y+1, Math.sin(a)*RAIL_R);
    c.rotation.y=-a-Math.PI/2;
  }
}
function updateRovers(dt){
  for(var i=0;i<rovers.length;i++){
    var r=rovers[i];
    if(patrolOn){
      r.u=(r.u + dt*0.007)%1;
      var p=routePos(r.u);
      r.m.position.set(p.x, terrainTopWorld(p.x,p.z)+0.4+Math.sin(simT*6+i)*0.06, p.z);
      r.m.rotation.y=p.yaw;
      if(Math.random()<dt*3) puff(p.x-Math.sin(p.yaw)*2, terrainTopWorld(p.x,p.z)+0.5, p.z-Math.cos(p.yaw)*2, 0x9aa0aa, rrange(0.8,1.6), rrange(0.6,1.2), rrange(0.5,1.2), 0.3);
    } else {
      var pk=i? [30,21]:[22,15];
      r.m.position.lerp(new THREE.Vector3(pk[0], terrainTopWorld(pk[0],pk[1])+0.4, pk[1]), dt*1.2);
      r.m.rotation.y=lerp(r.m.rotation.y, Math.PI, dt*2);
    }
  }
}
function updateHopper(dt){
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
  g.children[1].visible = (rocket.state==='up'||rocket.state==='down');
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
  /* 挥手者（纪念广场） */
  var a0=astros[0];
  a0.o.group.position.set(a0.home[0], terrainTopWorld(a0.home[0],a0.home[1]), a0.home[1]);
  a0.o.group.rotation.y=Math.sin(simT*0.4)*0.6+2.4;
  if(a0.o.wave>0) a0.o.wave-=dt;
  var w=a0.o.wave>0? 1 : (Math.sin(simT*0.5)>0.55?0.6:0);
  a0.o.armR.rotation.z = -Math.PI*0.8*w + Math.sin(simT*7)*0.5*w;
  a0.o.armL.rotation.z = 0.12;
  /* 步行者 ×2 */
  for(var k=1;k<=2;k++){
    var A=astros[k], wp=k===1?WALK_ROUTE:WALK2_ROUTE, sp=k===1?0.02:0.03;
    A.u=(A.u+dt*sp)%1;
    var fi=A.u*(wp.length-1), i0=Math.floor(fi), ft=fi-i0;
    var x=lerp(wp[i0][0], wp[i0+1][0], ft), z=lerp(wp[i0][1], wp[i0+1][1], ft);
    A.o.group.position.set(x, terrainTopWorld(x,z)+Math.abs(Math.sin(simT*5+k))*0.18, z);
    A.o.group.rotation.y=Math.atan2(wp[i0+1][0]-wp[i0][0], wp[i0+1][1]-wp[i0][1]);
    A.o.legL.rotation.x=Math.sin(simT*5+k)*0.7;
    A.o.legR.rotation.x=-Math.sin(simT*5+k)*0.7;
    A.o.armL.rotation.x=-Math.sin(simT*5+k)*0.5;
    A.o.armR.rotation.x=Math.sin(simT*5+k)*0.5;
  }
  /* 在处理厂干活的 */
  var a3=astros[3];
  a3.o.group.position.set(a3.home[0], terrainTopWorld(a3.home[0],a3.home[1]), a3.home[1]);
  a3.o.group.rotation.y=-0.6;
  a3.o.armL.rotation.x=-0.7+Math.sin(simT*2.2)*0.35;
  a3.o.armR.rotation.x=-0.7-Math.sin(simT*2.2)*0.35;
}
/* 起重机工作循环 */
var craneState={phase:'move', t:0, dir:1, hookY:12, targetX:-6, hasLoad:false};
function updateCrane(dt){
  var cs=craneState;
  var beamY=BASE_Y+13;
  cs.t-=dt;
  if(cs.phase==='move'){
    crane.trolley.position.x = lerp(crane.trolley.position.x, cs.targetX, dt*1.4);
    if(Math.abs(crane.trolley.position.x-cs.targetX)<0.3){ cs.phase='down'; }
  } else if(cs.phase==='down'){
    cs.hookY-=dt*6;
    if(cs.hookY<=3){ cs.hookY=3; cs.hasLoad=!cs.hasLoad; crane.load.visible=cs.hasLoad; cs.phase='up'; AU.beep(520,0.07,'square',0.04); }
  } else if(cs.phase==='up'){
    cs.hookY+=dt*5;
    if(cs.hookY>=12){ cs.hookY=12; cs.targetX=rrange(-7,7); cs.phase='move'; }
  }
  crane.trolley.position.y=beamY;
  crane.trolley.position.z=38;
  crane.cable.position.set(crane.trolley.position.x, beamY-cs.hookY/2-0.5, 38);
  crane.cable.scale.y=cs.hookY;
  crane.hook.position.set(crane.trolley.position.x, beamY-cs.hookY-1, 38);
  crane.load.position.set(crane.trolley.position.x, beamY-cs.hookY-3, 38);
}
/* 采矿机器人 */
function updateMiner(dt){
  miner.group.position.y=terrainTopWorld(-56,-40);
  miner.arm.rotation.x=-0.35+Math.sin(simT*1.6)*0.55;
  if(Math.sin(simT*1.6)>0.9 && Math.random()<dt*10){
    var wp=new THREE.Vector3(0,0,5.5);
    miner.arm.localToWorld(wp);
    puff(wp.x, wp.y-1, wp.z, 0x9aa0aa, rrange(1,2), rrange(0.7,1.3), rrange(1,2), 0.4);
  }
}
/* 处理厂排气 */
var ventTimer=5;
function updatePlant(dt){
  ventTimer-=dt;
  if(ventTimer<=0){
    ventTimer=rrange(6,10);
    for(var i=0;i<4;i++) puff(38+rrange(-1,1), BASE_Y+16, -16+rrange(-1,1), 0xc8ccd4, rrange(1.4,2.4), rrange(1.2,2), rrange(1.5,3), 0.4);
  }
}
/* 碟形天线转动 */
function updateDishes(dt){
  if(dish1) dish1.rotation.y+=dt*0.3;
  if(dish2) dish2.rotation.y-=dt*0.22;
}

/* ---------------- 16. 主循环 ---------------- */
var clock=new THREE.Clock();
var fpsA=60, frame=0;
function animate(){
  requestAnimationFrame(animate);
  var dt=Math.min(clock.getDelta(), 0.05);
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
  if(perfNow()-lastInput>32 && !camAnim && !followObj){ camYaw+=dt*0.018; }
  if(!window.__freeze) applyCam();
  var tm=updateTime(sdt, dt);
  if(sdt>0){
    updateTrain(sdt);
    updateRovers(sdt);
    updateHopper(sdt);
    updateRocket(sdt);
    updateDrone(sdt);
    updateAstros(sdt);
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
  fpsA=lerp(fpsA, 1/Math.max(dt,1e-4), 0.05);
  if(frame===30){
    document.getElementById('helpStats').textContent='场景统计 · 体素 '+voxCount.toLocaleString()+' · 三角面 '+Math.round(renderer.info.render.triangles/1000)+'k · 设施 '+POIS.length+' 处 · 动态实体 14 个';
  }
  if(frame%30===0){
    var f=Math.round(fpsA);
    var el=document.getElementById('fps');
    el.textContent=f;
    el.className=f>45?'good':(f>24?'mid':'bad');
  }
  renderer.render(scene,camera);
}

/* ---------------- 17. 装配 ---------------- */
var staticMesh=null, glowMesh=null, voxCount=0;
function assemble(){
  var steps=[
    ['捏合小月球星胚……', function(){ genTerrain(); }],
    ['压实车辙道路……', function(){ genRoads(); }],
    ['建造指挥塔与穹顶……', function(){ buildTower(); buildDomes(); }],
    ['搭起温室与车库……', function(){ buildGreenhouse(); buildGarage(); }],
    ['修建发射场与着陆场……', function(){
      buildLaunchPad();
      buildLandingPad(54,0,'padA','着陆场「鹰-A」','LANDING PAD A','跳跃器的两个家之一。白色十字标线夜里会被琥珀边界灯点亮。点击呼叫跳跃器转场。');
      buildLandingPad(14,50,'padB','着陆场「鹰-B」','LANDING PAD B','跳跃器的两个家之一，建在南缘高地上，视野开阔。点击呼叫跳跃器转场。');
    }],
    ['竖起飞反应堆与燃料库……', function(){ buildSolar(); buildReactor(); buildDepot(); }],
    ['开动处理厂与起重机……', function(){ buildPlant(); buildYard(); }],
    ['架设天线与纪念广场……', function(){ buildComms(); buildMemorial(); buildFloods(); }],
    ['铺设环线铁路……', function(){ buildRail(); buildPerimeter(); }],
    ['浇筑体素（最久的一步）……', function(){
      var em=emitWorld();
      var geo=new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(em.pos),3));
      geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(em.nor),3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(em.col),3));
      geo.setIndex(em.idx);
      staticMesh=new THREE.Mesh(geo, new THREE.MeshLambertMaterial({vertexColors:true}));
      staticMesh.castShadow=true; staticMesh.receiveShadow=true;
      scene.add(staticMesh);
      var g2=new THREE.BufferGeometry();
      g2.setAttribute('position', new THREE.BufferAttribute(new Float32Array(em.gpos),3));
      g2.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(em.gnor),3));
      g2.setAttribute('color', new THREE.BufferAttribute(new Float32Array(em.gcol),3));
      g2.setIndex(em.gidx);
      glowMesh=new THREE.Mesh(g2, new THREE.MeshBasicMaterial({vertexColors:true}));
      scene.add(glowMesh);
      for(var i=0;i<solid.length;i++) if(solid[i]) voxCount++;
    }],
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
        stat:function(){ return trainState.mode==='stop'?'静海站停靠中 · 20 秒':'环线运行中 · 5 节编组'; }}};
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
      drone.group.userData.ent=ents.drone; hitMeshes.push(drone.group);
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
      document.getElementById('vox').textContent=(voxCount/10000).toFixed(1)+' 万';
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
    vox:voxCount,
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
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
applyCam();
assemble();

})();
