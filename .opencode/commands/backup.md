# backup

Create a checkpoint with robocopy and register in checkpoints.md.

Run `.\checkpoint.ps1 -Descricao "[descricao da tarefa concluida]"`

Flags:
- `-Zip` to also create a ZIP and delete the folder
- `-Limpar` to remove old checkpoints (keeps last 5)
