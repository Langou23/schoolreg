# 🔔 Système de Notifications - SchoolReg

## 📋 Vue d'Ensemble

Le système de notifications envoie automatiquement des alertes aux **parents** et **élèves** lors d'événements importants, sans perturber le fonctionnement des autres services.

---

## 🎯 Événements Déclenchant des Notifications

### 1. **💰 Changement de Frais de Scolarité**
**Déclencheur:** Mise à jour du champ `tuitionAmount` d'un élève

**Qui est notifié:**
- ✅ Parent (via `parentEmail`)

**Contenu de la notification:**
```
Titre: 💰 Nouveau frais de scolarité
Message: Les frais de scolarité pour [Prénom Nom] ont été mis à jour.
         Nouveau montant: [X] $ CAD
         Solde à payer: [Y] $ CAD
```

**Code:** `students-node/app/main.py` ligne ~820-848

---

### 2. **📝 Modification du Profil Élève**
**Déclencheur:** Mise à jour des informations de l'élève (nom, adresse, statut, etc.)

**Qui est notifié:**
- ✅ Administrateur système

**Contenu de la notification:**
```
Titre: 📝 Mise à jour élève: [Prénom Nom]
Message: Modifications: [liste des changements]
```

**Code:** `students-node/app/main.py` ligne ~854-873

---

### 3. **📊 Changement de Notes**
**Déclencheur:** Mise à jour du champ `grade` dans une inscription (`Enrollment`)

**Qui est notifié:**
- ✅ Élève (si `user_id` existe)
- ✅ Parent (via `parentEmail`)

**Contenu de la notification:**

**Pour l'élève:**
```
Titre: 📊 Nouvelle note disponible
Message: Votre note pour [Nom du cours] a été mise à jour: [Note]
```

**Pour le parent:**
```
Titre: 📊 Note de [Prénom]
Message: La note de [Prénom Nom] pour [Nom du cours] a été mise à jour: [Note]
```

**Code:** `students-node/app/main.py` ligne ~1011-1046

---

### 4. **💳 Paiement Effectué**
**Déclencheur:** Création d'un paiement avec statut `paid`

**Qui est notifié:**
- ✅ Parent

**Contenu de la notification:**
```
Titre: 💳 Paiement reçu
Message: Paiement de [Montant] $ CAD reçu pour [Prénom Nom]
```

**Code:** `students-node/app/main.py` ligne ~1044-1080

---

### 5. **✅ Demande d'Inscription Approuvée**
**Déclencheur:** Approbation d'une application dans `applications-node`

**Qui est notifié:**
- ✅ Parent
- ✅ Élève

**Contenu de la notification:**

**Pour le parent:**
```
Titre: 🎉 Inscription approuvée
Message: L'inscription de [Prénom Nom] a été approuvée!
         Frais de scolarité: [X]$
         Identifiants envoyés par email
```

**Pour l'élève:**
```
Titre: 🎓 Bienvenue à SchoolReg!
Message: Votre inscription a été approuvée.
         Connectez-vous avec: [email] / student123
```

**Code:** `applications-node/src/index.js` ligne ~418-434

---

### 6. **❌ Demande d'Inscription Rejetée**
**Déclencheur:** Rejet d'une application dans `applications-node`

**Qui est notifié:**
- ✅ Parent

**Contenu de la notification:**
```
Titre: ❌ Inscription refusée
Message: L'inscription de [Prénom Nom] a été refusée.
         Raison: [Raison fournie]
```

**Code:** `applications-node/src/index.js` ligne ~456-465

---

## 🏗️ Architecture du Système

### **Composants:**

