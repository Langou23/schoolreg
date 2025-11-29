import { useEffect, useState } from 'react';
import { X, Receipt } from 'lucide-react';
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
      bank_transfer: 'Virement',
      online: 'En ligne',
    };
    return methods[method] || method;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Historique des paiements - {studentName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium">Total (CAD)</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Payé (CAD)</p>
              <p className="text-2xl font-bold text-green-900">{stats.paid.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-amber-600 font-medium">En attente (CAD)</p>
              <p className="text-2xl font-bold text-amber-900">{stats.pending.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA</p>
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
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {getPaymentTypeLabel((payment as any).paymentType)}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                          {getStatusLabel(payment.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Montant:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {payment.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Méthode:</span>
                          <span className="ml-2 text-gray-900">
                            {getPaymentMethodLabel((payment as any).paymentMethod)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <span className="ml-2 text-gray-900">
                            {new Date((payment as any).paymentDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      {payment.notes && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Notes:</span>
                          <span className="ml-2 text-gray-700">{payment.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
