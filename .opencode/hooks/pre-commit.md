# Pre-Commit Hook

Antes de commitar, verifique:

1. `npm start` funciona (servidor sobe sem erros)
2. Nenhum arquivo não intencional foi modificado (use `git diff` — mas git não está instalado, então verifique manualmente)
3. Nenhum segredo (senha, chave) está no código — apenas os hashes/placeholders permitidos
4. Nenhum `console.log` de debug permanece no código (a menos que intencional)
5. Os arquivos alterados correspondem ao escopo da tarefa
