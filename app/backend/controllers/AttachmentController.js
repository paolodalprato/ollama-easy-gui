/**
 * AttachmentController - File Attachment Processing & Text Extraction
 * 
 * Handles file attachment processing, text extraction from multiple formats,
 * and content preparation for chat context enhancement
 * Extracted from OllamaController.js for backend modular architecture compliance
 * 
 * Dependencies:
 * - fs: File system operations
 * - path: File path utilities  
 * - pdf-parse: PDF text extraction (optional)
 * - mammoth: DOCX text extraction (future enhancement)
 */

const fs = require('fs').promises;
const path = require('path');

class AttachmentController {
    constructor() {
        // Use same path resolution as ChatStorage
        const dataPath = path.resolve(__dirname, '../../data');
        this.uploadsPath = path.join(dataPath, 'conversations');
        console.log('📎 AttachmentController initialized');
        console.log(`📎 DEBUG: AttachmentController uploadsPath: ${this.uploadsPath}`);
        console.log(`📎 DEBUG: __dirname: ${__dirname}`);
    }

    /**
     * Process specific attachments and extract text content
     * @param {string} chatId - Chat ID 
     * @param {Array} attachmentFilenames - Array of specific filenames to process
     * @returns {Promise<string>} Combined text content from specified attachments
     */
    async processSpecificAttachments(chatId, attachmentFilenames = []) {
        try {
            if (!chatId || !attachmentFilenames || attachmentFilenames.length === 0) {
                console.log('📎 No specific attachments to process');
                return '';
            }

            const attachmentsPath = path.join(this.uploadsPath, chatId, 'attachments');
            console.log(`🔍 Processing specific attachments in: ${attachmentsPath}`);
            console.log(`📎 Target files: ${attachmentFilenames.join(', ')}`);
            
            // Check if attachments directory exists
            try {
                await fs.access(attachmentsPath);
            } catch (error) {
                console.log(`📎 No attachments directory for chat ${chatId}`);
                return '';
            }

            console.log(`📎 Processing ${attachmentFilenames.length} specific attachments for chat ${chatId}`);
            let combinedContent = '';
            let processedCount = 0;

            for (const filename of attachmentFilenames) {
                try {
                    // Create attachment object (mimicking original structure)
                    const attachment = {
                        originalname: filename,
                        filename: filename
                    };

                    const content = await this.extractTextFromAttachment(attachment, chatId);
                    if (content && content.trim()) {
                        combinedContent += `\n\n=== FILE CONTENT: ${filename} ===\n`;
                        combinedContent += content;
                        combinedContent += `\n=== END FILE: ${filename} ===\n`;
                        processedCount++;
                        console.log(`✅ Processed specific attachment: ${filename}`);
                    }
                } catch (error) {
                    console.error(`❌ Error processing specific attachment ${filename}:`, error);
                }
            }

            console.log(`✅ Processed ${processedCount}/${attachmentFilenames.length} specific attachments for chat ${chatId}`);
            return combinedContent.trim();

        } catch (error) {
            console.error('❌ Error processing specific attachments:', error);
            return '';
        }
    }

    /**
     * Process all attachments for a chat and extract text content (LEGACY - use processSpecificAttachments instead)
     * @param {string} chatId - Chat ID to process attachments for
     * @returns {Promise<string>} Combined text content from all attachments
     */
    async processAttachments(chatId) {
        try {
            if (!chatId) {
                return '';
            }

            const attachmentsPath = path.join(this.uploadsPath, chatId, 'attachments');
            console.log(`🔍 DEBUG: Looking for attachments in: ${attachmentsPath}`);
            
            // Check if attachments directory exists
            try {
                await fs.access(attachmentsPath);
                console.log(`✅ DEBUG: Attachments directory found: ${attachmentsPath}`);
            } catch (error) {
                console.log(`📎 No attachments directory for chat ${chatId} at: ${attachmentsPath}`);
                return '';
            }

            // Read all files in the attachments directory
            const files = await fs.readdir(attachmentsPath);
            if (files.length === 0) {
                console.log(`📎 No attachments found for chat ${chatId}`);
                return '';
            }

            console.log(`⚠️ LEGACY: Processing ALL ${files.length} attachments for chat ${chatId} (consider using processSpecificAttachments)`);
            let combinedContent = '';
            let processedCount = 0;

            for (const file of files) {
                try {
                    // Create attachment object (mimicking original structure)
                    const attachment = {
                        originalname: file,
                        filename: file
                    };

                    const content = await this.extractTextFromAttachment(attachment, chatId);
                    if (content && content.trim()) {
                        combinedContent += `\n\n=== FILE CONTENT: ${attachment.originalname} ===\n`;
                        combinedContent += content;
                        combinedContent += `\n=== END FILE: ${attachment.originalname} ===\n`;
                        processedCount++;
                    }
                } catch (error) {
                    console.error(`❌ Error processing attachment ${file}:`, error);
                }
            }

            console.log(`✅ Processed ${processedCount}/${files.length} attachments for chat ${chatId}`);
            return combinedContent.trim();

        } catch (error) {
            console.error('❌ Error processing attachments:', error);
            return '';
        }
    }

