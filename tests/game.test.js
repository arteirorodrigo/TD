import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, DIFFICULTIES, QUALITY_ODDS } from '../src/game.js';
import { Grid } from '../src/map.js';
import { waveFor, bountyFor, baseLevelOf, ENEMY_TYPES, upcomingSpecial } from '../src/data/enemies.js';
import { getRecords, submitRecord, bestOverall, getMazes, saveMaze, deleteMaze, tutorialSeen, markTutorialSeen } from '../src/records.js';
import { bookLines, SECRET_IDS } from '../src/book.js';
import { TOWERS, RECIPES, CELL, tierTag, tierLabel } from '../src/data/towers.js';

test('initial path exists through all waypoints', () => {
  const g = new Grid();
  assert.ok(g.fullPath().length > 50);
});

test('cannot fully block the route', () => {
  const g = new Grid();
  // Try to wall a full row between spawn and waypoint 1: the last gap must be refused.
  let refused = 0;
  for (let x = 0; x < g.w; x += 2) {
    if (!g.canBuildAt(x, 5)) continue;
    if (g.tryBlock(x, 5)) g.block(x, 5); else refused++;
  }
  assert.equal(refused, 1);
  assert.ok(g.fullPath());
});

test('all recipe ingredients exist', () => {
  for (const r of RECIPES) for (const i of r.ingredients) assert.ok(TOWERS[i], `${r.result} needs ${i}`);
});

test('round flow: place 5, keep one, wave runs and ends', () => {
  const g = new Game();
  const spots = [[41, 21], [43, 21], [45, 21], [47, 21], [49, 21]];
  for (const [x, y] of spots) assert.ok(g.place(x, y, 'D1'));
  assert.equal(g.phase, 'choose');
  const first = g.pending[0];
  assert.ok(g.combineInfo(first).steps === 2);
  assert.ok(g.combine(first));
  assert.equal(g.entities.get(first).def.id, 'D3');
  assert.equal(g.phase, 'wave');
  for (let i = 0; i < 20000 && g.phase === 'wave'; i++) g.update(1 / 30);
  assert.equal(g.phase, 'build');
  assert.equal(g.level, 2);
  assert.ok(g.kills + (10 - g.lives) === 10);
});

test('special recipe from round gems', () => {
  const g = new Game();
  const ids = ['B1', 'Y1', 'D1', 'R1', 'R1'];
  ids.forEach((id, i) => g.place(41 + 2 * i, 21, id));
  const sel = g.pending[0];
  const opts = g.specialOptions(sel);
  assert.ok(opts.some((o) => o.result === 'silver'));
  g.special(sel, 'silver');
  assert.equal(g.entities.get(sel).def.id, 'silver');
  assert.equal([...g.entities.values()].filter((e) => e.kind === 'rock').length, 4);
});

test('stones snap to the 2x2 build grid', () => {
  const g = new Game();
  assert.equal(g.canPlace(40, 21), false);
  assert.equal(g.canPlace(41, 20), false);
  assert.equal(g.canPlace(41, 21), true);
});

test('tier labels', () => {
  assert.equal(tierTag(0), 'T0');
  assert.equal(tierLabel(0), 'T0 · Partida');
  assert.equal(tierLabel(5), 'T5 · Ancestral');
});

test('enemyNear picks closest within range', () => {
  const g = new Game();
  g.enemies.set(1, { uid: 1, x: 10 * CELL, y: 10 * CELL, alive: true, ab: new Set() });
  g.enemies.set(2, { uid: 2, x: 12 * CELL, y: 10 * CELL, alive: true, ab: new Set() });
  assert.equal(g.enemyNear(11.6, 10).uid, 2);
  assert.equal(g.enemyNear(30, 30), null);
});

test('evolutionInfo lists next stage with have flags', () => {
  const g = new Game();
  g.entities.set(900, { uid: 900, x: 1, y: 1, kind: 'gem', def: TOWERS.asteriatedRuby, pending: false });
  g.entities.set(901, { uid: 901, x: 5, y: 5, kind: 'gem', def: TOWERS.R4, pending: false });
  const [evo] = g.evolutionInfo(900);
  assert.equal(evo.result, 'volcano');
  assert.deepEqual(evo.items.map((i) => [i.id, i.self, i.have]), [['asteriatedRuby', true, true], ['R4', false, true], ['P3', false, false]]);
});

