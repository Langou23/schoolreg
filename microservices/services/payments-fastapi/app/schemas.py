from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentIntentCreate(BaseModel):
    student_id: str
    amount: float
    currency: str = "usd"
    description: Optional[str] = None

class PaymentIntentResponse(BaseModel):
    id: str
    client_secret: str
    amount: float
    currency: str
    status: str

class CheckoutSessionCreate(BaseModel):
    student_id: str
    amount: float
    currency: str = "usd"
    description: Optional[str] = None
    success_url: str
    cancel_url: str

class CheckoutSessionResponse(BaseModel):
    id: str
    url: str
    amount: float
    currency: str

class PaymentResponse(BaseModel):
    id: str
    student_id: str
    amount: float
    currency: str
    status: str
    stripe_payment_intent_id: Optional[str]
    stripe_session_id: Optional[str]
    description: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True

class PaymentStatusUpdate(BaseModel):
    status: str
    stripe_payment_intent_id: Optional[str] = None
