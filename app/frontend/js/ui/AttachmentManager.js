/**
 * AttachmentManager - File Attachment Management & UI
 * 
 * Manages file selection, validation, preview generation, and attachment rendering
 * Extracted from ChatInterface.js for modular architecture compliance
 * 
 * Dependencies:
 * - ChatInterface: Parent component reference
 * - App: Notification system and utilities
 */

class AttachmentManager {
    constructor(chatInterface) {
        this.chatInterface = chatInterface;
        this.app = chatInterface.app;
        
        console.log('📎 AttachmentManager initialized');
    }
    
    /**
     * Open file selection dialog
     */
    openFileDialog() {
        console.log('📎 Opening file dialog...');
        
        // Create a more advanced file selector with directory memory
        this.showAdvancedFileSelector();
    }

    /**
     * Show advanced file selector with directory memory
     */
    showAdvancedFileSelector() {
        // Create a helpful modal with directory info
        const lastDir = this.getLastUsedDirectory();
        const isFirstTime = lastDir === 'documents';
        
        let modalContent = `
            <div id="fileSelectionModal" class="modal" style="display: flex; align-items: center; justify-content: center;">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        📁 Select Files to Attach
                        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div style="margin-bottom: 20px;">
                            ${isFirstTime 
                                ? '<p>🆕 <strong>First time:</strong> The browser will open the Documents folder by default.</p>'
                                : `<p>📂 <strong>Last used folder:</strong> ${lastDir}</p>`
                            }
                        </div>
                        
                        <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0;">💡 Tips:</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                                <li>You can select multiple files by holding <kbd>Ctrl</kbd></li>
                                <li>Supported formats: PDF, DOC, TXT, images (JPG, PNG, GIF...)</li>
                                <li>The browser will remember the folder for next time</li>
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn btn-success" onclick="document.getElementById('fileInput').click(); this.closest('.modal').remove();">📂 Open File Browser</button>
                    </div>
                </div>
            </div>
        `;
        
        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // Auto-remove modal after 5 seconds if user doesn't interact
        setTimeout(() => {
            const modal = document.getElementById('fileSelectionModal');
            if (modal) modal.remove();
        }, 5000);
    }

    /**
     * Use modern File System Access API with directory memory
     */
    async showModernFilePicker() {
        try {
            const lastDir = this.getLastUsedDirectory();
            console.log(`📁 Using last directory: ${lastDir}`);
            
            const fileHandles = await window.showOpenFilePicker({
                multiple: true,
                startIn: lastDir === 'documents' ? 'documents' : lastDir,
                types: [{
                    description: 'Supported documents and images',
                    accept: {
                        'application/pdf': ['.pdf'],
                        'application/msword': ['.doc'],
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                        'text/plain': ['.txt'],
                        'text/csv': ['.csv'],
                        'application/json': ['.json'],
                        'text/markdown': ['.md'],
                        'text/javascript': ['.js'],
                        'text/html': ['.html'],
                        'text/css': ['.css'],
                        'application/vnd.ms-excel': ['.xlsx'],
                        'image/jpeg': ['.jpg', '.jpeg'],
                        'image/png': ['.png'],
                        'image/gif': ['.gif'],
                        'image/webp': ['.webp'],
                        'image/bmp': ['.bmp'],
                        'image/svg+xml': ['.svg']
                    }
                }]
            });

            // Try to save the directory for next time
            if (fileHandles.length > 0) {
                try {
                    // Try different methods to get parent directory
                    const firstHandle = fileHandles[0];
                    if (firstHandle.getParent) {
                        const parentDir = await firstHandle.getParent();
                        this.saveLastUsedDirectory(parentDir.name);
                    }
                } catch (error) {
                    console.log('ℹ️ Cannot determine parent directory');
                }
            }

            // Convert file handles to files
            const files = [];
            for (const fileHandle of fileHandles) {
                try {
                    const file = await fileHandle.getFile();
                    files.push(file);
                } catch (error) {
                    console.warn('⚠️ Cannot read file:', error);
                }
            }

            if (files.length > 0) {
                this.addAttachments(files);
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('⚠️ Modern file picker failed:', error);
                // Fallback to traditional method
                this.showTraditionalFilePicker();
            }
        }
    }

