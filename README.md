# TD — nova versão

Protótipo da nova versão do tower defense, com as mesmas mecânicas do jogo original e gráficos 3D (Three.js). Tema: dragões. Resumo completo do que já foi feito em [RESUMO.md](RESUMO.md).

## Rodar

```bash
npm install
npm run dev      # servidor local
npm test         # regras do jogo (node:test)
npm run build    # versão de produção em dist/
node scripts/build-artifact.mjs   # página única em dist-artifact/td.html
```

## Como funciona

- Mapa de 64 x 64 quadrados lido do mapa original: entrada, waypoints 1 a 6 e saída (`src/map.js`).
- Cada rodada você coloca 5 pedras (2x2). Cada uma vira uma gema aleatória; a qualidade depende do nível de sorte, que se compra com ouro.
- Você mantém uma gema; as outras viram pedras que formam o labirinto. Dá para combinar 2 iguais (+1 qualidade) ou 4 iguais (+2), ou criar uma especial pela receita.
- 50 ondas com inimigos terrestres, voadores e chefes. 10 vidas.

## Dados

- `src/data/towers.js`: 8 tipos x 6 qualidades e 43 dragões.
- `src/data/enemies.js`: 50 níveis de inimigos, quantidade por onda e ouro por abate (ajustáveis).
- Referências transcritas em `docs/`.
