import { Game, STONES_PER_ROUND, QUALITY_ODDS, qualityUpgradeCost, toWorld } from './game.js';
import { Renderer } from './render.js';
import { TOWERS, QUALITIES, CELL, abilityText } from './data/towers.js';
import { waveFor, HP_MULT, SPEED_MULT, ABILITY_TEXT, MAX_LEVEL } from './data/enemies.js';

const $ = (id) => document.getElementById(id);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const fmt = (n) => (n >= 10000 ? Math.round(n / 1000) + 'k' : Math.round(n).toLocaleString('pt-BR'));
const ODDS_COLORS = ['#7c8798', '#4fb0ff', '#5fe3c0', '#c58bff', '#ffcc4d'];

let game, view, selectedUid = null, speed = 1;

function start() {
  game = new Game();
  if (!view) view = new Renderer($('game'), game);
  else { view.game = game; for (const m of view.meshes.values()) view.disposeGroup(m); view.meshes.clear(); for (const m of view.enemyMeshes.values()) view.disposeGroup(m); view.enemyMeshes.clear(); }
  game.on((type) => {
    if (type === 'change') { view.refreshCells(); renderUI(); }
    if (type === 'over') showEnd(false);
    if (type === 'won') showEnd(true);
  });
  selectedUid = null;
  view.refreshCells();
  renderUI();
}

// ---------- UI ----------
function phaseText() {
  const p = game.phase;
  if (p === 'build') return `Coloque ${STONES_PER_ROUND - game.pending.length} pedra${STONES_PER_ROUND - game.pending.length === 1 ? '' : 's'} no mapa`;
  if (p === 'choose') return 'Escolha uma gema para manter, combinar ou criar especial';
  if (p === 'wave') return `Onda ${game.level} em andamento`;
  if (p === 'over') return 'Fim de jogo';
  return 'Vitória!';
}

function renderUI() {
  $('hud-level').textContent = `${Math.min(game.level, MAX_LEVEL)}/${MAX_LEVEL}`;
  $('hud-lives').textContent = game.lives;
  $('hud-gold').textContent = fmt(game.gold);
  const ph = $('hud-phase');
  ph.textContent = phaseText();
  ph.classList.toggle('wave', game.phase === 'wave');

  // Round slots
  const slots = $('slots');
  slots.innerHTML = '';
  for (let i = 0; i < STONES_PER_ROUND; i++) {
    const e = game.entities.get(game.pending[i]);
    const b = document.createElement('button');
    b.className = 'slot' + (e ? ' filled' : '') + (e && e.uid === selectedUid ? ' sel' : '');
    if (e) {
      b.innerHTML = `<span><span class="swatch" style="color:${hex(e.def.color)};background:${hex(e.def.color)}"></span>${QUALITIES[e.def.quality].slice(0, 3)}</span>`;
      b.title = e.def.name;
      b.onclick = () => select(e.uid);
    } else { b.textContent = i + 1; b.disabled = true; }
    slots.appendChild(b);
  }

  // Luck
  const odds = QUALITY_ODDS[game.qualityLevel];
  $('odds').innerHTML = odds.map((p, i) => (p ? `<span style="width:${p}%;background:${ODDS_COLORS[i]}" title="${QUALITIES[i]} ${p}%"></span>` : '')).join('');
  $('odds-legend').innerHTML = odds.map((p, i) => `<span style="color:${p ? ODDS_COLORS[i] : ''}">${QUALITIES[i].slice(0, 3)} ${p}%</span>`).join('');
  $('luck-level').textContent = `Nível ${game.qualityLevel}`;
  const maxed = game.qualityLevel >= QUALITY_ODDS.length - 1;
  const cost = qualityUpgradeCost(game.qualityLevel);
  const lb = $('btn-luck');
  lb.textContent = maxed ? 'Máximo' : `Melhorar (${cost} ouro)`;
  lb.disabled = maxed || game.gold < cost;

  renderWave();
  renderSelection();
}

