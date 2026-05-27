# Decisions — Registro de Decisões Técnicas

> Formato: Data | Contexto | Decisão | Rationale | Alternativas

## 2026-05-27

### 19. Fuse.js para Busca Fuzzy (Client-side)
- **Contexto:** Busca server-side com LIKE % era lenta e não tolerava erros de digitação
- **Decisão:** Adicionar Fuse.js via CDN, carregar todos os produtos uma vez, fazer busca client-side
- **Rationale:** 0 latência de rede, tolerante a typos, multi-palavra, pesos configuráveis (8KB gzip)
- **Alternativas:** Só server-side (latência, sem fuzzy), Algolia (pago), Lunr.js (maior bundle)

### 20. Analytics Preditivo em JS Puro (sem ML)
- **Contexto:** Precisava de previsões e insights sem adicionar ML server-side
- **Decisão:** Estatística descritiva em JS puro (médias móveis, desvio padrão, regras de associação)
- **Rationale:** Zero dependências, rodam no servidor existente sem GPU, resultados imediatos
- **Alternativas:** TensorFlow.js (pesado), sklearn (Python), APIs pagas de forecasting

### 21. Chat Assistant com Intenção por Regex
- **Contexto:** Precisava de assistente em linguagem natural sem LLM pago
- **Decisão:** Detecção de intenção por regex semântico + consultas SQL template-based
- **Rationale:** Funciona sem internet, sem API keys, sem depender de modelo externo
- **Alternativas:** Ollama (exige instalação), OpenAI API (pago), Dialogflow (complexo)

### 22. Transformers.js em vez de API Externa
- **Contexto:** Queria IA generativa/embedding sem enviar dados para servidores externos
- **Decisão:** Hugging Face Transformers.js rodando 100% no navegador via WASM
- **Rationale:** Privacidade total (dados nunca saem da máquina), offline, zero custo
- **Alternativas:** OpenAI Embeddings (pago, envia dados), Ollama (exige server), TensorFlow.js (mais complexo)

### 23. Widget de Chat em TODAS as páginas (não só vendas)
- **Contexto:** Inspirado por KubeRiva, Odoo AI Agent e Lambda ERP que têm assistente onipresente
- **Decisão:** CSS injetado via JS, widget flutuante no canto inferior direito em TODAS as páginas
- **Rationale:** Usuário pode pedir ajuda de qualquer lugar, consistência cross-página
- **Alternativas:** Só na página de vendas (menos útil), iframe (mais pesado)

### 16. ESC/POS Gerado Manualmente (sem dependências)
- **Contexto:** Precisava de impressão térmica Elgin/ESC/POS sem adicionar dependências npm
- **Decisão:** Gerar buffer ESC/POS manualmente em `routes/impressao.js` com arrays de bytes e `Buffer.concat`
- **Rationale:** Zero dependências, controle total sobre comandos, sem node-gyp/native addons
- **Alternativas:** `node-escpos` (exige build tools), `escpos-buffer` (mais uma dependência)

### 17. Multi-método de Envio à Impressora
- **Contexto:** Não há garantia de qual método funciona em cada Windows
- **Decisão:** Tentar em ordem: porta configurada → PowerShell Out-Printer → LPT1/USB001/COM → salvar .prn
- **Rationale:** Maior chance de sucesso em qualquer ambiente Windows
- **Alternativas:** Só PowerShell (falha sem permissão), só porta fixa (não funciona em USB)

### 18. Config em `config/printer.json`
- **Contexto:** Nome da impressora/porta precisa ser configurável sem editar código
- **Decisão:** Arquivo JSON persistido no subdiretório config/ com GET/PUT de configuração
- **Rationale:** Fácil de editar manualmente ou via API, sem banco de dados
- **Alternativas:** Variáveis de ambiente (menos acessível), tabela no SQLite (overkill)

## 2026-05-26

### 13. Session Health Monitoring System
- **Contexto:** LLMs degradam não-linearmente com contexto crescente; alucinações aumentam após 40-50% da janela
- **Decisão:** Incorporar limites de sessão (turns, duração, compactações, retrabalho) como regras de sistema
- **Rationale:** Estudos (Nature 2024, ECIR 2026, TACL 2024) provam que degradação é abrupta (função degrau), não gradual
- **Alternativas:** Ignorar (aceitar degradação progressiva), depender só de /compact manual (menos confiável)

### 14. Sanduíche de Prompt como Regra Obrigatória
- **Contexto:** Lost in the Middle — performance cai 30%+ quando informação relevante está no meio
- **Decisão:** Estruturar prompts com instruções críticas no início (primacy) e pergunta no fim (recency)
- **Rationale:** Provado que é inevitável por arquitetura (O(1/(H-1)!) zona morta geométrica)
- **Alternativas:** Ignorar posicionamento (aceitar 30%+ de perda), usar RAG para tudo (mais complexo)

