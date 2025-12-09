# 🤖 Service RAG (Retrieval Augmented Generation) - SchoolReg

Service de chatbot intelligent pour SchoolReg utilisant Llama-Index et OpenAI.

---

## 📋 Vue d'ensemble

Le service RAG permet aux utilisateurs (parents, élèves, admin) de poser des questions en langage naturel et d'obtenir des réponses précises basées sur la documentation de SchoolReg.

### Fonctionnalités

- ✅ **Chatbot intelligent** avec génération de réponses (GPT-4o-mini)
- ✅ **Recherche sémantique** dans la documentation
- ✅ **Sources citées** pour chaque réponse
- ✅ **Authentification JWT** intégrée
- ✅ **Index vectoriel persistant** (pas besoin de réindexer à chaque démarrage)
- ✅ **API REST FastAPI**

---

## 🏗️ Architecture

```
RAG/
├── app/
│   ├── __init__.py
│   ├── main.py           # API FastAPI (endpoints)
│   └── rag_engine.py     # Moteur RAG (indexation + requêtes)
│
├── data/                 # Documents sources (PDF, TXT, MD)
│   ├── FAQ longue.pdf
│   ├── Schoolreg.pdf
│   └── ...              # Ajoutez vos documents ici
│
├── storage/              # Index vectoriel (créé automatiquement)
│   ├── docstore.json
│   ├── default__vector_store.json
│   └── ...
│
├── requirements.txt
└── app.py               # Script de démo (legacy)
```

---

## 🚀 Installation

### 1. Installer les dépendances

```bash
cd microservices/services/RAG
pip install -r requirements.txt
```

### 2. Configuration

Créez un fichier `.env` ou ajoutez à votre `.env` racine :

```env
# OpenAI
OPENAI_API_KEY=sk-...

# RAG Configuration
RAG_DATA_DIR=./data
RAG_STORAGE_DIR=./storage
RAG_MODEL=gpt-4o-mini
RAG_SIMILARITY_TOP_K=5
RAG_PORT=5002

# JWT (même clé que les autres services)
JWT_SECRET=your_secret_key
```

### 3. Préparer les documents

Placez vos documents dans le dossier `data/` :

```bash
# Formats supportés
data/
├── FAQ_SchoolReg.pdf
├── Guide_Inscription.pdf
├── Reglement_Interieur.md
├── Programme_Secondaire.docx
└── ...
```

**Important:** Le dossier `data/` est ignoré par Git (.gitignore) pour éviter de versionner des fichiers lourds.

---

## 🎯 Utilisation

### Démarrer le service

```bash
cd microservices/services/RAG
uvicorn app.main:app --port 5002 --reload
```

Le service sera accessible sur: `http://localhost:5002`

### Endpoints API

#### 1. **GET /** - Health check
```bash
curl http://localhost:5002/
```

#### 2. **GET /stats** - Statistiques
```bash
curl http://localhost:5002/stats
```

Réponse:
```json
{
  "success": true,
  "data_dir": "./data",
  "storage_dir": "./storage",
  "documents_count": 3,
  "index_exists": true,
  "model": "gpt-4o-mini"
}
```

#### 3. **GET /search** - Recherche sémantique
Retourne les passages pertinents sans génération de réponse.

```bash
curl "http://localhost:5002/search?q=Comment inscrire mon enfant?"
```

Réponse:
```json
{
  "success": true,
  "question": "Comment inscrire mon enfant?",
  "results": [
    {
      "file_name": "Guide_Inscription.pdf",
      "page": "2",
      "score": 0.89,
      "text": "Pour inscrire votre enfant, rendez-vous sur..."
    }
  ],
  "count": 5
}
```

#### 4. **POST /chat** - Chatbot (génération de réponse)
Génère une réponse complète à la question.

```bash
curl -X POST http://localhost:5002/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"question": "Quels sont les frais d inscription?"}'
```

Réponse:
```json
{
  "success": true,
  "question": "Quels sont les frais d'inscription?",
  "answer": "Selon la documentation, les frais d'inscription sont de 150$ pour...",
  "sources": [
    {
      "file_name": "FAQ_SchoolReg.pdf",
      "page": "5",
      "score": 0.92,
      "text_preview": "Les frais d'inscription comprennent..."
    }
  ]
}
```

#### 5. **POST /refresh** - Reconstruire l'index (admin seulement)
Reconstruit l'index après avoir ajouté/modifié des documents.

```bash
curl -X POST http://localhost:5002/refresh \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🎨 Utilisation depuis le Frontend

Le composant `ChatBot.tsx` est déjà intégré dans l'application React.

### Affichage automatique

Le chatbot apparaît automatiquement sous forme de bouton flottant en bas à droite pour tous les utilisateurs connectés (admin, direction, parent, élève).

### Utilisation

1. Cliquez sur le bouton **"Besoin d'aide ?"**
2. Posez votre question en français
3. Recevez une réponse avec les sources citées
4. Cliquez sur les sources pour voir les détails

---

## 🔄 Workflow : Ajouter de nouveaux documents

### 1. Ajouter des fichiers dans `data/`

```bash
cd microservices/services/RAG/data
# Copier vos nouveaux PDF, MD, TXT, DOCX
cp ~/Downloads/Nouveau_Document.pdf ./
```

### 2. Reconstruire l'index

**Option A:** Via l'API (recommandé)

```bash
curl -X POST http://localhost:5002/refresh \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Option B:** Redémarrer le service

