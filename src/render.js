// Three.js renderer. Reads Game state each frame; never changes game rules.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CELL, tierTag } from './data/towers.js';
import { AttackFx } from './attack-fx.js';
import { MAP_STYLE, makeParchmentCanvas, mapMargin } from './parchment-map.js';
const MARGIN = mapMargin();
import grassUrl from './assets/mapa_gramado.jpg';
import mapaPergaminhoUrl from './assets/mapa-pergaminho.jpg'; // mapa padrão (mapa_certo.jpeg no molde, trilha pelos pontos E,1–6,S)
const MAPA_IMAGEM = MAP_STYLE === 22 ? mapaPergaminhoUrl : null;
import dragonModelUrl from './assets/dragoes/dragao-obj.glb?url';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { prepareDragonGeometry, stripWings, wingGeometry, buildHybridDragon } from './dragon-hybrid.js';

// Dragon look: 'hibrido' = sculpted body (by a friend of the owner) + procedural flapping wings, tinted per dragon;
// 'escultura' = sculpted model alone (wings can't move); 'padrao' = original
// procedural dragon (also tagged in git as "modelo-padrao"). Change here to switch back.
const DRAGON_MODEL = 'padrao';
// The map is seen from above, so the sculpted dragon leans toward the camera (like a figure on a board) to show
// its silhouette; it turns left/right around its own up axis to face targets.
const DRAGON_TILT = -Math.PI / 2.4;
import { PLATFORM, BLOCK } from './map.js';

const U = (v) => v / CELL; // game units -> squares

// Visual identity of each enemy race.
const RACES = {
  human: { color: 0x5b7fc4, skin: 0xe6bf98, trim: 0x9aa6b8, size: 1, shield: true },
  elf: { color: 0x3e9f68, skin: 0xf2dcc0, trim: 0xc9b46a, size: 0.92, ears: true },
  dwarf: { color: 0x9a5a2e, skin: 0xe0b08a, trim: 0x8c8f96, size: 0.95, wide: 1.3, beard: 0xb35a2a, shield: true, metal: 0.4 },
  goblin: { color: 0x6c8a3a, skin: 0x8cc04a, trim: 0x5a4632, size: 0.78, ears: true },
  orc: { color: 0x5a3e2a, skin: 0x5f8f3a, trim: 0x2f3036, size: 1.2, wide: 1.2, tusks: true },
  troll: { color: 0x3f6a78, skin: 0x7fb0b8, trim: 0x4a3a2a, size: 1.35, wide: 1.2, tusks: true },
  ogre: { color: 0x8a5a3a, skin: 0xc0906a, trim: 0x4a3a2a, size: 1.55, wide: 1.4, tusks: true },
  giant: { color: 0x6f7682, skin: 0xa0a6b0, trim: 0x50555e, size: 1.8, wide: 1.3 },
  undead: { color: 0xb8c4ff, skin: 0xdfe6ff, trim: 0x5a5f7a, size: 1, ghost: true, glow: 0.35 },
  bat: { color: 0x3a2f45, wing: 0x2a2233, skin: 0x3a2f45, size: 0.9, kind: 'beast' },
  harpy: { color: 0x9a6a4a, wing: 0x7a4f35, skin: 0xe0b896, size: 1, kind: 'beast' },
  griffin: { color: 0xc8a050, wing: 0xe8dcc0, skin: 0xe6bf98, trim: 0xf0c040, size: 1.1, kind: 'griffin' },
  airship: { color: 0xb0563a, skin: 0xe6bf98, trim: 0x6a4a2a, size: 1.2, kind: 'airship' },
  spirit: { color: 0x9fe8ff, skin: 0xffffff, size: 0.9, kind: 'spirit', ghost: true, glow: 0.5 },
  witch: { color: 0x5a2f7a, skin: 0xb8e0a0, trim: 0x2a1a35, size: 1, kind: 'witch' },
};

// ---------- Dragon scales ----------
// One scale: a pointed, slightly curved plate lying almost flat, tip pointing outward (+x).
function scaleGeometry() {
  const sh = new THREE.Shape();
  sh.moveTo(-0.45, 0);
  sh.quadraticCurveTo(-0.42, 0.34, 0, 0.36);
  sh.quadraticCurveTo(0.42, 0.3, 0.62, 0);
  sh.quadraticCurveTo(0.42, -0.3, 0, -0.36);
  sh.quadraticCurveTo(-0.42, -0.34, -0.45, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 });
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, pos.getZ(i) + 0.35 * y * y - 0.12 * (x + 0.45)); // curve across, dip toward the tip
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// Small dragon built from primitives; reads well from above (wings spread).
function buildDragon(color, tier) {
  const c = new THREE.Color(color);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.35, metalness: 0.3, clearcoat: 0.8, iridescence: 0.4, emissive: c, emissiveIntensity: 0.12, flatShading: true });
  const wingMat = new THREE.MeshPhysicalMaterial({ color: c.clone().multiplyScalar(0.7), roughness: 0.5, metalness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 0.88, emissive: c, emissiveIntensity: 0.08 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xf2e6cf, roughness: 0.5 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff3a0 });
  const boneMat = new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.45), roughness: 0.6 });
  const d = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), bodyMat); body.scale.set(0.95, 0.75, 1.5);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 0.55, 6), bodyMat); neck.rotation.x = Math.PI / 2.6; neck.position.set(0, 0.2, 0.72);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 6), bodyMat); head.rotation.x = Math.PI / 2; head.position.set(0, 0.32, 1.12);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), bodyMat); skull.position.set(0, 0.34, 0.92);
  for (const sx of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), hornMat); horn.position.set(0.11 * sx, 0.48, 0.82); horn.rotation.set(-1.1, 0, 0.3 * sx); d.add(horn);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), eyeMat); eye.position.set(0.12 * sx, 0.4, 1.0); d.add(eye);
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.3, 6), bodyMat); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0, -1.15);
  const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.25, 3), hornMat); tailTip.rotation.x = -Math.PI / 2; tailTip.position.set(0, 0, -1.85);
  d.add(body, neck, head, skull, tail, tailTip);
  // Wings: membrane shape hinged at the shoulder
  const ws = new THREE.Shape();
  ws.moveTo(0, 0.25); ws.lineTo(0.7, 0.55); ws.lineTo(1.55, 0.35); ws.quadraticCurveTo(1.2, 0.05, 1.35, -0.35);
  ws.quadraticCurveTo(0.95, -0.2, 0.85, -0.6); ws.quadraticCurveTo(0.5, -0.35, 0.2, -0.55); ws.lineTo(0, -0.3);
  const wg = new THREE.ShapeGeometry(ws, 8); wg.rotateX(Math.PI / 2); // leading edge forward (+z)
  const wings = [];
  for (const sx of [1, -1]) {
    const pivot = new THREE.Group(); pivot.position.set(0.25 * sx, 0.18, 0.15);
    const w = new THREE.Mesh(wg, wingMat); w.scale.x = sx; w.castShadow = true;
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.6, 4), boneMat); bone.rotation.z = Math.PI / 2; bone.rotation.y = 0.2 * sx; bone.position.set(0.78 * sx, 0.01, 0.42);
    pivot.add(w, bone); d.add(pivot); wings.push({ pivot, sx });
  }
  if (tier >= 4) { // ancient dragons get a crown of spines
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 4), hornMat); sp.position.set(0, 0.4, 0.4 - i * 0.28); sp.rotation.x = -0.4; d.add(sp); }
  }
  d.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  d.scale.setScalar(1.05 + tier * 0.15);
  return { group: d, wings, mats: [bodyMat, wingMat] };
}

