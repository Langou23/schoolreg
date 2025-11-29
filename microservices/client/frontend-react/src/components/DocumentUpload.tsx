import { useState } from 'react';
import { Upload, X, FileText, CheckCircle } from 'lucide-react';
import { ApplicationsApi } from '../lib/api';

interface DocumentUploadProps {
  applicationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type DocumentType = 'birth_certificate' | 'photo' | 'previous_report' | 'medical_record' | 'other';

export default function DocumentUpload({ applicationId, onClose, onSuccess }: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<{ type: DocumentType; file: File }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const documentTypes: { value: DocumentType; label: string }[] = [
    { value: 'birth_certificate', label: 'Certificat de naissance' },
    { value: 'photo', label: 'Photo d\'identité' },
    { value: 'previous_report', label: 'Bulletin précédent' },
    { value: 'medical_record', label: 'Dossier médical' },
    { value: 'other', label: 'Autre document' },
  ];

  const handleFileSelect = (type: DocumentType, file: File) => {
    setSelectedFiles([...selectedFiles, { type, file }]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      // Simuler l'upload des documents
      for (const { type, file } of selectedFiles) {
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            // En production, envoyer au serveur
            console.log('📎 Document uploadé:', file.name, type);
            resolve(true);
          };
          reader.readAsDataURL(file);
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Erreur upload:', error);
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Documents envoyés !</h3>
          <p className="text-gray-600">Vos documents ont été ajoutés avec succès.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Ajouter des documents
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Ajoutez les documents nécessaires pour compléter votre dossier d'inscription.
          </p>

          {/* File selection */}
          <div className="space-y-4 mb-6">
            {documentTypes.map((docType) => (
              <div key={docType.value} className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors">
                <label className="cursor-pointer block">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{docType.label}</p>
                      <p className="text-sm text-gray-500">Cliquez pour sélectionner un fichier</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(docType.value, file);
                    }}
                  />
                </label>
              </div>
            ))}
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Documents sélectionnés ({selectedFiles.length})</h3>
              <div className="space-y-2">
                {selectedFiles.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{item.file.name}</p>
                        <p className="text-sm text-gray-600">
                          {documentTypes.find(t => t.value === item.type)?.label}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <X className="w-5 h-5 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || uploading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Envoyer {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
