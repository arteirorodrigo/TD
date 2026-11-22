// Preview any GLB: /tools/ver-modelo.html?arquivo=/docs/referencias/model.glb&cor=ff1050
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
const qs = new URLSearchParams(location.search);
const file = qs.get('arquivo');
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(420, 420); r.setPixelRatio(1); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
function shot(obj, dir) {
  const s = new THREE.Scene(); s.environment = env; s.environmentIntensity = 0.8;
  s.add(new THREE.HemisphereLight(0xfff0dc, 0x221810, 0.8));
  const k = new THREE.DirectionalLight(0xffffff, 2.2); k.position.set(-4, 9, 6); s.add(k);
  s.add(obj); obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length();
  const cam = new THREE.PerspectiveCamera(30, 1, sz / 100, sz * 10);
  cam.position.copy(c).add(dir.clone().normalize().multiplyScalar(sz * 1.5)); cam.lookAt(c);
  r.render(s, cam); s.remove(obj);
  return r.domElement.toDataURL('image/png');
}
const t0 = performance.now();
const gltf = await new GLTFLoader().loadAsync(file);
const loadMs = Math.round(performance.now() - t0);
const box = new THREE.Box3().setFromObject(gltf.scene); const size = box.getSize(new THREE.Vector3());
const views = [['Frente (três quartos)', new THREE.Vector3(0.8, 0.35, 1)], ['De lado', new THREE.Vector3(1, 0.2, 0)], ['De trás', new THREE.Vector3(-0.6, 0.4, -1)], ['De cima (como no jogo)', new THREE.Vector3(0, 1, 0.15)]];
document.getElementById('sheet').innerHTML = `<h1>${file.split('/').pop()}</h1><div class="sub">Carregou em ${loadMs} ms · tamanho ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}</div>
  <div class="row">${views.map(([t, d]) => `<div class="c"><img src="${shot(gltf.scene, d)}" width="340" height="340"><span>${t}</span></div>`).join('')}</div>`;
window.__ready = true;
