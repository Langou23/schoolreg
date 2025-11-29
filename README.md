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

### 🔐 Authentification et Rôles
- Système multi-rôles (Admin, Direction, Parent, Étudiant)
- Authentification sécurisée via JWT
- Gestion de session avec tokens
- Mots de passe hashés avec bcrypt

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
- Enregistrement de tous types de paiements
- Paiement en ligne via Stripe (Payment Intent & Checkout)
- Mode simulation pour tests
- Historique détaillé par élève
- Statistiques et KPI

### 📋 Inscriptions en Ligne
- **Formulaire public** accessible sans authentification
- Téléversement de documents (acte de naissance, photo, etc.)
- Validation administrative
- Approbation/rejet avec notes

### 📊 Tableau de Bord
- KPI en temps réel
- Statistiques sur les élèves, classes et revenus
- Suivi des paiements en attente

## 🚀 Technologies Utilisées

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Icônes**: Lucide React
-- **Paiements**: Stripe SDK

### Backend (Architecture Microservices)
- **API Gateway**: Node.js + Express + http-proxy-middleware
- **Applications Service**: Node.js + Express + Prisma (PostgreSQL)
- **Students Service**: Python + FastAPI + SQLAlchemy (PostgreSQL)
- **Resources Service**: Python + FastAPI + Motor (MongoDB optionnel)
- **Auth Service**: Node.js + Express + Prisma (temporaire: monolithe)

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
PORT=3002
APPLICATIONS_PORT=4003
STUDENTS_PORT=4002
RESOURCES_PORT=5001

# Service URLs
APPLICATIONS_SERVICE_URL=http://localhost:4003
STUDENTS_SERVICE_URL=http://localhost:4002
RESOURCES_SERVICE_URL=http://localhost:5001
MONOLITH_URL=http://localhost:3002

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

L'application sera accessible sur `http://localhost:5173`  
L'API Gateway sur `http://localhost:3001`

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

- Authentification JWT avec tokens sécurisés
- Mots de passe hashés avec bcrypt (10 rounds)
- Permissions basées sur les rôles (RBAC)
- Validation des données avec express-validator
- CORS configuré pour les origines autorisées
- Stockage sécurisé des documents
- Variables d'environnement pour les secrets

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
http://localhost:5173
```

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
│       └── resources-fastapi/      # Service Resources (Port 5001)
│           ├── app/main.py
│           └── requirements.txt
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

en considérant la partie 'notifications' comme un système de messagerie, veuillez me montrer quelles sont les étapes pour l'implémenter de manière simple et professionnelle
l'objectif est que l'élève et le parent recoivent une des messages venant de la direction de l'école à chaque action prise en donnant des conseils sur ce qui doit être fait ensuite
exemple (après inscription, on recoit un message sur le profil qui nous dit de payer les frais avant )

## 🙏 Remerciements

- [React](https://react.dev)
_ [Stripe](https://stripe.com)
- [TailwindCSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
- [PostgreSQL](https://postgresql.org)

## 📞 Support

Pour toute question ou problème:
- Consultez la [documentation](docs/)
- Ouvrez une issue sur GitHub
- Contactez l'équipe de support

---
faire un plan de test unitaire pour montrer que chaque API fonctionne correctement
vérifier chaque api si elle fonctionne correctement en appelant la fonctionnalité et renvoyer l'état de fonctionnement

**Fait avec ❤️ pour l'éducation**
