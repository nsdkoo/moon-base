var artState={beacons:[],runningLights:[],windows:[],lightPools:[],habitatLight:null,pipeline:null};

function artTexture(width,height,paint,color){
  var surface=document.createElement('canvas');
  surface.width=width; surface.height=height;
  paint(surface.getContext('2d'),width,height);
  var texture=new THREE.CanvasTexture(surface);
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(color) texture.encoding=THREE.sRGBEncoding;
  return texture;
}

function configureArtDirection(){
  var hull=artTexture(512,512,function(context,width,height){
    context.fillStyle='#d6d6d0'; context.fillRect(0,0,width,height);
    for(var row=0;row<4;row++) for(var column=0;column<4;column++){
      var left=column*128,top=row*128;
      context.fillStyle=(row+column)%3===0?'#c7cac7':'#d5d7d2';
      context.fillRect(left+2,top+2,124,124);
      context.strokeStyle='#9babae'; context.lineWidth=1;
      context.strokeRect(left+3.5,top+3.5,121,121);
      context.fillStyle='#78868a';
      for(var bolt=0;bolt<4;bolt++) context.fillRect(left+(bolt%2?118:8),top+(bolt>1?118:8),2,2);
    }
    context.fillStyle='#68777a'; context.font='10px monospace';
    context.fillText('TRQ / PRESSURIZED',15,29);
    context.fillStyle='#ac8046'; context.fillRect(270,265,82,5);
    context.fillStyle='#829094'; context.fillRect(280,286,52,2);
  },true);
  var grain=artTexture(512,512,function(context,width,height){
    var pixels=context.createImageData(width,height);
    for(var py=0;py<height;py++) for(var px=0;px<width;px++){
      var offset=(py*width+px)*4;
      var value=130+noise2(px/26,py/26)*24+(hash3(px,12,py)-0.5)*65;
      pixels.data[offset]=pixels.data[offset+1]=pixels.data[offset+2]=value;
      pixels.data[offset+3]=255;
    }
    context.putImageData(pixels,0,0);
  },false);
  grain.wrapS=grain.wrapT=THREE.RepeatWrapping;
  var cells=artTexture(512,256,function(context,width,height){
    context.fillStyle='#132b40'; context.fillRect(0,0,width,height);
    for(var row=0;row<6;row++) for(var column=0;column<12;column++){
      var left=column*42.5,top=row*42.5;
      var gradient=context.createLinearGradient(left,top,left+40,top+40);
      gradient.addColorStop(0,'#304c5f'); gradient.addColorStop(1,'#142d46');
      context.fillStyle=gradient; context.fillRect(left+2,top+2,39,39);
      context.strokeStyle='rgba(172,190,194,.45)'; context.lineWidth=0.6;
      for(var wire=0;wire<5;wire++){
        context.beginPath();context.moveTo(left+5+wire*7,top+2);context.lineTo(left+5+wire*7,top+41);context.stroke();
      }
    }
  },true);
  var corrugation=artTexture(256,128,function(context,width,height){
    context.fillStyle='#d0d4d1';context.fillRect(0,0,width,height);
    for(var column=0;column<16;column++){
      var gradient=context.createLinearGradient(column*16,0,column*16+16,0);
      gradient.addColorStop(0,'#969f9f');gradient.addColorStop(.3,'#e5e8e1');gradient.addColorStop(.65,'#c6cdca');gradient.addColorStop(1,'#879291');
      context.fillStyle=gradient;context.fillRect(column*16,4,16,height-8);
    }
    context.fillStyle='#899594';context.fillRect(0,4,width,3);context.fillRect(0,height-7,width,3);
  },true);
  M.white.map=hull; M.white.color.copy(C(0xe3e1d6)); M.white.roughness=.48; M.white.metalness=.28;
  M.light.map=hull; M.light.color.copy(C(0xb8c2c4)); M.light.metalness=.38;
  M.mid.color.copy(C(0x66777f)); M.mid.roughness=.43;
  M.dark.color.copy(C(0x25323b)); M.dark.metalness=.6;
  M.metal.color.copy(C(0xa6b6be)); M.metal.roughness=.24;
  M.orange.color.copy(C(0xc28a49)); M.orange.roughness=.5;
  M.gold.color.copy(C(0xc9a259)); M.gold.roughness=.42;
  M.solar.map=cells; M.solar.color.set(0xffffff); M.solar.metalness=.52; M.solar.roughness=.3;
  M.solarF.map=cells;
  M.rego.bumpMap=grain; M.rego.bumpScale=.24;
  M.rock1.bumpMap=grain; M.rock1.bumpScale=.13;
  M.rock2.bumpMap=grain; M.rock2.bumpScale=.12;
  M.rock1.color.copy(C(0x747c80)); M.rock2.color.copy(C(0x555e65));
  M.glass.color.copy(C(0x4f828b)); M.glass.opacity=.3; M.glass.depthWrite=false; M.glass.metalness=.45;
  M.glassGH.color.copy(C(0x88a8a0)); M.glassGH.opacity=.22; M.glassGH.depthWrite=false; M.glassGH.metalness=.22;
  var freightPalette=[0x9b654c,0x425c65,0xa18d66,0x657269,0xbac2bc,0x7f898d];
  M.containers.forEach(function(material,index){material.map=corrugation;material.color.copy(C(freightPalette[index]));material.bumpMap=corrugation;material.bumpScale=.07;});
  var environment=artTexture(512,256,function(context,width,height){
    var gradient=context.createLinearGradient(0,0,0,height);
    gradient.addColorStop(0,'#151e2c');gradient.addColorStop(.42,'#66767e');gradient.addColorStop(.57,'#3a4248');gradient.addColorStop(1,'#11191e');
    context.fillStyle=gradient;context.fillRect(0,0,width,height);
    var reflection=context.createRadialGradient(120,90,0,120,90,85);
    reflection.addColorStop(0,'rgba(244,226,191,.85)');reflection.addColorStop(1,'rgba(244,226,191,0)');
    context.fillStyle=reflection;context.fillRect(0,0,width,height);
  },true);
  environment.mapping=THREE.EquirectangularReflectionMapping;
  var generator=new THREE.PMREMGenerator(renderer);
  var lighting=generator.fromEquirectangular(environment);
  scene.environment=lighting.texture;
  generator.dispose();environment.dispose();
  sun.shadow.normalBias=.035;
  sun.shadow.radius=2;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  scene.fog=null;
  M.gWarm.emissive.copy(C(0xffcf92)); M.gWarm.emissiveIntensity=2.4;
  M.gCold.emissive.copy(C(0x8cbbc4)); M.gCold.emissiveIntensity=1.5;
  M.gCyan.emissive.copy(C(0x79b4bc)); M.gCyan.emissiveIntensity=1.25;
  M.gGrow.emissive.copy(C(0xffdba7)); M.gGrow.emissiveIntensity=1.6;
  plGrow.color.set(0xffd3a0);
  astros.forEach(function(astronaut){astronaut.o.group.scale.setScalar(.65);});
  configureLens();
  bind('bOverview',resetView);
  bind('bHabitat',function(){goPreset(4);});
  bind('bLife',function(){followObj=null;flyTo(.3,.4,43,new THREE.Vector3(1,BASE_Y+2,4),1.4);});
  bind('bNight',function(){
    dayT=dayT>.52?.2535:.79;cycleOn=false;
    document.getElementById('time').value=Math.round(dayT*1000);
    document.getElementById('bCycle').classList.remove('on');
    document.getElementById('bNight').classList.toggle('on',dayT>.52);
  });
  bind('bOrbit',function(){
    cinematicOrbit=!cinematicOrbit;
    document.getElementById('bOrbit').classList.toggle('on',cinematicOrbit);
  });
}

