# SchoolReg - Système de Gestion Scolaire

![Version](https://img.shields.io/badge/version-4.0-blue)
![Architecture](https://img.shields.io/badge/Architecture-Microservices-green)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178c6)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791)
![Stripe](https://img.shields.io/badge/Stripe-Integrated-635BFF)

## 📋 Description

SchoolReg est une application web moderne de gestion scolaire complète, conçue avec une **architecture microservices professionnelle**. Elle offre une solution tout-en-un pour gérer les élèves, les classes, les paiements en ligne (Stripe) et les inscriptions.

**🚀 Version 4.0**: Architecture 100% microservices avec tous les composants organisés dans le dossier `microservices/`

## ✨ Fonctionnalités Principales

### 🔐 Authentification et Sécurité
- **Multi-rôles**: Admin, Direction, Parent, Étudiant
- **JWT**: Authentification sécurisée avec tokens
- **RBAC Frontend**: Interface adaptée selon le rôle
- **RBAC Backend**: Endpoints protégés par rôle
- **Mots de passe**: Hashés avec bcrypt (10 rounds)
- **Code d'inscription unique**: Système SR2024-ABC123 pour liaison sécurisée

> ℹ️ **Important**  
> L'écran de connexion est réservé au **personnel de l'école** (administrateurs et enseignants) pour gérer la plateforme.  
> Les **parents** et **élèves** n'ont pas besoin de compte : ils utilisent le **formulaire public d'inscription en ligne** pour soumettre une demande et téléverser les documents.

### 👥 Gestion des Élèves
- CRUD complet (Créer, Lire, Modifier, Supprimer)
- Recherche avancée par nom, prénom ou parent
- Statuts: Actif, Inactif, Diplômé
- Historique des paiements par élève

### 🏫 Gestion des Classes
- Création et gestion des classes
- Suivi de la capacité et des inscrits
- Affectation des enseignants
- Gestion des emplois du temps

### 📝 Affectations
- Inscription des élèves dans les classes
- Suivi des statuts d'inscription
- Compteurs en temps réel

### 💰 Gestion des Paiements
- **Vue groupée par élève**: Affichage des paiements groupés avec expand/collapse
- **Enregistrement de tous types de paiements**: Scolarité, inscription, matériel, etc.
- **Paiement en ligne via Stripe**: Payment Intent & Checkout Session
- **Mode simulation pour tests**: Pas besoin de vraie carte Stripe
- **Historique détaillé par élève**: Tous les paiements d'un élève dans une interface
- **Gestion des frais de scolarité**: Admin peut modifier le montant des frais
- **Ajustement automatique**: Création automatique de paiements en attente si augmentation
- **Notification automatique aux parents**: Via service de notifications
- **Interface parent**: Carte affichant solde et bouton de paiement
- **Suppression de paiements**: Ajustement automatique du `tuition_paid`
- **Sessions académiques**: Attribution automatique (Automne, Hiver, Été)
- **Statistiques et KPI**: Dashboard avec métriques en temps réel

### 📋 Inscriptions et Liaison de Profil
- **Formulaire public** accessible sans authentification
- **Approbation administrative** avec workflow complet
- **Code d'inscription unique** (ex: SR2024-ABC123) généré automatiquement
- **Liaison sécurisée**: L'élève entre son code pour accéder à son profil
- **Téléversement de documents**: Acte de naissance, photo, etc.
- **Interface de modération**: Visible uniquement pour admin/direction

### 🔑 Système de Code d'Accès Élève
- **Code unique par élève**: Format SR2024-XXXXXX
- **Génération automatique**: À la création ou approbation de l'élève
- **Accès sécurisé**: Les élèves utilisent leur code au lieu d'un mot de passe
- **Profil personnalisé**: Dashboard élève avec informations et paiements
- **Pas de compte requis**: Simple code d'accès suffit

### 📊 Tableau de Bord
- KPI en temps réel
- Statistiques sur les élèves, classes et revenus
- Suivi des paiements en attente

### 🤖 Assistant Virtuel (RAG Chatbot)
- **Chatbot intelligent** basé sur l'IA (GPT-4o-mini)
- **Réponses instantanées** aux questions fréquentes
- **Sources citées** pour chaque réponse
- **Accessible à tous** : admin, direction, parents, élèves
- **Documentation indexée** : FAQ, guides, règlements
- **Disponible 24/7** via bouton flottant

## 🚀 Technologies Utilisées

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Icônes**: Lucide React
- **Paiements**: Stripe SDK

### Backend (Architecture Microservices)
- **Auth Service** (Port 4001): Node.js + Express + Prisma (PostgreSQL)
- **Applications Service** (Port 4002): Node.js + Express + Prisma (PostgreSQL)
- **Students Service** (Port 4003): Python + FastAPI + SQLAlchemy (PostgreSQL)
- **Classes Service** (Port 4005): Node.js + Express + Prisma (PostgreSQL)
- **Notifications Service** (Port 4006): Node.js + Express
- **Payments Service** (Port 4008): Python + FastAPI + Stripe SDK (PostgreSQL) ⚠️ Port 4008 (4004 non disponible)
- **Resources Service** (Port 5001): Python + FastAPI + Motor (MongoDB)
- **RAG Service** (Port 5003): Python + FastAPI + Llama-Index + OpenAI + HuggingFace (Chatbot IA conversationnel)

### Bases de données
- **PostgreSQL**: Données relationnelles (étudiants, applications, paiements)
- **MongoDB**: Ressources pédagogiques et modules (optionnel)

### Infrastructure
- **Reverse Proxy**: API Gateway (port 3001)
- **Load Balancing**: Prêt pour scale horizontal
- **Service Discovery**: Configuration centralisée via .env

## 📦 Installation

### Prérequis
- Node.js 20+
- Python 3.10+
- PostgreSQL 14+
- MongoDB 6+ (optionnel, pour resources service)
- Compte Stripe Developer (pour paiements en ligne)

### Installation rapide

1. **Cloner le projet**
```bash
git clone <url-du-repo>
cd project
```

2. **Installer les dépendances**

```bash
# Frontend
npm install

# Gateway
cd microservices/gateway && npm install && cd ../..

# Applications service
cd microservices/services/applications-node && npm install && cd ../../..

# Resources service
cd microservices/services/resources-fastapi && pip install -r requirements.txt && cd ../../..

# Students service
cd microservices/services/students-node && pip install -r requirements.txt && cd ../../..

# RAG service (Chatbot IA)
cd microservices/services/RAG && pip install -r requirements.txt && cd ../../..

# Monolithe (temporaire pour auth/classes/notifications)
cd server && npm install && cd ..
```

3. **Configurer les variables d'environnement**

Le fichier `.env` à la racine contient toute la configuration:
```env
# Frontend
VITE_API_URL=http://localhost:3001/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY

# Databases
DATABASE_URL=postgresql://postgres:password@localhost:5432/schoolreg
MONGODB_URI=mongodb://localhost:27017/schoolreg

# Auth
JWT_SECRET=your_secret_key

# Ports
GATEWAY_PORT=3001
AUTH_PORT=4001
APPLICATIONS_PORT=4002
STUDENTS_PORT=4003
CLASSES_PORT=4005
NOTIFICATIONS_PORT=4006
PAYMENTS_PORT=4008
RESOURCES_PORT=5001
RAG_PORT=5003
FRONTEND_PORT=5174

# Service URLs
AUTH_SERVICE_URL=http://localhost:4001
APPLICATIONS_SERVICE_URL=http://localhost:4002
STUDENTS_SERVICE_URL=http://localhost:4003
CLASSES_SERVICE_URL=http://localhost:4005
NOTIFICATIONS_SERVICE_URL=http://localhost:4006
PAYMENTS_SERVICE_URL=http://localhost:4008
RESOURCES_SERVICE_URL=http://localhost:5001
RAG_SERVICE_URL=http://localhost:5003

# Stripe (Pour paiements en ligne)
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_SIMULATION_MODE=true

# RAG Chatbot (OpenAI + Llama-Index)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
RAG_MODE=auto
RAG_MODEL=gpt-4o-mini
RAG_SIMILARITY_TOP_K=5

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176

# Environment
NODE_ENV=development
```

4. **Configurer PostgreSQL**

```bash
# Créer la base de données
createdb schoolreg

# Exécuter les migrations Prisma
cd server
npx prisma migrate dev
npx prisma generate
cd ..
```

5. **Lancer tous les services**

```bash
# Terminal 1: Gateway
cd microservices/gateway && npm run dev

# Terminal 2: Applications service
cd microservices/services/applications-node && npm run dev

# Terminal 3: Resources service
cd microservices/services/resources-fastapi && uvicorn app.main:app --port 5001

# Terminal 4: Students service
cd microservices/services/students-node && uvicorn app.main:app --port 4002

# Terminal 5: Monolithe (temporaire)
cd server && npm run dev

# Terminal 6: Frontend
npm run dev
```

L'application sera accessible sur `http://localhost:5174`  
L'API Gateway sur `http://localhost:3001`

## ⚙️ Configuration des Ports

**Services actifs:**

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5174 | http://localhost:5174 |
| Gateway | 3001 | http://localhost:3001 |
| Auth | 4001 | http://localhost:4001 |
| Applications | 4002 | http://localhost:4002 |
| Students | 4003 | http://localhost:4003 |
| Classes | 4005 | http://localhost:4005 |
| Notifications | 4006 | http://localhost:4006 |
| **Payments** | **4008** | http://localhost:4008 ⚠️ |
| Resources | 5001 | http://localhost:5001 |
| RAG Chatbot | 5003 | http://localhost:5003 |

> ⚠️ **Note importante**: Le service Payments utilise le port **4008** au lieu de 4004 en raison de processus zombie sur le port 4004.

## 📖 Documentation

### Architecture Microservices
- **[Architecture complète](microservices/ARCHITECTURE.md)** - Guide complet de l'architecture
- **[Migration complétée](MIGRATION_COMPLETE.md)** - Résumé de la migration vers microservices
- **[Students Service](microservices/services/students-node/README.md)** - Documentation du service étudiants

### Guides Legacy
- [Guide de déploiement complet](DEPLOYMENT.md)
- [Fonctionnalités implémentées](docs/FONCTIONNALITES_IMPLEMENTEES.md)
- [Présentation Sprint 2](docs/Sprint_2_Presentation_Final.md)

## 🎯 Utilisation

### Premier lancement

1. Accédez à l'application
2. Cliquez sur "Créer un compte"
3. Remplissez les informations et **sélectionnez "Administrateur"** comme rôle
4. Connectez-vous avec vos identifiants

### Navigation

#### Pour tous les utilisateurs authentifiés:
- **Tableau de bord**: Vue d'ensemble avec KPI
- **Élèves**: Gestion complète des élèves
- **Classes**: Gestion des classes et affectations
- **Paiements**: Enregistrement et suivi des paiements

#### Pour les administrateurs uniquement:
- **Inscriptions**: Validation des demandes d'inscription en ligne

### Formulaire public d'inscription

Le formulaire d'inscription est accessible publiquement (sans authentification) pour permettre aux parents de soumettre des demandes d'inscription en ligne avec téléversement de documents.

## 🔒 Sécurité

### Backend
- **JWT**: Tokens sécurisés avec expiration
- **RBAC**: Endpoints protégés par rôle (admin, direction, parent, student)
- **Service JWT**: Communication sécurisée entre microservices
- **Bcrypt**: Hash des mots de passe (10 rounds)
- **Validation**: express-validator et Pydantic
- **CORS**: Origines configurées et limitées

### Frontend
- **UI conditionnelle**: Actions visibles selon le rôle
- **Liaison sécurisée**: Code d'inscription unique obligatoire
- **Badge rôle**: Indicateur visuel dans la navbar
- **Protection des routes**: Vérification côté client

### Données
- **PostgreSQL**: Données relationnelles chiffrées
- **MongoDB**: Ressources pédagogiques
- **Secrets**: Variables d'environnement uniquement

## 🚀 Démarrage Rapide

### Démarrer tous les microservices
```powershell
.\start-all.ps1
```

### Arrêter tous les services
```powershell
.\start-all.ps1 -StopOnly
```

### Accéder à l'application
```
http://localhost:5174
```

## 🎯 Comptes de Test

### Administrateur
- **Email:** admin@schoolreg.com
- **Mot de passe:** admin123
- **Rôle:** Administrateur complet

### Parent (Exemple)
- **Code d'accès élève:** SR2024-ABC123 (généré automatiquement)
- **Interface:** Dashboard parent avec solde et paiements

### Élève (Exemple)
- **Code d'accès:** SR2024-ABC123
- **Interface:** Dashboard élève avec informations personnelles

## 🛠️ Scripts Disponibles

### Frontend (dans microservices/services/frontend-react/)
```bash
npm run dev      # Développement
npm run build    # Build production
npm run preview  # Prévisualisation
```

### Backend (dans microservices/services/backend-monolith/)
```bash
npm run dev      # Développement avec hot reload
npx prisma generate  # Générer Prisma Client
npx prisma migrate dev  # Migrations
```

### Services Python
```bash
python run.py    # Payments service
python app/main.py  # Resources service
```

## 📊 Structure du Projet (Architecture Microservices)

```
project/
├── microservices/                    # TOUT EST ICI!
│   ├── README.md                    # Documentation architecture
│   ├── requirements.txt             # Python dependencies
│   │
│   ├── client/                      # FRONTEND
│   │   └── frontend-react/         # React App (Port 5173)
│   │       ├── src/
│   │       ├── public/
│   │       ├── index.html
│   │       ├── vite.config.ts
│   │       └── package.json
│   │
│   ├── server/                      # GATEWAY
│   │   ├── src/index.js            # API Gateway (Port 3001)
│   │   ├── package.json
│   │   └── uploads/                # Fichiers partagés
│   │
│   └── services/                    # BACKEND SERVICES (100% Microservices)
│       ├── auth-node/              # Service Auth (Port 4001)
│       │   ├── src/index.js
│       │   ├── prisma/schema.prisma
│       │   └── package.json
│       │
│       ├── students-node/          # Service Students (Port 4002)
│       │   ├── app/main.py
│       │   └── requirements.txt
│       │
│       ├── applications-node/      # Service Applications (Port 4003)
│       │   ├── src/index.js
│       │   └── package.json
│       │
│       ├── payments-fastapi/       # Service Payments Stripe (Port 4004)
│       │   ├── app/main.py
│       │   ├── run.py
│       │   └── requirements.txt
│       │
│       ├── classes-node/           # Service Classes (Port 4005)
│       │   ├── src/index.js
│       │   └── package.json
│       │
│       ├── notifications-node/     # Service Notifications (Port 4006)
│       │   ├── src/index.js
│       │   └── package.json
│       │
│       ├── resources-fastapi/      # Service Resources (Port 5001)
│       │   ├── app/main.py
│       │   └── requirements.txt
│       │
│       └── RAG/                    # Service RAG Chatbot IA (Port 5003)
│           ├── app/
│           │   ├── main.py        # API FastAPI
│           │   └── rag_engine.py  # Moteur RAG (Llama-Index)
│           ├── data/              # Documents indexés (non versionné)
│           ├── storage/           # Index vectoriel (généré auto)
│           ├── requirements.txt
│           └── README.md          # Documentation détaillée
│
├── .env                            # Configuration unique
├── start-all.ps1                   # Script de démarrage
├── requirements.txt                # Python dependencies (racine)
└── README.md                       # Ce fichier
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer:

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Pushez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📝 Licence

Ce projet est sous licence MIT.

## 👥 Auteurs

- Votre équipe de développement

## 🙏 Remerciements

- [React](https://react.dev)
_ [Stripe](https://stripe.com)
- [TailwindCSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
- [PostgreSQL](https://postgresql.org)

## 🔧 Dépannage (Troubleshooting)

### Problèmes Courants

#### 1. Erreur CORS ou Timeout sur Dashboard

**Symptôme:**
```
Error fetching dashboard stats: Error: timeout
Blocage d'une requête multiorigine (Cross-Origin Request)
```

**Cause:** Service `students-node` non démarré sur le port 4003

**Solution:**
```powershell
cd microservices/services/students-node
python -m uvicorn app.main:app --host 0.0.0.0 --port 4003 --reload
```

#### 2. Erreur 404 sur /checkout-session

**Symptôme:**
```
XHR POST http://localhost:4004/checkout-session [404 Not Found]
```

**Cause:** Service Payments non démarré ou sur mauvais port

**Solution:**
```powershell
cd microservices/services/payments-fastapi
uvicorn app.main:app --host 0.0.0.0 --port 4008 --reload
```

Vérifiez que le frontend pointe vers le bon port dans `src/lib/apiClient.ts`:
```typescript
const PAYMENTS_URL = 'http://localhost:4008';
```

#### 3. Erreur 405 Method Not Allowed sur DELETE /payments

**Symptôme:**
```
XHR DELETE http://localhost:4003/payments/{id} [405 Method Not Allowed]
```

**Cause:** Endpoint DELETE manquant (corrigé dans version actuelle)

**Solution:** Service students-node contient maintenant l'endpoint DELETE avec ajustement automatique du `tuition_paid`

#### 4. Processus Zombie sur Port 4004

**Symptôme:** Impossible de démarrer payments-fastapi sur 4004

**Solution temporaire:** Utiliser le port 4008
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 4008 --reload
```

**Solution permanente:** Redémarrer Windows pour nettoyer les processus zombie

#### 5. Hard Refresh Nécessaire

Si les changements ne s'appliquent pas:
- **Windows:** `Ctrl + Shift + R` ou `Ctrl + F5`
- Ouvrir DevTools (F12) → Clic droit sur Rafraîchir → "Vider le cache et actualiser"

### Vérifier les Services

**Windows PowerShell:**
```powershell
# Vérifier tous les services
netstat -ano | findstr ":4003 :4008 :5174"

# Arrêter un processus
taskkill /F /PID <PID>
```

## 📞 Support

Pour toute question ou problème:
- Consultez la [documentation](docs/)
- Vérifiez la section Dépannage ci-dessus
- Ouvrez une issue sur GitHub
- Contactez l'équipe de support

---

**Fait avec ❤️ pour l'éducation**
