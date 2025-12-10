import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronDown, ChevronRight, User, List, Users } from 'lucide-react';
import PaymentForm from './PaymentForm';
import PayOnlineButton from './PayOnlineButton';
import { PaymentsApi } from '../lib/api';

interface PaymentWithStudent {
  id: string;
  amount: number;
  paymentType?: string; // camelCase depuis students-node
  payment_type?: string; // compat
  paymentMethod?: string;
  payment_method?: string;
  paymentDate?: string;
  payment_date?: string;
  academicYear?: string;
  status: string;
  notes?: string;
  student?: {
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
  };
}

interface StudentPaymentGroup {
  studentId: string;
  studentName: string;
  payments: PaymentWithStudent[];
  totalPaid: number;
  totalPending: number;
  totalAmount: number;
}

export default function PaymentsView() {
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    try {
      const filtered = payments.filter((payment) => {
        if (!payment) return false;
        
        // Support both snake_case and camelCase
        const firstName = (payment.student?.firstName || payment.student?.first_name || '').toLowerCase();
        const lastName = (payment.student?.lastName || payment.student?.last_name || '').toLowerCase();
        const paymentType = (payment.paymentType || payment.payment_type || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return firstName.includes(search) || lastName.includes(search) || paymentType.includes(search);
      });
      setFilteredPayments(filtered);
    } catch (error) {
      console.error(' Erreur filtrage paiements:', error);
      setFilteredPayments(payments);
    }
  }, [searchTerm, payments]);

  useEffect(() => {
    const handler = () => fetchPayments();
    window.addEventListener('payment:paid', handler as EventListener);
    return () => window.removeEventListener('payment:paid', handler as EventListener);
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      console.log('💰 PaymentsView - Chargement des paiements...');
      const data = await PaymentsApi.list();
      console.log('💰 Données reçues:', data);
      console.log('💰 Type:', Array.isArray(data) ? 'Array' : typeof data);
      console.log('💰 Nombre:', Array.isArray(data) ? data.length : 'N/A');
      
      if (Array.isArray(data)) {
        setPayments(data as any);
        setFilteredPayments(data as any);
        console.log(' Paiements chargés avec succès:', data.length);
      } else {
        console.warn(' Les données ne sont pas un tableau:', data);
        setPayments([]);
        setFilteredPayments([]);
      }
    } catch (error) {
      console.error(' Erreur chargement paiements:', error);
      setPayments([]);
      setFilteredPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) return;

    await PaymentsApi.remove(id);
    fetchPayments();
  };

  const handleEdit = (payment: any) => {
    setEditingPayment(payment);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingPayment(undefined);
    fetchPayments();
  };

  const getStatusColor = (rawStatus: string) => {
    const status = (rawStatus || '').toLowerCase();
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

  const getStatusLabel = (rawStatus: string) => {
    const status = (rawStatus || '').toLowerCase();
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

  const getPaymentTypeLabel = (rawType: string | undefined) => {
    const type = (rawType || '').toLowerCase();
    const types: Record<string, string> = {
      tuition: 'Scolarité',
      registration: 'Inscription',
      uniform: 'Uniforme',
      transport: 'Transport',
      other: 'Autre',
    };
    return types[type] || type;
  };

  const getPaymentMethodLabel = (rawMethod: string | undefined) => {
    const method = (rawMethod || '').toLowerCase();
    const methods: Record<string, string> = {
      cash: 'Espèces',
      card: 'Carte',
      bank_transfer: 'Virement',
      online: 'En ligne',
    };
    return methods[method] || method;
  };

  // Grouper les paiements par élève
  const groupPaymentsByStudent = (): StudentPaymentGroup[] => {
    const grouped = new Map<string, StudentPaymentGroup>();

    filteredPayments.forEach((payment) => {
      const studentId = payment.student ? 
        `${payment.student.firstName || payment.student.first_name || ''}-${payment.student.lastName || payment.student.last_name || ''}`.trim() :
        'unknown';
      
      const studentName = payment.student ?
        `${payment.student.lastName || payment.student.last_name || ''} ${payment.student.firstName || payment.student.first_name || ''}`.trim() :
        'Élève inconnu';

      if (!grouped.has(studentId)) {
        grouped.set(studentId, {
          studentId,
          studentName,
          payments: [],
          totalPaid: 0,
          totalPending: 0,
          totalAmount: 0,
        });
      }

      const group = grouped.get(studentId)!;
      group.payments.push(payment);
      group.totalAmount += payment.amount;

      const status = (payment.status || '').toLowerCase();
      if (status === 'paid') {
        group.totalPaid += payment.amount;
      } else if (status === 'pending') {
        group.totalPending += payment.amount;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => 
      a.studentName.localeCompare(b.studentName)
    );
  };

  const toggleStudentExpand = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  const studentGroups = groupPaymentsByStudent();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paiements</h2>
          <p className="text-gray-600 mt-1">Suivre les frais scolaires</p>
        </div>
        <button
          onClick={() => {
            setEditingPayment(undefined);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouveau paiement
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher par nom d'élève ou type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              viewMode === 'grouped'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Vue groupée par élève"
          >
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">Par élève</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title="Vue liste complète"
          >
            <List className="w-5 h-5" />
            <span className="hidden sm:inline">Liste</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">Aucun paiement trouvé</p>
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-4">
          {studentGroups.map((group) => {
            const isExpanded = expandedStudents.has(group.studentId);
            return (
              <div key={group.studentId} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* En-tête de l'élève */}
                <button
                  onClick={() => toggleStudentExpand(group.studentId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-lg text-gray-900">{group.studentName}</h3>
                      <p className="text-sm text-gray-600">{group.payments.length} paiement(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Total</div>
                      <div className="font-bold text-lg text-gray-900">
                        {group.totalAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ CA
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {group.totalPaid > 0 && (
                        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          Payé: {group.totalPaid.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $
                        </div>
                      )}
                      {group.totalPending > 0 && (
                        <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                          En attente: {group.totalPending.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $
                        </div>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Historique des paiements */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {group.payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-3 whitespace-nowrap font-semibold text-gray-900">
                                {payment.amount.toLocaleString('en-CA', { minimumFractionDigits: 2 })} $ CA
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                {getPaymentTypeLabel(payment.paymentType || payment.payment_type)}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                {getPaymentMethodLabel(payment.paymentMethod || payment.payment_method)}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                {(() => {
                                  const rawDate = payment.paymentDate || payment.payment_date;
                                  if (!rawDate) return '-';
                                  const d = new Date(rawDate);
                                  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR');
                                })()}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">
                                {payment.academicYear || '-'}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                                  {getStatusLabel(payment.status)}
                                </span>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  title="Modifier"
                                  onClick={() => handleEdit(payment)}
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  title="Supprimer"
                                  onClick={() => handleDelete(payment.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {payment.status === 'pending' && (
                                  <div className="mt-2">
                                    <PayOnlineButton paymentId={payment.id} amount={payment.amount} />
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Élève
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Méthode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {payment.student 
                          ? `${payment.student.lastName || payment.student.last_name || ''} ${payment.student.firstName || payment.student.first_name || ''}`
                          : 'Élève non spécifié'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {payment.amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentTypeLabel(payment.paymentType || payment.payment_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodLabel(payment.paymentMethod || payment.payment_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        const rawDate = payment.paymentDate || payment.payment_date;
                        if (!rawDate) return '-';
                        const d = new Date(rawDate);
                        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR');
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.academicYear || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        title="Modifier"
                        onClick={() => handleEdit(payment)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Supprimer"
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {payment.status === 'pending' && (
                        <div className="mt-2">
                          <PayOnlineButton paymentId={payment.id} amount={payment.amount} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <PaymentForm
          onClose={() => {
            setShowForm(false);
            setEditingPayment(undefined);
          }}
          onSuccess={handleFormSuccess}
          payment={editingPayment}
        />
      )}
    </div>
  );
}
