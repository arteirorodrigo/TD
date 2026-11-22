import { Game, DIFFICULTIES, STONES_PER_ROUND, QUALITY_ODDS, qualityUpgradeCost, toWorld } from './game.js';
import { Renderer } from './render.js';
import { TOWERS, QUALITIES, CELL, abilityText, tierTag, tierLabel } from './data/towers.js';
import { waveFor, HP_MULT, SPEED_MULT, ABILITY_TEXT } from './data/enemies.js';
import { initMenu, showMenu, hideScreens, screensOpen } from './menu.js';
import { submitRecord } from './records.js';

const $ = (id) => document.getElementById(id);
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const fmt = (n) => (n >= 10000 ? Math.round(n / 1000) + 'k' : Math.round(n).toLocaleString('pt-BR'));
const ODDS_COLORS = ['#7c8798', '#4fb0ff', '#5fe3c0', '#c58bff', '#ffcc4d'];

let game, view, selectedUid = null, selectedEnemyUid = null, speed = 1;

const store = () => { try { return window.localStorage; } catch { return null; } };

function start(difficulty = 'medio') {
  game = new Game({ difficulty });
  $('modal').hidden = true;
  hideScreens();
  if (view) setSpeed(1);
  if (!view) view = new Renderer($('game'), game);
  else { view.game = game; for (const m of view.meshes.values()) view.disposeGroup(m); view.meshes.clear(); for (const m of view.enemyMeshes.values()) view.disposeGroup(m); view.enemyMeshes.clear(); }
  game.on((type) => {
    if (type === 'change') { view.refreshCells(); renderUI(); }
    if (type === 'over') showEnd();
  });
  selectedUid = null; selectedEnemyUid = null;
  view.refreshCells();
  renderUI();
}

// ---------- UI ----------
function phaseText() {
  const p = game.phase;
  if (p === 'build') return `Coloque ${STONES_PER_ROUND - game.pending.length} pedra${STONES_PER_ROUND - game.pending.length === 1 ? '' : 's'} no mapa`;
  if (p === 'choose') return 'Escolha uma escama para manter, combinar ou chocar um dragão';
  if (p === 'wave') return `Onda ${game.level} em andamento`;
  return 'Fim de jogo';
}

function renderUI() {
  $('hud-level').textContent = game.level;
  $('hud-diff').textContent = DIFFICULTIES[game.difficulty].name;
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
      b.innerHTML = `<span><span class="swatch" style="color:${hex(e.def.color)};background:${hex(e.def.color)}"></span>${e.def.base ? tierTag(e.def.quality) : ""}</span>`;
      b.title = e.def.name;
      b.onclick = () => select(e.uid);
    } else { b.textContent = i + 1; b.disabled = true; }
    slots.appendChild(b);
  }

  // Luck
  const odds = QUALITY_ODDS[game.qualityLevel];
  $('odds').innerHTML = odds.map((p, i) => (p ? `<span style="width:${p}%;background:${ODDS_COLORS[i]}" title="${QUALITIES[i]} ${p}%"></span>` : '')).join('');
  $('odds-legend').innerHTML = odds.map((p, i) => `<span style="color:${p ? ODDS_COLORS[i] : ''}" title="${QUALITIES[i]}">${tierTag(i)} ${p}%</span>`).join('');
  $('luck-level').textContent = `Nível ${game.qualityLevel}`;
  const maxed = game.qualityLevel >= QUALITY_ODDS.length - 1;
  const cost = qualityUpgradeCost(game.qualityLevel);
  const lb = $('btn-luck');
  lb.textContent = maxed ? 'Máximo' : `Melhorar (${cost} ouro)`;
  lb.disabled = maxed || game.gold < cost;

  renderCombos();
  renderWave();
  renderSelection();
}

function comboLabel(c) {
  const name = (id) => TOWERS[id].name;
  if (c.kind === 'combine') return `${c.uids.length} × ${name(game.entities.get(c.anchor).def.id)} → <b>${name(c.result)}</b>`;
  const dragon = c.uids.map((u) => game.entities.get(u)).find((e) => !e.pending && !e.def.base);
  return dragon ? `Evoluir ${dragon.def.name} → <b>${name(c.result)}</b>` : `Chocar <b>${name(c.result)}</b>`;
}

