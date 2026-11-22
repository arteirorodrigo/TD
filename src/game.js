// Core game simulation. No rendering here: the renderer reads state and drains `fx`.
import { Grid, pathLength } from './map.js';
import { TOWERS, CELL, baseTowerId, GEM_TYPES, RECIPES } from './data/towers.js';
import { waveFor, bountyFor, HP_MULT, SPEED_MULT, MAX_LEVEL } from './data/enemies.js';

export const STONES_PER_ROUND = 5;
export const START_LIVES = 10;
export const DIFFICULTIES = {
  facil: { name: 'Fácil', lives: 20 },
  medio: { name: 'Médio', lives: 10 },
  dificil: { name: 'Difícil', lives: 5 },
  sobrevivente: { name: 'Sobrevivente', lives: 1 },
};

// Chance (%) of each quality [Lascada, Falha, Normal, Impecável, Perfeita] per quality level.
export const QUALITY_ODDS = [
  [100, 0, 0, 0, 0],
  [70, 30, 0, 0, 0],
  [60, 30, 10, 0, 0],
  [50, 30, 20, 0, 0],
  [40, 30, 20, 10, 0],
  [30, 30, 30, 10, 0],
  [20, 30, 30, 20, 0],
  [10, 30, 30, 30, 0],
  [0, 30, 30, 30, 10],
];
export const qualityUpgradeCost = (lvl) => 20 + lvl * 30;

const GEM_KEYS = Object.keys(GEM_TYPES);
const PROJECTILE_SPEED = 1800;
const DISARM_RADIUS = 150;

// Centre of a 2x2 body whose top-left square is c.
export const toWorld = (c) => (c + 1) * CELL;

function armorMult(armor) {
  return armor >= 0 ? 1 - (0.06 * armor) / (1 + 0.06 * armor) : 2 - Math.pow(0.94, -armor);
}

export class Game {
  constructor({ rng = Math.random, difficulty = 'medio' } = {}) {
    this.rng = rng;
    this.grid = new Grid();
    this.level = 1;
    this.difficulty = DIFFICULTIES[difficulty] ? difficulty : 'medio';
    this.maxLives = DIFFICULTIES[this.difficulty].lives;
    this.lives = this.maxLives;
    this.gold = 0;
    this.qualityLevel = 0;
    this.phase = 'build'; // build | choose | wave | over | won
    this.entities = new Map(); // uid -> {uid,x,y,kind:'gem'|'rock',def,pending,cooldown}
    this.enemies = new Map();
    this.projectiles = [];
    this.fx = [];
    this.pending = [];
    this.nextUid = 1;
    this.kills = 0;
    this.time = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.path = this.grid.fullPath();
    this.listeners = new Set();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, data) { for (const fn of this.listeners) fn(type, data); }

  entityAt(x, y) {
    for (const e of this.entities.values()) if (x >= e.x && x <= e.x + 1 && y >= e.y && y <= e.y + 1) return e;
    return null;
  }

  // ---------- Build phase ----------
  // Stones snap to the 2x2 build grid, aligned with the waypoints and paths (odd squares),
  // so neighbouring stones always touch and never leave useless 1-square gaps.
  static aligned(x, y) { return x % 2 === 1 && y % 2 === 1; }
  canPlace(x, y) {
    return this.phase === 'build' && this.pending.length < STONES_PER_ROUND && Game.aligned(x, y) && this.grid.tryBlock(x, y);
  }

  rollGem() {
    const odds = QUALITY_ODDS[this.qualityLevel];
    let r = this.rng() * 100, q = 0;
    for (; q < odds.length; q++) { r -= odds[q]; if (r < 0) break; }
    q = Math.min(q, odds.length - 1);
    const type = GEM_KEYS[Math.floor(this.rng() * GEM_KEYS.length)];
    return baseTowerId(type, q);
  }

  place(x, y, forcedId = null) {
    if (!this.canPlace(x, y)) return null;
    this.grid.block(x, y);
    const e = { uid: this.nextUid++, x, y, kind: 'gem', def: TOWERS[forcedId ?? this.rollGem()], pending: true, cooldown: 0 };
    this.entities.set(e.uid, e);
    this.pending.push(e.uid);
    this.path = this.grid.fullPath();
    this.fx.push({ t: 'place', x, y, color: e.def.color });
    if (this.pending.length === STONES_PER_ROUND) this.phase = 'choose';
    this.emit('change');
    return e;
  }

