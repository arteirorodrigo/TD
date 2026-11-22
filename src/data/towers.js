// Tower data. Values come from the reference tables in /game-design (Dota 2 Gem TD pages).
// Units: range and radius in map units (1 cell = CELL units). Rate = seconds between attacks.
// Attack speed bonus works like Dota: +100 means twice as fast.

export const CELL = 64; // one square of the fine grid; gems are 2x2 squares

export const QUALITIES = ['Lascada', 'Falha', 'Normal', 'Impecável', 'Perfeita', 'Enorme'];

// Gem types. `name` is the working name; the theme layer can rename them.
export const GEM_TYPES = {
  B: { name: 'Safira', color: 0x3b7bff },
  D: { name: 'Diamante', color: 0xbcd6f5 },
  E: { name: 'Opala', color: 0xffb8e6 },
  G: { name: 'Esmeralda', color: 0x2fe07a },
  P: { name: 'Ametista', color: 0xb05cff },
  Q: { name: 'Água-marinha', color: 0x46e6e0 },
  R: { name: 'Rubi', color: 0xff3048 },
  Y: { name: 'Topázio', color: 0xffc42e },
};

const q6 = (a) => a; // readability helper

// Per type: arrays of 6 (one per quality).
const BASE = {
  B: { dmg: q6([2, 4, 6, 8, 10, 36]), rate: [1, 1, 1, 1, 1, 0.6], range: [600, 600, 600, 600, 600, 600],
       ab: (i) => [{ k: 'slow', amount: [60, 90, 120, 150, 180, 480][i], dur: 2 }] },
  D: { dmg: [5, 10, 20, 40, 80, 460], rate: [1, 1, 1, 1, 1, 0.7], range: [500, 500, 500, 500, 500, 500],
       ab: () => [] },
  E: { dmg: [1, 2, 3, 4, 5, 6], rate: [1, 1, 1, 1, 1, 1], range: [500, 500, 500, 500, 500, 500],
       ab: (i) => [{ k: 'trueSight' }, { k: 'auraAS', value: [20, 30, 40, 50, 60, 70][i], radius: 664 }] },
  G: { dmg: [2, 4, 6, 8, 10, 12], rate: [1, 1, 1, 1, 1, 1], range: [500, 500, 500, 500, 500, 500],
       ab: (i) => [{ k: 'poison', dps: [2, 4, 8, 16, 32, 128][i], dur: 5 }] },
  P: { dmg: [2, 4, 6, 8, 10, 70], rate: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6], range: [500, 500, 500, 500, 500, 500],
       ab: (i) => [{ k: 'armorShred', amount: [2, 4, 8, 16, 32, 64][i], dur: 5 }] },
  Q: { dmg: [2, 4, 8, 16, 24, 80], rate: [1, 0.9, 0.8, 0.7, 0.6, 0.5], range: [400, 400, 400, 400, 400, 500],
       ab: (i) => [{ k: 'selfAS', value: i === 5 ? 500 : 200 }] },
  R: { dmg: [4, 8, 12, 24, 48, 150], rate: [1, 1, 1, 1, 1, 1], range: [500, 500, 500, 500, 500, 500],
       ab: (i) => [{ k: 'cleave', pct: [0.3, 0.4, 0.5, 0.6, 0.7, 1][i], radius: [300, 350, 400, 450, 500, 700][i] }] },
  Y: { dmg: [3, 6, 9, 18, 36, 200], rate: [1.3, 1.3, 1.3, 1.3, 1.3, 0.6], range: [600, 500, 500, 500, 500, 5000],
       ab: () => [{ k: 'multi', count: 3 }] },
};

export function baseTowerId(type, q) { return `${type}${q + 1}`; }

