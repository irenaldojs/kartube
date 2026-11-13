# Histórico de mudanças do projeto e da documentação

Registro cronológico; distinguir proposta de implementação.

## 2026-11-13 — E00-T02 — Início dos fundamentos

- Tipo: implementação e documentação.
- Monorepo npm com três pacotes TypeScript estritos; contratos iniciais de sessão, input, plataforma, pista e protocolo v1.
- Validação de roster de oito participantes e inputs; fixtures JSON destinadas ao futuro validador Rust; CI para checagem de tipos e testes.
- README com instruções reproduzíveis, lockfile e regras de arquivos gerados. Planejamento e estrutura de assets incluídos no controle de versão.
- Evidência: `npm run check` aprovado em Node 24.22.2/npm 11.19.1; `git diff --check` sem erros. CI configurada, ainda não executada remotamente.
- Etapa 00: Planejada → Em andamento. Sem renderização, servidor, prova Android ou ADRs aceitos; demais entregas permanecem pendentes.

## 2026-11-13 — Planejamento 0.1

- Criado `Geral.md` com visão, módulos, regras iniciais e sequência de etapas.
- Criados documentos de gameplay, pista, bots, multiplayer, campeonato, assets, distribuição, testes e operação.
- Criados 12 roteiros de execução e 3 ADRs iniciais **propostos**.
- Criada árvore `assets/` vazia para futura importação controlada.
- **Nenhuma funcionalidade implementada ou validada.**

## Template de entrada futura

```markdown
## AAAA-MM-DD — E##-T## — Título
- Tipo: planejamento | implementação | correção | decisão
- Mudança: descrição objetiva
- Documentos afetados: caminhos
- Evidência: commit/PR/testes/ambiente
- Estado da etapa: anterior → atual
```
