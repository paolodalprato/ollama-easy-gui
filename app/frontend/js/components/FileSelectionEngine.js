// FileSelectionEngine.js - File Selection Engine Module
// Extracted from UnifiedFileSelector.js for GUARDRAIL ARCHITECTURE compliance
// Size: ~250 lines (target: <500 lines) ✅

/**
 * FileSelectionEngine - Core file selection operations
 * 
 * RESPONSIBILITIES:
 * - File selection orchestration (single/multiple/directory)
 * - Modern API implementations 
 * - File validation pipeline
 * - Processing mode determination
 * - Selection processing logic
 * 
 * DEPENDENCIES:
 * - Modern browser APIs (File System Access API)
 * - FileSelectorCore for basic functionality
 * 
 * ARCHITECTURE: Engine component with clear API boundaries
 */
class FileSelectionEngine {
    constructor(options, features) {
        this.options = options;
        this.isModernBrowser = features;
        this.eventListeners = new Map();
        
        console.log('⚙️ FileSelectionEngine initialized');
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
            // Delegate to fallback handler
            this.emit('needsFallback', { type: 'single' });
            return;
        }

        const [fileHandle] = await window.showOpenFilePicker({
            multiple: false,
            types: this.getSupportedFileTypes(),
            startIn: 'documents'
        });

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
            // Delegate to fallback handler
            this.emit('needsFallback', { type: 'multiple' });
            return;
        }

        const fileHandles = await window.showOpenFilePicker({
            multiple: true,
            types: this.getSupportedFileTypes(),
            startIn: 'documents'
        });

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

        const dirHandle = await window.showDirectoryPicker({
            mode: 'read',
            startIn: 'documents'
        });

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
     * Process directory handle recursively
     */
    async processDirectoryHandle(dirHandle, path = '') {
        const files = [];
        
        for await (const [name, handle] of dirHandle.entries()) {
            const currentPath = path ? `${path}/${name}` : name;
            
            if (handle.kind === 'file') {
                try {
                    const file = await handle.getFile();
                    if (this.isFileSupported(file)) {
                        // Add path info to file object
                        Object.defineProperty(file, 'webkitRelativePath', {
                            value: currentPath,
                            writable: false
                        });
                        files.push(file);
                    }
                } catch (error) {
                    console.warn(`Skipping file ${currentPath}:`, error.message);
                }
            } else if (handle.kind === 'directory') {
                // Recursive directory processing
                const subFiles = await this.processDirectoryHandle(handle, currentPath);
                files.push(...subFiles);
            }
        }
        
        return files;
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
        return [
            {
                description: 'Supported documents',
                accept: {
                    'application/pdf': ['.pdf'],
                    'application/msword': ['.doc'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                    'text/plain': ['.txt'],
                    'text/csv': ['.csv'],
                    'application/json': ['.json'],
                    'text/markdown': ['.md'],
                    'application/vnd.ms-excel': ['.xls'],
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                }
            }
        ];
    }

    /**
     * Validate files array
     */
    async validateFiles(files) {
        const validFiles = [];
        let totalSize = 0;

        for (const file of files) {
            // Check file size
            if (file.size > this.options.maxFileSize) {
                console.warn(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                continue;
            }

            // Check file type
            if (!this.isFileSupported(file)) {
                console.warn(`File type not supported: ${file.name} (${file.type})`);
                continue;
            }

            totalSize += file.size;
            validFiles.push(file);
        }

        // Check total batch size
        if (totalSize > this.options.maxBatchSize) {
            throw new Error(`Batch too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB (limit: ${(this.options.maxBatchSize / 1024 / 1024).toFixed(2)}MB)`);
        }

        // Check file count
        if (validFiles.length > this.options.maxFileCount) {
            throw new Error(`Too many files: ${validFiles.length} (limit: ${this.options.maxFileCount})`);
        }

        return validFiles;
    }

    /**
     * Check if file type is supported
     */
    isFileSupported(file) {
        return this.options.supportedTypes.includes(file.type) ||
               (file.type === '' && this.getFileExtension(file.name) === 'txt');
    }

    /**
     * Get file extension
     */
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    /**
     * Process selection result
     */
    processSelection(result) {
        if (!result || !result.files || result.files.length === 0) {
            this.emit('error', { error: 'No file selected' });
            return;
        }

        console.log(`✅ Selection processed: ${result.files.length} files, mode: ${result.processingMode}`);
        
        // Emit success event with processed result
        this.emit('success', result);
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
    module.exports = FileSelectionEngine;
}