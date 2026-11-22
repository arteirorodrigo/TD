// "Selvagem" dragon: fierce version of the owner's reference. Angular head with open jaw and teeth, glowing slit
// eyes under heavy brows, frill of spikes, many horns, big jagged dark spines, torn wings with claws, dark back.
// pose: 'agachado' (prowling, head low), 'rugindo' (rearing up, roaring), 'blindado' (heavy armored brute).
// stage 1..4 grows size, horns, spines, wings; stage 4 adds gold crown and gilded spines. Head faces +z.
import * as THREE from 'three';
import { taperTube, V, curve, along, backDir } from './dragao-classico.js';

function mats(color, stage) {
  const c = new THREE.Color(color);
  const std = (col, extra = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.1, ...extra });
  return {
    body: std(c.clone().multiplyScalar(0.82), { emissive: c, emissiveIntensity: 0.05 }),
    back: std(c.clone().multiplyScalar(0.38), { roughness: 0.42 }),
    belly: std(new THREE.Color(0xe9cf9f).lerp(c, 0.12), { roughness: 0.62 }),
    bone: std(0xe6d6b4, { roughness: 0.35 }),
    tooth: std(0xfff6e4, { roughness: 0.25 }),
    claw: std(0x1c1410, { roughness: 0.3, metalness: 0.3 }),
    mouth: std(0x3a0806, { roughness: 0.8 }),
    wing: std(c.clone().multiplyScalar(0.55).lerp(new THREE.Color(0x2a0a06), 0.2), { side: THREE.DoubleSide, roughness: 0.7, transparent: true, opacity: 0.96 }),
    eye: new THREE.MeshBasicMaterial({ color: 0xffd23a }),
    gold: std(0xffcf3a, { metalness: 0.9, roughness: 0.22 }),
    spine: stage >= 4 ? std(0xc99a2a, { metalness: 0.7, roughness: 0.3 }) : std(c.clone().multiplyScalar(0.3), { roughness: 0.4 }),
  };
}

const POSES = {
  agachado: {
    torso: [[0, 1.0, -0.85], [0, 1.05, -0.2], [0, 1.0, 0.4]], torsoR: 0.55,
    neck: [[0, 1.0, 0.4], [0, 1.18, 0.85], [0, 1.15, 1.3], [0, 1.0, 1.65]], neckR: 0.36,
    head: { pos: [0, 0.98, 1.78], rotX: -0.05, jaw: 0.5 },
    tail: [[0, 1.0, -1.2], [0.25, 1.35, -1.9], [-0.35, 1.25, -2.6], [-0.55, 0.8, -3.3], [-0.2, 0.55, -3.9]],
    shoulder: [0.42, 1.0, 0.35], elbow: [0.7, 0.55, 0.55], paw: [0.62, 0.1, 0.95],
    haunch: [0.48, 1.0, -0.75], foot: [0.6, 0.1, -0.35],
    wing: { pos: [0.32, 1.3, 0.15], rot: [0.35, -0.55, -0.55] },
  },
  rugindo: {
    torso: [[0, 0.95, -0.55], [0, 1.4, -0.15], [0, 1.95, 0.25]], torsoR: 0.55,
    neck: [[0, 1.95, 0.25], [0, 2.45, 0.05], [0, 2.95, 0.15], [0, 3.35, 0.5]], neckR: 0.36,
    head: { pos: [0, 3.5, 0.68], rotX: -0.55, jaw: 0.85 },
    tail: [[0, 0.9, -0.75], [0.4, 0.35, -1.55], [1.3, 0.14, -1.7], [2.0, 0.2, -0.8], [2.1, 0.55, 0.3]],
    shoulder: [0.38, 1.75, 0.5], elbow: [0.55, 1.15, 0.85], paw: [0.45, 0.1, 1.0],
    haunch: [0.46, 0.8, -0.3], foot: [0.58, 0.1, 0.35],
    wing: { pos: [0.32, 2.15, 0.0], rot: [-0.25, -0.2, 0.35] },
  },
  blindado: {
    torso: [[0, 1.15, -0.9], [0, 1.25, -0.2], [0, 1.15, 0.45]], torsoR: 0.75,
    neck: [[0, 1.15, 0.45], [0, 1.3, 0.85], [0, 1.2, 1.2]], neckR: 0.48,
    head: { pos: [0, 1.15, 1.42], rotX: 0.05, jaw: 0.35, bull: true },
    tail: [[0, 1.1, -1.3], [0.3, 0.9, -2.0], [-0.2, 0.6, -2.6], [-0.1, 0.4, -3.1]],
    shoulder: [0.55, 1.1, 0.4], elbow: [0.85, 0.6, 0.55], paw: [0.75, 0.12, 0.85],
    haunch: [0.6, 1.1, -0.8], foot: [0.72, 0.12, -0.45],
    wing: { pos: [0.4, 1.55, 0.05], rot: [0.2, -0.75, -0.2], small: true },
  },
};

