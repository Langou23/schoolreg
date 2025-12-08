# Script de test pour vérifier les sessions de paiement

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST DES SESSIONS DE PAIEMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Étape 1: Vérifier que le service est actif
Write-Host "1️⃣  Vérification du service students-node..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:4003/health" -Method Get
    Write-Host "✅ Service actif: $($health.service)" -ForegroundColor Green
} catch {
    Write-Host "❌ Service non disponible. Assurez-vous qu'il est démarré." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Étape 2: Mettre à jour les sessions de tous les paiements existants
Write-Host "2️⃣  Mise à jour rétroactive des sessions..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "http://localhost:4003/admin/payments/update-sessions" -Method Post
    Write-Host "✅ $($result.message)" -ForegroundColor Green
    Write-Host "   📊 Paiements mis à jour: $($result.updated)" -ForegroundColor Cyan
    Write-Host "   📊 Total de paiements: $($result.total)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Erreur lors de la mise à jour: $_" -ForegroundColor Red
}
Write-Host ""

# Étape 3: Récupérer quelques paiements pour vérifier
Write-Host "3️⃣  Vérification des sessions dans les paiements..." -ForegroundColor Yellow
try {
    $payments = Invoke-RestMethod -Uri "http://localhost:4003/payments" -Method Get
    
    if ($payments.Count -gt 0) {
        Write-Host "✅ $($payments.Count) paiements trouvés" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Aperçu des 5 premiers paiements:" -ForegroundColor Cyan
        Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor Gray
        
        $payments | Select-Object -First 5 | ForEach-Object {
            $student = if ($_.student) { "$($_.student.firstName) $($_.student.lastName)" } else { "N/A" }
            $amount = [math]::Round($_.amount, 2)
            $session = if ($_.academicYear) { $_.academicYear } else { "❌ Vide" }
            $date = if ($_.paymentDate) { (Get-Date $_.paymentDate).ToString("dd/MM/yyyy") } else { "N/A" }
            
            Write-Host "  👤 $student" -ForegroundColor White
            Write-Host "     💰 Montant: $amount $ CAD" -ForegroundColor Gray
            Write-Host "     📅 Date: $date" -ForegroundColor Gray
            Write-Host "     🎓 Session: $session" -ForegroundColor $(if ($_.academicYear) { "Green" } else { "Red" })
            Write-Host ""
        }
    } else {
        Write-Host "⚠️  Aucun paiement trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur lors de la récupération des paiements: $_" -ForegroundColor Red
}
Write-Host ""

# Étape 4: Résumé
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ TEST TERMINÉ" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Rafraîchissez le navigateur (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "   2. Allez dans l'onglet 'Paiements'" -ForegroundColor White
Write-Host "   3. Vérifiez que la colonne 'Session' affiche:" -ForegroundColor White
Write-Host "      - Automne 2024" -ForegroundColor Cyan
Write-Host "      - Hiver 2025" -ForegroundColor Cyan
Write-Host "      - Été 2024" -ForegroundColor Cyan
Write-Host ""
