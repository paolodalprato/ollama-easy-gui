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
 * DEPENDENCIES:
 * - FileValidationUtils (for file validation)
 * - DirectoryProcessor (for directory traversal)
 */

class UnifiedFileSelector {
    constructor(options = {}) {
        // Initialize validation utils
        this.validator = new (window.FileValidationUtils || FileValidationUtils)(options);
        this.options = this.validator.options;

        // Initialize directory processor
        this.dirProcessor = new (window.DirectoryProcessor || DirectoryProcessor)(this.validator);

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
                const pathParts = filePath.replace(/\\/g, '/').split('/');
                pathParts.pop();
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
     * Save last used directory to localStorage
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
                        <button class="selection-option" data-type="single" data-action="select">
                            <div class="option-icon">📄</div>
                            <div class="option-content">
                                <strong>Single File</strong>
                                <small>Perfect for documents, reports, or specific texts</small>
                                <span class="use-case">💡 e.g.: book chapter review, contract analysis</span>
                            </div>
                        </button>

                        <button class="selection-option" data-type="multiple" data-action="select">
                            <div class="option-icon">📄📄</div>
                            <div class="option-content">
                                <strong>Multiple Files</strong>
                                <small>For comparing documents or limited batch analysis</small>
                                <span class="use-case">💡 e.g.: comparing 3-5 papers, related documents</span>
                            </div>
                        </button>

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

        const modalHTML = this.showSelectionModal();
        container.insertAdjacentHTML('beforeend', modalHTML);
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

        modal.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'close' || e.target.classList.contains('modal-overlay')) {
                this.hideModal();
            } else if (e.target.dataset.action === 'select' || e.target.closest('[data-action="select"]')) {
                const button = e.target.closest('[data-action="select"]');
                const type = button.dataset.type;
                this.handleSelection(type);
            }
        });

        const dropZone = modal.querySelector('[data-action="drop"]');
        if (dropZone) {
            this.setupDragDrop(dropZone);
        }

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
                const directoryFiles = await this.dirProcessor.processDirectoryEntry(entry);
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
            const validFiles = await this.validator.validateFiles(files);
            const processingMode = this.validator.determineProcessingMode(validFiles);

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
            return await this.selectSingleFileFallback();
        }

        const lastDir = this.getLastUsedDirectory();
        const [fileHandle] = await window.showOpenFilePicker({
            multiple: false,
            types: this.validator.getSupportedFileTypes(),
            startIn: lastDir
        });

        try {
            const parentDir = await fileHandle.getParent?.();
            if (parentDir) {
                this.saveLastUsedDirectory(parentDir);
            }
        } catch (error) {
            console.log('ℹ️ Cannot save directory (normal in some browsers)');
        }

        const file = await fileHandle.getFile();
        await this.validator.validateFiles([file]);

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
            types: this.validator.getSupportedFileTypes(),
            startIn: lastDir
        });

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

        const validFiles = await this.validator.validateFiles(files);
        const processingMode = this.validator.determineProcessingMode(validFiles);

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

        this.saveLastUsedDirectory(dirHandle);

        console.log('📁 Processing directory:', dirHandle.name);
        const files = await this.dirProcessor.processDirectoryHandle(dirHandle);

        return {
            type: 'directory',
            files,
            processingMode: 'batch',
            source: 'picker',
            directoryName: dirHandle.name
        };
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

                    const validFiles = await this.validator.validateFiles([file]);
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

                    const validFiles = await this.validator.validateFiles(files);
                    if (validFiles.length === 0) {
                        reject(new Error('No valid files'));
                        return;
                    }

                    const processingMode = this.validator.determineProcessingMode(validFiles);

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

    // ========== EVENT SYSTEM ==========

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

    getCurrentSelection() {
        return this.currentSelection;
    }

    clearSelection() {
        this.currentSelection = null;
    }

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