function renderCombos() {
  const combos = game.roundCombos();
  view.showCombos(combos);
  $('combo-card').hidden = !combos.length;
  if (!combos.length) return;
  const can = game.phase === 'choose';
  $('combos').innerHTML = combos.map((c, i) => `<div class="combo"><span>${comboLabel(c)}</span>
    <button class="btn ${c.kind === 'special' ? 'special' : ''}" data-combo="${i}" ${can ? '' : 'disabled title="Coloque as 5 pedras primeiro"'}>${c.kind === 'special' ? 'Chocar' : 'Combinar'}</button></div>`).join('')
    + (can ? '' : '<p class="hint" style="margin:6px 0 0">Coloque as 5 pedras para escolher.</p>');
  $('combos').querySelectorAll('[data-combo]').forEach((b) => b.onclick = () => {
    const c = combos[+b.dataset.combo];
    if (c.kind === 'combine') game.combine(c.anchor); else game.special(c.anchor, c.result);
    renderUI();
  });
}

function renderWave() {
  const units = waveFor(game.level);
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

function enemyEffects(en) {
  const out = [];
  if (en.slow.t > 0) out.push('Lento');
  if (en.frost.t > 0) out.push('Congelado');
  if (en.poison.t > 0) out.push('Envenenado');
  if (en.stun > 0) out.push('Atordoado');
  if (en.shred.t > 0) out.push('Armadura reduzida');
  return out;
}

function renderEnemyCard(card, en) {
  const t = en.type;
  const f = Math.max(0, en.hp / en.maxHp);
  const fx = enemyEffects(en);
  card.innerHTML = `<h2>${t.name}</h2>
    ${t.boss ? '<span class="tag boss">Chefe</span>' : ''}${t.air ? '<span class="tag air">Voador</span>' : '<span class="tag">Terrestre</span>'}
    <div class="hpbar"><span style="width:${(f * 100).toFixed(1)}%;background:hsl(${Math.round(120 * f)},80%,50%)"></span></div>
    <div class="hptext">Vida ${fmt(Math.max(0, Math.ceil(en.hp)))} / ${fmt(en.maxHp)}</div>
    <dl class="stats">
      <dt>Armadura</dt><dd>${Math.round(game.effArmor(en))}</dd>
      <dt>Velocidade</dt><dd>${(Math.round(t.speed * SPEED_MULT / CELL * 10) / 10).toString().replace('.', ',')} q/s</dd>
    </dl>
    <div>${fx.length ? fx.map((x) => `<span class="tag">${x}</span>`).join('') : '<span class="muted">Sem efeitos</span>'}</div>`;
}

function ingredientName(id) {
  const t = TOWERS[id];
  return t.base ? `${t.name} · ${tierTag(t.quality)}` : t.name;
}
function evolutionHtml(e) {
  const evos = game.evolutionInfo(e.uid);
  if (!evos.length) return '<div class="evo"><h3>Próxima evolução</h3><p class="muted">Estágio final</p></div>';
  return '<div class="evo"><h3>Próxima evolução</h3>' + evos.map((ev) => `
    <div class="evo-item"><b style="color:${hex(TOWERS[ev.result].color)}">${TOWERS[ev.result].name}</b>
      <ul>${ev.items.map((it) => `<li class="${it.have ? 'ok' : 'no'}">${it.have ? '✓' : '✗'} ${ingredientName(it.id)}${it.self ? ' (este)' : ''}</li>`).join('')}</ul>
    </div>`).join('') + '</div>';
}

function renderSelection() {
  const card = $('sel-card');
  if (selectedEnemyUid) {
    const en = game.enemies.get(selectedEnemyUid);
    if (!en?.alive || !game.visible(en)) { selectedEnemyUid = null; view.showEnemySelection(null); card.hidden = true; return; }
    card.hidden = false;
    view.showSelection(null);
    view.showEnemySelection(en.uid);
    renderEnemyCard(card, en);
    return;
  }
  view?.showEnemySelection(null);
  const e = selectedUid && game.entities.get(selectedUid);
  if (!e) { card.hidden = true; view?.showSelection(null); return; }
  card.hidden = false;
  view.showSelection(e);
  if (e.kind === 'rock') {
    const can = game.phase === 'build' || game.phase === 'choose';
    card.innerHTML = `<h2>Pedra</h2><p class="hint">Bloqueia o caminho como as escamas, mas não ataca.</p>
      <div class="actions"><button class="btn" id="act-remove" ${can ? '' : 'disabled'}>Remover pedra</button></div>
      ${can ? '' : '<p class="hint">Só dá para remover entre as ondas.</p>'}`;
    $('act-remove').onclick = () => { game.removeRock(e.uid); select(null); };
    return;
  }
  const def = e.def;
  let html = `<h2><span class="swatch" style="color:${hex(def.color)};background:${hex(def.color)}"></span>${def.name}</h2>`;
  if (def.base) html += `<div class="tier">${tierLabel(def.quality)}</div>`;
  if (e.pending) html += '<span class="tag">Nova nesta rodada</span>';
  else if (!def.base) html += '<span class="tag boss">Dragão</span>';
  html += towerStats(def, e);
  if (!def.base && !e.pending) html += evolutionHtml(e);
  const actions = [];
  if (game.phase === 'choose') {
    if (e.pending) actions.push(`<button class="btn primary" data-act="keep">Manter esta escama</button>`);
    const ci = game.combineInfo(e.uid);
    if (ci) actions.push(`<button class="btn" data-act="combine">Combinar ${ci.steps === 2 ? '4' : '2'} iguais → ${TOWERS[ci.result].name}</button>`);
    for (const o of game.specialOptions(e.uid)) actions.push(`<button class="btn special" data-act="special" data-id="${o.result}">Chocar ${TOWERS[o.result].name}</button>`);
  }
  if (actions.length) html += `<div class="actions">${actions.join('')}</div>`;
  else if (game.phase === 'choose' && !e.pending) html += '<p class="hint">Selecione uma das escamas novas para decidir a rodada.</p>';
  if (e.pending && game.phase === 'build') html += '<p class="hint">Coloque todas as pedras para decidir qual escama manter.</p>';
  card.innerHTML = html;
  card.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
    const act = b.dataset.act;
    if (act === 'keep') game.keep(e.uid);
    if (act === 'combine') game.combine(e.uid);
    if (act === 'special') game.special(e.uid, b.dataset.id);
    renderUI();
  });
}

