import { LogOut, User, GraduationCap } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
  onLogout: () => void;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function Header({ user, onLogout, title, showBackButton, onBack }: HeaderProps) {
  const handleLogout = () => {
    // Déconnexion DIRECTE sans confirmation
    onLogout();
  };

  const getRoleBadge = () => {
    const roles = {
      admin: { label: 'Administrateur', color: 'bg-red-100 text-red-800 border-red-200' },
      direction: { label: 'Direction', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      parent: { label: 'Parent', color: 'bg-blue-100 text-blue-800 border-blue-200' },
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
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section */}
          <div className="flex items-center gap-4">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Retour"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              {title && (
                <h1 className="text-lg font-bold text-gray-900 hidden sm:block">
                  {title}
                </h1>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  {user.full_name}
                </span>
              </div>
              {getRoleBadge()}
            </div>

            {/* Mobile User Info */}
            <div className="md:hidden flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              {getRoleBadge()}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-95"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