function artBeam(start,end,radius,material,parent){
  var direction=new THREE.Vector3().subVectors(end,start);
  var beam=mk(cylG(radius,radius,direction.length(),8),material,undefined,undefined,undefined,parent);
  beam.position.copy(start).add(end).multiplyScalar(.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  return beam;
}

function configureLens(){
  var size=new THREE.Vector2();renderer.getDrawingBufferSize(size);
  var TargetType=renderer.capabilities.isWebGL2?THREE.WebGLMultisampleRenderTarget:THREE.WebGLRenderTarget;
  var target=new TargetType(size.x,size.y,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
  if(renderer.capabilities.isWebGL2) target.samples=2;
  renderer.info.autoReset=false;
  target.texture.encoding=THREE.sRGBEncoding;
  var glow=new THREE.WebGLRenderTarget(Math.floor(size.x/2),Math.floor(size.y/2),{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false});
  var vertex='varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
  var horizontal=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source:{value:target.texture},stepSize:{value:new THREE.Vector2(2/size.x,0)}},vertexShader:vertex,fragmentShader:'uniform sampler2D source;uniform vec2 stepSize;varying vec2 uvScreen;vec3 light(vec2 uv){vec3 rgb=texture2D(source,uv).rgb;float peak=max(rgb.r,max(rgb.g,rgb.b));return rgb*smoothstep(.79,.99,peak);}void main(){vec3 color=light(uvScreen)*.227027; color+=(light(uvScreen+stepSize*1.3846)+light(uvScreen-stepSize*1.3846))*.316216; color+=(light(uvScreen+stepSize*3.2307)+light(uvScreen-stepSize*3.2307))*.070270; gl_FragColor=vec4(color,1.);}'});
  var composite=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{source:{value:target.texture},glow:{value:glow.texture},stepSize:{value:new THREE.Vector2(0,2/size.y)}},vertexShader:vertex,fragmentShader:'uniform sampler2D source;uniform sampler2D glow;uniform vec2 stepSize;varying vec2 uvScreen;void main(){vec3 base=texture2D(source,uvScreen).rgb;vec3 bloom=texture2D(glow,uvScreen).rgb*.227027; bloom+=(texture2D(glow,uvScreen+stepSize*1.3846).rgb+texture2D(glow,uvScreen-stepSize*1.3846).rgb)*.316216; bloom+=(texture2D(glow,uvScreen+stepSize*3.2307).rgb+texture2D(glow,uvScreen-stepSize*3.2307).rgb)*.070270;gl_FragColor=vec4(base+bloom*.23,1.);}'});
  var screen=new THREE.Scene(),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),horizontal);screen.add(quad);
  artState.pipeline={target:target,glow:glow,horizontal:horizontal,composite:composite,quad:quad,screen:screen,camera:new THREE.Camera(),size:size};
}

function renderArtFrame(){
  var pipeline=artState.pipeline;
  renderer.info.reset();
  if(frame%3===0 || rocket.state==='up' || rocket.state==='down') renderer.shadowMap.needsUpdate=true;
  if(!pipeline){renderer.render(scene,camera);return;}
  var size=new THREE.Vector2();renderer.getDrawingBufferSize(size);
  if(!size.equals(pipeline.size)){
    pipeline.size.copy(size);pipeline.target.setSize(size.x,size.y);pipeline.glow.setSize(Math.floor(size.x/2),Math.floor(size.y/2));
    pipeline.horizontal.uniforms.stepSize.value.set(2/size.x,0);pipeline.composite.uniforms.stepSize.value.set(0,2/size.y);
  }
  renderer.setRenderTarget(pipeline.target);renderer.render(scene,camera);
  pipeline.quad.material=pipeline.horizontal;renderer.setRenderTarget(pipeline.glow);renderer.render(pipeline.screen,pipeline.camera);
  pipeline.quad.material=pipeline.composite;renderer.setRenderTarget(null);renderer.render(pipeline.screen,pipeline.camera);
}

function groundLight(worldX,worldZ,width,depth,color,group){
  var light=noShadow(mk(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({map:radialTex('rgba(255,255,255,.65)','rgba(255,255,255,0)'),color:color,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending}),worldX,terrainH(worldX,worldZ)+.055,worldZ,group));
  light.rotation.x=-Math.PI/2;artState.lightPools.push(light);
}

function lunarBoundary(angle){
  return TERRAIN_R*(.93+.036*Math.sin(angle*3+.7)+.024*Math.sin(angle*7-.3)+.009*Math.sin(angle*19));
}