function fierceHead(M, stage, P) {
  const h = new THREE.Group();
  const m = (geo, mat, [x, y, z], rot = [0, 0, 0], sc = [1, 1, 1]) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(...rot); o.scale.set(...sc); h.add(o); return o; };
  const flat = (mat) => Object.assign(mat.clone(), { flatShading: true });
  const skinF = flat(M.body), backF = flat(M.back);
  // Wedge skull and long angular snout (upper jaw).
  m(new THREE.SphereGeometry(0.3, 8, 6), skinF, [0, 0.06, -0.02], [0, 0, 0], [1.05, 0.8, 1.2]);
  m(new THREE.ConeGeometry(0.22, 0.85, 6), skinF, [0, 0.02, 0.5], [Math.PI / 2, 0, 0], [1, 1, 0.62]);
  // Lower jaw hinged open.
  const jaw = new THREE.Group(); jaw.position.set(0, -0.08, 0.05); jaw.rotation.x = P.head.jaw; h.add(jaw);
  const jm = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.75, 6), flat(M.belly)); jm.rotation.x = Math.PI / 2; jm.position.set(0, -0.05, 0.4); jm.scale.set(1, 1, 0.5); jaw.add(jm);
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 6), M.mouth); inner.rotation.x = Math.PI / 2; inner.position.set(0, 0.0, 0.38); inner.scale.set(0.9, 1, 0.3); jaw.add(inner);
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 6; k++) { // teeth: upper row down, lower row up
      const z = 0.18 + k * 0.1, w = 0.16 - k * 0.018;
      m(new THREE.ConeGeometry(0.022, 0.12 - k * 0.008, 5), M.tooth, [w * sx, -0.1, z], [Math.PI, 0, 0]);
      const lt = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1 - k * 0.008, 5), M.tooth); lt.position.set(w * 0.9 * sx, 0.04, z + 0.02); jaw.add(lt);
    }
    // Glowing slit eyes under a heavy brow ridge.
    m(new THREE.SphereGeometry(0.05, 10, 8), M.eye, [0.18 * sx, 0.11, 0.2], [0, 0.4 * sx, 0], [1.3, 0.45, 1]);
    m(new THREE.BoxGeometry(0.14, 0.07, 0.3), backF, [0.17 * sx, 0.19, 0.16], [0.35, 0, -0.45 * sx]);
    m(new THREE.ConeGeometry(0.04, 0.22, 4), M.back, [0.2 * sx, 0.24, 0.05], [-1.2, 0, -0.5 * sx]);
    // Main horns: swept back and up (or forward, bull-like for the armored brute).
    const L = 0.85 + stage * 0.25;
    const hc = P.head.bull
      ? curve([0.2 * sx, 0.22, -0.05], [0.5 * sx, 0.35, -0.1], [0.7 * sx, 0.5, 0.15 * L], [0.65 * sx, 0.7, 0.45 * L])
      : curve([0.13 * sx, 0.22, -0.08], [0.25 * sx, 0.5, -0.3 * L], [0.36 * sx, 0.62, -0.7 * L], [0.3 * sx, 0.85, -1.0 * L]);
    h.add(new THREE.Mesh(taperTube(hc, (t) => 0.1 * (1 - t) + 0.008, 24, 10), M.bone));
    const hc2 = curve([0.24 * sx, 0.02, -0.12], [0.42 * sx, 0.0, -0.35], [0.55 * sx, 0.12, -0.55 - stage * 0.06]); // lower horn
    h.add(new THREE.Mesh(taperTube(hc2, (t) => 0.06 * (1 - t) + 0.006, 16, 8), M.bone));
    for (let k = 0; k < 2 + stage; k++) { // jaw/cheek spikes
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16 + k * 0.02, 4), M.back); sp.position.set(0.16 * sx, -0.08, 0.32 - k * 0.12); sp.rotation.set(-2.2, 0, 1.0 * sx); jaw.add(sp);
    }
  }
  // Frill of spikes fanning behind the skull.
  const nF = 5 + stage * 2;
  for (let k = 0; k < nF; k++) {
    const a = (k / (nF - 1) - 0.5) * 2.6;
    m(new THREE.ConeGeometry(0.04, 0.3 + 0.08 * stage * Math.cos(a * 0.6), 4), stage >= 4 ? M.gold : M.spine, [Math.sin(a) * 0.32, 0.18 + Math.cos(a) * 0.12, -0.3], [-1.9 + Math.cos(a) * 0.3, 0, -a * 0.6]);
  }
  if (stage >= 4) for (let k = 0; k < 5; k++) { const a = (k / 4 - 0.5) * 1.6; m(new THREE.ConeGeometry(0.035, 0.3, 6), M.gold, [Math.sin(a) * 0.2, 0.34, -0.02], [0, 0, -a * 0.5]); }
  return h;
}

