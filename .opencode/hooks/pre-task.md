# Pre-Task Hook

Antes de começar qualquer implementação, execute:

1. Leia `AGENTS.md` (regras invariáveis do projeto)
2. Leia `.opencode/memory/project.md` (estado atual)
3. Se existir spec em `specs/` para esta tarefa, leia-o
4. Se for tarefa em `routes/`, leia `routes/AGENTS.md`
5. Se for tarefa em `public/`, leia `public/AGENTS.md`
6. Confirme que entendeu o escopo antes de escrever código

## Session Health Check
- Se esta sessão já tem > 40 turns ou dura > 45 min, considere `/clear`
- Se você notou que instruções do início foram "esquecidas", faça `/clear` agora
- Estruture o prompt: instruções críticas no INÍCIO, tarefa exata no FINAL
- Coloque informações secundárias (detalhes, docs extensas) no resumo, não no prompt principal
