# test

Run the full test suite against the running server.

## Test Plan
1. **Login**: POST /api/auth/login (lord/lord123 -> 200, invalido -> 401)
2. **Produtos**: GET /api/produtos (200 + list), GET /api/produtos/categorias (200), GET /api/produtos/1 (200 + dados), GET /api/produtos/999999 (404)
3. **Vendas**: POST /api/vendas (201 + id), validar estoque deduzido, carrinho vazio -> 400, pagamento invalido -> 400
4. **Relatorios**: GET /api/vendas/relatorios/summary (200)
5. **Impressao**: GET /api/impressao/config (200), POST /api/impressao (201)
6. **Usuarios**: GET /api/usuarios (200 + list), POST /api/usuarios (201), senha curta -> 400
7. **Perfil**: PUT /api/perfil/senha (senha errada -> 401)

## Report Format
```
Testes: X/Y PASS
Falhas: [detalhes]
```
