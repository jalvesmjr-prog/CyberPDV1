# CyberPDV

## Stack
- **Backend:** Node.js + Express + sql.js (SQLite em memória/arquivo)
- **Frontend:** HTML + CSS + JavaScript puro (sem frameworks)
- **Porta:** 3000
- **Fonte de dados:** `db.xlsx` (789 produtos, buscar na mesma pasta do .exe)

## Iniciar
### Desenvolvimento
```
cd D:\Arquivos D\PDVs\CyberPDV1
npm start
```
Ou `iniciar.bat`. Acessar `http://localhost:3000`.

### Portátil (Windows, sem Node.js)
```
CyberPDV.exe
```
Acessar `http://localhost:3000`.

## Build do Executável
```
npm install        # já feito
npm run build      # gera dist/CyberPDV.exe
```
Ou `EMPACOTAR.bat` para gerar a pasta de distribuição.

## Estrutura de Arquivos
```
CyberPDV1/
├── server.js              # Servidor principal
├── package.json
├── iniciar.bat
├── database/cyberpdv.db   # SQLite (auto-criado)
├── routes/
│   ├── auth.js            # Login (4 níveis) + CRUD usuários
│   ├── produtos.js        # CRUD produtos (schema = db.xlsx)
│   └── vendas.js          # Vendas + baixa de estoque + relatórios
├── public/
│   ├── AGENTS.md          # Regras frontend (convenções, padrões)
│   ├── index.html         # Login
│   ├── vendas.html        # POS + barcode + cupom
│   ├── produtos.html      # Gestão de produtos
│   ├── historico.html     # Histórico de vendas
│   ├── relatorios.html    # Relatórios com gráficos
│   ├── perfil.html        # Alterar senha
│   ├── css/style.css
│   └── js/{auth,vendas,produtos,historico,relatorios,perfil,colresize}.js
├── routes/
│   ├── AGENTS.md          # Regras backend (SQL, handlers, segurança)
│   ├── auth.js
│   ├── produtos.js
│   └── vendas.js
├── specs/                 # Specs por tarefa (spec-first development)
│   ├── README.md
│   └── template.md
├── prompts/               # Templates de prompt reutilizáveis
│   ├── README.md
│   ├── criar-rota-api.md
│   ├── corrigir-bug.md
│   └── adicionar-feature.md
└── .opencode/
    ├── memory/
    │   ├── project.md     # Memória episódica (estado atual)
    │   └── decisions.md   # Registro de decisões técnicas
    ├── hooks/
    │   ├── pre-task.md    # Executado antes de cada tarefa
    │   ├── post-task.md   # Executado após cada tarefa
    │   └── pre-commit.md  # Verificações pré-commit
    ├── agents/
    │   ├── tester.md      # Sub-agente de testes (read-only)
    │   ├── debugger.md    # Sub-agente de debug (read-only)
    │   └── spec-reviewer.md # Revisor de implementação contra spec
    └── .opencodeignore
```

## Banco de Dados

### Tabela products (18 colunas)
| Coluna | Origem | Tipo |
|--------|--------|------|
| sku | SKU (B) | INTEGER PK |
| nome_completo | NOME COMPLETO (C) | TEXT |
| preco | PREÇO (D) | REAL |
| tipo | TIPO (E) | TEXT |
| categoria | CATEGORIA (F) | TEXT |
| sub_categoria | SUB CATEGORIA (G) | TEXT |
| marca | MARCA (H) | TEXT |
| modelo | MODELO (I) | TEXT |
| p | P (J) | REAL |
| a | A (K) | REAL |
| l | L (L) | REAL |
| t | T (M) | REAL |
| obs | OBS (N) | TEXT |
| img | IMG (O) | TEXT |
| func | FUNC (P) | TEXT |
| data | DATA (Q) | TEXT |
| stock | SISTEMA | INTEGER |

### Outras tabelas
- **users** — id, username, password (SHA256), level, created_at
- **categories** — id, name (populada das categorias do db.xlsx)
- **sales** — id, user_id, user_name, total, payment_method, created_at
- **sale_items** — id, sale_id, product_id (INTEGER), product_name, quantity, unit_price, subtotal

