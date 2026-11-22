// Ataque visual por elemento (só dragões): cada elemento atira um projétil próprio com rastro
// (ideia 1 escolhida pelo dono em 22/11; as ideias "feixes" e "sopro" ficam no histórico do git, commit 9b5d2cb).
// Escamas continuam com o tiro simples. Tudo usa o conjunto fixo de partículas do Renderer e algumas malhas reaproveitadas (sem geometria nova por tiro).
import * as THREE from 'three';
import { TOWERS, CELL } from './data/towers.js';
import { bookLines } from './book.js';

const U = (v) => v / CELL;

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
      if (p.def.base) {
        // Escamas: o tiro de sempre (bolinha na cor da escama). Só os dragões ganham ataque por elemento.
        const o = this.orb(used++), en0 = game.enemies.get(p.target);
        o.shard.visible = false; o.orb.visible = true;
        o.orb.position.set(U(p.x), en0 && en0.type.air ? 2.6 : 1.3, U(p.y));
        o.orb.scale.setScalar(0.16);
        o.mat.color.setHex(p.def.color).multiplyScalar(1.6); o.mat.opacity = 1;
        continue;
      }
      const el = ELEMENT_LOOK[elementOf(p.def)];
      const en = game.enemies.get(p.target);
      const y = en && en.type.air ? 2.6 : 1.3;
      const x = U(p.x), z = U(p.y);
      const dx = (en ? U(en.x) : x) - x, dz = (en ? U(en.y) : z) - z, len = Math.hypot(dx, dz) || 1;
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
    }
    for (let i = used; i < this.pool.length; i++) { this.pool[i].orb.visible = false; this.pool[i].shard.visible = false; }
    this.updateParticles(dt);
  }

  // Impacto no inimigo, com a cara do elemento.
  hit(f) {
    if (!f.def || f.def.base) { this.view.burst(U(f.x), f.air ? 2.6 : 1.1, U(f.y), f.color, f.crit ? 18 : 5, f.crit ? 5 : 2.5, 0.3); return; }
    const el = ELEMENT_LOOK[elementOf(f.def)];
    const x = U(f.x), z = U(f.y), y = f.air ? 2.6 : 1.1;
    const n = f.crit ? 40 : 22;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = (el.spark ? 5 : 2.5) * (0.4 + Math.random());
      this.emit(x, y, z, el.trail[k % el.trail.length], Math.cos(a) * s, el.rise + Math.random() * 2, Math.sin(a) * s, el.spark ? 0.2 : 0.4);
    }
  }
}