function rockGeometry(seed) {
  const geo = new THREE.DodecahedronGeometry(0.62, 1);
  const pos = geo.attributes.position;
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!map.has(key)) map.set(key, 0.8 + rnd() * 0.35);
    const k = map.get(key);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.7, pos.getZ(i) * k);
  }
  const ni = geo.index ? geo.toNonIndexed() : geo; ni.computeVertexNormals();
  return ni;
}

function labelTexture(text, color = '#e9f1ff') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = color;
  x.font = '700 78px Cinzel, Georgia, serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 8;
  x.fillText(text, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Small dark pill with the tier tag (T0..T5), readable from the full-map view.
const badgeCache = new Map();
function badgeTexture(text) {
  if (badgeCache.has(text)) return badgeCache.get(text);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(12,10,8,.88)'; x.strokeStyle = 'rgba(255,214,150,.9)'; x.lineWidth = 4;
  x.beginPath(); x.roundRect(4, 4, 120, 56, 26); x.fill(); x.stroke();
  x.fillStyle = '#fff3dc'; x.font = '800 40px Inter, Arial, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 64, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  badgeCache.set(text, t);
  return t;
}

const GROUND_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vWorld;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GROUND_FRAG = /* glsl */`
uniform sampler2D uCells; uniform sampler2D uGrass; uniform vec2 uSize; uniform float uTime; uniform float uGrid; uniform vec4 uHover; uniform vec3 uHoverColor; uniform float uParch; uniform float uMargin;
varying vec2 vUv; varying vec3 vWorld;
float gridLine(vec2 p, float w){ vec2 g = abs(fract(p - .5) - .5) / fwidth(p); return 1. - min(min(g.x, g.y) / w, 1.); }
void main(){
  vec2 p = vWorld.xz; // in squares
  vec2 cell = floor(p);
  vec4 c = texture2D(uCells, (cell + .5) / uSize);
  float path = c.r, plat = c.g, block = c.b;
  float inArea = step(0., p.x) * step(0., p.y) * step(p.x, uSize.x) * step(p.y, uSize.y);
  path *= inArea; plat *= inArea; // outside the play area the cell texture would repeat its edge
  float inside = step(0., p.x) * step(0., p.y) * step(p.x, uSize.x) * step(p.y, uSize.y);
  vec3 base = mix(vec3(.15,.125,.11), vec3(.21,.18,.155), smoothstep(45., 0., length(p - uSize*.5)));
  vec2 tuv = (p + uMargin) / (uSize + 2. * uMargin); // the parchment may be bigger than the play area
  vec3 grass = texture2D(uGrass, vec2(tuv.x, 1. - tuv.y)).rgb;
  float onPaper = step(0., tuv.x) * step(0., tuv.y) * step(tuv.x, 1.) * step(tuv.y, 1.);
  base = mix(base, grass * (uParch > .5 ? mix(1., .9, uGrid * inside) : mix(.72, .62, uGrid)), uMargin > 0. ? onPaper : inside); // clearer ground while the grid is hidden
  float fine = gridLine(p, 1.0) * .025 * uGrid * inside;
  float major = gridLine((p - 1.) / 2., 1.2) * .2 * uGrid * inside; // build cells: 2x2, starting on odd squares
  vec3 col = base + vec3(.55,.42,.30) * (fine + major);
  // path glow with a slow flowing pulse
  float flow = .55 + .45 * sin((p.x + p.y) * .35 - uTime * 2.2);
  col = mix(col, vec3(.50,.38,.22) * (.9 + .15 * flow), path * (uParch > .5 ? .18 : .85));
  col = mix(col, vec3(.42,.31,.14), plat * .85);
  col += vec3(1.,.75,.3) * plat * gridLine(p, 1.2) * .2 * uGrid;
  // hover footprint
  if (uHover.w > 0. && p.x >= uHover.x && p.x < uHover.x + 2. && p.y >= uHover.y && p.y < uHover.y + 2.) {
    vec2 q = p - uHover.xy; float bd = min(min(q.x, 2. - q.x), min(q.y, 2. - q.y));
    col = mix(col, uHoverColor, .35 + .5 * (1. - smoothstep(.05, .14, bd)));
  }
  col = mix(vec3(.05,.045,.045), col, uMargin > 0. ? onPaper : inside);
  // border
  vec2 d = min(p, uSize - p);
  float edge = (1. - smoothstep(0., .15, min(d.x, d.y))) * inside;
  col += vec3(.9,.55,.2) * edge * (uMargin > 0. ? .35 : .6);
  // colours above are authored in sRGB; the composer works in linear space
  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.);
}`;

export class Renderer {
  constructor(canvas, game) {
    this.game = game;
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // Phones: fewer pixels drawn (1.5 per CSS pixel) keeps long matches smooth.
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 600;
    r.setPixelRatio(Math.min(window.devicePixelRatio, smallScreen ? 1.5 : 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0908);
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;

    const W = game.grid.w, H = game.grid.h;
    this.center = new THREE.Vector3(W / 2, 0, H / 2);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 600);
    // Top-down view, tilted just enough to keep the gems' volume readable.
    this.view = { target: this.center.clone(), dist: 78, yaw: 0, pitch: 1.5 };

    scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x10141c, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2e0, 1.3);
    sun.position.set(W * 0.2, 60, H * 0.9);
    sun.target.position.copy(this.center);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 });
    sun.shadow.bias = -0.0008;
    scene.add(sun, sun.target);

    // Ground with cell data texture
    this.cellData = new Uint8Array(W * H * 4);
    this.cellTex = new THREE.DataTexture(this.cellData, W, H, THREE.RGBAFormat);
    this.cellTex.magFilter = this.cellTex.minFilter = THREE.NearestFilter;
    this.groundMat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG,
      uniforms: { uCells: { value: this.cellTex }, uGrass: { value: MAPA_IMAGEM ? (() => { const t = new THREE.TextureLoader().load(MAPA_IMAGEM); t.anisotropy = 8; return t; })() : MAP_STYLE ? (() => { const t = new THREE.CanvasTexture(makeParchmentCanvas()); t.anisotropy = 8; return t; })() : new THREE.TextureLoader().load(grassUrl) }, uParch: { value: MAP_STYLE ? 1 : 0 }, uMargin: { value: MARGIN }, uSize: { value: new THREE.Vector2(W, H) }, uTime: { value: 0 }, uGrid: { value: 1 },
        uHover: { value: new THREE.Vector4(0, 0, 0, 0) }, uHoverColor: { value: new THREE.Color(0x3cff9a) } },
      extensions: { derivatives: true },
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 80, H + 80), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(W / 2, 0, H / 2);
    scene.add(ground);
    this.ground = ground;
    // Shadow catcher above shader ground
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.ShadowMaterial({ opacity: 0.45 }));
    sc.rotation.x = -Math.PI / 2; sc.position.set(W / 2, 0.01, H / 2); sc.receiveShadow = true;
    scene.add(sc);

    this.buildWaypoints();

    // Shared resources
    this.scaleGeo = scaleGeometry();
    this.rockGeos = Array.from({ length: 6 }, (_, i) => rockGeometry(i + 1));
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4f58, roughness: 0.92, metalness: 0.05, flatShading: true });
    this.pedestalGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.22, 6);
    this.pedestalMat = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.6, metalness: 0.4, visible: false }); // base transparente (pedido do dono 22/11: no pergaminho o preto pesava)
    this.ringGeo = new THREE.RingGeometry(0.98, 1, 96);
    this.discGeo = new THREE.CircleGeometry(1, 64);
    // Geometries shared by many meshes: never disposed with a single mesh.
    this.sharedGeos = new Set([this.scaleGeo, ...this.rockGeos, this.pedestalGeo, this.ringGeo, this.discGeo]);
    this.tmpQ = new THREE.Quaternion();
    if (DRAGON_MODEL !== 'padrao') this.loadDragonModel();
    this.upAxis = new THREE.Vector3(0, 1, 0);

    this.meshes = new Map(); // entity uid -> group
    this.enemyMeshes = new Map();
    this.projMeshes = [];
    this.particles = this.makeParticles();
    this.attackFx = new AttackFx(this);
    this.effects = [];

    // Selection / range indicators
    this.rangeRing = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.8, depthWrite: false }));
    this.rangeFill = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.07, depthWrite: false }));
    for (const m of [this.rangeRing, this.rangeFill]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.visible = false; scene.add(m); }
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.45, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    this.selRing.rotation.x = -Math.PI / 2; this.selRing.visible = false; scene.add(this.selRing);
    this.enemyRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 32), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    this.enemyRing.rotation.x = -Math.PI / 2; this.enemyRing.visible = false; this.selectedEnemy = null; scene.add(this.enemyRing);

    // Path preview line (air route)
    const air = game.grid.airPath().map((p) => new THREE.Vector3(p.x + 1, 3.2, p.y + 1));
    const airLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(air), new THREE.LineDashedMaterial({ color: 0xc8a0ff, dashSize: 0.6, gapSize: 0.6, transparent: true, opacity: 0.25 }));
    airLine.computeLineDistances();
    scene.add(airLine);

    // Post-processing
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.5, 0.86);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.selected = null;
    this.hover = null;
    this.time = 0;
    this.resize();
    this.refreshCells();
  }

  buildWaypoints() {
    const g = this.game.grid;
    const n = g.waypoints.length;
    this.waypointMarks = []; // numbered waypoints (not entry/exit) fade out during a wave
    g.waypoints.forEach((p, i) => {
      const isEnd = i === 0 || i === n - 1;
      const color = isEnd ? 0xff4a3a : 0xffc24a;
      const grp = new THREE.Group();
      grp.position.set(p.x + 1, 0, p.y + 1);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 8, 48), new THREE.MeshBasicMaterial({ color }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.08;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 4, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      beam.position.y = 2;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(i === 0 ? 'E' : i === n - 1 ? 'S' : String(i), isEnd ? '#ffd0c8' : '#fff0cc'), depthWrite: false }));
      label.scale.set(2.2, 2.2, 1); label.position.y = 3.4;
      grp.add(ring, beam, label);
      if (!isEnd) {
        ring.material.transparent = true; label.material.transparent = true;
        this.waypointMarks.push(ring.material, label.material, beam.material);
        beam.material.userData.baseOpacity = beam.material.opacity;
      }
      grp.userData = { ring, beam };
      this.scene.add(grp);
    });
  }

  refreshCells() {
    const g = this.game.grid;
    const d = this.cellData;
    d.fill(0);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const v = g.get(x, y), i = (y * g.w + x) * 4;
      if (v === PLATFORM) d[i + 1] = 255;
      if (v === BLOCK) d[i + 2] = 255;
    }
    if (this.game.path) for (const c of this.game.path) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const x = c.x + dx, y = c.y + dy; if (x < g.w && y < g.h) d[(y * g.w + x) * 4] = 255;
    }
    this.cellTex.needsUpdate = true;
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / h;
    // Recompute the full-map framing (the zoom-out limit) on every resize.
    const portrait = w < h * 0.9;
    {
      // Frame the whole map, leaving room for the side dock (desktop) or the bottom sheet (phone).
      const W = this.game.grid.w + 2 * MARGIN, H = this.game.grid.h + 2 * MARGIN;
      const vfov = THREE.MathUtils.degToRad(this.camera.fov);
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (w / h));
      // Phone lying down: narrow 240px panel on the right and a slim top bar.
      const lying = w > h && h <= 480; // same test as the CSS (landscape, max-height 480px)
      const usableW = portrait ? 1 : lying ? (w - 262) / w : Math.max(0.5, (w - 330) / w);
      // On phones the map sits in the top ~55% of the screen, above the bottom sheet.
      const usableH = portrait ? 0.55 : lying ? (h - 50) / h : 0.9;
      const needH = (H * 1.02) / (2 * Math.tan(vfov / 2) * usableH);
      const needW = (W * 1.05) / (2 * Math.tan(hfov / 2) * usableW);
      const dist = Math.max(needH, needW);
      const visH = 2 * dist * Math.tan(vfov / 2);
      const target = new THREE.Vector3(W / 2 - MARGIN + (portrait ? 0 : dist * Math.tan(hfov / 2) * (1 - usableW)), 0,
        H / 2 - MARGIN + (portrait ? visH * (0.5 - 0.36) : lying ? -visH * (44 / h) / 2 : -visH * 0.02));
      // Fully zoomed out = this framing. Zoom in down to ~30%; panning stays inside it.
      this.fit = { dist, target, tanH: Math.tan(hfov / 2), tanV: Math.tan(vfov / 2) };
      this.view.maxDist = dist; this.view.minDist = dist * 0.3;
      if (!this.fitted) { this.view.dist = dist; this.view.target.copy(target); this.fitted = true; }
    }
    this.camera.updateProjectionMatrix();
  }

  updateCamera() {
    const v = this.view;
    v.dist = THREE.MathUtils.clamp(v.dist, v.minDist, v.maxDist);
    // Keep the view inside the full-map framing: the closer you zoom, the more you can pan.
    const f = this.fit;
    const slackX = (f.dist - v.dist) * f.tanH, slackZ = (f.dist - v.dist) * f.tanV;
    v.target.x = THREE.MathUtils.clamp(v.target.x, f.target.x - slackX, f.target.x + slackX);
    v.target.z = THREE.MathUtils.clamp(v.target.z, f.target.z - slackZ, f.target.z + slackZ);
    const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
    this.camera.position.set(v.target.x + Math.sin(v.yaw) * cp * v.dist, sp * v.dist, v.target.z + Math.cos(v.yaw) * cp * v.dist);
    this.camera.lookAt(v.target);
  }

  // Screen point -> ground square (float)
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
    return { x: hit.x, y: hit.z };
  }

  // Enemy under a screen point, measured where it is drawn (flyers hover high above the ground,
  // so a ground-plane pick misses them). Returns the closest within `px` pixels.
  enemyAtScreen(clientX, clientY, px = 34, onlyAir = false) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left, y = clientY - rect.top;
    let best = null, bestD = px;
    for (const [uid, m] of this.enemyMeshes) {
      const en = this.game.enemies.get(uid);
      if (!en?.alive || !this.game.visible(en) || (onlyAir && !en.type.air)) continue;
      const p = this.project(m.position.x, m.position.z, en.type.air ? 2.6 : 0.7);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= bestD) { best = en; bestD = d; }
    }
    return best;
  }

  project(x, y, z) {
    const v = new THREE.Vector3(x, z, y).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height, visible: v.z < 1 };
  }

  // Translucent stone showing where the next placement will land.
  setGhost(tl) {
    if (!this.ghost) {
      this.ghost = new THREE.Mesh(this.rockGeos[0], new THREE.MeshStandardMaterial({ color: 0x9fffcf, transparent: true, opacity: 0.45, emissive: 0x2a8a5a, depthWrite: false }));
      this.ghost.scale.setScalar(1.2);
      this.scene.add(this.ghost);
    }
    this.ghost.visible = !!tl;
    if (tl) this.ghost.position.set(tl.x + 1, 0.4, tl.y + 1);
  }

  setHover(tl, ok) {
    const u = this.groundMat.uniforms;
    if (!tl) { u.uHover.value.w = 0; return; }
    u.uHover.value.set(tl.x, tl.y, 0, 1);
    u.uHoverColor.value.set(ok ? 0x3cff9a : 0xff4060);
  }

  // ---------- Entities ----------
  gemMaterial(color, special) {
    const c = new THREE.Color(color);
    const lum = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; // bright gems need less glow or bloom washes them out
    return new THREE.MeshPhysicalMaterial({
      color: c, emissive: c, emissiveIntensity: (special ? 0.4 : 0.24) * (1 - lum * 0.75), roughness: 0.08, metalness: 0.05,
      clearcoat: 1, clearcoatRoughness: 0.05, flatShading: true, iridescence: special ? 0.6 : 0.2,
      transparent: true, opacity: 0.94,
    });
  }

  makeEntityMesh(e) {
    const grp = new THREE.Group();
    grp.position.set(e.x + 1, 0, e.y + 1);
    if (e.kind === 'rock') {
      const m = new THREE.Mesh(this.rockGeos[e.uid % this.rockGeos.length], this.rockMat);
      m.position.y = 0.35; m.rotation.y = e.uid * 1.7; m.castShadow = m.receiveShadow = true;
      m.scale.setScalar(1.4);
      grp.add(m);
      grp.userData = { kind: 'rock', defId: null };
      return grp;
    }
    const def = e.def;
    const ped = new THREE.Mesh(this.pedestalGeo, this.pedestalMat);
    ped.position.y = 0.11; ped.castShadow = ped.receiveShadow = true;
    grp.add(ped);
    let gem, wings = null, halo = null, tilt = null;
    if (def.base) {
      // Scale rosette: more and bigger scales as quality rises.
      gem = new THREE.Group();
      const q = def.quality;
      const count = [1, 1, 3, 3, 5, 6][q];
      const size = 1.2 + q * 0.13;
      const mat = this.gemMaterial(def.color, q >= 5);
      for (let i = 0; i < count; i++) {
        const sc = new THREE.Mesh(this.scaleGeo, mat);
        const holder = new THREE.Group();
        holder.rotation.y = (i / count) * Math.PI * 2 + 0.4;
        sc.position.x = count === 1 ? -0.08 : 0.22;
        sc.rotation.z = count === 1 ? 0.12 : 0.28; // tilt up toward the tip
        sc.scale.setScalar(size * (count === 1 ? 1.15 : 0.85));
        sc.castShadow = true;
        holder.add(sc); gem.add(holder);
      }
      if (q >= 2) {
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16 + q * 0.03, 0), new THREE.MeshBasicMaterial({ color: def.color }));
        core.position.y = 0.12; gem.add(core);
      }
      if (q >= 5) {
        halo = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: def.color }));
        halo.rotation.x = Math.PI / 2; halo.position.y = 0.3; grp.add(halo);
      }
      gem.position.y = 0.32;
    } else {
      if (this.dragonGeo) {
        // Sculpted dragon sitting on the pedestal, painted in the dragon's color; bigger and shinier each stage.
        let body;
        if (this.wingGeo) { const h = buildHybridDragon(this.dragonGeo, this.wingGeo, def.color, def.tier); body = h.group; wings = h.wings; }
        else {
          const c = new THREE.Color(def.color);
          const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.42, metalness: def.tier >= 4 ? 0.55 : 0.22, emissive: c, emissiveIntensity: def.tier >= 4 ? 0.14 : 0.06 });
          body = new THREE.Mesh(this.dragonGeo, mat); body.castShadow = true; wings = [];
        }
        body.scale.setScalar(1.6 + def.tier * 0.3);
        gem = new THREE.Group(); gem.add(body);
        tilt = new THREE.Group(); tilt.rotation.x = DRAGON_TILT; tilt.position.set(0, 0.3, 0.35); tilt.add(gem);
        // Ground shadow that shows up when the dragon takes off.
        const sh = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
        sh.rotation.x = -Math.PI / 2; sh.position.y = 0.26; sh.scale.set(0.9, 0.55, 1); grp.add(sh); tilt.userData.shadow = sh;
      } else {
        const dr = buildDragon(def.color, def.tier);
        gem = dr.group; wings = dr.wings;
        gem.position.y = 1.5;
      }
      const glow = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.25; glow.scale.setScalar(1.1);
      grp.add(glow);
    }
    grp.add(tilt || gem);
    // quality pips on pedestal
    if (def.base) {
      for (let i = 0; i <= def.quality; i++) {
        const pip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: def.color }));
        const a = (i / 6) * Math.PI * 2;
        pip.position.set(Math.cos(a) * 0.72, 0.24, Math.sin(a) * 0.72);
        grp.add(pip);
      }
      const tl = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTexture(tierTag(def.quality)), depthWrite: false, depthTest: false, toneMapped: false }));
      tl.scale.set(1.8, 0.9, 1); tl.position.set(0.8, 1.6, -0.9); tl.renderOrder = 5;
      grp.add(tl);
    }
    const pendingRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.05, 32), new THREE.MeshBasicMaterial({ color: 0x6f8fb8, transparent: true, opacity: 0.4, depthWrite: false }));
    pendingRing.rotation.x = -Math.PI / 2; pendingRing.position.y = 0.04;
    grp.add(pendingRing);
    grp.userData = { kind: 'gem', defId: def.id, gem, tilt, wings, dragon: !def.base, halo, pendingRing, baseY: gem.position.y, tiltY: tilt?.position.y, phase: e.uid * 0.7, yaw: e.uid };
    return grp;
  }

  syncEntities() {
    const seen = new Set();
    for (const e of this.game.entities.values()) {
      seen.add(e.uid);
      let m = this.meshes.get(e.uid);
      const defId = e.kind === 'rock' ? null : e.def.id;
      if (m && (m.userData.kind !== e.kind || m.userData.defId !== defId)) { this.disposeGroup(m); m = null; }
      if (!m) {
        m = this.makeEntityMesh(e);
        m.scale.setScalar(0.01);
        m.userData.spawn = 0;
        this.scene.add(m); this.meshes.set(e.uid, m);
      }
      if (m.userData.pendingRing) m.userData.pendingRing.visible = !!e.pending;
    }
    for (const [uid, m] of this.meshes) if (!seen.has(uid)) { this.disposeGroup(m); this.meshes.delete(uid); }
    if (this.guideGroup) for (const g of this.guideGroup.children) g.visible = !this.game.entityAt(g.userData.cell[0], g.userData.cell[1]);
  }

  disposeGroup(g) {
    this.scene.remove(g);
    g.traverse((o) => {
      if (o.material && o.material !== this.rockMat && o.material !== this.pedestalMat) o.material.dispose?.();
      if (o.geometry && !this.sharedGeos.has(o.geometry)) o.geometry.dispose();
    });
  }

  enemyMesh(en) {
    const t = en.type;
    const R = RACES[t.race] || RACES.human;
    const color = new THREE.Color(R.color);
    const grp = new THREE.Group();
    const scale = (t.boss ? 1.8 : 1) * R.size * 1.45;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: R.metal ?? 0.2, emissive: color.clone().multiplyScalar(R.glow ?? 0.05), transparent: true, opacity: R.ghost ? 0.7 : 1 });
    const skin = new THREE.MeshStandardMaterial({ color: R.skin, roughness: 0.7, transparent: true });
    const trim = new THREE.MeshStandardMaterial({ color: R.trim ?? 0x3a3f4a, roughness: 0.5, metalness: 0.5 });
    const body = new THREE.Group();
    grp.userData.mats = [mat, skin];
    if (t.air) {
      if (R.kind === 'airship') {
        const balloon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), mat); balloon.scale.set(0.8, 0.7, 1.4); balloon.position.y = 0.35;
        const gondola = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), trim); gondola.position.y = -0.25;
        const prop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.08), trim); prop.position.set(0, 0.35, -0.8);
        body.add(balloon, gondola, prop); grp.userData.prop = prop;
      } else if (R.kind === 'spirit') {
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), mat);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8), mat); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.55;
        body.add(orb, tail);
      } else {
        const torso = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat); torso.scale.set(0.9, 0.7, 1.4);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), R.kind === 'witch' ? skin : mat); head.position.set(0, 0.12, 0.5);
        body.add(torso, head);
        if (R.kind === 'witch') { const broom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 5), trim); broom.rotation.x = Math.PI / 2; broom.position.y = -0.15; const hat = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 6), trim); hat.position.set(0, 0.35, 0.5); body.add(broom, hat); }
        if (R.kind === 'griffin') { const rider = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), skin); rider.position.set(0, 0.3, 0.05); const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), trim); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.1, 0.72); body.add(rider, beak); }
        if (R.kind !== 'witch') {
          const wingGeo = new THREE.PlaneGeometry(1.1, 0.5);
          const wingMat = new THREE.MeshStandardMaterial({ color: R.wing ?? R.color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
          const wl = new THREE.Mesh(wingGeo, wingMat), wr = new THREE.Mesh(wingGeo, wingMat);
          wl.position.x = -0.65; wr.position.x = 0.65; wl.rotation.x = wr.rotation.x = -Math.PI / 2;
          const pl = new THREE.Group(), pr = new THREE.Group(); pl.add(wl); pr.add(wr);
          body.add(pl, pr); grp.userData.wings = [pl, pr];
        }
      }
      const shadow = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.scale.setScalar(0.55 * scale); shadow.position.y = 0.02;
      grp.add(shadow);
    } else {
      // Humanoid seen from above: shoulders, head, weapon, optional shield.
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.3, 4, 10), mat);
      torso.scale.set(R.wide ?? 1, 1, 0.75); torso.position.y = 0.42;
      const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.72 * (R.wide ?? 1), 0.14, 0.3), trim); shoulders.position.y = 0.66;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), skin); head.position.y = 0.86;
      const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.8), new THREE.MeshStandardMaterial({ color: 0xcfd6e0, metalness: 0.8, roughness: 0.3 }));
      weapon.position.set(0.36 * (R.wide ?? 1), 0.6, 0.25);
      body.add(torso, shoulders, head, weapon);
      if (R.shield) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 10), trim); sh.rotation.z = Math.PI / 2; sh.position.set(-0.4 * (R.wide ?? 1), 0.5, 0.1); body.add(sh); }
      if (R.ears) for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 4), skin); ear.rotation.z = -sx * 1.2; ear.position.set(0.2 * sx, 0.9, 0); body.add(ear); }
      if (R.tusks) for (const sx of [-1, 1]) { const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0xf0ead8 })); tusk.rotation.x = -1.2; tusk.position.set(0.07 * sx, 0.8, 0.16); body.add(tusk); }
      if (R.beard) { const beard = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 6), new THREE.MeshStandardMaterial({ color: R.beard })); beard.rotation.x = Math.PI; beard.position.set(0, 0.7, 0.12); body.add(beard); }
    }
    if (t.boss) { const crown = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffcf3a, metalness: 0.9, roughness: 0.2, emissive: 0x553300 })); crown.rotation.x = Math.PI / 2; crown.position.y = t.air ? 0.35 : 1.02; body.add(crown); }
    body.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    body.scale.multiplyScalar(scale);
    grp.add(body);
    // HP bar
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.3), new THREE.MeshBasicMaterial({ color: 0x0a0d12, transparent: true, opacity: 0.8, depthWrite: false }));
    const barFg = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.3), new THREE.MeshBasicMaterial({ color: 0x5dff8a, depthWrite: false }));
    barFg.position.z = 0.001;
    const bar = new THREE.Group(); bar.add(barBg, barFg);
    bar.position.y = (t.air ? 3.4 : 1.5) * (t.boss ? 1.25 : 1);
    bar.scale.setScalar(t.boss ? 1.6 : 1);
    grp.add(bar);
    Object.assign(grp.userData, { body, mat, bar, barFg, air: t.air, phase: Math.random() * 6, scale, ghost: !!R.ghost });
    return grp;
  }

  syncEnemies(dt) {
    const seen = new Set();
    for (const en of this.game.enemies.values()) {
      seen.add(en.uid);
      let m = this.enemyMeshes.get(en.uid);
      if (!m) { m = this.enemyMesh(en); this.scene.add(m); this.enemyMeshes.set(en.uid, m); m.position.set(U(en.x), 0, U(en.y)); }
      const ud = m.userData;
      const tx = U(en.x), tz = U(en.y);
      const dx = tx - m.position.x, dz = tz - m.position.z;
      if (Math.hypot(dx, dz) > 0.001) m.rotation.y = Math.atan2(dx, dz);
      m.position.x = tx; m.position.z = tz;
      const t = this.time + ud.phase;
      if (ud.air) {
        ud.body.position.y = 2.6 + Math.sin(t * 3) * 0.2;
        if (ud.wings) for (const [i, w] of ud.wings.entries()) w.rotation.z = (i ? -1 : 1) * Math.sin(t * 14) * 0.5;
        if (ud.prop) ud.prop.rotation.z += dt * 20;
      } else {
        ud.body.position.y = Math.abs(Math.sin(t * 9)) * 0.1;
        ud.body.rotation.z = Math.sin(t * 9) * 0.06;
      }
      // status tint
      const visible = this.game.visible(en);
      for (const mm of m.userData.mats) mm.opacity = visible ? (ud.ghost && mm === ud.mat ? 0.7 : 1) : 0.25;
      const em = ud.mat.emissive;
      if (en.hitFlash > 0) em.setRGB(0.9, 0.9, 0.9);
      else if (en.stun > 0) em.setRGB(0.6, 0.55, 0.1);
      else if (en.frost.p > 0 || en.slow.a > 0 || (en.aura && en.aura.ice > 0)) em.setRGB(0.1, 0.3, 0.7);
      else if (en.poison.t > 0) em.setRGB(0.1, 0.45, 0.1);
      else em.copy(ud.mat.color).multiplyScalar(0.06);
      const f = Math.max(0, en.hp / en.maxHp);
      ud.barFg.scale.x = Math.max(0.001, f); ud.barFg.position.x = -0.85 * (1 - f);
      ud.barFg.material.color.setHSL(0.33 * f, 0.9, 0.55);
      ud.bar.quaternion.copy(this.camera.quaternion);
      ud.bar.rotation.setFromQuaternion(this.camera.quaternion);
      // bar is child of rotated group: cancel parent yaw
      ud.bar.quaternion.premultiply(this.tmpQ.setFromAxisAngle(this.upAxis, -m.rotation.y));
    }
    for (const [uid, m] of this.enemyMeshes) if (!seen.has(uid)) { this.disposeGroup(m); this.enemyMeshes.delete(uid); }
  }

  syncProjectiles(dt = 1 / 60) {
    if (this.attackFx) { this.attackFx.update(dt); return; }
    const ps = this.game.projectiles;
    while (this.projMeshes.length < ps.length) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      this.scene.add(m); this.projMeshes.push(m);
    }
    this.projMeshes.forEach((m, i) => {
      const p = ps[i];
      m.visible = !!p;
      if (!p) return;
      const en = this.game.enemies.get(p.target);
      const y = en && en.type.air ? 2.6 : 1.3;
      m.position.set(U(p.x), y, U(p.y));
      m.material.color.setHex(p.color).multiplyScalar(1.6);
    });
  }

  // ---------- Particles & effects ----------
  makeParticles() {
    const N = 3000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const mat = new THREE.PointsMaterial({ size: 0.45, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);
    return { N, geo, pos, col, data: Array.from({ length: N }, () => ({ life: 0 })), next: 0 };
  }

  burst(x, y, z, color, count = 14, speed = 4, life = 0.6) {
    const P = this.particles, c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const p = P.data[P.next]; P.next = (P.next + 1) % P.N;
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      Object.assign(p, { x, y, z, vx: Math.cos(a) * Math.cos(e) * s, vy: Math.abs(Math.sin(e)) * s + 1, vz: Math.sin(a) * Math.cos(e) * s, life, max: life, r: c.r, g: c.g, b: c.b });
    }
  }

  updateParticles(dt) {
    const P = this.particles;
    for (let i = 0; i < P.N; i++) {
      const p = P.data[i];
      if (p.life <= 0) { P.pos[i * 3 + 1] = -100; continue; }
      p.life -= dt;
      p.vy -= 6 * dt;
      p.x += p.vx * dt; p.y = Math.max(0.05, p.y + p.vy * dt); p.z += p.vz * dt;
      const k = Math.max(0, p.life / p.max);
      P.pos[i * 3] = p.x; P.pos[i * 3 + 1] = p.y; P.pos[i * 3 + 2] = p.z;
      P.col[i * 3] = p.r * k; P.col[i * 3 + 1] = p.g * k; P.col[i * 3 + 2] = p.b * k;
    }
    P.geo.attributes.position.needsUpdate = true;
    P.geo.attributes.color.needsUpdate = true;
  }

  addRing(x, z, radius, color, life = 0.45) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z);
    this.scene.add(m);
    this.effects.push({ m, life, max: life, kind: 'ring', radius });
  }

  addLightning(pts, color) {
    const verts = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const segs = 6;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs, t1 = (s + 1) / segs;
        const j = (t) => (t === 0 || t === 1 ? 0 : (Math.random() - 0.5) * 0.8);
        verts.push(U(a.x + (b.x - a.x) * t0) + j(t0), 1.4 + j(t0), U(a.y + (b.y - a.y) * t0) + j(t0));
        verts.push(U(a.x + (b.x - a.x) * t1) + j(t1), 1.4 + j(t1), U(a.y + (b.y - a.y) * t1) + j(t1));
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending }));
    this.scene.add(m);
    this.effects.push({ m, life: 0.25, max: 0.25, kind: 'fade' });
  }

  drainFx(onText) {
    for (const f of this.game.fx) {
      switch (f.t) {
        case 'place': this.burst(f.x + 1, 0.5, f.y + 1, 0xcfe6ff, 22, 5, 0.6); this.addRing(f.x + 1, f.y + 1, 1.6, 0x9fd2ff); break;
        case 'upgrade': this.burst(f.x + 1, 1.2, f.y + 1, f.color, 60, 7, 1.0); this.addRing(f.x + 1, f.y + 1, 3.5, f.color, 0.8); break;
        case 'remove': this.burst(f.x + 1, 0.4, f.y + 1, 0x8a8f99, 20, 4, 0.5); break;
        case 'hit': if (this.attackFx) { this.attackFx.hit(f); if (f.crit) onText?.(f.x, f.y, 'CRÍTICO', 'crit'); break; } this.burst(U(f.x), f.air ? 2.6 : 1.1, U(f.y), f.color, f.crit ? 18 : 5, f.crit ? 5 : 2.5, 0.3); if (f.crit) onText?.(f.x, f.y, 'CRÍTICO', 'crit'); break;
        case 'splash': this.addRing(U(f.x), U(f.y), U(f.r), f.color, 0.35); break;
        case 'lightning': this.addLightning(f.pts, f.color); break;
        case 'death': this.burst(U(f.x), f.air ? 2.6 : 0.8, U(f.y), f.boss ? 0xffd34a : 0xffb27a, f.boss ? 120 : 26, f.boss ? 9 : 5, 0.8); onText?.(f.x, f.y, `+${f.gold}`, 'gold'); break;
        case 'leak': this.burst(U(f.x), 1, U(f.y), 0xff3048, 40, 6, 0.8); onText?.(f.x, f.y, '−vida', 'leak'); break;
        case 'miss': onText?.(f.x, f.y, 'errou', 'miss'); break;
        case 'block': onText?.(f.x, f.y, 'bloqueou', 'miss'); break;
        case 'jackpot': onText?.(f.x, f.y, '10x ouro!', 'gold'); break;
        case 'blink': this.burst(U(f.x), 1, U(f.y), 0xb48cff, 16, 3, 0.4); this.burst(U(f.x2), 1, U(f.y2), 0xb48cff, 16, 3, 0.4); break;
        case 'shoot': { const m = this.meshes.get(f.uid); if (m?.userData.gem) m.userData.kick = 0.15; break; }
      }
    }
    this.game.fx.length = 0;
  }

  updateEffects(dt) {
    this.effects = this.effects.filter((e) => {
      e.life -= dt;
      const k = Math.max(0, e.life / e.max);
      if (e.kind === 'ring') { const s = e.radius * (1 - k * 0.7); e.m.scale.setScalar(s); e.m.material.opacity = k; }
      else e.m.material.opacity = k;
      if (e.life <= 0) { this.scene.remove(e.m); e.m.geometry !== this.ringGeo && e.m.geometry.dispose(); e.m.material.dispose(); return false; }
      return true;
    });
  }

  // Load the sculpted dragon once (already Y-up), face it toward +z, put its feet at y = 0 and
  // its height at 1. Dragons already on the map are rebuilt with it.
  loadDragonModel() {
    new GLTFLoader().load(dragonModelUrl, (gltf) => {
      let src = null; gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
      if (!src) return;
      if (DRAGON_MODEL === 'hibrido') {
        const body = stripWings(prepareDragonGeometry(src.geometry)); body.computeVertexNormals();
        this.dragonGeo = body; this.wingGeo = wingGeometry(0.85);
        this.sharedGeos.add(body); this.sharedGeos.add(this.wingGeo.membrane); for (const b of this.wingGeo.bones) this.sharedGeos.add(b);
        for (const [uid, m] of this.meshes) if (m.userData.dragon) { this.disposeGroup(m); this.meshes.delete(uid); }
        return;
      }
      const geo = src.geometry.clone();
      geo.computeBoundingBox();
      let b = geo.boundingBox;
      geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      // Head = highest point: turn the model so it looks toward +z.
      const pos = geo.attributes.position; let top = 0;
      for (let i = 1; i < pos.count; i++) if (pos.getY(i) > pos.getY(top)) top = i;
      geo.rotateY(-Math.atan2(pos.getX(top), pos.getZ(top)));
      geo.computeBoundingBox(); b = geo.boundingBox;
      const h = b.max.y - b.min.y; geo.scale(1 / h, 1 / h, 1 / h);
      geo.computeVertexNormals();
      this.dragonGeo = geo; this.sharedGeos.add(geo);
      for (const [uid, m] of this.meshes) if (m.userData.dragon) { this.disposeGroup(m); this.meshes.delete(uid); }
    });
  }

  // Soft glowing arcs linking the stones of each combination available this round, plus a pulsing ring on each.
  showCombos(combos) {
    const key = combos.map((c) => c.result + ':' + c.uids.join(',')).join('|');
    if (key === this.comboKey) return;
    this.comboKey = key;
    if (this.comboGroup) this.disposeGroup(this.comboGroup);
    this.comboGroup = new THREE.Group();
    this.comboMats = [];
    const center = (uid) => { const e = this.game.entities.get(uid); return e && new THREE.Vector3(e.x + 1, 0.9, e.y + 1); };
    const ringed = new Set();
    this.comboSparks = [];
    for (const c of combos) {
      const color = c.kind === 'special' ? 0xffc94a : 0xbfe4ff;
      // Arcs flow from each other piece into the target: the dragon being upgraded if there is one, else the anchor stone.
      const dragon = c.uids.map((u) => this.game.entities.get(u)).find((e) => e && !e.pending && !e.def.base);
      const target = dragon ? dragon.uid : c.anchor;
      const t = center(target);
      if (!t) continue;
      for (const uid of c.uids) {
        const o = center(uid);
        if (!o) continue;
        if (!ringed.has(uid)) {
          ringed.add(uid);
          const rm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
          const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.3, 40), rm);
          ring.rotation.x = -Math.PI / 2; ring.position.set(o.x, 0.07, o.z);
          this.comboGroup.add(ring); this.comboMats.push(rm);
        }
        if (uid === target) continue;
        // Rise from the origin, bow sideways (so the curve reads from the top-down camera), land on the target.
        const len = o.distanceTo(t);
        const dir = t.clone().sub(o).normalize();
        const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(len * 0.22);
        const lift = 2 + len * 0.15;
        const curve = new THREE.CubicBezierCurve3(o,
          o.clone().lerp(t, 0.25).add(side).setY(o.y + lift),
          o.clone().lerp(t, 0.75).add(side).setY(t.y + lift),
          t);
        const lm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
        this.comboGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.12, 8, false), lm));
        this.comboMats.push(lm);
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
        this.comboGroup.add(spark);
        this.comboSparks.push({ mesh: spark, curve, phase: Math.random() });
      }
    }
    this.scene.add(this.comboGroup);
  }

  // Maze guide: translucent "shadow" stones where the saved maze has rocks; each hides once something stands there.
  setGuide(cells) {
    if (this.guideGroup) { this.scene.remove(this.guideGroup); this.guideGroup = null; }
    if (!cells?.length) return;
    this.guideMat ??= new THREE.MeshBasicMaterial({ color: 0x0a0806, transparent: true, opacity: 0.42, depthWrite: false });
    this.guideRingMat ??= new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.55, depthWrite: false });
    this.guideGroup = new THREE.Group();
    for (const [x, y] of cells) {
      const g = new THREE.Group(); g.position.set(x + 1, 0, y + 1); g.userData.cell = [x, y];
      const m = new THREE.Mesh(this.rockGeos[(x * 7 + y) % this.rockGeos.length], this.guideMat); m.position.y = 0.3; m.scale.setScalar(1.3);
      const ring = new THREE.Mesh(this.ringGeo, this.guideRingMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; ring.scale.setScalar(0.9);
      g.add(m, ring); this.guideGroup.add(g);
    }
    this.scene.add(this.guideGroup);
  }

  // A dragon hatched: the camera leans in on it, colored bursts and a big ring. No new geometry
  // (particles are a fixed pool, rings share ringGeo). endCelebration() puts the camera back.
  celebrate(entity, color) {
    const v = this.view;
    this.celebration = {
      t: 0, color, x: entity.x + 1, z: entity.y + 1, bursts: 0,
      from: { dist: v.dist, target: v.target.clone() },
      to: { dist: Math.max(v.minDist, v.maxDist * 0.42), target: new THREE.Vector3(entity.x + 1, 0, entity.y + 1) },
    };
    this.addRing(entity.x + 1, entity.y + 1, 9, color, 1.2);
  }

  endCelebration() {
    const c = this.celebration;
    if (!c) return;
    this.view.dist = c.from.dist; this.view.target.copy(c.from.target);
    this.celebration = null;
  }

  updateCelebration(dt) {
    const c = this.celebration;
    if (!c) return;
    c.t += dt;
    const k = Math.min(1, c.t / 0.8), e = 1 - (1 - k) ** 3; // ease out
    this.view.dist = c.from.dist + (c.to.dist - c.from.dist) * e;
    this.view.target.lerpVectors(c.from.target, c.to.target, e);
    if (c.bursts < 4 && c.t >= c.bursts * 0.3) {
      this.burst(c.x, 1.4, c.z, c.color, 90, 9, 1.2);
      this.burst(c.x, 1.4, c.z, 0xffffff, 30, 6, 0.8);
      if (c.bursts === 2) this.addRing(c.x, c.z, 6, 0xffe2a0, 1);
      c.bursts++;
    }
  }

  // First match: a short line of glowing "ghost" walkers runs the path from E to S once.
  previewPath(seconds = 3) {
    const path = this.game.path;
    if (!path?.length) return;
    if (!this.pathGhosts) {
      this.ghostGeo = new THREE.SphereGeometry(0.55, 12, 8);
      this.sharedGeos.add(this.ghostGeo);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85, depthWrite: false });
      this.pathGhosts = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(this.ghostGeo, mat); m.visible = false; this.scene.add(m); return m; });
    }
    this.pathPreview = { t: 0, dur: seconds, path };
  }

  updatePathPreview(dt) {
    const pp = this.pathPreview;
    if (!pp) return;
    pp.t += dt;
    const n = pp.path.length - 1, done = pp.t >= pp.dur;
    this.pathGhosts.forEach((m, i) => {
      const k = pp.t / pp.dur - i * 0.04; // a short queue, one behind the other
      m.visible = !done && k >= 0 && k <= 1;
      if (!m.visible) return;
      const f = k * n, a = pp.path[Math.floor(f)], b = pp.path[Math.min(n, Math.floor(f) + 1)], u = f % 1;
      m.position.set(a.x + (b.x - a.x) * u + 1, 0.7 + 0.15 * Math.sin(this.time * 10 + i), a.y + (b.y - a.y) * u + 1);
    });
    if (done) this.pathPreview = null;
  }

  showEnemySelection(uid) {
    this.selectedEnemy = uid ?? null;
    if (!uid) this.enemyRing.visible = false;
  }

  showSelection(entity) {
    this.selected = entity;
    const on = !!entity;
    this.selRing.visible = on;
    this.rangeRing.visible = this.rangeFill.visible = on && entity.kind === 'gem';
    if (!on) return;
    this.selRing.position.set(entity.x + 1, 0.05, entity.y + 1);
    if (entity.kind === 'gem') {
      const r = U(entity.def.range + (entity.buffRange || 0));
      const shown = Math.min(r, 80);
      for (const m of [this.rangeRing, this.rangeFill]) { m.position.set(entity.x + 1, 0.03, entity.y + 1); m.scale.setScalar(shown); }
      this.rangeRing.material.color.setHex(entity.def.color);
      this.rangeFill.material.color.setHex(entity.def.color);
    }
  }

  frame(dt) {
    this.time += dt;
    this.groundMat.uniforms.uTime.value = this.time;
    // Build grid fades out during a wave and back in for building.
    const gu = this.groundMat.uniforms.uGrid, gTarget = this.game.phase === 'wave' ? 0 : 1;
    gu.value += (gTarget - gu.value) * Math.min(1, dt * 4);
    for (const m of this.waypointMarks ?? []) m.opacity = (m.userData.baseOpacity ?? 1) * gu.value;
    const pulse = 0.45 + 0.35 * Math.sin(this.time * 4);
    for (const m of this.comboMats ?? []) m.opacity = pulse;
    for (const sp of this.comboSparks ?? []) {
      const k = (this.time * 0.45 + sp.phase) % 1;
      sp.mesh.position.copy(sp.curve.getPoint(k));
      sp.mesh.material.opacity = Math.sin(k * Math.PI); // fades in at the stone, out at the dragon
    }
    this.updateCamera();
    this.updatePathPreview(dt);
    this.updateCelebration(dt);
    this.syncEntities();
    for (const [uid, m] of this.meshes) {
      const ud = m.userData;
      if (ud.spawn !== undefined && ud.spawn < 1) {
        ud.spawn = Math.min(1, ud.spawn + dt * 4);
        const s = ud.spawn;
        m.scale.setScalar(0.2 + s * 0.8 + Math.sin(s * Math.PI) * 0.15);
      }
      if (ud.gem) {
        ud.kick = Math.max(0, (ud.kick || 0) - dt);
        if (ud.dragon) {
          // Turn toward the current target, flap, bob.
          const ent = this.game.entities.get(uid);
          if (ent?.aim) {
            const want = Math.atan2(ent.aim.x / CELL - (ent.x + 1), ent.aim.y / CELL - (ent.y + 1));
            let d = want - ud.gem.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
            ud.gem.rotation.y += d * Math.min(1, dt * 8);
          } else ud.gem.rotation.y += dt * 0.15;
          const flap = Math.sin(this.time * (ent?.aim ? 9 : 4) + ud.phase);
          if (this.wingGeo) {
            // Hybrid: wings folded up while sitting (slow breathing), full flaps while flying.
            const fold = 1.25 + Math.sin(this.time * 1.5 + ud.phase) * 0.04;
            const beat = 0.2 + Math.sin(this.time * 7 + ud.phase) * 0.55;
            const l = ud.lift ?? 0;
            for (const w of ud.wings) w.pivot.rotation.z = w.sx * (fold * (1 - l) + beat * l);
          } else for (const w of ud.wings) w.pivot.rotation.z = w.sx * (0.15 + flap * 0.45);
          if (this.dragonGeo) {
            // Sits on the pedestal while building; takes off and hovers while enemies are on the field.
            const fly = this.game.phase === 'wave' ? 1 : 0;
            ud.lift = (ud.lift ?? fly) + (fly - (ud.lift ?? fly)) * Math.min(1, dt * 2.5);
            const lifted = ud.lift * (1.4 + Math.sin(this.time * 2.2 + ud.phase) * 0.18);
            if (ud.tilt) {
              // Flying: rises over the neighbouring stones, drifts up on screen and grows a little; shadow stays below.
              ud.tilt.position.y = ud.tiltY + lifted * 2.2;
              ud.tilt.position.z = 0.35 - ud.lift * 1.1;
              ud.tilt.scale.setScalar(1 + ud.lift * 0.18);
              ud.tilt.userData.shadow.material.opacity = 0.38 * ud.lift;
            } else ud.gem.position.y = ud.baseY + lifted;
            ud.gem.rotation.z = ud.lift * Math.sin(this.time * 2.2 + ud.phase) * 0.06;
          } else ud.gem.position.y = ud.baseY + Math.sin(this.time * 2 + ud.phase) * 0.12;
        } else {
          ud.gem.rotation.y += dt * 0.5;
          ud.gem.position.y = ud.baseY + Math.sin(this.time * 1.6 + ud.phase) * 0.05 + ud.kick * 0.6;
        }
        if (ud.halo) ud.halo.rotation.z += dt * 1.2;
        if (ud.pendingRing?.visible) ud.pendingRing.material.opacity = 0.3 + Math.sin(this.time * 5) * 0.2;
      }
    }
    if (this.ghost?.visible) this.ghost.position.y = 0.4 + Math.sin(this.time * 4) * 0.1;
    this.syncEnemies(dt);
    const sel = this.selectedEnemy && this.game.enemies.get(this.selectedEnemy);
    this.enemyRing.visible = !!sel;
    if (sel) {
      this.enemyRing.position.set(U(sel.x), sel.type.air ? 1.2 : 0.06, U(sel.y));
      this.enemyRing.scale.setScalar((sel.type.boss ? 1.4 : 1) * (1 + Math.sin(this.time * 6) * 0.08));
    }
    this.syncProjectiles(dt);
    this.updateParticles(dt);
    this.updateEffects(dt);
    if (this.selected) {
      this.selRing.rotation.z += dt * 0.8;
      if (!this.game.entities.has(this.selected.uid)) this.showSelection(null);
    }
    this.composer.render(dt);
  }
}
