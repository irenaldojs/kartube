# Pistas, circuitos e validação de percurso

## Pista de protótipo (não entra nas quatro finais)

**Objetivo:** descobrir problemas de câmera, física, orientação e rede antes da produção de cenários.

Requisitos mínimos obrigatórios:

1. Circuito fechado com largada/chegada, guardrails, 3 voltas e linha de chegada.
2. **Duas rampas**: uma simples, outra que force aterrissagem com curva.
3. **Três zonas de boost** no solo, com cooldown por passagem.
4. **Caixas de power-up** posicionadas na linha normal e próximas a risco/recompensa.
5. **Caminho alternativo** com entrada e saída ligadas ao percurso principal.
6. Checkpoints cobrindo ambos os caminhos e impedindo cortar diretamente à chegada.
7. Uma região de queda com respawn válido e orientação preservada.
8. Waypoints, pontos de ultrapassagem e zonas de dificuldade para IA.

```text
                   [Rampa] ── [Power-up]
                         /                [LARGADA] -- [Curvas] --┤                 ├-- [Boost] -- [CHEGADA]
                         \--[Atalho]------/
                 [Respawn]        [Rampa]
```

*Diagrama conceitual; não é a geometria do circuito.*

## Quatro pistas do lançamento (temas provisórios)

| ID proposto | Tema autoral | Diferencial de gameplay |
|---|---|---|
| `track_studio` | Estúdio Neon | Curvas médias, painéis e boosts simples; introdução |
| `track_canyon` | Cânion Colorido | Rampas, saltos e dois caminhos com risco distinto |
| `track_harbor` | Porto Animado | Obstáculos móveis previsíveis e trechos estreitos |
| `track_clouds` | Parque nas Nuvens | Plataformas, mudanças de altura e atalhos aéreos |

Nomes/temas podem mudar após validação de identidade. Cada mapa deve ter comprimento e dificuldade próprios, mas tempos de corrida comparáveis para o campeonato.

## Dados obrigatórios de cada pista

`id`, `version`, `displayName`, `assetManifest`, `spawnSlots[8]`, `finishLine`, `checkpointGraph`, `routeSegments`, `respawnPoints`, `botRacingLine`, `itemBoxes`, `boostZones`, `jumpZones`, `surfaceRegions`, `bounds`, `minimap`.

**Validação de voltas:** grafo dirigido de checkpoints; cada rota alternativa tem entrada, sequência e retorno explícitos. A validação aceita qualquer rota válida, mas não um teleporte. O servidor pode verificar ordem/tempo de checkpoints a partir de dados simplificados, sem carregar a malha visual inteira.

## Produção e desempenho

- Prototipar primeiro com primitivas e colisores simples; depois substituir por GLB modular.
- Pistas devem ter LOD, instancing onde adequado, occlusão/culling sob teste e limites de draw calls/triângulos **medidos**, não arbitrados.
- Limitar tamanhos de textura e materiais por perfil gráfico; prever assets reduzidos no Android.
- Separar física de visual: colisores não dependem da malha detalhada importada.

## Definição de pista pronta

Uma pista aceita 8 karts, bots percorrem rotas válidas, 3 voltas terminam em todas as plataformas alvo, não há shortcut impossível, itens/boosts respondem, respawns são seguros e os testes de FPS mínimos passam nos aparelhos de referência.

## Validação estrutural implementada — E00-T04

`parseTrackDefinition(unknown)` em `@kartube/game-data` valida o contrato mínimo de gameplay e devolve dados tipados reconstruídos. Erros lançam `Error` com caminho/campo; o chamador deve tratá-los antes de carregar uma pista. A fixture `fixtures/track-definition.json` contém um grafo com bifurcação e reencontro, destinado exclusivamente a testes; não é a pista cinza nem conteúdo jogável.

Regras do schema 1 inicial:

- IDs não vazios, 1–64 caracteres ASCII alfanuméricos, ponto, hífen ou sublinhado; checksum SHA-256 com 64 dígitos hexadecimais minúsculos; versão inteira segura positiva. Schema desconhecido é rejeitado.
- Pelo menos dois checkpoints com IDs únicos e chegada indicada por `startCheckpointId`. Centros finitos em metros; meias extensões AABB estritamente positivas.
- Cada checkpoint tem sucessores existentes, únicos e não vazios; não pode apontar para si mesmo. Todos devem ser alcançáveis a partir da chegada.
- Ao remover o nó de chegada, o grafo deve ser acíclico. Assim, toda rota retorna à chegada, sem laços independentes. Bifurcações e reencontros são permitidos. Percursos futuros que precisem de laços internos exigem revisão deliberada do contrato.
- Exatamente oito slots únicos de 0 a 7, com posição finita e yaw finito em radianos.

O parser estrutural verifica formato do checksum; `parseVerifiedTrackDefinition` também recalcula e compara SHA-256. Rust tem parser estrutural e verificado equivalentes, consumindo as mesmas fixtures. O formato canônico está em `16-formato-dados.md` e ADR-0004. Não há verificação de distância entre spawns, sobreposição de volumes, colisão com cenário ou trajetória física. Ordem de passagem, direção, tempos, teleporte e contagem de voltas pertencem à autoridade de corrida na etapa 02; um grafo estruturalmente válido não comprova esses comportamentos. Os demais campos de produção listados acima serão introduzidos nas etapas correspondentes.

## Geometria de protótipo implementada — E01-T02

`apps/web/src/track.ts` descreve a pista cinza provisória: anel retangular de 8 m de largura, largada quadriculada, guardrails, duas rampas e uma ligação alternativa entre as retas laterais. Três boosts e três caixas são marcadores visuais. A mesma descrição fornece dimensões de malhas e colisores estáticos independentes; só vias, rampas e guardrails colidem. A cena pode ser selecionada no laboratório web, com câmera de visão geral.

Não é ainda uma `TrackDefinition` de corrida: checkpoints, checksum, oito spawns, respawn e linha de IA serão ligados ao contrato nas etapas de gameplay. A prova atual cobre construção/renderização e repouso físico no spawn, sem declarar circuito percorrível por piloto/bot ou mecânicas de itens concluídas.

## Corrida no circuito cinza — E02-T02 — 2026-11-14

`race-track.ts` define gates direcionais e spawn singleplayer atrás da chegada (x=-20, z=14). Linha de chegada em z=10,3, sentido -Z. A primeira passagem inicia o percurso validável; voltas posteriores exigem sucessores legais até o retorno.

```text
finish → branch → north-west → north → east → merge → south → west → finish
             └→ alternative ──────────────────┘
```

Gates checam centro do kart por segmento entre ticks fixos e interseção com plano/direção/volume. O gate esperado recebe faixa verde; a bifurcação mostra as duas opções. A alternativa cruza o meio da pista e reencontra a reta leste; seus gates são explícitos. Mudança abrupta de posição invalida a rota em andamento. Desde E02-T03, reposicionar retorna à âncora do último gate aceito e preserva o progresso sem conceder passagens.

Esses gates estendem o contrato Checkpoint com direção e label; ainda não são o manifesto completo de TrackDefinition com oito spawns e checksum. O cenário continua greybox com boosts/caixas visuais. Teste físico automatizado completa três voltas alternando rotas; playtest humano e políticas de recuperação mais finas permanecem pendentes.

Âncoras de recuperação: 1,8 m atrás de cada plano, no centro da via e com yaw válido; todas verificadas automaticamente por Rapier para apoio e espaço. Na alternativa, preservar o gate aceito mantém o reencontro esperado, sem permitir trocar a recuperação por avanço no grafo.
