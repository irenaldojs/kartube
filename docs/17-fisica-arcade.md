# Física arcade do Kartube

Decisão do usuário em 2026-11-14: diversão e previsibilidade, com kart representado por um corpo invisível e regras matemáticas. Esta especificação substitui os parâmetros iniciais de aderência/slip dos protótipos anteriores.

## Implementação atual

| Pilar | Regra do Kartube |
|---|---|
| Corpo | Caixa arredondada invisível 1,8 × 0,7 × 2,8 m, CCD, sem rotação física por torque/capotamento. Cart.fbx apenas visual. |
| Aceleração | Curva linear de 12 m/s² até teto rígido de 12 m/s (43,2 km/h), cerca de 1 s a partir do repouso. Velocidade comandada é um estado escalar independente das amostras de contato de Rapier, impedindo realimentação oscilatória no teto. Sem marchas, RPM ou aerodinâmica. |
| Direção | Yaw direto por tick, sem filtro temporal da entrada. Giro varia de 1,75 rad/s em baixa para 1,25 rad/s no teto; não gira parado. Velocidade horizontal acompanha a direção diretamente. |
| Drift | Estado com lado escolhido na pressão de Shift + direção + acelerador, a partir de 4 m/s. Direção abre/fecha a curva sem trocar o lado. O chassi gira visualmente até 0,38 rad para dentro; o vetor físico não simula atrito ou slip de pneu. Velocidade não se perde só por virar. |
| Mini-turbo | Primeiro estágio: 1 s de drift apoiado com acelerador; aviso TURBO PRONTO. Soltar Shift ainda apoiado/acelerando concede 0,65 s com teto/velocidade-alvo de 15 m/s (54 km/h). Sem acúmulo de duração; freio/ré cancelam. Teto normal volta rigidamente ao expirar. |
| Solo | Três sondas verticais no corpo (centro/frente/traseira), restritas a vias/rampas, alcance 0,46 m. Apoio descendente aplica velocidade vertical -2 m/s; subida da rampa preserva componente vertical positiva. Piso e kart sem atrito físico, evitando misturar fricção real com regras arcade. |
| Ar | Gravidade da pista -30 m/s², direção moderada sem propulsão; teto horizontal preservado. Drift segurado atravessa o salto sem carregar turbo no ar; soltar no ar cancela sem prêmio. Laboratório técnico mantém -9,81 m/s². |
| Colisão | Rapier impede atravessamento. Sonda à frente contra guardrails aplica repulsão horizontal de 2 m/s por 10 ticks e cancela drift/turbo; yaw não é rodado pela batida. Não existem outros karts ainda: repulsão entre pilotos será implementada com eles. |
| Freio/ré | Coeficiente fixo 20 m/s² para frear ou inverter movimento. Ré limitada a 4 m/s; Espaço para em zero, Freio/Ré passa da frenagem para a ré. |
| Visual | Inclinação e ângulo do drift afetam somente o modelo; câmera acompanha a direção real. Não há suspensão/rodas físicas independentes. |

O piso principal usa uma única malha de colisão com vértices compartilhados, gerada da mesma superfície do render. Isso substitui as placas coplanares sobrepostas que produziam emendas físicas. Diagnóstico exporta `commandedSpeed` separadamente da velocidade medida.

O corpo usa Rapier a 60 Hz para contato/gravidade, não um simulador automotivo. Os parâmetros acima são escolhas próprias do Kartube e podem ser calibrados após playtest. Corrida, checkpoints, recuperação e abertura de queda continuam ativos; não há assistência que impeça cair.

## Pesquisa e limites da referência

- [Guia hospedado pela Nintendo: drift e mini-turbo em Mario Kart 8 Deluxe](https://www.nintendo.com/jp/ichikara/aabpa/index_en.html): documenta comportamento para o jogador, incluindo manutenção de velocidade na curva e recompensa ao soltar o drift. Não fornece a implementação interna da física.
- [Kart Physics: anatomia do drift arcade, pelo autor do plugin](https://kartphysics.com/blog/how-arcade-kart-drifting-works): referência técnica para estado de drift, escolha do lado, contraesterço e carga/soltura. É outro projeto, não fonte do motor da Nintendo.
- A tabela fornecida pelo usuário é a especificação do projeto. Implementação original, sem usar código/constantes proprietárias de Mario Kart. Apenas o primeiro estágio de mini-turbo está implementado; itens, três estágios, salto por botão e repulsão entre oito pilotos seguem pendentes.

Recuperação de kart preso tolera os recuos curtos da repulsão: 3 s de intenção sem sair de um raio de 1 m. Queda, último checkpoint e relógio preservado continuam como antes.

## Verificação e playtest

Testes cobrem velocidade mantida em curva, yaw imediato, drift visual desacoplado, lado fixo/contraesterço, carga/soltura/cancelamento, teto no solo/ar, freio/ré, rampas/aterrissagens, batidas, queda e três voltas por ambas as rotas. Sucesso automatizado não confirma sensação de diversão: validar dirigibilidade com o usuário antes de considerar o ajuste final.

Validação final: `npm run check`, `npm run check:web` e `npm run check:web:dev` aprovados. Regressão de teto usa 600 ticks com velocidade medida artificialmente oscilante, mantendo comando em 12 m/s; teste Rapier na reta exige amplitude de velocidade <0,01 m/s e altura <0,003 m. Três voltas pelas duas rotas com queda/recuperação continuam aprovadas. Isso não substitui playtest humano nem mede desempenho de GPU física.
