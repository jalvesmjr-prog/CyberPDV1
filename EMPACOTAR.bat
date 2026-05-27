@echo off
title CyberPDV - Empacotar para Distribuicao
cd /d "%~dp0"

echo ========================================
echo    CyberPDV - Gerando Pacote Portatil
echo ========================================
echo.

if not exist "dist\CyberPDV.exe" (
    echo [!] ERRO: CyberPDV.exe nao encontrado em dist\
    echo     Execute build-exe.ps1 primeiro
    pause
    exit /b 1
)

set "OUTPUT=CyberPDV-Portatil-v1.0"
if exist "%OUTPUT%" rmdir /S /Q "%OUTPUT%" >nul 2>&1
mkdir "%OUTPUT%"

echo [1/5] Copiando executavel...
copy "dist\CyberPDV.exe" "%OUTPUT%\CyberPDV.exe" >nul

echo [2/5] Copiando scripts...
copy "INICIAR.bat" "%OUTPUT%\INICIAR.bat" >nul
copy "INSTALAR.bat" "%OUTPUT%\INSTALAR.bat" >nul
copy "INSTRUCOES.txt" "%OUTPUT%\INSTRUCOES.txt" >nul

echo [3/5] Copiando db.xlsx (se existir)...
if exist "db.xlsx" (
    copy "db.xlsx" "%OUTPUT%\db.xlsx" >nul
    echo  - db.xlsx incluido
) else (
    echo  - db.xlsx nao encontrado (opcional)
)

echo [4/5] Copiando config (se existir)...
if exist "config" (
    if not exist "%OUTPUT%\config" mkdir "%OUTPUT%\config"
    if exist "config\printer.json" copy "config\printer.json" "%OUTPUT%\config\" >nul
)

echo [5/5] Compactando...
powershell Compress-Archive -Path "%OUTPUT%\*" -DestinationPath "%OUTPUT%.zip" -Force

echo.
echo ========================================
echo    Pacote gerado com sucesso!
echo ========================================
echo.
echo  Pasta: %OUTPUT%\
echo  ZIP:   %OUTPUT%.zip
echo.
echo  Tamanho:
dir /-C "%OUTPUT%" | find "dir(s)" || dir "%OUTPUT%"
echo.
echo  Para distribuir, copie a pasta ou o ZIP.
echo.
pause
