// Best phase reached per difficulty, kept on this device. Storage may be missing or blocked
// (private window, cleared data): every access is guarded and the game works without it.
const KEY = 'ninho.records.v1';

export function getRecords(storage) {
  try {
    const raw = storage?.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch { return {}; }
}

const better = (a, b) => !b || a.phase > b.phase || (a.phase === b.phase && a.lives > b.lives);

export function submitRecord(storage, diffKey, phase, lives) {
  const all = getRecords(storage);
  const entry = { phase, lives };
  const isNew = better(entry, all[diffKey]);
  if (isNew) {
    all[diffKey] = entry;
    try { storage?.setItem(KEY, JSON.stringify(all)); } catch { /* not saved, still reported */ }
  }
  return { isNew, best: isNew ? entry : all[diffKey] };
}

export function bestOverall(storage) {
  let best = null;
  for (const [diffKey, r] of Object.entries(getRecords(storage))) {
    if (!best || r.phase > best.phase) best = { diffKey, phase: r.phase };
  }
  return best;
}

// Dragons hatched at least once on this device (unlocks secret dragons in the book).
const SEEN_KEY = 'ninho.livro.v1';
export function getDiscovered(storage) {
  try { const v = JSON.parse(storage?.getItem(SEEN_KEY) || '[]'); return new Set(Array.isArray(v) ? v : []); } catch { return new Set(); }
}
export function markDiscovered(storage, id) {
  const seen = getDiscovered(storage);
  if (seen.has(id)) return;
  seen.add(id);
  try { storage?.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch { /* not saved */ }
}

// Saved mazes (stone layouts drawn in the editor), used as a placement guide in matches.
const MAZE_KEY = 'ninho.labirintos.v1';
export function getMazes(storage) {
  try { const v = JSON.parse(storage?.getItem(MAZE_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function putMazes(storage, list) {
  try { storage?.setItem(MAZE_KEY, JSON.stringify(list)); } catch { /* not saved */ }
}
export function saveMaze(storage, { id, name, cells }) {
  const list = getMazes(storage);
  const maze = { id: id || `m${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, name: name || 'Labirinto', cells };
  const i = list.findIndex((m) => m.id === maze.id);
  if (i >= 0) list[i] = maze; else list.push(maze);
  putMazes(storage, list);
  return maze;
}
export function deleteMaze(storage, id) {
  putMazes(storage, getMazes(storage).filter((m) => m.id !== id));
}
