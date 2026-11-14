# Física arcade do Kartube

Decisão do usuário em 2026-11-14: diversão e previsibilidade, com kart representado por um corpo invisível e regras matemáticas. Esta especificação substitui os parâmetros iniciais de aderência/slip dos protótipos anteriores.

## Implementação atual

| Pilar | Regra do Kartube |
|---|---|
| Corpo | Colisor arredondado 1,8 × 0,7 × 2,8 m, varredura contínua por consulta, sem corpo dinâmico ou solver. Um proxy cinemático acompanha a pose apenas para consultas. Cart.fbx apenas visual. |
| Aceleração | Curva linear de 12 m/s² até teto rígido de 12 m/s (43,2 km/h), cerca de 1 s a partir do repouso. Velocidade comandada é um estado escalar independente das amostras de contato de Rapier, impedindo realimentação oscilatória no teto. Sem marchas, RPM ou aerodinâmica. |
| Direção | Yaw direto por tick, sem filtro temporal da entrada. Giro varia de 1,75 rad/s em baixa para 1,25 rad/s no teto; não gira parado. Velocidade horizontal acompanha a direção diretamente. |
| Drift | Estado com lado escolhido na pressão de Shift + direção + acelerador, a partir de 4 m/s. Direção abre/fecha a curva sem trocar o lado. O chassi gira visualmente até 0,38 rad para dentro; o vetor físico não simula atrito ou slip de pneu. Velocidade não se perde só por virar. |
| Mini-turbo | Primeiro estágio: 1 s de drift apoiado com acelerador; aviso TURBO PRONTO. Soltar Shift ainda apoiado/acelerando concede 0,65 s com teto/velocidade-alvo de 15 m/s (54 km/h). Sem acúmulo de duração; freio/ré cancelam. Teto normal volta rigidamente ao expirar. |
| Solo | Três consultas verticais de chão (centro/frente/traseira). O código próprio mantém o centro a 0,35 m da superfície, acompanha pequenos desníveis e integra quedas/aterrissagens; não há reação de contato do motor. |
| Ar | Gravidade calculada pelo controlador: pista -30 m/s², direção moderada sem propulsão; teto horizontal preservado. Drift segurado atravessa o salto sem carregar turbo no ar; soltar no ar cancela sem prêmio. Laboratório técnico mantém -9,81 m/s². |
| Colisão | Rapier retorna fração/normal de uma varredura do colisor contra guardrails. Nosso código limita o deslocamento e aplica repulsão horizontal de 2 m/s por cerca de 10 ticks, cancelando drift/turbo; yaw não é rodado pela batida. Não existem outros karts ainda: repulsão entre pilotos será implementada com eles. |
| Freio/ré | Coeficiente fixo 20 m/s² para frear ou inverter movimento. Ré limitada a 4 m/s; Espaço para em zero, Freio/Ré passa da frenagem para a ré. |
| Visual | Inclinação e ângulo do drift afetam somente o modelo; câmera acompanha a direção real. Não há suspensão/rodas físicas independentes. |

O piso principal usa uma única malha de colisão com vértices compartilhados, gerada da mesma superfície do render. Isso substitui as placas coplanares sobrepostas que produziam emendas físicas. Diagnóstico exporta `commandedSpeed` separadamente do vetor de movimento aplicado, com `integration: custom-arcade` e `rapierSolver: false`.

A simulação própria roda a 60 Hz. Rapier só mantém geometria de consulta; não há `world.step()`, integração de velocidade do Rapier, massas, forças ou impulsos. Os parâmetros acima são escolhas próprias do Kartube e podem ser calibrados após playtest. Corrida, checkpoints, recuperação e abertura de queda continuam ativos; não há assistência que impeça cair.

## Pesquisa e limites da referência

