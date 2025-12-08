import { useState } from 'react';
import { UserProfile } from '../types';
import { FileText, User, GraduationCap, Sparkles, ArrowRight } from 'lucide-react';
import PublicApplicationForm from './PublicApplicationForm';
import UserDashboard from './UserDashboard';
import StudentOwnDashboard from './StudentOwnDashboard';
import Navbar from './Navbar';

interface UserHomeProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function UserHome({ user, onLogout }: UserHomeProps) {
  const [currentView, setCurrentView] = useState<'home' | 'application' | 'profile'>('home');
  const [dashboardKey, setDashboardKey] = useState(Date.now());

  const handleApplicationSuccess = () => {
    // Forcer le rechargement du dashboard
    setDashboardKey(Date.now());
    setCurrentView('profile');
  };

  if (currentView === 'application') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar user={user} onLogout={onLogout} />
        <PublicApplicationForm user={user} onSuccess={handleApplicationSuccess} />
      </div>
    );
  }

  if (currentView === 'profile') {
    // Les élèves voient leur propre dashboard, les parents voient le dashboard général
    if (user.role === 'student') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Navbar user={user} onLogout={onLogout} />
          <StudentOwnDashboard key={dashboardKey} user={user} onBack={() => setCurrentView('home')} />
        </div>
      );
    } else {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Navbar user={user} onLogout={onLogout} />
          <UserDashboard key={dashboardKey} user={user} onBack={() => setCurrentView('home')} />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Header avec animation */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Bienvenue, {user.fullName} !
                </h1>
                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
              </div>
              <p className="text-gray-600 flex items-center gap-2">
                {user.role === 'parent' 
                  ? '👨‍👩‍👧 Vous êtes connecté en tant que parent/tuteur'
                  : '🎓 Vous êtes connecté en tant qu\'étudiant'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Options avec animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Inscription en ligne */}
          <button
            onClick={() => setCurrentView('application')}
            className="relative bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left group overflow-hidden border border-gray-100"
          >
            {/* Gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                📝 Inscription en ligne
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {user.role === 'parent' 
                  ? 'Inscrire un enfant à l\'école en quelques clics'
                  : 'Soumettre votre demande d\'inscription facilement'
                }
              </p>
              <div className="flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-4 transition-all">
                Commencer l'inscription
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          {/* Mon profil / Profil de mon enfant */}
          <button
            onClick={() => setCurrentView('profile')}
            className="relative bg-white rounded-2xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 text-left group overflow-hidden border border-gray-100"
          >
            {/* Gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="relative z-10">
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <User className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                {user.role === 'parent' ? '👨‍👩‍👧 Profils de mes enfants' : '🎓 Mon profil'}
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                {user.role === 'parent' 
                  ? 'Consulter les informations et dossiers scolaires de vos enfants'
                  : 'Consulter vos informations et votre dossier scolaire'
                }
              </p>
              <div className="flex items-center gap-2 text-green-600 font-semibold group-hover:gap-4 transition-all">
                Voir le profil
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>

        {/* Info box améliorée */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 rounded-full p-2 mt-0.5">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-blue-900 font-medium mb-1">💡 Astuce</p>
              <p className="text-blue-800 text-sm leading-relaxed">
                {user.role === 'parent' 
                  ? 'Après avoir inscrit un enfant, vous pourrez suivre son dossier complet, ses classes et ses paiements dans son profil. Les informations se mettent à jour automatiquement toutes les 30 secondes.'
                  : 'Après avoir soumis votre inscription, vous pourrez suivre l\'état de votre demande et accéder à votre dossier complet dans votre profil. Les informations se mettent à jour automatiquement toutes les 30 secondes.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
