@echo off
title CyberPDV - Instalacao
cd /d "%~dp0"

echo ========================================
echo    CyberPDV - Instalador Automatico
echo    Versao 1.0
echo ========================================
echo.

:: Verificar se CyberPDV.exe existe
if not exist "CyberPDV.exe" (
    echo [!] ERRO: CyberPDV.exe nao encontrado!
    echo     Coloque este instalador NA MESMA PASTA que CyberPDV.exe
    echo.
    pause
    exit /b 1
)

echo [1/4] Verificando sistema...
ver | find "10." >nul
if %errorlevel% equ 0 (
    echo  - Windows 10/11 detectado
) else (
    echo  - Windows detectado
)

:: Verificar se ja esta instalado
if exist "%APPDATA%\CyberPDV\CyberPDV.exe" (
    echo.
    echo [!] CyberPDV ja esta instalado.
    choice /M "Deseja reinstalar"
    if errorlevel 2 exit /b
)

echo [2/4] Instalando arquivos...
if not exist "%APPDATA%\CyberPDV" mkdir "%APPDATA%\CyberPDV"
copy /Y "CyberPDV.exe" "%APPDATA%\CyberPDV\CyberPDV.exe" >nul
echo  - CyberPDV.exe copiado para %%APPDATA%%\CyberPDV

:: Copiar db.xlsx se existir
if exist "db.xlsx" (
    copy /Y "db.xlsx" "%APPDATA%\CyberPDV\db.xlsx" >nul
    echo  - db.xlsx copiado com sucesso
)

echo [3/4] Criando atalhos...

:: Criar atalho no Desktop
set "DESKTOP=%USERPROFILE%\Desktop"
set "SHORTCUT=%DESKTOP%\CyberPDV.lnk"
set "TARGET=%APPDATA%\CyberPDV\CyberPDV.exe"

if exist "%TEMP%\make_shortcut.vbs" del "%TEMP%\make_shortcut.vbs"
echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%TEMP%\make_shortcut.vbs"
echo Set Shortcut = WshShell.CreateShortcut("%SHORTCUT%") >> "%TEMP%\make_shortcut.vbs"
echo Shortcut.TargetPath = "%TARGET%" >> "%TEMP%\make_shortcut.vbs"
echo Shortcut.WorkingDirectory = "%APPDATA%\CyberPDV" >> "%TEMP%\make_shortcut.vbs"
echo Shortcut.Description = "CyberPDV - Sistema de Vendas" >> "%TEMP%\make_shortcut.vbs"
echo Shortcut.IconLocation = "%TARGET%, 0" >> "%TEMP%\make_shortcut.vbs"
echo Shortcut.Save >> "%TEMP%\make_shortcut.vbs"
cscript //nologo "%TEMP%\make_shortcut.vbs"
del "%TEMP%\make_shortcut.vbs"

echo  - Atalho criado no Desktop

:: Criar atalho no Menu Iniciar
set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\CyberPDV"
if not exist "%STARTMENU%" mkdir "%STARTMENU%"
set "SM_SHORTCUT=%STARTMENU%\CyberPDV.lnk"

echo Set WshShell = WScript.CreateObject("WScript.Shell") > "%TEMP%\make_shortcut2.vbs"
echo Set Shortcut = WshShell.CreateShortcut("%SM_SHORTCUT%") >> "%TEMP%\make_shortcut2.vbs"
echo Shortcut.TargetPath = "%TARGET%" >> "%TEMP%\make_shortcut2.vbs"
echo Shortcut.WorkingDirectory = "%APPDATA%\CyberPDV" >> "%TEMP%\make_shortcut2.vbs"
echo Shortcut.Description = "CyberPDV - Sistema de Vendas" >> "%TEMP%\make_shortcut2.vbs"
echo Shortcut.Save >> "%TEMP%\make_shortcut2.vbs"
cscript //nologo "%TEMP%\make_shortcut2.vbs"
del "%TEMP%\make_shortcut2.vbs"

echo  - Atalho criado no Menu Iniciar
echo.
echo [4/4] Instalacao concluida!

echo.
echo ========================================
echo    CyberPDV instalado com sucesso!
echo ========================================
echo.
echo  Para iniciar:
echo    - Duplo clique no atalho do Desktop
echo    - Ou va em Iniciar ^> CyberPDV
echo    - Ou acesse: %%APPDATA%%\CyberPDV\CyberPDV.exe
echo.
echo  Acesse: http://localhost:3000
echo  Login:  lord / lord123
echo.
echo  Dica: Coloque o db.xlsx na pasta:
echo    %%APPDATA%%\CyberPDV\
echo.
choice /M "Deseja iniciar o CyberPDV agora"
if errorlevel 2 goto :fim

start "" "%APPDATA%\CyberPDV\CyberPDV.exe"
timeout /t 3 >nul
start http://localhost:3000

:fim
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
