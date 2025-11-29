import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { StudentsApi, EnrollmentsApi, ClassesApi } from '../lib/api';
import { User, Calendar, MapPin, Phone, Mail, School } from 'lucide-react';
import StudentPayment from './StudentPayment';

interface StudentProfileProps {
  user: UserProfile;
}

export default function StudentProfile({ user }: StudentProfileProps) {
  const [student, setStudent] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [user]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // Si l'utilisateur a un studentId lié
      if (user.studentId) {
        const studentData = await StudentsApi.getById(user.studentId);
        setStudent(studentData);

        // Récupérer les inscriptions aux classes
        const allEnrollments = await EnrollmentsApi.list();
        const studentEnrollments = allEnrollments.filter((e: any) => e.studentId === user.studentId);

        // Récupérer les classes
        if (studentEnrollments.length > 0) {
          const allClasses = await ClassesApi.list();
          const enrolledClasses = allClasses.filter((c: any) => 
            studentEnrollments.some((e: any) => e.classId === c.id)
          );
          setClasses(enrolledClasses);
        }
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium mb-2">
            {user.role === 'parent' 
              ? 'Aucun élève inscrit'
              : 'Profil non trouvé'
            }
          </p>
          <p className="text-yellow-700 text-sm">
            {user.role === 'parent' 
              ? 'Vous n\'avez pas encore inscrit d\'élève. Utilisez le formulaire d\'inscription pour commencer.'
              : 'Votre profil n\'est pas encore créé. Veuillez soumettre une demande d\'inscription.'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* En-tête du profil */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-start gap-6">
          <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {student.first_name} {student.last_name}
            </h1>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Né(e) le {new Date(student.date_of_birth).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>{student.gender}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{student.address}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  student.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {student.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informations du parent */}
      {user.role === 'parent' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Informations du parent/tuteur</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>{student.parent_name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{student.parent_phone}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 md:col-span-2">
              <Mail className="w-4 h-4" />
              <span>{student.parent_email}</span>
            </div>
          </div>
        </div>
      )}

      {/* Classes inscrites */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <School className="w-6 h-6" />
          Classes inscrites
        </h2>
        {classes.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune classe assignée pour le moment</p>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div key={cls.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-600">Enseignant: {cls.teacher_name}</p>
                    <p className="text-sm text-gray-500">{cls.schedule}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Capacité</p>
                    <p className="font-semibold text-gray-900">{cls.capacity} élèves</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paiements - Nouveau composant professionnel */}
      <StudentPayment
        studentId={student.id}
        studentName={`${student.firstName} ${student.lastName}`}
        tuitionAmount={student.tuitionAmount || 0}
        tuitionPaid={student.tuitionPaid || 0}
        onSuccess={fetchStudentData}
      />
    </div>
  );
}
