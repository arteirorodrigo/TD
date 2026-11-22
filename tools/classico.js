import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildClassicDragon } from './dragao-classico.js';
import { TOWERS } from '../src/data/towers.js';

const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(320, 320); r.setPixelRatio(1); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
function shot(obj, dir) {
  const s = new THREE.Scene(); s.environment = env; s.environmentIntensity = 0.65;
  s.add(new THREE.HemisphereLight(0xfff0dc, 0x221810, 1.0));
  const k = new THREE.DirectionalLight(0xffffff, 2.6); k.position.set(-4, 9, 6); s.add(k);
  const rim = new THREE.DirectionalLight(0xffb070, 1.6); rim.position.set(5, 4, -6); s.add(rim);
  s.add(obj);
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.copy(c).add(dir.clone().normalize().multiplyScalar(sz * 1.7)); cam.lookAt(c);
  r.render(s, cam); s.remove(obj);
  return r.domElement.toDataURL('image/png');
}
const line = (new URLSearchParams(location.search).get('linha') || 'asteriatedRuby,volcano,antiqueBloodstone,crownPrince').split(',');
const rows = [['Três quartos (como a referência)', new THREE.Vector3(-0.75, 0.3, 1)], ['De cima (como no jogo)', new THREE.Vector3(0, 1, 0.15)]];
let html = '<h1>Dragão clássico</h1><div class="sub">No estilo da imagem de referência · linha do fogo, estágios 1 a 4</div>';
for (const [label, dir] of rows) {
  html += `<h1 style="font-size:20px;margin-top:16px">${label}</h1><div class="row">`;
  line.forEach((id, i) => { const t = TOWERS[id]; html += `<div class="c"><img src="${shot(buildClassicDragon(t.color, i + 1), dir)}" width="320" height="320"><span>${t.name} · estágio ${i + 1}</span></div>`; });
  html += '</div>';
}
document.getElementById('sheet').innerHTML = html;
window.__ready = true;
