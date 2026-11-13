# Infraestrutura, deploy e segurança

## Topologia inicial proposta

- **Site/CDN estática:** entrega web e assets em HTTPS.
- **Servidor Rust separado:** HTTPS/WSS por proxy reverso, rooms em memória, métricas e logs estruturados.
- **Sem banco obrigatório no MVP:** partidas e placares vivos em memória; eventual persistência de perfis e histórico é evolução futura.
- **Uma região inicial:** escolher região considerando a latência dos jogadores; medir antes de expandir.

## Escalabilidade progressiva

1. Um processo Rust gerencia diversas salas, cada sala isolada por estado/tarefa.
2. Limitar salas, jogadores por IP/sessão e frequência de mensagens; enfileirar/recusar admissão ao exceder limites.
3. Coletar CPU, RAM, conexões, mensagens/s, bytes/s, tick atrasado e disconnect rate.
4. Testar carga com salas simuladas antes de planejar múltiplos nós.
5. Ao escalar horizontalmente, inserir roteamento por sala/afinidade e serviço de descoberta; **não** pressupor sincronização distribuída hoje.

## Segurança e abuso

- Validação de schema, tamanho e taxa de cada mensagem WebSocket.
- Identificadores efêmeros não são autorização para controlar slot de outra pessoa.
- `resumeToken` limitado em escopo, expiração curta, substituição após reconectar e não registrado em log.
- Não confiar em pontuação nem estado de itens enviado pelo cliente.
- CORS/origin allowlist e WSS no ambiente público.
- Sem acesso do servidor ao sistema de arquivos a partir de mensagem de usuário.
- Nenhum dado biométrico ou foto de influencer armazenado no serviço de partidas sem motivo legal.
- Documentar política de abuso/nomes de jogadores e moderação mínima se houver apelidos livres.

## Resiliência operacional

Healthcheck, encerramento gracioso, limpeza de salas expiradas, logs com IDs de correlação, versões do cliente/protocolo e tratamento de perda de conexão. Atualização de versão de servidor pode invalidar salas em andamento: definir janela/estratégia de drenagem antes de produção.

## Checklist pré-publicação

HTTPS/WSS; origem permitida; limites de taxa; proteção básica contra flood; teste de carga; crash reporting; backup de configurações; privacidade e termos para assets/nomes; versão compatível do protocolo; instrução de rollback.
