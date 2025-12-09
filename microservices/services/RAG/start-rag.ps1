# Script de démarrage du service RAG pour SchoolReg
# Usage: .\start-rag.ps1

Write-Host "🤖 Démarrage du service RAG SchoolReg..." -ForegroundColor Cyan
Write-Host ""

# Vérifier si Python est installé
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python n'est pas installé ou n'est pas dans le PATH" -ForegroundColor Red
    exit 1
}

# Afficher la version de Python
$pythonVersion = python --version
Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green

# Vérifier si le dossier data existe
if (-not (Test-Path ".\data")) {
    Write-Host "⚠️  Le dossier 'data' n'existe pas" -ForegroundColor Yellow
    Write-Host "   Création du dossier..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path ".\data" -Force | Out-Null
    Write-Host "   📂 Dossier créé. Ajoutez vos documents PDF/TXT/MD dans ce dossier." -ForegroundColor Yellow
}

# Compter les fichiers dans data
$fileCount = (Get-ChildItem -Path ".\data" -File -Recurse).Count
if ($fileCount -eq 0) {
    Write-Host "⚠️  Aucun document trouvé dans le dossier 'data'" -ForegroundColor Yellow
    Write-Host "   Le service démarrera mais ne pourra pas répondre aux questions." -ForegroundColor Yellow
    Write-Host "   Ajoutez des documents (PDF, TXT, MD) dans le dossier 'data'." -ForegroundColor Yellow
} else {
    Write-Host "✅ $fileCount document(s) trouvé(s) dans 'data'" -ForegroundColor Green
}

# Vérifier si l'index existe
if (Test-Path ".\storage") {
    Write-Host "✅ Index vectoriel existant trouvé (chargement rapide)" -ForegroundColor Green
} else {
    Write-Host "📊 Première exécution : l'index sera créé (cela peut prendre 10-30 secondes)" -ForegroundColor Yellow
}

# Vérifier si les dépendances sont installées
Write-Host ""
Write-Host "🔍 Vérification des dépendances..." -ForegroundColor Cyan

$pipList = pip list 2>&1
if ($pipList -notmatch "fastapi") {
    Write-Host "❌ Les dépendances ne sont pas installées" -ForegroundColor Red
    Write-Host "   Installation en cours..." -ForegroundColor Yellow
    pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Dépendances installées" -ForegroundColor Green
}

# Vérifier la clé OpenAI
if (-not $env:OPENAI_API_KEY) {
    Write-Host ""
    Write-Host "⚠️  OPENAI_API_KEY n'est pas défini" -ForegroundColor Yellow
    Write-Host "   Le service ne pourra pas fonctionner sans clé API OpenAI." -ForegroundColor Yellow
    Write-Host "   Ajoutez votre clé dans le fichier .env:" -ForegroundColor Yellow
    Write-Host "   OPENAI_API_KEY=sk-..." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "   Continuer quand même? (O/N)"
    if ($continue -ne "O" -and $continue -ne "o") {
        exit 0
    }
}

# Démarrer le service
Write-Host ""
Write-Host "🚀 Démarrage du service RAG sur http://localhost:5002" -ForegroundColor Green
Write-Host ""
Write-Host "   📚 Documentation API: http://localhost:5002/docs" -ForegroundColor Cyan
Write-Host "   📊 Statistiques: http://localhost:5002/stats" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Appuyez sur CTRL+C pour arrêter le service" -ForegroundColor Yellow
Write-Host ""
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# Démarrer uvicorn
python -m uvicorn app.main:app --host 0.0.0.0 --port 5002 --reload