function buildLunarTerrain(){
  var atlas=artTexture(1024,1024,function(context,width,height){
    var image=context.createImageData(width,height);
    for(var row=0;row<height;row++) for(var column=0;column<width;column++){
      var worldX=(column/width-.5)*176,worldZ=(row/height-.5)*176;
      var value=164+noise2(worldX*.17,worldZ*.17)*15+noise2(worldX*.75,worldZ*.75)*6+(hash3(column,7,row)-.5)*13;
      for(var craterIndex=0;craterIndex<CRATERS.length;craterIndex++){
        var crater=CRATERS[craterIndex];
        var distance=Math.hypot(worldX-crater.x,worldZ-crater.z)/crater.r;
        if(distance<1.5){
          value-=Math.max(0,1-distance)*22;
          value+=Math.exp(-Math.pow((distance-1.05)*6,2))*12;
        }
      }
      var offset=(row*width+column)*4;
      image.data[offset]=value*.97;image.data[offset+1]=value;image.data[offset+2]=value*1.015;image.data[offset+3]=255;
    }
    context.putImageData(image,0,0);
    context.strokeStyle='rgba(74,80,80,.19)';context.lineWidth=1.3;
    ROADS.forEach(function(road){
      var direction=Math.atan2(road[3]-road[1],road[2]-road[0]);
      for(var track=-1;track<=1;track+=2){
        var offsetX=Math.sin(direction)*track*.6,offsetZ=-Math.cos(direction)*track*.6;
        context.beginPath();context.moveTo((road[0]+offsetX+88)/176*width,(road[1]+offsetZ+88)/176*height);
        context.lineTo((road[2]+offsetX+88)/176*width,(road[3]+offsetZ+88)/176*height);context.stroke();
      }
    });
  },true);
  atlas.flipY=false;
  M.rego.map=atlas;M.rego.vertexColors=false;
  M.rego.bumpMap.repeat.set(24,24);M.rego.bumpScale=.11;
  var rings=136,sectors=256,positions=[0,terrainH(0,0),0],uvs=[.5,.5],indices=[];
  for(var ringIndex=1;ringIndex<=rings;ringIndex++){
    for(var sector=0;sector<sectors;sector++){
      var angle=sector/sectors*TAU,radius=ringIndex/rings*lunarBoundary(angle);
      var worldX=Math.cos(angle)*radius,worldZ=Math.sin(angle)*radius;
      positions.push(worldX,terrainH(worldX,worldZ),worldZ);uvs.push(worldX/176+.5,worldZ/176+.5);
    }
  }
  function vertexId(ring,sector){return ring===0?0:1+(ring-1)*sectors+(sector+sectors)%sectors;}
  for(var sector=0;sector<sectors;sector++) indices.push(0,vertexId(1,sector+1),vertexId(1,sector));
  for(var ringIndex=1;ringIndex<rings;ringIndex++) for(var sector=0;sector<sectors;sector++){
    var upper=vertexId(ringIndex,sector),upperNext=vertexId(ringIndex,sector+1),lower=vertexId(ringIndex+1,sector),lowerNext=vertexId(ringIndex+1,sector+1);
    indices.push(upper,upperNext,lower,upperNext,lowerNext,lower);
  }
  var geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  terrainMesh=mk(geometry,M.rego);
  var sidePositions=[],sideColors=[],sideIndices=[],sideUVs=[];
  var layers=[1,.99,.96,.9,.7,.35,.01];
  for(var layer=0;layer<layers.length;layer++) for(var sector=0;sector<sectors;sector++){
    var angle=sector/sectors*TAU,outerRadius=lunarBoundary(angle);
    var radius=outerRadius*layers[layer];
    var edgeHeight=terrainH(Math.cos(angle)*outerRadius,Math.sin(angle)*outerRadius);
    var height=layer===0?edgeHeight:edgeHeight-layer*3.5+(noise2(Math.cos(angle)*13+layer,Math.sin(angle)*13)*1.5);
    sidePositions.push(Math.cos(angle)*radius,height,Math.sin(angle)*radius);sideUVs.push(sector/sectors,layer*.2);
    var tint=C(layer%2?0x454e56:0x636b70);tint.multiplyScalar(1-layer*.065);sideColors.push(tint.r,tint.g,tint.b);
    if(layer<layers.length-1){
      var nextSector=(sector+1)%sectors;
      sideIndices.push(layer*sectors+sector,layer*sectors+nextSector,(layer+1)*sectors+sector,layer*sectors+nextSector,(layer+1)*sectors+nextSector,(layer+1)*sectors+sector);
    }
  }
  var sideGeometry=new THREE.BufferGeometry();
  sideGeometry.setAttribute('position',new THREE.Float32BufferAttribute(sidePositions,3));sideGeometry.setAttribute('color',new THREE.Float32BufferAttribute(sideColors,3));sideGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(sideUVs,2));sideGeometry.setIndex(sideIndices);sideGeometry.computeVertexNormals();
  mk(sideGeometry,std({vertexColors:true,roughness:1,metalness:0}));
  var rockGeometry=new THREE.IcosahedronGeometry(1,1),rockVertices=rockGeometry.attributes.position;
  for(var vertex=0;vertex<rockVertices.count;vertex++){
    var rockX=rockVertices.getX(vertex),rockY=rockVertices.getY(vertex),rockZ=rockVertices.getZ(vertex);
    var deformation=.8+hash3(Math.round(rockX*100),Math.round(rockY*100),Math.round(rockZ*100))*.34;
    rockVertices.setXYZ(vertex,rockX*deformation,rockY*deformation,rockZ*deformation);
  }
  rockGeometry.computeVertexNormals();
  var rocks=new THREE.InstancedMesh(rockGeometry,M.rock1,860),transform=new THREE.Object3D(),count=0;
  for(var attempt=0;attempt<1600&&count<860;attempt++){
    var angle=rnd()*TAU,radius=rrange(52,lunarBoundary(angle)-1),size=rrange(.12,.75);
    if(attempt%18===0) size=rrange(1.1,2.6);
    var worldX=Math.cos(angle)*radius,worldZ=Math.sin(angle)*radius;
    if(Math.hypot(worldX+56,worldZ+40)<7||Math.hypot(worldX,worldZ-62)<10) continue;
    transform.position.set(worldX,terrainH(worldX,worldZ)+size*.16,worldZ);
    transform.rotation.set(rnd()*.6,rnd()*TAU,rnd()*.4);transform.scale.set(size*1.2,size*.52,size*.8);transform.updateMatrix();rocks.setMatrixAt(count++,transform.matrix);
  }
  rocks.count=count;rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
}

