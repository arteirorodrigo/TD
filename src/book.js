// Livro dos Dragões: dragons grouped into 8 evolution lines, one per scale element.
// Each line ends in a final dragon (tier 4) whose alternative recipe uses five scales of that element.
// Dragons that lead to a final belong to its line; side branches join the line of their first dragon ingredient,
// or, with no dragon ingredient, the element most used in their recipe.
import { TOWERS } from './data/towers.js';

export const SECRET_IDS = ['obsidian', 'agate', 'missShrimp', 'yaphets', 'burningStone'];

const LINE_NAMES = { R: 'Linha do Fogo', B: 'Linha do Gelo', G: 'Linha do Veneno', P: 'Linha da Sombra', Q: 'Linha da Tempestade', Y: 'Linha Solar', D: 'Linha do Aço', E: 'Linha Etérea' };

const specials = () => Object.values(TOWERS).filter((t) => !t.base && !SECRET_IDS.includes(t.id));

function ancestors(id, acc = new Set()) {
  for (const ing of TOWERS[id].recipe) {
    if (TOWERS[ing].base || acc.has(ing)) continue;
    acc.add(ing);
    ancestors(ing, acc);
  }
  return acc;
}

export function bookLines() {
  const finals = specials().filter((t) => t.alt);
  const lineOf = new Map();
  const lines = finals.map((f) => {
    const element = TOWERS[f.alt[0]].type;
    lineOf.set(f.id, element);
    for (const a of ancestors(f.id)) if (!lineOf.has(a)) lineOf.set(a, element);
    return { element, name: LINE_NAMES[element], final: f.id };
  });
  // Side branches, resolved in data order (a branch's dragon ingredient always comes earlier).
  let pending = specials().filter((t) => !lineOf.has(t.id));
  for (let guard = 0; pending.length && guard < 10; guard++) {
    for (const t of pending) {
      const dragonIng = t.recipe.find((i) => !TOWERS[i].base && lineOf.has(i));
      if (dragonIng) { lineOf.set(t.id, lineOf.get(dragonIng)); continue; }
      if (t.recipe.every((i) => TOWERS[i].base)) {
        const count = {};
        for (const i of t.recipe) count[TOWERS[i].type] = (count[TOWERS[i].type] || 0) + 1;
        lineOf.set(t.id, Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]);
      }
    }
    pending = pending.filter((t) => !lineOf.has(t.id));
  }
  for (const l of lines) {
    l.tiers = [1, 2, 3, 4].map((tier) => specials().filter((t) => lineOf.get(t.id) === l.element && t.tier === tier).map((t) => t.id));
    l.mainPath = new Set([l.final, ...ancestors(l.final)]);
  }
  return lines;
}
