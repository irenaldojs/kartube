# Etapa 05 — Servidor Rust e salas

> **Estado:** Planejada · **Execução:** não iniciada

## Dependências

Etapas 00 a 04.

## Objetivo

Estabelecer protocolo e gerenciamento de sessão online sem integrar toda a corrida ainda.

## Tarefas (a realizar)

- [ ] E05-T01 — Criar serviço Rust com healthcheck e WebSocket, validação de versão e limites de mensagens.
- [ ] E05-T02 — Criar sala por código, entrada/saída e estados `LOBBY/COUNTDOWN/RACING/RESULTS`.
- [ ] E05-T03 — Garantir oito slots e atribuição de identidade efêmera com tokens de retomada.
- [ ] E05-T04 — Implementar ready check, preenchimento com bots e sincronização de estado do lobby.
- [ ] E05-T05 — Criar ticks oficiais, início/tempo da partida e estrutura de estado em memória.
- [ ] E05-T06 — Especificar fixtures de contratos cruzados TS/Rust e erros conhecidos.
- [ ] E05-T07 — Medir uso com várias salas simuladas; logar sem expor tokens.

## Critérios de aceite

- [ ] 3 humanos no lobby iniciam sala com exatamente 5 bots.
- [ ] Até 8 humanos entram sem ultrapassar a capacidade; tentativas inválidas falham claramente.
- [ ] Versões e mensagens inválidas são rejeitadas, e conexões encerradas limpam estado.

## Documentos que devem ser revisados

- [`docs/06-online-e-protocolo.md`](../06-online-e-protocolo.md)
- [`docs/13-infraestrutura-e-seguranca.md`](../13-infraestrutura-e-seguranca.md)
- [`docs/16-formato-dados.md`](../16-formato-dados.md)
- [`docs/ANDAMENTO.md`](../ANDAMENTO.md)
- [`docs/CHANGELOG.md`](../CHANGELOG.md)

## Registro de execução (preencher apenas durante o desenvolvimento)

- Responsável / agente: **não definido**
- Data de início: **não iniciada**
- Referência de commit/PR: **—**
- Testes executados e ambiente: **—**
- Evidências de aprovação: **—**
- Pendências / riscos: **—**
- Data de conclusão: **—**
