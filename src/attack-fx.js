// Ataque visual por elemento — PROTÓTIPO das 3 ideias para o dono escolher.
// Escolha pela URL: ?ataque=1 (projéteis), ?ataque=2 (feixes), ?ataque=3 (sopro). Sem nada = visual atual.
// Tudo usa o conjunto fixo de partículas do Renderer e algumas malhas reaproveitadas (sem geometria nova por tiro).
import * as THREE from 'three';
import { TOWERS, CELL } from './data/towers.js';
import { bookLines } from './book.js';

const U = (v) => v / CELL;

export const ATTACK_STYLE = (() => {
  try { return +(new URLSearchParams(location.search).get('ataque') || 0); } catch { return 0; }
})();

// Cores e comportamento de cada elemento: núcleo, rastro, gravidade do rastro (+ sobe, − cai).
export const ELEMENT_LOOK = {
  R: { core: 0xffa030, trail: [0xff5a10, 0xffc040], rise: 2.5, size: 0.28, name: 'Fogo' },
  B: { core: 0xe8f8ff, trail: [0x7ad0ff, 0xffffff], rise: 0, size: 0.2, shard: true, name: 'Gelo' },
  G: { core: 0x8dff5a, trail: [0x3fe05a, 0x1f8a2a], rise: -3, size: 0.22, name: 'Veneno' },
  P: { core: 0xb070ff, trail: [0x9a4aff, 0x6a20c0], rise: 0.8, size: 0.24, name: 'Sombra' },
  Q: { core: 0xc8ffff, trail: [0x3ff0e0, 0xffffff], rise: 0, size: 0.16, spark: true, name: 'Tempestade' },
  Y: { core: 0xfff4b0, trail: [0xffc42e, 0xffffff], rise: 0.5, size: 0.22, name: 'Solar' },
  D: { core: 0xe6eef8, trail: [0x9aaac0, 0xc8d4e4], rise: 0, size: 0.14, shard: true, name: 'Aço' },
  E: { core: 0xffd0f2, trail: [0xff9ee0, 0xffffff], rise: 0.6, size: 0.26, bubble: true, name: 'Etérea' },
};

// Elemento de qualquer escama ou dragão (dragões: a linha de evolução do Livro; secretos: o elemento mais usado na receita).
let elementCache = null;
export function elementOf(def) {
  if (!def) return 'D';
  if (def.base) return def.type;
  if (!elementCache) {
    elementCache = new Map();
    for (const l of bookLines()) for (const tier of l.tiers) for (const id of tier) elementCache.set(id, l.element);
  }
  if (!elementCache.has(def.id)) {
    const count = {};
    for (const i of def.recipe) { const t = TOWERS[i]; const e = t.base ? t.type : elementOf(t); count[e] = (count[e] || 0) + 1; }
    elementCache.set(def.id, Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]);
  }
  return elementCache.get(def.id);
}

export class AttackFx {
  constructor(view) {
    this.view = view;
    this.style = ATTACK_STYLE;
    this.tmpC = new THREE.Color();
    // Malhas reaproveitadas (um conjunto por tiro em voo; criadas uma vez, só escondidas depois).
    this.orbGeo = new THREE.SphereGeometry(1, 12, 10);
    this.shardGeo = new THREE.ConeGeometry(0.5, 2.6, 6); this.shardGeo.rotateX(Math.PI / 2);
    view.sharedGeos.add(this.orbGeo); view.sharedGeos.add(this.shardGeo);
    this.pool = [];
    // Partículas próprias: maiores e sem somar luz (a cor do elemento aparece em vez de virar branco).
    const N = 2500, geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3).fill(-100), col = new Float32Array(N * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.8, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false;
    view.scene.add(pts);
    this.P = { N, geo, pos, col, data: Array.from({ length: N }, () => ({ life: 0 })), next: 0 };
    // Feixes: um conjunto fixo de linhas reaproveitadas.
    this.beams = [];
    this.lastShot = new Map(); // projétil -> já teve o feixe desenhado
  }

