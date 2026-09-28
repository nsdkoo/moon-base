var colonyLife={drones:[],robots:[],carts:[],welders:[],screens:[],ready:false};

function makeColonyRobot(){
  var group=new THREE.Group(),torso=new THREE.Group();
  artBox(1.55,1.4,.85,M.dark,0,3.25,0,torso,.18);
  artBox(1.68,.95,.36,M.white,0,3.5,-.48,torso,.16);
  artBox(.82,.22,.08,M.gCyan,0,3.63,-.69,torso,.05);
  artBox(.45,.38,.12,M.orange,.48,3.17,-.54,torso,.05);
  mk(cylG(.3,.35,.5,16),M.metal,0,4.12,0,torso);
  artBox(1.3,.92,1.05,M.white,0,4.8,0,torso,.2);
  artBox(1.15,.47,.15,M.dark,0,4.82,-.56,torso,.12);
  for(var side=-1;side<=1;side+=2){
    mk(cylG(.18,.18,.16,20),M.metal,side*.74,4.78,0,torso).rotation.z=Math.PI/2;
    mk(sphG(.13,12,8),M.gCyan,side*.3,4.85,-.67,torso).scale.z=.3;
    artBox(.23,.86,.55,M.light,side*.49,3.35,.65,torso,.05);
    for(var vent=0;vent<4;vent++) artBox(.2,.055,.06,M.dark,side*.49,3.1+vent*.17,.95,torso,.01);
  }
  mk(cylG(.045,.045,.65,8),M.metal,.56,5.38,.16,torso);
  mk(sphG(.09,8,6),M.gAmber,.56,5.72,.16,torso);
  artBox(1.1,.45,.72,M.dark,0,2.3,0,torso,.12);
  for(var belt=0;belt<3;belt++) mk(cylG(.42,.42,.1,16),M.metal,0,2.6+belt*.15,0,torso);
  mergeArt(torso);group.add(torso);
  function limb(length,leg,side){
    var pivot=new THREE.Group();
    mk(sphG(leg?.29:.25,16,12),M.metal,0,0,0,pivot);
    artBox(leg?.48:.38,length*.4,.45,M.white,0,-length*.25,0,pivot,.1);
    mk(cylG(.22,.22,.55,16),M.dark,0,-length*.54,0,pivot).rotation.z=Math.PI/2;
    mk(cylG(.11,.11,.58,12),M.orange,0,-length*.54,0,pivot).rotation.z=Math.PI/2;
    artBox(leg?.45:.34,length*.36,.38,M.light,0,-length*.77,0,pivot,.08);
    artBeam(new THREE.Vector3(side*.23,-length*.4,.17),new THREE.Vector3(side*.23,-length*.89,.17),.045,M.metal,pivot);
    if(leg){
      artBox(.62,.28,.92,M.dark,0,-length,-.2,pivot,.09);
      artBox(.43,.12,.42,M.white,0,-length+.14,-.37,pivot,.05);
    }else{
      artBox(.36,.25,.3,M.dark,0,-length,0,pivot,.06);
      for(var finger=-1;finger<=1;finger+=2) artBox(.08,.3,.2,M.metal,finger*.14,-length-.18,-.06,pivot,.03);
    }
    mergeArt(pivot);return pivot;
  }
  var armL=limb(1.55,false,-1),armR=limb(1.55,false,1),legL=limb(1.95,true,-1),legR=limb(1.95,true,1);
  armL.position.set(-1.03,3.85,0);armR.position.set(1.03,3.85,0);
  legL.position.set(-.43,2.1,0);legR.position.set(.43,2.1,0);
  group.add(armL,armR,legL,legR);scene.add(group);
  return {group:group,armL:armL,armR:armR,legL:legL,legR:legR,wave:0};
}

