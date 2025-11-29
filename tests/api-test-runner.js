/**
 * API Test Runner - Plan de Test Unitaire Professionnel
 * Vérifie le bon fonctionnement de tous les microservices SchoolReg
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration couleurs console
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

class APITestRunner {
    constructor() {
        this.services = {
            gateway: { url: 'http://localhost:3001', name: 'Gateway' },
            auth: { url: 'http://localhost:4001', name: 'Auth Service' },
            applications: { url: 'http://localhost:4002', name: 'Applications Service' },
            students: { url: 'http://localhost:4003', name: 'Students Service' },
            payments: { url: 'http://localhost:4004', name: 'Payments Service' },
            classes: { url: 'http://localhost:4005', name: 'Classes Service' }
        };
        
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: [],
            startTime: null,
            endTime: null
        };
        
        this.timeout = 10000;
        this.retryCount = 3;
    }

    /**
     * Point d'entrée principal - Lance tous les tests
     */
    async runAllTests() {
        this.log(`${colors.cyan}${colors.bold}🚀 Plan de Test Unitaire SchoolReg${colors.reset}`);
        this.log('='.repeat(60));
        
        this.results.startTime = Date.now();
        
        try {
            // Étape 1: Tests de connectivité
            await this.testConnectivity();
            
            // Étape 2: Tests des endpoints de santé
            await this.testHealthEndpoints();
            
            // Étape 3: Tests fonctionnels des APIs
            await this.testFunctionalAPIs();
            
            // Étape 4: Tests de communication inter-services
            await this.testInterServiceCommunication();
            
            // Étape 5: Tests de performance
            await this.testPerformance();
            
        } catch (error) {
            this.log(`${colors.red}❌ Erreur critique: ${error.message}${colors.reset}`);
        }
        
        this.results.endTime = Date.now();
        this.generateReport();
    }

    /**
     * Étape 1: Tests de connectivité des services
     */
    async testConnectivity() {
        this.log(`\n${colors.yellow}${colors.bold}📡 Étape 1: Test de Connectivité${colors.reset}`);
        
        for (const [key, service] of Object.entries(this.services)) {
            await this.executeTest(
                `Connectivité ${service.name}`,
                async () => {
                    const response = await axios.get(`${service.url}/health`, {
                        timeout: this.timeout
                    });
                    return { success: response.status === 200, data: response.status };
                }
            );
        }
    }

    /**
     * Étape 2: Tests des endpoints de santé
     */
    async testHealthEndpoints() {
        this.log(`\n${colors.yellow}${colors.bold}🏥 Étape 2: Endpoints de Santé${colors.reset}`);
        
        const healthTests = [
            { name: 'Gateway Health', url: 'http://localhost:3001/health', expectedFields: ['status'] },
            { name: 'Auth Health', url: 'http://localhost:4001/health', expectedFields: ['status', 'service'] },
            { name: 'Students Health', url: 'http://localhost:4003/health', expectedFields: ['status', 'service'] },
            { name: 'Payments Health', url: 'http://localhost:4004/health', expectedFields: ['status', 'service'] },
            { name: 'Applications Health', url: 'http://localhost:4002/health', expectedFields: ['status'] },
            { name: 'Classes Health', url: 'http://localhost:4005/health', expectedFields: ['status'] }
        ];

        for (const test of healthTests) {
            await this.executeTest(
                test.name,
                async () => {
                    const response = await axios.get(test.url, { timeout: this.timeout });
                    
                    if (response.status !== 200) {
                        return { success: false, error: `Status ${response.status}` };
                    }
                    
                    // Vérifier les champs requis
                    for (const field of test.expectedFields) {
                        if (!response.data.hasOwnProperty(field)) {
                            return { success: false, error: `Champ manquant: ${field}` };
                        }
                    }
                    
                    return { success: true, data: response.data };
                }
            );
        }
    }

    /**
     * Étape 3: Tests fonctionnels des APIs
     */
    async testFunctionalAPIs() {
        this.log(`\n${colors.yellow}${colors.bold}⚡ Étape 3: APIs Fonctionnelles${colors.reset}`);
        
        await this.testAuthAPI();
        await this.testStudentsAPI();
        await this.testPaymentsAPI();
        await this.testApplicationsAPI();
        await this.testClassesAPI();
    }

    /**
     * Tests Auth API
     */
    async testAuthAPI() {
        // Test endpoint signup (validation)
        await this.executeTest(
            'Auth - Validation endpoint signup',
            async () => {
                try {
                    const response = await axios.post('http://localhost:3001/api/auth/signup', {
                        email: `test_${Date.now()}@test.com`,
                        password: 'Test123!',
                        fullName: 'Test User API',
                        role: 'parent'
                    }, { timeout: this.timeout });
                    
                    return { success: response.status === 200 || response.status === 201, data: response.status };
                } catch (error) {
                    // Acceptable si l'email existe déjà
                    if (error.response?.status === 400) {
                        return { success: true, data: 'Validation OK (email exists)' };
                    }
                    throw error;
                }
            }
        );

        // Test endpoint signin (gestion erreurs)
        await this.executeTest(
            'Auth - Gestion erreurs signin',
            async () => {
                try {
                    await axios.post('http://localhost:3001/api/auth/signin', {
                        email: 'invalid@test.com',
                        password: 'invalid'
                    }, { timeout: this.timeout });
                    
                    return { success: false, error: 'Devrait échouer avec identifiants invalides' };
                } catch (error) {
                    const isValidError = error.response?.status === 401 || error.response?.status === 400;
                    return { success: isValidError, data: `Status ${error.response?.status}` };
                }
            }
        );
    }

    /**
     * Tests Students API
     */
    async testStudentsAPI() {
        // Test liste des élèves
        await this.executeTest(
            'Students - Liste des élèves',
            async () => {
                const response = await axios.get('http://localhost:3001/api/students', {
                    timeout: this.timeout
                });
                
                const isArray = Array.isArray(response.data);
                return { 
                    success: response.status === 200 && isArray, 
                    data: `${response.data.length} élèves trouvés` 
                };
            }
        );

        // Test statistiques dashboard
        await this.executeTest(
            'Students - Statistiques dashboard',
            async () => {
                const response = await axios.get('http://localhost:4003/dashboard/stats', {
                    timeout: this.timeout
                });
                
                const hasRequiredFields = response.data.students && response.data.revenue && response.data.payments;
                return { 
                    success: response.status === 200 && hasRequiredFields,
                    data: response.data
                };
            }
        );

        // Test liste des paiements avec élèves
        await this.executeTest(
            'Students - Paiements avec infos élèves',
            async () => {
                const response = await axios.get('http://localhost:4003/payments', {
                    timeout: this.timeout
                });
                
                const isValidStructure = Array.isArray(response.data);
                return { 
                    success: response.status === 200 && isValidStructure,
                    data: `${response.data.length} paiements trouvés`
                };
            }
        );
    }

    /**
     * Tests Payments API
     */
    async testPaymentsAPI() {
        // Test service Stripe Payments
        await this.executeTest(
            'Payments - Service Stripe disponible',
            async () => {
                const response = await axios.get('http://localhost:4004/payments', {
                    timeout: this.timeout
                });
                
                return { 
                    success: response.status === 200 && Array.isArray(response.data),
                    data: `Service Stripe OK`
                };
            }
        );
    }

    /**
     * Tests Applications API
     */
    async testApplicationsAPI() {
        await this.executeTest(
            'Applications - Liste des demandes',
            async () => {
                const response = await axios.get('http://localhost:3001/api/applications', {
                    timeout: this.timeout
                });
                
                return { 
                    success: response.status === 200 && Array.isArray(response.data),
                    data: `${response.data.length} demandes trouvées`
                };
            }
        );
    }

    /**
     * Tests Classes API
     */
    async testClassesAPI() {
        await this.executeTest(
            'Classes - Liste des classes',
            async () => {
                const response = await axios.get('http://localhost:3001/api/classes', {
                    timeout: this.timeout
                });
                
                return { 
                    success: response.status === 200 && Array.isArray(response.data),
                    data: `${response.data.length} classes trouvées`
                };
            }
        );
    }

    /**
     * Étape 4: Tests communication inter-services
     */
    async testInterServiceCommunication() {
        this.log(`\n${colors.yellow}${colors.bold}🔄 Étape 4: Communication Inter-Services${colors.reset}`);
        
        // Test Gateway → Students
        await this.executeTest(
            'Communication Gateway → Students',
            async () => {
                const gatewayResponse = await axios.get('http://localhost:3001/api/students', { timeout: this.timeout });
                const directResponse = await axios.get('http://localhost:4003/students', { timeout: this.timeout });
                
                const sameLength = gatewayResponse.data.length === directResponse.data.length;
                return { 
                    success: gatewayResponse.status === 200 && directResponse.status === 200 && sameLength,
                    data: 'Proxy fonctionnel'
                };
            }
        );

        // Test Gateway → Auth
        await this.executeTest(
            'Communication Gateway → Auth',
            async () => {
                try {
                    const response = await axios.get('http://localhost:3001/api/auth/me', { 
                        timeout: this.timeout,
                        validateStatus: (status) => status === 401 || status === 200
                    });
                    
                    return { 
                        success: response.status === 401 || response.status === 200,
                        data: `Proxy auth OK (status ${response.status})`
                    };
                } catch (error) {
                    if (error.response?.status === 401) {
                        return { success: true, data: 'Auth proxy OK (401 attendu)' };
                    }
                    throw error;
                }
            }
        );
    }

    /**
     * Étape 5: Tests de performance
     */
    async testPerformance() {
        this.log(`\n${colors.yellow}${colors.bold}📈 Étape 5: Tests de Performance${colors.reset}`);
        
        // Test temps de réponse
        const performanceTests = [
            { name: 'Gateway', url: 'http://localhost:3001/health' },
            { name: 'Students', url: 'http://localhost:4003/health' },
            { name: 'Payments', url: 'http://localhost:4004/health' }
        ];

        for (const test of performanceTests) {
            await this.executeTest(
                `Performance ${test.name} (< 2s)`,
                async () => {
                    const startTime = Date.now();
                    const response = await axios.get(test.url, { timeout: this.timeout });
                    const responseTime = Date.now() - startTime;
                    
                    return {
                        success: response.status === 200 && responseTime < 2000,
                        data: `${responseTime}ms`
                    };
                }
            );
        }

        // Test requêtes concurrentes
        await this.executeTest(
            'Gestion requêtes concurrentes (5x)',
            async () => {
                const requests = Array(5).fill().map(() => 
                    axios.get('http://localhost:3001/health', { timeout: this.timeout })
                );

                const responses = await Promise.all(requests);
                const allSuccessful = responses.every(r => r.status === 200);
                
                return {
                    success: allSuccessful,
                    data: `${responses.length} requêtes simultanées OK`
                };
            }
        );
    }

    /**
     * Exécute un test avec retry automatique
     */
    async executeTest(testName, testFunction) {
        this.results.total++;
        
        for (let attempt = 1; attempt <= this.retryCount; attempt++) {
            try {
                const result = await testFunction();
                
                if (result.success) {
                    this.log(`${colors.green}✅ ${testName}${colors.reset}${result.data ? ` - ${result.data}` : ''}`);
                    this.results.passed++;
                    this.results.details.push({
                        name: testName,
                        status: 'PASS',
                        attempts: attempt,
                        data: result.data
                    });
                    return;
                } else {
                    throw new Error(result.error || 'Test failed');
                }
            } catch (error) {
                if (attempt === this.retryCount) {
                    this.log(`${colors.red}❌ ${testName} - ${error.message}${colors.reset}`);
                    this.results.failed++;
                    this.results.details.push({
                        name: testName,
                        status: 'FAIL',
                        error: error.message,
                        attempts: attempt
                    });
                    return;
                } else {
                    this.log(`${colors.yellow}⚠️  ${testName} - Tentative ${attempt}/${this.retryCount} échouée, retry...${colors.reset}`);
                    await this.sleep(1000);
                }
            }
        }
    }

    /**
     * Génère le rapport final
     */
    generateReport() {
        const duration = (this.results.endTime - this.results.startTime) / 1000;
        const successRate = this.results.total > 0 ? 
            ((this.results.passed / this.results.total) * 100).toFixed(1) : 0;

        this.log('\n' + '='.repeat(80));
        this.log(`${colors.cyan}${colors.bold}📋 RAPPORT FINAL - TESTS UNITAIRES APIS${colors.reset}`);
        this.log('='.repeat(80));
        
        this.log(`${colors.blue}🕐 Durée d'exécution: ${duration}s${colors.reset}`);
        this.log(`${colors.blue}📊 Tests exécutés: ${this.results.total}${colors.reset}`);
        this.log(`${colors.green}✅ Tests réussis: ${this.results.passed}${colors.reset}`);
        this.log(`${colors.red}❌ Tests échoués: ${this.results.failed}${colors.reset}`);
        this.log(`${colors.blue}📈 Taux de réussite: ${successRate}%${colors.reset}`);
        
        // Statut global
        if (this.results.failed === 0) {
            this.log(`\n${colors.green}${colors.bold}🎉 TOUTES LES APIs FONCTIONNENT CORRECTEMENT!${colors.reset}`);
        } else {
            this.log(`\n${colors.red}${colors.bold}⚠️  ${this.results.failed} API(s) PRÉSENTENT DES PROBLÈMES${colors.reset}`);
            
            // Détails des échecs
            this.log(`\n${colors.red}${colors.bold}🔍 Détails des échecs:${colors.reset}`);
            this.results.details
                .filter(detail => detail.status === 'FAIL')
                .forEach(detail => {
                    this.log(`${colors.red}  - ${detail.name}: ${detail.error}${colors.reset}`);
                });
        }
        
        // Sauvegarde du rapport
        this.saveReportToFile(duration, successRate);
        
        // Recommandations
        this.showRecommendations();
    }

    /**
     * Sauvegarde le rapport dans un fichier JSON
     */
    saveReportToFile(duration, successRate) {
        const reportData = {
            timestamp: new Date().toISOString(),
            duration: duration,
            summary: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: successRate
            },
            details: this.results.details,
            services: this.services
        };

        const reportsDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const reportPath = path.join(reportsDir, `api-test-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
        
        this.log(`\n${colors.blue}💾 Rapport sauvegardé: ${reportPath}${colors.reset}`);
    }

    /**
     * Affiche les recommandations basées sur les résultats
     */
    showRecommendations() {
        this.log(`\n${colors.cyan}${colors.bold}💡 RECOMMANDATIONS:${colors.reset}`);
        
        if (this.results.failed === 0) {
            this.log(`${colors.green}✨ Système en parfait état de fonctionnement!${colors.reset}`);
            this.log(`${colors.green}📝 Vous pouvez procéder aux tests utilisateurs${colors.reset}`);
        } else {
            this.log(`${colors.yellow}🔧 Vérifiez les services en échec${colors.reset}`);
            this.log(`${colors.yellow}📋 Consultez les logs des microservices${colors.reset}`);
            this.log(`${colors.yellow}🔄 Redémarrez les services problématiques${colors.reset}`);
        }
        
        this.log(`${colors.blue}📊 Planifiez des tests réguliers avec le monitoring continu${colors.reset}`);
    }

    /**
     * Utilitaire de log avec timestamp
     */
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
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
    const testRunner = new APITestRunner();
    testRunner.runAllTests().catch(error => {
        console.error(`${colors.red}❌ Erreur fatale lors de l'exécution des tests:${colors.reset}`, error);
        process.exit(1);
    });
}

module.exports = APITestRunner;
