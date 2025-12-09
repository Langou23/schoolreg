import { useState } from 'react';
import { AuthAPI } from '../lib/api';
import PasswordInput from './PasswordInput';

interface LoginProps {
  onRegisterClick?: () => void;
}

export default function Login({ onRegisterClick }: LoginProps = {}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'direction'>('admin');
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
        
        // Rediriger les parents/étudiants vers /
        if (result.user.role === 'parent' || result.user.role === 'student') {
          window.location.href = '/';
          return;
        }
        
        // Rediriger Admin/Direction vers /admin
        if (result.user.role === 'admin' || result.user.role === 'direction') {
          window.location.href = '/admin';
          return;
        }
        
        // Par défaut : recharger la page
        window.location.reload();
      } else {
        await AuthAPI.signUp({
          email,
          password,
          fullName,
          role,
        });
        
        // Rediriger selon le rôle après inscription
        if (role === 'admin' || role === 'direction') {
          window.location.href = '/admin';
          return;
        }
        
        // Autres rôles : recharger la page
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erreur');
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
            <p className="text-xs text-gray-500">Espace école (administration / enseignants)</p>
          </div>
        </div>
        <p className="text-gray-600 mb-6">{mode === 'login' ? 'Connexion' : "Créer un compte"}</p>

        <div className="mb-6 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="font-medium text-gray-700 mb-1">Accès réservé au personnel de l'école</p>
          <p>
            Cet écran est destiné aux <span className="font-medium">administrateurs</span> et aux <span className="font-medium">enseignants</span> pour gérer l'établissement.
            Les <span className="font-medium">parents</span> et <span className="font-medium">élèves</span> utilisent le formulaire d'inscription en ligne public pour soumettre une demande.
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'direction')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="admin">Administrateur</option>
                  <option value="direction">Direction</option>
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
              placeholder="exemple@ecole.com"
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
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'En cours...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <div className="text-sm text-gray-600 mt-4 text-center space-y-2">
          {mode === 'login' ? (
            <>
              <button onClick={() => setMode('register')} className="text-blue-600 hover:underline block w-full">Créer un compte personnel</button>
              {onRegisterClick && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Vous êtes parent ou élève ?</p>
                  <button
                    onClick={onRegisterClick}
                    className="text-green-600 hover:underline font-medium"
                  >
                    👨‍👩‍👧 Créer un compte Parent/Élève
                  </button>
                </div>
              )}
            </>
          ) : (
            <button onClick={() => setMode('login')} className="text-blue-600 hover:underline">Déjà un compte ? Se connecter</button>
          )}
        </div>
      </div>
    </div>
  );
}
