# Checkpoint para retomar o Kartube

**Data:** 2026-11-14 (America/Sao_Paulo). **Foco ativo: versão web; E01-T07 — diagnósticos web. Android e desktop nativo adiados pelo usuário.**

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

Próximo desenvolvimento: jogabilidade web da etapa 02, começando pelo controlador arcade (E02-T01); aproveitar aceleração/freio/ré já existentes, acrescentar drift e controle aéreo conforme o roteiro. Dependências de validação nativa ficam adiadas por decisão do usuário, sem marcar T06/T07 completas.

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

Sem corrida com checkpoints/voltas/resultados ainda. Boosts e caixas são visuais. Áudio, gamepad, GLB final e assinatura de distribuição permanecem em seus marcos.