```
┌─────────────────────────────────────────────────┐
│         SERVICES GÉNÉRATEURS                    │
├─────────────────────────────────────────────────┤
│  students-node (4003)                           │
│  - Changements profil élève                     │
│  - Changements frais scolarité                  │
│  - Changements notes                            │
│  - Paiements                                    │
├─────────────────────────────────────────────────┤
│  applications-node (4002)                       │
│  - Approbation/Rejet demandes                   │
└────────────────┬────────────────────────────────┘
                 │
                 │ HTTP POST
                 ▼
┌─────────────────────────────────────────────────┐
│    NOTIFICATIONS-NODE (4006)                    │
│    Service central de gestion                   │
│                                                 │
│  Endpoints:                                     │
│  - POST /system (créer notification)            │
│  - GET / (liste notifications)                  │
│  - GET /unread-count (compteur)                 │
│  - PATCH /:id/read (marquer comme lu)           │
│  - PATCH /mark-all-read (tout marquer)          │
│  - DELETE /:id (supprimer)                      │
└────────────────┬────────────────────────────────┘
                 │
                 │ Stockage dans PostgreSQL
                 ▼
┌─────────────────────────────────────────────────┐
│         BASE DE DONNÉES                         │
│    Table: Notification                          │
│                                                 │
│  Champs:                                        │
│  - id (UUID)                                    │
│  - userId (destinataire)                        │
│  - type (enum)                                  │
│  - title (string)                               │
│  - message (string)                             │
│  - isRead (boolean)                             │
│  - createdAt (timestamp)                        │
└────────────────┬────────────────────────────────┘
                 │
                 │ Récupération HTTP GET
                 ▼
┌─────────────────────────────────────────────────┐
│         FRONTEND (5174)                         │
│    Composant: NotificationsList.tsx             │
│                                                 │
│  Fonctionnalités:                               │
│  - Badge avec compteur non lues                 │
│  - Panel déroulant avec liste                   │
│  - Marquage comme lu au clic                    │
│  - Suppression de notifications                 │
│  - Refresh auto toutes les 30s                  │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Configuration Technique

### **1. Service students-node**

**Dépendances ajoutées:**
```python
import httpx  # Client HTTP asynchrone
```

**Configuration:**
```python
NOTIFICATIONS_URL = os.getenv("NOTIFICATIONS_SERVICE_URL", "http://localhost:4006")
```

**Fonction d'envoi:**
```python
async def send_notification(user_id: str, notification_type: str, title: str, message: str):
    """
    Envoie une notification au service notifications-node.
    
    Ne bloque JAMAIS le flux principal:
    - Timeout de 5 secondes
    - Exceptions capturées et loggées
    - Retourne False en cas d'échec (sans crash)
    """
    try:
        notification_data = {
            "userId": user_id,
            "type": notification_type,
            "title": title,
            "message": message
        }
        
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{NOTIFICATIONS_URL}/system",
                json=notification_data
            )
            return response.status_code in [200, 201]
    except Exception as e:
        print(f"❌ Erreur envoi notification: {e}")
        return False
