// "Clássico" dragon (style reference sent by the owner): western dragon sitting upright, chest out, S-shaped neck,
// cream segmented belly plates, long horns swept back, big raised bat wings, spines along back and tail,
// long tail curling on the ground, strong legs with claws. stage 1..4 grows size, horns, spines and wings;
// stage 4 adds a golden crown and gilded spines. Head faces +z, up is +y.
import * as THREE from 'three';

export function taperTube(curve, r, segs = 40, radial = 14) {
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
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const curve = (...pts) => new THREE.CatmullRomCurve3(pts.map((p) => V(...p)));

function mats(color, stage) {
  const c = new THREE.Color(color);
  const std = (col, extra = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.48, metalness: 0.08, ...extra });
  return {
    body: std(c, { emissive: c, emissiveIntensity: 0.06 }),
    dark: std(c.clone().multiplyScalar(0.55)),
    belly: std(new THREE.Color(0xf2dcb4).lerp(c, 0.08), { roughness: 0.6 }),
    horn: std(0xeee0c4, { roughness: 0.35 }),
    claw: std(0xf5ecd8, { roughness: 0.3 }),
    wing: std(c.clone().lerp(new THREE.Color(0xffb27a), 0.25), { side: THREE.DoubleSide, roughness: 0.65, transparent: true, opacity: 0.95 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xffe14a }),
    gold: std(0xffcf3a, { metalness: 0.9, roughness: 0.22 }),
    spine: stage >= 4 ? std(0xffcf3a, { metalness: 0.8, roughness: 0.25 }) : std(c.clone().multiplyScalar(0.7)),
  };
}

// Points along a curve, with a direction pointing away from the belly (for spines) or toward it (for plates).
export function along(cv, n, from = 0, to = 1) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = from + (to - from) * (n === 1 ? 0.5 : i / (n - 1));
    out.push({ t, p: cv.getPointAt(t), tan: cv.getTangentAt(t) });
  }
  return out;
}
export function backDir(tan, preferUp = false) {
  const side = V(1, 0, 0);
  let d = new THREE.Vector3().crossVectors(side, tan).normalize();
  if (preferUp ? d.y < 0 : d.z > 0) d.negate();
  return d;
}

function wing(M, span, sx) {
  // Arm from shoulder to wrist, then 4 fingers fanning up/back; membrane between fingers with scalloped edge.
  const g = new THREE.Group();
  const wrist = V(0.55 * span, 0.55 * span, -0.25 * span);
  const fingers = [
    V(0.85 * span, 1.2 * span, -0.35 * span),
    V(1.2 * span, 0.9 * span, -0.7 * span),
    V(1.25 * span, 0.4 * span, -0.95 * span),
    V(0.95 * span, -0.1 * span, -1.0 * span),
  ];
  const bone = (a, b, r0, r1) => g.add(new THREE.Mesh(taperTube(new THREE.LineCurve3(a, b), (t) => r0 + (r1 - r0) * t, 4, 6), M.dark));
  bone(V(0, 0, 0), wrist, 0.11, 0.07);
  for (const f of fingers) bone(wrist, f, 0.045, 0.012);
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), M.claw); claw.position.copy(wrist).add(V(0, 0.12, 0.05)); g.add(claw);
  // Membrane: triangles wrist → finger i → scallop → finger i+1, plus body edge back to the shoulder.
  const pts = [V(0, 0, 0), ...fingers, V(0.1 * span, -0.25 * span, -0.65 * span)];
  const pos = [];
  const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  tri(V(0, 0, 0), wrist, fingers[0]);
  for (let i = 0; i < fingers.length - 1; i++) {
    const a = fingers[i], b = fingers[i + 1];
    const mid = a.clone().add(b).multiplyScalar(0.5)
      .lerp(wrist, 0.14); // scallop pulls the edge inward
    tri(wrist, a, mid); tri(wrist, mid, b);
  }
  tri(wrist, fingers[fingers.length - 1], pts[pts.length - 1]);
  tri(V(0, 0, 0), wrist, pts[pts.length - 1]);
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.computeVertexNormals();
  g.add(new THREE.Mesh(mg, M.wing));
  g.scale.x = sx;
  return g;
}

