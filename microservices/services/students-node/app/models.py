"""
SQLAlchemy models matching Prisma schema for students domain.
"""
from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, Enum as SQLEnum, ForeignKey, Text
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
    grade = Column(Float, nullable=True)
    attendance = Column(Float, nullable=True, default=0.0)
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
