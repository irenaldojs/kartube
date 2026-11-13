# Backlog transversal, riscos e decisões pendentes

## Prioridade P0 — bloqueia o MVP

- Prova de renderização WebGL2 e física WASM em navegador e Tauri Android.
- Protótipo de kart arcade com câmera estável, rampas, boosts e pista alternativa.
- Sistema de checkpoints sem cortes inválidos.
- IA que consegue completar pista e preencher slots faltantes.
- Sala e protocolo Rust com 8 slots, sincronização e placar.
- Quatro corridas em sequência e pódio correto.
- Inputs teclado/gamepad/touch, incluindo quedas de foco.
- Pipeline 3D original e inventário de licenças.

## Prioridade P1 — aumenta qualidade

Balanceamento de itens, múltiplos níveis de bots, ajuste dinâmico de qualidade gráfica, medição automática de FPS, efeitos acessíveis, reconexão robusta, animações variadas, suporte PWA offline.

## Prioridade P2 — pós-MVP

Matchmaking, perfil persistente, ranking, replay, espectadores, cosméticos, temporadas, novos mapas, servidor multi-região e aprimoramento autoritativo de física.

## Registro de riscos

| ID | Risco | Impacto | Mitigação | Gatilho de revisão |
|---|---|---|---|---|
| R01 | Android WebView apresenta FPS incompatível | Alto | Spike técnico na etapa 01, perfil gráfico leve | Teste físico abaixo da meta |
| R02 | Física local e servidor divergem | Alto | Autoridade de regras + reconciliação + cenários adversos | Salto/teleporte e resultados divergentes |
| R03 | Bot online muito simplificado parece artificial | Médio | Waypoints e animação interpolada, validar playtest | Bots atravessam objetos/curvas |
| R04 | Direitos de influenciadores e imagens | Crítico | Personagens originais até consentimento/licença | Ausência de documento de autorização |
| R05 | Assets gerados por IA pesados/inconsistentes | Alto | Retopo, rigs padronizados, budgets medidos | Excesso de RAM/bugs de animação |
| R06 | Escopo de quatro pistas atrasa polimento | Médio | Pista cinza + vertical slice, produção após fun | Primeira pista ainda não é divertida |
| R07 | Abuso de rede e spoof de resultado | Alto | Rate limits, estados autoritativos, auditoria | Eventos impossíveis em testes |
| R08 | Tauri nem sempre melhora desempenho | Médio | Testes reais web vs Tauri em mesmo aparelho | Build nativo pior que browser |
| R09 | Itens favorecem sorte demais | Médio | Tabelas por posição e métricas em playtest | Baixa correlação habilidade/posição |

## Decisões abertas

- Qual será a identidade visual final, nome comercial e elenco licenciado?
- Quais aparelhos Android representam o piso de compatibilidade?
- Quais parâmetros de kart e itens dão a diversão desejada?
- Haverá corrida avulsa online no MVP além do campeonato? **Planejado: sim**, validar UX.
- Até que ponto o servidor precisa simular posição detalhada? Medir desync/abuso antes de aumentar autoridade.
- Quando persistir contas/placar? **Adiar** até existir necessidade comprovada.

Cada decisão aprovada deve gerar atualização do documento específico e, se arquitetural, ADR.