  upgradeQuality() {
    if (this.qualityLevel >= QUALITY_ODDS.length - 1) return false;
    const cost = qualityUpgradeCost(this.qualityLevel);
    if (this.gold < cost || this.phase === 'over') return false;
    this.gold -= cost;
    this.qualityLevel++;
    this.emit('change');
    return true;
  }

  removeRock(uid) {
    const e = this.entities.get(uid);
    if (!e || e.kind !== 'rock' || this.phase === 'wave' || this.phase === 'over') return false;
    this.entities.delete(uid);
    this.grid.unblock(e.x, e.y);
    this.path = this.grid.fullPath();
    this.fx.push({ t: 'remove', x: e.x, y: e.y });
    this.emit('change');
    return true;
  }

  // ---------- Choose phase ----------
  pendingEntities() { return this.pending.map((u) => this.entities.get(u)); }

  combineInfo(uid) {
    const e = this.entities.get(uid);
    if (!e || !e.pending || !e.def.base) return null;
    const same = this.pendingEntities().filter((p) => p.def.id === e.def.id);
    if (same.length >= 4) return { steps: 2, result: baseTowerId(e.def.type, Math.min(5, e.def.quality + 2)) };
    if (same.length >= 2) return { steps: 1, result: baseTowerId(e.def.type, Math.min(5, e.def.quality + 1)) };
    return null;
  }

  // Recipes that `uid` can complete with this round's gems plus towers on the field.
  specialOptions(uid) {
    const sel = this.entities.get(uid);
    if (!sel || sel.kind !== 'gem') return [];
    if (this.phase !== 'choose' && this.phase !== 'build') return [];
    const pool = [...this.entities.values()].filter((e) => e.kind === 'gem');
    const out = [];
    for (const r of RECIPES) {
      if (!r.ingredients.includes(sel.def.id)) continue;
      const used = new Set([sel.uid]);
      let selUsed = false;
      const picks = [];
      let ok = true;
      for (const ing of r.ingredients) {
        if (!selUsed && ing === sel.def.id) { selUsed = true; picks.push(sel.uid); continue; }
        // Prefer pending gems (they would turn to rock anyway).
        const cand = pool.filter((p) => !used.has(p.uid) && p.def.id === ing)
          .sort((a, b) => (b.pending ? 1 : 0) - (a.pending ? 1 : 0))[0];
        if (!cand) { ok = false; break; }
        used.add(cand.uid); picks.push(cand.uid);
      }
      // Needs at least one gem from this round, except pure-tower upgrades during the choose phase.
      if (ok && this.phase === 'choose') out.push({ result: r.result, uids: picks });
    }
    return out;
  }

  // Every recipe that uses this gem/dragon, with each ingredient marked as present on the field or not.
  evolutionInfo(uid) {
    const sel = this.entities.get(uid);
    if (!sel || sel.kind !== 'gem') return [];
    const pool = [...this.entities.values()].filter((e) => e.kind === 'gem' && e.uid !== uid);
    const out = [];
    for (const r of RECIPES) {
      if (!r.ingredients.includes(sel.def.id)) continue;
      const used = new Set();
      let selUsed = false;
      const items = r.ingredients.map((id) => {
        if (!selUsed && id === sel.def.id) { selUsed = true; return { id, self: true, have: true }; }
        const c = pool.find((p) => !used.has(p.uid) && p.def.id === id);
        if (c) used.add(c.uid);
        return { id, self: false, have: !!c };
      });
      out.push({ result: r.result, items });
    }
    return out;
  }

  finishRound(keepUid, newDefId, consumed = []) {
    const keep = this.entities.get(keepUid);
    keep.def = TOWERS[newDefId];
    keep.pending = false;
    for (const u of this.pending) {
      if (u === keepUid) continue;
      const e = this.entities.get(u);
      e.kind = 'rock'; e.pending = false; e.def = null;
    }
    for (const u of consumed) {
      if (u === keepUid) continue;
      const e = this.entities.get(u);
      if (e && e.kind === 'gem' && !e.pending) { e.kind = 'rock'; e.def = null; }
    }
    this.pending = [];
    this.fx.push({ t: 'upgrade', x: keep.x, y: keep.y, color: keep.def.color });
    this.startWave();
  }

