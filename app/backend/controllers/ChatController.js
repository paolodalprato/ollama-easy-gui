// ChatController.js - Chat operations management
const ChatStorage = require('../core/storage/ChatStorage');
const logger = require('../core/logging/LoggingService');

class ChatController {
    constructor(chatStorage = null, systemPromptController = null, attachmentController = null, mcpController = null) {
        this.chatStorage = chatStorage || new ChatStorage();
        this.systemPromptController = systemPromptController;
        this.attachmentController = attachmentController;
        this.mcpController = mcpController;
        this.currentChatId = null;
    }

    // Create new chat
    async createChat(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { title, model } = JSON.parse(body);
                const result = this.chatStorage.createNewChat(title, model);
                
                if (result.success) {
                    this.currentChatId = result.chatId;
                    console.log('✅ Chat created:', result.chatId);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('❌ Error creating chat:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Failed to create chat' 
                }));
            }
        });
    }

    // List all chats
    async listChats(req, res) {
        try {
            const result = this.chatStorage.getAllChats();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error listing chats:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to list chats' 
            }));
        }
    }

    // Load specific chat
    async loadChat(req, res) {
        try {
            const chatId = req.url.split('/').pop();
            const result = this.chatStorage.loadChat(chatId);
            
            if (result.success) {
                this.currentChatId = chatId;
            }
            
            res.writeHead(result.success ? 200 : 404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error loading chat:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to load chat' 
            }));
        }
    }

    // Delete chat
    async deleteChat(req, res) {
        try {
            const chatId = req.url.split('/').pop();
            const result = this.chatStorage.deleteChat(chatId);
            
            if (result.success && this.currentChatId === chatId) {
                this.currentChatId = null;
            }
            
            res.writeHead(result.success ? 200 : 404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error deleting chat:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to delete chat' 
            }));
        }
    }

    // Update chat metadata
    async updateChat(req, res) {
        const chatId = req.url.split('/').pop();
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const updates = JSON.parse(body);
                const result = this.chatStorage.updateChatMetadata(chatId, updates);
                
                res.writeHead(result.success ? 200 : 404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('❌ Error updating chat:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Failed to update chat' 
                }));
            }
        });
    }

    // Storage statistics
    async getStats(req, res) {
        try {
            const result = this.chatStorage.getStorageStats();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error getting stats:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to get storage stats' 
            }));
        }
    }

    // Cleanup old chats
    async cleanupChats(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const { maxChats } = JSON.parse(body);
                const result = this.chatStorage.cleanupOldChats(maxChats);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('❌ Error cleaning up chats:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Failed to cleanup chats' 
                }));
            }
        });
    }

    // Upload attachment
    async uploadAttachment(req, res) {
        const chatId = req.url.split('/').pop();

        // Extract boundary from Content-Type
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        
        if (!boundaryMatch) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Invalid Content-Type for multipart upload' 
            }));
            return;
        }
        
        const boundary = boundaryMatch[1];
        let body = Buffer.alloc(0);
        
        req.on('data', chunk => {
            body = Buffer.concat([body, chunk]);
        });
        
        req.on('end', () => {
            try {
                const parts = this._parseMultipartData(body, boundary);
                const filePart = parts.find(part => part.filename);
                
                if (!filePart) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'No file found in upload' 
                    }));
                    return;
                }
                
                const result = this.chatStorage.saveAttachment(chatId, filePart.data, filePart.filename);
                
                res.writeHead(result.success ? 200 : 500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('❌ Error uploading attachment:', error);
                logger.chat('error', 'Attachment upload failed', { chatId, error: error.message });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to upload attachment'
                }));
            }
        });
    }

    // Serve attachment
    async getAttachment(req, res) {
        try {
            const pathParts = req.url.split('/');
            const chatId = pathParts[4];
            const filename = pathParts[5];
            
            console.log('📎 Attachment request:', { url: req.url, chatId, filename, pathParts });
            
            const result = this.chatStorage.getAttachment(chatId, filename);
            
            if (result.success) {
                const mimeType = this._getMimeType(filename);
                res.writeHead(200, { 
                    'Content-Type': mimeType,
                    'Content-Disposition': `inline; filename="${filename}"` 
                });
                res.end(result.data);
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            }
        } catch (error) {
            console.error('❌ Error serving attachment:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to serve attachment' 
            }));
        }
    }

    // List chat attachments (legacy endpoint)
    async listAttachments(req, res) {
        try {
            const chatId = req.url.split('/').pop();
            const result = this.chatStorage.listAttachments(chatId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error listing attachments:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to list attachments' 
            }));
        }
    }

    // List attachments for specific chat (new endpoint with route parameter)
    async listChatAttachments(req, res) {
        try {
            // Extract chatId from URL: /api/chats/CHAT_ID/attachments
            const urlParts = req.url.split('/');
            const chatId = urlParts[3]; // /api/chats/CHAT_ID/attachments -> index 3
            console.log(`📋 Listing attachments for chat: ${chatId}`);
            const result = this.chatStorage.listAttachments(chatId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            console.error('❌ Error listing chat attachments:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                success: false, 
                error: 'Failed to list chat attachments' 
            }));
        }
    }

    // Add message with attachments (attachments only)
    async addAttachments(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { chatId, attachments } = JSON.parse(body);
                
                console.log('📎 Adding attachments to chat:', { chatId, attachments });
                
                const result = this.chatStorage.addMessage(chatId, '', 'user', [], attachments);
                
                res.writeHead(result.success ? 200 : 404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                console.error('❌ Error adding attachments:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Failed to add attachments' 
                }));
            }
        });
    }

    // Get current chat ID
    getCurrentChatId() {
        return this.currentChatId;
    }

    // Set current chat ID
    setCurrentChatId(chatId) {
        this.currentChatId = chatId;
    }

    // Utility: Parse multipart/form-data
    _parseMultipartData(body, boundary) {
        const parts = [];
        const boundaryBuffer = Buffer.from(`--${boundary}`);
        let start = 0;
        
        while (true) {
            const boundaryIndex = body.indexOf(boundaryBuffer, start);
            if (boundaryIndex === -1) break;
            
            const partStart = boundaryIndex + boundaryBuffer.length + 2; // +2 per \r\n
            const nextBoundaryIndex = body.indexOf(boundaryBuffer, partStart);
            
            if (nextBoundaryIndex === -1) break;
            
            const partData = body.slice(partStart, nextBoundaryIndex - 2); // -2 per \r\n
            const headerEndIndex = partData.indexOf(Buffer.from('\r\n\r\n'));
            
            if (headerEndIndex !== -1) {
                const headers = partData.slice(0, headerEndIndex).toString();
                const content = partData.slice(headerEndIndex + 4);
                
                const nameMatch = headers.match(/name="([^"]+)"/);
                const filenameMatch = headers.match(/filename="([^"]+)"/);
                
                if (nameMatch) {
                    parts.push({
                        name: nameMatch[1],
                        filename: filenameMatch ? filenameMatch[1] : null,
                        data: content,
                        headers: headers
                    });
                }
            }
            
            start = nextBoundaryIndex;
        }
        
        return parts;
    }

    // Download message in various formats
    async downloadMessage(req, res) {
        try {
            // Parse JSON body manually
            let bodyData = '';
            req.on('data', chunk => bodyData += chunk);
            await new Promise(resolve => req.on('end', resolve));
            
            const body = JSON.parse(bodyData);
            const { chatId, messageTimestamp, format = 'markdown' } = body;
            
            console.log('📥 Download message request:', { chatId, messageTimestamp, format });
            
            if (!chatId || !messageTimestamp) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing chatId or messageTimestamp' }));
                return;
            }
            
            // Load chat messages
            const chat = this.chatStorage.loadChat(chatId);
            console.log('📋 Chat loaded:', { success: chat.success, hasMessages: !!chat.messages });
            
            if (!chat.success) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Chat not found' }));
                return;
            }
            
            // Structure is {success, chatId, metadata, messages} not {success, data}
            const messages = chat.messages || [];
            console.log('📋 Looking for timestamp:', messageTimestamp);
            console.log('📋 Available timestamps:', messages.map(m => m.timestamp));
            
            const message = messages.find(m => m.timestamp === messageTimestamp);
            console.log('📋 Message found:', !!message);
            
            if (!message) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Message not found',
                    requested: messageTimestamp,
                    available: messages.map(m => m.timestamp)
                }));
                return;
            }
            
            // Generate content in requested format
            let content, mimeType, extension;
            
            switch (format) {
                case 'markdown':
                    content = this._generateMarkdown(message, chat.metadata);
                    mimeType = 'text/markdown';
                    extension = 'md';
                    break;
                    
                case 'txt':
                    content = this._generateTXT(message, chat.metadata);
                    mimeType = 'text/plain';
                    extension = 'txt';
                    break;
                    
                case 'pdf':
                    content = this._generateTXT(message, chat.metadata);
                    mimeType = 'text/plain';
                    extension = 'txt';
                    break;
                    
                case 'docx':
                    content = this._generateDocx(message, chat.metadata);
                    mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    extension = 'docx';
                    break;
                    
                default:
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Unsupported format' }));
                    return;
            }
            
            const filename = `message_${messageTimestamp}.${extension}`;
            
            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': Buffer.byteLength(content)
            });
            res.end(content);
            
            console.log('✅ Message downloaded successfully:', filename);
            
        } catch (error) {
            console.error('❌ Download message error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Download failed', details: error.message }));
        }
    }
    
    // Generate Markdown format
    _generateMarkdown(message, metadata) {
        const timestamp = new Date(message.timestamp).toLocaleString();
        const chatTitle = metadata?.title || 'Conversation';
        const model = metadata?.model || 'Unknown';

        return `# ${chatTitle}

**Date**: ${timestamp}
**Model**: ${model}
**Role**: ${message.role}

---

${message.content}

---
*Generated by Ollama Easy GUI*`;
    }
    
    // Generate TXT format (simple and reliable)
    _generateTXT(message, metadata) {
        const timestamp = new Date(message.timestamp).toLocaleString();
        const chatTitle = metadata?.title || 'Conversation';
        const model = metadata?.model || 'Unknown';

        return `========================================
Ollama Easy GUI - Message Export
========================================

Chat: ${chatTitle}
Date: ${timestamp}
Model: ${model}
Role: ${message.role}

----------------------------------------
CONTENT:
----------------------------------------

${message.content}

----------------------------------------
Generated by Ollama Easy GUI
========================================`;
    }

    // Generate DOCX format (simplified - use dedicated library in production)
    _generateDocx(message, metadata) {
        // For now we return markdown - implement with docx or officegen in production
        return this._generateMarkdown(message, metadata);
    }

    // Utility: Determine MIME type
    _getMimeType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'json': 'application/json'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }

    // ========== STREAMING CHAT METHODS ==========

    /**
     * Chat with streaming in real-time (SSE)
     * Main streaming chat method with system prompts and attachments
     */
    async sendChatMessageStream(req, res, ollamaManager) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { message, model, chatId, enableMCP } = JSON.parse(body);

                console.log(`💬 Stream chat request:`, { chatId, model, messageLength: message.length, enableMCP: !!enableMCP });
                
                // Setup Server-Sent Events headers
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Cache-Control'
                });

                // Send initial status
                this._sendSSEEvent(res, 'status', { type: 'start', chatId, model });
                
                // Determine dynamic timeout
                const timeout = await this._getTimeoutForModel(model);
                console.log(`🕐 Stream timeout set to ${timeout/1000}s for ${model}`);
                
                // Save user message first with attachment metadata
                if (chatId) {
                    // Get attachment metadata for this chat to include in message
                    let attachmentMetadata = [];
                    if (this.attachmentController) {
                        try {
                            const attachments = this.chatStorage.getChatAttachments(chatId);
                            attachmentMetadata = attachments.map(att => ({
                                filename: att.filename,
                                originalName: att.originalname,
                                size: att.size,
                                type: att.type,
                                path: `attachments/${att.filename}`
                            }));
                            console.log(`📎 Found ${attachmentMetadata.length} attachments for message metadata`);
                        } catch (error) {
                            console.warn('⚠️ Could not get attachment metadata:', error.message);
                        }
                    }
                    
                    this.chatStorage.addMessage(chatId, 'user', message, attachmentMetadata);
                    this._sendSSEEvent(res, 'message_saved', { 
                        role: 'user', 
                        chatId,
                        attachments: attachmentMetadata.length
                    });
                }
                
                // Process attachments and enhance prompt ONLY for current message
                let enhancedPrompt = message;
                if (this.attachmentController) {
                    try {
                        console.log(`🔍 Checking attachments for chat ${chatId}`);
                        
                        // Get ONLY current message's attachments (newly uploaded)
                        let currentMessageAttachments = [];
                        try {
                            // Get the latest message from this chat to see what attachments were just uploaded
                            const chatData = this.chatStorage.loadChat(chatId);
                            if (chatData.success && chatData.messages && chatData.messages.length > 0) {
                                // Get the most recent user message (should be the one just saved)
                                const lastMessage = chatData.messages[chatData.messages.length - 1];
                                if (lastMessage && lastMessage.attachments) {
                                    currentMessageAttachments = lastMessage.attachments.map(att => att.filename || att.originalName || att);
                                    console.log(`📎 Found ${currentMessageAttachments.length} attachments for current message:`, currentMessageAttachments);
                                }
                            }
                        } catch (error) {
                            console.warn('⚠️ Could not get current message attachments, falling back to all attachments:', error.message);
                        }
                        
                        // Process ONLY current message attachments if available, otherwise use legacy behavior
                        let attachmentContent;
                        if (currentMessageAttachments.length > 0) {
                            console.log(`🎯 Processing ${currentMessageAttachments.length} specific attachments for this message only`);
                            attachmentContent = await this.attachmentController.processSpecificAttachments(chatId, currentMessageAttachments);
                        } else {
                            console.log(`📎 No specific attachments found, using legacy behavior (all attachments)`);
                            attachmentContent = await this.attachmentController.processAttachments(chatId);
                        }
                        
                        if (attachmentContent && attachmentContent.trim()) {
                            enhancedPrompt = `${attachmentContent}\n\nUser Question: ${message}`;
                            console.log(`📎 Enhanced prompt with attachments: ${attachmentContent.length} chars`);
                        } else {
                            console.log(`📎 No attachment content found for chat ${chatId}`);
                        }
                    } catch (attachmentError) {
                        console.warn('⚠️ Attachment processing failed:', attachmentError.message);
                    }
                }

                // Get system prompt for model and incorporate it into prompt
                let finalPrompt = enhancedPrompt;
                if (this.systemPromptController) {
                    const systemPrompt = await this.systemPromptController.getSystemPrompt(model);
                    if (systemPrompt) {
                        console.log(`🔧 Using system prompt for ${model}: ${systemPrompt.substring(0, 50)}...`);
                        finalPrompt = `${systemPrompt}\n\nUser: ${enhancedPrompt}`;
                    } else {
                        console.log(`📝 No system prompt for ${model}, using user prompt only`);
                    }
                }

                // Check if MCP is enabled and get available tools
                let mcpTools = [];
                console.log(`🤖 MCP check: enableMCP=${enableMCP}, mcpController exists=${!!this.mcpController}`);
                if (enableMCP && this.mcpController) {
                    try {
                        const mcpClient = await this.mcpController.getMCPClient();
                        await mcpClient.initialize();
                        mcpTools = mcpClient.getAvailableTools();
                        console.log(`🤖 MCP enabled with ${mcpTools.length} tools available`);
                        this._sendSSEEvent(res, 'mcp_status', {
                            enabled: true,
                            toolCount: mcpTools.length,
                            tools: mcpTools.map(t => t.function.name)
                        });
                    } catch (mcpError) {
                        console.warn('⚠️ MCP initialization failed:', mcpError.message);
                        this._sendSSEEvent(res, 'mcp_status', {
                            enabled: false,
                            error: mcpError.message
                        });
                    }
                }

                // Use /api/chat with tools if MCP is enabled, otherwise use /api/generate
                if (mcpTools.length > 0) {
                    // Build messages array for /api/chat format
                    const messages = [];

                    // Add system prompt if available
                    if (this.systemPromptController) {
                        const systemPrompt = await this.systemPromptController.getSystemPrompt(model);
                        if (systemPrompt) {
                            messages.push({ role: 'system', content: systemPrompt });
                        }
                    }

                    // Add user message
                    messages.push({ role: 'user', content: enhancedPrompt });

                    const payload = {
                        model: model,
                        messages: messages,
                        tools: mcpTools,
                        stream: true
                    };

                    console.log(`🤖 Using /api/chat with ${mcpTools.length} MCP tools`);

                    // Stream with tool support
                    await this._streamFromOllamaWithTools(res, payload, chatId, timeout, mcpTools);
                } else {
                    // Fallback to /api/generate (original behavior)
                    const payload = {
                        model: model,
                        prompt: finalPrompt,
                        stream: true
                    };

                    // Start streaming from Ollama with system prompt support
                    await this._streamFromOllama(res, payload, chatId, timeout);
                }
                
                // Close connection
                res.end();
                
            } catch (error) {
                console.error('❌ Error in stream chat:', error);
                logger.chat('error', 'Stream chat failed', { error: error.message, stack: error.stack });
                this._sendSSEEvent(res, 'error', {
                    message: error.message,
                    details: 'Stream chat failed'
                });
                res.end();
            }
        });
    }

    /**
     * Send SSE event to client during streaming
     * @param {Response} res - HTTP response object
     * @param {string} eventType - Event type
     * @param {Object} data - Event data
     */
    _sendSSEEvent(res, eventType, data) {
        const eventData = JSON.stringify(data);
        res.write(`event: ${eventType}\n`);
        res.write(`data: ${eventData}\n\n`);
        
        // Log important events
        if (['start', 'complete', 'error'].includes(eventType)) {
            console.log(`📡 SSE Event [${eventType}]:`, data);
        }
    }

    /**
     * Get dynamic timeout for model based on size and complexity
     * @param {string} modelName - Name of the model
     * @returns {number} Timeout in milliseconds
     */
    async _getTimeoutForModel(modelName) {
        if (!modelName) return 60000;
        
        const name = modelName.toLowerCase();
        
        // Identify reasoning models that require extreme timeouts
        if (name.includes('qwq') || name.includes('deepseek-r1') || name.includes('reasoning')) {
            return 1800000; // 30 minutes for reasoning models
        }

        // Identify large models by parameters
        if (name.includes('120b') || name.includes('100b')) return 1800000; // 30 minutes for ultra-large models
        if (name.includes('70b') || name.includes('72b')) return 600000; // 10 minutes
        if (name.includes('30b') || name.includes('32b')) return 300000; // 5 minutes
        if (name.includes('13b') || name.includes('14b')) return 180000; // 3 minutes
        if (name.includes('7b') || name.includes('8b')) return 120000;   // 2 minutes

        return 120000; // Default 2 minutes
    }

    /**
     * Stream response from Ollama to client via SSE
     * @param {Response} res - HTTP response object
     * @param {Object} requestData - Request data for Ollama
     * @param {string} chatId - Chat ID for message saving
     * @param {number} timeout - Request timeout
     */
    async _streamFromOllama(res, requestData, chatId, timeout) {
        return new Promise((resolve, reject) => {
            const http = require('http');
            
            console.log(`🔗 Starting Ollama stream: ${requestData.model}`);
            
            const options = {
                hostname: 'localhost',
                port: 11434,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            let fullResponse = '';
            let chunkCount = 0;
            
            const req = http.request(options, (ollamaRes) => {
                console.log(`📡 Ollama stream started (status: ${ollamaRes.statusCode})`);
                this._sendSSEEvent(res, 'stream_start', { model: requestData.model });
                
                let buffer = '';
                
                ollamaRes.on('data', (chunk) => {
                    buffer += chunk.toString();
                    
                    // Process complete lines
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // Keep incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.trim()) {
                            try {
                                const jsonChunk = JSON.parse(line);
                                chunkCount++;
                                
                                // Send chunk to frontend immediately
                                if (jsonChunk.response) {
                                    fullResponse += jsonChunk.response;
                                    this._sendSSEEvent(res, 'chunk', {
                                        content: jsonChunk.response,
                                        model: jsonChunk.model,
                                        done: jsonChunk.done,
                                        chunkNumber: chunkCount
                                    });
                                }
                                
                                // Check if done
                                if (jsonChunk.done === true) {
                                    console.log(`✅ Stream completed: ${chunkCount} chunks, ${fullResponse.length} chars`);
                                    
                                    // Save assistant response (no attachments for assistant messages)
                                    if (chatId && fullResponse) {
                                        this.chatStorage.addMessage(chatId, 'assistant', fullResponse, []);
                                        this._sendSSEEvent(res, 'message_saved', { 
                                            role: 'assistant', 
                                            chatId,
                                            totalChunks: chunkCount,
                                            totalLength: fullResponse.length,
                                            attachments: 0
                                        });
                                    }
                                    
                                    this._sendSSEEvent(res, 'complete', { 
                                        success: true, 
                                        chatId,
                                        totalChunks: chunkCount,
                                        totalLength: fullResponse.length
                                    });
                                    
                                    resolve();
                                    return;
                                }
                                
                            } catch (parseError) {
                                console.warn(`⚠️ Failed to parse streaming chunk: ${line.substring(0, 100)}`);
                            }
                        }
                    }
                });
                
                ollamaRes.on('end', () => {
                    if (fullResponse) {
                        console.log(`📊 Stream ended normally with ${fullResponse.length} characters`);
                        resolve();
                    } else {
                        console.warn(`⚠️ Stream ended without content`);
                        this._sendSSEEvent(res, 'error', { message: 'Stream ended without content' });
                        reject(new Error('No response received'));
                    }
                });
                
                ollamaRes.on('error', (error) => {
                    console.error(`❌ Ollama stream error:`, error);
                    this._sendSSEEvent(res, 'error', { 
                        message: error.message,
                        phase: 'ollama_stream' 
                    });
                    reject(error);
                });
            });

            // Timeout handling
            const timeoutId = setTimeout(() => {
                console.error(`❌ Stream timeout after ${timeout/1000}s`);
                req.destroy();
                this._sendSSEEvent(res, 'error', { 
                    message: `Stream timeout after ${timeout/1000}s`,
                    phase: 'timeout'
                });
                reject(new Error(`Stream timeout after ${timeout}ms`));
            }, timeout);

            req.on('error', (error) => {
                clearTimeout(timeoutId);
                console.error(`❌ Stream request error:`, error);
                this._sendSSEEvent(res, 'error', { 
                    message: error.message,
                    phase: 'request_setup'
                });
                reject(error);
            });

            req.on('close', () => {
                clearTimeout(timeoutId);
            });

            // Send request to Ollama
            req.write(JSON.stringify(requestData));
            req.end();
        });
    }

    /**
     * Stream response from Ollama /api/chat with MCP tool support
     * Handles tool_calls and executes tools via MCP
     */
    async _streamFromOllamaWithTools(res, requestData, chatId, timeout, mcpTools) {
        const http = require('http');
        const maxToolIterations = 5; // Prevent infinite loops

        // Keep track of conversation messages for tool call loop
        let messages = [...requestData.messages];
        let iterationCount = 0;
        let fullResponse = '';

        const executeToolCall = async (toolCall) => {
            const toolName = toolCall.function?.name;
            const toolArgs = toolCall.function?.arguments || {};

            console.log(`🔧 Executing MCP tool: ${toolName}`, toolArgs);
            this._sendSSEEvent(res, 'tool_call', {
                name: toolName,
                arguments: toolArgs,
                status: 'executing'
            });

            try {
                const mcpClient = await this.mcpController.getMCPClient();
                const result = await mcpClient.callTool(toolName, toolArgs);

                console.log(`✅ Tool ${toolName} executed successfully`);
                this._sendSSEEvent(res, 'tool_result', {
                    name: toolName,
                    success: true,
                    result: result
                });

                return {
                    success: true,
                    content: JSON.stringify(result.content || result)
                };
            } catch (error) {
                console.error(`❌ Tool ${toolName} failed:`, error.message);
                logger.chat('error', `MCP tool execution failed: ${toolName}`, { tool: toolName, arguments: toolArgs, error: error.message });
                this._sendSSEEvent(res, 'tool_result', {
                    name: toolName,
                    success: false,
                    error: error.message
                });

                return {
                    success: false,
                    content: `Error executing ${toolName}: ${error.message}`
                };
            }
        };

        const streamOllamaChat = () => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'localhost',
                    port: 11434,
                    path: '/api/chat',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };

                const payload = {
                    model: requestData.model,
                    messages: messages,
                    tools: mcpTools,
                    stream: true
                };

                console.log(`🔗 Starting Ollama /api/chat stream (iteration ${iterationCount + 1})`);
                this._sendSSEEvent(res, 'stream_start', {
                    model: requestData.model,
                    iteration: iterationCount + 1,
                    hasTools: mcpTools.length > 0
                });

                let currentResponse = '';
                let toolCalls = [];
                let chunkCount = 0;
                let buffer = '';

                const req = http.request(options, (ollamaRes) => {
                    console.log(`📡 Ollama /api/chat stream started (status: ${ollamaRes.statusCode})`);

                    ollamaRes.on('data', (chunk) => {
                        buffer += chunk.toString();

                        const lines = buffer.split('\n');
                        buffer = lines.pop();

                        for (const line of lines) {
                            if (line.trim()) {
                                try {
                                    const jsonChunk = JSON.parse(line);
                                    chunkCount++;

                                    // Handle message content
                                    if (jsonChunk.message?.content) {
                                        currentResponse += jsonChunk.message.content;
                                        fullResponse += jsonChunk.message.content;
                                        this._sendSSEEvent(res, 'chunk', {
                                            content: jsonChunk.message.content,
                                            model: jsonChunk.model,
                                            done: jsonChunk.done,
                                            chunkNumber: chunkCount
                                        });
                                    }

                                    // Collect tool calls
                                    if (jsonChunk.message?.tool_calls) {
                                        toolCalls = toolCalls.concat(jsonChunk.message.tool_calls);
                                        console.log(`🔧 Received ${jsonChunk.message.tool_calls.length} tool calls`);
                                    }

                                    // Check if done
                                    if (jsonChunk.done === true) {
                                        console.log(`✅ Stream iteration ${iterationCount + 1} completed: ${chunkCount} chunks`);
                                        resolve({
                                            content: currentResponse,
                                            toolCalls: toolCalls,
                                            done: true
                                        });
                                        return;
                                    }

                                } catch (parseError) {
                                    console.warn(`⚠️ Failed to parse chat chunk: ${line.substring(0, 100)}`);
                                }
                            }
                        }
                    });

                    ollamaRes.on('end', () => {
                        resolve({
                            content: currentResponse,
                            toolCalls: toolCalls,
                            done: true
                        });
                    });

                    ollamaRes.on('error', (error) => {
                        console.error(`❌ Ollama chat stream error:`, error);
                        reject(error);
                    });
                });

                const timeoutId = setTimeout(() => {
                    console.error(`❌ Chat stream timeout after ${timeout/1000}s`);
                    req.destroy();
                    reject(new Error(`Stream timeout after ${timeout}ms`));
                }, timeout);

                req.on('error', (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                });

                req.on('close', () => {
                    clearTimeout(timeoutId);
                });

                req.write(JSON.stringify(payload));
                req.end();
            });
        };

        // Main tool call loop
        try {
            while (iterationCount < maxToolIterations) {
                iterationCount++;

                const result = await streamOllamaChat();

                // If there are tool calls, execute them and continue
                if (result.toolCalls && result.toolCalls.length > 0) {
                    console.log(`🔧 Processing ${result.toolCalls.length} tool calls (iteration ${iterationCount})`);

                    // Add assistant message with tool calls
                    messages.push({
                        role: 'assistant',
                        content: result.content || '',
                        tool_calls: result.toolCalls
                    });

                    // Execute each tool and add results
                    for (const toolCall of result.toolCalls) {
                        const toolResult = await executeToolCall(toolCall);

                        // Add tool result message
                        messages.push({
                            role: 'tool',
                            content: toolResult.content
                        });
                    }

                    // Continue the loop to get next response
                    console.log(`🔄 Continuing conversation after tool execution`);
                } else {
                    // No more tool calls, we're done
                    console.log(`✅ MCP conversation complete after ${iterationCount} iterations`);

                    // Save assistant response
                    if (chatId && fullResponse) {
                        this.chatStorage.addMessage(chatId, 'assistant', fullResponse, []);
                        this._sendSSEEvent(res, 'message_saved', {
                            role: 'assistant',
                            chatId,
                            totalLength: fullResponse.length,
                            mcpIterations: iterationCount
                        });
                    }

                    this._sendSSEEvent(res, 'complete', {
                        success: true,
                        chatId,
                        totalLength: fullResponse.length,
                        mcpIterations: iterationCount,
                        toolsUsed: iterationCount > 1
                    });

                    break;
                }
            }

            if (iterationCount >= maxToolIterations) {
                console.warn(`⚠️ Max tool iterations (${maxToolIterations}) reached`);
                this._sendSSEEvent(res, 'warning', {
                    message: `Max tool iterations (${maxToolIterations}) reached`,
                    type: 'max_iterations'
                });
            }

        } catch (error) {
            console.error(`❌ Error in tool streaming:`, error);
            logger.chat('error', 'Tool streaming failed', { error: error.message, phase: 'tool_streaming', iterations: iterationCount });
            this._sendSSEEvent(res, 'error', {
                message: error.message,
                phase: 'tool_streaming'
            });
        }
    }
}

module.exports = ChatController;