function renderWave() {
  const lvl = Math.min(game.level, MAX_LEVEL);
  const units = waveFor(lvl);
  const types = [...new Map(units.map((u) => [u.id, u])).values()];
  const label = game.phase === 'wave' ? 'Onda atual' : 'Próxima onda';
  $('wave-card').innerHTML = `<h3>${label} · ${units.length} inimigo${units.length > 1 ? 's' : ''}</h3>` + types.map((t) => `
    <div style="margin-top:6px"><b>${t.name}</b>
      <div class="muted" style="font-variant-numeric:tabular-nums">Vida ${fmt(t.hp * HP_MULT)} · Vel. ${Math.round(t.speed * SPEED_MULT / CELL * 10) / 10} q/s · Armadura ${t.armor}</div>
      ${t.boss ? '<span class="tag boss">Chefe</span>' : ''}${t.air ? '<span class="tag air">Voador</span>' : '<span class="tag">Terrestre</span>'}${t.abilities.map((a) => `<span class="tag">${ABILITY_TEXT[a]}</span>`).join('')}
    </div>`).join('');
}

function towerStats(def, e) {
  const range = def.range + (e?.buffRange || 0);
  return `<dl class="stats">
    <dt>Dano</dt><dd>${fmt(def.dmg)}</dd>
    <dt>Intervalo</dt><dd>${def.rate.toFixed(2).replace('.', ',')} s</dd>
    <dt>Alcance</dt><dd>${range >= 5000 ? 'Mapa todo' : (range / CELL).toFixed(1).replace('.', ',') + ' quadrados'}</dd>
    ${e?.damageDone ? `<dt>Dano causado</dt><dd>${fmt(e.damageDone)}</dd>` : ''}
  </dl>${def.abilities.length ? `<ul class="abil">${def.abilities.map((a) => `<li>${abilityText(a)}</li>`).join('')}</ul>` : ''}`;
}

function renderSelection() {
  const card = $('sel-card');
  const e = selectedUid && game.entities.get(selectedUid);
  if (!e) { card.hidden = true; view?.showSelection(null); return; }
  card.hidden = false;
  view.showSelection(e);
  if (e.kind === 'rock') {
    const can = game.phase === 'build' || game.phase === 'choose';
    card.innerHTML = `<h2>Pedra</h2><p class="hint">Bloqueia o caminho como as gemas, mas não ataca.</p>
      <div class="actions"><button class="btn" id="act-remove" ${can ? '' : 'disabled'}>Remover pedra</button></div>
      ${can ? '' : '<p class="hint">Só dá para remover entre as ondas.</p>'}`;
    $('act-remove').onclick = () => { game.removeRock(e.uid); select(null); };
    return;
  }
  const def = e.def;
  let html = `<h2><span class="swatch" style="color:${hex(def.color)};background:${hex(def.color)}"></span>${def.name}</h2>`;
  if (e.pending) html += '<span class="tag">Nova nesta rodada</span>';
  else if (!def.base) html += '<span class="tag boss">Especial</span>';
  html += towerStats(def, e);
  const actions = [];
  if (game.phase === 'choose') {
    if (e.pending) actions.push(`<button class="btn primary" data-act="keep">Manter esta gema</button>`);
    const ci = game.combineInfo(e.uid);
    if (ci) actions.push(`<button class="btn" data-act="combine">Combinar ${ci.steps === 2 ? '4' : '2'} iguais → ${TOWERS[ci.result].name}</button>`);
    for (const o of game.specialOptions(e.uid)) actions.push(`<button class="btn special" data-act="special" data-id="${o.result}">Criar ${TOWERS[o.result].name}</button>`);
  }
  if (actions.length) html += `<div class="actions">${actions.join('')}</div>`;
  else if (game.phase === 'choose' && !e.pending) html += '<p class="hint">Selecione uma das pedras novas para decidir a rodada.</p>';
  if (e.pending && game.phase === 'build') html += '<p class="hint">Coloque todas as pedras para decidir qual manter.</p>';
  card.innerHTML = html;
  card.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
    const act = b.dataset.act;
    if (act === 'keep') game.keep(e.uid);
    if (act === 'combine') game.combine(e.uid);
    if (act === 'special') game.special(e.uid, b.dataset.id);
    renderUI();
  });
}