function makeServiceDrone(cargo){
  var group=new THREE.Group();
  artBox(1.8,.8,2.1,M.dark,0,0,0,group,.22);
  artBox(1.55,.4,1.7,M.white,0,.48,0,group,.2);
  artBox(.9,.27,.18,M.gCyan,0,-.02,-1.12,group,.06);
  mk(sphG(.24,16,12),M.metal,0,-.56,-.66,group);
  mk(sphG(.15,16,10),M.gCold,0,-.59,-.87,group);
  for(var side=-1;side<=1;side+=2) for(var end=-1;end<=1;end+=2){
    artBeam(new THREE.Vector3(side*.6,0,end*.6),new THREE.Vector3(side*1.6,-.12,end*1.2),.12,M.metal,group);
    mk(cylG(.48,.4,.6,20),M.dark,side*1.6,-.22,end*1.2,group);
    mk(new THREE.TorusGeometry(.43,.075,8,24),M.metal,side*1.6,.08,end*1.2,group).rotation.x=Math.PI/2;
    mk(cylG(.22,.32,.22,16),M.gCyan,side*1.6,-.64,end*1.2,group);
    artBeam(new THREE.Vector3(side*.9,-.4,end*.55),new THREE.Vector3(side*1.15,-1.1,end*.75),.055,M.metal,group);
  }
  if(cargo){
    artBox(1.65,.85,1.45,M.orange,0,-1.4,0,group,.08);
    for(var strap=-1;strap<=1;strap+=2) artBox(.1,.9,1.5,M.dark,strap*.58,-1.4,0,group,.025);
  }
  mergeArt(group);
  var thrust=new THREE.Group();group.add(thrust);
  for(var side=-1;side<=1;side+=2) for(var end=-1;end<=1;end+=2){
    var plume=noShadow(mk(new THREE.ConeGeometry(.23,1.1,12),new THREE.MeshBasicMaterial({color:0x76dcff,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}),side*1.6,-1.05,end*1.2,thrust));
    plume.rotation.z=Math.PI;
  }
  scene.add(group);return {group:group,thrust:thrust};
}

function colonySign(text,width,height){
  return new THREE.MeshBasicMaterial({map:artTexture(512,128,function(context){
    context.fillStyle='#122c38';context.fillRect(0,0,512,128);
    context.fillStyle='#7ee3e6';context.fillRect(0,0,8,128);
    context.font='bold 39px monospace';context.fillText(text,28,59);
    context.fillStyle='#73999d';context.font='18px monospace';context.fillText('TRQ-1  /  AUTONOMOUS COLONY',28,100);
  },true)});
}

