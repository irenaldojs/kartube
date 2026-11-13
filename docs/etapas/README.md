# Roteiro por etapas

Cada etapa é um **contrato de trabalho futuro**, não uma afirmação de que o recurso existe. Execução deve seguir a ordem da [visão geral](../../Geral.md), com spikes técnicos antecipados para riscos maiores.

| Arquivo | Marco |
|---|---|
| [00](00-fundamentos.md) | Fundamentos e contrato arquitetural |
| [01](01-prototipo-3d.md) | Protótipo visual e prova de compatibilidade |
| [02](02-corrida-local.md) | Regras de volta e pilotagem |
| [03](03-bots-locais.md) | IA offline e 8 slots |
| [04](04-mecanicas.md) | Power-ups, boosts, rampas e alternativas |
| [05](05-servidor-rust.md) | Salas Rust e protocolo |
| [06](06-online-e-bots.md) | Sincronização e bots online |
| [07](07-campeonato.md) | Quatro corridas, pontuação e pódio |
| [08](08-personagens-assets.md) | Elenco e pipeline visual |
| [09](09-quatro-pistas.md) | Conteúdo final das pistas |
| [10](10-controles-e-plataformas.md) | Controles e empacotamento |
| [11](11-polimento-publicacao.md) | Qualidade, segurança e publicação |

## Padrão de conclusão

Para marcar qualquer etapa **Concluída**: todos os itens de entrega devem estar testados, evidência preenchida no próprio arquivo, domínios atualizados, `ANDAMENTO.md` e `CHANGELOG.md` atualizados e nenhum bloqueio crítico restante.

## Campo de execução

Cada arquivo contém um bloco `Registro de execução` em branco. Preenchê-lo quando implementar, com referência do commit/PR, ambiente, resultados e pendências. **Não preencher antecipadamente**.