  keep(uid) {
    const e = this.entities.get(uid);
    if (this.phase !== 'choose' || !e?.pending) return false;
    this.finishRound(uid, e.def.id);
    return true;
  }

  combine(uid) {
    if (this.phase !== 'choose') return false;
    const info = this.combineInfo(uid);
    if (!info) return false;
    this.finishRound(uid, info.result);
    return true;
  }

  special(uid, resultId) {
    if (this.phase !== 'choose') return false;
    const opt = this.specialOptions(uid).find((o) => o.result === resultId);
    if (!opt) return false;
    this.finishRound(uid, resultId, opt.uids);
    return true;
  }

  // ---------- Waves ----------
  startWave() {
    this.phase = 'wave';
    this.path = this.grid.fullPath();
    this.groundPts = this.path.map((c) => ({ x: toWorld(c.x), y: toWorld(c.y) }));
    this.airPts = this.grid.airPath().map((c) => ({ x: toWorld(c.x), y: toWorld(c.y) }));
    this.spawnQueue = waveFor(this.level).slice();
    this.spawnTimer = 0;
    this.emit('wave', this.level);
    this.emit('change');
  }

  spawn(type) {
    const pts = type.air ? this.airPts : this.groundPts;
    const en = {
      uid: this.nextUid++, type, hp: type.hp * HP_MULT, maxHp: type.hp * HP_MULT,
      x: pts[0].x, y: pts[0].y, seg: 0, pts, progress: 0,
      ab: new Set(type.abilities), slow: { a: 0, t: 0 }, poison: { dps: 0, t: 0 },
      shred: { a: 0, t: 0 }, frost: { p: 0, t: 0 }, stun: 0, rushT: 0,
      shield: 0, reactive: 0, krakenT: 10, dir: null, alive: true, hitFlash: 0,
    };
    this.enemies.set(en.uid, en);
  }

  // Closest enemy to a map point given in squares (as picked on screen), or null.
  enemyNear(x, y, maxDist = 3) {
    let best = null, bestD = maxDist;
    for (const en of this.enemies.values()) {
      if (!en.alive || !this.visible(en)) continue;
      const d = Math.hypot(en.x / CELL - x, en.y / CELL - y);
      if (d <= bestD) { best = en; bestD = d; }
    }
    return best;
  }

  healLife() {
    if (this.lives >= this.maxLives) return;
    this.lives++;
    this.emit('change');
  }

  // ---------- Simulation ----------
  update(dt) {
    if (this.phase === 'over' || this.phase === 'won') return;
    this.time += dt;
    if (this.phase === 'wave') {
      this.spawnTimer -= dt;
      if (this.spawnQueue.length && this.spawnTimer <= 0) {
        this.spawn(this.spawnQueue.shift());
        this.spawnTimer = 0.7;
      }
    }
    this.computeAuras();
    this.updateEnemies(dt);
    this.updateTowers(dt);
    this.updateProjectiles(dt);
    if (this.phase === 'wave' && !this.spawnQueue.length && this.enemies.size === 0 && !this.projectiles.length) {
      this.endWave();
    }
  }

  endWave() {
    this.level++;
    if (this.level > MAX_LEVEL) { this.phase = 'won'; this.emit('won'); }
    else { this.phase = 'build'; this.emit('waveEnd', this.level - 1); }
    this.emit('change');
  }

  towers() { return [...this.entities.values()].filter((e) => e.kind === 'gem' && !e.pending); }

  computeAuras() {
    const towers = this.towers();
    for (const t of towers) { t.buffAS = 0; t.buffRange = 0; t.buffDmg = 0; t.noMiss = false; t.disarmed = false; }
    this.enemyAuras = [];
    for (const src of towers) {
      const sx = toWorld(src.x), sy = toWorld(src.y);
      for (const a of src.def.abilities) {
        if (a.k === 'auraAS' || a.k === 'auraRange' || a.k === 'dmgAura' || a.k === 'noMiss') {
          for (const t of towers) {
            if (Math.hypot(toWorld(t.x) - sx, toWorld(t.y) - sy) > a.radius) continue;
            if (a.k === 'auraAS') t.buffAS = Math.max(t.buffAS, a.value);
            if (a.k === 'auraRange') t.buffRange = Math.max(t.buffRange, a.value);
            if (a.k === 'dmgAura') t.buffDmg = Math.max(t.buffDmg, a.pct);
            if (a.k === 'noMiss') t.noMiss = true;
          }
        } else if (['burnAura', 'antiAir', 'armorAura', 'iceAura', 'goldAura'].includes(a.k)) {
          this.enemyAuras.push({ ...a, x: sx, y: sy });
        }
      }
    }
    // Enemy disarm auras
    for (const en of this.enemies.values()) {
      if (!en.ab.has('disarm')) continue;
      for (const t of towers) if (Math.hypot(toWorld(t.x) - en.x, toWorld(t.y) - en.y) < DISARM_RADIUS) t.disarmed = true;
    }
  }

