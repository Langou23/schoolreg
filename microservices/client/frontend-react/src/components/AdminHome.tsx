import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { School, Users, FileText, CreditCard, Clock, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react';
import SchoolSpace from './SchoolSpace';
import Navbar from './Navbar';
import { StudentsApi, ApplicationsApi, ClassesApi, PaymentsApi } from '../lib/api';

interface AdminHomeProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function AdminHome({ user, onLogout }: AdminHomeProps) {
  const [currentView, setCurrentView] = useState<'home' | 'school'>('home');
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingApplications: 0,
    totalClasses: 0,
    pendingPayments: 0,
    recentApplications: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentView === 'home') {
      fetchQuickStats();
    }
  }, [currentView]);

  const fetchQuickStats = async () => {
    try {
      // Charger les applications en premier (prioritaire)
      const applications = await ApplicationsApi.list();
      
      // Charger les autres données (avec gestion d'erreur individuelle)
      let students = [];
      let classes = [];
      let payments = [];
      
      try {
        students = await StudentsApi.list();
      } catch (e) {
        console.warn('⚠️ Erreur chargement students:', e);
      }
      
      try {
        classes = await ClassesApi.list();
      } catch (e) {
        console.warn('⚠️ Erreur chargement classes:', e);
      }
      
      try {
        payments = await PaymentsApi.list();
      } catch (e) {
        console.warn('⚠️ Erreur chargement payments:', e);
      }

      console.log('📊 ADMIN DASHBOARD - Statistiques:');
      console.log('Total applications chargées:', applications.length);
      console.log('Applications:', applications);
      
      // Afficher les statuts de toutes les applications
      (applications as any[]).forEach((app: any, index: number) => {
        console.log(`  ${index + 1}. ${app.firstName} ${app.lastName} - Status: "${app.status}"`);
      });

      // Filtrer les applications en attente (plusieurs variantes possibles)
      const pending = (applications as any[]).filter((a: any) => {
        const status = a.status?.toLowerCase() || '';
        return status === 'pending' || status === 'submitted' || status === 'en attente' || status === 'waiting';
      });
      console.log('✅ Applications en attente trouvées:', pending.length);
      console.log('Applications pending:', pending);
      
      const pendingPaymentsAmount = (payments as any[])
        .filter((p: any) => ['pending', 'overdue'].includes(p.status))
        .reduce((sum: number, p: any) => sum + parseFloat(p.amount?.toString() || '0'), 0);

      setStats({
        totalStudents: students.length,
        pendingApplications: pending.length,
        totalClasses: classes.length,
        pendingPayments: pendingPaymentsAmount,
        recentApplications: pending.slice(0, 3),
      });
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (currentView === 'school') {
    return <SchoolSpace user={user} onBack={() => setCurrentView('home')} onLogout={onLogout} />;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100 animate-fade-in">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-4">
              <School className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              Bienvenue, {user.fullName} ! 👋
            </h1>
            <p className="text-gray-600 text-lg">
              Vous êtes connecté en tant qu'{user.role === 'admin' ? 'administrateur' : 'direction'}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Élèves</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-600">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Demandes en attente</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingApplications}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-600">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Classes</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClasses}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-600">
                    <School className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Paiements en attente (CAD)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {stats.pendingPayments.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-600">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions rapides et demandes récentes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Action principale */}
              <button
                onClick={() => setCurrentView('school')}
                className="relative bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left group overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="bg-white/20 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <School className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">
                    🏫 Espace École
                  </h2>
                  <p className="text-white/90 mb-6 leading-relaxed text-lg">
                    Accédez au tableau de bord complet pour gérer les élèves, inscriptions, classes et paiements
                  </p>
                  <div className="flex items-center gap-2 text-white font-semibold group-hover:gap-4 transition-all">
                    Ouvrir l'espace
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              {/* Demandes récentes */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Demandes récentes</h3>
                  {stats.pendingApplications > 0 && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {stats.pendingApplications} en attente
                    </span>
                  )}
                </div>
                
                {stats.recentApplications.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentApplications.map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="bg-orange-100 p-2 rounded-lg">
                            <FileText className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{app.firstName} {app.lastName}</p>
                            <p className="text-sm text-gray-600">{app.program}</p>
                          </div>
                        </div>
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      </div>
                    ))}
                    <button
                      onClick={() => setCurrentView('school')}
                      className="w-full mt-4 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      Traiter les demandes
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-gray-600">Aucune demande en attente</p>
                    <p className="text-sm text-gray-500 mt-1">Toutes les inscriptions sont traitées ✓</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
