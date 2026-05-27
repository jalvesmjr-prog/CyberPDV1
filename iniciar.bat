@echo off
title CyberPDV Server
cd /d "%~dp0"
echo ========================================
echo    CyberPDV - Ponto de Venda
echo    Iniciando servidor...
echo ========================================
echo.
echo Acesse: http://localhost:3000
echo Login:  lord / lord123
echo.
start http://localhost:3000
CyberPDV.exe
pause
