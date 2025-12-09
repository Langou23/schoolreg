import os
import openai
from dotenv import load_dotenv

from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    StorageContext,
    load_index_from_storage
)

from llama_index.core.prompts import PromptTemplate
from llama_index.llms.openai import OpenAI
from llama_index.llms.ollama import Ollama

load_dotenv()

# Defined personalized prompt
text_qa_template_str = (
    "Les informmations contextuelles ci-dessous proviennent des documents.\n"
    "------------------------------\n"
    "{context_str}\n"
    "------------------------------"
    '''
    En utilisant UNIQUEMENT les informations contextuelles ci-dessus et sans
    utiliser des connaissances antérieures, repondez à la question suivante.\n
    NE FAITES PAS de distinction entre majuscule et miniscule.\n
    Il peut y avoir les erreurs de frappe dans la question, vous pouvez corriger cela.\n
    Si vous ne trouvez pas la réponse dans le contexte fourni, dites simplement:
    Je ne trouve pas cette information dans les documents fournis,\n
    Ne tentez PAS d'iventer une réponse.\n
    '''
    "Question: {query_str}\n"
    "Réponse: "
)

# Création de template de prompt
text_qa_template = PromptTemplate(text_qa_template_str)

# Définir le répertoire où les indices seront persistés (sauvegardés en mémoire)
PERSIST_DIR = './storage'

# Vérifier si le stockage existe
if not os.path.exists(PERSIST_DIR):
    # Si le répertoire n'existe pas, créer les indices pour la preière fois
    print("Création des indices à partir des documents ...")
    # Charger tous les documents du dossier "data"
    documents = SimpleDirectoryReader("data").load_data()
    # Créer l'index vectoriel à partir des documents chargés
    # Cet index transforme les documents en vecteurs pour la rechercge sémantique
    index = VectorStoreIndex.from_documents(documents, verbose=True)
    # Sauvegarder l'index dans le dossier de persistence pour une utilisation ultérieure
    index.storage_context.persist(persist_dir=PERSIST_DIR)
    print(f"Indices créés et sauvegardés dans {PERSIST_DIR}")
    # except Exception as e:
    #     print("Erreur lors de Parsing : {e}")
    
else:
    # Si le répertoire existe déjà, charger le répertoire de persistence
    storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
    # Charger l'index à partir du contexte de stockage
    index = load_index_from_storage(storage_context)
    print("Vectore Store d'indices chargé avec succès!")

openai_llm = OpenAI(
    model='gpt-4o-mini',
    temperature=0.1,
    max_tokens=2000
)
ollama_llm = Ollama(
    model='llama3:latest',
    temperature=0.1,
    max_tokens=2000
)
# Création du moteur de requête avec prompt personnalisé
query_engine = index.as_query_engine(
    text_qa_template = text_qa_template, # utiliser notre promt
    similarity_top_k = 5, # Récupérer les 5 passages plus similaires    
    llm=openai_llm
)


# Exécution de la requête
# poser une question au moteur de requête
question = "Qui est Steve Ataky?"
reponse = query_engine.query(question)
# Afficher la réponse
print("\n" + "="*80)
print(f"QUESTION: {question}")
print("="*80)
print(f"RÉPONSE:\n{reponse}")
print("\n" + "="*80)

# Afficher les sources utilisées

if hasattr(reponse, 'source_nodes'):
    print("SOURCES UTILISÉES:")
    for i, node in enumerate(reponse.source_nodes, 1):
        metadata = node.node.metadata if hasattr(node.node, 'metadata') else {}
        # Obtenir le nom du fichier
        file_name = metadata.get('file_name', 'Unknown')
        # Obtenir le numéro de la page (si disponible)
        page_number = metadata.get('page_label', None)
        print(f"\n Source {i} - Document name: {file_name}, Page: {page_number}")
        print(f"Score de similarité: {node.score:.4f}")
        #print(f"Extrait: {node.text[:300]}....")
        
