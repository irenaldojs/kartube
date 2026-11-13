# Histórico de mudanças do projeto e da documentação

Registro cronológico; distinguir proposta de implementação.

## 2026-11-13 — E01-T04 — Pilotagem básica

- Controlador arcade Rapier a 60 Hz: acelerar, frear, dar ré, esterçar, aderência lateral e CCD, com ajustes em módulo próprio. Gravidade/colisões preservadas e tração condicionada a apoio.
- Teclado e controles de toque sobre a cena, velocímetro, reset manual e recuperação básica de queda. Entradas limpas na pausa, blur, ocultação e descarte.
- Corrigido degrau de entrada das rampas detectado por teste de percurso. Driver de teste completa o circuito com ambas as rampas sem teleporte/reset; não representa bots de gameplay.
- Verificação: `npm run check` (59 testes), `npm run check:web` (teclado, freio, curva, blur, pausa, ponteiro/multitouch móvel e regressões). Captura móvel na CI. Evidência Android anterior não se aplica automaticamente ao novo build.
- E01-T04 concluída; próxima E01-T05. Drift, triggers de boosts/itens e regras de corrida permanecem pendentes.

## 2026-11-13 — E01-T03 — Câmera em terceira pessoa e sombra

- Câmera acompanha o kart provisório com suavização por tempo e orientação; troca para visão geral preserva física e pausa.
- Sombra de contato sem textura/shadow map acompanha a superfície por raycast; perfis com 16/24 segmentos e recursos descartáveis.
- Verificação: tipos e 56 testes, incluindo orientação e equivalência de suavização a 30/60 Hz; smoke Chromium de câmera, sombra, descarte e regressões WebGL2/WASM. Captura da terceira pessoa adicionada aos artefatos.
- E01-T03 concluída; próxima E01-T04 (movimento básico). Pilotagem e validação física da câmera em movimento ainda pendentes; novo build ainda sem evidência Android.

## 2026-11-13 — E01-T02 — Circuito cinza de protótipo

- Cena inicial com pista fechada, largada quadriculada, guardrails, duas rampas, três boosts visuais, três caixas e caminho alternativo conectado.
- Descritores de geometria separados de Three.js/Rapier; malha de caixa compartilhada, colisores estáticos para pista/rampas/guardrails e spawn sobre a via. Seletor preserva o laboratório de queda.
- Verificação: `npm run check:web`, captura inspecionada, repouso físico no spawn, troca/liberação/reinício de cena e regressão da prova WebGL2/WASM. CI inclui captura da pista.
- E01-T02 concluída; próxima E01-T03. Sem gameplay de boost/item, pilotagem ou checkpoints nesta entrega.

## 2026-11-13 — Aceite dos fundamentos e início da etapa 01

- Usuário confirmou o MVP documentado, oito pilotos, quatro pistas, três voltas, pontos e desempates. E00-T01 e etapa 00 concluídas; critérios futuros de Tauri/ADRs e DNF não foram declarados implementados.
- Etapa 01 iniciada; E01-T01 concluída reutilizando estrutura Vite, boot assíncrono e seleção de perfis da prova existente. Próxima tarefa: E01-T02, pista cinza fechada.
- Documentos de visão, campeonato, etapas, andamento e README alinhados com o aceite. Verificação do boot: `npm run check:web`.

## 2026-11-13 — E00-T07 — Revisão dos ADRs iniciais

- ADR-0001 a 0003 revisados com evidências atuais e validações restantes nas etapas 01 e 05/06. E00-T07 concluída pela revisão prevista no enunciado.
- Estados Proposto preservados para aceite integral: empacotamento Tauri, sincronização de corridas e pipeline jogável ainda sem prova suficiente. Etapa 00 permanece em andamento por E00-T01 (aceite de produto/regras).

## 2026-11-13 — E00-T05/T06 — Matriz definida e microprovas concluídas

