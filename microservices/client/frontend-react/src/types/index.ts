// Types partagés pour l'application

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'direction' | 'parent' | 'student';
  fullName: string;
  studentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'Masculin' | 'Feminin' | 'Autre';
  address: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  program: 'prescolaire' | 'primaire' | 'secondaire';
  session: 'automne' | 'hiver' | 'ete';
  secondaryLevel?: string;
  status: 'pending' | 'active' | 'inactive' | 'graduated' | 'suspended';
  enrollmentDate: string;
  tuitionAmount?: number;
  tuitionPaid?: number;
  sessionStartDate?: string;
  registrationDeadline?: string;
  applicationId?: string;
  userId?: string;  // ID de liaison avec le compte utilisateur
  
  // NOUVELLES INFORMATIONS PROFIL COMPLET
  // Photo et identité
  profilePhoto?: string;
  studentId?: string; // Numéro étudiant unique
  
  // Informations médicales
  medicalInfo?: {
    allergies?: string[];
    medications?: string[];
    medicalConditions?: string[];
    bloodType?: string;
    emergencyMedicalNotes?: string;
  };
  
  // Contact d'urgence
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  
  // Historique académique
  academicHistory?: {
    previousSchool?: string;
    lastGrade?: string;
    transferReason?: string;
    specialNeeds?: string[];
    languages?: string[];
  };
  
  // Préférences et objectifs
  preferences?: {
    goals?: string[];
    interests?: string[];
    extracurriculars?: string[];
    learningStyle?: 'visuel' | 'auditif' | 'kinesthésique' | 'mixte';
  };
  
  // Statut du profil
  profileCompleted?: boolean;
  profileCompletionDate?: string;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface Application {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'Masculin' | 'Feminin' | 'Autre';
  address: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  program: 'prescolaire' | 'primaire' | 'secondaire';
  session: 'automne' | 'hiver' | 'ete';
  secondaryLevel?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  createdStudentId?: string;
  studentId?: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  type: 'birth_certificate' | 'photo' | 'previous_report' | 'medical_record' | 'other';
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface Class {
  id: string;
  name: string;
  level: string;
  capacity: number;
  enrolled: number;
  teacher: string;
  schedule: string;
  room: string;
  session: 'automne' | 'hiver' | 'ete';
  startDate: string;
  endDate: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'dropped' | 'failed';
  grade?: number;
  attendance?: number;
  
  // NOUVEAUX CHAMPS SYSTÈME QUÉBÉCOIS
  courseGrades?: any;  // {course_code: {grade, competency_results, comments}}
  quebecReportCard?: any;  // Bulletin québécois complet
  competenciesAssessment?: any;  // Évaluation des compétences
  academicYear?: string;  // Année scolaire (ex: "2024-2025")
  semester?: string;  // Étape (1, 2, 3)
  
  student?: Student;
  class?: Class;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentType: 'tuition' | 'registration' | 'books' | 'uniform' | 'transport' | 'other';
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  dueDate?: string;
  academicYear?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  student?: Student;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'application_status' | 'payment_reminder' | 'enrollment_update' | 'general' | 'urgent';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
