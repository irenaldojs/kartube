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
