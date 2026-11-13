# Checkpoint para retomar o Kartube

**Data:** 2026-11-13 (America/Sao_Paulo). Checkpoint solicitado pelo usuário para continuar em outra sessão. **Etapa ativa: 01; tarefa atual: E01-T06 — empacotamento e prova Tauri.**

## Onde paramos

- Etapa 00 concluída, com escopo/regras aprovados: oito pilotos, quatro pistas, três voltas padrão, pontos 15/12/10/8/6/4/2/1 e desempates documentados.
- E01-T01 a T05 concluídas: boot/perfis, pista cinza fechada, câmera em terceira pessoa, sombra de contato, kart dirigível, teclado/toque, Freio / Ré único, recursos compartilhados e descarte verificado.
- Usuário quer **navegador + apps nativos desktop (Windows/Linux) + Android**, todos com o mesmo jogo web. Não substituir a opção de navegador.
- E01-T06 em andamento: wrapper Tauri em `apps/native`, frontendDist em `apps/web/dist`, projeto Gradle Android versionado, scripts na raiz, ícone original, guia nativo e CI para Linux `.deb`, Windows NSIS e APK debug ARM64.
- Relatório identifica `runtime: browser` ou `runtime: tauri`. Entrada de toque corrigida por identificador de dedo; Freio / Ré tem prioridade sobre acelerar.

Commits anteriores relevantes:

| Commit | Entrega |
|---|---|
| `1fadf59` | Prova WebGL2/WASM e fundamentos |
| `c9c7cc5` | Pista cinza |
| `5dbd272` | Câmera e sombra |
| `a84337f` | Pilotagem |
| `85ed663` | Correção multitouch |
| `9f7513c` | Ciclo de assets e Freio / Ré |

O commit deste checkpoint contém o wrapper nativo ainda em validação; consulte `git log -1`. Não refazer as tarefas anteriores.

## Evidências desta sessão

- `npm run check`: **63 testes e tipos aprovados** com a estrutura nativa adicionada.
- `cargo fmt --manifest-path apps/native/src-tauri/Cargo.toml --check`: aprovado.
- `node --check scripts/native-smoke.mjs`: aprovado (sintaxe; não equivale a smoke executado).
- Android: Rust ARM64 compilou em 9m42s. Biblioteca em `apps/native/src-tauri/target/aarch64-linux-android/debug/libkartube_native_lib.so` (artefato local ignorado pelo Git).
- Gradle iniciou download de 9.6.1. Build interrompido a pedido do usuário antes de gerar APK.
- Linux: compilação das dependências Rust/WebKitGTK avançou, mas foi interrompida antes do binário/instalador final. Encerramento intencional com código 130; nenhum erro de compilação observado até esse ponto.
- **Não há APK ou instalador final gerado. Smoke nativo ainda não executado. CI Windows/Linux/Android configurada, porém não executada remotamente.**
- Nenhum aparelho conectado por adb. Prova anterior no S20 FE foi no Chrome; não validar Tauri Android com essa evidência. Usuário confirmou a correção dos toques na versão web.

Builds foram encerrados para este checkpoint. Os caches locais podem acelerar a retomada, mas não são versionados. Logs em `/tmp` são auxiliares e podem desaparecer:

- `/tmp/kartube-desktop-build.log`
- `/tmp/kartube-android-build.log`
- `/tmp/kartube-native-contracts.log`

## Próximas ações, em ordem

1. Ler este arquivo, conferir `git status` e continuar a E01-T06. **Não executar android:init de novo:** o projeto Android já está versionado, com SDK/plataforma ajustados.
2. Concluir build Linux e rodar o smoke no WebView real. Comandos na raiz:

```sh
npm ci
npm run build:desktop -- --bundles deb --ci
LIBGL_ALWAYS_SOFTWARE=1 WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 xvfb-run -a npm run check:native
```

O smoke requer tauri-driver 2.1.0 e WebKitWebDriver. Ambos, Xvfb e as bibliotecas WebKitGTK foram instalados nesta sessão. A variável de sandbox é para o teste em contêiner, não para o produto distribuído. Inspecionar `/tmp/kartube-native.png` e `/tmp/kartube-native-report.json`; corrigir qualquer falha antes de declarar aprovação.

3. Concluir APK ARM64. Neste ambiente Linux, os caminhos instalados são:

```sh
export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.13.0+2-ms
export ANDROID_HOME=/home/codespace/android-sdk
export NDK_HOME="$ANDROID_HOME/ndk/29.0.14206865"
npm run build:android -- --ci
```

SDK plataforma 36; build tools 36.0.0 e 37.0.0; NDK 29.0.14206865; target Rust `aarch64-linux-android`. Em outro ambiente, configurar os caminhos locais conforme o guia. Rust está fixado em `rust-toolchain.toml`. O JDK padrão do host é 25; usar o JDK 21 acima para esta prova.

4. Verificar pacotes e registrar evidências. Linux: `apps/native/src-tauri/target/release/bundle/deb/*.deb`. Android: `apps/native/src-tauri/gen/android/app/build/outputs/apk/**/*.apk`. Se disponibilizar cópias locais, usar `artifacts/` (ignorado pelo Git); não commitar binários/SDK/chaves. Validar arquitetura, assinatura debug e identificador do APK.
5. Windows: compilar **em Windows** com `npm run build:desktop -- --bundles nsis --ci` ou executar o workflow `.github/workflows/native.yml` quando houver autorização/contexto para enviar ao remoto. Não declarar instalador Windows gerado a partir apenas da configuração de CI.
6. Rodar `npm run check:web` após os builds, atualizar evidências e commitar as correções. Executar builds sequencialmente: ambos usam `apps/web/dist`.
7. Entregar o APK ao usuário para teste físico no S20 FE: inicialização offline, WebGL2/WASM, pilotagem/multitouch sequencial, Freio / Ré, câmera, pausa/retomada, troca de aplicativo, descarte/reinício e relatório com `runtime: tauri`. Registrar SO e Android System WebView reais; não inferir versão pelo user agent reduzido.
8. **Só concluir E01-T06 com a prova física documentada.** Depois seguir E01-T07 (FPS/RAM/áudio/WebView). Atualizar andamento, changelog e ADRs com evidência, sem aceitar critérios ainda não testados.

## Referências de trabalho

- [Guia nativo: build e instalação](apps/native/README.md)
- [Etapa 01 e critérios](docs/etapas/01-prototipo-3d.md)
- [Andamento](docs/ANDAMENTO.md)
- [Matriz e roteiro manual](docs/matriz-plataformas.md)
- [Estratégia web/desktop/Android](docs/11-clientes-web-e-tauri.md)
- [Changelog](docs/CHANGELOG.md)

Não há corrida com checkpoints/voltas/resultados implementada ainda. Boosts e caixas da pista são visuais. Áudio, gamepad, GLB final e assinatura de distribuição permanecem em seus marcos; não foram aprovados por este checkpoint.
