import { useState } from 'react';
import { X, CreditCard, CheckCircle, XCircle, Loader } from 'lucide-react';
import { StripePaymentsApi } from '../lib/api';

interface PaymentModalProps {
  studentId: string;
  studentName: string;
  amount: number;
  description?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  studentId,
  studentName,
  amount,
  description,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [localAmount, setLocalAmount] = useState<number>(amount);

  // Simulation supprimée: utilisation Stripe uniquement

  // Méthode 2: Redirection vers Stripe Checkout (pour paiements réels)
  const handleStripeCheckout = async () => {
    setLoading(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const session = await StripePaymentsApi.createCheckoutSession({
        student_id: studentId,
        amount: localAmount,
        currency: 'cad',
        description: description || `Frais de scolarité - ${studentName}`,
        success_url: `${window.location.origin}/payment-success`,
        cancel_url: `${window.location.origin}/payment-cancel`,
      });

      // Rediriger vers Stripe
      window.location.href = session.url;

    } catch (error: any) {
      console.error('Erreur de paiement:', error);
      setPaymentStatus('error');
      setErrorMessage(error.response?.data?.detail || 'Erreur lors de la création de la session de paiement');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Paiement</h2>
              <p className="text-sm text-gray-600">{studentName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Statut du paiement */}
        {paymentStatus === 'processing' && (
          <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Loader className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="font-semibold text-blue-900">Traitement en cours...</p>
                <p className="text-sm text-blue-700">Veuillez patienter</p>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Paiement réussi !</p>
                <p className="text-sm text-green-700">Votre paiement a été traité avec succès</p>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Erreur de paiement</p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Détails + Action (Stripe uniquement) */}
        {paymentStatus === 'idle' && (
          <>
            <div className="mb-6 space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Description</span>
                <span className="font-semibold text-gray-900">
                  {description || 'Frais de scolarité'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg gap-3">
                <div className="flex-1">
                  <span className="block text-gray-600 mb-1">Montant (CAD)</span>
                  <select
                    value={localAmount}
                    onChange={(e) => setLocalAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right font-semibold"
                  >
                    <option value="">Sélectionner</option>
                    {[50, 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000].map(amount => (
                      <option key={amount} value={amount}>{amount.toLocaleString('fr-CA')} $</option>
                    ))}
                  </select>
                </div>
                <span className="text-xl font-bold text-gray-900 whitespace-nowrap">
                  {localAmount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStripeCheckout}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Redirection vers Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Payer maintenant (Stripe)
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                disabled={loading}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50 font-semibold"
              >
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
