// OllamaController.js - Proxy and Ollama operations management
const OllamaManager = require('../core/ollama/OllamaManager');
const ChatStorage = require('../core/storage/ChatStorage');
const SystemPromptController = require('./SystemPromptController');
const AttachmentController = require('./AttachmentController');
const ChatController = require('./ChatController');
const ProxyController = require('./ProxyController');
const ModelController = require('./ModelController');
const HealthController = require('./HealthController');
const logger = require('../core/logging/LoggingService');

class OllamaController {
    constructor(ollamaManager = null, chatStorage = null, mcpController = null) {
        this.ollamaManager = ollamaManager || new OllamaManager();
        this.chatStorage = chatStorage || new ChatStorage();
        this.mcpController = mcpController;
        this.systemPromptController = new SystemPromptController();
        this.attachmentController = new AttachmentController();
        // Pass mcpController to ChatController for MCP tool integration
        this.chatController = new ChatController(this.chatStorage, this.systemPromptController, this.attachmentController, mcpController);
        this.proxyController = new ProxyController(this.chatController);
        this.modelController = new ModelController(this.ollamaManager, null, this.proxyController, this.chatController);
        this.healthController = new HealthController(this.ollamaManager);
    }

    // Model loading progress check - Delegated to ModelController
    async getModelProgress(req, res) {
        return this.modelController.getModelProgress(req, res);
    }

    // Model warm-up (pre-loading) - Delegated to ModelController  
    async warmupModel(req, res) {
        return this.modelController.warmupModel(req, res);
    }

    // Health check Ollama - Delegated to HealthController
    async getHealth(req, res) {
        return this.healthController.getHealth(req, res);
    }

    // List local models
    async getLocalModels(req, res) {
        try {
            const result = await this.ollamaManager.listLocalModels();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error listing local models:', error);
            logger.model('error', 'Failed to list local models', { error: error.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Failed to list local models'
            }));
        }
    }

    // Ollama Status - Delegated to HealthController
    async getStatus(req, res) {
        return this.healthController.getStatus(req, res);
    }

    // Start Ollama - Delegated to HealthController
    async startOllama(req, res) {
        return this.healthController.startOllama(req, res);
    }

    // Start Ollama (Legacy)
    async startOllamaLegacy(req, res) {
        try {
            const result = await this.ollamaManager.autoStart();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error starting Ollama (legacy):', error);
            logger.app('error', 'Failed to start Ollama (legacy)', { error: error.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Failed to start Ollama (legacy)'
            }));
        }
    }

    // Stop Ollama - Delegated to HealthController
    async stopOllama(req, res) {
        return this.healthController.stopOllama(req, res);
    }


    // Proxy for Ollama API - Delegated to ProxyController
    async proxyToOllama(req, res) {
        // Check if Ollama is active before proxying
        const status = await this.ollamaManager.getStatus();
        if (!status.isRunning) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Ollama not running',
                suggestion: 'Use /api/ollama/start to start Ollama first'
            }));
            return;
        }

        return this.proxyController.proxyToOllama(req, res);
    }

    // Chat with real-time streaming (SSE) - Delegated to ChatController
    async sendChatMessageStream(req, res) {
        return this.chatController.sendChatMessageStream(req, res, this.ollamaManager);
    }

    // Chat with auto-save (main method - backward compatibility)
    async sendChatMessage(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { message, model, chatId, stream = false } = JSON.parse(body);

                console.log(`💬 Chat request:`, { chatId, model, messageLength: message.length, stream });

                // Determine dynamic timeout
                const timeout = await this._getTimeoutForModel(model);
                console.log(`🕐 Timeout set to ${timeout/1000}s for ${model}`);

                // Make request to Ollama (streaming controlled by parameter)
                const ollamaResponse = await this.proxyController._makeOllamaRequest('/api/generate', 'POST', {
                    model: model,
                    prompt: message,
                    stream: stream
                }, timeout);

                // Extract response text (handles both streaming and non-streaming)
                let responseText = '';
                if (stream && ollamaResponse.chunks) {
                    // Streaming response: aggregate all chunks
                    responseText = ollamaResponse.chunks.map(chunk => chunk.response || '').join('');
                } else if (ollamaResponse.response) {
                    // Non-streaming response: use response directly
                    responseText = ollamaResponse.response;
                }

                // Save user message and response in chat storage
                if (chatId && chatId !== 'web-search-temp') {
                    // Save user message
                    this.chatStorage.addMessage(chatId, 'user', message);

                    // Save assistant response
                    if (responseText) {
                        this.chatStorage.addMessage(chatId, 'assistant', responseText);
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    response: responseText,
                    chatId: chatId,
                    data: ollamaResponse
                }));

            } catch (error) {
                console.error('❌ Error sending chat message:', error);
                console.error('Error stack:', error.stack);

                // Specific handling for timeout
                let errorMessage = error.message;
                const isTimeout = error.message.includes('timeout');
                if (isTimeout) {
                    errorMessage = `Timeout: Model ${JSON.parse(body).model || 'unknown'} is taking too long. Try a smaller model or increase the timeout.`;
                }

                logger.chat('error', 'Chat message failed', { error: error.message, isTimeout, stack: error.stack });

                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: errorMessage,
                    details: error.message
                }));
            }
        });
    }
    
    // Utility: Get dynamic timeout for model (simplified version, delegates to ChatController)
    async _getTimeoutForModel(modelName) {
        return this.chatController._getTimeoutForModel(modelName);
    }

    // ========== SYSTEM PROMPTS MANAGEMENT ==========

    // Get all system prompts - Delegated to SystemPromptController
    async getSystemPrompts(req, res) {
        return this.systemPromptController.getSystemPrompts(req, res);
    }
    
    // Save system prompt for a model - Delegated to SystemPromptController
    async saveSystemPrompt(req, res) {
        return this.systemPromptController.saveSystemPrompt(req, res);
    }
    
    // Delete system prompt for a model - Delegated to SystemPromptController
    async deleteSystemPrompt(req, res) {
        return this.systemPromptController.deleteSystemPrompt(req, res);
    }
}

module.exports = OllamaController;