test('evolutionInfo empty for final stage', () => {
  const g = new Game();
  g.entities.set(900, { uid: 900, x: 1, y: 1, kind: 'gem', def: TOWERS.crownPrince, pending: false });
  assert.deepEqual(g.evolutionInfo(900), []);
});

test('evolutionInfo does not reuse one gem for a repeated ingredient', () => {
  const g = new Game();
  g.entities.set(900, { uid: 900, x: 1, y: 1, kind: 'gem', def: TOWERS.R5, pending: false });
  g.entities.set(901, { uid: 901, x: 5, y: 5, kind: 'gem', def: TOWERS.P5, pending: false });
  const evo = g.evolutionInfo(900).find((e) => e.result === 'burningStone');
  assert.deepEqual(evo.items.map((i) => i.have), [true, true, false, false]);
});

test('enemyNear skips dead enemies', () => {
  const g = new Game();
  g.enemies.set(1, { uid: 1, x: 10 * CELL, y: 10 * CELL, alive: false, ab: new Set() });
  assert.equal(g.enemyNear(10, 10), null);
});

test('enemyNear skips enemies the player cannot see', () => {
  const g = new Game();
  g.enemies.set(1, { uid: 1, x: 10 * CELL, y: 10 * CELL, alive: true, ab: new Set(['invis']) });
  assert.equal(g.enemyNear(10, 10), null);
});

test('difficulty sets starting lives', () => {
  assert.equal(new Game({ difficulty: 'facil' }).lives, 20);
  assert.equal(new Game().lives, 10);
  assert.equal(new Game({ difficulty: 'dificil' }).lives, 5);
  assert.equal(new Game({ difficulty: 'sobrevivente' }).maxLives, 1);
  assert.equal(DIFFICULTIES.sobrevivente.name, 'Sobrevivente');
});

test('heal never exceeds the difficulty max', () => {
  const g = new Game({ difficulty: 'sobrevivente' });
  g.healLife();
  assert.equal(g.lives, 1);
  const m = new Game();
  m.lives = 7; m.healLife();
  assert.equal(m.lives, 8);
});

test('wave 51 repeats wave 26 three times stronger', () => {
  const a = waveFor(26)[0], b = waveFor(51)[0];
  assert.equal(b.name, a.name);
  assert.equal(b.hp, a.hp * 3);
  assert.equal(b.armor, a.armor + 5);
  assert.equal(b.cycle, 1);
  assert.equal(a.cycle, 0);
  assert.equal(baseLevelOf(51), 26);
});

test('wave 75 is the cycle-1 final boss, wave 76 starts cycle 2 at 26', () => {
  assert.ok(waveFor(75)[0].boss);
  assert.equal(baseLevelOf(75), 50);
  assert.equal(waveFor(75)[0].cycle, 1);
  assert.equal(baseLevelOf(76), 26);
  assert.equal(waveFor(76)[0].cycle, 2);
  assert.equal(waveFor(76)[0].hp, waveFor(26)[0].hp * 9);
  assert.equal(baseLevelOf(100), 50);
  assert.equal(baseLevelOf(101), 26);
});

test('bosses 20 and 30 have double life, boss 50 has ten times', () => {
  const raw = (lv) => ENEMY_TYPES.find((e) => e.level === lv && e.boss).hp;
  assert.equal(waveFor(10)[0].hp, raw(10));
  assert.equal(waveFor(20)[0].hp, raw(20) * 2);
  assert.equal(waveFor(30)[0].hp, raw(30) * 2);
  assert.equal(waveFor(50)[0].hp, raw(50) * 10);
  assert.equal(waveFor(75)[0].hp, raw(50) * 10 * 3);
});

test('bounty scales with cycle', () => {
  assert.equal(bountyFor(waveFor(51)[0]), 2 * bountyFor(waveFor(26)[0]));
});

test('game keeps going after wave 50', () => {
  const g = new Game();
  g.level = 50; g.phase = 'wave';
  g.endWave();
  assert.equal(g.level, 51);
  assert.equal(g.phase, 'build');
});

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('submitRecord keeps the best phase, ties by lives', () => {
  const s = fakeStorage();
  assert.equal(submitRecord(s, 'medio', 12, 3).isNew, true);
  assert.equal(submitRecord(s, 'medio', 10, 9).isNew, false);
  assert.equal(submitRecord(s, 'medio', 12, 5).isNew, true);
  assert.deepEqual(getRecords(s).medio, { phase: 12, lives: 5 });
});