    /**
     * Extract text content from a single attachment file
     * @param {Object} attachment - Attachment object with originalname and filename
     * @param {string} chatId - Chat ID (optional, for path construction)
     * @returns {Promise<string>} Extracted text content
     */
    async extractTextFromAttachment(attachment, chatId = null) {
        try {
            // Build full path to attachment
            let filePath;
            if (chatId) {
                // For chat-specific file access, include attachments subfolder
                filePath = path.join(this.uploadsPath, chatId, 'attachments', attachment.filename);
            } else {
                // Fallback for backward compatibility
                filePath = path.join(this.uploadsPath, attachment.filename);
            }

            // Check if file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                throw new Error(`File not found: ${filePath}`);
            }

            // Get file extension
            const ext = path.extname(attachment.originalname || attachment.filename).toLowerCase();
            console.log(`📄 Processing file ${attachment.originalname} (${ext})`);

            // Route to appropriate extraction method based on file type
            switch (ext) {
                case '.txt':
                case '.md':
                case '.csv':
                case '.json':
                case '.js':
                case '.html':
                case '.css':
                    return await this.extractFromTextFile(filePath);
                
                case '.pdf':
                    return await this.extractFromPDF(filePath);
                
                case '.docx':
                    return await this.extractFromDOCX(filePath);
                
                case '.jpg':
                case '.jpeg':
                case '.png':
                case '.gif':
                case '.webp':
                case '.bmp':
                case '.svg':
                    return await this.extractFromImage(filePath, attachment.originalname || attachment.filename);
                
                default:
                    // For unknown types, try reading as text
                    console.warn(`⚠️ Unknown file type ${ext}, attempting text extraction`);
                    return await this.extractFromTextFile(filePath);
            }

        } catch (error) {
            throw new Error(`Processing failed for ${attachment.originalname}: ${error.message}`);
        }
    }

    /**
     * Extract text content from plain text files
     * @param {string} filePath - Path to the text file
     * @returns {Promise<string>} File content as text
     */
    async extractFromTextFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content;
        } catch (error) {
            throw new Error(`Failed to read text file: ${error.message}`);
        }
    }

    /**
     * Extract text content from PDF files
     * @param {string} filePath - Path to the PDF file
     * @returns {Promise<string>} Extracted text content
     */
    async extractFromPDF(filePath) {
        try {
            console.log(`📄 Extracting PDF text from: ${filePath}`);
            
            // Try to load pdf-parse library
            let pdfParse;
            try {
                pdfParse = require('pdf-parse');
            } catch (error) {
                console.warn('⚠️ pdf-parse library not available, returning placeholder for PDF');
                const stats = await fs.stat(filePath);
                return `[PDF FILE: ${path.basename(filePath)} - ${(stats.size / 1024).toFixed(1)}KB - Text extraction requires pdf-parse library]`;
            }

            const dataBuffer = await fs.readFile(filePath);
            const data = await pdfParse(dataBuffer);
            
            console.log(`✅ Extracted ${data.text.length} characters from PDF`);
            return data.text;

        } catch (error) {
            console.error('❌ PDF extraction error:', error);
            // Return placeholder instead of failing completely
            const stats = await fs.stat(filePath);
            return `[PDF FILE: ${path.basename(filePath)} - ${(stats.size / 1024).toFixed(1)}KB - Text extraction failed: ${error.message}]`;
        }
    }

    /**
     * Extract text content from DOCX files
     * @param {string} filePath - Path to the DOCX file
     * @returns {Promise<string>} Extracted text content
     */
    async extractFromDOCX(filePath) {
        try {
            // Try to load mammoth library for DOCX extraction
            let mammoth;
            try {
                mammoth = require('mammoth');
            } catch (error) {
                console.warn('⚠️ mammoth library not available, returning placeholder for DOCX');
                const stats = await fs.stat(filePath);
                return `[DOCX FILE: ${path.basename(filePath)} - ${(stats.size / 1024).toFixed(1)}KB - Text extraction requires mammoth library]`;
            }

            console.log(`📄 Extracting DOCX text from: ${filePath}`);
            
            const result = await mammoth.extractRawText({ path: filePath });
            console.log(`✅ Extracted ${result.value.length} characters from DOCX`);
            
            return result.value;

        } catch (error) {
            console.error('❌ DOCX extraction error:', error);
            // Return placeholder instead of failing completely
            const stats = await fs.stat(filePath);
            return `[DOCX FILE: ${path.basename(filePath)} - ${(stats.size / 1024).toFixed(1)}KB - Text extraction failed: ${error.message}]`;
        }
    }

    /**
     * Process image files for attachment display
     * @param {string} filePath - Path to the image file
     * @param {string} originalName - Original filename
     * @returns {Promise<string>} Image information for AI context
     */
    async extractFromImage(filePath, originalName) {
        try {
            console.log(`🖼️ Processing image: ${originalName}`);
            
            const stats = await fs.stat(filePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            const ext = path.extname(originalName).toLowerCase();
            
            // Return image metadata for AI context
            return `[IMAGE FILE: ${originalName} - ${sizeKB}KB - Format: ${ext.substring(1).toUpperCase()} - Available for visual display in chat]`;

        } catch (error) {
            console.error('❌ Image processing error:', error);
            return `[IMAGE FILE: ${originalName} - Processing failed: ${error.message}]`;
        }
    }

    /**
     * Get supported file formats for processing
     * @returns {Array<string>} Array of supported file extensions
     */
    getSupportedFormats() {
        return [
            '.txt', '.md', '.csv', '.json', '.js', '.html', '.css', // Plain text
            '.pdf',  // PDF (requires pdf-parse)
            '.docx', // Word documents (requires mammoth)
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg' // Images
        ];
    }

    /**
     * Check if file format is supported for processing
     * @param {string} filename - Name of the file to check
     * @returns {boolean} True if format is supported
     */
    isFormatSupported(filename) {
        const ext = path.extname(filename).toLowerCase();
        return this.getSupportedFormats().includes(ext);
    }

    /**
     * Check if file is an image
     * @param {string} filename - Name of the file to check
     * @returns {boolean} True if file is an image
     */
    isImageFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        return imageExts.includes(ext);
    }

    /**
     * Get attachment processing statistics for a chat
     * @param {string} chatId - Chat ID to get stats for
     * @returns {Promise<Object>} Statistics object
     */
    async getAttachmentStats(chatId) {
        try {
            const attachmentsPath = path.join(this.uploadsPath, chatId, 'attachments');
            
            try {
                await fs.access(attachmentsPath);
            } catch (error) {
                return { totalFiles: 0, totalSize: 0, supportedFiles: 0 };
            }

            const files = await fs.readdir(attachmentsPath);
            let totalSize = 0;
            let supportedFiles = 0;

            for (const file of files) {
                const filePath = path.join(attachmentsPath, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
                
                if (this.isFormatSupported(file)) {
                    supportedFiles++;
                }
            }

            return {
                totalFiles: files.length,
                totalSize: totalSize,
                supportedFiles: supportedFiles,
                averageSize: files.length > 0 ? Math.round(totalSize / files.length) : 0
            };

        } catch (error) {
            console.error('❌ Error getting attachment stats:', error);
            return { totalFiles: 0, totalSize: 0, supportedFiles: 0 };
        }
    }

    /**
     * Clean up attachment files for a chat (utility method)
     * @param {string} chatId - Chat ID to clean up
     * @returns {Promise<boolean>} Success status
     */
    async cleanupAttachments(chatId) {
        try {
            const attachmentsPath = path.join(this.uploadsPath, chatId, 'attachments');
            
            try {
                await fs.access(attachmentsPath);
            } catch (error) {
                console.log(`📎 No attachments to clean up for chat ${chatId}`);
                return true;
            }

            await fs.rmdir(attachmentsPath, { recursive: true });
            console.log(`🗑️ Cleaned up attachments for chat ${chatId}`);
            return true;

        } catch (error) {
            console.error(`❌ Error cleaning up attachments for chat ${chatId}:`, error);
            return false;
        }
    }
}

module.exports = AttachmentController;