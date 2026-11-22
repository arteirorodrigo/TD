// Hybrid dragon: the sculpted body (by the owner's friend) with procedural wings that flap.
// prepareDragonGeometry: feet at y = 0, centered, head toward +z, height 1.
// wingMask: per-vertex 0..1, how much a vertex belongs to the sculpted (folded) wings, to be removed.
import * as THREE from 'three';

export function prepareDragonGeometry(source) {
  const geo = source.clone();
  geo.computeBoundingBox();
  let b = geo.boundingBox;
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  // Facing: from the body's center toward the center of the head (vertices in the top 15% of the height).
  const pos = geo.attributes.position;
  const h0 = b.max.y - b.min.y;
  let hx = 0, hz = 0, hn = 0, cx = 0, cz = 0;
  for (let i = 0; i < pos.count; i++) {
    cx += pos.getX(i); cz += pos.getZ(i);
    if (pos.getY(i) > h0 * 0.85) { hx += pos.getX(i); hz += pos.getZ(i); hn++; }
  }
  cx /= pos.count; cz /= pos.count; hx /= hn; hz /= hn;
  geo.rotateY(-Math.atan2(hx - cx, hz - cz));
  geo.computeBoundingBox(); b = geo.boundingBox;
  const h = b.max.y - b.min.y; geo.scale(1 / h, 1 / h, 1 / h);
  geo.computeVertexNormals();
  return geo;
}

export const WING = { maxZ: 0.16, minY: 0.5, spine: 0.035, tipZ: -0.12, tipY: 0.2, tipX: 0.11 };

// Folded wings sit on the back: above the shoulders and behind the neck, off the center spine ridge;
// their lower tips hang beside the hips.
export function wingMask(geo, p = WING) {
  const pos = geo.attributes.position, out = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = Math.abs(pos.getX(i)), y = pos.getY(i), z = pos.getZ(i);
    const upper = z < p.maxZ && y > p.minY && x > p.spine;
    const tips = z < p.tipZ && y > p.tipY && x > p.tipX;
    out[i] = upper || tips ? 1 : 0;
  }
  return out;
}

// Body without the sculpted wings: drops every triangle with at least 2 wing vertices.
export function stripWings(geo, mask = wingMask(geo)) {
  const idx = geo.index.array, keep = [];
  for (let t = 0; t < idx.length; t += 3) {
    const m = mask[idx[t]] + mask[idx[t + 1]] + mask[idx[t + 2]];
    if (m < 2) keep.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  // Leftover wing claws end up as loose islands: keep only pieces connected to the main body.
  const nV = geo.attributes.position.count, parent = new Int32Array(nV).map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (let t = 0; t < keep.length; t += 3) { const a = find(keep[t]); parent[find(keep[t + 1])] = a; parent[find(keep[t + 2])] = a; }
  const size = new Map();
  for (let t = 0; t < keep.length; t += 3) { const r = find(keep[t]); size.set(r, (size.get(r) || 0) + 1); }
  const biggest = Math.max(...size.values());
  const final = [];
  for (let t = 0; t < keep.length; t += 3) if (size.get(find(keep[t])) > biggest * 0.02) final.push(keep[t], keep[t + 1], keep[t + 2]);
  const out = geo.clone();
  out.setIndex(final);
  return out;
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Bat wing, built pointing outward (+x), swept back (-z) and up (+y); pivot sits at the shoulder.
// Flapping = rotating the pivot around z. Sizes are for a body 1 unit tall.
export function wingGeometry(span = 1) {
  const wrist = V(0.32, 0.22, -0.06).multiplyScalar(span);
  const tips = [V(0.42, 0.55, -0.22), V(0.72, 0.36, -0.38), V(0.74, 0.08, -0.5), V(0.5, -0.1, -0.52)].map((v) => v.multiplyScalar(span));
  const tail = V(0.06, -0.06, -0.36).multiplyScalar(span);
  const pos = [];
  const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const root = V(0, 0, 0);
  tri(root, wrist, tips[0]);
  for (let i = 0; i < tips.length - 1; i++) {
    const a = tips[i], b = tips[i + 1];
    const mid = a.clone().lerp(b, 0.5).lerp(wrist, 0.22); // scalloped trailing edge
    tri(wrist, a, mid); tri(wrist, mid, b);
  }
  tri(wrist, tips[tips.length - 1], tail); tri(root, wrist, tail);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  // Bones as thin tubes over the membrane.
  const bones = [[root, wrist, 0.022], ...tips.map((t) => [wrist, t, 0.011])].map(([a, b, r]) => {
    const tube = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, r, 5, false);
    return tube;
  });
  return { membrane: g, bones };
}

// Assemble a hybrid dragon (body 1 unit tall at scale 1). Returns { group, wings: [{ pivot, sx }] }.
export function buildHybridDragon(bodyGeo, wingGeo, color, tier) {
  const c = new THREE.Color(color);
  const skin = new THREE.MeshStandardMaterial({ color: c, roughness: 0.42, metalness: tier >= 4 ? 0.55 : 0.22, emissive: c, emissiveIntensity: tier >= 4 ? 0.14 : 0.06 });
  const membrane = new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.7), roughness: 0.6, side: THREE.DoubleSide, emissive: c, emissiveIntensity: 0.05 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(bodyGeo, skin); body.castShadow = true; group.add(body);
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0.085 * sx, 0.62, 0.08);
    const inner = new THREE.Group(); inner.scale.x = sx; // mirror for the left wing
    inner.add(new THREE.Mesh(wingGeo.membrane, membrane));
    for (const b of wingGeo.bones) inner.add(new THREE.Mesh(b, skin));
    pivot.add(inner); group.add(pivot);
    wings.push({ pivot, sx });
  }
  return { group, wings };
}
