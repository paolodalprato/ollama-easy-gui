// Chat Storage Manager - Privacy-First Local Storage
// Manages conversations and attachments completely locally to ensure privacy

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ChatStorageManager {
    constructor(dataPath = '../../../data') {
        // Resolve absolute path to avoid working directory issues
        this.dataPath = path.resolve(__dirname, dataPath);
        this.conversationsPath = path.join(this.dataPath, 'conversations');
        this.configPath = path.join(this.dataPath, 'user-config.json');
        this.modelsPath = path.join(this.dataPath, 'models-cache.json');
        
        console.log(`🔧 ChatStorage using path: ${this.dataPath}`);
        this.initializeStorage();
    }

    // Initialize directory structure if it doesn't exist
    initializeStorage() {
        try {
            // Create main directory
            if (!fs.existsSync(this.dataPath)) {
                fs.mkdirSync(this.dataPath, { recursive: true });
            }

            // Create conversations directory
            if (!fs.existsSync(this.conversationsPath)) {
                fs.mkdirSync(this.conversationsPath, { recursive: true });
            }

            // Create user config if it doesn't exist
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

            console.log('✅ Chat Storage initialized:', this.dataPath);
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
            // Create chat directory
            fs.mkdirSync(chatPath, { recursive: true });

            // Create attachments directory
            fs.mkdirSync(attachmentsPath, { recursive: true });

            // Initial metadata
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

            // Initial empty messages
            const messages = {
                version: "1.0.0",
                chatId: chatId,
                messages: []
            };

            // Save files
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

            // Sort by last modification (most recent first)
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

            // Load existing data
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

            // Create new message
            const messageId = `msg_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            const newMessage = {
                id: messageId,
                timestamp: new Date().toISOString(),
                role: role, // 'user' o 'assistant'
                content: content,
                attachments: attachments // array di path relativi
            };

            // Add message
            messages.messages.push(newMessage);

            // Update metadata
            metadata.messageCount = messages.messages.length;
            metadata.lastModified = new Date().toISOString();
            metadata.hasAttachments = metadata.hasAttachments || attachments.length > 0;

            // Save everything
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

    // Completely delete a conversation (atomic - chat + attachments)
    deleteChat(chatId) {
        const chatPath = path.join(this.conversationsPath, chatId);

        try {
            if (!fs.existsSync(chatPath)) {
                return {
                    success: false,
                    error: 'Chat not found'
                };
            }

            // Get info before deletion
            const metadataPath = path.join(chatPath, 'metadata.json');
            let metadata = null;
            if (fs.existsSync(metadataPath)) {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            }

            // Atomic deletion: removes directory and all content
            fs.rmSync(chatPath, { recursive: true, force: true });

            console.log(`✅ Deleted chat completely: ${chatId}`);
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

            // Apply updates
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

            // Calculate statistics
            for (const chat of allChats.chats) {
                totalMessages += chat.messageCount || 0;
                if (chat.hasAttachments) {
                    hasAttachmentsCount++;
                }

                // Calculate sizes (approximate)
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

    // Save an attachment in the chat
    saveAttachment(chatId, file, originalFilename) {
        const chatPath = path.join(this.conversationsPath, chatId);
        const attachmentsPath = path.join(chatPath, 'attachments');

        try {
            if (!fs.existsSync(chatPath)) {
                return {
                    success: false,
                    error: 'Chat not found'
                };
            }

            // Make sure attachments folder exists
            if (!fs.existsSync(attachmentsPath)) {
                fs.mkdirSync(attachmentsPath, { recursive: true });
            }

            // Generate safe filename
            const timestamp = Date.now();
            const randomId = crypto.randomBytes(4).toString('hex');

            // Make sure originalFilename is a string
            const filename = Buffer.isBuffer(originalFilename) ? originalFilename.toString() : originalFilename;
            const ext = path.extname(filename);
            const safeFilename = `${timestamp}_${randomId}${ext}`;
            const filePath = path.join(attachmentsPath, safeFilename);

            // Save the file
            fs.writeFileSync(filePath, file);

            // Update metadata
            const metadataPath = path.join(chatPath, 'metadata.json');
            if (fs.existsSync(metadataPath)) {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                metadata.hasAttachments = true;
                metadata.lastModified = new Date().toISOString();
                fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            }

            console.log(`✅ Attachment saved: ${safeFilename} in chat ${chatId}`);
            return {
                success: true,
                filename: safeFilename,
                originalName: originalFilename,
                size: file.length,
                path: `attachments/${safeFilename}`
            };

        } catch (error) {
            console.error(`❌ Error saving attachment in chat ${chatId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Load an attachment from the chat
    getAttachment(chatId, filename) {
        const attachmentPath = path.join(this.conversationsPath, chatId, 'attachments', filename);

        try {
            if (!fs.existsSync(attachmentPath)) {
                return {
                    success: false,
                    error: 'Attachment not found'
                };
            }

            const fileData = fs.readFileSync(attachmentPath);
            const stats = fs.statSync(attachmentPath);

            return {
                success: true,
                data: fileData,
                size: stats.size,
                modified: stats.mtime
            };

        } catch (error) {
            console.error(`❌ Error loading attachment ${filename} from chat ${chatId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // List attachments of a chat
    listAttachments(chatId) {
        const attachmentsPath = path.join(this.conversationsPath, chatId, 'attachments');

        try {
            if (!fs.existsSync(attachmentsPath)) {
                return {
                    success: true,
                    attachments: []
                };
            }

            const files = fs.readdirSync(attachmentsPath);
            const attachments = [];

            for (const file of files) {
                const filePath = path.join(attachmentsPath, file);
                const stats = fs.statSync(filePath);
                
                attachments.push({
                    filename: file,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    type: this.getFileType(file)
                });
            }

            return {
                success: true,
                attachments: attachments
            };

        } catch (error) {
            console.error(`❌ Error listing attachments for chat ${chatId}:`, error);
            return {
                success: false,
                error: error.message,
                attachments: []
            };
        }
    }

    // Determine file type
    getFileType(filename) {
        const ext = path.extname(filename).toLowerCase();
        
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
            return 'image';
        } else if (['.pdf'].includes(ext)) {
            return 'pdf';
        } else if (['.doc', '.docx', '.txt', '.rtf'].includes(ext)) {
            return 'document';
        } else if (['.xls', '.xlsx', '.csv'].includes(ext)) {
            return 'spreadsheet';
        } else if (['.mp4', '.avi', '.mov', '.wmv', '.webm'].includes(ext)) {
            return 'video';
        } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
            return 'audio';
        } else {
            return 'other';
        }
    }

    // Cleanup: delete old chats beyond the limit
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

            // Get chats to delete (beyond the limit)
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

    // Get all attachments for a chat with full metadata (for AI processing)
    getChatAttachments(chatId) {
        const attachmentsPath = path.join(this.conversationsPath, chatId, 'attachments');

        try {
            if (!fs.existsSync(attachmentsPath)) {
                return [];
            }

            const files = fs.readdirSync(attachmentsPath);
            const attachments = [];

            for (const file of files) {
                const filePath = path.join(attachmentsPath, file);
                const stats = fs.statSync(filePath);
                
                attachments.push({
                    filename: file,
                    originalname: file, // For compatibility with multer format
                    path: filePath,     // Full path to file
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    type: this.getFileType(file),
                    mimetype: this.getMimeType(file)
                });
            }

            console.log(`📎 Found ${attachments.length} attachments for chat ${chatId}`);
            return attachments;

        } catch (error) {
            console.error(`❌ Error getting chat attachments for ${chatId}:`, error);
            return [];
        }
    }

    // Get MIME type for file (helper for attachment processing)
    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        
        const mimeTypes = {
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif'
        };

        return mimeTypes[ext] || 'application/octet-stream';
    }
}

module.exports = ChatStorageManager;