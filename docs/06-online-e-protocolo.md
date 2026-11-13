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

`decodeClientMessage` aceita texto JSON de até 4096 bytes UTF-8 e retorna uma união de sucesso/erro sem lançar por JSON inválido. Somente `hello` e `input` estão implementados. IDs/build usam 1–64 caracteres ASCII alfanuméricos, ponto, hífen ou sublinhado; `seq` é inteiro seguro não negativo. Campos desconhecidos são ignorados para evolução aditiva; tipos de mensagem desconhecidos são rejeitados. Versão divergente retorna `incompatible_version`. A versão 1 ainda é experimental e não foi publicada como contrato estável.

`ClientMessageGate` pertence a uma conexão: exige `hello` antes de input, aceita sequência estritamente crescente (lacunas permitidas), descarta repetidos/antigos e rejeita novo `hello`. Rejeições não alteram a sequência aceita. `eventId` identifica o evento para diagnóstico; deduplicação nesta conexão usa `seq`. Reconexões exigirão novo handshake e futura validação de token; esta classe não implementa resume nem autoridade de corrida. O transporte deve limitar frames antes de acumulá-los em memória. Rate limit, heartbeat, timeout e demais mensagens permanecem pendentes antes de exposição pública.

Fixtures portáveis em `fixtures/client-messages.json`; testes TS exercitam JSON inválido, versão, campos, UTF-8, handshake e replay. Os mesmos casos agora são executados em Rust. O spike local em `apps/server` exercita o handshake por WebSocket; ainda não há salas, autenticação ou corrida online.

## Spike local Rust/WebSocket — E00-T06 (parcial)

`apps/server` usa Tokio/Axum e serve diagnóstico em `/` e socket em `/ws`, somente em `127.0.0.1:3001`. Limites de frame e mensagem são 4096 bytes; excesso no transporte encerra a conexão. O decoder também limita tamanho quando chamado diretamente. Frames binários recebem `text_required`; ping/pong seguem o transporte.

Nesta prova, respostas de diagnóstico são `{protocolVersion:1, seq, payload:{type:"welcome"|"input_ack"}}` para aceitação e `{payload:{type:"error",code}}` para rejeição. Estes acknowledgements não são o contrato futuro de snapshots/resultados, não atribuem slots e não confirmam progresso de corrida. O gate é isolado por conexão; `input` apenas é validado, sem simulação.

`npm run check:spike` inicializa o servidor, verifica versão incompatível, handshake, replay, input válido/inválido via Node WebSocket e abre Chromium headless para enviar hello pela página e conferir welcome. Rust consome fixtures compartilhadas de mensagens e inputs. Ainda faltam Android físico, WebGL2/WASM, Tauri, outras mensagens e testes com latência/partidas.
