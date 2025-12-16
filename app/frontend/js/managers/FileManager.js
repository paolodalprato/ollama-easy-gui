/**
 * FileManager - Enhanced File Access & Processing Manager
 * 
 * Manages file selection, preview, processing, and content extraction
 * Extracted from app.js for better modularity and maintainability
 * 
 * Dependencies:
 * - UnifiedFileSelector: File selection modal and UI
 * - FileTextExtractor: Content extraction from files
 * - ChatInterface: Chat attachment integration
 */

class FileManager {
    constructor(app) {
        this.app = app;
        
        // Component references (injected from app)
        this.unifiedFileSelector = app.unifiedFileSelector;
        this.fileTextExtractor = app.fileTextExtractor;
        this.chatInterface = app.chatInterface;
        this.statusIndicator = app.statusIndicator;
        
        // File processing storage
        this.extractedContentStorage = new Map(); // Store extracted text
        
        console.log('🗂️ FileManager initialized');
    }
    
    /**
     * Initialize Enhanced File Access system
     * Sets up UnifiedFileSelector and event listeners
     */
    setupEnhancedFileAccess() {
        // Initialize UnifiedFileSelector in DOM
        if (!this.unifiedFileSelector.initialize('body')) {
            console.error('🚫 Failed to initialize UnifiedFileSelector');
            return;
        }

        // Setup event listeners
        this.unifiedFileSelector.on('selection', (selection) => {
            console.log('📁 File selection received:', selection);
            this.handleFileSelection(selection);
        });

        this.unifiedFileSelector.on('error', (error) => {
            console.error('🚫 File selection error:', error);
            this.app.addNotification(`❌ File selection error: ${error.error}`, 'error');
        });

        // Add button to trigger file selection modal
        this.addFileSelectionButton();
        
        // Hook into chat interface to add button when chat area becomes visible
        this.hookChatInterfaceVisibility();
        
        console.log('✅ Enhanced File Access initialized');
    }
    
    /**
     * Hook into chat interface visibility to add button when needed
     */
    hookChatInterfaceVisibility() {
        // Override or hook the chat interface show methods
        const originalEnableControls = this.statusIndicator.enableControls;
        this.statusIndicator.enableControls = () => {
            originalEnableControls.call(this.statusIndicator);
            // Add button when controls are enabled (chat is loaded)
            setTimeout(() => {
                this.addFileSelectionButton();
            }, 100);
        };
    }

    /**
     * Add Enhanced File Selection button to chat interface
     */
    addFileSelectionButton() {
        console.log('🔧 Adding Enhanced File Selection button...');
        
        // Find input wrapper and add enhanced file selection button
        const inputWrapper = document.querySelector('.input-wrapper');
        if (!inputWrapper) {
            console.warn('⚠️ Input wrapper not found for Enhanced File Selection button');
            setTimeout(() => {
                this.addFileSelectionButton();
            }, 500);
            return;
        }

        try {
            const existingBtn = document.getElementById('enhancedFileBtn');
            if (existingBtn) {
                console.log('⚠️ Enhanced File Selection button already exists');
                return;
            }

            // Create enhanced file selection button  
            const enhancedButton = document.createElement('button');
            enhancedButton.id = 'enhancedFileBtn';
            enhancedButton.className = 'attachment-btn enhanced-file-btn';
            enhancedButton.innerHTML = `<img src="icon/graffetta.png" alt="Enhanced File Access" style="width: 16px; height: 16px;">`;
            enhancedButton.title = 'Enhanced File Access - Select single files, multiple files or entire folders';
            enhancedButton.onclick = () => this.showEnhancedFileSelection();
            
            // Find attachment button to insert after it
            const attachmentBtn = inputWrapper.querySelector('.attachment-btn');
            
            // Insert after attachment button
            if (attachmentBtn && attachmentBtn.nextSibling) {
                inputWrapper.insertBefore(enhancedButton, attachmentBtn.nextSibling);
            } else if (attachmentBtn) {
                attachmentBtn.parentNode.appendChild(enhancedButton);
            }
            
            console.log('✅ Enhanced File Selection button added successfully');
            
        } catch (error) {
            console.error('❌ Error adding Enhanced File Selection button:', error);
        }
    }