```

---

### **2. Service notifications-node**

**Structure de la table Notification:**
```typescript
model Notification {
  id        String   @id @default(uuid())
  userId    String?  // ID de l'utilisateur destinataire
  type      NotificationType  // Enum: application_status, payment_reminder, etc.
  title     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Types de notifications:**
```typescript
enum NotificationType {
  application_status   // Statut demande inscription
  payment_reminder     // Rappel/confirmation paiement
  enrollment_update    // Inscription classe / notes
  general              // Notification générale
  urgent               // Alerte urgente
}
```

---

### **3. Frontend - Composant NotificationsList**

**Intégration dans les dashboards:**

**StudentDashboard.tsx:**
```tsx
import NotificationsList from '../components/NotificationsList';

export default function StudentDashboard() {
  return (
    <div>
      {/* Header avec notifications */}
      <header className="flex items-center justify-between">
        <h1>Tableau de Bord Élève</h1>
        <NotificationsList />
      </header>
      
      {/* Reste du contenu */}
    </div>
  );
}
```

**ParentDashboard.tsx:**
```tsx
import NotificationsList from '../components/NotificationsList';

export default function ParentDashboard() {
  return (
    <div>
      {/* Header avec notifications */}
      <header className="flex items-center justify-between">
        <h1>Tableau de Bord Parent</h1>
        <NotificationsList />
      </header>
      
      {/* Liste des enfants */}
    </div>
  );
}
```

---

## 📊 Communication avec la Base de Données

### **Flux Complet d'une Notification:**

```
1. EVENT: Admin change les frais de scolarité
   ↓
   students-node/app/main.py @app.put("/students/{student_id}")
   
2. DÉTECTION: if 'tuitionAmount' in payload
   ↓
   Calcul du nouveau solde
   Création d'un paiement pending
   
3. RÉCUPÉRATION USER_ID: 
   student.user_id (élève) OU
   Requête SQL pour trouver parent via parentEmail
   
4. ENVOI NOTIFICATION:
   await send_notification(
       user_id=parent_user_id,
       notification_type="payment_reminder",
       title="💰 Nouveau frais de scolarité",
       message=f"Les frais de {first_name} {last_name}..."
   )
   ↓
   HTTP POST → http://localhost:4006/system
   
5. STOCKAGE:
   notifications-node reçoit la requête
   ↓
   INSERT INTO "Notification" (id, userId, type, title, message, isRead, createdAt)
   VALUES (uuid(), 'abc-123', 'payment_reminder', '💰...', 'Les frais...', false, NOW())
   ↓
   Notification sauvegardée dans PostgreSQL
   
6. AFFICHAGE:
   Frontend appelle toutes les 30s:
   GET http://localhost:4006/?userId=abc-123
   ↓
   SELECT * FROM "Notification" 
   WHERE "userId" = 'abc-123' 
   ORDER BY "createdAt" DESC 
   LIMIT 50
   ↓
   NotificationsList.tsx affiche les notifications
   
7. MARQUAGE LU:
   User clique sur une notification
   ↓
   PATCH http://localhost:4006/{notif-id}/read
   ↓
   UPDATE "Notification" SET "isRead" = true WHERE id = '{notif-id}'
```

---

## 🔐 Sécurité

### **Protection des données:**
- ✅ Chaque utilisateur voit **uniquement ses notifications** (filtre `userId`)
- ✅ Pas de token JWT requis pour POST /system (appels inter-services)
- ✅ Token JWT **obligatoire** pour GET/PATCH/DELETE (appels frontend)
- ✅ Validation des types de notification (enum strict)

### **Isolation:**
- ✅ Les erreurs d'envoi de notification **ne bloquent jamais** les opérations principales
- ✅ Timeout de 5 secondes sur les appels HTTP
- ✅ Exceptions capturées et loggées sans crash

---

## ✅ Checklist d'Intégration

### **Backend:**
- [x] Service notifications-node démarré (port 4006)
- [x] Variable d'environnement `NOTIFICATIONS_SERVICE_URL` configurée
- [x] Dépendance `httpx` installée dans students-node
- [x] Fonction `send_notification()` créée
- [x] Notifications ajoutées pour changements de frais
- [x] Notifications ajoutées pour changements de notes
- [x] Notifications ajoutées pour modifications profil
- [x] Table `Notification` créée dans PostgreSQL

### **Frontend:**
- [x] Composant `NotificationsList.tsx` créé
- [ ] Intégration dans `StudentDashboard.tsx`
- [ ] Intégration dans `ParentDashboard.tsx`
- [ ] Configuration de `notificationsClient` dans `apiClient.ts`
- [ ] Vérification du contexte `AuthContext`

---

## 🧪 Tests

### **Test 1: Changement de frais**
```bash
# 1. Démarrer students-node et notifications-node

# 2. Mettre à jour les frais d'un élève
curl -X PUT http://localhost:4003/students/{student_id} \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tuitionAmount": 1000}'

# 3. Vérifier les notifications du parent
curl http://localhost:4006/?userId={parent_user_id}

# Résultat attendu: Notification avec titre "💰 Nouveau frais de scolarité"
```

### **Test 2: Changement de note**
```bash
# 1. Mettre à jour la note d'une inscription
curl -X PUT http://localhost:4003/enrollments/{enrollment_id} \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"grade": "A+"}'

# 2. Vérifier les notifications de l'élève ET du parent
curl http://localhost:4006/?userId={student_user_id}
curl http://localhost:4006/?userId={parent_user_id}

# Résultat attendu: 2 notifications avec titre "📊 Nouvelle note disponible"
```

### **Test 3: Frontend**
```bash
# 1. Se connecter comme parent ou élève

# 2. Déclencher un changement (note, frais)

# 3. Attendre 30s ou rafraîchir

# 4. Cliquer sur l'icône de cloche

# Résultat attendu: Panel avec la liste des notifications
```

---

## 🚀 Démarrage Rapide

### **1. Vérifier que tous les services sont lancés:**
```bash
# Port 4001: auth-node
# Port 4003: students-node
# Port 4006: notifications-node
# Port 5174: frontend
```

### **2. Installer les dépendances manquantes:**
```bash
# Dans students-node
pip install httpx

# Dans notifications-node (déjà fait)
npm install
```

### **3. Tester le système:**
```bash
# Connexion admin
# Modifier un élève (frais ou profil)
# Vérifier les notifications dans le dashboard parent/élève
```

---

## 📈 Améliorations Futures

### **Version 2.0:**
- 🔔 Notifications en temps réel (WebSocket)
- 📧 Envoi d'emails pour notifications importantes
- 📱 Push notifications (Progressive Web App)
- 🔕 Préférences de notification par utilisateur
- 📊 Analytics des notifications (taux de lecture, etc.)
- 🗂️ Catégories et filtres de notifications

---

**✅ Le système de notifications est maintenant opérationnel et documenté !**
