# Kartube

Jogo de corrida de karts 3D cartoon em desenvolvimento. Plano completo: [Geral.md](Geral.md).

## Estado

Etapa 00 em andamento: monorepo e contratos TypeScript iniciais. Há uma prova local de WebSocket com Rust. Ainda não há jogo executável, salas online ou cliente nativo.

## Desenvolvimento

Requer Node.js 24 e npm 11 (veja `.nvmrc`).

```sh
npm ci
npm run check
```

`npm test` executa testes de contratos; `npm run typecheck` verifica os pacotes em modo estrito. Os exports TypeScript são fontes: o futuro cliente Vite fará o bundle; Node 24 executa os testes com suporte nativo a TypeScript.

- `packages/game-core`: contratos de sessão/eventos, input e plataforma; validação de snapshots, transições e resultados.
- `packages/game-data`: contrato, parser e verificação SHA-256 canônica de pista, checkpoints e spawns.
- `packages/network-client`: sessão remota, validação contextual de eventos e transporte WebSocket.
- `packages/protocol`: envelope v1, codecs de cliente/servidor e gate de handshake/sequência.
- `fixtures`: casos canônicos destinados também aos testes Rust futuros.
- `docs`: plano, decisões e evidências de desenvolvimento.
- `assets`: estrutura reservada, sem conteúdo final.

Leia [índice](docs/INDICE.md), [andamento](docs/ANDAMENTO.md) e [etapa ativa](docs/etapas/00-fundamentos.md) antes de alterar o projeto. Próximos passos: completar contratos de sessão/protocolo e definir dispositivos para os testes Android. Pistas e checksum já têm fixtures compartilhadas TS/Rust. O spike local Rust/WebSocket passou em Chromium. Os ADRs permanecem propostos até suas provas de aceitação.

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
