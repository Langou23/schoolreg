import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Body
from datetime import datetime
from uuid import uuid4
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, joinedload
import stripe

try:
    from .models import Base, Student, Enrollment, Payment, Class
except ImportError:
    from models import Base, Student, Enrollment, Payment, Class


def load_root_env():
    p = Path(__file__).resolve()
    for parent in [p.parent, *p.parents]:
        env = parent / ".env"
        if env.exists():
            load_dotenv(env)
            return str(env)
    return None


load_root_env()

app = FastAPI(title="students-node")
origins = [o.strip() for o in (os.getenv("CORS_ORIGIN") or "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:123@localhost:5432/schoolreg")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

PORT = int(os.getenv("STUDENTS_PORT", "4002"))

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def serialize_class(c: Class) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "level": c.level,
        "capacity": c.capacity,
        "currentStudents": c.current_students,
        "schedule": c.schedule,
        "room": c.room,
        "teacherName": c.teacher_name,
        "session": c.session,
        "createdAt": c.created_at.isoformat() if c.created_at else None,
        "updatedAt": c.updated_at.isoformat() if c.updated_at else None,
    }


def serialize_enrollment(e: Enrollment, include_class: bool = True, include_student: bool = True) -> dict:
    result = {
        "id": e.id,
        "studentId": e.student_id,
        "classId": e.class_id,
        "enrollmentDate": e.enrollment_date.isoformat() if e.enrollment_date else None,
        "status": e.status.value if e.status else None,
        "grade": e.grade,
        "attendance": e.attendance,
        "createdAt": e.created_at.isoformat() if e.created_at else None,
        "updatedAt": e.updated_at.isoformat() if e.updated_at else None,
    }
    if include_student and e.student:
        result["student"] = serialize_student(e.student, include_relations=False)
    if include_class and e.class_:
        result["class"] = serialize_class(e.class_)
    return result


def serialize_payment(p: Payment, include_student: bool = False) -> dict:
    result = {
        "id": p.id,
        "studentId": p.student_id,
        "amount": p.amount,
        "paymentType": p.payment_type.value if p.payment_type else None,
        "paymentMethod": p.payment_method,
        "status": p.status.value if p.status else None,
        "transactionId": p.transaction_id,
        "notes": p.notes,
        "paymentDate": p.payment_date.isoformat() if p.payment_date else None,
        "dueDate": p.due_date.isoformat() if p.due_date else None,
        "userId": p.user_id,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
        "updatedAt": p.updated_at.isoformat() if p.updated_at else None,
    }
    if include_student and p.student:
        result["student"] = serialize_student(p.student, include_relations=False)
    return result


def serialize_student(s: Student, include_relations: bool = True) -> dict:
    result = {
        "id": s.id,
        "firstName": s.first_name,
        "lastName": s.last_name,
        "dateOfBirth": s.date_of_birth.isoformat() if s.date_of_birth else None,
        "gender": s.gender.value if s.gender else None,
        "address": s.address,
        "parentName": s.parent_name,
        "parentPhone": s.parent_phone,
        "parentEmail": s.parent_email,
        "program": s.program,
        "session": s.session,
        "secondaryLevel": s.secondary_level,
        "status": s.status.value if s.status else None,
        "tuitionAmount": s.tuition_amount,
        "tuitionPaid": s.tuition_paid,
        "enrollmentDate": s.enrollment_date.isoformat() if s.enrollment_date else None,
        "sessionStartDate": s.session_start_date.isoformat() if s.session_start_date else None,
        "registrationDeadline": s.registration_deadline.isoformat() if s.registration_deadline else None,
        "applicationId": s.application_id,
        "userId": s.user_id,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
    }
    if include_relations:
        result["enrollments"] = [serialize_enrollment(e, include_class=True) for e in (s.enrollments or [])]
        result["payments"] = [serialize_payment(p, include_student=False) for p in (s.payments or [])]
    return result


