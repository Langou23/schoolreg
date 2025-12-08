import { useEffect, useState } from 'react';
import { X, Receipt, CreditCard, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { PaymentsApi } from '../lib/api';

interface PaymentHistoryProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
}

interface PaymentWithDetails {
  id: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  paymentDate: string;
  status: string;
  notes?: string;
  academicYear?: string;
}

export default function PaymentHistory({ studentId, studentName, onClose }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, [studentId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const data = await PaymentsApi.listByStudent(studentId);
      setPayments(Array.isArray(data) ? data : []);

      // Calculate stats
      const total = (Array.isArray(data) ? data : []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const paid = (Array.isArray(data) ? data : [])
        .filter((p: any) => p.status === 'paid')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      const pending = (Array.isArray(data) ? data : [])
        .filter((p: any) => p.status !== 'paid')
        .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

      setStats({ total, paid, pending });
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'pending':
        return 'En attente';
      case 'overdue':
        return 'En retard';
      default:
        return status;
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      tuition: 'Scolarité',
      registration: 'Inscription',
      uniform: 'Uniforme',
      transport: 'Transport',
      other: 'Autre',
    };
    return types[type] || type;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Espèces',
      card: 'Carte',
      bank_transfer: 'Virement bancaire',
      online: 'Paiement en ligne',
      cheque: 'Chèque',
    };
    return methods[method] || method;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'card':
      case 'online':
        return <CreditCard className="w-4 h-4" />;
      case 'cash':
        return <span className="text-sm">💵</span>;
      case 'bank_transfer':
        return <span className="text-sm">🏦</span>;
      case 'cheque':
        return <span className="text-sm">📝</span>;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              Historique des paiements
            </h2>
            <p className="text-blue-100 text-sm mt-1">{studentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-700 font-semibold uppercase tracking-wide">Total</p>
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900">{stats.total.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $</p>
              <p className="text-xs text-blue-600 mt-1">CAD</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-green-700 font-semibold uppercase tracking-wide">Payé</p>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">{stats.paid.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $</p>
              <p className="text-xs text-green-600 mt-1">CAD</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-orange-700 font-semibold uppercase tracking-wide">En attente</p>
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-900">{stats.pending.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $</p>
              <p className="text-xs text-orange-600 mt-1">CAD</p>
            </div>
          </div>

          {/* Payment list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => {
                // Filtrer les notes Stripe techniques
                const shouldShowNotes = payment.notes && 
                  !payment.notes.includes('Stripe') && 
                  !payment.notes.includes('cs_test') && 
                  !payment.notes.includes('cs_live') &&
                  !payment.notes.includes('Checkout session') &&
                  !payment.notes.includes('confirm endpoint');

                return (
                  <div
                    key={payment.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${payment.status === 'paid' ? 'bg-green-100' : 'bg-orange-100'}`}>
                          {getStatusIcon(payment.status)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {getPaymentTypeLabel(payment.paymentType)}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                            {getStatusLabel(payment.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {payment.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $
                        </p>
                        <p className="text-xs text-gray-500">CAD</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        <div>
                          <p className="text-xs text-gray-500">Méthode de paiement</p>
                          <p className="font-medium text-gray-900">
                            {getPaymentMethodLabel(payment.paymentMethod)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Date de paiement</p>
                          <p className="font-medium text-gray-900">
                            {new Date(payment.paymentDate).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {payment.academicYear && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Année académique</p>
                        <p className="font-medium text-gray-900">{payment.academicYear}</p>
                      </div>
                    )}

                    {shouldShowNotes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Notes</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{payment.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
