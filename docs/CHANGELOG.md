# Histórico de mudanças do projeto e da documentação

Registro cronológico; distinguir proposta de implementação.

## 2026-11-13 — E00-T04 — Codecs de servidor TS/Rust

- Tipo: implementação e documentação.
- Decoder/encoder TS e wrapper Rust validam welcome, input_ack, error, snapshots, resultados e eventos de checkpoint/item; 45 fixtures compartilhadas e roundtrip.
- Verificação de dados de resultado extraída de sua associação ao snapshot final. Campos anuláveis obrigatórios e números finitos conferidos antes de serializar em TS.
- Spike emite envelope completo e sequência independente em todas as respostas. Limites: 4 KiB cliente, 16 KiB servidor. Smoke Node usa decoder TS nas respostas reais Rust.
- Evidência: tipos e 30 testes TS; 8 testes Rust; rustfmt/clippy sem warnings; smoke WebSocket Node e Chromium aprovados.
- Etapa 00 segue em andamento; adapters, salas, simulação e demais provas de plataforma continuam pendentes.

## 2026-11-13 — E00-T03/T04 — Sessão, estados e resultado de corrida

- Tipo: implementação de contratos e documentação.
- RaceSession ampliada com identidade de modo/slot, snapshot consultável e eventos. Snapshot inclui configuração, poses e progresso dos oito pilotos; contrato tipado de servidor inclui eventos de checkpoint/item/resultado.
- Validadores de invariantes, transições consecutivas e resultado final; preservam identidade dos slots e relógio, rejeitam regressões e pontos inconsistentes. Desempate por slot para chegada no mesmo tick.
- Documentadas responsabilidades de descarte, resync e emissão única para futuros adapters. Política experimental atribui pontos por posição também a DNF; timeout e ordem entre DNFs ainda pendentes de validação.
- Evidência: `npm run check` aprovado, 27 testes TS e tipos estritos. Sem alteração no spike de rede/Rust.
- Etapa 00 em andamento: LocalSession/RemoteSession, codecs de servidor, aprovação de regras e provas de plataforma continuam pendentes.

## 2026-11-13 — E00-T04 — Checksum canônico e pistas em Rust

- Tipo: implementação e decisão (ADR-0004).
- Formato binário canônico e SHA-256 de pista em TS e Rust, com verificadores de estrutura/integridade separados. Checksum antigo opaco substituído por 64 dígitos hexadecimais minúsculos.
- Parser de grafo/spawns equivalente em Rust; serde_json com float_roundtrip para preservar a conversão correta dos números binary64.
- Golden bytes/hash gerados independentemente em Python e 22 casos compartilhados de mutação; fixture inclui frações e expoente. Reordenação e zero negativo preservam hash; conteúdo alterado falha na verificação.
- Evidência: tipos e 18 testes TS aprovados; 7 testes Rust aprovados; rustfmt e clippy sem warnings. Contratos documentados em dados/pistas e ADR-0004.
- Etapa 00 em andamento; mensagens completas, contratos de sessão e provas de plataforma continuam pendentes. ADRs 0001–0003 seguem propostos.

## 2026-11-13 — E00-T04 — Parser de pistas e grafo de checkpoints

- Tipo: implementação e documentação.
- `parseTrackDefinition` valida dados desconhecidos, versão, IDs, vetores finitos, volumes positivos e oito spawns únicos.
- Grafo exige chegada existente, referências válidas, todos os nós alcançáveis e ausência de ciclos fora da chegada. Rotas alternativas podem bifurcar e se reencontrar.
- Fixture de contrato adicionada; não constitui pista jogável. Sem validação de movimento, contagem de voltas ou cálculo de checksum.
- Evidência: `npm run check` aprovado em Node 24.22.2, 15 testes e tipos estritos; documentação de pistas e dados atualizada.
- Etapa 00 segue em andamento; hash canônico, paridade do parser Rust e demais entregas pendentes.

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
