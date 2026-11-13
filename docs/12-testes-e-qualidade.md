# Qualidade, desempenho e critérios de aceite

## Pirâmide de testes

1. **Unitários:** pontos, desempate, grafo de checkpoints, cooldowns, estados, bots e serialização.
2. **Integração:** lobby, entrada, desconexão, resume, troca de pista, resultados e atualização de clients.
3. **End-to-end:** uma corrida completa solo, corrida 3 humanos + 5 bots, campeonato de 4 corridas, pódio.
4. **Visuais/manuais:** câmera, jitter, clipping, responsividade do HUD, glitches em física, legibilidade dos itens.
5. **Performance e rede:** FPS, memória, draw calls, latência, largura de banda, CPU e RAM servidor.

## Matriz inicial

| Plataforma | Perfil | Testes específicos |
|---|---|---|
| Chrome/Chromium desktop | PC com e sem GPU dedicada | WebGL2, teclado, gamepad, FPS |
| Firefox desktop | PC de referência | Render, gamepad, WebSocket |
| Tauri Windows | WebView2 | Fullscreen, controles, som, foco |
| Tauri Linux | WebKitGTK | WebGL2, codecs, controle, GPU |
| Tauri Android | aparelho de entrada e intermediário | FPS 30 alvo, toque, retomada, temperatura |
| Multiplataforma | cliente misto | sincronização, regras, pódio uniforme |

## Métricas iniciais propostas

- 60 FPS desktop / 30 FPS Android em cenas-alvo; considerar 1% low e travadas de carregamento, não só média.
- Oito pilotos, efeitos e UI simultâneos; medir nas quatro pistas.
- Latência de controle local sem depender de rede.
- Snapshots sem saltos visíveis constantes em 80–150 ms simulados; comportamento degradado e compreensível em 250 ms.
- Testes de até 8 humanos e vários lobbies simultâneos em ambiente reproduzível.
- Limites de RAM, CPU, banda e tamanho de download serão fixados após o **primeiro benchmark real**, não arbitrariamente.

## Critérios de bloqueio para publicação

Crash frequente, perda de resultados, itens duplicados, checkpoints burláveis de forma simples, circuito que IA não conclui, travamentos em Android de referência, uso de imagem sem permissão ou divergência no pódio.

## Evidência de aceite

Salvar no documento da etapa: plataforma, build/commit, cenário, resultados observados, vídeos/screenshots de teste quando úteis, problemas abertos e decisão `aprovado/reprovado`. Evitar confundir teste planejado com teste executado.

## Evidência de contratos locais/remotos — Etapa 00

`tests/local-session.test.ts` usa autoridade roteirizada para ciclo, inputs, atomicidade, finalização, aborto e falhas de limpeza/listeners. Um mesmo fluxo de snapshots/eventos é aplicado por LocalRaceSession e RemoteRaceSession, conferindo igualdade dos eventos observados e imutabilidade do estado. Esses testes não comprovam checkpoints percorridos, bots ou corrida física.

`npm run check` totaliza 54 testes TS e checagem estrita dos pacotes. `npm run check:spike` também passa após a extração do validador de input para game-core: codec WebSocket Node, adapter remoto/Rust e handshake Chromium. Dispositivos Android e desempenho continuam sem evidência real.
