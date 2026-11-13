# Etapa 01 — Protótipo visual 3D

> **Estado:** Em andamento · **Execução:** iniciada em 2026-11-13

## Dependências

Etapa 00.

## Objetivo

Validar Three.js, Rapier, câmera e pipeline básico de render em uma pista cinza.

## Tarefas (a realizar)

- [x] E01-T01 — Criar estrutura de código planejada e primeiro boot com seleção de qualidade gráfica.
- [x] E01-T02 — Exibir pista cinza fechada com linha de largada, chão, guardrails, rampas, boosts, caixa de item e alternativa em geometria simples.
- [x] E01-T03 — Carregar kart placeholder por cena GLB ou geometria provisória, câmera em terceira pessoa e sombras de baixo custo.
- [ ] E01-T04 — Executar movimento básico e colisões com timestep fixo; criar debug de FPS/física.
- [ ] E01-T05 — Carregar e liberar assets sem vazamento; separar malhas e colisores.
- [ ] E01-T06 — Realizar spike do mesmo build no browser e Tauri Android em aparelho físico.
- [ ] E01-T07 — Registrar FPS, RAM, WebGL2, áudio e problemas de WebView por plataforma.

## Critérios de aceite

- [ ] Kart pode percorrer o traçado cinza e câmera mantém alvo sem glitches críticos.
- [ ] WebGL2/física funcionam no navegador e há registro de resultado real Android (aprovado ou bloqueio).
- [ ] Assets e colisão estão isolados de regras de corrida.

## Documentos que devem ser revisados

- [`docs/05-pistas-e-circuitos.md`](../05-pistas-e-circuitos.md)
- [`docs/11-clientes-web-e-tauri.md`](../11-clientes-web-e-tauri.md)
- [`docs/12-testes-e-qualidade.md`](../12-testes-e-qualidade.md)
- [`docs/ANDAMENTO.md`](../ANDAMENTO.md)
- [`docs/CHANGELOG.md`](../CHANGELOG.md)

## Registro de execução (preencher apenas durante o desenvolvimento)

- Responsável / agente: Codex
- Data de início: **2026-11-13**
- Referência de commit/PR: boot/fundamentos em `1fadf59`; pista no commit `feat(web): add greybox prototype circuit`.
- Testes executados e ambiente: `npm run check:web`, build/tipos e smoke Chromium headless/SwiftShader; captura da pista inspecionada visualmente.
- Evidências de aprovação: **—**
- Pendências / riscos: **—**
- Data de conclusão: **—**

### E01-T01 — Estrutura e boot — 2026-11-13

- Reaproveitada a estrutura validada na microprova: `apps/web` com Vite/TypeScript, boot em `src/main.ts`, renderização em `src/view.ts` e física em `src/physics.ts`.
- Perfis leve/equilibrado selecionáveis; troca reinicializa a cena e libera os recursos anteriores. Boot assíncrono trata falhas de WebGL2/WASM e permite reinício. Scripts de desenvolvimento, build e smoke disponíveis na raiz.
- E01-T01 concluída com a implementação existente, sem duplicar o laboratório. Verificação: `npm run check:web` (tipos, build e smoke Chromium).
- Próxima tarefa: E01-T02, pista cinza fechada com os elementos de geometria provisória. Kart dirigível, câmera de acompanhamento e Tauri ainda não implementados.

### E01-T02 — Pista cinza fechada — 2026-11-13

- `src/track.ts` define primitivas em metros/radianos: circuito retangular contínuo com largura de 8 m, largada quadriculada, chão, guardrails com aberturas, duas rampas, três zonas visuais de boost, três caixas e uma alternativa ligando as retas laterais.
- Renderizador usa uma geometria de caixa compartilhada para os elementos da pista; Rapier recebe colisores estáticos separados a partir dos descritores sólidos (vias, guardrails e rampas). Boosts/caixas ainda não têm triggers ou regras de gameplay.
- Visão geral da pista é a cena inicial; seletor mantém disponível o laboratório de queda. Trocas de cena liberam/recriam recursos. Kart provisório nasce sobre uma reta.
- Smoke confirma cena, diagnóstico dos elementos, repouso físico no spawn, liberação/reinício e retorno ao laboratório com as verificações anteriores. Captura em `/tmp/kartube-track.png`, incluída nos artefatos da CI.
- E01-T02 concluída no escopo visual/geométrico. Checkpoints, voltas, efeitos de boost/itens e dirigibilidade não são parte desta entrega. Próxima tarefa: E01-T03, câmera em terceira pessoa e sombras de baixo custo para o kart provisório.

### E01-T03 — Kart, câmera e sombra de contato — 2026-11-13

- Kart de geometria provisória preservado. `src/camera.ts` acompanha posição e orientação com offset traseiro, alvo adiante e suavização exponencial em função do tempo. Primeiro enquadramento e troca de modo são imediatos; seletor alterna terceira pessoa/visão geral sem reiniciar física.
- Sombra de contato elíptica, sem textura ou shadow map, usa raycast vertical contra vias/rampas; acompanha a superfície e fica menos opaca com a altura. Recursos entram no descarte da cena. Perfil leve reduz os segmentos de 24 para 16.
- Diagnóstico exporta modo/posição/alvo da câmera e sombra visível. Layout da cena acompanha a altura do painel no desktop, com altura própria no móvel.
- Verificação: `npm run check` (56 testes, incluindo orientação em quatro direções e suavização a 30/60 Hz); `npm run check:web` (convergência após queda, sombra sobre a pista, troca de câmera sem alterar physicsSteps, descarte/reinício e regressões). Captura em `/tmp/kartube-chase.png` incluída na CI e inspecionada visualmente.
- E01-T03 concluída. Ainda sem pilotagem; colisão/oclusão de câmera em movimento será avaliada com o kart dirigível. Sombra é aproximação visual de contato, sem sombras dinâmicas do cenário. Medições anteriores do S20 FE não validam este novo build.
- Próxima tarefa: E01-T04, movimento básico e colisões a timestep fixo, reaproveitando diagnóstico de FPS/física existente.
