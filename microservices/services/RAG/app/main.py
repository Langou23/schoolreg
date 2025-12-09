"""
Service RAG FastAPI pour SchoolReg
Expose un chatbot intelligent basé sur la documentation
"""
import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Query, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import jwt

from app.rag_engine import RAGEngine

# Charger les variables d'environnement depuis la racine du projet
def load_root_env():
    p = Path(__file__).resolve()
    for parent in [p.parent, *p.parents]:
        env = parent / ".env"
        if env.exists():
            load_dotenv(env)
            print(f"✅ .env chargé depuis: {env}")
            return str(env)
    return None

load_root_env()

# Configuration
DATA_DIR = os.getenv("RAG_DATA_DIR", "./data")
STORAGE_DIR = os.getenv("RAG_STORAGE_DIR", "./storage")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "your_secret_key")
MODEL = os.getenv("RAG_MODEL", "gpt-4o-mini")
SIMILARITY_TOP_K = int(os.getenv("RAG_SIMILARITY_TOP_K", "5"))

# Initialiser FastAPI
app = FastAPI(
    title="SchoolReg RAG Service",
    description="Service de chatbot intelligent basé sur RAG (Retrieval Augmented Generation)",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialiser le moteur RAG au démarrage
rag_engine: Optional[RAGEngine] = None


@app.on_event("startup")
async def startup_event():
    """Initialise le moteur RAG au démarrage"""
    global rag_engine
    
    try:
        print("🚀 Démarrage du service RAG...")
        print(f"📂 Data directory: {DATA_DIR}")
        print(f"💾 Storage directory: {STORAGE_DIR}")
        print(f"🤖 Model: {MODEL}")
        
        rag_engine = RAGEngine(
            data_dir=DATA_DIR,
            storage_dir=STORAGE_DIR,
            openai_api_key=OPENAI_API_KEY,
            model=MODEL,
            similarity_top_k=SIMILARITY_TOP_K
        )
        
        print("✅ Service RAG initialisé avec succès")
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation du RAG: {e}")
        raise


# ============================================
# AUTHENTIFICATION JWT
# ============================================

def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Vérifie le token JWT et extrait les informations utilisateur
    Compatible avec l'authentification de SchoolReg
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        # Extraire le token du header "Bearer <token>"
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
        else:
            token = authorization
        
        # Décoder le token JWT
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        return {
            "userId": payload.get("userId") or payload.get("id"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "fullName": payload.get("fullName")
        }
    
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*allowed_roles):
    """Décorateur pour restreindre l'accès par rôle"""
    def dependency(authorization: Optional[str] = Header(None)):
        user = get_current_user(authorization)
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {allowed_roles}"
            )
        return user
    return dependency


# ============================================
# MODÈLES PYDANTIC
# ============================================

class ChatRequest(BaseModel):
    """Requête de chat"""
    question: str
    
    class Config:
        schema_extra = {
            "example": {
                "question": "Comment inscrire mon enfant à SchoolReg?"
            }
        }


class ChatResponse(BaseModel):
    """Réponse du chatbot"""
    success: bool
    question: str
    answer: Optional[str] = None
    sources: Optional[list] = None
    error: Optional[str] = None


class SearchResponse(BaseModel):
    """Réponse de recherche"""
    success: bool
    question: str
    results: Optional[list] = None
    count: Optional[int] = None
    error: Optional[str] = None


# ============================================
# ENDPOINTS PUBLICS (pour tous les utilisateurs authentifiés)
# ============================================

@app.get("/")
def root():
    """Health check"""
    return {
        "service": "SchoolReg RAG",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/stats")
def get_stats():
    """
    Statistiques du service RAG (accessible sans authentification)
    """
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    
    return rag_engine.get_stats()


@app.get("/search", response_model=SearchResponse)
async def search_documents(
    q: str = Query(..., description="Question ou terme de recherche"),
    authorization: Optional[str] = None
):
    """
    Recherche des passages pertinents dans la documentation
    Accessible aux parents et élèves
    
    Args:
        q: Question ou terme de recherche
        authorization: Token JWT (optionnel pour permettre accès public)
    
    Returns:
        Liste des passages les plus pertinents avec leurs scores
    """
    # Vérifier l'authentification si un token est fourni
    if authorization:
        try:
            user = get_current_user(authorization)
            print(f"🔍 Recherche par {user.get('email', 'inconnu')}: {q}")
        except:
            pass  # Autoriser l'accès même sans token valide
    
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    
    if not q or len(q.strip()) < 3:
        raise HTTPException(status_code=400, detail="La question doit contenir au moins 3 caractères")
    
    result = rag_engine.search(q)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Search failed"))
    
    return result


@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest = Body(...),
    authorization: Optional[str] = None
):
    """
    Chatbot intelligent avec génération de réponse
    Accessible aux parents et élèves
    
    Args:
        request: Objet contenant la question
        authorization: Token JWT (optionnel)
    
    Returns:
        Réponse générée avec les sources utilisées
    """
    # Vérifier l'authentification si un token est fourni
    if authorization:
        try:
            user = get_current_user(authorization)
            print(f"💬 Chat avec {user.get('email', 'inconnu')}: {request.question}")
        except:
            pass  # Autoriser l'accès même sans token valide
    
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    
    if not request.question or len(request.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="La question doit contenir au moins 3 caractères")
    
    result = rag_engine.query(request.question)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Query failed"))
    
    return result


# ============================================
# ENDPOINTS ADMIN (réservés à admin/direction)
# ============================================

@app.post("/refresh")
async def refresh_index(
    user: dict = Depends(require_role("admin", "direction", "system"))
):
    """
    Reconstruit l'index à partir des documents
    Réservé aux administrateurs
    
    Utilisez cet endpoint après avoir ajouté/modifié/supprimé des documents
    dans le dossier data/
    """
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG engine not initialized")
    
    try:
        print(f"🔄 Reconstruction de l'index demandée par {user.get('email', 'admin')}")
        rag_engine.refresh_index()
        
        return {
            "success": True,
            "message": "Index reconstruit avec succès",
            "stats": rag_engine.get_stats()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh index: {str(e)}")


# ============================================
# GESTION DES ERREURS
# ============================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Gestionnaire d'erreurs global"""
    print(f"❌ Erreur non gérée: {str(exc)}")
    return {
        "success": False,
        "error": str(exc)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("RAG_PORT", "5003")),
        reload=True
    )
