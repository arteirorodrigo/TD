// Gera a ficha de evolução de uma linha de dragões (imagens 3D + dados) e os arquivos .glb de cada estágio.
// Uso: abrir /tools/ficha-dragao.html?linha=asteriatedRuby,volcano,antiqueBloodstone,crownPrince&titulo=Linha%20do%20Fogo
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Renderer } from '../src/render.js';
import { Game } from '../src/game.js';
import { TOWERS, CELL, abilityText, tierTag } from '../src/data/towers.js';

const qs = new URLSearchParams(location.search);
const line = (qs.get('linha') || 'asteriatedRuby,volcano,antiqueBloodstone,crownPrince').split(',');
const title = qs.get('titulo') || 'Linha do Fogo';
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

const hidden = document.createElement('canvas'); hidden.width = hidden.height = 8; hidden.style.display = 'none'; document.body.appendChild(hidden);
const view = new Renderer(hidden, new Game());

const shot = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
shot.setSize(720, 720); shot.setPixelRatio(1);
shot.toneMapping = THREE.ACESFilmicToneMapping; shot.outputColorSpace = THREE.SRGBColorSpace;

function render(group) {
  const scene = new THREE.Scene();
  scene.environment = view.scene.environment; scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x221810, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 8, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc890, 1.2); rim.position.set(-6, 4, -5); scene.add(rim);
  scene.add(group);
  const box = new THREE.Box3().setFromObject(group); const size = box.getSize(new THREE.Vector3()).length(); const c = box.getCenter(new THREE.Vector3());
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  cam.position.copy(c).add(new THREE.Vector3(0.9, 0.55, 1.1).normalize().multiplyScalar(size * 1.15)); cam.lookAt(c);
  shot.render(scene, cam);
  return shot.domElement.toDataURL('image/png');
}

const exporter = new GLTFExporter();
window.__glb = {};
const cards = [];
for (const [i, id] of line.entries()) {
  const def = TOWERS[id];
  const group = view.makeEntityMesh({ uid: 1000 + i, x: -1, y: -1, kind: 'gem', def, pending: false });
  group.traverse((o) => { if (o.material?.opacity === 0 || (o.isMesh && o.geometry?.type === 'RingGeometry')) o.visible = false; });
  const img = render(group);
  const glb = await exporter.parseAsync(group, { binary: true, onlyVisible: true });
  window.__glb[id] = btoa(String.fromCharCode(...new Uint8Array(glb)));
  const rec = def.recipe.map((r) => TOWERS[r].base ? `${TOWERS[r].name} · ${tierTag(TOWERS[r].quality)}` : TOWERS[r].name);
  cards.push(`<div class="card"><img src="${img}" alt="${def.name}">
    <div class="stage">Estágio ${i + 1} de ${line.length}</div>
    <div class="name"><span class="sw" style="background:${hex(def.color)}"></span>${def.name}</div>
    <dl><dt>Cor base</dt><dd>${hex(def.color).toUpperCase()}</dd><dt>Dano</dt><dd>${def.dmg}</dd><dt>Ataque a cada</dt><dd>${def.rate}s</dd>
      <dt>Alcance</dt><dd>${def.range >= 5000 ? 'mapa todo' : (def.range / CELL).toFixed(1).replace('.', ',') + ' quadrados'}</dd></dl>
    <b>Poderes</b><ul>${def.abilities.map((a) => `<li>${abilityText(a)}</li>`).join('')}</ul>
    <div class="rec"><b>Nasce de:</b> ${rec.join(' + ')}</div></div>`);
}
document.getElementById('sheet').innerHTML = `<h1>${title} — ficha de evolução</h1>
  <div class="sub">Ninho dos Dragões · referência para ilustração · ${new Date().toLocaleDateString('pt-BR')}</div>
  <div class="row">${cards.join('<div class="arrow">→</div>')}</div>
  <div class="notes"><b>Para o ilustrador:</b> os modelos acima são <b>provisórios</b> (feitos no jogo só para testar). Use-os como guia de <b>cor</b>, de <b>crescimento</b> entre estágios
  (cada estágio é maior, mais imponente e com mais detalhes; o último tem coroa de espinhos) e de <b>personalidade</b> pelos poderes.
  O jogo é visto de cima, então a silhueta vista de cima precisa ser reconhecível. Os arquivos .glb trazem o modelo 3D de cada estágio para girar e ver de todos os lados.</div>`;
window.__ready = true;
