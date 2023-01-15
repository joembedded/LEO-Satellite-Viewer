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

const groupTrajectories = new THREE.Group(); // List of Trajectories

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
  searchmask: 'spacebee',
  puksize: 0.02, // rel to Earth (0.01: 60km!)
  fspeed: 10,
  propsec: 600, // 5500: ca 1 Cycle Propagation lenth in sec (if >0)
  stoprun: false,
  showbackimg: true,
  /*
    rx: 0,
    ry: 0,
    rz: 0,
  */
}
var appdgsearch;
var appdgprop;
var needsprop = false;

// Load LEO Data
async function tleSetup() {

  await TLE.loadTLEList()
  guiTerminal("Loaded " + TLE.SatList.length + " LEO Satellites")
  selectSats(false) // NoClear Terminal

  populateSatellites()
  needsprop = true;
  appdgsearch.onChange(() => {
    // console.log(appopt.searchmask)
    guiTerminalClear(); // Clear Terminal
    selectSats();
    populateSatellites()
    needsprop = true;
  })
  appdgprop.onChange(() => {
    needsprop = true;
  })

}

function genPuk(fnamepuk){
  const dpuktex = new THREE.TextureLoader().load(fnamepuk);
  const dpukm = new THREE.SpriteMaterial({
    map: dpuktex,
    transparent: true,
    depthWrite: false
  });
  return dpukm  
}

const pukMStandard = genPuk('./img/puk_256.png'); // PNG: transparent // Standard Gray PUK
const pukMSpacebee = genPuk('./img/puk_sb_256.png'); // PNG: transparent // Standard Gray PUK
const pukMAstrocast = genPuk('./img/puk_astrocast_256.png'); // PNG: transparent // Standard Gray PUK
const pukMStarlink = genPuk('./img/puk_starlink_256.png'); // PNG: transparent // Standard Gray PUK

function selpuk(name){
  if(name.toLowerCase().startsWith("spacebee")) return pukMSpacebee
  if(name.toLowerCase().startsWith("astrocast")) return pukMAstrocast
  if(name.toLowerCase().startsWith("starlink")) return pukMStarlink

  return pukMStandard 
}
const lineMaterialTrack = new THREE.LineBasicMaterial({
  color: 'red',
  transparent: true,
  opacity: 0.8
});

// Build Trajektory for rec anz steps per sec
function trajektorie(t0, sr, anz, msec) {
  let points = [];
  for (let i = 0; i < anz; i++) {
    const tdate = new Date(t0 + i * msec)
    const hpos = TLE.calcSrPositionEci(sr, tdate)
    if (hpos == undefined) return
    var rad = 1 + (hpos.alt / EARTH_RADIUS_KM)
    const kr = rad * Math.cos(hpos.lat)
    const x = kr * Math.sin(hpos.lng) // x:+nach rechts
    const z = kr * Math.cos(hpos.lng) // z:+nach Vorne
    const y = rad * Math.sin(hpos.lat) // y:+nach oben
    points.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

const TRACKRES = 100 // 100 sec/Track-Einheit
// Fill/Remove Tracks
function populateTracks() {
  groupTrajectories.clear();
  TLE.SatList.forEach((e) => { // Fur alle Sats
    if (e.track != null) {
      e.track.dispose(); // Geometrie entfernen
      e.track = null;
    }
  })

  if (appopt.propsec > 0) {
    const nd = new Date(tsZero)
    guiTerminal("Prop. Date: "+ nd.toUTCString());
    TLE.SelSatList.forEach((e) => {
      var anzsteps = appopt.propsec / TRACKRES
      if (anzsteps >= 2) { // Min. fuer Linie
        if (TLE.SelSatList.length>200 && anzsteps>3) anzsteps=3
        const tr = trajektorie(tsZero, e.sr, anzsteps, TRACKRES * 1000)
        if (tr !== undefined) {
          const hobj = new THREE.Object3D();
          const hline = new THREE.Line(tr, lineMaterialTrack)
          hobj.add(hline)
          groupTrajectories.add(hobj)
          e.track = tr
        }
      }
    })
  }
}

// Add to groupSatellites - make visible
function populateSatellites() {
  // Remove visible Elements form rendering (but not disposed)
  groupSatellites.clear();

  for (let i = 0; i < TLE.SelSatList.length; i++) {
    const ses = TLE.SelSatList[i];
    var nSat = ses.sat3Obj
    var nSprite = ses.sat3ObjSprite
    if (nSat == null) {
      nSprite = new THREE.Sprite(selpuk(ses.name));
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
  appdgsearch = appoptions.add(appopt, 'searchmask').name("Searchmask")

  guiTerminal("\u2b50 LEO View - Satellite Tracker \u2b50")
  guiTerminal("JoEmbedded.de / V0.1")
  guiTerminal("")

  // Background - 6 ident. Sides Box
  const backgroundcube = new THREE.CubeTextureLoader().load(Array(6).fill(backgroundImage));
  scene.background = (appopt.showbackimg) ? backgroundcube : undefined;

  genEarth() // R=1

  // Search action after load
  const h = appoptions.add(appopt, 'puksize', 0.001, 0.1).name("Sat.Size")
  h.onChange(
    () => {
      populateSatellites()
    })

  appoptions.add(new function () {
    this.cam0 = () => cameraHome()
  }, 'cam0').name("[ Camera Home ]");

  appoptions.add(appopt, 'stoprun').name("Halt")
  appoptions.add(appopt, 'fspeed', -100, 100, 1).name("Speed Factor")
  appdgprop = appoptions.add(appopt, 'propsec', 0, 86400, 400).name("Prop.(sec)")

  appoptions.add(appopt, 'showbackimg').name("Background Image").onChange(() => scene.background = (appopt.showbackimg) ? backgroundcube : undefined)

  monitorView() // Check Coords

  guiTerminal("Load LEO Satellite Data...")
  tleSetup()
  scene.add(groupSatellites)
  scene.add(groupTrajectories)

  initMouse()

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

          nSat.setRotationFromEuler(new THREE.Euler(-hpos.lat, hpos.lng, 0, 'YXZ'));
        }

      })
    }
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);

  const idtime = document.getElementById('id_time')
  setInterval(() => {
    var tdisp = cdate.toUTCString();
    if (appopt.fspeed == 1) tdisp += ' (Realtime)'
    else tdisp += ' (Speed: ' + appopt.fspeed + ')'
    idtime.innerText = tdisp
    if(needsprop==true){
      needsprop=false
      populateTracks()
    }
  }, 1000)

} catch (err) {
  alert("\u274C ERROR: - Reason: '" + err + "'")
}

/***/