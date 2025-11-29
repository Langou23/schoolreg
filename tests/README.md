# 🧪 Tests de Santé des APIs SchoolReg

Ce dossier contient une suite complète de tests unitaires professionnels pour vérifier le bon fonctionnement de tous les microservices SchoolReg.

## 📋 Vue d'ensemble

### Types de Tests
- **Tests de Santé** : Vérification de la connectivité et des endpoints de base
- **Tests Fonctionnels** : Validation des APIs et de leur logique métier
- **Tests de Performance** : Mesure des temps de réponse
- **Tests de Communication Inter-Services** : Vérification du proxy Gateway
- **Monitoring Continu** : Surveillance en temps réel des services

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+
- Tous les microservices démarrés et fonctionnels

### Installation des dépendances
```bash
cd tests/
npm install
```

## 🔧 Utilisation

### 1. Test Complet de Santé (Recommandé)
```bash
npm test
# ou
node api-health-checker.js
```

**Résultat attendu:**
```
🚀 Démarrage des tests de santé des APIs
============================================================

📡 Test de connectivité des services
✅ Connectivité gateway
✅ Connectivité auth
✅ Connectivité students
✅ Connectivité payments
✅ Connectivité applications
✅ Connectivité classes

🏥 Test des endpoints de santé
✅ Gateway Health
✅ Auth Health
✅ Students Health
✅ Payments Health
✅ Applications Health
✅ Classes Health

⚡ Test des APIs fonctionnelles
✅ Auth - Endpoint signup disponible
✅ Auth - Endpoint signin disponible
✅ Students - Liste des élèves
✅ Students - Statistiques dashboard
✅ Applications - Liste des demandes
✅ Payments - Liste des paiements (Students)
✅ Payments - Service Stripe disponible
✅ Classes - Liste des classes

🔄 Test de communication inter-services
✅ Gateway → Students (proxy)
✅ Gateway → Auth (proxy)

================================================================================
📋 RAPPORT DE SANTÉ DES APIs
================================================================================
🕐 Durée d'exécution: 3.2s
📊 Tests exécutés: 18
✅ Tests réussis: 18
❌ Tests échoués: 0
📈 Taux de réussite: 100.0%

🎉 TOUTES LES APIs FONCTIONNENT CORRECTEMENT!

💾 Rapport sauvegardé: ./tests/reports/health-report-1732742542123.json
```

### 2. Tests Jest (Assertions Détaillées)
```bash
npx jest jest-api-tests.js --verbose
```

### 3. Monitoring Continu
```bash
npm run test:continuous
# ou avec intervalle personnalisé (en secondes)
node continuous-health-monitor.js 60
```

## 📊 Types de Tests Détaillés

### 🏥 Tests de Santé
| Service | Endpoint | Vérification |
|---------|----------|--------------|
| Gateway | `/health` | Status 200, réponse JSON |
| Auth | `/health` | Status 200, service auth |
| Students | `/health` | Status 200, service students-node |
| Payments | `/health` | Status 200, service payments |
| Applications | `/health` | Status 200, disponibilité |
| Classes | `/health` | Status 200, disponibilité |

### ⚡ Tests Fonctionnels
| API | Endpoint | Test |
|-----|----------|------|
| Auth | `POST /signup` | Validation des champs requis |
| Auth | `POST /signin` | Gestion des identifiants invalides |
| Students | `GET /students` | Liste et structure des données |
| Students | `GET /dashboard/stats` | Statistiques complètes |
| Payments | `GET /payments` | Paiements avec données élèves |
| Applications | `GET /applications` | Demandes d'inscription |
| Classes | `GET /classes` | Liste des classes |

### 🔄 Tests Inter-Services
- **Gateway → Students** : Vérification du proxy
- **Gateway → Auth** : Authentification via gateway  
- **Students → Payments** : Communication pour paiements
- **Notifications** : Envoi entre services

### 📈 Tests de Performance
- **Temps de réponse** : < 2 secondes pour les endpoints de santé
- **Charge concurrent** : 5 requêtes simultanées
- **Disponibilité** : 99.9% uptime attendu

## 🎯 Critères de Réussite

### ✅ Test RÉUSSI si:
- **Status HTTP 200** pour tous les endpoints de santé
- **Données valides** retournées (JSON bien formé)
- **Structure attendue** des objets (Student, Payment, etc.)
- **Communication inter-services** fonctionnelle
- **Temps de réponse** acceptable (< 2s)

### ❌ Test ÉCHOUÉ si:
- Service non accessible (timeout, connexion refusée)
- Status HTTP d'erreur (4xx, 5xx)
- Données malformées ou manquantes
- Temps de réponse > seuil défini
- Erreurs dans la communication inter-services

## 📁 Structure des Rapports

### Rapport JSON
```json
{
  "timestamp": "2024-11-27T19:58:12.123Z",
  "duration": 3.2,
  "summary": {
    "total": 18,
    "passed": 18, 
    "failed": 0,
    "successRate": "100.0"
  },
  "details": [
    {
      "name": "Connectivité gateway",
      "status": "PASS",
      "attempts": 1
    }
  ]
}
```

### Alertes Automatiques
Le système génère des alertes si:
- **Taux de réussite < 70%**
- **Service critique indisponible** (Gateway, Auth, Students)
- **Temps de réponse > 5 secondes**

## 🔧 Configuration Avancée

### Variables d'Environnement
```bash
# Timeout des requêtes (ms)
API_TIMEOUT=10000

# Nombre de tentatives
RETRY_COUNT=3

# Seuil d'alerte (%)
ALERT_THRESHOLD=70

# Intervalle monitoring (ms)  
MONITOR_INTERVAL=30000
```

### Ports des Services
```javascript
const SERVICES = {
    gateway: 3001,
    auth: 4001, 
    applications: 4002,
    students: 4003,
    payments: 4004,
    classes: 4005
};
```

## 🚨 Résolution de Problèmes

### Service Non Accessible
```
❌ Connectivité gateway - Erreur: connect ECONNREFUSED 127.0.0.1:3001
```
**Solution:** Vérifier que le service est démarré sur le bon port

### Timeout
```
❌ Students - Liste des élèves - Erreur: timeout of 10000ms exceeded
```
**Solution:** Augmenter le timeout ou vérifier les performances du service

### Données Malformées
```
❌ Students - Structure des données - Erreur: expected property 'firstName'
```
**Solution:** Vérifier la sérialisation des données côté service

## 📞 Support

Pour toute question sur les tests:
1. Vérifier les logs des services individuels
2. Consulter les rapports de test générés
3. Utiliser le monitoring continu pour diagnostiquer
4. Contacter l'équipe de développement

---

**Tests maintenus avec ❤️ pour garantir la qualité de SchoolReg**
