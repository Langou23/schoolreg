import { XCircle } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 max-w-md w-full text-center">
        <div className="flex flex-col items-center gap-3">
          <XCircle className="w-10 h-10 text-red-600" />
          <p className="text-red-900 font-semibold">Paiement annulé.</p>
          <button
            className="mt-2 px-4 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300"
            onClick={() => (window.location.href = '/')}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    </div>
  );
}
