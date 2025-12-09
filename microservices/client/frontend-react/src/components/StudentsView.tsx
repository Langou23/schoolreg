import { useEffect, useState } from 'react';
import { Student } from '../types';
import { StudentsApi } from '../lib/api';
import { Plus, Edit2, Trash2, Search, Receipt, Key, Copy, DollarSign } from 'lucide-react';
import StudentForm from './StudentForm';
import PaymentHistory from './PaymentHistory';
import TuitionManagement from './TuitionManagement';

export default function StudentsView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showTuitionManagement, setShowTuitionManagement] = useState(false);
  const [tuitionStudent, setTuitionStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const filtered = students.filter(
      (student: any) =>
        (student.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.parentName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await StudentsApi.list();
      if (Array.isArray(data)) {
        setStudents(data as Student[]);
        setFilteredStudents(data as Student[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) return;

    await StudentsApi.delete(id);
    fetchStudents();
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingStudent(undefined);
    fetchStudents();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'graduated':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'inactive':
        return 'Inactif';
      case 'graduated':
        return 'Diplômé';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Élèves</h2>
          <p className="text-gray-600 mt-1">Gérer les inscriptions des élèves</p>
        </div>
        <button
          onClick={() => {
            setEditingStudent(undefined);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouvel élève
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Rechercher par nom ou parent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Aucun élève trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Photo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom complet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date de naissance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent/Tuteur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code d'accès
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {(student as any).profilePhoto ? (
                          <img 
                            src={(student as any).profilePhoto} 
                            alt={`${(student as any).firstName} ${(student as any).lastName}`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium border-2 border-gray-300">
                            {((student as any).firstName?.[0] || '') + ((student as any).lastName?.[0] || '')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {(student as any).lastName} {(student as any).firstName}
                      </div>
                      <div className="text-sm text-gray-500">{student.gender}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date((student as any).dateOfBirth).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(student as any).parentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(student as any).parentPhone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor((student as any).status)}`}>
                        {getStatusLabel((student as any).status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(student as any).applicationId ? (
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-blue-600" />
                          <code className="text-sm font-mono font-semibold text-blue-600">
                            {(student as any).applicationId.substring(0, 8).toUpperCase()}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText((student as any).applicationId.substring(0, 8));
                              alert('Code copié !');
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Copier le code"
                          >
                            <Copy className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Aucun code</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setTuitionStudent(student);
                          setShowTuitionManagement(true);
                        }}
                        className="text-amber-600 hover:text-amber-900 mr-3"
                        title="Gérer les frais"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowPaymentHistory(true);
                        }}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Historique des paiements"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(student)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <StudentForm
          onClose={() => {
            setShowForm(false);
            setEditingStudent(undefined);
          }}
          onSuccess={handleFormSuccess}
          student={editingStudent}
        />
      )}

      {showPaymentHistory && selectedStudent && (
        <PaymentHistory
          studentId={selectedStudent.id}
          studentName={`${(selectedStudent as any).lastName} ${(selectedStudent as any).firstName}`}
          onClose={() => {
            setShowPaymentHistory(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {showTuitionManagement && tuitionStudent && (
        <TuitionManagement
          student={{
            id: tuitionStudent.id,
            firstName: tuitionStudent.firstName,
            lastName: tuitionStudent.lastName,
            tuitionAmount: tuitionStudent.tuitionAmount,
            tuitionPaid: tuitionStudent.tuitionPaid
          }}
          onClose={() => {
            setShowTuitionManagement(false);
            setTuitionStudent(null);
          }}
          onSuccess={fetchStudents}
        />
      )}
    </div>
  );
}
