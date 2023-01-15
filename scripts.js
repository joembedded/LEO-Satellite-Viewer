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
var altitudeKm = 0 // Altitude of camera opt
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
    // console.log("ALt(d): ",d)
    if (d < 1.2 || d > 6) { // EARTH RADs
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
var tsZero = Date.now() // Updated on Hold
const appopt = {
  searchmask: 'Astrocast',
  puksize: 0.02, // rel to Earth (0.01: 60km!)
  fspeed: 10,
  stoprun: false,
  showbackimg: true,
  /*
    rx: 0,
    ry: 0,
    rz: 0,
  */
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

// Add to groupSatellites - make visible
function populateSatellites() {
  // Remove visible Elements form rendering (but not disposed)
  groupSatellites.clear();

  for (let i = 0; i < TLE.SelSatList.length; i++) {
    const ses = TLE.SelSatList[i];

    var nSat = ses.sat3Obj
    var nSprite = ses.sat3ObjSprite
    if (nSat == null) {
      nSprite = new THREE.Sprite(pukMaterial);
      nSprite.position.set(0, 0, 1) // Direct on Earth
      nSat = new THREE.Object3D() // Center Obj
      nSat.add(nSprite)
      ses.sat3Obj = nSat
      ses.sat3ObjSprite = nSprite
    }
    nSprite.name = "s" + i // Name is Index in SelList
    nSprite.scale.set(appopt.puksize, appopt.puksize)
    groupSatellites.add(nSat);
  }
  // Now visSats ready
}

// Mouse-Functions
const mousePosition = new THREE.Vector2();
const rayCaster = new THREE.Raycaster();

function initMouse() {
  window.addEventListener('click', (e) => {
    mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    //console.log("Click(rX,rY): ", mousePosition.x.toFixed(5), mousePosition.y.toFixed(5))
    rayCaster.setFromCamera(mousePosition, camera);
    const intersects = rayCaster.intersectObjects(scene.children /*, false*/ ); //Deep

    intersects.every((e) => {
      const name = e.object.name
      if (name !== undefined) {
        //console.log("Name: ", name)
        if (name == 'Earth') {
          var t2 = cartesian2Polar(e.point);
          //console.log("HIT(x,y,z):", e.point.x.toFixed(3), e.point.y.toFixed(3), e.point.z.toFixed(3))
          var wgs = cartesian2Polar(e.point);
          guiTerminal("\u25cf Earth: Lat/Lng: " + wgs.lat.toFixed(2) + "/" + wgs.lng.toFixed(2)) // WGS84
          return false // Bye!
        }
        if (name.startsWith('s')) {
          const idx = parseInt(name.substring(1))
          const sat = TLE.SelSatList[idx]
          guiTerminal("\u25cf Satellite '" + sat.name + "':");
          if (sat.satPos == null) {
            guiTerminal("- Error: 'satrec.error:" + sat.sr.error + "'");
          } else {
            guiTerminal("- Lat/Lng: " + satellite.degreesLong(sat.satPos.lat).toFixed(3) + "/" +
              satellite.degreesLong(sat.satPos.lng).toFixed(3))
            guiTerminal("- Altitude: " + sat.satPos.alt.toFixed(0) + " km");
            if (sat.satPos.speed) // >0 (only if enabled)
              guiTerminal("- Speed: " + sat.satPos.speed.toFixed(3) + "km/sec");
          }
          return false // Bye!
        }
      }
      return true // Continue
    })
  });
}

//==================== MAIN ====================
try {
  initJot3(false, false); // Init Jo 3D Framwwork orbitcontrol, camera, scene

  const appoptions = gui.addFolder("App Options");
  appoptions.open();
  appdatagui = appoptions.add(appopt, 'searchmask').name("Searchmask")

  guiTerminal("\u2b50 LEO Satellite Viewer \u2b50")
  guiTerminal("JoEmbedded.de / V0.1")
  guiTerminal("")

  // Background - 6 ident. Sides Box
  const backgroundcube = new THREE.CubeTextureLoader().load(Array(6).fill(backgroundImage));
  scene.background = (appopt.showbackimg) ? backgroundcube : undefined;

  genEarth() // R=1

  // Search action after load
  const h = appoptions.add(appopt, 'puksize', 0.001, 0.05).name("Sat.Size")
  h.onChange(
    () => {
      populateSatellites()
    })

  appoptions.add(new function () {
    this.cam0 = () => cameraHome()
  }, 'cam0').name("[ Camera Home ]");

  appoptions.add(appopt, 'stoprun').name("Halt")
  appoptions.add(appopt, 'fspeed', -100, 100, 10).name("Speed Factor")
  appoptions.add(appopt, 'showbackimg').name("Background Image").onChange(() => scene.background = (appopt.showbackimg) ? backgroundcube : undefined)

  /*
  appoptions.add(appopt, 'rx', -90, 90, 0.1).name("Lat")
  appoptions.add(appopt, 'rx', -90, 90, 0.1).name("Lat")
  appoptions.add(appopt, 'ry', -180, 180, 0.1).name("Lng")
  appoptions.add(appopt, 'rz', -7, 7, 0.01)
*/

  monitorView() // Check Coords

  guiTerminal("Load LEO Satellite Data...")
  tleSetup()
  scene.add(groupSatellites)

  initMouse()

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
  // Frame
  var cdate = Date.now()

  function animate() {
    //circleBeam.rotation.x+=0.01
    if (!appopt.stoprun) {
      const tsDelta = (Date.now() - tsZero) * appopt.fspeed
      cdate = new Date(tsZero + tsDelta)

      // console.log(cdate.toString(), (tsDelta/1000))

      TLE.calcPositions(cdate);

      TLE.SelSatList.forEach((e) => {
        const nSat = e.sat3Obj
        const hpos = e.satPos
        if (hpos != null) {
          nSat.scale.z = 1 + (hpos.alt / EARTH_RADIUS_KM)

          //nSat.rotation.z = 0.853; // hpos.lng
          //nSat.rotation.y = 0.08; // hpos.lat 
          nSat.setRotationFromEuler(new THREE.Euler(-hpos.lat, hpos.lng, 0, 'YXZ'));
          /*
                      nSat.rotation.y = appopt.ry / 180 * Math.PI
                      nSat.rotation.x = -appopt.rx / 180 * Math.PI
                      nSat.rotation.z = appopt.rz
                nSat.setRotationFromEuler(new THREE.Euler( -appopt.rx / 180 * Math.PI, appopt.ry / 180 * Math.PI,0,'YXZ' ));
          */
        }

      })
    }
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  setInterval(()=>{
    console.log(cdate)
  },1000)

} catch (err) {
  alert("\u274C ERROR: - Reason: '" + err + "'")
}

/***/