test('bestOverall picks the highest phase across difficulties', () => {
  const s = fakeStorage();
  assert.equal(bestOverall(s), null);
  submitRecord(s, 'facil', 30, 2);
  submitRecord(s, 'dificil', 12, 1);
  assert.deepEqual(bestOverall(s), { diffKey: 'facil', phase: 30 });
});

test('records survive a broken storage', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.deepEqual(getRecords(bad), {});
  assert.equal(submitRecord(bad, 'medio', 3, 1).isNew, true);
  assert.equal(bestOverall(bad), null);
});

test('quit ends the match once', () => {
  const g = new Game();
  let n = 0;
  g.on((t) => { if (t === 'over') n++; });
  g.quit(); g.quit();
  assert.equal(g.phase, 'over');
  assert.equal(g.quitted, true);
  assert.equal(n, 1);
});

test('roundCombos finds pairs and dragon upgrades as stones are placed', () => {
  const g = new Game();
  const sal = { uid: 900, x: 1, y: 1, kind: 'gem', def: TOWERS.asteriatedRuby, pending: false };
  g.entities.set(900, sal);
  g.place(41, 21, 'R4');
  assert.deepEqual(g.roundCombos(), []);
  g.place(45, 21, 'P3');
  const evo = g.roundCombos().find((c) => c.result === 'volcano');
  assert.equal(evo.kind, 'special');
  assert.deepEqual(new Set(evo.uids), new Set([900, ...g.pending]));
  assert.ok(g.pending.includes(evo.anchor));
  g.place(49, 21, 'R4');
  const pair = g.roundCombos().find((c) => c.kind === 'combine');
  assert.equal(pair.result, 'R5');
  assert.equal(pair.uids.length, 2);
});

test('roundCombos ignores recipes made only of old towers', () => {
  const g = new Game();
  g.entities.set(900, { uid: 900, x: 1, y: 1, kind: 'gem', def: TOWERS.B1, pending: false });
  g.entities.set(901, { uid: 901, x: 5, y: 1, kind: 'gem', def: TOWERS.Y1, pending: false });
  g.entities.set(902, { uid: 902, x: 9, y: 1, kind: 'gem', def: TOWERS.D1, pending: false });
  g.place(41, 21, 'G2');
  assert.equal(g.roundCombos().some((c) => c.result === 'silver'), false);
});

test('book groups every non-secret dragon into exactly one of 8 element lines', () => {
  const lines = bookLines();
  assert.equal(lines.length, 8);
  const seen = lines.flatMap((l) => l.tiers.flat());
  const specials = Object.values(TOWERS).filter((t) => !t.base && !SECRET_IDS.includes(t.id)).map((t) => t.id);
  assert.equal(seen.length, specials.length);
  assert.deepEqual(new Set(seen), new Set(specials));
  const fire = lines.find((l) => l.final === 'crownPrince');
  assert.equal(fire.element, 'R');
  assert.deepEqual(fire.tiers[0], ['asteriatedRuby']);
  assert.ok(fire.tiers[1].includes('volcano'));
  assert.deepEqual(fire.tiers[3], ['crownPrince']);
  assert.equal(SECRET_IDS.length, 5);
});

test('mazes are saved, updated and deleted', () => {
  const s = fakeStorage();
  assert.deepEqual(getMazes(s), []);
  const a = saveMaze(s, { name: 'Espiral', cells: [[41, 21], [43, 21]] });
  assert.ok(a.id);
  assert.equal(getMazes(s).length, 1);
  saveMaze(s, { id: a.id, name: 'Espiral 2', cells: [[41, 21]] });
  assert.equal(getMazes(s).length, 1);
  assert.equal(getMazes(s)[0].name, 'Espiral 2');
  deleteMaze(s, a.id);
  assert.deepEqual(getMazes(s), []);
});

test('editor places unlimited rocks, never closes the path, and exports them', () => {
  const g = new Game({ editor: true });
  assert.equal(g.phase, 'edit');
  for (let x = 41; x <= 53; x += 2) assert.ok(g.placeRock(x, 21));
  assert.equal(g.pending.length, 0);
  assert.equal(g.mazeCells().length, 7);
  let refused = 0;
  for (let x = 1; x < g.grid.w; x += 2) if (!g.placeRock(x, 5)) refused++;
  assert.ok(refused >= 1);
  assert.ok(g.grid.fullPath());
  const first = [...g.entities.values()][0];
  assert.ok(g.removeRock(first.uid));
});

