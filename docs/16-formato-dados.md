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

As fontes em `packages/` definem `RaceSession`, `InputAdapter`, `PlatformAdapter`, `TrackDefinition` e envelope v1. Slots são inteiros 0–7; IDs de pilotos são únicos. Checkpoints usam volumes AABB em metros e arestas `next` para rotas alternativas. Passar pela chegada só contará volta após validação do percurso pela autoridade da sessão (validador ainda pendente). `parseTrackDefinition` valida schema, coordenadas, grafo conectado com retorno obrigatório à chegada e oito slots únicos (regras em `05-pistas-e-circuitos.md`). `checksum` identifica os dados de gameplay por SHA-256 canônico; o parser estrutural verifica o formato e `parseVerifiedTrackDefinition` verifica o conteúdo. Rust oferece `parse_track` e `parse_verified_track` equivalentes.

Inputs usam sequência e tick inteiros seguros não negativos, direção em [-1,1], acelerador/freio em [0,1] e botões booleanos. Fixtures em `fixtures/input-frames.json` já são consumidas pelos testes TS e Rust. O decoder agora verifica envelope, versão, limite de 4096 bytes e payload de hello/input; um gate por conexão valida handshake e sequência. Demais mensagens, reconexão e negociação completa ainda não implementadas. Nenhum JSON de rede deve ser convertido em tipo apenas com cast.

A sessão local será autoridade offline; no online apenas o servidor poderá confirmar checkpoints, itens e resultados. Os contratos atuais não são um protocolo completo de corrida e permanecem sujeitos aos spikes da etapa 00.

## Checksum canônico de pistas — schema 1

Decisão: [ADR-0004](decisoes/ADR-0004-checksum-pistas.md). `checksum` contém exatamente 64 dígitos hexadecimais minúsculos de SHA-256. Não faz parte dos bytes calculados. `parseTrackDefinition` valida estrutura; `parseVerifiedTrackDefinition` (async) deve ser usado ao carregar pistas com checksum. Em Rust, `track::parse_verified_track` valida estrutura e checksum. As APIs retornam o objeto validado para evitar usar o JSON original. O spike WebSocket ainda não carrega pistas.

Formato binário, sem padding, em ordem:

1. Cabeçalho ASCII literal `kartube-track-v1` seguido de LF (17 bytes ao todo).
2. `id` como string; `version` como u64; `startCheckpointId` como string.
3. Quantidade de checkpoints como u32. Checkpoints em ordem ASCII crescente de `id`: string `id`, vetor `center`, vetor `halfExtents`, quantidade de sucessores u32 e strings `next` em ordem ASCII crescente.
4. Quantidade de spawns como u32. Spawns em ordem crescente de `slotId`: slotId u32, vetor `position` e número `yaw`.

Todos os inteiros são unsigned little-endian. Strings usam comprimento u32 em bytes seguido de ASCII, sem terminador; o validador restringe os IDs a ASCII. Vetores são três números x/y/z. Números são IEEE-754 binary64 little-endian, finitos, com `-0` normalizado para `+0`; versão está limitada ao maior inteiro seguro JS. Schema 1 é identificado no cabeçalho. Nenhum outro campo é codificado. A ordem de chaves JSON, checkpoints, sucessores e spawns não altera o hash. Alterar dados conhecidos, mesmo apenas versão ou ID de pista, altera o hash.

TypeScript usa Web Crypto disponível em contexto seguro (HTTPS ou localhost) e Node 24. Rust usa sha2 e parsing decimal binary64 com `serde_json/float_roundtrip`. Fixtures compartilhadas: `track-definition.json`, bytes esperados em `track-canonical.hex` e mutações em `track-cases.json`. Hashes e bytes esperados foram gerados independentemente via Python struct/hashlib; os testes não regeneram o esperado usando a implementação testada. Campos de gameplay adicionais exigem nova decisão de schema/canonicalização antes de uso.

## Sessão e corrida — contratos tipados experimentais

RaceSnapshot contém config `{raceId, track:{id,version,checksum}, laps, tickRate}`, serverTick, phase, startTick e oito KartState. Cada kart preserva slotId/driverId, controller humano/bot, completedLaps (0 até laps), checkpointId ou null, position em metros, yaw em radianos, speed assinado em m/s e finishTick ou null. finishTick exige todas as voltas completas e pertence ao intervalo entre startTick e serverTick. Antes da largada não há progresso.

Waiting não tem startTick; countdown tem início futuro; racing/finished têm início não posterior ao snapshot. Aborted pode ocorrer antes ou depois da largada. validateRaceSnapshot verifica invariantes de dados já tipados; validateRaceTransition verifica continuidade. São validadores de domínio, não decoders completos de JSON desconhecido. Eles não comprovam posição física plausível nem passagem por checkpoints.

RaceResult identifica raceId/resultId, startTick/endTick e oito posições únicas e ordenadas. O validador exige snapshot final da mesma corrida, relógio e finishTick correspondentes, pontuação por posição, finalistas antes de DNF e tempos crescentes. Empate de finishTick usa slotId crescente. Por enquanto a tabela proposta de pontos aplica-se às oito posições, incluindo DNF. A política para disparar timeout e ordenar múltiplos DNF continua pendente de validação na etapa 02; o contrato recebe sua ordem da autoridade. Resultado não existe para aborted.

RaceEvent discrimina snapshot, checkpoint_ack (aceito/motivo), item_granted (instância/tipo), item_used (instância/alvo opcional), race_result, connection e error. Instâncias de itens são identificadas pela autoridade; não há catálogo de efeitos implementado. `ServerMessage` em protocol envelopa welcome e eventos de corrida, excluindo connection. O codec TS e o wrapper Rust agora validam essas mensagens em runtime. A página/spike usa welcome/input_ack/error com envelope completo, mas não produz corrida. Receber mensagens via decodeServerMessage, sem cast direto; antes de aplicar resultado, conferir com o snapshot final da sessão.

### Validação de resultado sem contexto

`validateRaceResultData` extrai as invariantes de identidade, relógio, oito posições/pontos, finishTick, DNF e ordenação, permitindo validação pelo codec antes de uma sessão existir. `validateRaceResult` reutiliza essa checagem e também exige snapshot finished da mesma corrida e finishTick correspondentes. O decoder não comprova contexto de sessão: RemoteRaceSession verifica configuração esperada, continuidade de sequência/ticks e idempotência do resultado antes de entregar os eventos. Eventos de checkpoint/item têm IDs ASCII e serverTick não negativo. Código de motivo de checkpoint rejeitado é identificador; aceitação usa reason null.
