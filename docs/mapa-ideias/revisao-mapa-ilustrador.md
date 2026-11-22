# Revisão do mapa do ilustrador (teste ?mapa=16) — 22/11/2026

Arquivo avaliado: `docs/referencias/15e30220-e2c0-49e8-b30b-67ce40348a8a.webp` (1024x764, formato 4:3).
No jogo: recorte quadrado em `src/assets/mapa-teste/ilustrador-v1.jpg`, visto em `http://localhost:5173/?mapa=16`.

Fotos usadas:
- `docs/mapa-ideias/16-ilustrador-dragoes.png` — computador, fase 5, com 4 dragões e pedras colocados
- `docs/mapa-ideias/16-ilustrador-celular-deitado.png` — celular deitado (844x390), mesmo momento
- `docs/mapa-ideias/16-comparar-codigo-celular-deitado.png` — o mesmo no nosso mapa feito por código (?mapa=14)
- `docs/mapa-ideias/16-trilha-real-sobre-desenho.png` — caminho real dos inimigos (azul) desenhado por cima do desenho, com o quadrado da área de jogo
- foto da onda 1 tirada antes: `mapa-16-onda.png` (pasta temporária)

---

## 1. O que está bom e deve ser mantido

- **O estilo**: tinta marrom sobre pergaminho, árvores e montanhas desenhadas à mão, serpentes do mar, rosa dos ventos com o **olho de dragão** no centro. Fica muito mais "mapa de verdade" que a nossa versão por código. É o ponto mais forte.
- **Castelo na entrada** (Cidadela, canto de cima à direita) com a trilha saindo da porta, e **caverna do dragão na saída** (embaixo à esquerda). Conta a história do jogo sem texto: inimigos saem do castelo e vão até o covil.
- **Título em faixa** "O COVIL DOS DRAGÕES / Ilha das Escamas" e a **bússola** num canto: ótimos, mas precisam ficar na borda (ver item 2).
- **Dragões grandes, dragão no rochedo, fogueira, serpentes**: decoram bem nas bordas, onde ninguém joga.
- **Moldura com barras pretas e brancas** (régua de mapa antigo): dá acabamento.
- **Trilha vermelha tracejada e torta**: é exatamente o que o dono pediu — mas precisa seguir o caminho real (item 3).

## 2. Problemas da imagem em si

Texto (parece escrito por IA, com letras erradas):
1. "Mar de **Ensofre**" → deve ser "Mar de **Enxofre**".
2. "Floresta **Blfea**" (ou "Elfea") → "Floresta **Élfica**".
3. "**Monree de Wysm**" → "**Montes do Wyrm**".
4. Logo à direita, um segundo "**Monree de**" **espelhado** (letras ao contrário) — apagar.
5. "**Ntoha** do Dragão" → "**Ninho** do Dragão".
6. Rabiscos que parecem números soltos dentro da floresta: "**800**", "**008**" (este espelhado), "0000" — apagar.
7. Números da moldura sem sentido e fora de ordem (22, 2, 26, 29, 44…47, 20, 28, 27, 30, 24, "008", "85"). Ou numerar certinho (ex.: 1 a 8 nos quatro lados) ou tirar.
8. Uma letra "N" solta perto da Costa das Brasas, fora da bússola — apagar.
9. A faixa do título tem a ponta esquerda cortada ("| O COVIL") — redesenhar inteira.
10. Dois nomes parecidos para lugares diferentes: "Covil dos Dragões" (no mar, à esquerda) e "Ninho do Dragão" (na caverna da saída). Sugestão: a caverna da saída se chama **"Covil dos Dragões"** (é o nome do jogo) e o outro rótulo sai ou vira outro nome.

Formato e montagem:
11. **Formato 4:3 (retangular)**; o jogo precisa de **quadrado**. Ao recortar para quadrado, perdem-se o título (cortado no topo), "Mar de Ensofre", "Covil dos Dragões" (vira "ovil dos Dragões") e metade da bússola — ver a foto da onda.
12. **Resolução baixa** (1024 px de largura). No jogo, ampliado, fica borrado. Precisa de 4096x4096.
13. **Faixas claras retas** (sobras da nossa foto): retângulos claros e escuros atravessando o mapa na horizontal e na vertical. Elas **não batem com o caminho real** (algumas ficam 4 a 6 quadrados deslocadas, ver `16-trilha-real-sobre-desenho.png`) e parecem uma segunda estrada. Apagar todas.
14. **Emendas retangulares** na floresta da esquerda (blocos de árvores com borda reta, como recorte colado) e uma faixa vertical lisa entre eles. Redesenhar a floresta como mancha natural.
15. Os **marcadores verdes** perto da Cidadela (pedaços dos nossos inimigos que vieram da foto) — apagar.

## 3. Problemas de jogo

**Legibilidade (fotos `16-ilustrador-dragoes.png` e `16-ilustrador-celular-deitado.png`):**
- **Dragões** (vermelho, verde, amarelo, preto) aparecem bem — a cor salta do marrom. O preto quase some em cima das montanhas.
- **Pedras cinza** ficam difíceis de ver em cima das **montanhas e florestas desenhadas em tinta escura**: viram "mais um rabisco". Na fileira de cima (em cima de "Montes do Wyrm") e na do meio (montanha central), é preciso procurar as pedras. No mapa por código (`16-comparar-codigo-celular-deitado.png`) elas aparecem na hora, porque o fundo ali dentro é liso.
- **Inimigos** são pequenos e cinza-azulados: em cima de hachuras e árvores somem; no celular deitado ficam do tamanho de um ponto.
- No celular deitado o desenho inteiro vira "textura marrom" — muitos detalhes finos não se leem e só pesam.