test('a normal match refuses editor rocks', () => {
  const g = new Game();
  assert.equal(g.placeRock(41, 21), false);
});

test('a new stone can be placed over an old rock, replacing it', () => {
  const g = new Game();
  for (const x of [41, 43, 45, 47, 49]) g.place(x, 21);
  g.keep(g.pending[0]);
  g.enemies.clear(); g.spawnQueue = []; g.endWave();
  const rock = g.entityAt(43, 21);
  assert.equal(rock.kind, 'rock');
  assert.ok(g.canPlace(43, 21));
  const e = g.place(43, 21);
  assert.ok(e);
  assert.equal(e.kind, 'gem');
  assert.equal(g.entities.has(rock.uid), false);
  assert.equal(g.entityAt(43, 21).uid, e.uid);
  assert.equal(g.canPlace(41, 21), false); // the kept scale (a tower) is never replaced
});

function chooseGame() {
  let n = 0;
  const g = new Game({ rng: () => ((n++ * 0.37) % 1) });
  for (const [x, y] of [[41, 21], [43, 21], [45, 21], [47, 21], [49, 21]]) g.place(x, y, 'D1');
  return g;
}

test('reroll needs max luck and the choose phase', () => {
  const g = chooseGame();
  g.gold = 1000;
  assert.equal(g.rerollCost(), null);
  assert.equal(g.reroll(g.pending[0]), false);
  g.qualityLevel = QUALITY_ODDS.length - 1;
  assert.equal(g.rerollCost(), 50);
  const b = new Game(); b.qualityLevel = QUALITY_ODDS.length - 1; b.gold = 1000;
  assert.equal(b.rerollCost(), null); // build phase
});

test('reroll costs 50, 100, 200 in the same round and changes the scale', () => {
  const g = chooseGame();
  g.qualityLevel = QUALITY_ODDS.length - 1;
  g.gold = 350;
  const uid = g.pending[0];
  const seen = new Set();
  for (const cost of [50, 100, 200]) {
    assert.equal(g.rerollCost(), cost);
    const before = g.gold;
    assert.ok(g.reroll(uid));
    assert.equal(g.gold, before - cost);
    seen.add(g.entities.get(uid).def.id);
  }
  assert.ok(seen.size > 1 || !seen.has('D1'));
  assert.equal(g.gold, 0);
  assert.equal(g.reroll(uid), false); // no gold for 400
  assert.equal(g.reroll(9999), false); // not a pending stone
});

test('reroll price resets next round', () => {
  const g = chooseGame();
  g.qualityLevel = QUALITY_ODDS.length - 1;
  g.gold = 1000;
  g.reroll(g.pending[0]); g.reroll(g.pending[0]);
  assert.equal(g.rerollCost(), 200);
  g.keep(g.pending[1]);
  g.phase = 'choose';
  assert.equal(g.rerollCost(), 50);
});

test('upcomingSpecial warns about invisible and physical-immune waves', () => {
  assert.deepEqual(upcomingSpecial(7), { level: 8, kind: 'invis' });
  assert.deepEqual(upcomingSpecial(8), { level: 8, kind: 'invis' }); // the next wave itself
  assert.equal(upcomingSpecial(1), null);
  assert.deepEqual(upcomingSpecial(21), { level: 23, kind: 'physImmune' });
  assert.deepEqual(upcomingSpecial(57), { level: 58, kind: 'physImmune' }); // endless: 58 = base 33
});

test('first-match tips are shown once and survive a broken storage', () => {
  const s = fakeStorage();
  assert.equal(tutorialSeen(s), false);
  markTutorialSeen(s);
  assert.equal(tutorialSeen(s), true);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(tutorialSeen(broken), false);
  assert.doesNotThrow(() => markTutorialSeen(broken));
  assert.equal(tutorialSeen(null), false);
});

test('burn aura and poison damage count in the tower "damage done"', () => {
  const g = new Game();
  const ids = ['R2', 'R1', 'P1', 'B1', 'B1'];
  ids.forEach((id, i) => g.place(41 + 2 * i, 21, id));
  const sel = g.pending[0];
  assert.ok(g.special(sel, 'asteriatedRuby'));
  const sal = g.entities.get(sel);
  for (let i = 0; i < 3000 && g.phase === 'wave'; i++) g.update(1 / 30);
  assert.ok((sal.damageDone || 0) > 0, 'salamander burn aura damage counted');
});

