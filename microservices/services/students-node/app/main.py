import os
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Body, File, UploadFile, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func, or_, and_
from uuid import uuid4
from datetime import datetime
import base64
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, joinedload
import stripe
import jwt

try:
    from models import Base, Student, Enrollment, Payment, Class, Notification, Gender, StudentStatus, PaymentType, PaymentStatus, EnrollmentStatus, NotificationType, NotificationStatus
    from db_maintenance import run_startup_maintenance
except ImportError:
    from .models import Base, Student, Enrollment, Payment, Class, Notification, Gender, StudentStatus, PaymentType, PaymentStatus, EnrollmentStatus, NotificationType, NotificationStatus
    from .db_maintenance import run_startup_maintenance


# Fonction pour déduire la session à partir d'une date
def get_session_from_date(date: datetime) -> str:
    """
    Déduit la session académique à partir d'une date.
    Règles:
    - Septembre à Décembre: Automne YYYY
    - Janvier à Avril: Hiver YYYY
    - Mai à Août: Été YYYY
    """
    month = date.month
    year = date.year
    
    if 9 <= month <= 12:  # Septembre à Décembre
        return f"Automne {year}"
    elif 1 <= month <= 4:  # Janvier à Avril
        return f"Hiver {year}"
    else:  # Mai à Août
        return f"Été {year}"


def generate_student_code(db: Session) -> str:
    """
    Génère un code unique pour l'élève au format: SR2024-ABC123
    SR = SchoolReg, 2024 = année, ABC123 = code aléatoire
    """
    import random
    import string
    
    year = datetime.now().year
    
    while True:
        # Générer 6 caractères aléatoires (lettres majuscules + chiffres)
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = f"SR{year}-{random_part}"
        
        # Vérifier que le code n'existe pas déjà
        existing = db.query(Student).filter(Student.student_code == code).first()
        if not existing:
            return code


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

# Create tables (with new JSON columns)
Base.metadata.create_all(bind=engine)

# Maintenance automatique désactivée pour éviter le blocage au démarrage
# Utilisez l'endpoint POST /admin/maintenance/cleanup-enrollments pour nettoyer manuellement
# print("🔧 Exécution de la maintenance de la base de données...")
# try:
#     db = SessionLocal()
#     maintenance_result = run_startup_maintenance(db)
#     print(f"✅ Maintenance terminée: {maintenance_result}")
#     db.close()
# except Exception as e:
#     print(f"⚠️  Erreur lors de la maintenance: {e}")
#     print("   L'application continuera de fonctionner")

PORT = int(os.getenv("STUDENTS_PORT", "4003"))

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Ajoutez ensuite :
JWT_SECRET = os.getenv("JWT_SECRET", "default-secret")

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(*roles):
    def dependency(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return dependency


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
        
        # NOUVEAUX CHAMPS SYSTÈME QUÉBÉCOIS
        "courseGrades": e.course_grades,
        "quebecReportCard": e.quebec_report_card,
        "competenciesAssessment": e.competencies_assessment,
        "academicYear": e.academic_year,
        "semester": e.semester,
        
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
        "academicYear": p.academic_year,  # Ajouter l'année académique
        "userId": p.user_id,
        "createdAt": p.created_at.isoformat() if p.created_at else None,
        "updatedAt": p.updated_at.isoformat() if p.updated_at else None,
    }
    if include_student and p.student:
        result["student"] = serialize_student(p.student, include_relations=False)
    return result


def serialize_student(s: Student, include_relations: bool = True) -> dict:
    # Calculer les montants par type de frais à partir des paiements
    payments_by_type = {}
    total_pending = 0.0
    total_paid = 0.0
    
    if s.payments:
        for payment in s.payments:
            ptype = payment.payment_type.value if payment.payment_type else 'other'
            if ptype not in payments_by_type:
                payments_by_type[ptype] = {'pending': 0.0, 'paid': 0.0}
            
            if payment.status == PaymentStatus.paid:
                payments_by_type[ptype]['paid'] += payment.amount
                total_paid += payment.amount
            elif payment.status == PaymentStatus.pending:
                payments_by_type[ptype]['pending'] += payment.amount
                total_pending += payment.amount
    
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
        
        # CALCULS DES SOLDES PAR TYPE
        "feesByType": payments_by_type,
        "totalPending": total_pending,
        "totalPaid": total_paid,
        "totalBalance": total_pending,  # Le solde = ce qui reste à payer
        "enrollmentDate": s.enrollment_date.isoformat() if s.enrollment_date else None,
        "sessionStartDate": s.session_start_date.isoformat() if s.session_start_date else None,
        "registrationDeadline": s.registration_deadline.isoformat() if s.registration_deadline else None,
        "applicationId": s.application_id,
        "userId": s.user_id,
        "studentCode": s.student_code,  # Code unique pour la liaison
        
        # NOUVEAUX CHAMPS PROFIL COMPLET
        "emergencyContact": s.emergency_contact,
        "medicalInfo": s.medical_info,
        "academicHistory": s.academic_history,
        "preferences": s.preferences,
        "profilePhoto": s.profile_photo,
        "profileCompleted": s.profile_completed,
        "profileCompletionDate": s.profile_completion_date.isoformat() if s.profile_completion_date else None,
        
        "createdAt": s.created_at.isoformat() if s.created_at else None,
        "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
    }
    if include_relations:
        # Filtrer uniquement les inscriptions actives
        active_enrollments = [e for e in (s.enrollments or []) if e.status == EnrollmentStatus.active]
        result["enrollments"] = [serialize_enrollment(e, include_class=True) for e in active_enrollments]
        result["payments"] = [serialize_payment(p, include_student=False) for p in (s.payments or [])]
    return result


