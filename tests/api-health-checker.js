/**
 * API Health Checker - Test Unitaire Professionnel
 * Vérifie le bon fonctionnement de tous les microservices
 */

const axios = require('axios');
const colors = require('colors');

class APIHealthChecker {
    constructor() {
        this.services = {
            gateway: { url: 'http://localhost:3001', port: 3001 },
            auth: { url: 'http://localhost:4001', port: 4001 },
            applications: { url: 'http://localhost:4002', port: 4002 },
            students: { url: 'http://localhost:4003', port: 4003 },
            payments: { url: 'http://localhost:4004', port: 4004 },
            classes: { url: 'http://localhost:4005', port: 4005 }
        };
        
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        
        this.timeout = 10000; // 10 secondes
        this.retryCount = 3;
    }

    /**
     * Lance tous les tests de santé des APIs
     */
    async runAllTests() {
        console.log('🚀 Démarrage des tests de santé des APIs'.cyan.bold);
        console.log('='.repeat(60));
        
        const startTime = Date.now();
        
        // Test 1: Connectivité des services
        await this.testServicesConnectivity();
        
        // Test 2: Endpoints de santé
        await this.testHealthEndpoints();
        
        // Test 3: APIs fonctionnelles
        await this.testFunctionalAPIs();
        
        // Test 4: Communication inter-services
        await this.testInterServiceCommunication();
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        // Génération du rapport final
        this.generateReport(duration);
    }

    /**
     * Test 1: Connectivité des services
     */
    async testServicesConnectivity() {
        console.log('\n📡 Test de connectivité des services'.yellow.bold);
        
        for (const [serviceName, config] of Object.entries(this.services)) {
            await this.testWithRetry(
                `Connectivité ${serviceName}`,
                async () => {
                    const response = await axios.get(`${config.url}/health`, {
                        timeout: this.timeout
                    });
                    return response.status === 200;
                }
            );
        }
    }

    /**
     * Test 2: Endpoints de santé
     */
    async testHealthEndpoints() {
        console.log('\n🏥 Test des endpoints de santé'.yellow.bold);
        
        const healthTests = [
            {
                name: 'Gateway Health',
                url: 'http://localhost:3001/health',
                expectedStatus: 200
            },
            {
                name: 'Auth Health',
                url: 'http://localhost:4001/health',
                expectedStatus: 200
            },
            {
                name: 'Applications Health', 
                url: 'http://localhost:4002/health',
                expectedStatus: 200
            },
            {
                name: 'Students Health',
                url: 'http://localhost:4003/health', 
                expectedStatus: 200
            },
            {
                name: 'Payments Health',
                url: 'http://localhost:4004/health',
                expectedStatus: 200
            },
            {
                name: 'Classes Health',
                url: 'http://localhost:4005/health',
                expectedStatus: 200
            }
        ];

        for (const test of healthTests) {
            await this.testWithRetry(
                test.name,
                async () => {
                    const response = await axios.get(test.url, { timeout: this.timeout });
                    return response.status === test.expectedStatus;
                }
            );
        }
    }

    /**
     * Test 3: APIs fonctionnelles
     */
    async testFunctionalAPIs() {
        console.log('\n⚡ Test des APIs fonctionnelles'.yellow.bold);
        
        // Test Auth API
        await this.testAuthAPI();
        
        // Test Students API
        await this.testStudentsAPI();
        
        // Test Applications API
        await this.testApplicationsAPI();
        
        // Test Payments API
        await this.testPaymentsAPI();
        
        // Test Classes API
        await this.testClassesAPI();
    }

    /**
     * Test Auth API
     */
    async testAuthAPI() {
        // Test création d'utilisateur de test
        await this.testWithRetry(
            'Auth - Endpoint signup disponible',
            async () => {
                try {
                    const response = await axios.post('http://localhost:3001/api/auth/signup', {
                        email: `test_${Date.now()}@test.com`,
                        password: 'Test123!',
                        fullName: 'Test User',
                        role: 'parent'
                    }, { timeout: this.timeout });
                    
                    return response.status === 201 || response.status === 200;
                } catch (error) {
                    // Acceptable si l'email existe déjà
                    return error.response?.status === 400 && 
                           error.response?.data?.message?.includes('already exists');
                }
            }
        );

        // Test endpoint de connexion
        await this.testWithRetry(
            'Auth - Endpoint signin disponible',
            async () => {
                try {
                    const response = await axios.post('http://localhost:3001/api/auth/signin', {
                        email: 'invalid@test.com',
                        password: 'invalid'
                    }, { timeout: this.timeout });
                    
                    return false; // Ne devrait pas réussir
                } catch (error) {
                    // Doit retourner 401 ou 400 pour des identifiants invalides
                    return error.response?.status === 401 || error.response?.status === 400;
                }
            }
        );
    }

    /**
     * Test Students API
     */
    async testStudentsAPI() {
        // Test liste des élèves
        await this.testWithRetry(
            'Students - Liste des élèves',
            async () => {
                const response = await axios.get('http://localhost:3001/api/students', {
                    timeout: this.timeout
                });
                return response.status === 200 && Array.isArray(response.data);
            }
        );

        // Test statistiques dashboard
        await this.testWithRetry(
            'Students - Statistiques dashboard',
            async () => {
                const response = await axios.get('http://localhost:4003/dashboard/stats', {
                    timeout: this.timeout
                });
                return response.status === 200 && 
                       response.data.students && 
                       response.data.revenue;
            }
        );
    }

