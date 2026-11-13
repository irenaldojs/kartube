# Etapa 06 — Corrida multiplayer sincronizada

> **Estado:** Planejada · **Execução:** não iniciada

## Dependências

Etapa 05, gameplay da 04.

## Objetivo

Transformar sala em corrida com movimento, itens, bots online e resultado consistente.

## Tarefas (a realizar)

- [ ] E06-T01 — Implementar NetAdapter de inputs com sequência, ack, snapshot e buffer remoto.
- [ ] E06-T02 — Adicionar predição local, interpolação e correção sem congelar controle.
- [ ] E06-T03 — Validar checkpoints, regras e consumos de item no serviço Rust.
- [ ] E06-T04 — Simular bots de corrida no servidor e replicar estado para todos os clientes.
- [ ] E06-T05 — Implementar resultados finais autoritativos, reconexão e bot assumindo slots.
- [ ] E06-T06 — Medir 1, 3 e 8 humanos + bots, conexões cruzadas e várias salas em paralelo.
- [ ] E06-T07 — Executar cenário com latência/perda e registrar divergências/limites.

## Critérios de aceite

- [ ] Os 8 pilotos aparecem e correm com estados coerentes em todos os clientes.
- [ ] A tabela de chegada é idêntica para todos e não pode ser enviada pelo cliente.
- [ ] Reconexão e bot substituto não criam novos slots; métricas de rede registradas.

## Documentos que devem ser revisados

- [`docs/02-arquitetura-do-sistema.md`](../02-arquitetura-do-sistema.md)
- [`docs/06-online-e-protocolo.md`](../06-online-e-protocolo.md)
- [`docs/07-bots-e-dificuldade.md`](../07-bots-e-dificuldade.md)
- [`docs/12-testes-e-qualidade.md`](../12-testes-e-qualidade.md)
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
