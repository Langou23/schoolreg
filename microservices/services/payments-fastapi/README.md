# Payments Service (FastAPI + Stripe)

Microservice de paiement utilisant Stripe pour gérer les paiements des étudiants.

## Fonctionnalités

- ✅ Création de Payment Intent (paiements directs avec Stripe Elements)
- ✅ Création de Checkout Session (page de paiement hébergée par Stripe)
- ✅ Gestion des paiements (liste, détails, statuts)
- ✅ Webhooks Stripe pour les notifications
- ✅ Simulation de paiements pour les tests
- ✅ Stockage dans PostgreSQL

## Installation

```bash
cd microservices/services/payments-fastapi
pip install -r requirements.txt
```

## Configuration

Ajouter dans `.env`:
```
PAYMENTS_PORT=4004
STRIPE_SECRET_KEY=sk_test_votre_cle_stripe
STRIPE_WEBHOOK_SECRET=whsec_votre_secret_webhook
DATABASE_URL=postgresql://postgres:123@localhost:5432/schoolreg
```

## Démarrage

```bash
python run.py
```

Le service démarre sur http://localhost:4004

## Endpoints

### Paiements
- `POST /payment-intent` - Créer un Payment Intent
- `POST /checkout-session` - Créer une Checkout Session
- `GET /payments` - Lister les paiements
- `GET /payments/{id}` - Détails d'un paiement
- `PATCH /payments/{id}/status` - Mettre à jour le statut

### Simulation (Tests)
- `POST /payments/{id}/simulate-success` - Simuler un paiement réussi
- `POST /payments/{id}/simulate-failure` - Simuler un échec

### Webhook
- `POST /webhook` - Recevoir les événements Stripe

## Mode Test

Pour tester sans Stripe réel, utilisez les endpoints de simulation.

## Cartes de test Stripe

- Succès: `4242 4242 4242 4242`
- Échec: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`
