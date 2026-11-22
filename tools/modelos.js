import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildDragonModel } from './dragoes3d.js';

const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(330, 330); r.setPixelRatio(1); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;

function shot(obj, top) {
  const s = new THREE.Scene(); s.environment = env; s.environmentIntensity = 0.6;
  s.add(new THREE.HemisphereLight(0xfff0dc, 0x221810, 1.0));
  const k = new THREE.DirectionalLight(0xffffff, 2.4); k.position.set(4, 9, 5); s.add(k);
  const rim = new THREE.DirectionalLight(0xffb070, 1.4); rim.position.set(-5, 3, -6); s.add(rim);
  s.add(obj);
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.copy(c).add((top ? new THREE.Vector3(0, 1, 0.12) : new THREE.Vector3(1, 0.45, 0.9)).normalize().multiplyScalar(sz * 1.75)); cam.lookAt(c);
  r.render(s, cam); s.remove(obj);
  return r.domElement.toDataURL('image/png');
}

const styles = [['wyvern', 'Ideia 1 · Wyvern facetado (low-poly)'], ['toon', 'Ideia 2 · Desenho animado (contorno e sombra chapada)'], ['serpente', 'Ideia 3 · Dragão serpente (oriental)']];
const html = [];
for (const [st, label] of styles) {
  const cells = [];
  for (const [stage, color, name] of [[1, 0xff5a2b, 'Salamandra · estágio 1'], [4, 0xff1050, 'Imperador Escarlate · estágio 4']]) {
    const m = buildDragonModel(st, color, stage);
    cells.push(`<div class="c"><img src="${shot(m, false)}" width="330" height="330"><span>${name} · de lado</span></div>`);
    cells.push(`<div class="c"><img src="${shot(m, true)}" width="330" height="330"><span>${name} · de cima (como no jogo)</span></div>`);
  }
  html.push(`<h1 style="font-size:22px;margin-top:18px">${label}</h1><div class="row">${cells.join('')}</div>`);
}
document.getElementById('sheet').innerHTML = `<h1>Estilos de dragão</h1><div class="sub">3 ideias · a mesma linha (Salamandra → Imperador Escarlate) em cada estilo</div>${html.join('')}`;
window.__ready = true;
