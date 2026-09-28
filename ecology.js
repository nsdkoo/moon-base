var ecology={enabled:true,ready:false,hopperTimer:9,launchTimer:0,meteorTimer:18,cargoTimer:16,ships:[],radars:[],ore:[],cargo:null};

function refineFreightTrain(){
  train.cars.forEach(function(car,index){
    while(car.children.length)car.remove(car.children[0]);
    artBox(2.85,.32,5.7,M.dark,0,.63,0,car,.12);
    artBox(2.45,.23,5.4,M.metal,0,.88,0,car,.08);
    for(var end=-1;end<=1;end+=2){
      artBox(1.6,.38,.7,M.dark,0,.3,end*1.7,car,.09);
      for(var side=-1;side<=1;side+=2){
        mk(cylG(.43,.43,.27,20),M.dark,side*1.3,.28,end*1.7,car).rotation.z=Math.PI/2;
        mk(cylG(.25,.25,.3,16),M.metal,side*1.31,.28,end*1.7,car).rotation.z=Math.PI/2;
        artBeam(new THREE.Vector3(side*1.25,.4,end*1.7-.5),new THREE.Vector3(side*1.25,.4,end*1.7+.5),.09,M.orange,car);
      }
      artBox(.32,.24,.9,M.metal,0,.65,end*3.05,car,.04);
      mk(cylG(.23,.23,.15,12),M.dark,0,.63,end*3.35,car);
    }
    if(index===0){
      artBox(2.45,1.25,4.3,M.light,0,1.65,.25,car,.22);
      artBox(2.2,1.3,1.65,M.white,0,2.7,-1.6,car,.22);
      artBox(1.8,.65,.09,M.dark,0,2.85,-2.47,car,.09);
      artBox(1.55,.37,.06,M.gCold,0,2.87,-2.53,car,.05);
      artBox(2.4,.17,1.9,M.dark,0,3.45,-1.6,car,.06);
      for(var side=-1;side<=1;side+=2){
        artBox(.08,.7,1.03,M.dark,side*1.13,2.85,-1.6,car,.06);
        artBox(.08,.16,4.2,M.orange,side*1.25,1.45,.2,car,.02);
        artBeam(new THREE.Vector3(side*1.38,2,-.3),new THREE.Vector3(side*1.38,2,2.25),.045,M.metal,car);
        for(var vent=0;vent<10;vent++)artBox(.06,.48,.075,M.dark,side*1.25,1.94,vent*.23-.05,car,.01);
        artBox(.43,.25,.16,M.gWhite,side*.8,1.4,-2.76,car,.05);
        for(var rung=0;rung<3;rung++)artBox(.14,.07,.7,M.metal,side*1.4,.9+rung*.32,-1.5,car,.015);
      }
      for(var fan=0;fan<2;fan++){
        mk(cylG(.55,.55,.14,24),M.dark,0,2.36,fan*1.3+.25,car);
        for(var blade=0;blade<6;blade++){var fin=mk(boxG(.85,.025,.045),M.metal,0,2.45,fan*1.3+.25,car);fin.rotation.y=blade*Math.PI/6;}
      }
      mk(cylG(.055,.055,1,8),M.metal,.7,3.7,-.9,car);
      mk(sphG(.12,12,8),M.gAmber,.7,4.23,-.9,car);
    }else{
      artBox(2.15,.15,4.7,M.mid,0,1.05,0,car,.05);
      for(var side=-1;side<=1;side+=2){
        var wall=artBox(.12,1.35,4.8,M.light,side*1.18,1.72,0,car,.04);wall.rotation.z=-side*.16;
        artBox(.18,.14,5,M.metal,side*1.3,2.41,0,car,.035);
        for(var rib=0;rib<7;rib++){
          var strut=artBox(.15,1.25,.1,M.dark,side*1.29,1.75,-2.15+rib*.7,car,.025);strut.rotation.z=-side*.16;
          mk(sphG(.045,6,4),M.metal,side*1.4,2.22,-2.15+rib*.7,car);
        }
        artBox(.09,.25,.6,M.orange,side*1.4,1.5,1.55,car,.015);
      }
      for(var end=-1;end<=1;end+=2){
        artBox(2.6,1.28,.12,M.light,0,1.73,end*2.43,car,.035);
        artBox(2.7,.12,.16,M.metal,0,2.41,end*2.43,car,.03);
        artBox(1.6,.14,.15,M.orange,0,1.65,end*2.52,car,.02);
      }
      var chunks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),M.rock2,96),transform=new THREE.Object3D();
      for(var piece=0;piece<96;piece++){
        var chunkX=(hash3(piece,index,1)-.5)*1.9,chunkZ=(hash3(piece,8,index)-.5)*4.2;
        transform.position.set(chunkX,1.65+.25*(1-Math.abs(chunkX)) +hash3(piece,2,index)*.2,chunkZ);
        transform.rotation.set(piece*.72,piece*.33,piece*.19);
        transform.scale.set(.16+hash3(piece,4,index)*.11,.16+hash3(piece,7,index)*.12,.2);
        transform.updateMatrix();chunks.setMatrixAt(piece,transform.matrix);
        chunks.setColorAt(piece,new THREE.Color().setHSL(.08,.06+(piece%13===0?.25:0),.34+hash3(piece,5,index)*.24));
      }
      chunks.castShadow=true;car.add(chunks);ecology.ore.push(chunks);
    }
    mergeArt(car);
  });
}

