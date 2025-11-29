import { useEffect, useState } from 'react';
import { CheckCircle, Loader, XCircle } from 'lucide-react';
import { apiClient } from '../lib/apiClient';

export default function PaymentSuccess() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState<string>('Confirmation du paiement en cours...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      setStatus('error');
      setMessage('Identifiant de session Stripe manquant.');
      return;
    }

    (async () => {
      try {
        await apiClient.get(`/stripe/checkout-session/${sessionId}/confirm`);
        setStatus('success');
        setMessage('Paiement confirmé avec succès. Vous allez être redirigé...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.response?.data?.detail || 'Erreur lors de la confirmation du paiement.');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <div className="flex flex-col items-center gap-3">
            <Loader className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-blue-900 font-medium">{message}</p>
          </div>
        )}
        {status === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="w-10 h-10 text-green-600" />
            <p className="text-green-900 font-semibold">{message}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <XCircle className="w-10 h-10 text-red-600" />
            <p className="text-red-900 font-semibold">{message}</p>
            <button
              className="mt-2 px-4 py-2 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300"
              onClick={() => (window.location.href = '/')}
            >
              Retour à l'accueil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
