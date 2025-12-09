# 🤖 Service RAG Chatbot - SchoolReg

## Vue d'ensemble

Le service RAG (Retrieval Augmented Generation) est un chatbot intelligent et conversationnel qui combine :
- **Recherche documentaire** : Cherche dans la documentation SchoolReg (FAQ, guides, règlements)
- **IA Conversationnelle** : Répond naturellement aux salutations et questions générales
- **Génération augmentée** : Utilise OpenAI GPT-4o-mini pour générer des réponses précises basées sur les documents

## 🏗️ Architecture

```
microservices/services/RAG/
├── app/
│   ├── main.py          # FastAPI - Endpoints HTTP
│   ├── rag_engine.py    # Logique RAG (indexation, recherche, génération)
│   └── __init__.py
├── data/                # 📚 Documents source (PDF, MD, TXT, DOCX)
│   ├── FAQ longue.pdf
│   ├── Schoolreg.pdf
│   └── Secondaire_QC_Bulletin_Programmes_Démarche.pdf
├── storage/             # 💾 Index vectoriel persisté (généré automatiquement)
│   ├── default__vector_store.json
│   └── docstore.json
├── requirements.txt     # Dépendances Python
└── README.md           # Ce fichier
```

## ✨ Fonctionnalités

### 1. Chatbot Conversationnel
- ✅ Répond aux salutations ("Bonjour", "Salut", "Bonsoir")
- ✅ Se présente comme assistant SchoolReg
- ✅ Comprend le langage naturel
- ✅ Utilise des émojis pour être sympathique

### 2. Recherche Documentaire Intelligente
- ✅ Indexe automatiquement tous les documents du dossier `data/`
- ✅ Supporte PDF, Markdown, TXT, DOCX
- ✅ Recherche sémantique (pas juste par mots-clés)
- ✅ Retourne les sources avec scores de pertinence

### 3. Fallback Automatique
- 🔄 **OpenAI prioritaire** : Utilise GPT-4o-mini si disponible
- 🔄 **HuggingFace embeddings** : Bascule automatiquement si OpenAI embeddings échoue
- 🔄 **Ollama local** : Bascule vers Ollama si OpenAI LLM échoue
- ✅ **Aucune interruption** : Le service reste opérationnel même si OpenAI est indisponible

## 🚀 Configuration

### Variables d'Environnement (`.env` à la racine du projet)

```bash
# ============================================
# RAG CHATBOT (OpenAI + Llama-Index)
# ============================================
OPENAI_API_KEY=sk-proj-...  # Votre clé API OpenAI
RAG_MODE=auto                # Mode: auto (fallback automatique)

# Configuration RAG
RAG_PORT=5003                # Port du service (changé de 5002 à 5003)
RAG_MODEL=gpt-4o-mini       # Modèle LLM OpenAI
RAG_SIMILARITY_TOP_K=5       # Nombre de passages à récupérer
RAG_DATA_DIR=./data          # Dossier des documents source
RAG_STORAGE_DIR=./storage    # Dossier de l'index vectoriel
```

## 📦 Installation

### 1. Installer les dépendances

```bash
cd microservices/services/RAG
pip install -r requirements.txt
```

### 2. Ajouter vos documents

Placez vos fichiers dans le dossier `data/` :

```bash
data/
├── FAQ_Parents.pdf
├── Guide_Inscription.md
├── Reglement_Interieur.docx
└── ...
```

**Formats supportés :**
- PDF (`.pdf`)
- Markdown (`.md`)
- Texte (`.txt`)
- Word (`.docx`)

### 3. Démarrer le service

**Avec le script de redémarrage (recommandé) :**
```powershell
# Depuis la racine du projet
./microservices/restart-servers.ps1
```

**Manuellement :**
```bash
cd microservices/services/RAG
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5003
```

Le service va :
1. Charger la clé OpenAI depuis `.env`
2. Charger l'index depuis `storage/` (ou le créer si absent)
3. Démarrer sur `http://localhost:5003`

