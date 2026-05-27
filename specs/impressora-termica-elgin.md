# Spec: Impressora Térmica Elgin/ESC/POS

## Objetivo
Adicionar suporte à impressão direta em impressora térmica via protocolo ESC/POS (raw bytes), compatível com Elgin i9 e similares.

## Input / Contexto
- `vendas.html` — modal do cupom com botões "Imprimir Cupom" (window.print) e "Salvar como Imagem"
- `historico.html` — mesmo modal ao expandir venda
- `vendas.js` / `historico.js` — funções `mostrarCupom`, `imprimirCupom`
- `server.js` — ponto central de registro de rotas
- `routes/vendas.js` — lógica de vendas

## Output Esperado
1. **Botão "Imprimir na Térmica"** no modal do cupom (vendas e histórico)
2. **Rota `POST /api/impressao`** que:
   - Recebe `{ items, total, payment_method, sale_id, user_name, troco, valor_recebido }`
   - Gera buffer binário ESC/POS (initialize, cabeçalho, itens, total, pagamento, footer, cut)
   - Tenta enviar raw bytes para a impressora configurada
3. **Configuração** via `config/printer.json` (nome da impressora ou porta)
4. **Fallback**: se falhar, retorna erro amigável ao usuário
5. **Rota `GET /api/impressao/config`** — retorna config atual
6. **Rota `PUT /api/impressao/config`** — atualiza config

## Constraints
- Sem dependências npm nativas (code-only ESC/POS)
- Usar `Buffer.from(text, 'latin1')` para codificação
- Usar `child_process.exec` ou `fs.writeFile` para enviar à impressora
- Cálculos financeiros: `Math.round(x * 100) / 100`
- Tratar erros de impressão sem travar o servidor

## Critérios de Verificação
- [ ] ESC/POS buffer gerado corretamente com cabeçalho, itens, total, pagamento, troco
- [ ] Rota POST `/api/impressao` retorna `{ success: true, sent: true/false, error: "..." }`
- [ ] Botão "Imprimir na Térmica" aparece no cupom (vendas e histórico)
- [ ] Ao clicar, chama a API e mostra feedback (sucesso/erro)
- [ ] Config de impressora persistida em `config/printer.json`
- [ ] GET/PUT `/api/impressao/config` funcionais

## Não Fazer
- Não alterar lógica de vendas existente
- Não adicionar dependências npm

## Arquivos Relacionados
- `routes/impressao.js` (novo)
- `config/printer.json` (novo)
- `server.js` (registrar rota)
- `public/vendas.html` (botão no cupom)
- `public/js/vendas.js` (função imprimirTermica)
- `public/historico.html` (botão no cupom)
- `public/js/historico.js` (função imprimirTermica)
