/**
 * UnifiedFileSelector - Primary Enhanced File Access Component
 * 
 * PURPOSE:
 * Unified interface for single file, multiple files, and directory selection.
 * Foundation component for Enhanced File Access feature implementation.
 *
 * FEATURES:
 * - Single file selection with immediate processing optimization
 * - Multiple file selection with adaptive batching
 * - Directory selection using File System Access API
 * - Drag-and-drop support for all selection types
 * - Progressive enhancement with feature detection
 * - Automatic processing mode determination
 *
 * INTEGRATION:
 * - Zero dependencies from the rest of the system (independently testable)
 * - Ready for integration with AdaptiveProcessor
 * - Compatible with existing OllamaGUI architecture
 */

class UnifiedFileSelector {
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
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                // Images
                'image/jpeg',
                'image/jpg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/bmp',
                'image/svg+xml'
            ],
            ...options
        };
        
        this.isModernBrowser = this.detectFeatures();
        this.currentSelection = null;
        this.eventListeners = new Map();
        
        console.log('🗂️ UnifiedFileSelector initialized', {
            modernBrowser: this.isModernBrowser,
            supportedTypes: this.options.supportedTypes.length
        });
    }
    
    /**
     * Get last used directory for file picker
     */
    getLastUsedDirectory() {
        try {
            const stored = localStorage.getItem('ollamaGUI_lastFileDirectory');
            if (stored) {
                console.log(`📁 Retrieved last directory: ${stored}`);
                return stored;
            }
            return 'documents';
        } catch (error) {
            console.warn('⚠️ Cannot access localStorage for last directory');
            return 'documents';
        }
    }

    /**
     * Save directory path from file selection
     */
    saveDirectoryFromFilePath(filePath) {
        try {
            if (filePath) {
                // Extract directory from full file path
                const pathParts = filePath.replace(/\\/g, '/').split('/');
                pathParts.pop(); // Remove filename
                const directoryPath = pathParts.join('/');
                
                if (directoryPath) {
                    localStorage.setItem('ollamaGUI_lastFileDirectory', directoryPath);
                    console.log(`💾 Saved directory from file path: ${directoryPath}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Cannot save directory from file path:', error);
        }
    }

    /**
     * Save last used directory to localStorage (legacy method for compatibility)
     */
    saveLastUsedDirectory(directoryHandle) {
        try {
            if (directoryHandle && directoryHandle.name) {
                localStorage.setItem('ollamaGUI_lastFileDirectory', directoryHandle.name);
                console.log(`💾 Saved last directory: ${directoryHandle.name}`);
            }
        } catch (error) {
            console.warn('⚠️ Cannot save last directory to localStorage:', error);
        }
    }

    /**
     * Feature detection for progressive enhancement
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
                        <button class="modal-close" data-action="close" aria-label="Close">&times;</button>
                    </div>
                    
                    <div class="selection-options">
                        <!-- Single File Option -->
                        <button class="selection-option" data-type="single" data-action="select">
                            <div class="option-icon">📄</div>
                            <div class="option-content">
                                <strong>Single File</strong>
                                <small>Perfect for documents, reports, or specific texts</small>
                                <span class="use-case">💡 e.g.: book chapter review, contract analysis</span>
                            </div>
                        </button>

                        <!-- Multiple Files Option -->
                        <button class="selection-option" data-type="multiple" data-action="select">
                            <div class="option-icon">📄📄</div>
                            <div class="option-content">
                                <strong>Multiple Files</strong>
                                <small>For comparing documents or limited batch analysis</small>
                                <span class="use-case">💡 e.g.: comparing 3-5 papers, related documents</span>
                            </div>
                        </button>

                        <!-- Directory Option -->
                        <button class="selection-option" data-type="directory" data-action="select" ${!this.isModernBrowser.fileSystemAccess ? 'disabled title="Not supported in this browser"' : ''}>
                            <div class="option-icon">📁</div>
                            <div class="option-content">
                                <strong>Entire Folder</strong>
                                <small>For projects, collections, or complete archives</small>
                                <span class="use-case">💡 e.g.: complete project analysis, research folder</span>
                            </div>
                        </button>
                    </div>
                    
                    <div class="quick-access-zone">
                        <div class="drop-zone-unified" data-action="drop">
                            <div class="drop-zone-icon">🎯</div>
                            <div class="drop-zone-text">
                                <strong>Quick Access</strong><br>
                                Drag single files, multiple files, or folders here for immediate analysis
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <div class="browser-support-info">
                            ${this.getBrowserSupportInfo()}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return modalHTML;
    }

    /**
     * Get browser support information
     */
    getBrowserSupportInfo() {
        if (this.isModernBrowser.fileSystemAccess) {
            return '<span class="support-full">✅ Full support - File System Access API available</span>';
        } else if (this.isModernBrowser.webkitDirectory) {
            return '<span class="support-partial">⚠️ Partial support - Folder drag & drop supported</span>';
        } else {
            return '<span class="support-basic">ℹ️ Basic support - Multiple file selection only</span>';
        }
    }

    /**
     * Initialize unified selector in DOM
     */
    initialize(containerSelector = '#app') {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error('🚫 UnifiedFileSelector: Container not found:', containerSelector);
            return false;
        }

        // Inject modal HTML
        const modalHTML = this.showSelectionModal();
        container.insertAdjacentHTML('beforeend', modalHTML);

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ UnifiedFileSelector initialized in DOM');
        return true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const modal = document.getElementById('unifiedFileModal');
        if (!modal) return;

        // Modal close handlers
        modal.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'close' || e.target.classList.contains('modal-overlay')) {
                this.hideModal();
            } else if (e.target.dataset.action === 'select' || e.target.closest('[data-action="select"]')) {
                const button = e.target.closest('[data-action="select"]');
                const type = button.dataset.type;
                this.handleSelection(type);
            }
        });

        // Drag and drop setup
        const dropZone = modal.querySelector('[data-action="drop"]');
        if (dropZone) {
            this.setupDragDrop(dropZone);
        }

        // Keyboard support
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragDrop(dropZone) {
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

        dropZone.addEventListener('drop', async (e) => {
            try {
                await this.handleDrop(e);
            } catch (error) {
                console.error('🚫 Drop handling failed:', error);
                this.emit('error', { error: error.message, type: 'drop' });
            }
        });
    }

    /**
     * Handle dropped files/directories
     */
    async handleDrop(event) {
        const items = [...event.dataTransfer.items];
        const files = [...event.dataTransfer.files];
        
        console.log('🎯 Drop detected:', { itemCount: items.length, fileCount: files.length });

        // Check for directory drops (WebKit)
        if (items.length > 0 && items[0].webkitGetAsEntry) {
            const entry = items[0].webkitGetAsEntry();
            if (entry && entry.isDirectory) {
                console.log('📁 Directory drop detected');
                const directoryFiles = await this.processDirectoryEntry(entry);
                this.processSelection({
                    type: 'directory',
                    files: directoryFiles,
                    processingMode: 'batch',
                    source: 'drop'
                });
                return;
            }
        }

        // Handle file drops
        if (files.length > 0) {
            const validFiles = await this.validateFiles(files);
            const processingMode = this.determineProcessingMode(validFiles);
            
            this.processSelection({
                type: validFiles.length === 1 ? 'single' : 'multiple',
                files: validFiles,
                processingMode,
                source: 'drop'
            });
        }
    }

    /**
     * Handle selection type
     */
    async handleSelection(type) {
        try {
            console.log('🎯 Selection type:', type);
            
            let result;
            switch(type) {
                case 'single':
                    result = await this.selectSingleFile();
                    break;
                case 'multiple':
                    result = await this.selectMultipleFiles();
                    break;
                case 'directory':
                    result = await this.selectDirectory();
                    break;
                default:
                    throw new Error(`Selection type not supported: ${type}`);
            }

            this.processSelection(result);
            
        } catch (error) {
            console.error('🚫 Selection failed:', error);
            this.emit('error', { error: error.message, type });
        }
    }

    /**
     * Select single file with immediate processing optimization
     */
    async selectSingleFile() {
        if (!this.isModernBrowser.fileSystemAccess) {
            // Fallback to input element
            return await this.selectSingleFileFallback();
        }

        const lastDir = this.getLastUsedDirectory();
        const [fileHandle] = await window.showOpenFilePicker({
            multiple: false,
            types: this.getSupportedFileTypes(),
            startIn: lastDir
        });

        // Save directory for next time
        try {
            const parentDir = await fileHandle.getParent?.();
            if (parentDir) {
                this.saveLastUsedDirectory(parentDir);
            }
        } catch (error) {
            console.log('ℹ️ Cannot save directory (normal in some browsers)');
        }

        const file = await fileHandle.getFile();
        await this.validateFiles([file]);

        return {
            type: 'single',
            files: [file],
            processingMode: 'immediate',
            source: 'picker'
        };
    }

    /**
     * Select multiple files with adaptive processing
     */
    async selectMultipleFiles() {
        if (!this.isModernBrowser.fileSystemAccess) {
            return await this.selectMultipleFilesFallback();
        }

        const lastDir = this.getLastUsedDirectory();
        const fileHandles = await window.showOpenFilePicker({
            multiple: true,
            types: this.getSupportedFileTypes(),
            startIn: lastDir
        });

        // Save directory for next time (using first file's parent)
        if (fileHandles.length > 0) {
            try {
                const parentDir = await fileHandles[0].getParent?.();
                if (parentDir) {
                    this.saveLastUsedDirectory(parentDir);
                }
            } catch (error) {
                console.log('ℹ️ Cannot save directory (normal in some browsers)');
            }
        }

        const files = await Promise.all(
            fileHandles.map(handle => handle.getFile())
        );

        const validFiles = await this.validateFiles(files);
        const processingMode = this.determineProcessingMode(validFiles);

        return {
            type: 'multiple',
            files: validFiles,
            processingMode,
            source: 'picker'
        };
    }

    /**
     * Select directory with File System Access API
     */
    async selectDirectory() {
        if (!this.isModernBrowser.fileSystemAccess) {
            throw new Error('Directory selection not supported in this browser');
        }

        const lastDir = this.getLastUsedDirectory();
        const dirHandle = await window.showDirectoryPicker({
            mode: 'read',
            startIn: lastDir
        });

        // Save selected directory for next time
        this.saveLastUsedDirectory(dirHandle);

        console.log('📁 Processing directory:', dirHandle.name);
        const files = await this.processDirectoryHandle(dirHandle);
        
        return {
            type: 'directory',
            files,
            processingMode: 'batch',
            source: 'picker',
            directoryName: dirHandle.name
        };
    }

    /**
     * Determine processing mode based on file count
     */
    determineProcessingMode(files) {
        const fileCount = files.length;
        
        if (fileCount === 1) {
            return 'immediate';
        } else if (fileCount <= 5) {
            return 'parallel';
        } else {
            return 'batch';
        }
    }

    /**
     * Get supported file types for picker
     */
    getSupportedFileTypes() {
        return [{
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
                // Images
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png'],
                'image/gif': ['.gif'],
                'image/webp': ['.webp'],
                'image/bmp': ['.bmp'],
                'image/svg+xml': ['.svg']
            }
        }];
    }

    /**
     * Validate files before processing
     */
    async validateFiles(files) {
        const validFiles = [];
        let totalSize = 0;

        for (const file of files) {
            // File size check
            if (file.size > this.options.maxFileSize) {
                console.warn(`⚠️ File too large: ${file.name} (${file.size} bytes)`);
                continue;
            }

            // File type check
            if (!this.isAllowedFileType(file)) {
                console.warn(`⚠️ Unsupported file type: ${file.name} (${file.type})`);
                continue;
            }

            totalSize += file.size;
            if (totalSize > this.options.maxBatchSize) {
                console.warn(`⚠️ Batch size exceeded, ignoring remaining files`);
                break;
            }

            validFiles.push(file);

            if (validFiles.length >= this.options.maxFileCount) {
                console.warn(`⚠️ Maximum file count reached (${this.options.maxFileCount})`);
                break;
            }
        }

        console.log(`✅ Files validated: ${validFiles.length}/${files.length}`);
        return validFiles;
    }

    /**
     * Check if file type is allowed
     */
    isAllowedFileType(file) {
        // Check MIME type
        if (this.options.supportedTypes.includes(file.type)) {
            return true;
        }

        // Check file extension as fallback
        const extension = file.name.toLowerCase().split('.').pop();
        const allowedExtensions = [
            'pdf', 'doc', 'docx', 'txt', 'csv', 'json', 'md', 'xls', 'xlsx', 'js', 'html', 'css',
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'
        ];
        
        return allowedExtensions.includes(extension);
    }

    /**
     * Process directory handle recursively
     */
    async processDirectoryHandle(dirHandle, maxDepth = 3, currentDepth = 0) {
        const files = [];
        
        if (currentDepth >= maxDepth) {
            console.warn(`⚠️ Max depth reached: ${maxDepth}`);
            return files;
        }

        for await (const [name, handle] of dirHandle.entries()) {
            if (handle.kind === 'file') {
                try {
                    const file = await handle.getFile();
                    if (this.isAllowedFileType(file)) {
                        files.push(file);
                    }
                } catch (error) {
                    console.warn(`⚠️ Cannot read file: ${name}`, error);
                }
            } else if (handle.kind === 'directory' && currentDepth < maxDepth) {
                const subFiles = await this.processDirectoryHandle(handle, maxDepth, currentDepth + 1);
                files.push(...subFiles);
            }
        }

        return files;
    }

    /**
     * Process directory entry (WebKit fallback)
     */
    async processDirectoryEntry(entry, maxDepth = 3, currentDepth = 0) {
        return new Promise((resolve) => {
            const files = [];
            
            if (currentDepth >= maxDepth) {
                resolve(files);
                return;
            }

            const reader = entry.createReader();
            reader.readEntries(async (entries) => {
                for (const entry of entries) {
                    if (entry.isFile) {
                        entry.file((file) => {
                            if (this.isAllowedFileType(file)) {
                                files.push(file);
                            }
                        });
                    } else if (entry.isDirectory && currentDepth < maxDepth) {
                        const subFiles = await this.processDirectoryEntry(entry, maxDepth, currentDepth + 1);
                        files.push(...subFiles);
                    }
                }
                resolve(files);
            });
        });
    }

    /**
     * Fallback single file selection
     */
    async selectSingleFileFallback() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = this.options.supportedTypes.join(',');
            
            input.onchange = async (e) => {
                try {
                    const file = e.target.files[0];
                    if (!file) {
                        reject(new Error('No file selected'));
                        return;
                    }

                    const validFiles = await this.validateFiles([file]);
                    if (validFiles.length === 0) {
                        reject(new Error('Invalid file'));
                        return;
                    }

                    resolve({
                        type: 'single',
                        files: validFiles,
                        processingMode: 'immediate',
                        source: 'fallback'
                    });
                } catch (error) {
                    reject(error);
                }
            };

            input.click();
        });
    }

    /**
     * Fallback multiple files selection
     */
    async selectMultipleFilesFallback() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = this.options.supportedTypes.join(',');
            
            input.onchange = async (e) => {
                try {
                    const files = Array.from(e.target.files);
                    if (files.length === 0) {
                        reject(new Error('No file selected'));
                        return;
                    }

                    const validFiles = await this.validateFiles(files);
                    if (validFiles.length === 0) {
                        reject(new Error('No valid files'));
                        return;
                    }

                    const processingMode = this.determineProcessingMode(validFiles);

                    resolve({
                        type: 'multiple',
                        files: validFiles,
                        processingMode,
                        source: 'fallback'
                    });
                } catch (error) {
                    reject(error);
                }
            };

            input.click();
        });
    }

    /**
     * Process selection and emit events
     */
    processSelection(selection) {
        this.currentSelection = selection;
        
        console.log('✅ Selection processed:', {
            type: selection.type,
            fileCount: selection.files.length,
            processingMode: selection.processingMode,
            source: selection.source
        });

        this.hideModal();
        this.emit('selection', selection);
    }

    /**
     * Show modal
     */
    showModal() {
        const modal = document.getElementById('unifiedFileModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            
            // Focus management
            const firstButton = modal.querySelector('.selection-option');
            if (firstButton) firstButton.focus();
        }
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('unifiedFileModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Event system
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`🚫 Event callback error (${event}):`, error);
                }
            });
        }
    }

    /**
     * Get current selection
     */
    getCurrentSelection() {
        return this.currentSelection;
    }

    /**
     * Clear current selection
     */
    clearSelection() {
        this.currentSelection = null;
    }

    /**
     * Destroy component
     */
    destroy() {
        const modal = document.getElementById('unifiedFileModal');
        if (modal) {
            modal.remove();
        }
        
        this.eventListeners.clear();
        this.currentSelection = null;
        
        console.log('🗂️ UnifiedFileSelector destroyed');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedFileSelector;
} else if (typeof window !== 'undefined') {
    window.UnifiedFileSelector = UnifiedFileSelector;
}