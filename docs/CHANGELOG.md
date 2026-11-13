# Histórico de mudanças do projeto e da documentação

Registro cronológico; distinguir proposta de implementação.

## 2026-11-13 — E00-T06 — Prova local WebSocket browser/Rust

- Tipo: implementação e documentação.
- Spike antecipado em `apps/server`: Tokio/Axum, endpoint WebSocket, página de diagnóstico e decoder/gate Rust com fixtures compartilhadas de input e envelope. Sem salas ou regras de corrida.
- Instalado Rust no ambiente; toolchain fixada e Cargo.lock versionado. Playwright/Chromium e scripts para iniciar, testar e encerrar o servidor local; job de CI configurado, ainda não executado remotamente.
- Evidência: 9 testes TS e tipos aprovados; 4 testes Rust; rustfmt e clippy sem warnings; smoke WebSocket Node aprovado (versão, handshake, replay e inputs); Chromium headless confirmou página → WebSocket → Rust → welcome.
- Ambiente: Linux, Node 24.22.2, Rust 1.100.0, Playwright 1.65.0/Chromium 158. As bibliotecas Linux do navegador foram instaladas para executar a prova.
- Etapa 00 segue em andamento. E00-T06 parcial: WebGL2/WASM, Tauri e Android físico ainda pendentes; ADRs continuam propostos.

## 2026-11-13 — E00-T04 — Validação inicial do protocolo

- Tipo: implementação e documentação.
- Decoder de hello/input verifica versão, estrutura e limite de 4096 bytes UTF-8; gate por conexão exige handshake e rejeita replay por sequência.
- Fixtures JSON portáveis para futura paridade Rust e testes de mensagens malformadas/multibyte/ordenação.
- Corrigida divergência documental: discriminante type pertence ao payload; eventId faz parte do envelope.
- Evidência: `npm run check` aprovado, 9 testes, Node 24.22.2. Nenhuma prova de rede ou Android executada.
- Etapa 00 segue em andamento; E00-T04 e E00-T06 permanecem abertas.

## 2026-11-13 — E00-T02 — Início dos fundamentos

- Tipo: implementação e documentação.
- Monorepo npm com três pacotes TypeScript estritos; contratos iniciais de sessão, input, plataforma, pista e protocolo v1.
- Validação de roster de oito participantes e inputs; fixtures JSON destinadas ao futuro validador Rust; CI para checagem de tipos e testes.
- README com instruções reproduzíveis, lockfile e regras de arquivos gerados. Planejamento e estrutura de assets incluídos no controle de versão.
- Evidência: `npm run check` aprovado em Node 24.22.2/npm 11.19.1; `git diff --check` sem erros. CI configurada, ainda não executada remotamente.
- Etapa 00: Planejada → Em andamento. Sem renderização, servidor, prova Android ou ADRs aceitos; demais entregas permanecem pendentes.

## 2026-11-13 — Planejamento 0.1

- Criado `Geral.md` com visão, módulos, regras iniciais e sequência de etapas.
- Criados documentos de gameplay, pista, bots, multiplayer, campeonato, assets, distribuição, testes e operação.
- Criados 12 roteiros de execução e 3 ADRs iniciais **propostos**.
- Criada árvore `assets/` vazia para futura importação controlada.
- **Nenhuma funcionalidade implementada ou validada.**

## Template de entrada futura

```markdown
## AAAA-MM-DD — E##-T## — Título
- Tipo: planejamento | implementação | correção | decisão
- Mudança: descrição objetiva
- Documentos afetados: caminhos
- Evidência: commit/PR/testes/ambiente
- Estado da etapa: anterior → atual
```