  orb(i) {
    while (this.pool.length <= i) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false });
      const orb = new THREE.Mesh(this.orbGeo, mat), shard = new THREE.Mesh(this.shardGeo, mat);
      this.view.scene.add(orb, shard);
      this.pool.push({ orb, shard, mat });
    }
    return this.pool[i];
  }

  emit(x, y, z, color, vx, vy, vz, life) {
    const P = this.P, p = P.data[P.next]; P.next = (P.next + 1) % P.N;
    const c = this.tmpC.setHex(color);
    Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, r: c.r * 0.55, g: c.g * 0.55, b: c.b * 0.55 });
  }

  updateParticles(dt) {
    const P = this.P;
    for (let i = 0; i < P.N; i++) {
      const p = P.data[i];
      if (p.life <= 0) { P.pos[i * 3 + 1] = -100; continue; }
      p.life -= dt;
      p.x += p.vx * dt; p.y = Math.max(0.05, p.y + p.vy * dt); p.z += p.vz * dt;
      p.vx *= 0.96; p.vz *= 0.96;
      const k = Math.max(0, p.life / p.max);
      P.pos[i * 3] = p.x; P.pos[i * 3 + 1] = p.y; P.pos[i * 3 + 2] = p.z;
      P.col[i * 3] = p.r * k; P.col[i * 3 + 1] = p.g * k; P.col[i * 3 + 2] = p.b * k;
    }
    P.geo.attributes.position.needsUpdate = true;
    P.geo.attributes.color.needsUpdate = true;
  }

  // Chamado a cada quadro no lugar do desenho antigo dos tiros.
  update(dt) {
    const game = this.view.game, ps = game.projectiles;
    let used = 0;
    for (const p of ps) {
      const el = ELEMENT_LOOK[elementOf(p.def)];
      const en = game.enemies.get(p.target);
      const y = en && en.type.air ? 2.6 : 1.3;
      const x = U(p.x), z = U(p.y);
      const tw = game.entities.get(p.tower);
      const tx = tw ? tw.x + 1 : x, tz = tw ? tw.y + 1 : z;
      const dx = (en ? U(en.x) : x) - x, dz = (en ? U(en.y) : z) - z, len = Math.hypot(dx, dz) || 1;
      if (this.style === 1) {
        const o = this.orb(used++);
        const shard = !!el.shard;
        o.orb.visible = !shard; o.shard.visible = shard;
        const m = shard ? o.shard : o.orb;
        m.position.set(x, y, z);
        m.scale.setScalar((shard ? el.size * 1.1 : el.size * (el.bubble ? 1.2 : 1)) * 1.8);
        if (shard) m.lookAt(x + dx, y, z + dz);
        o.mat.color.setHex(el.core);
        o.mat.opacity = el.bubble ? 0.55 : 1;
        // Rastro
        const n = el.spark ? 6 : 5;
        for (let k = 0; k < n; k++) {
          const j = () => (Math.random() - 0.5) * (el.spark ? 1.6 : 0.5);
          this.emit(x - dx / len * 0.2, y, z - dz / len * 0.2, el.trail[k % el.trail.length], j(), el.rise + j(), j(), el.spark ? 0.2 : 0.55);
        }
      } else if (this.style === 2) {
        // Feixe: a primeira vez que um tiro aparece, uma linha do dragão até o alvo; o tiro em si fica invisível.
        if (!this.lastShot.has(p)) {
          this.lastShot.set(p, true);
          const ex = en ? U(en.x) : x, ez = en ? U(en.y) : z;
          this.beam(tx, 1.2, tz, ex, y, ez, el);
        }
      } else if (this.style === 3) {
        // Sopro: um jato de partículas sai do dragão em direção ao alvo enquanto o tiro voa.
        const ex = en ? U(en.x) : x, ez = en ? U(en.y) : z;
        const bx = ex - tx, bz = ez - tz, bl = Math.hypot(bx, bz) || 1;
        const sp = Math.min(14, bl * 3);
        for (let k = 0; k < 7; k++) {
          const spread = el.spark ? 0.5 : 0.22, j = () => (Math.random() - 0.5) * spread * sp;
          const life = (bl / sp) * (0.8 + Math.random() * 0.3);
          this.emit(tx, 1.3, tz, el.trail[k % el.trail.length], bx / bl * sp + j(), (y - 1.3) / life + el.rise * 0.3, bz / bl * sp + j(), life);
        }
      }
    }
    for (let i = used; i < this.pool.length; i++) { this.pool[i].orb.visible = false; this.pool[i].shard.visible = false; }
    if (this.lastShot.size > 400) for (const k of this.lastShot.keys()) if (!ps.includes(k)) this.lastShot.delete(k);
    this.updateBeams(dt);
    this.updateParticles(dt);
  }

  beam(x1, y1, z1, x2, y2, z2, el) {
    let b = this.beams.find((q) => q.life <= 0);
    if (!b) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3 * 2), 3));
      this.view.sharedGeos.add(geo);
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
      b = { line: new THREE.LineSegments(geo, mat), geo, mat, life: 0 };
      b.line.frustumCulled = false;
      this.view.scene.add(b.line);
      this.beams.push(b);
    }
    const pos = b.geo.attributes.position.array;
    const segs = 16, wobble = el.spark ? 0.5 : el.rise > 1 ? 0.25 : el.rise < 0 ? 0.18 : 0.04;
    let px = x1, py = y1, pz = z1, i = 0;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs, end = s === segs;
      const w = end ? 0 : wobble;
      const nx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * w, ny = y1 + (y2 - y1) * t + (el.rise < 0 ? -Math.sin(t * Math.PI) * 0.3 : 0) + (Math.random() - 0.5) * w, nz = z1 + (z2 - z1) * t + (Math.random() - 0.5) * w;
      pos[i++] = px; pos[i++] = py; pos[i++] = pz; pos[i++] = nx; pos[i++] = ny; pos[i++] = nz;
      px = nx; py = ny; pz = nz;
    }
    b.geo.attributes.position.needsUpdate = true;
    b.mat.color.setHex(el.core).multiplyScalar(2);
    b.life = b.max = 0.16;
    b.line.visible = true;
    // Faíscas ao longo do feixe na cor do elemento.
    for (let k = 0; k < 6; k++) { const t = Math.random(); this.emit(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, z1 + (z2 - z1) * t, el.trail[k % 2], 0, el.rise, 0, 0.25); }
  }

  updateBeams(dt) {
    for (const b of this.beams) {
      if (b.life <= 0) continue;
      b.life -= dt;
      b.mat.opacity = Math.max(0, b.life / b.max);
      if (b.life <= 0) b.line.visible = false;
    }
  }

  // Impacto no inimigo, com a cara do elemento.
  hit(f) {
    const el = ELEMENT_LOOK[elementOf(f.def)];
    const x = U(f.x), z = U(f.y), y = f.air ? 2.6 : 1.1;
    const n = f.crit ? 40 : 22;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = (el.spark ? 5 : 2.5) * (0.4 + Math.random());
      this.emit(x, y, z, el.trail[k % el.trail.length], Math.cos(a) * s, el.rise + Math.random() * 2, Math.sin(a) * s, el.spark ? 0.2 : 0.4);
    }
  }
}
