import { useState, useEffect } from 'react';
import { AuthAPI } from './lib/api';
import UserLogin from './components/UserLogin';
import UserHome from './components/UserHome';

export default function UserApp() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si un utilisateur parent/student est déjà connecté
    const currentUser = AuthAPI.getCurrentUserSync();
    if (currentUser && (currentUser.role === 'parent' || currentUser.role === 'student')) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    AuthAPI.signOut();
    setUser(null);
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <UserLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return <UserHome user={user} onLogout={handleLogout} />;
}