test('poison damage over time counts for the tower that poisoned', () => {
  const g = new Game();
  ['G1', 'G1', 'G1', 'G1', 'G1'].forEach((id, i) => g.place(41 + 2 * i, 21, id));
  const keep = g.pending[0];
  g.keep(keep);
  const t = g.entities.get(keep);
  let hitDmg = 0;
  const orig = g.damage.bind(g);
  g.damage = (en, amount, kind, uid, silent) => { if (uid === keep && !silent) hitDmg += amount * (kind === 'phys' ? 1 : 1); return orig(en, amount, kind, uid, silent); };
  for (let i = 0; i < 3000 && g.phase === 'wave'; i++) g.update(1 / 30);
  assert.ok(t.damageDone > hitDmg, `poison adds to damage done (${t.damageDone} vs hits ${hitDmg})`);
});

test('quitting before finishing any wave does not count as a record', () => {
  const g = new Game(); g.quit();
  assert.equal(g.countsForRecord(), false);
  const h = new Game(); h.level = 2; h.quit();
  assert.equal(h.countsForRecord(), true);
  const d = new Game(); d.lives = 0; d.phase = 'over';
  assert.equal(d.countsForRecord(), true);
});

test('quitting mid-wave clears the enemies on the map', () => {
  const g = new Game();
  ['D1', 'D1', 'D1', 'B1', 'Y1'].forEach((id, i) => g.place(41 + 2 * i, 21, id));
  g.keep(g.pending[3]);
  for (let i = 0; i < 90; i++) g.update(1 / 30);
  assert.ok(g.enemies.size > 0);
  g.quit();
  assert.equal(g.enemies.size, 0);
  assert.equal(g.spawnQueue.length, 0);
  assert.equal(g.projectiles.length, 0);
});

// 2ª auditoria (22/11): poder do Dragão Ladrão e do Dragão Perolado.
const fakeEnemy = (abs) => ({ uid: 1, type: { air: false, boss: false, armor: 0, mr: 0 }, hp: 1e6, maxHp: 1e6, x: 10 * CELL, y: 10 * CELL, alive: true, ab: new Set(abs),
  slow: { a: 0, t: 0 }, poison: { dps: 0, t: 0 }, shred: { a: 0, t: 0 }, frost: { p: 0, t: 0 }, stun: 0, rushT: 0, shield: 0, reactive: 0, stolen: 0 });

test('Dragão Ladrão rouba Evasão e Refração por 3 s', () => {
  const g = new Game({ rng: () => 0.99 }); // never dodges on the thief's own shot
  const en = fakeEnemy(['evasion', 'refraction']);
  g.enemies.set(1, en);
  g.computeAuras();
  g.hit({ def: TOWERS.zumurud, buffDmg: 0, noMiss: false, color: 0, tower: null }, en);
  assert.equal(en.stolen, 3);
  en.shield = 2; // a refraction shield does not block while stolen
  // with Evasion stolen, a roll that would dodge (0.1 < 0.5) does not dodge
  g.rng = () => 0.1;
  const hp = en.hp;
  g.hit({ def: TOWERS.D1, buffDmg: 0, noMiss: false, color: 0, tower: null }, en);
  assert.ok(en.hp < hp);
});

test('Dragão Perolado protege torres próximas do desarme', () => {
  const g = new Game();
  g.entities.set(900, { uid: 900, x: 11, y: 11, kind: 'gem', def: TOWERS.deepSeaPearl, pending: false });
  g.entities.set(901, { uid: 901, x: 13, y: 11, kind: 'gem', def: TOWERS.D1, pending: false });
  g.entities.set(902, { uid: 902, x: 41, y: 41, kind: 'gem', def: TOWERS.D1, pending: false });
  const near = fakeEnemy(['disarm']); near.x = 14 * CELL; near.y = 12 * CELL;
  const far = fakeEnemy(['disarm']); far.uid = 2; far.x = 42 * CELL; far.y = 42 * CELL;
  g.enemies.set(1, near); g.enemies.set(2, far);
  g.computeAuras();
  assert.equal(g.entities.get(901).disarmed, false);
  assert.equal(g.entities.get(902).disarmed, true);
});
