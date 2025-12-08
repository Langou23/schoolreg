# 🔒 Résumé de l'implémentation RBAC et JWT Service

## 📊 Vue d'ensemble

Ce document résume les changements de sécurité apportés au système SchoolReg pour implémenter le contrôle d'accès basé sur les rôles (RBAC) et l'authentification inter-services via JWT.

## ✅ Changements effectués

### 1. students-node (FastAPI)

#### Ajout de l'authentification JWT
- Import de `jwt` et `Header` de FastAPI
- Fonction `get_current_user()` pour décoder et valider les tokens JWT
- Fonction `require_role(*roles)` pour vérifier les rôles autorisés

#### Endpoints protégés avec RBAC
Les endpoints suivants nécessitent maintenant un rôle `admin`, `direction` ou `system`:

| Endpoint | Méthode | Rôles autorisés | Description |
|----------|---------|-----------------|-------------|
| `/students` | POST | admin, direction, system | Créer un élève |
| `/students/{student_id}` | PUT | admin, direction, system | Modifier un élève |
| `/students/{student_id}` | DELETE | admin, direction, system | Supprimer un élève |
| `/enrollments` | POST | admin, direction, system | Créer une inscription |
| `/enrollments/{enrollment_id}` | PUT | admin, direction, system | Modifier une inscription |
| `/payments` | POST | admin, direction, system | Créer un paiement |
| `/payments/{payment_id}` | PUT | admin, direction, system | Modifier un paiement |

#### Endpoints avec authentification simple
- `/students` (GET) - Nécessite une authentification mais pas de rôle spécifique

#### Endpoints publics (non protégés)
- `/health` - Health check
- `/students/{student_id}` (GET) - Lecture d'un élève spécifique
- `/enrollments` (GET) - Liste des inscriptions
- `/payments` (GET) - Liste des paiements
- Endpoints Stripe (`/payments/create-payment-intent`, `/payments/confirm-stripe`, `/payments/webhook`)

### 2. payments-fastapi

#### Configuration du SERVICE_JWT
- Chargement de la variable d'environnement `SERVICE_JWT`
- Affichage d'un avertissement si le token est manquant
- Ajout du token dans les headers `Authorization` pour tous les appels à `students-node`

#### Appels modifiés
- `POST /confirm-checkout-session` → Envoie le token lors de l'appel à `students-node/payments`
- Webhook Stripe `payment_intent.succeeded` → Envoie le token lors de l'appel à `students-node/payments`

### 3. applications-node

#### Configuration du SERVICE_JWT
- Chargement de la variable d'environnement `SERVICE_JWT`
- Ajout du token dans les headers lors de l'appel à `students-node/students`

#### Appels modifiés
- `POST /applications/:id/approve` → Envoie le token lors de la création du profil élève dans `students-node`

### 4. auth-node

#### Script de génération de token
- Nouveau fichier `generate-service-token.js`
- Génère un JWT avec le rôle `system` valide pour 365 jours
- Utilise le même `JWT_SECRET` que les autres services

## 🔐 Architecture de sécurité

### Flux d'authentification utilisateur

```
1. Utilisateur se connecte via auth-node
   ↓
2. auth-node génère un JWT avec le rôle de l'utilisateur (admin, direction, parent, student)
   ↓
3. Frontend envoie le JWT dans le header Authorization pour chaque requête
   ↓
4. students-node vérifie le JWT et le rôle
   ↓
5. Si autorisé, traite la requête
```

### Flux d'authentification inter-services

```
1. Service (payments-fastapi ou applications-node) charge SERVICE_JWT au démarrage
   ↓
2. Service envoie SERVICE_JWT dans le header Authorization lors d'appels à students-node
   ↓
3. students-node vérifie le JWT et reconnaît le rôle "system"
   ↓
4. Traite la requête comme si elle venait d'un admin
```

## 📋 Configuration requise

### Fichier .env à la racine du projet

```env
# JWT Configuration (DOIT être identique partout)
JWT_SECRET=your-secret-key-change-this-in-production

# Service-to-Service Authentication
SERVICE_JWT=<token généré par generate-service-token.js>
```

### Variables d'environnement par service

#### auth-node
- `JWT_SECRET` - Pour signer les tokens utilisateur

#### students-node
- `JWT_SECRET` - Pour vérifier les tokens (doit être identique à auth-node)

#### payments-fastapi
- `SERVICE_JWT` - Token pour appeler students-node

#### applications-node
- `SERVICE_JWT` - Token pour appeler students-node

## 🧪 Tests de sécurité

### Test 1: Appel sans authentification
```bash
curl -X POST http://localhost:4003/students \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User",...}'
```
**Résultat attendu**: 401 Unauthorized - "No token provided"