    /**
     * Show Enhanced File Selection modal
     */
    showEnhancedFileSelection() {
        this.unifiedFileSelector.showModal();
    }

    /**
     * Handle file selection from UnifiedFileSelector
     * @param {Object} selection - File selection object {files, type, processingMode}
     */
    async handleFileSelection(selection) {
        try {
            const { files, type, processingMode } = selection;
            console.log(`📁 Processing ${files.length} file(s) in mode: ${processingMode}`);
            
            this.updateFileButtonStatus(files.length, processingMode);

            // Show detailed notification with file info
            const fileNames = files.map(f => f.name).join(', ');
            const totalSize = (files.reduce((sum, f) => sum + f.size, 0) / (1024*1024)).toFixed(2);

            this.app.addNotification(
                `📁 ${files.length} file(s) selected (${totalSize}MB): ${fileNames.length > 50 ? fileNames.substring(0, 50) + '...' : fileNames}`,
                'info'
            );

            // Show file preview
            this.showFilePreview(files, processingMode);

            // Process files based on selection type
            switch (processingMode) {
                case 'immediate':
                    await this.processImmediateFile(files[0]);
                    break;
                case 'parallel':
                    await this.processParallelFiles(files);
                    break;
                case 'batch':
                    await this.processBatchFiles(files);
                    break;
            }
        } catch (error) {
            console.error('🚫 File processing error:', error);
            this.app.addNotification(`❌ File processing error: ${error.message}`, 'error');
        }
    }

    /**
     * Update file button status with count and mode
     * @param {number} fileCount - Number of files selected
     * @param {string} mode - Processing mode
     */
    updateFileButtonStatus(fileCount, mode) {
        const button = document.getElementById('enhancedFileBtn');
        if (button) {
            button.innerHTML = `<img src="icon/graffetta.png" alt="Enhanced File Access" style="width: 16px; height: 16px;"> ${fileCount}`;
            button.title = `${fileCount} files selected - Mode: ${mode} - Added to conversation`;
            
            // Reset button after some time
            setTimeout(() => {
                if (button) {
                    button.innerHTML = '<img src="icon/graffetta.png" alt="Enhanced File Access" style="width: 16px; height: 16px;">';
                    button.title = 'Enhanced File Access - Select single files, multiple files or entire folders';
                }
            }, 5000);
        }
    }

    /**
     * Show file preview area with selected files
     * @param {Array} files - Array of selected files
     * @param {string} mode - Processing mode
     */
    showFilePreview(files, mode) {
        // Create or update file preview area
        let previewArea = document.getElementById('enhancedFilePreview');
        if (!previewArea) {
            previewArea = document.createElement('div');
            previewArea.id = 'enhancedFilePreview';
            previewArea.className = 'enhanced-file-preview';
            
            const inputArea = document.querySelector('.input-area');
            if (inputArea) {
                inputArea.insertBefore(previewArea, inputArea.firstChild);
            }
        }

        const fileList = files.map(file => {
            const sizeKB = (file.size / 1024).toFixed(1);
            return `
                <div class="file-preview-item">
                    <span class="file-icon">${this.getFileIcon(file.type)}</span>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">(${sizeKB}KB)</span>
                </div>
            `;
        }).join('');

        previewArea.innerHTML = `
            <div class="file-preview-header">
                📁 Files selected for processing (${mode}):
                <button class="file-preview-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="file-preview-list">
                ${fileList}
            </div>
        `;

        // Auto-remove preview after processing
        setTimeout(() => {
            if (previewArea && previewArea.parentNode) {
                previewArea.remove();
            }
        }, 8000);
    }