def serialize_notification(n: Notification, include_student: bool = False, include_payment: bool = False) -> dict:
    result = {
        "id": n.id,
        "userId": n.user_id,
        "studentId": n.student_id,
        "paymentId": n.payment_id,
        "title": n.title,
        "message": n.message,
        "type": n.type.value if n.type else None,
        "status": n.status.value if n.status else None,
        "priority": n.priority,
        "readAt": n.read_at.isoformat() if n.read_at else None,
        "emailSent": n.email_sent,
        "emailSentAt": n.email_sent_at.isoformat() if n.email_sent_at else None,
        "amount": n.amount,
        "dueDate": n.due_date.isoformat() if n.due_date else None,
        "createdAt": n.created_at.isoformat() if n.created_at else None,
        "updatedAt": n.updated_at.isoformat() if n.updated_at else None,
    }
    if include_student and n.student:
        result["student"] = serialize_student(n.student, include_relations=False)
    if include_payment and n.payment:
        result["payment"] = serialize_payment(n.payment, include_student=False)
    return result


@app.get("/health")
async def health():
    return {"status": "ok", "service": "students-node"}


@app.get("/students")
async def list_students(
    parentEmail: Optional[str] = None,
    status: Optional[str] = None,
    program: Optional[str] = None,
    withoutActiveClass: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)  # 🔒 AJOUT POUR EXIGER L’AUTHENTIFICATION
):
    try:
        query = db.query(Student).options(
            joinedload(Student.enrollments).joinedload(Enrollment.class_),
            joinedload(Student.payments)
        )

        if parentEmail:
            query = query.filter(Student.parent_email == parentEmail)

        if status:
            try:
                from models import StudentStatus as _SS
            except Exception:
                from .models import StudentStatus as _SS

            enum_status = _SS(status) if status else None
            if enum_status:
                query = query.filter(Student.status == enum_status)

        if program:
            query = query.filter(Student.program == program)

        students = query.order_by(Student.created_at.desc()).all()

        # 🔎 Filtrer les élèves sans classe active si demandé
        if withoutActiveClass:
            students_without_class = []
            for student in students:
                has_active_enrollment = any(
                    enrollment.status == EnrollmentStatus.active
                    for enrollment in student.enrollments
                )
                if not has_active_enrollment:
                    students_without_class.append(student)

            students = students_without_class

        # Retour des données sérialisées
        return [serialize_student(s, include_relations=True) for s in students]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch students: {str(e)}")



