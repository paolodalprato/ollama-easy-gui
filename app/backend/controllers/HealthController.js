/**
 * HealthController - Health Monitoring & Status Operations
 * 
 * Handles health checks, status monitoring, and Ollama service management
 * Extracted from OllamaController.js for backend modular architecture compliance
 * 
 * Dependencies:
 * - OllamaManager: Core Ollama service management
 */

class HealthController {
    constructor(ollamaManager = null) {
        this.ollamaManager = ollamaManager;
        console.log('🏥 HealthController initialized');
    }

    /**
     * Health check Ollama service
     * Comprehensive health verification
     */
    async getHealth(req, res) {
        try {
            const isHealthy = await this.ollamaManager.checkOllamaHealth();
            const result = { 
                success: isHealthy, 
                running: isHealthy,
                message: isHealthy ? 'Ollama is running' : 'Ollama is not responding'
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error checking Ollama health:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to check Ollama health' 
            }));
        }
    }

    /**
     * Get Ollama service status
     * Detailed status information with version and uptime
     */
    async getStatus(req, res) {
        try {
            const status = await this.ollamaManager.getStatus();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
        } catch (error) {
            console.error('❌ Error getting Ollama status:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to get Ollama status' 
            }));
        }
    }

    /**
     * Start Ollama service
     * Attempts to start Ollama with proper initialization
     */
    async startOllama(req, res) {
        try {
            console.log('🚀 Starting Ollama...');
            const result = await this.ollamaManager.startOllamaServer();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: result,
                message: result ? 'Ollama started successfully' : 'Failed to start Ollama'
            }));
        } catch (error) {
            console.error('❌ Error starting Ollama:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to start Ollama' 
            }));
        }
    }

    /**
     * Stop Ollama service
     * Gracefully stops Ollama service with cleanup
     */
    async stopOllama(req, res) {
        try {
            const result = await this.ollamaManager.stopOllama();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error stopping Ollama:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to stop Ollama' 
            }));
        }
    }
}

module.exports = HealthController;