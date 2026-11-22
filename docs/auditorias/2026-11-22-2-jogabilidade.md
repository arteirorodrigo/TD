# 5 melhorias de jogabilidade — 2ª auditoria (22/11/2026)

**Resumo:** o fim do jogo tem duas ondas que nenhum time segura (Valquíria na 45 e chefe na 50), os dragões finais quase nunca saem e o celular vai pesando conforme o labirinto cresce.

**Como foi medido:** simulações com as regras reais do jogo, num labirinto de 250 pedras (como na fase 50), com um time **forte** (54 torres, mais forte que um jogador real) e um **médio** (50 torres). Scripts e resultados em `.auditoria-trabalho/2026-11-22-2/`.

## 1. O chefe final nunca morre, nem para o time mais forte
- **Hoje:** o chefe da fase 50 voa e cruza o mapa em 14 segundos. Com a vida ×10 da manhã, o time forte tira só **4%** da vida dele. Todo mundo perde 3 vidas na 50 (e na 75, 100…). No Sobrevivente, **ninguém passa da 49**.
- **Proposta:** voar mais devagar (1000 → 550) e voltar à vida ×1. O time forte mata na 50; na 75 ele volta a escapar, então o infinito continua endurecendo.
- **Por que melhora:** o chefe final vira um teste difícil, mas possível.
- **Esforço:** pequeno (2 números).

## 2. A Valquíria (fase 45) é rápida demais
- **Hoje:** velocidade 2400, o dobro do segundo inimigo mais rápido. Atravessa o mapa em 5,7 s. Escapam **8 a 10 das 10**, mesmo do time forte. No Médio, é fim de jogo na 45.
- **Proposta:** velocidade 1100 (ainda o voador mais rápido). Com o time forte, escapam 2 na 45 e 9 na 70.
- **Por que melhora:** a fase 45 vira uma onda difícil, e não uma onda impossível.
- **Esforço:** pequeno (1 número).

## 3. O celular desenha cada peça separada
- **Hoje:** desenhos por quadro: 59 no mapa vazio, 859 com 250 pedras, 1.741 com mais 54 torres, até 2.283 durante uma onda. Para um celular médio manter o jogo liso, o ideal é ficar abaixo de 200–300. (É um problema diferente da memória corrigida de manhã.)
- **Proposta:** desenhar todas as pedras de uma vez, como cópias da mesma peça; cada escama vira uma peça só; tiros e sombras também de uma vez. **Fazer junto com a melhoria 3 de design** (peças legíveis): as pedras viram o bloco 2x2 com contorno que o design pede. Só as pedras caem de ~1.000 desenhos para menos de 10.
- **Por que melhora:** o jogo fica mais claro e mais leve justamente nas fases finais e no infinito.
- **Esforço:** médio (só no desenho; as regras não mudam).

## 4. Os 8 dragões finais quase nunca aparecem — **precisa do seu sim**
- **Hoje:** com a sorte no máximo, só **1,2%** das rodadas dão uma Ancestral (T5): em média 0,35 por partida. Os dragões finais pedem duas. A receita alternativa pede uma Partida (T0), que não sai mais no sorteio.
- **Proposta:** dois níveis de sorte a mais, 9 e 10 (260 e 290 de ouro). A chance sobe para 7,3% por rodada, e o ouro ganha um uso no fim do jogo. Esses níveis teriam visual especial ("Sorte do Dragão").
- **Por que melhora:** completar uma linha do Livro vira um objetivo raro, mas possível.
- **Esforço:** pequeno. **Muda a regra dos "8 níveis de sorte" igual ao original.**

## 5. Dragão Perolado e Dragão Ladrão não têm poder nenhum
- **Hoje:** o Perolado só atira (79 de dano por segundo). O Ladrão, que nasce dele, atira **mais fraco** (47). Chocar o Ladrão piora o time.
- **Proposta:** o Ladrão "rouba" a Evasão e a Refração do inimigo por 3 s (aparece "roubada!"); com isso o time médio tira o dobro de dano nas fases de evasão. O Perolado protege as torres perto dele contra desarme.
- **Por que melhora:** todo dragão do Livro passa a valer a pena.
- **Esforço:** pequeno.

## Pequenos erros (confirmados no código)
- "✓ ✓" repetido na "Próxima evolução" do cartão do dragão.
- Perder vida mostra sempre "−vida", mesmo quando o chefe tira 3.
- O fim da onda não gera nenhuma resposta na tela.
- No celular deitado, a ordem dos quadros do painel quebrou (causa da melhoria 2 de design).
- As receitas alternativas pedem uma Partida (T0) e o jogo não avisa que ela deixa de sair com a sorte alta.

## Decisão sua
1. **Sorte 9 e 10 (melhoria 4):** (a) aceitar; (b) manter os 8 níveis igual ao original. Recomendação: **(a)**, porque hoje a última página do Livro fica fora de alcance.
2. **Chefe 50 (melhoria 1):** (a) voar mais devagar, luta curta; (b) andar no chão pelo labirinto, com vida ×3, luta de 2 min e meio. Recomendação dos dois auditores: **(a)**, porque luta longa cansa no celular.

## Ficou de fora (medido)
- Leviatã Ancestral e Wyvern Rainha parecem fracos sozinhos, mas ajudam o time pelas auras: não mexer agora.
- O Dragão da Sorte cura bastante, mas não muda até onde se chega.
- Saltos grandes de vida dos inimigos nas fases 21 e 32: olhar numa próxima rodada.
- As ondas a pé do fim são longas (200–285 s em 1x).
