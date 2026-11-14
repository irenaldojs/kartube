# Andamento do desenvolvimento

> **Data-base:** 2026-11-14. Fundamentos concluídos; protótipo 3D em andamento, ainda sem corrida jogável.

| Etapa | Status | Evidência | Próximo critério |
|---|---|---|---|
| 00 — Fundamentos | Concluída | Sessões local/remota, codecs TS/Rust, pistas, WebSocket e prova WebGL2/WASM desktop e S20 FE | Critérios de fundamentos atendidos; validações futuras nos respectivos marcos |
| 01 — Protótipo 3D | Em andamento | Kart dirigível e ciclo de assets/descarte verificado | Foco web: diagnósticos T07 implementados; ports e provas físicas adiados |
| 02 — Corrida local | Em andamento (web) | E02-T01/T02/T03: controle, corrida e recuperação segura | E02-T04: posições por progresso |
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

**02 — Corrida local (web)**: `etapas/02-corrida-local.md`. Validações físicas pendentes da etapa 01 continuam abertas e adiadas.

## Bloqueios atuais

Rust/Cargo instalados e prova local WebSocket implementada. Prova básica WebGL2/WASM aprovada pelo usuário no S20 FE (Adreno 650), incluindo pausa, passos manuais e liberação/reinício. Matriz completa e Tauri permanecem pendentes. Riscos conhecidos estão em [Backlog e riscos](15-backlog-e-riscos.md).

## Histórico de marcos

- 2026-11-13: plano inicial de documentação criado; **somente planejamento**.

- 2026-11-13: prova WebGL2/WASM em Chromium headless implementada; Android físico e Tauri ainda pendentes.

- 2026-11-13: usuário confirmou testes manuais da prova WebGL2/WASM no S20 FE; 60.4 FPS amostrados no perfil equilibrado. Detalhes e limites no registro da etapa 00.

- 2026-11-13: E00-T06 concluída com prova browser/Rust e Android físico; E00-T05 concluída com [matriz e roteiro de validação](matriz-plataformas.md). Pendências da etapa: T01 e T07.

- 2026-11-13: E00-T07 concluída por revisão documentada dos ADRs 0001–0003, mantidos propostos para critérios ainda sem evidência. E00-T01 é a pendência atual de fundamentos.

- 2026-11-13: usuário confirmou escopo/regras; E00-T01 e etapa 00 concluídas. Etapa 01 iniciada, E01-T01 concluída pela estrutura/boot/perfis já implementados; próxima tarefa E01-T02.

- 2026-11-13: E01-T02 concluída: circuito cinza fechado, largada, guardrails, rampas, marcadores de boosts/caixas e alternativa. Próxima tarefa E01-T03.

- 2026-11-13: E01-T03 concluída com câmera de acompanhamento, visão geral selecionável e sombra de contato; próxima tarefa E01-T04.

- 2026-11-13: E01-T04 concluída com pilotagem básica, colisões, teclado/toque e teste do circuito completo; próxima E01-T05. Novo build ainda requer playtest Android.

- 2026-11-13: correção multitouch confirmada pelo usuário e commitada em `85ed663`. E01-T05 concluída com recursos compartilhados, cleanup e diagnóstico após descarte; botão Freio / Ré unificado conforme solicitação. Próxima E01-T06.

- 2026-11-13: E01-T06 iniciada com wrapper Tauri compartilhado e destinos desktop Linux/Windows, Android e navegador. Build não equivale a aprovação do WebView Android; aparelho não conectado ao ambiente.

## Checkpoint de retomada — 2026-11-13

Execução encerrada a pedido do usuário para continuar depois. Consulte [CHECKPOINT.md](../CHECKPOINT.md) antes de retomar. E01-T06 continua em andamento: wrapper/CI/documentação preparados; Rust Android ARM64 compilou, porém builds desktop e Gradle foram interrompidos antes dos pacotes. Não há APK/instalador gerado nem aprovação do smoke nativo ou Windows/Android físico. Testes TS/tipos: 63 aprovados.

## Retomada — 2026-11-14

Linux `.deb` gerado e smoke Tauri/WebKitGTK aprovado (WebGL2/WASM, pilotagem, pausa, descarte/reinício). Evidências locais em `artifacts/native/`. APK debug ARM64 gerado, identificador/arquitetura e assinatura v2 Android Debug conferidos; cópia em `artifacts/native/`. Sem medição de GPU física; Android físico e Windows continuam pendentes. E01-T06 permanece aberta.

- 2026-11-14: teste físico adiado pelo usuário. Iniciada E01-T07 com tempos de quadro, heap opcional, identificação de build e teste de áudio por gesto. Tipos/testes e smoke Chromium aprovados; T06/T07 seguem abertas até evidências físicas e RAM/áudio por plataforma.

- 2026-11-14: prioridade revisada pelo usuário: desenvolver primeiro o web; ports Android/desktop ficam para depois. Pendências nativas não bloqueiam o desenvolvimento web da etapa 02, sem marcar T06/T07 completas.

- 2026-11-14: E02-T01 implementada no web: modelo Cart.fbx, drift por Shift/toque e controle aéreo moderado. Tipos/testes aprovados, incluindo circuito com rampas/aterrissagens; próxima E02-T02.

- 2026-11-14: E02-T02 implementada no web: treino/corrida, countdown, 1/3/5 voltas e gates direcionais com alternativa válida. Três voltas automatizadas em Rapier aprovadas nas duas rotas; playtest humano segue pendente. Próxima E02-T03.

- 2026-11-14: E02-T03 implementada: recuperação manual/queda/stuck com apoio e espaço verificados por Rapier, direção correta e progresso/tempo/rota preservados. Três voltas com queda e recuperação na alternativa aprovadas por inputs. Próxima E02-T04.

- 2026-11-14: pista ampliada para ~223 m, curvas de raio 10 m e abertura externa amarela para queda real. Gates/âncoras/rotas ajustados, três voltas e queda por inputs aprovadas. Próxima E02-T04 permanece.

- 2026-11-14: física revisada conforme especificação fake arcade do usuário: yaw direto, drift visual desacoplado, teto rígido e mini-turbo de um estágio, atrito físico removido dos pisos, apoio por três sondas e repulsão em barreiras. Referência vigente em `17-fisica-arcade.md`; sensação final depende de playtest.

- 2026-11-14: movimento vetorial separado em `kart-motion.ts`, Rapier só para consultas/colisores e proxy cinemático. Interpolação visual entre ticks e câmera com distância relativa estável, após relato de trepidação. Próxima tarefa estrutural permanece E02-T04; playtest de dirigibilidade/câmera pendente.

- 2026-11-14: usuário aprovou a câmera interpolada; acrescentados órbita elástica, FOV/banking/look-ahead, enquadramento de voo e pulso discreto de impacto, com Movimento reduzido opcional.
