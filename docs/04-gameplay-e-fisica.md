# Gameplay, dirigibilidade e física

## Núcleo do kart

- Acelerar; frear; ré limitada; esterçar; virar em baixa/alta velocidade com curvas de resposta distintas.
- Drift como ação explícita; carregar mini-boost (faixas iniciais a calibrar).
- Rampas com controle aéreo moderado, aterrissagem responsiva e câmera adaptativa.
- Boosts de pista e de item com duração/força limitadas; acumulação de boosts controlada.
- Colisões simplificadas entre karts e cenário, recuperação automática ao sair da pista.
- Piso com classes (`asphalt`, `dirt`, `slippery`, `offroad`) ajustando aderência/velocidade.
- Assistências opcionais de pilotagem, sem modificar placar arbitrariamente.

**Princípio:** manter o sentimento arcade. Preferir comportamento customizado de kart sobre usar somente simulação realista de rodas/veículo. Rapier fornece corpos, colisão, sensoriamento e consultas de cena.

## Parâmetros editáveis (dados)

`maxSpeed`, `acceleration`, `braking`, `reverseSpeed`, `steeringCurve`, `grip`, `driftCharge`, `boostPower`, `boostDuration`, `airControl`, `recoveryDelay`, `collisionResponse`. Registrar unidades e limites seguros.

## Itens do MVP (nomes e efeitos provisórios)

| Item | Efeito | Defesa/limite |
|---|---|---|
| Impulso turbo | Aceleração curta do portador | Não atravessar paredes |
| Projétil leve | Afeta alvo à frente por breve período | Sinal visual/sonoro e tempo de recuperação |
| Armadilha de pista | Obstáculo pequeno colocado atrás | Tempo de vida e limite de ativos |
| Escudo temporário | Bloqueia uma ocorrência | Duração curta, indicador visível |

As probabilidades de item por posição são configuradas e **auditadas**. O servidor online decide concessão, consumo e impacto relevante; o cliente anima a consequência. Testar efeito de "borracha elástica" cuidadosamente para não invalidar habilidade.

## Câmera e feedback

Terceira pessoa acompanhando o kart, amortecimento de movimentos, FOV dinâmico moderado no boost e alternativa com efeitos reduzidos. Feedback por partículas econômicas, áudio, pequenas oscilações de câmera (desativáveis), rastros de drift e HUD de item/posição/volta.

## Critérios de bom gameplay

- Pilotagem estável em 30 e 60 FPS graças a timestep fixo.
- Jogador consegue sentir diferença entre curva normal e drift.
- Rampas, salto e aterrissagem não causam travamento ou atravessamento comum.
- Item nunca é usado duas vezes pelo mesmo evento.
- Regras de pista e kart expostas como configuração, não números espalhados.

## Ajustes a validar em playtest

Velocidade máxima, duração da volta, tamanho de atalhos, quanto drift compensa, tempo de recuperação de hit, frequência de itens e equilíbrio entre líder e retardatário.

## Protótipo implementado — E01-T04

`apps/web/src/driving.ts` concentra os ajustes iniciais; `physics.ts` aplica inputs em Rapier a 60 Hz. Há aceleração, frenagem, ré limitada, arrasto, aderência e direção proporcional à velocidade, com rotação apenas em yaw e CCD. Gravidade e colisão vertical continuam no motor; tração depende de apoio por raycast. São parâmetros de protótipo, sem balanceamento final.

WASD/setas funcionam com a cena focada; Espaço freia e R reposiciona. Botões sobre a cena aceitam aceleração e direção simultâneas por ponteiros; entradas são limpas ao pausar, perder foco ou ocultar a página. O velocímetro e o relatório expõem diagnóstico da física. Há reset manual e recuperação básica após queda abaixo de -8 m, sem progresso de corrida para preservar ainda.

Testes com Rapier cobrem aceleração, freio, ré, guardrails, esterçamento e circuito completo com rampas usando apenas inputs. O driver roteirizado do teste não é um bot do produto. Drift, boosts, itens, superfícies especiais e controles aéreos ainda estão pendentes, assim como playtest de dirigibilidade no Android físico.

## Controlador web — E02-T01 — 2026-11-14

`controlKart` em `driving.ts` calcula yaw/velocidade de forma pura; `physics.ts` mantém o corpo Rapier/CCD e timestep de 1/60 s. O modelo Cart.fbx é apenas visual, normalizado para o colisor existente.

Drift explícito por Shift ou botão de toque: avanço mínimo 4 m/s, aderência 2,2/s e multiplicador de giro 1,3; sem mini-boost. Freio/ré desativam o drift e soltar restaura a aderência 12/s. Conserva momento lateral, com teto de velocidade horizontal de 12 m/s. Parâmetros de protótipo, ainda sujeitos a playtest.

Direção no ar limitada a 0,65 rad/s; trajetória recebe 35% desse giro. Acelerar não adiciona propulsão no ar, e a magnitude horizontal/componente vertical são preservadas pelo controlador; Rapier aplica gravidade, contato e aterrissagem. Drift não fica ativo no ar. Reset/pausa/blur/ocultação continuam limpando as entradas. O relatório expõe `drifting` e `airControl`.

Testes automatizados de circuito cobrem subida, trechos aéreos e duas aterrissagens. Ajuste fino, mini-boost, efeitos de drift, itens, superfícies especiais e etapas de corrida continuam nos respectivos marcos.
