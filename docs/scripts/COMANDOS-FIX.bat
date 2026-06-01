@echo off
echo ========================================
echo   FIX RAPIDO - Kynitas Dashboard
echo ========================================
echo.

echo [1/3] Adicionando arquivos...
git add .

echo.
echo [2/3] Criando commit...
git commit -m "fix: corrigir vendas e gaveta pos-deploy"

echo.
echo [3/3] Enviando para Vercel...
git push origin main

echo.
echo ========================================
echo   DEPLOY INICIADO!
echo ========================================
echo.
echo Aguarde 2-3 minutos para o deploy completar.
echo.
echo Proximos passos:
echo 1. Configure as variaveis no Vercel
echo 2. Execute o SQL no Supabase
echo 3. Teste o sistema
echo.
echo Veja: ACOES-URGENTES.md
echo.
pause
