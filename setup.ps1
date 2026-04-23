<#
  Fleet-Log Setup Script
  Execute na raiz do projeto: .\setup.ps1
#>

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Fleet-Log - Setup & Start               " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se Docker está rodando
try {
    docker info | Out-Null
} catch {
    Write-Host "ERRO: Docker não está rodando. Inicie o Docker Desktop e tente novamente." -ForegroundColor Red
    exit 1
}

Write-Host "[1/2] Construindo e iniciando containers..." -ForegroundColor Yellow
Write-Host "  Isso pode levar alguns minutos na primeira vez." -ForegroundColor Gray
Write-Host ""

docker-compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "   Fleet-Log iniciado com sucesso!          " -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Shell (Frontend):  http://localhost:4200" -ForegroundColor White
    Write-Host "  Admin MF:          http://localhost:4201" -ForegroundColor White
    Write-Host "  Dash MF:           http://localhost:4202" -ForegroundColor White
    Write-Host "  Core API:          http://localhost:3000/api" -ForegroundColor White
    Write-Host "  Telemetry API:     http://localhost:8000" -ForegroundColor White
    Write-Host ""
    Write-Host "[2/2] Acompanhe os logs com:" -ForegroundColor Yellow
    Write-Host "  docker-compose logs -f" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "ERRO: Falha ao iniciar os containers." -ForegroundColor Red
    Write-Host "Verifique os logs com: docker-compose logs" -ForegroundColor Yellow
    exit 1
}
