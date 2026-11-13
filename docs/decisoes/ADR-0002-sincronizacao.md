# ADR-0002 — Sincronização híbrida e autoridade de regras

- **Estado:** Proposto
- **Data:** 2026-11-13

## Contexto
Servidor Rust deve ser leve, mas corridas precisam ter resultados iguais, 8 participantes e itens consistentes.

## Decisão proposta
Servidor autoritativo para lobby, slots, bots online, relógio, checkpoint, inventário, resultados e placar; cliente TS mantém resposta de controle e física visual, com envio de inputs/snapshots e interpolação de remotos.

## Alternativas
Lockstep determinístico entre clientes (difícil sob física e plataformas heterogêneas); servidor reproduz toda a física de todos os karts (mais robusto, porém maior custo); cliente autoritativo puro (fraude/desync).

## Riscos e consequências
Validação de movimento aproximada **não impede todo cheat** nem divergência física; pode exigir maior autoridade no futuro. Evitar suposições sobre economias de CPU antes de testes.

## Validação necessária
2–8 jogadores, bots, perdas/reconexões, itens simultâneos, latência variável, mesmo resultado em todos os clientes, testes de movimento impossível e medição de CPU/RAM/banda.