- [Guia hospedado pela Nintendo: drift e mini-turbo em Mario Kart 8 Deluxe](https://www.nintendo.com/jp/ichikara/aabpa/index_en.html): documenta comportamento para o jogador, incluindo manutenção de velocidade na curva e recompensa ao soltar o drift. Não fornece a implementação interna da física.
- [Kart Physics: anatomia do drift arcade, pelo autor do plugin](https://kartphysics.com/blog/how-arcade-kart-drifting-works): referência técnica para estado de drift, escolha do lado, contraesterço e carga/soltura. É outro projeto, não fonte do motor da Nintendo.
- A tabela fornecida pelo usuário é a especificação do projeto. Implementação original, sem usar código/constantes proprietárias de Mario Kart. Apenas o primeiro estágio de mini-turbo está implementado; itens, três estágios, salto por botão e repulsão entre oito pilotos seguem pendentes.

Recuperação de kart preso tolera os recuos curtos da repulsão: 3 s de intenção sem sair de um raio de 1 m. Queda, último checkpoint e relógio preservado continuam como antes.

## Verificação e playtest

Testes cobrem velocidade mantida em curva, yaw imediato, drift visual desacoplado, lado fixo/contraesterço, carga/soltura/cancelamento, teto no solo/ar, freio/ré, rampas/aterrissagens, batidas, queda e três voltas por ambas as rotas. Sucesso automatizado não confirma sensação de diversão: validar dirigibilidade com o usuário antes de considerar o ajuste final.

Validação final: `npm run check`, `npm run check:web` e `npm run check:web:dev` aprovados. Regressão de teto usa 600 ticks com velocidade medida artificialmente oscilante, mantendo comando em 12 m/s; teste Rapier na reta exige amplitude de velocidade <0,01 m/s e altura <0,003 m. Três voltas pelas duas rotas com queda/recuperação continuam aprovadas. Isso não substitui playtest humano nem mede desempenho de GPU física.

## Separação de responsabilidades e câmera

- `driving.ts`: regras matemáticas de aceleração, yaw, drift, frenagem e turbo, sem Rapier.
- `kart-motion.ts`: posição, velocidade, gravidade própria, apoio, aterrissagem e resposta arcade. Integra `posição += velocidade * dt`; recebe uma interface de consultas que também pode ser substituída por testes sem engine.
- `physics.ts`: adaptador de raycasts, shape casts, espaço livre e colisores Rapier; sincroniza somente a pose do proxy e coordena a recuperação. Nenhum solver é chamado.
- `render-pose.ts`: interpola kart/câmera entre os dois últimos ticks para o RAF, incluindo yaw pelo caminho curto. Há até um tick de atraso visual; posição de colisão/checkpoint e leitura de controle não são filtradas.
- `camera.ts`: acompanha diretamente a mesma translação interpolada do kart. Suaviza apenas órbita e altura com resposta exponencial, mantendo distância constante na reta em vez de atrasar posição/alvo no espaço do mundo. Pausa, ocultação, reset e recuperação sincronizam o histórico para não misturar poses antigas.

Testes adicionais: controlador inteiro sem engine, varredura e resposta próprias, e guardas que lançam erro se Rapier criar corpo dinâmico, integrar velocidade ou rodar o solver. Renderização validada em 144 Hz e intervalos irregulares, distância câmera/kart constante, transição de yaw ±π e sincronização de recuperação.

## Direção de câmera arcade — 2026-11-14

Ajuste solicitado após aprovação da base interpolada. A translação usa a mesma pose visual do kart, mantendo estabilidade na reta; a elasticidade atua na órbita (resposta 10/s normal, 6/s em drift), braço e altura, sem voltar ao lerp da posição absoluta no mundo.

- FOV: base 45°, cerca de 50,6° no teto normal de 12 m/s (referência da câmera 15 m/s), 56° no turbo; abertura adicional curta em voo/batida, limitada a 58°. Transições exponenciais por tempo de renderização.
- Banking: base de 0,035 rad, até 0,042 rad (~2,4°) em drift no turbo, suavizado, sem girar a física nem a pista.
- Look-ahead: até 3,5 m com antecipação lateral da curva; mantém o lado do drift ao contraesterçar.
- Voo: braço abre até 0,5 m adicional e câmera sobe até 0,9 m, com redução suave de altura de até 0,2 m pela velocidade, mostrando melhor o salto/aterrissagem.
- Batida real em guardrail: pulso pequeno de FOV por ~0,16 s; sem shake contínuo. Itens/ataques ainda não implementados e não geram eventos fictícios de câmera.
- Movimento reduzido: checkbox na interface, inicializado pela preferência do sistema. Desativa FOV dinâmico, banking, antecipação lateral e efeitos de voo/impacto; mantém pose interpolada. Visão geral permanece fixa em 45°.

Testes: FOV/limites, antecipação, banking, turbo/voo, expiração do pulso de impacto, movimento reduzido, órbita elástica e distância constante em reta sob RAF irregular. Configuração do jogo não representa reprodução do código da Nintendo; conforto e sensação aguardam playtest do usuário.
