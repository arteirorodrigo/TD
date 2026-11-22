// Fundo do mapa em estilo "mapa do tesouro" em pergaminho — TESTE com 3 versões.
// Tudo é desenhado aqui por código (nenhuma imagem de fora): papel envelhecido, manchas,
// bordas queimadas, rota pontilhada da entrada (E) à saída (S) pelos pontos 1–6,
// rosa dos ventos e um X na saída. Ver com ?mapa=1, 2 ou 3.
// 4, 5 e 6: "mapa de ilha" ilustrado (referência do dono, tema dragões): 4 completo, 5 limpo, 6 envelhecido.
import { MAP } from './map.js';

export const MAP_STYLE = (() => {
  try { return +(new URLSearchParams(location.search).get('mapa') || 0); } catch { return 0; }
})();

// Ruído simples e repetível (o mapa sai igual toda vez).
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function valueNoise(seed) {
  const r = rng(seed), N = 64, g = Array.from({ length: N * N }, () => r());
  const at = (x, y) => g[((y % N + N) % N) * N + ((x % N + N) % N)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
function fbm(n, x, y, oct = 5) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += a * n(x * f, y * f); f *= 2; a *= 0.5; } return v; }

const STYLES = {
  // 1: pergaminho claro, rota vermelha pontilhada
  1: { paper: [236, 214, 168], dark: [176, 124, 64], stain: 0.35, burn: 0.55, ink: '#5a2a12', route: '#8a1a10', lands: false, dash: [2, 14], width: 9 },
  // 2: como a referência — terras com contorno de tinta, mar mais claro
  2: { paper: [240, 216, 160], dark: [196, 120, 40], stain: 0.45, burn: 0.7, ink: '#6a2a10', route: '#5a1408', lands: true, dash: [2, 13], width: 9 },
  // 3: pergaminho escuro e queimado, rota tracejada em tinta preta
  3: { paper: [205, 170, 115], dark: [110, 66, 28], stain: 0.6, burn: 1, ink: '#2a160a', route: '#1e0e06', lands: false, dash: [22, 14], width: 7, doodles: true },
};

export function makeParchmentCanvas(style = MAP_STYLE, size = 2048) {
  if (style >= 4) return makeIslandCanvas(style, size);
  const st = STYLES[style] || STYLES[1];
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const W = MAP.w, H = MAP.h, S = size / W; // pixels per square
  const toPx = (gx, gy) => [(gx + 1) * S, (gy + 1) * S]; // centre of a 2x2 waypoint

  // Papel: cor base + manchas + bordas queimadas, pixel a pixel numa resolução menor (rápido) e ampliado.
  const R = 512, img = x.createImageData(R, R), n1 = valueNoise(7 + style), n2 = valueNoise(99 + style);
  const landN = valueNoise(1234);
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const u = i / R, v = j / R;
    const grain = fbm(n1, u * 24, v * 24, 4);
    const blot = fbm(n2, u * 5, v * 5, 4);
    const edge = Math.min(u, v, 1 - u, 1 - v);
    const burn = Math.max(0, 1 - edge / (0.06 + 0.05 * fbm(n1, u * 9, v * 9, 3))) * st.burn;
    let k = 0.15 * grain + st.stain * Math.max(0, blot - 0.45) * 2 + burn * 0.9;
    let land = 0;
    if (st.lands) {
      land = fbm(landN, u * 3.2, v * 3.2, 5);
      if (land > 0.52) k += 0.28 + 0.2 * (land - 0.52) * 4; // terra mais escura/alaranjada
    }
    k = Math.min(1, k);
    const p = (j * R + i) * 4;
    for (let ch = 0; ch < 3; ch++) img.data[p + ch] = st.paper[ch] + (st.dark[ch] - st.paper[ch]) * k - (burn > 0.85 ? 90 * (burn - 0.85) * 6 : 0);
    img.data[p + 3] = 255;
  }
  const small = document.createElement('canvas'); small.width = small.height = R;
  small.getContext('2d').putImageData(img, 0, 0);
  x.imageSmoothingQuality = 'high';
  x.drawImage(small, 0, 0, size, size);

  // Contorno das terras (versão 2): marca a borda onde o ruído cruza o nível do litoral.
  if (st.lands) {
    x.fillStyle = st.ink; x.globalAlpha = 0.85;
    const step = 2;
    for (let j = 0; j < size; j += step) for (let i = 0; i < size; i += step) {
      const a = fbm(landN, (i / size) * 3.2, (j / size) * 3.2, 5) > 0.52;
      const b = fbm(landN, ((i + step) / size) * 3.2, (j / size) * 3.2, 5) > 0.52;
      const d = fbm(landN, (i / size) * 3.2, ((j + step) / size) * 3.2, 5) > 0.52;
      if (a !== b || a !== d) x.fillRect(i, j, 3, 3);
    }
    x.globalAlpha = 1;
  }

  // Desenhos à mão (versão 3): montanhas e árvores em tinta espalhadas longe da rota.
  if (st.doodles) {
    const r = rng(42);
    x.strokeStyle = st.ink; x.lineWidth = 4; x.globalAlpha = 0.55;
    for (let k = 0; k < 26; k++) {
      const px = (0.06 + r() * 0.88) * size, py = (0.06 + r() * 0.88) * size, s = 30 + r() * 30;
      x.beginPath();
      if (r() < 0.5) { x.moveTo(px - s, py); x.lineTo(px - s * 0.2, py - s * 1.1); x.lineTo(px + s * 0.3, py - s * 0.4); x.lineTo(px + s * 0.7, py - s * 0.9); x.lineTo(px + s * 1.2, py); }
      else { x.arc(px, py - s * 0.6, s * 0.35, 0, Math.PI * 2); x.moveTo(px, py - s * 0.25); x.lineTo(px, py + s * 0.2); }
      x.stroke();
    }
    x.globalAlpha = 1;
  }

  // Rota pontilhada E → 1 … 6 → S.
  const pts = MAP.waypoints.map(([gx, gy]) => toPx(gx, gy));
  x.save();
  x.strokeStyle = st.route; x.lineWidth = st.width; x.lineCap = 'round'; x.lineJoin = 'round';
  x.setLineDash(st.dash.map((v) => v * (size / 2048) * 1.4));
  x.shadowColor = 'rgba(60,20,0,.35)'; x.shadowBlur = 3;
  x.beginPath(); x.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i++) x.lineTo(...pts[i]);
  x.stroke();
  x.restore();

  // X na saída.
  const [ex, ey] = pts[pts.length - 1];
  x.strokeStyle = st.route; x.lineWidth = 16; x.lineCap = 'round';
  x.beginPath(); x.moveTo(ex - 40, ey - 70); x.lineTo(ex + 40, ey - 150); x.moveTo(ex - 40, ey - 150); x.lineTo(ex + 40, ey - 70); x.stroke();

  // Rosa dos ventos no canto livre (embaixo à direita).
  compass(x, size * 0.84, size * 0.86, size * 0.09, st.ink);
  return c;
}

