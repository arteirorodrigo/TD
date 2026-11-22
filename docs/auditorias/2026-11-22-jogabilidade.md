# 5 melhorias de jogabilidade — 22/11/2026

**Decisão do dono (22/11):** fazer 1, 4 e 5. O "Trocar uma pedra" (4) só aparece depois que a sorte estiver no nível máximo. A 2 e a 3 foram descartadas.

**Resumo:** as regras funcionam, mas existem três "paredes" injustas (a fase 8, as fases imunes a dano físico e o recomeço fácil do modo infinito), o ouro sobra sem uso e o jogo vai ficando pesado em partidas longas.

Auditoria feita pelo auditor de game dev, medindo com centenas de partidas simuladas pelas regras reais do jogo e com o jogo aberto no navegador, e revisada pelo auditor de game design. As evidências estão em `.auditoria-trabalho/2026-11-22/dev/`.

Aviso: o "robô" que joga as simulações é simples e perde cedo. Por isso os números servem para comparar uma mudança de cada vez, não para dizer se o jogo todo está fácil ou difícil.

---

## 1. O jogo vai ficando pesado e pode travar o celular — esforço pequeno
- **Hoje:** cada onda deixa uns 85 restos de desenho na memória que nunca são apagados. Em 30 ondas, a memória sobe de 18 para 64 MB e cada quadro leva o dobro do tempo para ser desenhado. Nas fases infinitas, o celular acaba travando.
- **Proposta:**
  - Apagar esses restos quando o inimigo morre e reaproveitar os desenhos de cada raça.
  - No celular, desenhar com um pouco menos de detalhe.
  - No cartão do chefe, atualizar só a barra de vida, em vez de redesenhar o cartão todo 10 vezes por segundo.
- **Por que:** travamento derruba a nota na Play Store. Também é o que libera a "festa do dragão" do relatório de design.
- Os arcos de combinação feitos hoje foram conferidos e não pesam.

## 2. ~~A fase 8 (inimigos invisíveis) é a maior parede do começo~~ — DESCARTADA pelo dono (22/11). Não propor de novo.
- **Hoje:** mesmo com uma escama Etérea em campo, perdem-se em média 5,6 vidas na fase 8, contra 1,6 na fase 7. No Médio, isso é mais da metade das vidas. E a Etérea é a escama de menor dano, então quem não conhece o jogo a descarta.
- **Proposta:** a Etérea passa a revelar invisíveis mais longe (raio 900 em vez de 500). Nas simulações, a perda cai para 3,9 vidas. Também entra o aviso 3 ondas antes, que é o item 2 do relatório de design.
- **Por que:** a fase continua pedindo a escama certa, mas deixa de ser uma armadilha.

## 3. ~~As fases "imunes a dano físico" viram tudo ou nada~~ — DESCARTADA pelo dono (22/11). Não propor de novo.
- **Hoje:** nas fases 23, 33 e 46, 7 dos 8 tipos de escama causam dano zero. Um time forte passa as fases 20 a 26 sem perder nada, exceto a 23, onde escapam os 10 inimigos: no Médio, é fim de jogo na hora.
- **Proposta:** "imune" vira "resistente", e 40% do dano físico passa. Com o mesmo time, escapa 1 inimigo em vez de 10.
- **Por que:** o jogador perde por falta de força, não por não ter adivinhado 15 fases antes.

## 4. O ouro só serve para a sorte e sobra muito — esforço médio
- **Hoje:** a sorte fica no máximo por volta da fase 20, e depois entram milhares de ouro sem nenhum uso. Comprar sorte nem é uma escolha, porque sempre se compra assim que dá.
- **Proposta:** um segundo uso, **"Trocar uma pedra"**. Na hora de escolher, você paga para sortear de novo uma das 5 escamas da rodada. O preço sobe a cada troca na mesma rodada: 50, 100, 200.
- **Por que:** o ouro vira uma decisão a cada rodada: investir na sorte ou trocar agora para fechar uma receita de dragão.

## 5. O modo infinito recomeça fácil demais, e os chefes são mais fracos que as fases antes deles — esforço pequeno
- **Hoje:** a fase 51 é 100 mil vezes mais fraca que a 49, e são quase 20 fases sem desafio a cada ciclo. O chefe final (fase 50) tem 12 vezes menos vida que a fase 49, e os chefes das fases 20 e 30 também são mais fracos que as fases antes deles.
- **Proposta:** no infinito, repetir só as fases 26 a 50, reforçadas, em vez de recomeçar da fase 1. O chefe 50 ganha 10 vezes mais vida, e os chefes 20 e 30 ganham o dobro.
- **Por que:** o jogador mais engajado não passa 20 fases sem fazer nada, e o chefe volta a ser o ponto alto.

---

## Onde os auditores conversaram
- Os dois concordaram com as 5 melhorias um do outro.
- O único atrito foi a festa do dragão (design) contra o desempenho (item 1): a festa só entra depois da correção de memória, reaproveitando os efeitos que já existem.

## Pequenos erros encontrados (rápidos de corrigir)
- "Novo recorde!" aparece mesmo saindo na fase 1.
- O texto "1 defensores" deveria ser "1 defensor".
- O "Dano causado" da Salamandra e dos dragões de fogo mostra 0: o dano das auras e do veneno não é somado.
- Dá para chocar um dragão só com torres antigas, e aí as 5 pedras novas viram rocha.
- A ferramenta de fotos dos auditores mostra um erro ao fechar (a foto sai normal).

## Para você decidir
A ordem sugerida pelos dois auditores, juntando os relatórios, é:
1. Celular leve (jogabilidade 1) + celular deitado (design 1).
2. Fase 8 + fases resistentes + avisos (jogabilidade 2 e 3 + design 2).
3. Modo infinito e chefes (jogabilidade 5).
4. Tela de fim (design 5) + pequenos erros.
5. "Trocar uma pedra" (jogabilidade 4), primeira partida (design 3) e festa do dragão (design 4).