export const TOWERS = {};
for (const [t, s] of Object.entries(BASE)) {
  for (let i = 0; i < 6; i++) {
    TOWERS[baseTowerId(t, i)] = {
      id: baseTowerId(t, i), base: true, type: t, quality: i,
      name: `${GEM_TYPES[t].name} ${QUALITIES[i]}`,
      dmg: s.dmg[i], rate: s.rate[i], range: s.range[i], abilities: s.ab(i),
      color: GEM_TYPES[t].color, tier: i,
    };
  }
}

// Special towers. recipe: list of ingredient ids (base ids like 'B1' or special ids).
// alt: alternative recipe. tier drives visual size.
const SPECIALS = [
  ['silver', 'Prata', 30, 1, 600, ['B1', 'Y1', 'D1'], null, [{ k: 'slow', amount: 90, dur: 2 }], 0xd9dde6, 1],
  ['silverKnight', 'Cavaleiro de Prata', 100, 0.8, 700, ['silver', 'Q2', 'R3'], null, [{ k: 'cleave', pct: 0.5, radius: 400 }, { k: 'slow', amount: 120, dur: 2 }], 0xc9d4ff, 2],
  ['pinkDiamond', 'Diamante Rosa', 110, 1, 600, ['D5', 'Y3', 'D3'], null, [{ k: 'crit', chance: 0.1, mult: 5 }], 0xff8fd0, 2],
  ['hugePinkDiamond', 'Diamante Rosa Enorme', 310, 0.8, 700, ['pinkDiamond', 'silverKnight', 'silver'], null, [{ k: 'cleave', pct: 0.5, radius: 400 }, { k: 'crit', chance: 0.1, mult: 5 }, { k: 'slow', amount: 120, dur: 2 }], 0xff6fc4, 3],
  ['kohinoor', 'Koh-i-noor', 1300, 0.6, 700, ['hugePinkDiamond', 'P6', 'D6'], ['P1', 'P2', 'P3', 'P4', 'P5'], [{ k: 'cleave', pct: 0.5, radius: 400 }, { k: 'crit', chance: 0.1, mult: 5 }, { k: 'armorShred', amount: 64, dur: 5 }], 0xffffff, 4],
  ['malachite', 'Malaquita', 15, 0.8, 600, ['E1', 'Q1', 'G1'], null, [{ k: 'multi', count: 3 }], 0x1fbf8f, 1],
  ['vividMalachite', 'Malaquita Vívida', 50, 0.7, 700, ['malachite', 'D2', 'Y3'], null, [{ k: 'multi', count: 5 }], 0x2bffb0, 2],
  ['u238', 'Urânio-238', 120, 0.7, 700, ['Y5', 'E2', 'B3'], null, [{ k: 'multi', count: 10 }], 0x9dff2b, 2],
  ['u235', 'Urânio-235', 220, 0.7, 800, ['u238', 'vividMalachite', 'malachite'], null, [{ k: 'multi', count: 10 }], 0xb8ff4d, 3],
  ['kyparium', 'Kypárium Exaurido', 410, 0.4, 5000, ['u235', 'Q6', 'Y6'], ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'], [{ k: 'multi', count: 10 }], 0xd4ff80, 4],
  ['asteriatedRuby', 'Rubi Asteriado', 0, 1, 600, ['R2', 'R1', 'P1'], null, [{ k: 'burnAura', dps: 60, radius: 400 }], 0xff5a2b, 1],
  ['volcano', 'Vulcão', 0, 1, 600, ['asteriatedRuby', 'R4', 'P3'], null, [{ k: 'burnAura', dps: 320, radius: 500 }], 0xff3a10, 2],
  ['bloodstone', 'Heliotrópio', 35, 1, 700, ['R5', 'Q4', 'P3'], null, [{ k: 'chain', chance: 0.3, dmg: 150, jumps: 5, radius: 1000 }], 0xc4123a, 2],
  ['antiqueBloodstone', 'Heliotrópio Antigo', 70, 1, 800, ['bloodstone', 'volcano', 'R2'], null, [{ k: 'fork', chance: 0.25, dmg: 2500, targets: 5 }, { k: 'burnAura', dps: 320, radius: 500 }], 0xe0103a, 3],
  ['crownPrince', 'Príncipe Coroado', 70, 1, 800, ['antiqueBloodstone', 'R6', 'G6'], ['R1', 'R2', 'R3', 'R4', 'R5'], [{ k: 'fork', chance: 0.25, dmg: 2500, targets: 5 }, { k: 'burnAura', dps: 2500, radius: 800 }, { k: 'poison', dps: 128, dur: 5 }], 0xff1050, 4],
  ['jade', 'Jade', 10, 0.5, 800, ['G3', 'E3', 'B2'], null, [{ k: 'poison', dps: 16, dur: 5 }], 0x5fd18a, 1],
  ['quartz', 'Quartzo', 15, 0.6, 500, ['G4', 'R3', 'P2'], null, [{ k: 'antiAir', armor: 10, speed: 250, mr: 0, radius: 600 }], 0xffd6e0, 1],
  ['greyJade', 'Jade Cinza', 30, 0.5, 800, ['jade', 'B4', 'Q3'], null, [{ k: 'auraRange', value: 300, radius: 290 }, { k: 'poison', dps: 32, dur: 5 }], 0x8fb8a0, 2],
  ['monkeyJade', 'Jade do Rei Macaco', 80, 0.5, 1000, ['greyJade', 'G4', 'P2'], null, [{ k: 'poison', dps: 32, dur: 5 }, { k: 'auraRange', value: 300, radius: 290 }, { k: 'noMiss', radius: 300 }], 0x6cffb4, 3],
  ['cullinan', 'Cullinan', 3154, 0.8, 1200, ['monkeyJade', 'D6', 'B6'], ['D1', 'D2', 'D3', 'D4', 'D5'], [{ k: 'noMiss', radius: 300 }, { k: 'auraRange', value: 300, radius: 290 }, { k: 'crit', chance: 0.1, mult: 5 }], 0xf4fbff, 4],
  ['luckyJade', 'Jade da Sorte', 30, 0.5, 900, ['jade', 'quartz', 'G3'], null, [{ k: 'poison', dps: 32, dur: 5 }, { k: 'heal', chance: 0.01 }, { k: 'antiAir', armor: 10, speed: 250, mr: 0, radius: 600 }], 0x7dff9e, 2],
  ['lazurite', 'Lazurita Encantada', 30, 0.6, 800, ['quartz', 'P4', 'Y2'], null, [{ k: 'antiAir', armor: 10, speed: 250, mr: 50, radius: 600 }], 0x2a4dff, 2],
  ['goldenJubilee', 'Jubileu Dourado', 1, 0.7, 800, ['lazurite', 'Y6', 'R6'], ['Y1', 'Y2', 'Y3', 'Y4', 'Y5'], [{ k: 'antiAir', armor: 10, speed: 250, mr: 50, radius: 600 }, { k: 'burnHit', pct: 1 }], 0xffcf3a, 4],
  ['gold', 'Ouro', 60, 0.8, 600, ['P5', 'P4', 'D2'], null, [{ k: 'armorShred', amount: 32, dur: 5 }], 0xffd23a, 2],
  ['egyptGold', 'Ouro Egípcio', 100, 0.8, 700, ['gold', 'P5', 'Q2'], null, [{ k: 'armorShred', amount: 48, dur: 5 }, { k: 'goldAura', chance: 0.05, mult: 10, radius: 800 }], 0xffb820, 3],
  ['darkEmerald', 'Esmeralda Sombria', 80, 0.5, 700, ['G5', 'B4', 'Y2'], null, [{ k: 'stun', chance: 0.1, dur: 2 }], 0x0f8a4a, 2],
  ['emeraldGolem', 'Golem de Esmeralda', 170, 0.5, 700, ['gold', 'darkEmerald', 'D3'], null, [{ k: 'stun', chance: 0.1, dur: 2 }, { k: 'armorShred', amount: 32, dur: 5 }, { k: 'stun', chance: 0.01, dur: 5 }], 0x18b860, 3],
  ['paraiba', 'Turmalina Paraíba', 30, 0.6, 600, ['Q5', 'E4', 'G2'], null, [{ k: 'armorAura', amount: 15, radius: 800 }], 0x2ae6ff, 2],
  ['carvedTourmaline', 'Turmalina Lapidada', 130, 0.6, 700, ['paraiba', 'darkEmerald', 'G2'], null, [{ k: 'stun', chance: 0.1, dur: 2 }, { k: 'armorAura', amount: 30, radius: 1200 }], 0x1fd0ff, 3],
  ['starOfAdam', 'Estrela de Adão', 42, 1, 800, ['carvedTourmaline', 'G6', 'P6'], ['G1', 'G2', 'G3', 'G4', 'G5'], [{ k: 'poison', dps: 128, dur: 5 }, { k: 'armorShred', amount: 64, dur: 5 }, { k: 'armorAura', amount: 30, radius: 1200 }, { k: 'frost', radius: 300, pct: 0.5, dur: 3 }], 0x3a8cff, 4],
  ['deepSeaPearl', 'Pérola Abissal', 80, 0.6, 500, ['Q4', 'D4', 'E2'], null, [], 0xe6f6ff, 2],
  ['catsEye', 'Olho de Gato', 6, 1, 500, ['E5', 'D4', 'Q3'], null, [{ k: 'auraAS', value: 60, radius: 664 }, { k: 'trueSight' }, { k: 'dmgAura', pct: 0.5, radius: 500 }], 0xd8ff6a, 2],
  ['redCoral', 'Coral Vermelho', 120, 0.6, 500, ['catsEye', 'deepSeaPearl', 'E4'], null, [{ k: 'auraAS', value: 60, radius: 664 }, { k: 'trueSight' }, { k: 'dmgAura', pct: 0.5, radius: 500 }], 0xff5a5a, 3],
  ['zumurud', 'Zumurud Natural', 80, 1, 500, ['deepSeaPearl', 'G5', 'D3'], null, [], 0x1ac46a, 3],
  ['carmenLucia', 'Carmen-Lúcia', 6, 1, 500, ['redCoral', 'E6', 'Q6'], ['E1', 'E2', 'E3', 'E4', 'E5'], [{ k: 'dmgAura', pct: 0.5, radius: 500 }, { k: 'auraAS', value: 200, radius: 200 }, { k: 'auraAS', value: 70, radius: 664 }, { k: 'trueSight' }], 0xff2a7a, 4],
  ['yellowSapphire', 'Safira Amarela', 20, 1, 600, ['B5', 'Y4', 'R4'], null, [{ k: 'iceAura', pct: 0.7, radius: 300 }], 0xfff06a, 2],
  ['saberEye', 'Olho do Sabre', 60, 1, 500, ['yellowSapphire', 'bloodstone', 'B5'], null, [{ k: 'iceAura', pct: 0.7, radius: 300 }, { k: 'chain', chance: 0.25, dmg: 300, jumps: 10, radius: 800, slow: 120 }], 0x9ae6ff, 3],
  ['starSapphire', 'Safira Estrela', 20, 1, 600, ['yellowSapphire', 'B6', 'E6'], ['B1', 'B2', 'B3', 'B4', 'B5'], [{ k: 'trueSight' }, { k: 'auraAS', value: 70, radius: 664 }, { k: 'slow', amount: 480, dur: 2 }, { k: 'iceAura', pct: 0.75, radius: 556 }], 0x4a6bff, 4],
  // Secret
  ['obsidian', 'Obsidiana', 820, 0.8, 800, ['B5', 'Y5', 'D5'], null, [{ k: 'cleave', pct: 0.7, radius: 500 }, { k: 'slow', amount: 180, dur: 2 }], 0x2a1a3a, 4],
  ['agate', 'Ágata', 430, 0.3, 5000, ['Q5', 'E5', 'G5'], null, [{ k: 'multi', count: 5 }], 0xff9a5a, 4],
  ['missShrimp', 'Senhorita Camarão', 1225, 0.5, 1000, ['R5', 'G5', 'B5'], null, [{ k: 'chain', chance: 0.3, dmg: 150, jumps: 5, radius: 1000 }, { k: 'fork', chance: 0.25, dmg: 2500, targets: 5 }], 0xff7a8a, 4],
  ['yaphets', 'Pedra de Yaphets', 140, 1, 800, ['B5', 'G5', 'B4', 'G4'], null, [{ k: 'armorAura', amount: 30, radius: 1200 }, { k: 'armorShred', amount: 64, dur: 5 }, { k: 'antiAir', armor: 64, speed: 480, mr: 100, radius: 600 }], 0x6a3aff, 4],
  ['burningStone', 'Pedra Ardente', 0, 0.5, 600, ['R5', 'P5', 'R4', 'P4'], null, [{ k: 'burnAura', dps: 2500, radius: 800 }], 0xff4a00, 4],
];

for (const [id, name, dmg, rate, range, recipe, alt, abilities, color, tier] of SPECIALS) {
  TOWERS[id] = { id, base: false, name, dmg, rate, range, recipe, alt, abilities, color, tier };
}

export const RECIPES = [];
for (const t of Object.values(TOWERS)) {
  if (t.base) continue;
  RECIPES.push({ result: t.id, ingredients: t.recipe });
  if (t.alt) RECIPES.push({ result: t.id, ingredients: t.alt });
}

export function towerDisplayName(id) { return TOWERS[id]?.name ?? id; }

const AB_TEXT = {
  slow: (a) => `Lentidão −${a.amount} vel.`,
  poison: (a) => `Veneno ${a.dps}/s por ${a.dur}s`,
  armorShred: (a) => `Reduz armadura −${a.amount}`,
  cleave: (a) => `Dano em área ${Math.round(a.pct * 100)}%`,
  multi: (a) => `Acerta ${a.count} alvos`,
  auraAS: (a) => `Aura +${a.value}% vel. de ataque`,
  selfAS: (a) => `+${a.value}% vel. de ataque`,
  trueSight: () => 'Revela invisíveis',
  crit: (a) => `${Math.round(a.chance * 100)}% crítico ${a.mult}x`,
  burnAura: (a) => `Aura de fogo ${a.dps}/s`,
  chain: (a) => `${Math.round(a.chance * 100)}% raio em cadeia (${a.jumps} saltos)`,
  fork: (a) => `${Math.round(a.chance * 100)}% raio bifurcado ${a.dmg}`,
  antiAir: (a) => `Aura antiaérea −${a.armor} armadura`,
  auraRange: (a) => `Aura +${a.value} alcance`,
  noMiss: () => 'Aliados não erram',
  heal: (a) => `${a.chance * 100}% de recuperar 1 vida`,
  burnHit: () => 'Queima: dano extra mágico',
  goldAura: (a) => `${Math.round(a.chance * 100)}% de ${a.mult}x ouro`,
  stun: (a) => `${Math.round(a.chance * 100)}% atordoa ${a.dur}s`,
  armorAura: (a) => `Aura −${a.amount} armadura inimiga`,
  frost: (a) => `Congela área −${Math.round(a.pct * 100)}% vel.`,
  dmgAura: (a) => `Aura +${Math.round(a.pct * 100)}% dano`,
  iceAura: (a) => `Aura de gelo −${Math.round(a.pct * 100)}% vel.`,
};
export function abilityText(a) { return AB_TEXT[a.k] ? AB_TEXT[a.k](a) : a.k; }
