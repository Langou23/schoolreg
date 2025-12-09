"""
Fonctions de maintenance de la base de données
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
try:
    from models import Enrollment, EnrollmentStatus
except ImportError:
    from .models import Enrollment, EnrollmentStatus
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def cleanup_duplicate_enrollments(db: Session) -> dict:
    """
    Nettoie les inscriptions en double en gardant seulement la plus récente active
    
    Returns:
        dict: Statistiques du nettoyage
    """
    try:
        # Compter les doublons avant nettoyage
        duplicates_query = text("""
            SELECT COUNT(*) as count
            FROM (
                SELECT student_id
                FROM enrollments
                WHERE status = 'active'
                GROUP BY student_id
                HAVING COUNT(*) > 1
            ) AS duplicates
        """)
        
        result = db.execute(duplicates_query)
        duplicates_before = result.scalar() or 0
        
        if duplicates_before == 0:
            logger.info("✅ Aucune inscription en double trouvée")
            return {
                "duplicates_before": 0,
                "cleaned": 0,
                "duplicates_after": 0,
                "status": "success"
            }
        
        logger.warning(f"⚠️  {duplicates_before} élève(s) avec plusieurs inscriptions actives")
        
        # Nettoyer les doublons
        cleanup_query = text("""
            UPDATE enrollments e1
            SET 
                status = 'dropped',
                updated_at = NOW()
            WHERE 
                status = 'active'
                AND EXISTS (
                    SELECT 1 
                    FROM enrollments e2 
                    WHERE e2.student_id = e1.student_id 
                    AND e2.status = 'active'
                    AND (
                        e2.enrollment_date > e1.enrollment_date
                        OR (e2.enrollment_date = e1.enrollment_date AND e2.created_at > e1.created_at)
                    )
                )
        """)
        
        result = db.execute(cleanup_query)
        cleaned_count = result.rowcount
        db.commit()
        
        logger.info(f"🧹 {cleaned_count} inscription(s) nettoyée(s)")
        
        # Vérifier après nettoyage
        result = db.execute(duplicates_query)
        duplicates_after = result.scalar() or 0
        
        if duplicates_after == 0:
            logger.info("✅ Nettoyage réussi: Aucun doublon restant")
        else:
            logger.warning(f"⚠️  {duplicates_after} doublon(s) restant(s)")
        
        return {
            "duplicates_before": duplicates_before,
            "cleaned": cleaned_count,
            "duplicates_after": duplicates_after,
            "status": "success" if duplicates_after == 0 else "partial"
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lors du nettoyage: {str(e)}")
        db.rollback()
        return {
            "duplicates_before": 0,
            "cleaned": 0,
            "duplicates_after": 0,
            "status": "error",
            "error": str(e)
        }

def ensure_unique_active_enrollment_constraint(db: Session) -> bool:
    """
    S'assure que la contrainte d'unicité existe pour les inscriptions actives
    
    Returns:
        bool: True si la contrainte existe ou a été créée
    """
    try:
        # Vérifier si l'index existe déjà
        check_query = text("""
            SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE tablename = 'enrollments'
                AND indexname = 'idx_unique_active_enrollment_per_student'
            )
        """)
        
        result = db.execute(check_query)
        exists = result.scalar()
        
        if exists:
            logger.info("✅ Contrainte d'unicité déjà en place")
            return True
        
        # Créer l'index unique
        create_index_query = text("""
            CREATE UNIQUE INDEX idx_unique_active_enrollment_per_student
            ON enrollments(student_id)
            WHERE status = 'active'
        """)
        
        db.execute(create_index_query)
        db.commit()
        
        logger.info("✅ Contrainte d'unicité créée avec succès")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la création de la contrainte: {str(e)}")
        db.rollback()
        return False

def get_enrollment_statistics(db: Session) -> dict:
    """
    Récupère les statistiques sur les inscriptions
    
    Returns:
        dict: Statistiques détaillées
    """
    try:
        stats_query = text("""
            SELECT 
                status,
                COUNT(*) as count
            FROM enrollments
            GROUP BY status
            ORDER BY count DESC
        """)
        
        result = db.execute(stats_query)
        stats = {row[0]: row[1] for row in result}
        
        # Compter les élèves avec plusieurs inscriptions actives
        duplicates_query = text("""
            SELECT COUNT(*) as count
            FROM (
                SELECT student_id
                FROM enrollments
                WHERE status = 'active'
                GROUP BY student_id
                HAVING COUNT(*) > 1
            ) AS duplicates
        """)
        
        result = db.execute(duplicates_query)
        duplicates = result.scalar() or 0
        
        return {
            "by_status": stats,
            "students_with_multiple_active": duplicates,
            "total": sum(stats.values())
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la récupération des statistiques: {str(e)}")
        return {}

def ensure_student_columns_exist(db: Session) -> dict:
    """
    S'assure que toutes les colonnes nécessaires existent dans la table students
    
    Returns:
        dict: Résultat de l'opération
    """
    try:
        logger.info("🔍 Vérification des colonnes de la table students...")
        
        columns_to_add = [
            ("student_code", "VARCHAR", "UNIQUE"),
            ("emergency_contact", "JSON", None),
            ("medical_info", "JSON", None),
            ("academic_history", "JSON", None),
            ("preferences", "JSON", None),
            ("profile_photo", "VARCHAR", None),
            ("profile_completed", "BOOLEAN", "NOT NULL DEFAULT FALSE"),
            ("profile_completion_date", "TIMESTAMP", None),
        ]
        
        added_columns = []
        
        for column_name, column_type, constraint in columns_to_add:
            try:
                # Vérifier si la colonne existe
                check_query = text(f"""
                    SELECT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'students' 
                        AND column_name = '{column_name}'
                    )
                """)
                
                result = db.execute(check_query)
                exists = result.scalar()
                
                if not exists:
                    # Créer la colonne
                    constraint_str = f" {constraint}" if constraint else ""
                    alter_query = text(f"""
                        ALTER TABLE students 
                        ADD COLUMN {column_name} {column_type}{constraint_str}
                    """)
                    
                    db.execute(alter_query)
                    added_columns.append(column_name)
                    logger.info(f"✅ Colonne ajoutée: {column_name}")
                else:
                    logger.debug(f"ℹ️  Colonne existante: {column_name}")
                    
            except Exception as col_error:
                logger.warning(f"⚠️  Erreur pour la colonne {column_name}: {col_error}")
        
        # Créer l'index sur student_code si la colonne a été ajoutée
        if "student_code" in added_columns:
            try:
                index_query = text("""
                    CREATE INDEX IF NOT EXISTS idx_students_student_code 
                    ON students(student_code)
                """)
                db.execute(index_query)
                logger.info("✅ Index créé sur student_code")
            except Exception as idx_error:
                logger.warning(f"⚠️  Erreur lors de la création de l'index: {idx_error}")
        
        db.commit()
        
        if added_columns:
            logger.info(f"✅ {len(added_columns)} colonne(s) ajoutée(s): {', '.join(added_columns)}")
        else:
            logger.info("✅ Toutes les colonnes existent déjà")
        
        return {
            "status": "success",
            "columns_added": added_columns,
            "total_added": len(added_columns)
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de la vérification des colonnes: {str(e)}")
        db.rollback()
        return {
            "status": "error",
            "error": str(e),
            "columns_added": [],
            "total_added": 0
        }

def run_startup_maintenance(db: Session):
    """
    Exécute les tâches de maintenance au démarrage
    """
    logger.info("🔧 Démarrage de la maintenance de la base de données...")
    
    # 1. S'assurer que toutes les colonnes existent
    columns_result = ensure_student_columns_exist(db)
    
    # 2. Nettoyer les doublons
    cleanup_result = cleanup_duplicate_enrollments(db)
    
    # 3. S'assurer que la contrainte existe
    ensure_unique_active_enrollment_constraint(db)
    
    # 4. Afficher les statistiques
    stats = get_enrollment_statistics(db)
    logger.info(f"📊 Statistiques des inscriptions: {stats}")
    
    logger.info("✅ Maintenance terminée")
    
    return {
        "columns": columns_result,
        "cleanup": cleanup_result,
        "statistics": stats
    }