```bash
# Supprimer l'ancien index
rm -rf storage/

# Redémarrer le service
uvicorn app.main:app --port 5002 --reload
```

### 3. Tester

```bash
curl "http://localhost:5002/search?q=votre test"
```

---

## 🛠️ Configuration avancée

### Changer le modèle OpenAI

```env
# Plus rapide et moins cher
RAG_MODEL=gpt-4o-mini

# Plus précis mais plus cher
RAG_MODEL=gpt-4o

# Très rapide mais moins intelligent
RAG_MODEL=gpt-3.5-turbo
```

### Ajuster la pertinence des résultats

```env
# Nombre de passages récupérés (1-10)
RAG_SIMILARITY_TOP_K=5

# Plus de passages = contexte plus large mais risque de dilution
```

### Utiliser un modèle local (Ollama)

Modifier `app/rag_engine.py`:

```python
from llama_index.llms.ollama import Ollama

Settings.llm = Ollama(
    model='llama3:latest',
    temperature=0.1,
    max_tokens=2000
)
```

---

## 📊 Monitoring et Logs

Les logs du service affichent:

```
🚀 Démarrage du service RAG...
📂 Data directory: ./data
💾 Storage directory: ./storage
🤖 Model: gpt-4o-mini
📄 Lecture de 3 fichier(s)...
📊 15 document(s) chargé(s)
💾 Index sauvegardé dans ./storage
✅ Service RAG initialisé avec succès
```

Pendant l'utilisation:

```
🔍 Recherche par parent@example.com: Comment inscrire mon enfant?
💬 Chat avec admin@schoolreg.com: Quels sont les frais?
🔄 Reconstruction de l'index demandée par admin@schoolreg.com
```

---

## 🧪 Tests

### Test manuel

1. **Vérifier que le service démarre:**
   ```bash
   curl http://localhost:5002/
   # Réponse: {"service":"SchoolReg RAG","status":"running"}
   ```

2. **Tester la recherche:**
   ```bash
   curl "http://localhost:5002/search?q=inscription"
   ```

3. **Tester le chat:**
   ```bash
   curl -X POST http://localhost:5002/chat \
     -H "Content-Type: application/json" \
     -d '{"question":"Comment créer un compte?"}'
   ```

### Test depuis le frontend

1. Connectez-vous sur SchoolReg
2. Cliquez sur le bouton de chat en bas à droite
3. Posez une question: *"Comment inscrire mon enfant?"*
4. Vérifiez que la réponse contient des sources

---

## ❓ FAQ

### Q: L'index est-il créé automatiquement ?
**R:** Oui ! Au premier démarrage, le service lit tous les documents du dossier `data/` et crée l'index dans `storage/`. Les démarrages suivants chargent l'index existant (beaucoup plus rapide).

### Q: Comment ajouter de nouveaux documents ?
**R:** 
1. Copiez les nouveaux fichiers dans `data/`
2. Appelez `POST /refresh` (admin)
3. Ou supprimez le dossier `storage/` et redémarrez

### Q: Puis-je utiliser un modèle gratuit ?
**R:** Oui, vous pouvez utiliser Ollama avec des modèles open-source (llama3, mistral, etc.). Voir la section "Configuration avancée".

### Q: Pourquoi mes documents ne sont pas trouvés ?
**R:** 
- Vérifiez que les fichiers sont dans `data/`
- Vérifiez les formats supportés (PDF, TXT, MD, DOCX)
- Reconstruisez l'index avec `POST /refresh`
- Consultez les logs pour voir les erreurs

### Q: Le service RAG fonctionne sans authentification ?
**R:** Les endpoints `/search` et `/chat` sont accessibles sans token pour permettre un accès public. Le token est vérifié s'il est fourni. Seul `/refresh` nécessite un token admin.

---

## 🔐 Sécurité

- ✅ JWT vérifié sur l'endpoint `/refresh`
- ✅ Token optionnel sur `/search` et `/chat` (accès public possible)
- ✅ Validation des inputs (longueur minimale 3 caractères)
- ✅ Gestion des erreurs sécurisée
- ⚠️ Les documents dans `data/` ne sont PAS versionés (`.gitignore`)

---

## 📈 Performance

### Première indexation
- **Temps:** 10-30 secondes (selon le nombre de documents)
- **Consommation:** ~300 MB RAM

### Chargement de l'index existant
- **Temps:** 1-2 secondes
- **Consommation:** ~200 MB RAM

### Requête
- **Temps de réponse:** 1-3 secondes
- **Coût OpenAI:** ~$0.0001-0.001 par requête (gpt-4o-mini)

---

## 🎉 Résumé

**Le service RAG est prêt à l'emploi !**

1. ✅ Backend FastAPI créé
2. ✅ Moteur d'indexation Llama-Index configuré
3. ✅ Authentification JWT intégrée
4. ✅ Frontend React avec composant ChatBot
5. ✅ Documentation complète

**Prochaines étapes:**

1. Ajoutez vos documents dans `data/`
2. Démarrez le service : `uvicorn app.main:app --port 5002 --reload`
3. Testez le chatbot sur le frontend !

---

**Besoin d'aide ? Consultez la documentation ou posez une question au chatbot ! 😉**
