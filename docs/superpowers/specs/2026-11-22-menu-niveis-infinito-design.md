# Tela inicial, níveis de dificuldade e fases infinitas — design (Parte 1)

Aprovado pelo dono em 22/11/2026. A Parte 2 (ranking online com Firebase) é outro projeto, feito depois.

## Por quê
O jogo vai para a Play Store e outras lojas. Precisa de uma entrada de verdade (menu), de dificuldade escolhida pelo jogador e de partidas sem fim, para que o ranking (Parte 2) compare quem chega mais longe.

## Objetivos
1. **Tela inicial** no estilo pergaminho (referência: tela inicial do protótipo no Lovable, "Ideia A" aprovada):
   - Pequeno "Crônicas do", título "Ninho dos Dragões", filete, ilustração do dragão no ninho, frase "Os caçadores querem o tesouro do ninho. Plante escamas, trace o labirinto e desperte os dragões."
   - Botão grande **Jogar** (couro escuro); abaixo, lado a lado, **Ranking** e **Livro dos Dragões** (contorno).
   - Linha "Recorde: fase X".
   - Fontes do jogo (Cinzel + Manrope), não as do Lovable.
2. **Escolha de nível**, mesmo fundo de pergaminho, título "Escolha o nível", 4 bandeiras (couro escuro, faixa dourada no topo; Sobrevivente em vermelho):
   - Fácil 20 vidas · Médio 10 · Difícil 5 · Sobrevivente 1.
   - Tocar numa bandeira já começa a partida. "← Voltar" volta ao menu.
3. **Vidas por nível**: começa com as vidas do nível; o Dragão da Sorte (cura) não passa desse máximo. Chefe que escapa continua tirando 3.
4. **Fases infinitas**: depois da fase 50 o ciclo recomeça (fase 51 = inimigos da 1, 60 = chefe da 10…), cada volta mais forte. Não existe mais "Vitória".
5. **Fim de partida**: "Você chegou à fase X", "Novo recorde!" quando bater o recorde daquele nível, botões **Jogar de novo** (mesmo nível) e **Menu**.
6. **Ranking**: o botão abre um aviso "Em breve" (a lista vem na Parte 2).
7. **Livro dos Dragões**: o mesmo guia de receitas do botão "Dragões" da partida, com visual de pergaminho; fora da partida nenhum ingrediente aparece como "já no mapa".
8. **Mapa gramado** como chão da partida (textura do Lovable), caminho como trilha de terra. A grama entra como base dentro do shader atual do chão: grade de construção, plataformas dos waypoints, destaque de hover e caminho continuam desenhados por cima. Os lagos e montanhas dos cantos já vêm na própria imagem (teste aprovado pelo dono: textura sem conversão sRGB, brilho ×0,62, caminho cor de terra).
9. **Sair no meio da partida**: botão "Menu" na barra de cima, com confirmação "Sair da partida?". Sair encerra a partida e a fase atual conta como resultado (recorde agora; ranking na Parte 2), com as vidas que restavam.

## Fora do escopo
- Ranking online, apelido, Firebase (Parte 2).
- Trocar o visual da partida além do chão (painéis seguem escuros).
- Novos inimigos, balanceamento fino, sons.
- Versão do mapa sem os lagos dos cantos (os lagos são só desenho; continua dando para construir ali).

## Decisões do dono
- Ranking será online, com Firebase, um por nível, ordenado por fase alcançada e, no empate, mais vidas restantes (Parte 2).
- Apelido pedido na primeira vez (Parte 2).
- Fases infinitas pelo ciclo das 50 fases, mais forte a cada volta.
- Vidas 20/10/5/1.
- Tela inicial: Ideia A (pergaminho, fiel ao Lovable) + botão Livro dos Dragões; escolha de nível com bandeiras no mesmo estilo.
- A versão oficial é esta (Three.js); do Lovable só se aproveitam as imagens.

## Abordagens consideradas
- **Menu como camada HTML por cima do jogo (escolhida)**: o tabuleiro 3D já é criado ao abrir; o menu cobre a tela e a partida só começa ao escolher o nível. Simples, sem trocar de página, reaproveita os modais existentes.
- Páginas separadas (menu.html / jogo.html): recarrega o 3D a cada partida e complica a passagem do nível escolhido. Descartada.
- Adotar o código do Lovable: descartado pelo dono.

## Chamadas minhas (o dono pode corrigir)
- **Força por volta do ciclo**: volta c (c = 0 nas fases 1–50, 1 nas 51–100…) → vida × 3^c, armadura + 5·c; ouro por abate × (1 + c) para a economia acompanhar. Palpites, ajustados depois de jogar.
- **Barra do topo**: o chip "Nível 1/50" vira "Fase 1" (sem "/50"), para não confundir com o nível de dificuldade; um chip pequeno mostra o nível escolhido (ex.: "Médio").
- **Recorde**: guardado no próprio aparelho, um por nível (fase alcançada = fase em que as vidas acabaram). O menu mostra o maior entre os níveis com o nome do nível ("Recorde: fase 23 · Médio"); cada bandeira mostra o recorde daquele nível embaixo das vidas, quando existir.
- **Imagens** (`dragao_ninho.jpg` 768², `pergaminho.jpg` 720×1280, `mapa_gramado.jpg` 1024²) foram baixadas do protótipo Lovable do dono e estão em `/tmp/claude-1000/-home-arteiro--rea-de-trabalho-Projetos/bc29c378-9f81-4f91-b340-b9412111dc7f/scratchpad/lovimg/`; entram no projeto em `src/assets/`. A ilustração tem fundo claro: aplicada com mistura "multiply" sobre o pergaminho.
- Enquanto o menu está aberto, a simulação fica parada.

## Deixado ao construtor
- Medidas exatas, espaçamentos, como o layout se adapta a telas menores (celular deitado de 640×360 para cima; também precisa funcionar em pé sem cortar botões).
