"""
RAG Engine - Gestion de l'indexation et des requêtes
Utilise Llama-Index pour créer et interroger un index vectoriel
"""
import os
from typing import List, Dict, Optional
from pathlib import Path

from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings, PromptTemplate, StorageContext, load_index_from_storage
from llama_index.core.retrievers import VectorIndexRetriever
from llama_index.core.query_engine import RetrieverQueryEngine

# Essayer d'importer OpenAI, sinon utiliser Ollama
try:
    from llama_index.llms.openai import OpenAI
    from llama_index.embeddings.openai import OpenAIEmbedding
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Importer Ollama comme alternative
try:
    from llama_index.llms.ollama import Ollama
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False


class RAGEngine:
    """Moteur RAG pour SchoolReg"""
    
    def __init__(
        self,
        data_dir: str = "./data",
        storage_dir: str = "./storage",
        openai_api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        temperature: float = 0.1,
        similarity_top_k: int = 5
    ):
        """
        Initialise le moteur RAG
        
        Args:
            data_dir: Répertoire contenant les documents sources
            storage_dir: Répertoire pour persister l'index
            openai_api_key: Clé API OpenAI
            model: Modèle OpenAI à utiliser
            temperature: Température pour la génération
            similarity_top_k: Nombre de passages à récupérer
        """
        self.data_dir = Path(data_dir)
        self.storage_dir = Path(storage_dir)
        self.model = model
        self.temperature = temperature
        self.similarity_top_k = similarity_top_k
        
        # Configuration OpenAI avec fallback automatique vers Ollama
        self.using_openai = False
        self.using_ollama = False
        self.model_info = "unknown"
        
        if openai_api_key and OPENAI_AVAILABLE:
            os.environ["OPENAI_API_KEY"] = openai_api_key
            
            # Essayer d'utiliser OpenAI pour le LLM UNIQUEMENT
            try:
                print("🔄 Configuration d'OpenAI LLM (réponses)...")
                Settings.llm = OpenAI(
                    model=self.model,
                    temperature=self.temperature,
                    max_tokens=2000
                )
                # TOUJOURS utiliser HuggingFace pour les embeddings (gratuit, local, pas de quota)
                print("🔄 Configuration HuggingFace embeddings (recherche)...")
                Settings.embed_model = HuggingFaceEmbedding(
                    model_name="BAAI/bge-small-en-v1.5"
                )
                self.using_openai = True
                self.model_info = f"OpenAI {self.model} + HuggingFace embeddings"
                print(f"✅ Mode hybride configuré: {self.model_info}")
                print("💡 LLM: OpenAI (réponses) | Embeddings: HuggingFace (recherche)")
            except Exception as e:
                print(f"⚠️ OpenAI non disponible: {e}")
                print("🔄 Basculement automatique vers Ollama...")
                self.using_openai = False
        
        # Si OpenAI échoue ou n'est pas disponible, utiliser Ollama
        if not self.using_openai:
            if OLLAMA_AVAILABLE:
                print("🔄 Configuration d'Ollama (local & gratuit)...")
                Settings.llm = Ollama(
                    model="llama3.2",
                    temperature=self.temperature,
                    request_timeout=120.0
                )
                Settings.embed_model = HuggingFaceEmbedding(
                    model_name="BAAI/bge-small-en-v1.5"
                )
                self.using_ollama = True
                self.model_info = "Ollama llama3.2 (local)"
                print(f"✅ Ollama configuré: {self.model_info}")
                print("💡 Note: Assurez-vous qu'Ollama est lancé (ollama serve)")
            else:
                raise RuntimeError(
                    "Ni OpenAI ni Ollama ne sont disponibles. "
                    "Installez ollama ou configurez une clé OpenAI valide."
                )
        
        # Prompt personnalisé en français - Strict sur le contexte SchoolReg
        self.text_qa_template_str = (
            "Tu es un assistant virtuel pour SchoolReg, une plateforme de gestion scolaire. "
            "Tu dois être professionnel, précis et utile.\n\n"
            
            "DOCUMENTATION DISPONIBLE:\n"
            "------------------------------\n"
            "{context_str}\n"
            "------------------------------\n\n"
            
            "RÈGLES DE RÉPONSE STRICTES:\n"
            "1. UNIQUEMENT si la question est une salutation initiale (bonjour, salut), réponds chaleureusement et présente-toi BRIÈVEMENT.\n"
            "2. Pour TOUTES les autres questions, va DIRECTEMENT au contenu de la réponse SANS salutation préliminaire.\n"
            "3. Utilise UNIQUEMENT la documentation ci-dessus comme source d'information.\n"
            "4. Si la question ne concerne PAS SchoolReg (ex: politique, sport, cuisine, histoire, etc.), réponds EXACTEMENT:\n"
            "   \"Je suis désolé, mais je suis spécialisé uniquement dans l'assistance sur SchoolReg. "
            "Je peux vous aider avec des questions sur la gestion des élèves, des classes, des paiements, des inscriptions, etc. "
            "Comment puis-je vous aider avec SchoolReg ? 📚\"\n"
            "5. Si l'info n'est pas dans la documentation mais concerne SchoolReg, explique ce que tu peux faire.\n"
            "6. Sois concis, clair et direct. Pas de formules de politesse répétitives.\n"
            "7. Utilise un émoji occasionnel (1 max par réponse) pour être accueillant.\n"
            "8. Réponds TOUJOURS en français.\n\n"
            
            "Question: {query_str}\n\n"
            "Réponse directe:"
        )
        self.text_qa_template = PromptTemplate(self.text_qa_template_str)
        
        # Charger ou créer l'index
        self.index = None
        self.query_engine = None
        self._load_or_create_index()
    
    def _load_or_create_index(self):
        """Charge l'index existant ou en crée un nouveau"""
        try:
            if self.storage_dir.exists() and any(self.storage_dir.iterdir()):
                print(f"📂 Chargement de l'index depuis {self.storage_dir}")
                storage_context = StorageContext.from_defaults(persist_dir=str(self.storage_dir))
                self.index = load_index_from_storage(storage_context)
                print("✅ Index chargé avec succès")
            else:
                print(f"🔨 Création d'un nouvel index depuis {self.data_dir}")
                self._create_index()
        except Exception as e:
            print(f"⚠️ Erreur lors du chargement de l'index: {e}")
            print("🔨 Tentative de création d'un nouvel index...")
            self._create_index()
        
        # Créer le query engine
        if self.index:
            self.query_engine = self.index.as_query_engine(
                text_qa_template=self.text_qa_template,
                similarity_top_k=self.similarity_top_k
            )
    
    def _create_index(self):
        """Crée un nouvel index à partir des documents"""
        if not self.data_dir.exists():
            raise FileNotFoundError(f"Le dossier {self.data_dir} n'existe pas")
        
        # Vérifier qu'il y a des documents
        files = list(self.data_dir.glob("*"))
        if not files:
            raise ValueError(f"Aucun document trouvé dans {self.data_dir}")
        
        print(f"📄 Lecture de {len(files)} fichier(s)...")
        
        # Charger les documents
        documents = SimpleDirectoryReader(
            input_dir=str(self.data_dir),
            recursive=True
        ).load_data()
        
        print(f"📊 {len(documents)} document(s) chargé(s)")
        
        # Créer l'index avec HuggingFace embeddings (toujours)
        print("🔨 Création de l'index vectoriel...")
        self.index = VectorStoreIndex.from_documents(
            documents,
            show_progress=True
        )
        print("✅ Index créé avec succès")
        
        # Sauvegarder l'index
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.index.storage_context.persist(persist_dir=str(self.storage_dir))
        print(f"💾 Index sauvegardé dans {self.storage_dir}")
    
    def _is_off_topic(self, question: str) -> bool:
        """
        Détecte si une question est hors-sujet (ne concerne pas SchoolReg)
        
        Args:
            question: Question de l'utilisateur
            
        Returns:
            True si la question est hors-sujet, False sinon
        """
        question_lower = question.lower()
        
        # Mots-clés autorisés liés à SchoolReg
        schoolreg_keywords = [
            'élève', 'eleve', 'étudiant', 'student',
            'classe', 'cours', 'course',
            'paiement', 'payment', 'frais', 'tuition',
            'inscription', 'register', 'application',
            'parent', 'école', 'ecole', 'school',
            'professeur', 'enseignant', 'teacher',
            'note', 'grade', 'bulletin',
            'horaire', 'schedule',
            'admin', 'administrateur',
            'schoolreg', 'plateforme', 'système', 'systeme',
            'dashboard', 'tableau', 'bord',
            'connexion', 'login', 'compte', 'account',
            'bonjour', 'salut', 'hello', 'aide', 'help', 'comment'
        ]
        
        # Sujets clairement hors-sujet
        off_topic_keywords = [
            'recette', 'cuisine', 'cooking', 'recipe',
            'sport', 'football', 'basketball',
            'politique', 'president', 'election',
            'météo', 'meteo', 'weather',
            'film', 'movie', 'série', 'series',
            'musique', 'music', 'chanson',
            'voyage', 'travel', 'vacances',
            'voiture', 'car', 'auto',
            'santé', 'sante', 'health', 'médecin', 'medecin',
            'histoire', 'history', 'guerre',
            'science', 'chimie', 'physique', 'biologie',
            'mathématique' if 'problème' in question_lower or 'exercice' in question_lower else None
        ]
        off_topic_keywords = [k for k in off_topic_keywords if k]  # Enlever None
        
        # Si contient des mots hors-sujet évidents
        has_off_topic = any(keyword in question_lower for keyword in off_topic_keywords)
        
        # Si contient des mots SchoolReg OU si c'est une salutation courte
        has_schoolreg = any(keyword in question_lower for keyword in schoolreg_keywords)
        is_greeting = len(question.split()) <= 5 and any(g in question_lower for g in ['bonjour', 'salut', 'hello', 'hi'])
        
        # Hors-sujet si: contient des mots interdits ET ne contient pas de mots SchoolReg
        return has_off_topic and not has_schoolreg and not is_greeting
    
    def query(self, question: str) -> Dict:
        """
        Interroge l'index et génère une réponse
        
        Args:
            question: Question de l'utilisateur
            
        Returns:
            Dict contenant la réponse et les sources
        """
        if not self.query_engine:
            raise RuntimeError("Le query engine n'est pas initialisé")
        
        # Vérifier si la question est hors-sujet
        if self._is_off_topic(question):
            return {
                "success": True,
                "question": question,
                "answer": (
                    "Je suis désolé, mais je suis spécialisé uniquement dans l'assistance sur SchoolReg. "
                    "Je peux vous aider avec des questions concernant :\n\n"
                    "📚 La gestion des élèves et inscriptions\n"
                    "🏫 Les classes et emplois du temps\n"
                    "💰 Les paiements et frais de scolarité\n"
                    "👨‍👩‍👧 Les comptes parents et élèves\n"
                    "📊 Le tableau de bord administratif\n\n"
                    "Comment puis-je vous aider avec SchoolReg aujourd'hui ?"
                ),
                "sources": [],
                "model_used": "Off-topic filter",
                "using_openai": False,
                "using_ollama": False,
                "off_topic": True
            }
        
        try:
            # Exécuter la requête
            response = self.query_engine.query(question)
            
            # Extraire les sources
            sources = []
            if hasattr(response, 'source_nodes'):
                for node in response.source_nodes:
                    metadata = node.node.metadata if hasattr(node.node, 'metadata') else {}
                    sources.append({
                        "file_name": metadata.get('file_name', 'Unknown'),
                        "page": metadata.get('page_label'),
                        "score": float(node.score) if hasattr(node, 'score') else None,
                        "text_preview": node.text[:200] + "..." if len(node.text) > 200 else node.text
                    })
            
            return {
                "success": True,
                "question": question,
                "answer": str(response),
                "sources": sources,
                "model_used": self.model_info,
                "using_openai": self.using_openai,
                "using_ollama": self.using_ollama
            }
        
        except Exception as e:
            return {
                "success": False,
                "question": question,
                "error": str(e),
                "model_used": self.model_info
            }
    
    def search(self, question: str) -> Dict:
        """
        Recherche les passages pertinents sans génération
        
        Args:
            question: Question de l'utilisateur
            
        Returns:
            Dict contenant les passages pertinents
        """
        if not self.index:
            raise RuntimeError("L'index n'est pas initialisé")
        
        try:
            # Créer un retriever
            retriever = self.index.as_retriever(
                similarity_top_k=self.similarity_top_k
            )
            
            # Récupérer les nœuds pertinents
            nodes = retriever.retrieve(question)
            
            # Formater les résultats
            results = []
            for node in nodes:
                metadata = node.node.metadata if hasattr(node.node, 'metadata') else {}
                results.append({
                    "file_name": metadata.get('file_name', 'Unknown'),
                    "page": metadata.get('page_label'),
                    "score": float(node.score) if hasattr(node, 'score') else None,
                    "text": node.text
                })
            
            return {
                "success": True,
                "question": question,
                "results": results,
                "count": len(results)
            }
        
        except Exception as e:
            # Fallback runtime: gérer erreurs embeddings OpenAI et LLM OpenAI
            print(f"⚠️ Erreur durant la requête: {e}")
            err = str(e).lower()
            try_again = False
            # 1) Problème embeddings OpenAI (403 / model_not_found)
            if self.using_openai and ("model_not_found" in err or "does not have access to model" in err or "embedding" in err):
                try:
                    print("🔄 Basculement embeddings ➜ HuggingFace et reconstruction index...")
                    from llama_index.embeddings.huggingface import HuggingFaceEmbedding as _HF
                    Settings.embed_model = _HF(model_name="BAAI/bge-small-en-v1.5")
                    self.model_info = (self.model_info + " + HF embeddings").strip()
                    # Recréer l'index et le query engine
                    self.refresh_index()
                    try_again = True
                except Exception as e_emb:
                    print(f"❌ Échec fallback embeddings: {e_emb}")
            # 2) Problème LLM OpenAI (quota / rate limit / indisponible)
            if (self.using_openai and ("openai" in err or "quota" in err or "rate limit" in err)) and OLLAMA_AVAILABLE:
                print("🔄 Basculement LLM ➜ Ollama et nouvelle tentative...")
                from llama_index.llms.ollama import Ollama as _O
                Settings.llm = _O(model="llama3.2", temperature=self.temperature, request_timeout=120.0)
                self.using_openai = False
                self.using_ollama = True
                self.model_info = "Ollama llama3.2 (fallback)"
                try_again = True
            if try_again:
                try:
                    response = self.query_engine.query(question)
                    sources = []
                    if hasattr(response, 'source_nodes'):
                        for node in response.source_nodes:
                            metadata = node.node.metadata if hasattr(node.node, 'metadata') else {}
                            sources.append({
                                "file_name": metadata.get('file_name', 'Unknown'),
                                "page": metadata.get('page_label'),
                                "score": float(node.score) if hasattr(node, 'score') else None,
                                "text_preview": node.text[:200] + "..." if len(node.text) > 200 else node.text
                            })
                    return {
                        "success": True,
                        "question": question,
                        "answer": str(response),
                        "sources": sources,
                        "model_used": self.model_info,
                        "using_openai": self.using_openai,
                        "using_ollama": self.using_ollama
                    }
                except Exception as e2:
                    print(f"❌ Nouvelle tentative échouée: {e2}")
                    return {
                        "success": False,
                        "question": question,
                        "error": str(e2),
                        "model_used": self.model_info
                    }
            return {
                "success": False,
                "question": question,
                "error": str(e),
                "model_used": self.model_info
            }
    
    def refresh_index(self):
        """Reconstruit l'index à partir des documents"""
        print("🔄 Reconstruction de l'index...")
        
        # Supprimer l'ancien index
        if self.storage_dir.exists():
            import shutil
            shutil.rmtree(self.storage_dir)
        
        # Recréer l'index
        self._create_index()
        
        # Recréer le query engine
        if self.index:
            self.query_engine = self.index.as_query_engine(
                text_qa_template=self.text_qa_template,
                similarity_top_k=self.similarity_top_k
            )
        
        print("✅ Index reconstruit avec succès")
    
    def get_stats(self) -> Dict:
        """Retourne des statistiques sur l'index"""
        try:
            doc_count = len(list(self.data_dir.glob("*"))) if self.data_dir.exists() else 0
            index_exists = self.storage_dir.exists() and any(self.storage_dir.iterdir())
            
            return {
                "success": True,
                "data_dir": str(self.data_dir),
                "storage_dir": str(self.storage_dir),
                "documents_count": doc_count,
                "index_exists": index_exists,
                "model": self.model,
                "similarity_top_k": self.similarity_top_k,
                "active_model": self.model_info,
                "using_openai": self.using_openai,
                "using_ollama": self.using_ollama
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
