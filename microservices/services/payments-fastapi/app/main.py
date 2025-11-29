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

# Charger les variables d'environnement
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path, override=True)

# Configuration Stripe
stripe_key = os.getenv("STRIPE_SECRET_KEY")
if not stripe_key:
    print(f"⚠️ ATTENTION: Clé Stripe manquante dans .env!")
    print(f"Fichier .env: {env_path}")
    # Utiliser une clé de test factice en développement
    stripe_key = "sk_test_CHANGE_ME_IN_PRODUCTION"
    
stripe.api_key = stripe_key
print(f"✅ Stripe configuré avec clé: {stripe_key[:7]}...***")


# Créer les tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payments Service", version="1.0.0")

# CORS
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
    Créer un Payment Intent Stripe pour un paiement direct
    (utilisé avec Stripe Elements dans le frontend)
    """
    try:
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

        # Enregistrer dans la base de données
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
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:4003/payments",
                    json=payload_students,
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
    Créer une Checkout Session Stripe (page de paiement hébergée par Stripe)
    Plus simple pour l'utilisateur - redirige vers Stripe
    """
    try:
        payment_id = str(uuid.uuid4())

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
    """Lister tous les paiements avec filtres optionnels"""
    query = db.query(StripePayment)
    
    if student_id:
        query = query.filter(StripePayment.student_id == student_id)
    if status:
        query = query.filter(StripePayment.status == status)
    
    payments = query.order_by(StripePayment.created_at.desc()).all()
    return payments

@app.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str, db: Session = Depends(get_db)):
    """Récupérer un paiement spécifique"""
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
    """Mettre à jour le statut d'un paiement"""
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
    Webhook pour recevoir les événements Stripe
    (paiement réussi, échoué, etc.)
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
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            "http://localhost:4003/payments",
                            json=payload_students,
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
