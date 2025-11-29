# Script de demarrage - Architecture Microservices
param([switch]$StopOnly)

$ErrorActionPreference = "Continue"

function Stop-ProcessOnPort {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($processId in $processIds) {
            try { taskkill /F /PID $processId 2>$null | Out-Null } catch {}
        }
    }
}

Write-Host ""
Write-Host "SCHOOLREG - ARCHITECTURE MICROSERVICES" -ForegroundColor Cyan
Write-Host ""

Write-Host "Arret des services existants..." -ForegroundColor Yellow
@(3001, 4001, 4002, 4003, 4004, 4005, 4006, 5001, 5173) | ForEach-Object { Stop-ProcessOnPort $_ }
Start-Sleep -Seconds 2
Write-Host "Services arretes" -ForegroundColor Green
Write-Host ""

if ($StopOnly) {
    Write-Host "Services arretes. Sortie." -ForegroundColor Gray
    exit 0
}

Write-Host "Demarrage des microservices..." -ForegroundColor Cyan
Write-Host ""

Write-Host "Gateway (3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/server'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "Auth (4001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/services/auth-node'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "Students (4002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/services/students-node'; python app/main.py" -WindowStyle Minimized
Start-Sleep -Seconds 3

Write-Host "Classes (4005)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/services/classes-node'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "Notifications (4006)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/services/notifications-node'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "Applications (4003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/services/applications-node'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "Payments (4004)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/services/payments-fastapi'; python run.py" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "Resources (5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/services/resources-fastapi'; python app/main.py" -WindowStyle Minimized
Start-Sleep -Seconds 2

Write-Host "Frontend (5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/microservices/client/frontend-react'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "TOUS LES SERVICES SONT DEMARRES!" -ForegroundColor Green
Write-Host ""

Write-Host "SERVICES (Architecture 100% Microservices Distribuee):" -ForegroundColor Cyan
Write-Host "  Gateway:        http://localhost:3001" -ForegroundColor White
Write-Host "  Auth:           http://localhost:4001" -ForegroundColor Green
Write-Host "  Students:       http://localhost:4002" -ForegroundColor Green
Write-Host "  Applications:   http://localhost:4003" -ForegroundColor Green
Write-Host "  Payments:       http://localhost:4004" -ForegroundColor Green
Write-Host "  Classes:        http://localhost:4005" -ForegroundColor Green
Write-Host "  Notifications:  http://localhost:4006" -ForegroundColor Green
Write-Host "  Resources:      http://localhost:5001" -ForegroundColor Green
Write-Host "  Frontend:       http://localhost:5173" -ForegroundColor White
Write-Host ""

Write-Host "APPLICATION:" -ForegroundColor Cyan
Write-Host "  http://localhost:5173" -ForegroundColor Green
Write-Host ""

Write-Host "ARCHITECTURE 100% MICROSERVICES DISTRIBUEE:" -ForegroundColor Cyan
Write-Host "  microservices/" -ForegroundColor White
Write-Host "    client/                 (Frontend)" -ForegroundColor Gray
Write-Host "      frontend-react/       (Port 5173)" -ForegroundColor Gray
Write-Host "    server/                 (Gateway)" -ForegroundColor Gray
Write-Host "      gateway/              (Port 3001)" -ForegroundColor Gray
Write-Host "    services/               (Backend - Tous Asynchrones)" -ForegroundColor Gray
Write-Host "      auth-node/            (Port 4001) <- Microservice" -ForegroundColor Green
Write-Host "      students-node/        (Port 4002) <- Microservice" -ForegroundColor Green
Write-Host "      applications-node/    (Port 4003) <- Microservice" -ForegroundColor Green
Write-Host "      payments-fastapi/     (Port 4004) <- Microservice" -ForegroundColor Green
Write-Host "      classes-node/         (Port 4005) <- Microservice" -ForegroundColor Green
Write-Host "      notifications-node/   (Port 4006) <- Microservice" -ForegroundColor Green
Write-Host "      resources-fastapi/    (Port 5001) <- Microservice" -ForegroundColor Green
Write-Host ""

Write-Host "Appuyez sur une touche pour quitter..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
