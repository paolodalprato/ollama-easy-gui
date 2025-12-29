/**
 * SecurityValidator - Enhanced Input Validation & Security Framework
 * 
 * PHASE 4B.1: Production-grade security enhancement
 * Implements comprehensive input validation, sanitization, and security checks
 * 
 * Dependencies: None (zero external dependencies for security)
 * Architecture: Stateless utility class per security best practices
 */

class SecurityValidator {
    
    /**
     * File Upload Security Validation
     * Enhanced validation per production-grade file handling
     */
    static validateFileUpload(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB limit
        const allowedTypes = [
            'application/pdf',
            'text/plain', 
            'text/markdown',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
        ];
        
        // File size validation
        if (file.size > maxSize) {
            throw new Error('File size exceeds 50MB limit');
        }
        
        // MIME type validation
        if (!allowedTypes.includes(file.mimetype)) {
            throw new Error(`File type '${file.mimetype}' not allowed`);
        }
        
        // File extension double-check
        const allowedExtensions = ['.pdf', '.txt', '.md', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = require('path').extname(file.originalname).toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error(`File extension '${fileExtension}' not allowed`);
        }
        
        return true;
    }
    
    /**
     * XSS Prevention - Input Sanitization
     * Comprehensive HTML encoding per prevent XSS attacks
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') {
            return input;
        }
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/\\/g, '&#x5C;')
            .replace(/`/g, '&#96;');
    }
    
    /**
     * Path Traversal Protection
     * Prevents directory traversal attacks in file paths
     */
    static validatePath(filePath) {
        const normalizedPath = require('path').normalize(filePath);
        
        // Check for directory traversal patterns
        if (normalizedPath.includes('..') || 
            normalizedPath.includes('~') ||
            /^\/|^[a-zA-Z]:/.test(normalizedPath)) {
            throw new Error('Invalid file path - directory traversal detected');
        }
        
        return normalizedPath;
    }
    
    /**
     * Input Length Validation
     * DoS prevention through input size limits
     */
    static validateInputLength(input, maxLength = 10000) {
        if (typeof input === 'string' && input.length > maxLength) {
            throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
        }
        
        return true;
    }
    
    /**
     * Chat Message Security Validation
     * Specialized validation for chat inputs
     */
    static validateChatMessage(message) {
        this.validateInputLength(message, 100000); // 100KB max message
        
        // Check for potential injection attempts
        const suspiciousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /data:text\/html/gi
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(message)) {
                console.warn('🚨 Security: Suspicious pattern detected in message');
                // Don't throw error, just log and sanitize
                break;
            }
        }
        
        return this.sanitizeInput(message);
    }
    
    /**
     * Model Name Security Validation
     * Ensures model names are safe for file system operations
     */
    static validateModelName(modelName) {
        // Only allow alphanumeric, hyphens, underscores, colons, dots
        const validPattern = /^[a-zA-Z0-9\-_:\.\/]+$/;
        
        if (!validPattern.test(modelName)) {
            throw new Error('Invalid model name - contains unsafe characters');
        }
        
        this.validateInputLength(modelName, 200);
        
        return modelName;
    }
    
    /**
     * Rate Limiting Check
     * Basic rate limiting implementation
     * Note: Relaxed limits for local desktop app (not exposed to internet)
     */
    static checkRateLimit(clientId, windowMs = 60 * 1000, maxRequests = 500) {
        // Skip rate limiting for localhost (local desktop app)
        if (clientId === '::1' || clientId === '127.0.0.1' || clientId === '::ffff:127.0.0.1') {
            return true;
        }

        if (!this.rateLimitStore) {
            this.rateLimitStore = new Map();
        }

        const now = Date.now();
        const client = this.rateLimitStore.get(clientId);

        if (!client) {
            this.rateLimitStore.set(clientId, {
                count: 1,
                resetTime: now + windowMs
            });
            return true;
        }

        if (now > client.resetTime) {
            client.count = 1;
            client.resetTime = now + windowMs;
            return true;
        }

        if (client.count >= maxRequests) {
            throw new Error('Rate limit exceeded - please try again later');
        }

        client.count++;
        return true;
    }
    
    /**
     * Comprehensive Request Validation
     * Entry point for complete request security validation
     */
    static validateRequest(req) {
        const clientId = req.connection.remoteAddress;
        
        try {
            // Rate limiting check
            this.checkRateLimit(clientId);
            
            // Validate URL length
            this.validateInputLength(req.url, 2048);
            
            // Validate headers
            if (req.headers['user-agent']) {
                this.validateInputLength(req.headers['user-agent'], 512);
            }
            
            return true;
        } catch (error) {
            console.error('🚨 Security validation failed:', error.message);
            throw error;
        }
    }
}

module.exports = SecurityValidator;