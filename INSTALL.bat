@echo off
setlocal enabledelayedexpansion

title Marrengula IT ERP - Instalador
color 1f

echo.
echo ========================================
echo   Marrengula IT ERP - Instalador Local
echo ========================================
echo.

:: Verificar Node.js
echo [1/5] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ERRO: Node.js nao encontrado!
    echo   Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   OK: Node.js !NODE_VERSION! detectado

:: Verificar npm
echo [2/5] Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo   ERRO: npm nao encontrado!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo   OK: npm !NPM_VERSION! detectado

:: Instalar dependencias
echo [3/5] Instalando dependencias...
call npm install
if errorlevel 1 (
    echo   ERRO ao instalar dependências!
    pause
    exit /b 1
)
echo   OK: Dependencias instaladas

:: Build do projeto
echo [4/5] Compilando projeto...
call npm run build
if errorlevel 1 (
    echo   ERRO ao compilar projeto!
    pause
    exit /b 1
)
echo   OK: Projeto compilado

:: Criar atalho na area de trabalho
echo [5/5] Criando atalho na Area de Trabalho...
set "SCRIPT=%TEMP%\kynitas_shortcut.vbs"
echo Set WshShell = CreateObject("WScript.Shell") > "%SCRIPT%"
echo SetShortcut = WshShell.CreateShortcut("%USERPROFILE%\Desktop\Marrengula IT ERP.lnk") >> "%SCRIPT%"
echo Shortcut.TargetPath = "%CD%\node_modules\vite\bin\vite.js" >> "%SCRIPT%"
echo Shortcut.Arguments = "--host --port 8080" >> "%SCRIPT%"
echo Shortcut.WorkingDirectory = "%CD%" >> "%SCRIPT%"
echo Shortcut.Description = "Marrengula IT ERP" >> "%SCRIPT%"
echo Shortcut.IconLocation = "%CD%\public\favicon.ico" >> "%SCRIPT%"
echo Shortcut.Save >> "%SCRIPT%"
del "%SCRIPT%"
echo   OK: Atalho criado

echo.
echo ========================================
echo   Instalacao concluida com sucesso!
echo ========================================
echo.
echo Made by Marrengula IT
echo.
echo Para iniciar o Marrengula IT ERP:
echo   1. Clique no atalho na Area de Trabalho
echo   2. Ou execute: npm run dev
echo.
echo O sistema ira abrir em:
echo   http://localhost:8080
echo.
pause
