import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { Grid } from '../src/map.js';
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
  g.enemies.set(1, { uid: 1, x: 10 * CELL, y: 10 * CELL, alive: true });
  g.enemies.set(2, { uid: 2, x: 12 * CELL, y: 10 * CELL, alive: true });
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
