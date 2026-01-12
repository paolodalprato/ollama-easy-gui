// ChatStorage - Privacy-First Local Conversation Storage
// Manages conversations completely locally to ensure privacy

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AttachmentStorage = require('./AttachmentStorage');

class ChatStorageManager {
    constructor(dataPath = '../../../data') {
        this.dataPath = path.resolve(__dirname, dataPath);
        this.conversationsPath = path.join(this.dataPath, 'conversations');
        this.configPath = path.join(this.dataPath, 'user-config.json');
        this.modelsPath = path.join(this.dataPath, 'models-cache.json');

        // Delegate attachment management
        this.attachmentStorage = new AttachmentStorage(this.conversationsPath);

        console.log(`🔧 ChatStorage using path: ${this.dataPath}`);
        this.initializeStorage();
    }

    // Initialize directory structure
    initializeStorage() {
        try {
            if (!fs.existsSync(this.dataPath)) {
                fs.mkdirSync(this.dataPath, { recursive: true });
            }

            if (!fs.existsSync(this.conversationsPath)) {
                fs.mkdirSync(this.conversationsPath, { recursive: true });
            }

            if (!fs.existsSync(this.configPath)) {
                const defaultConfig = {
                    version: "1.0.0",
                    created: new Date().toISOString(),
                    preferences: {
                        theme: "professional",
                        defaultModel: null,
                        autoSave: true,
                        maxStoredChats: 100
                    },
                    privacy: {
                        localOnly: true,
                        autoDeleteAfterDays: null,
                        encryptSensitive: false
                    }
                };
                fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
            }

            console.log('✅ ChatStorage initialized:', this.dataPath);
        } catch (error) {
            console.error('❌ Error initializing storage:', error);
            throw error;
        }
    }

