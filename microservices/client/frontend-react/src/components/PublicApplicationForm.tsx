import { useState, useEffect } from 'react';
import { DocumentsApi, ApplicationsApi } from '../lib/api';
import { FileUp, Send } from 'lucide-react';
import FormField from './FormField';
import { UserProfile } from '../types';

interface PublicApplicationFormProps {
  onSuccess?: () => void;
  user?: UserProfile;
}

export default function PublicApplicationForm({ onSuccess, user }: PublicApplicationFormProps = {}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    desiredClass: '',
    program: '',
    session: '',
    secondaryLevel: '',
  });
  const [documents, setDocuments] = useState<{ type: string; file: File }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<any>(null);

  // Pré-remplir les Informations du parent/tuteur si l'utilisateur est connecté
  useEffect(() => {
    if (user && user.role === 'parent') {
      setFormData(prev => ({
        ...prev,
        parentName: user.fullName || '',
        parentEmail: user.email || '',
      }));
    }
  }, [user]);

  const documentTypes = [
    { value: 'birth_certificate', label: 'Acte de naissance' },
    { value: 'photo', label: 'Photo d\'identité' },
    { value: 'previous_report', label: 'Bulletin précédent' },
    { value: 'medical_record', label: 'Dossier médical' },
    { value: 'other', label: 'Autre document' },
  ];

  const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (type: string, file: File | null) => {
    if (!file) return;
    // Client-side validations
    if (!ALLOWED_MIME.has(file.type)) {
      setError('Type de fichier invalide. Formats acceptés: PDF, JPG, PNG');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Fichier trop volumineux (max 5MB)');
      return;
    }
    setDocuments(prev => {
      const filtered = prev.filter(d => d.type !== type);
      return [...filtered, { type, file }];
    });
  };

  const uploadDocument = async (applicationId: string, type: string, file: File) => {
    const uploaded = await DocumentsApi.uploadFile(file);
    const fileUrl = uploaded?.url || uploaded?.relativePath || `/uploads/${uploaded?.fileId}`;
    // Create document record in DB
    await DocumentsApi.create({
      applicationId,
      type,
      fileName: file.name,
      fileUrl,
      mimeType: uploaded?.mimeType || file.type,
      fileSize: uploaded?.size || file.size,
    });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Validation des champs de l'élève
    if (!formData.firstName || formData.firstName.trim().length < 2) {
      errors.firstName = 'Le prénom doit contenir au moins 2 caractères';
    }
    if (!formData.lastName || formData.lastName.trim().length < 2) {
      errors.lastName = 'Le nom doit contenir au moins 2 caractères';
    }
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'La date de naissance est requise';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear() - ((today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) ? 1 : 0);
      if (age < 3 || age > 25) {
        errors.dateOfBirth = 'L\'âge doit être entre 3 et 25 ans';
      }
    }
    if (!formData.gender) {
      errors.gender = 'Le genre est requis';
    }
    if (!formData.address || formData.address.trim().length < 10) {
      errors.address = 'L\'adresse doit contenir au moins 10 caractères';
    }
    // Règle secondaire (Québec): 12-17 ans à la date de début de la session
    const parseSessionStart = (session: string) => {
      const s = (session || '').toLowerCase();
      const m = session?.match(/(20\d{2})/);
      const year = m ? parseInt(m[1], 10) : new Date().getFullYear();
      if (s.includes('automne')) return new Date(year, 8, 1);
      if (s.includes('hiver')) return new Date(year, 0, 15);
      if (s.includes('été') || s.includes('ete')) return new Date(year, 5, 15);
      return new Date();
    };
    if (formData.secondaryLevel) {
      const sessionStart = parseSessionStart(formData.session);
      const dob = new Date(formData.dateOfBirth);
      let age = sessionStart.getFullYear() - dob.getFullYear();
      const m = sessionStart.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && sessionStart.getDate() < dob.getDate())) age--;
      if (!Number.isFinite(age) || age < 12 || age > 17) {
        errors.dateOfBirth = 'Pour le secondaire, l\'âge doit être entre 12 et 17 ans à la date de début de la session';
      }
    }

    // Validation des champs du parent
    if (!formData.parentName || formData.parentName.trim().length < 3) {
      errors.parentName = 'Le Nom du parent/tuteur doit contenir au moins 3 caractères';
    }
    if (!formData.parentPhone) {
      errors.parentPhone = 'Le Téléphone du parent/tuteur est requis';
    } else if (!/^(\+1\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(formData.parentPhone.replace(/\s+/g, ' ').trim())) {
      errors.parentPhone = 'Format invalide. Ex: +1 (418) 555-1234 ou 418-555-1234';
    }
    if (!formData.parentEmail) {
      errors.parentEmail = 'L\'Email du parent/tuteur est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      errors.parentEmail = 'Format d\'email invalide';
    }
    
    // Validation des champs québécois
    if (!formData.secondaryLevel) {
      errors.secondaryLevel = 'Le niveau secondaire est requis';
    }
    if (!formData.program) {
      errors.program = 'Le programme est requis';
    }
    if (!formData.session) {
      errors.session = 'La session est requise';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    
    // Valider le formulaire
    if (!validateForm()) {
      setLoading(false);
      setError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    try {
      // Si l'utilisateur est connecté, utiliser son email au lieu de celui du formulaire
      const applicationData = {
        ...formData,
        status: 'pending',
        notes: '',
      };
      
      // IMPORTANT: Forcer l'Email du parent/tuteur à être celui de l'utilisateur connecté
      if (user && user.role === 'parent') {
        applicationData.parentEmail = user.email;
        applicationData.parentName = user.fullName || formData.parentName;
      }
      
      // Create application
      const application = await ApplicationsApi.create(applicationData);

      console.log('✅ Inscription créée:', application.id, '- Email parent:', application.parentEmail);
      console.log('📧 Email utilisateur connecté:', user?.email);

      // Upload documents
      for (const doc of documents) {
        try {
          await uploadDocument(application.id, doc.type, doc.file);
        } catch (e) {
          console.warn('Upload document failed', e);
        }
      }

      // Afficher le message de succès
      setSubmittedApplication(application);
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      console.error(' Erreur inscription:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
    }
  };

  const handleViewProfile = () => {
    if (onSuccess) {
      onSuccess();
    }
  };

  // Afficher l'écran de succès
  if (success && submittedApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            {/* Icône de succès */}
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 rounded-full p-6">
                <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Message de succès */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                ✅ Inscription soumise avec succès !
              </h2>
              <p className="text-lg text-gray-600 mb-2">
                Votre demande d'inscription a été enregistrée.
              </p>
              <p className="text-gray-500">
                Numéro de demande : <span className="font-mono font-semibold text-blue-600">#{submittedApplication.id.slice(0, 8)}</span>
              </p>
            </div>

            {/* Informations */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-blue-900 mb-2">En attente de validation</p>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    L'école examinera votre dossier. Vous recevrez des notifications dans l'application concernant le statut de votre inscription.
                    {submittedApplication.parentEmail && (
                      <span> Un email de confirmation a également été envoyé à <strong>{submittedApplication.parentEmail}</strong>.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Message pour utilisateurs non connectés */}
            {!user && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-yellow-900 mb-2">⚠️ Créez un compte pour suivre votre inscription</p>
                    <p className="text-sm text-yellow-800 leading-relaxed mb-3">
                      Pour consulter le profil de l'élève, voir le statut de l'inscription et recevoir des notifications, vous devez créer un compte parent.
                    </p>
                    <button
                      onClick={() => window.location.href = '/'}
                      className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Créer un compte maintenant
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Prochaines étapes */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Prochaines étapes
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                {user ? (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">1.</span>
                      <span>Consultez votre profil pour voir le statut de votre inscription</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">2.</span>
                      <span>Vous pouvez compléter votre dossier en ajoutant des documents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">3.</span>
                      <span>Surveillez vos notifications pour les messages de l'école</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">4.</span>
                      <span>Une fois approuvé, vous pourrez effectuer le paiement</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">1.</span>
                      <span>Créez un compte parent pour suivre l'inscription</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">2.</span>
                      <span>Connectez-vous pour voir le profil de l'élève</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">3.</span>
                      <span>Recevez des notifications sur le statut de l'inscription</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold mt-0.5">4.</span>
                      <span>Effectuez le paiement une fois l'inscription approuvée</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Bouton d'action */}
            <button
              onClick={handleViewProfile}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Accéder à mon profil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inscription en ligne</h1>
            <p className="text-gray-600">Remplissez le formulaire ci-dessous pour soumettre votre demande d'inscription</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <p className="font-semibold mb-1"> Erreur</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de l'élève</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Prénom"
                  required
                  value={formData.firstName}
                  onChange={(value) => {
                    setFormData({ ...formData, firstName: value });
                    if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                  error={fieldErrors.firstName}
                />
                <FormField
                  label="Nom"
                  required
                  value={formData.lastName}
                  onChange={(value) => {
                    setFormData({ ...formData, lastName: value });
                    if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                  error={fieldErrors.lastName}
                />
                <FormField
                  label="Date de naissance"
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(value) => {
                    setFormData({ ...formData, dateOfBirth: value });
                    if (fieldErrors.dateOfBirth) setFieldErrors(prev => ({ ...prev, dateOfBirth: '' }));
                  }}
                  error={fieldErrors.dateOfBirth}
                  max={new Date().toISOString().split('T')[0]}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Genre
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => {
                      setFormData({ ...formData, gender: e.target.value });
                      if (fieldErrors.gender) setFieldErrors(prev => ({ ...prev, gender: '' }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.gender ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner</option>
                    <option value="Masculin">Masculin</option>
                    <option value="Feminin">Féminin</option>
                  </select>
                  {fieldErrors.gender && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.gender}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      if (fieldErrors.address) setFieldErrors(prev => ({ ...prev, address: '' }));
                    }}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {fieldErrors.address && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.address}</p>
                  )}
                </div>
                
                {/* Niveau secondaire */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Niveau secondaire
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.secondaryLevel}
                    onChange={(e) => {
                      setFormData({ ...formData, secondaryLevel: e.target.value });
                      if (fieldErrors.secondaryLevel) setFieldErrors(prev => ({ ...prev, secondaryLevel: '' }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.secondaryLevel ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner le niveau</option>
                    <option value="Secondaire 1">Secondaire 1</option>
                    <option value="Secondaire 2">Secondaire 2</option>
                    <option value="Secondaire 3">Secondaire 3</option>
                    <option value="Secondaire 4">Secondaire 4</option>
                    <option value="Secondaire 5">Secondaire 5</option>
                  </select>
                  {fieldErrors.secondaryLevel && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.secondaryLevel}</p>
                  )}
                </div>

                {/* Programme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Programme
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.program}
                    onChange={(e) => {
                      setFormData({ ...formData, program: e.target.value });
                      if (fieldErrors.program) setFieldErrors(prev => ({ ...prev, program: '' }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.program ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner le programme</option>
                    <option value="Programme régulier">Programme régulier</option>
                    <option value="Programme enrichi">Programme enrichi</option>
                    <option value="PEI (Programme d'éducation internationale)">PEI (Programme d'éducation internationale)</option>
                    <option value="Sport-études">Sport-études</option>
                    <option value="Arts-études">Arts-études</option>
                    <option value="Concentration sciences">Concentration sciences</option>
                    <option value="Concentration langues">Concentration langues</option>
                  </select>
                  {fieldErrors.program && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.program}</p>
                  )}
                </div>

                {/* Session */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.session}
                    onChange={(e) => {
                      setFormData({ ...formData, session: e.target.value });
                      if (fieldErrors.session) setFieldErrors(prev => ({ ...prev, session: '' }));
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.session ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionner la session</option>
                    <option value="Hiver 2026">Hiver 2026 (Janvier - Juin)</option>
                    <option value="Automne 2026">Automne 2026 (Septembre - Décembre)</option>
                    <option value="Hiver 2027">Hiver 2027 (Janvier - Juin )</option>

                  </select>
                  {fieldErrors.session && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.session}</p>
                  )}
                </div>

                <FormField
                  label="Classe souhaitée (optionnel)"
                  value={formData.desiredClass}
                  onChange={(value) => {
                    setFormData({ ...formData, desiredClass: value });
                  }}
                  placeholder="Ex: Groupe A, Groupe B"
                  className="md:col-span-2"
                />
              </div>
            </div>

            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du parent/tuteur/tuteur</h3>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800">
                  🔔 <strong>Communication par notifications</strong> - Toutes les communications se feront via les notifications dans l'application.
                </p>
              </div>
              
              {user && user.role === 'parent' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    ℹ️ <strong>Compte parent détecté</strong> - Vos informations sont automatiquement utilisées pour cette inscription.
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Nom du parent/tuteur"
                  required
                  value={formData.parentName}
                  onChange={(value) => {
                    setFormData({ ...formData, parentName: value });
                    if (fieldErrors.parentName) setFieldErrors(prev => ({ ...prev, parentName: '' }));
                  }}
                  error={fieldErrors.parentName}
                  disabled={!!(user && user.role === 'parent')}
                />
                <FormField
                  label="Téléphone"
                  type="tel"
                  required
                  value={formData.parentPhone}
                  onChange={(value) => {
                    setFormData({ ...formData, parentPhone: value });
                    if (fieldErrors.parentPhone) setFieldErrors(prev => ({ ...prev, parentPhone: '' }));
                  }}
                  error={fieldErrors.parentPhone}
                  placeholder="+1 (418) 555-1234"
                />
                <FormField
                  label="Email"
                  type="email"
                  value={formData.parentEmail}
                  onChange={(value) => {
                    setFormData({ ...formData, parentEmail: value });
                    if (fieldErrors.parentEmail) setFieldErrors(prev => ({ ...prev, parentEmail: '' }));
                  }}
                  error={fieldErrors.parentEmail}
                  disabled={!!(user && user.role === 'parent')}
                  placeholder="exemple@email.com"
                  className="md:col-span-2"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileUp className="w-5 h-5" />
                Documents à téléverser
              </h3>
              <div className="space-y-3">
                {documentTypes.map((docType) => (
                  <div key={docType.value} className="flex items-center gap-3">
                    <label className="flex-1 text-sm text-gray-700">{docType.label}</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(docType.value, e.target.files?.[0] || null)}
                      className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Formats acceptés: PDF, JPG, PNG (max 5MB par fichier)</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                {loading ? 'Envoi en cours...' : 'Soumettre l\'inscription'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
