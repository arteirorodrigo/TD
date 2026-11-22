# Vida dos inimigos, evolução dos dragões e etiqueta de nível — design curto

Aprovado pelo dono em 22/11/2026.

## Por quê
- A barra de vida dos inimigos existe, mas some com o mapa inteiro na tela.
- O jogador não sabe que os dragões evoluem nem o que falta para evoluir.
- "Par" (Partida) e "Per" (Perfeita) se confundem; falta um número de nível claro.

## O que muda
1. **Inimigo selecionável**: clicar perto de um inimigo (pega o mais próximo do toque) seleciona-o.
   - Anel brilhante em volta dele no mapa.
   - Cartão no painel: nome, tipo (Terrestre/Voador/Chefe), barra de vida com "atual / máx." atualizada ao vivo, armadura, velocidade, efeitos ativos (Lento, Envenenado, Atordoado, Congelado).
   - Fecha sozinho quando o inimigo morre ou escapa.
   - Barra de vida sobre todos os inimigos fica mais grossa/maior.
2. **Próxima evolução no cartão do dragão**: lista cada receita que usa este dragão como ingrediente, com o resultado e cada ingrediente marcado ✓ (existe no campo/rodada) ou ✗, mostrando o nível T de escamas. O botão "Chocar" continua igual (só aparece quando completo, na fase de escolha).
3. **Etiqueta T0–T5**: T = qualidade (Partida T0 … Ancestral T5).
   - No mapa: rótulo pequeno "T#" em cima de cada escama base.
   - No painel: "T0 · Partida" nos 5 quadradinhos da rodada, no título do cartão da escama e nos ingredientes da evolução.

## Fora do escopo
- Mudar regras de receitas ou balanceamento.
- Nível para dragões (eles já têm tamanho visual por estágio).

## Abordagens
Uma só faz sentido: usar o que o jogo já tem (cartão de seleção do painel, `specialOptions`/`RECIPES`, sprites de rótulo do `render.js`). Alternativas como tela separada de enciclopédia não respondem ao pedido de ver na hora.

## Decisões deixadas ao construtor
- Raio do clique no inimigo, tamanho exato do rótulo T e da barra.