function buildColonyLife(){
  var structures=new THREE.Group();scene.add(structures);
  var ground=BASE_Y;
  artState.lifeLights=[];
  [[0,5,0x55bfd7,3.8,23],[-12,16,0xffb66d,2.2,15],[33,8,0x74c6dc,2.5,18]].forEach(function(setup){
    var lamp=new THREE.PointLight(setup[2],setup[3],setup[4],2);lamp.position.set(setup[0],ground+4,setup[1]);scene.add(lamp);
    artState.lifeLights.push({light:lamp,intensity:setup[3]});
  });
  document.getElementById('time').value=Math.round(dayT*1000);
  var podSites=[[-14,20],[-35,24],[-45,3]];
  podSites.forEach(function(site){
    for(var side=-1;side<=1;side+=2) for(var window=-1;window<=1;window++){
      mk(cylG(.48,.48,.06,24),M.gWarm,site[0]+side*2.97,terrainH(site[0],site[1])+3.95,site[1]+window*2.4,structures).rotation.z=Math.PI/2;
    }
  });
  for(var desk=0;desk<3;desk++){
    var angle=.4+desk*1.6,robot=makeColonyRobot();
    robot.group.scale.setScalar(.47);
    robot.group.position.set(-27+Math.cos(angle)*5,ground+1.2,5+Math.sin(angle)*5);
    robot.group.rotation.y=-angle+Math.PI/2;
    colonyLife.robots.push({robot:robot,task:'work',phase:desk});
  }
  for(var shelf=0;shelf<3;shelf++){
    var sx=-32+shelf*3.6;
    artBox(2.5,2.7,.55,M.dark,sx,ground+2.6,2,structures,.07);
    for(var level=0;level<3;level++){
      artBox(2.4,.08,.7,M.light,sx,ground+1.6+level*.8,2,structures,.025);
      for(var item=0;item<4;item++) artBox(.32,.5,.35,M.containers[(item+shelf)%6],sx-.85+item*.56,ground+1.89+level*.8,2,structures,.035);
    }
  }
  for(var seat=0;seat<3;seat++){
    artBox(2,.45,1.15,M.orange,-29+seat*2.2,ground+1.7,9,structures,.18);
    artBox(2,1.15,.3,M.light,-29+seat*2.2,ground+2.25,9.55,structures,.12);
  }
  artBox(15,.3,12,M.dark,0,ground+.16,5,structures,.5);
  for(var side=-1;side<=1;side+=2){
    artBox(.12,.055,10.4,M.gCyan,side*7.1,ground+.34,5,structures,.02);
    for(var tile=0;tile<10;tile++) artBox(.7,.06,.17,M.orange,side*6.2,ground+.35,.5+tile,structures,.02);
  }
  for(var seam=0;seam<8;seam++) artBox(13,.035,.025,M.metal,0,ground+.33,.5+seam*1.3,structures,.01);
  for(var bay=0;bay<3;bay++){
    var bx=-5+bay*4.6;
    artBox(2.7,.32,2.2,M.mid,bx,ground+.45,1,structures,.2);
    artBox(2.8,3.7,.65,M.dark,bx,ground+2.1,-.4,structures,.2);
    artBox(2.35,2.5,.2,M.light,bx,ground+2.4,-.8,structures,.12);
    artBox(1.6,.25,.12,M.gCyan,bx,ground+3.25,-.04,structures,.035);
    for(var pin=-1;pin<=1;pin+=2) artBox(.13,1.4,.1,M.gWarm,bx+pin*1.05,ground+1.7,-.04,structures,.02);
    var robot=makeColonyRobot();robot.group.scale.setScalar(.6);robot.group.position.set(bx,ground+.6,1);robot.group.rotation.y=Math.PI;
    colonyLife.robots.push({robot:robot,x:bx,z:1,task:'charge',phase:bay});
  }
  artBox(15,.35,3.4,M.white,0,ground+5.6,-.15,structures,.25);
  artBox(14,.12,.14,M.gCyan,0,ground+5.38,1.46,structures,.025);
  for(var side=-1;side<=1;side+=2) artBox(.3,5.4,.3,M.metal,side*7,ground+2.7,-.65,structures,.04);
  mk(new THREE.PlaneGeometry(6,1.5),colonySign('SERVICE / 03'),0,ground+4.5,1.59,structures);
  groundLight(0,6,21,16,0x44b9cf,structures);
  var sites=[[-9,15],[3,5],[32,1],[-13,33]];
  sites.forEach(function(site,index){
    var station=new THREE.Group();station.position.set(site[0],ground,site[1]);structures.add(station);
    artBox(3.7,.22,3.3,M.dark,0,.12,0,station,.14);
    artBox(2.2,1.8,.85,M.light,0,1.05,-.6,station,.12);
    artBox(1.9,.13,1.4,M.metal,0,2,-.4,station,.06);
    artBox(1.2,.6,.13,M.dark,0,2.65,-.85,station,.04);
    artBox(.98,.4,.05,M.gCyan,0,2.65,-.76,station,.025);
    for(var tool=0;tool<4;tool++) artBox(.12,.5,.14,M.orange,-.72+tool*.45,1.1,-.13,station,.02);
    var robot=makeColonyRobot();robot.group.scale.setScalar(.6);robot.group.position.set(site[0],ground+.1,site[1]+1.2);
    colonyLife.robots.push({robot:robot,x:site[0],z:site[1]+1.2,task:index===1?'talk':'work',phase:index*1.7});
    var spark=artGlow(site[0]+.55,ground+2.1,site[1]-.1,0x9ce9ff,2.2);
    colonyLife.welders.push(spark);
    for(var crate=0;crate<3;crate++){
      artBox(.9,.65,.85,M.containers[(index+crate)%6],site[0]+2.5+crate%2,ground+.4+Math.floor(crate/2)*.7,site[1]+1,structures,.065);
    }
    groundLight(site[0],site[1],8,7,0xffb468,structures);
  });
  var friend=makeColonyRobot();friend.group.scale.setScalar(.61);friend.group.position.set(5.2,ground+.35,7);friend.group.rotation.y=1.1;
  colonyLife.robots.push({robot:friend,x:5.2,z:7,task:'talk',phase:2});
  for(var dock=0;dock<4;dock++){
    var dx=28+dock*5,dz=9;
    mk(cylG(2,2,.18,32),M.dark,dx,ground+.13,dz,structures);
    mk(new THREE.TorusGeometry(1.7,.055,6,40),M.gAmber,dx,ground+.24,dz,structures).rotation.x=Math.PI/2;
    artBox(.9,1.8,.55,M.light,dx,ground+1.1,dz-2.4,structures,.1);
    artBox(.55,.2,.08,M.gCyan,dx,ground+1.65,dz-2.07,structures,.02);
  }
  for(var index=0;index<10;index++){
    var flyer=makeServiceDrone(index%3===0);
    flyer.phase=index*.628;flyer.index=index;colonyLife.drones.push(flyer);
    var entity={obj:flyer.group,poiLike:{name:index%3===0?'补给运输无人机':'巡检无人机',en:'AUTONOMOUS / D-'+(index+1),desc:'使用姿态喷口在低重力环境中飞行，定时返回港口。运输机携带补给箱，巡检机负责检查设备外壳和通信链路。',stat:function(){return '编队在线 · 任务自主执行';}}};
    flyer.group.userData.ent=entity;hitMeshes.push(flyer.group);
  }
  drone.group.visible=false;
  for(var index=0;index<4;index++){
    var cart=new THREE.Group();
    artBox(2.8,.55,4.1,M.dark,0,.75,0,cart,.2);
    artBox(2.7,.25,3.2,M.white,0,1.18,.15,cart,.14);
    artBox(2.2,.2,.15,M.gWarm,0,.9,-2.1,cart,.03);
    artBox(.7,.6,.5,M.white,0,1.65,-1.5,cart,.1);
    artBox(.48,.19,.06,M.gCyan,0,1.7,-1.78,cart,.02);
    for(var side=-1;side<=1;side+=2) for(var wheel=-1;wheel<=1;wheel+=2){
      mk(cylG(.58,.58,.35,20),M.dark,side*1.45,.6,wheel*1.25,cart).rotation.z=Math.PI/2;
      mk(cylG(.3,.3,.38,16),M.metal,side*1.46,.6,wheel*1.25,cart).rotation.z=Math.PI/2;
    }
    for(var crate=0;crate<2;crate++) artBox(1.95,.85,1.05,M.containers[index],0,1.75,crate*1.3-.5,cart,.08);
    mergeArt(cart);scene.add(cart);colonyLife.carts.push({group:cart,phase:index/4});
    cart.userData.ent={obj:cart,poiLike:{name:'自动补给车',en:'LOGISTICS / AGV',desc:'在仓储区与生活区之间搬运工具、电池和温室补给。到站减速等待卸货，再继续下一程。'}};hitMeshes.push(cart);
  }
  var route=[[12,7],[27,7],[27,-3],[12,-3],[12,7]];
  for(var segment=0;segment<route.length-1;segment++){
    var start=new THREE.Vector3(route[segment][0],ground+.08,route[segment][1]);
    var end=new THREE.Vector3(route[segment+1][0],ground+.08,route[segment+1][1]);
    var length=start.distanceTo(end),center=start.clone().lerp(end,.5),angle=Math.atan2(end.x-start.x,end.z-start.z);
    var road=artBox(3.6,.08,length,M.mid,center.x,center.y,center.z,structures,.02);road.rotation.y=angle;
    for(var marker=0;marker<Math.floor(length/2);marker++){
      var point=start.clone().lerp(end,marker/Math.floor(length/2));
      var mark=mk(boxG(.16,.045,.55),M.gWarm,point.x,ground+.15,point.z,structures);mark.rotation.y=angle;
    }
  }
  var detailSites=[[-40,12],[-21,19],[-29,-9],[-6,-28],[6,-28],[35,-4],[45,-20],[24,22]];
  detailSites.forEach(function(site,index){
    for(var unit=0;unit<3;unit++){
      var bx=site[0]+unit*1.5;
      artBox(1.15,1.6,.85,M.dark,bx,ground+1,site[1],structures,.1);
      artBox(.94,1.3,.12,M.light,bx,ground+1,site[1]+.48,structures,.07);
      for(var vent=0;vent<5;vent++) artBox(.7,.055,.06,M.dark,bx,ground+.6+vent*.15,site[1]+.56,structures,.01);
      artBox(.16,.1,.06,M.gCyan,bx+.25,ground+1.52,site[1]+.56,structures,.01);
    }
    artBeam(new THREE.Vector3(site[0]-1,ground+.35,site[1]),new THREE.Vector3(site[0]+4,ground+.35,site[1]),.09,M.orange,structures);
  });
  mergeArt(structures);
  colonyLife.robots.forEach(function(worker){worker.robot.group.userData.ent={kind:'astro',o:worker.robot};hitMeshes.push(worker.robot.group);});
  colonyLife.ready=true;updateColonyLife(0);
}

