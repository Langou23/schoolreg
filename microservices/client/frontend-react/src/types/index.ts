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
  grade?: string;
  attendance?: number;
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