@app.get("/students/{student_id}")
async def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
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
    status: Optional[str] = "active",  # Par défaut, on retourne uniquement les inscriptions actives
    includeAll: Optional[bool] = False,  # Pour récupérer toutes les inscriptions si nécessaire
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
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
        
        # Filter by status (par défaut 'active', sauf si includeAll=True)
        if not includeAll and status:
            try:
                from models import EnrollmentStatus as _ES
            except Exception:
                from .models import EnrollmentStatus as _ES
            query = query.filter(Enrollment.status == _ES(status))
        
        enrollments = query.all()
        return [serialize_enrollment(e, include_class=True, include_student=True) for e in enrollments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch enrollments: {str(e)}")


@app.get("/payments")
async def list_payments(
    studentId: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    try:
        query = db.query(Payment).options(joinedload(Payment.student))
        if studentId:
            query = query.filter(Payment.student_id == studentId)
        payments = query.order_by(Payment.payment_date.desc()).all()
        return [serialize_payment(p, include_student=True) for p in payments]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch payments: {str(e)}")


@app.post("/students")
async def create_student(payload: dict = Body(...), db: Session = Depends(get_db), user: dict = Depends(require_role("admin","direction","system"))):
    try:
        required = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'address', 'parentName', 'parentPhone', 'program', 'session', 'secondaryLevel', 'tuitionAmount']
        for field in required:
            if field not in payload:
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        student_data = {
            'id': str(uuid4()),
            'first_name': payload['firstName'],
            'last_name': payload['lastName'],
            'date_of_birth': datetime.fromisoformat(payload['dateOfBirth'] if 'T' in payload['dateOfBirth'] else payload['dateOfBirth'] + 'T00:00:00+00:00'),
            # Accepter la valeur string du genre (ex: "Masculin"). Le mapping Enum est géré par SQLAlchemy/DB.
            'gender': payload['gender'],
            'address': payload['address'],
            'parent_name': payload['parentName'],
            'parent_phone': payload['parentPhone'],
            'parent_email': payload.get('parentEmail', ''),
            'program': payload['program'],
            'session': payload['session'],
            'secondary_level': payload['secondaryLevel'],
            'status': (StudentStatus(payload.get('status', 'pending')) if isinstance(payload.get('status', 'pending'), str) else payload.get('status', StudentStatus.pending)),
            'tuition_amount': float(payload['tuitionAmount']),
            # Ignorer toute tentative de définir tuitionPaid côté payload; ce champ est dérivé des paiements
            'tuition_paid': 0.0,
            'enrollment_date': datetime.utcnow(),
            'application_id': payload.get('applicationId'),
            'user_id': payload.get('userId'),
            'student_code': generate_student_code(db),  # Génération automatique du code unique
            
            # NOUVEAUX CHAMPS JSON du profil complet
            'emergency_contact': payload.get('emergencyContact'),
            'medical_info': payload.get('medicalInfo'),
            'academic_history': payload.get('academicHistory'),
            'preferences': payload.get('preferences'),
            'profile_photo': payload.get('profilePhoto'),
            'profile_completed': payload.get('profileCompleted', False),
            'profile_completion_date': datetime.fromisoformat(payload['profileCompletionDate'].replace('Z', '+00:00')) if payload.get('profileCompletionDate') and payload['profileCompletionDate'] else None,
            
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
async def update_student(student_id: str, payload: dict = Body(...), db: Session = Depends(get_db), user: dict = Depends(require_role("admin","direction","system"))):
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Garder les anciennes valeurs pour comparaison
        old_values = {
            'status': student.status.value if student.status else None,
            'tuitionPaid': student.tuition_paid,
            'tuitionAmount': student.tuition_amount  # Nécessaire pour calculer le solde correctement
        }
        # Conserver le montant payé avant toute modification (protection)
        original_paid = student.tuition_paid or 0.0
        
        allowed_fields = {'firstName': 'first_name', 'lastName': 'last_name', 'address': 'address', 
                         'parentName': 'parent_name', 'parentPhone': 'parent_phone', 'parentEmail': 'parent_email',
                         'status': 'status', 'tuitionAmount': 'tuition_amount',
                         'program': 'program', 'session': 'session', 'secondaryLevel': 'secondary_level',
                         # NOUVEAUX CHAMPS PROFIL COMPLET
                         'emergencyContact': 'emergency_contact', 'medicalInfo': 'medical_info', 
                         'academicHistory': 'academic_history', 'preferences': 'preferences',
                         'profilePhoto': 'profile_photo', 'profileCompleted': 'profile_completed'}
        
        changes = []
        # Champs JSON nécessitant une gestion spéciale
        json_fields = {'emergencyContact', 'medicalInfo', 'academicHistory', 'preferences'}

        # Ne jamais permettre la modification directe de tuitionPaid via update_student
        if 'tuitionPaid' in payload:
            payload.pop('tuitionPaid', None)
        
        for key, db_key in allowed_fields.items():
            if key in payload:
                old_val = getattr(student, db_key, None)
                new_val = payload[key]
                
                # Normaliser les champs numériques
                if db_key in ('tuition_amount',):
                    new_val = float(new_val) if (new_val is not None and new_val != '') else 0.0
                
                # Gestion spéciale pour les champs JSON
                if key in json_fields:
                    # Éviter la comparaison directe pour les JSON (peut causer des erreurs)
                    if new_val is not None:
                        changes.append(f"{key}: mise à jour")
                    setattr(student, db_key, new_val)
                else:
                    # Gestion normale pour les champs simples
                    # Mapper status string -> Enum
                    if db_key == 'status' and isinstance(new_val, str):
                        try:
                            new_val = StudentStatus(new_val)
                        except Exception:
                            pass
                    if old_val != new_val:
                        changes.append(f"{key}: {old_val} → {new_val}")
                    setattr(student, db_key, new_val)
        
        # Gérer profileCompletionDate séparément (conversion datetime)
        if 'profileCompletionDate' in payload:
            try:
                if payload['profileCompletionDate']:
                    student.profile_completion_date = datetime.fromisoformat(payload['profileCompletionDate'].replace('Z', '+00:00'))
                else:
                    student.profile_completion_date = None
            except (ValueError, TypeError) as e:
                # Ignorer les erreurs de conversion de datetime
                print(f"Erreur conversion profileCompletionDate: {e}")
        
        student.updated_at = datetime.utcnow()
        # Forcer la conservation du montant payé (aucune mise à jour directe via cet endpoint)
        student.tuition_paid = original_paid
        
        # Si tuitionAmount a augmenté, créer un paiement pending pour le solde
        if 'tuitionAmount' in payload:
            new_tuition = float(payload['tuitionAmount'])
            old_tuition = old_values.get('tuitionAmount', 0) or 0
            current_paid = student.tuition_paid or 0
            
            # Si le nouveau montant est supérieur à l'ancien ET qu'il reste un solde
            if new_tuition > old_tuition:
                new_balance = new_tuition - current_paid
                if new_balance > 0:
                    # Créer un paiement pending pour le solde
                    from uuid import uuid4
                    pending_payment = Payment(
                        id=str(uuid4()),
                        student_id=student.id,
                        amount=new_balance,
                        payment_type='tuition',
                        payment_method='pending',
                        status=PaymentStatus.pending,
                        notes=f'Solde restant après augmentation des frais de {old_tuition} à {new_tuition} $ CAD',
                        payment_date=datetime.utcnow(),
                        due_date=student.registration_deadline if student.registration_deadline else None,
                        academic_year=student.session,  # Utiliser la session de l'étudiant
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(pending_payment)
                    changes.append(f"Paiement pending créé: {new_balance} $ CAD pour session {student.session}")
        
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
async def delete_student(student_id: str, db: Session = Depends(get_db), user: dict = Depends(require_role("admin","direction","system"))):
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
async def create_enrollment(payload: dict = Body(...), db: Session = Depends(get_db), user: dict = Depends(require_role("admin","direction","system"))):
    try:
        if 'studentId' not in payload or 'classId' not in payload:
            raise HTTPException(status_code=400, detail="Missing studentId or classId")
        
        student_id = payload['studentId']
        class_id = payload['classId']
        
        # VALIDATION: Vérifier si l'élève est déjà inscrit dans une classe active
        try:
            from models import EnrollmentStatus as _ES
        except Exception:
            from .models import EnrollmentStatus as _ES
        
        existing_enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == student_id,
            Enrollment.status == _ES.active
        ).first()
        
        if existing_enrollment:
            # Récupérer les informations de la classe existante
            existing_class = db.query(Class).filter(Class.id == existing_enrollment.class_id).first()
            class_name = existing_class.name if existing_class else "une classe"
            
            raise HTTPException(
                status_code=400, 
                detail=f"Cet élève est déjà inscrit dans {class_name}. Un élève ne peut être inscrit que dans une seule classe à la fois."
            )
        
        enrollment_data = {
            'id': str(uuid4()),
            'student_id': student_id,
            'class_id': class_id,
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


@app.put("/enrollments/{enrollment_id}")
async def update_enrollment(enrollment_id: str, payload: dict = Body(...), db: Session = Depends(get_db), user: dict = Depends(require_role("admin","direction","system"))):
    print(f"📝 Requête de mise à jour d'inscription reçue")
    print(f"   ID inscription: {enrollment_id}")
    print(f"   Payload: {payload}")
    
    try:
        enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not enrollment:
            print(f"❌ Inscription non trouvée: {enrollment_id}")
            raise HTTPException(status_code=404, detail="Enrollment not found")
        
        print(f"✅ Inscription trouvée - Statut actuel: {enrollment.status}")
        
        # Mettre à jour les champs fournis
        if 'status' in payload:
            try:
                from models import EnrollmentStatus as _ES
            except Exception:
                from .models import EnrollmentStatus as _ES
            
            old_status = enrollment.status
            new_status = payload['status']
            print(f"🔄 Changement de statut: {old_status} → {new_status}")
            
            enrollment.status = _ES(new_status) if new_status else enrollment.status
        
        if 'grade' in payload:
            enrollment.grade = payload.get('grade')
            print(f"📊 Mise à jour de la note: {enrollment.grade}")
        
        if 'attendance' in payload:
            enrollment.attendance = payload.get('attendance')
            print(f"📅 Mise à jour de la présence: {enrollment.attendance}")
        
        enrollment.updated_at = datetime.utcnow()
        
        print(f"💾 Sauvegarde des modifications...")
        db.commit()
        db.refresh(enrollment)
        
        print(f"✅ Inscription mise à jour avec succès - Nouveau statut: {enrollment.status}")
        
        return serialize_enrollment(enrollment, include_class=True)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update enrollment: {str(e)}")


@app.post("/payments")
async def create_payment(payload: dict = Body(...), db: Session = Depends(get_db), user: dict = Depends(require_role("admin","direction","system"))):
    try:
        required = ['studentId', 'amount', 'paymentType', 'paymentMethod']
        for field in required:
            if field not in payload:
                raise HTTPException(status_code=400, detail=f"Missing field: {field}")
        
        payment_date = datetime.utcnow()
        payment_data = {
            'id': str(uuid4()),
            'student_id': payload['studentId'],
            'amount': float(payload['amount']),
            'payment_type': payload['paymentType'],
            'payment_method': payload['paymentMethod'],
            'status': payload.get('status', 'pending'),
            'transaction_id': payload.get('transactionId'),
            'notes': payload.get('notes'),
            'payment_date': payment_date,
            'due_date': datetime.fromisoformat(payload['dueDate'].replace('Z', '+00:00')) if payload.get('dueDate') else None,
            'academic_year': get_session_from_date(payment_date),  # Déduire la session automatiquement
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


@app.put("/payments/{payment_id}")
async def update_payment(payment_id: str, payload: dict = Body(...), db: Session = Depends(get_db), user: dict = Depends(require_role("admin","direction","system"))):
    """
    Mettre à jour un paiement existant
    """
    try:
        # Récupérer le paiement existant
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")
        
        # Sauvegarder l'ancien montant et statut pour ajuster tuition_paid si nécessaire
        old_amount = payment.amount
        old_status = payment.status
        
        # Mettre à jour les champs
        if 'studentId' in payload:
            payment.student_id = payload['studentId']
        if 'amount' in payload:
            payment.amount = float(payload['amount'])
        if 'paymentType' in payload:
            payment.payment_type = payload['paymentType']
        if 'paymentMethod' in payload:
            payment.payment_method = payload['paymentMethod']
        if 'status' in payload:
            payment.status = PaymentStatus(payload['status'])
        if 'transactionId' in payload:
            payment.transaction_id = payload['transactionId']
        if 'notes' in payload:
            payment.notes = payload['notes']
        if 'paymentDate' in payload:
            payment.payment_date = datetime.fromisoformat(payload['paymentDate'].replace('Z', '+00:00'))
        if 'dueDate' in payload:
            payment.due_date = datetime.fromisoformat(payload['dueDate'].replace('Z', '+00:00')) if payload['dueDate'] else None
        
        payment.updated_at = datetime.utcnow()
        
        # Mettre à jour la session si la date de paiement a changé
        if 'paymentDate' in payload:
            payment.academic_year = get_session_from_date(payment.payment_date)
        elif not payment.academic_year:
            # Si academic_year est vide, le calculer maintenant
            payment.academic_year = get_session_from_date(payment.payment_date)
        
        # Ajuster tuition_paid si le montant ou le statut a changé et que c'est un paiement de scolarité
        if payment.payment_type == 'tuition':
            student = db.query(Student).filter(Student.id == payment.student_id).first()
            if student:
                # Retirer l'ancien montant si c'était payé
                if old_status == PaymentStatus.paid:
                    student.tuition_paid = (student.tuition_paid or 0) - old_amount
                
                # Ajouter le nouveau montant si c'est payé
                if payment.status == PaymentStatus.paid:
                    student.tuition_paid = (student.tuition_paid or 0) + payment.amount
                
                student.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(payment)
        
        return serialize_payment(payment, include_student=False)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update payment: {str(e)}")


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
        payment_date = datetime.utcnow()
        payment_data = {
            'id': str(uuid4()),
            'student_id': payload['studentId'],
            'amount': float(payload['amount']) / 100,  # Convertir de centimes en unité
            'payment_type': payload['paymentType'],
            'payment_method': 'card',
            'status': 'pending',
            'transaction_id': payment_intent.id,
            'payment_date': payment_date,
            'academic_year': get_session_from_date(payment_date),  # Déduire la session automatiquement
            'notes': f"Stripe Payment Intent: {payment_intent.id}",
            'user_id': payload.get('userId'),  # ID utilisateur si fourni
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
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
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


@app.post("/students/link-by-email")
async def link_student_by_parent_email(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Lier un compte élève avec son profil existant basé sur l'email parent/tuteur.
    Payload: { "parentEmail": "parent@email.com", "userId": "user123" }
    """
    try:
        parent_email = payload.get('parentEmail')
        user_id = payload.get('userId')
        
        if not parent_email or not user_id:
            raise HTTPException(status_code=400, detail="parentEmail and userId are required")
        
        # Chercher un étudiant avec cet email parent
        student = db.query(Student).filter(
            Student.parent_email == parent_email,
            Student.user_id.is_(None)  # Pas encore lié à un compte
        ).first()
        
        if not student:
            raise HTTPException(status_code=404, detail="No unlinkable student found with this parent email")
        
        # Lier l'étudiant au compte utilisateur
        student.user_id = user_id
        db.commit()
        
        return {
            "success": True,
            "message": f"Student {student.first_name} {student.last_name} linked successfully",
            "student": serialize_student(student, include_relations=True)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to link student: {str(e)}")


@app.get("/students/by-email/{parent_email}")
async def get_student_by_parent_email(
    parent_email: str,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Récupérer les élèves associés à un email parent pour la liaison automatique.
    """
    try:
        students = db.query(Student).filter(Student.parent_email == parent_email).all()
        return [serialize_student(s, include_relations=True) for s in students]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch students by email: {str(e)}")


@app.post("/students/link-by-student-info")
async def link_student_by_student_info(payload: dict = Body(...), db: Session = Depends(get_db)):
    """
    Lier un compte élève avec son profil existant basé sur ses informations personnelles.
    Payload: { "firstName": "John", "lastName": "Doe", "dateOfBirth": "2010-01-01", "userId": "user123" }
    """
    try:
        first_name = payload.get('firstName')
        last_name = payload.get('lastName')
        date_of_birth = payload.get('dateOfBirth')
        user_id = payload.get('userId')
        
        if not all([first_name, last_name, date_of_birth, user_id]):
            raise HTTPException(status_code=400, detail="firstName, lastName, dateOfBirth and userId are required")
        
        # Convertir la date de naissance
        try:
            dob = datetime.fromisoformat(date_of_birth.replace('Z', '+00:00'))
        except:
            dob = datetime.strptime(date_of_birth, '%Y-%m-%d')
        
        # Chercher un étudiant avec ces informations
        student = db.query(Student).filter(
            Student.first_name.ilike(f"%{first_name}%"),
            Student.last_name.ilike(f"%{last_name}%"),
            Student.date_of_birth == dob.date(),
            Student.user_id.is_(None)  # Pas encore lié à un compte
        ).first()
        
        if not student:
            raise HTTPException(status_code=404, detail="No unlinkable student found with these informations")
        
        # Lier l'étudiant au compte utilisateur
        student.user_id = user_id
        db.commit()
        
        return {
            "success": True,
            "message": f"Student {student.first_name} {student.last_name} linked successfully",
            "student": serialize_student(student, include_relations=True)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to link student: {str(e)}")


@app.get("/students/search-for-link")
async def search_students_for_link(
    firstName: Optional[str] = None,
    lastName: Optional[str] = None,
    dateOfBirth: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Rechercher les élèves non liés pour permettre la liaison par l'élève lui-même.
    Recherche flexible qui vérifie aussi les inversions de nom/prénom.
    """
    try:
        print(f"🔍 RECHERCHE ÉLÈVE - Paramètres reçus:")
        print(f"   firstName: {firstName}")
        print(f"   lastName: {lastName}")
        print(f"   dateOfBirth: {dateOfBirth}")
        
        # D'abord, afficher tous les élèves non liés pour debug
        all_unlinked = db.query(Student).filter(Student.user_id.is_(None)).all()
        print(f"📊 Total élèves non liés dans la BD: {len(all_unlinked)}")
        for s in all_unlinked[:5]:  # Afficher les 5 premiers
            print(f"   - {s.first_name} {s.last_name} (né le {s.date_of_birth})")
        
        query = db.query(Student).filter(Student.user_id.is_(None))
        
        # Recherche flexible : prénom OU nom peut correspondre à l'un ou l'autre champ
        if firstName and lastName:
            # Essayer prénom/nom et nom/prénom
            query = query.filter(
                or_(
                    and_(
                        Student.first_name.ilike(f"%{firstName}%"),
                        Student.last_name.ilike(f"%{lastName}%")
                    ),
                    and_(
                        Student.first_name.ilike(f"%{lastName}%"),
                        Student.last_name.ilike(f"%{firstName}%")
                    )
                )
            )
        elif firstName:
            # Chercher dans prénom OU nom
            query = query.filter(
                or_(
                    Student.first_name.ilike(f"%{firstName}%"),
                    Student.last_name.ilike(f"%{firstName}%")
                )
            )
        elif lastName:
            # Chercher dans prénom OU nom
            query = query.filter(
                or_(
                    Student.first_name.ilike(f"%{lastName}%"),
                    Student.last_name.ilike(f"%{lastName}%")
                )
            )
        
        # Date de naissance (optionnelle pour plus de flexibilité)
        if dateOfBirth:
            try:
                dob = datetime.fromisoformat(dateOfBirth.replace('Z', '+00:00'))
            except:
                try:
                    dob = datetime.strptime(dateOfBirth, '%Y-%m-%d')
                except:
                    # Si le format est invalide, ignorer la date
                    dob = None
            
            if dob:
                query = query.filter(Student.date_of_birth == dob.date())
        
        students = query.all()
        
        print(f"✅ Résultats trouvés: {len(students)}")
        for s in students:
            print(f"   - {s.first_name} {s.last_name} (ID: {s.id})")
        
        # Retourner seulement les informations nécessaires pour l'identification
        return [{
            "id": s.id,
            "firstName": s.first_name,
            "lastName": s.last_name,
            "dateOfBirth": s.date_of_birth.isoformat() if s.date_of_birth else None,
            "program": s.program,
            "session": s.session
        } for s in students]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to search students: {str(e)}")


@app.post("/students/link-by-code")
async def link_student_by_code(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Lier un profil élève à un compte utilisateur via le code d'inscription unique.
    C'est la méthode recommandée pour éviter les erreurs d'identité.
    """
    try:
        student_code = payload.get("studentCode", "").strip().upper()
        user_id = user.get("userId") or user.get("id")
        
        if not student_code:
            raise HTTPException(status_code=400, detail="Student code is required")
        
        print(f"🔗 LIAISON PAR CODE:")
        print(f"   Code d'inscription: {student_code}")
        print(f"   User ID: {user_id}")
        
        # Chercher l'élève avec ce code
        student = db.query(Student).filter(Student.student_code == student_code).first()
        
        if not student:
            print(f"❌ Code '{student_code}' introuvable")
            raise HTTPException(status_code=404, detail="Code d'inscription invalide. Vérifiez auprès de l'administration.")
        
        # Vérifier que le profil n'est pas déjà lié
        if student.user_id and student.user_id != user_id:
            print(f"❌ Profil déjà lié à un autre compte")
            raise HTTPException(status_code=409, detail="Ce profil est déjà lié à un autre compte.")
        
        # Lier le profil
        student.user_id = user_id
        db.commit()
        
        print(f"✅ Profil lié: {student.first_name} {student.last_name} (Code: {student_code})")
        
        return {
            "success": True,
            "message": f"Profil lié avec succès !",
            "student": serialize_student(student, include_relations=True)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to link student: {str(e)}")


@app.get("/students/find-by-current-user")
async def find_student_by_current_user(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Trouver le profil élève correspondant à l'utilisateur connecté.
    Cherche par:
    1. user_id déjà lié
    2. parent_email correspondant à user.email
    3. email de l'utilisateur (si c'est un élève)
    """
    try:
        user_id = user.get("userId") or user.get("id")
        user_email = user.get("email", "").lower()
        
        print(f"🔍 Recherche profil pour utilisateur:")
        print(f"   user_id: {user_id}")
        print(f"   user_email: {user_email}")
        
        # 1. Chercher par user_id déjà lié
        student = db.query(Student).filter(Student.user_id == user_id).first()
        
        if student:
            print(f"✅ Trouvé par user_id: {student.first_name} {student.last_name}")
            return serialize_student(student, include_relations=True)
        
        # 2. Chercher par parent_email
        if user_email:
            student = db.query(Student).filter(
                Student.parent_email.ilike(user_email),
                Student.user_id.is_(None)  # Pas encore lié
            ).first()
            
            if student:
                print(f"✅ Trouvé par parent_email: {student.first_name} {student.last_name}")
                # Auto-lier le profil
                student.user_id = user_id
                db.commit()
                return serialize_student(student, include_relations=True)
        
        print("❌ Aucun profil trouvé")
        raise HTTPException(status_code=404, detail="No student profile found for current user")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find student: {str(e)}")


@app.post("/admin/generate-student-codes")
async def generate_codes_for_existing_students(
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("admin", "direction"))
):
    """
    Génère des codes d'inscription uniques pour tous les élèves qui n'en ont pas encore.
    Endpoint admin uniquement.
    """
    try:
        # Trouver tous les élèves sans code
        students_without_code = db.query(Student).filter(Student.student_code.is_(None)).all()
        
        if not students_without_code:
            return {
                "success": True,
                "message": "Tous les élèves ont déjà un code d'inscription",
                "generated": 0
            }
        
        print(f"📋 {len(students_without_code)} élève(s) sans code trouvé(s)")
        
        generated_codes = []
        
        # Générer et assigner des codes
        for student in students_without_code:
            code = generate_student_code(db)
            student.student_code = code
            generated_codes.append({
                "studentId": student.id,
                "name": f"{student.first_name} {student.last_name}",
                "code": code
            })
            print(f"✅ {student.first_name} {student.last_name} → {code}")
        
        # Sauvegarder toutes les modifications
        db.commit()
        
        return {
            "success": True,
            "message": f"{len(generated_codes)} codes générés avec succès",
            "generated": len(generated_codes),
            "codes": generated_codes
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erreur: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate codes: {str(e)}")


@app.post("/students/{student_id}/photo")
async def upload_student_photo(
    student_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload une photo de profil pour un élève (utilisable par l'élève et l'admin)
    """
    print(f"📸 Requête d'upload de photo reçue pour l'élève: {student_id}")
    print(f"📁 Fichier: {file.filename}, Type: {file.content_type}")
    
    try:
        # Vérifier que l'élève existe
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            print(f"❌ Élève non trouvé: {student_id}")
            raise HTTPException(status_code=404, detail="Student not found")
        
        print(f"✅ Élève trouvé: {student.first_name} {student.last_name}")
        
        # Vérifier le type de fichier
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if file.content_type not in allowed_types:
            print(f"❌ Type de fichier non supporté: {file.content_type}")
            raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG ou WebP")
        
        print(f"✅ Type de fichier valide: {file.content_type}")
        
        # Vérifier la taille (max 5MB)
        file_content = await file.read()
        file_size = len(file_content)
        print(f"📊 Taille du fichier: {file_size} bytes ({file_size / 1024 / 1024:.2f} MB)")
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            print(f"❌ Fichier trop volumineux: {file_size} bytes")
            raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 5MB")
        
        # Convertir en base64 pour stockage
        file_extension = file.content_type.split('/')[-1]
        if file_extension == 'jpeg':
            file_extension = 'jpg'
        
        base64_image = base64.b64encode(file_content).decode('utf-8')
        data_url = f"data:{file.content_type};base64,{base64_image}"
        
        print(f"✅ Image convertie en base64 (taille: {len(data_url)} caractères)")
        
        # Mettre à jour la photo de profil de l'élève
        student.profile_photo = data_url
        student.updated_at = datetime.utcnow()
        
        print(f"💾 Sauvegarde dans la base de données...")
        db.commit()
        print(f"✅ Photo sauvegardée avec succès pour {student.first_name} {student.last_name}")
        
        return {
            "success": True,
            "message": "Photo de profil mise à jour avec succès",
            "photoUrl": data_url[:100] + "..." if len(data_url) > 100 else data_url,  # Aperçu tronqué
            "student": serialize_student(student, include_relations=False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur lors de l'upload: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")


@app.post("/enrollments/{enrollment_id}/grades")
async def update_student_grades(
    enrollment_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Mettre à jour les notes détaillées d'un élève selon le système québécois
    """
    try:
        enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        
        # Structure des notes québécoises
        if 'courseGrades' in payload:
            enrollment.course_grades = payload['courseGrades']
        if 'quebecReportCard' in payload:
            enrollment.quebec_report_card = payload['quebecReportCard']
        if 'competenciesAssessment' in payload:
            enrollment.competencies_assessment = payload['competenciesAssessment']
        if 'academicYear' in payload:
            enrollment.academic_year = payload['academicYear']
        if 'semester' in payload:
            enrollment.semester = payload['semester']
        if 'grade' in payload:
            enrollment.grade = float(payload['grade'])
        if 'attendance' in payload:
            enrollment.attendance = float(payload['attendance'])
        
        enrollment.updated_at = datetime.utcnow()
        db.commit()
        
        return {
            "success": True,
            "message": "Notes mises à jour avec succès",
            "enrollment": serialize_enrollment(enrollment, include_class=True, include_student=False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update grades: {str(e)}")


# ============================================
# ENDPOINTS OPTIMISÉS POUR DASHBOARD ADMIN
# ============================================

@app.get("/admin/dashboard/stats")
async def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("admin", "direction"))
):
    """
    Endpoint optimisé pour récupérer rapidement les statistiques du dashboard admin
    """
    try:
        import httpx
        
        # Compter les étudiants (simple COUNT)
        total_students = db.query(Student).count()
        print(f"📊 Total étudiants: {total_students}")
        
        # Compter les classes (utilise le modèle Class existant)
        try:
            total_classes = db.query(Class).count()
            print(f"📊 Total classes: {total_classes}")
        except Exception as class_error:
            print(f"⚠️ Erreur lors du comptage des classes: {class_error}")
            total_classes = 0
        
        # Compter les paiements en attente (optimisé)
        # Note: PaymentStatus n'a que: pending, paid, cancelled, refunded
        pending_payments_result = db.query(func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.pending
        ).scalar()
        pending_payments_amount = float(pending_payments_result or 0)
        print(f"📊 Paiements en attente: {pending_payments_amount}")
        
        # Récupérer les applications depuis le service Applications
        recent_applications = []
        pending_applications = 0
        
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get("http://localhost:4002/applications")
                if response.status_code == 200:
                    applications = response.json()
                    # Filtrer les applications en attente
                    pending_apps = [
                        app for app in applications 
                        if app.get('status', '').lower() in ['pending', 'submitted', 'en attente', 'waiting']
                    ]
                    pending_applications = len(pending_apps)
                    recent_applications = pending_apps[:3]  # Les 3 plus récentes
        except Exception as e:
            print(f"⚠️ Erreur lors de la récupération des applications: {e}")
            # Continuer même si le service applications n'est pas disponible
        
        return {
            "success": True,
            "stats": {
                "totalStudents": total_students,
                "pendingApplications": pending_applications,
                "totalClasses": total_classes,
                "pendingPayments": pending_payments_amount,
                "recentApplications": recent_applications
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard stats: {str(e)}")


@app.get("/admin/classes")
async def list_classes_admin(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    """
    Endpoint pour récupérer les classes avec le nombre d'inscriptions actives
    """
    try:
        classes = db.query(Class).options(joinedload(Class.enrollments)).order_by(Class.created_at.desc()).all()
        
        result = []
        for c in classes:
            class_dict = serialize_class(c)
            # Ajouter les enrollments actifs pour que le frontend puisse calculer enrollment_count
            active_enrollments = [
                {"id": e.id, "status": e.status.value if e.status else None}
                for e in c.enrollments
                if e.status and e.status.value == 'active'
            ]
            class_dict["enrollments"] = active_enrollments
            result.append(class_dict)
        
        return result
    except Exception as e:
        print(f"⚠️ Erreur lors de la récupération des classes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch classes: {str(e)}")


@app.post("/admin/payments/update-sessions")
async def update_payment_sessions(db: Session = Depends(get_db)):
    """
    Mettre à jour rétroactivement les sessions de tous les paiements existants
    en fonction de leur date de paiement
    """
    try:
        # Récupérer tous les paiements
        payments = db.query(Payment).all()
        updated_count = 0
        
        for payment in payments:
            # Calculer la session à partir de la date de paiement
            if payment.payment_date:
                old_session = payment.academic_year
                new_session = get_session_from_date(payment.payment_date)
                
                if old_session != new_session:
                    payment.academic_year = new_session
                    payment.updated_at = datetime.utcnow()
                    updated_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "message": f"{updated_count} paiements mis à jour sur {len(payments)} total",
            "updated": updated_count,
            "total": len(payments)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update payment sessions: {str(e)}")


@app.get("/admin/students/count")
async def get_students_count(
    status: Optional[str] = None,
    withoutActiveClass: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("admin", "direction"))
):
    """
    Endpoint optimisé pour compter les étudiants sans charger toutes leurs données
    """
    try:
        query = db.query(Student)
        
        if status:
            try:
                from models import StudentStatus as _SS
            except Exception:
                from .models import StudentStatus as _SS
            enum_status = _SS(status) if status else None
            if enum_status:
                query = query.filter(Student.status == enum_status)
        
        if withoutActiveClass:
            # Utiliser une sous-requête SQL pour l'efficacité
            active_enrollments = db.query(Enrollment.student_id).filter(
                Enrollment.status == EnrollmentStatus.active
            ).subquery()
            query = query.filter(~Student.id.in_(active_enrollments))
        
        count = query.count()
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to count students: {str(e)}")


@app.post("/admin/demo/create-sample-data")
async def create_sample_data(db: Session = Depends(get_db)):
    """
    Créer des données de démonstration pour tester le dashboard
    """
    try:
        # Vérifier si des données existent déjà
        existing_students = db.query(Student).count()
        if existing_students > 0:
            return {"message": "Des données existent déjà", "students": existing_students}
        
        # Créer quelques classes
        class1 = Class(
            id=str(uuid4()),
            name="Mathématiques 3e secondaire",
            level="3e secondaire",
            capacity=25,
            current_students=0,
            session="Automne 2024",
            teacher_name="M. Dupont"
        )
        
        class2 = Class(
            id=str(uuid4()),
            name="Français 4e secondaire", 
            level="4e secondaire",
            capacity=20,
            current_students=0,
            session="Automne 2024",
            teacher_name="Mme Martin"
        )
        
        db.add(class1)
        db.add(class2)
        db.commit()
        
        # Créer quelques étudiants
        student1 = Student(
            id=str(uuid4()),
            first_name="Jean",
            last_name="Tremblay",
            date_of_birth=datetime(2008, 5, 15),
            gender=Gender.Masculin,
            address="123 Rue Principale, Montréal",
            parent_name="Marie Tremblay",
            parent_phone="514-123-4567",
            parent_email="marie.tremblay@email.com",
            program="Programme régulier",
            session="Automne 2024",
            secondary_level="3e secondaire",
            status=StudentStatus.active,
            tuition_amount=2500.0,
            tuition_paid=1000.0
        )
        
        student2 = Student(
            id=str(uuid4()),
            first_name="Sophie",
            last_name="Lavoie",
            date_of_birth=datetime(2007, 8, 22),
            gender=Gender.Feminin,
            address="456 Boulevard St-Laurent, Québec",
            parent_name="Pierre Lavoie",
            parent_phone="418-987-6543",
            parent_email="pierre.lavoie@email.com",
            program="Programme enrichi",
            session="Automne 2024",
            secondary_level="4e secondaire", 
            status=StudentStatus.active,
            tuition_amount=3000.0,
            tuition_paid=1500.0
        )
        
        db.add(student1)
        db.add(student2)
        db.commit()
        
        # Créer quelques inscriptions
        enrollment1 = Enrollment(
            id=str(uuid4()),
            student_id=student1.id,
            class_id=class1.id,
            status=EnrollmentStatus.active
        )
        
        enrollment2 = Enrollment(
            id=str(uuid4()),
            student_id=student2.id,
            class_id=class2.id,
            status=EnrollmentStatus.active
        )
        
        db.add(enrollment1)
        db.add(enrollment2)
        
        # Créer quelques paiements
        payment1 = Payment(
            id=str(uuid4()),
            student_id=student1.id,
            amount=1500.0,
            payment_type=PaymentType.tuition,
            payment_method="Virement bancaire",
            status=PaymentStatus.pending,
            academic_year="2024-2025"
        )
        
        payment2 = Payment(
            id=str(uuid4()),
            student_id=student2.id,
            amount=1500.0,
            payment_type=PaymentType.tuition,
            payment_method="Carte de crédit",
            status=PaymentStatus.pending,
            academic_year="2024-2025"
        )
        
        db.add(payment1)
        db.add(payment2)
        db.commit()
        
        return {
            "success": True,
            "message": "Données de démonstration créées avec succès",
            "created": {
                "students": 2,
                "classes": 2,
                "enrollments": 2,
                "payments": 2
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create sample data: {str(e)}")


# ============================================
# ENDPOINTS DE MAINTENANCE (ADMIN)
# ============================================

@app.post("/admin/maintenance/cleanup-enrollments")
async def admin_cleanup_enrollments(db: Session = Depends(get_db)):
    """
    Endpoint admin pour nettoyer manuellement les inscriptions en double
    """
    try:
        from db_maintenance import cleanup_duplicate_enrollments, get_enrollment_statistics
    except ImportError:
        from .db_maintenance import cleanup_duplicate_enrollments, get_enrollment_statistics
    
    try:
        cleanup_result = cleanup_duplicate_enrollments(db)
        stats = get_enrollment_statistics(db)
        
        return {
            "success": True,
            "cleanup": cleanup_result,
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cleanup enrollments: {str(e)}")


@app.get("/admin/maintenance/enrollment-stats")
async def admin_enrollment_stats(
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("admin", "direction"))
):
    """
    Endpoint admin pour obtenir les statistiques des inscriptions
    """
    try:
        from db_maintenance import get_enrollment_statistics
    except ImportError:
        from .db_maintenance import get_enrollment_statistics
    
    try:
        stats = get_enrollment_statistics(db)
        return {
            "success": True,
            "statistics": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


# Lancement recommandé:
#   uvicorn app.main:app --port %STUDENTS_PORT%

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("STUDENTS_PORT", 4003))
    uvicorn.run(app, host="0.0.0.0", port=port)
