# Public — Regras Específicas

## Convenções Frontend
- HTML sem frameworks: formulários, modais, tabelas
- CSS puro (style.css) — sem pré-processadores ou libs de UI
- JS puro — sem frameworks, sem bundlers
- snake_case para variáveis JS
- Fetch API para chamadas ao backend

## Estrutura
- `index.html` — login
- `vendas.html` — POS (ponto de venda)
- `produtos.html` — gestão de produtos
- `historico.html` — histórico de vendas
- `relatorios.html` — relatórios + gráficos
- `perfil.html` — alterar senha
- `css/style.css` — estilos globais
- `js/` — um arquivo JS por página

## Padrão de Chamada API
```js
fetch('/api/caminho', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... })
})
.then(r => r.json())
.then(data => { ... })
```

## Regras de Tabela
- Colunas redimensionáveis via `<colgroup>` + Canvas API
- Persistência de larguras no localStorage
- Ordenação por clique no cabeçalho (alterna ASC/DESC)
- Linhas amarelas = ADM, verdes = SERV
