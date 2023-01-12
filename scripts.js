/*** scripts.js - Main LEO View / JoEmbedded.de ***/
import * as THREE from './modules/three.module.min.js';
import {
  OrbitControls
} from './modules/OrbitControls.js';
import * as dat from './modules/dat.gui.module.js';

import * as haloglow from './haloglow.js';
import {
  initJot3,
  orbit,
  ambientLight,
  scene,
  camera,
  cameraHome,
  renderer,
  gui,
  guiTerminal,
  guiTerminalShow,
  guiTerminalClear,
  cartesian2Polar,
} from './t3helpers.js';

//--- Images ---
const backgroundImage = './img/night-sky.jpg';
const globeImg = './img/earth-jo.jpg'; // Earth

// --- Defines ---
const EARTH_RADIUS_KM = 6371 // km (== 1 UNIT)

// --- Globals ---
var altitudeKm = 0  // Altitude of camera

// --- Functions ---
function genEarth(){  // Earth
const earthTexture = new THREE.TextureLoader().load(globeImg);
const earthGemoatry = new THREE.SphereGeometry(1, 50, 50);
const earthMaterial = new THREE.MeshBasicMaterial({
  map: earthTexture
});

const sphereEarth = new THREE.Mesh(earthGemoatry, earthMaterial);
sphereEarth.name = "Earth"
sphereEarth.rotateY(-Math.PI / 2)
sphereEarth.position.set(0, 0, 0)
scene.add(sphereEarth);
const haloEarth = haloglow.createGlowMesh(earthGemoatry, {
  backside: true,
  color: '#F0FFFF',
  size: 0.05,
  power: 5, // dispersion
  coefficient: 0.4
});
scene.add(haloEarth);

}

// Monitor Camera Movement
var lastCamPos
function monitorView(){
lastCamPos = new THREE.Vector3(camera.position) // Last Cam Pos
orbit.addEventListener("change", () => {
  const e = camera.position;
  const d = e.distanceTo({
    x: 0,
    y: 0,
    z: 0
  })

  altitudeKm = ((d - 1) * EARTH_RADIUS_KM)
  // guiTerminal("Alt(km): " + altitudeKm.toFixed(0))
  if (d < 1.2 || d>100) { // EARTH RADs
    camera.position.copy(lastCamPos)
  } else {
    lastCamPos.copy(e)
  }
});
}

//==================== MAIN ====================
initJot3(); // Init Jo 3D Framwwork orbitcontrol, camera, scene
guiTerminal("\u2b50 LEO Satellite Viewer")
guiTerminal("\u2b50  V0.1 - JoEmbedded.de")

// Background - 6 ident. Sides Box
scene.background = new THREE.CubeTextureLoader().load(Array(6).fill(backgroundImage)); 

genEarth(); // R=1

monitorView();

var opt = {
  krad: 1,
  kdist: 1 ,  // Grob
  kdistf: 0,  // Fein
  kroty: 0,
  krotx: 0,
  opa: 0.5
}

const lineMaterialRed = new THREE.LineBasicMaterial({color: 'red',transparent: true, opacity: 0.5 }); 
const lineMaterialGreen = new THREE.LineBasicMaterial({color: 'green' }); 
const ANZSEG = 30 // Anzahl Segments Standardkreis
function circleInit(){
  let rstep = Math.PI*2 / ANZSEG
  let points = [];
  for(let i=0; i<Math.PI*2; i+= rstep){
    points.push(new THREE.Vector3(Math.sin(i), Math.cos(i), 0));
  }
  points.push(points[0])
  return new THREE.BufferGeometry().setFromPoints(points)
}

const circleGeometry = circleInit()

function earthCircle(hrad, hdisp, hlinemat = lineMaterialRed){
  const hcircle = new THREE.Object3D();
  const hcirclegeo = new THREE.Line(circleGeometry, hlinemat)
  hcircle.add(hcirclegeo);
  hcircle.position.z = hdisp
  hcircle.scale.x = hrad
  hcircle.scale.y = hrad
  return hcircle
}

const circleBeam = new THREE.Object3D();

const circle = earthCircle(0.1, opt.kdist+ opt.kdistf,lineMaterialGreen)
circleBeam.add(circle);

for(let i=1.0;i<3;i+=0.01) circleBeam.add(earthCircle(i/8,i));


circleBeam.scale.x=opt.krad
circleBeam.scale.y=opt.krad // Z without Function for Circle
scene.add(circleBeam);


gui.add(opt,'kdist',-3,3,0.1).onChange(()=>{
  circle.position.z = opt.kdist+ opt.kdistf;
})
gui.add(opt,'kdistf',-0.2,0.2,0.01).onChange(()=>{
  circle.position.z = opt.kdist+ opt.kdistf;
})
gui.add(opt,'krad',0,1.2,0.05).onChange(()=>{
  circleBeam.scale.x=opt.krad
  circleBeam.scale.y=opt.krad
})
gui.add(opt,'kroty',-1,1, 0.05).onChange(()=>{
//guiTerminal("Ry: "+opt.kroty)
circleBeam.rotation.y = opt.kroty
})
gui.add(opt,'krotx',-1,1, 0.05).onChange(()=>{
//  guiTerminal("Rx: "+opt.krotx)
  circleBeam.rotation.x = opt.krotx
  })
  gui.add(opt,'opa',0,1, 0.05).onChange(()=>{
//    guiTerminal("Rx: "+opt.krotx)
lineMaterialRed.opacity = opt.opa
})
    


// ---Animate all---
function animate() {
  circleBeam.rotation.x+=0.01
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
/***/