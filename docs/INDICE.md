# Índice de documentação

> Fonte inicial de leitura para desenvolvedores e agentes. Situação: **Etapa 00 em andamento; contratos iniciais implementados**.

## Documentos de referência

| Documento | Conteúdo |
|---|---|
| [Visão e escopo](01-visao-e-escopo.md) | Objetivo, experiência, limites e públicos |
| [Arquitetura](02-arquitetura-do-sistema.md) | Módulos, camadas, limites e diagrama |
| [Stack e padrões](03-stack-e-padroes.md) | Bibliotecas, convenções e organização |
| [Gameplay e física](04-gameplay-e-fisica.md) | Kart, drift, colisão, power-ups, feedback |
| [Pistas](05-pistas-e-circuitos.md) | Protótipo, quatro pistas, checkpoints e alternativas |
| [Online e protocolo](06-online-e-protocolo.md) | Rust, sala, snapshots, autoridade, reconexão |
| [Bots](07-bots-e-dificuldade.md) | IA de corrida, perfis e bots substitutos |
| [Campeonato](08-campeonato-e-progressao.md) | Regras, tabela e pódio |
| [Inputs e acessibilidade](09-controles-e-acessibilidade.md) | Teclado, mouse, controle, touch |
| [Assets e personagens](10-personagens-e-assets.md) | Pipeline 3D, rig, permissões e otimização |
| [Web/Tauri/Android](11-clientes-web-e-tauri.md) | Estratégia de entrega e limites de WebView |
| [Testes e desempenho](12-testes-e-qualidade.md) | Estratégia, matriz, métricas e aceites |
| [Operação e segurança](13-infraestrutura-e-seguranca.md) | Deploy, limites, abuso e falhas |
| [Governança](14-governanca-documentacao.md) | Regras para atualizar documentos |
| [Backlog e riscos](15-backlog-e-riscos.md) | Priorização e decisões pendentes |
| [Dados e contratos](16-formato-dados.md) | Modelos lógicos e versionamento |
| [Andamento](ANDAMENTO.md) | Estado de cada etapa |
| [Histórico](CHANGELOG.md) | Alterações de documentação/arquitetura |

## Plano de execução

Leia [README de etapas](etapas/README.md), depois o arquivo da etapa marcada como ativa em [ANDAMENTO](ANDAMENTO.md). **Etapa ativa: 00 — Fundamentos.**

## Decisões iniciais

- [ADR-0001 — monorepo e núcleo compartilhado](decisoes/ADR-0001-monorepo.md)
- [ADR-0002 — sincronização híbrida e autoridade](decisoes/ADR-0002-sincronizacao.md)
- [ADR-0003 — renderização e física](decisoes/ADR-0003-render-fisica.md)

- [ADR-0004 — checksum canônico de pistas](decisoes/ADR-0004-checksum-pistas.md) — aceito para schema 1 experimental.

Os ADRs iniciais 0001–0003 têm estado **proposto**: precisam de validação durante a etapa 00 e nos testes técnicos.
