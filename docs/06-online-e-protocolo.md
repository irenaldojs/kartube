# Multiplayer Rust, rede e consistência

## Objetivos

- Cada sala tem **8 slots**. Se há 3 humanos prontos ao iniciar, o servidor completa **5 bots**.
- Permitir corrida avulsa ou campeonato de quatro corridas, sem alterar o motor visual do cliente.
- Servidor é referência para ocupação, início, pickups, uso de itens, checkpoints, chegadas e pontuação.
- Manter consumo de CPU/RAM/banda baixo: nenhum render, nenhuma sincronização de animação de esqueleto.

## Ciclo de sala

`CREATED → LOBBY → COUNTDOWN → RACING → RESULTS → [NEXT_RACE | PODIUM] → CLOSED`.

Durante o lobby: criar/entrar por código curto, escolher personagem, pronto/não pronto, latência e contador de saída. Ao iniciar, preencher slots vazios com bots. Em campeonato, roster (slot e piloto) permanece de uma prova à outra; desconectado pode ser substituído temporariamente por IA.

## Arquitetura de rede proposta

- WebSocket/WSS com handshake de versão e identificação efêmera da sessão.
- **Inputs** do piloto em mensagens compactas numeradas; snapshots dos karts/itens/eventos em cadência fixa a validar (ponto de partida: 10–20 atualizações/s, diferente do FPS de render).
- Cliente local prevê sua própria pilotagem; servidor acompanha dados suficientes para validação; remotos usam buffer de interpolação e ajustes suaves.
- Quantização/compressão e formato binário **somente após medir** tráfego; começar com contratos legíveis e migrar sem alterar semântica.
- Estado de corrida de alta frequência separado de eventos confiáveis de lobby, concessão de itens e placar.

## Autoridade realista (MVP)

**Servidor não é um simples retransmissor.** Armazena checkpoints, progresso, posição aproximada, velocidade plausível, slot/bot, inventário e relógio oficial; decide quando ações são válidas. A física de contato detalhada continua predominantemente local, o que pode gerar divergências. Para poderes que afetam outros jogadores, servidor emite evento validado de alvo/efeito.

### Limitação conhecida

Validação aproximada de movimento reduz custo, mas **não previne todo cheat ou desync**. Se o jogo exigir competição séria, avaliar simulação autoritativa mais completa no Rust (eventualmente Rapier) após benchmarks. Não anunciar o MVP como à prova de trapaça.

## Bots online

Bots **simulados logicamente no servidor** por waypoints/estado simplificado, com resultados e interações oficiais; clientes recebem movimento e animam. Nunca criar um bot diferente em cada cliente, pois isso provocaria resultados inconsistentes. Bots locais de singleplayer usam a mesma estratégia/definições de pista e podem empregar o mesmo controlador adaptado.

## Protocolos e estados (nomes propostos)

- Cliente → servidor: `hello`, `create_room`, `join_room`, `ready`, `input`, `use_item`, `heartbeat`, `resume`.
- Servidor → cliente: `welcome`, `room_state`, `race_countdown`, `snapshot`, `item_granted`, `item_used`, `checkpoint_ack`, `race_result`, `championship_result`, `error`.
- Envelope v1 implementado: `protocolVersion`, `eventId`, `seq`, `payload`; o discriminante `type` fica dentro de `payload`. Identificadores de sessão/sala e tick serão definidos ao ampliar as mensagens.
- Definir rate limit, payload máximo, intervalo de heartbeat, timeouts e idempotência antes de testar em rede pública.

## Tratamento de falhas

- Reconexão com `resumeToken` de uso restrito e expiração curta; token não deve aparecer em logs.
- Cliente sem conexão mantém controle visual temporário, mas não valida itens/chegada até reassociar.
- No timeout, bot assume slot; o servidor emite transição de controle. O usuário reconectado pode reassumir se corrida e janela permitirem.
- Caso o servidor caia, campeonato em memória é perdido no MVP; oferecer mensagem clara e decidir persistência apenas antes de operação real.

