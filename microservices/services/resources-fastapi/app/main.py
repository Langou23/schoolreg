"""
============================================
SERVICE DE RESSOURCES PÉDAGOGIQUES (resources-fastapi)
============================================
Port: 5001 (par défaut) | Python + FastAPI + MongoDB

Responsabilités:
- Gestion des modules d'apprentissage pédagogiques
- CRUD complet sur les ressources éducatives
- Stockage dans MongoDB (collection: learning_modules)
- Authentification JWT pour accès sécurisé

Structure d'un module:
- title: Titre du module
- description: Description détaillée
- subject: Matière (Mathématiques, Français, etc.)
- level: Niveau scolaire (primaire, secondaire, etc.)
- duration: Durée en minutes
- objectives: Liste des objectifs pédagogiques
- prerequisites: Prérequis
- resources: Ressources associées (liens, fichiers)
- assessments: Évaluations
- isPublished: Publié ou brouillon
- createdBy: Créateur du module

Base de données:
- MongoDB avec motor (async)
- Fallback gracieux si MongoDB non disponible
============================================
"""

import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Body, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import jwt
# Imports MongoDB avec fallback gracieux
# Permet au service de démarrer même si MongoDB n'est pas installé
try:
    from motor.motor_asyncio import AsyncIOMotorClient  # type: ignore
    _motor_ok = True
    _motor_err = None
except Exception as _e:
    AsyncIOMotorClient = None  # type: ignore
    _motor_ok = False
    _motor_err = str(_e)

try:
    from bson import ObjectId  # type: ignore
    _bson_ok = True
except Exception:
    ObjectId = None  # type: ignore
    _bson_ok = False

def load_root_env():
    """
    Cherche et charge le fichier .env dans les répertoires parents
    Remonte l'arborescence jusqu'à trouver le .env à la racine du projet
    """
    p = Path(__file__).resolve()
    for parent in [p.parent, *p.parents]:
        env = parent / ".env"
        if env.exists():
            load_dotenv(env)
            return str(env)
    return None


load_root_env()

