import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { Grid } from '../src/map.js';
import { TOWERS, RECIPES } from '../src/data/towers.js';

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
  const spots = [[40, 20], [42, 20], [44, 20], [46, 20], [48, 20]];
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
  ids.forEach((id, i) => g.place(40 + 2 * i, 20, id));
  const sel = g.pending[0];
  const opts = g.specialOptions(sel);
  assert.ok(opts.some((o) => o.result === 'silver'));
  g.special(sel, 'silver');
  assert.equal(g.entities.get(sel).def.id, 'silver');
  assert.equal([...g.entities.values()].filter((e) => e.kind === 'rock').length, 4);
});
