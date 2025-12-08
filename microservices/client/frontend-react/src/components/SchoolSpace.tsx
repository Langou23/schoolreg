import { useState } from 'react';
import { UserProfile } from '../types';
import { LayoutDashboard, Users, CreditCard, FileText, ArrowLeft, School, BarChart3 } from 'lucide-react';
import Dashboard from './Dashboard';
import StudentsView from './StudentsView';
import ClassesView from './ClassesView';
import PaymentsView from './PaymentsView';
import ApplicationsView from './ApplicationsView';
import UserDashboard from './UserDashboard';
import AdminGradesManager from './AdminGradesManager';
import Navbar from './Navbar';

type View = 'dashboard' | 'students' | 'classes' | 'payments' | 'applications' | 'grades' | 'my-profile';

interface SchoolSpaceProps {
  user: UserProfile;
  onBack?: () => void;
  onLogout: () => void;
}

export default function SchoolSpace({ user, onBack, onLogout }: SchoolSpaceProps) {
  const [currentView, setCurrentView] = useState<View>(
    user.role === 'parent' || user.role === 'student' ? 'my-profile' : 'dashboard'
  );

  // Navigation selon le rôle
  const getNavigation = () => {
    const isAdmin = user.role === 'admin' || user.role === 'direction';
    const isUser = user.role === 'parent' || user.role === 'student';

    const items = [];

    // Pour parents et étudiants : Mon profil en premier
    if (isUser) {
      items.push({
        id: 'my-profile' as View,
        name: user.role === 'parent' ? 'Profils de mes enfants' : 'Mon profil',
        icon: Users,
      });
    }

    // Pour admin/direction : Dashboard
    if (isAdmin) {
      items.push({
        id: 'dashboard' as View,
        name: 'Tableau de bord',
        icon: LayoutDashboard,
      });
    }

    // Élèves (tous)
    items.push({
      id: 'students' as View,
      name: 'Élèves',
      icon: Users,
    });

    // Classes (tous)
    items.push({
      id: 'classes' as View,
      name: 'Classes',
      icon: School,
    });

    // Paiements (tous)
    items.push({
      id: 'payments' as View,
      name: 'Paiements',
      icon: CreditCard,
    });

    // Inscriptions (admin et direction seulement)
    if (isAdmin) {
      items.push({
        id: 'applications' as View,
        name: 'Inscriptions',
        icon: FileText,
      });
      
      // Gestion des notes (admin et direction seulement)
      items.push({
        id: 'grades' as View,
        name: 'Notes & Bulletin',
        icon: BarChart3,
      });
    }

    return items;
  };

  const navigation = getNavigation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar user={user} onLogout={onLogout} />
      
      {/* Breadcrumb / Back button */}
      {onBack && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white shadow-sm border-r border-gray-200">
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'my-profile' && (
              <UserDashboard user={user} onBack={() => setCurrentView('dashboard')} />
            )}
            {currentView === 'dashboard' && <Dashboard />}
            {currentView === 'students' && <StudentsView />}
            {currentView === 'classes' && <ClassesView />}
            {currentView === 'payments' && <PaymentsView />}
            {currentView === 'applications' && <ApplicationsView />}
            {currentView === 'grades' && (
              <AdminGradesManager onBack={() => setCurrentView('dashboard')} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
