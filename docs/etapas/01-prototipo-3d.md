# Etapa 01 — Protótipo visual 3D

> **Estado:** Em andamento · **Execução:** iniciada em 2026-11-13

## Dependências

Etapa 00.

## Objetivo

Validar Three.js, Rapier, câmera e pipeline básico de render em uma pista cinza.

## Tarefas (a realizar)

- [x] E01-T01 — Criar estrutura de código planejada e primeiro boot com seleção de qualidade gráfica.
- [x] E01-T02 — Exibir pista cinza fechada com linha de largada, chão, guardrails, rampas, boosts, caixa de item e alternativa em geometria simples.
- [x] E01-T03 — Carregar kart placeholder por cena GLB ou geometria provisória, câmera em terceira pessoa e sombras de baixo custo.
- [x] E01-T04 — Executar movimento básico e colisões com timestep fixo; criar debug de FPS/física.
- [x] E01-T05 — Carregar e liberar assets sem vazamento; separar malhas e colisores.
- [ ] E01-T06 — Realizar spike do mesmo build no browser e Tauri Android em aparelho físico.
- [ ] E01-T07 — Registrar FPS, RAM, WebGL2, áudio e problemas de WebView por plataforma.

## Critérios de aceite

- [x] Kart pode percorrer o traçado cinza e câmera mantém alvo sem glitches críticos (percurso físico automatizado e smoke de câmera; playtest Android do novo build pendente).
- [ ] WebGL2/física funcionam no navegador e há registro de resultado real Android (aprovado ou bloqueio).
- [x] Assets e colisão estão isolados de regras de corrida.

## Documentos que devem ser revisados

- [`docs/05-pistas-e-circuitos.md`](../05-pistas-e-circuitos.md)
- [`docs/11-clientes-web-e-tauri.md`](../11-clientes-web-e-tauri.md)
- [`docs/12-testes-e-qualidade.md`](../12-testes-e-qualidade.md)
- [`docs/ANDAMENTO.md`](../ANDAMENTO.md)
- [`docs/CHANGELOG.md`](../CHANGELOG.md)

## Registro de execução (preencher apenas durante o desenvolvimento)

- Responsável / agente: Codex
- Data de início: **2026-11-13**
- Referência de commit/PR: boot/fundamentos em `1fadf59`; pista no commit `feat(web): add greybox prototype circuit`.
- Testes executados e ambiente: `npm run check:web`, build/tipos e smoke Chromium headless/SwiftShader; captura da pista inspecionada visualmente.
- Evidências de aprovação: **—**
- Pendências / riscos: **—**
- Data de conclusão: **—**

### E01-T01 — Estrutura e boot — 2026-11-13

- Reaproveitada a estrutura validada na microprova: `apps/web` com Vite/TypeScript, boot em `src/main.ts`, renderização em `src/view.ts` e física em `src/physics.ts`.
- Perfis leve/equilibrado selecionáveis; troca reinicializa a cena e libera os recursos anteriores. Boot assíncrono trata falhas de WebGL2/WASM e permite reinício. Scripts de desenvolvimento, build e smoke disponíveis na raiz.
- E01-T01 concluída com a implementação existente, sem duplicar o laboratório. Verificação: `npm run check:web` (tipos, build e smoke Chromium).
- Próxima tarefa: E01-T02, pista cinza fechada com os elementos de geometria provisória. Kart dirigível, câmera de acompanhamento e Tauri ainda não implementados.

### E01-T02 — Pista cinza fechada — 2026-11-13

- `src/track.ts` define primitivas em metros/radianos: circuito retangular contínuo com largura de 8 m, largada quadriculada, chão, guardrails com aberturas, duas rampas, três zonas visuais de boost, três caixas e uma alternativa ligando as retas laterais.
- Renderizador usa uma geometria de caixa compartilhada para os elementos da pista; Rapier recebe colisores estáticos separados a partir dos descritores sólidos (vias, guardrails e rampas). Boosts/caixas ainda não têm triggers ou regras de gameplay.
- Visão geral da pista é a cena inicial; seletor mantém disponível o laboratório de queda. Trocas de cena liberam/recriam recursos. Kart provisório nasce sobre uma reta.
- Smoke confirma cena, diagnóstico dos elementos, repouso físico no spawn, liberação/reinício e retorno ao laboratório com as verificações anteriores. Captura em `/tmp/kartube-track.png`, incluída nos artefatos da CI.
- E01-T02 concluída no escopo visual/geométrico. Checkpoints, voltas, efeitos de boost/itens e dirigibilidade não são parte desta entrega. Próxima tarefa: E01-T03, câmera em terceira pessoa e sombras de baixo custo para o kart provisório.

