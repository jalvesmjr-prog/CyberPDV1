# Spec: [Nome da Tarefa]

## Objetivo
<!-- Uma frase clara do que precisa ser feito -->

## Input / Contexto
<!-- O que já existe, onde está, o que o agente precisa saber -->

## Output Esperado
<!-- Comportamento final, telas, dados, arquivos modificados -->

## Constraints
<!-- Regras que não podem ser violadas -->
- Server usa preço e nome do BD (ignora client)
- Cálculos financeiros: Math.round(x * 100) / 100
- Vendas em transação SQL (BEGIN/COMMIT/ROLLBACK)
- ...

## Critérios de Verificação
<!-- Testes ou checks que definem "pronto" -->
- [ ] Roda sem erros
- [ ] Lint passa
- [ ] Testes específicos passam
- [ ] ...

## Não Fazer
<!-- O que o agente NÃO deve tocar -->
- Não alterar [arquivos/features]
- Não refatorar além do escopo

## Arquivos Relacionados
- `caminho/para/arquivo1.js`
- `caminho/para/arquivo2.html`
