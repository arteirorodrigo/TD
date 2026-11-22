// Writes the themed list of scales (bases) and dragons (evolutions) as Markdown.
import { TOWERS, GEM_TYPES, QUALITIES, abilityText, CELL } from '../src/data/towers.js';
const out = [];
const r = (v) => (v >= 5000 ? 'mapa todo' : (v / CELL).toFixed(1).replace('.', ',') + ' q');
out.push('# Ninho dos Dragões: escamas e dragões', '', 'Gerado de `src/data/towers.js`. Alcance em quadrados do mapa (q). Intervalo em segundos entre ataques.', '');
out.push('## Escamas (bases)', '', 'Qualidades, da pior para a melhor: ' + QUALITIES.join(', ') + '.', '');
for (const [k, t] of Object.entries(GEM_TYPES)) {
  out.push(`### Escama de ${t.name}`, '', '| Qualidade | Código | Dano | Intervalo | Alcance | Efeito |', '|---|---|---|---|---|---|');
  for (let q = 0; q < 6; q++) {
    const d = TOWERS[`${k}${q + 1}`];
    out.push(`| ${QUALITIES[q]} | ${k}${q + 1} | ${d.dmg} | ${d.rate} | ${r(d.range)} | ${d.abilities.map(abilityText).join('; ') || '—'} |`);
  }
  out.push('');
}
out.push('## Dragões (evoluções)', '', 'Códigos de escama: letra do elemento + número da qualidade (1 = Partida ... 6 = Ancestral). ' + Object.entries(GEM_TYPES).map(([k, t]) => `${k} = ${t.name}`).join(', ') + '.', '');
out.push('| Dragão | Receita | Dano | Intervalo | Alcance | Habilidades |', '|---|---|---|---|---|---|');
const nm = (id) => (TOWERS[id].base ? id : TOWERS[id].name);
for (const d of Object.values(TOWERS)) {
  if (d.base) continue;
  const rec = [d.recipe, d.alt].filter(Boolean).map((x) => x.map(nm).join(' + ')).join(' **ou** ');
  out.push(`| ${d.name} | ${rec} | ${d.dmg} | ${d.rate} | ${r(d.range)} | ${d.abilities.map(abilityText).join('; ') || '—'} |`);
}
process.stdout.write(out.join('\n') + '\n');
