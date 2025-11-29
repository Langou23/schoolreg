from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base

class StripePayment(Base):
    __tablename__ = "stripe_payments"

    id = Column(String, primary_key=True)
    student_id = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="usd")
    status = Column(String, nullable=False)  # pending, succeeded, failed, canceled
    stripe_payment_intent_id = Column(String, unique=True)
    stripe_session_id = Column(String, unique=True)
    description = Column(String)
    payment_metadata = Column(String)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    paid_at = Column(DateTime(timezone=True))
