@echo off
echo ============================================================================
echo MIT ERP - INSTALACAO AUTOMATICA MULTI-TENANT
echo ============================================================================
echo.

:: Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

:: Verificar se npm está disponível
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] npm nao encontrado!
    pause
    exit /b 1
)

echo [INFO] Node.js e npm encontrados!
echo.

:: Instalar dependências
echo [PASSO 1/4] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas com sucesso!
echo.

:: Build da aplicação
echo [PASSO 2/4] Compilando aplicacao...
call npm run build
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao compilar aplicacao!
    pause
    exit /b 1
)
echo [OK] Aplicacao compilada com sucesso!
echo.

:: Build do Electron (versão portátil)
echo [PASSO 3/4] Gerando versao portatil...
call npm run electron:build:portable
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao gerar versao portatil!
    pause
    exit /b 1
)
echo [OK] Versao portatil gerada com sucesso!
echo.

:: Build do Electron (instalador)
echo [PASSO 4/4] Gerando instalador...
call npm run electron:build:installer
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao gerar instalador!
    pause
    exit /b 1
)
echo [OK] Instalador gerado com sucesso!
echo.

echo ============================================================================
echo INSTALACAO CONCLUIDA COM SUCESSO!
echo ============================================================================
echo.
echo Arquivos gerados na pasta 'release':
echo - MIT ERP-2.0.0-Setup.exe (Instalador)
echo - MIT ERP-2.0.0-Portable.exe (Versao Portatil)
echo.
echo PROXIMOS PASSOS:
echo 1. Execute o arquivo SQL: docs/sql/multitenant-complete-schema.sql no Supabase
echo 2. Configure um super admin no banco de dados
echo 3. Distribua os arquivos .exe para outros computadores
echo.
echo Para mais informacoes, consulte: docs/REESTRUTURACAO-COMPLETA.md
echo.
pause