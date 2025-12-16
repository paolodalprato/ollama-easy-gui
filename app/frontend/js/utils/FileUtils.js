// FileUtils.js - Utility for file management
class FileUtils {
    constructor() {
        console.log('📁 FileUtils initialized');
    }

    // === FILE VALIDATION ===
    
    static isValidFileType(filename, allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.csv', '.xlsx']) {
        const ext = '.' + filename.split('.').pop().toLowerCase();
        return allowedTypes.includes(ext);
    }

    static isValidFileSize(file, maxSizeMB = 10) {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return file.size <= maxSizeBytes;
    }

    static validateFile(file, allowedTypes, maxSizeMB = 10) {
        const validation = {
            valid: true,
            errors: []
        };

        if (!this.isValidFileType(file.name, allowedTypes)) {
            validation.valid = false;
            validation.errors.push(`Unsupported file type: ${file.name}`);
        }

        if (!this.isValidFileSize(file, maxSizeMB)) {
            validation.valid = false;
            validation.errors.push(`File too large: ${file.name} (max ${maxSizeMB}MB)`);
        }

        return validation;
    }

    // === FILE ICONS ===
    
    static getFileIcon(filename) {
        const ext = '.' + filename.split('.').pop().toLowerCase();
        
        if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
            return '🖼️';
        } else if (ext === '.pdf') {
            return '📄';
        } else if (['.doc', '.docx', '.txt'].includes(ext)) {
            return '📝';
        } else if (['.xls', '.xlsx', '.csv'].includes(ext)) {
            return '📊';
        } else {
            return '📎';
        }
    }

    // === FILE SIZE FORMATTING ===
    
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static formatFileSizeKB(bytes) {
        return (bytes / 1024).toFixed(1) + 'KB';
    }

    static formatFileSizeGB(bytes) {
        return (bytes / (1000 * 1000 * 1000)).toFixed(1) + 'GB';
    }

    // === FILE DOWNLOAD ===
    
    static downloadText(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        this.downloadBlob(blob, filename);
    }

    static downloadJSON(data, filename) {
        const content = JSON.stringify(data, null, 2);
        this.downloadText(content, filename, 'application/json');
    }

    static downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📥 File downloaded:', filename);
    }

    // === FILE READING ===
    
    static readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            
            reader.readAsText(file);
        });
    }

    static readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            
            reader.readAsDataURL(file);
        });
    }

    static readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            
            reader.readAsArrayBuffer(file);
        });
    }

    // === DRAG & DROP UTILITIES ===
    
    static setupDragAndDrop(containerElement, onFilesDrop, allowedTypes) {
        if (!containerElement) return;

        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            containerElement.addEventListener(eventName, preventDefaults, false);
        });

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            containerElement.addEventListener(eventName, () => {
                containerElement.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            containerElement.addEventListener(eventName, () => {
                containerElement.classList.remove('drag-over');
            }, false);
        });

        // Handle dropped files
        containerElement.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            const validFiles = [];
            const errors = [];

            files.forEach(file => {
                const validation = this.validateFile(file, allowedTypes);
                if (validation.valid) {
                    validFiles.push(file);
                } else {
                    errors.push(...validation.errors);
                }
            });

            if (onFilesDrop) {
                onFilesDrop(validFiles, errors);
            }
        }, false);

        console.log('🎯 Drag & Drop setup completed for container');
    }

    // === FILE INPUT UTILITIES ===
    
    static createFileInput(acceptedTypes, multiple = false) {
        const input = document.createElement('input');
        input.type = 'file';
        input.style.display = 'none';
        input.multiple = multiple;
        
        if (acceptedTypes && acceptedTypes.length > 0) {
            input.accept = acceptedTypes.join(',');
        }
        
        return input;
    }

    static triggerFileDialog(inputElement, onFilesSelected, allowedTypes) {
        if (!inputElement) return;

        inputElement.onchange = (e) => {
            const files = Array.from(e.target.files);
            const validFiles = [];
            const errors = [];

            files.forEach(file => {
                const validation = this.validateFile(file, allowedTypes);
                if (validation.valid) {
                    validFiles.push(file);
                } else {
                    errors.push(...validation.errors);
                }
            });

            if (onFilesSelected) {
                onFilesSelected(validFiles, errors);
            }

            // Reset input
            e.target.value = '';
        };

        inputElement.click();
    }

    // === ATTACHMENT UTILITIES ===
    
    static createAttachmentPreview(file, index, onRemove) {
        const sizeFormatted = this.formatFileSizeKB(file.size);
        const icon = this.getFileIcon(file.name);
        
        const container = document.createElement('div');
        container.className = 'attachment-item';
        container.innerHTML = `
            ${icon} ${file.name} (${sizeFormatted})
            <button class="remove-btn" data-attachment-index="${index}">×</button>
        `;
        
        const removeBtn = container.querySelector('.remove-btn');
        if (removeBtn && onRemove) {
            removeBtn.addEventListener('click', () => onRemove(index));
        }
        
        return container;
    }

    // === URL UTILITIES ===
    
    static createAttachmentURL(chatId, filename) {
        return `/api/chat/attachment/${chatId}/${filename}`;
    }

    static openInNewTab(url) {
        window.open(url, '_blank');
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileUtils;
}