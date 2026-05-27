# Spec: Página de Configuração do Sistema

## Objetivo
Criar página de configuração do sistema com tema escuro/claro, i18n pt-BR/en, opções de cupom, upload de logo/favicon e ajuste de fonte.

## Referências (Pesquisa)
Baseado em sistemas PDV populares (WCPOS, Adyen, IncoPOS, BottlePOS, SAP POS):
- Tema (claro/escuro/sistema) — padrão em todos
- Idioma — presente em 90% dos sistemas
- Customização de cupom (cabeçalho, logo, rodapé) — presente em 80%
- Logo/favicon do sistema — presente em 70%
- Tamanho e tipo de fonte — presente em 60%

## Arquitetura

### Backend (`routes/config.js`)
- `GET /api/config` → `config/system.json`
- `PUT /api/config` → salva config
- `POST /api/config/upload` → logo/favicon upload
- `GET /uploads/*` → servir arquivos estáticos

### Config Schema (`config/system.json`)
```json
{
  "theme": "system",
  "language": "pt-BR",
  "font_family": "system-ui",
  "font_size": 14,
  "coupon": {
    "show_header": true,
    "header_text": "",
    "show_logo": false,
    "logo_url": "",
    "footer_text": ""
  },
  "system": {
    "store_name": "CyberPDV",
    "favicon_path": "",
    "logo_path": ""
  }
}
```

### Frontend
- `public/config.html` — formulário seccionado
- `public/js/config.js` — lógica da página
- `public/js/i18n.js` — framework de tradução global
- `public/css/style.css` — CSS variables para tema escuro/claro

### Tema (Dark/Light)
- CSS variables em `:root` com `data-theme="light|dark"`
- Script bloqueante inline no `<head>` (lê localStorage + system preference)
- Transição suave via `transition: background-color 0.3s`

### i18n
- Objeto `window._lang` com chaves para pt-BR e en
- Função global `__('chave')` para tradução
- Persistência em localStorage + sync com servidor

## Output Esperado
- `routes/config.js` — 3 endpoints
- `config/system.json` — configuração padrão
- `public/config.html` — página com 4 seções (Aparência, Idioma, Cupom, Sistema)
- `public/js/config.js` — lógica da página
- `public/js/i18n.js` — framework global de tradução
- Todas as páginas HTML: script de tema + link Config + i18n

## Constraints
- Zero dependências npm (sem i18next, sem react)
- CSS variables, sem pré-processadores
- Compatível com SQLite existente (config usa JSON file)
- Logo/favicon salvos em `uploads/`
- Tema aplicado antes do paint (script bloqueante no head)

## Critérios de Verificação
- [ ] Tema escuro funciona (persiste em localStorage, sem flash)
- [ ] Tema claro funciona
- [ ] Tema "sistema" segue preferência do OS
- [ ] Idioma português carrega textos em pt-BR
- [ ] Idioma inglês carrega textos em en
- [ ] Upload de logo salva arquivo e exibe preview
- [ ] Upload de favicon altera ícone da aba
- [ ] Opção cupom cabeçalho on/off salva
- [ ] Fonte tamanho e tipo aplicam imediatamente
- [ ] Botão "Config" presente em todas as páginas
- [ ] 26+ testes PASS

## Não Fazer
- Não alterar lógica de vendas/produtos existente
- Não adicionar dependências npm
- Não refatorar código existente além do necessário
- Não implementar autenticação OAuth ou login social

## Arquivos Relacionados
- `routes/config.js` (novo)
- `config/system.json` (novo)
- `public/config.html` (novo)
- `public/js/config.js` (novo)
- `public/js/i18n.js` (novo)
- `public/css/style.css` (modificado)
- `server.js` (modificado)
- `public/*.html` (modificado — todas as páginas)
