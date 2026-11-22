// Enemy waves: fantasy races hunting the dragons. Stats from the reference table
// (Dota 2 Gem TD creeps page), single-player scaling.
// hp/speed are base values; the game applies HP_MULT and SPEED_MULT.
// Abilities: invis, evasion, refraction, blink, rush, disarm, magicImmune, physImmune,
// untouchable, reactive, highArmor, regen, kraken.

export const HP_MULT = 0.6;
export const SPEED_MULT = 0.85;

// [level, name, hp, speed, armor, mr, air, boss, abilities, race]
const RAW = [
  [1, 'Camponês', 5, 525, 0, 10, 0, 0, [], 'human'],
  [2, 'Escudeiro Veloz', 10, 600, 0, 10, 0, 0, [], 'human'],
  [3, 'Lenhador', 20, 525, 0, 10, 0, 0, [], 'human'],
  [4, 'Batedor Goblin', 20, 1000, 0, 10, 0, 0, [], 'goblin'],
  [5, 'Morcego Gigante', 24, 500, 0, 10, 1, 0, [], 'bat'],
  [5, 'Harpia Jovem', 22, 500, 0, 10, 1, 0, [], 'harpy'],
  [6, 'Anão Mineiro', 100, 450, 0, 10, 0, 0, [], 'dwarf'],
  [7, 'Soldado Humano', 100, 600, 0, 10, 0, 0, [], 'human'],
  [8, 'Ladino Élfico', 70, 750, 0, 10, 0, 0, ['invis'], 'elf'],
  [9, 'Esgrimista Élfica', 120, 600, 0, 10, 0, 0, ['evasion'], 'elf'],
  [10, 'Capitão da Guarda', 2100, 750, 0, 10, 0, 1, [], 'human'],
  [11, 'Lanceiro Orc', 300, 525, 4, 10, 0, 0, [], 'orc'],
  [12, 'Xamã Goblin', 450, 600, 4, 20, 0, 0, ['disarm'], 'goblin'],
  [13, 'Guerreiro Orc', 800, 600, 4, 10, 0, 0, [], 'orc'],
  [14, 'Paladino', 1100, 600, 4, 10, 0, 0, ['refraction'], 'human'],
  [15, 'Cavaleiro de Grifo', 400, 700, 4, 10, 1, 0, [], 'griffin'],
  [15, 'Harpia', 440, 600, 4, 10, 1, 0, [], 'harpy'],
  [16, 'Feiticeiro Humano', 950, 800, 4, 100, 0, 0, ['magicImmune'], 'human'],
  [17, 'Monge da Montanha', 1600, 600, 4, 50, 0, 0, ['untouchable'], 'human'],
  [18, 'Assassina Élfica', 3000, 675, 4, 10, 0, 0, ['invis', 'disarm'], 'elf'],
  [19, 'Cavaleiro de Lobo', 2200, 1000, 4, 10, 0, 0, ['rush'], 'orc'],
  [19, 'Cavalaria Humana', 3700, 700, 4, 10, 0, 0, ['rush'], 'human'],
  [20, 'Chefe de Guerra Orc', 34000, 900, 0, 10, 0, 1, [], 'orc'],
  [21, 'Berserker Orc', 7500, 675, 8, 10, 0, 0, [], 'orc'],
  [21, 'Troll da Montanha', 9000, 700, 8, 10, 0, 0, [], 'troll'],
  [22, 'Anão Blindado', 9000, 600, 8, 10, 0, 0, ['highArmor'], 'dwarf'],
  [23, 'Espectro', 12000, 650, 8, 10, 0, 0, ['physImmune', 'refraction'], 'undead'],
  [23, 'Alma Penada', 10000, 625, 8, 10, 0, 0, ['physImmune', 'refraction'], 'undead'],
  [24, 'Golem Anão', 7500, 775, 8, 10, 0, 0, ['reactive'], 'dwarf'],
  [24, 'Guardião Mecânico', 10000, 675, 8, 10, 0, 0, ['reactive'], 'dwarf'],
  [25, 'Dirigível Anão', 2800, 600, 8, 10, 1, 0, ['highArmor'], 'airship'],
  [25, 'Corsário dos Céus', 3600, 400, 8, 10, 1, 0, ['highArmor'], 'airship'],
  [26, 'Mago de Batalha', 6300, 900, 8, 100, 0, 0, ['magicImmune'], 'human'],
  [27, 'Espírito do Vento', 3500, 625, 8, 50, 1, 0, ['untouchable'], 'spirit'],
  [27, 'Fada da Névoa', 2000, 625, 8, 50, 1, 0, ['physImmune', 'untouchable'], 'spirit'],
  [28, 'Máquina Voadora Gnoma', 3800, 750, 8, 10, 1, 0, ['reactive'], 'airship'],
  [28, 'Cavaleiro Pégaso', 4900, 600, 24, 10, 1, 0, ['reactive'], 'griffin'],
  [29, 'Arqueiro em Águia', 6000, 775, 8, 10, 1, 0, ['evasion', 'refraction'], 'griffin'],
  [29, 'Harpia Veloz', 4500, 1000, 8, 10, 1, 0, ['evasion', 'refraction'], 'harpy'],
  [30, 'Rei dos Grifos', 80000, 750, 0, 10, 1, 1, [], 'griffin'],
  [31, 'Arquimago', 14000, 900, 12, 100, 0, 0, ['magicImmune', 'refraction'], 'human'],
  [31, 'Espectro Antigo', 21000, 800, 12, 10, 0, 0, ['physImmune', 'refraction'], 'undead'],
  [32, 'Troll Regenerador', 85000, 600, 12, 10, 0, 0, ['regen'], 'troll'],
  [33, 'Cavaleiro da Morte', 80000, 700, 12, 10, 0, 0, ['physImmune', 'blink'], 'undead'],
  [33, 'Lâmina Fantasma', 55000, 1000, 12, 10, 0, 0, ['physImmune', 'blink'], 'undead'],
  [34, 'Harpia Sangrenta', 13000, 925, 12, 10, 1, 0, ['evasion'], 'harpy'],
  [34, 'Caçador Élfico Alado', 20000, 725, 12, 10, 1, 0, ['evasion'], 'griffin'],
  [35, 'Bruxa na Vassoura', 8800, 700, 12, 100, 1, 0, ['magicImmune'], 'witch'],
  [36, 'Ogro Mago', 55000, 1000, 12, 100, 0, 0, ['magicImmune'], 'ogre'],
  [37, 'Lâmina Élfica', 120000, 1200, 12, 10, 0, 0, ['blink'], 'elf'],
  [38, 'Gigante de Pedra', 200000, 1000, 12, 10, 0, 0, ['disarm'], 'giant'],
  [39, 'Banshee', 55000, 600, 12, 10, 1, 0, ['untouchable', 'kraken', 'evasion'], 'spirit'],
  [39, 'Fada Sombria', 15000, 800, 12, 10, 1, 0, ['untouchable', 'kraken', 'evasion'], 'spirit'],
  [40, 'Lich', 330000, 800, 0, 10, 1, 1, ['kraken'], 'undead'],
  [41, 'Gigante do Gelo', 240000, 700, 16, 50, 0, 0, ['refraction'], 'giant'],
  [41, 'Druida Élfico', 120000, 1300, 16, 25, 0, 0, ['refraction'], 'elf'],
  [42, 'Wyvernário Orc', 15000, 700, 16, 100, 1, 0, ['magicImmune', 'rush'], 'griffin'],
  [43, 'Troll Ancião', 190000, 800, 16, 50, 0, 0, ['untouchable', 'evasion', 'regen'], 'troll'],
  [44, 'Xamã Orc Ancião', 200000, 500, 16, 100, 0, 0, ['magicImmune', 'blink'], 'orc'],
  [45, 'Valquíria', 120000, 2400, 16, 10, 1, 0, ['disarm'], 'griffin'],
  [46, 'Ogro Colossal', 600000, 800, 32, 20, 0, 0, ['physImmune'], 'ogre'],
  [47, 'Campeão Anão', 300000, 500, 16, 80, 0, 0, ['magicImmune', 'untouchable', 'rush'], 'dwarf'],
  [47, 'Campeão Orc', 550000, 600, 16, 80, 0, 0, ['untouchable', 'rush'], 'orc'],
  [48, 'Bruxa Real', 60000, 550, 16, 10, 1, 0, ['magicImmune', 'disarm', 'evasion'], 'witch'],
  [48, 'Arquimago Voador', 100000, 400, 16, 10, 1, 0, ['magicImmune', 'disarm', 'evasion'], 'witch'],
  [49, 'Titã de Pedra', 800000, 700, 32, 80, 0, 0, ['kraken', 'regen'], 'giant'],
  [50, 'Rei Caçador de Dragões', 1000000, 1000, 16, 20, 1, 1, ['kraken'], 'griffin'],
];