  enemyAuraState(en) {
    const s = { burn: 0, armor: 0, speed: 0, mr: 0, ice: 0 };
    for (const a of this.enemyAuras) {
      if (Math.hypot(a.x - en.x, a.y - en.y) > a.radius) continue;
      if (a.k === 'burnAura') s.burn += a.dps;
      else if (a.k === 'armorAura') s.armor = Math.max(s.armor, a.amount);
      else if (a.k === 'iceAura') s.ice = Math.max(s.ice, a.pct);
      else if (a.k === 'antiAir' && en.type.air) { s.armor = Math.max(s.armor, a.armor); s.speed = Math.max(s.speed, a.speed); s.mr = Math.max(s.mr, a.mr); }
    }
    return s;
  }

  effArmor(en, aura = this.enemyAuraState(en)) {
    let armor = en.type.armor + (en.ab.has('highArmor') ? 20 : 0) + en.reactive;
    armor -= en.shred.a + aura.armor;
    return armor;
  }

  updateEnemies(dt) {
    for (const en of this.enemies.values()) {
      const aura = this.enemyAuraState(en);
      en.aura = aura;
      for (const d of [en.slow, en.shred]) if (d.t > 0 && (d.t -= dt) <= 0) d.a = 0;
      if (en.frost.t > 0 && (en.frost.t -= dt) <= 0) en.frost.p = 0;
      if (en.hitFlash > 0) en.hitFlash -= dt;
      if (en.ab.has('kraken') && (en.krakenT -= dt) <= 0) {
        en.krakenT = 10; en.slow.a = 0; en.shred.a = 0; en.poison.dps = 0; en.frost.p = 0; en.stun = 0;
        this.fx.push({ t: 'cleanse', x: en.x, y: en.y });
      }
      // Damage over time (magic)
      if (en.poison.t > 0) { en.poison.t -= dt; this.damage(en, en.poison.dps * dt, 'magic', null, true); }
      if (aura.burn > 0) this.damage(en, aura.burn * dt, 'magic', null, true);
      if (en.ab.has('regen')) en.hp = Math.min(en.maxHp, en.hp + 400 * dt);
      if (!en.alive) continue;
      if (en.stun > 0) { en.stun -= dt; continue; }
      let speed = en.type.speed * SPEED_MULT - en.slow.a - aura.speed;
      speed = Math.max(100, speed);
      speed *= 1 - Math.max(aura.ice, en.frost.p);
      if (en.rushT > 0) { en.rushT -= dt; speed *= 1.5; }
      speed = Math.max(40, speed);
      this.moveEnemy(en, speed * dt);
    }
    for (const [u, en] of this.enemies) if (!en.alive) this.enemies.delete(u);
  }

  moveEnemy(en, dist) {
    while (dist > 0 && en.alive) {
      const target = en.pts[en.seg + 1];
      if (!target) { this.leak(en); return; }
      const dx = target.x - en.x, dy = target.y - en.y;
      const d = Math.hypot(dx, dy);
      if (d <= dist) {
        en.x = target.x; en.y = target.y; en.seg++; dist -= d; en.progress += d;
        const next = en.pts[en.seg + 1];
        if (next) {
          const nd = Math.atan2(next.y - target.y, next.x - target.x);
          if (en.dir !== null && Math.abs(nd - en.dir) > 0.01) this.onTurn(en);
          en.dir = nd;
        }
      } else {
        en.x += (dx / d) * dist; en.y += (dy / d) * dist; en.progress += dist; dist = 0;
      }
    }
  }

  onTurn(en) {
    if (en.ab.has('rush') && this.rng() < 0.2) en.rushT = 1.5;
    if (en.ab.has('refraction') && this.rng() < 0.15) { en.shield = 2; this.fx.push({ t: 'shield', uid: en.uid }); }
    if (en.ab.has('blink') && this.rng() < 0.1) {
      const fromX = en.x, fromY = en.y;
      this.moveEnemy(en, 384);
      this.fx.push({ t: 'blink', x: fromX, y: fromY, x2: en.x, y2: en.y });
    }
  }

