# Corridas, campeonato, classificação e pódio

## Campeonato base

- **4 corridas**, cada uma em um dos quatro mapas do lançamento, ordem estabelecida pela sala.
- **8 participantes por corrida:** slots de humanos e bots definidos no início, preservados pelo campeonato.
- **3 voltas por corrida** como padrão configurável.
- Pontuação proposta por posição: `1º=15`, `2º=12`, `3º=10`, `4º=8`, `5º=6`, `6º=4`, `7º=2`, `8º=1`.
- Não concluir corrida sem validar a ordem de checkpoints e voltas. Definir política de DNF/time-out antes dos testes finais.

## Máquina de estados

`CHAMPIONSHIP_LOBBY → RACE_1 → RESULTS_1 → RACE_2 → RESULTS_2 → RACE_3 → RESULTS_3 → RACE_4 → RESULTS_4 → PODIUM → END`.

Cada transição é autorizada pelo serviço de sessão (local ou Rust), nunca apenas pela animação da tela do cliente.

## Critério de desempate

1. Total de pontos.
2. Número de vitórias.
3. Número de segundos lugares (seguido das demais colocações em ordem).
4. Melhor posição na última corrida.
5. Ordem inicial dos slots como último critério estável (evitar resultados diferentes por ordenação de objetos).

## Pódio e resultados

- Pódio em cenário 3D simples, **1º, 2º e 3º** com personagem, kart e animação.
- Exibir tabela final completa com 8 pilotos, posições de cada corrida, pontos por corrida e total.
- Permitir continuar próximo circuito após resultados; tela de transição mostra pista seguinte.
- Dados de itens, posição e pontos vêm de eventos oficiais do servidor no multiplayer.

## Casos especiais

- Desconexão online: bot continua no mesmo slot e seus pontos pertencem ao slot; se houver retorno permitido, o humano reassume.
- Abandono de lobby e abandono de campeonato devem ter regras separadas.
- Se sala encerrar cedo ou não houver jogadores humanos, definir cancelamento controlado com mensagem clara.
- Bots podem vencer e subir ao pódio.

## Aceite

Um campeonato local ou online com 4 pistas sempre termina com **exatamente 8 posições ordenadas**, soma correta, mesma tabela em todos os clientes e pódio exibido sem divergência.