### E01-T03 — Kart, câmera e sombra de contato — 2026-11-13

- Kart de geometria provisória preservado. `src/camera.ts` acompanha posição e orientação com offset traseiro, alvo adiante e suavização exponencial em função do tempo. Primeiro enquadramento e troca de modo são imediatos; seletor alterna terceira pessoa/visão geral sem reiniciar física.
- Sombra de contato elíptica, sem textura ou shadow map, usa raycast vertical contra vias/rampas; acompanha a superfície e fica menos opaca com a altura. Recursos entram no descarte da cena. Perfil leve reduz os segmentos de 24 para 16.
- Diagnóstico exporta modo/posição/alvo da câmera e sombra visível. Layout da cena acompanha a altura do painel no desktop, com altura própria no móvel.
- Verificação: `npm run check` (56 testes, incluindo orientação em quatro direções e suavização a 30/60 Hz); `npm run check:web` (convergência após queda, sombra sobre a pista, troca de câmera sem alterar physicsSteps, descarte/reinício e regressões). Captura em `/tmp/kartube-chase.png` incluída na CI e inspecionada visualmente.
- E01-T03 concluída. Ainda sem pilotagem; colisão/oclusão de câmera em movimento será avaliada com o kart dirigível. Sombra é aproximação visual de contato, sem sombras dinâmicas do cenário. Medições anteriores do S20 FE não validam este novo build.
- Próxima tarefa: E01-T04, movimento básico e colisões a timestep fixo, reaproveitando diagnóstico de FPS/física existente.

### E01-T04 — Pilotagem básica e colisões — 2026-11-13

- Controlador arcade em Rapier com passo fixo de 1/60 s, aceleração até 12 m/s, frenagem, ré até 4 m/s, arrasto, aderência lateral e esterçamento dependente da velocidade. Parâmetros concentrados em `src/driving.ts`; corpo com CCD e orientação yaw, preservando gravidade/colisão vertical. Tração/direção exigem apoio detectado por raycast.
- Teclado WASD/setas ao focar a cena; Espaço freia, R reposiciona. Controles de ponteiro sobre a cena suportam toque simultâneo de aceleração/direção. Blur, ocultação, pausa, troca de foco e descarte limpam entradas; soltura/cancelamento de ponteiro remove a ação.
- Velocímetro e relatório com posição/yaw/velocidade/apoio/reset/input e timestep. Reposicionamento manual e recuperação básica após queda abaixo de -8 m; regras formais de respawn ficam na corrida local.
- Entradas das duas rampas rebaixadas para encontrar o piso sem degrau que prendia o kart, problema encontrado pelo teste de percurso completo.
- Verificação: `npm run check` (59 testes; aceleração, freio, ré, reset, guardrail, direção e circuito completo com rampas por inputs, sem teleporte); `npm run check:web` (teclado, freio, direção, perda de foco, pausa, ponteiro, multitouch em viewport móvel e regressões). Captura móvel em `/tmp/kartube-driving-mobile.png`.
- E01-T04 concluída. Test driver existe só no teste, sem implementar bots de gameplay. Drift, boost/item, gamepad, configuração de controles e corrida com checkpoints/voltas não estão implementados. Sem nova medição ou aprovação física Android deste build.
- Próxima tarefa: E01-T05, revisar ciclo de assets, descarte e isolamento entre malhas e colisores, com evidências de recursos.

### Correção após teste móvel do usuário — 2026-11-13

- Multitouch da E01-T04 falhou no celular segundo o usuário; sucesso do smoke anterior não representou o gesto sequencial real.
- Rastreamento por Touch.identifier e foco do teclado separado das ações de toque; controles bloqueiam gestos/menu nativos e exibem ações mantidas.
- Regressão cobre primeiro acelerar, depois virar, trocar foco entre controles, soltar só direção, trocar para o outro lado, soltar só acelerador e cancelar o toque restante. Verificação automatizada em Chromium com suporte touch; usuário confirmou a correção no celular nesta sessão; registro manual, sem nova medição de desempenho.

