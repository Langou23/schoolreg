import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, 'admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <span className="text-white font-bold text-lg leading-none">SR</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SchoolReg</h1>
            <p className="text-xs text-gray-500">Espace école</p>
          </div>
        </div>
        <p className="text-gray-600 mb-6">{mode === 'login' ? 'Connexion' : "Créer un compte"}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'En cours...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <div className="text-sm text-gray-600 mt-4 text-center">
          {mode === 'login' ? (
            <button onClick={() => setMode('register')} className="text-blue-600 hover:underline">Créer un compte</button>
          ) : (
            <button onClick={() => setMode('login')} className="text-blue-600 hover:underline">Déjà un compte ? Se connecter</button>
          )}
        </div>
      </div>
    </div>
  );
}
