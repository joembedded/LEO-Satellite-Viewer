/* T3Helpers / JoEmbedded */
import * as THREE from './modules/three.module.js';

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
  45, // Angle FiodOfView
  window.innerWidth / window.innerHeight, // Ratio
  0.1, // MinRender
  100 // MaxDist
);
export const  orbit = new OrbitControls(camera, renderer.domElement); // Mouse CameraMove
export const gridHelper = new THREE.GridHelper(10, 10);
export const axesHelper = new THREE.AxesHelper(4);
export const ambientLight = new THREE.AmbientLight('white', 1.0);
export const gui = new dat.GUI()


// A Terminal
export let MAXTERM = 40 // Lines for Terminal
var terminalContent = []

export function cameraHome(){ // Instant! 0,1,5 is default for me
  camera.position.set(0, 1, 5)
  orbit.target.set(0,0,0)
  orbit.update();
}

// Presets Gridhelper AxesHelper StatusHelper
export function initJot3(useGH=true, useAH = true){

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x00000000); // Sets the color of the background
  document.body.appendChild(renderer.domElement);
  cameraHome()
  
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
   
  if(useGH) scene.add(gridHelper);    // HELPER Sets a 20 by 20 grid
  if(useAH) scene.add(axesHelper);   // HELPER XYZ length of 4 Rot:X Gruen:Y Blau:Z 
  
  scene.add(ambientLight); // Max Light 
  
  // HELPER Gui (install with: npm install dat.gui)
  // Add  guiTerminal(txt)
  const guix = document.createElement("div");
  guix.innerHTML = "Terminal:<div id='id_guijot'></div>";
  guix.style = "margin-top: 35px; background-color: #1a1a1a; border: 1px solid #444"
  gui.domElement.appendChild(guix);
}

export function guiTerminal(txt) {
    while (terminalContent.length > MAXTERM) terminalContent.shift()
    terminalContent.push(txt)
    document.getElementById('id_guijot').innerText = terminalContent.join('\n')
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