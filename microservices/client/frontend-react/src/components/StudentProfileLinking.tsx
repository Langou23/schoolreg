import { useState } from 'react';
import { Link as LinkIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface StudentProfileLinkingProps {
  user: UserProfile;
  onLinkSuccess?: () => void;
}

export default function StudentProfileLinking({ user, onLinkSuccess }: StudentProfileLinkingProps) {
  const [studentCode, setStudentCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleLinkByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studentCode.trim()) {
      setMessage({ type: 'error', text: 'Veuillez entrer votre code d\'inscription' });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:4003/students/link-by-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentCode: studentCode.trim() })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la liaison');
      }
      
      const data = await response.json();
      
      setMessage({ 
        type: 'success', 
        text: `✅ Profil lié avec succès ! Redirection en cours...` 
      });
      
      // Attendre un peu avant de déclencher le callback
      setTimeout(() => {
        if (onLinkSuccess) {
          onLinkSuccess();
        }
      }, 2000);
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur lors de la liaison du profil' 
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-lg">
          <LinkIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Connecter votre profil élève</h2>
          <p className="text-gray-600">Recherchez votre profil créé par l'administration pour y accéder</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' :
          message.type === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Formulaire avec code d'inscription */}
      <form onSubmit={handleLinkByCode} className="mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>🔑 Code d'inscription requis</strong><br />
            Vous avez reçu un code unique lors de votre inscription (ex: <code className="bg-white px-1 rounded">SR2024-ABC123</code>).<br />
            Ce code se trouve sur votre email de confirmation ou auprès de l'administration.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <LinkIcon className="w-4 h-4 inline mr-1" />
            Code d'inscription *
          </label>
          <input
            type="text"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
            placeholder="SR2024-ABC123"
            maxLength={15}
          />
          <p className="text-xs text-gray-500 mt-1">
            Format: SR + année + tiret + 6 caractères (ex: SR2024-ABC123)
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !studentCode.trim()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold"
        >
          {loading ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Connexion en cours...
            </>
          ) : (
            <>
              <LinkIcon className="w-5 h-5" />
              Connecter mon profil
            </>
          )}
        </button>
      </form>

      {/* Info supplémentaire */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-2">❓ Vous n'avez pas votre code ?</h3>
        <p className="text-sm text-gray-700">
          Contactez l'administration à l'adresse <a href="mailto:admin@schoolreg.com" className="text-blue-600 hover:underline">admin@schoolreg.com</a> avec vos informations (nom, prénom, date de naissance) pour récupérer votre code d'inscription.
        </p>
      </div>
    </div>
  );
}
