# Etapa 00 — Fundamentos e contratos

> **Estado:** Concluída · **Execução:** iniciada em 2026-11-13

## Dependências

Nenhuma etapa prévia.

## Objetivo

Definir fronteiras, ambiente de desenvolvimento e requisitos verificáveis antes de gerar código.

## Tarefas (a realizar)

- [x] E00-T01 — Confirmar com o time os objetivos, escopo P0/P1 e pontuação/tie-break em documentos de domínio.
- [x] E00-T02 — Fixar esquema de monorepo futuro (apps e packages) e normas TypeScript/Rust; escolher ferramenta de workspaces na execução.
- [x] E00-T03 — Validar arquitetura local/online, APIs `RaceSession`, `InputAdapter`, `PlatformAdapter` e responsabilidades server/client.
- [x] E00-T04 — Especificar contrato de pista/checkpoint, envelope de protocolo e casos canônicos compartilhados TS/Rust.
- [x] E00-T05 — Planejar conjunto mínimo de testes e matriz real de aparelhos alvo, incluindo Android físico.
- [x] E00-T06 — Executar microprovas técnicas de WebSocket entre browser e Rust e carregamento de WebGL2/WASM no Android tão logo houver código.
- [x] E00-T07 — Aceitar ou revisar ADR-0001 a 0003 com evidência.

## Critérios de aceite

- [x] Contratos e responsabilidades escritos sem ambiguidades de autoridade.
- [x] Um checklist de validação por plataforma aprovado; ADRs com estado atualizado (revisados, com aceite integral pendente onde indicado).
- [x] Nenhuma implementação posterior começa sem interfaces de pista e sessão acordadas.

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
- Testes executados e ambiente: Node.js 24.22.2 / npm 11.19.1 / Rust 1.100.0 em Linux; tipos e 54 testes TS, 8 testes Rust, rustfmt, clippy e `npm run check:spike` aprovados. Chromium headless confirmou hello/welcome por WebSocket (detalhes no changelog).
- Evidências de aprovação: relatórios do S20 FE e confirmação dos testes manuais; usuário autorizou o encerramento e confirmou o escopo/regras em 2026-11-13.
- Pendências / riscos: sem pendências bloqueantes de fundamentos. Tauri, testes da matriz completa, políticas de DNF/timeout e aceite integral dos ADRs continuam nas etapas correspondentes.
- Data de conclusão: **2026-11-13**

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

### Avanço E00-T03/T04 — Sessão e mensagens de corrida — 2026-11-13

- Interfaces de sessão e eventos ampliadas, com snapshot configurado, poses/progresso, resultado e autoridade sobre checkpoint/item.
- Validadores puros de snapshot, continuidade e resultado; 27 testes TS no total, incluindo lifecycle, clocks, substituição por bot e inconsistências. Sem implementação de partida, física ou contagem de voltas da etapa 02.
- Contrato tipado ServerMessage adicionado; decoder/encoder de corrida e integração ao Rust ainda pendentes. Spike WebSocket não mudou de protocolo.
- T03/T04 continuam parciais até contratos testados com implementações local/remota e codecs; T01/T05/T06/T07 ainda pendentes.

### Avanço E00-T04 — Codecs de servidor — 2026-11-13

- Decoder/encoder TS e wrapper Rust validado para welcome/input_ack/error, snapshot, resultado e eventos checkpoint/item.
- Limite de saída 16 KiB; entrada continua 4 KiB. Envelope completo aplicado ao spike, com sequência de servidor independente.
- 45 fixtures comuns; 30 testes TS, 8 Rust, rustfmt/clippy e smoke Node/Chromium aprovados. O smoke Node valida as respostas reais Rust pelo decoder TS.
- Resultado tem validação isolada de dados e validação contextual com snapshot final. Nenhuma corrida/sala implementada; adapters e demais pendências da etapa permanecem abertos.

### Avanço E00-T03 — Adapter remoto — 2026-11-13

- RemoteRaceSession em network-client implementa RaceSession com transporte injetável e implementação WebSocket padrão; isolamento registrado no ADR-0005.
- Handshake, sequência contígua, IDs de evento, contexto de corrida, continuidade de snapshots, resultado único, input e descarte testados. Snapshots/eventos congelados e erros de listener isolados.
- Evidência: `npm run check` com 43 testes TS/tipos aprovados; `npm run check:spike` confirmou handshake da nova sessão com Rust e smoke Node/Chromium.
- Pacote antecipado é prova das interfaces da etapa 00, sem implementação de salas/sincronização de partidas das etapas 05/06. Config/slot vêm de fixture até existir lobby autoritativo.
- T03 continua parcial: falta implementação local de referência e provas completas dos adapters; resync/timeout/reconexão não implementados. Etapa permanece em andamento.

### Avanço E00-T03 — Sessão local e equivalência — 2026-11-13