### 15. Guia de Degradação como Memory Block
- **Contexto:** Precisava de referência rápida sobre métricas de alucinação e degradação
- **Decisão:** Criar `.opencode/memory/degradacao-e-alucinacao.md` com 12 páginas de pesquisa consolidada
- **Rationale:** Referência completa sem poluir AGENTS.md (que deve ser conciso)
- **Alternativas:** Incluir no AGENTS.md (ficaria muito longo), ignorar (perde conhecimento)

### 1. sql.js em vez de better-sqlite3
- **Contexto:** Instalação falhava sem Python/node-gyp
- **Decisão:** Usar sql.js (SQLite WASM puro)
- **Rationale:** Zero dependências nativas, roda em qualquer ambiente
- **Alternativas:** better-sqlite3 (exigia build tools), SQLite3 (mesmo problema)

### 2. db.xlsx como fonte única
- **Contexto:** Antes usava CATALOGO.xlsx
- **Decisão:** Migrar para db.xlsx (16 colunas)
- **Rationale:** Cliente forneceu novo arquivo com schema diferente
- **Alternativas:** Manter CATALOGO.xlsx (inconsistente com a realidade)

### 3. Products schema = db.xlsx + stock
- **Contexto:** 16 colunas do Excel + coluna auto de estoque
- **Decisão:** 18 colunas na ordem exata do AGENTS.md
- **Rationale:** Correspondência 1:1 com a planilha evita confusão

### 4. SKU como INTEGER PK
- **Contexto:** Antes era TEXT (`p_sku_0`)
- **Decisão:** INTEGER PRIMARY KEY (0-788)
- **Rationale:** Mais rápido, semântica correta (código numérico)
- **Alternativas:** TEXT com prefixo (mais lento, artificial)

### 5. Col-resize com <colgroup> + Canvas
- **Contexto:** Precisava de redimensionamento de colunas
- **Decisão:** <colgroup> + drag handler + Canvas measureText
- **Rationale:** Canvas é o único jeito preciso de medir texto no browser sem DOM
- **Alternativas:** contenteditable (quebra layout), <textarea> overlay (complexo)

### 6. Math.round(x * 100) / 100
- **Contexto:** Erro de ponto flutuante em cálculos financeiros
- **Decisão:** Usar arredondamento explícito em todo cálculo
- **Rationale:** 0.1 + 0.2 !== 0.3 em JS; rounds para centavos exatos
- **Alternativas:** Decimal.js (dependência extra), toFixed(2) (retorna string)

### 7. Botões em vez de <select> para pagamento
- **Contexto:** Select era UX pobre para POS touch
- **Decisão:** Grid 2×2 de botões com destaque do selecionado
- **Rationale:** Menos cliques, visual mais claro, espaço para troco
- **Alternativas:** Select (lento em touch), radio buttons (mais cliques)

### 8. display:none para impressão
- **Contexto:** visibility:hidden produzia PDF em branco
- **Decisão:** Ocultar não-modais com display:none, imprimir modal
- **Rationale:** Única abordagem que funciona consistentemente
- **Alternativas:** visibility:hidden (quebra), iframe (mais complexo)

### 9. html2canvas para exportar cupom
- **Contexto:** Precisava de "Salvar como Imagem"
- **Decisão:** html2canvas CDN, download PNG
- **Rationale:** Biblioteca madura, sem dependências de build
- **Alternativas:** dom-to-image (menos mantido), canvas manual (muito trabalho)

### 10. MAX(0, stock - ?) + CHECK(stock >= 0)
- **Contexto:** Estoque podia ficar negativo em concorrência
- **Decisão:** Dupla proteção: SQL + CHECK constraint
- **Rationale:** Defense in depth — SQL pega corrida, CHECK pega bug
- **Alternativas:** Só CHECK (vulnerável a race), só locking (complexo em sql.js)

### 11. Server usa preço/nome do BD
- **Contexto:** Cliente podia enviar preço manipulado
- **Decisão:** Ignorar unit_price e product_name do cliente
- **Rationale:** Segurança financeira — prevenção de fraude
- **Alternativas:** Validar no servidor (mais código, risco de bug)

### 12. Stock NÃO resetado na inicialização
- **Contexto:** Antes resetava PROD stock=0 para 1 em cada restart
- **Decisão:** Só inicializa stock na primeira importação
- **Rationale:** Perder ajustes manuais de stock a cada restart é inaceitável
- **Alternativas:** Resetar sempre (destrutivo), arquivo de configuração (mais complexo)
