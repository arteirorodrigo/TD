// Enemy waves, from the reference table (Dota 2 Gem TD creeps page), single-player scaling.
// hp/speed are base values; the game applies HP_MULT and SPEED_MULT.
// Abilities: invis, evasion, refraction, blink, rush, disarm, magicImmune, physImmune,
// untouchable, reactive, highArmor, regen, kraken.

export const HP_MULT = 0.6;
export const SPEED_MULT = 0.85;

// [level, name, hp, speed, armor, mr, air, boss, abilities]
const RAW = [
  [1, 'Javali Furioso', 5, 525, 0, 10, 0, 0, []],
  [2, 'Sapo Veloz', 10, 600, 0, 10, 0, 0, []],
  [3, 'Iaque Robusto', 20, 525, 0, 10, 0, 0, []],
  [4, 'Robô Esperto', 20, 1000, 0, 10, 0, 0, []],
  [5, 'Panda Bebê', 24, 500, 0, 10, 1, 0, []],
  [5, 'Texugo-Balão', 22, 500, 0, 10, 1, 0, []],
  [6, 'Toco Lento', 100, 450, 0, 10, 0, 0, []],
  [7, 'Lagarto Satisfeito', 100, 600, 0, 10, 0, 0, []],
  [8, 'Aranha Invisível', 70, 750, 0, 10, 0, 0, ['invis']],
  [9, 'Sombrio', 120, 600, 0, 10, 0, 0, ['evasion']],
  [10, 'Cão Invencível', 2100, 750, 0, 10, 0, 1, []],
  [11, 'Ovelha', 300, 525, 4, 10, 0, 0, []],
  [12, 'Alpaca Engraçada', 450, 600, 4, 20, 0, 0, ['disarm']],
  [13, 'Princesa Porca', 800, 600, 4, 10, 0, 0, []],
  [14, 'Buldogue', 1100, 600, 4, 10, 0, 0, ['refraction']],
  [15, 'Gato & Cão', 400, 700, 4, 10, 1, 0, []],
  [15, 'Viciado em Bambu', 440, 600, 4, 10, 1, 0, []],
  [16, 'Demônio Jovem', 950, 800, 4, 100, 0, 0, ['magicImmune']],
  [17, 'Galinha Faixa-Preta', 1600, 600, 4, 50, 0, 0, ['untouchable']],
  [18, 'Bajie', 3000, 675, 4, 10, 0, 0, ['invis', 'disarm']],
  [19, 'Coelho Requintado', 2200, 1000, 4, 10, 0, 0, ['rush']],
  [19, 'Trio de Burros', 3700, 700, 4, 10, 0, 0, ['rush']],
  [20, 'Saco de Pancada', 34000, 900, 0, 10, 0, 1, []],
  [21, 'Rasgador', 7500, 675, 8, 10, 0, 0, []],
  [21, 'Caranguejo', 9000, 700, 8, 10, 0, 0, []],
  [22, 'Mandíbula Travada', 9000, 600, 8, 10, 0, 0, ['highArmor']],
  [23, 'Mandíbula Mole', 12000, 650, 8, 10, 0, 0, ['physImmune', 'refraction']],
  [23, 'Mandíbula Armadilha', 10000, 625, 8, 10, 0, 0, ['physImmune', 'refraction']],
  [24, 'Burro Mecânico', 7500, 775, 8, 10, 0, 0, ['reactive']],
  [24, 'Mandíbula Mecânica', 10000, 675, 8, 10, 0, 0, ['reactive']],
  [25, 'Demolidor', 2800, 600, 8, 10, 1, 0, ['highArmor']],
  [25, 'Corsário', 3600, 400, 8, 10, 1, 0, ['highArmor']],
  [26, 'Flamingo de Skate', 6300, 900, 8, 100, 0, 0, ['magicImmune']],
  [27, 'Peixe Dourado', 3500, 625, 8, 50, 1, 0, ['untouchable']],
  [27, 'Água-viva', 2000, 625, 8, 50, 1, 0, ['physImmune', 'untouchable']],
  [28, 'Dragão Ig', 3800, 750, 8, 10, 1, 0, ['reactive']],
  [28, 'Serra-Voadora', 4900, 600, 24, 10, 1, 0, ['reactive']],
  [29, 'Raposa Vg', 6000, 775, 8, 10, 1, 0, ['evasion', 'refraction']],
  [29, 'Papagaio Barqueiro', 4500, 1000, 8, 10, 1, 0, ['evasion', 'refraction']],
  [30, 'Cavaleiro do Tapete', 80000, 750, 0, 10, 1, 1, []],
  [31, 'Traça de Livro', 14000, 900, 12, 100, 0, 0, ['magicImmune', 'refraction']],
  [31, 'Dragão Lontra', 21000, 800, 12, 10, 0, 0, ['physImmune', 'refraction']],
  [32, 'Tubarão Recarregável', 85000, 600, 12, 10, 0, 0, ['regen']],
  [33, 'Zumbi de Laço', 80000, 700, 12, 10, 0, 0, ['physImmune', 'blink']],
  [33, 'Bebê DP', 55000, 1000, 12, 10, 0, 0, ['physImmune', 'blink']],
  [34, 'Bebê Sangrento', 13000, 925, 12, 10, 1, 0, ['evasion']],
  [34, 'Aprendiz Caçador', 20000, 725, 12, 10, 1, 0, ['evasion']],
  [35, 'Raposa Preta e Branca', 8800, 700, 12, 100, 1, 0, ['magicImmune']],
  [36, 'Jumo', 55000, 1000, 12, 100, 0, 0, ['magicImmune']],
  [37, 'Baekho', 120000, 1200, 12, 10, 0, 0, ['blink']],
  [38, 'Lilnova', 200000, 1000, 12, 10, 0, 0, ['disarm']],
  [39, 'Cavaleira Sereia', 55000, 600, 12, 10, 1, 0, ['untouchable', 'kraken', 'evasion']],
  [39, 'Tritão', 15000, 800, 12, 10, 1, 0, ['untouchable', 'kraken', 'evasion']],
  [40, 'Fantasma Arrepiante', 330000, 800, 0, 10, 1, 1, ['kraken']],
  [41, 'Dragão de Jade', 240000, 700, 16, 50, 0, 0, ['refraction']],
  [41, 'Azuremir', 120000, 1300, 16, 25, 0, 0, ['refraction']],
  [42, 'Kupu', 15000, 700, 16, 100, 1, 0, ['magicImmune', 'rush']],
  [43, 'Peixe Peludo', 190000, 800, 16, 50, 0, 0, ['untouchable', 'evasion', 'regen']],
  [44, 'Cogumelinho', 200000, 500, 16, 100, 0, 0, ['magicImmune', 'blink']],
  [45, 'Piu-piu', 120000, 2400, 16, 10, 1, 0, ['disarm']],
  [46, 'Bufão', 600000, 800, 32, 20, 0, 0, ['physImmune']],
  [47, 'Burro Ligeiro', 300000, 500, 16, 80, 0, 0, ['magicImmune', 'untouchable', 'rush']],
  [47, 'Migalha', 550000, 600, 16, 80, 0, 0, ['untouchable', 'rush']],
  [48, 'Coelhinho', 60000, 550, 16, 10, 1, 0, ['magicImmune', 'disarm', 'evasion']],
  [48, 'Mensageiro G1', 100000, 400, 16, 10, 1, 0, ['magicImmune', 'disarm', 'evasion']],
  [49, 'Drodo', 800000, 700, 32, 80, 0, 0, ['kraken', 'regen']],
  [50, 'Roshan Bebê', 1000000, 1000, 16, 20, 1, 1, ['kraken']],
];

export const MAX_LEVEL = 50;

export const ENEMY_TYPES = RAW.map(([level, name, hp, speed, armor, mr, air, boss, abilities], i) => ({
  id: i, level, name, hp, speed, armor, mr, air: !!air, boss: !!boss, abilities,
}));

// Wave composition (tunable): 10 units per normal level split between variants, 1 for bosses.
export const UNITS_PER_WAVE = 10;
export function waveFor(level) {
  const types = ENEMY_TYPES.filter((e) => e.level === level);
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
  return type.boss ? 30 + type.level * 3 : 2 + Math.floor(type.level / 3);
}

export const ABILITY_TEXT = {
  invis: 'Invisível', evasion: 'Evasão 50%', refraction: 'Refração', blink: 'Teleporte',
  rush: 'Arrancada', disarm: 'Aura de desarme', magicImmune: 'Imune a magia',
  physImmune: 'Imune a físico', untouchable: 'Intocável', reactive: 'Armadura reativa',
  highArmor: 'Armadura alta', regen: 'Regeneração', kraken: 'Casco de Kraken',
};
