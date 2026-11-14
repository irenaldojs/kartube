# Etapa 02 — Corrida singleplayer jogável

> **Estado:** Em andamento · **Execução:** iniciada em 2026-11-14

## Dependências

Etapa 01. Por decisão do usuário em 2026-11-14, priorizar a implementação web: T01–T05 do protótipo e diagnósticos web estão disponíveis; provas e ports nativos de T06/T07 ficam adiados e não bloqueiam o desenvolvimento desta etapa. Isso não encerra os critérios pendentes da etapa 01.

## Objetivo

Transformar movimentação em corrida válida, com progressão, HUD e resultados.

## Tarefas (a realizar)

- [x] E02-T01 — Construir `KartController` arcade (acelerar/frear/ré/dirigir, drift e controle aéreo).
- [x] E02-T02 — Adicionar spawn, largada, contagem regressiva, checkpoints por grafo e voltas configuráveis.
- [ ] E02-T03 — Implementar respawn em posição segura e detecção de queda/stuck.
- [ ] E02-T04 — Adicionar sistema de posições por progresso ao longo do trajeto sem depender só da distância euclidiana.
- [ ] E02-T05 — Criar HUD de volta, velocidade, posição, item (vazio), cronômetro e término.
- [ ] E02-T06 — Testar limites de mapa, cortes ilegais, respawn e framerate variável.
- [ ] E02-T07 — Extrair regras puras reutilizáveis no serviço de sessão.

## Critérios de aceite

- [ ] Um humano completa três voltas legais; shortcut inválido não conta.
- [ ] Controlador e HUD funcionam sem conexão e sem dependência do wrapper Tauri.
- [ ] Testes de posição, tempo, checkpoint e recuperação passam.

## Documentos que devem ser revisados

- [`docs/04-gameplay-e-fisica.md`](../04-gameplay-e-fisica.md)
- [`docs/05-pistas-e-circuitos.md`](../05-pistas-e-circuitos.md)
- [`docs/16-formato-dados.md`](../16-formato-dados.md)
- [`docs/ANDAMENTO.md`](../ANDAMENTO.md)
- [`docs/CHANGELOG.md`](../CHANGELOG.md)

## Registro de execução (preencher apenas durante o desenvolvimento)

- Responsável / agente: **Codex**
- Data de início: **2026-11-14**
- Referência de commit/PR: **—**
- Testes executados e ambiente: `npm run check`, `npm run check:web`, `npm run check:web:dev`; Linux, Rapier e Chromium/SwiftShader.
- Evidências de aprovação: E02-T01 validada automaticamente; capturas desktop/móvel inspecionadas e copiadas para `artifacts/web/`. Critérios de corrida da etapa continuam pendentes.
- Pendências / riscos: playtest e calibração de dirigibilidade; respawn seguro e detecção de stuck na E02-T03.
- Data de conclusão: **—**

### E02-T01 — Controlador arcade e Cart.fbx — 2026-11-14

- Kart provisório substituído pelo `assets/karts/Cart.fbx` fornecido pelo usuário. FBXLoader preserva materiais, remove câmeras/luzes de autoria e normaliza tamanho/orientação (-Z à frente) sem alterar colisor Rapier. Asset estático incluído com hash no build web; cache apenas dos bytes, com geometria/material próprios por cena e descarte registrado.
- Modelo mede aproximadamente 1,742 × 0,948 × 2,8 m, rodas alinhadas à base do colisor (y local -0,35). Sem texturas externas neste arquivo. Pista usa 17 geometrias e 18 materiais registrados; laboratório acrescenta a geometria do grid. Captura de câmera inspecionada.
- `controlKart` separa o cálculo arcade puro da integração Rapier a 60 Hz. Preserva acelerar/frear/ré/dirigir; Shift esquerdo/direito e botão Drift reduzem aderência lateral e preservam inércia ao girar. Drift exige avanço ≥4 m/s, sem freio/ré; soltar recupera aderência. Sem mini-boost neste marco.
- No ar, direção altera yaw até 0,65 rad/s e ajusta trajetória com influência de 35%, preservando magnitude da velocidade horizontal e componente vertical; gravidade/aterrissagem/colisão permanecem em Rapier. Sem propulsão aérea. Velocímetro identifica DRIFT/NO AR.
- Testes cobrem diferença de derrapagem e retomada da aderência, teto de velocidade, ausência de drift parado/em ré/freando, limites aéreos sem ganho de velocidade, reset, integração do drift no corpo Rapier e percurso completo com duas rampas/aterrissagens sem reset. Unidade do modelo verifica escala, centragem, câmeras/luzes removidas e descarte.
- E02-T01 concluída no escopo funcional web. Ajuste fino de sensação permanece sujeito ao playtest do usuário. Próxima E02-T02: largada, contagem regressiva, checkpoints e voltas. T06/T07 do protótipo e ports nativos permanecem adiados; não há corrida com voltas/resultados implementada ainda.

