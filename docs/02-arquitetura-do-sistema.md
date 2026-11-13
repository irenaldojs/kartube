# Arquitetura do sistema

## Três módulos distribuíveis e pacotes internos

| Parte | Responsabilidade | Não deve assumir |
|---|---|---|
| `apps/server` (Rust) | Salas, lobby, relógio de partida, slots, bots online, validações, inventário, regras de pontuação e resultados | Renderizar 3D ou hospedar física gráfica completa no MVP |
| `apps/web` (TS) | Jogo, câmera, renderizador, física local, UI/HUD, áudio, menu e adaptação dos controles | Definir classificação online sozinho |
| `apps/native` (Tauri 2) | Empacotar o build da web; ciclo de vida, segurança e APIs nativas necessárias | Duplicar motor de jogo ou servidor |
| `packages/game-core` (TS) | Regras puras compartilhadas entre singleplayer e cliente online (corrida, progressão, itens, interfaces) | Acessar navegador, WebSocket ou Tauri diretamente |
| `packages/protocol` (TS e schema gerador/compatível com Rust) | Contratos tipados, versionamento, validação dos pacotes | Depender de bibliotecas visuais |
| `packages/network-client` (TS) | Adapter RemoteRaceSession e transporte WebSocket injetável | Simular corrida ou alterar regras da autoridade |
| `packages/game-data` (TS/JSON) | Pistas, checkpoints, itens, parâmetros, elenco, IDs estáveis | Conter lógica de renderização |

**Estado:** pacotes TS e spike Rust já existem. Aplicativos web de jogo e nativo ainda planejados.

## Fluxo local e remoto

```text
                     ┌─────────────────────────────┐
 Input ──────────────►│ Game Core (regras de corrida)│
                     └──────────┬──────────────────┘
                                │
                     ┌──────────▼──────────────────┐
                     │ Simulação/física e visão TS  │──► Three.js, áudio, HUD
                     └──────────┬──────────────────┘
                                │
      Singleplayer: agente local┤
      Online: NetAdapter ◄─────►│ WebSocket ◄─────► Servidor Rust
```

## Fronteiras obrigatórias

- `InputAdapter`: fornece ações normalizadas sem conhecer origem (teclado/gamepad/touch/mouse).
- `RaceSession`: abstrai partida local ou sala online; estado da corrida lido por uma interface única.
- `RaceRules`: calcula posições, checkpoints, voltas, penalidades e pontuação em termos de dados, sem dependência de Three.js.
- `KartController`: comanda física local; parâmetros configuráveis, simulação em passo fixo e correção de rede quando online.
- `BotController`: decide direção, aceleração, drift e itens por interfaces comuns aos humanos.
- `AssetRegistry`: referencia IDs de GLB, texturas, sons e licenças; carrega sob demanda.
- `PlatformAdapter`: fullscreen, armazenamento, gamepad, ciclo de vida e permissões sem invadir gameplay.

## Relógios, simulação e apresentação

- Simulação local em **passo fixo** (inicialmente avaliar 60 Hz), com renderização desacoplada da frequência da tela.
- Servidor de salas em ticks controlados (proposta inicial: 20 Hz de estado); taxa real definida após perfis e benchmarks.
- Snapshots de jogadores remotos interpolados no cliente; extrapolação curta e limitada, com correção suave.
- Não usar relógio local como fonte final de tempo de volta no online; o servidor estabelece início, validade de checkpoints e chegada.
- Física local não exige lockstep determinístico perfeito entre Rust, WASM e Android.

## Autoridade e anti-cheat pragmático

Servidor aceita **inputs/intenção e eventos**, e valida limites de velocidade, sequenciamento de checkpoints, tempos mínimos plausíveis, disponibilidade de item e ordem de chegada. Sem simular todas as forças de contato, isso é **anti-cheat parcial**. Aumentar a autoridade por segmento é um plano de evolução se testes mostrarem fraude ou descompasso.

## Falhas e recuperação

Cliente perde a conexão → UI informa status e tenta reconectar dentro de uma janela definida. Slot não muda de dono durante a tentativa; após expirar, bot assume. No campeonato, manter identidade/posição do slot. Sala finaliza com resultado imutável; após uma corrida, transita para próxima pista sem criar um campeonato novo.

## Dependências

Ver [Online](06-online-e-protocolo.md), [Dados](16-formato-dados.md), [Testes](12-testes-e-qualidade.md) e [ADR-0002](decisoes/ADR-0002-sincronizacao.md).

## Contrato de sessão implementado — E00-T03

`game-core/race-contracts.ts` define `RaceSession` comum, snapshots e eventos. A interface não abre socket, carrega assets nem decide regras gráficas. `mode` identifica local/remoto; `localSlotId` é o slot humano local atribuído pela autoridade. `submitInput` enfileira intenção e não confirma checkpoint, item ou resultado. `getSnapshot` devolve último estado oficial ou null antes do primeiro. `subscribe` entrega eventos futuros, sem reproduzir o estado atual: consultar getSnapshot depois de assinar. O retorno cancela a assinatura.

