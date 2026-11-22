// Procedural dragon models in three styles. stage 1..4 grows size, horns, spines, wings; stage 4 gets a crown.
// style: 'wyvern' (faceted low-poly), 'toon' (smooth cel-shaded with outline), 'serpente' (long oriental dragon).
import * as THREE from 'three';

// Tube along a curve whose radius follows r(t), t in 0..1.
function taperTube(curve, r, segs = 40, radial = 10) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, p = curve.getPointAt(t), rad = r(t);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
      pos.push(p.x + n.x * rad, p.y + n.y * rad, p.z + n.z * rad);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Bat-like membrane: fingers fan out from the shoulder; edge scallops between finger tips.
function wingGeometry(span, depth, fingers = 4) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  const tips = [];
  for (let i = 0; i <= fingers; i++) {
    const a = -0.15 - (i / fingers) * 1.15;
    const len = span * (1 - i * 0.14);
    tips.push([Math.cos(a) * len, Math.sin(a) * len * depth]);
  }
  s.lineTo(tips[0][0], tips[0][1]);
  for (let i = 1; i < tips.length; i++) {
    const [x0, y0] = tips[i - 1], [x1, y1] = tips[i];
    s.quadraticCurveTo((x0 + x1) * 0.42, (y0 + y1) * 0.42, x1, y1);
  }
  s.lineTo(0, -depth * span * 0.35);
  s.lineTo(0, 0);
  return { geo: new THREE.ShapeGeometry(s, 12), tips };
}

function materials(style, color) {
  const c = new THREE.Color(color);
  const belly = c.clone().lerp(new THREE.Color(0xffe2b0), 0.55);
  const dark = c.clone().multiplyScalar(0.45);
  if (style === 'toon') {
    const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
    const m = (col) => new THREE.MeshToonMaterial({ color: col, gradientMap: grad });
    return { body: m(c), belly: m(belly), wing: Object.assign(m(dark.clone().lerp(c, 0.5)), { side: THREE.DoubleSide }), horn: m(0xf3e6cf), eye: new THREE.MeshBasicMaterial({ color: 0xfff27a }), gold: m(0xffcf3a) };
  }
  const flat = style === 'wyvern';
  const std = (col, extra = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.15, flatShading: flat, ...extra });
  return {
    body: std(c, { emissive: c, emissiveIntensity: 0.08 }), belly: std(belly), horn: std(0xf1e4c8, { roughness: 0.3 }),
    wing: std(dark.clone().lerp(c, 0.55), { side: THREE.DoubleSide, transparent: true, opacity: 0.92 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xfff27a }), gold: std(0xffcf3a, { metalness: 0.9, roughness: 0.2 }),
  };
}

function addOutline(group) {
  const outline = new THREE.MeshBasicMaterial({ color: 0x140a05, side: THREE.BackSide });
  const targets = [];
  group.traverse((o) => { if (o.isMesh && o.material.side !== THREE.DoubleSide) targets.push(o); });
  // Inflate each surface along its normals (works for meshes built off-center, like tubes).
  for (const o of targets) {
    const geo = o.geometry.clone();
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * 0.035, p.getY(i) + n.getY(i) * 0.035, p.getZ(i) + n.getZ(i) * 0.035);
    o.add(new THREE.Mesh(geo, outline));
  }
}

function cone(r, h, mat, seg = 6) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); }

function headGroup(M, stage, seg) {
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, seg, seg), M.body); skull.scale.set(1, 0.8, 1.25);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.55, seg), M.body); snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.04, 0.42);
  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.5, seg), M.belly); jaw.rotation.x = Math.PI / 2 - 0.18; jaw.position.set(0, -0.15, 0.36);
  head.add(skull, snout, jaw);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M.eye); eye.position.set(0.19 * sx, 0.08, 0.2); head.add(eye);
    const nh = 1 + Math.min(stage, 3); // horns grow with stage
    for (let k = 0; k < Math.min(stage, 3); k++) {
      const h = cone(0.06 - k * 0.01, 0.35 + stage * 0.1 - k * 0.08, M.horn);
      h.position.set(0.18 * sx, 0.2 - k * 0.04, -0.15 - k * 0.12); h.rotation.set(-1.1 - k * 0.15, 0, -0.35 * sx);
      head.add(h);
    }
    void nh;
  }
  if (stage >= 4) {
    for (let k = 0; k < 7; k++) { const sp = cone(0.04, 0.3, M.gold); const a = (k / 6 - 0.5) * 2.2; sp.position.set(Math.sin(a) * 0.3, 0.3, -0.05 - Math.cos(a) * 0.1); sp.rotation.z = -a * 0.4; head.add(sp); }
  }
  return head;
}

