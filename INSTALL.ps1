# Marrengula IT ERP - Script de Instalacao Local
# Execute este script como Administrador

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Marrengula IT ERP - Instalador Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "[1/5] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  OK: Node.js $nodeVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "  ERRO: Node.js nao encontrado!" -ForegroundColor Red
    Write-Host "  Por favor, instale o Node.js em: https://nodejs.org/" -ForegroundColor Red
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar npm
Write-Host "[2/5] Verificando npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "  OK: npm $npmVersion detectado" -ForegroundColor Green
} catch {
    Write-Host "  ERRO: npm nao encontrado!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Instalar dependencias
Write-Host "[3/5] Instalando dependencias (pode levar alguns minutos)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO ao instalar dependências!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "  OK: Dependencias instaladas" -ForegroundColor Green

# Build do projeto
Write-Host "[4/5] Compilando projeto..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERRO ao compilar projeto!" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}
Write-Host "  OK: Projeto compilado" -ForegroundColor Green

# Criar atalho na area de trabalho
Write-Host "[5/5] Criando atalho na Area de Trabalho..." -ForegroundColor Yellow
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Marrengula IT ERP.lnk")
$Shortcut.TargetPath = "%SystemRoot%\System32\cmd.exe"
$Shortcut.Arguments = "/c cd /d `"$PWD`" && npm run dev"
$Shortcut.WorkingDirectory = $PWD
$Shortcut.Description = "Marrengula IT ERP - Sistema de Gestao"
$Shortcut.Save()
Write-Host "  OK: Atalho criado" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Instalacao concluida!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Made by Marrengula IT" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar o Marrengula IT ERP:" -ForegroundColor White
Write-Host "  1. Clique no atalho na Area de Trabalho" -ForegroundColor White
Write-Host "  2. Ou execute: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "O sistema ira abrir em: http://localhost:8080" -ForegroundColor White
Write-Host ""
Read-Host "Pressione Enter para iniciar agora"
npm run dev
