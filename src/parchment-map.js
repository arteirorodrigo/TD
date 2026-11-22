// Fundo do mapa em estilo "mapa do tesouro" em pergaminho — TESTE com 3 versões.
// Tudo é desenhado aqui por código (nenhuma imagem de fora): papel envelhecido, manchas,
// bordas queimadas, rota pontilhada da entrada (E) à saída (S) pelos pontos 1–6,
// rosa dos ventos e um X na saída. Ver com ?mapa=1, ?mapa=2 ou ?mapa=3.
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
