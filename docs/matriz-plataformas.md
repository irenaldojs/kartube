# Matriz de validação por plataforma

Data-base: 2026-11-13. Esta matriz define a cobertura mínima de E00-T05; uma linha planejada não equivale a compatibilidade aprovada. O aceite abaixo cobre a cena técnica atual, sem estender resultados para uma corrida completa.

## Ambientes e evidências

| Ambiente | Dispositivo / renderizador | Escopo executado | Resultado | Pendência |
|---|---|---|---|---|
| Chromium headless / Linux | SwiftShader, renderização por software | Build, cena/pixels, colisão, pausa/120 passos, liberação/reinício, perda de contexto, viewport móvel, fallback sem WebGL2/WASM | Aprovado em execução local automatizada | Não representa GPU física ou Android |
| Chrome 157 / Windows | PC do usuário, Microsoft Basic Render Driver | Relatórios de execução WebGL2/WASM e colisão; 32 FPS amostrados, perfil equilibrado, pixelRatio 1 | Execução básica confirmada por relatório | Modelo do PC, GPU acelerada e demais testes manuais |
| Chrome 157 / Android físico | Samsung Galaxy S20 FE, Adreno 650 | Execução, colisão, pausa, 120 passos, retomada, liberação/reinício | Prova básica aprovada pelo usuário; 60.4 FPS amostrados, perfil equilibrado, pixelRatio 1.5 | Versão real do Android, build/commit e perda forçada de contexto |
| Chrome / Android de entrada | Aparelho a selecionar | Mesmo roteiro, perfil leve, carregamento e sessão prolongada | Planejado | Dispositivo e execução |
| Firefox / desktop | PC a selecionar | Cena, WASM, redimensionamento e roteiro manual | Planejado | Dispositivo e execução |
| Tauri Windows / WebView2 | PC a selecionar | Mesmo build web, carregamento WASM, foco, áudio, controles e descarte | Planejado | Empacotamento e execução na etapa 01 |
| Tauri Linux / WebKitGTK | PC a selecionar | Mesmo build web, GPU, WASM, foco, áudio e controles | Planejado | Empacotamento e execução |
| Tauri Android / WebView | S20 FE como primeiro candidato | Mesmo build, WASM, toque, pausa/retomada, áudio e recursos | Planejado | APK/build e teste físico; Chrome não valida WebView |

A identificação do S20 FE foi fornecida pelo usuário. O user agent reduzido informa Android 10; a versão real do sistema não foi confirmada. Os resultados manuais foram relatados pelo usuário nesta sessão, sem observação remota do agente e sem commit/build identificado.

## Conjunto mínimo automatizado

- `npm run check`: tipos estritos e testes dos contratos, sessões local/remota, protocolo e pistas/checksum.
- `npm run check:spike`: WebSocket Node/Chromium contra Rust e handshake do adapter remoto.
- Rust: `cargo fmt --manifest-path apps/server/Cargo.toml --check`, `cargo clippy --locked --manifest-path apps/server/Cargo.toml -- -D warnings` e `cargo test --locked --manifest-path apps/server/Cargo.toml`.
- `npm run check:web`: build e smoke da cena em Chromium. Captura e relatório em `/tmp/kartube-webgl.png` e `/tmp/kartube-webgl-report.json`; CI configurada para armazená-los.

## Roteiro manual da cena técnica

1. Registrar dispositivo, sistema real, navegador/WebView, build/commit e perfil gráfico.
2. Abrir a cena e verificar WebGL2/WASM ativos, kart visível e estabilização em bodyY entre 0.30 e 0.40.
3. Pausar: status paused, physicsSteps estável. RenderFrames pode continuar aumentando.
4. Avançar 120 passos: physicsSteps aumenta exatamente 120 e a cena continua íntegra.
5. Retomar: status running e physicsSteps volta a aumentar.
6. Liberar recursos: canvas desaparece, status disposed e resourcesReleased true.
7. Reiniciar: apenas um canvas, kart cai novamente e volta a estabilizar. Repetir liberação/reinício duas vezes.
8. Trocar para perfil leve: pixelRatio no máximo 1 e cena funcional. Verificar layout sem rolagem horizontal e controles acessíveis.
9. Alternar entre aplicativo/aba e cena: observar retomada sem salto prolongado da simulação. Registrar falhas separadamente.
10. Na pista dirigível, segurar acelerar e só depois pressionar direção com outro dedo. Soltar apenas direção deve manter aceleração; testar o lado oposto, soltar apenas acelerar e cancelar/soltar o último dedo. O teste de queda Android anterior não comprova a pilotagem multitouch do novo build.
11. Exportar relatórios e anotar quais passos passaram ou falharam. FPS é uma amostra, sem equivaler a média sustentada ou 1% low.

Perda forçada de contexto e ausência de WebGL2/WASM são cobertas no smoke desktop. Repeti-las no Android exige instrumentação própria; troca de aplicativo ou bloqueio de tela não comprova perda de contexto. Esses casos não foram atribuídos à confirmação manual do usuário.

## Critérios por fase

- **E00-T05:** conjunto mínimo e matriz definidos, Android físico identificado e evidências separadas de testes planejados. Concluída; ampliar aparelhos é execução contínua da matriz.
- **E00-T06:** microprova WebSocket browser/Rust e carregamento WebGL2/WASM em Android físico comprovados. Concluída com as evidências atuais. Tauri permanece no protótipo da etapa 01.
- **Etapa 01:** kart dirigível, pista cinza, câmera e build Tauri Android; registrar resultado real, inclusive bloqueios. GLB, áudio e input conforme os critérios do protótipo e ADR-0003.
- **Etapas de qualidade:** medir corrida com oito pilotos, efeitos e UI, memória total, temperatura, tempo de carregamento, FPS sustentado e travadas. A cena mínima atual não comprova essas metas.

Antes de aprovar uma plataforma para distribuição, todos os testes aplicáveis ao produto implementado devem passar no ambiente correspondente; falhas e exclusões precisam de registro explícito. A partir da E01-T05, relatórios disposed usam memorySample after-release e mostram contadores do renderer após descarte; relatórios antigos continham a última amostra ativa. O campo release detalha recursos registrados e mundo físico liberados. Isso não comprova RAM total, memória do driver ou redução do heap WASM compartilhado.
