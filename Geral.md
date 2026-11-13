# Kartube — Plano geral de desenvolvimento

> **Estado do projeto:** Etapa 00 em andamento | **Versão do plano:** 0.1 | **Data-base:** 2026-11-13  
> Este repositório contém o plano, a estrutura para assets e os contratos TypeScript iniciais. O jogo ainda não foi implementado.

## 1. Visão

Kartube é um jogo original de corrida de karts **3D cartoon**, em TypeScript, pensado para partidas curtas, imprevisíveis e divertidas, com inspiração no ritmo de jogos de corrida arcade. O diferencial pretendido é um elenco de personagens estilizados inspirados em criadores de conteúdo **somente quando houver autorização para uso comercial de imagem, nome e outros atributos aplicáveis**.

O jogo terá **singleplayer e multiplayer online**, ambos com **8 pilotos por corrida**. Vagas não ocupadas por humanos serão preenchidas com bots. O modo principal será um campeonato de **4 corridas**, cada uma em um circuito distinto, com pontos acumulados e pódio para os **3 melhores**.

### Escopo do lançamento inicial

- 4 circuitos originais completos; antes deles, **1 pista cinza de protótipo** (não conta entre as quatro).
- Protótipo com **rampas, caixas de power-up, boosters (aceleradores) e caminho alternativo**.
- Karts com aceleração, frenagem/ré, direção arcade, drift, salto, colisões simplificadas, boost e recuperação após queda.
- Power-ups simples, com regras claras e contrajogo; HUD, contagem regressiva, voltas, posições e resultados.
- 1 a 8 humanos no online, totalizando sempre 8 participantes com bots; singleplayer com 1 humano e 7 bots.
- Entrada pelo navegador e distribuição nativa Tauri para desktop e Android, compartilhando o mesmo jogo TS.
- Teclado, mouse como opção de interação/dirigibilidade configurável, gamepad e controles touchscreen.
- Campeonato de quatro provas e cerimônia de pódio com três posições.

### Fora do escopo inicial

Campanha narrativa, mundo aberto, economia/loja, ranking global competitivo, contas complexas, criação de pistas pelos jogadores, voice chat, cross-save e matchmaking ranqueado. Podem ser estudados após o MVP.

## 2. Princípios de projeto

1. **Diversão acima de simulação realista:** dirigibilidade responsiva e fácil de aprender.
2. **Um jogo, três módulos:** servidor de partidas em Rust, cliente web TS, empacotamento Tauri desktop/Android.
3. **Cliente compartilhado:** o Tauri carrega a mesma aplicação compilada que o navegador; nenhuma segunda implementação do jogo.
4. **Servidor leve, não cego:** mantém estado, tempos, resultados, bots e valida eventos de corrida, sem renderizar cenas 3D.
5. **Jogo offline primeiro, online desde a arquitetura:** as mecânicas dependem de interfaces substituíveis, não de código de rede espalhado.
6. **Pistas e personagens baseados em dados:** assets substituíveis sem alterar regras de jogo.
7. **Documentação viva:** implementar uma etapa exige atualizar os documentos e registrar decisões.
8. **Propriedade intelectual própria:** não reutilizar personagens, pistas, itens, nomes, músicas ou visuais identificáveis de franquias existentes.

## 3. Arquitetura proposta

```text
                       KARTUBE
                      ┌──────────────────────────────┐
 Browser / PWA ───────►│ Cliente TS compartilhado     │
 Tauri Desktop ───────►│ Vite + Three.js + Rapier 3D  │
 Tauri Android ───────►│ corrida, inputs, UI, áudio    │
                      └────────────┬─────────────────┘
                                   │ WebSocket / WSS
                      ┌────────────▼─────────────────┐
                      │ Servidor Rust                │
                      │ salas, sessões, bots online, │
                      │ checkpoints, placar, eventos │
                      └──────────────────────────────┘
```

- **Servidor Rust**: Tokio + Axum, WebSocket, salas em memória no MVP; serviço autoritativo para ocupação de vagas, início/fim de prova, resultados, itens e checkpoints. Não depende de banco de dados inicialmente.
- **Web**: Vite + TypeScript + Three.js (renderização WebGL2) + Rapier 3D/WASM (colisões/física) e HUD desacoplada. Hospedagem estática HTTPS; WebSocket conecta ao serviço Rust.
- **Nativo**: Tauri 2, usando build web comum, integrações mínimas por plataforma e testes antecipados de WebView/controles/áudio em Android.
- **Monorepo iniciado na etapa 00**: `apps/web`, `apps/server`, `apps/native`, `packages/game-core`, `packages/protocol`, `packages/game-data`; os três pacotes de contratos já existem; os aplicativos serão criados conforme as etapas.
- **Multiplayer**: inputs e snapshots com interpolação; jogador local com resposta imediata, correção quando necessário. O servidor valida regras e resultados. Evitar prometer física determinística idêntica entre dispositivos.

