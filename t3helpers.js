/* T3Helpers / JoEmbedded */
import * as THREE from './modules/three.module.min.js';

import {
  OrbitControls
} from './modules/OrbitControls.js';
import * as dat from './modules/dat.gui.module.js';

// Setup oftenUsed things...
export const renderer = new THREE.WebGLRenderer({
  antialias: true
});
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(
  45, // Angle FieldOfView
  window.innerWidth / window.innerHeight, // Ratio
  0.1, // MinRender
  1000 // MaxDist
);
export const orbit = new OrbitControls(camera, renderer.domElement); // Mouse CameraMove
export const gridHelper = new THREE.GridHelper(10, 10);
export const axesHelper = new THREE.AxesHelper(4);
export const ambientLight = new THREE.AmbientLight('white', 1.0);

// API: https://github.com/dataarts/dat.gui/blob/master/API.md#Controller+onChange
// global GUI DAT open/close: Key: 'H'
// HELPER Gui (install with: npm install dat.gui)
export const gui = new dat.GUI({
  closeOnTop: true
})

export function cameraHome() { // Instant! 0,1,5 is default for me
  camera.position.set(0, 1, 5)
  orbit.target.set(0, 0, 0)
  orbit.update();
}

export function initJot3(useGH = true, useAH = true) {

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x00000000); // Sets the color of the background
  document.body.appendChild(renderer.domElement);
  cameraHome()

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Presets Gridhelper AxesHelper StatusHelper
  if (useGH) scene.add(gridHelper); // HELPER Sets a 20 by 20 grid
  if (useAH) scene.add(axesHelper); // HELPER XYZ length of 4 Rot:X Gruen:Y Blau:Z 

  scene.add(ambientLight); // Max Light 

}

// Auto-Add  guiTerminal(txt) (very simple: overflow right, noscrollbars)
// A Terminal
var MAXTERM = 30 // Lines for Terminal
var terminalContent = []
var guix // internal
var termDom = undefined
const termOpt = {
  showTerminal: true
}

function initTerminal() {
  guix = document.createElement("div");
  guix.innerHTML = "<div id='id_guijot'></div>";
  guix.style = "background-color: #1a1a1a; border: 1px solid #303030; padding: 5px"
  gui.domElement.appendChild(guix);
  termDom = document.getElementById('id_guijot')
  termDom.innerText = "(Terminal...)"
  gui.add(termOpt, 'showTerminal').name("Show Terminal").onChange(() => {
    guiTerminalShow(termOpt.showTerminal)
  });
}

export function guiTerminal(txt) {  // Return Anz available
  if (termOpt.showTerminal == false) return
  if (termDom === undefined) initTerminal()

  while (terminalContent.length > MAXTERM) terminalContent.shift()
  terminalContent.push(txt)
  termDom.innerText = terminalContent.join('\n')
  return MAXTERM - terminalContent.length 
}
export function guiTerminalShow(f) {
  if (termDom === undefined) initTerminal()
  guix.style.display = f ? 'block' : 'none'
}
export function guiTerminalClear() {
  if (termDom === undefined) initTerminal()
  terminalContent = []
  termDom.innerText = "(Terminal...)"
}


// GuiHelper - Example
/* // for reference
gui.add(new function () {
  this.sayhi = () => {
    console.log("Hallo")
  }
}, 'sayhi').name("[PushThisButton]");
*/


// Math
export function cartesian2Polar({
  x,
  y,
  z
}) { // To WGS84 - OK for x = 0!
  const r = Math.sqrt(x * x + y * y + z * z);
  const phi = Math.acos(y / r);
  const theta = Math.atan2(z, x);

  return {
    lat: 90 - phi * 180 / Math.PI,
    lng: 90 - theta * 180 / Math.PI - (theta < -Math.PI / 2 ? 360 : 0), // keep within [-180, 180] boundaries
    altitude: r // Un-Normalized
  }
}
/****/