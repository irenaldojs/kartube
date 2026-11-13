# Governança de documentação e trabalho com agentes

## Documentos são parte do produto

**Nenhuma alteração de arquitetura, regra, protocolo, asset ou distribuição é considerada completa sem a documentação correspondente.** A doc do domínio descreve **comportamento atual e decisões aprovadas**, enquanto a etapa descreve **o que falta construir**. Evitar converter hipótese em fato.

## Fluxo obrigatório a cada tarefa

1. Ler `Geral.md`, `docs/INDICE.md`, `docs/ANDAMENTO.md` e `docs/etapas/NN-*.md`.
2. Identificar dependências, interfaces impactadas e testes exigidos.
3. Executar apenas o escopo aprovado para a etapa; mudanças fora do escopo exigem registro.
4. Verificar builds/testes de módulos afetados e comportamento nas plataformas relevantes.
5. Atualizar documento técnico do domínio com o que **foi efetivamente implementado**, incluindo desvios do plano.
6. Atualizar checklist da etapa e inserir evidência, data, referência da mudança e pendências.
7. Atualizar `docs/ANDAMENTO.md` e `docs/CHANGELOG.md`.
8. Registrar novo ADR se houver alteração estrutural ou escolha de tecnologia.

## Convenções de estado

- `Planejada`: especificada mas não iniciada.
- `Em andamento`: primeira tarefa iniciada com referência registrada.
- `Bloqueada`: não pode avançar; anotar bloqueio/alternativas.
- `Em validação`: implementação pronta, testes de aceite pendentes.
- `Concluída`: todos os critérios de aceite evidenciados.

## ADR (Architecture Decision Record)

Criar `docs/decisoes/ADR-NNNN-titulo.md` com contexto, opções, decisão, consequências, riscos, validação e estado (`proposto`, `aceito`, `substituído`). Quando substituído, apontar ADR sucessor. Não apagar decisão histórica.

## Template para nova tarefa dentro da etapa

```markdown
- [ ] **ID:** E04-T03 — Título objetivo
  - Entrada: arquivos/docs/contratos relacionados
  - Entrega: comportamento verificável
  - Testes: casos específicos
  - Evidências: commit, captura, relatório ou log
  - Documentos a atualizar: caminhos
```

## Regras para múltiplos agentes

- Uma tarefa/PR por mudança coesa; um responsável por mesclar conflitos em contratos.
- Alterações de contrato primeiro no documento, depois implementações Rust e TS, com testes de compatibilidade.
- Não permitir que agentes definam pontuação, física ou protocolo divergentes localmente.
- Não marcar testes executados sem evidência.
- Mudanças grandes devem registrar migração de schemas/IDs antigos e impacto em assets.

## Revisão por marco

Revisitar gameplay (diversão), performance (medição), arquitetura (desacoplamento), direitos de conteúdo e UX. Registrar o que foi validado e o que permanece hipótese.