    /**
     * Traditional file input fallback
     */
    showTraditionalFilePicker() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        } else {
            this.app.addNotification('❌ File input not found', 'error');
        }
    }

    /**
     * Get last used directory
     */
    getLastUsedDirectory() {
        try {
            const stored = localStorage.getItem('ollamaGUI_lastFileDirectory');
            if (stored && stored !== 'documents') {
                return stored;
            }
            return 'documents';
        } catch (error) {
            return 'documents';
        }
    }

    /**
     * Save last used directory
     */
    saveLastUsedDirectory(directoryName) {
        try {
            if (directoryName && directoryName !== 'documents') {
                localStorage.setItem('ollamaGUI_lastFileDirectory', directoryName);
                console.log(`💾 Saved directory: ${directoryName}`);
            }
        } catch (error) {
            console.warn('⚠️ Cannot save directory:', error);
        }
    }

    /**
     * Handle file selection from input dialog
     * @param {Event} e - File input change event
     */
    handleFileSelect(e) {
        console.log('📎 Files selected:', e.target.files.length);
        const files = Array.from(e.target.files);
        
        // Try to extract directory information for user feedback
        if (files.length > 0) {
            const firstFile = files[0];
            
            // Try to get directory info from file path (limited browser support)
            if (firstFile.webkitRelativePath) {
                const pathParts = firstFile.webkitRelativePath.split('/');
                if (pathParts.length > 1) {
                    const directoryName = pathParts[pathParts.length - 2];
                    this.saveLastUsedDirectory(directoryName);
                    this.app.addNotification(`📁 Files selected from folder: ${directoryName}`, 'info', 3000);
                }
            } else {
                // Fallback: show file selection feedback
                this.app.addNotification(`📎 ${files.length} file${files.length > 1 ? 's' : ''} selected`, 'success', 2000);
                
                // Try to guess directory from common file patterns
                const fileName = firstFile.name.toLowerCase();
                if (fileName.includes('desktop') || fileName.includes('scrivania')) {
                    this.saveLastUsedDirectory('Desktop');
                } else if (fileName.includes('download')) {
                    this.saveLastUsedDirectory('Download');
                } else if (fileName.includes('document')) {
                    this.saveLastUsedDirectory('Documenti');
                }
            }
        }
        
        this.addAttachments(files);
        e.target.value = ''; // Reset input
    }

    /**
     * Handle drag and drop file selection
     * @param {DragEvent} e - Drop event
     */
    handleDrop(e) {
        e.preventDefault();
        console.log('📎 Files dropped:', e.dataTransfer.files.length);
        const files = Array.from(e.dataTransfer.files);
        this.addAttachments(files);
    }

    /**
     * Add files to pending attachments with validation
     * @param {Array} files - Array of File objects
     */
    addAttachments(files) {
        const allowedTypes = [
            // Text files
            '.txt', '.md', '.csv', '.json', '.js', '.html', '.css',
            // Documents  
            '.pdf', '.doc', '.docx', '.xlsx',
            // Images
            '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'
        ];
        
        for (const file of files) {
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            
            if (!allowedTypes.includes(ext)) {
                this.app.addNotification(`❌ Unsupported file type: ${file.name}`, 'error');
                continue;
            }
            
            // Check file size limits
            const maxSize = this.isImageFile(file.name) ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB images, 50MB documents
            if (file.size > maxSize) {
                const sizeLimitMB = maxSize / (1024 * 1024);
                this.app.addNotification(`❌ File too large: ${file.name} (max ${sizeLimitMB}MB)`, 'error');
                continue;
            }
            
            // Check if already added
            if (this.chatInterface.pendingAttachments.find(att => att.name === file.name && att.size === file.size)) {
                this.app.addNotification(`⚠️ File already attached: ${file.name}`, 'warning');
                continue;
            }
            
            this.chatInterface.pendingAttachments.push(file);
            console.log(`✅ Added attachment: ${file.name} (${this.isImageFile(file.name) ? 'image' : 'document'})`);
        }
        
        this.renderAttachmentPreview();
    }

    /**
     * Render attachment preview in UI
     */
    renderAttachmentPreview() {
        const previewContainer = document.getElementById('attachmentPreview');
        if (!previewContainer) return;
        
        if (this.chatInterface.pendingAttachments.length === 0) {
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
            return;
        }
        
        previewContainer.style.display = 'block';
        const attachmentElements = this.chatInterface.pendingAttachments.map((file, index) => {
            const icon = this.getFileIcon(file.name);
            const sizeKB = (file.size / 1024).toFixed(1);
            
            return `
                <div class="attachment-item">
                    <span class="attachment-icon">${icon}</span>
                    <span class="attachment-name">${file.name}</span>
                    <span class="attachment-size">(${sizeKB} KB)</span>
                    <button class="attachment-remove" onclick="window.chatInterface.attachmentManager.removeAttachment(${index})" title="Remove attachment">×</button>
                </div>
            `;
        }).join('');
        
        previewContainer.innerHTML = `
            <div class="attachment-preview-header">📎 Attachments ready (${this.chatInterface.pendingAttachments.length})</div>
            ${attachmentElements}
        `;
    }

    /**
     * Remove attachment by index
     * @param {number} index - Index of attachment to remove
     */
    removeAttachment(index) {
        if (index >= 0 && index < this.chatInterface.pendingAttachments.length) {
            const fileName = this.chatInterface.pendingAttachments[index].name;
            this.chatInterface.pendingAttachments.splice(index, 1);
            console.log(`🗑️ Removed attachment: ${fileName}`);
            this.renderAttachmentPreview();
        }
    }

    /**
     * Get appropriate file icon based on filename extension
     * @param {string} filename - Name of the file
     * @returns {string} Unicode icon
     */
    getFileIcon(filename) {
        if (!filename || typeof filename !== 'string') {
            console.warn(`⚠️ getFileIcon called with invalid filename:`, filename);
            return '📎'; // Default icon
        }
        const ext = filename.split('.').pop().toLowerCase();
        
        const iconMap = {
            'pdf': '📕',
            'doc': '📝', 'docx': '📝',
            'txt': '📄', 'md': '📄',
            'csv': '📊', 'xlsx': '📊',
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'bmp': '🖼️', 'svg': '🖼️',
            'js': '📜', 'html': '📜', 'css': '📜', 'json': '📜'
        };
        
        return iconMap[ext] || '📄';
    }

    /**
     * Render message attachments in chat display
     * @param {Array} attachments - Array of attachment objects
     * @param {string} chatId - ID of the chat (for URL construction)
     * @returns {string} HTML for attachment display
     */
    renderMessageAttachments(attachments, chatId) {
        if (!attachments || attachments.length === 0) {
            return '';
        }

        console.log(`📎 Rendering ${attachments.length} message attachments for chat ${chatId}:`, attachments);

        const attachmentElements = attachments.map(attachment => {
            // Handle both string format (legacy) and object format (new metadata)
            let filename, originalName, size;
            
            if (typeof attachment === 'string') {
                // Legacy format: just filename
                filename = attachment;
                originalName = attachment;
                size = null;
            } else if (typeof attachment === 'object' && attachment) {
                // New metadata format
                filename = attachment.filename || attachment.path?.split('/').pop() || 'unknown';
                originalName = attachment.originalName || attachment.filename || filename;
                size = attachment.size || null;
            } else {
                console.warn('⚠️ Invalid attachment format:', attachment);
                return '';
            }
            
            const icon = this.getFileIcon(originalName);
            const sizeKB = size ? (size / 1024).toFixed(1) : 'N/A';
            
            console.log(`📎 Processing attachment: filename=${filename}, originalName=${originalName}, size=${sizeKB}KB`);
            
            // Check if it's an image for preview
            if (this.isImageFile(filename)) {
                return `
                    <div class="message-attachment image-attachment">
                        <div class="attachment-header">
                            <span class="attachment-icon">${icon}</span>
                            <span class="attachment-name">${originalName}</span>
                            <span class="attachment-size">(${sizeKB} KB)</span>
                        </div>
                        <div class="attachment-image-preview">
                            <img src="/api/chat/attachment/${chatId}/${filename}" 
                                 alt="${originalName}" 
                                 style="max-width: 300px; max-height: 200px; border-radius: 4px;"
                                 onerror="this.parentElement.innerHTML='<span>🖼️ Image not available</span>';">
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="message-attachment">
                    <span class="attachment-icon">${icon}</span>
                    <span class="attachment-name">${originalName}</span>
                    <span class="attachment-size">(${sizeKB} KB)</span>
                    <a href="/api/chat/attachment/${chatId}/${filename}" 
                       download="${originalName}" 
                       class="attachment-download">📥 Download</a>
                </div>
            `;
        }).filter(html => html.length > 0).join(''); // Filtra elementi vuoti

        return attachmentElements.length > 0 ? `<div class="message-attachments">${attachmentElements}</div>` : '';
    }

    /**
     * Check if file is an image based on extension
     * @param {string} filename - Name of the file
     * @returns {boolean} True if file is an image
     */
    isImageFile(filename) {
        if (!filename || typeof filename !== 'string') {
            console.warn(`⚠️ isImageFile called with invalid filename:`, filename);
            return false;
        }
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        const ext = filename.split('.').pop().toLowerCase();
        return imageExts.includes(ext);
    }

    /**
     * Load attachments for a specific chat
     * @param {string} chatId - ID of the chat
     * @returns {Promise<Array>} Array of attachment objects
     */
    async loadChatAttachments(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}/attachments`);
            const data = await response.json();
            
            if (data.success) {
                return data.attachments || [];
            } else {
                console.warn('⚠️ Error loading attachments:', data.message);
                return [];
            }
        } catch (error) {
            console.error('❌ Error loading attachments:', error);
            return [];
        }
    }

    /**
     * Show attachments for a specific chat in modal or dedicated view
     * @param {string} chatId - ID of the chat
     * @param {Array} attachments - Array of attachment objects
     */
    async showChatAttachments(chatId, attachments) {
        if (!attachments) {
            attachments = await this.loadChatAttachments(chatId);
        }

        if (attachments.length === 0) {
            this.app.addNotification('📎 No attachments in this conversation', 'info');
            return;
        }

        // Create attachment modal or update existing one
        let modal = document.getElementById('chatAttachmentsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'chatAttachmentsModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        📎 Conversation Attachments
                        <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div id="chatAttachmentsList"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const attachmentsList = modal.querySelector('#chatAttachmentsList');
        const attachmentElements = attachments.map(attachment => {
            // Handle both string format (legacy) and object format
            const filename = typeof attachment === 'string' ? attachment : attachment.originalName;
            const size = typeof attachment === 'object' ? attachment.size : null;
            const uploadDate = typeof attachment === 'object' ? attachment.uploadDate : null;
            
            const icon = this.getFileIcon(filename);
            const sizeKB = size ? (size / 1024).toFixed(1) : 'N/A';
            const uploadDateFormatted = uploadDate ? new Date(uploadDate).toLocaleDateString() : 'N/A';
            
            return `
                <div class="chat-attachment-item">
                    <div class="attachment-info">
                        <span class="attachment-icon">${icon}</span>
                        <div class="attachment-details">
                            <div class="attachment-name">${filename}</div>
                            <div class="attachment-meta">${sizeKB} KB • ${uploadDateFormatted}</div>
                        </div>
                    </div>
                    <div class="attachment-actions">
                        <a href="/api/chat/attachment/${filename}" download="${filename}" class="attachment-download-btn">📥 Download</a>
                    </div>
                </div>
            `;
        }).join('');

        attachmentsList.innerHTML = `
            <div class="attachment-stats">
                Found ${attachments.length} attachments in this conversation
            </div>
            ${attachmentElements}
        `;

        modal.classList.add('show');
    }

    /**
     * Prevent default drag behaviors
     * @param {Event} e - Drag event
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
}