export function buildClassicDragon(color, stage = 1) {
  const M = mats(color, stage);
  const g = new THREE.Group();
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };

  // Torso (hips → chest, leaning up) and S-shaped neck.
  const torso = curve([0, 0.95, -0.55], [0, 1.35, -0.15], [0, 1.85, 0.3]);
  add(taperTube(torso, (t) => 0.5 + 0.12 * Math.sin(Math.PI * t), 24), M.body);
  const neck = curve([0, 1.85, 0.3], [0, 2.35, 0.2], [0, 2.8, 0.35], [0, 3.1, 0.7]);
  add(taperTube(neck, (t) => 0.36 - 0.16 * t, 30), M.body);
  const chest = add(new THREE.SphereGeometry(0.55, 24, 18), M.body); chest.position.set(0, 1.75, 0.35); chest.scale.set(0.95, 1.05, 0.9);

  // Belly plates: cream, overlapping, from the throat down to the hips.
  const plateCurve = curve([0, 3.02, 0.82], [0, 2.75, 0.52], [0, 2.3, 0.42], [0, 1.9, 0.78], [0, 1.45, 0.62], [0, 1.0, 0.12]);
  for (const { p, tan, t } of along(plateCurve, 22)) {
    const w = 0.17 + 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.1));
    const plate = add(new THREE.SphereGeometry(1, 18, 8), M.belly);
    plate.scale.set(w, 0.075, 0.12 + w * 0.12);
    plate.position.copy(p);
    plate.lookAt(p.clone().add(tan)); plate.rotateX(Math.PI / 2);
  }

  // Head: skull, snout, jaw, brow ridges, eyes, nostrils.
  const head = new THREE.Group(); head.position.set(0, 3.22, 0.85); head.rotation.x = 0.35; head.scale.setScalar(1.35); g.add(head);
  const hm = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); head.add(m); return m; };
  hm(new THREE.SphereGeometry(0.3, 20, 16), M.body, 0, 0.05, 0, 1, 0.85, 1.15);
  const snout = hm(new THREE.CylinderGeometry(0.14, 0.24, 0.6, 16), M.body, 0, -0.02, 0.42); snout.rotation.x = Math.PI / 2;
  const jaw = hm(new THREE.CylinderGeometry(0.1, 0.19, 0.55, 14), M.belly, 0, -0.16, 0.36); jaw.rotation.x = Math.PI / 2 - 0.12;
  for (const sx of [-1, 1]) {
    hm(new THREE.SphereGeometry(0.055, 10, 8), M.eye, 0.17 * sx, 0.1, 0.2);
    const brow = hm(new THREE.ConeGeometry(0.07, 0.3, 6), M.body, 0.16 * sx, 0.18, 0.18); brow.rotation.set(-1.4, 0, 0.2 * sx);
    const nos = hm(new THREE.SphereGeometry(0.03, 6, 5), M.dark, 0.07 * sx, 0.06, 0.7);
    void nos;
    // Main horns sweep back and slightly out; longer each stage.
    const L = 0.7 + stage * 0.22;
    const hc = curve([0.12 * sx, 0.2, -0.05], [0.24 * sx, 0.42, -0.25 * L], [0.32 * sx, 0.45, -0.6 * L], [0.28 * sx, 0.3, -0.95 * L]);
    head.add(new THREE.Mesh(taperTube(hc, (t) => 0.085 * (1 - t) + 0.01, 24, 10), M.horn));
    if (stage >= 2) { // second, smaller horn
      const hc2 = curve([0.2 * sx, 0.05, -0.1], [0.34 * sx, 0.12, -0.3], [0.42 * sx, 0.05, -0.5 - stage * 0.05]);
      head.add(new THREE.Mesh(taperTube(hc2, (t) => 0.05 * (1 - t) + 0.008, 16, 8), M.horn));
    }
    for (let k = 0; k < stage; k++) { // cheek spikes
      const sp = hm(new THREE.ConeGeometry(0.03, 0.14, 5), M.horn, 0.22 * sx, -0.12 - k * 0.04, 0.05 - k * 0.1); sp.rotation.set(-1.6, 0, 1.1 * sx);
    }
  }
  if (stage >= 4) for (let k = 0; k < 7; k++) { // crown
    const a = (k / 6 - 0.5) * 2.4;
    const sp = hm(new THREE.ConeGeometry(0.035, 0.28, 6), M.gold, Math.sin(a) * 0.26, 0.32, -0.05 - Math.cos(a) * 0.08); sp.rotation.z = -a * 0.35;
  }

  // Spines along neck, back and tail.
  const tail = curve([0, 0.9, -0.75], [0.4, 0.35, -1.55], [1.3, 0.14, -1.6], [1.95, 0.12, -0.7], [1.75, 0.1, 0.35], [1.15, 0.1, 0.95]);
  add(taperTube(tail, (t) => 0.4 * (1 - t) ** 1.1 + 0.025, 60), M.body);
  const spineN = 6 + stage * 3;
  const spineOn = (cv, n, from, to, size, up) => {
    for (const { p, tan, t } of along(cv, n, from, to)) {
      const d = backDir(tan, up);
      const r = cv === tail ? 0.4 * (1 - t) ** 1.1 + 0.025 : cv === neck ? 0.36 - 0.16 * t : 0.6;
      const h = size * (0.6 + 0.4 * Math.sin(Math.PI * t + 0.3));
      const sp = add(new THREE.ConeGeometry(h * 0.35, h, 4), M.spine);
      sp.position.copy(p).addScaledVector(d, r * 0.85 + h * 0.4);
      sp.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().lerp(tan.clone().negate(), 0.35).normalize());
    }
  };
  spineOn(neck, Math.round(spineN * 0.4), 0.05, 0.95, 0.22 + stage * 0.03, false);
  spineOn(torso, Math.round(spineN * 0.25), 0.1, 0.9, 0.3 + stage * 0.04, false);
  spineOn(tail, spineN, 0.02, 0.92, 0.26 + stage * 0.03, true);
  const tip = add(new THREE.ConeGeometry(0.16, 0.4, 4), M.spine); tip.position.copy(tail.getPointAt(1)); tip.quaternion.setFromUnitVectors(V(0, 1, 0), tail.getTangentAt(1)); tip.scale.z = 0.3;

  // Legs: haunches + hind feet; forelegs straight down in front of the chest.
  for (const sx of [-1, 1]) {
    const haunch = add(new THREE.SphereGeometry(0.5, 20, 16), M.body); haunch.position.set(0.44 * sx, 0.78, -0.3); haunch.scale.set(0.85, 1.05, 1.2);
    const shin = add(taperTube(curve([0.48 * sx, 0.6, -0.1], [0.55 * sx, 0.3, 0.1], [0.55 * sx, 0.12, 0.3]), (t) => 0.22 - 0.07 * t, 10), M.body); void shin;
    const foot = add(new THREE.SphereGeometry(0.2, 12, 10), M.body); foot.position.set(0.55 * sx, 0.1, 0.42); foot.scale.set(1, 0.55, 1.5);
    const arm = add(taperTube(curve([0.36 * sx, 1.7, 0.55], [0.42 * sx, 1.1, 0.75], [0.4 * sx, 0.55, 0.85], [0.4 * sx, 0.12, 0.95]), (t) => 0.21 - 0.07 * t, 16), M.body); void arm;
    const paw = add(new THREE.SphereGeometry(0.17, 12, 10), M.body); paw.position.set(0.4 * sx, 0.09, 1.02); paw.scale.set(1, 0.6, 1.4);
    for (const [px, pz] of [[0.55, 0.62], [0.4, 1.18]]) for (let k = -1; k <= 1; k++) {
      const cl = add(new THREE.ConeGeometry(0.035, 0.16, 6), M.claw); cl.position.set(px * sx + k * 0.07, 0.07, pz + 0.04); cl.rotation.x = Math.PI / 2 + 0.3;
    }
    // Wings from the shoulders, raised and swept back.
    const w = wing(M, 1.25 + stage * 0.3, sx);
    w.position.set(0.32 * sx, 2.05, 0.05);
    w.rotation.set(0, -0.15 * sx, 0.12 * sx);
    g.add(w);
  }

  g.scale.setScalar(0.42 + stage * 0.06);
  return g;
}
