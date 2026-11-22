// Three.js renderer. Reads Game state each frame; never changes game rules.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL } from './data/towers.js';
import { PLATFORM, BLOCK } from './map.js';

const U = (v) => v / CELL; // game units -> squares

// ---------- Gem geometry per type ----------
function gemGeometry(type) {
  const g = (geo) => { if (geo.index) geo = geo.toNonIndexed(); geo.computeVertexNormals(); return geo; };
  switch (type) {
    case 'B': { const o = new THREE.OctahedronGeometry(0.55); o.scale(0.85, 1.35, 0.85); return g(o); }
    case 'D': {
      const crown = new THREE.CylinderGeometry(0.32, 0.6, 0.28, 8); crown.translate(0, 0.14, 0);
      const pav = new THREE.ConeGeometry(0.6, 0.62, 8); pav.rotateX(Math.PI); pav.translate(0, -0.31, 0);
      return g(mergeGeometries([crown.toNonIndexed(), pav.toNonIndexed()]));
    }
    case 'E': { const s = new THREE.IcosahedronGeometry(0.55, 1); s.scale(1, 0.62, 0.8); return g(s); }
    case 'G': { const c = new THREE.CylinderGeometry(0.42, 0.5, 0.95, 4, 1); c.rotateY(Math.PI / 4); c.scale(0.8, 1, 1.1); return g(c); }
    case 'P': {
      const parts = [];
      for (const [x, z, h, r] of [[0, 0, 1.0, 0], [0.28, 0.1, 0.7, 0.35], [-0.25, 0.15, 0.6, -0.4]]) {
        const body = new THREE.CylinderGeometry(0.17, 0.17, h, 6); body.translate(0, h / 2 - 0.4, 0);
        const tip = new THREE.ConeGeometry(0.17, 0.25, 6); tip.translate(0, h - 0.4 + 0.125, 0);
        const m = mergeGeometries([body.toNonIndexed(), tip.toNonIndexed()]);
        m.rotateZ(r); m.translate(x, 0, z); parts.push(m);
      }
      return g(mergeGeometries(parts));
    }
    case 'Q': {
      const body = new THREE.CylinderGeometry(0.24, 0.24, 1.1, 6); body.translate(0, -0.05, 0);
      const tip = new THREE.ConeGeometry(0.24, 0.35, 6); tip.translate(0, 0.675, 0);
      return g(mergeGeometries([body.toNonIndexed(), tip.toNonIndexed()]));
    }
    case 'R': return g(new THREE.IcosahedronGeometry(0.55, 0));
    case 'Y': { const d = new THREE.DodecahedronGeometry(0.52, 0); d.scale(1, 1.15, 1); return g(d); }
    default: return g(new THREE.IcosahedronGeometry(0.6, 1));
  }
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
  x.font = '700 78px Oxanium, system-ui, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 8;
  x.fillText(text, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const GROUND_VERT = /* glsl */`
varying vec2 vUv; varying vec3 vWorld;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GROUND_FRAG = /* glsl */`
uniform sampler2D uCells; uniform vec2 uSize; uniform float uTime; uniform vec4 uHover; uniform vec3 uHoverColor;
varying vec2 vUv; varying vec3 vWorld;
float gridLine(vec2 p, float w){ vec2 g = abs(fract(p - .5) - .5) / fwidth(p); return 1. - min(min(g.x, g.y) / w, 1.); }
void main(){
  vec2 p = vWorld.xz; // in squares
  vec2 cell = floor(p);
  vec4 c = texture2D(uCells, (cell + .5) / uSize);
  float path = c.r, plat = c.g, block = c.b;
  float inside = step(0., p.x) * step(0., p.y) * step(p.x, uSize.x) * step(p.y, uSize.y);
  vec3 base = mix(vec3(.075,.09,.12), vec3(.11,.13,.17), smoothstep(45., 0., length(p - uSize*.5)));
  float fine = gridLine(p, 1.0) * .06;
  float major = gridLine(p / 2., 1.0) * .12;
  vec3 col = base + vec3(.30,.42,.6) * (fine + major);
  // path glow with a slow flowing pulse
  float flow = .55 + .45 * sin((p.x + p.y) * .35 - uTime * 2.2);
  col = mix(col, vec3(.12,.32,.40) * (.85 + .3 * flow), path * .65);
  col = mix(col, vec3(.10,.26,.19), plat * .85);
  col += vec3(.2,.9,.6) * plat * gridLine(p, 1.2) * .2;
  // hover footprint
  if (uHover.w > 0. && p.x >= uHover.x && p.x < uHover.x + 2. && p.y >= uHover.y && p.y < uHover.y + 2.) {
    col = mix(col, uHoverColor, .45);
  }
  col = mix(vec3(.045,.055,.075), col, inside);
  // border
  vec2 d = min(p, uSize - p);
  float edge = (1. - smoothstep(0., .15, min(d.x, d.y))) * inside;
  col += vec3(.2,.5,.8) * edge * .6;
  // colours above are authored in sRGB; the composer works in linear space
  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.);
}`;

export class Renderer {
  constructor(canvas, game) {
    this.game = game;
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d13);
    scene.fog = new THREE.Fog(0x0a0d13, 110, 220);
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;

    const W = game.grid.w, H = game.grid.h;
    this.center = new THREE.Vector3(W / 2, 0, H / 2);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400);
    this.view = { target: this.center.clone(), dist: 78, yaw: 0, pitch: 1.12 };

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
      uniforms: { uCells: { value: this.cellTex }, uSize: { value: new THREE.Vector2(W, H) }, uTime: { value: 0 },
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
    this.gemGeos = {};
    this.rockGeos = Array.from({ length: 6 }, (_, i) => rockGeometry(i + 1));
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4f58, roughness: 0.92, metalness: 0.05, flatShading: true });
    this.pedestalGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.22, 6);
    this.pedestalMat = new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 0.6, metalness: 0.4 });
    this.ringGeo = new THREE.RingGeometry(0.98, 1, 96);
    this.discGeo = new THREE.CircleGeometry(1, 64);

    this.meshes = new Map(); // entity uid -> group
    this.enemyMeshes = new Map();
    this.projMeshes = [];
    this.particles = this.makeParticles();
    this.effects = [];

    // Selection / range indicators
    this.rangeRing = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.8, depthWrite: false }));
    this.rangeFill = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.07, depthWrite: false }));
    for (const m of [this.rangeRing, this.rangeFill]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.visible = false; scene.add(m); }
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.45, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
    this.selRing.rotation.x = -Math.PI / 2; this.selRing.visible = false; scene.add(this.selRing);

    // Path preview line (air route)
    const air = game.grid.airPath().map((p) => new THREE.Vector3(p.x + 1, 3.2, p.y + 1));
    const airLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(air), new THREE.LineDashedMaterial({ color: 0x8a7dff, dashSize: 0.6, gapSize: 0.6, transparent: true, opacity: 0.25 }));
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
    g.waypoints.forEach((p, i) => {
      const isEnd = i === 0 || i === n - 1;
      const color = isEnd ? 0xff5a6a : 0x3cffa0;
      const grp = new THREE.Group();
      grp.position.set(p.x + 1, 0, p.y + 1);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 8, 48), new THREE.MeshBasicMaterial({ color }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.08;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 4, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      beam.position.y = 2;
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(i === 0 ? 'E' : i === n - 1 ? 'S' : String(i), isEnd ? '#ffd0d5' : '#d6ffe9'), depthWrite: false }));
      label.scale.set(2.2, 2.2, 1); label.position.y = 3.4;
      grp.add(ring, beam, label);
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
    // Fit the map on narrow screens
    const portrait = w < h * 0.9;
    this.view.minDist = 16; this.view.maxDist = portrait ? 190 : 120;
    if (!this.fitted) {
      // Frame the whole map, leaving room for the side dock (desktop) or the bottom sheet (phone).
      const W = this.game.grid.w, H = this.game.grid.h;
      const vfov = THREE.MathUtils.degToRad(this.camera.fov);
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * (w / h));
      const usableW = portrait ? 1 : Math.max(0.5, (w - 330) / w);
      const needH = (H * 1.02) / (2 * Math.tan(vfov / 2)) * (portrait ? 1.7 : 1);
      const needW = (W * 1.05) / (2 * Math.tan(hfov / 2) * usableW);
      this.view.dist = Math.min(this.view.maxDist, Math.max(needH, needW));
      this.view.target.set(W / 2 + (portrait ? 0 : this.view.dist * Math.tan(hfov / 2) * (1 - usableW)), 0, H / 2 + (portrait ? H * 0.2 : 2));
      this.fitted = true;
    }
    this.camera.updateProjectionMatrix();
  }

  updateCamera() {
    const v = this.view;
    v.dist = THREE.MathUtils.clamp(v.dist, v.minDist, v.maxDist);
    v.target.x = THREE.MathUtils.clamp(v.target.x, -4, this.game.grid.w + 4);
    v.target.z = THREE.MathUtils.clamp(v.target.z, -4, this.game.grid.h + 4);
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

  project(x, y, z) {
    const v = new THREE.Vector3(x, z, y).project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height, visible: v.z < 1 };
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
      m.scale.setScalar(1.2);
      grp.add(m);
      grp.userData = { kind: 'rock', defId: null };
      return grp;
    }
    const def = e.def;
    const ped = new THREE.Mesh(this.pedestalGeo, this.pedestalMat);
    ped.position.y = 0.11; ped.castShadow = ped.receiveShadow = true;
    grp.add(ped);
    const special = !def.base;
    const type = def.base ? def.type : null;
    const key = type ?? 'S';
    if (!this.gemGeos[key]) this.gemGeos[key] = gemGeometry(type);
    const gem = new THREE.Mesh(this.gemGeos[key], this.gemMaterial(def.color, special));
    const size = special ? 1.25 + def.tier * 0.15 : 0.95 + def.quality * 0.15;
    gem.scale.setScalar(size);
    gem.position.y = 0.95 + size * 0.3;
    gem.castShadow = true;
    grp.add(gem);
    let halo = null;
    if (special) {
      halo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.035, 6, 48), new THREE.MeshBasicMaterial({ color: def.color }));
      halo.position.y = gem.position.y; halo.rotation.x = Math.PI / 2.4;
      grp.add(halo);
    }
    // quality pips on pedestal
    if (def.base) {
      for (let i = 0; i <= def.quality; i++) {
        const pip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: def.color }));
        const a = (i / 6) * Math.PI * 2;
        pip.position.set(Math.cos(a) * 0.72, 0.24, Math.sin(a) * 0.72);
        grp.add(pip);
      }
    }
    const pendingRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.05, 32), new THREE.MeshBasicMaterial({ color: 0x6f8fb8, transparent: true, opacity: 0.4, depthWrite: false }));
    pendingRing.rotation.x = -Math.PI / 2; pendingRing.position.y = 0.04;
    grp.add(pendingRing);
    grp.userData = { kind: 'gem', defId: def.id, gem, halo, pendingRing, baseY: gem.position.y, phase: e.uid * 0.7 };
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
  }

  disposeGroup(g) {
    this.scene.remove(g);
    g.traverse((o) => { if (o.material && o.material !== this.rockMat && o.material !== this.pedestalMat) o.material.dispose?.(); });
  }

  enemyMesh(en) {
    const t = en.type;
    const hue = ((t.level * 47) % 360) / 360;
    const color = new THREE.Color().setHSL(hue, 0.6, 0.42);
    const grp = new THREE.Group();
    const scale = t.boss ? 2.2 : 1.25;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15, emissive: color.clone().multiplyScalar(0.06), transparent: true });
    let body;
    if (t.air) {
      body = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), mat);
      body.scale.set(1, 0.6, 1.3);
      const wingGeo = new THREE.PlaneGeometry(1.1, 0.5);
      const wingMat = new THREE.MeshStandardMaterial({ color: color.clone().offsetHSL(0, 0, 0.15), side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const wl = new THREE.Mesh(wingGeo, wingMat), wr = new THREE.Mesh(wingGeo, wingMat);
      wl.position.x = -0.7; wr.position.x = 0.7; wl.rotation.x = wr.rotation.x = -Math.PI / 2;
      const wings = new THREE.Group(); wings.add(wl, wr);
      body.add(wings);
      grp.userData.wings = [wl, wr];
      const shadow = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.scale.setScalar(0.6 * scale); shadow.position.y = 0.02;
      grp.add(shadow);
    } else {
      body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), mat);
      body.scale.set(1, 0.85, 1.05);
      // eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat); eye.position.set(0.2 * s, 0.15, 0.48); body.add(eye); }
    }
    body.castShadow = true;
    body.scale.multiplyScalar(scale);
    grp.add(body);
    // HP bar
    const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.14), new THREE.MeshBasicMaterial({ color: 0x0a0d12, transparent: true, opacity: 0.8, depthWrite: false }));
    const barFg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.14), new THREE.MeshBasicMaterial({ color: 0x5dff8a, depthWrite: false }));
    barFg.position.z = 0.001;
    const bar = new THREE.Group(); bar.add(barBg, barFg);
    bar.position.y = (t.air ? 3.4 : 1.5) * (t.boss ? 1.25 : 1);
    bar.scale.setScalar(t.boss ? 1.6 : 1);
    grp.add(bar);
    Object.assign(grp.userData, { body, mat, bar, barFg, air: t.air, phase: Math.random() * 6, scale });
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
        for (const [i, w] of ud.wings.entries()) w.rotation.z = (i ? -1 : 1) * Math.sin(t * 14) * 0.5;
      } else {
        ud.body.position.y = 0.5 * ud.scale + Math.abs(Math.sin(t * 9)) * 0.12;
      }
      // status tint
      const visible = this.game.visible(en);
      ud.mat.opacity = visible ? 1 : 0.25;
      const em = ud.mat.emissive;
      if (en.hitFlash > 0) em.setRGB(0.9, 0.9, 0.9);
      else if (en.stun > 0) em.setRGB(0.6, 0.55, 0.1);
      else if (en.frost.p > 0 || en.slow.a > 0 || (en.aura && en.aura.ice > 0)) em.setRGB(0.1, 0.3, 0.7);
      else if (en.poison.t > 0) em.setRGB(0.1, 0.45, 0.1);
      else em.copy(ud.mat.color).multiplyScalar(0.06);
      const f = Math.max(0, en.hp / en.maxHp);
      ud.barFg.scale.x = Math.max(0.001, f); ud.barFg.position.x = -0.6 * (1 - f);
      ud.barFg.material.color.setHSL(0.33 * f, 0.9, 0.55);
      ud.bar.quaternion.copy(this.camera.quaternion);
      ud.bar.rotation.setFromQuaternion(this.camera.quaternion);
      // bar is child of rotated group: cancel parent yaw
      ud.bar.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -m.rotation.y));
    }
    for (const [uid, m] of this.enemyMeshes) if (!seen.has(uid)) { this.disposeGroup(m); this.enemyMeshes.delete(uid); }
  }

  syncProjectiles() {
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
        case 'hit': this.burst(U(f.x), f.air ? 2.6 : 1.1, U(f.y), f.color, f.crit ? 18 : 5, f.crit ? 5 : 2.5, 0.3); if (f.crit) onText?.(f.x, f.y, 'CRÍTICO', 'crit'); break;
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
    this.updateCamera();
    this.syncEntities();
    for (const m of this.meshes.values()) {
      const ud = m.userData;
      if (ud.spawn !== undefined && ud.spawn < 1) {
        ud.spawn = Math.min(1, ud.spawn + dt * 4);
        const s = ud.spawn;
        m.scale.setScalar(0.2 + s * 0.8 + Math.sin(s * Math.PI) * 0.15);
      }
      if (ud.gem) {
        ud.gem.rotation.y += dt * 0.6;
        ud.kick = Math.max(0, (ud.kick || 0) - dt);
        ud.gem.position.y = ud.baseY + Math.sin(this.time * 1.6 + ud.phase) * 0.08 + ud.kick * 0.8;
        if (ud.halo) ud.halo.rotation.z += dt * 1.2;
        if (ud.pendingRing?.visible) ud.pendingRing.material.opacity = 0.3 + Math.sin(this.time * 5) * 0.2;
      }
    }
    this.syncEnemies(dt);
    this.syncProjectiles();
    this.updateParticles(dt);
    this.updateEffects(dt);
    if (this.selected) {
      this.selRing.rotation.z += dt * 0.8;
      if (!this.game.entities.has(this.selected.uid)) this.showSelection(null);
    }
    this.composer.render(dt);
  }
}
