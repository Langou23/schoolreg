import { useEffect, useState } from 'react';
import { AuthAPI } from './lib/api';
import { UserProfile } from './types';
import Login from './components/Login';
import AdminHome from './components/AdminHome';
import UserHome from './components/UserHome';
import PublicRegister from './components/PublicRegister';
import ChatBot from './components/ChatBot';

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    // Vérifier l'utilisateur connecté
    const currentUser = AuthAPI.getCurrentUserSync();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    AuthAPI.signOut();
    setUser(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    // Afficher le formulaire d'inscription
    if (showRegister) {
      return (
        <PublicRegister
          onBack={() => setShowRegister(false)}
          onSuccess={() => {
            setShowRegister(false);
            window.location.reload();
          }}
        />
      );
    }

    // Afficher la page de connexion
    return <Login onRegisterClick={() => setShowRegister(true)} />;
  }

  // Admin et Direction voient AdminHome
  if (user.role === 'admin' || user.role === 'direction') {
    return (
      <>
        <AdminHome user={user} onLogout={handleLogout} />
        <ChatBot />
      </>
    );
  }

  // Parent et Élève voient UserHome
  return (
    <>
      <UserHome user={user} onLogout={handleLogout} />
      <ChatBot />
    </>
  );
}

export default App;
