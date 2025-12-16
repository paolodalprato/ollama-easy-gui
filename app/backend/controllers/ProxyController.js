/**
 * ProxyController - HTTP Proxy Operations for Ollama API
 * 
 * Handles HTTP proxy operations, request forwarding to Ollama API,
 * and response management with timeout handling
 * Extracted from OllamaController.js for backend modular architecture compliance
 * 
 * Dependencies:
 * - http: Node.js HTTP module for proxy requests
 * - ChatController: For timeout calculations
 */

class ProxyController {
    constructor(chatController = null) {
        this.chatController = chatController;
        console.log('🔗 ProxyController initialized');
    }

    /**
     * Proxy requests to Ollama API with intelligent routing
     * Main proxy method that handles all API forwarding
     */
    async proxyToOllama(req, res) {
        const ollamaPath = req.url.replace('/api/ollama/proxy', '');

        // Check if Ollama is active before proxying
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                let requestData = null;
                if (body) {
                    requestData = JSON.parse(body);
                }

                // Determine dynamic timeout for chat/generate requests
                let timeout = 120000; // Default 2 minutes
                if (requestData && requestData.model && 
                    (ollamaPath.includes('/api/generate') || ollamaPath.includes('/api/chat'))) {
                    
                    if (this.chatController) {
                        timeout = await this.chatController._getTimeoutForModel(requestData.model);
                    }
                    console.log(`🕐 Dynamic proxy timeout: ${timeout/1000}s for ${requestData.model}`);
                }

                try {
                    // Execute the proxy request
                    const proxyResponse = await this._makeOllamaRequest(ollamaPath, req.method, requestData, timeout);

                    // Forward the response
                    res.writeHead(200, { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*' 
                    });
                    res.end(JSON.stringify(proxyResponse));
                    
                } catch (proxyError) {
                    console.error('❌ Proxy error:', proxyError);
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Proxy request failed',
                        details: proxyError.message 
                    }));
                }
                
            } catch (error) {
                console.error('❌ Error setting up proxy:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to setup proxy request',
                    details: error.message 
                }));
            }
        });
    }

    /**
     * Make HTTP request to Ollama API with enhanced timeout handling
     * Core HTTP proxy method with intelligent error handling
     * @param {string} path - API path
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @param {number} customTimeout - Custom timeout in milliseconds
     * @returns {Promise<Object>} API response
     */
    async _makeOllamaRequest(path, method = 'GET', data = null, customTimeout = null) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            
            const timeout = customTimeout || 120000; // Default 2 minutes
            console.log(`🔗 Ollama request: ${method} ${path} (timeout: ${timeout/1000}s)`);
            
            const options = {
                hostname: 'localhost',
                port: 11434,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: timeout
            };

            const req = http.request(options, (ollamaRes) => {
                console.log(`📡 Ollama response started (status: ${ollamaRes.statusCode})`);
                
                let responseData = '';
                
                ollamaRes.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                ollamaRes.on('end', () => {
                    try {
                        console.log(`✅ Ollama response completed (${responseData.length} bytes)`);
                        
                        if (ollamaRes.statusCode >= 400) {
                            reject(new Error(`HTTP ${ollamaRes.statusCode}: ${responseData}`));
                            return;
                        }

                        // Handle empty responses
                        if (!responseData.trim()) {
                            resolve({ success: true, data: null });
                            return;
                        }

                        // Try to parse as JSON
                        try {
                            const jsonResponse = JSON.parse(responseData);
                            resolve(jsonResponse);
                        } catch (jsonError) {
                            // If JSON parse fails, handle as streaming response
                            console.log(`🔄 Processing streaming response...`);
                            try {
                                const streamingResponse = this._parseStreamingResponse(responseData);
                                resolve(streamingResponse);
                            } catch (streamError) {
                                console.error(`❌ Failed to parse streaming response:`, streamError);
                                resolve({ 
                                    success: false, 
                                    error: 'Failed to parse response',
                                    raw: responseData.substring(0, 500) 
                                });
                            }
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
                
                ollamaRes.on('error', (error) => {
                    console.error('❌ Ollama response error:', error);
                    reject(error);
                });
            });

            // Set timeout
            req.setTimeout(timeout, () => {
                console.error(`❌ Request timeout after ${timeout/1000}s`);
                req.destroy();
                reject(new Error(`Request timeout after ${timeout}ms`));
            });

            req.on('error', (error) => {
                console.error('❌ Ollama request error:', error);
                reject(error);
            });

            // Send request data
            if (data && (method === 'POST' || method === 'PUT')) {
                req.write(JSON.stringify(data));
            }
            
            req.end();
        });
    }

    /**
     * Parse streaming response from Ollama (fallback method)
     * Handles multi-line JSON responses from streaming endpoints
     * @param {string} responseData - Raw response data
     * @returns {Object} Parsed response
     */
    _parseStreamingResponse(responseData) {
        console.log(`📦 Parsing streaming response (${responseData.length} bytes)`);
        
        const lines = responseData.trim().split('\n');
        let combinedResponse = '';
        let lastValidJson = null;

        for (const line of lines) {
            if (line.trim()) {
                try {
                    const jsonLine = JSON.parse(line);
                    lastValidJson = jsonLine;
                    
                    if (jsonLine.response) {
                        combinedResponse += jsonLine.response;
                    }
                } catch (error) {
                    // Skip invalid JSON lines
                    console.warn(`⚠️ Skipping invalid JSON line: ${line.substring(0, 50)}`);
                }
            }
        }

        // Return structured response
        return {
            response: combinedResponse,
            model: lastValidJson?.model || 'unknown',
            done: true,
            total_duration: lastValidJson?.total_duration || 0,
            prompt_eval_count: lastValidJson?.prompt_eval_count || 0,
            eval_count: lastValidJson?.eval_count || 0
        };
    }
}

module.exports = ProxyController;