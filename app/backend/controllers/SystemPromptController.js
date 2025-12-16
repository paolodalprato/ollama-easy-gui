/**
 * SystemPromptController - System Prompt Management & Configuration
 * 
 * Handles CRUD operations for system prompts configuration
 * Extracted from OllamaController.js for backend modular architecture compliance
 * 
 * Dependencies:
 * - fs: File system operations
 * - path: File path utilities
 */

const fs = require('fs').promises;
const path = require('path');

class SystemPromptController {
    constructor() {
        // Path correction: server is already in app/backend, so data is in ../data
        this.promptsFilePath = path.join(__dirname, '..', '..', 'data', 'system-prompts.json');
        console.log('🔧 SystemPromptController initialized');
        console.log('📁 System prompts path:', this.promptsFilePath);
    }

    /**
     * Get system prompt for specific model
     * @param {string} modelName - Name of the model
     * @returns {Promise<string>} System prompt content
     */
    async getSystemPrompt(modelName) {
        try {
            const prompts = await this.loadSystemPrompts();
            return prompts[modelName] || prompts['default'] || '';
        } catch (error) {
            console.error('❌ Error getting system prompt:', error);
            return '';
        }
    }

    /**
     * Load all system prompts from file
     * @returns {Promise<Object>} System prompts object
     */
    async loadSystemPrompts() {
        try {
            if (await this.fileExists(this.promptsFilePath)) {
                const data = await fs.readFile(this.promptsFilePath, 'utf8');
                const parsed = JSON.parse(data) || {};
                
                // Handle both structured format (with 'prompts' key) and legacy direct format
                if (parsed.prompts && typeof parsed.prompts === 'object') {
                    // Structured format: merge root-level prompts with nested prompts for compatibility
                    const structuredPrompts = { ...parsed.prompts };
                    
                    // Merge any root-level prompts (legacy compatibility)
                    Object.keys(parsed).forEach(key => {
                        if (key !== 'prompts' && key !== 'version' && key !== 'created' && key !== 'updated') {
                            structuredPrompts[key] = parsed[key];
                        }
                    });
                    
                    return structuredPrompts;
                } else {
                    // Legacy direct format - return as-is
                    return parsed;
                }
            } else {
                // Create default prompts file if it doesn't exist
                const defaultStructure = {
                    version: "1.0.0",
                    created: new Date().toISOString().split('T')[0],
                    updated: new Date().toISOString(),
                    prompts: {
                        default: "You are a helpful AI assistant. Please provide accurate, helpful, and concise responses."
                    }
                };
                await this.saveSystemPromptsStructured(defaultStructure);
                return defaultStructure.prompts;
            }
        } catch (error) {
            console.error('❌ Error loading system prompts:', error);
            return {
                default: "You are a helpful AI assistant. Please provide accurate, helpful, and concise responses."
            };
        }
    }