**O que o desenho deve evitar DENTRO da área de jogo (o quadrado do meio):**
- Montanhas, florestas densas, hachuras e manchas escuras grandes. Ali o jogador coloca pedras em qualquer lugar: o fundo deve ser **claro e calmo**, com desenhos **pequenos, espaçados e em traço fino/claro** (no máximo 30–40% da força do traço das bordas).
- **Texto** dentro da área de jogo (fica embaixo de pedras e dragões). Nomes de lugares só nas bordas, ou bem perto da borda de dentro.
- Coisas que parecem caminho e não são: segunda trilha, faixas retas, rios em linha reta.

**A trilha desenhada vs. o caminho real** (`16-trilha-real-sobre-desenho.png`):
- **Entrada → 1 → 2** (castelo, depois para a esquerda): passa perto. Bom.
- **2 → 3** (descida): a trilha desce uns 4–8 quadrados à esquerda do caminho real.
- **3 → 4** (ida para a direita embaixo): uns 4 quadrados abaixo.
- **4 → 5** (subida à direita) e **5 → 6** (volta para a esquerda no meio): perto. Bom.
- **6 → saída** (descida final): a trilha vai por fora, uns **14 quadrados à esquerda**, longe do caminho real.
- Há uma **trilha a mais** (uma volta extra em torno da montanha do meio) que os inimigos não fazem. Confunde.
- Regra: a trilha pode serpentear, mas **sempre a no máximo 2–3 quadrados (100–140 px na imagem final) da linha reta** e **passando exatamente pelos 8 pontos**.

---

## 4. Pedido de refinamento (pronto para enviar ao artista)

> Olá! Adoramos o estilo do mapa. Precisamos de uma versão final para usar como fundo do jogo. Vai junto um **molde** (`molde-mapa-4096.png`) com a área de jogo, os pontos e o caminho marcados — desenhe por cima dele.
>
> 1. **Tamanho**: imagem **quadrada, 4096 x 4096 px**, sem texto da moldura cortado. Entregar também o arquivo em camadas, se possível.
> 2. **Área de jogo** = o quadrado do centro, de **559 a 3537 px** (nos dois sentidos). Cada "quadrado" do jogo mede **46,5 px**. Tudo fora disso (559 px de cada lado) é **borda livre** para enfeites.
> 3. **Pontos do caminho** (centro de cada ponto, em px, x = da esquerda, y = de cima):
>    - Entrada: **3258, 605** (na borda de cima da área de jogo)
>    - Ponto 1: **3258, 1117**
>    - Ponto 2: **2141, 1117**
>    - Ponto 3: **2141, 2607**
>    - Ponto 4: **3258, 2607**
>    - Ponto 5: **3258, 1862**
>    - Ponto 6: **1396, 1862**
>    - Saída: **1396, 3491** (na borda de baixo da área de jogo)
>    Os inimigos andam em linha reta de um ponto ao outro nessa ordem.
> 4. **Trilha tracejada vermelha**: pode ser torta e natural, mas tem que **passar por cima dos 8 pontos** e nunca se afastar mais de **~120 px** da linha reta entre eles. **Uma trilha só**, sem desvios nem voltas extras.
> 5. **Castelo (Cidadela)** na borda de cima, logo acima da entrada (por volta de x 3258, y 0–560), com a trilha saindo da porta. **Caverna do covil** na borda de baixo, logo abaixo da saída (por volta de x 1396, y 3540–4096), com a trilha entrando nela.
> 6. **Dentro da área de jogo**: fundo **claro e calmo**. Desenhos pequenos, espaçados e em traço fino e claro (árvores soltas, morrinhos, casinhas). **Sem** florestas fechadas, montanhas grandes, hachuras escuras nem texto ali dentro — o jogador coloca peças em cima.
> 7. **Nas bordas (fora do quadrado)**: aí sim, desenho rico — **título** "O COVIL DOS DRAGÕES / Ilha das Escamas" no topo à esquerda (aprox. x 300–2000, y 80–500), **bússola com olho de dragão** no canto de baixo à direita (aprox. x 3560–4050, y 3560–4050), **dragões grandes, serpentes do mar, rochedo, fogueira** nas laterais. Nada disso pode entrar no quadrado do meio.
> 8. **Apagar**: todas as faixas claras retas e retângulos que vieram da nossa foto, os marcadores verdes perto da Cidadela, os números soltos "800", "008", "0000", a letra "N" solta, e o texto espelhado "Monree de".
> 9. **Corrigir nomes**: "Mar de **Enxofre**", "Floresta **Élfica**", "**Montes do Wyrm**", "**Covil dos Dragões**" na caverna da saída. Números da moldura em ordem (ex.: 1 a 8 em cada lado) ou sem números.
> 10. **Floresta da esquerda**: redesenhar como mancha natural, sem bordas retas de recorte.
> 11. Manter o estilo atual: tinta marrom, pergaminho envelhecido, moldura com barras pretas e brancas.