function buildFissionUnit(){
  var group=new THREE.Group();scene.add(group);
  var ground=terrainH(-52,4);
  mk(cylG(4.8,5.3,.6,12),M.dark,-52,ground+.3,4,group);
  mk(cylG(2.2,2.8,5.4,24),M.metal,-52,ground+3.3,4,group);
  mk(cylG(2.6,2.6,.35,24),M.white,-52,ground+5.9,4,group);
  mk(sphG(2.2,24,12),M.white,-52,ground+5.95,4,group).scale.y=.32;
  for(var panel=0;panel<4;panel++){
    var angle=panel/4*TAU;
    var radiator=new THREE.Group();radiator.position.set(-52,ground+3.6,4);radiator.rotation.y=angle;group.add(radiator);
    artBox(4.4,5.4,.24,M.dark,4.4,0,0,radiator,.08);
    artBeam(new THREE.Vector3(2,0,0),new THREE.Vector3(6.2,0,0),.12,M.metal,radiator);
    for(var fin=0;fin<12;fin++) mk(boxG(3.9,.075,.3),M.metal,4.4,-2.4+fin*.43,0,radiator);
    artBox(.16,5.4,.27,M.orange,2.3,0,0,radiator,.03);
  }
  artGlow(-52,ground+6.6,4,0xffbf76,2,group);
  addPOI({id:'reactor',name:'裂变电源「烛龙」',en:'FISSION POWER',hit:{x:-52,y:ground+4,z:4,r:9,h:9},pos:new THREE.Vector3(-52,ground+10,4),desc:'屏蔽壳体与四组翅片式散热器为基地提供连续电力。废热通过散热板辐射出去，细小的琥珀指示灯显示电源运行状态。',stat:function(){return '40 kW · 散热回路正常';}});
  mergeArt(group);
}

function artBox(width,height,depth,material,x,y,z,parent,radius){
  radius=Math.min(radius||.16,width/5,height/5,depth/5);
  var shape=new THREE.Shape();
  shape.moveTo(-width/2+radius,-height/2);
  shape.lineTo(width/2-radius,-height/2);shape.quadraticCurveTo(width/2,-height/2,width/2,-height/2+radius);
  shape.lineTo(width/2,height/2-radius);shape.quadraticCurveTo(width/2,height/2,width/2-radius,height/2);
  shape.lineTo(-width/2+radius,height/2);shape.quadraticCurveTo(-width/2,height/2,-width/2,height/2-radius);
  shape.lineTo(-width/2,-height/2+radius);shape.quadraticCurveTo(-width/2,-height/2,-width/2+radius,-height/2);
  var geometry=new THREE.ExtrudeGeometry(shape,{depth:depth-radius*2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:radius*.5,bevelThickness:radius,curveSegments:3});
  geometry.translate(0,0,-depth/2+radius);
  return mk(geometry,material,x,y,z,parent);
}

function mergeArt(group){
  group.updateMatrixWorld(true);
  var buckets=new Map(),inverse=new THREE.Matrix4().copy(group.matrixWorld).invert();
  group.traverse(function(object){
    if(!object.isMesh||object.isInstancedMesh||object.material.transparent||Array.isArray(object.material)||object.userData.live) return;
    var key=object.material.uuid;
    if(!buckets.has(key)) buckets.set(key,{material:object.material,meshes:[],positions:[],normals:[],uvs:[]});
    buckets.get(key).meshes.push(object);
  });
  buckets.forEach(function(bucket){
    if(bucket.meshes.length<2) return;
    bucket.meshes.forEach(function(object){
      var geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
      var vertices=geometry.attributes.position,normals=geometry.attributes.normal,uvs=geometry.attributes.uv;
      for(var vertex=0;vertex<vertices.count;vertex++){
        bucket.positions.push(vertices.getX(vertex),vertices.getY(vertex),vertices.getZ(vertex));
        bucket.normals.push(normals.getX(vertex),normals.getY(vertex),normals.getZ(vertex));
        bucket.uvs.push(uvs?uvs.getX(vertex):0,uvs?uvs.getY(vertex):0);
      }
      object.parent.remove(object);geometry.dispose();
    });
    var merged=new THREE.BufferGeometry();
    merged.setAttribute('position',new THREE.Float32BufferAttribute(bucket.positions,3));
    merged.setAttribute('normal',new THREE.Float32BufferAttribute(bucket.normals,3));
    merged.setAttribute('uv',new THREE.Float32BufferAttribute(bucket.uvs,2));
    mk(merged,bucket.material,undefined,undefined,undefined,group);
  });
}

function artGlow(x,y,z,color,size,parent){
  var sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:radialTex('rgba(255,245,224,0.75)','rgba(255,245,224,0)'),color:color,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));
  sprite.position.set(x,y,z);sprite.scale.set(size,size,1);(parent||scene).add(sprite);
  artState.beacons.push(sprite);
  return sprite;
}

function domeFrame(x,y,z,radius,height,group){
  var lattice=new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1,2),1);
  var vertices=lattice.attributes.position,segments=[];
  for(var edge=0;edge<vertices.count;edge+=2){
    var start=new THREE.Vector3().fromBufferAttribute(vertices,edge);
    var end=new THREE.Vector3().fromBufferAttribute(vertices,edge+1);
    if(start.y<0&&end.y<0) continue;
    if(start.y<0) start.lerp(end,-start.y/(end.y-start.y));
    if(end.y<0) end.lerp(start,-end.y/(start.y-end.y));
    start.set(x+start.x*radius,y+start.y*height,z+start.z*radius);
    end.set(x+end.x*radius,y+end.y*height,z+end.z*radius);
    if(start.distanceTo(end)>.02) segments.push([start,end]);
  }
  var frame=new THREE.InstancedMesh(cylG(.065,.065,1,6),M.metal,segments.length);
  var transform=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
  segments.forEach(function(segment,index){
    var direction=new THREE.Vector3().subVectors(segment[1],segment[0]);
    transform.position.copy(segment[0]).add(segment[1]).multiplyScalar(.5);
    transform.quaternion.setFromUnitVectors(up,direction.clone().normalize());
    transform.scale.set(1,direction.length(),1);transform.updateMatrix();frame.setMatrixAt(index,transform.matrix);
  });
  group.add(frame);lattice.dispose();
}

function pressureTunnel(start,end,radius,group){
  var delta=new THREE.Vector3().subVectors(end,start),length=delta.length();
  artBeam(start,end,radius,M.light,group);
  for(var ringIndex=0;ringIndex<=Math.floor(length/1.3);ringIndex++){
    var center=start.clone().lerp(end,ringIndex/Math.floor(length/1.3));
    var collar=mk(new THREE.TorusGeometry(radius+.05,.09,6,20),M.dark,center.x,center.y,center.z,group);
    collar.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),delta.clone().normalize());
  }
}