  leak(en) {
    en.alive = false;
    this.lives -= en.type.boss ? 3 : 1;
    this.fx.push({ t: 'leak', x: en.x, y: en.y });
    if (this.lives <= 0) { this.lives = 0; this.phase = 'over'; this.emit('over'); }
    this.emit('change');
  }

  visible(en) {
    if (!en.ab.has('invis')) return true;
    for (const t of this.towers()) {
      if (!t.def.abilities.some((a) => a.k === 'trueSight')) continue;
      if (Math.hypot(toWorld(t.x) - en.x, toWorld(t.y) - en.y) <= t.def.range + t.buffRange) return true;
    }
    return false;
  }

  updateTowers(dt) {
    const enemies = [...this.enemies.values()];
    for (const t of this.towers()) {
      t.cooldown -= dt;
      if (!enemies.length) t.aim = null;
      if (t.def.dmg <= 0 || t.disarmed || t.cooldown > 0 || !enemies.length) continue;
      const tx = toWorld(t.x), ty = toWorld(t.y);
      const range = t.def.range + t.buffRange;
      const inRange = enemies.filter((e) => e.alive && Math.hypot(e.x - tx, e.y - ty) <= range && this.visible(e))
        .sort((a, b) => b.progress - a.progress);
      if (!inRange.length) { t.aim = null; continue; }
      const multi = t.def.abilities.find((a) => a.k === 'multi');
      const targets = inRange.slice(0, multi ? multi.count : 1);
      t.aim = { x: targets[0].x, y: targets[0].y };
      const selfAS = t.def.abilities.filter((a) => a.k === 'selfAS').reduce((s, a) => s + a.value, 0);
      let interval = (t.def.rate * 100) / (100 + selfAS + t.buffAS);
      if (targets[0].ab.has('untouchable')) interval *= 1.5;
      t.cooldown = interval;
      for (const target of targets) {
        this.projectiles.push({ x: tx, y: ty, z: 70, target: target.uid, tower: t.uid, def: t.def, color: t.def.color, noMiss: t.noMiss, buffDmg: t.buffDmg });
      }
      this.fx.push({ t: 'shoot', uid: t.uid });
    }
  }

  updateProjectiles(dt) {
    const keep = [];
    for (const p of this.projectiles) {
      const en = this.enemies.get(p.target);
      if (!en || !en.alive) continue;
      const dx = en.x - p.x, dy = en.y - p.y, d = Math.hypot(dx, dy);
      const step = PROJECTILE_SPEED * dt;
      if (d <= step) { this.hit(p, en); continue; }
      p.x += (dx / d) * step; p.y += (dy / d) * step;
      keep.push(p);
    }
    this.projectiles = keep;
  }

  hit(p, en) {
    const def = p.def;
    if (en.ab.has('evasion') && !p.noMiss && this.rng() < 0.5) { this.fx.push({ t: 'miss', x: en.x, y: en.y }); return; }
    if (en.shield > 0) { en.shield--; this.fx.push({ t: 'block', x: en.x, y: en.y }); return; }
    let dmg = def.dmg * (1 + p.buffDmg);
    let crit = false;
    for (const a of def.abilities) if (a.k === 'crit' && this.rng() < a.chance) { dmg *= a.mult; crit = true; }
    this.fx.push({ t: 'hit', x: en.x, y: en.y, color: p.color, crit, air: en.type.air });
    this.damage(en, dmg, 'phys', p.tower);
    for (const a of def.abilities) {
      switch (a.k) {
        case 'slow': if (!en.ab.has('magicImmune') || true) { en.slow.a = Math.max(en.slow.t > 0 ? en.slow.a : 0, a.amount); en.slow.t = a.dur; } break;
        case 'poison': if (!en.ab.has('magicImmune')) { en.poison.dps = Math.max(en.poison.t > 0 ? en.poison.dps : 0, a.dps); en.poison.t = a.dur; } break;
        case 'armorShred': en.shred.a = Math.max(en.shred.t > 0 ? en.shred.a : 0, a.amount); en.shred.t = a.dur; break;
        case 'cleave':
          for (const o of this.enemies.values()) {
            if (o === en || !o.alive || o.type.air !== en.type.air) continue;
            if (Math.hypot(o.x - en.x, o.y - en.y) <= a.radius) this.damage(o, dmg * a.pct, 'phys', p.tower);
          }
          this.fx.push({ t: 'splash', x: en.x, y: en.y, r: a.radius, color: p.color });
          break;
        case 'stun': if (this.rng() < a.chance && !en.type.boss) { en.stun = Math.max(en.stun, a.dur); this.fx.push({ t: 'stun', uid: en.uid }); } break;
        case 'chain': if (this.rng() < a.chance) this.chain(en, a, p); break;
        case 'fork': if (this.rng() < a.chance) this.fork(en, a, p); break;
        case 'frost':
          for (const o of this.enemies.values()) if (Math.hypot(o.x - en.x, o.y - en.y) <= a.radius) { o.frost.p = a.pct; o.frost.t = a.dur; }
          this.fx.push({ t: 'splash', x: en.x, y: en.y, r: a.radius, color: 0x9be8ff });
          break;
        case 'burnHit': this.damage(en, dmg * a.pct, 'magic', p.tower); break;
        case 'heal': if (this.rng() < a.chance) this.healLife(); break;
      }
    }
    if (en.ab.has('reactive')) en.reactive = Math.min(en.reactive + 0.5, 30);
  }

