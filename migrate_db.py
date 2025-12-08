#!/usr/bin/env python3
"""
Script de migration pour ajouter les colonnes manquantes à la table students.
"""
import os
import sys
from sqlalchemy import create_engine, text

# Configuration DB
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123@localhost:5432/schoolreg")

def add_missing_columns():
    """Ajouter les colonnes manquantes à la table students."""
    engine = create_engine(DATABASE_URL)
    
    # Liste des colonnes à ajouter
    columns_to_add = [
        # Colonnes students
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact JSONB;",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS medical_info JSONB;",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_history JSONB;",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS preferences JSONB;",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_photo VARCHAR;",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_completion_date TIMESTAMP;",
        
        # Colonne payments (academic_year)
        "ALTER TABLE payments ADD COLUMN IF NOT EXISTS academic_year VARCHAR;"
    ]
    
    try:
        with engine.connect() as connection:
            print("🔧 Ajout des colonnes manquantes...")
            
            for sql in columns_to_add:
                print(f"  Exécution: {sql}")
                connection.execute(text(sql))
                connection.commit()
            
            print("✅ Migration terminée avec succès !")
            
    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_missing_columns()