function buildCommandHabitat(){
  var group=new THREE.Group();scene.add(group);
  var base=BASE_Y;
  mk(cylG(8.4,9,.6,8),M.dark,0,base+.3,-30,group);
  mk(cylG(6.8,7.1,5.4,12),M.white,0,base+3.3,-30,group);
  mk(cylG(7.2,7.2,.5,12),M.metal,0,base+6.3,-30,group);
  mk(cylG(7.65,7.3,.7,12),M.light,0,base+7,-30,group);
  mk(cylG(7.25,7.25,2.6,48),M.dark,0,base+8.6,-30,group);
  var windowMat=std({color:C(0x17414c),emissive:C(0xf1bd7f),emissiveIntensity:.35,roughness:.14,metalness:.68});
  artState.windows.push(windowMat);
  for(var bay=0;bay<12;bay++){
    var angle=bay/12*TAU;
    var window=artBox(3.28,1.65,.13,windowMat,Math.sin(angle)*7.28,base+8.6,-30+Math.cos(angle)*7.28,group,.03);
    window.rotation.y=angle;
    var sill=mk(boxG(3.2,.075,.2),M.gWarm,Math.sin(angle)*7.4,base+7.83,-30+Math.cos(angle)*7.4,group);sill.rotation.y=angle;
    var strut=mk(boxG(.19,2.8,.4),M.metal,Math.sin(angle+TAU/24)*7.4,base+8.6,-30+Math.cos(angle+TAU/24)*7.4,group);strut.rotation.y=angle+TAU/24;
    if(bay%2===0){
      var cover=artBox(2.2,2.8,.22,M.light,Math.sin(angle)*6.98,base+3.1,-30+Math.cos(angle)*6.98,group);cover.rotation.y=angle;
      for(var vent=0;vent<5;vent++){
        var slot=mk(boxG(1.5,.09,.24),M.dark,Math.sin(angle)*7.12,base+2.3+vent*.27,-30+Math.cos(angle)*7.12,group);slot.rotation.y=angle;
      }
    }
  }
  mk(cylG(6.8,8,1,12),M.white,0,base+10.4,-30,group);
  mk(cylG(3.8,4.3,.65,24),M.dark,0,base+11.2,-30,group);
  mk(cylG(2.2,3.8,1.8,24),M.white,0,base+12.3,-30,group);
  for(var mast=0;mast<3;mast++){
    var mastAngle=mast/3*TAU;
    artBeam(new THREE.Vector3(Math.cos(mastAngle)*2,base+13,-30+Math.sin(mastAngle)*2),new THREE.Vector3(0,base+23,-30),.11,M.metal,group);
  }
  for(var brace=0;brace<5;brace++) mk(new THREE.TorusGeometry(1.85-brace*.28,.055,5,3),M.dark,0,base+13+brace*1.8,-30,group).rotation.x=Math.PI/2;
  mk(cylG(.07,.1,3,8),M.metal,0,base+24,-30,group);
  mk(sphG(.22,10,8),M.gRed,0,base+25.5,-30,group);
  artGlow(0,base+25.5,-30,0xff7865,3.8,group);
  artBox(3.1,3.8,2.8,M.light,0,base+2.2,-21.8,group,.25);
  mk(cylG(1.15,1.15,.18,24),M.dark,0,base+2.4,-20.32,group).rotation.x=Math.PI/2;
  mk(new THREE.TorusGeometry(1.16,.12,8,28),M.metal,0,base+2.4,-20.18,group);
  artGlow(0,base+4.4,-20.6,0xffc28b,3,group);
  for(var step=0;step<4;step++) artBox(3.6,.22,1,M.mid,0,base+.55-step*.1,-19.8+step*.72,group,.04);
  addPOI({id:'tower',name:'静海指挥中心',en:'MISSION CONTROL',hit:{x:0,y:base+12,z:-30,r:9,h:26},pos:new THREE.Vector3(0,base+26,-30),desc:'十二面观测窗围绕加压指挥舱，设备夹层、检修面板与三角天线桅杆依次向上延伸。入口气闸把带尘作业区与舱内隔开。点击控制基地照明。'});
  mergeArt(group);
}

function habitatPod(x,z,length,group){
  var ground=terrainH(x,z),center=ground+3.3;
  mk(cylG(3,3,length,32),M.white,x,center,z,group).rotation.x=Math.PI/2;
  for(var end=-1;end<=1;end+=2){
    var cap=mk(sphG(3,24,16),M.white,x,center,z+end*length/2,group);cap.scale.z=.36;
    mk(new THREE.TorusGeometry(3.03,.18,8,32),M.dark,x,center,z+end*(length/2-.2),group);
    mk(cylG(1.35,1.35,.25,24),M.dark,x,center,z+end*(length/2+1.05),group).rotation.x=Math.PI/2;
    mk(new THREE.TorusGeometry(1.36,.12,8,24),M.metal,x,center,z+end*(length/2+1.2),group);
  }
  for(var section=-1;section<=1;section++){
    mk(new THREE.TorusGeometry(3.03,.09,8,32),M.metal,x,center,z+section*length*.3,group);
    for(var side=-1;side<=1;side+=2){
      var port=mk(cylG(.62,.62,.13,24),M.glass,x+side*2.9,center+.65,z+section*2.4,group);port.rotation.z=Math.PI/2;
      var rim=mk(new THREE.TorusGeometry(.67,.095,8,24),M.dark,x+side*2.95,center+.65,z+section*2.4,group);rim.rotation.y=Math.PI/2;
      artBox(.5,1.5,1,M.dark,x+side*2.1,ground+.65,z+section*2.4,group,.08);
    }
  }
  artBox(.18,.3,length*.8,M.orange,x+2.97,center-.55,z,group,.03);
  artBox(2.3,.3,length*.6,M.solar,x,center+3.05,z,group,.04);
}