function compass(x, cx, cy, r, ink) {
  x.save(); x.translate(cx, cy);
  x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 3; x.globalAlpha = 0.8;
  x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(0, 0, r * 0.82, 0, Math.PI * 2); x.stroke();
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4, L = k % 2 ? r * 0.6 : r * 1.05, w = k % 2 ? r * 0.08 : r * 0.13;
    x.save(); x.rotate(a);
    x.beginPath(); x.moveTo(0, -L); x.lineTo(w, 0); x.lineTo(0, w * 0.5); x.lineTo(-w, 0); x.closePath();
    k % 2 ? x.stroke() : x.fill();
    x.restore();
  }
  x.font = `700 ${Math.round(r * 0.32)}px Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('N', 0, -r * 1.25); x.fillText('S', 0, r * 1.25); x.fillText('L', r * 1.25, 0); x.fillText('O', -r * 1.25, 0);
  x.restore();
}

// ---------- Mapa de ilha ilustrado (4 completo, 5 limpo, 6 envelhecido) ----------
const ISLAND = {
  4: { paper: [232, 202, 146], sea: [238, 216, 172], ink: [92, 52, 22], route: '#b0185a', doodles: true, labels: true, aged: 0.35 },
  5: { paper: [236, 208, 152], sea: [242, 222, 180], ink: [110, 66, 30], route: '#b0185a', doodles: false, labels: false, aged: 0.25 },
  6: { paper: [200, 158, 96], sea: [182, 140, 82], ink: [60, 30, 10], route: '#7e0c32', doodles: true, labels: true, aged: 1.3 },
};

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function makeIslandCanvas(style, size) {
  const st = ISLAND[style] || ISLAND[4];
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const W = MAP.w;
  const route = MAP.waypoints.map(([gx, gy]) => [(gx + 1) / W, (gy + 1) / W]); // 0..1
  const nA = valueNoise(11), nB = valueNoise(77), nC = valueNoise(5);
  // "Terra" = perto da rota (a ilha abraça o caminho) + recortes de ruído; ilhotas onde o ruído é alto.
  const land = (u, v) => {
    let d = 9;
    for (let i = 0; i < route.length - 1; i++) d = Math.min(d, segDist(u, v, ...route[i], ...route[i + 1]));
    const coast = 0.1 + 0.07 * (fbm(nA, u * 3, v * 3, 5) - 0.5) * 2 + 0.03 * (fbm(nC, u * 9, v * 9, 3) - 0.5) * 2;
    const main = coast - d;
    const islet = (fbm(nB, u * 6, v * 6, 4) - 0.66) * 0.5;
    return Math.max(main, islet);
  };

  // Papel e mar, pixel a pixel (1024) com linhas de litoral duplas, depois ampliado.
  const R = 1024, img = x.createImageData(R, R);
  const ink = st.ink, off = 0.012, lw = 0.0022;
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const u = (i + 0.5) / R, v = (j + 0.5) / R;
    const f = land(u, v);
    const grain = fbm(nC, u * 30, v * 30, 3), blot = fbm(nB, u * 4, v * 4, 4);
    const base = f > 0 ? st.paper : st.sea;
    let k = 0.12 * grain + st.aged * Math.max(0, blot - 0.5) * 1.6;
    // margem rasgada escura
    const edge = Math.min(u, v, 1 - u, 1 - v) - 0.018 * fbm(nA, u * 40, v * 40, 2);
    const torn = edge < 0.012;
    let col = base.map((ch, n) => ch * (1 - k) + [150, 96, 40][n] * k);
    // sombra suave por dentro da costa (terra mais "alta")
    if (f > 0 && f < 0.02) col = col.map((ch, n) => ch * 0.92 + ink[n] * 0.08);
    // litoral: linha na costa e outra paralela no mar
    if (Math.abs(f) < lw || Math.abs(f + off) < lw * 0.7) col = col.map((ch, n) => ch * 0.25 + ink[n] * 0.75);
    if (torn) col = [62, 40, 26];
    else if (edge < 0.02) col = col.map((ch) => ch * 0.7);
    const p = (j * R + i) * 4;
    img.data[p] = col[0]; img.data[p + 1] = col[1]; img.data[p + 2] = col[2]; img.data[p + 3] = 255;
  }
  const small = document.createElement('canvas'); small.width = small.height = R;
  small.getContext('2d').putImageData(img, 0, 0);
  x.imageSmoothingQuality = 'high';
  x.drawImage(small, 0, 0, size, size);
  const inkCss = `rgb(${ink.join(',')})`;
  const S = size;

  // Moldura fina por dentro da borda rasgada.
  x.strokeStyle = inkCss; x.lineWidth = 3; x.globalAlpha = 0.7;
  x.strokeRect(S * 0.045, S * 0.045, S * 0.91, S * 0.91);
  x.globalAlpha = 1;

  // Bússola no mar (canto de baixo à direita) e linhas de navegação tracejadas saindo dela.
  const cx = S * 0.82, cy = S * 0.84, cr = S * 0.075;
  x.save(); x.strokeStyle = inkCss; x.lineWidth = 2; x.globalAlpha = 0.35; x.setLineDash([14, 12]);
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 + Math.PI / 8; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * S, cy + Math.sin(a) * S); x.stroke(); }
  x.restore();
  compass(x, cx, cy, cr, inkCss);

  const r = rng(2024);
  const onLandAwayFromRoute = (u, v, minD) => {
    if (land(u, v) < 0.02) return false;
    for (let i = 0; i < route.length - 1; i++) if (segDist(u, v, ...route[i], ...route[i + 1]) < minD) return false;
    return true;
  };
  if (st.doodles) {
    x.strokeStyle = inkCss; x.fillStyle = inkCss; x.lineWidth = 3.5; x.lineCap = 'round'; x.lineJoin = 'round';
    // Montanhas com sombreado de um lado.
    for (let k = 0, tries = 0; k < 14 && tries < 400; tries++) {
      const u = 0.08 + r() * 0.84, v = 0.08 + r() * 0.84;
      if (!onLandAwayFromRoute(u, v, 0.05)) continue;
      k++; mountain(x, u * S, v * S, 34 + r() * 30, r);
    }
    // Bosques: grupos de árvores redondinhas.
    for (let k = 0, tries = 0; k < 22 && tries < 600; tries++) {
      const u = 0.07 + r() * 0.86, v = 0.07 + r() * 0.86;
      if (!onLandAwayFromRoute(u, v, 0.035)) continue;
      k++; for (let t = 0; t < 3 + Math.floor(r() * 3); t++) tree(x, u * S + (t - 1.5) * 26 + r() * 8, v * S + r() * 14, 12 + r() * 5);
    }
    // Ondinhas no mar.
    x.lineWidth = 2.5; x.globalAlpha = 0.5;
    for (let k = 0, tries = 0; k < 26 && tries < 600; tries++) {
      const u = 0.07 + r() * 0.86, v = 0.07 + r() * 0.86;
      if (land(u, v) > -0.03) continue;
      k++; const px = u * S, py = v * S;
      x.beginPath(); x.moveTo(px - 22, py); x.quadraticCurveTo(px - 11, py - 9, px, py); x.quadraticCurveTo(px + 11, py - 9, px + 22, py); x.stroke();
    }
    x.globalAlpha = 1;
  }

  // Rota tracejada magenta E → 1 … 6 → S, com cantos arredondados.
  const pts = route.map(([u, v]) => [u * S, v * S]);
  x.save(); x.strokeStyle = st.route; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round'; x.setLineDash([26, 18]);
  x.beginPath(); x.moveTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) x.arcTo(...pts[i], ...pts[i + 1], 40);
  x.lineTo(...pts[pts.length - 1]); x.stroke(); x.restore();
  // Bandeirinha na entrada e X + ninho de ovos (o tesouro do covil) na saída.
  const [ex, ey] = pts[pts.length - 1], [sx, sy] = pts[0];
  x.strokeStyle = st.route; x.lineWidth = 12; x.lineCap = 'round';
  x.beginPath(); x.moveTo(ex - 30, ey - 100); x.lineTo(ex + 30, ey - 160); x.moveTo(ex - 30, ey - 160); x.lineTo(ex + 30, ey - 100); x.stroke();
  nest(x, ex + 110, ey - 120, inkCss);
  x.strokeStyle = inkCss; x.lineWidth = 4;
  x.beginPath(); x.moveTo(sx - 70, sy + 130); x.lineTo(sx - 70, sy + 40); x.stroke();
  x.fillStyle = st.route; x.beginPath(); x.moveTo(sx - 70, sy + 40); x.lineTo(sx - 20, sy + 58); x.lineTo(sx - 70, sy + 76); x.fill();

  if (st.labels) {
    x.fillStyle = inkCss; x.textAlign = 'center';
    const label = (t, u, v, px = 44) => { x.font = `italic 600 ${px}px Georgia, serif`; x.fillText(t, u * S, v * S); };
    label('Covil dos Dragões', 0.27, 0.9, 50);
    label('Mar das Brumas', 0.14, 0.56, 40);
    label('Ilha dos Orcs', 0.13, 0.1, 40);
    label('Picos de Fogo', 0.7, 0.255, 38);
    label('Floresta Élfica', 0.4, 0.37, 38);
    banner(x, S * 0.62, S * 0.95, 'O COVIL', inkCss, st.paper);
  }
  return c;
}

function mountain(x, px, py, s, r) {
  x.beginPath(); x.moveTo(px - s, py); x.lineTo(px - s * 0.1, py - s * 1.15); x.lineTo(px + s * 0.35, py - s * 0.5); x.lineTo(px + s * 0.6, py - s * 0.75); x.lineTo(px + s * 1.1, py); x.stroke();
  for (let h = 0; h < 4; h++) { const t = 0.25 + h * 0.18; x.beginPath(); x.moveTo(px - s * 0.1 + s * t * 0.4, py - s * 1.15 * (1 - t)); x.lineTo(px - s * 0.1 + s * t * 0.4 + s * 0.12, py - s * 1.15 * (1 - t) + s * 0.22); x.stroke(); }
}
function tree(x, px, py, s) {
  x.beginPath(); x.ellipse(px, py - s, s * 0.7, s, 0, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + s * 0.6); x.stroke();
}
function nest(x, px, py, ink) {
  x.save(); x.strokeStyle = ink; x.lineWidth = 3.5;
  x.beginPath(); x.ellipse(px, py + 18, 60, 20, 0, 0, Math.PI * 2); x.stroke();
  for (let k = -1; k <= 1; k++) { x.beginPath(); x.ellipse(px + k * 30, py - 4 - (k === 0 ? 8 : 0), 16, 24, 0, 0, Math.PI * 2); x.stroke(); }
  for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(px - 60 + k * 20, py + 30); x.lineTo(px - 44 + k * 20, py + 8); x.stroke(); }
  x.restore();
}
function banner(x, px, py, text, ink, paper) {
  x.save(); x.translate(px, py);
  x.fillStyle = `rgb(${paper.map((v) => v - 12).join(',')})`; x.strokeStyle = ink; x.lineWidth = 4;
  x.beginPath(); x.moveTo(-190, -34); x.quadraticCurveTo(0, -54, 190, -34); x.lineTo(190, 30); x.quadraticCurveTo(0, 10, -190, 30); x.closePath(); x.fill(); x.stroke();
  for (const sgn of [-1, 1]) { x.beginPath(); x.moveTo(sgn * 190, -20); x.lineTo(sgn * 250, -16); x.lineTo(sgn * 225, 8); x.lineTo(sgn * 250, 40); x.lineTo(sgn * 190, 30); x.fill(); x.stroke(); }
  x.fillStyle = ink; x.font = '700 50px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 0, -10);
  x.restore();
}
