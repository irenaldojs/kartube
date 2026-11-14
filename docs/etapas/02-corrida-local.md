# Etapa 02 — Corrida singleplayer jogável

> **Estado:** Planejada · **Execução:** não iniciada

## Dependências

Etapa 01. Por decisão do usuário em 2026-11-14, priorizar a implementação web: T01–T05 do protótipo e diagnósticos web estão disponíveis; provas e ports nativos de T06/T07 ficam adiados e não bloqueiam o desenvolvimento desta etapa. Isso não encerra os critérios pendentes da etapa 01.

## Objetivo

Transformar movimentação em corrida válida, com progressão, HUD e resultados.

## Tarefas (a realizar)

- [ ] E02-T01 — Construir `KartController` arcade (acelerar/frear/ré/dirigir, drift e controle aéreo).
- [ ] E02-T02 — Adicionar spawn, largada, contagem regressiva, checkpoints por grafo e voltas configuráveis.
- [ ] E02-T03 — Implementar respawn em posição segura e detecção de queda/stuck.
- [ ] E02-T04 — Adicionar sistema de posições por progresso ao longo do trajeto sem depender só da distância euclidiana.
- [ ] E02-T05 — Criar HUD de volta, velocidade, posição, item (vazio), cronômetro e término.
- [ ] E02-T06 — Testar limites de mapa, cortes ilegais, respawn e framerate variável.
- [ ] E02-T07 — Extrair regras puras reutilizáveis no serviço de sessão.

## Critérios de aceite

- [ ] Um humano completa três voltas legais; shortcut inválido não conta.
- [ ] Controlador e HUD funcionam sem conexão e sem dependência do wrapper Tauri.
- [ ] Testes de posição, tempo, checkpoint e recuperação passam.

## Documentos que devem ser revisados

- [`docs/04-gameplay-e-fisica.md`](../04-gameplay-e-fisica.md)
- [`docs/05-pistas-e-circuitos.md`](../05-pistas-e-circuitos.md)
- [`docs/16-formato-dados.md`](../16-formato-dados.md)
- [`docs/ANDAMENTO.md`](../ANDAMENTO.md)
- [`docs/CHANGELOG.md`](../CHANGELOG.md)

## Registro de execução (preencher apenas durante o desenvolvimento)

- Responsável / agente: **não definido**
- Data de início: **não iniciada**
- Referência de commit/PR: **—**
- Testes executados e ambiente: **—**
- Evidências de aprovação: **—**
- Pendências / riscos: **—**
- Data de conclusão: **—**