- Smokes web finais aprovados: FBX no build e dev, Shift, toque simultâneo acelerar/direção/drift e soltura independente, falha HTTP do asset com retry, troca de perfil com FBX pendente, ciclos de descarte/reinício com contadores estáveis. Nenhum build/port nativo executado nesta entrega.

### E02-T02 — Largada, checkpoints e voltas — 2026-11-14

- Treino livre preservado; botão Iniciar corrida cria prova singleplayer de 1, 3 (padrão) ou 5 voltas. Spawn atrás da linha, contagem 3–2–1 por 180 ticks fixos, sem movimento antes do sinal. Primeira passagem arma a volta sem concedê-la; conclusão exige o grafo completo e nova passagem na chegada.
- `createCheckpointRace` em game-core mantém regra pura: plano de passagem com direção, teste da posição interpolada dentro do volume, sucessores válidos, bifurcação/reencontro da alternativa, voltas e encerramento único. Verifica grafo sem ciclo fora da chegada. Deslocamento >2 m por tick invalida a rota em andamento; isso não é uma solução de anticheat de rede.
- `race-track.ts` define nove gates e spawn do circuito cinza, reaproveitando o formato Checkpoint com direção/label adicionais. A rota principal e a alternativa são válidas; cruzar a linha em ré, oscilar nela, pular gates ou cortar fora da alternativa não concede volta. Ainda não publica uma TrackDefinition completa com oito spawns/checksum, nem integra roster de sessão.
- HUD mínimo informa volta, tempo de simulação e próximo gate; faixas verdes orientam as passagens. Pausa/ocultação congelam contagem e relógio. Chegada congela o tempo e freia o kart. Avanço manual de ticks bloqueado durante prova. Trocar cena/perfil/reiniciar teste retorna ao treino; reposicionar ou recuperação por queda reinicia a prova, sem creditar travessia por teleporte (respawn com progresso preservado na T03).
- Colisor do kart passa a caixa arredondada com raio de 5 cm e mesmas dimensões externas 1,8 × 0,7 × 2,8 m, evitando travar na emenda dos pisos da alternativa. Malha/escala do Cart.fbx preservadas.
- `npm run check` aprovado: regras (três voltas, rotas, sentido, cortes, altura, teleporte, duplicidade, countdown e configuração), três voltas por inputs reais Rapier passando pelas duas rotas, regressões de drift/rampas/freio/colisão. Playtest humano de três voltas segue pendente; não marcar o aceite global da etapa por teste automatizado.
- Próxima tarefa E02-T03: respawn seguro e detecção de queda/stuck. Posições, HUD completo, itens, bots e resultado de oito pilotos continuam nos marcos seguintes. Ports nativos permanecem adiados.

- Smokes finais `npm run check:web` e `npm run check:web:dev` aprovados. Verificados no navegador: throttle bloqueado no countdown, pausa/ocultação sem avançar ticks, primeira passagem sem crédito de volta, reposicionamento reiniciando countdown e retorno ao treino/laboratório. Captura `/tmp/kartube-race.png` inspecionada e copiada para `artifacts/web/kartube-race.png`. Sem build/port nativo nesta entrega.