function buildHabitatCluster(){
  var group=new THREE.Group();scene.add(group);
  var centerX=-27,centerZ=5,ground=BASE_Y;
  mk(cylG(11.3,11.6,1,48),M.dark,centerX,ground+.5,centerZ,group);
  mk(cylG(10.9,10.9,.18,48),M.light,centerX,ground+1.07,centerZ,group);
  mk(new THREE.TorusGeometry(11.05,.13,8,64),M.gWarm,centerX,ground+1.3,centerZ,group).rotation.x=Math.PI/2;
  var dome=mk(new THREE.SphereGeometry(11,48,24,0,TAU,0,Math.PI/2),M.glass,centerX,ground+1.15,centerZ,group);
  dome.scale.y=.76;dome.castShadow=false;
  domeFrame(centerX,ground+1.15,centerZ,11,8.36,group);
  mk(cylG(1.1,1.5,.45,20),M.white,centerX,ground+9.5,centerZ,group);
  var consoleTexture=artTexture(256,128,function(context,width,height){
    context.fillStyle='#162a30';context.fillRect(0,0,width,height);
    context.strokeStyle='#668b89';context.lineWidth=1;
    for(var grid=0;grid<8;grid++){context.beginPath();context.moveTo(grid*32,0);context.lineTo(grid*32,height);context.stroke();}
    context.fillStyle='#b7c7b4';context.font='9px monospace';context.fillText('TRQ / ENVIRONMENT',10,15);
    context.strokeStyle='#c5aa74';context.lineWidth=2;context.beginPath();
    for(var graph=0;graph<30;graph++){var graphX=12+graph*7,graphY=67+Math.sin(graph*.6)*14; if(graph===0)context.moveTo(graphX,graphY);else context.lineTo(graphX,graphY);}context.stroke();
    context.fillStyle='#7eaba6';for(var meter=0;meter<5;meter++) context.fillRect(12+meter*45,94,28,4+meter*3);
  },true);
  var consoleMat=std({color:C(0x9bacad),map:consoleTexture,emissive:0xffffff,emissiveMap:consoleTexture,emissiveIntensity:.6,roughness:.4,metalness:.3});
  mk(cylG(2.8,2.4,.65,32),M.white,centerX,ground+2.1,centerZ,group);
  mk(cylG(2.6,2.6,.1,32),consoleMat,centerX,ground+2.5,centerZ,group);
  for(var desk=0;desk<8;desk++){
    var angle=desk/8*TAU;
    var workstation=new THREE.Group();workstation.position.set(centerX+Math.cos(angle)*7,ground+1.2,centerZ+Math.sin(angle)*7);workstation.rotation.y=-angle+Math.PI/2;group.add(workstation);
    artBox(2.5,.22,1.1,M.white,0,1.5,0,workstation,.08);
    artBox(2.25,.8,.1,consoleMat,0,2,-.35,workstation,.02).rotation.x=-.2;
    artBox(.28,1.4,.55,M.dark,0,.7,0,workstation,.05);
    artBox(1,.23,1,M.dark,0,.9,1.1,workstation,.08);
    artBox(1,1,.24,M.dark,0,1.4,1.55,workstation,.08);
  }
  artState.habitatLight=new THREE.PointLight(0xffc284,3.5,30,2);artState.habitatLight.position.set(centerX,ground+5,centerZ);scene.add(artState.habitatLight);
  habitatPod(-14,20,8,group);
  habitatPod(-35,24,9,group);
  habitatPod(-45,3,8,group);
  pressureTunnel(new THREE.Vector3(-22,ground+2.2,13),new THREE.Vector3(-15,ground+2.2,15),1.35,group);
  pressureTunnel(new THREE.Vector3(-31,ground+2.2,14),new THREE.Vector3(-35,ground+2.2,18),1.35,group);
  pressureTunnel(new THREE.Vector3(-37,ground+2.2,5),new THREE.Vector3(-42,ground+2.2,5),1.35,group);
  addPOI({id:'hab',name:'栖居区「天鹰」',en:'EAGLE HABITAT',hit:{x:-28,y:ground+5,z:11,r:20,h:12},pos:new THREE.Vector3(-27,ground+12,5),desc:'三角网格穹顶包围中央工作站，三个独立加压舱通过柔性廊道相连。可以透过玻璃看见控制台、座椅和温暖的舱内照明。'});
  mergeArt(group);
}

function buildHydroponics(){
  var group=new THREE.Group();scene.add(group);
  var greenhouses=[[-6,33,6],[8,38,5]];
  var leafGeometry=new THREE.SphereGeometry(.45,7,5);
  var plants=new THREE.InstancedMesh(leafGeometry,M.plant,180);
  var transform=new THREE.Object3D(),plantCount=0;
  greenhouses.forEach(function(site,siteIndex){
    var ground=BASE_Y,radius=site[2];
    var foundation=mk(cylG(radius+.35,radius+.6,.7,40),M.dark,site[0],ground+.35,site[1],group);foundation.scale.z=1.35;
    var dome=mk(new THREE.SphereGeometry(radius,40,20,0,TAU,0,Math.PI/2),M.glassGH,site[0],ground+.8,site[1],group);dome.scale.set(1,.8,1.35);dome.castShadow=false;
    for(var rib=-3;rib<=3;rib++){
      var zOffset=rib*radius*.3;
      var localRadius=radius*Math.sqrt(1-Math.pow(zOffset/(radius*1.35),2));
      var points=[];
      for(var arc=0;arc<=20;arc++){
        var angle=arc/20*Math.PI;
        points.push(new THREE.Vector3(site[0]+Math.cos(angle)*localRadius,ground+.8+Math.sin(angle)*localRadius*.8,site[1]+zOffset));
      }
      mk(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.075,5,false),M.metal,undefined,undefined,undefined,group);
    }
    for(var bed=-1;bed<=1;bed++){
      artBox(1.65,.45,radius*1.65,M.white,site[0]+bed*2.5,ground+1.05,site[1],group,.08);
      artBox(1.45,.12,radius*1.6,M.dark,site[0]+bed*2.5,ground+1.35,site[1],group,.02);
      for(var row=0;row<10;row++) for(var column=0;column<3;column++){
        transform.position.set(site[0]+bed*2.5+(column-1)*.4,ground+1.75+(column%2)*.15,site[1]-radius*.7+row*radius*.15);
        transform.scale.set(.9,.75+hash3(row,column,bed)*.5,.75);transform.rotation.set(.2,column*.9,row*.45);transform.updateMatrix();plants.setMatrixAt(plantCount++,transform.matrix);
      }
    }
    var growLight=mk(boxG(radius*1.3,.13,.16),M.gGrow,site[0],ground+radius*.64,site[1],group);
    growLight.userData.live=true;
    if(siteIndex===0) growBar1=growLight;else growBar2=growLight;
    artGlow(site[0],ground+2.8,site[1],0xffd29a,5,group);
    artBox(2.4,2.8,2.2,M.white,site[0],ground+1.7,site[1]+radius*1.35,group,.25);
    artBox(1.4,2.1,.1,M.dark,site[0],ground+1.7,site[1]+radius*1.35+1.15,group,.15);
  });
  plants.count=plantCount;group.add(plants);
  addPOI({id:'gh',name:'生态舱「田园」',en:'HYDROPONICS',hit:{x:0,y:BASE_Y+4,z:35,r:15,h:9},pos:new THREE.Vector3(0,BASE_Y+10,35),desc:'弧形透明舱壳下是分列的水培种植床、补光灯和密封气闸。植物与工作灯为灰色月面带来一处温暖的生机。点击切换种植灯。'});
  mergeArt(group);
}

