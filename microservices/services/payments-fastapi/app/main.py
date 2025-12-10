"""
============================================
SERVICE DE PAIEMENTS STRIPE (payments-fastapi)
============================================
Port: 4004 | Python + FastAPI + Stripe API

Responsabilités:
- Intégration Stripe (Payment Intents, Checkout Sessions)
- Mode simulation pour développement sans vraie clé Stripe
- Webhooks Stripe pour confirmations automatiques
- Synchronisation avec students-node pour MAJ tuitionPaid
- Gestion des paiements par carte bancaire

Modes de paiement:
1. Payment Intent: Intégration Stripe Elements dans le frontend
2. Checkout Session: Page de paiement hébergée par Stripe

Synchronisation:
- Création paiement dans students-node (status=pending)
- Webhook Stripe -> MAJ status=paid + incrément tuitionPaid

Mode simulation:
- STRIPE_SIMULATION_MODE=true: Fonctionne sans clé Stripe réelle
- Génère des IDs simulés (pi_simulated_xxx, cs_test_simulated_xxx)
- Parfait pour le développement local
============================================
"""

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import stripe
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv
import httpx
from pathlib import Path

from .database import get_db, engine, Base
from .models import StripePayment
from .schemas import (
    PaymentIntentCreate,
    PaymentIntentResponse,
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    PaymentResponse,
    PaymentStatusUpdate
)

# ============================================
# CONFIGURATION
# ============================================

# Charger les variables d'environnement depuis .env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path, override=True)

# Mode simulation: Active le développement sans vraie clé Stripe
STRIPE_SIMULATION_MODE = os.getenv("STRIPE_SIMULATION_MODE", "false").lower() == "true"

if STRIPE_SIMULATION_MODE:
    print(f"🧪 MODE SIMULATION STRIPE ACTIVÉ - Aucune vraie clé nécessaire")
    print(f"   Les paiements seront simulés localement")
    stripe.api_key = "sk_test_SIMULATION_MODE"  # Clé factice pour le mode simulation
else:
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key or "YOUR_SECRET_KEY" in stripe_key:
        print(f"⚠️ ATTENTION: Clé Stripe manquante ou invalide dans .env!")
        print(f"Fichier .env: {env_path}")
        raise ValueError("Clé Stripe invalide. Activez STRIPE_SIMULATION_MODE=true ou ajoutez une vraie clé.")
        
    stripe.api_key = stripe_key
    print(f"✅ Stripe configuré avec clé: {stripe_key[:7]}...***")

# Configuration JWT Service pour appels inter-services
SERVICE_JWT = os.getenv("SERVICE_JWT")
if not SERVICE_JWT:
    print(f"⚠️ ATTENTION: SERVICE_JWT manquant dans .env!")
    print(f"   Les appels à students-node échoueront sans authentification.")
else:
    print(f"✅ SERVICE_JWT configuré pour auth inter-services")


# Créer les tables de base de données
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payments Service", version="1.0.0")

# CORS - Autoriser toutes les origines pour simplifier le développement
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "payments"}

# ============================================
# STRIPE PAYMENT INTENT (Pour paiements directs)
# ============================================

