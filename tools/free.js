import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(300, 300); r.setPixelRatio(1); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
const env = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
function shot(obj, dir) {
  const s = new THREE.Scene(); s.environment = env; s.environmentIntensity = 0.7;
  s.add(new THREE.HemisphereLight(0xfff0dc, 0x221810, 1.0));
  const k = new THREE.DirectionalLight(0xffffff, 2.4); k.position.set(-4, 9, 6); s.add(k);
  s.add(obj); obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()).length();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 1000);
  cam.position.copy(c).add(dir.clone().normalize().multiplyScalar(sz * 1.6)); cam.lookAt(c);
  r.render(s, cam); s.remove(obj);
  return r.domElement.toDataURL('image/png');
}
function pose(scene, clips, name, t) {
  const clip = clips.find((c) => c.name === name); if (!clip) return;
  const mixer = new THREE.AnimationMixer(scene); mixer.clipAction(clip).play(); mixer.update(t * clip.duration);
}
function tint(obj, color) {
  obj.traverse((o) => { if (o.isMesh) { o.material = o.material.clone(); o.material.color = new THREE.Color(color).multiply(new THREE.Color(1.25, 1.25, 1.25)); } });
}
const loader = new GLTFLoader();
let html = '<h1>Modelos grátis (CC0 · Quaternius)</h1><div class="sub">Pode vender o jogo; não exige pagar nem dar crédito</div>';
window.__anims = {};
for (const [file, label] of [['quaternius-dragon.glb', 'Dragon (Quaternius)'], ['quaternius-dragon-evolved.glb', 'Dragon Evolved (Quaternius)']]) {
  const gltf = await loader.loadAsync('./modelos-free/' + file);
  const names = gltf.animations.map((a) => a.name);
  window.__anims[file] = names;
  const fly = names.find((n) => /fly/i.test(n)) || names[0];
  const idle = names.find((n) => /idle/i.test(n)) || names[0];
  const atk = names.find((n) => /attack|bite|headbutt|punch/i.test(n)) || names[0];
  const cells = [];
  const mk = (anim, t, color) => { const o = SkeletonUtils.clone(gltf.scene); pose(o, gltf.animations, anim, t); if (color) tint(o, color); return o; };
  cells.push([shot(mk(idle, 0.3), new THREE.Vector3(1, 0.4, 1)), `Parado (${idle}) · original`]);
  cells.push([shot(mk(fly, 0.4), new THREE.Vector3(1, 0.4, 1)), `Voando (${fly})`]);
  cells.push([shot(mk(atk, 0.5), new THREE.Vector3(1, 0.4, 1)), `Atacando (${atk})`]);
  cells.push([shot(mk(fly, 0.4), new THREE.Vector3(0, 1, 0.15)), 'De cima, voando (como no jogo)']);
  cells.push([shot(mk(idle, 0.3, 0xff1050), new THREE.Vector3(1, 0.4, 1)), 'Teste de cor: Imperador Escarlate']);
  html += `<h1 style="font-size:20px;margin-top:16px">${label}</h1><div class="sub">Animações: ${names.join(', ')}</div><div class="row">${cells.map(([src, t]) => `<div class="c"><img src="${src}" width="270" height="270"><span>${t}</span></div>`).join('')}</div>`;
}
document.getElementById('sheet').innerHTML = html;
window.__ready = true;
