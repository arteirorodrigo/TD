// Grid map and pathfinding, on the fine grid of the original game.
// Gems occupy 2x2 squares and can be placed at any square. Enemies are also 2x2 wide,
// so they need a 2-square-wide gap to pass. Ground enemies walk spawn -> 1 -> ... -> 6 -> exit,
// taking the shortest open route on each leg. Air enemies fly straight between waypoints.

// Layout measured from the original map screenshot (64 x 64 squares).
// Each waypoint is the top-left square of its 2x2 centre.
export const MAP = {
  w: 64,
  h: 64,
  waypoints: [
    [57, 0],   // entrada
    [57, 11],  // 1
    [33, 11],  // 2
    [33, 43],  // 3
    [57, 43],  // 4
    [57, 27],  // 5
    [17, 27],  // 6
    [17, 62],  // saída
  ],
};

export const EMPTY = 0, BLOCK = 1, PLATFORM = 2;
export const GEM_SIZE = 2;

export class Grid {
  constructor(map = MAP) {
    this.w = map.w; this.h = map.h;
    this.waypoints = map.waypoints.map(([x, y]) => ({ x, y }));
    this.cells = new Uint8Array(this.w * this.h);
    // Waypoint platforms: a plus shape (2-wide arms, 2 squares long) around each 2x2 centre.
    for (const p of this.waypoints) {
      for (let dx = -2; dx <= 3; dx++) for (let dy = 0; dy <= 1; dy++) this.mark(p.x + dx, p.y + dy, PLATFORM);
      for (let dy = -2; dy <= 3; dy++) for (let dx = 0; dx <= 1; dx++) this.mark(p.x + dx, p.y + dy, PLATFORM);
    }
  }
  mark(x, y, v) { if (this.inBounds(x, y)) this.cells[this.idx(x, y)] = v; }
  idx(x, y) { return y * this.w + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.cells[this.idx(x, y)]; }

  // A 2x2 body with top-left at (x,y) fits here.
  fits(x, y) {
    if (x < 0 || y < 0 || x + 1 >= this.w || y + 1 >= this.h) return false;
    const c = this.cells, w = this.w;
    return c[y * w + x] !== BLOCK && c[y * w + x + 1] !== BLOCK && c[(y + 1) * w + x] !== BLOCK && c[(y + 1) * w + x + 1] !== BLOCK;
  }

  // A 2x2 gem with top-left at (x,y) can be placed (all 4 squares empty).
  canBuildAt(x, y) {
    if (x < 0 || y < 0 || x + 1 >= this.w || y + 1 >= this.h) return false;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (this.get(x + dx, y + dy) !== EMPTY) return false;
    return true;
  }

  // Shortest path for a 2x2 body between two positions (8 directions, no corner cutting).
  findPath(a, b) {
    const { w, h } = this;
    const N = w * h;
    const dist = new Float32Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const start = this.idx(a.x, a.y), goal = this.idx(b.x, b.y);
    dist[start] = 0;
    const heap = [];
    const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const hfn = (i) => { const x = i % w, y = (i / w) | 0; const dx = Math.abs(x - b.x), dy = Math.abs(y - b.y); return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy); };
    push(hfn(start), start);
    while (heap.length) {
      const [, i] = pop();
      if (closed[i]) continue;
      closed[i] = 1;
      if (i === goal) break;
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!this.fits(nx, ny)) continue;
        if (dx && dy && (!this.fits(x + dx, y) || !this.fits(x, y + dy))) continue;
        const ni = this.idx(nx, ny);
        const nd = dist[i] + (dx && dy ? 1.4142 : 1);
        if (nd < dist[ni]) { dist[ni] = nd; prev[ni] = i; push(nd + hfn(ni), ni); }
      }
    }
    if (dist[goal] === Infinity) return null;
    const out = [];
    for (let i = goal; i !== -1; i = prev[i]) out.push({ x: i % w, y: (i / w) | 0 });
    return out.reverse();
  }

  // Full ground route through all waypoints, or null if any leg is blocked.
  fullPath() {
    const route = [];
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const leg = this.findPath(this.waypoints[i], this.waypoints[i + 1]);
      if (!leg) return null;
      if (route.length) leg.shift();
      route.push(...leg);
    }
    return route;
  }

  setGem(x, y, v) { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) this.cells[this.idx(x + dx, y + dy)] = v; }

  // Would a 2x2 gem at (x,y) keep the route open?
  tryBlock(x, y) {
    if (!this.canBuildAt(x, y)) return false;
    this.setGem(x, y, BLOCK);
    const ok = this.fullPath() !== null;
    this.setGem(x, y, EMPTY);
    return ok;
  }
  block(x, y) { this.setGem(x, y, BLOCK); }
  unblock(x, y) { this.setGem(x, y, EMPTY); }

  airPath() { return this.waypoints.map((p) => ({ x: p.x, y: p.y })); }
}

export function pathLength(cells) {
  let L = 0;
  for (let i = 1; i < cells.length; i++) L += Math.hypot(cells[i].x - cells[i - 1].x, cells[i].y - cells[i - 1].y);
  return L;
}
