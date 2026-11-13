# Visão, público e limites

## Objetivo
Criar um jogo original de karts 3D cartoon para entrar rapidamente em corridas competitivas, com surpresas, ultrapassagens e disputas entre amigos, preservando jogabilidade justa e legível.

## Experiência desejada

- **Fácil de iniciar:** menu enxuto, escolha de personagem e kart, singleplayer ou sala online.
- **Difícil de dominar:** curvas, drift, linhas de corrida, rampas, uso oportuno de itens e atalhos.
- **Recuperação e caos controlado:** power-ups dão chance de reação sem transformar sempre a liderança em punição.
- **Sessões fechadas:** campeonato composto por quatro corridas com placar acumulado e pódio.
- **Acessível:** recursos gráficos escaláveis, controle personalizável e HUD de alto contraste.

## Modos

| Modo | Humanos | Bots | Regras |
|---|---:|---:|---|
| Treino local | 1 | 0 a 7 configuráveis | Uma pista, sem campeonato |
| Corrida local | 1 | 7 | Uma corrida completa |
| Campeonato local | 1 | 7 | Quatro corridas, classificação total |
| Corrida online | 1 a 8 | Complemento até 8 | Sala e resultado de uma prova |
| Campeonato online | 1 a 8 | Complemento até 8 | Mesma composição de 8 pilotos nas 4 provas, salvo desconexão |

**Decisão inicial:** convidados/late join no meio da corrida ficam fora do MVP; uma desconexão durante a prova permite reassumir o mesmo slot por janela limitada, ou um bot assume o volante.

## Escopo do MVP

Quatro pistas originais, elenco inicial pequeno com placeholders originais, 8 karts em prova, drift/boost, itens básicos, bots, multiplayer via WebSocket, torneio e pódio. Os elementos de propriedade intelectual de terceiros só entram quando forem licenciados.

## Critérios de sucesso

1. O jogador entende acelerar, dirigir, driftar e usar item sem tutorial longo.
2. Uma corrida local e uma corrida online concluem, inclusive com bots.
3. O placar de campeonato é igual para todos os clientes conectados.
4. Todos os controles suportados funcionam nos destinos declarados.
5. Uma pessoa consegue identificar claramente o estado da corrida e quem ganhou.

## Não objetivos nesta versão

Licenças automáticas de influenciadores, geração 3D automatizada em runtime, loja virtual, voz, matchmaking ranqueado, servidores massivos, IA generativa durante a partida e exploração de mapa aberto.

## Regras de originalidade

Inspirar-se em **gênero e sensações** de jogos arcade, sem copiar nomes, personagens, circuitos, símbolos, artes, músicas, itens distintivos ou interface reconhecível de outra franquia. Criar marca, identidade de itens e circuito próprios.

## Aceite do escopo inicial — 2026-11-13

O usuário confirmou o MVP documentado e as prioridades P0/P1 de `15-backlog-e-riscos.md`: oito pilotos, quatro pistas, três voltas por padrão, modos locais/online e campeonato. Pontuação e desempates de `08-campeonato-e-progressao.md` aprovados como base. Ajustes de balanceamento e políticas ainda explicitamente abertas serão definidos nas respectivas etapas; esta aprovação não declara funcionalidades implementadas.
