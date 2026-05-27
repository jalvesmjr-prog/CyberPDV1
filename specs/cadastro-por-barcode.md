# Spec: Cadastro por Código de Barras

## Objetivo
Ao escanear um código de barras (SKU) inexistente no banco, exibir botão "+" que abre modal rápido de cadastro, salva o produto no BD e o adiciona ao carrinho.

## Input / Contexto
- `vendas.html:79-129` — modal `modalCadastroRapido` já existe com campos: SKU (readonly), Nome, Preço, Tipo, Categoria, Marca, Modelo, Estoque
- `vendas.js:386-540` — funções `buscarBarcode`, `abrirCadastroRapido`, `salvarCadastroRapido`, `fecharCadastroRapido`, `carregarCategoriasCadastro` já implementadas
- `routes/produtos.js:66-85` — POST `/api/produtos` aceita todos os campos
- O fluxo completo está operacional

## Output Esperado
- SKU não encontrado → botão "+" aparece → clique abre modal → preenche dados → "Salvar e Adicionar ao Carrinho" → POST /api/produtos → GET /api/produtos/:sku → adiciona ao carrinho → feedback verde

## Constraints
- Todas as regras de AGENTS.md se aplicam
- SKU gerado automaticamente se vazio: `Date.now() % 100000`
- Estoque inicial: PROD=1, SERV/ADM=9999

## Critérios de Verificação
- [x] SKU inexistente exibe botão "+"
- [x] Modal abre com SKU preenchido (readonly)
- [x] Categorias carregadas do BD
- [x] Valida nome e preço antes de salvar
- [x] Produto é adicionado ao carrinho após salvar
- [x] Feedback visual verde/vermelho no input de barcode

## Não Fazer
- Não alterar outras funcionalidades

## Arquivos Relacionados
- `public/vendas.html`
- `public/js/vendas.js`
- `routes/produtos.js`
