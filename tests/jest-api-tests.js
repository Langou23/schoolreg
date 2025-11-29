/**
 * Tests Unitaires Jest pour les APIs SchoolReg
 * Tests professionnels avec assertions détaillées
 */

const axios = require('axios');

// Configuration des timeouts
jest.setTimeout(30000);

const BASE_URLS = {
    gateway: 'http://localhost:3001',
    auth: 'http://localhost:4001',
    applications: 'http://localhost:4002',
    students: 'http://localhost:4003',
    payments: 'http://localhost:4004',
    classes: 'http://localhost:4005'
};

describe('🏥 Health Endpoints', () => {
    test('Gateway Health Check', async () => {
        const response = await axios.get(`${BASE_URLS.gateway}/health`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
        expect(response.data.status).toBe('ok');
    });

    test('Auth Service Health Check', async () => {
        const response = await axios.get(`${BASE_URLS.auth}/health`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
        expect(response.data.service).toBe('auth');
    });

    test('Students Service Health Check', async () => {
        const response = await axios.get(`${BASE_URLS.students}/health`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status', 'ok');
        expect(response.data).toHaveProperty('service', 'students-node');
    });

    test('Payments Service Health Check', async () => {
        const response = await axios.get(`${BASE_URLS.payments}/health`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status', 'ok');
        expect(response.data).toHaveProperty('service', 'payments');
    });

    test('Applications Service Health Check', async () => {
        const response = await axios.get(`${BASE_URLS.applications}/health`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
    });

    test('Classes Service Health Check', async () => {
        const response = await axios.get(`${BASE_URLS.classes}/health`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
    });
});

describe('🔐 Auth API Endpoints', () => {
    test('POST /auth/signup - Validation des champs requis', async () => {
        try {
            await axios.post(`${BASE_URLS.gateway}/api/auth/signup`, {
                // Données incomplètes pour tester la validation
                email: 'test@test.com'
            });
        } catch (error) {
            expect(error.response.status).toBe(400);
        }
    });

    test('POST /auth/signin - Gestion des identifiants invalides', async () => {
        try {
            await axios.post(`${BASE_URLS.gateway}/api/auth/signin`, {
                email: 'nonexistent@test.com',
                password: 'wrongpassword'
            });
        } catch (error) {
            expect([400, 401]).toContain(error.response.status);
        }
    });

    test('GET /auth/me - Endpoint sans token', async () => {
        try {
            await axios.get(`${BASE_URLS.gateway}/api/auth/me`);
        } catch (error) {
            expect(error.response.status).toBe(401);
        }
    });
});

describe('👨‍🎓 Students API Endpoints', () => {
    test('GET /students - Liste des élèves', async () => {
        const response = await axios.get(`${BASE_URLS.gateway}/api/students`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /students - Structure des données élèves', async () => {
        const response = await axios.get(`${BASE_URLS.gateway}/api/students`);
        
        if (response.data.length > 0) {
            const student = response.data[0];
            
            // Vérifier la structure attendue
            expect(student).toHaveProperty('id');
            expect(student).toHaveProperty('firstName');
            expect(student).toHaveProperty('lastName');
            expect(student).toHaveProperty('status');
            
            // Vérifier les types
            expect(typeof student.id).toBe('string');
            expect(typeof student.firstName).toBe('string');
            expect(typeof student.lastName).toBe('string');
        }
    });

    test('GET /dashboard/stats - Statistiques complètes', async () => {
        const response = await axios.get(`${BASE_URLS.students}/dashboard/stats`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('students');
        expect(response.data).toHaveProperty('enrollments');
        expect(response.data).toHaveProperty('payments');
        expect(response.data).toHaveProperty('revenue');
        
        // Vérifier la structure des statistiques
        expect(response.data.students).toHaveProperty('total');
        expect(response.data.students).toHaveProperty('active');
        expect(response.data.revenue).toHaveProperty('total');
        expect(response.data.revenue).toHaveProperty('tuitionPaid');
    });
});

describe('💳 Payments API Endpoints', () => {
    test('GET /payments - Liste des paiements (Students)', async () => {
        const response = await axios.get(`${BASE_URLS.students}/payments`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /payments - Structure des paiements', async () => {
        const response = await axios.get(`${BASE_URLS.students}/payments`);
        
        if (response.data.length > 0) {
            const payment = response.data[0];
            
            expect(payment).toHaveProperty('id');
            expect(payment).toHaveProperty('amount');
            expect(payment).toHaveProperty('status');
            expect(payment).toHaveProperty('paymentType');
            
            // Vérifier les types
            expect(typeof payment.amount).toBe('number');
            expect(typeof payment.status).toBe('string');
        }
    });

    test('GET /payments - Service Stripe', async () => {
        const response = await axios.get(`${BASE_URLS.payments}/payments`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
    });
});

describe('📝 Applications API Endpoints', () => {
    test('GET /applications - Liste des demandes', async () => {
        const response = await axios.get(`${BASE_URLS.gateway}/api/applications`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
    });

    test('GET /applications - Structure des demandes', async () => {
        const response = await axios.get(`${BASE_URLS.gateway}/api/applications`);
        
        if (response.data.length > 0) {
            const application = response.data[0];
            
            expect(application).toHaveProperty('id');
            expect(application).toHaveProperty('status');
            
            // Vérifier que le statut est valide
            const validStatuses = ['pending', 'approved', 'rejected', 'submitted'];
            expect(validStatuses).toContain(application.status);
        }
    });
});

describe('🏫 Classes API Endpoints', () => {
    test('GET /classes - Liste des classes', async () => {
        const response = await axios.get(`${BASE_URLS.gateway}/api/classes`);
        
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data)).toBe(true);
    });
});

describe('🔄 Inter-Service Communication', () => {
    test('Gateway → Students Proxy', async () => {
        const gatewayResponse = await axios.get(`${BASE_URLS.gateway}/api/students`);
        const directResponse = await axios.get(`${BASE_URLS.students}/students`);
        
        expect(gatewayResponse.status).toBe(200);
        expect(directResponse.status).toBe(200);
        
        // Les deux réponses devraient être identiques
        expect(gatewayResponse.data.length).toBe(directResponse.data.length);
    });

    test('Gateway → Applications Proxy', async () => {
        const gatewayResponse = await axios.get(`${BASE_URLS.gateway}/api/applications`);
        
        expect(gatewayResponse.status).toBe(200);
        expect(Array.isArray(gatewayResponse.data)).toBe(true);
    });
});

describe('⚡ Performance Tests', () => {
    test('Response Time - Health Endpoints < 2s', async () => {
        const endpoints = [
            `${BASE_URLS.gateway}/health`,
            `${BASE_URLS.auth}/health`,
            `${BASE_URLS.students}/health`,
            `${BASE_URLS.payments}/health`
        ];

        for (const endpoint of endpoints) {
            const startTime = Date.now();
            const response = await axios.get(endpoint);
            const responseTime = Date.now() - startTime;

            expect(response.status).toBe(200);
            expect(responseTime).toBeLessThan(2000); // Moins de 2 secondes
        }
    });

    test('Concurrent Requests Handling', async () => {
        const requests = Array(5).fill().map(() => 
            axios.get(`${BASE_URLS.gateway}/health`)
        );

        const responses = await Promise.all(requests);
        
        responses.forEach(response => {
            expect(response.status).toBe(200);
        });
    });
});

describe('🛡️ Error Handling', () => {
    test('404 sur endpoint inexistant', async () => {
        try {
            await axios.get(`${BASE_URLS.gateway}/api/nonexistent`);
        } catch (error) {
            expect(error.response.status).toBe(404);
        }
    });

    test('CORS Headers présents', async () => {
        const response = await axios.get(`${BASE_URLS.gateway}/health`);
        
        expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
});
