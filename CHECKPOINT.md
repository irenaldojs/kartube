# Checkpoint para retomar o Kartube

**Data:** 2026-11-14 (America/Sao_Paulo). **Foco ativo: versão web; E02-T01/T02/T03 concluídas, próxima E02-T04 — posições por progresso. Android e desktop nativo adiados pelo usuário.**

## Estado atual

- Etapa 00 e E01-T01 a T05 concluídas. Não refazer tarefas anteriores.
- Mesmo cliente web em navegador e wrapper Tauri desktop/Android. Projeto Android já versionado: **não executar android:init novamente**.
- Linux: build release e pacote `.deb` amd64 concluídos. Smoke real Tauri/WebKitGTK aprovado sob Xvfb: runtime tauri, WebGL2/WASM, repouso físico, pilotagem, pausa, descarte e reinício com um canvas. Captura inspecionada.
- Android: **APK debug ARM64 gerado**, identificador `io.kartube.game.debug`, versão 0.1.0 (1000), min SDK 24, target SDK 36. `aapt` confirmou somente `arm64-v8a`; `apksigner verify` aprovou assinatura v2 com certificado Android Debug.
- Windows: workflow configurado, sem build/CI remoto executado. Nenhum instalador Windows gerado.
- **E01-T06 permanece aberta até a prova física documentada do APK no S20 FE.** Teste anterior no Chrome não valida Tauri Android. E01-T07 permanece aberta.

Verificações finais: `npm run check` e `npm run check:web` aprovados; `git diff --check` sem erros.

## Artefatos locais

Arquivos em `artifacts/native/`, ignorados pelo Git:

- `Kartube_0.1.0_arm64_debug.apk` — APK de desenvolvimento, cerca de 129 MiB (biblioteca Rust com símbolos de debug).
- `Kartube_0.1.0_amd64.deb` — pacote Linux (3.687.248 bytes).
- `kartube-native.png` e `kartube-native-report.json` — prova Linux. Execução em contêiner com renderização de teste; FPS/string GPU não representam desempenho/hardware físico.

SHA-256:

```text
756aa77d9a43f8605e8e766bbec6590a3f58f3a54387e04c3c59beaafdc62f24  Kartube_0.1.0_arm64_debug.apk
2b46e2661d8689ed5b2a0d3241139e38e01c959ab25c60a57c656f41577d3611  Kartube_0.1.0_amd64.deb
```

Binários e caches não são versionados. Diretórios de saída de builds (podem conter builds locais posteriores às cópias acima): `apps/native/src-tauri/target/release/bundle/deb/` e `apps/native/src-tauri/gen/android/app/build/outputs/apk/universal/debug/`.

## Prioridade atual — web

Usuário pediu em 2026-11-14 foco primeiro na versão web e deixou os ports Android/desktop para depois. Não iniciar novos builds nativos nem bloquear desenvolvimento web pelos critérios físicos pendentes. E01-T06 permanece aberta e adiada; T07 tem instrumentação web, sem aceite de RAM total/áudio físico/desempenho sustentado.

Implementados no web: identificação de build, tempo de boot da cena, janela de até 600 intervalos RAF visíveis/não pausados com FPS e percentis, estimativa opcional de heap JS (RAM total null) e tom diagnóstico por gesto com cancelamento/cleanup e fallback sem Web Audio. Ver roteiro atualizado na matriz. Smoke final em Chromium aprovado; relatório local em `artifacts/web/kartube-webgl-report.json`. A amostra curta desse smoke valida instrumentação, não desempenho sustentado. Esses diagnósticos novos ainda não estão nas cópias de APK/.deb em `artifacts/native/`, que preservam os pacotes anteriores.

Correção posterior: metadados de build usam `import.meta.env.VITE_BUILD_ID` com fallback `development-unversioned`, evitando ReferenceError em servidor sem a configuração. `npm run check:web:dev` verifica boot com e sem metadados.