@app.get("/health")
async def health():
    return {"status": "ok", "service": "students-node"}


@app.get("/students")
async def list_students(
    parentEmail: Optional[str] = None,
    status: Optional[str] = None,
    program: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Student).options(
            joinedload(Student.enrollments).joinedload(Enrollment.class_),
            joinedload(Student.payments)
        )
        if parentEmail:
            query = query.filter(Student.parent_email == parentEmail)
        if status:
            query = query.filter(Student.status == status)
        if program:
            query = query.filter(Student.program == program)
        students = query.order_by(Student.created_at.desc()).all()
        return [serialize_student(s, include_relations=True) for s in students]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")


@app.get("/students/{student_id}")
async def get_student(student_id: str, db: Session = Depends(get_db)):
    try:
        student = db.query(Student).options(
            joinedload(Student.enrollments).joinedload(Enrollment.class_),
            joinedload(Student.payments)
        ).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        return serialize_student(student, include_relations=True)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch student: {str(e)}")


@app.get("/enrollments")
async def list_enrollments(
    classId: Optional[str] = None,
    studentId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        query = db.query(Enrollment).options(
            joinedload(Enrollment.student),
            joinedload(Enrollment.class_)
        )
        
        # Filter by classId if provided
        if classId:
            query = query.filter(Enrollment.class_id == classId)
        
        # Filter by studentId if provided
        if studentId:
            query = query.filter(Enrollment.student_id == studentId)
        
        enrollments = query.all()
        return [serialize_enrollment(e, include_class=True, include_student=True) for e in enrollments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch enrollments: {str(e)}")


@app.get("/payments")
async def list_payments(studentId: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        query = db.query(Payment).options(joinedload(Payment.student))
        if studentId:
            query = query.filter(Payment.student_id == studentId)
        payments = query.order_by(Payment.payment_date.desc()).all()
        return [serialize_payment(p, include_student=True) for p in payments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch payments: {str(e)}")


@app.post("/students")
async def create_student(payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        required = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'address', 'parentName', 'parentPhone', 'program', 'session', 'secondaryLevel', 'tuitionAmount']
        for field in required:
            if field not in payload:
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        student_data = {
            'id': str(uuid4()),
            'first_name': payload['firstName'],
            'last_name': payload['lastName'],
            'date_of_birth': datetime.fromisoformat(payload['dateOfBirth'].replace('Z', '+00:00')),
            'gender': payload['gender'],
            'address': payload['address'],
            'parent_name': payload['parentName'],
            'parent_phone': payload['parentPhone'],
            'parent_email': payload.get('parentEmail', ''),
            'program': payload['program'],
            'session': payload['session'],
            'secondary_level': payload['secondaryLevel'],
            'status': payload.get('status', 'pending'),
            'tuition_amount': float(payload['tuitionAmount']),
            'tuition_paid': float(payload.get('tuitionPaid', 0)),
            'enrollment_date': datetime.utcnow(),
            'application_id': payload.get('applicationId'),
            'user_id': payload.get('userId'),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        student = Student(**student_data)
        db.add(student)
        db.commit()
        db.refresh(student)
        return serialize_student(student, include_relations=False)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create student: {str(e)}")


@app.put("/students/{student_id}")
async def update_student(student_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Garder les anciennes valeurs pour comparaison
        old_values = {
            'status': student.status.value if student.status else None,
            'tuitionPaid': student.tuition_paid
        }
        
        allowed_fields = {'firstName': 'first_name', 'lastName': 'last_name', 'address': 'address', 
                         'parentName': 'parent_name', 'parentPhone': 'parent_phone', 'parentEmail': 'parent_email',
                         'status': 'status', 'tuitionPaid': 'tuition_paid', 'program': 'program', 
                         'session': 'session', 'secondaryLevel': 'secondary_level'}
        
        changes = []
        for key, db_key in allowed_fields.items():
            if key in payload:
                old_val = getattr(student, db_key, None)
                new_val = payload[key]
                if old_val != new_val:
                    changes.append(f"{key}: {old_val} → {new_val}")
                setattr(student, db_key, payload[key])
        
        student.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(student)
        
        # Envoyer notification si des changements importants
        if changes:
            try:
                import httpx
                notification_data = {
                    "type": "student_update",
                    "title": f"📝 Mise à jour élève: {student.first_name} {student.last_name}",
                    "message": f"Modifications: {', '.join(changes[:3])}" + (" et plus..." if len(changes) > 3 else "")
                }
                async with httpx.AsyncClient() as client:
                    await client.post(
                        "http://localhost:4005/notifications",
                        json=notification_data,
                        timeout=5.0
                    )
            except Exception as notif_error:
                # Ne pas bloquer la mise à jour si la notification échoue
                print(f"Failed to send notification: {notif_error}")
        
        return serialize_student(student, include_relations=False)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update student: {str(e)}")


@app.delete("/students/{student_id}")
async def delete_student(student_id: str, db: Session = Depends(get_db)):
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        db.delete(student)
        db.commit()
        return {"message": "Student deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete student: {str(e)}")


@app.post("/enrollments")
async def create_enrollment(payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        if 'studentId' not in payload or 'classId' not in payload:
            raise HTTPException(status_code=400, detail="Missing studentId or classId")
        
        enrollment_data = {
            'id': str(uuid4()),
            'student_id': payload['studentId'],
            'class_id': payload['classId'],
            'enrollment_date': datetime.utcnow(),
            'status': payload.get('status', 'active'),
            'grade': payload.get('grade'),
            'attendance': payload.get('attendance', 0.0),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        enrollment = Enrollment(**enrollment_data)
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        return serialize_enrollment(enrollment, include_class=False)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create enrollment: {str(e)}")


@app.post("/payments")
async def create_payment(payload: dict = Body(...), db: Session = Depends(get_db)):
    try:
        required = ['studentId', 'amount', 'paymentType', 'paymentMethod']
        for field in required:
            if field not in payload:
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        payment_data = {
            'id': str(uuid4()),
            'student_id': payload['studentId'],
            'amount': float(payload['amount']),
            'payment_type': payload['paymentType'],
            'payment_method': payload['paymentMethod'],
            'status': payload.get('status', 'pending'),
            'transaction_id': payload.get('transactionId'),
            'notes': payload.get('notes'),
            'payment_date': datetime.utcnow(),
            'due_date': datetime.fromisoformat(payload['dueDate'].replace('Z', '+00:00')) if payload.get('dueDate') else None,
            'user_id': payload.get('userId'),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        payment = Payment(**payment_data)
        db.add(payment)
        
        # Mettre à jour tuition_paid si c'est un paiement de scolarité
        if payload['paymentType'] == 'tuition' and payload.get('status') == 'paid':
            student = db.query(Student).filter(Student.id == payload['studentId']).first()
            if student:
                student.tuition_paid = (student.tuition_paid or 0) + float(payload['amount'])
                student.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(payment)
        
        # Envoyer notification
        try:
            import httpx
            student = db.query(Student).filter(Student.id == payload['studentId']).first()
            student_name = f"{student.first_name} {student.last_name}" if student else "Élève"
            
            # Déterminer l'icône et le message selon la méthode de paiement
            payment_method = payload.get('paymentMethod', 'cash')
            method_icons = {
                'cash': '💵',
                'card': '💳',
                'bank_transfer': '🏦',
                'online': '🌐',
                'mobile_money': '📱'
            }
            icon = method_icons.get(payment_method, '💰')
            
            method_labels = {
                'cash': 'Espèces',
                'card': 'Carte bancaire',
                'bank_transfer': 'Virement bancaire',
                'online': 'Paiement en ligne',
                'mobile_money': 'Mobile Money'
            }
            method_label = method_labels.get(payment_method, payment_method)
            
            notification_data = {
                "type": "payment_received",
                "title": f"{icon} Nouveau paiement: {student_name}",
                "message": f"Montant: {float(payload['amount']):,.2f} $ CA - Type: {payload['paymentType']} - Méthode: {method_label}",
                "userId": "admin"
            }
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:4006/notifications",
                    json=notification_data,
                    timeout=5.0
                )
        except Exception as notif_error:
            print(f"Failed to send notification: {notif_error}")
        
        return serialize_payment(payment, include_student=False)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create payment: {str(e)}")


@app.post("/payments/create-payment-intent")
async def create_payment_intent(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Créer un Payment Intent Stripe pour un paiement
    """
    try:
        required = ['amount', 'currency', 'studentId', 'paymentType']
        for field in required:
            if field not in payload:
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        # Vérifier que l'élève existe
        student = db.query(Student).filter(Student.id == payload['studentId']).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Créer le Payment Intent avec Stripe
        payment_intent = stripe.PaymentIntent.create(
            amount=int(payload['amount']),  # Montant en centimes
            currency=payload['currency'].lower(),
            metadata={
                'student_id': payload['studentId'],
                'student_name': payload.get('metadata', {}).get('studentName', f"{student.first_name} {student.last_name}"),
                'payment_type': payload['paymentType'],
            },
            description=f"Paiement {payload['paymentType']} pour {student.first_name} {student.last_name}",
        )
        
        # Créer un enregistrement de paiement en attente dans la DB
        payment_data = {
            'id': str(uuid4()),
            'student_id': payload['studentId'],
            'amount': float(payload['amount']) / 100,  # Convertir de centimes en unité
            'payment_type': payload['paymentType'],
            'payment_method': 'card',
            'status': 'pending',
            'transaction_id': payment_intent.id,
            'notes': f"Stripe Payment Intent: {payment_intent.id}",
            'payment_date': datetime.utcnow(),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        payment = Payment(**payment_data)
        db.add(payment)
        db.commit()
        
        return {
            'clientSecret': payment_intent.client_secret,
            'paymentIntentId': payment_intent.id,
            'paymentId': payment.id
        }
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create payment intent: {str(e)}")


@app.post("/payments/confirm-stripe")
async def confirm_stripe_payment(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Confirmer un paiement Stripe immédiatement (sans attendre le webhook)
    """
    try:
        payment_intent_id = payload.get('paymentIntentId')
        student_id = payload.get('studentId')
        
        if not payment_intent_id:
            raise HTTPException(status_code=400, detail="Missing paymentIntentId")
        
        # Trouver le paiement dans la DB
        payment = db.query(Payment).filter(Payment.transaction_id == payment_intent_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Vérifier que le paiement n'est pas déjà confirmé
        if payment.status == 'paid':
            return {"status": "already_confirmed", "message": "Payment already confirmed"}
        
        # Mettre à jour le statut du paiement
        payment.status = 'paid'
        payment.updated_at = datetime.utcnow()
        
        # Mettre à jour tuition_paid si c'est un paiement de scolarité
        student = db.query(Student).filter(Student.id == payment.student_id).first()
        if student and payment.payment_type == 'tuition':
            student.tuition_paid = (student.tuition_paid or 0) + payment.amount
            student.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Envoyer notification immédiate
        try:
            import httpx
            student_name = f"{student.first_name} {student.last_name}" if student else "Élève"
            
            notification_data = {
                "type": "payment_received",
                "title": f"💳 Paiement Stripe reçu: {student_name}",
                "message": f"Montant: {payment.amount:,.2f} CAD - Type: {payment.payment_type} - Statut: Confirmé ✅",
                "userId": "admin"  # Notifier tous les admins
            }
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:4006/notifications",
                    json=notification_data,
                    timeout=5.0
                )
        except Exception as notif_error:
            print(f"Failed to send notification: {notif_error}")
        
        return {
            "status": "success",
            "payment": serialize_payment(payment, include_student=True),
            "student": serialize_student(student) if student else None
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to confirm payment: {str(e)}")


@app.post("/payments/webhook")
async def stripe_webhook(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Webhook Stripe pour confirmer les paiements
    """
    try:
        event_type = payload.get('type')
        
        if event_type == 'payment_intent.succeeded':
            payment_intent = payload.get('data', {}).get('object', {})
            payment_intent_id = payment_intent.get('id')
            
            # Trouver le paiement dans la DB
            payment = db.query(Payment).filter(Payment.transaction_id == payment_intent_id).first()
            if payment:
                # Mettre à jour le statut
                payment.status = 'paid'
                payment.updated_at = datetime.utcnow()
                
                # Mettre à jour tuition_paid si c'est un paiement de scolarité
                if payment.payment_type == 'tuition':
                    student = db.query(Student).filter(Student.id == payment.student_id).first()
                    if student:
                        student.tuition_paid = (student.tuition_paid or 0) + payment.amount
                        student.updated_at = datetime.utcnow()
                
                db.commit()
                
                # Envoyer notification
                try:
                    import httpx
                    student = db.query(Student).filter(Student.id == payment.student_id).first()
                    student_name = f"{student.first_name} {student.last_name}" if student else "Élève"
                    
                    notification_data = {
                        "type": "payment_received",
                        "title": f"💳 Paiement Stripe confirmé: {student_name}",
                        "message": f"Montant: {payment.amount:,.2f} $ CA - Type: {payment.payment_type}"
                    }
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            "http://localhost:4005/notifications",
                            json=notification_data,
                            timeout=5.0
                        )
                except Exception as notif_error:
                    print(f"Failed to send notification: {notif_error}")
        
        return {"status": "success"}
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}


@app.get("/dashboard/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get statistics for admin dashboard"""
    try:
        from sqlalchemy import func
        
        # Total students by status
        total_students = db.query(func.count(Student.id)).scalar()
        active_students = db.query(func.count(Student.id)).filter(Student.status == 'active').scalar()
        pending_students = db.query(func.count(Student.id)).filter(Student.status == 'pending').scalar()
        inactive_students = db.query(func.count(Student.id)).filter(Student.status == 'inactive').scalar()
        
        # Total enrollments
        total_enrollments = db.query(func.count(Enrollment.id)).scalar()
        active_enrollments = db.query(func.count(Enrollment.id)).filter(Enrollment.status == 'active').scalar()
        
        # Payment statistics
        total_payments = db.query(func.count(Payment.id)).scalar()
        paid_payments = db.query(func.count(Payment.id)).filter(Payment.status == 'paid').scalar()
        pending_payments = db.query(func.count(Payment.id)).filter(Payment.status == 'pending').scalar()
        
        total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == 'paid').scalar() or 0
        pending_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == 'pending').scalar() or 0
        
        # Tuition statistics
        total_tuition = db.query(func.sum(Student.tuition_amount)).scalar() or 0
        total_tuition_paid = db.query(func.sum(Student.tuition_paid)).scalar() or 0
        
        return {
            "students": {
                "total": total_students,
                "active": active_students,
                "pending": pending_students,
                "inactive": inactive_students
            },
            "enrollments": {
                "total": total_enrollments,
                "active": active_enrollments
            },
            "payments": {
                "total": total_payments,
                "paid": paid_payments,
                "pending": pending_payments
            },
            "revenue": {
                "total": float(total_revenue),
                "pending": float(pending_revenue),
                "tuitionTotal": float(total_tuition),
                "tuitionPaid": float(total_tuition_paid),
                "tuitionOutstanding": float(total_tuition - total_tuition_paid)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard stats: {str(e)}")


# Lancement recommandé:
#   uvicorn app.main:app --port %STUDENTS_PORT%

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("STUDENTS_PORT", 4002))
    uvicorn.run(app, host="0.0.0.0", port=port)