function updateColonyLife(dt){
  if(!colonyLife.ready)return;
  colonyLife.drones.forEach(function(flyer){
    var phase=simT*.095+flyer.phase,position=flyer.group.position;
    if(flyer.index<4){
      var cycle=(simT*.038+flyer.index*.25)%1;
      var travel=clamp((cycle-.18)/.82,0,1),flight=Math.sin(Math.PI*travel);
      position.set(28+flyer.index*5-Math.sin(travel*TAU)*11,BASE_Y+1.9+flight*17,9+flight*16);
      flyer.group.rotation.y=travel*TAU;
    }else{
      position.set(Math.cos(phase)*(24+flyer.index*2),BASE_Y+17+(flyer.index%3)*4+Math.sin(phase*2)*1.2,Math.sin(phase)*25+2);
      flyer.group.rotation.y=-phase;
    }
    flyer.group.rotation.z=Math.sin(phase*2)*.07;
    flyer.thrust.scale.y=.85+Math.sin(simT*13+flyer.index)*.15;
  });
  colonyLife.robots.forEach(function(worker){
    var robot=worker.robot,phase=simT*1.7+worker.phase;
    if(robot.wave>0){robot.wave-=dt;robot.armR.rotation.z=-2.2+Math.sin(phase*4)*.3;return;}
    robot.armR.rotation.z=0;
    if(worker.task==='work'){
      robot.armL.rotation.x=-.9+Math.sin(phase)*.25;robot.armR.rotation.x=-1.1+Math.cos(phase*.7)*.3;
    }else if(worker.task==='talk'){
      robot.armR.rotation.z=-.6+Math.sin(phase*.6)*.35;robot.group.rotation.y=worker.phase===2?1.1:-2;
    }else{
      var cycle=(simT+worker.phase*14)%42;
      var excursion=cycle<15?0:cycle<23?sstep(15,23,cycle):cycle<31?1:1-sstep(31,42,cycle);
      robot.group.position.z=worker.z+excursion*2.1;
      robot.group.position.y=BASE_Y+.35;
      robot.group.rotation.y=cycle<23?Math.PI:0;
      var walking=(cycle>15&&cycle<23)||(cycle>31);
      robot.legL.rotation.x=walking?Math.sin(simT*5)*.5:0;
      robot.legR.rotation.x=-robot.legL.rotation.x;
      robot.armL.rotation.x=walking?-robot.legL.rotation.x*.6:-.12;
      robot.armR.rotation.x=walking?robot.legL.rotation.x*.6:-.12;
    }
  });
  var points=[[12,7],[27,7],[27,-3],[12,-3],[12,7]];
  colonyLife.carts.forEach(function(cart){
    var progress=(simT*.018+cart.phase)%1,segment=progress*(points.length-1),index=Math.floor(segment),fraction=segment-index;
    fraction=sstep(.12,.88,fraction);
    var start=points[index],end=points[index+1];
    cart.group.position.set(lerp(start[0],end[0],fraction),BASE_Y+.12,lerp(start[1],end[1],fraction));
    cart.group.rotation.y=Math.atan2(start[0]-end[0],start[1]-end[1]);
  });
  colonyLife.welders.forEach(function(spark,index){spark.visible=lightsOn&&Math.sin(simT*2.1+index*2)>.6;spark.material.opacity=.3+.4*Math.abs(Math.sin(simT*31));});
}
