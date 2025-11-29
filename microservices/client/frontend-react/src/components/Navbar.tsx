import { LogOut, User, GraduationCap, LogIn } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  user?: UserProfile | null;
  onLogout?: () => void;
  onLogin?: () => void;
}

export default function Navbar({ user, onLogout, onLogin }: NavbarProps) {
  const handleLogoClick = () => {
    const isAdmin = user && (user.role === 'admin' || user.role === 'direction');
    const onAdminPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
    if (isAdmin || onAdminPath) {
      window.location.href = '/admin';
    } else {
      window.location.href = '/';
    }
  };

  const handleLoginClick = () => {
    if (onLogin) {
      onLogin();
    } else {
      window.location.href = '/login';
    }
  };

  const getRoleBadge = () => {
    if (!user) return null;

    const roles = {
      admin: { label: 'Administrateur', color: 'bg-red-100 text-red-800 border-red-200' },
      direction: { label: 'Direction', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      parent: { label: 'Parent/Tuteur', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      student: { label: 'Étudiant', color: 'bg-green-100 text-green-800 border-green-200' },
    };
    
    const role = roles[user.role as keyof typeof roles] || roles.student;
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${role.color}`}>
        {role.label}
      </span>
    );
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo et nom de l'école */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SchoolReg
              </h1>
              <p className="text-xs text-gray-600">Gestion Scolaire</p>
            </div>
          </button>

          {/* Section droite - Utilisateur et boutons */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Informations utilisateur connecté */}
                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        {user.fullName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  {getRoleBadge()}
                </div>

                {/* Version mobile - Utilisateur connecté */}
                <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {user.fullName.split(' ')[0]}
                  </span>
                </div>

                {/* Bouton déconnexion */}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </>
            ) : (
              <>
                {/* Bouton connexion - Utilisateur non connecté */}
                <button
                  onClick={handleLoginClick}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Connexion</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