- E00-T06 concluída com WebSocket browser/Rust e prova WebGL2/WASM no S20 FE, conforme o escopo da tarefa.
- E00-T05 concluída: matriz de plataformas, conjunto mínimo automatizado e roteiro manual publicados em `docs/matriz-plataformas.md`. Evidências executadas e ambientes planejados separados, com limites das medições e identificação pendente de build/SO.
- Etapa 00 continua em andamento por T01 e T07; Tauri, GLB, áudio e validação de corrida permanecem nos respectivos critérios futuros.

## 2026-11-13 — E00-T06 — Validação manual no S20 FE

- Usuário forneceu relatórios de execução e descarte em Android físico (S20 FE, Adreno 650, Chrome 157): WebGL2/WASM ativos, 60.4 FPS amostrados no perfil equilibrado, pixelRatio 1.5 e colisão em bodyY 0.349.
- Confirmou aprovação de reinício, pausa, avanço de 120 passos, retomada e ciclos de liberação/reinício. Evidência manual relatada pelo usuário; build/commit não informado.
- Documentação de andamento, qualidade e ADR-0003 atualizada. Prova básica Android aprovada; perda forçada de contexto no aparelho, matriz completa, Tauri e demais critérios de aceite continuam pendentes. Etapa 00 em andamento.

## 2026-11-13 — E00-T06 — Prova WebGL2/WASM desktop

- Tipo: implementação e documentação.
- Cliente Vite com Three.js/WebGL2 e Rapier/WASM, queda e colisão a passo fixo, perfis gráficos, pausa, descarte/reinício e exportação JSON.
- Smoke Playwright cobre renderização real de pixels, repouso após colisão, avanço manual, descarte, perda de contexto, layout móvel e fallback sem WebGL2/WASM. Build e verificação de tipos incluídos; CI com artefatos de evidência.
- Evidência local: `npm run check` (54 testes TS) e `npm run check:web` em Chromium headless/SwiftShader. Relatório identifica renderização por software e ausência de Android real.
- Etapa 00 em andamento; T06 parcial e ADR-0003 proposto. Sem pilotagem, pista jogável ou aceite de Android/Tauri.

## 2026-11-13 — E00-T03 — Sessão local de referência e equivalência

- Tipo: implementação e documentação.
- LocalRaceSession com autoridade injetável implementa RaceSession offline: um humano/sete bots, step explícito, frame validado atomicamente, input copiado, resultado único e liberação idempotente.
- Falha de autoridade preserva último snapshot e encerra a sessão; listeners/limpeza são isolados. Teste compartilhado confirma eventos equivalentes via sessão local e remota.
- Validador de InputFrame movido ao núcleo/reexportado por protocol, evitando dependência do offline em rede. Sem autoridade de gameplay, física ou IA antecipadas.
- Evidência: 54 testes TS e tipos aprovados; smoke WebSocket Node, adapter remoto/Rust e Chromium aprovado.
- E00-T03/T04 concluídas no escopo dos contratos iniciais; etapa 00 em andamento por aceite de produto, matriz de aparelhos, WebGL2/WASM/Android e ADRs iniciais.

## 2026-11-13 — E00-T03 — Sessão remota com transporte injetável

- Tipo: implementação e decisão (ADR-0005).
- Novo pacote network-client mantém I/O fora do núcleo/protocolo e implementa RaceSession remota com handshake, continuidade de envelopes/snapshots e contexto de eventos.
- Input só é enviado por slot humano em corrida ativa; resultado é emitido uma vez após snapshot final válido. Estado exposto é congelado, listeners isolados e descarte idempotente remove callbacks/fecha transporte.
- Extraída validação de RaceConfig para reuso no construtor; adicionado smoke do adapter contra o Rust real ao check:spike já executado pela CI.
- Evidência: tipos e 43 testes TS aprovados; smoke de WebSocket Node, RemoteRaceSession/Rust e Chromium aprovado. Sem alterações no servidor Rust nesta entrega.
- Etapa 00 segue em andamento; sessão local de referência, resync/reconexão, lobby e provas Android permanecem pendentes.

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
