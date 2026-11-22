# Tela inicial, níveis e fases infinitas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menu em pergaminho (Jogar / Ranking / Livro dos Dragões), escolha de dificuldade por vidas, fases infinitas por ciclos, recorde local, sair no meio e chão gramado.

**Architecture:** Regras puras em `game.js`, `data/enemies.js` e um novo `src/records.js` (testados com `node --test`). Telas como camadas HTML por cima do canvas, num novo `src/menu.js`; `main.js` passa a iniciar a partida só depois da escolha de nível. Chão gramado no shader existente de `render.js`.

**Tech Stack:** JavaScript, Three.js 0.170, Vite, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-22-menu-niveis-infinito-design.md`

## Global Constraints
- Textos em português do Brasil; fontes Cinzel (títulos) + Manrope (texto). Sem fontes do Lovable.
- Vidas: Fácil 20 · Médio 10 · Difícil 5 · Sobrevivente 1. Chefe que escapa tira 3.
- Ciclo c = floor((fase − 1) / 50): vida × 3^c, armadura + 5·c, ouro por abate × (1 + c).
- Imagens em `src/assets/` (origem: `/tmp/claude-1000/-home-arteiro--rea-de-trabalho-Projetos/bc29c378-9f81-4f91-b340-b9412111dc7f/scratchpad/lovimg/`).
- `npm test` verde ao fim de cada tarefa; `npx vite build` sem erro ao fim.

## Review Focus
- Recorde quando o armazenamento do navegador falha (aba anônima): jogo segue sem erro, só não lembra.
- Sair pela confirmação durante a fase de escolha/construção (sem onda rodando): resultado conta a fase atual, sem erro.
- "Jogar de novo" e "Menu" várias vezes seguidas: sem inimigos/escamas antigos no mapa, sem anel de seleção sobrando, velocidade volta a 1x.
- Dragão da Sorte no Sobrevivente: nunca passa de 1 vida.
- Fase 100 (c = 1) e 101 (c = 2): chefe da fase 100 escalado com c = 1, fase 101 = inimigos da fase 1 com c = 2.

---

### Task 1: Dificuldade e vidas

**Files:** Modify `src/game.js`; Test `tests/game.test.js`

**Interfaces:**
- Produces: `DIFFICULTIES` = `{ facil:{name:'Fácil',lives:20}, medio:{name:'Médio',lives:10}, dificil:{name:'Difícil',lives:5}, sobrevivente:{name:'Sobrevivente',lives:1} }` exportado de `game.js`; `new Game({ rng, difficulty = 'medio' })` define `this.difficulty`, `this.maxLives`, `this.lives`.

- [ ] **Step 1: Testes**
```js
test('difficulty sets starting lives', () => {
  assert.equal(new Game({ difficulty: 'facil' }).lives, 20);
  assert.equal(new Game().lives, 10);
  assert.equal(new Game({ difficulty: 'sobrevivente' }).maxLives, 1);
});
test('heal never exceeds the difficulty max', () => { /* Game sobrevivente, lives = 1, forçar ramo heal (rng → 0) e checar lives === 1 */ });
```
O teste de cura chama o trecho `case 'heal'` (game.js ~469) via `hit` com uma torre `luckyJade`; se exigir montagem pesada, extrair `healLife()` e testá-lo.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar; cura usa `this.maxLives` no lugar de `START_LIVES`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: dificuldade define as vidas`.

### Task 2: Fases infinitas

**Files:** Modify `src/data/enemies.js`, `src/game.js:270-277`; Test `tests/game.test.js`

**Interfaces:**
- Produces: `cycleOf(level) => number`; `waveFor(level)` devolve tipos já escalados `{...t, hp, armor, cycle}` (para level ≤ 50, cycle 0 e valores originais); `bountyFor(type)` multiplica por `1 + (type.cycle || 0)`. `MAX_LEVEL` passa a significar "fases por ciclo" (50). Não existe mais fase `'won'`.

- [ ] **Step 1: Testes**
```js
test('wave 51 repeats wave 1 three times stronger', () => {
  const a = waveFor(1)[0], b = waveFor(51)[0];
  assert.equal(b.name, a.name); assert.equal(b.hp, a.hp * 3); assert.equal(b.armor, a.armor + 5); assert.equal(b.cycle, 1);
});
test('wave 100 is the cycle-1 boss, wave 101 is cycle 2', () => {
  assert.ok(waveFor(100)[0].boss); assert.equal(waveFor(100)[0].cycle, 1); assert.equal(waveFor(101)[0].cycle, 2);
});
test('bounty scales with cycle', () => { assert.equal(bountyFor(waveFor(51)[0]), 2 * bountyFor(waveFor(1)[0])); });
test('game keeps going after wave 50', () => { const g = new Game(); g.level = 50; g.phase = 'wave'; g.endWave(); assert.equal(g.level, 51); assert.equal(g.phase, 'build'); });
```
(Ler `endWave` antes: ajustar o teste ao que ele exige de estado — ex. `spawnQueue` vazia.)
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar; `endWave` só volta para `'build'`. `main.js` deixa de chamar `showEnd(true)` (o evento `won` some).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: fases infinitas por ciclos`.

### Task 3: Recorde local e sair da partida

**Files:** Create `src/records.js`; Modify `src/game.js`; Test `tests/game.test.js`

**Interfaces:**
- Produces (records.js, todas recebem `storage` com `getItem/setItem`, protegidas com try/catch):
  - `getRecords(storage) => { [diffKey]: { phase, lives } }`
  - `submitRecord(storage, diffKey, phase, lives) => { isNew: boolean, best: {phase, lives} }` — melhor = maior fase; empate → mais vidas.
  - `bestOverall(storage) => { diffKey, phase } | null`
  - Chave de armazenamento: `'ninho.records.v1'`.
- Produces (game.js): `Game#quit()` → se a fase não é `'over'`: `phase = 'over'`, `this.quitted = true`, `emit('over')`. Fase alcançada = `this.level`.

