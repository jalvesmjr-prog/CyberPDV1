# status

Show current project status.

1. Read `.opencode/memory/project.md` (section "In Progress" and "Blocked")
2. Read `.opencode/memory/checkpoints.md` (last entry)
3. Verify server: `curl -s http://localhost:3000/api/produtos/1 | head -c 200`

## Report Format
- Server: [running/stopped]
- Produtos: [count from GET]
- Ultimo checkpoint: [date + descricao]
- In Progress: [task name or "none"]
- Blocked: [blockers or "none"]
