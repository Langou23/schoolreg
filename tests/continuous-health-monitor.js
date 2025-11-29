/**
 * Monitoring Continu de Santé des APIs
 * Surveille en permanence l'état des microservices
 */

const APIHealthChecker = require('./api-health-checker');
const colors = require('colors');

class ContinuousHealthMonitor {
    constructor() {
        this.checker = new APIHealthChecker();
        this.interval = 30000; // 30 secondes par défaut
        this.isRunning = false;
        this.monitoringId = null;
        this.alertThreshold = 70; // Seuil d'alerte si taux de réussite < 70%
    }

    /**
     * Démarre le monitoring continu
     */
    start(intervalMs = this.interval) {
        if (this.isRunning) {
            console.log('⚠️  Le monitoring est déjà en cours...'.yellow);
            return;
        }

        this.interval = intervalMs;
        this.isRunning = true;

        console.log('🚀 Démarrage du monitoring continu des APIs'.cyan.bold);
        console.log(`⏰ Intervalle: ${this.interval / 1000}s`);
        console.log('📊 Seuil d\'alerte: ' + `${this.alertThreshold}%`.red);
        console.log('⚡ Appuyez sur Ctrl+C pour arrêter\n');

        // Premier test immédiat
        this.runHealthCheck();

        // Tests périodiques
        this.monitoringId = setInterval(() => {
            this.runHealthCheck();
        }, this.interval);

        // Gestion de l'arrêt propre
        process.on('SIGINT', () => {
            this.stop();
        });
    }

    /**
     * Arrête le monitoring
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        console.log('\n🛑 Arrêt du monitoring...'.yellow);
        
        if (this.monitoringId) {
            clearInterval(this.monitoringId);
        }
        
        this.isRunning = false;
        console.log('✅ Monitoring arrêté avec succès'.green);
        process.exit(0);
    }

    /**
     * Exécute un contrôle de santé complet
     */
    async runHealthCheck() {
        const timestamp = new Date().toISOString();
        console.log(`\n🔍 Contrôle de santé - ${timestamp}`.cyan);
        console.log('-'.repeat(60));

        try {
            // Reset des résultats pour ce cycle
            this.checker.results = {
                passed: 0,
                failed: 0,
                total: 0,
                details: []
            };

            // Tests rapides de connectivité seulement
            await this.quickHealthCheck();

            // Analyse des résultats
            this.analyzeResults();

        } catch (error) {
            console.error('❌ Erreur lors du contrôle de santé:'.red, error.message);
        }
    }

    /**
     * Tests de santé rapides (connectivité + endpoints critiques)
     */
    async quickHealthCheck() {
        const criticalEndpoints = [
            { name: 'Gateway', url: 'http://localhost:3001/health' },
            { name: 'Auth', url: 'http://localhost:4001/health' },
            { name: 'Students', url: 'http://localhost:4003/health' },
            { name: 'Payments', url: 'http://localhost:4004/health' },
            { name: 'Applications', url: 'http://localhost:4002/health' },
            { name: 'Classes', url: 'http://localhost:4005/health' }
        ];

        for (const endpoint of criticalEndpoints) {
            await this.checker.testWithRetry(
                endpoint.name,
                async () => {
                    const response = await this.checker.axios.get(endpoint.url, {
                        timeout: 5000 // Timeout plus court pour monitoring
                    });
                    return response.status === 200;
                }
            );
        }
    }

    /**
     * Analyse les résultats et génère des alertes si nécessaire
     */
    analyzeResults() {
        const results = this.checker.results;
        const successRate = results.total > 0 ? 
            ((results.passed / results.total) * 100).toFixed(1) : 0;

        // Affichage du résumé
        if (results.failed === 0) {
            console.log('✅ Tous les services fonctionnent correctement'.green.bold);
        } else {
            console.log(`⚠️  ${results.failed}/${results.total} services en échec`.red.bold);
        }

        console.log(`📊 Taux de réussite: ${successRate}%`);

        // Alerte si taux de réussite trop bas
        if (parseFloat(successRate) < this.alertThreshold) {
            this.sendAlert(successRate, results);
        }

        // Affichage des échecs
        const failures = results.details.filter(d => d.status === 'FAIL');
        if (failures.length > 0) {
            console.log('🔥 Services en échec:'.red);
            failures.forEach(failure => {
                console.log(`  - ${failure.name}: ${failure.error}`.red);
            });
        }
    }

    /**
     * Envoie une alerte en cas de problème critique
     */
    sendAlert(successRate, results) {
        console.log('\n🚨 ALERTE SYSTÈME'.red.bold.bgYellow);
        console.log(`⚠️  Taux de réussite critique: ${successRate}%`.red.bold);
        console.log(`🔥 Nombre de services en échec: ${results.failed}`.red.bold);
        
        // Ici, vous pourriez ajouter:
        // - Envoi d'email
        // - Notification Slack
        // - Webhook vers système de monitoring
        // - etc.
    }
}

// Utilisation si lancé directement
if (require.main === module) {
    const monitor = new ContinuousHealthMonitor();
    
    // Lire les arguments de ligne de commande
    const args = process.argv.slice(2);
    let interval = 30000; // 30s par défaut
    
    if (args.length > 0) {
        const inputInterval = parseInt(args[0]);
        if (inputInterval && inputInterval >= 5) {
            interval = inputInterval * 1000;
        } else {
            console.log('⚠️  Intervalle minimum: 5 secondes');
        }
    }
    
    monitor.start(interval);
}

module.exports = ContinuousHealthMonitor;
