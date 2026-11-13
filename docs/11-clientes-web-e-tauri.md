# Cliente Web, empacotamento Tauri e Android

## Estratégia de entrega

**O jogo existe uma única vez em TS.** `apps/web` produz arquivos estáticos e assets; `apps/native` referencia o mesmo build dentro de Tauri 2. Não reimplementar corrida, renderização ou HUD no wrapper nativo.

## Navegador

- Servir HTML/JS/CSS/assets por HTTPS com cache por versão e manifestos.
- Requerer WebGL2 para renderização proposta; identificar suporte no boot e mostrar erro útil se indisponível.
- Considerar PWA/instalação web como melhoria futura; funcionamento offline do singleplayer requer cache planeado separadamente.
- Usar WSS para multiplayer e manter gamepad/touch como caminhos de primeira classe.

## Desktop com Tauri

- Empacotamento para Windows e Linux prioritariamente, com análise de macOS conforme capacidade de build.
- WebView depende do sistema; verificar suporte a WebGL2, gamepad, áudio e fullscreen no ambiente alvo.
- APIs nativas somente quando necessárias (armazenamento local, integração de controles, atualização).
- Isolar comandos Tauri no `PlatformAdapter`; cliente web não pode importar APIs nativas diretamente.

## Android com Tauri

- Preparar projeto e cadeia de build Android segundo documentação Tauri 2.
- Testar no **dispositivo Android físico** desde a primeira prova de conceito: WebView do sistema, RAM, GPU, termo/aceleração de FPS, áudio, input, mudança de app e retomada.
- Orientação paisagem preferencial; safe areas, botões touch grandes, escalonamento de resolução e perfil gráfico reduzido.
- Se gamepad via WebView falhar em certos aparelhos, avaliar ponte nativa apenas após reproduzir e documentar a falha.
- Não assumir que empacotar melhora FPS: Tauri muda distribuição/integração, enquanto a renderização segue dependente de WebView e GPU.

## Testes cruzados indispensáveis

Navegador desktop, Tauri desktop e Tauri Android devem abrir a mesma pista, reproduzir animações, aceitar inputs, entrar em sala, carregar sons, concluir corrida e mostrar pódio. Manter matriz dos modelos e versões de SO/WebView testados.

Referências: https://v2.tauri.app/start/prerequisites/ · https://v2.tauri.app/distribute/google-play/ · https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/reference/webview-versions.md

## Wrapper implementado — E01-T06

`apps/native` usa Tauri 2, com crate Rust de entrada e projeto Gradle Android versionado. `frontendDist` referencia `apps/web/dist`; os hooks de desenvolvimento/build executam scripts da raiz. O código web não depende de APIs Tauri: apenas o relatório distingue runtime browser/tauri pela presença do runtime nativo.

Scripts na raiz: `dev:desktop`, `build:desktop`, `dev:android`, `build:android` e `check:native`. O build desktop gera pacotes do sistema host; workflow dedicado compila `.deb` em Linux e instalador NSIS em Windows. O Android padrão é APK debug ARM64 (identificador `io.kartube.game.debug`), com o cliente embutido. Não há assinatura de produção/loja configurada.

Teste Linux por tauri-driver/WebKitWebDriver verifica o binário com assets embutidos e permite inspecionar o relatório e captura do WebViewGTK real. A CI está configurada, sem pressupor execução remota. O roteiro de instalação e validação física está em [apps/native/README.md](../apps/native/README.md); o resultado da prova fica no registro da etapa 01.
