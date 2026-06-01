@echo off
setlocal enabledelayedexpansion

title Marrengula IT ERP - Portable
color 1f

echo.
echo ========================================
echo   Marrengula IT ERP - Portable Edition
echo   Made by Marrengula IT
echo ========================================
echo.

set "PROJECT_DIR=%~dp0"
set "DIST_DIR=%PROJECT_DIR%dist"

if not exist "%DIST_DIR%\index.html" (
    echo ERRO: Pasta 'dist' nao encontrada!
    echo Execute 'npm run build' primeiro.
    pause
    exit /b 1
)

echo A iniciar o servidor...
cd /d "%DIST_DIR%"
npx -y serve -p 8080 -s

echo.
echo O sistema ira abrir em: http://localhost:8080
echo.

pause