### E01-T05 — Ciclo de assets e descarte — 2026-11-13

- `SceneAssets` concentra propriedade de geometrias/materiais, com registro único por recurso, contadores e descarte idempotente. Uma geometria de caixa atende pista e kart; materiais de mesma cor são compartilhados. Cena da pista usa 2 geometrias (caixa/sombra); laboratório usa 3 (caixa/sombra/grid).
- Inicialização gráfica protegida por cleanup em falha parcial. Descarte desconecta ResizeObserver, remove listener/contexto/canvas, limpa superfícies de raycast e libera recursos registrados/renderer. Inicialização WASM rejeitada pode ser tentada novamente; mundo e colisores têm estado de liberação verificável sem acessar memória WASM já liberada.
- Relatório disposed passa a amostrar contadores do renderer após descarte (`memorySample: after-release`), com release de gráficos/física/inputs/animação. Execução seguinte inclui previousRelease. Esses contadores evidenciam recursos gerenciados liberados, sem medir RAM total, memória do driver ou redução do heap WASM compartilhado.
- Malhas ficam no renderizador; física recebe apenas descritores sólidos de track.ts, sem importar Three.js, assets ou regras de corrida. Assets atuais são primitivas procedurais; GLB/texturas e falhas de rede serão validados no pipeline correspondente.
- Verificação: `npm run check` (63 testes, incluindo registro de recurso compartilhado, descarte repetido, adoção tardia e ciclos de mundo Rapier); `npm run check:web` (ciclos de liberar/reiniciar/trocar cena/perfil com contadores estáveis e zerados após liberação, falha de inicialização gráfica injetada, troca de perfil durante carregamento pendente de física e regressões de input/render/física).
- Também atendido o ajuste solicitado: botão de toque Freio / Ré único; o mesmo comando desacelera o avanço até parar e depois engata ré, com teste de física dedicado; tem prioridade sobre acelerar quando ambos são pressionados.
- E01-T05 concluída no escopo procedural do protótipo. Próxima E01-T06: empacotar o mesmo build em Tauri Android e testar no aparelho físico. E01-T07 (RAM/áudio/WebView) permanece aberta.

### Avanço E01-T06 — Wrapper desktop e Android — 2026-11-13

- Usuário confirmou que deseja apps nativos desktop além de Android e navegador. Criado `apps/native` com Tauri 2 e frontendDist compartilhado; entradas Rust/Kotlin não duplicam gameplay.
- Projeto Gradle Android versionado, APK debug ARM64, scripts de desenvolvimento/build, ícone original em SVG e capacidades básicas do wrapper. Workflow para Linux `.deb`, Windows NSIS e APK Android.
- Guia nativo documenta dependências, instalação e roteiro físico. Smoke de WebKitGTK executa o mesmo cliente embutido, verificando runtime/WebGL2/WASM, movimento, pausa e descarte/reinício.
- Ambiente local recebeu bibliotecas WebKitGTK, JDK 21, SDK Android, NDK e target Rust ARM64. Nenhum aparelho conectado via adb; prova Tauri no S20 FE permanece pendente e T06 não é marcada concluída só pelo build.

### Checkpoint solicitado pelo usuário — 2026-11-13

- `npm run check`: tipos e 63 testes aprovados. Rustfmt e sintaxe de `scripts/native-smoke.mjs` aprovados.
- Build Android: biblioteca Rust ARM64 concluída em 9m42s; `.so` local em target/aarch64-linux-android/debug. Gradle iniciou download de 9.6.1; compilação foi interrompida por solicitação de checkpoint antes de gerar APK.
- Build Linux: dependências Rust/WebKitGTK em compilação, interrompidas sem pacote gerado. Encerramento intencional (código 130), sem erro de compilação observado nos logs até esse ponto; isso não comprova build final aprovado.
- Smoke nativo, build Windows/CI e teste Tauri no S20 FE não executados. E01-T06/T07 continuam abertas.
- Comandos, caminhos de SDK e próximos passos em [CHECKPOINT.md](../../CHECKPOINT.md). Não reiniciar etapas concluídas nem regenerar o projeto Android sem necessidade.

### Retomada E01-T06 — Linux validado — 2026-11-14

