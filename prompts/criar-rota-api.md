Crie uma nova rota [GET/POST/PUT/DELETE] em `routes/[nome].js`:

**Endpoint:** `[caminho]`
**Funcionalidade:** [descrição]
**Validações:** [campos obrigatórios, tipos, regras]
**Resposta esperada:** `{ success: true/false, data/error }`

Regras:
- Use `db.prepare()` para queries SQL
- Retorne status codes apropriados (200, 400, 404, 500)
- Server-side validation apenas
- Siga o padrão das rotas existentes em `routes/`

Depois de implementar, registre a rota em `server.js` e teste com curl/Postman.
