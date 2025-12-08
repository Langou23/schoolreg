import { useState, useEffect } from 'react';
import { StudentsApi, EnrollmentsApi } from '../lib/api';
import { Student, Enrollment } from '../types';
import { BookOpen, Trash2, Save, X, Award, BarChart3 } from 'lucide-react';

interface AdminGradesManagerProps {
  onBack: () => void;
}

// Cours québécois par programme
const quebecCourses = {
  'prescolaire': [
    { code: 'DEV', name: 'Développement global', description: 'Développement physique, cognitif, social et affectif' },
    { code: 'LAN', name: 'Langage', description: 'Expression orale et écrite, vocabulaire' },
    { code: 'MAT', name: 'Mathématiques de base', description: 'Nombres, formes, mesures' },
    { code: 'ART', name: 'Arts plastiques', description: 'Expression artistique et créativité' },
    { code: 'MUS', name: 'Musique et rythme', description: 'Éveil musical et expression corporelle' }
  ],
  'primaire': [
    { code: 'FRA', name: 'Français, langue d\'enseignement', description: 'Lecture, écriture, communication orale' },
    { code: 'MAT', name: 'Mathématique', description: 'Arithmétique, géométrie, mesure, probabilités' },
    { code: 'ANG', name: 'Anglais, langue seconde', description: 'Communication orale et écrite en anglais' },
    { code: 'SCI', name: 'Science et technologie', description: 'Matière, énergie, univers vivant, terre et espace' },
    { code: 'GEO', name: 'Géographie, histoire et éducation à la citoyenneté', description: 'Société québécoise, cultures du monde' },
    { code: 'ART', name: 'Arts plastiques', description: 'Expression artistique et appréciation esthétique' },
    { code: 'MUS', name: 'Musique', description: 'Expression musicale et appréciation musicale' },
    { code: 'EPS', name: 'Éducation physique et à la santé', description: 'Activité physique et habitudes de vie' },
    { code: 'ETH', name: 'Éthique et culture religieuse', description: 'Réflexion éthique et compréhension du phénomène religieux' }
  ],
  'secondaire': [
    { code: 'FRA', name: 'Français, langue d\'enseignement', description: 'Littérature, écriture, communication orale' },
    { code: 'MAT', name: 'Mathématique', description: 'Algèbre, géométrie, fonctions, statistiques' },
    { code: 'ANG', name: 'Anglais, langue seconde', description: 'Communication et culture anglophone' },
    { code: 'SCI', name: 'Science et technologie', description: 'Physique, chimie, biologie' },
    { code: 'HIS', name: 'Histoire et éducation à la citoyenneté', description: 'Histoire du Québec et du Canada, monde contemporain' },
    { code: 'ART', name: 'Arts plastiques', description: 'Expression artistique et histoire de l\'art' },
    { code: 'MUS', name: 'Musique', description: 'Création et interprétation musicale' },
    { code: 'EPS', name: 'Éducation physique et à la santé', description: 'Condition physique et mode de vie actif' },
    { code: 'ETH', name: 'Éthique et culture religieuse', description: 'Dialogue éthique et phénomène religieux' },
    { code: 'ECR', name: 'Monde contemporain', description: 'Enjeux du monde actuel' }
  ]
};

const getQuebecGrade = (percentage: number) => {
  if (percentage >= 90) return { letter: 'A+', level: 'Excellent', color: 'text-green-600' };
  if (percentage >= 85) return { letter: 'A', level: 'Très bien', color: 'text-green-600' };
  if (percentage >= 80) return { letter: 'A-', level: 'Bien', color: 'text-green-500' };
  if (percentage >= 75) return { letter: 'B+', level: 'Assez bien', color: 'text-blue-600' };
  if (percentage >= 70) return { letter: 'B', level: 'Satisfaisant', color: 'text-blue-500' };
  if (percentage >= 65) return { letter: 'B-', level: 'Acceptable', color: 'text-yellow-600' };
  if (percentage >= 60) return { letter: 'C+', level: 'Passable', color: 'text-orange-500' };
  if (percentage >= 55) return { letter: 'C', level: 'Faible', color: 'text-red-500' };
  return { letter: 'E', level: 'Échec', color: 'text-red-600' };
};