- Build Linux release concluído: `Kartube_0.1.0_amd64.deb` (3.687.248 bytes), pacote `kartube` 0.1.0, arquitetura amd64, dependências WebKitGTK 4.1/GTK 3 verificadas com `dpkg-deb --info`.
- Smoke aprovado em Tauri/WebKitGTK sob Xvfb: cliente embutido com `runtime: tauri`, WebGL2/WASM, repouso físico, pilotagem, pausa, descarte e reinício com um único canvas. Captura inspecionada; renderer zerou geometrias/texturas e física zerou mundos/corpos/colisores após liberação.
- Pacote, captura e relatório copiados para `artifacts/native/` (ignorado pelo Git). Ambiente de teste em contêiner; FPS e string de GPU desse relatório não representam desempenho ou hardware físico.
- `npm run check` aprovado. Smoke exigiu execução fora do sandbox para permitir portas locais do WebDriver; variável de sandbox do WebKit restrita a essa prova.
- Android e Windows permanecem sem aprovação física. E01-T06 continua aberta até prova do APK no S20 FE.

- Android concluído nesta retomada: APK `app-universal-debug.apk`, copiado como `artifacts/native/Kartube_0.1.0_arm64_debug.apk` (cerca de 129 MiB, inclui símbolos Rust debug). `aapt` confirmou `io.kartube.game.debug` 0.1.0 (1000), min SDK 24, target SDK 36 e somente arm64-v8a. `apksigner verify --verbose --print-certs` aprovou assinatura v2 Android Debug. Build precisou abrir WebSocket local fora do sandbox para integração CLI/Gradle. Avisos de APIs antigas de AGP/Kotlin/Java nas fontes geradas/dependências, sem erro final.
- SHA-256 do APK: `756aa77d9a43f8605e8e766bbec6590a3f58f3a54387e04c3c59beaafdc62f24`. Build e assinatura não comprovam inicialização offline, WebGL2 ou input no aparelho. Próxima ação: instalar no S20 FE e registrar roteiro físico.

- Regressão final: `npm run check:web` aprovado (Chromium/WebGL2/WASM, input móvel, câmera, descarte/reinício, perda de contexto e fallbacks). Preview executado fora do sandbox por exigir porta local.

### E01-T07 — Instrumentação e teste físico adiado — 2026-11-14

- Usuário adiou os testes de aparelho e autorizou seguir. T06 permanece aberta; iniciada a parte independente de T07.
- Relatório passa a incluir `buildId` (revisão/estado das fontes quando Git disponível e instante do build), `bootMs`, janela limitada de 600 intervalos de quadros (FPS médio, p50/p95/p99 e travadas >50 ms), estimativa opcional de heap JS e RAM total explicitamente não medida. Pausa/ocultação não contaminam os intervalos; cada boot reinicia a janela.
- Botão de tom diagnóstico curto por gesto do usuário; resultado distingue API concluída de som ouvido. Contexto encerrado após o tom e cancelado ao pausar, ocultar, reiniciar ou liberar; fallback sem Web Audio preserva o jogo. Não implementa música/motor/efeitos de gameplay.
- Roteiro de coleta ampliado na matriz: sessão por perfil, exportações periódicas, RAM total externa/PSS, versões reais de sistema/WebView e confirmação auditiva manual. Sem fechar critérios físicos ou medir desempenho de corrida completa.
- Verificações: tipos e testes aprovados, incluindo janela limitada/intervalos longos, ausência de heap, cancelamento de resume de áudio pendente; smoke Chromium aprovado com diagnóstico, término do tom sem contexto ativo e fallback sem Web Audio. Som nos alto-falantes não validado.

- Prioridade ajustada pelo usuário: focar no web; ports Android/desktop adiados. Pendências nativas não bloqueiam desenvolvimento da jogabilidade web da etapa 02, mas T06/T07 não são marcadas completas. Pacotes em `artifacts/native/` preservam a versão anterior aos novos diagnósticos.

- Relatório web final copiado para `artifacts/web/kartube-webgl-report.json` (ignorado pelo Git): build identificado com revisão dirty/horário, heap estimado disponível em Chromium, áudio concluído sem contexto ativo e confirmação auditiva null. Janela curta do smoke, sem benchmark sustentado ou validação física.
