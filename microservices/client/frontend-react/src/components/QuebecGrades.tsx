import { BookOpen, Award, BarChart3, FileText } from 'lucide-react';

interface QuebecGradesProps {
  enrollment: {
    id: string;
    grade?: number;
    attendance?: number;
    courseGrades?: any;
    quebecReportCard?: any;
    competenciesAssessment?: any;
    academicYear?: string;
    semester?: string;
    class?: {
      name: string;
      level: string;
    };
  };
}

// Cours typiques du système québécois par niveau
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

// Échelle de conversion québécoise
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

export default function QuebecGrades({ enrollment }: QuebecGradesProps) {
  // Déterminer le niveau pour les cours
  const level = enrollment.class?.level?.toLowerCase() || 'primaire';
  const courses = quebecCourses[level as keyof typeof quebecCourses] || quebecCourses.primaire;

  //  UTILISER UNIQUEMENT LES DONNÉES RÉELLES DE LA BD
  const courseGrades = enrollment.courseGrades || {};
  
  console.log('📊 Notes chargées depuis la BD:', courseGrades);
  
  // Mapper les cours avec les notes réelles UNIQUEMENT
  const actualGrades = courses.map(course => {
    const existing = courseGrades[course.code];
    if (existing) {
      return { ...course, ...existing };
    }
    //  NE PAS GÉNÉRER DE DONNÉES - Retourner null si pas de note
    return null;
  }).filter(Boolean); // Garder uniquement les cours avec notes
  
  // Si aucune note n'existe, afficher un message
  if (actualGrades.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune note disponible</h3>
        <p className="text-gray-500">
          Les notes n'ont pas encore été saisies par l'enseignant.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Classe: {enrollment.class?.name} • Année {enrollment.academicYear || '2024-2025'}
        </p>
      </div>
    );
  }

  const averageGrade = actualGrades.reduce((sum, course) => sum + (course.grade || 0), 0) / actualGrades.length;
  const gradeInfo = getQuebecGrade(averageGrade);

  return (
    <div className="space-y-6">
      {/* En-tête du bulletin */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Bulletin scolaire québécois
            </h3>
            <p className="text-blue-100 mt-1">
              {enrollment.class?.name} • Année scolaire {enrollment.academicYear || '2024-2025'}
            </p>
            {enrollment.semester && (
              <p className="text-blue-200 text-sm">Étape {enrollment.semester}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${gradeInfo.color.replace('text-', 'text-white')}`}>
              {averageGrade.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-100">{gradeInfo.level}</div>
            {enrollment.attendance && (
              <div className="text-sm text-blue-200 mt-1">
                Assiduité: {enrollment.attendance.toFixed(1)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Résultats par matière */}
      <div className="grid gap-4">
        {actualGrades.map((course: any) => {
          const courseGradeInfo = getQuebecGrade(course.grade || 0);
          
          return (
            <div key={course.code} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-gray-900">{course.name}</h4>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-mono">
                      {course.code}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{course.description}</p>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-xl font-bold ${courseGradeInfo.color}`}>
                    {course.grade}%
                  </div>
                  <div className={`text-sm ${courseGradeInfo.color}`}>
                    {courseGradeInfo.letter}
                  </div>
                </div>
              </div>

              {/* Résultats par étape */}
              {(course.etape1 || course.etape2 || course.etape3) && (
                <div className="border-t pt-3 mb-3">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="text-gray-600">Étape 1</div>
                      <div className="font-semibold">{course.etape1 || '-'}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Étape 2</div>
                      <div className="font-semibold">{course.etape2 || '-'}%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-600">Étape 3</div>
                      <div className="font-semibold">{course.etape3 || '-'}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Compétences */}
              {course.competencies && (
                <div className="border-t pt-3 mb-3">
                  <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Compétences
                  </h5>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Object.entries(course.competencies).map(([competency, level]) => (
                      <div key={competency} className="text-center">
                        <div className="text-gray-600 capitalize mb-1">{competency}</div>
                        <div className="flex justify-center">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full mx-0.5 ${
                                i <= (level as number) ? 'bg-blue-500' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commentaires */}
              {course.comments && (
                <div className="border-t pt-3">
                  <h5 className="text-sm font-semibold text-gray-700 mb-1">Commentaires</h5>
                  <p className="text-sm text-gray-600">{course.comments}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Résumé et progression */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Résumé de l'étape
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{averageGrade.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Moyenne générale</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${gradeInfo.color}`}>{gradeInfo.letter}</div>
            <div className="text-sm text-gray-600">Cote</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{actualGrades.filter((c: any) => (c.grade || 0) >= 60).length}</div>
            <div className="text-sm text-gray-600">Matières réussies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{enrollment.attendance?.toFixed(0) || 'N/A'}</div>
            <div className="text-sm text-gray-600">Assiduité</div>
          </div>
        </div>
      </div>

      {/* Note explicative */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-semibold text-blue-900 mb-2">Système d'évaluation québécois</h5>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>A+ (90-100%):</strong> Excellent - Dépasse les attentes</p>
          <p>• <strong>A (85-89%):</strong> Très bien - Répond aux attentes</p>
          <p>• <strong>B (70-84%):</strong> Satisfaisant - Répond partiellement</p>
          <p>• <strong>C (60-69%):</strong> Acceptable - Seuil de réussite</p>
          <p>• <strong>E (0-59%):</strong> Échec - Ne répond pas aux exigences minimales</p>
        </div>
      </div>
    </div>
  );
}