function tornWing(M, span, sx, stage) {
  const g = new THREE.Group();
  const wrist = V(0.55 * span, 0.5 * span, -0.2 * span);
  const fingers = [V(0.8 * span, 1.25 * span, -0.25 * span), V(1.25 * span, 0.95 * span, -0.6 * span), V(1.35 * span, 0.4 * span, -0.9 * span), V(1.0 * span, -0.15 * span, -1.0 * span)];
  const bone = (a, b, r0, r1) => g.add(new THREE.Mesh(taperTube(new THREE.LineCurve3(a, b), (t) => r0 + (r1 - r0) * t, 4, 6), M.back));
  bone(V(0, 0, 0), wrist, 0.12, 0.07);
  for (const f of fingers) {
    bone(wrist, f, 0.05, 0.012);
    const cl = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 5), M.claw); cl.position.copy(f); cl.quaternion.setFromUnitVectors(V(0, 1, 0), f.clone().sub(wrist).normalize()); g.add(cl);
  }
  const wc = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), M.claw); wc.position.copy(wrist).add(V(0, 0.15, 0.05)); g.add(wc);
  const tail = V(0.1 * span, -0.3 * span, -0.6 * span);
  const pos = [];
  const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  tri(V(0, 0, 0), wrist, fingers[0]);
  for (let i = 0; i < fingers.length - 1; i++) {
    const a = fingers[i], b = fingers[i + 1];
    // Jagged, torn trailing edge: deep scallop with a notch.
    const m1 = a.clone().lerp(b, 0.33).lerp(wrist, 0.3 + (i % 2) * 0.12);
    const m2 = a.clone().lerp(b, 0.55).lerp(wrist, 0.12);
    const m3 = a.clone().lerp(b, 0.75).lerp(wrist, 0.34 - (stage % 2) * 0.08);
    tri(wrist, a, m1); tri(wrist, m1, m2); tri(wrist, m2, m3); tri(wrist, m3, b);
  }
  tri(wrist, fingers[fingers.length - 1], tail); tri(V(0, 0, 0), wrist, tail);
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); mg.computeVertexNormals();
  g.add(new THREE.Mesh(mg, M.wing));
  g.scale.x = sx;
  return g;
}

