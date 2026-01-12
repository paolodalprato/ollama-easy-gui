/**
 * DirectoryProcessor - Directory traversal and file extraction utilities
 *
 * Extracted from UnifiedFileSelector for better modularity.
 * Handles both File System Access API and WebKit fallback for directory processing.
 */

class DirectoryProcessor {
    constructor(fileValidator = null) {
        this.fileValidator = fileValidator;
        this.maxDepth = 3; // Default max directory depth
    }

    /**
     * Set file validator for filtering files
     * @param {FileValidationUtils} validator
     */
    setValidator(validator) {
        this.fileValidator = validator;
    }

    /**
     * Set maximum directory traversal depth
     * @param {number} depth
     */
    setMaxDepth(depth) {
        this.maxDepth = depth;
    }

    /**
     * Process directory handle recursively (File System Access API)
     * @param {FileSystemDirectoryHandle} dirHandle
     * @param {number} maxDepth
     * @param {number} currentDepth
     * @returns {Promise<File[]>}
     */
    async processDirectoryHandle(dirHandle, maxDepth = this.maxDepth, currentDepth = 0) {
        const files = [];

        if (currentDepth >= maxDepth) {
            console.warn(`⚠️ Max depth reached: ${maxDepth}`);
            return files;
        }

        try {
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind === 'file') {
                    try {
                        const file = await handle.getFile();
                        if (this.shouldIncludeFile(file)) {
                            files.push(file);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Cannot read file: ${name}`, error);
                    }
                } else if (handle.kind === 'directory' && currentDepth < maxDepth) {
                    // Skip hidden directories
                    if (name.startsWith('.')) {
                        console.log(`⏭️ Skipping hidden directory: ${name}`);
                        continue;
                    }
                    // Skip common non-content directories
                    if (this.shouldSkipDirectory(name)) {
                        console.log(`⏭️ Skipping system directory: ${name}`);
                        continue;
                    }

                    const subFiles = await this.processDirectoryHandle(handle, maxDepth, currentDepth + 1);
                    files.push(...subFiles);
                }
            }
        } catch (error) {
            console.error(`❌ Error processing directory:`, error);
        }

        return files;
    }

    /**
     * Process directory entry (WebKit fallback for drag-drop)
     * @param {FileSystemEntry} entry
     * @param {number} maxDepth
     * @param {number} currentDepth
     * @returns {Promise<File[]>}
     */
    async processDirectoryEntry(entry, maxDepth = this.maxDepth, currentDepth = 0) {
        return new Promise((resolve) => {
            const files = [];

            if (currentDepth >= maxDepth) {
                resolve(files);
                return;
            }

            const reader = entry.createReader();
            this._readAllEntries(reader, async (entries) => {
                for (const entry of entries) {
                    if (entry.isFile) {
                        const file = await this._getFileFromEntry(entry);
                        if (file && this.shouldIncludeFile(file)) {
                            files.push(file);
                        }
                    } else if (entry.isDirectory && currentDepth < maxDepth) {
                        // Skip hidden directories
                        if (entry.name.startsWith('.')) {
                            continue;
                        }
                        // Skip common non-content directories
                        if (this.shouldSkipDirectory(entry.name)) {
                            continue;
                        }

                        const subFiles = await this.processDirectoryEntry(entry, maxDepth, currentDepth + 1);
                        files.push(...subFiles);
                    }
                }
                resolve(files);
            });
        });
    }

    /**
     * Read all entries from a directory reader (handles batched reads)
     * @param {FileSystemDirectoryReader} reader
     * @param {Function} callback
     * @private
     */
    _readAllEntries(reader, callback) {
        const allEntries = [];

        const readBatch = () => {
            reader.readEntries((entries) => {
                if (entries.length === 0) {
                    callback(allEntries);
                } else {
                    allEntries.push(...entries);
                    readBatch(); // Continue reading if there are more
                }
            }, (error) => {
                console.error('❌ Error reading directory entries:', error);
                callback(allEntries);
            });
        };

        readBatch();
    }

    /**
     * Get File object from FileSystemFileEntry
     * @param {FileSystemFileEntry} entry
     * @returns {Promise<File|null>}
     * @private
     */
    _getFileFromEntry(entry) {
        return new Promise((resolve) => {
            entry.file(
                (file) => resolve(file),
                (error) => {
                    console.warn(`⚠️ Cannot get file from entry: ${entry.name}`, error);
                    resolve(null);
                }
            );
        });
    }

    /**
     * Check if file should be included based on validator
     * @param {File} file
     * @returns {boolean}
     * @private
     */
    shouldIncludeFile(file) {
        if (!this.fileValidator) {
            return true; // No validator, include all
        }
        return this.fileValidator.isAllowedFileType(file);
    }

    /**
     * Check if directory should be skipped
     * @param {string} dirName
     * @returns {boolean}
     */
    shouldSkipDirectory(dirName) {
        const skipDirs = [
            'node_modules',
            '__pycache__',
            '.git',
            '.svn',
            '.hg',
            'venv',
            'env',
            '.venv',
            'dist',
            'build',
            'coverage',
            '.idea',
            '.vscode',
            'vendor',
            'packages'
        ];
        return skipDirs.includes(dirName.toLowerCase());
    }

    /**
     * Get directory statistics
     * @param {File[]} files
     * @returns {Object}
     */
    getDirectoryStats(files) {
        const stats = {
            totalFiles: files.length,
            totalSize: 0,
            byType: {},
            byExtension: {}
        };

        for (const file of files) {
            stats.totalSize += file.size;

            // Count by MIME type
            const type = file.type || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            // Count by extension
            const ext = file.name.split('.').pop()?.toLowerCase() || 'none';
            stats.byExtension[ext] = (stats.byExtension[ext] || 0) + 1;
        }

        return stats;
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DirectoryProcessor;
} else if (typeof window !== 'undefined') {
    window.DirectoryProcessor = DirectoryProcessor;
}
