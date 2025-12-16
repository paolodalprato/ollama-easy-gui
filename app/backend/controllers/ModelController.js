// ModelController.js - Model operations management
const OllamaManager = require('../core/ollama/OllamaManager');
const HubSearcher = require('../core/ollama/HubSearcher');
const logger = require('../core/logging/LoggingService');

class ModelController {
    constructor(ollamaManager = null, hubSearcher = null, proxyController = null, chatController = null) {
        this.ollamaManager = ollamaManager || new OllamaManager();
        this.hubSearcher = hubSearcher || new HubSearcher();
        this.proxyController = proxyController;
        this.chatController = chatController;
    }

    // Download model from Ollama Hub
    async downloadModel(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { modelName } = JSON.parse(body);
                console.log(`🔽 Starting download for model: ${modelName}`);
                
                const result = await this.ollamaManager.downloadModel(modelName);
                
                res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('❌ Error downloading model:', error);
                logger.model('error', 'Model download failed', { model: JSON.parse(body).modelName, error: error.message });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to download model'
                }));
            }
        });
    }

    // Check model download progress
    async getDownloadProgress(req, res) {
        try {
            const result = this.ollamaManager.checkDownloadProgress();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error checking download progress:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Failed to check download progress'
            }));
        }
    }

    // Remove local model
    async removeModel(req, res) {
        try {
            const modelName = decodeURIComponent(req.url.split('/').pop());
            
            console.log(`🗑️ Removing model: ${modelName}`);
            
            const result = await this.ollamaManager.removeModel(modelName);
            
            res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error removing model:', error);
            logger.model('error', 'Model removal failed', { model: decodeURIComponent(req.url.split('/').pop()), error: error.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Failed to remove model'
            }));
        }
    }

    // List available models for download
    async searchModels(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { searchTerm, category } = JSON.parse(body);
                
                console.log(`🔍 Searching models: "${searchTerm}" in category: ${category}`);
                
                // Use HubSearcher to get real results
                const result = await this.hubSearcher.searchModels(searchTerm, category);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('❌ Error searching models:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Failed to search models' 
                }));
            }
        });
    }

    // List installed local models
    async listLocalModels(req, res) {
        try {
            const result = await this.ollamaManager.getLocalModels();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error listing local models:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to list local models' 
            }));
        }
    }

    // Get detailed information about a model
    async getModelInfo(req, res) {
        try {
            const modelName = decodeURIComponent(req.url.split('/').pop());
            
            const result = await this.ollamaManager.getModelInfo(modelName);
            
            res.writeHead(result.success ? 200 : 404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error getting model info:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to get model info' 
            }));
        }
    }

    // Calculate dynamic timeout based on model size
    async getTimeoutForModel(modelName, modelList = null) {
        if (!modelName) return 60000; // Default 60 seconds for server
        
        try {
            // If we have the model list, search for model information
            if (modelList) {
                const modelInfo = modelList.find(m => m.name === modelName);
                if (modelInfo) {
                    return this._calculateTimeoutFromModelInfo(modelInfo);
                }
            }
            
            // Fallback: try to get info via local API
            try {
                const response = await this.ollamaManager.getLocalModels();
                if (response && response.success && response.data) {
                    const modelInfo = response.data.find(m => m.name === modelName);
                    if (modelInfo) {
                        return this._calculateTimeoutFromModelInfo(modelInfo);
                    }
                }
            } catch (apiError) {
                // API not available, use heuristic
            }
            
            // Last fallback: name-based heuristic
            return this._calculateTimeoutFromName(modelName);
            
        } catch (error) {
            console.warn(`⚠️ Could not determine model size for ${modelName}, using heuristic`);
            return this._calculateTimeoutFromName(modelName);
        }
    }

    // Utility: Calculate timeout based on model information
    _calculateTimeoutFromModelInfo(modelInfo) {
        const sizeBytes = modelInfo.size || 0;
        const sizeGB = sizeBytes / (1000 * 1000 * 1000); // Decimal standard like Ollama CLI

        // Progressive timeout based on size
        if (sizeGB > 70) return 900000; // 15 minutes for ultra-large models (>70GB)
        if (sizeGB > 30) return 600000; // 10 minutes for very large models (30-70GB)
        if (sizeGB > 10) return 300000; // 5 minutes for large models (10-30GB)
        if (sizeGB > 3) return 180000;  // 3 minutes for medium models (3-10GB)
        return 120000; // 2 minutes for small models (<3GB)
    }

    // Utility: Name-based heuristic (fallback)
    _calculateTimeoutFromName(modelName) {
        const name = modelName.toLowerCase();

        // Identify reasoning models that require extreme timeouts
        if (name.includes('qwq') || name.includes('deepseek-r1') || name.includes('reasoning')) {
            return 1800000; // 30 minutes for reasoning models
        }

        // Identify large models by parameters (approximate)
        if (name.includes('70b') || name.includes('72b')) return 600000; // 10 minutes
        if (name.includes('30b') || name.includes('32b')) return 300000; // 5 minutes
        if (name.includes('13b') || name.includes('14b')) return 180000; // 3 minutes
        if (name.includes('7b') || name.includes('8b')) return 120000;   // 2 minutes

        // Default for unidentified models
        return 120000; // 2 minutes
    }

    // Utility: Check if a model is available locally
    async isModelAvailable(modelName) {
        try {
            const result = await this.ollamaManager.getLocalModels();
            if (result.success && result.data) {
                return result.data.some(model => model.name === modelName);
            }
            return false;
        } catch (error) {
            console.error('❌ Error checking model availability:', error);
            return false;
        }
    }

    // Utility: Get model list with cache
    async getCachedModelList() {
        try {
            const result = await this.ollamaManager.getLocalModels();
            return result.success ? result.data : [];
        } catch (error) {
            console.error('❌ Error getting cached model list:', error);
            return [];
        }
    }

    // ========== MODEL OPERATIONS FROM OLLAMA CONTROLLER ==========

    /**
     * Get model loading progress (extracted from OllamaController)
     * Checks if a specific model is currently loaded in memory
     */
    async getModelProgress(req, res) {
        try {
            const modelName = decodeURIComponent(req.url.split('/').pop());
            
            const response = await this.proxyController._makeOllamaRequest('/api/ps');
            const runningModels = response.models || [];
            const targetModel = runningModels.find(m => m.name === modelName);
            
            const progress = {
                isLoaded: !!targetModel,
                loadingProgress: targetModel ? 100 : 0,
                modelInfo: targetModel || null
            };
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: progress
            }));
        } catch (error) {
            console.error('❌ Error checking model progress:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to check model progress' 
            }));
        }
    }

    /**
     * Warm-up model (pre-loading) - extracted from OllamaController
     * Pre-loads a model into memory for faster response times
     */
    async warmupModel(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { model } = JSON.parse(body);
                console.log(`🔥 Warming up model: ${model}`);
                
                // Determine dynamic timeout for warmup
                const timeout = this.chatController ?
                    await this.chatController._getTimeoutForModel(model) : 120000;
                console.log(`🕐 Warmup timeout set to ${timeout/1000}s`);
                
                const response = await this.proxyController._makeOllamaRequest('/api/generate', 'POST', {
                    model: model,
                    prompt: "Hi",
                    stream: false
                }, timeout);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `Model ${model} warmed up successfully`,
                    data: response
                }));
            } catch (error) {
                console.error('❌ Error warming up model:', error);
                logger.model('error', 'Model warmup failed', { model: JSON.parse(body).model, error: error.message });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: `Failed to warm up model: ${error.message}`
                }));
            }
        });
    }
}

module.exports = ModelController;