# Kartube

Jogo de corrida de karts 3D cartoon em desenvolvimento. Plano completo: [Geral.md](Geral.md).

**Para retomar o desenvolvimento:** [checkpoint atual e próximos comandos](CHECKPOINT.md).

## Estado

Etapa 00 concluída; etapa 01 em andamento, com boot 3D e seleção de qualidade gráfica. Há provas locais de WebSocket com Rust e de renderização WebGL2 com física WASM. O protótipo dirigível tem pacote Linux `.deb` e smoke Tauri/WebKitGTK aprovados, usando o mesmo build web. Android está adiado a pedido do usuário; Windows ainda requer build e validação. Corrida com regras e salas online ainda não foram implementadas.

## Desenvolvimento

Requer Node.js 24 e npm 11 (veja `.nvmrc`).

```sh
npm ci
npm run check
```

`npm test` executa testes de contratos; `npm run typecheck` verifica os pacotes em modo estrito. Os exports TypeScript são fontes: o cliente Vite faz o bundle; Node 24 executa os testes com suporte nativo a TypeScript.

- `packages/game-core`: contratos de sessão/eventos, input e plataforma; LocalRaceSession com autoridade injetável; validação de snapshots, transições e resultados.
- `packages/game-data`: contrato, parser e verificação SHA-256 canônica de pista, checkpoints e spawns.
- `packages/network-client`: sessão remota, validação contextual de eventos e transporte WebSocket.
- `packages/protocol`: envelope v1, codecs de cliente/servidor e gate de handshake/sequência.
- `fixtures`: casos canônicos destinados também aos testes Rust futuros.
- `docs`: plano, decisões e evidências de desenvolvimento.
- `assets`: estrutura reservada, sem conteúdo final.

Leia [índice](docs/INDICE.md), [andamento](docs/ANDAMENTO.md) e [etapa ativa](docs/etapas/01-prototipo-3d.md) antes de alterar o projeto. Prova básica WebGL2/WASM aprovada pelo usuário no S20 FE (Adreno 650). Pista cinza fechada implementada (E01-T02). Câmera em terceira pessoa e sombra de contato implementadas (E01-T03). Pilotagem básica com teclado/toque e colisões implementada (E01-T04). Ciclo de assets e descarte verificado (E01-T05). E01-T06: pacote Linux e smoke nativo aprovados; Android adiado e Windows pendente. Escopo e regras iniciais aprovados; ampliar a matriz real de aparelhos permanece no plano. Pistas e checksum já têm fixtures compartilhadas TS/Rust. O spike local Rust/WebSocket passou em Chromium. Os ADRs permanecem propostos até suas provas de aceitação.

## Prova WebSocket (Etapa 00)

Instale Rust via rustup; a toolchain está fixada em `rust-toolchain.toml`.

```sh
cargo run --locked --manifest-path apps/server/Cargo.toml
```

Abra http://127.0.0.1:3001 e clique em **Conectar e enviar hello**. O retorno esperado contém `welcome`. O serviço escuta apenas em localhost. A página é um diagnóstico do transporte, sem renderização ou regras de corrida.

Para executar as verificações completas do spike, com a porta 3001 livre:

```sh
npm ci
npx playwright install --with-deps chromium
cargo fmt --manifest-path apps/server/Cargo.toml --check
cargo clippy --locked --manifest-path apps/server/Cargo.toml -- -D warnings
cargo test --locked --manifest-path apps/server/Cargo.toml
npm run check:spike
```

O último comando inicia/encerra o servidor e testa WebSocket em Node e Chromium headless. O teste Node valida as respostas Rust com o decoder TypeScript e confirma handshake pelo adapter remoto. Linux pode precisar de privilégios de administrador para instalar as bibliotecas do Chromium. A CI inclui esses comandos; testes Android/Tauri permanecem pendentes.

A sessão local é uma referência do contrato offline: exige uma autoridade injetada que forneça snapshots/eventos por tick. Os testes usam uma autoridade roteirizada. Não há autoridade de gameplay, física ou bots implementados ainda.

## Prova WebGL2/WASM (Etapa 00)

```sh
npm ci
npm run dev:web -- --host 0.0.0.0
```

Abra a URL indicada pelo Vite. O seletor de cena abre a pista cinza com câmera em terceira pessoa (visão geral selecionável) e permite voltar ao teste de queda sobre a plataforma, com Three.js/WebGL2 e Rapier/WASM a 60 passos por segundo. A pista permite pilotagem básica: clique na cena e use WASD/setas, Espaço para frear e R para reposicionar; no celular, segure os botões sobre a cena. Freio / Ré é um único botão: freia o movimento para a frente e, ao parar, engata ré. Boosts e caixas são visuais; voltas, itens e resultados ainda não estão implementados. O laboratório de queda continua sendo uma cena de diagnóstico. Os controles permitem pausar, avançar 120 passos, trocar o perfil gráfico, liberar recursos, reiniciar e exportar o relatório JSON.

```sh
npx playwright install --with-deps chromium
npm run check:web
```

Para usar o Chrome já instalado, informe o caminho do executável. O teste usa um perfil temporário e registra a versão do navegador no relatório:

```sh
KARTUBE_CHROME_EXECUTABLE=/caminho/do/chrome npm run check:web
```

O teste gera o build e verifica renderização, colisão, pausa, descarte/reinício, perda de contexto, layout móvel e mensagens para ausência de WebGL2/WASM. Salva captura e relatório em `/tmp/kartube-webgl.png` e `/tmp/kartube-webgl-report.json`. Chromium headless usa SwiftShader: esses resultados não medem desempenho de GPU física nem comprovam compatibilidade Android/Tauri. Para Android real, execute o servidor em uma rede acessível ao aparelho, abra a cena e exporte o relatório; a prova básica já foi aprovada pelo usuário no S20 FE; a matriz completa e o aceite de Tauri continuam pendentes.

## Aplicativos nativos (desktop e Android)

O navegador continua disponível com `npm run dev:web`. O wrapper em `apps/native` empacota esse mesmo cliente, sem duplicar gameplay.

```sh
npm run dev:desktop
# Linux
npm run build:desktop -- --bundles deb
# Windows (executar em Windows)
npm run build:desktop -- --bundles nsis
# Android ARM64 de desenvolvimento, com SDK/NDK/JDK configurados
npm run build:android -- --ci
```

Pré-requisitos, caminhos dos pacotes, instalação no aparelho e teste do WebView real: [guia nativo](apps/native/README.md). A CI de builds nativos inclui Linux, Windows e APK Android; resultados locais e pendências de validação estão no [andamento](docs/ANDAMENTO.md). Compilar o APK não substitui o teste no S20 FE.