## 🔌 Endpoints API

### 1. Health Check
```http
GET http://localhost:5003/
```

**Réponse :**
```json
{
  "service": "SchoolReg RAG",
  "status": "running",
  "version": "1.0.0"
}
```

### 2. Statistiques du Service
```http
GET http://localhost:5003/stats
```

**Réponse :**
```json
{
  "success": true,
  "data_dir": "data",
  "storage_dir": "storage",
  "documents_count": 3,
  "index_exists": true,
  "model": "gpt-4o-mini",
  "similarity_top_k": 5,
  "active_model": "OpenAI gpt-4o-mini + HF embeddings",
  "using_openai": true,
  "using_ollama": false
}
```

### 3. Chat (Conversationnel)
```http
POST http://localhost:5003/chat
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>  # Optionnel

{
  "question": "Bonjour !"
}
```

**Réponse :**
```json
{
  "success": true,
  "question": "Bonjour !",
  "answer": "Bonjour ! 😊 Je suis ravi de te rencontrer. Je suis ici pour t'aider avec tout ce qui concerne SchoolReg...",
  "sources": [
    {
      "file_name": "FAQ longue.pdf",
      "page": 1,
      "score": 0.7018549518862249,
      "text_preview": "FAQ longue – SchoolReg (55 Q/R)..."
    }
  ],
  "model_used": "OpenAI gpt-4o-mini + HF embeddings",
  "using_openai": true,
  "using_ollama": false
}
```

### 4. Recherche (Sans génération)
```http
GET http://localhost:5003/search?q=inscription
Authorization: Bearer <JWT_TOKEN>  # Optionnel
```

**Réponse :**
```json
{
  "success": true,
  "question": "inscription",
  "results": [
    {
      "file_name": "FAQ longue.pdf",
      "page": 2,
      "score": 0.692859275434978,
      "text": "C. Classes & Inscriptions (enrollments)..."
    }
  ],
  "count": 5
}
```

### 5. Reconstruire l'Index (Admin uniquement)
```http
POST http://localhost:5003/refresh
Authorization: Bearer <JWT_TOKEN>  # Requis (role: admin/direction/system)
```

**Réponse :**
```json
{
  "success": true,
  "message": "Index reconstruit avec succès",
  "stats": { ... }
}
```

## 🔐 Authentification

Le service utilise **JWT (JSON Web Tokens)** compatible avec les autres microservices SchoolReg.

### Accès Public (sans token)
- ✅ `/` - Health check
- ✅ `/stats` - Statistiques
- ✅ `/search` - Recherche
- ✅ `/chat` - Chat (accessible à tous les utilisateurs authentifiés)

### Accès Restreint
- 🔒 `/refresh` - Reconstruction d'index (admin, direction, system uniquement)

## 🧠 Fonctionnement du RAG

### 1. Indexation (au démarrage)

```
Documents (data/) → Chunking → Embeddings → Index Vectoriel (storage/)
                                 ↓
                           HuggingFace BAAI/bge-small-en-v1.5
                           (fallback si OpenAI échoue)
```

### 2. Requête Utilisateur

```
Question → Recherche Sémantique → Top-K Passages → Prompt + Contexte → LLM → Réponse
                                                                         ↓
                                                                   OpenAI GPT-4o-mini
                                                                   (fallback: Ollama)
```

### 3. Prompt Conversationnel

Le système utilise un prompt intelligent qui :
- Salue chaleureusement si c'est une salutation
- Utilise la documentation pour les questions SchoolReg
- Répond brièvement aux questions hors sujet et redirige vers SchoolReg
- Reste poli, clair et professionnel

## 🔄 Maintenance

### Ajouter de nouveaux documents

1. **Ajoutez** vos fichiers dans `data/`
2. **Supprimez** le dossier `storage/` (ou utilisez `/refresh`)
3. **Redémarrez** le service

