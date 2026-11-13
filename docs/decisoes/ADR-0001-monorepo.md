# ADR-0001 — Monorepo e núcleo compartilhado

- **Estado:** Proposto
- **Data:** 2026-11-13

## Contexto
Jogo deve rodar web, Tauri desktop e Android e conversar com serviço Rust sem duplicar gameplay.

## Decisão proposta
Monorepo com `apps/web`, `apps/native`, `apps/server` e pacotes TS `game-core`, `protocol`, `game-data`. Tauri referencia build de `apps/web`; `game-core` expõe abstrações locais/remotas.

## Alternativas
Repositórios separados (mais coordenação); implementar um jogo diferente por plataforma (custo e risco de divergência altos).

## Consequências
Benefício: uma base de jogo, regras e formatos compartilhados. Custo: pipeline de build mais complexo e contratos entre Rust e TS precisam de testes cruzados.

## Validação necessária
Prova de importação de pacote compartilhado e empacotamento do mesmo build em web/Tauri; testes na etapa 00/01. Aceitar ou revisar após o spike.

## Evidência parcial — 2026-11-13

Escolhido npm workspaces. `npm run check` passou com importação de `@kartube/game-core` pelo pacote `protocol` e pelos testes em Node 24. Ainda falta empacotar o mesmo cliente no navegador/Tauri; ADR permanece proposto.
