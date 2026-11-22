// Start menu and difficulty screen (parchment layers above the board).
import parchUrl from './assets/pergaminho.jpg';
import dragonUrl from './assets/dragao_ninho.jpg';
import { DIFFICULTIES } from './game.js';
import { getRecords, bestOverall } from './records.js';

const $ = (id) => document.getElementById(id);
const store = () => { try { return window.localStorage; } catch { return null; } };

document.documentElement.style.setProperty('--parch-img', `url("${parchUrl}")`);
document.documentElement.style.setProperty('--dragon-img', `url("${dragonUrl}")`);

let cb = {};

export function initMenu(callbacks) {
  cb = callbacks;
  $('m-play').onclick = showLevels;
  $('m-ranking').onclick = () => cb.onRanking?.();
  $('m-book').onclick = () => cb.onBook?.();
  $('lv-back').onclick = showMenu;
}

export function screensOpen() { return !$('scr-menu').hidden || !$('scr-levels').hidden; }

// While a parchment screen is up, the match HUD and dock underneath must not take clicks or keyboard focus.
function setMatchInert(on) {
  for (const el of [document.querySelector('.hud'), $('dock'), $('game')]) if (el) el.inert = on;
}

export function hideScreens() { $('scr-menu').hidden = true; $('scr-levels').hidden = true; setMatchInert(false); }

export function showMenu() {
  const best = bestOverall(store());
  $('m-record').textContent = best ? `Recorde: fase ${best.phase} · ${DIFFICULTIES[best.diffKey]?.name ?? ''}` : '';
  $('scr-levels').hidden = true;
  $('scr-menu').hidden = false;
  setMatchInert(true);
}

export function showLevels() {
  const recs = getRecords(store());
  $('banners').innerHTML = Object.entries(DIFFICULTIES).map(([key, d]) => `
    <button class="banner${d.lives === 1 ? ' danger' : ''}" data-diff="${key}">
      ${d.name}<span class="n">${d.lives}</span><small>${d.lives === 1 ? 'vida' : 'vidas'}</small>
      ${recs[key] ? `<span class="rec">Recorde ${recs[key].phase}</span>` : ''}
    </button>`).join('');
  $('banners').querySelectorAll('[data-diff]').forEach((b) => { b.onclick = () => { hideScreens(); cb.onPlay?.(b.dataset.diff); }; });
  $('scr-menu').hidden = true;
  $('scr-levels').hidden = false;
  setMatchInert(true);
}
