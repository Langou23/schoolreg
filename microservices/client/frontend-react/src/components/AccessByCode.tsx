import { useState } from 'react';
import { ApplicationsApi } from '../lib/apiClient';
import { LogIn, ArrowLeft, Key, Loader2 } from 'lucide-react';

interface AccessByCodeProps {
  onBack: () => void;
  onSuccess: (token: string, user: any) => void;
}

export default function AccessByCode({ onBack, onSuccess }: AccessByCodeProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Valider le format du code
    if (code.length !== 8) {
      setError('Le code doit contenir exactement 8 caractères');
      return;
    }

    setLoading(true);

    try {
      const response = await ApplicationsApi.accessByCode(code.toLowerCase());

      if (response.success && response.token) {
        // Sauvegarder le token et les infos utilisateur
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));

        // Notification de succès
        console.log(' Accès autorisé:', response);

        // Rediriger vers le dashboard
        onSuccess(response.token, response.user);
      } else {
        setError('Réponse invalide du serveur');
      }
    } catch (err: any) {
      console.error(' Erreur lors de l\'accès par code:', err);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 404) {
        setError('Aucune demande trouvée avec ce code');
      } else if (err.response?.status === 403) {
        setError('Cette demande n\'a pas encore été approuvée');
      } else {
        setError('Erreur de connexion. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().slice(0, 8);
    setCode(value);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Accès par Code
          </h1>
          <p className="text-gray-600">
            Entrez votre code d'inscription à 8 caractères
          </p>
        </div>

        {/* Code Example */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900 text-sm mb-1">
                Où trouver votre code ?
              </p>
              <p className="text-blue-700 text-xs">
                Votre code d'inscription (ex: #6485edfd) vous a été fourni lors de votre inscription. 
                Il se trouve dans l'email de confirmation ou sur votre reçu d'inscription.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Code d'inscription
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400 font-mono text-lg">#</span>
              </div>
              <input
                id="code"
                type="text"
                value={code}
                onChange={handleCodeChange}
                placeholder="ex: 6485edfd"
                maxLength={8}
                className="block w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg tracking-wider uppercase"
                required
                disabled={loading}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {code.length}/8 caractères
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || code.length !== 8}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Accéder au profil
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour à la connexion
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            Vous n'avez pas de code ?{' '}
            <button 
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Créer un compte
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
