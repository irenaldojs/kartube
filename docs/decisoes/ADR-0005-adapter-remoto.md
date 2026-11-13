# ADR-0005 — Adapter remoto isolado e continuidade de eventos

- **Estado:** Aceito para a prova da etapa 00
- **Data:** 2026-11-13

## Contexto

RaceSession pertence ao núcleo e os codecs pertencem ao protocolo. Nenhum deles deve adquirir dependência de socket ou gerenciar conexões de plataforma. É necessário testar o mesmo contrato de sessão com mensagens reais e mensagens controladas antes de implementar salas.

## Decisão

Criar `packages/network-client`, dependente apenas de game-core e protocol. RemoteRaceSession implementa RaceSession com transporte injetável; createWebSocketTransport encapsula WebSocket padrão, compartilhável entre navegador e Node 24. A sessão assume uma única corrida/conexão e recebe configuração e slot previamente atribuídos pela autoridade; a prova usa alocação de fixture até existir lobby.

Saída do servidor começa em seq 0 e deve ser contígua. Sequências antigas são ignoradas; lacuna, eventId reutilizado com sequência nova ou inconsistência de corrida encerra a conexão e preserva o último snapshot válido. Não tentar inferir eventos faltantes nem reiniciar cursores implicitamente. Resync/reconexão terão contrato explícito em evolução futura.

## Consequências e evidência

Snapshot inicial pode chegar em qualquer fase válida da corrida configurada. Os seguintes exigem transição consecutiva; eventos de corrida têm relógio não regressivo. Resultado depende de snapshot final correspondente e é emitido uma vez. Os dados entregues são congelados; descarte fecha transporte e remove callbacks de forma idempotente. Falhas de listeners são reportadas sem interromper os demais.

Testes usam transporte controlado para replay, lacunas, mudanças inválidas, resultado, inputs e descarte. Smoke integrado usa o transporte WebSocket real e o servidor Rust para confirmar handshake. Sem lobby, física, inventário, contagem de voltas, interpolação, heartbeat ou reconexão automáticos nesta prova. A decisão não encerra as etapas 05/06 nem aceita o ADR-0002 de sincronização completa.