function buildVehicleHangar(){
  var group=new THREE.Group();scene.add(group);
  var x=26,z=18,base=BASE_Y;
  artBox(16,.65,14,M.dark,x,base+.32,z,group,.15);
  artBox(14,6,11,M.light,x,base+3.5,z,group,.6);
  artBox(14.4,.5,11.4,M.white,x,base+6.75,z,group,.2);
  artBox(9.8,4.65,.2,M.dark,x,base+2.9,z+5.7,group,.3);
  artBox(9.1,1.2,.3,M.metal,x,base+4.7,z+5.95,group,.04);
  for(var slat=0;slat<7;slat++) mk(boxG(9,.04,.07),M.dark,x,base+4.2+slat*.16,z+6.15,group);
  mk(boxG(9,.12,.16),M.gWarm,x,base+5.6,z+5.95,group);
  artGlow(x,base+4.8,z+6,0xffd7a0,6,group);
  for(var side=-1;side<=1;side+=2){
    artBox(.4,5.6,.4,M.metal,x+side*5.3,base+3,z+5.85,group,.04);
    artBox(1.9,2.5,.3,M.white,x+side*6.35,base+3,z+5.75,group,.1);
    mk(boxG(.5,.14,.1),M.gGreen,x+side*5.9,base+3.3,z+5.96,group);
    artBox(.45,1.9,.45,M.orange,x+side*5.8,base+1.1,z+7.2,group,.06);
  }
  for(var panel=0;panel<5;panel++) artBox(2.1,.2,6,M.solar,x-5.1+panel*2.55,base+7.2,z,group,.05);
  for(var parking=0;parking<3;parking++){
    mk(boxG(.08,.025,4),M.white,x-3.5+parking*3.5,base+.68,z+5,group);
  }
  addPOI({id:'garage',name:'机动维护舱',en:'ROVER SERVICE BAY',hit:{x:x,y:base+4,z:z,r:10,h:9},pos:new THREE.Vector3(x,base+10,z),desc:'半开启的卷帘门后是巡视车维护工位。屋顶光伏、充电指示灯、门框防撞柱和设备检修面板共同构成月面工作车的归航点。点击派出或召回巡视车。'});
  mergeArt(group);
}

function padDecal(x,z,radius,caption,y,group){
  var texture=artTexture(512,512,function(context,width,height){
    context.clearRect(0,0,width,height);
    context.strokeStyle='#c1b69b';context.lineWidth=5;context.beginPath();context.arc(256,256,220,0,TAU);context.stroke();
    context.setLineDash([12,14]);context.strokeStyle='#b48b56';context.lineWidth=9;context.beginPath();context.arc(256,256,198,0,TAU);context.stroke();context.setLineDash([]);
    context.strokeStyle='#d5d8ce';context.lineWidth=9;
    context.strokeRect(220,204,72,100);context.beginPath();context.moveTo(200,256);context.lineTo(312,256);context.stroke();
    context.fillStyle='#d5d8ce';context.font='20px monospace';context.textAlign='center';context.fillText(caption,256,370);
    context.font='12px monospace';context.fillText('TRQ / FLIGHT OPERATIONS',256,155);
  },true);
  var decal=noShadow(mk(new THREE.PlaneGeometry(radius*2,radius*2),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),x,y,z,group));decal.rotation.x=-Math.PI/2;
}

function dressIndustrialFacilities(){
  var group=new THREE.Group();scene.add(group);
  artBox(.8,.65,16,M.dark,0,.45,0,crane.trolley,.1);
  for(var side=-1;side<=1;side+=2){
    artBox(1.6,.8,1.3,M.metal,0,.3,side*7.5,crane.trolley,.1);
    artBeam(new THREE.Vector3(15.5,BASE_Y+9,38+side*7.5),new THREE.Vector3(19,BASE_Y+13.4,38+side*7.5),.12,M.dark,group);
    artBeam(new THREE.Vector3(32.5,BASE_Y+9,38+side*7.5),new THREE.Vector3(29,BASE_Y+13.4,38+side*7.5),.12,M.dark,group);
    artBox(18,.18,.22,M.metal,24,BASE_Y+14.2,38+side*7.5,group,.03);
  }
  crane.hook.geometry.dispose();crane.hook.geometry=new THREE.TorusGeometry(.42,.12,8,20,Math.PI*1.7);
  for(var ring=0;ring<9;ring++) mk(new THREE.TorusGeometry(1.615,.035,6,32),M.metal,0,1.5+ring*1.5,0,rocket.group).rotation.x=Math.PI/2;
  for(var leg=0;leg<4;leg++){
    var legAngle=leg/4*TAU;
    artBeam(new THREE.Vector3(Math.cos(legAngle)*1.5,2.4,Math.sin(legAngle)*1.5),new THREE.Vector3(Math.cos(legAngle)*2.6,.1,Math.sin(legAngle)*2.6),.09,M.metal,rocket.group);
    artBox(.85,.15,.85,M.dark,Math.cos(legAngle)*2.6,0,Math.sin(legAngle)*2.6,rocket.group,.06);
  }
  padDecal(54,0,5.1,'EAGLE / A',BASE_Y+1.53,group);
  padDecal(14,50,5.1,'EAGLE / B',BASE_Y+1.53,group);
  padDecal(36,-36,9,'TRQ / 01',BASE_Y+2.01,group);
  var pipeRoute=[[-50,33],[-39,33],[-39,43],[-17,43]];
  for(var segment=0;segment<pipeRoute.length-1;segment++){
    for(var line=0;line<2;line++){
      var start=new THREE.Vector3(pipeRoute[segment][0],BASE_Y+.8+line*.5,pipeRoute[segment][1]);
      var end=new THREE.Vector3(pipeRoute[segment+1][0],BASE_Y+.8+line*.5,pipeRoute[segment+1][1]);
      artBeam(start,end,.17,line?M.orange:M.metal,group);
    }
  }
  for(var tank=0;tank<3;tank++){
    var tankX=-50+tank*4,ground=terrainH(tankX,28);
    mk(new THREE.TorusGeometry(3.11,.09,8,40),M.metal,tankX,ground+5.4,28,group).rotation.x=Math.PI/2;
    artBeam(new THREE.Vector3(tankX,ground+8.6,28),new THREE.Vector3(tankX,ground+9.1,28),.15,M.dark,group);
    for(var rung=0;rung<10;rung++) mk(boxG(.85,.07,.12),M.metal,tankX,ground+1.7+rung*.62,31.08,group);
    artBeam(new THREE.Vector3(tankX-.45,ground+1.4,31.08),new THREE.Vector3(tankX-.45,ground+7.6,31.08),.055,M.metal,group);
    artBeam(new THREE.Vector3(tankX+.45,ground+1.4,31.08),new THREE.Vector3(tankX+.45,ground+7.6,31.08),.055,M.metal,group);
  }
  groundLight(0,-18,10,8,0xe1a467,group);
  groundLight(-27,5,23,23,0xefb46d,group);
  groundLight(26,27,16,10,0xe9bc84,group);
  groundLight(-6,33,12,15,0xd7b778,group);
  groundLight(8,38,10,13,0xd7b778,group);
  groundLight(14,50,11,11,0xd6b075,group);
  for(var marker=0;marker<32;marker++){
    var angle=marker/32*TAU;
    var location=new THREE.Vector3(Math.cos(angle)*RAIL_R,RAIL_Y+.22,Math.sin(angle)*RAIL_R);
    var lampMaterial=M.gWarm.clone();
    var lamp=noShadow(mk(boxG(.26,.14,.55),lampMaterial,location.x,location.y,location.z,group));
    lamp.rotation.y=-angle;lamp.userData.live=true;
    artState.runningLights.push(lampMaterial);
  }
  for(var roadIndex=0;roadIndex<ROADS.length;roadIndex++){
    var road=ROADS[roadIndex],distance=Math.hypot(road[2]-road[0],road[3]-road[1]);
    for(var stripe=3;stripe<distance-2;stripe+=4){
      var fraction=stripe/distance;
      var stripeX=lerp(road[0],road[2],fraction),stripeZ=lerp(road[1],road[3],fraction);
      var marking=noShadow(mk(boxG(.07,.018,.9),M.mid,stripeX,terrainH(stripeX,stripeZ)+.025,stripeZ,group));
      marking.rotation.y=Math.atan2(road[2]-road[0],road[3]-road[1]);
    }
  }
  mergeArt(group);
}

