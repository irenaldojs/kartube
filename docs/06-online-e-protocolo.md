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
- Envelope obrigatório: `protocolVersion`, `sessionId?`, `roomId?`, `seq`, `tick?`, `type`, `payload`.
- Definir rate limit, payload máximo, intervalo de heartbeat, timeouts e idempotência antes de testar em rede pública.

## Tratamento de falhas

- Reconexão com `resumeToken` de uso restrito e expiração curta; token não deve aparecer em logs.
- Cliente sem conexão mantém controle visual temporário, mas não valida itens/chegada até reassociar.
- No timeout, bot assume slot; o servidor emite transição de controle. O usuário reconectado pode reassumir se corrida e janela permitirem.
- Caso o servidor caia, campeonato em memória é perdido no MVP; oferecer mensagem clara e decidir persistência apenas antes de operação real.

## Testes obrigatórios

1, 3 e 8 jogadores humanos com bots complementares; duas salas paralelas; latência 0/80/150/250 ms; perda 1/3/5%; reordenação artificial; queda/reconexão; duas tentativas de uso do mesmo item; checkpoints inválidos; término simultâneo e resultado igual para todos.
