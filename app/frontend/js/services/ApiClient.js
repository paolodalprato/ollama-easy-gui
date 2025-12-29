/**
 * ApiClient - Centralized HTTP client for all backend API calls
 *
 * Provides a clean interface for frontend components to communicate
 * with the Node.js backend. All API calls return parsed JSON responses.
 *
 * @class ApiClient
 */
class ApiClient {
    /**
     * Create an ApiClient instance
     */
    constructor() {
        /** @type {string} Base URL for API calls (empty = same origin) */
        this.baseURL = '';

        console.log('🌐 ApiClient initialized');
    }

    // === OLLAMA API CALLS ===

    /**
     * Get Ollama server status
     * @returns {Promise<{success: boolean, isRunning: boolean, version?: string}>}
     */
    async getOllamaStatus() {
        const response = await fetch('/api/ollama/status');
        return await response.json();
    }

    /**
     * Start Ollama server
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async startOllama() {
        const response = await fetch('/api/ollama/start', { method: 'POST' });
        return await response.json();
    }

    /**
     * Stop Ollama server
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async stopOllama() {
        const response = await fetch('/api/ollama/stop', { method: 'POST' });
        return await response.json();
    }

    /**
     * Get list of local models (simplified format)
     * @returns {Promise<{success: boolean, data: Object[]}>}
     */
    async getOllamaModels() {
        const response = await fetch('/api/ollama/models');
        return await response.json();
    }

    /**
     * Get models list in Ollama native format
     * Used by ModelManagerCoordinator for detailed model info
     * @returns {Promise<{models: Object[]}>} Ollama native format
     */
    async getModelsList() {
        const response = await fetch('/api/ollama/proxy/api/tags');
        return await response.json();
    }

    // === CHAT API CALLS ===

    /**
     * Create a new empty chat
     * @returns {Promise<{success: boolean, chatId: string}>}
     */
    async createChat() {
        const response = await fetch('/api/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        return await response.json();
    }

    /**
     * Get list of all chats
     * @returns {Promise<{success: boolean, data: Object[]}>}
     */
    async getChatList() {
        const response = await fetch('/api/chat/list');
        return await response.json();
    }

    /**
     * Load a specific chat by ID
     * @param {string} chatId - Chat identifier
     * @returns {Promise<{success: boolean, data: Object}>}
     */
    async loadChat(chatId) {
        const response = await fetch(`/api/chat/load/${chatId}`);
        return await response.json();
    }

    /**
     * Create a new chat with title and model
     * @param {string} title - Chat title
     * @param {string} model - Model name to use
     * @returns {Promise<{success: boolean, chatId: string}>}
     */
    async createNewChat(title, model) {
        const response = await fetch('/api/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, model })
        });
        return await response.json();
    }

