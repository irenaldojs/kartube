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
- Testes executados e ambiente: Node.js 24.22.2 / npm 11.19.1; `npm run check`: tipos aprovados e 9 testes passando, incluindo decoder e gate de protocolo (detalhes no changelog).
- Evidências de aprovação: **—**
- Pendências / riscos: T01, T03–T07 ainda pendentes de validação completa; Rust/Cargo ausentes, Android físico não definido. Interfaces e fixtures iniciais não bastam para encerrar a etapa.
- Data de conclusão: **—**

### Avanço E00-T04 — 2026-11-13

- Decoder v1 para hello/input, limite UTF-8, verificação de versão e gate de handshake/sequência implementados.
- Fixtures canônicas de envelope adicionadas; documentação de rede alinhada com o formato real.
- T04 permanece aberta: contrato de pista validado em runtime, demais mensagens e paridade Rust ainda pendentes. T06 permanece aberta: nenhum teste real browser/Rust ou Android executado.