E02-T01 implementada: Cart.fbx fornecido pelo usuário substitui a geometria provisória; carregamento, escala e descarte no web; drift por Shift/toque e controle aéreo limitado. Testes de física/controlador/modelo aprovados. E02-T02 implementada: Iniciar corrida, 1/3/5 voltas, largada atrás da linha e countdown 3–2–1; gates direcionais com bifurcação/reencontro da alternativa, HUD mínimo e término. Treino livre preservado. Pausa/ocultação congelam ticks. Desde E02-T03, reposicionar/queda/stuck recuperam no último gate válido sem reiniciar a prova. Três voltas automatizadas por inputs Rapier aprovadas nas duas rotas. Colisor arredondado (mesmas dimensões externas) corrige emenda do piso. Smokes web de produção/desenvolvimento aprovados; captura da largada em `artifacts/web/kartube-race.png`. E02-T03 implementada: pontos 1,8 m atrás do gate aceito, apoio/espaço checados em Rapier, orientação correta e velocidade/inputs zerados. Detector de queda/limites e stuck de 3 s sem avanço sob aceleração; repouso, freio e ar não disparam. Rebase autorizado preserva voltas/tempo/rota e evita crédito de teleporte; três voltas automatizadas com recuperação na alternativa aprovadas. Tipos/testes e smokes web de produção/desenvolvimento aprovados; captura de recuperação em `artifacts/web/kartube-recovery.png`. Próximo desenvolvimento: E02-T04 — posições por progresso ao longo do trajeto. Dependências de validação nativa ficam adiadas por decisão do usuário, sem marcar T06/T07 completas.


## Circuito ampliado e curvo — 2026-11-14

A pedido do usuário, circuito substituído por `greybox-v2-rounded`: linha central de aproximadamente 223 m, retas a ±30 m, quatro curvas de raio 10 m e largura de 8 m. Duas rampas e alternativa central preservadas; gates, spawn, âncoras de recuperação e câmera geral reposicionados. `TRACK_CENTERLINE`, `TRACK_MAIN_ROUTE` e `TRACK_ALTERNATIVE_ROUTE` expõem o traçado para a próxima tarefa de progresso/posições.

Superfície visual contínua, colisores segmentados sobrepostos e barreiras renderizadas em lote. Abertura externa da reta esquerda entre z=-10 e z=-4 (centro x=-34, z=-7), indicada por marcas amarelas, permite sair e cair; o terreno visual não tem colisor. Para testar: após a largada/entrada das rotas, virar à esquerda nessa abertura. Limite externo de recuperação ampliado para ±48 m. Teste com inputs reais atravessa a abertura e confirma queda e retorno; corrida de três voltas pelas duas rotas e todas as âncoras continuam validadas em Rapier. Playtest humano permanece pendente.

## Física vigente

Usuário definiu física fake arcade. Ver `docs/17-fisica-arcade.md`: yaw direto, teto rígido 12 m/s, drift visual com lado fixo e contraesterço, mini-turbo (1 s de carga, 0,65 s a até 15 m/s), três sondas de solo, gravidade -30 m/s² na pista e repulsão curta em guardrails. Aceleração linear com estado escalar separado da velocidade medida e clamp em 12 m/s; colisão do piso principal agora usa superfície contínua compartilhada com o render, evitando emendas entre placas. Piso sem atrito físico; modelo inclina/gira apenas visualmente. Solicitar feedback de dirigibilidade no playtest sem marcar sensação como aprovada por testes. Próxima tarefa estrutural continua E02-T04 web.

## Quando retomar os ports

Entregar/instalar o APK no S20 FE e seguir [matriz e roteiro manual](docs/matriz-plataformas.md): inicialização offline, WebGL2/WASM, pilotagem, acelerar primeiro e depois virar com outro dedo, soltura independente, Freio / Ré, câmera, pausa/retomada, troca de app e descarte/reinício. Registrar relatório com `runtime: tauri`, versão real do Android e Android System WebView. Não inferir versões pelo user agent reduzido.

