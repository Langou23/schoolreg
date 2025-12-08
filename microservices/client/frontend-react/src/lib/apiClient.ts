import axios from 'axios';

// URLs des différents microservices
const AUTH_URL = 'http://localhost:4001';
const STUDENTS_URL = 'http://localhost:4003';
const APPLICATIONS_URL = 'http://localhost:4002';
const CLASSES_URL = 'http://localhost:4005';
const PAYMENTS_URL = 'http://localhost:4004';
const NOTIFICATIONS_URL = 'http://localhost:4006';

// Client pour le service Auth
export const authClient = axios.create({
  baseURL: AUTH_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Client pour le service Students
export const studentsClient = axios.create({
  baseURL: STUDENTS_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Client pour le service Applications
export const applicationsClient = axios.create({
  baseURL: APPLICATIONS_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Client pour le service Classes
export const classesClient = axios.create({
  baseURL: CLASSES_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Client pour le service Payments
export const paymentsClient = axios.create({
  baseURL: PAYMENTS_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Client pour le service Notifications
export const notificationsClient = axios.create({
  baseURL: NOTIFICATIONS_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Client générique (pour compatibilité)
export const apiClient = authClient;

// Fonction pour ajouter le token JWT à tous les clients
const addAuthInterceptor = (client: any) => {
  client.interceptors.request.use((config: any) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  
  client.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );
};

// Ajouter les intercepteurs à tous les clients
addAuthInterceptor(authClient);
addAuthInterceptor(studentsClient);
addAuthInterceptor(applicationsClient);
addAuthInterceptor(classesClient);
addAuthInterceptor(paymentsClient);
addAuthInterceptor(notificationsClient);

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================

export const AuthAPI = {
  signIn: async (email: string, password: string) => {
    const { data } = await authClient.post('/api/auth/signin', { email, password });
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('current_user', JSON.stringify(data.user));
    }
    return data;
  },

  signUp: async (userData: {
    email: string;
    password: string;
    fullName: string;
    role: string;
  }) => {
    const { data } = await authClient.post('/api/auth/signup', userData);
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('current_user', JSON.stringify(data.user));
    }
    return data;
  },

  getCurrentUser: async () => {
    try {
      const { data } = await authClient.get('/api/auth/me');
      localStorage.setItem('current_user', JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      return null;
    }
  },

  signOut: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
  },

  // Méthode synchrone pour récupérer l'utilisateur du localStorage
  getCurrentUserSync: () => {
    const userStr = localStorage.getItem('current_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// ============================================
// STUDENTS API
// ============================================

export const StudentsApi = {
  list: async (filters?: { parentEmail?: string; status?: string; program?: string; withoutActiveClass?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.parentEmail) params.append('parentEmail', filters.parentEmail);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.program) params.append('program', filters.program);
    if (filters?.withoutActiveClass) params.append('withoutActiveClass', 'true');
    
    const { data } = await studentsClient.get(`/students?${params.toString()}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await studentsClient.get(`/students/${id}`);
    return data;
  },

  create: async (studentData: any) => {
    const { data } = await studentsClient.post('/students', studentData);
    return data;
  },

  update: async (id: string, studentData: any) => {
    const { data } = await studentsClient.put(`/students/${id}`, studentData);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await studentsClient.delete(`/students/${id}`);
    return data;
  },

  uploadPhoto: async (studentId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await studentsClient.post(`/students/${studentId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};

// ============================================
// APPLICATIONS API
// ============================================

export const ApplicationsApi = {
  list: async (filters?: { parentEmail?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.parentEmail) params.append('parentEmail', filters.parentEmail);
    if (filters?.status) params.append('status', filters.status);
    
    console.log('🔍 ApplicationsApi.list - Appel API avec filtres:', filters);
    const { data } = await applicationsClient.get(`/applications?${params.toString()}`);
    console.log('📦 ApplicationsApi.list - Données reçues:', data);
    console.log('📊 ApplicationsApi.list - Nombre d\'applications:', Array.isArray(data) ? data.length : 'N/A');
    return data;
  },

  create: async (applicationData: any) => {
    const { data } = await applicationsClient.post('/applications', applicationData);
    return data;
  },

  update: async (id: string, applicationData: any) => {
    const { data } = await applicationsClient.put(`/applications/${id}`, applicationData);
    return data;
  },

  approve: async (id: string, notes?: string) => {
    const { data } = await applicationsClient.post(`/applications/${id}/approve`, { notes });
    return data;
  },

  reject: async (id: string, notes?: string) => {
    const { data } = await applicationsClient.post(`/applications/${id}/reject`, { reason: notes });
    return data;
  },
};

// ============================================
// CLASSES API
// ============================================

export const ClassesApi = {
  list: async () => {
    // Utiliser l'endpoint du service students-node pour récupérer les classes
    const { data } = await studentsClient.get('/admin/classes');
    return data;
  },

  create: async (classData: any) => {
    const { data } = await classesClient.post('/classes', classData);
    return data;
  },

  update: async (id: string, classData: any) => {
    const { data } = await classesClient.put(`/classes/${id}`, classData);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await classesClient.delete(`/classes/${id}`);
    return data;
  },
};

// ============================================
// ENROLLMENTS API
// ============================================

export const EnrollmentsApi = {
  list: async () => {
    const { data } = await studentsClient.get('/enrollments');
    return data;
  },

  listByClass: async (classId: string, status?: string) => {
    const params = new URLSearchParams({ classId });
    if (status) params.append('status', status);
    const { data } = await studentsClient.get(`/enrollments?${params.toString()}`);
    return data;
  },

  listByStudent: async (studentId: string) => {
    const { data } = await studentsClient.get(`/enrollments?studentId=${studentId}`);
    return data;
  },

  create: async (enrollmentData: any) => {
    const { data } = await studentsClient.post('/enrollments', enrollmentData);
    return data;
  },

  update: async (id: string, enrollmentData: any) => {
    const { data } = await studentsClient.put(`/enrollments/${id}`, enrollmentData);
    return data;
  },

  remove: async (id: string) => {
    const { data} = await studentsClient.delete(`/enrollments/${id}`);
    return data;
  },

  updateGrades: async (enrollmentId: string, gradesData: any) => {
    const { data } = await studentsClient.post(`/enrollments/${enrollmentId}/grades`, gradesData);
    return data;
  },
};

// ============================================
// PAYMENTS API
// ============================================

export const PaymentsApi = {
  list: async (filters?: { studentId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.studentId) params.append('studentId', filters.studentId);
    if (filters?.status) params.append('status', filters.status);
    
    const { data} = await studentsClient.get(`/payments?${params.toString()}`);
    return data;
  },

  listByStudent: async (studentId: string) => {
    const { data } = await studentsClient.get(`/payments?studentId=${studentId}`);
    return data;
  },

  create: async (paymentData: any) => {
    const { data } = await studentsClient.post('/payments', paymentData);
    return data;
  },

  update: async (id: string, paymentData: any) => {
    const { data } = await studentsClient.put(`/payments/${id}`, paymentData);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await studentsClient.delete(`/payments/${id}`);
    return data;
  },
};

// ============================================
// NOTIFICATIONS API
// ============================================

export const NotificationsApi = {
  list: async (userId?: string) => {
    const params = userId ? `?userId=${userId}` : '';
    const { data } = await apiClient.get(`/notifications${params}`);
    return data;
  },

  create: async (notificationData: any) => {
    const { data } = await apiClient.post('/notifications', notificationData);
    return data;
  },

  markAsRead: async (id: string) => {
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data;
  },
};

// ============================================
// DOCUMENTS API (À implémenter avec upload de fichiers)
// ============================================

export const DocumentsApi = {
  create: async (documentData: any) => {
    // TODO: Implémenter upload de fichiers
    const { data } = await apiClient.post('/documents', documentData);
    return data;
  },

  listByApplication: async (applicationId: string) => {
    const { data } = await apiClient.get(`/documents?applicationId=${applicationId}`);
    return data;
  },

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const { data } = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  getFileUrl: async (fileId: string) => {
    return `/uploads/${fileId}`;
  },
};

// ============================================
// RESOURCES API (MongoDB)
// ============================================

export const ResourcesApi = {
  list: async (filters?: {
    type?: string;
    category?: string;
    subject?: string;
    level?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.search) params.append('search', filters.search);
    
    const { data } = await apiClient.get(`/resources?${params.toString()}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/resources/${id}`);
    return data;
  },

  create: async (resourceData: any) => {
    const { data } = await apiClient.post('/resources', resourceData);
    return data;
  },

  update: async (id: string, resourceData: any) => {
    const { data } = await apiClient.put(`/resources/${id}`, resourceData);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/resources/${id}`);
    return data;
  },
};

// ============================================
// LEARNING MODULES API (MongoDB)
// ============================================

export const ModulesApi = {
  list: async (filters?: { subject?: string; level?: string; isPublished?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.subject) params.append('subject', filters.subject);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.isPublished !== undefined) params.append('isPublished', String(filters.isPublished));
    
    const { data } = await apiClient.get(`/modules?${params.toString()}`);
    return data;
  },

  getById: async (id: string) => {
    const { data } = await apiClient.get(`/modules/${id}`);
    return data;
  },

  create: async (moduleData: any) => {
    const { data } = await apiClient.post('/modules', moduleData);
    return data;
  },

  update: async (id: string, moduleData: any) => {
    const { data } = await apiClient.put(`/modules/${id}`, moduleData);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/modules/${id}`);
    return data;
  },
};

// ============================================
// STRIPE PAYMENTS API
// ============================================

export const StripePaymentsApi = {
  // Créer un Payment Intent (pour paiements directs)
  createPaymentIntent: async (paymentData: {
    student_id: string;
    amount: number;
    currency?: string;
    description?: string;
  }) => {
    const { data } = await apiClient.post('/stripe/payment-intent', paymentData);
    return data;
  },

  // Créer une Checkout Session (pour redirection vers Stripe)
  createCheckoutSession: async (sessionData: {
    student_id: string;
    amount: number;
    currency?: string;
    description?: string;
    success_url: string;
    cancel_url: string;
  }) => {
    const { data } = await apiClient.post('/stripe/checkout-session', sessionData);
    return data;
  },

  // Lister les paiements
  listPayments: async (filters?: { student_id?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.student_id) params.append('student_id', filters.student_id);
    if (filters?.status) params.append('status', filters.status);
    const { data } = await apiClient.get(`/payments?${params.toString()}`);
    return data;
  },

  // Récupérer un paiement
  getPayment: async (paymentId: string) => {
    const { data } = await apiClient.get(`/payments/${paymentId}`);
    return data;
  },
};

// Export pour compatibilité avec l'ancien code
export default {
  AuthAPI,
  StudentsApi,
  ApplicationsApi,
  ClassesApi,
  EnrollmentsApi,
  PaymentsApi,
  NotificationsApi,
  DocumentsApi,
  ResourcesApi,
  ModulesApi,
  StripePaymentsApi,
};
