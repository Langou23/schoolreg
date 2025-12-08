"""
SQLAlchemy models matching Prisma schema for students domain.
"""
from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()


class Gender(str, enum.Enum):
    Masculin = "Masculin"
    Feminin = "Feminin"
    Autre = "Autre"


class StudentStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    inactive = "inactive"
    graduated = "graduated"
    suspended = "suspended"


class EnrollmentStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    dropped = "dropped"
    failed = "failed"


class PaymentType(str, enum.Enum):
    tuition = "tuition"
    registration = "registration"
    books = "books"
    uniform = "uniform"
    transport = "transport"
    other = "other"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"
    refunded = "refunded"


class NotificationType(str, enum.Enum):
    payment_reminder = "payment_reminder"
    payment_overdue = "payment_overdue"
    payment_due_soon = "payment_due_soon"
    payment_received = "payment_received"
    general_info = "general_info"


class NotificationStatus(str, enum.Enum):
    unread = "unread"
    read = "read"
    archived = "archived"


class Student(Base):
    __tablename__ = "students"

    id = Column(String, primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    gender = Column(SQLEnum(Gender), nullable=False)
    address = Column(String, nullable=False)
    parent_name = Column(String, nullable=False)
    parent_phone = Column(String, nullable=False)
    parent_email = Column(String, nullable=False)
    program = Column(String, nullable=False)
    session = Column(String, nullable=False)
    secondary_level = Column(String, nullable=False)
    status = Column(SQLEnum(StudentStatus), nullable=False, default=StudentStatus.pending)
    tuition_amount = Column(Float, nullable=False)
    tuition_paid = Column(Float, nullable=False, default=0.0)
    enrollment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    session_start_date = Column(DateTime, nullable=True)
    registration_deadline = Column(DateTime, nullable=True)
    application_id = Column(String, nullable=True, unique=True)
    user_id = Column(String, nullable=True, unique=True)
    
    # Code unique pour la liaison du profil (ex: SR2024-ABC123)
    student_code = Column(String, nullable=True, unique=True, index=True)
    
    # NOUVEAUX CHAMPS PROFIL COMPLET
    # Contact d'urgence (JSON)
    emergency_contact = Column(JSON, nullable=True)  # {name, phone, relationship, email}
    
    # Informations médicales (JSON)
    medical_info = Column(JSON, nullable=True)  # {allergies, medications, conditions, notes}
    
    # Historique académique (JSON) 
    academic_history = Column(JSON, nullable=True)  # {previous_school, last_grade, etc.}
    
    # Préférences et objectifs (JSON)
    preferences = Column(JSON, nullable=True)  # {goals, interests, learning_style}
    
    # Photo de profil
    profile_photo = Column(String, nullable=True)
    
    # Statut du profil
    profile_completed = Column(Boolean, nullable=False, default=False)
    profile_completion_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="student")
    payments = relationship("Payment", back_populates="student")


class Class(Base):
    __tablename__ = "classes"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    level = Column(String, nullable=False)
    capacity = Column(Integer, nullable=False)
    current_students = Column(Integer, nullable=False, default=0)
    schedule = Column(String, nullable=True)
    room = Column(String, nullable=True)
    teacher_name = Column(String, nullable=True)
    session = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="class_")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(String, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    enrollment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    status = Column(SQLEnum(EnrollmentStatus), nullable=False, default=EnrollmentStatus.active)
    grade = Column(Float, nullable=True)  # Note finale (0-100 %)
    attendance = Column(Float, nullable=True, default=0.0)
    
    # NOUVEAUX CHAMPS SYSTÈME QUÉBÉCOIS
    # Détail des notes par matière (JSON) - Structure québécoise
    course_grades = Column(JSON, nullable=True)  # {course_code: {grade, competency_results, comments}}
    quebec_report_card = Column(JSON, nullable=True)  # Bulletin québécois complet
    competencies_assessment = Column(JSON, nullable=True)  # Évaluation des compétences
    academic_year = Column(String, nullable=True)  # Année scolaire (ex: "2024-2025")
    semester = Column(String, nullable=True)  # Étape (1, 2, 3)
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="enrollments")
    class_ = relationship("Class", back_populates="enrollments")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True)
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_type = Column(SQLEnum(PaymentType), nullable=False)
    payment_method = Column(String, nullable=False)
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.pending)
    transaction_id = Column(String, nullable=True, unique=True)
    notes = Column(Text, nullable=True)
    payment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)
    academic_year = Column(String, nullable=True)  # Année académique (ex: "2024-2025")
    user_id = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("Student", back_populates="payments")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)  # Parent/Student qui reçoit la notification
    student_id = Column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=True)  # Élève concerné
    payment_id = Column(String, ForeignKey("payments.id", ondelete="CASCADE"), nullable=True)  # Paiement concerné
    
    # Contenu de la notification
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(SQLEnum(NotificationType), nullable=False)
    status = Column(SQLEnum(NotificationStatus), nullable=False, default=NotificationStatus.unread)
    
    # Métadonnées
    priority = Column(String, nullable=False, default="normal")  # low, normal, high, urgent
    read_at = Column(DateTime, nullable=True)
    email_sent = Column(Boolean, nullable=False, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    
    # Données pour logique business
    amount = Column(Float, nullable=True)  # Montant concerné
    due_date = Column(DateTime, nullable=True)  # Date limite concernée
    
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    student = relationship("Student", backref="notifications")
    payment = relationship("Payment", backref="notifications")