    /**
     * Get appropriate file icon based on MIME type
     * @param {string} mimeType - File MIME type
     * @returns {string} Unicode icon
     */
    getFileIcon(mimeType) {
        if (!mimeType) return '📄';
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType.startsWith('video/')) return '🎥';
        if (mimeType.startsWith('audio/')) return '🎵';
        if (mimeType.includes('pdf')) return '📕';
        if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) return '📄';
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '📦';
        return '📄';
    }

    /**
     * Process single file immediately
     * @param {File} file - File to process
     */
    async processImmediateFile(file) {
        console.log('🚀 Processing single file immediately:', file.name);
        
        try {
            // Add file as attachment directly to chat (NO IMMEDIATE EXTRACTION)
            this.chatInterface.addAttachments([file]);
            
            this.app.addNotification(
                `✅ File ${file.name} attached to conversation. You can now ask questions about its content.`,
                'success'
            );

            // Update input placeholder to guide user
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                const originalPlaceholder = messageInput.placeholder;
                messageInput.placeholder = `File ${file.name} attached. Ask a question about its content...`;
                
                // Restore original placeholder after some time
                setTimeout(() => {
                    if (messageInput) messageInput.placeholder = originalPlaceholder;
                }, 10000);
            }

        } catch (error) {
            console.error('❌ File processing error:', error);
            this.app.addNotification(
                `❌ Error attaching ${file.name}: ${error.message}`,
                'error'
            );
        }
    }

    /**
     * Process multiple files in parallel
     * @param {Array} files - Array of files to process
     */
    async processParallelFiles(files) {
        console.log('⚡ Processing multiple files:', files.length);
        
        try {
            // Add all files as attachments directly (NO IMMEDIATE EXTRACTION)
            this.chatInterface.addAttachments(files);
            
            this.app.addNotification(
                `✅ ${files.length} files attached to conversation. You can now ask questions about their content.`,
                'success'
            );

            // Update input placeholder to guide user
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                const originalPlaceholder = messageInput.placeholder;
                messageInput.placeholder = `${files.length} files attached. Ask questions about their content...`;
                
                // Restore original placeholder after some time
                setTimeout(() => {
                    if (messageInput) messageInput.placeholder = originalPlaceholder;
                }, 10000);
            }

        } catch (error) {
            console.error('❌ Multiple file processing error:', error);
            this.app.addNotification(
                `❌ Error attaching files: ${error.message}`,
                'error'
            );
        }
    }

    // These methods are kept for reference but should not be called during file selection
    async oldProcessParallelFilesWithExtraction(files) {
        // This method is kept for reference but disabled
        // Original functionality moved to direct attachment approach
        console.log('⚠️ oldProcessParallelFilesWithExtraction called but disabled');
        return;
    }

    /**
     * Process files in batches for large file selections
     * @param {Array} files - Array of files to process in batches
     */
    async processBatchFiles(files) {
        console.log('📦 Processing files in batches:', files.length);
        
        // Process files in smaller batches to avoid overwhelming the system
        const batchSize = 5;
        let processed = 0;

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            
            // Add batch to chat interface
            this.chatInterface.addAttachments(batch);
            processed += batch.length;

            this.app.addNotification(`📦 Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} files added (${processed}/${files.length})`, 'info');

            // Small delay between batches
            if (i + batchSize < files.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        this.app.addNotification(`✅ Batch processing completed: ${files.length} files ready for analysis`, 'success');

        // Update input placeholder
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            const originalPlaceholder = messageInput.placeholder;
            messageInput.placeholder = `Analyze, summarize or extract information from the ${files.length} loaded files...`;
            
            setTimeout(() => {
                if (messageInput) messageInput.placeholder = originalPlaceholder;
            }, 15000);
        }
    }

    /**
     * Store extracted text content (for future use)
     * @param {string} filename - Name of the file
     * @param {string} text - Extracted text content
     */
    storeExtractedText(filename, text) {
        const key = `${Date.now()}_${filename}`;
        this.extractedContentStorage.set(key, {
            filename,
            text,
            timestamp: Date.now(),
            key
        });
    }

    // REMOVED METHODS - Comments preserved for reference
    // These methods have been removed because the AI now automatically processes attachments
    // No manual content insertion is required anymore

    /*
    showContentInsertionButton(filename, text) {
        // This method has been removed because the AI now automatically processes attachments
        // No manual content insertion is required anymore
    }
    */

    /*
    insertExtractedContent(filename, text) {
        // This method has been removed because the AI now automatically processes attachments
        // No manual content insertion is required anymore
    }
    */

    /*
    showMultiContentInsertionButton(extractedResults) {
        // This method has been removed because the AI now automatically processes attachments
        // No manual content insertion is required anymore
    }
    */

    /*
    insertAllExtractedContent(results) {
        // This method has been removed because the AI now automatically processes attachments
        // No manual content insertion is required anymore
    }
    */
}