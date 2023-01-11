/*** scripts.js - Main LEO View / JoEmbedded ***/
import * as THREE from './modules/three.module.js'; 
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
  cartesian2Polar,
} from './t3helpers.js';


initJot3();


const backgroundImage = './img/night-sky.jpg';
const globeImg = './img/earth-jo.jpg'; // Earth
//const pukImg =  './img/puk_rot_256.png'; // Mein Puk
const pukImg =  './img/puk_sb_256.png'; // Mein Puk

// Background
//const cubeTextureLoader = ;
scene.background = new THREE.CubeTextureLoader().load(Array(6).fill(backgroundImage)); // 6 ident. Seiten der Box

// ---The Options --------
const options = {
  test: 3.14,
};
const guiOptionsFolder = gui.addFolder('Options')
guiOptionsFolder.add(options, 'test', 0, 5);

gui.add(new function () {
  this.sayhi = () => {
    cameraHome();
        console.log("Hallo")
  }
}, 'sayhi').name("[PushThisButton]");


const EARTH_RADIUS_KM = 6371; // km (== 1 UNIT)
const SAT_SIZE = 1000; // km(!)
const NEL = 10
let sats = []

const satGeometry = new THREE.OctahedronGeometry(SAT_SIZE / EARTH_RADIUS_KM / 2);
//const satGeometry = new THREE.SphereGeometry(SAT_SIZE / EARTH_RADIUS_KM / 2,10,10);
//const satMaterial = new THREE.MeshBasicMaterial({   map:sbTexture, transparent:true  });
//const satMaterial = new THREE.MeshLambertMaterial({ color: 'lightgray' });
const satMaterial = new THREE.MeshBasicMaterial({
  color: 'red',
  wireframe: true,
});

const group = new THREE.Group();
for (let i = 0; i < NEL; i++) {
  // Trick jetzt haben wir 2 Achsen!
  //var nsat = new THREE.Mesh(satGeometry, satMaterial);
  var onsat = new THREE.Mesh(satGeometry, satMaterial);
  onsat.position.set(2 + Math.random() * 3 - 1.5, 2 + Math.random() * 3 - 3, 0)
  var nsat = new THREE.Object3D();
  nsat.add(onsat);
  sats.push(nsat)
  group.add(nsat)
}
scene.add(group);


const pukTexture = new THREE.TextureLoader().load(pukImg); // Plan A

function getCanvasTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  const context = canvas.getContext("2d");
  context.globalAlpha = 0.1; // Loecher reinzeichnen geht leider nicht...
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 100, 100);
  context.globalAlpha = 1;
  context.fillStyle = 'blue'
  context.fillRect(25, 25, 50, 50);
  return new THREE.CanvasTexture(canvas);
}
// const pukTexture = getCanvasTexture() // Plan B

var pukMaterial = new THREE.SpriteMaterial({
  map: pukTexture,
  transparent: true,
  depthWrite: false
});
const pukSprite = new THREE.Sprite(pukMaterial);
pukSprite.scale.set(0.1, 0.1)
pukSprite.position.set(1, 1, 2)
var psat = new THREE.Object3D();
psat.add(pukSprite);
scene.add(psat); // this centers the glow at the mesh


// Earth
const globeTexture = new THREE.TextureLoader().load(globeImg);
const sphere2Geometry = new THREE.SphereGeometry(1, 50, 50);
const sphere2Material = new THREE.MeshBasicMaterial({
  map: globeTexture
});

const sphere2 = new THREE.Mesh(sphere2Geometry, sphere2Material);
sphere2.name = "Earth"
sphere2.rotateY(-Math.PI / 2)
sphere2.position.set(0, 0, 0)
scene.add(sphere2);
const haloobj = haloglow.createGlowMesh(sphere2Geometry ,{
  backside: true,
  color: '#F0FFFF',
  size: 0.05,
  power: 5, // dispersion
  coefficient: 0.4
});
scene.add(haloobj);

window.addEventListener("keydown", (event) => {
  switch (event.key) {
    default:
      guiTerminal("Key: " + event.code)
      break
  }
})


// MausZeugs
const mousePosition = new THREE.Vector2();
const rayCaster = new THREE.Raycaster();
window.addEventListener('click', (e) => {
  mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
  mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
  //console.log("CLICK(rX,rY): ",mousePosition.x.toFixed(5),mousePosition.y.toFixed(5))
  rayCaster.setFromCamera(mousePosition, camera);
  const intersects = rayCaster.intersectObjects(scene.children, false);
  intersects.every((e) => {
    if (e.object.name == 'Earth') {
      var t2 = cartesian2Polar(e.point);
      //console.log("HIT(x,y,z):", e.point.x.toFixed(3), e.point.y.toFixed(3), e.point.z.toFixed(3))
      var wgs = cartesian2Polar(e.point);
      guiTerminal("Lat/Lng: " + wgs.lat.toFixed(2) + "/" + wgs.lng.toFixed(2)) // WGS84
    }
    return true
  })
});

var lastCamPos = new THREE.Vector3(camera.position) // Last Cam Pos
orbit.addEventListener("change", () => {
  const e = camera.position;
  const d = e.distanceTo({
    x: 0,
    y: 0,
    z: 0
  })
  console.log("Alt(km): " + ((d - 1) * EARTH_RADIUS_KM).toFixed(0))

  if (d < 1.2) { // EARTH RADs
    console.log("zuklein", e.z, " Recover: " + lastCamPos.z)
    camera.position.copy(lastCamPos)
  } else {
    console.log("Ok save", e.z)
    lastCamPos.copy(e)
  }
});


// ---Animate all---
function animate() {
  sats.forEach((e) => e.rotateZ(0.001))
  psat.rotateZ(0.002)
  var x = Date.now()/1000;	// msec seit 1.1.1970
  pukMaterial.rotation = Math.sin(x); // Pro frame 0.03 schauckeln ist top

  renderer.render(scene, camera);
  
}
renderer.setAnimationLoop(animate);

/***/