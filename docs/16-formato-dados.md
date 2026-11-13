# Modelos de dados e contratos lógicos (implementação parcial na Etapa 00)

## Entidades do domínio

| Entidade | Campos essenciais | Dono do dado |
|---|---|---|
| `Driver` | id, displayName, avatar/skinId, kartId, botProfile? | Conteúdo/roster |
| `KartSpec` | id, physicsProfileId, modelAssetId, cosmetics | Catálogo |
| `Track` | id, version, checksum, checkpointGraph, spawnSlots, boosts, itemBoxes, botPath | Manifesto de pista |
| `RaceSession` | id, trackId, laps, state, serverTick, roster[8] | Server/LocalSession |
| `RaceParticipant` | slotId, driverId, controllerType, lap, checkpointProgress, finishedAt?, points | Server/LocalSession |
| `PowerUpInstance` | instanceId, type, ownerSlot?, state, expiration | Server/LocalSession |
| `Championship` | id, raceIndex, trackIds[4], participants[8], standings | Server/LocalSession |
| `RaceResult` | raceId, positions[8], finishTimes, points, reason | Server/LocalSession |

## Invariantes obrigatórias

1. Uma corrida tem **exatamente oito `slotId` únicos**, independentemente de bot ou humano.
2. Um mesmo `slotId` permanece no campeonato; controlador pode alternar humano↔bot.
3. `Track.version` e `checksum` precisam combinar entre cliente e servidor para validar checkpoints.
4. `RaceResult` é emitido uma vez, com ordenação determinística, sem aceitar pontuação calculada pelo cliente.
5. Eventos possuem identidade e sequência que permitam ignorar duplicatas.
6. O campeonato contém quatro IDs de pista válidos e quatro resultados antes do pódio.

## Contratos de rede — esboço

- `hello`: versão de protocolo, build do jogo, capacidades do cliente.
- `create_room` / `join_room`: preferências e identificadores efêmeros.
- `room_state`: sala, roster, status ready, mapa, índice do campeonato.
- `input`: `seq`, `clientTick`, `steer`, `throttle`, `brake`, `buttons`.
- `snapshot`: `serverTick`, lista compacta dos 8 karts, eventos desde seq anterior.
- `checkpoint_ack`: slot, checkpointId, lap, serverTick, accepted/reason.
- `race_result`: classificação, tempos e pontos da corrida.
- `championship_result`: quatro resultados, total e desempate aplicados.

## Versionamento e migração

- `protocolVersion`: interrompe conexão incompatível com erro orientado a atualização.
- `schemaVersion` em pista e asset manifest; migrar arquivos antigos por conversor documentado, não por suposições ocultas.
- IDs estáveis não dependem de nome de arquivo de arte nem de apelido do jogador.
- Criar fixtures de teste em Rust e TS a partir de casos canônicos, evitando divergências de pontuação/validação.

## Armazenamento

Inicialmente tudo em memória durante uma sessão. Não criar banco só por precaução. Gravar configurações do jogador localmente quando necessário; banco/histórico online ficará para evolução deliberada.

## Contratos iniciais implementados

As fontes em `packages/` definem `RaceSession`, `InputAdapter`, `PlatformAdapter`, `TrackDefinition` e envelope v1. Slots são inteiros 0–7; IDs de pilotos são únicos. Checkpoints usam volumes AABB em metros e arestas `next` para rotas alternativas. Passar pela chegada só contará volta após validação do percurso pela autoridade da sessão (validador ainda pendente). `parseTrackDefinition` valida schema, coordenadas, grafo conectado com retorno obrigatório à chegada e oito slots únicos (regras em `05-pistas-e-circuitos.md`). `checksum` deve identificar os dados de gameplay; apenas presença/formato são validados; algoritmo/canonicalização ainda pendentes antes de uso online.

Inputs usam sequência e tick inteiros seguros não negativos, direção em [-1,1], acelerador/freio em [0,1] e botões booleanos. Fixtures em `fixtures/input-frames.json` já são consumidas pelos testes TS e Rust. O decoder agora verifica envelope, versão, limite de 4096 bytes e payload de hello/input; um gate por conexão valida handshake e sequência. Demais mensagens, reconexão e negociação completa ainda não implementadas. Nenhum JSON de rede deve ser convertido em tipo apenas com cast.

A sessão local será autoridade offline; no online apenas o servidor poderá confirmar checkpoints, itens e resultados. Os contratos atuais não são um protocolo completo de corrida e permanecem sujeitos aos spikes da etapa 00.
