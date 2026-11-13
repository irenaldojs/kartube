# Stack e padrões de desenvolvimento

## Escolhas técnicas propostas

| Camada | Ferramenta | Motivo |
|---|---|---|
| Linguagem cliente | TypeScript estrito | Contratos, DX, reuso de código |
| Build e servidor de desenvolvimento web | Vite | Build estático e iteração rápida |
| Render 3D | Three.js / WebGL2 | Controle explícito do pipeline, GLB/glTF |
| Física/colisões | Rapier 3D para JS/WASM | Colisões robustas e física compartilhável em conceitos com Rust |
| UI | HTML/CSS/TS, framework opcional e isolado | HUD acessível, evitar re-render do 3D |
| Áudio | Web Audio API com camada adaptadora | Web + WebView, controle por plataforma |
| Multiplayer | WebSocket seguro (WSS) | Amplo suporte em navegadores e WebViews |
| Servidor | Rust + Tokio + Axum | Serviço de salas leve e assíncrono |
| Desktop/Android | Tauri 2 | Reuso do build web e integração nativa |
| Modelos 3D | glTF 2.0 / GLB, Blender | Formato aberto e pipeline reaproveitável |
| Controle de código | Git + CI | Mudanças auditáveis, testes básicos |

**Não fixar versões em documentos narrativos**: na etapa 00 registrar versões efetivas no manifesto de dependências e documentar requisitos mínimos de ambiente.

## Convenções

- Código e identificadores em inglês; documentação e conteúdo apresentado ao jogador em português inicialmente, já com IDs de tradução.
- TypeScript `strict`, módulos pequenos e dependências direcionadas para o núcleo (nunca o inverso).
- Mesma regra de corrida não deve ser reimplementada nas interfaces; o servidor Rust terá validação equivalente com fixtures de teste compartilhadas.
- Timestamps online relativos a relógio/tick autoritativo do servidor; evitar confiar em `Date.now()` para placar.
- Unidades documentadas: metros (mundo), segundos (tempo) e radianos (ângulos) no protocolo; conversão explícita de UI.
- Arquivos de assets com IDs estáveis e manifestos versionados. Rotas, collider e malha visual são dados distintos.
- Logs estruturados no servidor sem dados pessoais desnecessários; relatórios de crashes sem capturar imagem de usuários.

## Pipeline de qualidade futuro

1. Formatação e lint TS/Rust.
2. Testes de regras puras, contratos e bots.
3. Validação dos arquivos das pistas e de referências de assets.
4. Builds de web e servidor, smoke test de socket; testes nativos na matriz de dispositivos.
5. Verificação de licenças e tamanhos dos assets alterados.
6. Atualização de docs/CHANGELOG.md, docs/ANDAMENTO.md e ADR quando aplicável.

## Fontes oficiais para validação da stack

- Three.js: https://threejs.org/docs/pages/WebGLRenderer e https://threejs.org/docs/pages/GLTFLoader.html
- Rapier: https://rapier.rs/docs/user_guides/javascript/getting_started_js/
- Axum WebSocket: https://docs.rs/axum/latest/axum/extract/ws/index.html
- Tauri 2: https://v2.tauri.app/start/prerequisites/ e https://v2.tauri.app/distribute/google-play/

Essas fontes confirmam **viabilidade das tecnologias**, não FPS garantido nem compatibilidade universal. A validação real faz parte do protótipo.

## Ambiente inicial implementado — Etapa 00

Node.js 24, npm 11 e npm workspaces para os três pacotes TS. TypeScript fixado no manifesto e lockfile; compilação estrita sem emissão nesta etapa. `npm run check` é o gate local/CI. Sem dependência de render ou física até o protótipo. Aplicativos web, Rust e nativo ainda não criados.
