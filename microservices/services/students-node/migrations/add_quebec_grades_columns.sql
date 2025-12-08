-- Migration pour ajouter les colonnes du système de notes québécoises
-- Date: 2025-12-06

-- Ajouter les colonnes pour le système de notes québécoises dans la table enrollments
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS course_grades JSONB,
ADD COLUMN IF NOT EXISTS quebec_report_card JSONB,
ADD COLUMN IF NOT EXISTS competencies_assessment JSONB,
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
ADD COLUMN IF NOT EXISTS semester VARCHAR(10);

-- Ajouter un commentaire pour documenter les colonnes
COMMENT ON COLUMN enrollments.course_grades IS 'Notes détaillées par cours au format JSON: {course_code: {grade, etape1, etape2, etape3, competencies, comments}}';
COMMENT ON COLUMN enrollments.quebec_report_card IS 'Bulletin québécois complet au format JSON';
COMMENT ON COLUMN enrollments.competencies_assessment IS 'Évaluation des compétences au format JSON';
COMMENT ON COLUMN enrollments.academic_year IS 'Année scolaire (ex: 2024-2025)';
COMMENT ON COLUMN enrollments.semester IS 'Étape/Semestre (1, 2, 3)';

-- Vérifier que les colonnes ont été ajoutées
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'enrollments'
AND column_name IN ('course_grades', 'quebec_report_card', 'competencies_assessment', 'academic_year', 'semester');