function updateArt(time,daylight){
  var launchButton=document.getElementById('bLaunch');
  if(launchButton.dataset.state!==rocket.state){
    launchButton.dataset.state=rocket.state;
    launchButton.disabled=rocket.state!=='idle';
    launchButton.textContent={idle:'发射',count:'准备中',up:'升空中',away:'在轨',down:'着陆中'}[rocket.state];
  }
  artState.beacons.forEach(function(beacon,index){beacon.material.opacity=(lightsOn ? .6 : 0)*(1+.15*Math.sin(time*1.7+index));});
  artState.windows.forEach(function(material){material.emissiveIntensity=lightsOn ? .18+1.7*(1-daylight) : 0;});
  artState.lightPools.forEach(function(pool){pool.material.opacity=lightsOn ? .55*(1-daylight*.85) : 0;});
  M.gWarm.emissiveIntensity=lightsOn ? 2.4 : 0;
  M.gCold.emissiveIntensity=lightsOn ? 1.8 : 0;
  M.gCyan.emissiveIntensity=lightsOn ? 1.5 : 0;
  M.gWhite.emissiveIntensity=lightsOn ? 2.2 : 0;
  M.gGrow.emissiveIntensity=growOn ? 2 : 0;
  artState.runningLights.forEach(function(material,index){
    var phase=(time*.7-index*.17)%TAU;
    material.emissiveIntensity=lightsOn?(1+1.4*Math.pow(Math.max(0,Math.sin(phase)),12)):0;
  });
  if(artState.habitatLight) artState.habitatLight.intensity=lightsOn?(2.2+2.4*(1-daylight)):0;
  if(artState.lifeLights) artState.lifeLights.forEach(function(lamp){lamp.light.intensity=lightsOn?lamp.intensity*(1-daylight*.65):0;});
}

function buildProcessingPlant(){
  var group=new THREE.Group();scene.add(group);
  var ground=BASE_Y;
  artBox(16,.55,15,M.dark,40,ground+.28,-14,group,.2);
  for(var unit=0;unit<2;unit++){
    var centerX=36.5+unit*6;
    mk(cylG(2.35,2.35,8.4,32),M.metal,centerX,ground+3.4,-15,group).rotation.x=Math.PI/2;
    for(var end=-1;end<=1;end+=2){
      var cap=mk(sphG(2.35,24,16),M.white,centerX,ground+3.4,-15+end*4.2,group);cap.scale.z=.35;
    }
    for(var ring=0;ring<5;ring++) mk(new THREE.TorusGeometry(2.4,.1,8,32),M.dark,centerX,ground+3.4,-18.4+ring*1.7,group);
    for(var foot=-1;foot<=1;foot+=2) artBox(3.8,1.4,1,M.light,centerX,ground+1,-15+foot*2.9,group,.1);
    var columnX=centerX+1.4;
    mk(cylG(.8,1.1,8,20),M.metal,columnX,ground+9.1,-16,group);
    mk(cylG(1.05,1.05,.25,24),M.dark,columnX,ground+13.1,-16,group);
    for(var collar=0;collar<4;collar++) mk(new THREE.TorusGeometry(.85,.075,6,24),M.white,columnX,ground+6.5+collar*1.65,-16,group).rotation.x=Math.PI/2;
    artBeam(new THREE.Vector3(centerX,ground+4.8,-10),new THREE.Vector3(centerX,ground+7,-10),.16,M.orange,group);
    artBeam(new THREE.Vector3(centerX,ground+7,-10),new THREE.Vector3(centerX,ground+7,-15),.16,M.orange,group);
  }
  artBox(9.8,3.5,3,M.white,40,ground+2.1,-6.9,group,.35);
  artBox(8.3,1.1,.16,M.dark,40,ground+2.65,-5.32,group,.06);
  for(var window=0;window<5;window++) artBox(1.25,.63,.1,M.gWarm,36.8+window*1.6,ground+2.65,-5.21,group,.035);
  for(var rack=0;rack<3;rack++){
    artBox(2.2,.4,4.5,M.dark,37.5+rack*2.5,ground+4.13,-7.1,group,.08);
    for(var fin=0;fin<7;fin++) mk(boxG(2,.09,.1),M.metal,37.5+rack*2.5,ground+4.38,-8.9+fin*.6,group);
  }
  groundLight(40,-3.8,13,7,0xe4b47a,group);
  addPOI({id:'plant',name:'资源处理站',en:'REGOLITH / ISRU',hit:{x:40,y:ground+6,z:-14,r:10,h:15},pos:new THREE.Vector3(40,ground+15,-14),desc:'双列处理罐、分离塔与热交换管路将月壤中的资源转化为氧气和建材。前部控制舱负责监测每个生产回路。'});
  mergeArt(group);
}
