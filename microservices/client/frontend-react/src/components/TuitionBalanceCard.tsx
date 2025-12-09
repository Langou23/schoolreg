import { AlertCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';
import PaymentModal from './PaymentModal';

interface TuitionBalanceCardProps {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    tuitionAmount: number;
    tuitionPaid: number;
  };
  onPaymentSuccess?: () => void;
}

export default function TuitionBalanceCard({ student, onPaymentSuccess }: TuitionBalanceCardProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const balance = student.tuitionAmount - student.tuitionPaid;
  const percentPaid = student.tuitionAmount > 0 
    ? (student.tuitionPaid / student.tuitionAmount) * 100 
    : 0;

  return (
    <>
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Frais de scolarité
            </h3>
            <p className="text-sm text-gray-600">
              {student.firstName} {student.lastName}
            </p>
          </div>
          {balance > 0 && (
            <div className="bg-amber-100 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          )}
        </div>

        {/* Barre de progression */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Payé</span>
            <span>{percentPaid.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentPaid === 100
                  ? 'bg-green-500'
                  : percentPaid >= 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(percentPaid, 100)}%` }}
            />
          </div>
        </div>

        {/* Détails financiers */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Montant total</span>
            <span className="text-lg font-semibold text-gray-900">
              {student.tuitionAmount.toFixed(2)} $ CAD
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Montant payé</span>
            <span className="text-lg font-semibold text-green-600">
              {student.tuitionPaid.toFixed(2)} $ CAD
            </span>
          </div>
          <div className="flex justify-between items-center py-3 bg-white rounded-lg px-3">
            <span className="font-medium text-gray-900">Solde à payer</span>
            <span className={`text-2xl font-bold ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {balance.toFixed(2)} $ CAD
            </span>
          </div>
        </div>

        {/* Bouton de paiement */}
        {balance > 0 ? (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <CreditCard className="w-5 h-5" />
            <span>Payer maintenant ({balance.toFixed(2)} $)</span>
          </button>
        ) : (
          <div className="w-full bg-green-100 text-green-800 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Frais de scolarité entièrement payés</span>
          </div>
        )}

        {/* Note informative */}
        {balance > 0 && (
          <p className="text-xs text-gray-500 mt-3 text-center">
            💡 Vous pouvez effectuer le paiement par carte bancaire de manière sécurisée
          </p>
        )}
      </div>

      {/* Modal de paiement */}
      {showPaymentModal && (
        <PaymentModal
          studentId={student.id}
          studentName={`${student.firstName} ${student.lastName}`}
          amount={balance}
          description={`Frais de scolarité - ${student.firstName} ${student.lastName}`}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            if (onPaymentSuccess) {
              onPaymentSuccess();
            }
          }}
        />
      )}
    </>
  );
}
