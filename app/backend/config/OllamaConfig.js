/**
 * OllamaConfig - Centralized Ollama Configuration
 *
 * Eliminates hardcoded values scattered across the codebase.
 * Supports environment variable overrides for deployment flexibility.
 */

const OllamaConfig = {
    // Connection settings
    HOST: process.env.OLLAMA_HOST || 'localhost',
    PORT: parseInt(process.env.OLLAMA_PORT, 10) || 11434,

    // Computed base URL
    get BASE_URL() {
        return `http://${this.HOST}:${this.PORT}`;
    },

    // API endpoints
    ENDPOINTS: {
        VERSION: '/api/version',
        TAGS: '/api/tags',
        GENERATE: '/api/generate',
        CHAT: '/api/chat',
        PS: '/api/ps',
        PULL: '/api/pull',
        DELETE: '/api/delete',
        SHOW: '/api/show'
    },

    // Timeout settings (in milliseconds)
    TIMEOUTS: {
        HEALTH_CHECK: 2000,           // 2 seconds for health check
        API_TAGS: 10000,              // 10 seconds for listing models
        STARTUP_WAIT: 1500,           // 1.5 seconds between startup retries
        STARTUP_MAX_ATTEMPTS: 6,      // Maximum startup retry attempts
        MODEL_LOAD_DEFAULT: 120000,   // 2 minutes default
        MODEL_LOAD_LARGE: 300000,     // 5 minutes for 30b+ models
        MODEL_LOAD_XLARGE: 600000,    // 10 minutes for 70b+ models
        MODEL_LOAD_REASONING: 1800000 // 30 minutes for reasoning models (qwq, deepseek-r1)
    },

    // Model size thresholds for timeout calculation
    MODEL_SIZE_THRESHOLDS: {
        SMALL: 10,      // GB - models < 10GB
        MEDIUM: 30,     // GB - models 10-30GB
        LARGE: 70,      // GB - models 30-70GB
        XLARGE: 150     // GB - models > 70GB
    },

    /**
     * Calculate appropriate timeout based on model name
     * @param {string} modelName - Model name (e.g., 'llama3.1:70b')
     * @returns {number} Timeout in milliseconds
     */
    getTimeoutForModel(modelName) {
        const name = modelName.toLowerCase();

        // Reasoning models need extra time
        if (name.includes('qwq') || name.includes('deepseek-r1')) {
            return this.TIMEOUTS.MODEL_LOAD_REASONING;
        }

        // Large parameter models
        if (name.includes('70b') || name.includes('72b')) {
            return this.TIMEOUTS.MODEL_LOAD_XLARGE;
        }

        if (name.includes('30b') || name.includes('32b') || name.includes('33b')) {
            return this.TIMEOUTS.MODEL_LOAD_LARGE;
        }

        if (name.includes('13b') || name.includes('14b')) {
            return 180000; // 3 minutes
        }

        if (name.includes('7b') || name.includes('8b')) {
            return this.TIMEOUTS.MODEL_LOAD_DEFAULT;
        }

        // Default timeout
        return this.TIMEOUTS.MODEL_LOAD_DEFAULT;
    },

    /**
     * Calculate timeout based on model size in GB
     * @param {number} sizeGB - Model size in gigabytes
     * @returns {number} Timeout in milliseconds
     */
    getTimeoutForSize(sizeGB) {
        if (sizeGB >= this.MODEL_SIZE_THRESHOLDS.XLARGE) {
            return this.TIMEOUTS.MODEL_LOAD_REASONING;
        }
        if (sizeGB >= this.MODEL_SIZE_THRESHOLDS.LARGE) {
            return this.TIMEOUTS.MODEL_LOAD_XLARGE;
        }
        if (sizeGB >= this.MODEL_SIZE_THRESHOLDS.MEDIUM) {
            return this.TIMEOUTS.MODEL_LOAD_LARGE;
        }
        return this.TIMEOUTS.MODEL_LOAD_DEFAULT;
    }
};

module.exports = OllamaConfig;