### Tipos de produto
- **PROD**: stock=1 (ajustável manualmente)
- **SERV/ADM**: stock=9999 (ilimitado)

## Usuários Padrão
| Nível | Usuário | Senha |
|-------|---------|-------|
| Lord | `lord` | `lord123` |
| ADM | `adm` | `adm123` |
| Gerente | `gerente` | `gerente123` |
| Vendedor | `vendedor` | `vendedor123` |

## Colunas da Tabela de Produtos (ordem exata)
1. AÇÕES — Botões Editar / Excluir
2. SKU — Código numérico (primary key)
3. NOME COMPLETO — Nome completo do produto
4. TIPO — PROD / SERV / ADM (badge colorido)
5. CATEGORIA — Nome da categoria
6. SUB CATEGORIA — Subcategoria
7. MARCA — Marca do produto
8. MODELO — Modelo específico
9. PREÇO — Preço de venda (R$)
10. ESTOQUE — Quantidade em estoque
11. P — Quantidade pequena
12. A — Quantidade adicional
13. L — Quantidade grande
14. T — Quantidade extra
15. OBS — Observações
16. IMG — URL da imagem
17. FUNC — Funcionário responsável
18. DATA — Data de cadastro (ISO)

## Regras de Implementação
- Cálculos financeiros: `Math.round(x * 100) / 100`
- Server usa preço e nome do BD, ignora valores do cliente (segurança)
- Vendas em transação SQL (BEGIN/COMMIT/ROLLBACK)
- Estoque protegido: `MAX(0, stock - ?)` + CHECK(stock >= 0)
- Quantidade deve ser > 0
- user_id e user_name obrigatórios na venda
- Senha mínima 4 caracteres
- Colunas redimensionáveis via <colgroup> + Canvas, persistência localStorage

## Convenções de Código
- Sem comentários no código
- snake_case para variáveis JS
- kebab-case para arquivos
- Sempre verificar package.json antes de assumir bibliotecas
- Linhas amarelas para ADM, verdes para SERV na tabela de produtos

## Fluxo de Trabalho (Spec-First)
1. Crie um spec em `specs/nome-da-tarefa.md` (use `specs/template.md`)
2. Execute hooks pre-task: `.opencode/hooks/pre-task.md`
3. Faça o agente explorar primeiro, depois planejar, depois codificar
4. Verifique contra o spec: `.opencode/agents/spec-reviewer.md`
5. Execute hooks post-task: `.opencode/hooks/post-task.md`
6. Atualize memory blocks se necessário

## Hooks (Sempre Executar)
- `pre-task.md` antes de qualquer implementação
- `post-task.md` após finalizar
- `pre-commit.md` antes de confirmar conclusão

## Session Health — Regras Anti-Degradação

### Limites da Sessão
| Métrica | Limiar | Ação |
|---------|--------|------|
| Turns | > 40 | `/clear` |
| Duração | > 45 min | `/clear` |
| Compactações | ≥ 2 | `/clear` |
| Retrabalho | > 30% | `/clear` |
| Contexto usado | > 40% da janela | `/compact` |

### Estrutura do Prompt (Sanduíche)
```
INÍCIO: instrução crítica + regras (primacy bias — MAIS FORTE)
MEIO:   detalhes opcionais (zona morta — informação some aqui)
FIM:    pergunta exata + formato da resposta (recency bias — FORTE)
```

### Ciclo Recomendado (cada fase = sessão fresca)
```
1. EXPLORE (modelo barato) → encontre arquivos, mapete
2. PLAN (modelo caro) → spec preciso
3. CODE (modelo médio) → implemente contra spec
```
O spec escrito é o artefato que atravessa as fronteiras. Informação não viaja na sessão.

### Referência Completa
`.opencode/memory/degradacao-e-alucinacao.md` — guia de 12 páginas com métricas,
pesquisas (Nature, AAAI, ECIR, TACL), e técnicas avançadas.
