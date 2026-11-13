# ADR-0003 — Three.js, Rapier 3D e WebGL2

- **Estado:** Proposto
- **Data:** 2026-11-13

## Contexto
Objetivo: visual 3D estilizado em TS com suporte a navegador e empacotamento Tauri desktop/Android.

## Decisão proposta
Three.js para renderização com WebGL2 e GLB; Rapier 3D/WASM para colisões e integração física; controlador de kart arcade próprio; renderização e física isoladas por interfaces.

## Alternativas
Babylon.js, PlayCanvas, motor nativo ou WebGPU exclusivo. WebGPU fica como evolução, não requisito, por diversidade de WebViews.

## Consequências
Flexibilidade e reuso, porém necessidade de construir câmera, editor de pista/pipeline e perfis de performance. Rapier não entrega dirigibilidade arcade ideal sem código de controle.

## Validação necessária
Pista cinza rodando em navegador desktop, Tauri desktop e Android real; física estável, loading de GLB, áudio, input, FPS e uso de memória medidos. Revisar decisão se Android falhar de forma recorrente.

## Evidência parcial — 2026-11-13

`apps/web` comprova inicialização WebGL2 e Rapier/WASM, renderização, colisão com passo fixo e descarte/reinício em Chromium headless com SwiftShader (`npm run check:web`). O relatório exporta versões, GPU, FPS e contagem de recursos gráficos. Isso não aceita o ADR: Tauri, GLB, áudio e input continuam sem a prova exigida acima.

No S20 FE físico (Adreno 650/Chrome 157), o usuário forneceu relatórios com WebGL2/WASM ativos, bodyY 0.349 e FPS amostrado 60.4 em perfil equilibrado/pixelRatio 1.5; confirmou pausa, 120 passos, retomada e liberação/reinício. Isso valida a cena mínima nesse aparelho. Perda forçada de contexto em Android e benchmark de corrida permanecem pendentes.

## Revisão de fundamentos — 2026-11-13

Three.js/WebGL2 e Rapier/WASM ficam selecionados para implementar o protótipo 3D, sustentados pelo smoke desktop e pela prova física no S20 FE. O estado permanece Proposto para o conjunto completo de plataformas e pipeline. A etapa 01 deve validar câmera/movimento, isolamento de malhas/colisores e build Tauri Android, registrando também bloqueios. GLB, áudio, input e medições de memória/desempenho do cenário jogável continuam critérios de aceite; o FPS da cena de queda não os substitui.