- [ ] **Step 1: Testes** (storage falso = objeto com Map)
```js
test('submitRecord keeps the best phase, ties by lives', () => {
  const s = fakeStorage();
  assert.equal(submitRecord(s, 'medio', 12, 3).isNew, true);
  assert.equal(submitRecord(s, 'medio', 10, 9).isNew, false);
  assert.equal(submitRecord(s, 'medio', 12, 5).isNew, true);
  assert.deepEqual(getRecords(s).medio, { phase: 12, lives: 5 });
});
test('bestOverall picks the highest phase across difficulties', () => { /* facil 30, dificil 12 → { diffKey:'facil', phase:30 } */ });
test('records survive a broken storage', () => { const bad = { getItem() { throw 1; }, setItem() { throw 1; } }; assert.deepEqual(getRecords(bad), {}); assert.equal(submitRecord(bad, 'medio', 3, 1).isNew, true); });
test('quit ends the match once', () => { const g = new Game(); let n = 0; g.on((t) => t === 'over' && n++); g.quit(); g.quit(); assert.equal(g.phase, 'over'); assert.equal(n, 1); });
```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: recorde local e sair da partida`.

### Task 4: Telas (menu, níveis, livro, ranking, fim) e barra do topo

**Files:** Create `src/menu.js`, `src/assets/{dragao_ninho,pergaminho}.jpg`; Modify `src/main.js`, `index.html`

**Interfaces:**
- Consumes: `DIFFICULTIES`, `Game({difficulty})`, `Game#quit`, `getRecords`, `submitRecord`, `bestOverall`.
- Produces (`menu.js`): `showMenu()`, `showLevels()`, `hideScreens()`; recebe callbacks via `initMenu({ onPlay(diffKey), onBook(), onRanking() })`.
- `main.js`: `start(diffKey)` cria a partida com a dificuldade; o loop só chama `game.update` quando nenhuma tela está aberta; `showRecipes({ inGame })` — fora da partida, nenhum ingrediente "no mapa" e classe `.parch` no modal.

- [ ] **Step 1:** Copiar as imagens para `src/assets/` (importadas no JS para o Vite incluir no build).
- [ ] **Step 2:** Tela inicial = Ideia A aprovada (mockup de referência: `/tmp/claude-1000/-home-arteiro--rea-de-trabalho-Projetos/bc29c378-9f81-4f91-b340-b9412111dc7f/scratchpad/mock/pA2.html` e `parch.css`): "Crônicas do", título, filete, ilustração (multiply), frase, Jogar (largo), Ranking + Livro dos Dragões lado a lado, "Recorde: fase X · Nível" (some se não houver recorde). Ao abrir o app, a tela inicial aparece.
- [ ] **Step 3:** Tela de níveis = bandeiras do mockup (couro escuro, faixa dourada; Sobrevivente vermelho), nome, vidas, e "Recorde N" embaixo quando houver; tocar → `start(diffKey)`; "← Voltar".
- [ ] **Step 4:** Ranking → modal pergaminho "Em breve: ranking com jogadores do mundo todo." + Fechar. Livro → `showRecipes({ inGame:false })` em pergaminho.
- [ ] **Step 5:** Barra do topo: chip "Fase N" (sem "/50"), chip com o nome do nível, botão "Menu" → confirmação "Sair da partida? A fase atual conta como seu resultado." (Sair / Continuar jogando) → `game.quit()`.
- [ ] **Step 6:** Fim: evento `over` → `submitRecord(localStorage, diff, game.level, game.lives)` → modal "Você chegou à fase X", "Novo recorde!" se `isNew`, "Jogar de novo" (mesmo nível) e "Menu". Reiniciar zera seleção, velocidade 1x e malhas.
- [ ] **Step 7: Verificação** — `npm test` PASS; fotos (headless) de: menu, níveis, livro, ranking, partida com barra nova, confirmação de sair, fim. Conferir também a 640×360 e em pé 390×844 sem botões cortados.
- [ ] **Step 8:** Commit `feat: tela inicial, escolha de nível e fim de partida`.

### Task 5: Chão gramado

**Files:** Create `src/assets/mapa_gramado.jpg`; Modify `src/render.js` (GROUND_FRAG e uniforms do `groundMat`)

- [ ] **Step 1:** Uniform `uGrass` (TextureLoader da imagem importada, sem `colorSpace` sRGB); no shader, `base = mix(base, grass * .62, inside)` com UV `(p.x/uSize.x, 1 - p.y/uSize.y)`; caminho `vec3(.50,.38,.22) * (.9 + .15*flow)` com peso `.85`. Grade, plataformas e hover continuam.
- [ ] **Step 2: Verificação** — foto da partida durante uma onda; `npm test` PASS; `npx vite build` sem erro.
- [ ] **Step 3:** Commit `feat: chão gramado no mapa`.
