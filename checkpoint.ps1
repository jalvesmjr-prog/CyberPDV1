param(
    [string]$Descricao = "Checkpoint automatico",
    [switch]$Zip = $false,
    [switch]$Limpar = $false,
    [int]$Manter = 5
)

# ============================================================
# checkpoint.ps1 — Backup rapido + registro em checkpoints.md
# Uso:
#   .\checkpoint.ps1 -Descricao "Implementei feature X"
#   .\checkpoint.ps1 -Zip -Descricao "Pre-build"
#   .\checkpoint.ps1 -Limpar           # limpa backups antigos
# ============================================================

$projeto = (Get-Location).Path
$data = Get-Date -Format "yyyy-MM-dd_HHmm"
$rotulo = Get-Date -Format "dd/MM/yyyy HH:mm"
$bakDir = Join-Path (Split-Path $projeto -Parent) "CyberPDV1-checkpoint-$data"
$checkpointFile = Join-Path $projeto ".opencode\memory\checkpoints.md"

Write-Host "=== CHECKPOINT ===" -ForegroundColor Cyan
Write-Host "Projeto: $projeto" -ForegroundColor Yellow
Write-Host "Destino: $bakDir" -ForegroundColor Yellow

# --- 1. Backup com robocopy (rapido, ignora lixo) ---
robocopy $projeto $bakDir /E `
    /XD node_modules temp _temp dist .git `
    /XF "*.db" "*.db-wal" "*.db-shm" "*.prn" "*.log" "*.zip" "COM1" `
    /R:0 /W:0 /NFL /NDL /NJH /NJS

$count = (Get-ChildItem $bakDir -Recurse -File | Measure-Object).Count
$size = [math]::Round((Get-ChildItem $bakDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB, 1)
Write-Host "  Copiados: $count arquivos ($size MB)" -ForegroundColor Green

# --- 2. ZIP opcional ---
if ($Zip) {
    $zipPath = "$bakDir.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($bakDir, $zipPath)
    $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
    Write-Host "  ZIP: $zipPath ($zipSize MB)" -ForegroundColor Green
    Remove-Item $bakDir -Recurse -Force
}

# --- 3. Registrar no checkpoints.md ---
if (-not (Test-Path $checkpointFile)) {
    New-Item -ItemType File -Path $checkpointFile -Force | Out-Null
}

$entry = @"

## $data - $Descricao
- **Data:** $rotulo
- **Backup:** $(if ($Zip) { $zipPath } else { $bakDir })
- **Arquivos:** $count ($size MB)
- **Projeto:** $projeto
"@

Add-Content -Path $checkpointFile -Value $entry -Encoding UTF8
Write-Host "  Registrado em: $checkpointFile" -ForegroundColor Green

# --- 4. Limpeza opcional (manter ultimos N) ---
if ($Limpar) {
    $pai = Split-Path $projeto -Parent
    Get-ChildItem "$pai\CyberPDV1-checkpoint-*" -Directory |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $Manter |
        ForEach-Object {
            Remove-Item $_.FullName -Recurse -Force
            Write-Host "  Removido: $_" -ForegroundColor DarkYellow
        }
    Get-ChildItem "$pai\CyberPDV1-checkpoint-*.zip" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip $Manter |
        ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Host "  Removido ZIP: $_" -ForegroundColor DarkYellow
        }
}

Write-Host "=== CHECKPOINT CONCLUIDO ===" -ForegroundColor Cyan