// A boss opens its card by itself when it enters the map (once per boss), unless the player is already watching an enemy.
let bossShown = null;
function autoSelectBoss() {
  if (game.phase !== 'wave' || selectedEnemyUid || screensOpen()) return;
  for (const en of game.enemies.values()) {
    if (en.type.boss && en.alive && en.uid !== bossShown && game.visible(en)) { bossShown = en.uid; selectEnemy(en.uid); return; }
  }
}

function select(uid) { selectedUid = uid; selectedEnemyUid = null; renderUI(); }
function selectEnemy(uid) { selectedUid = null; selectedEnemyUid = uid; renderSelection(); }

function showRecipes({ inGame = true } = {}) {
  const have = new Map();
  if (inGame) for (const e of game.entities.values()) if (e.kind === 'gem') have.set(e.def.id, (have.get(e.def.id) || 0) + 1);
  const specials = Object.values(TOWERS).filter((t) => !t.base);
  const card = (t) => {
    const recipes = [t.recipe, t.alt].filter(Boolean);
    const ready = recipes.some((r) => { const c = new Map(have); return r.every((i) => { const n = c.get(i) || 0; c.set(i, n - 1); return n > 0; }); });
    return `<div class="recipe ${ready ? 'ready' : ''}"><b><span class="swatch" style="color:${hex(t.color)};background:${hex(t.color)}"></span>${t.name}</b>
      <div class="muted" style="font-size:12px">Dano ${fmt(t.dmg)} · ${t.rate}s · ${t.range >= 5000 ? 'mapa todo' : (t.range / CELL).toFixed(1).replace('.', ',') + ' q'}</div>
      ${recipes.map((r, i) => `<div>${i ? '<span class="muted" style="font-size:12px">ou </span>' : ''}${r.map((id) => `<span class="ing ${have.get(id) ? 'have' : ''}">${TOWERS[id].name}</span>`).join('')}</div>`).join('')}
      <div class="muted" style="font-size:12px;margin-top:4px">${t.abilities.map(abilityText).join(' · ')}</div></div>`;
  };
  $('modal-body').className = 'sheet' + (inGame ? '' : ' parch');
  $('modal-body').innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><h2>${inGame ? 'Dragões' : 'Livro dos Dragões'}</h2><button class="btn" id="close-modal">Fechar</button></div>
    <p class="hint">Cada dragão nasce de uma combinação de escamas. Na fase de escolha, selecione uma escama da receita para chocar o dragão.${inGame ? ' Ingredientes em destaque já estão no mapa.' : ''}</p>
    <div class="recipes">${specials.map(card).join('')}</div>`;
  $('modal').hidden = false;
  $('close-modal').onclick = () => ($('modal').hidden = true);
}

function showEnd() {
  const { isNew } = submitRecord(store(), game.difficulty, game.level, game.lives);
  $('modal-body').className = 'sheet narrow';
  $('modal-body').innerHTML = `<div class="center-msg"><div class="muted">${game.quitted ? 'Você deixou o ninho' : 'Suas vidas acabaram'} · ${DIFFICULTIES[game.difficulty].name}</div>
    <div class="big">Você chegou à fase ${game.level}</div>
    ${isNew ? '<div class="new-record">Novo recorde!</div>' : ''}
    <p class="hint">${game.kills} inimigos derrotados · ${game.towers().length} defensores</p>
    <div class="end-actions"><button class="btn primary" id="restart">Jogar de novo</button><button class="btn" id="to-menu">Menu</button></div></div>`;
  $('modal').hidden = false;
  $('restart').onclick = () => start(game.difficulty);
  $('to-menu').onclick = () => { $('modal').hidden = true; showMenu(); };
}

function showRanking() {
  $('modal-body').className = 'sheet parch narrow';
  $('modal-body').innerHTML = `<div class="center-msg"><h2>Ranking</h2>
    <p class="hint">Em breve: ranking com jogadores do mundo todo.</p>
    <button class="btn" id="close-modal">Fechar</button></div>`;
  $('modal').hidden = false;
  $('close-modal').onclick = () => ($('modal').hidden = true);
}

function confirmQuit() {
  if (game.phase === 'over' || screensOpen()) return;
  $('modal-body').className = 'sheet narrow';
  $('modal-body').innerHTML = `<div class="center-msg"><h2>Sair da partida?</h2>
    <p class="hint">A fase atual conta como seu resultado.</p>
    <div class="end-actions"><button class="btn primary" id="quit-yes">Sair</button><button class="btn" id="quit-no">Continuar jogando</button></div></div>`;
  $('modal').hidden = false;
  $('quit-no').onclick = () => ($('modal').hidden = true);
  $('quit-yes').onclick = () => game.quit();
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
let drag = null;
const canvas = $('game');

function tlFromPoint(cx, cy) {
  const p = view.pick(cx, cy);
  if (!p) return null;
  // Snap to the 2x2 build grid (cells start on odd squares).
  return { x: 2 * Math.floor((p.x - 1) / 2) + 1, y: 2 * Math.floor((p.y - 1) / 2) + 1, fx: p.x, fy: p.y };
}

// Zoom in to place stones comfortably; zooming out stops at the full-map view and panning stays inside the map.
const pointers = new Map();
let pinch = null;
canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
  pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: view.view.dist };
    drag = null;
  } else {
    drag = { x: ev.clientX, y: ev.clientY, id: ev.pointerId, button: ev.button, moved: false, target: view.view.target.clone() };
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
  if (drag && drag.id === ev.pointerId) {
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 10) drag.moved = true;
    if (drag.moved) {
      const k = (2 * view.view.dist * Math.tan(THREE_DEG(view.camera.fov) / 2)) / canvas.clientHeight;
      view.view.target.x = drag.target.x - dx * k;
      view.view.target.z = drag.target.z - dy * k;
      view.setHover(aimSpot, true);
      return;
    }
  }
  if (ev.pointerType === 'mouse') updateHover(ev.clientX, ev.clientY);
});
const THREE_DEG = (d) => (d * Math.PI) / 180;
function updateHover(cx, cy) {
  if (aimSpot) return; // keep the chosen spot highlighted until confirmed or cancelled
  if (game.phase !== 'build') { view.setHover(null); canvas.style.cursor = 'default'; return; }
  const tl = tlFromPoint(cx, cy);
  if (!tl || tl.x < 0 || tl.y < 0 || tl.x > game.grid.w - 2 || tl.y > game.grid.h - 2) { canvas.style.cursor = 'default'; return view.setHover(null); }
  const ent = game.entityAt(Math.floor(tl.fx), Math.floor(tl.fy));
  if (ent) { view.setHover(null); canvas.style.cursor = 'pointer'; return; }
  canvas.style.cursor = 'crosshair';
  view.setHover(tl, game.canPlace(tl.x, tl.y));
}
canvas.addEventListener('pointerup', (ev) => {
  const wasPinch = !!pinch;
  pointers.delete(ev.pointerId);
  if (pointers.size < 2) pinch = null;
  if (!wasPinch && drag && drag.id === ev.pointerId && drag.button === 0 && !drag.moved) onTap(ev.clientX, ev.clientY);
  if (drag?.id === ev.pointerId || wasPinch) drag = null;
});
canvas.addEventListener('pointercancel', (ev) => { pointers.delete(ev.pointerId); pinch = null; drag = null; });
canvas.addEventListener('pointerleave', () => { if (!aimSpot) view.setHover(null); });
canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); zoomAt(ev.clientX, ev.clientY, Math.exp(ev.deltaY * 0.0012)); }, { passive: false });
// Zoom keeping the point under the cursor/fingers in place.
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
function resetView() { view.view.dist = view.fit.dist; view.view.target.copy(view.fit.target); }
$('btn-fit').onclick = resetView;
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

// Placing is two steps: tap marks the spot (preview), then confirm (button, Enter, or tapping the same spot).
let aimSpot = null;
function setAim(tl) {
  aimSpot = tl;
  view.setGhost(tl);
  $('confirm').hidden = !tl;
  if (tl) view.setHover(tl, true); else view.setHover(null);
}
function confirmPlace() {
  if (!aimSpot) return;
  const { x, y } = aimSpot;
  setAim(null);
  if (!game.canPlace(x, y)) return;
  const e = game.place(x, y);
  if (game.phase === 'choose') select(e.uid);
  else select(null);
}
function onTap(cx, cy) {
  const tl = tlFromPoint(cx, cy);
  if (!tl) return;
  const ent = game.entityAt(Math.floor(tl.fx), Math.floor(tl.fy));
  if (ent) { setAim(null); select(ent.uid === selectedUid ? null : ent.uid); return; }
  const en = game.enemyNear(tl.fx, tl.fy);
  if (en) { setAim(null); selectEnemy(en.uid === selectedEnemyUid ? null : en.uid); return; }
  if (game.phase === 'build') {
    if (aimSpot && aimSpot.x === tl.x && aimSpot.y === tl.y) { confirmPlace(); return; }
    if (game.canPlace(tl.x, tl.y)) { select(null); setAim({ x: tl.x, y: tl.y }); return; }
    setAim(null);
    const inMap = tl.x >= 0 && tl.y >= 0 && tl.x <= game.grid.w - 2 && tl.y <= game.grid.h - 2;
    if (inMap) floatText((tl.x + 1) * CELL, (tl.y + 1) * CELL, game.grid.canBuildAt(tl.x, tl.y) ? 'Fecha o caminho' : 'Não dá para colocar aqui', 'leak');
    return;
  }
  select(null);
}
$('confirm-ok').onclick = confirmPlace;
$('confirm-cancel').onclick = () => setAim(null);
function updateConfirm() {
  if (!aimSpot) return;
  if (game.phase !== 'build') { setAim(null); return; }
  const p = view.project(aimSpot.x + 1, aimSpot.y + 1, 0);
  const el = $('confirm');
  el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
}

function setSpeed(s) {
  speed = s;
  for (const v of [1, 2, 4]) $('sp' + v).setAttribute('aria-pressed', String(v === s));
}
for (const v of [1, 2, 4]) $('sp' + v).onclick = () => setSpeed(v);
$('btn-luck').onclick = () => game.upgradeQuality();
$('btn-recipes').onclick = () => showRecipes();
$('btn-menu').onclick = confirmQuit;
// The end-of-match sheet only closes through its own buttons; other sheets close by tapping outside or Escape.
const modalDismissable = () => screensOpen() || game.phase !== 'over';
$('modal').addEventListener('click', (ev) => { if (ev.target === $('modal') && modalDismissable()) $('modal').hidden = true; });
window.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && modalDismissable()) $('modal').hidden = true;
  if (screensOpen()) return; // menu on top: match controls are off
  if (ev.key === 'Escape') { select(null); setAim(null); }
  if (ev.key === 'Enter' && aimSpot) confirmPlace();
  if (ev.key === '1') setSpeed(1);
  if (ev.key === '2') setSpeed(2);
  if (ev.key === '4') setSpeed(4);
  if (ev.key === '0') resetView();
});
window.addEventListener('resize', () => view.resize());

// ---------- Loop ----------
let last = performance.now(), uiTimer = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  let sim = screensOpen() || game.phase === 'over' ? 0 : dt * speed;
  while (sim > 0) { const s = Math.min(sim, 1 / 40); game.update(s); sim -= s; }
  view.drainFx(floatText);
  view.frame(dt);
  updateFloaters(dt);
  updateConfirm();
  uiTimer += dt;
  autoSelectBoss();
  if (selectedEnemyUid && uiTimer > 0.1) { uiTimer = 0; renderSelection(); }
  else if (uiTimer > 0.5 && selectedUid && game.phase === 'wave') { uiTimer = 0; renderSelection(); }
  requestAnimationFrame(loop);
}

start();
initMenu({ onPlay: (diff) => start(diff), onBook: () => showRecipes({ inGame: false }), onRanking: showRanking });
showMenu();
window.__game = () => game; // handy for debugging in the console
window.__view = () => view;
window.__towers = TOWERS;
requestAnimationFrame(loop);
