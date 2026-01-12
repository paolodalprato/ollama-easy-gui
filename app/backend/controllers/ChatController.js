// ChatController.js - Chat CRUD operations and attachment management
const ChatStorage = require('../core/storage/ChatStorage');
const logger = require('../core/logging/LoggingService');
const ChatExportController = require('./ChatExportController');
const ChatStreamController = require('./ChatStreamController');

class ChatController {
    constructor(chatStorage = null, systemPromptController = null, attachmentController = null, mcpController = null) {
        this.chatStorage = chatStorage || new ChatStorage();
        this.systemPromptController = systemPromptController;
        this.attachmentController = attachmentController;
        this.mcpController = mcpController;
        this.currentChatId = null;

        // Delegate to specialized controllers
        this.exportController = new ChatExportController(this.chatStorage);
        this.streamController = new ChatStreamController(
            this.chatStorage,
            systemPromptController,
            attachmentController,
            mcpController
        );
    }

    // ========== CHAT CRUD OPERATIONS ==========

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

    // ========== ATTACHMENT OPERATIONS ==========

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

    // ========== STATE MANAGEMENT ==========

    // Get current chat ID
    getCurrentChatId() {
        return this.currentChatId;
    }

    // Set current chat ID
    setCurrentChatId(chatId) {
        this.currentChatId = chatId;
    }

    // ========== DELEGATED METHODS ==========

    // Download message (delegated to ChatExportController)
    async downloadMessage(req, res) {
        return this.exportController.downloadMessage(req, res);
    }

    // Chat with streaming (delegated to ChatStreamController)
    async sendChatMessageStream(req, res, ollamaManager) {
        return this.streamController.sendChatMessageStream(req, res);
    }

    // ========== UTILITY METHODS ==========

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
}

module.exports = ChatController;