- LocalRaceSession implementada em game-core com LocalRaceAuthority injetável, um humano/sete bots, ticks explícitos, input copiado/consumido uma vez e frames validados atomicamente. Autoridade de teste roteirizada, sem antecipar simulação/IA das etapas 02–04.
- Lifecycle, término/aborto, falhas, estado imutável, descarte e equivalência local/remoto (snapshots/checkpoint/item/resultado) testados. isInputFrame movido para o núcleo e reexportado por protocol, preservando a direção de dependências.
- Evidência: `npm run check`, 54 testes TS e tipos estritos; `npm run check:spike` aprovado com Node/adapter remoto/Rust/Chromium.
- T03 e T04 concluídas no escopo de contratos iniciais: fronteiras de sessão/input/plataforma documentadas, duas implementações de referência, pista/checksum/envelope e casos canônicos TS/Rust verificados. Codecs de lobby/campeonato e adapters de dispositivos serão ampliados nas etapas de domínio, sem manter artificialmente estas tarefas de contrato abertas. Isso não equivale a gameplay implementado ou compatibilidade de plataformas validada.
- Etapa 00 continua em andamento: T01 (aceite de produto/regras), T05 (matriz real), T06 (WebGL2/WASM/Android) e T07 (ADRs 0001–0003) permanecem pendentes.

### Avanço E00-T06 — WebGL2/WASM no navegador — 2026-11-13

- `apps/web` com Vite, Three.js e Rapier/WASM: cena provisória, queda/colisão, passo fixo de 1/60 s e perfis leve/equilibrado.
- Pausa, avanço de 120 passos, descarte/reinício, tratamento de perda de contexto e exportação de relatório com navegador/GPU/versões/FPS/recursos.
- `npm run check:web`: build e smoke Playwright em Chromium headless/SwiftShader, incluindo pixels da cena, altura de repouso, liberação/reinício, perda de contexto, layout móvel e ausência de WebGL2/WASM. CI configurada para repetir a prova e armazenar captura/relatório.
- T06 permanece parcial: emulação de viewport móvel e renderização por software não validam Android físico, GPU real ou Tauri. ADR-0003 segue proposto; etapa 01 não iniciada.

### Validação manual Android físico — 2026-11-13

- Samsung Galaxy S20 FE, Chrome 157; GPU informada pelo relatório: Qualcomm Adreno 650. A versão real do Android não foi confirmada (o user agent reduzido informa Android 10).
- Relatório fornecido pelo usuário: WebGL2/WASM ativos, perfil equilibrado, pixelRatio 1.5, FPS amostrado 60.4, bodyY 0.349, 8 geometrias e 1 textura. Three.js 187 e Rapier 0.12.0. Medição da cena mínima, sem benchmark de corrida ou memória total.
- Segundo relatório: status disposed e resourcesReleased true. Contadores de memória são da última amostra antes do descarte.
- Usuário confirmou aprovação de todos os testes manuais orientados: reinício, pausa, avanço exato de 120 passos, retomada e ciclos de liberação/reinício. Evidência relatada pelo usuário, sem execução remota pelo agente; commit/build não informado.
- Perda forçada de contexto no aparelho não foi incluída no roteiro manual e segue sem evidência Android; cobertura automatizada existente é em Chromium desktop. Tauri, GLB, áudio, controles de gameplay e matriz completa continuam pendentes.
- Resultado: prova básica WebGL2/WASM aprovada neste Android físico; etapa 00 continua em andamento e ADR-0003 segue proposto.

### Encerramento E00-T05/T06 — 2026-11-13

- E00-T06 concluída no escopo escrito: WebSocket browser/Rust e WebGL2/WASM em Android físico, com relatórios e confirmação manual do usuário no S20 FE. Perda forçada de contexto Android e Tauri não foram declarados aprovados.
- E00-T05 concluída: [matriz de plataformas](../matriz-plataformas.md) define conjunto mínimo automatizado, aparelhos conhecidos, roteiro manual, evidências e ambientes planejados. Isso encerra o planejamento da matriz, sem declarar todos os ambientes testados.
- Próxima tarefa da etapa: E00-T07, revisar ADR-0001 a 0003 à luz das evidências. E00-T01 continua exigindo aceite das regras/escopo; nenhuma aprovação de produto foi inferida do teste técnico.

### Encerramento E00-T07 — 2026-11-13

- ADR-0001 a 0003 revisados com evidências implementadas, limites e critérios restantes atribuídos às etapas correspondentes. T07 permite aceitar ou revisar: a revisão foi concluída sem declarar aceite integral de tecnologias ainda sem prova nativa/online.
- Monorepo e interfaces comprovados; empacotamento compartilhado ainda na etapa 01. Transporte/contratos comprovados; sincronização de corrida ainda nas etapas 05/06. Render/física básicos comprovados em Android; protótipo jogável e pipeline nativo ainda na etapa 01.
- Pendência atual da etapa 00: E00-T01, aceite de objetivos/escopo e regras de pontuação/desempate. O teste Android não constitui esse aceite de produto.

### Encerramento da etapa 00 — 2026-11-13

- Usuário confirmou o escopo e as regras apresentados: MVP documentado, oito pilotos, quatro pistas, três voltas e tabela 15/12/10/8/6/4/2/1; desempates mantidos conforme o documento de campeonato. E00-T01 concluída.
- E00-T01 a T07 concluídas no escopo dos fundamentos. Roteiro de testes e matriz registrados, contratos acordados e ADRs revisados. Evidências históricas de pendências acima descrevem estados anteriores.
- Etapa 01 liberada. A conclusão dos fundamentos não representa aceite de Tauri, gameplay online ou desempenho de corrida completa.