app = FastAPI(title="resources-fastapi")
origins = [o.strip() for o in (os.getenv("CORS_ORIGIN") or "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/schoolreg")
if _motor_ok and AsyncIOMotorClient is not None:
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.get_default_database()
else:
    client = None
    db = None
modules_coll = db.get_collection("learning_modules") if db is not None else None
PORT = int(os.getenv("RESOURCES_PORT", "5001"))

# ============================================
# JWT AUTHENTICATION
# ============================================

JWT_SECRET = os.getenv("JWT_SECRET", "default-secret")

def get_current_user(authorization: str = Header(None)):
    """
    Extrait et vérifie le token JWT de la requête
    
    Returns:
        dict: Payload du token {userId, email, role}
    
    Raises:
        HTTPException 401: Si token manquant ou invalide
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization.split(" ")[1]

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*allowed_roles):
    """
    Middleware qui exige un ou plusieurs rôles spécifiques
    
    Usage: user: dict = Depends(require_role("admin", "direction"))
    
    Args:
        *allowed_roles: Rôles autorisés
    
    Raises:
        HTTPException 403: Si l'utilisateur n'a pas le bon rôle
    """
    def wrapper(user: dict = Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return wrapper


@app.get("/health")
async def health():
    """
    GET /health - Vérifie l'état du service
    
    Retourne:
        - status: ok si tout fonctionne, degraded si erreur
        - service: Nom du service
        - db: État de la connexion MongoDB (si applicable)
        - motor_error: Erreur d'import motor si applicable
    
    Permet de vérifier la disponibilité de MongoDB sans bloquer le service
    """
    try:
        if db is None:
            return {"status": "ok", "service": "resources-fastapi", "db": "not_connected", "motor_error": _motor_err}
        await db.command("ping")
        return {"status": "ok", "service": "resources-fastapi"}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}


@app.get("/resources")
async def list_resources():
    """
    GET /resources - Liste toutes les ressources
    
    TODO: Implémenter la logique de récupération depuis MongoDB
    
    Retourne: Liste vide pour l'instant (endpoint placeholder)
    """
    # TODO: implémenter requêtes MongoDB
    return []


def _serialize_module(doc: dict) -> dict:
    """
    Sérialise un document MongoDB pour l'API
    
    Convertit _id (ObjectId) en string "id" pour le JSON
    Retire le champ _id du résultat final
    
    Args:
        doc: Document MongoDB brut
    
    Returns:
        dict: Document sérialisé avec id au lieu de _id
    """
    d = {k: v for k, v in doc.items() if k != "_id"}
    d["id"] = str(doc.get("_id"))
    return d


@app.get("/modules")
async def list_modules(
    subject: Optional[str] = None,
    level: Optional[str] = None,
    isPublished: Optional[bool] = None,
    user: dict = Depends(get_current_user)
):
    """
    GET /modules - Liste les modules d'apprentissage
    
    Authentification: JWT requis
    
    Query params:
        - subject: Filtrer par matière (optionnel)
        - level: Filtrer par niveau (optionnel)
        - isPublished: Filtrer publiés/brouillons (optionnel)
    
    Retourne:
        Liste des modules triés par date de création (plus récents d'abord)
        Maximum 200 modules
    
    Fallback: Retourne [] si MongoDB non disponible
    """
    if modules_coll is None:
        return []
    filt: dict = {}
    if subject:
        filt["subject"] = subject
    if level:
        filt["level"] = level
    if isPublished is not None:
        filt["isPublished"] = isPublished
    cursor = modules_coll.find(filt).sort("createdAt", -1)
    docs = await cursor.to_list(length=200)
    return [_serialize_module(doc) for doc in docs]


@app.get("/modules/{module_id}")
async def get_module(
    module_id: str,
    user: dict = Depends(get_current_user)
):
    """
    GET /modules/{module_id} - Récupère un module par son ID
    
    Authentification: JWT requis
    
    Args:
        module_id: ID MongoDB du module (ObjectId en string)
    
    Retourne: Détails complets du module
    
    Erreurs:
        404: Module non trouvé ou ID invalide
        503: MongoDB non disponible
    """
    if modules_coll is None or not _bson_ok:
        raise HTTPException(status_code=404, detail="Module not found")
    try:
        oid = ObjectId(module_id)  # type: ignore
    except Exception:
        raise HTTPException(status_code=404, detail="Module not found")
    doc = await modules_coll.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Module not found")
    return _serialize_module(doc)


def _validate_module_payload(payload: dict) -> dict:
    """
    Valide et normalise les données d'un module
    
    Champs requis:
        - title: Titre du module
        - description: Description
        - subject: Matière
        - level: Niveau scolaire
        - duration: Durée en minutes (entier > 0)
    
    Champs avec valeurs par défaut:
        - objectives: [] (liste vide)
        - prerequisites: []
        - resources: []
        - assessments: []
        - createdBy: "system"
        - isPublished: False
    
    Args:
        payload: Données brutes du module
    
    Returns:
        dict: Données validées et normalisées
    
    Raises:
        HTTPException 400: Si données invalides
    """
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid payload")
    
    # Vérifier les champs requis
    required = ["title", "description", "subject", "level", "duration"]
    for k in required:
        if k not in payload or payload[k] in (None, ""):
            raise HTTPException(status_code=400, detail=f"Missing field: {k}")
    
    # Valider et convertir la durée
    try:
        payload["duration"] = int(payload["duration"])  # type: ignore
        if payload["duration"] < 0:
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid duration")
    
    # Définir les valeurs par défaut
    if "objectives" not in payload or payload["objectives"] is None:
        payload["objectives"] = []
    if "prerequisites" not in payload or payload["prerequisites"] is None:
        payload["prerequisites"] = []
    if "resources" not in payload or payload["resources"] is None:
        payload["resources"] = []
    if "assessments" not in payload or payload["assessments"] is None:
        payload["assessments"] = []
    if "createdBy" not in payload or payload["createdBy"] in (None, ""):
        payload["createdBy"] = "system"
    if "isPublished" not in payload:
        payload["isPublished"] = False
    
    return payload


@app.post("/modules")
async def create_module(
    payload: dict = Body(...),
    user: dict = Depends(require_role("admin", "direction"))
):
    """
    POST /modules - Crée un nouveau module d'apprentissage
    
    Authentification: JWT requis
    Rôles autorisés: admin, direction
    
    Body (requis):
        - title: Titre du module
        - description: Description détaillée
        - subject: Matière (Mathématiques, Français, etc.)
        - level: Niveau (primaire, secondaire, etc.)
        - duration: Durée en minutes
    
    Body (optionnel):
        - objectives: Objectifs pédagogiques ([])
        - prerequisites: Prérequis ([])
        - resources: Ressources associées ([])
        - assessments: Évaluations ([])
        - createdBy: Créateur ("system" par défaut)
        - isPublished: Publié (false par défaut)
    
    Automatique:
        - createdAt, updatedAt: Définis automatiquement
    
    Retourne: Module créé avec son ID
    
    Erreurs:
        400: Données invalides
        503: MongoDB non disponible
    """
    if modules_coll is None:
        raise HTTPException(status_code=503, detail="Database not available")
    data = _validate_module_payload(payload)
    from datetime import datetime
    now = datetime.utcnow()
    data["createdAt"], data["updatedAt"] = now, now
    res = await modules_coll.insert_one(data)
    doc = await modules_coll.find_one({"_id": res.inserted_id})
    return _serialize_module(doc)


@app.put("/modules/{module_id}")
async def update_module(
    module_id: str,
    payload: dict = Body(...),
    user: dict = Depends(require_role("admin", "direction"))
):
    """
    PUT /modules/{module_id} - Met à jour un module existant
    
    Authentification: JWT requis
    Rôles autorisés: admin, direction
    
    Args:
        module_id: ID MongoDB du module
    
    Body: Champs à mettre à jour (partiels autorisés)
        Champs modifiables:
        - title, description, subject, level, duration
        - objectives, prerequisites, resources, assessments
        - createdBy, isPublished
    
    Automatique:
        - updatedAt: Mis à jour automatiquement
    
    Validation:
        - duration doit être un entier ≥ 0
        - Seuls les champs autorisés sont pris en compte
    
    Retourne: Module mis à jour
    
    Erreurs:
        400: Durée invalide
        404: Module non trouvé
        503: MongoDB non disponible
    """
    if modules_coll is None or not _bson_ok:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        oid = ObjectId(module_id)  # type: ignore
    except Exception:
        raise HTTPException(status_code=404, detail="Module not found")
    allowed_keys = {"title","description","subject","level","duration","objectives","prerequisites","resources","assessments","createdBy","isPublished"}
    update_data = {k: v for k, v in (payload or {}).items() if k in allowed_keys}
    if "duration" in update_data:
        try:
            update_data["duration"] = int(update_data["duration"])  # type: ignore
            if update_data["duration"] < 0:
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid duration")
    from datetime import datetime
    update_data["updatedAt"] = datetime.utcnow()
    r = await modules_coll.update_one({"_id": oid}, {"$set": update_data})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    doc = await modules_coll.find_one({"_id": oid})
    return _serialize_module(doc)


@app.delete("/modules/{module_id}")
async def delete_module(
    module_id: str,
    user: dict = Depends(require_role("admin", "direction"))
):
    """
    DELETE /modules/{module_id} - Supprime un module
    
    Authentification: JWT requis
    Rôles autorisés: admin, direction
    
    Args:
        module_id: ID MongoDB du module
    
    Attention: Action irréversible
    
    Retourne: {"deleted": true}
    
    Erreurs:
        404: Module non trouvé
        503: MongoDB non disponible
    """
    if modules_coll is None or not _bson_ok:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        oid = ObjectId(module_id)  # type: ignore
    except Exception:
        raise HTTPException(status_code=404, detail="Module not found")
    r = await modules_coll.delete_one({"_id": oid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"deleted": True}


# Lancement recommandé:
#   uvicorn app.main:app --port %RESOURCES_PORT%

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("RESOURCES_PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
