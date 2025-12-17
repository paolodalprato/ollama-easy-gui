// ApiClient.js - Centralized API Client
class ApiClient {
    constructor() {
        this.baseURL = '';
        
        console.log('🌐 ApiClient initialized');
    }

    // === OLLAMA API CALLS ===
    
    async getOllamaStatus() {
        const response = await fetch('/api/ollama/status');
        return await response.json();
    }

    async startOllama() {
        const response = await fetch('/api/ollama/start', { method: 'POST' });
        return await response.json();
    }

    async stopOllama() {
        const response = await fetch('/api/ollama/stop', { method: 'POST' });
        return await response.json();
    }

    async getOllamaModels() {
        const response = await fetch('/api/ollama/models');
        return await response.json();
    }

    async getModelsList() {
        const response = await fetch('/api/ollama/proxy/api/tags');
        return await response.json();
    }

    async getHealthCheck() {
        const response = await fetch('/api/ollama/health');
        return await response.json();
    }


    // === CHAT API CALLS ===
    
    async createChat() {
        const response = await fetch('/api/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        return await response.json();
    }
    
    async getChatList() {
        const response = await fetch('/api/chat/list');
        return await response.json();
    }

    async loadChat(chatId) {
        const response = await fetch(`/api/chat/load/${chatId}`);
        return await response.json();
    }

    async createNewChat(title, model) {
        const response = await fetch('/api/chat/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, model })
        });
        return await response.json();
    }

    async sendMessage(message, model, chatId) {
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, model, chatId })
        });
        return await response.json();
    }

    async deleteChat(chatId) {
        const response = await fetch(`/api/chat/delete/${chatId}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    async updateChatTitle(chatId, title) {
        const response = await fetch(`/api/chat/update/${chatId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        return await response.json();
    }

    async getChatStats() {
        const response = await fetch('/api/chat/stats');
        return await response.json();
    }

    async getChatAttachments(chatId) {
        const response = await fetch(`/api/chat/attachments/${chatId}`);
        return await response.json();
    }

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
    
    async searchModels(searchTerm, category) {
        const response = await fetch('/api/models/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ searchTerm, category })
        });
        return await response.json();
    }

    async downloadModel(modelName) {
        const response = await fetch('/api/models/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelName })
        });
        return await response.json();
    }

    async removeModel(modelName) {
        const response = await fetch(`/api/models/remove/${encodeURIComponent(modelName)}`, {
            method: 'DELETE'
        });
        return await response.json();
    }

    async getModelProgress(modelName) {
        const response = await fetch(`/api/ollama/model-progress/${encodeURIComponent(modelName)}`);
        return await response.json();
    }

    // === SYSTEM API CALLS ===
    
    async shutdown() {
        const response = await fetch('/api/shutdown', { method: 'POST' });
        return await response.json();
    }

    async getStreamingEnabled() {
        const response = await fetch('/api/settings/streaming');
        return await response.json();
    }

    async setStreamingEnabled(enabled) {
        const response = await fetch('/api/settings/streaming', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        return await response.json();
    }

    // === UTILITY METHODS ===
    
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

    async getMCPStatus() {
        const response = await fetch('/api/mcp/status');
        return await response.json();
    }

    async getMCPTools() {
        const response = await fetch('/api/mcp/tools');
        return await response.json();
    }

    async getMCPServers() {
        const response = await fetch('/api/mcp/servers');
        return await response.json();
    }

    async toggleMCPServer(serverName, enabled) {
        const response = await fetch('/api/mcp/toggle-server', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serverName, enabled })
        });
        return await response.json();
    }

    async executeMCPTool(toolName, parameters) {
        const response = await fetch('/api/mcp/execute-tool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolName, parameters })
        });
        return await response.json();
    }

    async reloadMCPConfig() {
        const response = await fetch('/api/mcp/reload-config', { method: 'POST' });
        return await response.json();
    }

    // Send message with real-time streaming (with optional MCP support)
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
    
    // Process Server-Sent Events (with MCP support)
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