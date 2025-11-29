import { useState } from 'react';
import { AuthAPI } from '../lib/api';
import PasswordInput from './PasswordInput';
import { GraduationCap } from 'lucide-react';

interface UserLoginProps {
  onLoginSuccess: (user: any) => void;
}

export default function UserLogin({ onLoginSuccess }: UserLoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'parent' | 'student'>('parent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Validation email
    if (!email) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Format d\'email invalide';
    }
    
    // Validation mot de passe
    if (!password) {
      errors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    // Validation pour l'inscription
    if (mode === 'register') {
      if (!fullName || fullName.trim().length < 3) {
        errors.fullName = 'Le nom complet doit contenir au moins 3 caractères';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    
    // Valider le formulaire
    if (!validateForm()) {
      setLoading(false);
      return;
    }
    
    try {
      if (mode === 'login') {
        const result = await AuthAPI.signIn(email, password);
        
        // Rediriger les admins/direction vers /admin
        if (result.user && (result.user.role === 'admin' || result.user.role === 'direction')) {
          window.location.href = '/admin';
          return;
        }
        
        onLoginSuccess(result.user);
      } else {
        const result = await AuthAPI.signUp({
          email,
          password,
          fullName,
          role: userType,
        });
        onLoginSuccess(result.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="bg-blue-600 p-3 rounded-lg">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">SchoolReg</h1>
        <p className="text-gray-600 text-center mb-6">
          {mode === 'login' ? 'Connectez-vous pour continuer' : 'Créez votre compte'}
        </p>

        <div className="mb-6 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="font-medium text-blue-700 mb-1">
            {mode === 'login' ? '👋 Bienvenue !' : '📝 Nouveau compte'}
          </p>
          <p>
            {mode === 'login' 
              ? 'Connectez-vous pour inscrire un élève ou consulter votre profil.'
              : 'Créez un compte parent pour inscrire votre enfant ou un compte étudiant pour vous inscrire vous-même.'
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Votre nom complet"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) {
                      setFieldErrors(prev => ({ ...prev, fullName: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de compte
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as 'parent' | 'student')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="parent">Parent (pour inscrire mon enfant)</option>
                  <option value="student">Étudiant (pour m'inscrire moi-même)</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
              <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors(prev => ({ ...prev, email: '' }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                fieldErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>
          <PasswordInput
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (fieldErrors.password) {
                setFieldErrors(prev => ({ ...prev, password: '' }));
              }
            }}
            required
            error={fieldErrors.password}
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? 'En cours...' : mode === 'login' ? 'Se connecter' : "Créer mon compte"}
          </button>
        </form>

        <div className="text-sm text-gray-600 mt-4 text-center">
          {mode === 'login' ? (
            <button onClick={() => setMode('register')} className="text-blue-600 hover:underline font-medium">
              Pas encore de compte ? Créer un compte
            </button>
          ) : (
            <button onClick={() => setMode('login')} className="text-blue-600 hover:underline font-medium">
              Déjà un compte ? Se connecter
            </button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              <strong>👨‍🏫 Personnel de l'école ?</strong>
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Les administrateurs et enseignants doivent utiliser l'espace dédié
            </p>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Accéder à l'espace admin
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