function makeOrbitalShip(){
  var group=new THREE.Group();
  artBox(3.5,2.5,17,M.dark,0,0,0,group,.5);
  artBox(2.9,1.4,15,M.light,0,1.1,-.5,group,.35);
  var nose=mk(new THREE.ConeGeometry(2.1,5,4),M.white,0,.3,-10,group);nose.rotation.x=-Math.PI/2;nose.rotation.z=Math.PI/4;
  artBox(2,.45,2,M.gCold,0,1.65,-6.8,group,.12);
  for(var side=-1;side<=1;side+=2){
    artBox(1.7,1.8,11,M.white,side*3,0,2,group,.3);
    for(var rib=0;rib<6;rib++)artBox(1.85,.12,.22,M.dark,side*3,1, -2.5+rib*1.7,group,.03);
    artBox(5,.24,5.5,M.dark,side*4.8,-.2,2,group,.1);
    artBox(3.4,.07,4.7,M.solar,side*5.7,-.02,2,group,.03);
    for(var brace=0;brace<4;brace++)artBeam(new THREE.Vector3(side*1.4,0,-4+brace*3),new THREE.Vector3(side*3,0,-3+brace*3),.1,M.metal,group);
    mk(cylG(.8,1,1.4,24),M.metal,side*3,0,8.1,group).rotation.x=Math.PI/2;
    mk(cylG(.64,.64,.1,24),M.gCyan,side*3,0,8.85,group).rotation.x=Math.PI/2;
    artBox(.12,.16,5,M.gWarm,side*3.88,.2,1,group,.02);
  }
  for(var panel=0;panel<5;panel++)artBox(2.6,.12,1.4,M.white,0,1.87,-3+panel*2,group,.06);
  mergeArt(group);
  var engine=new THREE.Group();group.add(engine);
  for(var side=-1;side<=1;side+=2){
    var plume=mk(new THREE.ConeGeometry(.65,4,20),new THREE.MeshBasicMaterial({color:0x6bcfff,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending}),side*3,0,10.8,engine);plume.rotation.x=Math.PI/2;
  }
  scene.add(group);return {group:group,engine:engine};
}

