import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Calendar, CheckCircle, Clock, AlertCircle, X, Receipt } from 'lucide-react';
import { PaymentsApi, NotificationsApi } from '../lib/api';
import StripePaymentForm from './StripePaymentForm';

interface StudentPaymentProps {
  studentId: string;
  studentName: string;
  tuitionAmount: number;
  tuitionPaid: number;
  totalBalance?: number;  // Solde total incluant tous les types de frais
  feesByType?: any;  // Détail des frais par type
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function StudentPayment({
  studentId,
  studentName,
  tuitionAmount,
  tuitionPaid,
  totalBalance,
  feesByType,
  onClose,
  onSuccess
}: StudentPaymentProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [formData, setFormData] = useState({
    amount: '',
    paymentType: 'tuition' as const,
    paymentMethod: 'card',
    notes: '',
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Utiliser totalBalance si disponible, sinon calculer à partir de tuition
  const balance = totalBalance !== undefined ? totalBalance : (tuitionAmount - tuitionPaid);

  useEffect(() => {
    fetchPayments();
  }, [studentId]);

  const fetchPayments = async () => {
    try {
      const data = await PaymentsApi.list({ studentId });
      const allPayments = Array.isArray(data) ? data : [];
      setPayments(allPayments);
      
      // Séparer les paiements pending
      const pending = allPayments.filter(p => p.status === 'pending');
      setPendingPayments(pending);
      
      console.log(' Paiements pending:', pending);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
      setPendingPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Montant invalide');
      }

      if (amount > balance) {
        throw new Error(`Le montant ne peut pas dépasser le solde restant (${balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA)`);
      }

      // Créer le paiement
      await PaymentsApi.create({
        studentId,
        amount,
        paymentType: formData.paymentType,
        paymentMethod: formData.paymentMethod,
        status: 'paid',
        notes: formData.notes || `Paiement de ${amount.toLocaleString('fr-CA')} $ CAD pour ${studentName}`,
      });

      // Envoyer notification à l'admin
      await NotificationsApi.create({
        type: 'payment_received',
        title: ' Nouveau paiement reçu',
        message: `${studentName} a effectué un paiement de ${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA`,
      });

      // Réinitialiser le formulaire
      setFormData({
        amount: '',
        paymentType: 'tuition',
        paymentMethod: 'card',
        notes: '',
      });
      setShowPaymentForm(false);
      
      // Rafraîchir les paiements
      await fetchPayments();
      
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du paiement');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      succeeded: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: X },
    };
    const style = styles[status as keyof typeof styles] || styles.pending;
    const Icon = style.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status === 'paid' || status === 'succeeded' ? 'Payé' : 
         status === 'pending' ? 'En attente' :
         status === 'failed' ? 'Échoué' : 'Annulé'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Paiements</h3>
              <p className="text-white/90 text-sm">{studentName}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-50">
        <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Frais de scolarité (CAD)</p>
              <p className="text-xl font-bold text-gray-900">
                {tuitionAmount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border-2 border-green-200">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Montant payé (CAD)</p>
              <p className="text-xl font-bold text-green-600">
                {tuitionPaid.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
              </p>
            </div>
          </div>
        </div>

        <div className={`bg-white rounded-lg p-4 border-2 ${balance > 0 ? 'border-red-200' : 'border-green-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${balance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <AlertCircle className={`w-5 h-5 ${balance > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Solde restant (CAD)</p>
              <p className={`text-xl font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {balance.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payments Section */}
      {pendingPayments.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Paiements en attente
          </h4>
          <div className="space-y-3">
            {pendingPayments.map((payment) => {
              const paymentTypeLabels: Record<string, string> = {
                tuition: 'Scolarité',
                registration: 'Inscription',
                transport: 'Transport',
                uniform: 'Uniforme',
                other: 'Autre'
              };
              const typeLabel = paymentTypeLabels[payment.paymentType] || payment.paymentType;
              
              return (
                <div
                  key={payment.id}
                  className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {parseFloat(payment.amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                        </span>
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                          {typeLabel}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-gray-600 mb-2">{payment.notes}</p>
                      )}
                      {payment.academicYear && (
                        <p className="text-sm text-gray-500">
                          🎓 Session: {payment.academicYear}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setFormData({
                          ...formData,
                          amount: payment.amount.toString(),
                          paymentType: payment.paymentType
                        });
                        setShowPaymentForm(true);
                      }}
                      className="ml-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg flex items-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" />
                      Payer maintenant
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Button */}
      {balance > 0 && !showPaymentForm && pendingPayments.length === 0 && (
        <div className="px-6 pb-4">
          <button
            onClick={() => setShowPaymentForm(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-lg"
          >
            <CreditCard className="w-5 h-5" />
            Effectuer un paiement
          </button>
        </div>
      )}

      {/* Payment Form - Stripe Integration */}
      {showPaymentForm && (
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              {selectedPayment ? '💳 Paiement du solde en attente' : '💳 Nouveau paiement'}
            </h4>
            {selectedPayment && (
              <div className="text-sm text-gray-600">
                <p> Montant: <span className="font-bold">{parseFloat(selectedPayment.amount).toLocaleString('fr-CA')} $ CAD</span></p>
                <p> Type: <span className="font-bold">{selectedPayment.paymentType === 'tuition' ? 'Scolarité' : selectedPayment.paymentType === 'transport' ? 'Transport' : selectedPayment.paymentType === 'registration' ? 'Inscription' : selectedPayment.paymentType}</span></p>
                {selectedPayment.academicYear && (
                  <p> Session: <span className="font-bold">{selectedPayment.academicYear}</span></p>
                )}
              </div>
            )}
          </div>
          <StripePaymentForm
            amount={parseFloat(formData.amount) || balance}
            studentId={studentId}
            studentName={studentName}
            paymentType={formData.paymentType}
            paymentId={selectedPayment?.id}  // Passer l'ID du paiement pending
            onSuccess={() => {
              setShowPaymentForm(false);
              setSelectedPayment(null);
              setFormData({ amount: '', paymentType: 'tuition', paymentMethod: 'card', notes: '' });
              fetchPayments();
              if (onSuccess) onSuccess();
            }}
            onCancel={() => {
              setShowPaymentForm(false);
              setSelectedPayment(null);
              setError('');
            }}
          />
          
          {/* Ancien formulaire simple (fallback) */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowPaymentForm(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Retour
            </button>
          </div>
        </div>
      )}

      {/* Old Simple Payment Form (hidden, kept for reference) */}
      {false && showPaymentForm && (
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Nouveau paiement (Simple)
            </h4>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant (CAD) *
                </label>
                <select
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                >
                  <option value="">Sélectionner le montant</option>
                  {[50, 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000]
                    .filter(amount => amount <= balance)
                    .map(amount => (
                      <option key={amount} value={amount}>
                        {amount.toLocaleString('fr-CA')} $ CAD
                      </option>
                    ))
                  }
                  {balance > 0 && !([50, 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000, 2500, 3000, 4000, 5000].includes(balance)) && (
                    <option value={balance}>{balance.toLocaleString('fr-CA')} $ CAD (Solde complet)</option>
                  )}
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  Solde restant: {balance.toLocaleString('fr-CA')} $ CAD
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de paiement *
                </label>
                <select
                  required
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as any })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="tuition">Frais de scolarité</option>
                  <option value="registration">Frais d'inscription</option>
                  <option value="books">Livres</option>
                  <option value="uniform">Uniforme</option>
                  <option value="transport">Transport</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Méthode de paiement *
                </label>
                <select
                  required
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="card">Carte bancaire</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Virement bancaire</option>
                  <option value="cash">Espèces</option>
                  <option value="check">Chèque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Informations supplémentaires..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setError('');
                  }}
                  className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirmer le paiement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment History */}
      <div className="px-6 pb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gray-600" />
          Historique des paiements
        </h4>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {parseFloat(payment.amount).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                      </span>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(payment.paymentDate || payment.createdAt)}
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        {payment.paymentMethod === 'card' ? 'Carte bancaire' :
                         payment.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                         payment.paymentMethod === 'bank_transfer' ? 'Virement bancaire' :
                         payment.paymentMethod === 'cash' ? 'Espèces' :
                         payment.paymentMethod === 'check' ? 'Chèque' : payment.paymentMethod}
                      </div>
                      {payment.notes && (
                        <p className="text-gray-500 italic mt-2">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
