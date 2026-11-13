# Bots e dificuldade

## Dois ambientes, uma política de pilotagem

- **Local:** IA produz as mesmas ações normalizadas do jogador e usa a física local.
- **Online:** servidor calcula trajetória/progresso aproximados e eventos do bot; clientes só exibem snapshots. Esse controlador não precisa executar renderização ou malha detalhada.
- **Dados de pista compartilhados:** waypoints, curvas, velocidades recomendadas, links de atalhos, locais de boost e zonas de item.

## Modelo de comportamento

1. Seguir spline/waypoints em ordem com look-ahead proporcional à velocidade.
2. Ajustar aceleração e freio pela curvatura/risco das regiões seguintes.
3. Escolher um corredor de ultrapassagem quando um kart mais lento bloquear a linha.
4. Selecionar rota principal/atalho pelo perfil e probabilidade configurável.
5. Aplicar drift e usar itens conforme situação e cooldown.
6. Recuperar de colisões/paralisação sem ficar eternamente preso.

## Três perfis iniciais

| Perfil | Ritmo | Erros | Uso de itens |
|---|---|---|---|
| Casual | Conservador | Desvios e freadas maiores | Oportunista simples |
| Padrão | Competitivo | Pequenos erros | Contextual |
| Difícil | Linhas melhores | Erros raros | Melhor timing, sem informação privilegiada |

Ajustar parâmetros, não escrever três IAs separadas. Usar seed da sessão para comportamentos repetíveis em testes e aleatoriedade controlada em jogo.

## Justiça

Bots não podem teleportar para frente, atravessar obstáculos ou ganhar velocidade indisponível ao jogador só para aproximar a disputa. Pequenas assistências devem ser explícitas, parametrizadas e desativáveis. O servidor deve registrar quais bots completaram cada trecho e em que ordem.

## Testes de bot

- 8 bots completam 10 corridas consecutivas sem ficar presos em cada pista.
- Passam por rampas, booster, alternativa e respawn.
- Não marcam voltas pulando checkpoints.
- Não abusam de power-up nem de velocidade.
- Diferentes perfis produzem tempos/dificuldades perceptivelmente distintos.
- Desconexão de humano → IA assume o mesmo slot sem criar nono participante.
