/**
 * AttachmentStorage - File attachment management for chats
 *
 * Handles:
 * - Saving attachments to chat directories
 * - Loading and listing attachments
 * - File type detection and MIME type mapping
 *
 * @module AttachmentStorage
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AttachmentStorage {
    constructor(conversationsPath) {
        this.conversationsPath = conversationsPath;
    }

    /**
     * Save an attachment in the chat
     * @param {string} chatId - Chat identifier
     * @param {Buffer} file - File data
     * @param {string} originalFilename - Original filename
     * @returns {Object} Result with success status and file info
     */
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

            // Ensure attachments folder exists
            if (!fs.existsSync(attachmentsPath)) {
                fs.mkdirSync(attachmentsPath, { recursive: true });
            }

            // Generate safe filename
            const timestamp = Date.now();
            const randomId = crypto.randomBytes(4).toString('hex');

            // Ensure originalFilename is a string
            const filename = Buffer.isBuffer(originalFilename) ? originalFilename.toString() : originalFilename;
            const ext = path.extname(filename);
            const safeFilename = `${timestamp}_${randomId}${ext}`;
            const filePath = path.join(attachmentsPath, safeFilename);

            // Save the file
            fs.writeFileSync(filePath, file);

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

    /**
     * Load an attachment from the chat
     * @param {string} chatId - Chat identifier
     * @param {string} filename - Attachment filename
     * @returns {Object} Result with file data
     */
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

    /**
     * List attachments of a chat
     * @param {string} chatId - Chat identifier
     * @returns {Object} Result with attachments array
     */
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

    /**
     * Get all attachments for a chat with full metadata (for AI processing)
     * @param {string} chatId - Chat identifier
     * @returns {Array} Array of attachment objects
     */
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
                    originalname: file,
                    path: filePath,
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

    /**
     * Determine file type category
     * @param {string} filename
     * @returns {string} File type category
     */
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

    /**
     * Get MIME type for file
     * @param {string} filename
     * @returns {string} MIME type
     */
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

module.exports = AttachmentStorage;
