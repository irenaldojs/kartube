# Kartube

Jogo de corrida de karts 3D cartoon em desenvolvimento. Plano completo: [Geral.md](Geral.md).

## Estado

Etapa 00 em andamento: monorepo e contratos TypeScript iniciais. Ainda não há jogo executável, servidor Rust ou cliente nativo.

## Desenvolvimento

Requer Node.js 24 e npm 11 (veja `.nvmrc`).

```sh
npm ci
npm run check
```

`npm test` executa testes de contratos; `npm run typecheck` verifica os pacotes em modo estrito. Os exports TypeScript são fontes: o futuro cliente Vite fará o bundle; Node 24 executa os testes com suporte nativo a TypeScript.

- `packages/game-core`: fronteiras de sessão, input, plataforma e invariantes de participantes.
- `packages/game-data`: contrato inicial de pista e checkpoints.
- `packages/protocol`: envelope v1, decoder de hello/input e gate de handshake/sequência.
- `fixtures`: casos canônicos destinados também aos testes Rust futuros.
- `docs`: plano, decisões e evidências de desenvolvimento.
- `assets`: estrutura reservada, sem conteúdo final.

Leia [índice](docs/INDICE.md), [andamento](docs/ANDAMENTO.md) e [etapa ativa](docs/etapas/00-fundamentos.md) antes de alterar o projeto. Próximos passos: validar contratos de pista e protocolo completos, executar spike Rust/WebSocket e definir dispositivos para os testes Android. Os ADRs permanecem propostos até suas provas de aceitação.
