# Etapa 00 — Fundamentos e contratos

> **Estado:** Em andamento · **Execução:** iniciada em 2026-11-13

## Dependências

Nenhuma etapa prévia.

## Objetivo

Definir fronteiras, ambiente de desenvolvimento e requisitos verificáveis antes de gerar código.

## Tarefas (a realizar)

- [ ] E00-T01 — Confirmar com o time os objetivos, escopo P0/P1 e pontuação/tie-break em documentos de domínio.
- [x] E00-T02 — Fixar esquema de monorepo futuro (apps e packages) e normas TypeScript/Rust; escolher ferramenta de workspaces na execução.
- [ ] E00-T03 — Validar arquitetura local/online, APIs `RaceSession`, `InputAdapter`, `PlatformAdapter` e responsabilidades server/client.
- [ ] E00-T04 — Especificar contrato de pista/checkpoint, envelope de protocolo e casos canônicos compartilhados TS/Rust.
- [ ] E00-T05 — Planejar conjunto mínimo de testes e matriz real de aparelhos alvo, incluindo Android físico.
- [ ] E00-T06 — Executar microprovas técnicas de WebSocket entre browser e Rust e carregamento de WebGL2/WASM no Android tão logo houver código.
- [ ] E00-T07 — Aceitar ou revisar ADR-0001 a 0003 com evidência.

## Critérios de aceite

- [ ] Contratos e responsabilidades escritos sem ambiguidades de autoridade.
- [ ] Um checklist de validação por plataforma aprovado; ADRs com estado atualizado.
- [ ] Nenhuma implementação posterior começa sem interfaces de pista e sessão acordadas.

## Documentos que devem ser revisados

- [`docs/02-arquitetura-do-sistema.md`](../02-arquitetura-do-sistema.md)
- [`docs/03-stack-e-padroes.md`](../03-stack-e-padroes.md)
- [`docs/06-online-e-protocolo.md`](../06-online-e-protocolo.md)
- [`docs/16-formato-dados.md`](../16-formato-dados.md)
- [`docs/ANDAMENTO.md`](../ANDAMENTO.md)
- [`docs/CHANGELOG.md`](../CHANGELOG.md)

## Registro de execução (preencher apenas durante o desenvolvimento)

- Responsável / agente: Codex
- Data de início: 2026-11-13
- Referência de commit/PR: primeiro commit de implementação (`chore: initialize Kartube foundations`); consultar git log.
- Testes executados e ambiente: Node.js 24.22.2 / npm 11.19.1 / Rust 1.100.0 em Linux; tipos e 18 testes TS, 7 testes Rust, rustfmt, clippy e `npm run check:spike` aprovados. Chromium headless confirmou hello/welcome por WebSocket (detalhes no changelog).
- Evidências de aprovação: **—**
- Pendências / riscos: T01, T03–T07 ainda pendentes de validação completa; Android físico não definido; Rust/Cargo agora instalados. Interfaces e fixtures iniciais não bastam para encerrar a etapa.
- Data de conclusão: **—**

### Avanço E00-T04 — 2026-11-13

- Decoder v1 para hello/input, limite UTF-8, verificação de versão e gate de handshake/sequência implementados.
- Fixtures canônicas de envelope adicionadas; documentação de rede alinhada com o formato real.
- T04 permanece aberta: validação de pista em runtime registrada no avanço seguinte; demais mensagens e paridade completa Rust ainda pendentes. T06 permanece aberta até todas as provas de plataforma; o avanço seguinte registra o teste browser/Rust.

### Avanço E00-T06 — 2026-11-13

- Criado `apps/server` antecipadamente como spike exigido pela etapa 00; isso não inicia nem conclui a etapa 05 (salas). Sem apps web/nativo ainda.
- Toolchain Rust fixada, dependências com Cargo.lock, Tokio/Axum WebSocket e página de diagnóstico local.
- Decoder/gate Rust e fixtures compartilhadas com TS; 4 testes Rust.
- Teste integrado Node WebSocket e navegador Chromium automatizado; comandos e CI no README.
- ADRs seguem propostos: transporte local não valida sincronização de corridas, renderização ou empacotamento. T06 segue parcial até WebGL2/WASM no Android físico.

### Avanço E00-T04 — Validação de pista — 2026-11-13

- Parser runtime de `TrackDefinition` em game-data, erros com caminho/campo, grafo de rotas alternativas e oito spawns validados.
- Fixture JSON de contrato com bifurcação/reencontro; testes positivos e negativos de schema, coordenadas, referências, ciclos, conectividade e slots.
- Evidência: `npm run check` aprovado, 15 testes TS e tipos estritos.
- Pendências: hash canônico e validação de pista em Rust; contrato de rede completo; revisão dos contratos de sessão e testes de plataforma. Nenhuma etapa posterior iniciada e T04 ainda parcial.

### Avanço E00-T04 — Checksum e paridade de pistas — 2026-11-13

- SHA-256 de formato binário canônico v1 implementado em TS/Rust, decisão no ADR-0004.
- Parser de grafo/spawns equivalente em Rust, com APIs de validação estrutural e de checksum nas duas linguagens.
- Fixture com frações/expoente, bytes/hash esperados gerados independentemente e 22 casos de mutação compartilhados. Reordenação e zero negativo mantêm hash; mudança de conteúdo é rejeitada pela validação completa.
- Evidência: `npm run check`, `cargo test --locked`, rustfmt e clippy; 18 testes TS e 7 Rust.
- T04 continua parcial: mensagens de corrida ainda não especificadas completamente. T01/T03/T05/T06/T07 e aprovação integral da etapa permanecem pendentes.
