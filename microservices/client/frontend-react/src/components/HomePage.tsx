import { useState, useEffect } from 'react';
import { AuthAPI } from '../lib/api';
import { UserProfile } from '../types';
import Navbar from './Navbar';
import { GraduationCap, BookOpen, Users, Calendar } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const currentUser = AuthAPI.getCurrentUserSync();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    AuthAPI.signOut();
    setUser(null);
    window.location.reload();
  };

  const handleLogin = () => {
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navbar */}
      <Navbar user={user} onLogout={handleLogout} onLogin={handleLogin} />

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg mb-6">
            <GraduationCap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            Bienvenue à SchoolReg
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Système de gestion scolaire moderne et intuitif pour faciliter l'administration de votre établissement
          </p>
        </div>

        {/* Fonctionnalités */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <FeatureCard
            icon={Users}
            title="Gestion des Élèves"
            description="Gérez facilement les inscriptions, profils et dossiers des élèves"
            color="from-blue-600 to-blue-700"
          />
          <FeatureCard
            icon={BookOpen}
            title="Classes & Cours"
            description="Organisez les classes, emplois du temps et programmes scolaires"
            color="from-green-600 to-green-700"
          />
          <FeatureCard
            icon={Calendar}
            title="Inscriptions"
            description="Processus d'inscription en ligne simple et rapide"
            color="from-purple-600 to-purple-700"
          />
          <FeatureCard
            icon={GraduationCap}
            title="Suivi Académique"
            description="Suivez les performances et la progression des élèves"
            color="from-amber-600 to-amber-700"
          />
        </div>

        {/* Message selon l'état de connexion */}
        {user ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Bonjour, {user.fullName}! 👋
            </h2>
            <p className="text-gray-600 mb-6">
              Vous êtes connecté en tant que{' '}
              <span className="font-semibold text-blue-600">
                {user.role === 'admin' ? 'Administrateur' : 
                 user.role === 'direction' ? 'Direction' :
                 user.role === 'parent' ? 'Parent' : 'Étudiant'}
              </span>
            </p>
            <button
              onClick={() => window.location.href = '/admin'}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Accéder à l'espace {user.role === 'admin' || user.role === 'direction' ? 'administratif' : 'personnel'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Commencez dès maintenant
            </h2>
            <p className="text-gray-600 mb-6">
              Connectez-vous pour accéder à votre espace personnel ou inscrivez votre enfant
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleLogin}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Se connecter
              </button>
              <button
                onClick={() => window.location.href = '/inscription'}
                className="px-8 py-3 bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Inscription en ligne
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2025 SchoolReg. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: any;
  title: string;
  description: string;
  color: string;
}

function FeatureCard({ icon: Icon, title, description, color }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100">
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center mb-4 shadow-md`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