    /**
     * Send a message (non-streaming)
     * @param {string} message - User message
     * @param {string} model - Model name
     * @param {string} chatId - Chat identifier
     * @returns {Promise<{success: boolean, response: string}>}
     */
    async sendMessage(message, model, chatId) {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, model, chatId })
        });
        return await response.json();
    }

    /**
     * Delete a chat
     * @param {string} chatId - Chat identifier
     * @returns {Promise<{success: boolean}>}
     */
    async deleteChat(chatId) {
        const response = await fetch(`/api/chat/delete/${chatId}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    /**
     * Update chat title
     * @param {string} chatId - Chat identifier
     * @param {string} title - New title
     * @returns {Promise<{success: boolean}>}
     */
    async updateChatTitle(chatId, title) {
        const response = await fetch(`/api/chat/update/${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        return await response.json();
    }

    /**
     * Get chat statistics
     * @returns {Promise<{success: boolean, data: {totalChats: number, totalMessages: number}}>}
     */
    async getChatStats() {
        const response = await fetch('/api/chat/stats');
        return await response.json();
    }

    /**
     * Get attachments for a chat
     * @param {string} chatId - Chat identifier
     * @returns {Promise<{success: boolean, data: Object[]}>}
     */
    async getChatAttachments(chatId) {
        const response = await fetch(`/api/chat/attachments/${chatId}`);
        return await response.json();
    }

    /**
     * Upload a file attachment to a chat
     * @param {string} chatId - Chat identifier
     * @param {File} file - File to upload
     * @returns {Promise<{success: boolean, filename: string}>}
     */
    async uploadFile(chatId, file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/chat/upload/${chatId}`, {
            method: 'POST',
            body: formData
        });
        return await response.json();
    }

    // === MODEL MANAGEMENT API CALLS ===

    /**
     * Search models in Ollama Hub
     * @param {string} searchTerm - Search query
     * @param {string} category - Category filter (optional)
     * @returns {Promise<{success: boolean, data: Object[]}>}
     */
    async searchModels(searchTerm, category) {
        const response = await fetch('/api/models/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm, category })
        });
        return await response.json();
    }

    /**
     * Start downloading a model from Ollama Hub
     * @param {string} modelName - Model name to download
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async downloadModel(modelName) {
        const response = await fetch('/api/models/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelName })
        });
        return await response.json();
    }

    /**
     * Remove a local model
     * @param {string} modelName - Model name to remove
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async removeModel(modelName) {
        const response = await fetch(`/api/models/remove/${encodeURIComponent(modelName)}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    /**
     * Get download progress for a model
     * @param {string} modelName - Model name being downloaded
     * @returns {Promise<{success: boolean, percentage: number, status: string, details: string}>}
     */
    async getModelProgress(modelName) {
        const response = await fetch(`/api/ollama/model-progress/${encodeURIComponent(modelName)}`);
        return await response.json();
    }

    // === SYSTEM API CALLS ===

    /**
     * Shutdown the application
     * @returns {Promise<{success: boolean}>}
     */
    async shutdown() {
        const response = await fetch('/api/shutdown', { method: 'POST' });
        return await response.json();
    }

    /**
     * Get streaming enabled setting
     * @returns {Promise<{success: boolean, enabled: boolean}>}
     */
    async getStreamingEnabled() {
        const response = await fetch('/api/settings/streaming');
        return await response.json();
    }

    /**
     * Set streaming enabled setting
     * @param {boolean} enabled - Whether streaming is enabled
     * @returns {Promise<{success: boolean}>}
     */
    async setStreamingEnabled(enabled) {
        const response = await fetch('/api/settings/streaming', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        return await response.json();
    }

    // === UTILITY METHODS ===

    /**
     * Make a generic API request with default headers
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Parsed JSON response
     * @throws {Error} On HTTP error or network failure
     */
    async makeRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    /**
     * Make a request with configurable timeout
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
     * @returns {Promise<Object>} Parsed JSON response
     * @throws {Error} On timeout, HTTP error, or network failure
     */
    async makeRequestWithTimeout(url, options = {}, timeoutMs = 30000) {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: abortController.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new Error(`Request timeout (${timeoutMs/1000}s)`);
            }

            throw error;
        }
    }

    // === MCP API CALLS ===

    /**
     * Get MCP (Model Context Protocol) status
     * @returns {Promise<{success: boolean, data: {isInitialized: boolean, connectedServers: string[]}}>}
     */
    async getMCPStatus() {
        const response = await fetch('/api/mcp/status');
        return await response.json();
    }

    /**
     * Get available MCP tools
     * @returns {Promise<{success: boolean, data: {tools: Object[], count: number}}>}
     */
    async getMCPTools() {
        const response = await fetch('/api/mcp/tools');
        return await response.json();
    }

    /**
     * Get configured MCP servers
     * @returns {Promise<{success: boolean, data: {servers: Object[]}}>}
     */
    async getMCPServers() {
        const response = await fetch('/api/mcp/servers');
        return await response.json();
    }

    /**
     * Enable or disable an MCP server
     * @param {string} serverName - Server identifier
     * @param {boolean} enabled - Whether to enable the server
     * @returns {Promise<{success: boolean}>}
     */
    async toggleMCPServer(serverName, enabled) {
        const response = await fetch('/api/mcp/toggle-server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverName, enabled })
        });
        return await response.json();
    }

    /**
     * Execute an MCP tool
     * @param {string} toolName - Tool identifier
     * @param {Object} parameters - Tool parameters
     * @returns {Promise<{success: boolean, data: {result: any}}>}
     */
    async executeMCPTool(toolName, parameters) {
        const response = await fetch('/api/mcp/execute-tool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolName, parameters })
        });
        return await response.json();
    }

    /**
     * Reload MCP configuration from file
     * @returns {Promise<{success: boolean}>}
     */
    async reloadMCPConfig() {
        const response = await fetch('/api/mcp/reload-config', { method: 'POST' });
        return await response.json();
    }

    // === STREAMING API ===

    /**
     * Send a message with real-time streaming response
     * Supports MCP tool execution with real-time callbacks
     *
     * @param {string} message - User message
     * @param {string} model - Model name
     * @param {string} chatId - Chat identifier
     * @param {Function} onChunk - Callback for each response chunk (content, fullData)
     * @param {Function} onComplete - Callback when stream completes (finalData)
     * @param {Function} onError - Callback on error (error)
     * @param {Object} options - Additional options
     * @param {boolean} options.enableMCP - Enable MCP tool execution
     * @param {Function} options.onToolCall - Callback for tool calls
     * @param {Function} options.onToolResult - Callback for tool results
     * @param {Function} options.onMCPStatus - Callback for MCP status updates
     * @returns {AbortController} Controller to cancel the stream
     */
    sendMessageStream(message, model, chatId, onChunk, onComplete, onError, options = {}) {
        const { enableMCP = false, onToolCall = null, onToolResult = null, onMCPStatus = null } = options;

        console.log('📡 Starting streaming chat...', { enableMCP });

        // Create AbortController for stream cancellation
        const abortController = new AbortController();

        // First send the request to start streaming
        const streamPromise = fetch('/api/chat/send-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, model, chatId, enableMCP }),
            signal: abortController.signal
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Parse the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            const processStream = () => {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        // Process any remaining buffer content before ending
                        if (buffer.trim()) {
                            this._processSSEEvent(buffer, onChunk, onComplete, onError, { onToolCall, onToolResult, onMCPStatus });
                        }
                        console.log('📊 Stream ended');
                        return;
                    }

                    // Decode chunk and add to buffer
                    buffer += decoder.decode(value, { stream: true });

                    // Process complete SSE events
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop(); // Keep incomplete event in buffer

                    for (const eventBlock of lines) {
                        if (eventBlock.trim()) {
                            this._processSSEEvent(eventBlock, onChunk, onComplete, onError, { onToolCall, onToolResult, onMCPStatus });
                        }
                    }

                    return processStream(); // Continue reading
                });
            };
            
            return processStream();
        }).catch(error => {
            if (error.name === 'AbortError') {
                console.log('⏹️ Stream aborted by user');
                if (onError) onError(new Error('Stream cancelled by user'));
            } else {
                console.error('❌ Streaming error:', error);
                if (onError) onError(error);
            }
        });
        
        // Return the AbortController so caller can cancel stream
        return abortController;
    }
    
    /**
     * Process a Server-Sent Event block
     * Parses SSE format and routes to appropriate callbacks
     *
     * @param {string} eventBlock - Raw SSE event block
     * @param {Function} onChunk - Callback for chunk events
     * @param {Function} onComplete - Callback for complete event
     * @param {Function} onError - Callback for error events
     * @param {Object} mcpCallbacks - MCP-specific callbacks
     * @private
     */
    _processSSEEvent(eventBlock, onChunk, onComplete, onError, mcpCallbacks = {}) {
        const { onToolCall, onToolResult, onMCPStatus } = mcpCallbacks;
        const lines = eventBlock.trim().split('\n');
        let eventType = 'message';
        let data = '';

        for (const line of lines) {
            if (line.startsWith('event: ')) {
                eventType = line.substring(7);
            } else if (line.startsWith('data: ')) {
                data = line.substring(6);
            }
        }

        if (data) {
            try {
                const parsedData = JSON.parse(data);

                console.log(`📡 SSE Event [${eventType}]:`, parsedData);

                switch (eventType) {
                    case 'chunk':
                        if (onChunk && parsedData.content) {
                            onChunk(parsedData.content, parsedData);
                        }
                        break;
                    case 'complete':
                        if (onComplete) {
                            onComplete(parsedData);
                        }
                        break;
                    case 'error':
                        if (onError) {
                            onError(new Error(parsedData.message || 'Stream error'));
                        }
                        break;
                    case 'status':
                    case 'stream_start':
                    case 'message_saved':
                        // Info events - just log
                        console.log(`📊 ${eventType}:`, parsedData);
                        break;

                    // MCP Events
                    case 'mcp_status':
                        console.log(`🤖 MCP Status:`, parsedData);
                        if (onMCPStatus) {
                            onMCPStatus(parsedData);
                        }
                        break;
                    case 'tool_call':
                        console.log(`🔧 Tool Call:`, parsedData);
                        if (onToolCall) {
                            onToolCall(parsedData);
                        }
                        break;
                    case 'tool_result':
                        console.log(`✅ Tool Result:`, parsedData);
                        if (onToolResult) {
                            onToolResult(parsedData);
                        }
                        break;
                    case 'warning':
                        console.warn(`⚠️ Warning:`, parsedData);
                        break;
                }
                
            } catch (parseError) {
                // Only warn for non-empty data - empty data is normal at stream end
                if (data.trim()) {
                    console.warn(`⚠️ Failed to parse SSE data: ${data}`, parseError);
                }
            }
        }
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}