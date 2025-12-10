import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Lock, CheckCircle, AlertCircle } from 'lucide-react';

// Initialiser Stripe avec la clé publique
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SXnUM6pFdiVF89jB6UKlOBYSQgrXy1mYQk04zqURqhTmhfhAwposPiq0OxNsc1CKoyJUK4WxBKGyDNI10AMDyfJ00FdZvzr6W';

console.log(' Stripe Key chargée:', STRIPE_KEY ? '✅ Oui' : '❌ Non');
console.log(' Clé:', STRIPE_KEY?.substring(0, 20) + '...');

const stripePromise = loadStripe(STRIPE_KEY);

interface PaymentFormProps {
  amount: number;
  studentId: string;
  studentName: string;
  paymentType: string;
  paymentId?: string;  // ID du paiement pending à mettre à jour (optionnel)
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ amount, studentId, studentName, paymentType, paymentId, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('💳 STRIPE PAYMENT - Début du processus');
    console.log('💳 Student ID:', studentId);
    console.log('💳 Montant:', amount, 'CAD');
    console.log('💳 Type:', paymentType);
    console.log('💳 Payment ID (pending):', paymentId || 'Nouveau paiement');

    if (!stripe || !elements) {
      console.error('❌ Stripe ou Elements non initialisé');
      setError('Stripe n\'est pas correctement chargé');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Créer un Payment Intent côté serveur
      console.log('📡 Étape 1: Création du Payment Intent...');
      
      const requestBody = {
        student_id: studentId,
        amount: amount,
        currency: 'cad',
        description: `${paymentType} - ${studentName}`,
      };
      
      console.log('📤 Requête:', {
        url: 'http://localhost:4004/payment-intent',
        method: 'POST',
        body: requestBody
      });

      const response = await fetch('http://localhost:4004/payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Réponse HTTP:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur API:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Payment Intent créé:', data);
      
      const clientSecret = data.client_secret;
      
      if (!clientSecret) {
        console.error('❌ client_secret manquant dans la réponse:', data);
        throw new Error('client_secret manquant dans la réponse');
      }
      
      console.log('🔑 Client Secret reçu:', clientSecret.substring(0, 20) + '...');

      // 2. Confirmer le paiement avec la carte
      console.log('💳 Étape 2: Confirmation du paiement avec Stripe...');
      
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        console.error('❌ CardElement non trouvé');
        throw new Error('Élément de carte non trouvé');
      }

      console.log('🔄 Appel à stripe.confirmCardPayment...');
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: studentName,
          },
        },
      });

      if (stripeError) {
        console.error('❌ Erreur Stripe:', stripeError);
        throw new Error(stripeError.message);
      }

      console.log('✅ Réponse Stripe:', paymentIntent);
      console.log('📊 Status du paiement:', paymentIntent?.status);

      if (paymentIntent?.status === 'succeeded') {
        console.log('🎉 Paiement réussi!');
        
        // 3. Confirmer le paiement côté serveur (mise à jour DB + notification)
        console.log('📡 Étape 3: Confirmation côté serveur...');
        console.log('🔍 Payment Intent ID:', paymentIntent.id);
        console.log('🔍 Student ID:', studentId);
        
        // Attendre 2 secondes pour que la synchronisation se fasse
        console.log('⏱️ Attente de 2s pour synchronisation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const confirmPayload = {
            paymentIntentId: paymentIntent.id,
            studentId,
          };
          
          console.log('📤 Payload de confirmation:', confirmPayload);
          
          const confirmResponse = await fetch('http://localhost:4003/payments/confirm-stripe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            },
            body: JSON.stringify(confirmPayload),
          });
          
          console.log('📥 Réponse confirmation:', confirmResponse.status, confirmResponse.statusText);
          
          if (!confirmResponse.ok) {
            const errorData = await confirmResponse.json();
            console.error('❌ Erreur serveur:', errorData);
            console.error('❌ Le paiement n\'a pas été trouvé dans students-node');
            console.error('❌ Vérifiez que payments-fastapi a bien créé le paiement');
            throw new Error(errorData.detail || 'Erreur de confirmation');
          }
          
          const confirmData = await confirmResponse.json();
          console.log('✅ Confirmation serveur réussie:', confirmData);
        } catch (confirmError) {
          console.error('⚠️ Erreur confirmation serveur (non bloquant):', confirmError);
          console.error('⚠️ Le statut pourrait rester "pending" dans l\'interface');
          // Continue quand même, le webhook s'en chargera
        }

        console.log('✅ Processus de paiement terminé avec succès');
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        console.warn('⚠️ Paiement non réussi. Status:', paymentIntent?.status);
        throw new Error(`Paiement non réussi: ${paymentIntent?.status}`);
      }
    } catch (err) {
      console.error('❌ ERREUR GLOBALE:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setProcessing(false);
      console.log('💳 Fin du processus de paiement');
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: 'system-ui, -apple-system, sans-serif',
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Paiement réussi!</h3>
        <p className="text-gray-600">Votre paiement de {amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA a été traité avec succès.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Résumé du paiement */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Montant à payer (CAD)</span>
          <span className="text-2xl font-bold text-blue-600">
            {amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
          </span>
        </div>
        <div className="text-sm text-gray-600">
          <p>Élève: {studentName}</p>
          <p>Type: {paymentType === 'tuition' ? 'Frais de scolarité' : paymentType}</p>
        </div>
      </div>

      {/* Formulaire de carte */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <CreditCard className="w-4 h-4 inline mr-2" />
          Informations de carte bancaire
        </label>
        <div className="border-2 border-gray-300 rounded-lg p-4 bg-white focus-within:border-blue-500 transition-colors">
          <CardElement options={cardElementOptions} />
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Paiement sécurisé par Stripe
        </p>
      </div>

      {/* Message de sécurité */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-xs font-medium text-green-800 mb-1">🔒 Paiement sécurisé</p>
        <p className="text-xs text-green-700">
          Vos informations de paiement sont sécurisées et cryptées.
          <br />
          Nous n'avons pas accès à vos données bancaires.
        </p>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Traitement...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              Payer {amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ CA
            </>
          )}
        </button>
      </div>

      {/* Informations de sécurité */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Vos informations de paiement sont sécurisées et cryptées.
          <br />
          Nous n'avons pas accès à vos données bancaires.
        </p>
      </div>
    </form>
  );
}

// Composant wrapper avec Elements provider
export default function StripePaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <div className="bg-blue-100 p-3 rounded-lg">
            <CreditCard className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Paiement sécurisé</h3>
            <p className="text-sm text-gray-600">Propulsé par Stripe</p>
          </div>
        </div>
        <CheckoutForm {...props} />
      </div>
    </Elements>
  );
}
