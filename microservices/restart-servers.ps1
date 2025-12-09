# Script pour arreter et redemarrer tous les serveurs

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "REDEMARRAGE DES SERVEURS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Fonction pour arreter les processus Node.js et Python
function Stop-Servers {
    Write-Host "[STOP] Arret des serveurs en cours..." -ForegroundColor Yellow
    Write-Host ""
    
    # Arreter tous les processus Node.js
    Write-Host "   Arret des serveurs Node.js..." -ForegroundColor Gray
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "   [OK] $($nodeProcesses.Count) processus Node.js arrete(s)" -ForegroundColor Green
    } else {
        Write-Host "   [INFO] Aucun processus Node.js en cours" -ForegroundColor Gray
    }
    
    # Arreter tous les processus Python (uvicorn, FastAPI)
    Write-Host "   Arret des serveurs Python..." -ForegroundColor Gray
    $pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
    if ($pythonProcesses) {
        $pythonProcesses | Stop-Process -Force
        Write-Host "   [OK] $($pythonProcesses.Count) processus Python arrete(s)" -ForegroundColor Green
    } else {
        Write-Host "   [INFO] Aucun processus Python en cours" -ForegroundColor Gray
    }
    
    # Attendre un peu pour que les ports se liberent
    Write-Host ""
    Write-Host "   [WAIT] Attente de la liberation des ports..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
    Write-Host "   [OK] Ports liberes" -ForegroundColor Green
    Write-Host ""
}

# Fonction pour demarrer les serveurs
function Start-Servers {
    Write-Host "[START] Demarrage des serveurs..." -ForegroundColor Yellow
    Write-Host ""
    
    $projectRoot = "c:\Users\cheik\source\repos\project\microservices"
    
    # 1. Demarrer auth-node (port 4001)
    Write-Host "   [1] Demarrage de auth-node (port 4001)..." -ForegroundColor Cyan
    $authPath = Join-Path $projectRoot "services\auth-node"
    if (Test-Path $authPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$authPath'; npm run dev" -WindowStyle Normal
        Write-Host "   [OK] auth-node demarre" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   [WARN] auth-node non trouve" -ForegroundColor Yellow
    }
    
    # 2. Demarrer applications-node (port 4002)
    Write-Host "   [2] Demarrage de applications-node (port 4002)..." -ForegroundColor Cyan
    $applicationsPath = Join-Path $projectRoot "services\applications-node"
    if (Test-Path $applicationsPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$applicationsPath'; npm run dev" -WindowStyle Normal
        Write-Host "   [OK] applications-node demarre" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   [WARN] applications-node non trouve" -ForegroundColor Yellow
    }
    
    # 3. Demarrer students-node (port 4003)
    Write-Host "   [3] Demarrage de students-node (port 4003)..." -ForegroundColor Cyan
    $studentsPath = Join-Path $projectRoot "services\students-node"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$studentsPath'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 4003" -WindowStyle Normal
    Write-Host "   [OK] students-node demarre" -ForegroundColor Green
    Start-Sleep -Seconds 2
    
    # 4. Demarrer payments-fastapi (port 4004)
    Write-Host "   [4] Demarrage de payments-fastapi (port 4004)..." -ForegroundColor Cyan
    $paymentsPath = Join-Path $projectRoot "services\payments-fastapi"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$paymentsPath'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 4004" -WindowStyle Normal
    Write-Host "   [OK] payments-fastapi demarre" -ForegroundColor Green
    Start-Sleep -Seconds 2
    
    # 5. Demarrer notifications-node (port 4005)
    Write-Host "   [5] Demarrage de notifications-node (port 4005)..." -ForegroundColor Cyan
    $notificationsPath = Join-Path $projectRoot "services\notifications-node"
    if (Test-Path $notificationsPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$notificationsPath'; npm run dev" -WindowStyle Normal
        Write-Host "   [OK] notifications-node demarre" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   [WARN] notifications-node non trouve" -ForegroundColor Yellow
    }
    
    # 6. Demarrer resources-fastapi (port 5001)
    Write-Host "   [6] Demarrage de resources-fastapi (port 5001)..." -ForegroundColor Cyan
    $resourcesPath = Join-Path $projectRoot "services\resources-fastapi"
    if (Test-Path $resourcesPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$resourcesPath'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5001" -WindowStyle Normal
        Write-Host "   [OK] resources-fastapi demarre" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   [WARN] resources-fastapi non trouve" -ForegroundColor Yellow
    }
    
    # 7. Demarrer RAG (port 5003) - Chatbot AI
    Write-Host "   [7] Demarrage de RAG-fastapi (port 5003) - Chatbot AI..." -ForegroundColor Cyan
    $ragPath = Join-Path $projectRoot "services\RAG"
    if (Test-Path $ragPath) {
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ragPath'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5003" -WindowStyle Normal
        Write-Host "   [OK] RAG-fastapi demarre" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "   [WARN] RAG-fastapi non trouve" -ForegroundColor Yellow
    }
    
    # 8. Demarrer frontend React (port 5173)
    Write-Host "   [8] Demarrage du frontend React (port 5173)..." -ForegroundColor Cyan
    $frontendPath = Join-Path $projectRoot "client\frontend-react"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal
    Write-Host "   [OK] Frontend React demarre" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "   [WAIT] Attente du demarrage complet des serveurs..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
}

# Fonction pour verifier l'etat des serveurs
function Test-Servers {
    Write-Host ""
    Write-Host "[CHECK] Verification de l'etat des serveurs..." -ForegroundColor Yellow
    Write-Host ""
    
    $services = @(
        @{ Name = "auth-node"; Url = "http://localhost:4001/health" },
        @{ Name = "applications-node"; Url = "http://localhost:4002/health" },
        @{ Name = "students-node"; Url = "http://localhost:4003/health" },
        @{ Name = "payments-fastapi"; Url = "http://localhost:4004/health" },
        @{ Name = "notifications-node"; Url = "http://localhost:4005/health" },
        @{ Name = "resources-fastapi"; Url = "http://localhost:5001/health" },
        @{ Name = "RAG-fastapi"; Url = "http://localhost:5003" },
        @{ Name = "frontend-react"; Url = "http://localhost:5173" }
    )
    
    foreach ($service in $services) {
        try {
            $response = Invoke-WebRequest -Uri $service.Url -Method Get -TimeoutSec 3 -ErrorAction Stop
            Write-Host "   [OK] $($service.Name) - ACTIF" -ForegroundColor Green
        } catch {
            Write-Host "   [ERROR] $($service.Name) - INACTIF" -ForegroundColor Red
        }
    }
}

# Execution principale
Stop-Servers
Start-Servers
Test-Servers

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] REDEMARRAGE TERMINE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs des services:" -ForegroundColor Yellow
Write-Host "   - auth-node:          http://localhost:4001" -ForegroundColor Cyan
Write-Host "   - applications-node:  http://localhost:4002" -ForegroundColor Cyan
Write-Host "   - students-node:      http://localhost:4003" -ForegroundColor Cyan
Write-Host "   - payments-fastapi:   http://localhost:4004" -ForegroundColor Cyan
Write-Host "   - notifications-node: http://localhost:4005" -ForegroundColor Cyan
Write-Host "   - resources-fastapi:  http://localhost:5001" -ForegroundColor Cyan
Write-Host "   - RAG-fastapi:        http://localhost:5003" -ForegroundColor Cyan
Write-Host "   - frontend-react:     http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Les serveurs sont lances dans des fenetres separees" -ForegroundColor Gray
Write-Host "[INFO] Vous pouvez les fermer individuellement si necessaire" -ForegroundColor Gray
Write-Host ""
