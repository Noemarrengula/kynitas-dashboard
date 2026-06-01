@echo off
setlocal enabledelayedexpansion

title Marrengula IT ERP - Instalador
color 1f

echo.
echo ========================================
echo   Marrengula IT ERP - Instalador Local
echo   Made by Marrengula IT
echo ========================================
echo.

cd /d "%~dp0"

:: Verificar Node.js
echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ERRO: Node.js nao encontrado!
    echo   Por favor, instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   OK: Node.js !NODE_VERSION!

:: Verificar npm
echo [2/4] Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo   ERRO: npm nao encontrado!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo   OK: npm !NPM_VERSION!

:: Verificar se node_modules existe
if not exist "node_modules" (
    echo [3/4] Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo   ERRO ao instalar dependências!
        pause
        exit /b 1
    )
    echo   OK: Dependencias instaladas
) else (
    echo [3/4] Dependencias ja instaladas
    echo   OK
)

:: Verificar se dist existe
if not exist "dist" (
    echo [4/4] Compilando projeto...
    call npm run build
    if errorlevel 1 (
        echo   ERRO ao compilar projeto!
        pause
        exit /b 1
    )
    echo   OK: Projeto compilado
) else (
    echo [4/4] Projeto ja compilado
    echo   OK
)

echo.
echo ========================================
echo   Instalacao concluida!
echo ========================================
echo.
echo A iniciar o servidor...
echo.

start http://localhost:8080
npm run dev

pause
