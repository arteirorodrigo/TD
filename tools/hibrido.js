// Finds the friend's dragon wings: paints suspected wing vertices red, shows 4 views + stats.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { prepareDragonGeometry, wingMask, stripWings, wingGeometry, buildHybridDragon } from '../src/dragon-hybrid.js';

const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(340, 340); r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace;
const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
function shot(obj, dir) {
  const s = new THREE.Scene(); s.environment = env; s.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.2));
  const k = new THREE.DirectionalLight(0xffffff, 1.5); k.position.set(-3, 6, 5); s.add(k);
  s.add(obj);
  const c = new THREE.Vector3(0, 0.5, 0);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50); cam.position.copy(c).add(dir.clone().normalize().multiplyScalar(3.2)); cam.lookAt(c);
  r.render(s, cam); s.remove(obj); return r.domElement.toDataURL();
}
const gltf = await new GLTFLoader().loadAsync('/src/assets/dragoes/dragao-obj.glb');
let src; gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
const geo = prepareDragonGeometry(src.geometry);
const mask = wingMask(geo);
const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
let n = 0; for (let i = 0; i < pos.count; i++) { const w = mask[i]; n += w > 0.5; col[i * 3] = 0.75 + 0.25 * w; col[i * 3 + 1] = 0.72 * (1 - w); col[i * 3 + 2] = 0.68 * (1 - w); }
geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
const b = new THREE.Box3().setFromObject(mesh);
const views = [['frente', new THREE.Vector3(0, 0.3, 1)], ['lado (+x)', new THREE.Vector3(1, 0.2, 0)], ['trás', new THREE.Vector3(0, 0.3, -1)], ['cima', new THREE.Vector3(0, 1, 0.01)]];
const bodyGeo = stripWings(prepareDragonGeometry(src.geometry)); bodyGeo.computeVertexNormals();
const wg = wingGeometry(0.85);
const cells = [];
for (const [ang, label] of [[1.25, 'sentado (asas recolhidas)'], [0.75, 'voando: asas em cima'], [-0.35, 'voando: asas embaixo']]) {
  for (const [t, d] of [['três quartos', new THREE.Vector3(0.9, 0.35, 1)], ['de cima', new THREE.Vector3(0, 1, 0.12)]]) {
    const { group, wings } = buildHybridDragon(bodyGeo, wg, 0xff3a10, 2);
    for (const w of wings) w.pivot.rotation.z = w.sx * ang;
    cells.push(`<div class="c"><img src="${shot(group, d)}" width="300" height="300"><span>${label} · ${t}</span></div>`);
  }
}
document.getElementById('sheet').innerHTML = `<h1>Dragão híbrido</h1><div class="sub">corpo do modelo do amigo + asas animadas</div><div class="row" style="flex-wrap:wrap">${cells.join('')}</div>`;
window.__ready = true;
