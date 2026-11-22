# Resumo do projeto: O Covil dos Dragões TD

Nova versão, com gráficos atuais, do Gem Tower Defense (https://www.gemtowerdefense.com/). A mecânica é a mesma do original e o tema mudou para dragões. Nome: "O Covil dos Dragões TD" (inglês: "Dragons Lair TD"); antes se chamava "Ninho dos Dragões".

Jogável no navegador: https://claude.ai/artifact/9efNqw66myyqXt5FRsx4jk

## O que já está decidido

### Mecânica (igual ao original)
- A cada rodada você coloca 5 pedras no mapa. Cada uma vira uma escama de elemento e qualidade aleatórios.
- O labirinto é livre, mas não pode fechar o caminho.
- Você fica com 1 escama por rodada, e as outras viram pedras do labirinto.
- 2 iguais combinam em +1 qualidade, e 4 iguais em +2. Receitas especiais chocam dragões.
- A sorte (chance de qualidade melhor) sobe com ouro, em 8 níveis.
- São 50 ondas, com terrestres, voadores e chefes. Você tem 10 vidas, e um chefe que escapa tira 3.

### Tema: dragões
- **Bases são escamas** de 8 elementos: Fogo, Gelo, Veneno, Sombra, Tempestade, Solar, Aço e Etérea.
- Cada escama tem 6 qualidades: Partida, Pequena, Comum, Lustrosa, Perfeita e Ancestral.
- **Especiais são dragões**: 43 no total, sendo 38 normais e 5 secretos.
- **Inimigos são raças de fantasia**: humanos, elfos, anões, goblins, orcs, trolls, ogros, gigantes, mortos-vivos, morcegos, harpias, grifos, dirigíveis, espíritos e bruxas.
- Os chefes são:
  - Capitão da Guarda (onda 10)
  - Chefe de Guerra Orc (20)
  - Rei dos Grifos (30)
  - Lich (40)
  - Rei Caçador de Dragões (50)

### Dados de base
- **Torres base:** https://clementbera.github.io/Website/baseTowers.html
- **Especiais e inimigos:** as páginas advancedTowers e creeps do mesmo site, com valores do Dota 2. Os inimigos usam 60% da vida e 85% da velocidade.
- O alcance 5000 da Topázio Huge (Solar Ancestral) é proposital: pega o mapa todo.
- As transcrições estão em `docs/`.

### Mapa
- O mapa veio do print do original: uma malha fina de 64 x 64, em que cada pedra ou inimigo ocupa 2 x 2.
- O caminho é entrada (57,0) → 1 (57,11) → 2 (33,11) → 3 (33,43) → 4 (57,43) → 5 (57,27) → 6 (17,27) → saída (17,62).
- A largura de 64 foi suposta, porque o print parecia cortado.
- As plataformas dos waypoints deixam passar, mas não aceitam construção.

### Câmera e controles
- A vista é de cima.
- O zoom e o arrastar estão liberados, mas presos ao enquadramento do mapa todo. O botão "Mapa todo" (ou a tecla 0) volta à vista inteira.
- As pedras encaixam numa grade 2 x 2 alinhada, o que facilita montar o labirinto.
- Para colocar uma pedra, você seleciona o lugar e depois confirma (botão "Colocar aqui", Enter ou um segundo toque no mesmo lugar).
- A velocidade pode ser 1x, 2x ou 4x.

## Linha do tempo
1. Leitura do site original e das tabelas de torres, especiais e inimigos.
2. Protótipo 3D em Three.js com as regras completas e testes.
3. Vista de cima.
4. Tema dragões: escamas, dragões e raças de fantasia.
5. Confirmação ao colocar pedras.
6. Zoom e arrastar limitados ao mapa, e grade 2 x 2 para as pedras.
7. Lista de nomes e imagens de referência para o ilustrador (`docs/lista-ilustrador.txt` e `docs/referencias/`).

## Documentos
| Arquivo | Conteúdo |
|---|---|
| `docs/torres-base.md` | Torres base do site de referência |
| `docs/torres-especiais.md` | Torres especiais e receitas |
| `docs/inimigos.md` | Os 50 níveis de inimigos |
| `docs/escamas-e-dragoes.md` | Escamas e dragões com atributos e receitas (gerado por `node scripts/export-list.mjs`) |
| `docs/lista-ilustrador.txt` | Só os nomes, para o ilustrador |
| `docs/referencias/*.png` | Como imagino as escamas e os dragões |

## Código
- `src/map.js`: malha, caminho (A*) e bloqueio.
- `src/data/towers.js`: escamas, dragões e receitas.
- `src/data/enemies.js`: ondas, inimigos e ouro.
- `src/game.js`: regras (rodadas, combinações, auras, dano, armadura, habilidades dos inimigos).
- `src/render.js`: gráficos 3D (bloom, sombras, modelos de escamas, dragões e raças).
- `src/main.js`: interface e controles.
- `tests/game.test.js`: testes das regras (`npm test`).

## Pendências
- Balanceamento: as 10 unidades por onda e o ouro por abate são palpites, que vamos ajustar depois de jogar.
- Os modelos são simples e vão ser trocados pela arte do ilustrador.
- Falta confirmar o nome do jogo.
- Faltam sons e música.
