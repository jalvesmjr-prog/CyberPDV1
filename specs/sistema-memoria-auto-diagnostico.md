# Spec: Sistema de Memória e Auto-Diagnóstico

## Objetivo
Criar sistema de logging, memória episódica e health check que permita auto-diagnóstico e aprendizado contínuo, registrando erros automaticamente e gerando recomendações.

## Output Esperado
- `routes/system.js`: 7 endpoints (log, logs, logs/errors, memory POST/GET, health, logs/older-than)
- Tabelas SQL: `system_logs` e `system_memory`
- Middleware HTTP que loga 4xx/5xx automaticamente
- `window.onerror` + `unhandledrejection` global no frontend
- Login failures registrados com IP e username
- AI Chat integrado com intents `erro` e `memoria`

## Constraints
- Sem dependências externas (só express, sql.js já existentes)
- Logs com níveis: info, warn, error, fatal
- Memória com expiração opcional
- Frontend usa sendBeacon para não interferir na UX

## Critérios de Verificação
- [ ] POST /api/system/log salva com level, type, message, context
- [ ] GET /api/system/logs retorna com filtros (level, type, since)
- [ ] GET /api/system/logs/errors agrupa por tipo e gera recomendações
- [ ] POST /api/system/memory salva conteúdo com categoria e tags
- [ ] GET /api/system/memory retorna por filtro
- [ ] GET /api/system/health retorna status, uptime, memória, db stats
- [ ] DELETE /api/system/logs/older-than/:dias limpa logs antigos
- [ ] Login 401 gera log warn com IP e username
- [ ] Chat "erros" retorna análise de erros
- [ ] Chat "memoria" retorna memória do sistema

## Não Fazer
- Não alterar rotas existentes (auth, produtos, vendas, impressao, ai-analytics)
- Não adicionar dependências npm

## Arquivos Relacionados
- `routes/system.js` (novo)
- `routes/auth.js` (modificado — login log)
- `routes/ai-chat.js` (modificado — intents erro/memoria)
- `server.js` (modificado — tabelas, middleware, registro)
- `public/js/auth.js` (modificado — error capture global)
- `public/js/ai-chat.js` (modificado — chip Erros)
