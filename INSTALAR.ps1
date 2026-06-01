# MIT ERP - INSTALAÇÃO AUTOMÁTICA MULTI-TENANT
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "MIT ERP - INSTALAÇÃO AUTOMÁTICA MULTI-TENANT" -ForegroundColor Yellow
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se um comando existe
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Verificar Node.js
if (-not (Test-Command "node")) {
    Write-Host "[ERRO] Node.js não encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale Node.js em: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar npm
if (-not (Test-Command "npm")) {
    Write-Host "[ERRO] npm não encontrado!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "[INFO] Node.js e npm encontrados!" -ForegroundColor Green
Write-Host ""

try {
    # Passo 1: Instalar dependências
    Write-Host "[PASSO 1/4] Instalando dependências..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) { throw "Falha ao instalar dependências" }
    Write-Host "[OK] Dependências instaladas com sucesso!" -ForegroundColor Green
    Write-Host ""

    # Passo 2: Build da aplicação
    Write-Host "[PASSO 2/4] Compilando aplicação..." -ForegroundColor Blue
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar aplicação" }
    Write-Host "[OK] Aplicação compilada com sucesso!" -ForegroundColor Green
    Write-Host ""

    # Passo 3: Build versão portátil
    Write-Host "[PASSO 3/4] Gerando versão portátil..." -ForegroundColor Blue
    npm run electron:build:portable
    if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar versão portátil" }
    Write-Host "[OK] Versão portátil gerada com sucesso!" -ForegroundColor Green
    Write-Host ""

    # Passo 4: Build instalador
    Write-Host "[PASSO 4/4] Gerando instalador..." -ForegroundColor Blue
    npm run electron:build:installer
    if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar instalador" }
    Write-Host "[OK] Instalador gerado com sucesso!" -ForegroundColor Green
    Write-Host ""

    # Sucesso
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host "INSTALAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Arquivos gerados na pasta 'release':" -ForegroundColor Yellow
    Write-Host "- MIT ERP-2.0.0-Setup.exe (Instalador)" -ForegroundColor White
    Write-Host "- MIT ERP-2.0.0-Portable.exe (Versão Portátil)" -ForegroundColor White
    Write-Host ""
    Write-Host "PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "1. Execute o arquivo SQL: docs/sql/multitenant-complete-schema.sql no Supabase" -ForegroundColor White
    Write-Host "2. Configure um super admin no banco de dados" -ForegroundColor White
    Write-Host "3. Distribua os arquivos .exe para outros computadores" -ForegroundColor White
    Write-Host ""
    Write-Host "Para mais informações, consulte: docs/REESTRUTURACAO-COMPLETA.md" -ForegroundColor Cyan
    Write-Host ""

    # Abrir pasta de release se existir
    if (Test-Path "release") {
        $response = Read-Host "Deseja abrir a pasta 'release' com os arquivos gerados? (s/n)"
        if ($response -eq "s" -or $response -eq "S") {
            Start-Process "explorer.exe" -ArgumentList "release"
        }
    }

} catch {
    Write-Host ""
    Write-Host "[ERRO] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifique os logs acima para mais detalhes." -ForegroundColor Yellow
}

Read-Host "Pressione Enter para sair"