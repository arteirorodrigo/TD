---
name: auditoria
description: Roda a auditoria do Ninho dos Dragões — o auditor-game-design e o auditor-game-dev analisam o jogo, revisam o trabalho um do outro e entregam 2 relatórios (5 melhorias de design e 5 de jogabilidade) em docs/auditorias/. Use quando o dono pedir "auditoria", "roda os auditores" ou "relatório de melhorias".
---

# Auditoria do jogo (design + jogabilidade)

O dono não é programador: tudo que chega a ele é em português simples, curto, sem termos técnicos.

## 1. Preparar
- Data de hoje = `AAAA-MM-DD`. Pasta de trabalho: `.auditoria-trabalho/AAAA-MM-DD/` (fica fora do histórico de versões; criar se não existir). Fotos, scripts e rascunhos vão lá.
- Jogo rodando: se `curl -s localhost:5173` responder, use `http://localhost:5173/`. Senão, inicie `npx vite --port 5199` em segundo plano e use `http://localhost:5199/`.
- Liste `docs/auditorias/` para saber o que já foi proposto, e leia `docs/auditorias/decisoes-do-dono.md`.
- Ao fim, depois que o dono escolher o que fazer, atualize `decisoes-do-dono.md`: o que ele recusar vai para "Não gostou"; o que ele aprovar vai para "Aprovadas".

## 2. Rodada 1 — cada um no seu canto (em paralelo)
Chame os dois agentes **na mesma mensagem**: `auditor-game-design` e `auditor-game-dev`. Se o tipo não estiver disponível nesta sessão (agentes criados depois do início da sessão só aparecem na próxima), use `general-purpose` e comece o pedido com "Leia `.claude/agents/<nome>.md` e siga exatamente esse papel."
Na tarefa de cada um, passe: endereço do jogo, pasta de trabalho, e onde salvar o rascunho: `<pasta>/rascunho-design.md` ou `<pasta>/rascunho-dev.md`.

## 3. Rodada 2 — trabalhando juntos
Quando os dois terminarem, continue cada um (SendMessage para o mesmo agente) pedindo:
- Ler o rascunho do outro e as notas "Para o auditor de …" endereçadas a ele.
- Comentar as 5 do outro: concorda / discorda / conflita com as minhas (ex.: design pede mais efeitos, dev mede que o celular já pesa). Escrever em `<pasta>/comentarios-<design|dev>.md`.
- Revisar as próprias 5 levando em conta o outro (pode trocar itens, juntar, mudar prioridade) e salvar a versão final em `<pasta>/final-<design|dev>.md`.

## 4. Entregar
- Escreva os 2 relatórios a partir das versões finais, em português simples:
  - `docs/auditorias/AAAA-MM-DD-design.md` — "5 melhorias de design"
  - `docs/auditorias/AAAA-MM-DD-jogabilidade.md` — "5 melhorias de jogabilidade"
- Cada relatório: uma frase de resumo; as 5 melhorias em ordem de prioridade (título, o que acontece hoje, proposta, por que melhora, esforço); um bloco "Onde os auditores discordaram" quando houver; referências às fotos/evidências da pasta de trabalho.
- Se algum conflito entre os dois precisar de decisão do dono, coloque em "Decisão sua" com 2–3 opções e a recomendação.
- No chat: diga ao dono, em poucas linhas, as 5 + 5 (só os títulos e o esforço), e onde estão os arquivos. Abra as 2–3 fotos mais importantes na tela dele (`xdg-open`).
- Não implemente nada. As melhorias só entram no jogo quando o dono escolher.
- Não faça commit sem o dono pedir.
