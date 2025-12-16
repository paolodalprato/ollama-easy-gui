/**
 * FileTextExtractor - Multi-format text extraction on frontend
 *
 * SUPPORTED FORMATS:
 * - PDF: Text extraction using PDF.js
 * - DOCX: Text extraction using mammoth.js CDN
 * - TXT/CSV/JSON: Direct text reading
 * - Images: OCR with Tesseract.js (optional)
 *
 * ARCHITECTURE:
 * - Modular by file type
 * - Async processing with progress
 * - Fallback for unsupported formats
 * - Robust error handling
 */

class FileTextExtractor {
    constructor() {
        this.supportedTypes = {
            'application/pdf': 'pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
            'application/msword': 'doc',
            'text/plain': 'text',
            'text/csv': 'text',
            'application/json': 'text',
            'text/markdown': 'text'
        };
        
        this.libraries = {
            pdfjs: null,
            mammoth: null,
            tesseract: null
        };
        
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.maxTextLength = 1000000; // 1M chars
        
        console.log('📄 FileTextExtractor initialized');
    }

    /**
     * Extracts text from a file
     */
    async extractText(file, options = {}) {
        try {
            console.log(`📄 Extracting text from: ${file.name} (${file.type})`);
            
            // Validazioni
            if (file.size > this.maxFileSize) {
                throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`);
            }

            const fileType = this.getFileType(file);
            if (!fileType) {
                throw new Error(`Unsupported file type: ${file.type}`);
            }

            // Progress callback
            const onProgress = options.onProgress || (() => {});
            onProgress(10, 'Initializing...');

            let extractedText = '';
            
            switch (fileType) {
                case 'pdf':
                    extractedText = await this.extractFromPDF(file, onProgress);
                    break;
                case 'docx':
                    extractedText = await this.extractFromDOCX(file, onProgress);
                    break;
                case 'doc':
                    extractedText = await this.extractFromDOC(file, onProgress);
                    break;
                case 'text':
                    extractedText = await this.extractFromText(file, onProgress);
                    break;
                default:
                    throw new Error(`Handler not implemented for: ${fileType}`);
            }

            // Verify length
            if (extractedText.length > this.maxTextLength) {
                console.warn(`⚠️ Text truncated from ${extractedText.length} to ${this.maxTextLength} characters`);
                extractedText = extractedText.substring(0, this.maxTextLength) + '\n\n[... TEXT TRUNCATED ...]';
            }

            onProgress(100, 'Completed');
            
            console.log(`✅ Text extracted: ${extractedText.length} chars from ${file.name}`);
            
            return {
                success: true,
                text: extractedText,
                filename: file.name,
                fileType: fileType,
                originalSize: file.size,
                textLength: extractedText.length
            };
            
        } catch (error) {
            console.error(`❌ Text extraction failed for ${file.name}:`, error);
            return {
                success: false,
                error: error.message,
                filename: file.name,
                fileType: this.getFileType(file)
            };
        }
    }

    /**
     * Extracts text from PDF using PDF.js
     */
    async extractFromPDF(file, onProgress) {
        onProgress(20, 'Loading PDF.js...');

        // Load PDF.js if not already loaded
        if (!this.libraries.pdfjs) {
            await this.loadPDFJS();
        }

        onProgress(40, 'Reading PDF...');
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await this.libraries.pdfjs.getDocument({data: arrayBuffer}).promise;
        
        let fullText = '';
        const numPages = pdf.numPages;
        
        onProgress(50, `Extracting text from ${numPages} pages...`);
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            const pageText = textContent.items
                .map(item => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
                
            if (pageText) {
                fullText += `\n\n--- Page ${i} ---\n${pageText}`;
            }

            // Progress update
            const progress = 50 + (i / numPages) * 40;
            onProgress(progress, `Page ${i}/${numPages}...`);
        }
        
        return fullText.trim();
    }

    /**
     * Extracts text from DOCX using mammoth
     */
    async extractFromDOCX(file, onProgress) {
        onProgress(30, 'Loading mammoth.js...');

        // Load mammoth if not already loaded
        if (!this.libraries.mammoth) {
            await this.loadMammoth();
        }

        onProgress(60, 'Extracting DOCX text...');
        
        const arrayBuffer = await file.arrayBuffer();
        const result = await this.libraries.mammoth.extractRawText({arrayBuffer});
        
        onProgress(90, 'Finalizing...');
        
        if (result.messages && result.messages.length > 0) {
            console.warn('⚠️ DOCX extraction warnings:', result.messages);
        }
        
        return result.value || '';
    }

    /**
     * Fallback for DOC (legacy format)
     */
    async extractFromDOC(file, onProgress) {
        onProgress(50, 'Attempting DOC extraction...');

        // Fallback for now - use dedicated library in production
        throw new Error('Legacy DOC format not supported. Use DOCX or convert the file.');
    }

    /**
     * Extracts text from text files
     */
    async extractFromText(file, onProgress) {
        onProgress(30, 'Reading text file...');
        
        const text = await file.text();
        
        onProgress(80, 'Validating encoding...');

        // Check if text is readable
        if (text.includes('\uFFFD')) {
            console.warn('⚠️ Possible encoding issues detected');
        }
        
        return text;
    }

    /**
     * Load PDF.js dynamically
     */
    async loadPDFJS() {
        return new Promise((resolve, reject) => {
            if (window.pdfjsLib) {
                this.libraries.pdfjs = window.pdfjsLib;
                resolve();
                return;
            }

            // Load PDF.js from CDN
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                // Setup worker
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                
                this.libraries.pdfjs = window.pdfjsLib;
                console.log('📄 PDF.js loaded successfully');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load PDF.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * Load mammoth dynamically
     */
    async loadMammoth() {
        return new Promise((resolve, reject) => {
            if (window.mammoth) {
                this.libraries.mammoth = window.mammoth;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            script.onload = () => {
                this.libraries.mammoth = window.mammoth;
                console.log('📄 Mammoth.js loaded successfully');
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load mammoth.js'));
            document.head.appendChild(script);
        });
    }

    /**
     * Determines the file type
     */
    getFileType(file) {
        // Check MIME type first
        if (this.supportedTypes[file.type]) {
            return this.supportedTypes[file.type];
        }

        // Fallback to extension
        const ext = file.name.toLowerCase().split('.').pop();
        const extensionMap = {
            'pdf': 'pdf',
            'docx': 'docx',
            'doc': 'doc',
            'txt': 'text',
            'csv': 'text',
            'json': 'text',
            'md': 'text'
        };

        return extensionMap[ext] || null;
    }

    /**
     * Extracts text from multiple files
     */
    async extractFromMultipleFiles(files, options = {}) {
        const results = [];
        const onProgress = options.onProgress || (() => {});
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            onProgress({
                fileIndex: i + 1,
                totalFiles: files.length,
                currentFile: file.name,
                overallProgress: (i / files.length) * 100
            });
            
            const result = await this.extractText(file, {
                onProgress: (progress, status) => {
                    onProgress({
                        fileIndex: i + 1,
                        totalFiles: files.length,
                        currentFile: file.name,
                        currentProgress: progress,
                        currentStatus: status,
                        overallProgress: ((i + progress/100) / files.length) * 100
                    });
                }
            });
            
            results.push(result);
        }
        
        onProgress({
            fileIndex: files.length,
            totalFiles: files.length,
            overallProgress: 100,
            completed: true
        });
        
        return results;
    }

    /**
     * Generates extraction summary
     */
    generateExtractionSummary(results) {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        const totalChars = successful.reduce((sum, r) => sum + r.textLength, 0);
        const avgCharsPerFile = successful.length > 0 ? Math.round(totalChars / successful.length) : 0;
        
        return {
            totalFiles: results.length,
            successfulExtractions: successful.length,
            failedExtractions: failed.length,
            totalCharacters: totalChars,
            averageCharactersPerFile: avgCharsPerFile,
            supportedTypes: [...new Set(successful.map(r => r.fileType))],
            errors: failed.map(r => ({ file: r.filename, error: r.error }))
        };
    }
}

// Export per module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileTextExtractor;
} else if (typeof window !== 'undefined') {
    window.FileTextExtractor = FileTextExtractor;
}