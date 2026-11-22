# O Covil dos Dragões TD (TD-DragonScale)

Nome do jogo (decidido em 22/11): **O Covil dos Dragões TD** em português e **Dragonscale TD** em inglês (antigo: Ninho dos Dragões; "Dragons Lair TD" foi descartado por ser marca de outro jogo).

Tower defense de dragões no navegador (Three.js + Vite). Destino final: Play Store e outras lojas; o navegador é só para testar.
O dono não é programador: fale em português simples, sem termos técnicos, e mostre fotos (prints) antes de decidir algo visual.

## Rodar e testar
- `npx vite` (jogo em http://localhost:5173/) · `npm test` (testes das regras, `node --test`).
- Fotos do jogo: `node scripts/foto-jogo.mjs <url> <saida.png> [script.js] [espera_ms]` (Chrome sem janela; `TELA=640,360` simula celular). Ganchos no navegador: `window.__game()`, `window.__view()`.
- Ferramentas de prévia em `tools/` (fichas do ilustrador, modelos 3D, conversão OBJ→GLB).

## Publicar
- Enviar para a branch `main` publica sozinho em https://arteirorodrigo.github.io/TD/ (GitHub Actions + Pages, ~2 min).
- **Sempre pedir licença ao dono antes de enviar para a `main`** (é público). Rodar `npm test` e `npx vite build` antes.
- Trabalho em andamento fica em outra branch (hoje: `auditoria-1`).

## Onde fica cada coisa
- `src/game.js` regras · `src/data/` escamas, dragões e inimigos · `src/render.js` 3D · `src/main.js` interface · `src/menu.js` menu e níveis
- `src/records.js` recorde, dragões descobertos e labirintos (guardados no aparelho) · `src/book.js` Livro dos Dragões (8 linhas de evolução)
- `src/dragon-hybrid.js` + `src/assets/dragoes/` modelos de dragão guardados (não usados agora)
- `docs/auditorias/` relatórios dos auditores e `decisoes-do-dono.md` · `docs/superpowers/` projetos e planos · `docs/ilustrador/` fichas para o ilustrador

## Decisões do dono (respeitar)
- Escamas mostram nível T0–T5 ("T0 · Partida").
- Dificuldades por vidas: Fácil 20, Médio 10, Difícil 5, Sobrevivente 1. Fases infinitas (ciclo de 50).
- Menu em pergaminho (estilo do protótipo Lovable, com as fontes do jogo Cinzel + Manrope).
- Dragão: fica o **modelo padrão** (`DRAGON_MODEL = 'padrao'` em `src/render.js`; tag git `modelo-padrao`). O dono rejeitou modelos montados no código e o híbrido; só trocar por um modelo **com esqueleto e animações** e licença que permita vender.
- Modelos e imagens de fora: só grátis e com licença comercial. Arquivos grandes (`docs/referencias/*.glb`, `*.obj`) ficam fora do git.
- Auditorias: comando `/auditoria` (agentes em `.claude/agents/`). O que o dono recusou está em `docs/auditorias/decisoes-do-dono.md` e não volta.

## Pendências (22/11/2026, noite — tudo abaixo do "Feito" já publicado)
- Feito na noite de 22/11: tarefas 2–7 da auditoria (plano `docs/superpowers/plans/2026-11-22-auditoria-1.md`), pequenos erros (veneno/aura no dano, recorde na fase 1, plural, inimigos parados ao sair, clique em voadores, destaque da rodada, vida 15/14) e o nome novo.
1. Ataque por elemento: feito (projéteis com rastro, só dragões; `src/attack-fx.js`).
2. Chocar dragão só com torres antigas: o dono acha perfeito assim (não mexer).
3. Revisão feita e publicada. Falta: dragão sentado na construção / voando na onda.
4. Ranking online com Firebase (Parte 2) — começando o planejamento (22/11): falta saber se é para amigos ou para o público.