export default function AdminGradesManager({ onBack }: AdminGradesManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingGrades, setEditingGrades] = useState<{[key: string]: any}>({});
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, enrollmentsData] = await Promise.all([
        StudentsApi.list(),
        EnrollmentsApi.list()
      ]);
      setStudents(studentsData || []);
      setEnrollments(enrollmentsData || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setSelectedEnrollment(null);
    setEditingGrades({});
  };

  const handleEnrollmentSelect = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    
    // Préparer les notes pour édition
    const level = enrollment.class?.level?.toLowerCase() || selectedStudent?.program || 'primaire';
    const courses = quebecCourses[level as keyof typeof quebecCourses] || quebecCourses.primaire;
    
    const existingGrades = enrollment.courseGrades || {};
    const gradesForEditing: {[key: string]: any} = {};
    
    courses.forEach(course => {
      gradesForEditing[course.code] = existingGrades[course.code] || {
        grade: '',
        etape1: '',
        etape2: '',
        etape3: '',
        competencies: {
          comprehension: '',
          application: '',
          communication: ''
        },
        comments: ''
      };
    });
    
    setEditingGrades(gradesForEditing);
  };

  const handleGradeChange = (courseCode: string, field: string, value: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        [field]: value
      }
    }));
  };

  const handleCompetencyChange = (courseCode: string, competency: string, value: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        competencies: {
          ...prev[courseCode].competencies,
          [competency]: value
        }
      }
    }));
  };

  const handleSaveGrades = async () => {
    if (!selectedEnrollment) return;
    
    setSaving(true);
    try {
      // Convertir les valeurs en nombres et nettoyer
      const cleanedGrades: {[key: string]: any} = {};
      
      Object.entries(editingGrades).forEach(([courseCode, gradeData]: [string, any]) => {
        cleanedGrades[courseCode] = {
          grade: gradeData.grade ? parseFloat(gradeData.grade) : null,
          etape1: gradeData.etape1 ? parseFloat(gradeData.etape1) : null,
          etape2: gradeData.etape2 ? parseFloat(gradeData.etape2) : null,
          etape3: gradeData.etape3 ? parseFloat(gradeData.etape3) : null,
          competencies: {
            comprehension: gradeData.competencies.comprehension ? parseInt(gradeData.competencies.comprehension) : null,
            application: gradeData.competencies.application ? parseInt(gradeData.competencies.application) : null,
            communication: gradeData.competencies.communication ? parseInt(gradeData.competencies.communication) : null
          },
          comments: gradeData.comments || ''
        };
      });

      // Calculer la moyenne générale
      const validGrades = Object.values(cleanedGrades)
        .map((g: any) => g.grade)
        .filter(g => g !== null && !isNaN(g));
      const averageGrade = validGrades.length > 0 
        ? validGrades.reduce((sum: number, grade: number) => sum + grade, 0) / validGrades.length 
        : null;

      const payload = {
        courseGrades: cleanedGrades,
        grade: averageGrade,
        academicYear: '2024-2025',
        semester: '1',
        quebecReportCard: {
          academicYear: '2024-2025',
          semester: '1',
          averageGrade: averageGrade,
          coursesCount: Object.keys(cleanedGrades).length,
          updatedAt: new Date().toISOString()
        }
      };

      await EnrollmentsApi.updateGrades(selectedEnrollment.id, payload);
      
      // Recharger les données
      await loadData();
      
      // Mettre à jour l'enrollment sélectionné
      const updatedEnrollment = enrollments.find(e => e.id === selectedEnrollment.id);
      if (updatedEnrollment) {
        setSelectedEnrollment(updatedEnrollment);
      }
      
      setMessage({ type: 'success', text: 'Notes mises à jour avec succès !' });
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde des notes' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrades = async (courseCode: string) => {
    if (!selectedEnrollment) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer toutes les notes pour ${courseCode} ?`)) {
      return;
    }

    const updatedGrades = { ...editingGrades };
    delete updatedGrades[courseCode];
    setEditingGrades(updatedGrades);
    
    setMessage({ type: 'success', text: `Notes de ${courseCode} supprimées localement. Cliquez sur "Sauvegarder" pour confirmer.` });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Retour à l'administration
        </button>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          Notes et Bulletins
        </h1>
        <p className="text-gray-600 mt-2">
          Saisir les notes par matière et générer les bulletins scolaires (3 bulletins par année)
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center justify-between ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des élèves avec leur classe */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sélectionner un élève</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {students.map(student => {
              const studentEnrollments = enrollments.filter(e => e.studentId === student.id);
              const activeEnrollment = studentEnrollments.find(e => e.status === 'active');
              
              return (
                <button
                  key={student.id}
                  onClick={() => {
                    handleStudentSelect(student);
                    if (activeEnrollment) {
                      handleEnrollmentSelect(activeEnrollment);
                    }
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedStudent?.id === student.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-lg">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {student.program}
                      </div>
                      {activeEnrollment && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {activeEnrollment.class?.name}
                          </span>
                          {activeEnrollment.grade && (
                            <span className={`text-sm font-semibold ${getQuebecGrade(activeEnrollment.grade).color}`}>
                              Moyenne: {activeEnrollment.grade.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Édition des notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Notes par cours
              {selectedEnrollment && (
                <span className="text-sm text-gray-600 ml-2">
                  ({selectedEnrollment.class?.name})
                </span>
              )}
            </h2>
            {selectedEnrollment && Object.keys(editingGrades).length > 0 && (
              <button
                onClick={handleSaveGrades}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedEnrollment && Object.entries(editingGrades).map(([courseCode, gradeData]) => {
              const course = quebecCourses[selectedStudent?.program as keyof typeof quebecCourses]?.find(c => c.code === courseCode);
              if (!course) return null;

              return (
                <div key={courseCode} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        {course.name}
                      </h3>
                      <p className="text-sm text-gray-600">{course.code}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteGrades(courseCode)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Supprimer les notes de ce cours"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Note finale */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Note finale (%)
                      </label>
                      <select
                        value={gradeData.grade}
                        onChange={(e) => handleGradeChange(courseCode, 'grade', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner une note</option>
                        {Array.from({ length: 101 }, (_, i) => i).map(num => (
                          <option key={num} value={num}>{num}%</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes par bulletin (trimestres) */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      📋 Notes par bulletin (trimestres)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'etape1', label: '1er bulletin' },
                        { key: 'etape2', label: '2e bulletin' },
                        { key: 'etape3', label: '3e bulletin' }
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-600 mb-1">
                            {label}
                          </label>
                          <select
                            value={gradeData[key]}
                            onChange={(e) => handleGradeChange(courseCode, key, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Sélectionner</option>
                            {Array.from({ length: 101 }, (_, i) => i).map(num => (
                              <option key={num} value={num}>{num}%</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Les 3 bulletins de l'année scolaire (septembre, janvier, juin)
                    </p>
                  </div>

                  {/* Compétences */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      Évaluation des compétences
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'comprehension', label: 'Compréhension' },
                        { key: 'application', label: 'Application' },
                        { key: 'communication', label: 'Communication' }
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-600 mb-1">
                            {label}
                          </label>
                          <select
                            value={gradeData.competencies[key]}
                            onChange={(e) => handleCompetencyChange(courseCode, key, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Non évalué</option>
                            <option value="1">1 - En développement</option>
                            <option value="2">2 - Acceptable</option>
                            <option value="3">3 - Satisfaisant</option>
                            <option value="4">4 - Excellent</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Échelle de 1 à 4 pour évaluer les compétences disciplinaires
                    </p>
                  </div>

                  {/* Commentaires */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Commentaires
                    </label>
                    <textarea
                      value={gradeData.comments}
                      onChange={(e) => handleGradeChange(courseCode, 'comments', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Commentaires sur la performance de l'élève..."
                    />
                  </div>
                </div>
              );
            })}

            {selectedEnrollment && Object.keys(editingGrades).length === 0 && (
              <p className="text-gray-500 text-sm">Aucun cours configuré pour cette classe</p>
            )}

            {!selectedEnrollment && (
              <p className="text-gray-500 text-sm">
                Sélectionnez un élève et une classe pour éditer les notes
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