function buildEcology(){
  refineFreightTrain();buildExpansion();
  bind('bFreight',function(){followObj=train.cars[1];flyTo(camYaw,.5,22,followObj.position.clone(),1.1);document.getElementById('sceneSettings').open=false;});
  bind('bExpansion',function(){followObj=null;flyTo(.9,.5,68,new THREE.Vector3(66,BASE_Y+3,0),1.4);document.getElementById('sceneSettings').open=false;});
  bind('bEcology',function(){ecology.enabled=!ecology.enabled;document.getElementById('bEcology').classList.toggle('on',ecology.enabled);document.getElementById('bEcology').setAttribute('aria-pressed',String(ecology.enabled));toast(ecology.enabled?'基地调度恢复 · 运输与发射自动循环':'自动调度已关闭 · 当前任务完成后待命');});
  for(var index=0;index<2;index++){
    var ship=makeOrbitalShip();ship.index=index;ship.group.scale.setScalar(index===0?.65:.5);ecology.ships.push(ship);
    ship.group.userData.ent={obj:ship.group,poiLike:{name:index===0?'远航补给舰「白鹭」':'轨道巡逻舰「游隼」',en:'ORBITAL TRAFFIC',desc:'分段货舱、散热翼、姿态喷口与主推进器构成完整船体。基地持续接收轨道物资，巡逻舰沿外侧航线运行。'}};hitMeshes.push(ship.group);
  }
  var station=new THREE.Group();station.position.set(-130,55,-230);station.scale.setScalar(.85);scene.add(station);
  mk(cylG(2.6,2.6,15,24),M.light,0,0,0,station).rotation.z=Math.PI/2;
  for(var ring=-1;ring<=1;ring++)mk(new THREE.TorusGeometry(5.4,.48,12,48),M.white,ring*4,0,0,station).rotation.y=Math.PI/2;
  for(var angle=0;angle<6;angle++){
    var rad=angle*TAU/6;
    artBeam(new THREE.Vector3(-5,Math.cos(rad)*5.4,Math.sin(rad)*5.4),new THREE.Vector3(5,Math.cos(rad)*5.4,Math.sin(rad)*5.4),.11,M.metal,station);
  }
  for(var side=-1;side<=1;side+=2){
    artBox(1,18,.65,M.dark,side*9,0,0,station,.15);
    for(var array=-1;array<=1;array+=2)artBox(6.7,7,.15,M.solar,side*12,array*4.3,0,station,.04);
    artBox(.16,14,.2,M.gWarm,side*8.45,0,.5,station,.025);
  }
  mergeArt(station);ecology.station=station;
  [[-67,-15],[62,38]].forEach(function(site,index){
    var mount=new THREE.Group();mount.position.set(site[0],terrainH(site[0],site[1]),site[1]);scene.add(mount);
    mk(cylG(3.4,4,.6,8),M.dark,0,.3,0,mount);
    mk(cylG(2.1,2.6,1.2,16),M.white,0,1.1,0,mount);
    mk(new THREE.TorusGeometry(2.1,.08,8,40),M.gCyan,0,1.75,0,mount).rotation.x=Math.PI/2;
    var head=new THREE.Group();head.position.y=2;mount.add(head);
    artBox(3,1.2,2.6,M.light,0,.4,0,head,.3);
    for(var side=-1;side<=1;side+=2){
      artBox(.5,.5,4.4,M.dark,side*.92,.75,-2.5,head,.09);
      for(var collar=0;collar<4;collar++)artBox(.63,.63,.14,M.metal,side*.92,.75,-1.3-collar*.8,head,.03);
      artBox(.36,.18,.07,M.gCold,side*.92,.75,-4.74,head,.03);
    }
    artBox(1.4,.75,.55,M.dark,0,1.25,-.6,head,.12);
    mk(sphG(.24,16,12),M.gCyan,0,1.3,-.93,head);
    var radar=mk(new THREE.CircleGeometry(1.4,32),M.solar,0,2.9,.3,head);radar.rotation.x=-.3;
    artBeam(new THREE.Vector3(0,1,0),new THREE.Vector3(0,3,.3),.09,M.metal,head);
    mergeArt(head);ecology.radars.push(head);
    mount.userData.ent={obj:mount,poiLike:{name:'外围警戒阵列 '+(index+1),en:'PERIMETER WATCH',desc:'相控阵雷达和双联防护装置持续扫描外围空域。点击可近看机械结构。'}};hitMeshes.push(mount);
    groundLight(site[0],site[1],11,11,0x48afcd,scene);
  });
  var gantry=new THREE.Group();scene.add(gantry);
  for(var side=-1;side<=1;side+=2)artBox(.35,8,.4,M.metal,side*3,RAIL_Y+4,62,gantry,.04);
  artBox(6.8,.6,1.2,M.dark,0,RAIL_Y+8,62,gantry,.12);
  for(var light=0;light<4;light++)artBox(.7,.12,.4,M.gWarm,-2.1+light*1.4,RAIL_Y+7.64,62,gantry,.03);
  mergeArt(gantry);ecology.ready=true;
}