function select(uid) { selectedUid = uid; renderUI(); }

function showRecipes() {
  const have = new Map();
  for (const e of game.entities.values()) if (e.kind === 'gem') have.set(e.def.id, (have.get(e.def.id) || 0) + 1);
  const specials = Object.values(TOWERS).filter((t) => !t.base);
  const card = (t) => {
    const recipes = [t.recipe, t.alt].filter(Boolean);
    const ready = recipes.some((r) => { const c = new Map(have); return r.every((i) => { const n = c.get(i) || 0; c.set(i, n - 1); return n > 0; }); });
    return `<div class="recipe ${ready ? 'ready' : ''}"><b><span class="swatch" style="color:${hex(t.color)};background:${hex(t.color)}"></span>${t.name}</b>
      <div class="muted" style="font-size:12px">Dano ${fmt(t.dmg)} · ${t.rate}s · ${t.range >= 5000 ? 'mapa todo' : (t.range / CELL).toFixed(1).replace('.', ',') + ' q'}</div>
      ${recipes.map((r, i) => `<div>${i ? '<span class="muted" style="font-size:12px">ou </span>' : ''}${r.map((id) => `<span class="ing ${have.get(id) ? 'have' : ''}">${TOWERS[id].name}</span>`).join('')}</div>`).join('')}
      <div class="muted" style="font-size:12px;margin-top:4px">${t.abilities.map(abilityText).join(' · ')}</div></div>`;
  };
  $('modal-body').innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><h2>Receitas especiais</h2><button class="btn" id="close-modal">Fechar</button></div>
    <p class="hint">Na fase de escolha, selecione uma gema que faz parte da receita. Ingredientes em verde já estão no mapa.</p>
    <div class="recipes">${specials.map(card).join('')}</div>`;
  $('modal').hidden = false;
  $('close-modal').onclick = () => ($('modal').hidden = true);
}

function showEnd(won) {
  $('modal-body').innerHTML = `<div class="center-msg"><div class="muted">${won ? 'Todas as 50 ondas vencidas' : 'Suas vidas acabaram'}</div>
    <div class="big">${won ? 'Vitória!' : `Nível ${game.level}`}</div>
    <p class="hint">${game.kills} inimigos derrotados · ${game.towers().length} torres</p>
    <button class="btn primary" id="restart">Jogar de novo</button></div>`;
  $('modal').hidden = false;
  $('restart').onclick = () => { $('modal').hidden = true; start(); };
}

// ---------- Floating text ----------
const floaters = [];
function floatText(x, y, text, cls) {
  const el = document.createElement('div');
  el.className = 'floater ' + cls; el.textContent = text;
  $('floaters').appendChild(el);
  floaters.push({ el, x: x / CELL, y: y / CELL, t: 0 });
  if (floaters.length > 60) floaters.shift().el.remove();
}
function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += dt;
    const p = view.project(f.x, f.y, 2 + f.t * 2.5);
    f.el.style.left = p.x + 'px'; f.el.style.top = p.y + 'px';
    f.el.style.opacity = String(Math.max(0, 1 - f.t / 0.9));
    if (f.t > 0.9) { f.el.remove(); floaters.splice(i, 1); }
  }
}

// ---------- Input ----------
const pointers = new Map();
let drag = null, pinch = null;
const canvas = $('game');

function tlFromPoint(cx, cy) {
  const p = view.pick(cx, cy);
  if (!p) return null;
  return { x: Math.round(p.x) - 1, y: Math.round(p.y) - 1, fx: p.x, fy: p.y };
}

canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: view.view.dist };
    drag = null;
  } else {
    drag = { x: ev.clientX, y: ev.clientY, moved: false, target: view.view.target.clone(), button: ev.button };
  }
});
canvas.addEventListener('pointermove', (ev) => {
  if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const want = pinch.dist * pinch.d / Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
    zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, want / view.view.dist);
    return;
  }
  if (drag && pointers.has(ev.pointerId)) {
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    if (drag.moved) {
      const k = view.view.dist / canvas.clientHeight * 0.9;
      view.view.target.x = drag.target.x - dx * k;
      view.view.target.z = drag.target.z - dy * k / Math.sin(view.view.pitch);
      view.setHover(null);
      return;
    }
  }
  if (ev.pointerType === 'mouse') updateHover(ev.clientX, ev.clientY);
});
function updateHover(cx, cy) {
  if (game.phase !== 'build') { view.setHover(null); canvas.style.cursor = 'default'; return; }
  const tl = tlFromPoint(cx, cy);
  if (!tl || tl.x < 0 || tl.y < 0 || tl.x > game.grid.w - 2 || tl.y > game.grid.h - 2) { canvas.style.cursor = 'default'; return view.setHover(null); }
  const ent = game.entityAt(Math.floor(tl.fx), Math.floor(tl.fy));
  if (ent) { view.setHover(null); canvas.style.cursor = 'pointer'; return; }
  canvas.style.cursor = 'crosshair';
  view.setHover(tl, game.canPlace(tl.x, tl.y));
}
const endPointer = (ev) => {
  const wasPinch = !!pinch;
  pointers.delete(ev.pointerId);
  if (pointers.size < 2) pinch = null;
  if (wasPinch) { drag = null; return; }
  if (drag && !drag.moved && drag.button === 0) onTap(ev.clientX, ev.clientY);
  drag = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', (ev) => { pointers.delete(ev.pointerId); pinch = null; drag = null; });
canvas.addEventListener('pointerleave', () => view.setHover(null));
canvas.addEventListener('wheel', (ev) => {
  ev.preventDefault();
  zoomAt(ev.clientX, ev.clientY, Math.exp(ev.deltaY * 0.0012));
}, { passive: false });
// Zoom keeping the point under the cursor in place.
function zoomAt(cx, cy, factor) {
  const v = view.view;
  const before = view.pick(cx, cy);
  const old = v.dist;
  v.dist = Math.min(v.maxDist, Math.max(v.minDist, v.dist * factor));
  if (!before) return;
  const k = 1 - v.dist / old;
  v.target.x += (before.x - v.target.x) * k;
  v.target.z += (before.y - v.target.z) * k;
}
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

function onTap(cx, cy) {
  const tl = tlFromPoint(cx, cy);
  if (!tl) return;
  const ent = game.entityAt(Math.floor(tl.fx), Math.floor(tl.fy));
  if (ent) { select(ent.uid === selectedUid ? null : ent.uid); return; }
  if (game.phase === 'build' && game.canPlace(tl.x, tl.y)) {
    const e = game.place(tl.x, tl.y);
    if (game.phase === 'choose') select(e.uid);
    else select(null);
    return;
  }
  select(null);
}

function setSpeed(s) {
  speed = s;
  for (const v of [1, 2, 4]) $('sp' + v).setAttribute('aria-pressed', String(v === s));
}
for (const v of [1, 2, 4]) $('sp' + v).onclick = () => setSpeed(v);
$('btn-luck').onclick = () => game.upgradeQuality();
$('btn-recipes').onclick = showRecipes;
$('modal').addEventListener('click', (ev) => { if (ev.target === $('modal') && game.phase !== 'over' && game.phase !== 'won') $('modal').hidden = true; });
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') { $('modal').hidden = true; select(null); }
  if (ev.key === '1') setSpeed(1);
  if (ev.key === '2') setSpeed(2);
  if (ev.key === '4') setSpeed(4);
});
window.addEventListener('resize', () => view.resize());

// ---------- Loop ----------
let last = performance.now(), uiTimer = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  let sim = dt * speed;
  while (sim > 0) { const s = Math.min(sim, 1 / 40); game.update(s); sim -= s; }
  view.drainFx(floatText);
  view.frame(dt);
  updateFloaters(dt);
  uiTimer += dt;
  if (uiTimer > 0.5 && selectedUid && game.phase === 'wave') { uiTimer = 0; renderSelection(); }
  requestAnimationFrame(loop);
}

start();
window.__game = () => game; // handy for debugging in the console
requestAnimationFrame(loop);