    /**
     * Test Applications API
     */
    async testApplicationsAPI() {
        // Test liste des applications
        await this.testWithRetry(
            'Applications - Liste des demandes',
            async () => {
                const response = await axios.get('http://localhost:3001/api/applications', {
                    timeout: this.timeout
                });
                return response.status === 200 && Array.isArray(response.data);
            }
        );
    }

    /**
     * Test Payments API
     */
    async testPaymentsAPI() {
        // Test liste des paiements
        await this.testWithRetry(
            'Payments - Liste des paiements (Students)',
            async () => {
                const response = await axios.get('http://localhost:4003/payments', {
                    timeout: this.timeout
                });
                return response.status === 200 && Array.isArray(response.data);
            }
        );

        // Test Stripe Payments service
        await this.testWithRetry(
            'Payments - Service Stripe disponible',
            async () => {
                const response = await axios.get('http://localhost:4004/payments', {
                    timeout: this.timeout
                });
                return response.status === 200 && Array.isArray(response.data);
            }
        );
    }

    /**
     * Test Classes API
     */
    async testClassesAPI() {
        // Test liste des classes
        await this.testWithRetry(
            'Classes - Liste des classes',
            async () => {
                const response = await axios.get('http://localhost:3001/api/classes', {
                    timeout: this.timeout
                });
                return response.status === 200 && Array.isArray(response.data);
            }
        );
    }

    /**
     * Test 4: Communication inter-services
     */
    async testInterServiceCommunication() {
        console.log('\n🔄 Test de communication inter-services'.yellow.bold);
        
        // Test Gateway → Students
        await this.testWithRetry(
            'Gateway → Students (proxy)',
            async () => {
                const response = await axios.get('http://localhost:3001/api/students', {
                    timeout: this.timeout
                });
                return response.status === 200;
            }
        );

        // Test Gateway → Auth  
        await this.testWithRetry(
            'Gateway → Auth (proxy)',
            async () => {
                const response = await axios.get('http://localhost:3001/api/auth/me', {
                    timeout: this.timeout,
                    validateStatus: (status) => status === 401 || status === 200
                });
                return response.status === 401 || response.status === 200;
            }
        );
    }

    /**
     * Exécute un test avec retry en cas d'échec
     */
    async testWithRetry(testName, testFunction) {
        this.results.total++;
        
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const success = await testFunction();
                
                if (success) {
                    console.log(`✅ ${testName}`.green);
                    this.results.passed++;
                    this.results.details.push({
                        name: testName,
                        status: 'PASS',
                        attempts: attempt
                    });
                    return;
                }
            } catch (error) {
                if (attempt === this.retryCount) {
                    console.log(`❌ ${testName} - Erreur: ${error.message}`.red);
                    this.results.failed++;
                    this.results.details.push({
                        name: testName,
                        status: 'FAIL',
                        error: error.message,
                        attempts: attempt
                    });
                    return;
                } else {
                    console.log(`⚠️  ${testName} - Tentative ${attempt}/${this.retryCount} échouée, retry...`.yellow);
                    await this.sleep(1000); // Attendre 1 seconde avant retry
                }
            }
        }
        
        console.log(`❌ ${testName} - Échec après ${this.retryCount} tentatives`.red);
        this.results.failed++;
        this.results.details.push({
            name: testName,
            status: 'FAIL',
            error: 'Max retries exceeded',
            attempts: this.retryCount
        });
    }

    /**
     * Génère le rapport final
     */
    generateReport(duration) {
        console.log('\n' + '='.repeat(80));
        console.log('📋 RAPPORT DE SANTÉ DES APIs'.cyan.bold);
        console.log('='.repeat(80));
        
        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        
        console.log(`🕐 Durée d'exécution: ${duration}s`);
        console.log(`📊 Tests exécutés: ${this.results.total}`);
        console.log(`✅ Tests réussis: ${this.results.passed}`.green);
        console.log(`❌ Tests échoués: ${this.results.failed}`.red);
        console.log(`📈 Taux de réussite: ${successRate}%`);
        
        // Statut global
        if (this.results.failed === 0) {
            console.log('\n🎉 TOUTES LES APIs FONCTIONNENT CORRECTEMENT!'.green.bold);
        } else {
            console.log('\n⚠️  CERTAINES APIs ONT DES PROBLÈMES'.red.bold);
        }
        
        // Détails des échecs si il y en a
        if (this.results.failed > 0) {
            console.log('\n🔍 Détails des échecs:'.red.bold);
            this.results.details
                .filter(detail => detail.status === 'FAIL')
                .forEach(detail => {
                    console.log(`  - ${detail.name}: ${detail.error}`.red);
                });
        }
        
        // Sauvegarde du rapport
        this.saveReport(duration, successRate);
    }

    /**
     * Sauvegarde le rapport dans un fichier JSON
     */
    saveReport(duration, successRate) {
        const reportData = {
            timestamp: new Date().toISOString(),
            duration: duration,
            summary: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: successRate
            },
            details: this.results.details
        };

        const fs = require('fs');
        const reportPath = `./tests/reports/health-report-${Date.now()}.json`;
        
        // Créer le dossier reports s'il n'existe pas
        if (!fs.existsSync('./tests/reports')) {
            fs.mkdirSync('./tests/reports', { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        console.log(`\n💾 Rapport sauvegardé: ${reportPath}`.blue);
    }

    /**
     * Utilitaire pour attendre
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exécution si lancé directement
if (require.main === module) {
    const checker = new APIHealthChecker();
    checker.runAllTests().catch(error => {
        console.error('Erreur lors de l\'exécution des tests:', error);
        process.exit(1);
    });
}

module.exports = APIHealthChecker;