export const MAX_LEVEL = 50;

export const ENEMY_TYPES = RAW.map(([level, name, hp, speed, armor, mr, air, boss, abilities, race], i) => ({
  id: i, level, name, hp, speed, armor, mr, air: !!air, boss: !!boss, abilities, race,
}));

// Wave composition (tunable): 10 units per normal level split between variants, 1 for bosses.
// Endless: after MAX_LEVEL the 50 waves repeat; each cycle c multiplies hp by 3^c and adds 5*c armor.
export const UNITS_PER_WAVE = 10;
export const cycleOf = (level) => Math.floor((level - 1) / MAX_LEVEL);
export function waveFor(level) {
  const c = cycleOf(level);
  const base = level - c * MAX_LEVEL;
  const types = ENEMY_TYPES.filter((e) => e.level === base)
    .map((t) => ({ ...t, hp: t.hp * 3 ** c, armor: t.armor + 5 * c, cycle: c }));
  const units = [];
  if (types.some((t) => t.boss)) {
    units.push(types.find((t) => t.boss));
  } else {
    for (let i = 0; i < UNITS_PER_WAVE; i++) units.push(types[i % types.length]);
  }
  return units;
}

// Gold per kill (tunable).
export function bountyFor(type) {
  const base = type.boss ? 30 + type.level * 3 : 2 + Math.floor(type.level / 3);
  return base * (1 + (type.cycle || 0));
}

export const ABILITY_TEXT = {
  invis: 'Invisível', evasion: 'Evasão 50%', refraction: 'Refração', blink: 'Teleporte',
  rush: 'Arrancada', disarm: 'Aura de desarme', magicImmune: 'Imune a magia',
  physImmune: 'Imune a físico', untouchable: 'Intocável', reactive: 'Armadura reativa',
  highArmor: 'Armadura alta', regen: 'Regeneração', kraken: 'Casco de Kraken',
};