  chain(first, a, p) {
    const hitSet = new Set([first.uid]);
    let cur = first;
    const pts = [{ x: first.x, y: first.y }];
    this.damage(first, a.dmg, 'magic', p.tower);
    for (let j = 0; j < a.jumps; j++) {
      let best = null, bd = Infinity;
      for (const o of this.enemies.values()) {
        if (!o.alive || hitSet.has(o.uid)) continue;
        const d = Math.hypot(o.x - cur.x, o.y - cur.y);
        if (d < Math.min(bd, a.radius * 0.6)) { bd = d; best = o; }
      }
      if (!best) break;
      hitSet.add(best.uid); pts.push({ x: best.x, y: best.y });
      this.damage(best, a.dmg, 'magic', p.tower);
      if (a.slow) { best.slow.a = Math.max(best.slow.a, a.slow); best.slow.t = 2; }
      cur = best;
    }
    this.fx.push({ t: 'lightning', pts, color: a.slow ? 0x9be8ff : 0xb9a4ff });
  }

  fork(first, a, p) {
    const t = this.entities.get(p.tower);
    const ox = t ? toWorld(t.x) : first.x, oy = t ? toWorld(t.y) : first.y;
    const list = [...this.enemies.values()].filter((o) => o.alive).sort((x, y) => Math.hypot(x.x - first.x, x.y - first.y) - Math.hypot(y.x - first.x, y.y - first.y)).slice(0, a.targets);
    for (const o of list) {
      this.damage(o, a.dmg, 'magic', p.tower);
      this.fx.push({ t: 'lightning', pts: [{ x: ox, y: oy }, { x: o.x, y: o.y }], color: 0xffe27a });
    }
  }

  damage(en, amount, kind, towerUid, silent = false) {
    if (!en.alive) return;
    if (kind === 'phys') {
      if (en.ab.has('physImmune')) return;
      amount *= armorMult(this.effArmor(en, en.aura));
    } else {
      if (en.ab.has('magicImmune')) return;
      const mr = Math.max(0, en.type.mr - (en.aura?.mr ?? 0));
      amount *= 1 - Math.min(100, mr) / 100;
    }
    en.hp -= amount;
    if (!silent) en.hitFlash = 0.08;
    const t = towerUid && this.entities.get(towerUid);
    if (t) t.damageDone = (t.damageDone || 0) + amount;
    if (en.hp <= 0) this.kill(en);
  }

  kill(en) {
    en.alive = false;
    let gold = bountyFor(en.type);
    for (const a of this.enemyAuras || []) {
      if (a.k === 'goldAura' && Math.hypot(a.x - en.x, a.y - en.y) <= a.radius && this.rng() < a.chance) { gold *= a.mult; this.fx.push({ t: 'jackpot', x: en.x, y: en.y }); break; }
    }
    this.gold += gold;
    this.kills++;
    this.fx.push({ t: 'death', x: en.x, y: en.y, air: en.type.air, boss: en.type.boss, gold });
    this.emit('change');
  }

  pathLengthCells() { return this.path ? Math.round(pathLength(this.path)) : 0; }
}
