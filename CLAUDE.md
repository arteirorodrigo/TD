# O Covil dos Dragões TD (TD-DragonScale)

Nome do jogo (decidido em 22/11): **O Covil dos Dragões TD** em português e **Dragons Lair TD** em inglês (antigo: Ninho dos Dragões).

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

## Pendências (fim de 22/11/2026)
1. Melhorias aprovadas da auditoria, plano `docs/superpowers/plans/2026-11-22-auditoria-1.md`: tarefa 1 feita; faltam 2 (infinito repete fases 26–50 + chefes mais fortes), 3 ("Trocar uma pedra" com ouro, só com a sorte no máximo), 4 (aviso de ondas especiais), 5 (celular deitado), 6 (dicas na primeira partida), 7 (festa ao chocar dragão).
2. Ataque visual diferente por elemento (fogo, veneno, gelo…), e dragão sentado na construção / voando na onda.
3. Ranking online com Firebase (Parte 2): dono cria a conta grátis; apelido na 1ª vez; um ranking por nível.
4. Pequenos erros: "Novo recorde!" ao sair na fase 1, "1 defensores", dano de veneno/aura não somado no cartão, chocar dragão só com torres antigas.
