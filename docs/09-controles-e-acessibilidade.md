# Entradas: teclado, mouse, gamepad e touchscreen

## Ações abstratas

`steer` (-1 a 1), `accelerate` (0 a 1), `brake` (0 a 1), `drift` (boolean), `useItem` (pulso), `lookBack` (boolean), `pause` e ações de menu. O jogo consome essas ações, não eventos DOM diretos.

## Mapeamento inicial (editável)

| Ação | Teclado | Gamepad | Touchscreen |
|---|---|---|---|
| Direção | A/D ou ←/→ | Analógico esquerdo / direcional | Direcional virtual ou botões laterais |
| Aceleração | W ou ↑ | RT/R2 ou botão A configurável | Botão de acelerar |
| Freio/ré | S ou ↓ | LT/L2 | Botão de freio |
| Drift | Shift | Ombro direito | Botão drift |
| Item | Espaço | Face principal | Botão item |
| Olhar atrás | C | Ombro esquerdo | Botão opcional |
| Pausar | Esc | Start/Menu | Botão pause |

Mouse: navegação em menu, foco e botões; **dirigir pelo mouse é modo opcional de apontamento**, não exigência de mira. Testar conflito entre pointer lock e menus antes de ativar esse modo.

## Regras de UX

- Detectar dispositivo ativo e exibir ícones correspondentes sem mudar o mapeamento durante corrida.
- Suportar remapeamento; zonas mortas, sensibilidade e vibração opcionais.
- Botões touch grandes com margem segura, compatíveis com orientação paisagem e diferentes proporções de tela.
- Pausar localmente offline; online, pausa apenas abre menu sem congelar os demais.
- Permitir reduzir shake/flash, ajustar volume, legendas textuais relevantes e escala da HUD.
- Gamepad API no browser e WebView pode variar; verificar plataformas reais. Não presumir suporte uniforme de vibração.

## Critérios de aceite

Uma corrida inteira é concluível em cada esquema disponível; dispositivos podem ser desconectados sem travar o loop; controle touch não causa scroll/zoom acidental; menu é operável sem mouse.
