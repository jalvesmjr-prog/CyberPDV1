# Routes — Regras Específicas

## Convenções de Rotas
- Use `express.Router()` em cada arquivo
- Exporte o router com `module.exports = router`
- Registre em `server.js` com `app.use('/api/...', router)`
- Prefixo de rota: `/api/auth`, `/api/produtos`, `/api/vendas`

## Padrão de Handler Assíncrono
```js
router.get('/caminho', (req, res) => {
    try {
        // lógica
        res.json({ success: true, data: ... })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})
```

## Regras de SQL
- Use `db.prepare().all()`, `db.prepare().get()`, `db.prepare().run()`
- Vendas DEVEM usar transação: `db.run('BEGIN')` / `COMMIT` / `ROLLBACK`
- Proteção de estoque: `MAX(0, stock - ?)`
- Nunca confie em preço ou nome vindo do cliente — sempre leia do BD

## Arquivos
- `server.js` — inicialização, registro de rotas, importação db.xlsx
- `auth.js` — login, CRUD usuários, alterar senha
- `produtos.js` — CRUD produtos (schema = db.xlsx)
- `vendas.js` — criar venda + baixa estoque + relatórios
