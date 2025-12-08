import { useState, useRef } from 'react';
import { Student } from '../types';
import { StudentsApi } from '../lib/api';
import { UserPlus, X, Camera, Upload, Shield } from 'lucide-react';

interface StudentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  student?: Student;
}

export default function StudentForm({ onClose, onSuccess, student }: StudentFormProps) {
  // Format date from ISO to YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    firstName: (student as any)?.firstName || '',
    lastName: (student as any)?.lastName || '',
    dateOfBirth: formatDateForInput((student as any)?.dateOfBirth),
    gender: (student as any)?.gender || '',
    address: (student as any)?.address || '',
    parentName: (student as any)?.parentName || '',
    parentPhone: (student as any)?.parentPhone || '',
    parentEmail: (student as any)?.parentEmail || '',
    program: (student as any)?.program || '',
    session: (student as any)?.session || '',
    secondaryLevel: (student as any)?.secondaryLevel || '',
    tuitionAmount: (student as any)?.tuitionAmount || '',
    tuitionPaid: (student as any)?.tuitionPaid || '',
    status: (student as any)?.status || 'active',
    
    // NOUVEAUX CHAMPS - Contact d'urgence
    emergencyContactName: (student as any)?.emergencyContact?.name || '',
    emergencyContactPhone: (student as any)?.emergencyContact?.phone || '',
    
    // NOUVEAUX CHAMPS - Informations médicales
    medicalAllergies: (student as any)?.medicalInfo?.allergies?.[0] || '',
    medicalMedications: (student as any)?.medicalInfo?.medications?.[0] || '',
    medicalConditions: (student as any)?.medicalInfo?.medicalConditions?.[0] || '',
    medicalNotes: (student as any)?.medicalInfo?.emergencyMedicalNotes || '',
    
    // NOUVEAUX CHAMPS - Historique académique  
    academicPreviousSchool: (student as any)?.academicHistory?.previousSchool || '',
    academicLastGrade: (student as any)?.academicHistory?.lastGrade || '',
    academicTransferReason: (student as any)?.academicHistory?.transferReason || '',
    academicSpecialNeeds: (student as any)?.academicHistory?.specialNeeds?.[0] || '',
    academicLanguages: (student as any)?.academicHistory?.languages?.join(', ') || '',
    
    // NOUVEAUX CHAMPS - Préférences et objectifs
    preferencesGoals: (student as any)?.preferences?.goals?.join(', ') || '',
    preferencesInterests: (student as any)?.preferences?.interests?.join(', ') || '',
    preferencesExtracurriculars: (student as any)?.preferences?.extracurriculars?.join(', ') || '',
    preferencesLearningStyle: (student as any)?.preferences?.learningStyle || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPhoto, setCurrentPhoto] = useState((student as any)?.profilePhoto || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation des champs requis
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.gender || 
          !formData.address || !formData.parentName || !formData.parentPhone || !formData.program || 
          !formData.session || !formData.secondaryLevel || !formData.tuitionAmount) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }
      // Transformer les données pour inclure le contact d'urgence et infos médicales
      // Convertir la photo en base64 si un fichier a été sélectionné
      let photoBase64 = currentPhoto;
      if (photoFile) {
        photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
      }

      const transformedData = {
        ...formData,
        // Structurer le contact d'urgence
        emergencyContact: formData.emergencyContactName ? {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone
        } : null,
        
        // Structurer les informations médicales (format arrays selon interface)
        medicalInfo: (formData.medicalAllergies || formData.medicalMedications || formData.medicalConditions || formData.medicalNotes) ? {
          allergies: formData.medicalAllergies ? [formData.medicalAllergies] : [],
          medications: formData.medicalMedications ? [formData.medicalMedications] : [],
          medicalConditions: formData.medicalConditions ? [formData.medicalConditions] : [],
          emergencyMedicalNotes: formData.medicalNotes || ''
        } : null,
        
        // Structurer l'historique académique
        academicHistory: (formData.academicPreviousSchool || formData.academicLastGrade || formData.academicTransferReason || formData.academicSpecialNeeds || formData.academicLanguages) ? {
          previousSchool: formData.academicPreviousSchool || '',
          lastGrade: formData.academicLastGrade || '',
          transferReason: formData.academicTransferReason || '',
          specialNeeds: formData.academicSpecialNeeds ? [formData.academicSpecialNeeds] : [],
          languages: formData.academicLanguages ? formData.academicLanguages.split(',').map((lang: string) => lang.trim()).filter((lang: string) => lang) : []
        } : null,
        
        // Structurer les préférences et objectifs
        preferences: (formData.preferencesGoals || formData.preferencesInterests || formData.preferencesExtracurriculars || formData.preferencesLearningStyle) ? {
          goals: formData.preferencesGoals ? formData.preferencesGoals.split(',').map((goal: string) => goal.trim()).filter((goal: string) => goal) : [],
          interests: formData.preferencesInterests ? formData.preferencesInterests.split(',').map((interest: string) => interest.trim()).filter((interest: string) => interest) : [],
          extracurriculars: formData.preferencesExtracurriculars ? formData.preferencesExtracurriculars.split(',').map((activity: string) => activity.trim()).filter((activity: string) => activity) : [],
          learningStyle: formData.preferencesLearningStyle as 'visuel' | 'auditif' | 'kinesthésique' | 'mixte' || ''
        } : null,
        
        // Calculer completion du profil (contact urgence + au moins 2 autres sections)
        profileCompleted: !!(formData.emergencyContactName && (
          [
            !!(formData.medicalAllergies || formData.medicalMedications || formData.medicalConditions),
            !!(formData.academicPreviousSchool || formData.academicLastGrade),
            !!(formData.preferencesGoals || formData.preferencesInterests || formData.preferencesLearningStyle)
          ].filter(Boolean).length >= 1
        )),
        profileCompletionDate: (formData.emergencyContactName && (
          [
            !!(formData.medicalAllergies || formData.medicalMedications || formData.medicalConditions),
            !!(formData.academicPreviousSchool || formData.academicLastGrade),
            !!(formData.preferencesGoals || formData.preferencesInterests || formData.preferencesLearningStyle)
          ].filter(Boolean).length >= 1
        )) ? new Date().toISOString() : null
      };
      
      // Retirer les champs temporaires
      const { 
        emergencyContactName, 
        emergencyContactPhone, 
        medicalAllergies, 
        medicalMedications, 
        medicalConditions, 
        medicalNotes,
        academicPreviousSchool,
        academicLastGrade,
        academicTransferReason,
        academicSpecialNeeds,
        academicLanguages,
        preferencesGoals,
        preferencesInterests,
        preferencesExtracurriculars,
        preferencesLearningStyle,
        ...finalData 
      } = transformedData;
      
      // Ajouter la photo au payload final
      const dataWithPhoto = {
        ...finalData,
        profilePhoto: photoBase64 || null
      };
      
      if (student) {
        await StudentsApi.update(String(student.id), dataWithPhoto);
      } else {
        await StudentsApi.create(dataWithPhoto);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        // Fermer seulement si on clique sur l'overlay (pas sur le contenu)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {student ? 'Modifier l\'élève' : 'Enregistrer un nouvel élève'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Photo de profil */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Photo de profil {!student && <span className="text-sm font-normal text-gray-500">(optionnel)</span>}
            </h3>
            <div className="flex flex-col items-center gap-4">
              {/* Aperçu de la photo */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                  {currentPhoto || (photoFile && URL.createObjectURL(photoFile)) ? (
                    <img 
                      src={photoFile ? URL.createObjectURL(photoFile) : currentPhoto} 
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
              </div>

              {/* Input fichier caché */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Validation
                    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                    if (!allowedTypes.includes(file.type)) {
                      setError('Type de fichier non supporté. Utilisez JPG, PNG ou WebP');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Fichier trop volumineux. Maximum 5MB');
                      return;
                    }
                    setPhotoFile(file);
                    setError('');
                  }
                }}
                className="hidden"
              />

              {/* Boutons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {currentPhoto || photoFile ? 'Changer la photo' : 'Ajouter une photo'}
                </button>
                {(currentPhoto || photoFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setCurrentPhoto('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Supprimer
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center">
                Formats acceptés: JPG, PNG, WebP • Taille max: 5MB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de naissance *
              </label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genre *
              </label>
              <select
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner</option>
                <option value="Masculin">Masculin</option>
                <option value="Féminin">Féminin</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Informations scolaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Programme *
                </label>
                <select
                  required
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  <option value="prescolaire">Préscolaire</option>
                  <option value="primaire">Primaire</option>
                  <option value="secondaire">Secondaire</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session *
                </label>
                <select
                  required
                  value={formData.session}
                  onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner</option>
                  <option value="automne">Automne</option>
                  <option value="hiver">Hiver</option>
                  <option value="ete">Été</option>
                </select>
              </div>

              {formData.program === 'secondaire' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Niveau secondaire
                  </label>
                  <select
                    value={formData.secondaryLevel}
                    onChange={(e) => setFormData({ ...formData, secondaryLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Secondaire 1">Secondaire 1</option>
                    <option value="Secondaire 2">Secondaire 2</option>
                    <option value="Secondaire 3">Secondaire 3</option>
                    <option value="Secondaire 4">Secondaire 4</option>
                    <option value="Secondaire 5">Secondaire 5</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frais de scolarité (CAD)
                </label>
                <select
                  value={formData.tuitionAmount}
                  onChange={(e) => setFormData({ ...formData, tuitionAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner le montant</option>
                  {[500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000].map(amount => (
                    <option key={amount} value={amount}>{amount.toLocaleString('fr-CA')} $ CAD</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant payé (CAD) - Lecture seule
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 font-semibold">
                  {formData.tuitionPaid ? `${Number(formData.tuitionPaid).toLocaleString('fr-CA')} $ CAD` : '0 $ CAD (Non payé)'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Ce montant est calculé automatiquement à partir des paiements. Utilisez l'onglet "Paiements" pour enregistrer un paiement.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Informations du parent/tuteur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du parent *
                </label>
                <input
                  type="text"
                  required
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email du parent *
                </label>
                <input
                  type="email"
                  required
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="parent@example.com"
                />
                <p className="mt-1 text-xs text-blue-600">
                  ⚠️ Important: Cet email doit correspondre au compte parent pour que l'élève apparaisse dans son profil
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut *
                </label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="graduated">Diplômé</option>
                </select>
              </div>
            </div>
          </div>

          {/* NOUVELLE SECTION - Contact d'urgence */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-600" />
              Contact d'urgence
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Personne à contacter en cas d'urgence (autre que le parent principal)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Grand-parent, oncle, tante..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone *
                </label>
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(xxx) xxx-xxxx"
                />
              </div>
            </div>
          </div>

          {/* NOUVELLE SECTION - Informations médicales */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-red-600">🏥</span>
              Informations médicales (optionnel)
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Informations importantes pour la sécurité et le bien-être de l'élève
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergies connues
                </label>
                <input
                  type="text"
                  value={formData.medicalAllergies}
                  onChange={(e) => setFormData({ ...formData, medicalAllergies: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Allergies alimentaires, médicamenteuses..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Médicaments réguliers
                </label>
                <input
                  type="text"
                  value={formData.medicalMedications}
                  onChange={(e) => setFormData({ ...formData, medicalMedications: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Médicaments pris quotidiennement..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conditions médicales
                </label>
                <input
                  type="text"
                  value={formData.medicalConditions}
                  onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Asthme, diabète, autres conditions..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes supplémentaires
                </label>
                <input
                  type="text"
                  value={formData.medicalNotes}
                  onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Autres informations importantes..."
                />
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>💡 Conseil :</strong> Ces informations restent confidentielles et ne sont accessibles qu'au personnel médical et administratif autorisé.
              </p>
            </div>
          </div>

          {/* NOUVELLE SECTION - Historique académique */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-600">🎓</span>
              Historique académique (optionnel)
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Informations sur le parcours scolaire antérieur de l'élève
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  École précédente
                </label>
                <input
                  type="text"
                  value={formData.academicPreviousSchool}
                  onChange={(e) => setFormData({ ...formData, academicPreviousSchool: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nom de l'école précédente..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dernier niveau/classe
                </label>
                <input
                  type="text"
                  value={formData.academicLastGrade}
                  onChange={(e) => setFormData({ ...formData, academicLastGrade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Terminale, Première, Seconde..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raison du transfert
                </label>
                <input
                  type="text"
                  value={formData.academicTransferReason}
                  onChange={(e) => setFormData({ ...formData, academicTransferReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Déménagement, choix de programme..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Besoins spéciaux
                </label>
                <input
                  type="text"
                  value={formData.academicSpecialNeeds}
                  onChange={(e) => setFormData({ ...formData, academicSpecialNeeds: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Adaptation scolaire, dyslexie..."
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Langues parlées
                </label>
                <input
                  type="text"
                  value={formData.academicLanguages}
                  onChange={(e) => setFormData({ ...formData, academicLanguages: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Français, Anglais, Espagnol... (séparer par des virgules)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Séparez les langues par des virgules (ex: Français, Anglais, Espagnol)
                </p>
              </div>
            </div>
          </div>

          {/* NOUVELLE SECTION - Préférences et objectifs */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-purple-600">🎯</span>
              Préférences et objectifs (optionnel)
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Informations pour personnaliser l'expérience éducative de l'élève
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objectifs scolaires
                </label>
                <input
                  type="text"
                  value={formData.preferencesGoals}
                  onChange={(e) => setFormData({ ...formData, preferencesGoals: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Diplôme visé, métier souhaité..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Centres d'intérêt
                </label>
                <input
                  type="text"
                  value={formData.preferencesInterests}
                  onChange={(e) => setFormData({ ...formData, preferencesInterests: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sciences, arts, littérature..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activités extrascolaires
                </label>
                <input
                  type="text"
                  value={formData.preferencesExtracurriculars}
                  onChange={(e) => setFormData({ ...formData, preferencesExtracurriculars: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Sport, musique, théâtre..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Style d'apprentissage préféré
                </label>
                <select
                  value={formData.preferencesLearningStyle}
                  onChange={(e) => setFormData({ ...formData, preferencesLearningStyle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner un style...</option>
                  <option value="visuel">Visuel (apprend en voyant)</option>
                  <option value="auditif">Auditif (apprend en écoutant)</option>
                  <option value="kinesthésique">Kinesthésique (apprend en faisant)</option>
                  <option value="mixte">Mixte (combinaison)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-800">
                <strong>💡 Astuce :</strong> Ces informations aident les enseignants à adapter leur pédagogie aux besoins spécifiques de l'élève.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'En cours...' : student ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