### Test 2: Appel avec token utilisateur non-admin
```bash
curl -X POST http://localhost:4003/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <parent_token>" \
  -d '{"firstName":"Test","lastName":"User",...}'
```
**Résultat attendu**: 403 Forbidden

### Test 3: Appel avec token admin
```bash
curl -X POST http://localhost:4003/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"firstName":"Test","lastName":"User",...}'
```
**Résultat attendu**: 200 OK - Élève créé

### Test 4: Appel avec SERVICE_JWT
```bash
curl -X POST http://localhost:4003/students \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SERVICE_JWT>" \
  -d '{"firstName":"Test","lastName":"User",...}'
```
**Résultat attendu**: 200 OK - Élève créé

### Test 5: Paiement Stripe end-to-end
1. Parent effectue un paiement via Stripe
2. Webhook Stripe appelle payments-fastapi
3. payments-fastapi appelle students-node avec SERVICE_JWT
4. Paiement enregistré et tuitionPaid mis à jour

**Résultat attendu**: Aucune erreur, paiement visible dans l'interface

## 🔄 Flux de données critiques

### Approbation d'application
```
Admin approuve application (applications-node)
  ↓
applications-node crée user + student (DB Prisma)
  ↓
applications-node appelle students-node avec SERVICE_JWT
  ↓
students-node crée profil élève (DB PostgreSQL)
  ↓
applications-node met à jour user.studentId
  ↓
Élève peut se connecter et voir son profil
```

### Paiement Stripe
```
Parent initie paiement (frontend)
  ↓
Frontend appelle payments-fastapi
  ↓
payments-fastapi crée Payment Intent Stripe
  ↓
Stripe traite le paiement
  ↓
Stripe envoie webhook à payments-fastapi
  ↓
payments-fastapi appelle students-node avec SERVICE_JWT
  ↓
students-node crée payment et met à jour tuitionPaid
  ↓
Parent voit le paiement dans son interface
```

## 🚨 Points d'attention

### Sécurité
- ✅ Tous les endpoints sensibles sont protégés
- ✅ Les tokens JWT ont une expiration
- ✅ Le SERVICE_JWT utilise le même secret que les tokens utilisateur
- ⚠️ Le SERVICE_JWT est valide 365 jours (à renouveler annuellement)
- ⚠️ Si JWT_SECRET change, tous les tokens (utilisateur + service) sont invalidés

### Performance
- ✅ Vérification JWT rapide (décodage synchrone)
- ✅ Pas de base de données consultée pour la vérification du token
- ⚠️ Chaque requête nécessite une vérification JWT

### Scalabilité
- ✅ Architecture stateless (pas de session serveur)
- ✅ Facile d'ajouter de nouveaux services avec le même SERVICE_JWT
- ✅ Facile d'ajouter de nouveaux rôles dans require_role()

## 📝 Prochaines étapes recommandées

1. **Rotation des tokens**
   - Implémenter un système de rotation automatique du SERVICE_JWT
   - Prévoir une période de transition où l'ancien et le nouveau token sont valides

2. **Audit logging**
   - Logger toutes les actions sensibles avec l'identité de l'utilisateur/service
   - Créer un endpoint d'audit pour les admins

3. **Rate limiting**
   - Ajouter un rate limiter sur les endpoints sensibles
   - Protéger contre les attaques par force brute

4. **Refresh tokens**
   - Implémenter des refresh tokens pour les utilisateurs
   - Réduire la durée de vie des access tokens (ex: 1h au lieu de 24h)

5. **Permissions granulaires**
   - Ajouter des permissions spécifiques (ex: "can_approve_applications", "can_delete_students")
   - Implémenter un système de permissions au lieu de rôles simples

## 📚 Ressources

- [JWT.io](https://jwt.io/) - Déboguer et valider les tokens JWT
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/) - Documentation officielle
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html) - Bonnes pratiques de sécurité

## ✅ Checklist de déploiement

- [ ] Générer le SERVICE_JWT avec `node generate-service-token.js`
- [ ] Ajouter SERVICE_JWT dans le fichier .env
- [ ] Vérifier que JWT_SECRET est identique dans auth-node et students-node
- [ ] Redémarrer tous les services
- [ ] Tester l'approbation d'une application
- [ ] Tester un paiement Stripe
- [ ] Vérifier les logs pour les erreurs 401/403
- [ ] Tester la connexion d'un élève après approbation
- [ ] Vérifier que les parents peuvent voir leurs élèves
- [ ] Vérifier que les admins peuvent créer/modifier/supprimer des élèves
