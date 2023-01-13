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

import * as TLE from './tleloader.js'

//--- Images ---
const backgroundImage = './img/night-sky.jpg';
const globeImg = './img/earth-jo.jpg'; // Earth

// --- Defines ---
const EARTH_RADIUS_KM = 6371 // km (== 1 UNIT)

// --- Globals ---
var altitudeKm = 0 // Altitude of camera

const groupSatellites = new THREE.Group(); // List of displayed satellites

// --- Functions ---
function genEarth() { // Earth
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
    coefficient: 0.5
  });
  scene.add(haloEarth);

}

// Monitor Camera Movement
var lastCamPos

function monitorView() {
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
    if (d < 1.2 || d > 100) { // EARTH RADs
      camera.position.copy(lastCamPos)
    } else {
      lastCamPos.copy(e)
    }
  });
}

/* Select and Show */
function selectSats() {
  const anz = TLE.buildSelectedSatList(appopt.searchmask)
  guiTerminal("No of Satellites matching '" + appopt.searchmask + "': " + anz);
  for (let i = 0; i < anz; i++) {
    const ava = guiTerminal(i + ": '" + TLE.SelSatList[i].name + "'")
    if (ava < 3 && (anz - i) > 1) {
      guiTerminal("... and " + (anz - i) + " more")
      break
    }
  }
}

//--- App Options ---
const appopt = {
  searchmask: 'Astrocast',
}

var appdatagui;
// Load LEO Data
async function tleSetup() {

  await TLE.loadTLEList()
  guiTerminal("Loaded " + TLE.SatList.length + " LEO Satellites")
  selectSats(false) // NoClear Terminal
  populateSatellites()
  appdatagui.onChange(() => {
    // console.log(appopt.searchmask)
    guiTerminalClear(); // Clear Terminal
    selectSats();
    populateSatellites()
  })

}

// Standard Gray PUK
const pukImg = './img/puk_256.png'; // PNG: transparent
const pukTexture = new THREE.TextureLoader().load(pukImg);
const pukMaterial = new THREE.SpriteMaterial({
  map: pukTexture,
  transparent: true,
  depthWrite: false
});

const PUKSIZE = 0.01 // rel to Earth

// Add to groupSatellites - make visible
function populateSatellites() {
  // Remove visible Elements form rendering (but not disposed)
  groupSatellites.clear();

  for (let i = 0; i < TLE.SelSatList.length; i++) {
    const ses = TLE.SelSatList[i];

    var nSat = ses.sat3Obj
    if (nSat == null) { 
      const nSprite = new THREE.Sprite(pukMaterial);
      nSprite.scale.set(PUKSIZE, PUKSIZE)
      nSprite.position.set(0, 0, 1.1)
      nSat = new THREE.Object3D(); // Center Obj
      nSat.add(nSprite)
      nSat.rotation.y = i / 100
      ses.sat3Obj = nSat
    }
    groupSatellites.add(nSat);
  }
  // Now visSats ready
}

//==================== MAIN ====================
try {
  initJot3(); // Init Jo 3D Framwwork orbitcontrol, camera, scene

  const appoptions = gui.addFolder("App Options");
  appoptions.open();
  appdatagui = appoptions.add(appopt, 'searchmask').name("Searchmask")

  guiTerminal("\u2b50 LEO Satellite Viewer \u2b50")
  guiTerminal("JoEmbedded.de / V0.1")
  guiTerminal("")

  // Background - 6 ident. Sides Box
  scene.background = new THREE.CubeTextureLoader().load(Array(6).fill(backgroundImage));

  genEarth() // R=1

  monitorView() // Mouse Handler

  guiTerminal("Load LEO Satellite Data...")
  tleSetup()

  scene.add(groupSatellites)



  /*
  var opt = {
    krad: 1,
    kdist: 1 ,  // Grob
    kdistf: 0,  // Fein
    kroty: 0,
    krotx: 0,
    opa: 0.5
  }

  const lineMaterialRed = new THREE.LineBasicMaterial({color: 'red',transparent: true, opacity: 0.8 }); 
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

  // A circle on he ground or above Earth
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

  const circle = earthCircle(0.1, opt.kdist+ opt.kdistf,new THREE.LineBasicMaterial({color: 'green' })); 

  circleBeam.add(circle);

  for(let i=1.0;i<2;i+=0.05) circleBeam.add(earthCircle(i/8,i));


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
  */


  // ---Animate all---
  function animate() {
    //circleBeam.rotation.x+=0.01

    TLE.calcPositions();
    TLE.SelSatList.forEach((e)=>{

    })

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);

} catch (err) {
  alert("\u274C ERROR: - Reason: '" + err + "'")
}

/***/