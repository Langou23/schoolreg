# Script de test pour vérifier la correction du bug de tuitionPaid

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: MISE À JOUR DES FRAIS DE SCOLARITÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 SCÉNARIO DE TEST:" -ForegroundColor Yellow
Write-Host "   1. Étudiant a 700$ de frais" -ForegroundColor White
Write-Host "   2. Étudiant a payé 1000$ (trop payé)" -ForegroundColor White
Write-Host "   3. Admin change les frais à 2000$" -ForegroundColor White
Write-Host "   4. RÉSULTAT ATTENDU:" -ForegroundColor White
Write-Host "      - tuitionAmount: 2000$" -ForegroundColor Green
Write-Host "      - tuitionPaid: 1000$ (INCHANGÉ)" -ForegroundColor Green
Write-Host "      - Paiement pending: 1000$ (2000 - 1000)" -ForegroundColor Green
Write-Host ""

# Vérifier que le service est actif
Write-Host "1️⃣  Vérification du service..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:4003/health" -Method Get
    Write-Host "✅ Service actif" -ForegroundColor Green
} catch {
    Write-Host "❌ Service non disponible" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Récupérer la liste des étudiants
Write-Host "2️⃣  Récupération des étudiants..." -ForegroundColor Yellow
try {
    $students = Invoke-RestMethod -Uri "http://localhost:4003/students" -Method Get
    
    if ($students.Count -gt 0) {
        $student = $students[0]
        Write-Host "✅ Étudiant trouvé: $($student.firstName) $($student.lastName)" -ForegroundColor Green
        Write-Host "   ID: $($student.id)" -ForegroundColor Gray
        Write-Host "   Frais actuels: $($student.tuitionAmount) $" -ForegroundColor Gray
        Write-Host "   Montant payé: $($student.tuitionPaid) $" -ForegroundColor Gray
        Write-Host ""
        
        # Sauvegarder les valeurs initiales
        $initialTuition = $student.tuitionAmount
        $initialPaid = $student.tuitionPaid
        $studentId = $student.id
        
        Write-Host "3️⃣  Modification des frais de scolarité..." -ForegroundColor Yellow
        Write-Host "   Ancien montant: $initialTuition $" -ForegroundColor Gray
        Write-Host "   Nouveau montant: 2000 $" -ForegroundColor Cyan
        
        # Mettre à jour les frais
        $updateData = @{
            tuitionAmount = 2000
        } | ConvertTo-Json
        
        $updated = Invoke-RestMethod -Uri "http://localhost:4003/students/$studentId" -Method Put -Body $updateData -ContentType "application/json"
        
        Write-Host ""
        Write-Host "4️⃣  RÉSULTATS APRÈS MISE À JOUR:" -ForegroundColor Yellow
        Write-Host "   ┌─────────────────────────────────────┐" -ForegroundColor Gray
        Write-Host "   │ Frais de scolarité: $($updated.tuitionAmount) $" -ForegroundColor White
        Write-Host "   │ Montant payé: $($updated.tuitionPaid) $" -ForegroundColor White
        
        # Vérifier si tuitionPaid est resté inchangé
        if ($updated.tuitionPaid -eq $initialPaid) {
            Write-Host "   │ ✅ tuitionPaid INCHANGÉ (correct!)" -ForegroundColor Green
        } else {
            Write-Host "   │ ❌ tuitionPaid MODIFIÉ (bug!)" -ForegroundColor Red
            Write-Host "   │    Attendu: $initialPaid $" -ForegroundColor Red
            Write-Host "   │    Obtenu: $($updated.tuitionPaid) $" -ForegroundColor Red
        }
        Write-Host "   └─────────────────────────────────────┘" -ForegroundColor Gray
        Write-Host ""
        
        # Vérifier les paiements pending
        Write-Host "5️⃣  Vérification des paiements pending..." -ForegroundColor Yellow
        $payments = Invoke-RestMethod -Uri "http://localhost:4003/payments" -Method Get
        $pendingPayments = $payments | Where-Object { $_.studentId -eq $studentId -and $_.status -eq "pending" }
        
        if ($pendingPayments.Count -gt 0) {
            Write-Host "✅ $($pendingPayments.Count) paiement(s) pending trouvé(s)" -ForegroundColor Green
            foreach ($payment in $pendingPayments) {
                Write-Host "   💰 Montant: $($payment.amount) $ - Type: $($payment.paymentType) - Session: $($payment.academicYear)" -ForegroundColor Cyan
            }
            
            # Calculer le solde attendu
            $expectedBalance = 2000 - $initialPaid
            $totalPending = ($pendingPayments | Measure-Object -Property amount -Sum).Sum
            
            Write-Host ""
            Write-Host "   Solde attendu: $expectedBalance $" -ForegroundColor Gray
            Write-Host "   Total pending: $totalPending $" -ForegroundColor Gray
            
            if ($totalPending -eq $expectedBalance) {
                Write-Host "   ✅ Solde pending CORRECT!" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Solde pending différent de l'attendu" -ForegroundColor Yellow
            }
        } else {
            Write-Host "⚠️  Aucun paiement pending trouvé" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "⚠️  Aucun étudiant trouvé" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ TEST TERMINÉ" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
