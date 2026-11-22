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
