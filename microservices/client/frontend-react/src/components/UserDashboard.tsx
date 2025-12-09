import { useState, useEffect } from 'react';
import { UserProfile, Student, Payment, Enrollment, Class, Application } from '../types';
import { StudentsApi, PaymentsApi, EnrollmentsApi, ClassesApi, ApplicationsApi } from '../lib/api';
import { User, GraduationCap, CreditCard, BookOpen, Calendar, Mail, Phone, MapPin, ArrowLeft, Plus, AlertCircle, CheckCircle, Clock, Bell, FileText, RefreshCw, Key, Copy } from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import PaymentModal from './PaymentModal';
import StudentProfileLinking from './StudentProfileLinking';

interface UserDashboardProps {
  user: UserProfile;
  onBack: () => void;
}

export default function UserDashboard({ user, onBack }: UserDashboardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLinkingInterface, setShowLinkingInterface] = useState(false);

  useEffect(() => {
    loadData();
  }, []); // Charger les données au montage du composant

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      console.log('🔑 Token présent:', !!localStorage.getItem('auth_token'));
      console.log('👤 Utilisateur:', user.email, '- Rôle:', user.role);
      
      console.log('📡 Appel API: StudentsApi.list()...');
      const allStudents = await StudentsApi.list();
      console.log('✅ StudentsApi.list() réussi:', allStudents.length, 'étudiants');
      
      console.log('📡 Appel API: PaymentsApi.list()...');
      const allPayments = await PaymentsApi.list();
      console.log('✅ PaymentsApi.list() réussi:', allPayments.length, 'paiements');
      
      console.log('📡 Appel API: EnrollmentsApi.list()...');
      const allEnrollments = await EnrollmentsApi.list();
      console.log('✅ EnrollmentsApi.list() réussi:', allEnrollments.length, 'inscriptions');
      
      console.log('📡 Appel API: ClassesApi.list()...');
      const allClasses = await ClassesApi.list();
      console.log('✅ ClassesApi.list() réussi:', allClasses.length, 'classes');
      
      console.log('📡 Appel API: ApplicationsApi.list()...');
      const allApplications = await ApplicationsApi.list();
      console.log('✅ ApplicationsApi.list() réussi:', allApplications.length, 'applications');

      console.log('📊 Total étudiants dans la BD:', allStudents.length);
      console.log('📧 Email utilisateur connecté:', user.email);
      console.log('👤 Rôle:', user.role);

      if (user.role === 'parent') {
        console.log('🔍 DEBUT RECHERCHE ENFANTS');
        console.log('📧 Email parent connecté:', user.email);
        console.log('📊 Total étudiants dans BD:', allStudents.length);
        
        // Afficher quelques exemples d'emails pour debug
        console.log('📋 Exemples d\'emails dans la BD:');
        allStudents.slice(0, 5).forEach((s: Student) => {
          console.log('  -', s.parentEmail, '→', s.firstName, s.lastName);
        });
        
        // Charger tous les étudiants liés à ce parent (utiliser camelCase)
        const linkedStudents = allStudents.filter((s: Student) => {
          const match = s.parentEmail === user.email;
          if (match) {
            console.log('✅ MATCH TROUVE:', s.firstName, s.lastName);
          }
          return match;
        });
        
        console.log('👨‍👩‍👧 RESULTAT: Étudiants trouvés:', linkedStudents.length);
        
        // Charger toutes les inscriptions liées à ce parent
        const linkedApplications = allApplications.filter((a: Application) => a.parentEmail === user.email);
        console.log('📝 Inscriptions trouvées:', linkedApplications.length);
        setApplications(linkedApplications);
        
        // Afficher tous les emails parents pour déboguer
        if (linkedStudents.length === 0) {
          console.log('⚠️ AUCUN ÉTUDIANT TROUVÉ!');
          console.log('Vérifiez que l\'email correspond exactement');
        }
        
        setStudents(linkedStudents);
        
        if (linkedStudents.length > 0) {
          setSelectedStudent(linkedStudents[0]);
          loadStudentDetails(linkedStudents[0].id, allPayments, allEnrollments, allClasses);
        }
      } else if (user.role === 'student') {
        // Si l'utilisateur a un studentId, charger directement
        if (user.studentId) {
          const student = await StudentsApi.getById(user.studentId);
          console.log('🎓 Étudiant (via studentId):', user.studentId, '- Profil trouvé:', !!student);
          if (student) {
            setStudents([student]);
            setSelectedStudent(student);
            loadStudentDetails(student.id, allPayments, allEnrollments, allClasses);
            
            const studentApplications = allApplications.filter((a: Application) => a.studentId === student.id);
            setApplications(studentApplications);
          }
        } else {
          // Si pas de studentId, chercher par user_id dans les profils élèves
          const allStudents = await StudentsApi.list();
          const linkedStudent = allStudents.find((s: Student) => s.userId === user.id);
          
          if (linkedStudent) {
            console.log('🎓 Étudiant lié trouvé via userId:', linkedStudent.id);
            setStudents([linkedStudent]);
            setSelectedStudent(linkedStudent);
            loadStudentDetails(linkedStudent.id, allPayments, allEnrollments, allClasses);
            
            const studentApplications = allApplications.filter((a: Application) => a.studentId === linkedStudent.id);
            setApplications(studentApplications);
          } else {
            console.log('🎓 Aucun profil élève lié trouvé - affichage de la page de liaison');
            setShowLinkingInterface(true);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ ERREUR lors du chargement des données:');
      console.error('Type:', error.constructor.name);
      console.error('Message:', error.message);
      console.error('Response:', error.response?.status, error.response?.data);
      console.error('Stack:', error.stack);
      
      // Afficher une alerte pour l'utilisateur
      alert(`Erreur de chargement: ${error.message || 'Erreur inconnue'}. Vérifiez la console pour plus de détails.`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const loadStudentDetails = (
    studentId: string,
    allPayments: Payment[],
    allEnrollments: Enrollment[],
    allClasses: Class[]
  ) => {
    const studentPayments = allPayments.filter((p: Payment) => p.studentId === studentId);
    const studentEnrollments = allEnrollments.filter(e => e.studentId === studentId);
    
    setPayments(studentPayments);
    setEnrollments(studentEnrollments);
    setClasses(allClasses);
  };

  const handleStudentSelect = async (student: Student) => {
    setSelectedStudent(student);
    const allPayments = await PaymentsApi.list();
    const allEnrollments = await EnrollmentsApi.list();
    const allClasses = await ClassesApi.list();
    loadStudentDetails(student.id, allPayments, allEnrollments, allClasses);
  };

  const getClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.name}` : 'Non assigné';
  };

  const getTotalPaid = () => {
    return payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getTotalPending = () => {
    return payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
          
          {/* Afficher les inscriptions en attente si elles existent */}
          {applications.length > 0 ? (
            <div className="space-y-6">
              {/* Message d'information */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-900 mb-2">
                      📋 Inscriptions en cours de traitement
                    </h3>
                    <p className="text-sm text-blue-800">
                      Vos demandes d'inscription ont été reçues et sont en cours d'examen par l'administration. 
                      Une fois approuvées, les profils de vos enfants apparaîtront ici avec toutes leurs informations scolaires.
                    </p>
                  </div>
                </div>
              </div>

              {/* Liste des inscriptions */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  Mes demandes d'inscription ({applications.length})
                </h2>
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-all">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1">
                            {app.firstName} {app.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {app.program} • {app.secondaryLevel || 'N/A'} • {app.session}
                          </p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                          app.status === 'approved' 
                            ? 'bg-green-100 text-green-700' 
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {app.status === 'approved' ? '✅ Approuvée' : 
                           app.status === 'rejected' ? '❌ Refusée' : 
                           '⏳ En attente'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Numéro de demande: #{app.id?.substring(0, 8)}
                      </div>
                      {app.status === 'pending' && (
                        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs text-yellow-800">
                            💡 <strong>Prochaine étape:</strong> L'école examinera le dossier et vous contactera. 
                            Vous recevrez une notification par email à <strong>{user.email}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bouton pour inscrire un autre enfant */}
              {user.role === 'parent' && (
                <div className="text-center">
                  <button
                    onClick={onBack}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Inscrire un autre enfant
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Aucune inscription */
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Aucun profil trouvé
              </h2>
              <p className="text-gray-600 mb-6">
                {user.role === 'parent'
                  ? "Vous n'avez pas encore inscrit d'enfant."
                  : "Votre profil étudiant n'est pas encore créé."}
              </p>
              {user.role === 'parent' && (
                <button
                  onClick={onBack}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Inscrire un enfant
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-14 h-14 rounded-xl flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.role === 'parent' ? 'Tableau de bord - Parent/Tuteur' : 'Mon tableau de bord'}
                </h1>
                <p className="text-gray-600">{user.fullName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Dernière mise à jour */}
              {lastUpdated && (
                <div className="text-sm text-gray-500 hidden sm:block">
                  Mis à jour: {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              
              {/* Bouton Rafraîchir */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-3 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 group"
                title="Rafraîchir les données"
              >
                <RefreshCw className={`w-6 h-6 text-blue-600 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-300'}`} />
              </button>
              
              {/* Bouton Notifications */}
              <button className="relative p-3 hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-6 h-6 text-gray-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications de l'école */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-amber-100 p-3 rounded-xl">
              <Bell className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                📬 Notifications de l'école
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-4 border border-amber-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">Bienvenue !</p>
                      <p className="text-sm text-gray-600">
                        Votre inscription a été reçue. L'école examinera votre dossier et vous contactera sous peu.
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">Aujourd'hui</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Inscriptions */}
        {applications.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Mes inscriptions ({applications.length})
            </h2>
            <div className="space-y-4">
              {applications.map((app) => (
                <div key={app.id} className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-all">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {app.firstName} {app.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {app.program} • {app.secondaryLevel} • {app.session}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                      app.status === 'approved' 
                        ? 'bg-green-100 text-green-700' 
                        : app.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {app.status === 'approved' && '✅ Approuvé'}
                      {app.status === 'rejected' && '❌ Refusé'}
                      {app.status === 'pending' && '⏳ En attente'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">Date de naissance</p>
                      <p className="font-medium text-gray-900">
                        {new Date(app.dateOfBirth).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Genre</p>
                      <p className="font-medium text-gray-900">{app.gender}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Soumis le</p>
                      <p className="font-medium text-gray-900">
                        {new Date(app.submittedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">Numéro</p>
                      <p className="font-medium text-gray-900 font-mono">
                        #{app.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>

                  {app.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <strong>Note :</strong> {app.notes}
                      </p>
                    </div>
                  )}

                  {app.status === 'approved' && app.studentId && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-green-700 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <strong>Élève créé !</strong> Vous pouvez maintenant voir son profil ci-dessous.
                      </p>
                    </div>
                  )}

                  {app.status === 'pending' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => {
                          setSelectedApplicationId(app.id);
                          setShowDocumentUpload(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Ajouter des documents
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Navigation entre enfants si plusieurs élèves */}
        {students.length > 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Mes Enfants ({students.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((student) => {
                const balance = (student.tuitionAmount || 0) - (student.tuitionPaid || 0);
                const isSelected = selectedStudent?.id === student.id;
                
                return (
                  <button
                    key={student.id}
                    onClick={() => handleStudentSelect(student)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      {/* Photo de profil miniature */}
                      {student.profilePhoto ? (
                        <img 
                          src={student.profilePhoto} 
                          alt={`${student.firstName} ${student.lastName}`}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium border-2 border-gray-300">
                          {student.firstName?.[0]}{student.lastName?.[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-semibold ${
                            isSelected ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {student.firstName} {student.lastName}
                          </h4>
                          {balance > 0 && (
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 text-xs rounded-full">
                              Solde: {balance.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ CA
                            </span>
                          )}
                          {balance === 0 && student.tuitionAmount && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 text-xs rounded-full">
                              ✓ Payé
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {student.program} • {student.session}
                          {student.secondaryLevel && ` • ${student.secondaryLevel}`}
                        </p>
                      </div>
                    </div>
                    {student.tuitionAmount && (
                      <div className="mt-2 text-xs text-gray-500">
                        {(student.tuitionPaid || 0).toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ / {student.tuitionAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedStudent && (
          <>
            {/* En-tête de l'élève sélectionné */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Photo de profil */}
                  <div className="flex-shrink-0">
                    {selectedStudent.profilePhoto ? (
                      <img 
                        src={selectedStudent.profilePhoto} 
                        alt={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white shadow-lg">
                        <GraduationCap className="w-10 h-10 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-white">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </h2>
                      
                      {/* Indicateur de completion du profil */}
                      <div className="flex items-center gap-2">
                        {(() => {
                          // Calculer le pourcentage de completion du profil
                          let completed = 0;
                          let total = 8; // Augmenté pour inclure plus de sections
                          
                          // Section 1: Informations personnelles de base
                          if (selectedStudent.firstName && selectedStudent.lastName && selectedStudent.dateOfBirth) completed++;
                          
                          // Section 2: Informations parent/tuteur
                          if (selectedStudent.parentEmail && selectedStudent.parentPhone && selectedStudent.parentName) completed++;
                          
                          // Section 3: Contact d'urgence
                          if (selectedStudent.emergencyContact?.name && selectedStudent.emergencyContact?.phone) completed++;
                          
                          // Section 4: Informations médicales
                          if (selectedStudent.medicalInfo && (
                            selectedStudent.medicalInfo.allergies?.length || 
                            selectedStudent.medicalInfo.medications?.length || 
                            selectedStudent.medicalInfo.medicalConditions?.length || 
                            selectedStudent.medicalInfo.emergencyMedicalNotes
                          )) completed++;
                          
                          // Section 5: Historique académique
                          if (selectedStudent.academicHistory && (
                            selectedStudent.academicHistory.previousSchool || 
                            selectedStudent.academicHistory.lastGrade
                          )) completed++;
                          
                          // Section 6: Préférences et objectifs
                          if (selectedStudent.preferences && (
                            selectedStudent.preferences.goals?.length || 
                            selectedStudent.preferences.interests?.length ||
                            selectedStudent.preferences.learningStyle
                          )) completed++;
                          
                          // Section 7: Informations scolaires
                          if (selectedStudent.program && selectedStudent.session) completed++;
                          
                          // Section 8: Photo de profil
                          if (selectedStudent.profilePhoto) completed++;
                          
                          const percentage = Math.round((completed / total) * 100);
                          
                          const getStatusConfig = () => {
                            if (percentage >= 90) return {
                              color: 'green',
                              icon: '✓',
                              bg: 'bg-green-100',
                              text: 'text-green-800',
                              message: 'Profil complet'
                            };
                            if (percentage >= 60) return {
                              color: 'yellow', 
                              icon: '⌚',
                              bg: 'bg-yellow-100',
                              text: 'text-yellow-800',
                              message: 'En cours'
                            };
                            return {
                              color: 'red',
                              icon: '⚠',
                              bg: 'bg-red-100', 
                              text: 'text-red-800',
                              message: 'Incomplet'
                            };
                          };
                          
                          const status = getStatusConfig();
                          
                          return (
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${status.bg}`}>
                              <span className={`${status.text}`}>{status.icon}</span>
                              <span className={`text-sm font-medium ${status.text}`}>
                                {percentage}% complet
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <p className="text-blue-100 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {selectedStudent.program} • {selectedStudent.session}
                      {selectedStudent.secondaryLevel && ` • ${selectedStudent.secondaryLevel}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg backdrop-blur-sm transition-colors disabled:opacity-50"
                    title="Rafraîchir les données"
                  >
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  {lastUpdated && (
                    <p className="text-xs text-blue-100 mt-1">
                      Mis à jour: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Statut de l'inscription et informations importantes */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Statut */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Statut de l'inscription</p>
                  <div className="flex items-center gap-2">
                    {selectedStudent.status === 'pending' && (
                      <>
                        <Clock className="w-5 h-5 text-orange-500" />
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
                          En attente
                        </span>
                      </>
                    )}
                    {selectedStudent.status === 'active' && (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                          Actif
                        </span>
                      </>
                    )}
                    {selectedStudent.status === 'inactive' && (
                      <>
                        <AlertCircle className="w-5 h-5 text-gray-500" />
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                          Inactif
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Programme et Niveau */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Programme et Niveau</p>
                  <p className="font-semibold text-gray-900">{selectedStudent.program || 'Non défini'}</p>
                  <p className="text-sm text-blue-600">{selectedStudent.secondaryLevel || 'Non défini'}</p>
                </div>

                {/* Session */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Session</p>
                  <p className="font-semibold text-gray-900">{selectedStudent.session || 'Non définie'}</p>
                  {selectedStudent.sessionStartDate && (
                    <p className="text-sm text-gray-600">
                      Début: {new Date(selectedStudent.sessionStartDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>

                {/* Date limite */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Date limite d'inscription</p>
                  {selectedStudent.registrationDeadline && (
                    <p className="font-semibold text-red-600">
                      {new Date(selectedStudent.registrationDeadline).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  {selectedStudent.registrationDeadline && new Date(selectedStudent.registrationDeadline) > new Date() && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Dans les délais
                    </p>
                  )}
                </div>

                {/* Code d'accès pour l'élève */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 font-medium mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Code d'accès élève
                  </p>
                  {(selectedStudent as any).applicationId ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-lg font-mono font-bold text-blue-600 tracking-wider">
                          {(selectedStudent as any).applicationId.substring(0, 8).toUpperCase()}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText((selectedStudent as any).applicationId.substring(0, 8));
                            alert('Code copié ! Donnez ce code à votre enfant.');
                          }}
                          className="p-1.5 hover:bg-white rounded transition-colors"
                          title="Copier le code"
                        >
                          <Copy className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                      <p className="text-xs text-blue-700">
                        Donnez ce code à votre enfant pour qu'il puisse se connecter à son profil
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Aucun code disponible</p>
                  )}
                </div>
              </div>

              {/* Frais de scolarité - SPÉCIFIQUES À CET ÉLÈVE */}
              {selectedStudent.tuitionAmount && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Informations de paiement pour <strong>{selectedStudent.firstName} {selectedStudent.lastName}</strong>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-700 mb-1">Frais de scolarité</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedStudent.tuitionAmount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-700 mb-1">Montant payé</p>
                      <p className="text-2xl font-bold text-green-900">
                        {(selectedStudent.tuitionPaid || 0).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-sm text-orange-700 mb-1">Solde à payer</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {((selectedStudent.tuitionAmount || 0) - (selectedStudent.tuitionPaid || 0)).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                      </p>
                    </div>
                  </div>
                  
                  {/* Bouton de paiement */}
                  {((selectedStudent.tuitionAmount || 0) - (selectedStudent.tuitionPaid || 0)) > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                      >
                        <CreditCard className="w-5 h-5" />
                        Payer pour {selectedStudent.firstName}
                      </button>
                      <p className="text-xs text-center text-gray-500 mt-2">
                        Paiement sécurisé par Stripe • Solde: {((selectedStudent.tuitionAmount || 0) - (selectedStudent.tuitionPaid || 0)).toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ CA
                      </p>
                    </div>
                  )}
                  
                  {((selectedStudent.tuitionAmount || 0) - (selectedStudent.tuitionPaid || 0)) === 0 && (
                    <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" />
                        <p className="font-semibold">✅ {selectedStudent.firstName} a payé intégralement - Merci !</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Message informatif */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">ℹ️ Modification du profil</p>
                  <p className="text-sm text-blue-800">
                    Pour modifier les informations du profil de l'élève, veuillez contacter l'administration de l'école. 
                    Seuls les documents peuvent être ajoutés via votre espace.
                  </p>
                </div>
              </div>
            </div>


            {/* Informations de l'étudiant */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Carte Profil */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Profil</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nom complet</p>
                    <p className="font-semibold text-gray-900">
                      {selectedStudent.firstName} {selectedStudent.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date de naissance</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedStudent.dateOfBirth).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sexe</p>
                    <p className="font-semibold text-gray-900">
                      {selectedStudent.gender}
                    </p>
                  </div>
                </div>
              </div>

              {/* Carte Classes */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Classes</h3>
                </div>
                <div className="space-y-3">
                  {enrollments.length > 0 ? (
                    enrollments.map((enrollment) => (
                      <div key={enrollment.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-semibold text-gray-900">
                          {getClassName(enrollment.classId)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Inscrit le: {new Date(enrollment.enrollmentDate).toLocaleDateString('fr-FR')}
                        </p>
                        <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                          enrollment.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {enrollment.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Aucune classe assignée</p>
                  )}
                </div>
              </div>

              {/* Carte Contact d'urgence */}
              {selectedStudent.emergencyContact && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <span className="text-lg">🛡️</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Contact d'urgence</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Nom</p>
                      <p className="font-semibold text-gray-900">{selectedStudent.emergencyContact.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Téléphone</p>
                      <p className="font-semibold text-gray-900">{selectedStudent.emergencyContact.phone}</p>
                    </div>
                    {selectedStudent.emergencyContact.relationship && (
                      <div>
                        <p className="text-sm text-gray-600">Relation</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.emergencyContact.relationship}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Carte Informations médicales */}
              {selectedStudent.medicalInfo && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <span className="text-lg">🏥</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Informations médicales</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedStudent.medicalInfo.allergies?.length && (
                      <div>
                        <p className="text-sm text-gray-600">Allergies</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.medicalInfo.allergies.join(', ')}</p>
                      </div>
                    )}
                    {selectedStudent.medicalInfo.medications?.length && (
                      <div>
                        <p className="text-sm text-gray-600">Médicaments</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.medicalInfo.medications.join(', ')}</p>
                      </div>
                    )}
                    {selectedStudent.medicalInfo.medicalConditions?.length && (
                      <div>
                        <p className="text-sm text-gray-600">Conditions médicales</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.medicalInfo.medicalConditions.join(', ')}</p>
                      </div>
                    )}
                    {selectedStudent.medicalInfo.emergencyMedicalNotes && (
                      <div>
                        <p className="text-sm text-gray-600">Notes</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.medicalInfo.emergencyMedicalNotes}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 p-2 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-800">ℹ️ Informations confidentielles - personnel autorisé uniquement</p>
                  </div>
                </div>
              )}

              {/* Carte Historique académique */}
              {selectedStudent.academicHistory && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <span className="text-lg">🎓</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Historique académique</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedStudent.academicHistory.previousSchool && (
                      <div>
                        <p className="text-sm text-gray-600">École précédente</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.academicHistory.previousSchool}</p>
                      </div>
                    )}
                    {selectedStudent.academicHistory.lastGrade && (
                      <div>
                        <p className="text-sm text-gray-600">Dernier niveau</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.academicHistory.lastGrade}</p>
                      </div>
                    )}
                    {selectedStudent.academicHistory.transferReason && (
                      <div>
                        <p className="text-sm text-gray-600">Raison du transfert</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.academicHistory.transferReason}</p>
                      </div>
                    )}
                    {selectedStudent.academicHistory.languages?.length && (
                      <div>
                        <p className="text-sm text-gray-600">Langues parlées</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.academicHistory.languages.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Carte Préférences et objectifs */}
              {selectedStudent.preferences && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <span className="text-lg">🎯</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Préférences et objectifs</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedStudent.preferences.goals?.length && (
                      <div>
                        <p className="text-sm text-gray-600">Objectifs scolaires</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.preferences.goals.join(', ')}</p>
                      </div>
                    )}
                    {selectedStudent.preferences.interests?.length && (
                      <div>
                        <p className="text-sm text-gray-600">Centres d'intérêt</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.preferences.interests.join(', ')}</p>
                      </div>
                    )}
                    {selectedStudent.preferences.extracurriculars?.length && (
                      <div>
                        <p className="text-sm text-gray-600">Activités extrascolaires</p>
                        <p className="font-semibold text-gray-900">{selectedStudent.preferences.extracurriculars.join(', ')}</p>
                      </div>
                    )}
                    {selectedStudent.preferences.learningStyle && (
                      <div>
                        <p className="text-sm text-gray-600">Style d'apprentissage</p>
                        <p className="font-semibold text-gray-900 capitalize">{selectedStudent.preferences.learningStyle}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Carte Paiements */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Paiements</h3>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Total payé</p>
                    <p className="text-2xl font-bold text-green-700">
                      {getTotalPaid().toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-700 mb-1">En attente</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {getTotalPending().toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coordonnées */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Coordonnées
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Email parent</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.parentEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Téléphone</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.parentPhone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">Adresse</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Historique des paiements - SPÉCIFIQUES À CET ÉLÈVE */}
            {payments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Historique des paiements de {selectedStudent.firstName}
                  <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 text-sm rounded-full">
                    {payments.length} paiement{payments.length > 1 ? 's' : ''}
                  </span>
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Montant</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {new Date(payment.paymentDate).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-900">{payment.paymentType}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                            {payment.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              payment.status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : payment.status === 'pending'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {payment.status === 'paid' ? 'Payé' : payment.status === 'pending' ? 'En attente' : 'Annulé'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{payment.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Interface de liaison pour les élèves */}
      {showLinkingInterface && user.role === 'student' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <StudentProfileLinking
            />
          </div>
        </div>
      )}

      {/* Modales */}
      {showDocumentUpload && selectedApplicationId && (
        <DocumentUpload
          applicationId={selectedApplicationId}
          onClose={() => {
            setShowDocumentUpload(false);
            setSelectedApplicationId(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Modal de paiement */}
      {showPaymentModal && selectedStudent && (
        <PaymentModal
          studentId={selectedStudent.id}
          studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
          amount={(selectedStudent.tuitionAmount || 0) - (selectedStudent.tuitionPaid || 0)}
          description={`Frais de scolarité - ${selectedStudent.program || 'Programme'}`}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            loadData(true); // Rafraîchir les données
          }}
        />
      )}
    </div>
  );
}