```sh
adb install -r artifacts/native/Kartube_0.1.0_arm64_debug.apk
adb shell am start -n io.kartube.game.debug/io.kartube.game.MainActivity
```

Só concluir T06 com essa evidência; depois seguir T07 (FPS/RAM/áudio/WebView). Windows exige máquina Windows ou execução remota autorizada; não declarar compatibilidade apenas pela configuração do workflow.

## Reproduzir os builds

Executar sequencialmente, pois ambos usam `apps/web/dist`:

```sh
npm ci
npm run build:desktop -- --bundles deb --ci
LIBGL_ALWAYS_SOFTWARE=1 WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 xvfb-run -a npm run check:native
JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.13.0+2-ms ANDROID_HOME=/home/codespace/android-sdk NDK_HOME=/home/codespace/android-sdk/ndk/29.0.14206865 npm run build:android -- --ci
npm run check:web
```

Caminhos de JDK/SDK específicos deste ambiente. Smoke WebDriver, preview web e integração Tauri/Gradle abrem portas locais, exigindo permissão fora do sandbox deste ambiente. Variável de sandbox WebKit somente para a prova em contêiner. Não versionar SDK, chaves ou binários.

## Referências

- [Guia nativo](apps/native/README.md)
- [Etapa 01](docs/etapas/01-prototipo-3d.md)
- [Andamento](docs/ANDAMENTO.md)
- [Changelog](docs/CHANGELOG.md)

Corrida singleplayer com checkpoints/voltas já implementada; playtest humano de três voltas, posições, bots e resultados de oito pilotos ainda pendentes. Boosts e caixas são visuais. Áudio, gamepad, pipeline GLB final e assinatura de distribuição permanecem em seus marcos.

Validação do circuito curvo: tipos/testes aprovados, smokes web de produção e desenvolvimento aprovados; captura geral inspecionada em `artifacts/web/kartube-track-rounded.png`. O teste de bloqueio automático permanece em cenário físico controlado de parede reta; acelerar reto até a barreira curva não garante ficar preso.

Validação da revisão arcade/velocidade: tipos, testes e smokes web de produção/desenvolvimento aprovados. Teto comandado estável por 600 ticks com amostras ruidosas; reta física com variação <0,01 m/s e vertical <3 mm no teste. Sensação de gameplay aguarda feedback do usuário.

## Revisão mais recente — movimento e câmera

Rapier agora é só adaptador de raycast/shape cast e colisores: nenhum solver ou corpo dinâmico. `kart-motion.ts` integra posição/velocidade/gravidade próprias e aplica a resposta arcade; `driving.ts` continua independente. Diagnóstico `integration: custom-arcade`, `rapierSolver: false`.

Câmera revisada após relato de trepidação: `render-pose.ts` interpola kart e câmera entre ticks, sem alterar posições de corrida/controle. Câmera acompanha a translação interpolada diretamente e suaviza órbita/altura. Pausa/visibilidade/reset/recuperação sincronizam histórico. Testes de 144 Hz e RAF irregular aprovados; sensação final no aparelho do usuário não presumida.

Usuário aprovou a base interpolada e pediu câmera arcade: implementados órbita elástica, antecipação, FOV 45°→50,6° normal/56° turbo (teto 58° com voo/impacto), banking até ~2,4°, braço/altura de salto e pulso pequeno em batida real. Movimento reduzido por checkbox/pref. do sistema desliga esses efeitos. Base de translação interpolada foi preservada para não voltar a trepidar. Ver docs/17-fisica-arcade.md.

Parâmetros locais de camera.ts preservados: resposta orbital 10/6, velocidade de referência 15 m/s, braço/altura/antecipação ajustados. Sinais de posição/alvo corrigidos para a convenção do jogo (-Z à frente), mantendo a câmera de perseguição atrás do kart.