    // Generate unique ID for new chat
    generateChatId() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const random = crypto.randomBytes(4).toString('hex');
        return `chat_${timestamp}_${random}`;
    }

    // Create a new conversation
    createNewChat(title = null, model = null) {
        const chatId = this.generateChatId();
        const chatPath = path.join(this.conversationsPath, chatId);
        const attachmentsPath = path.join(chatPath, 'attachments');

        try {
            fs.mkdirSync(chatPath, { recursive: true });
            fs.mkdirSync(attachmentsPath, { recursive: true });

            const metadata = {
                id: chatId,
                title: title || `New conversation ${new Date().toLocaleDateString()}`,
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                model: model,
                messageCount: 0,
                hasAttachments: false,
                tags: [],
                archived: false
            };

            const messages = {
                version: "1.0.0",
                chatId: chatId,
                messages: []
            };

            fs.writeFileSync(path.join(chatPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
            fs.writeFileSync(path.join(chatPath, 'messages.json'), JSON.stringify(messages, null, 2));

            console.log(`✅ Created new chat: ${chatId}`);
            return {
                success: true,
                chatId: chatId,
                metadata: metadata
            };

        } catch (error) {
            console.error(`❌ Error creating chat ${chatId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get list of all conversations
    getAllChats() {
        try {
            const chatDirs = fs.readdirSync(this.conversationsPath)
                .filter(dir => {
                    const fullPath = path.join(this.conversationsPath, dir);
                    return fs.statSync(fullPath).isDirectory() && dir.startsWith('chat_');
                });

            const chats = [];

            for (const chatDir of chatDirs) {
                const metadataPath = path.join(this.conversationsPath, chatDir, 'metadata.json');

                if (fs.existsSync(metadataPath)) {
                    try {
                        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                        chats.push(metadata);
                    } catch (error) {
                        console.error(`❌ Error reading metadata for ${chatDir}:`, error);
                    }
                }
            }

            chats.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

            return {
                success: true,
                chats: chats,
                total: chats.length
            };

        } catch (error) {
            console.error('❌ Error getting chat list:', error);
            return {
                success: false,
                error: error.message,
                chats: []
            };
        }
    }

    // Load a specific conversation
    loadChat(chatId) {
        const chatPath = path.join(this.conversationsPath, chatId);
        const metadataPath = path.join(chatPath, 'metadata.json');
        const messagesPath = path.join(chatPath, 'messages.json');

        try {
            if (!fs.existsSync(chatPath)) {
                return {
                    success: false,
                    error: 'Chat not found'
                };
            }

            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

            return {
                success: true,
                chatId: chatId,
                metadata: metadata,
                messages: messages.messages
            };

        } catch (error) {
            console.error(`❌ Error loading chat ${chatId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Add message to a conversation
    addMessage(chatId, role, content, attachments = []) {
        const chatPath = path.join(this.conversationsPath, chatId);
        const metadataPath = path.join(chatPath, 'metadata.json');
        const messagesPath = path.join(chatPath, 'messages.json');

        try {
            if (!fs.existsSync(chatPath)) {
                return {
                    success: false,
                    error: 'Chat not found'
                };
            }

            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

            const messageId = `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            const newMessage = {
                id: messageId,
                timestamp: new Date().toISOString(),
                role: role,
                content: content,
                attachments: attachments
            };

            messages.messages.push(newMessage);

            metadata.messageCount = messages.messages.length;
            metadata.lastModified = new Date().toISOString();
            metadata.hasAttachments = metadata.hasAttachments || attachments.length > 0;

            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));

            console.log(`✅ Added message to chat ${chatId}: ${messageId}`);
            return {
                success: true,
                messageId: messageId,
                message: newMessage
            };

        } catch (error) {
            console.error(`❌ Error adding message to chat ${chatId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete a conversation
    deleteChat(chatId) {
        const chatPath = path.join(this.conversationsPath, chatId);

        try {
            if (!fs.existsSync(chatPath)) {
                return {
                    success: false,
                    error: 'Chat not found'
                };
            }

            const metadataPath = path.join(chatPath, 'metadata.json');
            let metadata = null;
            if (fs.existsSync(metadataPath)) {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            }

            fs.rmSync(chatPath, { recursive: true, force: true });

            console.log(`✅ Deleted chat: ${chatId}`);
            return {
                success: true,
                chatId: chatId,
                deletedTitle: metadata?.title || 'Unknown'
            };

        } catch (error) {
            console.error(`❌ Error deleting chat ${chatId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update chat metadata
    updateChatMetadata(chatId, updates) {
        const metadataPath = path.join(this.conversationsPath, chatId, 'metadata.json');

        try {
            if (!fs.existsSync(metadataPath)) {
                return {
                    success: false,
                    error: 'Chat not found'
                };
            }

            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            Object.assign(metadata, updates);
            metadata.lastModified = new Date().toISOString();

            fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

            return {
                success: true,
                metadata: metadata
            };

        } catch (error) {
            console.error(`❌ Error updating chat metadata ${chatId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get storage statistics
    getStorageStats() {
        try {
            const allChats = this.getAllChats();

            if (!allChats.success) {
                return allChats;
            }

            let totalMessages = 0;
            let totalSize = 0;
            let hasAttachmentsCount = 0;

            for (const chat of allChats.chats) {
                totalMessages += chat.messageCount || 0;
                if (chat.hasAttachments) {
                    hasAttachmentsCount++;
                }

                const chatPath = path.join(this.conversationsPath, chat.id);
                if (fs.existsSync(chatPath)) {
                    const files = fs.readdirSync(chatPath, { withFileTypes: true });
                    for (const file of files) {
                        if (file.isFile()) {
                            const filePath = path.join(chatPath, file.name);
                            totalSize += fs.statSync(filePath).size;
                        }
                    }
                }
            }

            return {
                success: true,
                stats: {
                    totalChats: allChats.total,
                    totalMessages: totalMessages,
                    chatsWithAttachments: hasAttachmentsCount,
                    totalSizeBytes: totalSize,
                    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
                    storageLocation: this.dataPath
                }
            };

        } catch (error) {
            console.error('❌ Error calculating storage stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Cleanup old chats
    cleanupOldChats(maxChats = 100) {
        try {
            const allChats = this.getAllChats();

            if (!allChats.success || allChats.chats.length <= maxChats) {
                return {
                    success: true,
                    deleted: 0,
                    message: 'No cleanup needed'
                };
            }

            const chatsToDelete = allChats.chats.slice(maxChats);
            let deletedCount = 0;

            for (const chat of chatsToDelete) {
                const result = this.deleteChat(chat.id);
                if (result.success) {
                    deletedCount++;
                }
            }

            return {
                success: true,
                deleted: deletedCount,
                remaining: allChats.chats.length - deletedCount,
                message: `Cleanup completed: ${deletedCount} old chats deleted`
            };

        } catch (error) {
            console.error('❌ Error during cleanup:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========== ATTACHMENT METHODS (delegated) ==========

    saveAttachment(chatId, file, originalFilename) {
        const result = this.attachmentStorage.saveAttachment(chatId, file, originalFilename);

        // Update metadata if successful
        if (result.success) {
            const metadataPath = path.join(this.conversationsPath, chatId, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                metadata.hasAttachments = true;
                metadata.lastModified = new Date().toISOString();
                fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            }
        }

        return result;
    }

    getAttachment(chatId, filename) {
        return this.attachmentStorage.getAttachment(chatId, filename);
    }

    listAttachments(chatId) {
        return this.attachmentStorage.listAttachments(chatId);
    }

    getChatAttachments(chatId) {
        return this.attachmentStorage.getChatAttachments(chatId);
    }

    getFileType(filename) {
        return this.attachmentStorage.getFileType(filename);
    }

    getMimeType(filename) {
        return this.attachmentStorage.getMimeType(filename);
    }
}

module.exports = ChatStorageManager;
