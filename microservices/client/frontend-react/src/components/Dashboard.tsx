import { useEffect, useState } from 'react';
import { StudentsApi, ClassesApi, PaymentsApi, ApplicationsApi } from '../lib/api';
import { Users, School, CreditCard, TrendingUp, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalClasses: number;
  totalRevenue: number;
  pendingPayments: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    activeStudents: 0,
    totalClasses: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
  });
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('📊 DASHBOARD - Chargement des statistiques...');
      
      // Charger chaque service individuellement avec gestion d'erreur
      let students = [];
      let classes = [];
      let payments = [];
      let applications = [];
      
      try {
        students = await StudentsApi.list();
        console.log(' Students chargés:', students.length);
      } catch (e) {
        console.error(' Erreur chargement students:', e);
      }
      
      try {
        classes = await ClassesApi.list();
        console.log(' Classes chargées:', classes.length);
      } catch (e) {
        console.error(' Erreur chargement classes:', e);
      }
      
      try {
        payments = await PaymentsApi.list();
        console.log(' Payments chargés:', payments.length);
      } catch (e) {
        console.error(' Erreur chargement payments:', e);
      }
      
      try {
        applications = await ApplicationsApi.list();
        console.log(' Applications chargées:', applications.length);
      } catch (e) {
        console.error(' Erreur chargement applications:', e);
      }

      const totalStudents = students.length;
      const activeStudents = students.filter(s => s.status === 'active').length;
      const totalClasses = classes.length;
      const totalRevenue = payments
        .filter(p => p.status === 'paid' || p.status === 'succeeded')
        .reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0);
      const pendingPayments = payments
        .filter(p => ['pending', 'overdue'].includes(p.status))
        .reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0);

      const totalApplications = applications.length;
      const pendingApplications = applications.filter(a => a.status === 'pending').length;
      const approvedApplications = applications.filter(a => a.status === 'approved').length;
      const rejectedApplications = applications.filter(a => a.status === 'rejected').length;

      setStats({
        totalStudents,
        activeStudents,
        totalClasses,
        totalRevenue,
        pendingPayments,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
      });

      // Get recent students (last 5)
      setRecentStudents(students.slice(0, 5));
      
      // Get recent applications (last 5)
      setRecentApplications(applications.slice(0, 5));
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-600 mt-1">Vue d'ensemble des inscriptions et statistiques</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Élèves"
          value={stats.totalStudents}
          icon={Users}
          color="bg-blue-600"
          subtitle={`${stats.activeStudents} actifs`}
        />
        <StatCard
          title="Classes"
          value={stats.totalClasses}
          icon={School}
          color="bg-green-600"
        />
        <StatCard
          title="Revenus Totaux"
          value={`${stats.totalRevenue.toLocaleString()} XOF`}
          icon={TrendingUp}
          color="bg-amber-600"
        />
        <StatCard
          title="Paiements en attente"
          value={`${stats.pendingPayments.toLocaleString()} XOF`}
          icon={CreditCard}
          color="bg-red-600"
        />
      </div>

      {/* Applications Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Demandes en attente"
          value={stats.pendingApplications}
          icon={Clock}
          color="bg-orange-600"
          subtitle={`Sur ${stats.totalApplications} total`}
        />
        <StatCard
          title="Demandes approuvées"
          value={stats.approvedApplications}
          icon={CheckCircle}
          color="bg-green-600"
        />
        <StatCard
          title="Demandes rejetées"
          value={stats.rejectedApplications}
          icon={AlertCircle}
          color="bg-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des élèves</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Élèves actifs</span>
              <span className="font-semibold text-green-600">{stats.activeStudents}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total inscriptions</span>
              <span className="font-semibold text-blue-600">{stats.totalStudents}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques de paiement</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenus collectés</span>
              <span className="font-semibold text-green-600">{stats.totalRevenue.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">En attente</span>
              <span className="font-semibold text-amber-600">{stats.pendingPayments.toLocaleString()} XOF</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Élèves récents</h3>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentStudents.length > 0 ? (
              recentStudents.map((student: any) => (
                <div key={student.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{student.firstName} {student.lastName}</p>
                    <p className="text-sm text-gray-500">{student.program}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {student.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Aucun élève récent</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Demandes récentes</h3>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentApplications.length > 0 ? (
              recentApplications.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{app.firstName} {app.lastName}</p>
                    <p className="text-sm text-gray-500">{app.program}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    app.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                    app.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {app.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Aucune demande récente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
