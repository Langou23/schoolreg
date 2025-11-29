import { useEffect, useState } from 'react';
import { Class } from '../types';
import { ClassesApi } from '../lib/api';
import { Plus, Edit2, Trash2, Users, Eye } from 'lucide-react';
import ClassForm from './ClassForm';
import EnrollmentManager from './EnrollmentManager';
import ClassStudentsView from './ClassStudentsView';

type ClassWithCount = Class & { enrollment_count?: number; enrollments?: any[] };

export default function ClassesView() {
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithCount | null>(null);
  const [editingClass, setEditingClass] = useState<Class | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const classesData = await ClassesApi.list();
      if (Array.isArray(classesData)) {
        const classesWithCounts = (classesData as any[]).map((cls) => {
          const enrolled = Array.isArray(cls.enrollments)
            ? cls.enrollments.filter((e: any) => e.status === 'active').length
            : 0;
          return { ...cls, enrollment_count: enrolled } as ClassWithCount;
        });
        setClasses(classesWithCounts);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) return;

    await ClassesApi.remove(id);
    fetchClasses();
  };

  const handleEdit = (cls: Class) => {
    setEditingClass(cls);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingClass(undefined);
    fetchClasses();
  };

  const handleEnrollmentSuccess = () => {
    setShowEnrollment(false);
    fetchClasses();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Classes</h2>
          <p className="text-gray-600 mt-1">Gérer les classes et les affectations</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEnrollment(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Users className="w-5 h-5" />
            Assigner élèves
          </button>
          <button
            onClick={() => {
              setEditingClass(undefined);
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nouvelle classe
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Aucune classe trouvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                  { (cls as any).session && (
                    <p className="text-sm text-gray-500">{(cls as any).session}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(cls)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {(cls as any).teacherName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Enseignant:</span>
                    <span className="font-medium text-gray-900">{(cls as any).teacherName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacité:</span>
                  <span className="font-medium text-gray-900">{cls.capacity} élèves</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Inscrits:</span>
                  <span className={`font-medium ${cls.enrollment_count! >= cls.capacity ? 'text-red-600' : 'text-green-600'}`}>
                    {cls.enrollment_count} / {cls.capacity}
                  </span>
                </div>
              </div>

              {cls.schedule && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Emploi du temps:</p>
                  <p className="text-sm text-gray-900">{cls.schedule}</p>
                </div>
              )}

              {cls.enrollment_count! > 0 && (
                <button
                  onClick={() => {
                    setSelectedClass(cls);
                    setShowStudents(true);
                  }}
                  className="mt-4 w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Voir les élèves ({cls.enrollment_count})
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ClassForm
          onClose={() => {
            setShowForm(false);
            setEditingClass(undefined);
          }}
          onSuccess={handleFormSuccess}
          classData={editingClass}
        />
      )}

      {showEnrollment && (
        <EnrollmentManager
          onClose={() => setShowEnrollment(false)}
          onSuccess={handleEnrollmentSuccess}
        />
      )}

      {showStudents && selectedClass && (
        <ClassStudentsView
          classId={selectedClass.id}
          className={selectedClass.name}
          onClose={() => {
            setShowStudents(false);
            setSelectedClass(null);
          }}
        />
      )}
    </div>
  );
}
