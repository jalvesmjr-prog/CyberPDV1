# Post-Task Hook

Após finalizar a implementação, execute:

1. Rode `node -c server.js routes/*.js` (verifica sintaxe JS)
2. Se for frontend, verifique se HTML/CSS/JS estão consistentes
3. Atualize `.opencode/memory/project.md` com:
   - O que foi feito
   - Arquivos alterados
   - Decisões tomadas durante a implementação
4. Se uma decisão técnica relevante foi tomada, adicione em `.opencode/memory/decisions.md`

## Session Health Log
Registre ao final:
- Número aproximado de turns da sessão
- Quantidade de compactações (se houve `/compact`)
- Houve retrabalho? (prompts corretivos para corrigir o que já havia sido feito)
- A tarefa foi concluída dentro do esperado ou houve degradação perceptível?

Se a sessão teve > 40 turns ou > 2 compactações, considere dividir a próxima tarefa
em sessões menores.

Não declare "pronto" até que os critérios de verificação do spec estejam satisfeitos.
