# O Covil dos Dragões TD (TD-DragonScale)

Nome do jogo (decidido em 22/11): **O Covil dos Dragões TD** em português e **Dragonscale TD** em inglês (antigo: Ninho dos Dragões; "Dragons Lair TD" foi descartado por ser marca de outro jogo).

Tower defense de dragões no navegador (Three.js + Vite). Destino final: Play Store e outras lojas; o navegador é só para testar.
O dono não é programador: fale em português simples, sem termos técnicos, e mostre fotos (prints) antes de decidir algo visual.

## Primeira coisa de toda sessão nova: confirmar o repositório

Antes de qualquer trabalho, mesmo que o pedido pareça simples, pergunte ao
dono em qual repositório vamos trabalhar. Chame `get_session` para ver qual
veio selecionado e `list_repos` para listar os dele; mostre a lista curta,
marcando o selecionado. Se ele escolher outro, anexe com `add_repo` e clone;
se não der para trabalhar lá, sugira abrir uma sessão nova com esse
repositório selecionado no app. Só depois siga o resto destas instruções.

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
- **No celular, sempre em pé** (decidido em 23/11). Toda tela nova é desenhada para celular em pé.
- Tela principal no molde dos jogos de celular (topo com recursos, temporada, ícones nas laterais, botão JOGAR grande, 5 abas embaixo com Aventura no meio), no **estilo pergaminho** (versão 1 de `docs/ideias-tela-principal/`). Lugares reservados para moedas, loja, missões e ovos mesmo antes de funcionarem.
- Escamas mostram nível T0–T5 ("T0 · Partida").
- Dificuldades por vidas: Fácil 20, Médio 10, Difícil 5, Sobrevivente 1. Fases infinitas (ciclo de 50).
- Menu em pergaminho (estilo do protótipo Lovable, com as fontes do jogo Cinzel + Manrope).
- Dragão: fica o **modelo padrão** (`DRAGON_MODEL = 'padrao'` em `src/render.js`; tag git `modelo-padrao`). O dono rejeitou modelos montados no código e o híbrido; só trocar por um modelo **com esqueleto e animações** e licença que permita vender.
- Modelos e imagens de fora: só grátis e com licença comercial. Arquivos grandes (`docs/referencias/*.glb`, `*.obj`) ficam fora do git.
- Auditorias: comando `/auditoria` (agentes em `.claude/agents/`). O que o dono recusou está em `docs/auditorias/decisoes-do-dono.md` e não volta.

## Pendências (23/11/2026 — resumo do dia em `docs/RESUMO-2026-11-23.md`)
- Feito em 23/11 e publicado: tela principal nova (pergaminho, lugares reservados com "em breve"), tela de carregamento com frases engraçadas, correção dos toques travados, ✕ no quadro da peça e faixa de mensagens embaixo (avisos de perigo e dragões chocados; abas Geral/Clã "em breve" para o online).
1. Conferir no celular se o posicionamento não trava mais e se a faixa de mensagens não atrapalha.
2. Dar vida aos lugares reservados da tela principal (moedas, energia, loja, missões, ovos, temporada…), um de cada vez; trocar os emojis por ícones no estilo do jogo.
3. Dragão sentado na construção / voando na onda.
4. Ranking online com Firebase (Parte 2): falta saber se é para amigos ou para o público.
5. Chocar dragão só com torres antigas: o dono acha perfeito assim (não mexer).