## Testes obrigatórios

1, 3 e 8 jogadores humanos com bots complementares; duas salas paralelas; latência 0/80/150/250 ms; perda 1/3/5%; reordenação artificial; queda/reconexão; duas tentativas de uso do mesmo item; checkpoints inválidos; término simultâneo e resultado igual para todos.

## Fronteira implementada — E00-T04 (parcial)

`decodeClientMessage` aceita texto JSON de até 4096 bytes UTF-8 e retorna uma união de sucesso/erro sem lançar por JSON inválido. O decoder de cliente implementa `hello` e `input`; mensagens de servidor têm codec próprio descrito abaixo. IDs/build usam 1–64 caracteres ASCII alfanuméricos, ponto, hífen ou sublinhado; `seq` é inteiro seguro não negativo. Campos desconhecidos são ignorados para evolução aditiva; tipos de mensagem desconhecidos são rejeitados. Versão divergente retorna `incompatible_version`. A versão 1 ainda é experimental e não foi publicada como contrato estável.

`ClientMessageGate` pertence a uma conexão: exige `hello` antes de input, aceita sequência estritamente crescente (lacunas permitidas), descarta repetidos/antigos e rejeita novo `hello`. Rejeições não alteram a sequência aceita. `eventId` identifica o evento para diagnóstico; deduplicação nesta conexão usa `seq`. Reconexões exigirão novo handshake e futura validação de token; esta classe não implementa resume nem autoridade de corrida. O transporte deve limitar frames antes de acumulá-los em memória. Rate limit, heartbeat, timeout e demais mensagens permanecem pendentes antes de exposição pública.

Fixtures portáveis em `fixtures/client-messages.json`; testes TS exercitam JSON inválido, versão, campos, UTF-8, handshake e replay. Os mesmos casos agora são executados em Rust. O spike local em `apps/server` exercita o handshake por WebSocket; ainda não há salas, autenticação ou corrida online.

## Spike local Rust/WebSocket — E00-T06 (parcial)

`apps/server` usa Tokio/Axum e serve diagnóstico em `/` e socket em `/ws`, somente em `127.0.0.1:3001`. Limites de frame e mensagem são 4096 bytes; excesso no transporte encerra a conexão. O decoder também limita tamanho quando chamado diretamente. Frames binários recebem `text_required`; ping/pong seguem o transporte.

A prova agora usa o envelope completo `{protocolVersion:1,eventId,seq,payload}` em todas as respostas. `welcome` contém connectionId, `input_ack` contém inputSeq; `error` contém code. Estes acknowledgements não são o contrato futuro de snapshots/resultados, não atribuem slots e não confirmam progresso de corrida. O gate é isolado por conexão; `input` apenas é validado, sem simulação.

`npm run check:spike` inicializa o servidor, verifica versão incompatível, handshake, replay, input válido/inválido via Node WebSocket e abre Chromium headless para enviar hello pela página e conferir welcome. Rust consome fixtures compartilhadas de mensagens e inputs. Ainda faltam Android físico, WebGL2/WASM, Tauri, outras mensagens e testes com latência/partidas.

## Contratos tipados de corrida — E00-T03/T04

`ServerMessage` define envelope com welcome (connectionId) e os eventos de corrida de game-core. Checkpoints, itens e resultados são exclusivamente mensagens da autoridade; o cliente continua enviando input (incluindo useItem), sem poder atribuir slot, alvo oficial ou pontos. `RaceSession` recebe eventos locais/remotos através da mesma interface. Ver campos e invariantes em `16-formato-dados.md` e ciclo de vida em `02-arquitetura-do-sistema.md`.

O endpoint de diagnóstico agora usa o codec de servidor para welcome/input_ack/error; snapshots e eventos de corrida têm codec, mas ainda não são produzidos por uma simulação. Lobby, campeonato, reconexão, rate limit e validação física permanecem entregas futuras.