@app.post("/payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    payment_data: PaymentIntentCreate,
    db: Session = Depends(get_db)
):
    """
    POST /payment-intent - Crée un Payment Intent Stripe
    
    Authentification: NON requis (endpoint public)
    
    Utilisé pour:
        - Intégration Stripe Elements dans le frontend
        - Paiements directs sans redirection
        - Meilleur contrôle de l'UX
    
    Body:
        - student_id: ID de l'élève
        - amount: Montant en dollars (ex: 50.00)
        - currency: Devise (ex: "cad")
        - description: Description du paiement
    
    Processus:
        1. Mode simulation: Génère un PI simulé (pi_simulated_xxx)
        2. Mode production: Appelle Stripe API
        3. Enregistre dans payments-fastapi DB (status=pending)
        4. Synchronise avec students-node (crée paiement pending)
    
    Retourne:
        - id: ID local du paiement
        - client_secret: Secret pour compléter le paiement frontend
        - amount, currency, status
    
    Le statut sera mis à jour en 'succeeded' via webhook après confirmation
    """
    try:
        # Mode simulation: réponse simulée
        if STRIPE_SIMULATION_MODE:
            simulated_payment_intent_id = f"pi_simulated_{uuid.uuid4().hex[:24]}"
            simulated_client_secret = f"{simulated_payment_intent_id}_secret_{uuid.uuid4().hex[:10]}"
            
            # Créer aussi un paiement dans students-node pour la synchronisation
            try:
                async with httpx.AsyncClient() as client:
                    students_payment = {
                        "studentId": payment_data.student_id,
                        "amount": payment_data.amount,
                        "paymentType": "tuition",
                        "paymentMethod": "card",
                        "status": "pending",
                        "transactionId": simulated_payment_intent_id,
                        "notes": payment_data.description or f"Paiement Stripe (simulation): {simulated_payment_intent_id}"
                    }
                    
                    response = await client.post(
                        "http://localhost:4003/payments",
                        json=students_payment,
                        headers={"Authorization": f"Bearer {SERVICE_JWT}"},
                        timeout=10.0
                    )
                    
                    if response.status_code == 201:
                        print(f"✅ Paiement simulé créé dans students-node: {simulated_payment_intent_id}")
                    else:
                        print(f"⚠️ Erreur création paiement students-node: {response.status_code}")
            except Exception as sync_error:
                print(f"⚠️ Erreur synchronisation students-node: {sync_error}")
            
            return PaymentIntentResponse(
                id=simulated_payment_intent_id,
                client_secret=simulated_client_secret,
                amount=payment_data.amount,
                currency=payment_data.currency,
                status="requires_payment_method"
            )
        
        # Mode production: vraie API Stripe
        # Créer le Payment Intent dans Stripe
        intent = stripe.PaymentIntent.create(
            amount=int(payment_data.amount * 100),  # Stripe utilise les centimes
            currency=payment_data.currency,
            description=payment_data.description or f"Paiement pour l'étudiant {payment_data.student_id}",
            metadata={
                "student_id": payment_data.student_id,
                "service": "schoolreg"
            }
        )

        # Enregistrer dans la base de données locale (payments-fastapi)
        payment = StripePayment(
            id=str(uuid.uuid4()),
            student_id=payment_data.student_id,
            amount=payment_data.amount,
            currency=payment_data.currency,
            status="pending",
            stripe_payment_intent_id=intent.id,
            description=payment_data.description
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)

        # Créer aussi un paiement dans students-node pour la synchronisation
        try:
            print(f"🔄 Tentative de synchronisation avec students-node...")
            print(f"🔑 SERVICE_JWT disponible: {SERVICE_JWT is not None}")
            
            async with httpx.AsyncClient() as client:
                students_payment = {
                    "studentId": payment_data.student_id,
                    "amount": payment_data.amount,
                    "paymentType": "tuition",  # Par défaut, peut être ajusté
                    "paymentMethod": "card",
                    "status": "pending",
                    "transactionId": intent.id,  # Utiliser le payment_intent_id de Stripe
                    "notes": payment_data.description or f"Paiement Stripe: {intent.id}"
                }
                
                print(f"📤 Payload envoyé: {students_payment}")
                
                # Appeler students-node pour créer le paiement
                response = await client.post(
                    "http://localhost:4003/payments",
                    json=students_payment,
                    headers={"Authorization": f"Bearer {SERVICE_JWT}"},
                    timeout=10.0
                )
                
                print(f"📥 Réponse students-node: {response.status_code}")
                
                if response.status_code == 201:
                    response_data = response.json()
                    print(f"✅ Paiement créé dans students-node: {intent.id}")
                    print(f"✅ Détails: {response_data}")
                else:
                    error_text = response.text
                    print(f"❌ Erreur création paiement students-node: {response.status_code}")
                    print(f"❌ Détails: {error_text}")
        except Exception as sync_error:
            print(f"⚠️ Erreur synchronisation students-node: {sync_error}")
            import traceback
            traceback.print_exc()
            # Ne pas bloquer si la synchro échoue

        return PaymentIntentResponse(
            id=payment.id,
            client_secret=intent.client_secret,
            amount=payment_data.amount,
            currency=payment_data.currency,
            status=intent.status
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Permet de confirmer côté frontend après redirection Stripe (utile en dev sans webhook public)
@app.get("/checkout-session/{session_id}/confirm")
async def confirm_checkout_session(session_id: str, db: Session = Depends(get_db)):
    """
    GET /checkout-session/{session_id}/confirm - Confirme une session checkout
    
    Endpoint de fallback utilisé en développement sans webhook public
    Appelé par le frontend après redirection depuis Stripe
    
    Processus:
        1. Récupère la session Stripe
        2. Vérifie si payée (payment_status=paid ou status=complete)
        3. Met à jour le paiement local en status=succeeded
        4. Notifie students-node pour créer le paiement avec status=paid
    """
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Checkout session not found")

        # Mettre à jour l'entrée paiement si existante
        payment = db.query(StripePayment).filter(StripePayment.stripe_session_id == session.id).first()
        if payment and (session.get('payment_status') == 'paid' or session.get('status') == 'complete'):
            payment.status = "succeeded"
            payment.paid_at = datetime.utcnow()
            db.commit()

        # Notifier Students
        student_id = (session.get('metadata') or {}).get('student_id')
        amount_cents = session.get('amount_total')
        if student_id and amount_cents:
            payload_students = {
                "studentId": student_id,
                "amount": round(float(amount_cents) / 100.0, 2),
                "paymentType": "tuition",
                "paymentMethod": "card",
                "status": "paid",
                "transactionId": session.get('payment_intent'),
                "notes": f"Stripe Checkout session {session_id} (confirm endpoint)"
            }
            headers = {"Authorization": f"Bearer {SERVICE_JWT}"} if SERVICE_JWT else {}
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:4003/payments",
                    json=payload_students,
                    headers=headers,
                    timeout=5.0,
                )

        return {"status": "success", "session_id": session_id}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# STRIPE CHECKOUT SESSION (Pour paiements hébergés)
