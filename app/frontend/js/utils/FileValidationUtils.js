/**
 * FileValidationUtils - File validation and type checking utilities
 *
 * Extracted from UnifiedFileSelector for better modularity.
 * Provides file size, type, and batch validation.
 */

class FileValidationUtils {
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
            allowedExtensions: [
                'pdf', 'doc', 'docx', 'txt', 'csv', 'json', 'md', 'xls', 'xlsx', 'js', 'html', 'css',
                'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'
            ],
            ...options
        };
    }

    /**
     * Validate files before processing
     * @param {File[]} files - Array of File objects
     * @returns {File[]} - Array of valid files
     */
    async validateFiles(files) {
        const validFiles = [];
        let totalSize = 0;

        for (const file of files) {
            // File size check
            if (file.size > this.options.maxFileSize) {
                console.warn(`⚠️ File too large: ${file.name} (${this.formatSize(file.size)})`);
                continue;
            }

            // File type check
            if (!this.isAllowedFileType(file)) {
                console.warn(`⚠️ Unsupported file type: ${file.name} (${file.type || 'unknown'})`);
                continue;
            }

            totalSize += file.size;
            if (totalSize > this.options.maxBatchSize) {
                console.warn(`⚠️ Batch size exceeded (${this.formatSize(totalSize)}), ignoring remaining files`);
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
     * @param {File} file - File object
     * @returns {boolean}
     */
    isAllowedFileType(file) {
        // Check MIME type
        if (file.type && this.options.supportedTypes.includes(file.type)) {
            return true;
        }

        // Check file extension as fallback
        const extension = this.getFileExtension(file.name);
        return this.options.allowedExtensions.includes(extension);
    }

    /**
     * Get file extension from filename
     * @param {string} filename
     * @returns {string}
     */
    getFileExtension(filename) {
        return filename.toLowerCase().split('.').pop() || '';
    }

    /**
     * Determine processing mode based on file count
     * @param {File[]} files
     * @returns {'immediate'|'parallel'|'batch'}
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
     * Get supported file types for file picker
     * @returns {Object[]}
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
     * Format file size for display
     * @param {number} bytes
     * @returns {string}
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Calculate total size of files
     * @param {File[]} files
     * @returns {number}
     */
    calculateTotalSize(files) {
        return files.reduce((total, file) => total + file.size, 0);
    }

    /**
     * Check if batch exceeds size limit
     * @param {File[]} files
     * @returns {boolean}
     */
    exceedsBatchLimit(files) {
        return this.calculateTotalSize(files) > this.options.maxBatchSize;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileValidationUtils;
} else if (typeof window !== 'undefined') {
    window.FileValidationUtils = FileValidationUtils;
}
