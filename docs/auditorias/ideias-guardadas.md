# Ideias guardadas para ajustar depois

O dono pediu para guardar estas propostas e voltar a elas mais tarde (22/11/2026, 2ª auditoria).
Não implementar sem ele pedir. Detalhes e medições em `2026-11-22-2-jogabilidade.md` e em `.auditoria-trabalho/2026-11-22-2/`.

## Chefe da fase 50 (Rei Caçador de Dragões)
- **Problema medido:** ele voa e cruza o mapa em 14 s. Com a vida ×10, nem o time mais forte tira mais de 4% da vida dele. Todo jogador perde 3 vidas na 50 (e na 75, 100…). No Sobrevivente, ninguém passa da 49.
- **Opção A (recomendada):** velocidade 1000 → 550 e vida ×1. O time forte mata; na 75 ele volta a escapar.
- **Opção B:** andar pelo labirinto com vida ×3. Luta de 2 min e meio.
- Onde mexer: `src/data/enemies.js`.

## Valquíria (fase 45, e 70, 95…)
- **Problema medido:** velocidade 2400 (o dobro do segundo mais rápido). Atravessa o mapa em 5,7 s; escapam 8 a 10 das 10, até do melhor time.
- **Proposta:** velocidade 1100. Com o time forte, escapam 2 na 45 e 9 na 70.
- Observação: 2400 veio da tabela do Dota 2; lá a velocidade normal tem teto de 550, então talvez nunca tenha valido no original.
- Onde mexer: `src/data/enemies.js`.

## Sorte nível 9 e 10
- **Problema medido:** com a sorte no máximo, só 1,2% das rodadas dão uma Ancestral (T5): 0,35 por partida. Os dragões finais pedem duas. A receita alternativa pede uma Partida (T0), que deixa de sair com a sorte alta.
- **Proposta:** níveis 9 (Perfeita 15%) e 10 (Perfeita 25%), a 260 e 290 de ouro, com visual especial ("Sorte do Dragão"). A chance de T5 por rodada sobe para 7,3%.
- **Atenção:** muda a regra original de 8 níveis de sorte.