export function buildWildDragon(color, stage = 1, pose = 'agachado') {
  const P = POSES[pose];
  const M = mats(color, stage);
  const g = new THREE.Group();
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };
  const R = P.torsoR;

  const torso = curve(...P.torso);
  add(taperTube(torso, (t) => R + 0.12 * Math.sin(Math.PI * t), 24, 16), M.body);
  const neck = curve(...P.neck);
  add(taperTube(neck, (t) => P.neckR - 0.14 * t, 30, 14), M.body);
  const chest = add(new THREE.SphereGeometry(R * 1.05, 24, 18), M.body); chest.position.set(...P.torso[2]);

  // Belly: smooth cream band hugging the underside of neck and torso.
  for (const [cv, r0, r1] of [[neck, P.neckR, P.neckR - 0.14], [torso, R + 0.05, R + 0.05]]) {
    for (const { p, tan, t } of along(cv, 12)) {
      const d = backDir(tan, true).negate();
      const r = r0 + (r1 - r0) * t;
      const plate = add(new THREE.SphereGeometry(1, 14, 8), M.belly);
      plate.scale.set(r * 0.75, 0.06, r * 0.55);
      plate.position.copy(p).addScaledVector(d, r * 0.82);
      plate.quaternion.setFromUnitVectors(V(0, 1, 0), d);
    }
  }

  const head = fierceHead(M, stage, P); head.position.set(...P.head.pos); head.rotation.x = P.head.rotX; head.scale.setScalar(1.45); g.add(head);

  const tail = curve(...P.tail);
  add(taperTube(tail, (t) => (R * 0.75) * (1 - t) ** 1.1 + 0.025, 60, 12), M.body);
  const tip = add(new THREE.ConeGeometry(0.22, 0.55, 4), M.back); tip.position.copy(tail.getPointAt(1)); tip.quaternion.setFromUnitVectors(V(0, 1, 0), tail.getTangentAt(1)); tip.scale.z = 0.25;

  // Big jagged dark spines (alternating sizes) along neck, back and tail.
  const spineOn = (cv, n, size, rad) => {
    for (const [i, { p, tan, t }] of along(cv, n, 0.04, 0.96).entries()) {
      const d = backDir(tan, true);
      const hgt = size * (i % 2 ? 0.6 : 1) * (0.55 + 0.45 * Math.sin(Math.PI * t + 0.25));
      const sp = add(new THREE.ConeGeometry(hgt * 0.28, hgt, 4), M.spine);
      sp.position.copy(p).addScaledVector(d, rad(t) * 0.8 + hgt * 0.4);
      sp.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().lerp(tan.clone().negate(), 0.45).normalize());
    }
  };
  const nS = 7 + stage * 3;
  spineOn(neck, Math.round(nS * 0.45), 0.34 + stage * 0.05, (t) => P.neckR - 0.14 * t);
  spineOn(torso, Math.round(nS * 0.35), 0.45 + stage * 0.06, () => R + 0.08);
  spineOn(tail, nS, 0.36 + stage * 0.04, (t) => (R * 0.75) * (1 - t) ** 1.1);
  if (pose === 'blindado') { // armor plates on the back
    for (const { p, tan } of along(torso, 5, 0.05, 0.95)) {
      const d = backDir(tan, true);
      const pl = add(new THREE.BoxGeometry(0.85, 0.08, 0.38), Object.assign(M.back.clone(), { flatShading: true }));
      pl.position.copy(p).addScaledVector(d, R + 0.08); pl.quaternion.setFromUnitVectors(V(0, 1, 0), d); pl.rotateX(-0.25);
    }
  }

  // Legs: thick, with dark claws.
  const legR = R * 0.38;
  for (const sx of [-1, 1]) {
    const S = (a) => V(a[0] * sx, a[1], a[2]);
    const haunch = add(new THREE.SphereGeometry(R, 20, 16), M.body); haunch.position.copy(S(P.haunch)); haunch.scale.set(0.8, 1.0, 1.15);
    add(taperTube(new THREE.CatmullRomCurve3([S(P.haunch), S([P.foot[0], (P.haunch[1] + P.foot[1]) / 2, P.haunch[2] + 0.1]), S(P.foot)]), (t) => legR * 1.2 - 0.08 * t, 12, 12), M.body);
    add(taperTube(new THREE.CatmullRomCurve3([S(P.shoulder), S(P.elbow), S(P.paw)]), (t) => legR * 1.1 - 0.07 * t, 16, 12), M.body);
    for (const fp of [P.foot, P.paw]) {
      const f = add(new THREE.SphereGeometry(legR * 0.95, 12, 10), M.body); f.position.copy(S(fp)); f.scale.set(1, 0.55, 1.5);
      for (let k = -1; k <= 1; k++) { const cl = add(new THREE.ConeGeometry(0.045, 0.24, 6), M.claw); cl.position.copy(S(fp)).add(V(k * 0.09, 0.0, legR * 1.3)); cl.rotation.x = Math.PI / 2 + 0.5; }
    }
    const span = (P.wing.small ? 0.9 : 1.3) + stage * 0.32;
    const w = tornWing(M, span, sx, stage);
    w.position.copy(S(P.wing.pos)); w.rotation.set(P.wing.rot[0], P.wing.rot[1] * sx, P.wing.rot[2] * sx);
    g.add(w);
  }

  g.scale.setScalar(0.42 + stage * 0.06);
  return g;
}
