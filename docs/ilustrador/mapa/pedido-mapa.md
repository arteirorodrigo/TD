# Pedido do mapa para o ilustrador (molde v2, 24/11/2026)

Arquivos desta pasta:
- `molde-mapa-4096-v2.png`: o molde para desenhar por cima, com o mesmo tamanho e as mesmas medidas do jogo de hoje.
- `molde-no-jogo-celular.png`: o próprio molde colocado no jogo, no celular em pé. As cruzes que o jogo desenha caem em cima das cruzes do molde.
- `mapa-atual-no-jogo-celular.png`: o mapa que está no jogo hoje, para comparar.

O molde é gerado por `python3 scripts/molde-mapa.py <saida.png>`. Se o mapa do jogo mudar, rode de novo.

## O que mudou desde o molde anterior (`docs/mapa-ideias/molde-mapa-4096.png`)

1. **A trilha agora é do jogo.** O jogo desenha sozinho a trilha vermelha tracejada, seguindo o caminho real. Esse caminho muda conforme o labirinto que o jogador monta, e o jogador pode até montar e guardar labirintos no menu "Labirintos". Por isso o desenho **não deve ter trilha, estrada nem rio em linha reta** dentro da área de jogo. No molde anterior podia "ondular por perto", e isso deixou de valer.
2. **As cruzes dos pontos e os números (E, 1 a 6, S) também são do jogo.** Debaixo delas o fundo deve ficar liso.
3. **Celular sempre em pé.** No celular o mapa inteiro aparece com uns 370 px de largura (ver `molde-no-jogo-celular.png`), ou seja, mais ou menos 11 vezes menor que o arquivo. Textos da borda precisam de pelo menos **150 px de altura** no arquivo para dar para ler. Detalhe fino na borda some no celular. Ao dar zoom para colocar pedras, o centro aparece grande, por isso o arquivo continua em 4096.
4. **Nome do jogo:** "O Covil dos Dragões TD" (em inglês, "Dragonscale TD"). O mapa de hoje ainda diz "Dragon Realm Map".
5. **Papel rasgado ou queimado é permitido**, como no mapa de hoje, mas só até a linha tracejada de fora (140 px da beira). O que ficar fora do papel deve ser pintado na cor da mesa de madeira escura do jogo, porque a imagem não pode ter partes transparentes.

## Recado para mandar ao ilustrador

> Olá! Precisamos da versão final do mapa para o fundo do jogo. Vai junto o **molde** (`molde-mapa-4096-v2.png`): desenhe por cima dele.
>
> 1. **Tamanho**: imagem **quadrada de 4096 x 4096 px**, em JPG ou PNG, sem transparência. Se possível, mande também o arquivo em camadas.
> 2. **Área de jogo**: o quadrado do centro, de **559 a 3537 px** nos dois sentidos, com 64 x 64 quadrados de 46,5 px. As pedras ocupam 2 x 2 quadrados.
> 3. **Borda**: os 559 px de cada lado são livres para título, bússola, dragões, serpentes e moldura. O título é **"O Covil dos Dragões TD"**.
> 4. **Dentro da área de jogo**: fundo **claro e calmo**, com desenhos pequenos, espaçados e de traço fino e fraco (no máximo um terço da força do traço da borda). **Nada de texto**, montanhas e florestas grandes ou manchas escuras. **Não pinte trilha nem estrada**, porque o jogo desenha a trilha sozinho e ela muda a cada partida.
> 5. **Pontos do caminho**: o jogo desenha uma cruz em cada ponto. Deixe o fundo liso debaixo delas. Centro de cada ponto, em px (x a partir da esquerda, y a partir de cima):
>    - Entrada: 3258, 605
>    - 1: 3258, 1117
>    - 2: 2141, 1117
>    - 3: 2141, 2607
>    - 4: 3258, 2607
>    - 5: 3258, 1862
>    - 6: 1396, 1862
>    - Saída: 1396, 3491
>
>    Um castelo perto da entrada (em cima, à direita) e a caverna do covil perto da saída (embaixo, à esquerda) ficam ótimos, mas **na borda**, do lado de fora do quadro.
> 6. **Celular**: o mapa inteiro aparece pequeno no celular em pé. Os textos da borda precisam ter pelo menos 150 px de altura, e os desenhos da borda devem ser grandes e com contraste.
> 7. **Bordas rasgadas ou queimadas**: podem, mas só até 140 px da beira. Fora do papel, pinte o fundo de madeira escura.
> 8. **Textos**: confira a grafia, sem letras espelhadas nem números soltos.

## Revisão do mapa anterior

Os problemas do desenho anterior (textos errados, formato 4:3, trilha fora do lugar, faixas retas) estão em `docs/mapa-ideias/revisao-mapa-ilustrador.md`.
