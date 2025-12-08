import { useState, useEffect } from 'react';
import { Search, User, Calendar, Link, CheckCircle, AlertCircle } from 'lucide-react';
import { StudentLinkingApi } from '../services/studentLinking';
import { UserProfile } from '../types';

interface StudentProfileLinkingProps {
  user: UserProfile;
  onLinkSuccess?: () => void;
}

interface UnlinkedStudent {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  program: string;
  session: string;
}

export default function StudentProfileLinking({ user, onLinkSuccess }: StudentProfileLinkingProps) {
  const [searchData, setSearchData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: ''
  });
  
  const [searchResults, setSearchResults] = useState<UnlinkedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Auto-remplir avec le nom de l'utilisateur si disponible
  useEffect(() => {
    if (user.fullName) {
      const nameParts = user.fullName.split(' ');
      if (nameParts.length >= 2) {
        setSearchData(prev => ({
          ...prev,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ')
        }));
      }
    }
  }, [user.fullName]);

  const handleSearch = async () => {
    if (!searchData.firstName || !searchData.lastName) {
      setMessage({ type: 'error', text: 'Veuillez renseigner au moins votre prénom et nom' });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      const results = await StudentLinkingApi.searchStudentsForLink(
        searchData.firstName,
        searchData.lastName,
        searchData.dateOfBirth || undefined
      );
      
      setSearchResults(results);
      
      if (results.length === 0) {
        setMessage({ 
          type: 'info', 
          text: 'Aucun profil élève non lié trouvé avec ces informations. Contactez l\'administration si vous pensez qu\'il y a une erreur.' 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: `${results.length} profil(s) trouvé(s). Sélectionnez le vôtre pour vous y connecter.` 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur lors de la recherche' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkProfile = async (studentProfile: UnlinkedStudent) => {
    setLinking(true);
    setMessage(null);
    
    try {
      await StudentLinkingApi.linkByStudentInfo(
        studentProfile.firstName,
        studentProfile.lastName,
        studentProfile.dateOfBirth,
        user.id
      );
      
      setMessage({ 
        type: 'success', 
        text: `✅ Profil lié avec succès ! Votre compte est maintenant connecté à votre profil élève.` 
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
      setLinking(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-100 p-3 rounded-lg">
          <Link className="w-6 h-6 text-blue-600" />
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
          ) : message.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <Search className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Formulaire de recherche */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rechercher votre profil</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Prénom *
            </label>
            <input
              type="text"
              value={searchData.firstName}
              onChange={(e) => setSearchData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Votre prénom"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Nom *
            </label>
            <input
              type="text"
              value={searchData.lastName}
              onChange={(e) => setSearchData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Votre nom de famille"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Date de naissance (optionnel, pour préciser)
          </label>
          <input
            type="date"
            value={searchData.dateOfBirth}
            onChange={(e) => setSearchData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !searchData.firstName || !searchData.lastName}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          {loading ? 'Recherche...' : 'Rechercher mon profil'}
        </button>
      </div>

      {/* Résultats de recherche */}
      {searchResults.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profils trouvés</h3>
          <div className="space-y-3">
            {searchResults.map((student) => (
              <div
                key={student.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {student.firstName} {student.lastName}
                      </h4>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span>📅 {new Date(student.dateOfBirth).toLocaleDateString('fr-FR')}</span>
                        <span>🎓 {student.program}</span>
                        <span>📚 {student.session}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleLinkProfile(student)}
                    disabled={linking}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {linking ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Link className="w-4 h-4" />
                    )}
                    {linking ? 'Connexion...' : 'Connecter ce profil'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