function updateEcology(dt){
  if(!ecology.ready)return;
  ecology.ships.forEach(function(ship,index){
    var phase=simT*(index===0?.065:-.047)+Math.PI*1.25+index*.65;
    var radius=260+index*60,direction=index===0?1:-1;
    ship.group.position.set(Math.cos(phase)*radius,48+index*22+Math.sin(phase)*10,Math.sin(phase)*radius*.9);
    var velocity=new THREE.Vector3(-Math.sin(phase)*radius*direction,Math.cos(phase)*10*direction,Math.cos(phase)*radius*.9*direction).normalize();
    ship.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),velocity);
    ship.engine.scale.z=1+Math.sin(simT*7)*.08;
  });
  ecology.station.rotation.y=.3+Math.sin(simT*.025)*.15;ecology.station.rotation.z=.12;
  ecology.radars.forEach(function(head,index){head.rotation.y=simT*.19+index*Math.PI;});
  ecology.ore.forEach(function(ore,index){ore.position.y=trainState.mode==='stop'?-.12*Math.sin((4-trainState.t)*Math.PI/4):Math.sin(simT*8+index)*.015;});
  if(ecology.cargo&&ecology.cargo.active){
    var cargo=ecology.cargo;cargo.time=Math.min(1,cargo.time+dt/24);
    var lift=Math.sin(cargo.time*Math.PI);
    cargo.craft.group.position.set(-52+lift*9,BASE_Y+2+lift*18,50-lift*7);
    cargo.craft.group.rotation.y=.3+cargo.time*TAU;
    cargo.craft.engine.visible=true;
    if(cargo.time>=1){cargo.active=false;cargo.craft.engine.visible=false;}
  }
  if(!ecology.enabled)return;
  ecology.hopperTimer-=dt;ecology.meteorTimer-=dt;ecology.cargoTimer-=dt;
  if(rocket.state==='idle')ecology.launchTimer-=dt;
  if(ecology.cargoTimer<=0&&ecology.cargo&&!ecology.cargo.active){ecology.cargo.active=true;ecology.cargo.time=0;ecology.cargoTimer=65;}
  if(ecology.launchTimer<=0&&rocket.state==='idle'&&hopper.state==='idle'){doLaunch();ecology.launchTimer=8;}
  if(ecology.hopperTimer<=0&&hopper.state==='idle'&&rocket.state==='idle'&&ecology.launchTimer>7){callHopper();ecology.hopperTimer=26;}
  if(ecology.meteorTimer<=0){showerUntil=simT+3;ecology.meteorTimer=48;}
}

