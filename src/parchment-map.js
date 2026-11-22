// Fundo do mapa em estilo "mapa do tesouro" em pergaminho — TESTE com 3 versões.
// Tudo é desenhado aqui por código (nenhuma imagem de fora): papel envelhecido, manchas,
// bordas queimadas, rota pontilhada da entrada (E) à saída (S) pelos pontos 1–6,
// rosa dos ventos e um X na saída. Ver com ?mapa=1, 2 ou 3.
// 4, 5 e 6: "mapa de ilha" ilustrado (referência do dono, tema dragões): 4 completo, 5 limpo, 6 envelhecido.
import { MAP } from './map.js';

// Versões 10–12: o pergaminho é maior que a área de jogo (MARGEM quadrados de cada lado); moldura, título,
// bússola grande e serpente ficam nessa borda de fora, e o quadriculado só na parte de dentro.
export const mapMargin = (style = MAP_STYLE) => (style >= 10 ? 12 : 0); // 10–15

export const MAP_STYLE = (() => {
  try { const v = new URLSearchParams(location.search).get('mapa'); return v === null ? 22 : +v; } catch { return 22; } // 22 = mapa pergaminho (padrão); ?mapa=0 = gramado antigo
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

function compass(x, cx, cy, r, ink, eye = false) {
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
  if (eye) {
    // Olho de dragão no centro: amêndoa dourada com pupila em fenda.
    x.globalAlpha = 1; const e = r * 0.34;
    x.beginPath(); x.moveTo(-e, 0); x.quadraticCurveTo(0, -e * 0.95, e, 0); x.quadraticCurveTo(0, e * 0.95, -e, 0); x.closePath();
    x.fillStyle = '#e0a020'; x.fill(); x.lineWidth = 3; x.stroke();
    x.beginPath(); x.ellipse(0, 0, e * 0.13, e * 0.42, 0, 0, Math.PI * 2); x.fillStyle = ink; x.fill();
  }
  x.restore();
}

// Dragão voando (silhueta em tinta, virado para a direita; flip vira para a esquerda).
function flyingDragon(x, px, py, s, ink, flip = false, alpha = 0.9) {
  x.save(); x.translate(px, py); if (flip) x.scale(-1, 1); x.fillStyle = ink; x.strokeStyle = ink; x.globalAlpha = alpha; x.lineJoin = 'round';
  const wing = (ox, k, a) => {
    x.save(); x.translate(ox, 0); x.scale(k, k); x.globalAlpha = alpha * a;
    x.beginPath(); x.moveTo(0.05 * s, -0.06 * s); x.lineTo(0.2 * s, -0.55 * s); x.lineTo(-0.1 * s, -1.0 * s);
    x.quadraticCurveTo(-0.22 * s, -0.62 * s, -0.36 * s, -0.66 * s); x.quadraticCurveTo(-0.42 * s, -0.4 * s, -0.56 * s, -0.42 * s);
    x.quadraticCurveTo(-0.5 * s, -0.2 * s, -0.62 * s, -0.12 * s); x.lineTo(-0.25 * s, -0.02 * s); x.closePath(); x.fill();
    x.restore();
  };
  wing(0.18 * s, 0.8, 0.55); // asa de trás
  x.beginPath(); x.ellipse(0, 0, 0.36 * s, 0.11 * s, -0.08, 0, Math.PI * 2); x.fill(); // corpo
  x.beginPath(); x.moveTo(0.26 * s, -0.06 * s); x.quadraticCurveTo(0.5 * s, -0.12 * s, 0.6 * s, -0.3 * s); x.lineTo(0.86 * s, -0.25 * s);
  x.lineTo(0.66 * s, -0.17 * s); x.quadraticCurveTo(0.52 * s, 0.02 * s, 0.3 * s, 0.06 * s); x.closePath(); x.fill(); // pescoço e cabeça
  x.beginPath(); x.moveTo(0.62 * s, -0.29 * s); x.lineTo(0.56 * s, -0.42 * s); x.lineTo(0.68 * s, -0.3 * s); x.fill(); // chifre
  x.lineWidth = 0.07 * s; x.lineCap = 'round';
  x.beginPath(); x.moveTo(-0.3 * s, 0.02 * s); x.quadraticCurveTo(-0.75 * s, 0.25 * s, -1.05 * s, 0.02 * s); x.stroke(); // cauda
  x.beginPath(); x.moveTo(-1.05 * s, 0.02 * s); x.lineTo(-1.2 * s, -0.1 * s); x.lineTo(-1.14 * s, 0.1 * s); x.closePath(); x.fill(); // ponta da cauda
  wing(0, 1, 1); // asa da frente
  x.restore();
}

// Chama desenhada (início e fim da trilha, ao lado do título).
function flame(x, px, py, s, ink) {
  x.save(); x.translate(px, py); x.lineWidth = Math.max(2, s * 0.08); x.strokeStyle = ink;
  const drop = (k, col) => { x.beginPath(); x.moveTo(0, -s * k); x.bezierCurveTo(s * 0.55 * k, -s * 0.45 * k, s * 0.5 * k, s * 0.35 * k, 0, s * 0.4 * k); x.bezierCurveTo(-s * 0.5 * k, s * 0.35 * k, -s * 0.55 * k, -s * 0.2 * k, -s * 0.12 * k, -s * 0.55 * k); x.closePath(); x.fillStyle = col; x.fill(); };
  drop(1, '#d0302a'); x.stroke(); drop(0.6, '#f08a20'); drop(0.3, '#ffd060');
  x.restore();
}

// Caverna do covil: morro com boca escura e fogo lá dentro.
function cave(x, px, py, s, ink, paper) {
  x.save(); x.strokeStyle = ink; x.lineWidth = 4; x.fillStyle = `rgb(${paper.map((v) => v - 16).join(',')})`;
  x.beginPath(); x.moveTo(px - s * 1.4, py); x.quadraticCurveTo(px - s * 0.9, py - s * 1.3, px - s * 0.2, py - s * 1.5); x.quadraticCurveTo(px + s * 0.7, py - s * 1.6, px + s * 1.4, py); x.closePath(); x.fill(); x.stroke();
  for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(px + s * (0.2 + k * 0.18), py - s * (1.3 - k * 0.2)); x.lineTo(px + s * (0.35 + k * 0.18), py - s * (1.05 - k * 0.2)); x.stroke(); }
  x.beginPath(); x.moveTo(px - s * 0.55, py); x.quadraticCurveTo(px - s * 0.5, py - s * 0.95, px, py - s * 0.95); x.quadraticCurveTo(px + s * 0.5, py - s * 0.95, px + s * 0.55, py); x.closePath(); x.fillStyle = 'rgb(40,22,10)'; x.fill();
  x.restore();
  flame(x, px, py - s * 0.35, s * 0.42, ink);
}

// ---------- Mapa de ilha ilustrado (4 completo, 5 limpo, 6 envelhecido) ----------
const ISLAND = {
  4: { paper: [232, 202, 146], sea: [238, 216, 172], ink: [92, 52, 22], route: '#b0185a', doodles: true, labels: true, aged: 0.35 },
  5: { paper: [236, 208, 152], sea: [242, 222, 180], ink: [110, 66, 30], route: '#b0185a', doodles: false, labels: false, aged: 0.25 },
  6: { paper: [200, 158, 96], sea: [182, 140, 82], ink: [60, 30, 10], route: '#7e0c32', doodles: true, labels: true, aged: 1.3 },
  // 7–9: segunda referência do dono — mais rico: linhas de contorno no mar, pinheirais, vilas, castelo do covil,
  // duas bússolas, moldura numerada, manchas fortes.
  7: { paper: [226, 190, 130], sea: [232, 200, 146], ink: [58, 32, 14], route: '#c0202a', doodles: true, labels: true, aged: 0.8, rich: 1 },
  8: { paper: [238, 214, 166], sea: [244, 224, 184], ink: [80, 48, 22], route: '#c0202a', doodles: true, labels: true, aged: 0.35, rich: 0.55 },
  // 10–12: terceira referência (a favorita do dono): moldura grossa com faixas, título em fita no canto,
  // serpente-dragão no mar, teia de linhas da bússola. 10 clara, 11 média, 12 envelhecida.
  10: { paper: [238, 214, 166], sea: [244, 224, 184], ink: [86, 52, 24], route: '#d0302a', doodles: true, labels: true, aged: 0.35, rich: 0.6, ref3: true },
  11: { paper: [226, 190, 130], sea: [232, 200, 146], ink: [70, 40, 16], route: '#d0302a', doodles: true, labels: true, aged: 0.8, rich: 0.8, ref3: true },
  12: { paper: [204, 160, 98], sea: [212, 170, 108], ink: [50, 26, 10], route: '#b02020', doodles: true, labels: true, aged: 1.5, rich: 0.8, stains: true, ref3: true },
  // 13–15: referência do ilustrador do dono (terras dos dragões): dragões voando, caverna-covil com fogo,
  // chamas no início e no fim da trilha, olho de dragão na bússola. 13 clara, 14 média, 15 envelhecida.
  13: { paper: [238, 214, 166], sea: [244, 224, 184], ink: [86, 52, 24], route: '#d0302a', doodles: true, labels: true, aged: 0.35, rich: 0.6, ref3: true, dragons: true },
  14: { paper: [226, 190, 130], sea: [232, 200, 146], ink: [70, 40, 16], route: '#d0302a', doodles: true, labels: true, aged: 0.8, rich: 0.8, ref3: true, dragons: true },
  15: { paper: [204, 160, 98], sea: [212, 170, 108], ink: [50, 26, 10], route: '#b02020', doodles: true, labels: true, aged: 1.5, rich: 0.8, stains: true, ref3: true, dragons: true },
  9: { paper: [196, 150, 88], sea: [206, 162, 100], ink: [44, 22, 8], route: '#a01822', doodles: true, labels: true, aged: 1.6, rich: 1, stains: true },
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
  const m = mapMargin(style) / W, T = 1 + 2 * m; // u da área de jogo vai de 0 a 1; o papel vai de -m a 1+m
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
    const U = (i + 0.5) / R, V = (j + 0.5) / R; // posição no papel todo
    const u = U * T - m, v = V * T - m; // posição em relação à área de jogo
    const f = land(u, v);
    const grain = fbm(nC, u * 30, v * 30, 3), blot = fbm(nB, u * 4, v * 4, 4);
    const base = f > 0 ? st.paper : st.sea;
    let k = 0.12 * grain + st.aged * Math.max(0, blot - 0.5) * 1.6;
    // margem rasgada escura
    const edge = Math.min(U, V, 1 - U, 1 - V) - 0.018 * fbm(nA, U * 40, V * 40, 2);
    const torn = edge < 0.012;
    let col = base.map((ch, n) => ch * (1 - k) + [150, 96, 40][n] * k);
    // sombra suave por dentro da costa (terra mais "alta")
    if (f > 0 && f < 0.02) col = col.map((ch, n) => ch * 0.92 + ink[n] * 0.08);
    // litoral: linha na costa e outra paralela no mar
    if (Math.abs(f) < lw || Math.abs(f + off) < lw * 0.7) col = col.map((ch, n) => ch * 0.25 + ink[n] * 0.75);
    else if (st.rich && f < 0 && f > -0.075) {
      // linhas de contorno no mar, cada vez mais fracas longe da costa
      const t = (-f - off) / 0.016, ring = Math.abs(t - Math.round(t)) * 0.016;
      if (t > 0.5 && ring < lw * 0.55) { const a = 0.55 * (1 - (-f) / 0.075); col = col.map((ch, n) => ch * (1 - a) + ink[n] * a); }
    }
    if (st.stains) { const sd = fbm(nA, u * 7 + 3, v * 7 + 1, 4); if (sd > 0.66) col = col.map((ch) => ch * (1 - (sd - 0.66) * 1.4)); }
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
  const cx = S * (st.ref3 ? 0.875 : 0.82), cy = S * (st.ref3 ? 0.875 : 0.84), cr = S * (st.ref3 ? 0.065 : 0.075);
  x.save(); x.strokeStyle = inkCss; x.lineWidth = 2; x.globalAlpha = 0.35; x.setLineDash([14, 12]);
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4 + Math.PI / 8; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * S, cy + Math.sin(a) * S); x.stroke(); }
  x.restore();
  compass(x, cx, cy, cr, inkCss, !!st.dragons);
  if (st.rich) {
    if (st.ref3) compass(x, S * 0.07 + S * 0.035, S * 0.5, S * 0.032, inkCss); else compass(x, S * 0.16, S * 0.3, S * 0.055, inkCss);
    // Moldura numerada (como as coordenadas de um mapa antigo).
    x.save(); x.fillStyle = inkCss; x.strokeStyle = inkCss; x.lineWidth = 2; x.font = '600 22px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (st.ref3) { for (let k = 1; k < 8; k++) { const t = S * (0.058 + 0.884 * k / 8); x.fillText(String(k + 21), t, S * 0.075); x.fillText(String(k + 21), t, S * 0.925); x.fillText(String(k + 43), S * 0.075, t); x.fillText(String(k + 43), S * 0.925, t); } }
    else {
    x.strokeRect(S * 0.055, S * 0.055, S * 0.89, S * 0.89);
    for (let k = 1; k < 8; k++) { const t = S * (0.055 + 0.89 * k / 8); for (const [a, b, c, d, lx, ly] of [[t, S * 0.045, t, S * 0.055, t, S * 0.035], [S * 0.945, t, S * 0.955, t, S * 0.965, t]]) { x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); x.fillText(String(k + 10), lx, ly); } }
    }
    x.restore();
  }

  if (st.ref3) {
    x.save(); x.strokeStyle = inkCss; x.fillStyle = inkCss;
    // Teia de linhas finas saindo da bússola grande (como nas cartas náuticas).
    x.lineWidth = 1.6; x.globalAlpha = 0.3;
    for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * S * 1.5, cy + Math.sin(a) * S * 1.5); x.stroke(); }
    x.globalAlpha = 1;
    // Moldura grossa: duas linhas com faixas escuras alternadas entre elas.
    const a0 = S * 0.04, a1 = S * 0.058, L = S - 2 * a0;
    x.lineWidth = 3; x.strokeRect(a0, a0, L, L); x.strokeRect(a1, a1, S - 2 * a1, S - 2 * a1);
    for (let k = 0; k < 8; k++) if (k % 2 === 0) {
      const t0 = a0 + (L * k) / 8, t1 = a0 + (L * (k + 1)) / 8;
      x.fillRect(t0, a0, t1 - t0, a1 - a0); x.fillRect(t0, S - a1, t1 - t0, a1 - a0);
      x.fillRect(a0, t0, a1 - a0, t1 - t0); x.fillRect(S - a1, t0, a1 - a0, t1 - t0);
    }
    x.restore();
    serpent(x, S * 0.5, S * 0.915, S * 0.028, inkCss, st.paper);
    titleBanner(x, S * 0.36, S * 0.088, 'O COVIL DOS DRAGÕES', 'Ilha das Escamas', inkCss, st.paper);
    if (st.dragons) {
      flame(x, S * 0.36 - 330, S * 0.088 + 10, 40, inkCss); flame(x, S * 0.36 + 330, S * 0.088 + 10, 40, inkCss);
      flyingDragon(x, S * 0.74, S * 0.1, S * 0.06, inkCss, true);
      flyingDragon(x, S * 0.935, S * 0.32, S * 0.045, inkCss, true);
      flyingDragon(x, S * 0.075, S * 0.8, S * 0.05, inkCss, false);
      flyingDragon(x, S * 0.24, S * 0.925, S * 0.04, inkCss, false, 0.8);
    }
  }
  // Daqui em diante tudo é desenhado em relação à área de jogo (0..S), encaixado no papel maior.
  x.save(); x.translate((m * S) / T, (m * S) / T); x.scale(1 / T, 1 / T);
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
    if (st.rich) {
      // Pinheirais densos.
      for (let k = 0, tries = 0; k < Math.round(26 * st.rich) && tries < 900; tries++) {
        const u = 0.07 + r() * 0.86, v = 0.07 + r() * 0.86;
        if (!onLandAwayFromRoute(u, v, 0.04)) continue;
        k++; for (let t = 0; t < 4 + Math.floor(r() * 4); t++) pine(x, u * S + (r() - 0.5) * 90, v * S + (r() - 0.5) * 50, 14 + r() * 8);
      }
      // Vilas (casinhas com telhado).
      for (let k = 0, tries = 0; k < Math.round(6 * st.rich) && tries < 600; tries++) {
        const u = 0.08 + r() * 0.84, v = 0.08 + r() * 0.84;
        if (!onLandAwayFromRoute(u, v, 0.05)) continue;
        k++; for (let t = 0; t < 3; t++) house(x, u * S + t * 34, v * S + (t % 2) * 12, 14);
      }
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

  // Rota tracejada E → 1 … 6 → S, desenhada como trilha sinuosa feita à mão (passa por todos os pontos;
  // os inimigos continuam andando no caminho reto do jogo — é só o desenho).
  const pts = route.map(([u, v]) => [u * S, v * S]);
  const wr = rng(17), trail = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / len, ny = (bx - ax) / len; // perpendicular
    const waves = Math.max(1, Math.round(len / (S * 0.16))), amp = Math.min(S * 0.03, len * 0.12), ph = wr() * Math.PI * 2;
    const steps = Math.max(8, Math.round(len / 12));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps, taper = Math.sin(t * Math.PI); // zero nos pontos 1–6, para a trilha passar por eles
      const o = amp * taper * (Math.sin(t * Math.PI * waves * 2 + ph) * 0.8 + Math.sin(t * Math.PI * waves * 5 + ph * 2) * 0.2);
      trail.push([ax + (bx - ax) * t + nx * o, ay + (by - ay) * t + ny * o]);
    }
  }
  x.save(); x.strokeStyle = st.route; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round'; x.setLineDash([26, 18]);
  x.beginPath(); x.moveTo(...trail[0]);
  for (let i = 1; i < trail.length - 1; i++) { const mx = (trail[i][0] + trail[i + 1][0]) / 2, my = (trail[i][1] + trail[i + 1][1]) / 2; x.quadraticCurveTo(trail[i][0], trail[i][1], mx, my); }
  x.lineTo(...trail[trail.length - 1]); x.stroke(); x.restore();
  // Bandeirinha na entrada e X + ninho de ovos (o tesouro do covil) na saída.
  const [ex, ey] = pts[pts.length - 1], [sx, sy] = pts[0];
  if (st.dragons) {
    // Fogo na entrada; na saída, a caverna do covil com fogo e o ninho de ovos ao lado.
    flame(x, sx - 80, sy + 90, 46, inkCss);
    cave(x, ex + 160, ey - 30, 90, inkCss, st.paper);
    nest(x, ex + 330, ey - 70, inkCss);
    // Dragõezinhos voando sobre o mar da área de jogo.
    for (let k = 0, tries = 0; k < 4 && tries < 400; tries++) {
      const u = 0.06 + r() * 0.88, v = 0.06 + r() * 0.88;
      if (land(u, v) > -0.04) continue;
      k++; flyingDragon(x, u * S, v * S, 70 + r() * 35, inkCss, r() < 0.5, 0.8);
    }
  } else {
  x.strokeStyle = st.route; x.lineWidth = 12; x.lineCap = 'round';
  x.beginPath(); x.moveTo(ex - 30, ey - 100); x.lineTo(ex + 30, ey - 160); x.moveTo(ex - 30, ey - 160); x.lineTo(ex + 30, ey - 100); x.stroke();
  if (st.rich) castle(x, ex + 150, ey - 60, inkCss, st.paper); else nest(x, ex + 110, ey - 120, inkCss);
  x.strokeStyle = inkCss; x.lineWidth = 4;
  x.beginPath(); x.moveTo(sx - 70, sy + 130); x.lineTo(sx - 70, sy + 40); x.stroke();
  x.fillStyle = st.route; x.beginPath(); x.moveTo(sx - 70, sy + 40); x.lineTo(sx - 20, sy + 58); x.lineTo(sx - 70, sy + 76); x.fill();
  }

  if (st.labels) {
    x.fillStyle = inkCss; x.textAlign = 'center';
    const label = (t, u, v, px = 44) => { x.font = `italic 600 ${px}px Georgia, serif`; x.save(); x.strokeStyle = `rgba(${st.paper.join(',')},.85)`; x.lineWidth = 9; x.lineJoin = 'round'; x.strokeText(t, u * S, v * S); x.restore(); x.fillText(t, u * S, v * S); };
    label('Covil dos Dragões', st.rich ? 0.17 : 0.27, st.rich ? 0.8 : 0.9, 50);
    label(st.dragons ? 'Mar de Enxofre' : 'Mar das Brumas', 0.14, 0.56, 40);
    if (st.dragons) { label('Costa das Brasas', 0.8, 0.86, 38); label('Ninho do Dragão', 0.5, 0.93, 36); }
    if (!st.ref3) label('Ilha dos Orcs', 0.13, 0.1, 40);
    label(st.dragons ? 'Montes do Wyrm' : 'Picos de Fogo', 0.7, 0.255, 38);
    label('Floresta Élfica', 0.42, 0.395, 38);
    if (!st.ref3) banner(x, S * 0.62, S * 0.95, 'O COVIL', inkCss, st.paper);
  }
  x.restore();
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
// Serpente-dragão nadando: corcovas com espinhos, cabeça com chifre e cauda enrolada.
function serpent(x, px, py, s, ink, paper) {
  x.save(); x.strokeStyle = ink; x.fillStyle = `rgb(${paper.map((v) => v - 10).join(',')})`; x.lineWidth = 4; x.lineJoin = 'round';
  for (let k = 0; k < 3; k++) {
    const hx = px + k * s * 1.6, r = s * (0.75 - k * 0.12);
    x.beginPath(); x.arc(hx, py, r, Math.PI, 0); x.lineTo(hx + r * 0.6, py); x.arc(hx, py, r * 0.4, 0, Math.PI, true); x.closePath(); x.fill(); x.stroke();
    for (let j = 0; j < 4; j++) { const a = Math.PI + (j + 0.5) * Math.PI / 4, bx = hx + Math.cos(a) * r, by = py + Math.sin(a) * r; x.beginPath(); x.moveTo(bx, by); x.lineTo(hx + Math.cos(a) * (r + s * 0.25), py + Math.sin(a) * (r + s * 0.25)); x.lineTo(hx + Math.cos(a + 0.25) * r, py + Math.sin(a + 0.25) * r); x.stroke(); }
  }
  // cabeça (à esquerda)
  const hx = px - s * 1.1, hy = py - s * 0.9;
  x.beginPath(); x.moveTo(px - s * 0.75, py); x.quadraticCurveTo(px - s * 1.1, py - s * 0.5, hx, hy); x.lineTo(hx - s * 0.9, hy + s * 0.15); x.lineTo(hx - s * 0.85, hy + s * 0.4); x.lineTo(hx - s * 0.1, hy + s * 0.45); x.quadraticCurveTo(px - s * 0.6, py - s * 0.2, px - s * 0.35, py); x.closePath(); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(hx - s * 0.1, hy); x.lineTo(hx + s * 0.35, hy - s * 0.55); x.lineTo(hx + s * 0.2, hy + s * 0.05); x.stroke(); // chifre
  x.beginPath(); x.arc(hx - s * 0.35, hy + s * 0.12, s * 0.07, 0, Math.PI * 2); x.fillStyle = ink; x.fill(); // olho
  // cauda
  const tx = px + s * 4.4;
  x.beginPath(); x.moveTo(tx - s * 0.6, py); x.quadraticCurveTo(tx, py - s * 1.4, tx + s * 0.5, py - s * 0.6); x.quadraticCurveTo(tx + s * 0.7, py - s * 0.2, tx + s * 0.35, py - s * 0.3); x.stroke();
  // água
  x.lineWidth = 3; for (let k = -1; k < 6; k++) { const wx = px + k * s * 0.9; x.beginPath(); x.moveTo(wx - s * 0.4, py + s * 0.12); x.quadraticCurveTo(wx, py - s * 0.05, wx + s * 0.4, py + s * 0.12); x.stroke(); }
  x.restore();
}
// Título em fita no canto, com subtítulo numa fita menor.
function titleBanner(x, px, py, title, sub, ink, paper) {
  x.save(); x.translate(px, py); x.strokeStyle = ink; x.lineWidth = 4;
  x.fillStyle = `rgb(${paper.map((v) => v - 8).join(',')})`;
  const ribbon = (w, y, h) => {
    x.beginPath(); x.moveTo(-w, y - h); x.quadraticCurveTo(0, y - h - 18, w, y - h); x.lineTo(w, y + h); x.quadraticCurveTo(0, y + h - 18, -w, y + h); x.closePath(); x.fill(); x.stroke();
    for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * w, y - h * 0.6); x.lineTo(sg * (w + 60), y - h * 0.4); x.lineTo(sg * (w + 36), y + h * 0.3); x.lineTo(sg * (w + 62), y + h * 1.2); x.lineTo(sg * w, y + h); x.fill(); x.stroke(); }
  };
  // espadas cruzadas atrás
  x.lineWidth = 7; for (const sg of [-1, 1]) { x.beginPath(); x.moveTo(sg * -230, 60); x.lineTo(sg * 230, -80); x.stroke(); }
  x.lineWidth = 4;
  ribbon(270, -20, 44); ribbon(170, 70, 28);
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 46px Georgia, serif'; x.fillText(title, 0, -30);
  x.font = 'italic 600 34px Georgia, serif'; x.fillText(sub, 0, 62);
  x.restore();
}
function pine(x, px, py, s) {
  x.beginPath(); x.moveTo(px, py - s * 2); x.lineTo(px - s * 0.7, py); x.lineTo(px + s * 0.7, py); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + s * 0.4); x.stroke();
}
function house(x, px, py, s) {
  x.strokeRect(px - s, py - s, s * 2, s * 1.4);
  x.beginPath(); x.moveTo(px - s * 1.3, py - s); x.lineTo(px, py - s * 2.1); x.lineTo(px + s * 1.3, py - s); x.closePath(); x.fill();
}
// O Covil: castelo de torres pontudas com bandeira, na saída.
function castle(x, px, py, ink, paper) {
  x.save(); x.strokeStyle = ink; x.fillStyle = `rgb(${paper.map((v) => v - 18).join(',')})`; x.lineWidth = 4;
  const tower = (tx, w, h) => {
    x.fillRect(tx - w / 2, py - h, w, h); x.strokeRect(tx - w / 2, py - h, w, h);
    x.beginPath(); x.moveTo(tx - w / 2 - 6, py - h); x.lineTo(tx, py - h - w * 1.6); x.lineTo(tx + w / 2 + 6, py - h); x.closePath();
    x.fillStyle = ink; x.fill(); x.fillStyle = `rgb(${paper.map((v) => v - 18).join(',')})`;
    for (let k = 1; k < 3; k++) { x.beginPath(); x.rect(tx - 5, py - h + k * h / 3 - 10, 10, 14); x.stroke(); }
  };
  x.fillRect(px - 90, py - 70, 180, 70); x.strokeRect(px - 90, py - 70, 180, 70);
  for (let k = -80; k <= 70; k += 20) x.strokeRect(px + k, py - 82, 10, 12);
  tower(px - 95, 40, 120); tower(px + 95, 40, 120); tower(px, 50, 170);
  x.beginPath(); x.arc(px, py, 22, Math.PI, 0); x.lineTo(px + 22, py); x.lineTo(px - 22, py); x.fillStyle = ink; x.fill();
  x.beginPath(); x.moveTo(px, py - 250); x.lineTo(px, py - 300); x.stroke();
  x.fillStyle = '#c0202a'; x.beginPath(); x.moveTo(px, py - 300); x.lineTo(px + 40, py - 288); x.lineTo(px, py - 276); x.fill();
  x.restore();
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
