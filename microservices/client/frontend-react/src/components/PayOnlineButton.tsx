/**
 * Composant désactivé - Paiements uniquement via Stripe
 * Les paiements en attente peuvent être payés via le formulaire Stripe principal
 */
export default function PayOnlineButton(_props: { paymentId: string; amount: number }) {
  return (
    <div className="text-sm text-gray-600 italic">
      Utilisez le formulaire de paiement Stripe pour payer ce montant
    </div>
  );
}
