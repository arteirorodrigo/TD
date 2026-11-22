# Vida, evolução e etiqueta de nível — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selecionar inimigos e ver a vida ao vivo, ver a próxima evolução de cada dragão e mostrar o nível T0–T5 das escamas.

**Architecture:** Lógica pura (rótulo de nível, inimigo mais próximo, info de evolução) em `towers.js`/`game.js`, testada com `node --test`. Interface (cartões do painel) em `main.js`; 3D (anel no inimigo, rótulo T no mapa, barra maior) em `render.js`.

**Tech Stack:** JavaScript puro, Three.js 0.170, Vite, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-22-vida-evolucao-tier-design.md`

## Global Constraints
- Textos da interface em português do Brasil.
- Formato da etiqueta: `T{qualidade}` (T0 = Partida … T5 = Ancestral); no painel `T0 · Partida`.
- Não mudar regras de receitas nem balanceamento.
- `npm test` deve continuar passando (6 testes atuais).

## Review Focus
- Inimigo selecionado morre ou escapa → cartão some, sem erro no console.
- Clique entre ondas (sem inimigos) continua selecionando escamas/pedras normalmente.
- Clique com inimigo e escama perto: escama/pedra sob o clique tem prioridade.
- Dragão final (sem evolução, ex. Imperador Escarlate) → cartão diz "Estágio final", sem lista vazia.
- Ingrediente repetido na receita (ex. secreto com B5+B5) não conta a mesma escama duas vezes.

---

### Task 1: Etiqueta de nível (T0–T5)

**Files:**
- Modify: `src/data/towers.js` (exportar helpers)
- Modify: `src/main.js:53` (quadradinhos da rodada), `src/main.js:113` (título do cartão)
- Modify: `src/render.js:429-437` (rótulo no mapa)
- Test: `tests/game.test.js`

**Interfaces:**
- Produces: `tierTag(q: number) => string` (`'T0'`), `tierLabel(q: number) => string` (`'T0 · Partida'`) em `towers.js`.

- [ ] **Step 1: Teste**
```js
test('tier labels', () => {
  assert.equal(tierTag(0), 'T0');
  assert.equal(tierLabel(0), 'T0 · Partida');
  assert.equal(tierLabel(5), 'T5 · Ancestral');
});
```
- [ ] **Step 2:** `npm test` → FAIL (tierTag não existe).
- [ ] **Step 3:** Implementar helpers. Quadradinhos: mostrar `T#` em vez de `QUALITIES[q].slice(0,3)` (title continua o nome). Cartão de escama base: linha `tierLabel` abaixo do título. Legenda de sorte (`main.js:63`) usa `T#` no lugar das 3 letras. No mapa: sprite com `labelTexture(tierTag(q))` acima de cada escama base (y ≈ 2.2, escala ≈ 1.1), sempre de frente para a câmera.
- [ ] **Step 4:** `npm test` → PASS. Foto do jogo com escamas colocadas confere rótulos legíveis.
- [ ] **Step 5:** Commit `feat: etiqueta de nível T0–T5 nas escamas`.

### Task 2: Selecionar inimigo e ver a vida

**Files:**
- Modify: `src/game.js` (novo método)
- Modify: `src/main.js` (`onTap`, novo cartão, loop)
- Modify: `src/render.js` (anel no inimigo, barra maior)
- Test: `tests/game.test.js`

**Interfaces:**
- Produces: `Game#enemyNear(x: number, y: number, maxDist = 3) => enemy|null` — x,y em quadrados (como `tlFromPoint().fx/fy`); compara com `en.x/CELL, en.y/CELL`; retorna o mais próximo dentro de `maxDist`.
- Produces: `View#showEnemySelection(uid|null)`.

- [ ] **Step 1: Teste**
```js
test('enemyNear picks closest within range', () => {
  const g = new Game();
  g.enemies.set(1, { uid: 1, x: 10 * CELL, y: 10 * CELL, alive: true });
  g.enemies.set(2, { uid: 2, x: 12 * CELL, y: 10 * CELL, alive: true });
  assert.equal(g.enemyNear(11.6, 10).uid, 2);
  assert.equal(g.enemyNear(30, 30), null);
});
```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar `enemyNear`. Em `onTap`: se não há entidade sob o clique, tentar `enemyNear(tl.fx, tl.fy)`; se achou, `selectedEnemyUid = uid`, limpa `selectedUid`. Selecionar escama limpa `selectedEnemyUid`. Cartão no `#sel-card`: nome, tipo (Terrestre/Voador + "Chefe"), barra de vida + `fmt(hp) / fmt(maxHp)`, armadura (`game.effArmor(en)`), velocidade, efeitos ativos: Lento (`slow.t>0`), Envenenado (`poison.t>0`), Atordoado (`stun>0`), Congelado (`frost.t>0`). Atualizar no loop a cada 0,1 s; se `game.enemies` não tem mais o uid → limpar seleção e esconder cartão. Render: anel (reaproveitar estilo do `selRing`) segue o inimigo selecionado; barra de vida de todos com 1.6 × 0.28 (chefe ×1.6).
- [ ] **Step 4:** `npm test` → PASS. Foto durante onda com inimigo selecionado.
- [ ] **Step 5:** Commit `feat: clicar no inimigo mostra a vida ao vivo`.

### Task 3: Próxima evolução no cartão do dragão

**Files:**
- Modify: `src/game.js` (novo método)
- Modify: `src/main.js` `renderSelection`
- Test: `tests/game.test.js`

**Interfaces:**
- Consumes: `tierLabel` (Task 1).
- Produces: `Game#evolutionInfo(uid) => Array<{ result: string, items: Array<{ id: string, self: boolean, have: boolean }> }>` — uma entrada por receita (incluindo alternativas) cujo `ingredients` contém `def.id` da entidade; `self` marca o próprio dragão (uma vez); `have` = existe escama/dragão no campo (pendente ou não) com esse id, sem reutilizar a mesma entidade.

- [ ] **Step 1: Testes**
```js
test('evolutionInfo lists next stage with have flags', () => {
  const g = new Game();
  const sal = { uid: 900, x: 1, y: 1, kind: 'gem', def: TOWERS.asteriatedRuby, pending: false };
  g.entities.set(900, sal);
  g.entities.set(901, { uid: 901, x: 5, y: 5, kind: 'gem', def: TOWERS.R4, pending: false });
  const [evo] = g.evolutionInfo(900);
  assert.equal(evo.result, 'volcano');
  assert.deepEqual(evo.items.map((i) => [i.id, i.self, i.have]), [['asteriatedRuby', true, true], ['R4', false, true], ['P3', false, false]]);
});
test('evolutionInfo empty for final stage', () => {
  const g = new Game();
  g.entities.set(900, { uid: 900, x: 1, y: 1, kind: 'gem', def: TOWERS.crownPrince, pending: false });
  assert.deepEqual(g.evolutionInfo(900), []);
});
```
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementar. No cartão do dragão (não base): seção "Próxima evolução" com nome do resultado e lista ✓/✗; ingrediente base mostra `Escama de Fogo Lustrosa · T3` (usar `TOWERS[id].name` + `tierTag`); dragão mostra o nome. Lista vazia → "Estágio final". Botões "Chocar" seguem como hoje.
- [ ] **Step 4:** `npm test` → PASS. Foto com Salamandra selecionada.
- [ ] **Step 5:** Commit `feat: mostrar próxima evolução do dragão`.