## Codecs de servidor implementados — E00-T04

`decodeServerMessage` recebe string desconhecida e retorna sucesso tipado ou too_large/invalid_json/incompatible_version/invalid_message. `encodeServerMessage` valida antes de serializar, rejeitando números não finitos em campos conhecidos. Rust usa `server_codec::ServerMessage`, um wrapper privado criado por new(Value) ou decode(&str); somente mensagens validadas podem ser emitidas por encode. Novas mensagens de saída são serializadas via serde_json; a decodificação preserva o texto recebido para roundtrip sem expandir a representação de números desconhecidos.

Limite de cliente permanece 4096 bytes; servidor usa 16384 bytes UTF-8 para acomodar oito estados completos de kart. Todas as mensagens têm protocolVersion 1, eventId ASCII e seq inteiro seguro não negativo. seq de saída é independente do cliente, cresce por conexão e inclui respostas de erro; eventId do spike é identificado no contexto da conexão. O decoder verifica formato; RemoteRaceSession agora rejeita replay/lacunas antes de aplicar eventos.

Snapshots validam configuração, oito slots/pilotos únicos, campos obrigatórios e invariantes de fase/progresso. Resultados validam oito posições, pontos, tempos, DNF e desempate por slot; ao aplicar, ainda é obrigatório comparar com o snapshot final usando validateRaceResult. Eventos de checkpoint aceitos exigem reason null; rejeitados exigem código de motivo. targetSlotId é null ou slot 0–7. Campos anuláveis são obrigatórios: ausência não equivale a null. Mensagens connection são locais e rejeitadas na rede; tipos desconhecidos são rejeitados e campos extras são tolerados.

`fixtures/server-messages.json` contém 45 casos comuns a TS/Rust, cobrindo variantes válidas, roundtrip, mensagens malformadas e inconsistências. O smoke real lê welcome/input_ack/error emitidos por Rust pelo decoder TS e verifica sequência crescente. Chromium continua confirmando handshake pela página. O adapter remoto agora consome esses eventos em testes controlados; ainda não existe servidor de gameplay que os produza.

## Continuidade no adapter remoto — E00-T03

RemoteRaceSession envia hello uma vez ao abrir o transporte e exige welcome antes de snapshots/eventos. seq do servidor começa em 0 e cresce sem lacunas; mensagens com seq menor/igual são descartadas. Lacuna ou eventId já visto com seq nova encerra a sessão. O conjunto de IDs pertence a uma conexão/corrida e é liberado no dispose. Mensagens de erro do servidor são emitidas; antes do welcome, também encerram a sessão.

Snapshot inicial pode estar em corrida já iniciada, mas precisa combinar raceId, pista/versão/checksum, laps e tickRate com a configuração esperada. Eventos de checkpoint/item exigem snapshot racing, mesma corrida e serverTick não regressivo. Snapshot não pode preceder o último evento aceito. O servidor futuro deve emitir eventos em ordem autoritativa de tick e entregar snapshot final antes de race_result. Resultado é validado contra esse snapshot; repetição idêntica com nova identidade de envelope não é reemitida, e resultado conflitante encerra a sessão. O adapter apenas entrega eventos oficiais de itens/checkpoints: não simula inventário ou percurso.

submitInput exige sessão conectada, corrida ativa, slot local humano ainda não finalizado e InputFrame válido com seq crescente. Envelope do cliente tem sequência independente da sequência de input. ACK de input ainda não enviado é rejeitado. Não há fila de inputs antes da largada, heartbeat, timeout de handshake, retry, interpolação ou reconexão nesta prova. Slot/config são pré-fornecidos: welcome do spike identifica conexão e não atribui participação de corrida.

O smoke real verifica RemoteRaceSession → WebSocket → Rust → welcome; snapshots/resultados/itens ainda usam transporte controlado nos testes.
