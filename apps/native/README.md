# Kartube nativo

Wrapper Tauri 2 para Windows, Linux e Android. O jogo continua em `apps/web`: `frontendDist` aponta para `../../web/dist` e os hooks executam os scripts da raiz. Não há cópia de gameplay no Rust/Kotlin. O navegador continua disponível independentemente do empacotamento.

Execute os comandos abaixo na raiz do repositório.

**Validação local (2026-11-14):** `.deb` Linux gerado e smoke Tauri/WebKitGTK aprovado; APK debug ARM64 gerado e assinatura/identificador conferidos. Cópias locais em `artifacts/native/` na raiz. Teste físico no S20 FE e build Windows continuam pendentes; E01-T06 aberta. Retomada em [CHECKPOINT.md](../../CHECKPOINT.md).

## Desktop

Instale os [pré-requisitos Tauri](https://v2.tauri.app/start/prerequisites/) para seu sistema, Node conforme `.nvmrc` e Rust conforme `rust-toolchain.toml`. Windows requer ferramentas C++/WebView2; Linux requer WebKitGTK 4.1 e bibliotecas nativas.

```sh
npm ci
npm run dev:desktop
```

O comando inicia Vite e a janela nativa. Para empacotar os assets locais, sem depender de um servidor web em execução:

```sh
# Linux (Debian/Ubuntu)
npm run build:desktop -- --bundles deb

# Windows, em uma máquina Windows com os pré-requisitos
npm run build:desktop -- --bundles nsis
```

Saídas: `src-tauri/target/release/bundle/deb/*.deb` ou `src-tauri/target/release/bundle/nsis/*.exe`, dentro de `apps/native`. A CI `native.yml` compila cada instalador no sistema correspondente. A existência do workflow não significa que uma execução remota ou um playtest Windows já ocorreu. Assinatura de distribuição não está configurada.

## Android

Instale SDK/NDK e JDK 21 conforme os [pré-requisitos oficiais](https://v2.tauri.app/start/prerequisites/#android). Configure `JAVA_HOME`, `ANDROID_HOME` e `NDK_HOME` no seu sistema; o NDK usado nesta prova é `29.0.14206865`. O projeto Gradle versionado usa plataforma Android 36; o ambiente desta prova contém build tools 36 e 37 e mantém compatibilidade mínima declarada API 24; isso não substitui testes de aparelhos.

```sh
sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'build-tools;37.0.0' 'ndk;29.0.14206865'
rustup target add aarch64-linux-android
npm ci
npm run build:android -- --ci
```

O projeto Android já está versionado: não precisa executar `android:init` a cada checkout. Esse comando serve para regeneração deliberada; revisar diferenças de Gradle/SDK e manifesto antes de mantê-las.

O build padrão gera **APK debug ARM64** com os assets web embutidos. Ele usa assinatura de desenvolvimento e identificador `io.kartube.game.debug`; não é um lançamento de loja. Saída em `apps/native/src-tauri/gen/android/app/build/outputs/apk/`. A produção exigirá configuração de assinatura própria. Não versionar chaves/senhas.

```sh
adb devices -l
# Substituir pelo caminho exato do APK gerado
adb install -r caminho/do/kartube.apk
adb shell am start -n io.kartube.game.debug/io.kartube.game.MainActivity
```

Para desenvolvimento com dispositivo conectado: `npm run dev:android`. Para outras arquiteturas, instalar o target Rust correspondente e executar a CLI diretamente pelo workspace com `--target` apropriado; o script padrão destina-se ao S20 FE ARM64.

## Validação do mesmo cliente

`npm run check:web` continua verificando o build web. Em Linux com `tauri-driver` 2.1.0, `WebKitWebDriver` e Xvfb instalados:

```sh
cargo install tauri-driver --version 2.1.0 --locked
LIBGL_ALWAYS_SOFTWARE=1 WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 xvfb-run -a npm run check:native
```

A variável de sandbox é exclusiva do ambiente de teste em contêiner; não faz parte da configuração distribuída. O teste abre o binário release no WebKitGTK real, verifica `runtime: tauri`, WebGL2/WASM, queda, pilotagem, pausa, liberação e reinício. Captura e relatório: `/tmp/kartube-native.png` e `/tmp/kartube-native-report.json`. Renderização por software não mede GPU física.

No S20 FE, instalar o APK e repetir o [roteiro manual](../../docs/matriz-plataformas.md), incluindo toques sequenciais, Freio / Ré, pausa/retomada, troca de aplicativo e descarte/reinício. Registrar versão real do Android e Android System WebView, GPU, FPS, problemas e relatório com `runtime: tauri`. O teste prévio no Chrome não comprova este WebView. RAM total, áudio e desempenho sustentado seguem na E01-T07.

Fontes de implementação: [configuração Tauri](https://v2.tauri.app/reference/config/), [CLI/builds](https://v2.tauri.app/reference/cli/) e [WebDriver](https://v2.tauri.app/develop/tests/webdriver/).
