# Etapa 01 — Protótipo visual 3D

> **Estado:** Em andamento · **Execução:** iniciada em 2026-11-13

## Dependências

Etapa 00.

## Objetivo

Validar Three.js, Rapier, câmera e pipeline básico de render em uma pista cinza.

## Tarefas (a realizar)

- [x] E01-T01 — Criar estrutura de código planejada e primeiro boot com seleção de qualidade gráfica.
- [ ] E01-T02 — Exibir pista cinza fechada com linha de largada, chão, guardrails, rampas, boosts, caixa de item e alternativa em geometria simples.
- [ ] E01-T03 — Carregar kart placeholder por cena GLB ou geometria provisória, câmera em terceira pessoa e sombras de baixo custo.
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
- Referência de commit/PR: **—**
- Testes executados e ambiente: **—**
- Evidências de aprovação: **—**
- Pendências / riscos: **—**
- Data de conclusão: **—**

### E01-T01 — Estrutura e boot — 2026-11-13

- Reaproveitada a estrutura validada na microprova: `apps/web` com Vite/TypeScript, boot em `src/main.ts`, renderização em `src/view.ts` e física em `src/physics.ts`.
- Perfis leve/equilibrado selecionáveis; troca reinicializa a cena e libera os recursos anteriores. Boot assíncrono trata falhas de WebGL2/WASM e permite reinício. Scripts de desenvolvimento, build e smoke disponíveis na raiz.
- E01-T01 concluída com a implementação existente, sem duplicar o laboratório. Verificação: `npm run check:web` (tipos, build e smoke Chromium).
- Próxima tarefa: E01-T02, pista cinza fechada com os elementos de geometria provisória. Kart dirigível, câmera de acompanhamento e Tauri ainda não implementados.