Implementações futuras devem tornar unsubscribe/dispose idempotentes, liberar listeners/conexões no dispose e lançar erro em submitInput/subscribe após descarte; getSnapshot poderá retornar o último estado. Não mutar snapshots já entregues. Emitir race_result uma única vez por raceId/resultId; ignorar repetições de rede. RemoteRaceSession e LocalRaceSession já exercitam essas obrigações em provas de contrato. A autoridade offline usada pelos testes é roteirizada, sem simulação de jogo. InputAdapter fornece amostra normalizada; PlatformAdapter mantém armazenamento assíncrono e tipo de plataforma, com fullscreen/ciclo de vida a ampliar na etapa 10.

Fluxo oficial: waiting → countdown → racing → finished. Qualquer fase ativa pode terminar em aborted; estados terminais são imutáveis. validateRaceTransition verifica snapshots consecutivos, tick crescente, configuração e início estáveis, slots/pilotos preservados e progresso sem regressão. Controlador humano/bot pode mudar, mantendo slot e piloto. Um primeiro snapshot pode chegar já em racing; quando houver lacunas de fase após reconexão, o adapter deve fazer resync completo, validando o snapshot sem fingir uma sequência consecutiva. RemoteRaceSession já valida continuidade; resync/reconexão ainda não implementados.

A autoridade LocalSession offline/Rust online emite snapshot, checkpoint_ack, item_granted, item_used e race_result; connection é estado local do adapter. Snapshots contêm poses e progresso oficiais; resposta visual imediata do jogador deve ficar em estado de apresentação separado. O servidor de diagnóstico já usa codecs compatíveis para welcome/input_ack/error; não simula nem emite eventos de corrida.

## Adapter remoto implementado — prova E00-T03

`@kartube/network-client` isola I/O do núcleo e do protocolo ([ADR-0005](decisoes/ADR-0005-adapter-remoto.md)). Recebe RaceConfig, slot humano já atribuído, build e RaceTransport. O transporte é exclusivo da sessão e subscribe registra apenas callbacks futuros, sem dispará-los sincronicamente. createWebSocketTransport fornece implementação baseada no WebSocket padrão.

O primeiro welcome após hello marca connected; getConnectionState permite consultar o estado após assinatura tardia. Não há estado connecting público nesta prova: antes do welcome a consulta retorna disconnected e input é recusado. O primeiro snapshot precisa corresponder exatamente à configuração recebida; snapshots seguintes usam validateRaceTransition. Snapshot e eventos expostos são imutáveis em runtime; getSnapshot continua disponível após encerramento.

A sessão fecha no primeiro erro de protocolo/continuidade/transporte, remove callbacks e emite error (quando aplicável) e disconnected uma vez. Dispose remove listeners, fecha o transporte e impede callbacks posteriores; submitInput/subscribe após descarte lançam erro. Listeners que falham são reportados por onListenerError (console por padrão), sem interromper os demais. Não há reconexão automática nem recuperação de lacunas; é preciso nova sessão após futuro procedimento autoritativo de resync.

## Sessão local de referência — E00-T03

LocalRaceSession em game-core implementa a mesma interface RaceSession, sem I/O, relógio de parede ou dependência de protocolo. Recebe LocalRaceAuthority injetada, localSlotId e callback onError para isolar falhas de listeners/limpeza. A autoridade fornece initialSnapshot waiting com um humano no slot local e sete bots. Sua propriedade é transferida à sessão após o construtor validar o estado; se a construção falhar, o chamador continua responsável por liberá-la.

advance() chama authority.step(inputOuNull) uma vez por tick. O agendamento em passo fixo (1/tickRate segundos) fica fora do núcleo. O retorno LocalAuthorityFrame contém um snapshot com tick exatamente anterior+1 e eventos desse tick. A sessão copia/congela tudo e valida o frame completo antes de publicar qualquer parte. Um frame inválido ou exceção encerra a sessão, libera a autoridade e preserva o último snapshot válido; advance lança o erro e listeners recebem invalid_authority_frame. Não é possível reverter a simulação interna, então não há tentativa de continuar após falha.

submitInput conserva apenas a última amostra válida/monotônica para o próximo step, copiando-a para evitar mutação externa. Cada amostra é consumida uma vez; ticks sem nova amostra recebem null, cujo significado para o controlador será definido pela autoridade de gameplay. Input antes da largada ou após chegada local é recusado.

Frame racing admite eventos oficiais de checkpoint/item da mesma corrida, mesmo tick e slots válidos. Frame finished exige exatamente um resultado validado contra seu snapshot; frame aborted não tem eventos. Depois de um estado terminal, advance/submitInput são recusados e a autoridade é liberada uma única vez. Dispose remove listeners e também é idempotente; o último snapshot fica consultável. subscribe recebe apenas eventos futuros. advance reentrante é recusado, e dispose durante um callback impede entregas posteriores.

A autoridade roteirizada existe apenas nos testes. Ainda faltam física, IA, progressão por checkpoints, itens e a autoridade real de gameplay nas etapas correspondentes. A prova confirma intercambiabilidade de sessão: um consumidor observa snapshots/checkpoints/itens/resultado iguais via local e remoto, sem mudar seu contrato.
