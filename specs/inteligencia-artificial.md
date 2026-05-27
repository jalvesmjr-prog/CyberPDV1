# Spec: Inteligência Artificial no CyberPDV

## Objetivo
Adicionar 4 camadas de IA gratuitas ao CyberPDV: (1) Fuse.js busca fuzzy, (2) Transformers.js IA no navegador, (3) Motor de analytics preditivo server-side, (4) Chat assistant inteligente.

## Arquitetura Geral
- **Cliente**: Fuse.js (CDN) + Transformers.js (CDN) para busca fuzzy e IA no navegador
- **Servidor**: Express routes para analytics preditivo, chat assistant, e embeddings
- **Todas gratuitas**: Zero API keys, zero serviços externos pagos, zero dependências de build

## Input / Contexto
- Projeto: Node.js + Express + sql.js + HTML/CSS/JS puro
- 789 produtos no BD, vendas sendo registradas diariamente
- Sistema já tem busca server-side com LIKE, mas sem fuzzy matching
- Sem framework frontend — JS puro com script tags

## Output Esperado

### Camada 1: Fuse.js — Busca Fuzzy ✅
- `public/js/vendas.js`: busca instantânea com Fuse.js, tolerante a erros de digitação
- `public/js/produtos.js`: busca fuzzy na tabela de produtos
- `public/vendas.html`: script tag para Fuse.js CDN
- `public/produtos.html`: script tag para Fuse.js CDN
- Pesos: nome_completo=5, sku=4, marca=3, modelo=3, categoria=1

### Camada 2: Transformers.js — IA no Navegador ✅
- `public/js/ai-assistant.js`: módulo principal de IA cliente
  - `class AIAssistant` com métodos: `classifyText()`, `getEmbedding()`, `answerQuestion()`, `findSimilar()`
  - Carregamento lazy dos modelos
  - Cache de embeddings em IndexedDB
- Modelos: `Xenova/all-MiniLM-L6-v2` (embeddings, ~23MB), `Xenova/distilbert-base-uncased-finetuned-sst-2-english` (classificação, ~43MB)
- Feature: Sugestão automática de categoria para produtos
- Feature: Busca semântica - "tênis de corrida" encontra "sapatilha esportiva"
- Feature: Produtos similares baseados em embeddings

### Camada 3: Motor de Analytics Preditivo ✅
- `routes/ai-analytics.js`: nova rota `/api/ai/analytics`
  - `GET /api/ai/analytics/forecast` — previsão de demanda por produto (média móvel 7/30 dias)
  - `GET /api/ai/analytics/associations` — regras de associação ("quem comprou X também comprou Y")
  - `GET /api/ai/analytics/anomalies` — detecção de anomalias em vendas (desvio padrão)
  - `GET /api/ai/analytics/reorder` — sugestão de reabastecimento (estoque mínimo, velocidade de venda)
  - `GET /api/ai/analytics/pricing` — sugestão de precificação (margem, concorrência interna)
  - `GET /api/ai/analytics/summary` — resumo inteligente do negócio
- `server.js`: registro da rota
- Integração com `relatorios.js`: novo painel "IA Analytics"

### Camada 4: Chat Assistant ✅
- `routes/ai-chat.js`: backend do chat
  - `POST /api/ai/chat` — processa pergunta e retorna resposta
  - Usa Transformers.js no servidor (se disponível) ou respostas template-based
  - Análise de intenção: "estoque", "vendas", "ajuda", "produto", "sugestao"
  - Consultas ao BD em tempo real: "quantos produtos X venderam?"
- `public/js/ai-chat.js`: frontend do chat
  - Widget flutuante no canto inferior direito
  - Ícone de chat com badge de notificação
  - Histórico de conversa na sessão
  - Atalho Ctrl+Shift+A para abrir/fechar
- `public/css/ai-chat.css` (inline no style.css ou próprio)
- Widget visível em todas as páginas

## Constraints
- Sem comentários no código
- snake_case para variáveis JS
- Server usa preço e nome do BD (ignora client)
- Cálculos financeiros: Math.round(x * 100) / 100
- Vendas em transação SQL (BEGIN/COMMIT/ROLLBACK)
- MAX(0, stock - ?) + CHECK(stock >= 0)
- Zero dependências npm pagas
- Transformers.js via CDN (ES module)
- Fuse.js via CDN (script tag)

## Critérios de Verificação
- [ ] Fuse.js: busca "tenis" encontra "Tênis Esportivo" mesmo com SKU diferente
- [ ] Fuse.js: busca "sapato" encontra produtos com "sapatênis", "sapatilha"
- [ ] Transformers.js: classificação de texto carrega e funciona no navegador
- [ ] Analytics: forecast retorna dados coerentes baseados em vendas reais
- [ ] Analytics: associações retornam pares produto+co-ocorrência
- [ ] Chat: responde perguntas sobre estoque, vendas, ajuda
- [ ] Chat widget aparece em todas as páginas
- [ ] Nenhum erro no console do navegador
- [ ] Testes PASS em todas as novas rotas

## Não Fazer
- Não adicionar dependências npm que precisem de build tools (node-gyp, Python)
- Não alterar lógica de vendas existente (transação, estoque, preço)
- Não modificar login/autenticação existente
- Não remover funcionalidades existentes (busca server-side continua como fallback)
