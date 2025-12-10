import { useState, useEffect } from 'react';
import { UserProfile, Student, Payment, Enrollment, Class } from '../types';
import { StudentsApi, PaymentsApi, EnrollmentsApi, ClassesApi } from '../lib/api';
import { User, CreditCard, BookOpen, Calendar, Mail, Phone, MapPin, ArrowLeft, AlertCircle, CheckCircle, Clock, RefreshCw, Award, Key, Copy } from 'lucide-react';
import PaymentModal from './PaymentModal';
import StudentProfileLinking from './StudentProfileLinking';
import PhotoUpload from './PhotoUpload';
import QuebecGrades from './QuebecGrades';

interface StudentOwnDashboardProps {
  user: UserProfile;
  onBack: () => void;
}

export default function StudentOwnDashboard({ user, onBack }: StudentOwnDashboardProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLinkingInterface, setShowLinkingInterface] = useState(false);

  useEffect(() => {
    // Charger les données à chaque connexion ou changement d'utilisateur
    loadData();
    
    // Auto-refresh toutes les 30 secondes pour avoir les données à jour
    const refreshInterval = setInterval(() => {
      loadData(true); // Rafraîchissement silencieux
    }, 30000); // 30 secondes
    
    // Nettoyage de l'intervalle quand le composant est démonté
    return () => clearInterval(refreshInterval);
  }, [user.id, user.studentId]); // Recharger quand l'utilisateur change

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      let studentProfile: Student | null = null;

      // 1. Si l'utilisateur a un studentId dans son profil
      if (user.studentId) {
        studentProfile = await StudentsApi.getById(user.studentId);
      } 
      
      // 2. Essayer de trouver par l'endpoint intelligent
      if (!studentProfile) {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await fetch('http://localhost:4003/students/find-by-current-user', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            studentProfile = await response.json();
            console.log(' Profil trouvé automatiquement:', studentProfile);
          }
        } catch (err) {
          console.log(' Recherche automatique échouée, passage à la recherche manuelle');
        }
      }
      
      // 3. Chercher par user_id dans les profils élèves
      if (!studentProfile) {
        const allStudents = await StudentsApi.list();
        studentProfile = allStudents.find((s: Student) => s.userId === user.id) || null;
      }

      if (studentProfile) {
        console.log(' DONNÉES CHARGÉES DEPUIS LA BASE DE DONNÉES:', {
          studentId: studentProfile.id,
          nom: `${studentProfile.firstName} ${studentProfile.lastName}`,
          dateNaissance: studentProfile.dateOfBirth,
          programme: studentProfile.program,
          session: studentProfile.session,
          timestamp: new Date().toISOString()
        });
        
        setStudent(studentProfile);
        
        // Charger les données liées à cet élève uniquement
        const allPayments = await PaymentsApi.list();
        const allEnrollments = await EnrollmentsApi.list();
        const allClasses = await ClassesApi.list();

        // Filtrer pour cet élève seulement
        const studentPayments = allPayments.filter((p: Payment) => p.studentId === studentProfile.id);
        const studentEnrollments = allEnrollments.filter((e: Enrollment) => e.studentId === studentProfile.id);
        const enrolledClasses = allClasses.filter((c: Class) => 
          studentEnrollments.some((e: Enrollment) => e.classId === c.id)
        );

        console.log(' Paiements chargés:', studentPayments.length);
        console.log(' Inscriptions chargées:', studentEnrollments.length);
        console.log(' Classes chargées:', enrolledClasses.length);

        setPayments(studentPayments);
        setStudentEnrollments(studentEnrollments);
        setClasses(enrolledClasses);
      } else {
        // Aucun profil élève lié trouvé
        setShowLinkingInterface(true);
      }
    } catch (error: any) {
      console.error(' ERREUR lors du chargement des données (StudentOwnDashboard):');
      console.error('Type:', error.constructor.name);
      console.error('Message:', error.message);
      console.error('Response:', error.response?.status, error.response?.data);
      console.error('Stack:', error.stack);
      
      // Afficher une alerte pour l'utilisateur
      alert(`Erreur de chargement du profil élève: ${error.message || 'Erreur inconnue'}. Vérifiez la console.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showLinkingInterface) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          
          <StudentProfileLinking />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profil non trouvé</h2>
            <p className="text-gray-600 mb-6">
              Aucun profil élève n'a été trouvé pour votre compte.
            </p>
            <button
              onClick={() => setShowLinkingInterface(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Rechercher mon profil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {lastUpdated && (
                <p>Dernière mise à jour: {lastUpdated.toLocaleTimeString('fr-FR')}</p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* Profil de l'élève */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Photo de profil */}
              <div className="relative">
                <PhotoUpload
                  studentId={student.id}
                  currentPhoto={student.profilePhoto}
                  onSuccess={(photoUrl) => {
                    setStudent(prev => prev ? { ...prev, profilePhoto: photoUrl } : null);
                  }}
                  showUploadButton={true}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-white">
                    {student.firstName} {student.lastName}
                  </h1>
                  
                  {/* Indicateur de completion du profil */}
                  <div className="ml-4">
                    {(() => {
                      let completed = 0;
                      let total = 8;
                      
                      if (student.firstName && student.lastName && student.dateOfBirth) completed++;
                      if (student.parentEmail && student.parentPhone && student.parentName) completed++;
                      if (student.emergencyContact?.name && student.emergencyContact?.phone) completed++;
                      if (student.medicalInfo && (
                        student.medicalInfo.allergies?.length || 
                        student.medicalInfo.medications?.length || 
                        student.medicalInfo.medicalConditions?.length || 
                        student.medicalInfo.emergencyMedicalNotes
                      )) completed++;
                      if (student.academicHistory && (
                        student.academicHistory.previousSchool || 
                        student.academicHistory.lastGrade
                      )) completed++;
                      if (student.preferences && (
                        student.preferences.goals?.length || 
                        student.preferences.interests?.length ||
                        student.preferences.learningStyle
                      )) completed++;
                      if (student.program && student.session) completed++;
                      if (student.profilePhoto) completed++;
                      
                      const percentage = Math.round((completed / total) * 100);
                      
                      return (
                        <div className="flex items-center gap-2">
                          <div className="bg-white bg-opacity-20 rounded-full px-3 py-1">
                            <span className="text-sm font-semibold">
                              Profil {percentage}% complet
                            </span>
                          </div>
                          {percentage === 100 && (
                            <CheckCircle className="w-5 h-5 text-green-300" />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                
                <p className="text-blue-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  {student.program} • {student.session}
                  {student.secondaryLevel && ` • ${student.secondaryLevel}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cartes d'informations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Statut */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 rounded-lg p-2">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Statut de l'inscription</p>
              <div className="flex items-center gap-2">
                {student.status === 'pending' && (
                  <>
                    <Clock className="w-5 h-5 text-orange-500" />
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                      En attente
                    </span>
                  </>
                )}
                {student.status === 'active' && (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      Actif
                    </span>
                  </>
                )}
                {(student.status === 'inactive' || student.status === 'suspended') && (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                      Inactif
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Scolarité */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 rounded-lg p-2">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Frais de scolarité</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <span className="font-semibold">{student.tuitionAmount?.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ CA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Payé:</span>
                  <span className="font-semibold text-green-600">{student.tuitionPaid?.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ CA</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-1">
                  <span>Solde:</span>
                  <span className={`font-semibold ${((student.tuitionAmount || 0) - (student.tuitionPaid || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {((student.tuitionAmount || 0) - (student.tuitionPaid || 0)).toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ CA
                  </span>
                </div>
              </div>
              
              {((student.tuitionAmount || 0) - (student.tuitionPaid || 0)) > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Effectuer un paiement
                </button>
              )}
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 rounded-lg p-2">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Classes inscrites</p>
              <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
              {classes.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {classes[0].name} {classes.length > 1 && `+${classes.length - 1} autre${classes.length > 2 ? 's' : ''}`}
                </p>
              )}
            </div>
          </div>

          {/* Paiements */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 rounded-lg p-2">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Paiements effectués</p>
              <p className="text-2xl font-bold text-gray-900">{payments.filter(p => p.status === 'paid').length}</p>
              <p className="text-sm text-gray-600 mt-1">
                Total: {payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ CA
              </p>
            </div>
          </div>
        </div>

        {/* Informations détaillées */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informations personnelles */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Informations personnelles
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Date de naissance</p>
                  <p className="font-semibold">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR') : 'Non renseignée'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Genre</p>
                  <p className="font-semibold">{student.gender || 'Non renseigné'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Adresse</p>
                  <p className="font-semibold">{student.address || 'Non renseignée'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Code d'accès - Affiché seulement si applicationId existe */}
          {student.applicationId && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                Code d'accès personnel
              </h3>
              
              <div className="bg-white rounded-lg p-4 mb-3">
                <p className="text-xs text-gray-600 mb-2">Votre code d'accès unique</p>
                <div className="flex items-center gap-3">
                  <code className="text-2xl font-mono font-bold text-blue-600 tracking-wider">
                    #{student.applicationId.substring(0, 8).toUpperCase()}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(student.applicationId!.substring(0, 8));
                      alert('Code copié !');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copier le code"
                  >
                    <Copy className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong> À quoi sert ce code ?</strong>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Ce code vous permet d'accéder rapidement à votre profil sans avoir besoin de votre email et mot de passe. 
                  Conservez-le précieusement et ne le partagez pas.
                </p>
              </div>
            </div>
          )}

          {/* Contact parent */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Contact parent/tuteur
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Nom</p>
                  <p className="font-semibold">{student.parentName || 'Non renseigné'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Téléphone</p>
                  <p className="font-semibold">{student.parentPhone || 'Non renseigné'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{student.parentEmail || 'Non renseigné'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Notes et Bulletin */}
        {studentEnrollments.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-600" />
              Mes Notes et Bulletin
            </h2>
            
            <div className="space-y-6">
              {studentEnrollments.map((enrollment) => (
                <div key={enrollment.id} className="bg-white rounded-2xl shadow-lg p-6">
                  <QuebecGrades enrollment={enrollment} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de paiement */}
      {showPaymentModal && student && (
        <PaymentModal
          studentId={student.id}
          studentName={`${student.firstName} ${student.lastName}`}
          amount={(student.tuitionAmount || 0) - (student.tuitionPaid || 0)}
          description={`Frais de scolarité - ${student.program || 'Programme'}`}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            loadData(true);
          }}
        />
      )}
    </div>
  );
}
