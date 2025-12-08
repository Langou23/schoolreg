import { useState, useEffect } from 'react';
import { Student, Payment } from '../types';
import { StudentsApi, PaymentsApi } from '../lib/api';
import { CreditCard, X, Banknote, Smartphone } from 'lucide-react';
import StripePaymentForm from './StripePaymentForm';

interface PaymentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  payment?: Payment;
}

export default function PaymentForm({ onClose, onSuccess, payment }: PaymentFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [paymentMode, setPaymentMode] = useState<'stripe' | 'manual'>('stripe');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    studentId: payment?.studentId || '',
    amount: payment?.amount || 0,
    paymentType: payment?.paymentType || 'tuition',
    paymentMethod: payment?.paymentMethod || 'cash',
    paymentDate: (payment?.paymentDate || new Date().toISOString().split('T')[0]) as string,
    status: payment?.status || 'paid',
    notes: payment?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const data = await StudentsApi.list();
    // Afficher tous les élèves actifs et en attente (pas les inactifs)
    if (Array.isArray(data)) {
      setStudents((data as Student[]).filter(s => s.status === 'active' || s.status === 'pending'));
    }
  };

  const handleStudentChange = async (studentId: string) => {
    setFormData({ ...formData, studentId });
    
    // Recharger les données fraîches de l'étudiant depuis le serveur
    try {
      const freshData = await StudentsApi.list();
      const freshStudents = Array.isArray(freshData) ? (freshData as Student[]).filter(s => s.status === 'active' || s.status === 'pending') : [];
      setStudents(freshStudents);
      
      const student = freshStudents.find(s => s.id === studentId);
      setSelectedStudent(student || null);
      
      if (student) {
        // Utiliser totalBalance si disponible, sinon calculer à partir de tuition
        const balance = (student as any).totalBalance !== undefined 
          ? (student as any).totalBalance 
          : (student.tuitionAmount || 0) - (student.tuitionPaid || 0);
        
        console.log('💰 Données fraîches de l\'étudiant:', {
          nom: `${student.firstName} ${student.lastName}`,
          fraisScolarite: student.tuitionAmount,
          payeScolarite: student.tuitionPaid,
          totalPending: (student as any).totalPending,
          totalPaid: (student as any).totalPaid,
          soldeTotal: balance
        });
        setFormData(prev => ({ ...prev, amount: balance > 0 ? balance : 0 }));
      }
    } catch (error) {
      console.error('Erreur lors du rechargement des données:', error);
      // Fallback sur les données en cache
      const student = students.find(s => s.id === studentId);
      setSelectedStudent(student || null);
      if (student) {
        // Utiliser totalBalance si disponible
        const balance = (student as any).totalBalance !== undefined 
          ? (student as any).totalBalance 
          : (student.tuitionAmount || 0) - (student.tuitionPaid || 0);
        setFormData(prev => ({ ...prev, amount: balance > 0 ? balance : 0 }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (payment) {
        await PaymentsApi.update(String(payment.id), formData);
      } else {
        await PaymentsApi.create(formData);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Si Stripe est sélectionné et qu'un élève est choisi
  if (paymentMode === 'stripe' && selectedStudent) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Paiement Stripe - {selectedStudent.firstName} {selectedStudent.lastName}
            </h2>
            <button
              onClick={() => {
                setPaymentMode('stripe');
                setSelectedStudent(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6">
            <StripePaymentForm
              amount={formData.amount}
              studentId={selectedStudent.id}
              studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
              paymentType={formData.paymentType}
              onSuccess={() => {
                setSelectedStudent(null);
                onSuccess();
              }}
              onCancel={() => {
                setSelectedStudent(null);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {payment ? 'Modifier le paiement' : 'Enregistrer un paiement'}
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

          {/* Mode de paiement: Stripe ou Manuel */}
          {!payment && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Mode de paiement
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('stripe')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    paymentMode === 'stripe'
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  Stripe (Carte)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('manual')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    paymentMode === 'manual'
                      ? 'bg-green-600 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  Manuel (Cash)
                </button>
              </div>
              {paymentMode === 'stripe' && (
                <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                  💳 Paiement sécurisé par carte bancaire
                </p>
              )}
              {paymentMode === 'manual' && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                  💵 Enregistrement manuel (espèces, virement, etc.)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Élève *
            </label>
            <select
              required
              disabled={!!payment}
              value={formData.studentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Sélectionner un élève</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.lastName} {student.firstName}
                </option>
              ))}
            </select>
          </div>

          {/* Champs communs: Montant et Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (CAD) *
              </label>
              <select
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Sélectionner le montant</option>
                {[50, 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000].map(amount => (
                  <option key={amount} value={amount}>{amount.toLocaleString('fr-CA')} $ CAD</option>
                ))}
              </select>
              {paymentMode === 'stripe' && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Sélectionnez le montant à payer. Devise : dollars canadiens (CAD).
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de paiement *
              </label>
              <select
                required
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="tuition">Frais de scolarité</option>
                <option value="registration">Inscription</option>
                <option value="uniform">Uniforme</option>
                <option value="transport">Transport</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>

          {/* Champs spécifiques au mode Manuel uniquement */}
          {paymentMode === 'manual' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Méthode de paiement *
                  </label>
                  <select
                    required
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">💵 Espèces</option>
                    <option value="card">💳 Carte bancaire</option>
                    <option value="bank_transfer">🏦 Virement bancaire</option>
                    <option value="mobile_money">📱 Mobile Money</option>
                    <option value="online">🌐 Paiement en ligne</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date de paiement *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    <option value="paid">✅ Payé</option>
                    <option value="pending">⏳ En attente</option>
                    <option value="cancelled">❌ Annulé</option>
                    <option value="refunded">↩️ Remboursé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Reçu n°123, Paiement reçu par M. Dupont..."
                />
              </div>
            </>
          )}

          {/* Info pour mode Stripe */}
          {paymentMode === 'stripe' && !payment && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Paiement par carte bancaire
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Le formulaire de carte Stripe s'affichera après avoir cliqué sur "Payer avec Stripe".
                    Le paiement sera traité de manière sécurisée et confirmé instantanément.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            {paymentMode === 'stripe' && !payment ? (
              <button
                type="button"
                onClick={() => {
                  if (!formData.studentId) {
                    setError('Veuillez sélectionner un élève');
                    return;
                  }
                  const student = students.find(s => s.id === formData.studentId);
                  setSelectedStudent(student || null);
                }}
                disabled={!formData.studentId}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
              >
                <Smartphone className="w-5 h-5" />
                Payer avec Stripe
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'En cours...' : payment ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
