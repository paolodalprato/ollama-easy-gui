// FileSelectorCore.js - File Selector Core Module
// Extracted from UnifiedFileSelector.js for GUARDRAIL ARCHITECTURE compliance
// Size: ~240 lines (target: <500 lines) ✅

/**
 * FileSelectorCore - Core file selector with modal management
 * 
 * RESPONSIBILITIES:
 * - Constructor e configuration management
 * - Feature detection for progressive enhancement
 * - UI modal generation e management
 * - Basic event handling infrastructure
 * - Modal show/hide logic
 * 
 * DEPENDENCIES:
 * - None (self-contained core component)
 * 
 * ARCHITECTURE: Foundation component for modular file selection system
 */
class FileSelectorCore {
    constructor(options = {}) {
        this.options = {
            maxFileSize: 50 * 1024 * 1024, // 50MB per file
            maxBatchSize: 500 * 1024 * 1024, // 500MB per batch total
            maxFileCount: 100, // Max 100 files per batch
            supportedTypes: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain',
                'text/csv',
                'application/json',
                'text/markdown',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ],
            ...options
        };
        
        this.isModernBrowser = this.detectFeatures();
        this.currentSelection = null;
        this.eventListeners = new Map();
        
        console.log('🗂️ FileSelectorCore initialized', {
            modernBrowser: this.isModernBrowser,
            supportedTypes: this.options.supportedTypes.length
        });
    }

    /**
     * Feature detection per progressive enhancement
     */
    detectFeatures() {
        const hasFileSystemAccess = 'showOpenFilePicker' in window && 'showDirectoryPicker' in window;
        let hasWebKitDirectory = false;
        try {
            hasWebKitDirectory = typeof DataTransferItem !== 'undefined' && 'webkitGetAsEntry' in DataTransferItem.prototype;
        } catch (e) {
            hasWebKitDirectory = false;
        }
        
        return {
            fileSystemAccess: hasFileSystemAccess,
            webkitDirectory: hasWebKitDirectory,
            dragDrop: 'ondrop' in window
        };
    }

    /**
     * Show unified selection modal
     */
    showSelectionModal() {
        const modalHTML = `
            <div class="unified-file-selection-modal" id="unifiedFileModal">
                <div class="modal-overlay" data-action="close"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📁 Select Files to Analyze</h3>
                        <button class="modal-close-btn" data-action="close" title="Close">×</button>
                    </div>
                    
                    <div class="modal-body">
                        ${this.generateBrowserSupportInfo()}
                        
                        <div class="selection-options">
                            <div class="selection-option" data-type="single">
                                <div class="option-icon">📄</div>
                                <div class="option-content">
                                    <h4>Single File</h4>
                                    <p>Select a single document for immediate analysis</p>
                                    <div class="option-features">
                                        <span class="feature-tag">✓ Fast</span>
                                        <span class="feature-tag">✓ Immediate</span>
                                    </div>
                                </div>
                            </div>

                            <div class="selection-option" data-type="multiple">
                                <div class="option-icon">📚</div>
                                <div class="option-content">
                                    <h4>Multiple Files</h4>
                                    <p>Select multiple files for combined or parallel analysis</p>
                                    <div class="option-features">
                                        <span class="feature-tag">✓ Batch</span>
                                        <span class="feature-tag">✓ Up to 100 files</span>
                                    </div>
                                </div>
                            </div>
                            
                            ${this.isModernBrowser.fileSystemAccess ? `
                            <div class="selection-option" data-type="directory">
                                <div class="option-icon">📁</div>
                                <div class="option-content">
                                    <h4>Entire Directory</h4>
                                    <p>Select all files from a folder (modern API)</p>
                                    <div class="option-features">
                                        <span class="feature-tag">✓ Recursive</span>
                                        <span class="feature-tag">✓ Auto filter</span>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                        
                        ${this.isModernBrowser.dragDrop ? `
                        <div class="drop-zone" id="unifiedDropZone">
                            <div class="drop-zone-content">
                                <div class="drop-icon">🎯</div>
                                <p><strong>Or drag files here</strong></p>
                                <small>Supports single files, multiple files and folders</small>
                            </div>
                        </div>
                        ` : ''}
                        
                        <div class="modal-info">
                            <strong>Supported types:</strong> PDF, DOC/DOCX, TXT, CSV, JSON, MD, XLS/XLSX<br>
                            <strong>File limit:</strong> 50MB per file, 500MB total, max 100 files
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('unifiedFileModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Initialize event listeners
        this.initializeModalEvents();
        
        // Focus management
        setTimeout(() => {
            const modal = document.getElementById('unifiedFileModal');
            if (modal) {
                modal.focus();
            }
        }, 100);
    }

    /**
     * Generate browser support information
     */
    generateBrowserSupportInfo() {
        if (this.isModernBrowser.fileSystemAccess) {
            return `
                <div class="browser-support modern">
                    <span class="support-icon">✅</span>
                    <span>Modern browser detected - all features available</span>
                </div>
            `;
        } else {
            return `
                <div class="browser-support legacy">
                    <span class="support-icon">⚠️</span>
                    <span>Legacy browser - some features limited (directory selection not available)</span>
                </div>
            `;
        }
    }

    /**
     * Initialize modal event listeners
     */
    initializeModalEvents() {
        const modal = document.getElementById('unifiedFileModal');
        if (!modal) return;

        // Close modal events
        modal.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'close' || e.target === modal.querySelector('.modal-overlay')) {
                this.hideModal();
            }
        });

        // Selection option events
        modal.querySelectorAll('.selection-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const type = option.dataset.type;
                this.handleSelectionType(type);
            });
        });

        // Drag and drop events (if supported)
        if (this.isModernBrowser.dragDrop) {
            const dropZone = document.getElementById('unifiedDropZone');
            if (dropZone) {
                this.initializeDragDrop(dropZone);
            }
        }

        // Keyboard navigation
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    /**
     * Initialize drag and drop functionality
     */
    initializeDragDrop(dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            const items = Array.from(e.dataTransfer.items);
            
            // Handle dropped files/directories
            this.handleDroppedFiles(files, items);
        });
    }

    /**
     * Handle selection type clicked
     */
    handleSelectionType(type) {
        console.log(`🗂️ Selection type: ${type}`);
        
        this.hideModal();
        
        // Emit event for delegation to appropriate handler
        this.emit('selectionType', { type });
    }

    /**
     * Handle dropped files
     */
    handleDroppedFiles(files, items) {
        console.log(`🎯 Files dropped: ${files.length} files, ${items.length} items`);
        
        this.hideModal();
        
        // Emit event for delegation to appropriate handler
        this.emit('filesDropped', { files, items });
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('unifiedFileModal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Event emission system
     */
    on(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, []);
        }
        this.eventListeners.get(eventName).push(callback);
    }

    emit(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Remove event listener
     */
    off(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            const listeners = this.eventListeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileSelectorCore;
}