    /**
     * Get all system prompts (API endpoint handler)
     * @param {Object} req - HTTP request object
     * @param {Object} res - HTTP response object
     */
    async getSystemPrompts(req, res) {
        try {
            console.log('📋 Loading system prompts...');
            const prompts = await this.loadSystemPrompts();

            console.log(`✅ Found ${Object.keys(prompts).length} system prompts`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                prompts: prompts
            }));

        } catch (error) {
            console.error('❌ Error getting system prompts:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Failed to load system prompts'
            }));
        }
    }

    /**
     * Save system prompt for specific model (API endpoint handler)
     * @param {Object} req - HTTP request object
     * @param {Object} res - HTTP response object
     */
    async saveSystemPrompt(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { modelName, prompt } = JSON.parse(body);
                
                if (!modelName || typeof prompt !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Invalid modelName or prompt'
                    }));
                    return;
                }

                console.log(`💾 Saving system prompt for model: ${modelName}`);
                
                // Load existing prompts
                const prompts = await this.loadSystemPrompts();
                
                // Update/add the prompt for this model
                prompts[modelName] = prompt;
                
                // Save back to file
                await this.saveSystemPrompts(prompts);
                
                console.log(`✅ System prompt saved for model: ${modelName}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `System prompt saved for ${modelName}`
                }));

            } catch (error) {
                console.error('❌ Error saving system prompt:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to save system prompt'
                }));
            }
        });
    }

    /**
     * Delete system prompt for specific model (API endpoint handler)
     * @param {Object} req - HTTP request object
     * @param {Object} res - HTTP response object
     */
    async deleteSystemPrompt(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { modelName } = JSON.parse(body);
                
                if (!modelName) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Model name is required'
                    }));
                    return;
                }

                console.log(`🗑️ Deleting system prompt for model: ${modelName}`);
                
                // Load existing prompts
                const prompts = await this.loadSystemPrompts();
                
                // Check if prompt exists
                if (!prompts[modelName]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        error: `No system prompt found for model: ${modelName}`
                    }));
                    return;
                }
                
                // Delete the prompt
                delete prompts[modelName];
                
                // Save back to file
                await this.saveSystemPrompts(prompts);
                
                console.log(`✅ System prompt deleted for model: ${modelName}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `System prompt deleted for ${modelName}`
                }));

            } catch (error) {
                console.error('❌ Error deleting system prompt:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to delete system prompt'
                }));
            }
        });
    }

    /**
     * Save system prompts to file with structured format
     * @param {Object} prompts - System prompts object
     * @returns {Promise<boolean>} Success status
     */
    async saveSystemPrompts(prompts) {
        try {
            // Load existing structure or create new one
            let fileData = {};
            if (await this.fileExists(this.promptsFilePath)) {
                try {
                    const existing = await fs.readFile(this.promptsFilePath, 'utf8');
                    fileData = JSON.parse(existing) || {};
                } catch (parseError) {
                    console.warn('⚠️ Could not parse existing file, creating new structure');
                    fileData = {};
                }
            }
            
            // Ensure structured format
            const structuredData = {
                version: fileData.version || "1.0.0",
                created: fileData.created || new Date().toISOString().split('T')[0],
                updated: new Date().toISOString(),
                prompts: prompts
            };
            
            await this.saveSystemPromptsStructured(structuredData);
            return true;

        } catch (error) {
            console.error('❌ Error saving system prompts:', error);
            throw error;
        }
    }

    /**
     * Save structured system prompts data to file
     * @param {Object} structuredData - Complete structured data
     * @returns {Promise<boolean>} Success status
     */
    async saveSystemPromptsStructured(structuredData) {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.promptsFilePath);
            try {
                await fs.access(dataDir);
            } catch {
                await fs.mkdir(dataDir, { recursive: true });
            }

            // Write structured data to file
            await fs.writeFile(
                this.promptsFilePath, 
                JSON.stringify(structuredData, null, 2),
                'utf8'
            );
            
            console.log(`💾 System prompts saved to ${this.promptsFilePath}`);
            return true;

        } catch (error) {
            console.error('❌ Error saving structured system prompts:', error);
            throw error;
        }
    }

    /**
     * Check if file exists
     * @param {string} filePath - Path to check
     * @returns {Promise<boolean>} File exists status
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate system prompt content
     * @param {string} prompt - Prompt content to validate
     * @returns {boolean} Validation result
     */
    validatePrompt(prompt) {
        if (typeof prompt !== 'string') return false;
        if (prompt.length === 0) return false;
        if (prompt.length > 10000) return false; // Max 10KB
        return true;
    }

    /**
     * Get system prompt statistics
     * @returns {Promise<Object>} Statistics object
     */
    async getStats() {
        try {
            const prompts = await this.loadSystemPrompts();
            const stats = {
                totalPrompts: Object.keys(prompts).length,
                models: Object.keys(prompts),
                averageLength: 0,
                totalSize: 0
            };

            const lengths = Object.values(prompts).map(p => p.length);
            stats.averageLength = lengths.length > 0 ? 
                Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0;
            stats.totalSize = lengths.reduce((a, b) => a + b, 0);

            return stats;
        } catch (error) {
            console.error('❌ Error getting prompt stats:', error);
            return {
                totalPrompts: 0,
                models: [],
                averageLength: 0,
                totalSize: 0
            };
        }
    }
}

module.exports = SystemPromptController;