import { useState, useEffect } from 'react';
import { Student, Class } from '../types';
import { StudentsApi, ClassesApi, EnrollmentsApi } from '../lib/api';
import { Users, X, AlertCircle } from 'lucide-react';

interface EnrollmentManagerProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnrollmentManager({ onClose, onSuccess }: EnrollmentManagerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [studentsList, classesList] = await Promise.all([
      StudentsApi.list({ status: 'active', withoutActiveClass: true }),
      ClassesApi.list(),
    ]);
    if (Array.isArray(studentsList)) setStudents(studentsList as Student[]);
    if (Array.isArray(classesList)) setClasses(classesList as Class[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await EnrollmentsApi.create({
        studentId: selectedStudent,
        classId: selectedClass,
        status: 'active',
      });
      onSuccess();
    } catch (err: any) {
      // Extraire le message d'erreur du backend
      const errorMessage = err.response?.data?.detail || err.message || 'Une erreur est survenue';
      setError(errorMessage);
      console.error('❌ Erreur lors de l\'inscription:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Assigner élève à classe
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold mb-1">Erreur d'inscription</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sélectionner un élève *
            </label>
            {students.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                <p className="font-semibold mb-1">Aucun élève disponible</p>
                <p>Tous les élèves actifs sont déjà inscrits dans une classe. Pour assigner un élève à une nouvelle classe, vous devez d'abord le désinscrire de sa classe actuelle.</p>
              </div>
            ) : (
              <select
                required
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choisir un élève</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {(student as any).lastName} {(student as any).firstName}
                  </option>
                ))}
              </select>
            )}
            {students.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {students.length} élève{students.length > 1 ? 's' : ''} sans classe disponible{students.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sélectionner une classe *
            </label>
            <select
              required
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choisir une classe</option>
              {classes.map((cls: any) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.session ? `(${cls.session})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || students.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'En cours...' : 'Assigner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