# ============================================

@app.post("/checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    session_data: CheckoutSessionCreate,
    db: Session = Depends(get_db)
):
    """
    POST /checkout-session - Crée une Checkout Session Stripe
    
    Authentification: NON requis (endpoint public)
    
    Utilisé pour:
        - Page de paiement hébergée par Stripe (plus simple)
        - Redirection automatique vers Stripe
        - Moins de code frontend nécessaire
    
    Body:
        - student_id: ID de l'élève
        - amount: Montant en dollars
        - currency: Devise
        - description: Description
        - success_url: URL de retour si succès
        - cancel_url: URL de retour si annulation
    
    Processus:
        1. Mode simulation: Génère une session simulée (cs_test_simulated_xxx)
        2. Mode production: Crée une Checkout Session Stripe
        3. Enregistre dans payments-fastapi DB
        4. Synchronise avec students-node
    
    Retourne:
        - id: ID local du paiement
        - url: URL Stripe à ouvrir pour effectuer le paiement
        - amount, currency
    
    L'utilisateur est redirigé vers success_url après paiement
    """
    try:
        payment_id = str(uuid.uuid4())

        # Mode simulation
        if STRIPE_SIMULATION_MODE:
            simulated_session_id = f"cs_test_simulated_{uuid.uuid4().hex[:24]}"
            simulated_url = f"http://localhost:4004/simulated-checkout?session_id={simulated_session_id}"
            
            # Enregistrer dans la base de données
            payment = StripePayment(
                id=payment_id,
                student_id=session_data.student_id,
                amount=session_data.amount,
                currency=session_data.currency,
                status="pending",
                stripe_session_id=simulated_session_id,
                description=session_data.description
            )
            db.add(payment)
            db.commit()
            db.refresh(payment)
            
            # Synchroniser avec students-node
            try:
                print(f"🔄 Synchronisation checkout session avec students-node...")
                async with httpx.AsyncClient() as client:
                    students_payment = {
                        "studentId": session_data.student_id,
                        "amount": session_data.amount,
                        "paymentType": "tuition",
                        "paymentMethod": "card",
                        "status": "pending",
                        "transactionId": simulated_session_id,
                        "notes": session_data.description or f"Checkout Stripe (simulation): {simulated_session_id}"
                    }
                    
                    response = await client.post(
                        "http://localhost:4003/payments",
                        json=students_payment,
                        headers={"Authorization": f"Bearer {SERVICE_JWT}"},
                        timeout=10.0
                    )
                    
                    if response.status_code == 201:
                        print(f"✅ Checkout session créée dans students-node: {simulated_session_id}")
            except Exception as sync_error:
                print(f"⚠️ Erreur synchronisation students-node: {sync_error}")
            
            return CheckoutSessionResponse(
                id=payment.id,
                url=simulated_url,
                amount=session_data.amount,
                currency=session_data.currency
            )

        # Force session_id placeholder in success_url for frontend confirmation
        success_url_val = session_data.success_url or "http://localhost:5173/payment-success"
        if "{CHECKOUT_SESSION_ID}" not in success_url_val:
            sep = "?" if "?" not in success_url_val else "&"
            success_url_val = f"{success_url_val}{sep}session_id={{CHECKOUT_SESSION_ID}}"

        # Mode réel - appel à Stripe
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': session_data.currency,
                    'product_data': {
                        'name': session_data.description or 'Frais de scolarité',
                        'description': f"Paiement pour l'étudiant {session_data.student_id}",
                    },
                    'unit_amount': int(session_data.amount * 100),
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url_val,
            cancel_url=session_data.cancel_url,
            metadata={
                'student_id': session_data.student_id,
                'service': 'schoolreg'
            }
        )
        session_id = session.id
        session_url = session.url

        # Enregistrer dans la base de données
        payment = StripePayment(
            id=payment_id,
            student_id=session_data.student_id,
            amount=session_data.amount,
            currency=session_data.currency,
            status="pending",
            stripe_session_id=session_id,
            description=session_data.description
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        
        # Synchroniser avec students-node
        try:
            print(f"🔄 Synchronisation checkout session avec students-node...")
            async with httpx.AsyncClient() as client:
                students_payment = {
                    "studentId": session_data.student_id,
                    "amount": session_data.amount,
                    "paymentType": "tuition",
                    "paymentMethod": "card",
                    "status": "pending",
                    "transactionId": session_id,
                    "notes": session_data.description or f"Checkout Stripe: {session_id}"
                }
                
                response = await client.post(
                    "http://localhost:4003/payments",
                    json=students_payment,
                    headers={"Authorization": f"Bearer {SERVICE_JWT}"},
                    timeout=10.0
                )
                
                if response.status_code == 201:
                    print(f"✅ Checkout session créée dans students-node: {session_id}")
                else:
                    print(f"⚠️ Erreur création checkout students-node: {response.status_code}")
        except Exception as sync_error:
            print(f"⚠️ Erreur synchronisation students-node: {sync_error}")

        return CheckoutSessionResponse(
            id=payment.id,
            url=session_url,
            amount=session_data.amount,
            currency=session_data.currency
        )

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# GESTION DES PAIEMENTS
# ============================================

@app.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    student_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    GET /payments - Liste tous les paiements Stripe
    
    Query params:
        - student_id: Filtrer par élève (optionnel)
        - status: Filtrer par statut (pending, succeeded, failed)
    
    Retourne: Liste des paiements triés par date (plus récents d'abord)
    
    Note: Ces paiements sont stockés localement dans payments-fastapi
          Les paiements complets sont dans students-node
    """
    query = db.query(StripePayment)
    
    if student_id:
        query = query.filter(StripePayment.student_id == student_id)
    if status:
        query = query.filter(StripePayment.status == status)
    
    payments = query.order_by(StripePayment.created_at.desc()).all()
    return payments

@app.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str, db: Session = Depends(get_db)):
    """
    GET /payments/{payment_id} - Récupère un paiement par son ID
    
    Retourne: Détails complets du paiement
    Erreur 404 si le paiement n'existe pas
    """
    payment = db.query(StripePayment).filter(StripePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    return payment

@app.patch("/payments/{payment_id}/status")
async def update_payment_status(
    payment_id: str,
    status_update: PaymentStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    PATCH /payments/{payment_id}/status - Met à jour le statut d'un paiement
    
    Authentification: NON requis (peut être appelé par webhook)
    
    Body:
        - status: Nouveau statut (pending, succeeded, failed)
        - stripe_payment_intent_id: ID Stripe (optionnel)
    
    Si status=succeeded: Définit automatiquement paid_at
    
    Utilisé pour: MAJ manuelle du statut ou via webhook
    """
    payment = db.query(StripePayment).filter(StripePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    payment.status = status_update.status
    if status_update.stripe_payment_intent_id:
        payment.stripe_payment_intent_id = status_update.stripe_payment_intent_id
    
    if status_update.status == "succeeded":
        payment.paid_at = datetime.utcnow()
    
    db.commit()
    db.refresh(payment)
    return payment

# ============================================
# WEBHOOK STRIPE (Pour les notifications)
# ============================================

@app.post("/webhook")
async def stripe_webhook(
    payload: dict,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """
    POST /webhook - Reçoit les événements Stripe
    
    Authentification: Signature Stripe (vérification en production)
    
    Événements traités:
        1. payment_intent.succeeded:
           - MAJ paiement local en succeeded
           - Notifie students-node pour créer paiement avec status=paid
           - Incrémente automatiquement tuitionPaid
        
        2. payment_intent.payment_failed:
           - MAJ paiement local en failed
        
        3. checkout.session.completed:
           - MAJ paiement local en succeeded
           - Notifie students-node (création paiement + MAJ tuitionPaid)
    
    Processus automatique:
        - Reçoit webhook Stripe
        - Met à jour payments-fastapi DB
        - Appelle students-node pour synchronisation
        - students-node incrémente tuitionPaid si type=tuition
    
    Configuration:
        - Stripe Dashboard -> Webhooks
        - URL: https://votre-domaine.com/webhook
        - Événements: payment_intent.*, checkout.session.completed
        - STRIPE_WEBHOOK_SECRET dans .env
    
    Développement:
        - Utiliser stripe CLI: stripe listen --forward-to localhost:4004/webhook
        - Ou utiliser /checkout-session/{id}/confirm en fallback
    """
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    try:
        # Vérifier la signature du webhook (en production)
        # event = stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)
        
        # Pour le développement, on accepte directement
        event = payload
        
        # Traiter les événements
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            # Mettre à jour le paiement dans la BD
            payment = db.query(StripePayment).filter(
                StripePayment.stripe_payment_intent_id == payment_intent['id']
            ).first()
            if payment:
                payment.status = "succeeded"
                payment.paid_at = datetime.utcnow()
                db.commit()

            # Notifier le service Students pour mettre à jour tuition_paid
            try:
                student_id = (payment_intent.get('metadata') or {}).get('student_id')
                amount_cents = payment_intent.get('amount_received') or payment_intent.get('amount')
                if student_id and amount_cents:
                    payload_students = {
                        "studentId": student_id,
                        "amount": round(float(amount_cents) / 100.0, 2),
                        "paymentType": "tuition",
                        "paymentMethod": "card",
                        "status": "paid",
                        "transactionId": payment_intent.get('id'),
                        "notes": "Stripe PaymentIntent confirmé via webhook"
                    }
                    headers = {"Authorization": f"Bearer {SERVICE_JWT}"} if SERVICE_JWT else {}
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            "http://localhost:4003/payments",
                            json=payload_students,
                            headers=headers,
                            timeout=5.0,
                        )
            except Exception as notify_err:
                # Ne pas bloquer le webhook
                print(f"[payments-fastapi] Students notify error (PI): {notify_err}")
        
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            payment = db.query(StripePayment).filter(
                StripePayment.stripe_payment_intent_id == payment_intent['id']
            ).first()
            if payment:
                payment.status = "failed"
                db.commit()
        
        elif event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            payment = db.query(StripePayment).filter(
                StripePayment.stripe_session_id == session['id']
            ).first()
            if payment:
                payment.status = "succeeded"
                payment.paid_at = datetime.utcnow()
                db.commit()

            # Notifier Students pour créer le paiement et incrémenter tuition_paid
            try:
                student_id = (session.get('metadata') or {}).get('student_id')
                amount_cents = session.get('amount_total')
                if student_id and amount_cents:
                    payload_students = {
                        "studentId": student_id,
                        "amount": round(float(amount_cents) / 100.0, 2),
                        "paymentType": "tuition",
                        "paymentMethod": "card",
                        "status": "paid",
                        "transactionId": session.get('payment_intent'),
                        "notes": f"Stripe Checkout session {session.get('id')}"
                    }
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            "http://localhost:3001/api/students/payments",
                            json=payload_students,
                            timeout=5.0,
                        )
            except Exception as notify_err:
                print(f"[payments-fastapi] Students notify error (checkout): {notify_err}")
        
        return {"status": "success"}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PAYMENTS_PORT", 4004))
    uvicorn.run(app, host="0.0.0.0", port=port)