A definição de responsabilidades e os riscos estão em [Arquitetura](docs/02-arquitetura-do-sistema.md) e [Multiplayer](docs/06-online-e-protocolo.md).

## 4. Regras de campeonato inicialmente propostas

- Cada campeonato tem **4 corridas**, 3 voltas por corrida como **valor inicial configurável**.
- Pontos do 1º ao 8º: **15, 12, 10, 8, 6, 4, 2, 1** (proposta a validar em playtest).
- A classificação geral soma a pontuação das quatro provas.
- Empates: mais vitórias; depois mais segundos lugares; depois melhor posição na última prova; persistindo empate, desempate estável por identificador/ordem de inscrição (regra técnica documentada).
- Ao final, os três melhores aparecem no pódio; pilotos controlados por IA também podem ocupar o pódio.

## 5. Ordem de desenvolvimento

| Etapa | Objetivo | Saída verificável |
|---|---|---|
| 00 | Fundamentos, requisitos e riscos | Contratos, critérios e decisões iniciais |
| 01 | Pista cinza e renderização | Kart trafega na pista com câmera 3D |
| 02 | Pilotagem e regras locais | Voltas, checkpoints, colisão e conclusão |
| 03 | Bots locais | 8 pilotos completam corridas em singleplayer |
| 04 | Power-ups e diversão | Rampas, boosts, itens e caminho alternativo funcionais |
| 05 | Servidor Rust e salas | Humano entra e sai de uma sala online |
| 06 | Corrida online híbrida | Até 8 humanos/bots sincronizados e resultados validados |
| 07 | Campeonato | 4 corridas, pontuação total, pódio |
| 08 | Personagens e identidade visual | Pipeline de glTF/GLB, rig padrão e skins licenciadas |
| 09 | 4 circuitos de lançamento | Pistas variadas, testadas e balanceadas |
| 10 | Inputs e distribuição | Teclado, mouse, gamepad, toque, navegador, Tauri/Android |
| 11 | Qualidade e publicação | Testes, otimização, observabilidade e builds candidatos |

**Ordem de dependência**: 00→01→02→03→04→05→06→07→08→09→10→11. Experimentos de risco devem acontecer antes: **testar WebGL2/Tauri Android na etapa 01** e **conexão WebSocket real na etapa 00/01**. É permitido desenvolver arte e protótipos em paralelo, mas nunca declarar uma etapa concluída sem os testes previstos.

**Detalhamento:** [índice dos documentos](docs/INDICE.md) · [etapas executáveis](docs/etapas/README.md) · [controle de andamento](docs/ANDAMENTO.md).

## 6. Metas de qualidade (hipóteses, não garantias)

- Desktop de referência: **60 FPS** sustentados, com perfil gráfico ajustável; Android de entrada definido em teste: **30 FPS** sustentados.
- Partidas com 8 participantes; testar redes com latência, perda de pacotes, reconexão e quedas de FPS.
- Aceleração, drift e itens devem ser compreensíveis em até uma partida de treino.
- Corrida e campeonato devem funcionar integralmente sem conexão no singleplayer.
- Assets 3D em GLB/glTF, LOD/instancing e compressão conforme medições reais.
- Critérios técnicos numéricos finais dependem de benchmark em dispositivos-alvo; registrar os aparelhos e resultados.

## 7. Como trabalhar com agentes de código

1. Antes de cada tarefa, ler `Geral.md`, `docs/INDICE.md`, `docs/ANDAMENTO.md` e a etapa ativa.
2. Não implementar atividades de etapas posteriores sem registrar dependência, justificativa e decisão.
3. Ao adicionar ou alterar API, regra, asset, contrato ou responsabilidade, atualizar o documento de domínio correspondente.
4. Ao concluir uma tarefa, anexar evidências/testes no arquivo da etapa e registrar mudanças em `docs/CHANGELOG.md`.
5. Mudança arquitetural significativa exige ADR em `docs/decisoes/`.
6. Atualizar o estado da etapa **somente após** cumprir critérios de aceite; nunca marcar concluído apenas por gerar código.

## 8. Próximo marco

**Etapa 00 em andamento.** Monorepo npm e contratos iniciais criados; validações de Rust/WebSocket, Android e aceitação dos ADRs permanecem pendentes. Consulte o registro da etapa para evidências.
