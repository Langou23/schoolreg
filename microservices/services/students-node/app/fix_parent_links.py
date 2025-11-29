"""
Script de diagnostic et correction des liens Parent-Élève
Ce script vérifie et corrige les élèves qui ne sont pas liés à leurs parents
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv(dotenv_path='../../../../.env')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ DATABASE_URL non trouvée dans .env")
    exit(1)

# Créer la connexion
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

def diagnose_parent_links():
    """Diagnostiquer les problèmes de liaison parent-élève"""
    print("\n" + "="*60)
    print("🔍 DIAGNOSTIC DES LIENS PARENT-ÉLÈVE")
    print("="*60 + "\n")
    
    # 1. Compter les élèves sans email parent
    result = session.execute(text("""
        SELECT COUNT(*) as count
        FROM students
        WHERE parent_email IS NULL OR parent_email = ''
    """))
    orphan_count = result.fetchone()[0]
    
    print(f"📊 Élèves sans email parent: {orphan_count}")
    
    # 2. Lister les élèves sans email parent
    if orphan_count > 0:
        print("\n📋 Liste des élèves sans email parent:")
        result = session.execute(text("""
            SELECT id, first_name, last_name, parent_name, parent_phone
            FROM students
            WHERE parent_email IS NULL OR parent_email = ''
            ORDER BY created_at DESC
            LIMIT 10
        """))
        
        for row in result:
            print(f"  • {row.first_name} {row.last_name} (ID: {row.id})")
            print(f"    Parent: {row.parent_name}, Tel: {row.parent_phone}")
    
    # 3. Vérifier les comptes parents existants
    result = session.execute(text("""
        SELECT COUNT(*) as count
        FROM users
        WHERE role = 'parent'
    """))
    parent_count = result.fetchone()[0]
    
    print(f"\n👨‍👩‍👧 Comptes parents dans le système: {parent_count}")
    
    # 4. Lister les parents avec leurs emails
    if parent_count > 0:
        print("\n📧 Liste des comptes parents:")
        result = session.execute(text("""
            SELECT id, email, full_name, created_at
            FROM users
            WHERE role = 'parent'
            ORDER BY created_at DESC
        """))
        
        for row in result:
            print(f"  • {row.full_name} - {row.email}")
            
            # Compter les élèves liés
            student_result = session.execute(text("""
                SELECT COUNT(*) as count
                FROM students
                WHERE parent_email = :email
            """), {"email": row.email})
            student_count = student_result.fetchone()[0]
            print(f"    └─ Élèves liés: {student_count}")
    
    # 5. Suggestions de corrections
    print("\n" + "="*60)
    print("💡 SUGGESTIONS DE CORRECTION")
    print("="*60)
    
    if orphan_count > 0:
        print("\n⚠️ Actions recommandées:")
        print("1. Pour chaque élève sans email parent:")
        print("   - Vérifier si un compte parent existe")
        print("   - Mettre à jour le champ parent_email de l'élève")
        print("\n2. Si le parent n'a pas de compte:")
        print("   - Lui demander de créer un compte via l'interface publique")
        print("   - Puis mettre à jour l'élève avec son email")

def fix_student_parent_link(student_id: str, parent_email: str):
    """Lier un élève à un parent"""
    try:
        # Vérifier que le parent existe
        result = session.execute(text("""
            SELECT id, full_name FROM users
            WHERE email = :email AND role = 'parent'
        """), {"email": parent_email})
        
        parent = result.fetchone()
        if not parent:
            print(f"❌ Aucun compte parent trouvé avec l'email: {parent_email}")
            return False
        
        # Mettre à jour l'élève
        session.execute(text("""
            UPDATE students
            SET parent_email = :parent_email
            WHERE id = :student_id
        """), {"parent_email": parent_email, "student_id": student_id})
        
        session.commit()
        
        print(f"✅ Élève {student_id} lié au parent {parent.full_name} ({parent_email})")
        return True
        
    except Exception as e:
        session.rollback()
        print(f"❌ Erreur: {e}")
        return False

def interactive_fix():
    """Mode interactif pour corriger les liens"""
    print("\n" + "="*60)
    print("🔧 MODE CORRECTION INTERACTIF")
    print("="*60 + "\n")
    
    # Lister les élèves sans parent
    result = session.execute(text("""
        SELECT id, first_name, last_name, parent_name
        FROM students
        WHERE parent_email IS NULL OR parent_email = ''
        ORDER BY created_at DESC
    """))
    
    orphans = result.fetchall()
    
    if not orphans:
        print("✅ Tous les élèves sont liés à un parent!")
        return
    
    print(f"Trouvé {len(orphans)} élève(s) sans email parent\n")
    
    for idx, student in enumerate(orphans, 1):
        print(f"\n{idx}. {student.first_name} {student.last_name}")
        print(f"   Parent: {student.parent_name}")
        print(f"   ID: {student.id}")
        
        # Demander l'email du parent
        parent_email = input("   Email du parent (ou 'skip' pour passer): ").strip()
        
        if parent_email.lower() == 'skip':
            continue
        
        if parent_email:
            fix_student_parent_link(student.id, parent_email)

if __name__ == "__main__":
    print("\n🏫 SchoolReg - Outil de diagnostic Parent-Élève\n")
    
    try:
        # Exécuter le diagnostic
        diagnose_parent_links()
        
        # Demander si on veut corriger
        print("\n" + "="*60)
        choice = input("\nVoulez-vous corriger les liens maintenant? (o/n): ").strip().lower()
        
        if choice == 'o':
            interactive_fix()
            print("\n✅ Correction terminée!")
            print("\n💡 Conseil: Demandez aux parents de se connecter pour vérifier")
        
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
    finally:
        session.close()
        print("\n👋 Au revoir!\n")
