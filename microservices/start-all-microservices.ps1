# Script de démarrage de tous les microservices
# Architecture 100% microservices

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   DEMARRAGE ARCHITECTURE MICROSERVICES        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"

# Fonction pour arrêter un processus sur un port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($processId in $processIds) {
            try {
                taskkill /F /PID $processId 2>$null | Out-Null
            } catch {}
        }
    }
}

# Arrêter les services existants
Write-Host "🛑 Arrêt des services existants..." -ForegroundColor Yellow
@(3001, 3002, 4001, 4002, 4003, 4004, 4005, 4006, 5001, 5173) | ForEach-Object {
    Stop-ProcessOnPort $_
}
Start-Sleep -Seconds 2

Write-Host "✅ Services arrêtés" -ForegroundColor Green
Write-Host ""

# Démarrer les microservices
Write-Host "🚀 Démarrage des microservices..." -ForegroundColor Cyan
Write-Host ""

# 1. Gateway (3001)
Write-Host "📡 Démarrage Gateway (3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/gateway'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 2. Auth Service (4001)
Write-Host "🔐 Démarrage Auth Service (4001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/services/auth-node'; npm install --silent; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 3. Students Service (4002)
Write-Host "👨‍🎓 Démarrage Students Service (4002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/services/students-node'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 4. Applications Service (4003)
Write-Host "📝 Démarrage Applications Service (4003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/services/applications-node'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 5. Payments Service (4004)
Write-Host "💳 Démarrage Payments Service (4004)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/services/payments-fastapi'; python run.py" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 6. Classes Service (4005)
Write-Host "🏫 Démarrage Classes Service (4005)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/services/classes-node'; npm install --silent; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 7. Notifications Service (4006)
Write-Host "🔔 Démarrage Notifications Service (4006)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/services/notifications-node'; npm install --silent; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 8. Resources Service (5001)
Write-Host "📚 Démarrage Resources Service (5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/services/resources-fastapi'; python app/main.py" -WindowStyle Minimized
Start-Sleep -Seconds 2

# 9. Frontend (5173)
Write-Host "🎨 Démarrage Frontend (5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot/../'; npm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   TOUS LES MICROSERVICES SONT DEMARRES!      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📋 SERVICES ACTIFS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   🌐 Gateway:        http://localhost:3001" -ForegroundColor White
Write-Host "   🔐 Auth:           http://localhost:4001" -ForegroundColor White
Write-Host "   👨‍🎓 Students:       http://localhost:4002" -ForegroundColor White
Write-Host "   📝 Applications:   http://localhost:4003" -ForegroundColor White
Write-Host "   💳 Payments:       http://localhost:4004" -ForegroundColor White
Write-Host "   🏫 Classes:        http://localhost:4005" -ForegroundColor White
Write-Host "   🔔 Notifications:  http://localhost:4006" -ForegroundColor White
Write-Host "   📚 Resources:      http://localhost:5001" -ForegroundColor White
Write-Host "   🎨 Frontend:       http://localhost:5173" -ForegroundColor White
Write-Host ""

Write-Host "🌐 APPLICATION DISPONIBLE:" -ForegroundColor Cyan
Write-Host "   👉 http://localhost:5173" -ForegroundColor Green
Write-Host ""

Write-Host "💡 Pour arrêter tous les services:" -ForegroundColor Yellow
Write-Host "   Fermez toutes les fenêtres PowerShell minimisées" -ForegroundColor Gray
Write-Host ""

# Attendre que l'utilisateur appuie sur une touche
Write-Host "Appuyez sur une touche pour quitter..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
