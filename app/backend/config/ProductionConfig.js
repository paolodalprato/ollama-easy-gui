/**
 * ProductionConfig - Environment Configuration Management
 * 
 * PHASE 4C.1: Production-grade environment separation
 * Implements comprehensive configuration management per different environments
 * 
 * Environments: development, production, testing
 * Architecture: Single source of truth per environment settings
 */

const path = require('path');

class ProductionConfig {
    
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.config = this.loadEnvironmentConfig();
        
        console.log(`🔧 ProductionConfig initialized - Environment: ${this.environment}`);
    }
    
    /**
     * Load configuration based on current environment
     */
    loadEnvironmentConfig() {
        const baseConfig = {
            app: {
                name: 'Ollama Easy GUI',
                version: '1.0.0',
                port: 3003
            },
            paths: {
                data: path.join(process.cwd(), 'app', 'data'),
                logs: path.join(process.cwd(), 'app', 'logs'),
                cache: path.join(process.cwd(), 'app', 'cache')
            },
            security: {
                rateLimit: {
                    windowMs: 15 * 60 * 1000, // 15 minutes
                    max: 100 // requests per window
                },
                fileUpload: {
                    maxSize: 50 * 1024 * 1024, // 50MB
                    allowedTypes: [
                        'application/pdf',
                        'text/plain',
                        'text/markdown',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    ]
                }
            },
            ollama: {
                host: 'localhost',
                port: 11434,
                timeout: 120000, // 2 minutes
                maxRetries: 3
            }
        };
        
        // Environment-specific overrides
        switch (this.environment) {
            case 'production':
                return {
                    ...baseConfig,
                    debug: false,
                    logging: {
                        level: 'error',
                        file: true,
                        console: false
                    },
                    security: {
                        ...baseConfig.security,
                        rateLimit: {
                            windowMs: 5 * 60 * 1000, // 5 minutes (stricter)
                            max: 50 // Lower limit for production
                        }
                    },
                    performance: {
                        enableCompression: true,
                        enableCaching: true,
                        cacheMaxAge: 3600000 // 1 hour
                    }
                };
                
            case 'testing':
                return {
                    ...baseConfig,
                    debug: true,
                    app: {
                        ...baseConfig.app,
                        port: 3004 // Different port for testing
                    },
                    logging: {
                        level: 'debug',
                        file: false,
                        console: true
                    },
                    security: {
                        ...baseConfig.security,
                        rateLimit: {
                            windowMs: 60 * 1000, // 1 minute
                            max: 1000 // Higher limit for testing
                        }
                    }
                };
                
            case 'development':
            default:
                return {
                    ...baseConfig,
                    debug: true,
                    logging: {
                        level: 'debug',
                        file: true,
                        console: true
                    },
                    security: {
                        ...baseConfig.security,
                        rateLimit: {
                            windowMs: 15 * 60 * 1000,
                            max: 200 // Higher limit for development
                        }
                    },
                    performance: {
                        enableCompression: false,
                        enableCaching: false
                    }
                };
        }
    }
    
    /**
     * Get configuration value by path
     * Example: get('app.port') returns 3003
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.config);
    }
    
    /**
     * Check if running in production
     */
    isProduction() {
        return this.environment === 'production';
    }
    
    /**
     * Check if running in development
     */
    isDevelopment() {
        return this.environment === 'development';
    }
    
    /**
     * Check if running in testing
     */
    isTesting() {
        return this.environment === 'testing';
    }
    
    /**
     * Get complete configuration object
     */
    getAll() {
        return { ...this.config };
    }
    
    /**
     * Environment Health Check
     * Validates that all required directories and settings are correct
     */
    async validateEnvironment() {
        const fs = require('fs').promises;
        const issues = [];
        
        try {
            // Check required directories
            const requiredPaths = [
                this.get('paths.data'),
                this.get('paths.logs'),
                this.get('paths.cache')
            ];
            
            for (const pathToCheck of requiredPaths) {
                try {
                    await fs.access(pathToCheck);
                } catch (error) {
                    // Create directory if it doesn't exist
                    try {
                        await fs.mkdir(pathToCheck, { recursive: true });
                        console.log(`📁 Created directory: ${pathToCheck}`);
                    } catch (createError) {
                        issues.push(`Cannot create directory: ${pathToCheck}`);
                    }
                }
            }
            
            // Check port availability (basic check)
            const port = this.get('app.port');
            if (port < 1024 || port > 65535) {
                issues.push(`Invalid port: ${port}`);
            }
            
            if (issues.length === 0) {
                console.log('✅ Environment validation passed');
                return true;
            } else {
                console.warn('⚠️ Environment validation issues:', issues);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Environment validation failed:', error);
            return false;
        }
    }
    
    /**
     * Production Readiness Check
     * Comprehensive check for production deployment readiness
     */
    checkProductionReadiness() {
        const checks = [];
        
        // Security checks
        if (this.isProduction()) {
            if (this.get('debug') === true) {
                checks.push('❌ Debug mode enabled in production');
            }
            
            if (this.get('logging.console') === true) {
                checks.push('⚠️ Console logging enabled in production');
            }
            
            if (this.get('security.rateLimit.max') > 100) {
                checks.push('⚠️ Rate limit too permissive for production');
            }
        }
        
        // Performance checks
        if (this.isProduction() && !this.get('performance.enableCompression')) {
            checks.push('⚠️ Compression disabled in production');
        }
        
        if (checks.length === 0) {
            console.log('✅ Production readiness check passed');
            return true;
        } else {
            console.warn('🔧 Production readiness issues:');
            checks.forEach(check => console.warn(`  ${check}`));
            return false;
        }
    }
}

// Singleton instance
const config = new ProductionConfig();

module.exports = config;