# Andamento do desenvolvimento

> **Data-base:** 2026-11-13. Fundamentos concluídos; protótipo 3D em andamento, ainda sem corrida jogável.

| Etapa | Status | Evidência | Próximo critério |
|---|---|---|---|
| 00 — Fundamentos | Concluída | Sessões local/remota, codecs TS/Rust, pistas, WebSocket e prova WebGL2/WASM desktop e S20 FE | Critérios de fundamentos atendidos; validações futuras nos respectivos marcos |
| 01 — Protótipo 3D | Em andamento | E01-T01: boot e perfis gráficos reutilizados da prova técnica | E01-T02: pista cinza fechada |
| 02 — Corrida local | Planejada | — | 3 voltas e resultado válidos |
| 03 — Bots locais | Planejada | — | 8 pilotos terminam corrida |
| 04 — Mecânicas | Planejada | — | Rampas, boosts, itens e atalho |
| 05 — Servidor Rust | Planejada | — | Lobby/sala e conexões |
| 06 — Online e bots | Planejada | — | 8 slots sincronizados |
| 07 — Campeonato | Planejada | — | 4 provas e pódio |
| 08 — Assets | Planejada | — | Rig/cartoon pipeline testado |
| 09 — Quatro pistas | Planejada | — | 4 circuitos completos |
| 10 — Inputs e nativos | Planejada | — | Matriz de controles e destinos |
| 11 — Qualidade/publicação | Planejada | — | Critérios de lançamento aprovados |

## Etapa ativa

**01 — Protótipo 3D**: `etapas/01-prototipo-3d.md`.

## Bloqueios atuais

Rust/Cargo instalados e prova local WebSocket implementada. Prova básica WebGL2/WASM aprovada pelo usuário no S20 FE (Adreno 650), incluindo pausa, passos manuais e liberação/reinício. Matriz completa e Tauri permanecem pendentes. Riscos conhecidos estão em [Backlog e riscos](15-backlog-e-riscos.md).

## Histórico de marcos

- 2026-11-13: plano inicial de documentação criado; **somente planejamento**.

- 2026-11-13: prova WebGL2/WASM em Chromium headless implementada; Android físico e Tauri ainda pendentes.

- 2026-11-13: usuário confirmou testes manuais da prova WebGL2/WASM no S20 FE; 60.4 FPS amostrados no perfil equilibrado. Detalhes e limites no registro da etapa 00.

- 2026-11-13: E00-T06 concluída com prova browser/Rust e Android físico; E00-T05 concluída com [matriz e roteiro de validação](matriz-plataformas.md). Pendências da etapa: T01 e T07.

- 2026-11-13: E00-T07 concluída por revisão documentada dos ADRs 0001–0003, mantidos propostos para critérios ainda sem evidência. E00-T01 é a pendência atual de fundamentos.

- 2026-11-13: usuário confirmou escopo/regras; E00-T01 e etapa 00 concluídas. Etapa 01 iniciada, E01-T01 concluída pela estrutura/boot/perfis já implementados; próxima tarefa E01-T02.
