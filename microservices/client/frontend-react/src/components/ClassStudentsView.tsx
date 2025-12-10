import { useEffect, useState } from 'react';
import { Users, X, Mail, Phone, Calendar, BookOpen, CreditCard, ArrowLeft, UserMinus } from 'lucide-react';
import { EnrollmentsApi } from '../lib/api';

interface ClassStudentsViewProps {
  classId: string;
  className: string;
  onClose: () => void;
}

export default function ClassStudentsView({ classId, className, onClose }: ClassStudentsViewProps) {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, [classId]);

  const fetchEnrollments = async () => {
    try {
      console.log('🔄 Chargement des inscriptions pour la classe:', classId);
      // Filtrer uniquement les inscriptions actives
      const data = await EnrollmentsApi.listByClass(classId, 'active');
      console.log(' Inscriptions reçues:', data);
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(' Erreur lors du chargement des inscriptions:', error);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      graduated: 'bg-blue-100 text-blue-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: 'Actif',
      inactive: 'Inactif',
      graduated: 'Diplômé',
      suspended: 'Suspendu',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const calculateBalance = (tuitionAmount?: number, tuitionPaid?: number) => {
    const amount = tuitionAmount || 0;
    const paid = tuitionPaid || 0;
    return amount - paid;
  };

  const handleUnenroll = async (enrollmentId: string, studentName: string) => {
    console.log(' Tentative de désinscription ! ', { enrollmentId, studentName });
    
    if (!confirm(`Êtes-vous sûr de vouloir désinscrire ${studentName} de cette classe ?`)) {
      console.log(' Désinscription annulée par l\'utilisateur');
      return;
    }

    try {
      console.log(' Envoi de la requête de mise à jour...');
      const response = await EnrollmentsApi.update(enrollmentId, { status: 'dropped' });
      console.log(' Réponse reçue:', response);
      
      // Rafraîchir la liste
      console.log('🔄 Rafraîchissement de la liste...');
      await fetchEnrollments();
      console.log(' Désinscription réussie');
    } catch (error: any) {
      console.error(' Erreur lors de la désinscription:', error);
      console.error('Détails:', error.response?.data || error.message);
      alert(`Erreur lors de la désinscription de l'élève: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{className}</h2>
              <p className="text-white/90 text-sm">
                {enrollments.length} élève{enrollments.length !== 1 ? 's' : ''} inscrit{enrollments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-gray-600 text-lg font-medium">Aucun élève inscrit</p>
              <p className="text-gray-500 text-sm mt-2">Cette classe n'a pas encore d'élèves inscrits</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {enrollments.map((enrollment: any) => {
                const student = enrollment.student;
                if (!student) return null;

                const balance = calculateBalance(student.tuitionAmount, student.tuitionPaid);
                const isPaid = balance <= 0;

                return (
                  <div
                    key={enrollment.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-purple-300 hover:shadow-lg transition-all"
                  >
                    {/* Student Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Photo de profil */}
                        {student.profilePhoto ? (
                          <img 
                            src={student.profilePhoto} 
                            alt={`${student.firstName} ${student.lastName}`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
                          />
                        ) : (
                          <div className="bg-gradient-to-br from-purple-600 to-pink-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-purple-200">
                            {student.firstName?.[0]}{student.lastName?.[0]}
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {student.firstName} {student.lastName}
                          </h3>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(student.status)}`}>
                            {getStatusLabel(student.status)}
                          </span>
                        </div>
                      </div>
                      {/* Bouton de désinscription */}
                      <button
                        onClick={() => handleUnenroll(enrollment.id, `${student.firstName} ${student.lastName}`)}
                        className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
                        title="Désinscrire de la classe"
                      >
                        <UserMinus className="w-4 h-4" />
                        <span className="text-sm font-medium">Désinscrire</span>
                      </button>
                    </div>

                    {/* Student Details */}
                    <div className="space-y-3">
                      {/* Date de naissance */}
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <span className="text-gray-500">Né(e) le:</span>
                          <span className="ml-2 text-gray-900 font-medium">{formatDate(student.dateOfBirth)}</span>
                        </div>
                      </div>

                      {/* Programme */}
                      <div className="flex items-center gap-3 text-sm">
                        <BookOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <span className="text-gray-500">Programme:</span>
                          <span className="ml-2 text-gray-900 font-medium capitalize">
                            {student.program}
                            {student.secondaryLevel && ` - ${student.secondaryLevel}`}
                          </span>
                        </div>
                      </div>

                      {/* Parent Info */}
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Parent/Tuteur</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-900 font-medium">{student.parentName}</span>
                          </div>
                          {student.parentPhone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <a href={`tel:${student.parentPhone}`} className="text-blue-600 hover:underline">
                                {student.parentPhone}
                              </a>
                            </div>
                          )}
                          {student.parentEmail && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <a href={`mailto:${student.parentEmail}`} className="text-blue-600 hover:underline truncate">
                                {student.parentEmail}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Info */}
                      {student.tuitionAmount && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Paiement</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <div className="text-sm">
                                <span className="text-gray-500">Payé:</span>
                                <span className="ml-1 text-gray-900 font-medium">
                                  {(student.tuitionPaid || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                                </span>
                                <span className="text-gray-500 mx-1">/</span>
                                <span className="text-gray-500">
                                  {student.tuitionAmount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                                </span>
                              </div>
                            </div>
                            {!isPaid && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 text-xs font-semibold rounded-full">
                                Solde: {balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                              </span>
                            )}
                            {isPaid && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 text-xs font-semibold rounded-full">
                                ✓ Payé
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux classes
          </button>
        </div>
      </div>
    </div>
  );
}