export function buildDragonModel(style, color, stage) {
  const M = materials(style, color);
  const g = new THREE.Group();
  const seg = style === 'wyvern' ? 7 : 18;
  const size = 0.8 + stage * 0.18;

  if (style === 'serpente') {
    // Long sinuous body coiling forward.
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(Math.sin(t * Math.PI * 2.2) * 0.9, 0.9 + Math.sin(t * Math.PI * 3) * 0.35, 2.2 - t * 4.4)); }
    const curve = new THREE.CatmullRomCurve3(pts.reverse());
    const body = new THREE.Mesh(taperTube(curve, (t) => 0.06 + 0.24 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.6, 80, 14), M.body);
    g.add(body);
    const n = 6 + stage * 4;
    for (let i = 1; i < n; i++) { // dorsal mane / fins
      const t = i / n, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
      const fin = cone(0.07, 0.25 + stage * 0.05, i % 2 ? M.horn : M.wing, 4); fin.position.copy(p).add(new THREE.Vector3(0, 0.22, 0)); fin.lookAt(p.clone().add(tan)); fin.rotateX(-0.6); g.add(fin);
    }
    for (const t of [0.22, 0.6]) for (const sx of [-1, 1]) { // little legs
      const p = curve.getPointAt(t); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.45, 6), M.body); leg.position.copy(p).add(new THREE.Vector3(0.22 * sx, -0.2, 0)); leg.rotation.z = 0.5 * sx; g.add(leg);
    }
    const head = headGroup(M, stage, seg); const hp = curve.getPointAt(1); head.position.copy(hp).add(new THREE.Vector3(0, 0.1, 0.15)); head.scale.setScalar(1.35); g.add(head);
    for (const sx of [-1, 1]) { // whiskers
      const wc = new THREE.CatmullRomCurve3([new THREE.Vector3(0.12 * sx, -0.05, 0.6), new THREE.Vector3(0.5 * sx, -0.1, 0.5), new THREE.Vector3(0.8 * sx, -0.35, 0.2)]);
      const w = new THREE.Mesh(taperTube(wc, (t) => 0.025 * (1 - t) + 0.005, 16, 5), M.horn); w.position.copy(head.position); g.add(w);
    }
    if (stage >= 3) for (const sx of [-1, 1]) { const { geo } = wingGeometry(0.9 + stage * 0.15, 0.6, 3); const w = new THREE.Mesh(geo, M.wing); w.position.copy(curve.getPointAt(0.55)).add(new THREE.Vector3(0.15 * sx, 0.2, 0)); w.rotation.set(-Math.PI / 2 + 0.3, 0, sx > 0 ? 0 : Math.PI); w.scale.x = sx; g.add(w); }
  } else {
    // Wyvern / toon: torso, curved neck, head, tail, membrane wings, legs.
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.55, seg, seg), M.body); torso.scale.set(0.95, 0.78, 1.45); torso.position.y = 1.0; g.add(torso);
    const bellyM = new THREE.Mesh(new THREE.SphereGeometry(0.5, seg, seg), M.belly); bellyM.scale.set(0.8, 0.6, 1.3); bellyM.position.set(0, 0.88, 0.05); g.add(bellyM);
    const neckC = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.1, 0.55), new THREE.Vector3(0, 1.55, 0.85), new THREE.Vector3(0, 1.85, 1.25)]);
    g.add(new THREE.Mesh(taperTube(neckC, (t) => 0.3 - t * 0.12, 20, seg), M.body));
    const head = headGroup(M, stage, seg); head.position.set(0, 1.92, 1.42); head.rotation.x = 0.25; head.scale.setScalar(1.3); g.add(head);
    const tailC = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.95, -0.7), new THREE.Vector3(0.25, 0.75, -1.5), new THREE.Vector3(-0.2, 0.55, -2.3), new THREE.Vector3(0.15, 0.6, -3.0)]);
    g.add(new THREE.Mesh(taperTube(tailC, (t) => 0.3 * (1 - t) + 0.03, 40, seg), M.body));
    const spade = cone(0.22, 0.45, M.body, 4); spade.position.set(0.15, 0.6, -3.15); spade.rotation.x = -Math.PI / 2; spade.scale.set(1, 1, 0.3); g.add(spade);
    const nSp = 4 + stage * 3; // spines along neck, back, tail
    for (let i = 0; i < nSp; i++) {
      const t = i / (nSp - 1);
      const p = t < 0.3 ? neckC.getPointAt(1 - t / 0.3) : tailC.getPointAt((t - 0.3) / 0.7);
      const sp = cone(0.05 + 0.02 * stage * (1 - t), 0.18 + 0.06 * stage * (1 - t), stage >= 4 ? M.gold : M.horn, 4);
      sp.position.copy(p).add(new THREE.Vector3(0, 0.22 * (1 - t) + 0.08, 0)); sp.rotation.x = -0.5; g.add(sp);
    }
    for (const sx of [-1, 1]) {
      const { geo, tips } = wingGeometry(1.4 + stage * 0.35, 0.75, 3 + Math.min(stage, 2));
      const wing = new THREE.Group();
      const mem = new THREE.Mesh(geo, M.wing); wing.add(mem);
      for (const [x, y] of tips) { // finger bones
        const len = Math.hypot(x, y); const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, len, 5), M.body);
        bone.position.set(x / 2, y / 2, 0.01); bone.rotation.z = Math.atan2(y, x) - Math.PI / 2; wing.add(bone);
      }
      wing.position.set(0.35 * sx, 1.35, 0.35); wing.rotation.set(-Math.PI / 2 + 0.35, 0, 0); wing.rotation.z = sx > 0 ? -0.25 : Math.PI + 0.25; wing.scale.y = sx > 0 ? 1 : -1;
      g.add(wing);
      for (const z of [0.45, -0.45]) { // legs with claws
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.45, seg), M.body); leg.position.set(0.4 * sx, 0.5, z); leg.rotation.z = 0.25 * sx; g.add(leg);
        for (let k = -1; k <= 1; k++) { const cl = cone(0.03, 0.12, M.horn, 4); cl.position.set(0.47 * sx + k * 0.05, 0.27, z + 0.1); cl.rotation.x = Math.PI / 2; g.add(cl); }
      }
    }
  }
  if (style === 'toon') addOutline(g);
  g.scale.setScalar(size * 0.55);
  return g;
}
