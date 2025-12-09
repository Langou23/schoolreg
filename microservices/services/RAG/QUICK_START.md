# 🚀 Guide de Démarrage Rapide - Service RAG

## ⚡ En 3 étapes

### 1️⃣ Configuration (une seule fois)

```powershell
# Aller dans le dossier RAG
cd microservices/services/RAG

# Installer les dépendances
pip install -r requirements.txt

# Ajouter la clé OpenAI dans le .env (à la racine du projet)
# Ouvrir le fichier .env et ajouter:
OPENAI_API_KEY=sk-votre-cle-ici
RAG_PORT=5002
```

### 2️⃣ Ajouter des documents

```powershell
# Les documents sont déjà présents dans data/
# Vous pouvez en ajouter d'autres (PDF, TXT, MD, DOCX)

ls data/
# FAQ longue.pdf
# Schoolreg.pdf
# Secondaire_QC_Bulletin...
```

### 3️⃣ Démarrer le service

**Option A: Script automatique (recommandé)**

```powershell
.\start-rag.ps1
```

**Option B: Commande manuelle**

```powershell
uvicorn app.main:app --port 5002 --reload
```

---

## ✅ Vérification

### Le service fonctionne ?

Ouvrez votre navigateur: **http://localhost:5002**

Vous devriez voir:
```json
{
  "service": "SchoolReg RAG",
  "status": "running",
  "version": "1.0.0"
}
```

### Tester l'API

```powershell
# Test de recherche
curl "http://localhost:5002/search?q=inscription"

# Test de chat
curl -X POST http://localhost:5002/chat `
  -H "Content-Type: application/json" `
  -d '{"question":"Comment inscrire mon enfant?"}'
```

### Tester le frontend

1. **Démarrez le frontend** (autre terminal):
   ```powershell
   cd microservices/client/frontend-react
   npm run dev
   ```

2. **Connectez-vous** sur SchoolReg

3. **Cliquez** sur le bouton de chat en bas à droite 💬

4. **Posez une question**: *"Quels sont les frais d'inscription?"*

---

## 📊 Logs de démarrage attendus

```
🚀 Démarrage du service RAG...
📂 Data directory: ./data
💾 Storage directory: ./storage
🤖 Model: gpt-4o-mini
📂 Chargement de l'index depuis ./storage
✅ Index chargé avec succès
✅ Service RAG initialisé avec succès
INFO:     Uvicorn running on http://0.0.0.0:5002
```

**Si c'est la première fois:**
```
🔨 Création d'un nouvel index depuis ./data
📄 Lecture de 3 fichier(s)...
📊 15 document(s) chargé(s)
💾 Index sauvegardé dans ./storage
```

---

## 🛠️ Dépannage

### ❌ Erreur: "OPENAI_API_KEY not found"

**Solution:**
```powershell
# Dans le fichier .env à la racine
OPENAI_API_KEY=sk-votre-cle-openai
```

### ❌ Erreur: "No module named 'fastapi'"

**Solution:**
```powershell
pip install -r requirements.txt
```

### ❌ Erreur: "No documents found in ./data"

**Solution:**
```powershell
# Vérifier que des fichiers existent
ls data/

# Si vide, ajouter des documents PDF/TXT/MD
cp ~/Documents/FAQ.pdf data/
```

### ❌ Le chatbot ne répond pas

**Checklist:**
1. ✅ Service RAG démarré sur port 5002
2. ✅ Frontend démarré sur port 5173
3. ✅ Clé OpenAI valide dans .env
4. ✅ Documents présents dans data/
5. ✅ Pas d'erreur dans les logs

**Test manuel:**
```powershell
curl http://localhost:5002/stats
```

---

## 🔄 Ajouter de nouveaux documents

### Méthode 1: Reconstruction automatique (recommandé)

```powershell
# 1. Ajouter vos documents dans data/
cp ~/Downloads/Nouveau_Guide.pdf data/

# 2. Reconstruire l'index via l'API (admin uniquement)
$token = "votre_token_admin"
curl -X POST http://localhost:5002/refresh `
  -H "Authorization: Bearer $token"
```

### Méthode 2: Redémarrage complet

```powershell
# 1. Ajouter vos documents
cp ~/Downloads/Nouveau_Guide.pdf data/

# 2. Supprimer l'ancien index
Remove-Item -Recurse -Force storage/

# 3. Redémarrer le service
uvicorn app.main:app --port 5002 --reload
```

---

## 📖 Documentation complète

Pour plus de détails, consultez: **README_RAG.md**

---

## 🎉 C'est tout !

Votre chatbot RAG est maintenant opérationnel ! 🤖

**Questions fréquentes:**
- ✅ "Comment inscrire mon enfant?"
- ✅ "Quels sont les frais d'inscription?"
- ✅ "Où trouver le formulaire d'inscription?"
- ✅ "Quel est le programme du secondaire?"

**Le chatbot répond instantanément avec les sources ! 📚**
