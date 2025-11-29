import { useState } from 'react';
import { AuthAPI } from '../lib/api';
import { GraduationCap, User, Mail, UserPlus, ArrowLeft } from 'lucide-react';
import PasswordInput from './PasswordInput';

interface PublicRegisterProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function PublicRegister({ onBack, onSuccess }: PublicRegisterProps) {
  const [userType, setUserType] = useState<'parent' | 'student'>('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!fullName || fullName.trim().length < 3) {
      errors.fullName = 'Le nom complet doit contenir au moins 3 caractères';
    }
    
    if (!email) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Format d\'email invalide';
    }
    
    if (!password) {
      errors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    
    if (!validateForm()) {
      setLoading(false);
      return;
    }
    
    try {
      await AuthAPI.signUp({
        email,
        password,
        fullName,
        role: userType,
      });
      
      // Connexion automatique après inscription
      await AuthAPI.signIn(email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Créer un compte</h1>
            <p className="text-gray-600">Inscrivez-vous pour accéder à votre espace personnel</p>
          </div>

          {/* Type de compte */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de compte
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setUserType('parent')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  userType === 'parent'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <User className={`w-8 h-8 mx-auto mb-2 ${
                  userType === 'parent' ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <p className={`font-semibold ${
                  userType === 'parent' ? 'text-blue-900' : 'text-gray-700'
                }`}>
                  Parent/Tuteur
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Pour inscrire et suivre vos enfants
                </p>
              </button>

              <button
                type="button"
                onClick={() => setUserType('student')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  userType === 'student'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <GraduationCap className={`w-8 h-8 mx-auto mb-2 ${
                  userType === 'student' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <p className={`font-semibold ${
                  userType === 'student' ? 'text-green-900' : 'text-gray-700'
                }`}>
                  Étudiant
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Pour suivre votre dossier scolaire
                </p>
              </button>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom complet */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Nom complet *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Votre nom complet"
                />
              </div>
              {fieldErrors.fullName && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="votre.email@example.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe *
              </label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Minimum 6 caractères"
                error={fieldErrors.password}
              />
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe *
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Retapez votre mot de passe"
                error={fieldErrors.confirmPassword}
              />
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
            >
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> {userType === 'parent' 
                ? 'Après inscription, vous pourrez inscrire vos enfants et suivre leurs dossiers scolaires.'
                : 'Après inscription, vous pourrez soumettre votre demande d\'inscription et suivre votre dossier.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
