# Ranking online (Parte 2) — projeto

Status: rascunho para aprovação do dono (22/11/2026).

## Por quê
O jogo vai para a Play Store e outras lojas. O ranking é **público**: qualquer jogador vê os melhores do mundo em cada nível e tenta passar. Ele é o motivo do modo infinito.

## Objetivos
- Um placar por nível (Fácil, Médio, Difícil, Sobrevivente). Ordem: fase alcançada (maior primeiro); no empate, mais vidas restantes; no empate total, quem chegou primeiro.
- Na primeira vez em que o jogador entra no ranking, ele escolhe um **apelido**, que pode trocar depois.
- O recorde é enviado sozinho ao fim de cada partida que conta (a mesma regra do recorde local: sair na fase 1 não conta).
- Um jogador = uma linha por nível. Só sobe se o novo resultado for melhor.

## Fora do escopo agora
- Juiz no servidor (precisa de cartão de crédito no Firebase).
- Selo do app oficial (App Check / Play Integrity): entra quando o jogo for para a Play Store.
- Conta com login e senha, amigos, ranking semanal.

## Anti-objetivos (seria um fracasso mesmo funcionando)
- O jogo travar ou dar erro sem internet. O ranking é extra: sem internet, a partida segue normal e o recorde local continua.
- Apelido ofensivo aparecendo para todo mundo.
- Custo surpresa: tem que ficar no plano grátis (Spark), sem cartão.

## Caminho escolhido (A agora, C na loja)
- **A (escolhido):** o jogo grava direto no Firebase (Firestore). As **regras do Firebase** recusam o impossível: fase entre 1 e 10.000, vidas entre 0 e o máximo do nível, apelido com 3 a 16 letras/números/espaço, só o dono da linha pode mexer nela, e o resultado novo tem que ser melhor que o guardado. Cada aparelho entra com **login anônimo** (automático, sem senha).
- **B (descartado por agora):** juiz no servidor; exige cartão de crédito.
- **C (depois):** App Check, quando o jogo estiver na loja.

Ponto fraco aceito pelo dono: quem entende de programação ainda consegue mandar um recorde falso que pareça possível. Remédio: o dono pode apagar linhas pelo painel do Firebase.

## Como fica (proposta)
Tela "Ranking" no pergaminho do menu, com abas por nível:

```
 ┌──────────── Ranking ────────────┐
 │ [Fácil] [Médio] [Difícil] [Sobr.] │
 │  1  DracoMestre     fase 212  ♥ 7 │
 │  2  Ana             fase 198  ♥ 10│
 │  3  joao123         fase 198  ♥ 4 │
 │  …  (os 50 melhores)              │
 │ ───────────────────────────────── │
 │  Você: 37º · fase 64 · ♥ 3        │
 │  Apelido: Rodrigo  [trocar]       │
 │            [Fechar]               │
 └───────────────────────────────────┘
```
- Mostra os **50 melhores** do nível e, embaixo, a posição do próprio jogador (mesmo fora dos 50).
- Na tela de fim de partida aparece uma linha a mais: "Enviado ao ranking: você está em 37º no Médio" (ou "Sem internet: guardado só neste aparelho").
- Sem apelido ainda: ao abrir o Ranking (ou no primeiro fim de partida que conta), aparece "Escolha seu apelido" com o campo e o botão Salvar.

## Decisões do construtor (minhas, com motivo)
- **Firebase Web (pacote `firebase`)**, só as partes de login anônimo e Firestore, carregadas apenas quando o ranking é usado, para o jogo não ficar mais pesado.
- **Filtro de palavrões**: lista em português e inglês no jogo; o Firebase só confere tamanho e caracteres. Apelido repetido é permitido (ninguém é "dono" de um nome).
- **Dados**: coleção `ranking_<nivel>`, documento = id do jogador, campos `apelido, fase, vidas, quando`. O apelido fica também guardado no aparelho.
- **Configuração** do Firebase (chave pública do app web) num arquivo `.env` fora do histórico, como o dono pede. Observação: essa chave do Firebase é pública por natureza (vai junto com o jogo); quem protege são as regras.
- **Testes**: a lógica (ordem, filtro, "só melhora", "conta ou não") fica em funções puras com testes em `node --test`. As regras do Firebase são testadas no simulador do próprio painel.

## O que o dono precisa fazer (≈10 min, com guia passo a passo)
1. Criar o projeto grátis no console do Firebase com o e-mail dele.
2. Ligar "login anônimo" e o Firestore.
3. Colar as regras que eu escrever e me passar a configuração do app web.

## Pendente para o construtor
- Texto exato das mensagens; visual final das abas (seguir o pergaminho existente).
