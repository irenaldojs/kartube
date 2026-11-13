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