function buildExpansion(){
  var group=new THREE.Group();scene.add(group);
  function platform(x,z,width,depth){
    artBox(width,.65,depth,M.dark,x,BASE_Y-.35,z,group,.2);
    for(var side=-1;side<=1;side+=2)for(var end=-1;end<=1;end+=2){
      var px=x+side*(width/2-1),pz=z+end*(depth/2-1),bottom=terrainH(px,pz)-.4;
      artBox(.75,Math.max(.3,BASE_Y-bottom),.75,M.metal,px,(BASE_Y+bottom)/2,pz,group,.05);
    }
    for(var side=-1;side<=1;side+=2)artBox(.1,.08,depth-.8,M.gWarm,x+side*(width/2-.3),BASE_Y+.04,z,group,.02);
  }
  function module(x,z,width,depth,title,medical){
    platform(x,z,width+3,depth+3);
    artBox(width,5.6,depth,M.white,x,BASE_Y+2.8,z,group,.45);
    artBox(width+.3,.45,depth+.3,M.dark,x,BASE_Y+5.7,z,group,.12);
    artBox(width-.6,.3,depth-1,M.solar,x,BASE_Y+6.05,z,group,.06);
    for(var side=-1;side<=1;side+=2){
      for(var rib=0;rib<5;rib++)artBox(.2,.23,depth+.4,M.metal,x-width*.4+rib*width*.2,BASE_Y+6.18,z,group,.035);
      artBeam(new THREE.Vector3(x+side*(width/2+.3),BASE_Y+1,z-depth*.4),new THREE.Vector3(x+side*(width/2+.3),BASE_Y+1,z+depth*.4),.11,M.orange,group);
      artBox(.2,4.4,.7,M.dark,x+side*(width/2+.15),BASE_Y+2.7,z-depth*.2,group,.04);
      for(var rung=0;rung<9;rung++)artBox(.28,.06,.65,M.metal,x+side*(width/2+.3),BASE_Y+.8+rung*.44,z-depth*.2,group,.015);
    }
    for(var bay=0;bay<4;bay++){
      var px=x-width*.36+bay*width*.24;
      artBox(width*.18,1.3,.16,M.dark,px,BASE_Y+3.1,z+depth/2+.04,group,.07);
      artBox(width*.155,.93,.06,medical?M.gCyan:M.gWarm,px,BASE_Y+3.1,z+depth/2+.14,group,.035);
      artBox(.12,4.8,.22,M.metal,px-width*.11,BASE_Y+2.7,z+depth/2+.14,group,.025);
    }
    artBox(2.1,3,1,M.dark,x,BASE_Y+1.5,z+depth/2+.7,group,.15);
    artBox(1.7,2.7,.12,M.mid,x,BASE_Y+1.5,z+depth/2+1.23,group,.1);
    artBox(.08,2.3,.07,M.gCyan,x,BASE_Y+1.5,z+depth/2+1.31,group,.02);
    mk(new THREE.PlaneGeometry(4.3,1.08),colonySign(title),x,BASE_Y+4.65,z+depth/2+.18,group);
    for(var duct=0;duct<2;duct++){
      artBox(1.3,.85,2,M.mid,x+(duct?1:-1)*(width/2-1.2),BASE_Y+6.45,z,group,.12);
      for(var vent=0;vent<6;vent++)artBox(.9,.08,.07,M.dark,x+(duct?1:-1)*(width/2-1.2),BASE_Y+6.2+vent*.09,z+1.03,group,.015);
    }
    addPOI({id:'annex-'+title,name:medical?'医疗与生物实验舱':title==='SCIENCE / 02'?'月壤与材料实验室':'生活与轮班中心',en:title,hit:{x:x,y:BASE_Y+3,z:z,r:Math.max(width,depth)/2+1,h:7},pos:new THREE.Vector3(x,BASE_Y+7,z),desc:'独立加压舱、气闸入口、屋顶散热设备与备用电源构成完整功能模块，通过封闭廊道接入基地。'});
  }
  module(70,-18,10,9,'SCIENCE / 02',false);
  module(70,-2,10,9,'MEDICAL / 01',true);
  module(-12,-49,13,8,'HABITAT / 02',false);
  pressureTunnel(new THREE.Vector3(70,BASE_Y+1.7,-13.5),new THREE.Vector3(70,BASE_Y+1.7,-6.5),1.35,group);
  pressureTunnel(new THREE.Vector3(47,BASE_Y+1.6,-18),new THREE.Vector3(64,BASE_Y+1.6,-18),1.2,group);
  pressureTunnel(new THREE.Vector3(-8,BASE_Y+1.7,-45),new THREE.Vector3(-3,BASE_Y+1.7,-37),1.25,group);
  platform(69,18,13,13);
  for(var tank=0;tank<3;tank++){
    var tx=65+tank*3.5;
    mk(cylG(1.4,1.4,5.2,24),M.light,tx,BASE_Y+3,17,group);
    mk(sphG(1.4,20,12),M.white,tx,BASE_Y+5.6,17,group).scale.y=.45;
    for(var collar=0;collar<3;collar++)mk(new THREE.TorusGeometry(1.43,.09,8,28),M.metal,tx,BASE_Y+1.1+collar*1.8,17,group).rotation.x=Math.PI/2;
    artBeam(new THREE.Vector3(tx,BASE_Y+1,18.5),new THREE.Vector3(tx,BASE_Y+1,22),.14,M.orange,group);
  }
  artBox(10,2.2,2.5,M.dark,69,BASE_Y+1.1,22,group,.22);
  artBeam(new THREE.Vector3(69,BASE_Y+.5,12),new THREE.Vector3(69,BASE_Y+.5,4),.19,M.orange,group);
  for(var panel=0;panel<5;panel++)artBox(1.5,.65,.12,M.gCyan,65+panel*2,BASE_Y+1.5,23.3,group,.04);
  addPOI({id:'water-recovery',name:'水循环与生命保障站',en:'WATER / ECLSS',hit:{x:69,y:BASE_Y+3,z:18,r:7,h:7},pos:new THREE.Vector3(69,BASE_Y+7,18),desc:'储水罐、净化设备与氧气管线组成生命保障回路。它连接生活、医疗和种植区域，维持基地长期运行。'});
  platform(48,54,17,15);
  artBox(15,6.2,11,M.mid,48,BASE_Y+3.1,53,group,.45);
  artBox(15.5,.4,12,M.white,48,BASE_Y+6.4,53,group,.15);
  artBox(11,4.9,.16,M.dark,48,BASE_Y+2.5,58.6,group,.08);
  for(var frame=0;frame<7;frame++)artBox(.16,4.5,.13,M.metal,43+frame*1.65,BASE_Y+2.6,58.73,group,.02);
  artBox(11,.14,.15,M.gWarm,48,BASE_Y+5.1,58.8,group,.02);
  for(var crate=0;crate<6;crate++)artBox(1.5,.9,1.3,M.containers[crate%6],43+crate%3*2,BASE_Y+.5+Math.floor(crate/3),60,group,.08);
  mk(new THREE.PlaneGeometry(5,1.25),colonySign('REPAIR / 04'),48,BASE_Y+5.75,58.77,group);
  addPOI({id:'repair-annex',name:'重型维修与备件库',en:'MAINTENANCE / 04',hit:{x:48,y:BASE_Y+3,z:54,r:8,h:7},pos:new THREE.Vector3(48,BASE_Y+7,54),desc:'检修机库和备件仓储为无人机、运输车与采矿装备提供轮换维护。外侧堆放标准化备件箱。'});
  platform(-52,50,17,17);
  mk(cylG(7,7,.2,48),M.mid,-52,BASE_Y+.15,50,group);
  mk(new THREE.TorusGeometry(6.5,.09,8,64),M.gCyan,-52,BASE_Y+.3,50,group).rotation.x=Math.PI/2;
  var shuttle=makeOrbitalShip();shuttle.group.scale.setScalar(.42);shuttle.group.position.set(-52,BASE_Y+2,50);shuttle.group.rotation.y=.3;shuttle.engine.visible=false;
  ecology.cargo={craft:shuttle,active:false,time:0};
  for(var leg=-1;leg<=1;leg+=2)for(var end=-1;end<=1;end+=2)artBox(.4,1.1,.7,M.metal,-52+leg*1.4,BASE_Y+.6,50+end*2.3,group,.05);
  groundLight(-52,50,18,18,0x69cbd9,group);
  addPOI({id:'cargo-port',name:'轻型货运空港',en:'CARGO / DOCK 02',hit:{x:-52,y:BASE_Y+2,z:50,r:8,h:7},pos:new THREE.Vector3(-52,BASE_Y+6,50),desc:'停泊的短程货船、起落支架与引导环灯组成独立物流节点，为基地运送维护零件和日常补给。'});
  mergeArt(group);
}
