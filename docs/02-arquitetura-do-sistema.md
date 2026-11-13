# Arquitetura do sistema

## Três módulos distribuíveis e pacotes internos

| Parte | Responsabilidade | Não deve assumir |
|---|---|---|
| `apps/server` (Rust) | Salas, lobby, relógio de partida, slots, bots online, validações, inventário, regras de pontuação e resultados | Renderizar 3D ou hospedar física gráfica completa no MVP |
| `apps/web` (TS) | Jogo, câmera, renderizador, física local, UI/HUD, áudio, menu e adaptação dos controles | Definir classificação online sozinho |
| `apps/native` (Tauri 2) | Empacotar o build da web; ciclo de vida, segurança e APIs nativas necessárias | Duplicar motor de jogo ou servidor |
| `packages/game-core` (TS) | Regras puras compartilhadas entre singleplayer e cliente online (corrida, progressão, itens, interfaces) | Acessar navegador, WebSocket ou Tauri diretamente |
| `packages/protocol` (TS e schema gerador/compatível com Rust) | Contratos tipados, versionamento, validação dos pacotes | Depender de bibliotecas visuais |
| `packages/game-data` (TS/JSON) | Pistas, checkpoints, itens, parâmetros, elenco, IDs estáveis | Conter lógica de renderização |

**Observação:** os caminhos são a **estrutura futura planejada**; ainda não há pastas de código.

## Fluxo local e remoto

```text
                     ┌─────────────────────────────┐
 Input ──────────────►│ Game Core (regras de corrida)│
                     └──────────┬──────────────────┘
                                │
                     ┌──────────▼──────────────────┐
                     │ Simulação/física e visão TS  │──► Three.js, áudio, HUD
                     └──────────┬──────────────────┘
                                │
      Singleplayer: agente local┤
      Online: NetAdapter ◄─────►│ WebSocket ◄─────► Servidor Rust
```

## Fronteiras obrigatórias

- `InputAdapter`: fornece ações normalizadas sem conhecer origem (teclado/gamepad/touch/mouse).
- `RaceSession`: abstrai partida local ou sala online; estado da corrida lido por uma interface única.
- `RaceRules`: calcula posições, checkpoints, voltas, penalidades e pontuação em termos de dados, sem dependência de Three.js.
- `KartController`: comanda física local; parâmetros configuráveis, simulação em passo fixo e correção de rede quando online.
- `BotController`: decide direção, aceleração, drift e itens por interfaces comuns aos humanos.
- `AssetRegistry`: referencia IDs de GLB, texturas, sons e licenças; carrega sob demanda.
- `PlatformAdapter`: fullscreen, armazenamento, gamepad, ciclo de vida e permissões sem invadir gameplay.

## Relógios, simulação e apresentação

- Simulação local em **passo fixo** (inicialmente avaliar 60 Hz), com renderização desacoplada da frequência da tela.
- Servidor de salas em ticks controlados (proposta inicial: 20 Hz de estado); taxa real definida após perfis e benchmarks.
- Snapshots de jogadores remotos interpolados no cliente; extrapolação curta e limitada, com correção suave.
- Não usar relógio local como fonte final de tempo de volta no online; o servidor estabelece início, validade de checkpoints e chegada.
- Física local não exige lockstep determinístico perfeito entre Rust, WASM e Android.

## Autoridade e anti-cheat pragmático

Servidor aceita **inputs/intenção e eventos**, e valida limites de velocidade, sequenciamento de checkpoints, tempos mínimos plausíveis, disponibilidade de item e ordem de chegada. Sem simular todas as forças de contato, isso é **anti-cheat parcial**. Aumentar a autoridade por segmento é um plano de evolução se testes mostrarem fraude ou descompasso.

## Falhas e recuperação

Cliente perde a conexão → UI informa status e tenta reconectar dentro de uma janela definida. Slot não muda de dono durante a tentativa; após expirar, bot assume. No campeonato, manter identidade/posição do slot. Sala finaliza com resultado imutável; após uma corrida, transita para próxima pista sem criar um campeonato novo.

## Dependências

Ver [Online](06-online-e-protocolo.md), [Dados](16-formato-dados.md), [Testes](12-testes-e-qualidade.md) e [ADR-0002](decisoes/ADR-0002-sincronizacao.md).