```bash
# Option 1: Supprimer l'index et redémarrer
rm -rf microservices/services/RAG/storage
./microservices/restart-servers.ps1

# Option 2: Utiliser l'endpoint /refresh (avec token admin)
curl -X POST http://localhost:5003/refresh \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Logs et Debugging

Le service affiche des logs détaillés :

```
🚀 Démarrage du service RAG...
📂 Data directory: ./data
💾 Storage directory: ./storage
🤖 Model: gpt-4o-mini
🔄 Configuration d'OpenAI (prioritaire)...
✅ OpenAI configuré: OpenAI gpt-4o-mini
💡 Ollama est disponible comme fallback en cas d'erreur
📂 Chargement de l'index depuis storage
✅ Index chargé avec succès
✅ Service RAG initialisé avec succès
```

## 🌐 Intégration Frontend

### Composant ChatBot React

Le composant `ChatBot.tsx` est déjà intégré et :
- ✅ Rendu via React Portal (z-index 9999)
- ✅ Visible pour tous les rôles (admin, direction, parent, student)
- ✅ Timeout de 30s pour éviter le chargement infini
- ✅ Affiche le badge du modèle utilisé (🤖 OpenAI ou 🦙 Ollama)

**URL de l'API dans le frontend :**
```typescript
// ChatBot.tsx
const response = await fetch('http://localhost:5003/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  },
  body: JSON.stringify({ question: userMessage.content }),
  signal: controller.signal
});
```

## 🛠️ Dépendances Principales

```txt
fastapi==0.115.5
uvicorn[standard]==0.30.6
llama-index-core==0.11.20
llama-index-llms-openai==0.2.16
llama-index-embeddings-openai==0.2.5
llama-index-llms-ollama==0.3.4
llama-index-embeddings-huggingface==0.3.1
python-jose[cryptography]==3.3.0
python-dotenv==1.0.1
```

## ⚠️ Problèmes Connus et Solutions

### Port 5002 occupé
**Problème :** Le port 5002 peut rester bloqué par des processus zombies.  
**Solution :** Nous utilisons maintenant le **port 5003** de façon permanente.

### Erreur OpenAI Embeddings (403 - model_not_found)
**Problème :** Le projet OpenAI n'a pas accès au modèle `text-embedding-ada-002`.  
**Solution :** Le fallback automatique bascule vers **HuggingFace BAAI/bge-small-en-v1.5** (local, gratuit).

### Chatbot invisible pour Parent/Élève
**Problème :** Le bouton était caché par d'autres éléments UI.  
**Solution :** Rendu via React Portal avec z-index 9999.

### Chargement infini
**Problème :** Le service RAG était bloqué pendant l'initialisation.  
**Solution :** Timeout de 30s côté frontend + message d'erreur clair.

## 📊 Métriques et Performance

- **Temps d'indexation** : ~2 secondes pour 3 documents PDF (19 chunks)
- **Temps de réponse** : ~1-3 secondes par requête
- **Taille de l'index** : ~50 KB pour 3 documents
- **Coût OpenAI** : ~$0.001 par requête (GPT-4o-mini)

## 🔮 Améliorations Futures

- [ ] Indexation incrémentale (sans tout reconstruire)
- [ ] Support des images (OCR + embeddings visuels)
- [ ] Cache des réponses fréquentes (Redis)
- [ ] Historique des conversations
- [ ] Feedback utilisateur (👍/👎) pour améliorer les réponses
- [ ] Support multilingue (EN, ES, etc.)
- [ ] Interface admin pour gérer les documents

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs du service (`uvicorn` output)
2. Testez les endpoints avec curl ou Postman
3. Vérifiez que `.env` contient bien `OPENAI_API_KEY`
4. Vérifiez que le dossier `data/` contient des documents

---

**Service développé avec ❤️ pour SchoolReg**  
**Technologie** : FastAPI + Llama-Index + OpenAI GPT-4o-mini + HuggingFace Embeddings
