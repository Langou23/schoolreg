import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';

interface PhotoUploadProps {
  studentId: string;
  currentPhoto?: string;
  onSuccess: (photoUrl: string) => void;
  showUploadButton?: boolean;
}

export default function PhotoUpload({ studentId, currentPhoto, onSuccess, showUploadButton = true }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation côté client
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Type de fichier non supporté. Utilisez JPG, PNG ou WebP' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setMessage({ type: 'error', text: 'Fichier trop volumineux. Maximum 5MB' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Récupérer le token d'authentification
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(' Upload de photo pour l\'élève:', studentId);
      console.log('📁 Fichier:', file.name, file.type, file.size, 'bytes');

      const response = await fetch(`http://localhost:4003/students/${studentId}/photo`, {
        method: 'POST',
        headers,
        body: formData,
      });

      console.log(' Réponse:', response.status, response.statusText);

      const result = await response.json();
      console.log(' Résultat:', result);

      if (!response.ok) {
        throw new Error(result.detail || 'Erreur lors de l\'upload');
      }

      setMessage({ type: 'success', text: ' Photo mise à jour avec succès !' });
      onSuccess(result.student.profilePhoto);

      // Réinitialiser le champ fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Masquer le message après 5 secondes
      setTimeout(() => {
        setMessage(null);
      }, 5000);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur lors de l\'upload de la photo' 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className="flex flex-col items-center gap-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Photo de profil actuelle */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
          {currentPhoto ? (
            <img 
              src={currentPhoto} 
              alt="Photo de profil" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <Camera className="w-8 h-8 mb-1" />
              <span className="text-xs">Aucune photo</span>
            </div>
          )}
        </div>

        {/* Overlay pour l'upload */}
        {showUploadButton && (
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="absolute inset-0 w-32 h-32 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </button>
        )}
      </div>

      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Bouton d'upload */}
      {showUploadButton && (
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Upload en cours...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Changer la photo
            </>
          )}
        </button>
      )}

      {/* Messages */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Informations */}
      {showUploadButton && (
        <div className="text-xs text-gray-500 text-center max-w-xs">
          <p>Formats acceptés: JPG, PNG, WebP</p>
          <p>Taille maximum: 5MB</p>
        </div>
      )}
    </div>
  );
}
