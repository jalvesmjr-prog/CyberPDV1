param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ROOT

Write-Host "=== CyberPDV - Build do Executavel ===" -ForegroundColor Cyan

if (-not $SkipInstall) {
  Write-Host "[1/3] Instalando dependencias..." -ForegroundColor Yellow
  npm install
}

Write-Host "[2/3] Compilando CyberPDV.exe via pkg..." -ForegroundColor Yellow
npx pkg . --target node18-win-x64 --output dist/CyberPDV.exe

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO: Build falhou!" -ForegroundColor Red
  exit 1
}

$exePath = Join-Path $ROOT "dist" "CyberPDV.exe"
$exeInfo = Get-Item $exePath

Write-Host "[3/3] Build concluido!" -ForegroundColor Green
Write-Host "  Arquivo: $exePath" -ForegroundColor White
Write-Host "  Tamanho: $([math]::Round($exeInfo.Length / 1MB, 1)) MB" -ForegroundColor White

Write-Host "`n=== Como usar ===" -ForegroundColor Cyan
Write-Host "1. Copie o CyberPDV.exe e o db.xlsx para uma pasta" -ForegroundColor White
Write-Host "2. Execute CyberPDV.exe" -ForegroundColor White
Write-Host "3. Acesse http://localhost:3000" -ForegroundColor White
Write-Host "4. Login: lord / lord123" -ForegroundColor White
