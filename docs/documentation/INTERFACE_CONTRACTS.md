# INTERFACE CONTRACTS - OllamaGUI Modular Architecture

## CONTRATTI DI INTERFACCIA MODULARE

I contratti di interfaccia definiscono le API standardizzate che ogni modulo deve implementare per garantire interoperabilità e isolamento completo.

## BASE CONTRACTS

### IModule.js - Base Module Interface
```javascript
// app/core/contracts/IModule.js

/**
 * Base interface that all modules must implement
 * Defines the lifecycle and core functionality
 */
class IModule {
    constructor() {
        this.name = this.constructor.name;
        this.version = '1.0.0';
        this.status = 'uninitialized'; // uninitialized, initializing, ready, starting, running, stopping, stopped, error
        this.context = null;
        this.dependencies = [];
        this.config = null;
    }

    /**
     * Initialize the module with kernel context
     * @param {Object} context - Kernel context including eventBus, config, etc.
     * @returns {Promise<void>}
     */
    async initialize(context) {
        throw new Error(`Module ${this.name} must implement initialize() method`);
    }

    /**
     * Start the module (after initialization)
     * @returns {Promise<void>}
     */
    async start() {
        throw new Error(`Module ${this.name} must implement start() method`);
    }

    /**
     * Stop the module gracefully
     * @returns {Promise<void>}
     */
    async stop() {
        throw new Error(`Module ${this.name} must implement stop() method`);
    }

    /**
     * Subscribe to events via event bus
     * @param {EventBus} eventBus - The kernel event bus
     * @returns {void}
     */
    subscribeToEvents(eventBus) {
        throw new Error(`Module ${this.name} must implement subscribeToEvents() method`);
    }

    /**
     * Get module information and status
     * @returns {Object} Module info
     */
    getModuleInfo() {
        return {
            name: this.name,
            version: this.version,
            status: this.status,
            dependencies: this.dependencies,
            description: 'Base module',
            author: 'OllamaGUI',
            health: this.getHealth()
        };
    }

    /**
     * Health check for the module
     * @returns {Object} Health status
     */
    getHealth() {
        return {
            status: this.status,
            lastCheck: new Date().toISOString(),
            uptime: this.getUptime(),
            errors: this.errors || []
        };
    }

    /**
     * Get module uptime
     * @returns {number} Uptime in milliseconds
     */
    getUptime() {
        return this.startTime ? Date.now() - this.startTime : 0;
    }

    /**
     * Handle configuration updates
     * @param {Object} newConfig - Updated configuration
     * @returns {Promise<void>}
     */
    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        await this.applyConfigChanges(newConfig);
    }

    /**
     * Apply configuration changes (override in subclasses)
     * @param {Object} configChanges - Configuration changes
     * @returns {Promise<void>}
     */
    async applyConfigChanges(configChanges) {
        // Default implementation does nothing
        console.log(`Module ${this.name} received config update:`, configChanges);
    }

    /**
     * Validate module state
     * @returns {boolean} True if module is in valid state
     */
    validateState() {
        return ['ready', 'running'].includes(this.status);
    }

    /**
     * Emergency shutdown
     * @returns {Promise<void>}
     */
    async emergencyStop() {
        console.warn(`Emergency stop initiated for module: ${this.name}`);
        this.status = 'stopping';
        
        try {
            await this.stop();
        } catch (error) {
            console.error(`Error during emergency stop of ${this.name}:`, error);
            this.status = 'error';
        }
    }
}

module.exports = IModule;
```

### IEventHandler.js - Event Handling Interface
```javascript
// app/core/contracts/IEventHandler.js

/**
 * Interface for modules that handle events
 * Provides standardized event handling methods
 */
class IEventHandler {
    constructor() {
        this.eventSubscriptions = new Map(); // eventType -> subscriptionId
        this.eventHandlers = new Map();      // eventType -> handler function
        this.eventMetrics = {
            handled: 0,
            errors: 0,
            lastEvent: null
        };
    }

    /**
     * Handle incoming event
     * @param {Object} event - The event object
     * @param {Object} context - Event context
     * @returns {Promise<*>} Handler result
     */
    async handleEvent(event, context) {
        const handler = this.eventHandlers.get(event.type);
        
        if (!handler) {
            console.warn(`No handler for event type: ${event.type} in ${this.constructor.name}`);
            return null;
        }

        try {
            this.eventMetrics.lastEvent = event;
            const result = await handler.call(this, event, context);
            this.eventMetrics.handled++;
            return result;
        } catch (error) {
            this.eventMetrics.errors++;
            console.error(`Error handling event ${event.type} in ${this.constructor.name}:`, error);
            throw error;
        }
    }

    /**
     * Register event handler
     * @param {string} eventType - Event type to handle
     * @param {Function} handler - Handler function
     * @returns {void}
     */
    registerEventHandler(eventType, handler) {
        if (typeof handler !== 'function') {
            throw new Error('Event handler must be a function');
        }
        
        this.eventHandlers.set(eventType, handler);
        console.log(`Event handler registered for ${eventType} in ${this.constructor.name}`);
    }

    /**
     * Unregister event handler
     * @param {string} eventType - Event type
     * @returns {boolean} True if handler was removed
     */
    unregisterEventHandler(eventType) {
        return this.eventHandlers.delete(eventType);
    }

    /**
     * Get event handling statistics
     * @returns {Object} Event metrics
     */
    getEventMetrics() {
        return {
            ...this.eventMetrics,
            handlerCount: this.eventHandlers.size,
            subscriptionCount: this.eventSubscriptions.size
        };
    }

    /**
     * Subscribe to multiple events at once
     * @param {EventBus} eventBus - Event bus instance
     * @param {Array} eventSubscriptions - Array of {eventType, handler, options}
     * @returns {Array} Subscription IDs
     */
    bulkSubscribe(eventBus, eventSubscriptions) {
        const subscriptionIds = [];
        
        for (const { eventType, handler, options = {} } of eventSubscriptions) {
            const subscriptionId = eventBus.subscribe(eventType, handler, {
                ...options,
                moduleId: this.constructor.name
            });
            
            this.eventSubscriptions.set(eventType, subscriptionId);
            subscriptionIds.push(subscriptionId);
        }
        
        return subscriptionIds;
    }

    /**
     * Unsubscribe from all events
     * @param {EventBus} eventBus - Event bus instance
     * @returns {void}
     */
    unsubscribeAll(eventBus) {
        for (const [eventType, subscriptionId] of this.eventSubscriptions.entries()) {
            eventBus.unsubscribe(eventType, subscriptionId);
        }
        this.eventSubscriptions.clear();
    }
}

module.exports = IEventHandler;
```

### IService.js - Service Layer Interface
```javascript
// app/core/contracts/IService.js

/**
 * Interface for service layer components
 * Defines business logic operations
 */
class IService {
    constructor() {
        this.isInitialized = false;
        this.operations = new Map(); // operationName -> operation function
        this.middleware = [];        // Array of middleware functions
        this.metrics = {
            operationsExecuted: 0,
            errors: 0,
            averageResponseTime: 0,
            totalResponseTime: 0
        };
    }

    /**
     * Initialize the service
     * @param {Object} config - Service configuration
     * @returns {Promise<void>}
     */
    async initialize(config) {
        throw new Error(`Service ${this.constructor.name} must implement initialize() method`);
    }

    /**
     * Execute a service operation
     * @param {string} operationName - Name of the operation
     * @param {*} params - Operation parameters
     * @param {Object} context - Execution context
     * @returns {Promise<*>} Operation result
     */
    async execute(operationName, params, context = {}) {
        const operation = this.operations.get(operationName);
        
        if (!operation) {
            throw new Error(`Operation ${operationName} not found in service ${this.constructor.name}`);
        }

        const startTime = performance.now();
        
        try {
            // Apply middleware
            let processedParams = params;
            for (const middleware of this.middleware) {
                processedParams = await middleware(processedParams, context) || processedParams;
            }

            // Execute operation
            const result = await operation.call(this, processedParams, context);
            
            // Update metrics
            const responseTime = performance.now() - startTime;
            this.updateMetrics(responseTime, false);
            
            return result;
            
        } catch (error) {
            const responseTime = performance.now() - startTime;
            this.updateMetrics(responseTime, true);
            throw error;
        }
    }

    /**
     * Register a service operation
     * @param {string} operationName - Operation name
     * @param {Function} operationFn - Operation function
     * @returns {void}
     */
    registerOperation(operationName, operationFn) {
        if (typeof operationFn !== 'function') {
            throw new Error('Operation must be a function');
        }
        
        this.operations.set(operationName, operationFn);
    }

    /**
     * Add middleware to the service
     * @param {Function} middlewareFn - Middleware function
     * @returns {void}
     */
    addMiddleware(middlewareFn) {
        if (typeof middlewareFn !== 'function') {
            throw new Error('Middleware must be a function');
        }
        
        this.middleware.push(middlewareFn);
    }

    /**
     * Get available operations
     * @returns {Array<string>} Operation names
     */
    getAvailableOperations() {
        return Array.from(this.operations.keys());
    }

    /**
     * Update service metrics
     * @param {number} responseTime - Response time in ms
     * @param {boolean} isError - Whether operation resulted in error
     * @returns {void}
     */
    updateMetrics(responseTime, isError) {
        this.metrics.operationsExecuted++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.operationsExecuted;
        
        if (isError) {
            this.metrics.errors++;
        }
    }

    /**
     * Get service metrics
     * @returns {Object} Service metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            errorRate: this.metrics.operationsExecuted > 0 
                ? (this.metrics.errors / this.metrics.operationsExecuted) * 100 
                : 0
        };
    }

    /**
     * Health check for the service
     * @returns {Object} Health status
     */
    async healthCheck() {
        return {
            status: this.isInitialized ? 'healthy' : 'unhealthy',
            metrics: this.getMetrics(),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = IService;
```

## DOMAIN-SPECIFIC CONTRACTS

### IChatModule.js - Chat Module Interface
```javascript
// app/core/contracts/IChatModule.js
const IModule = require('./IModule');
const IEventHandler = require('./IEventHandler');

/**
 * Interface for chat management modules
 */
class IChatModule extends IModule {
    constructor() {
        super();
        this.chatSessions = new Map();
        this.messageHistory = new Map();
    }

    /**
     * Create a new chat session
     * @param {string} title - Chat title
     * @param {string} model - Model to use
     * @param {Object} options - Chat options
     * @returns {Promise<Object>} Chat session info
     */
    async createChat(title, model, options = {}) {
        throw new Error(`Chat module ${this.name} must implement createChat() method`);
    }

    /**
     * Send message in a chat session
     * @param {string} chatId - Chat ID
     * @param {string} message - Message content
     * @param {Array} attachments - Message attachments
     * @returns {Promise<Object>} Response info
     */
    async sendMessage(chatId, message, attachments = []) {
        throw new Error(`Chat module ${this.name} must implement sendMessage() method`);
    }

    /**
     * Get chat history
     * @param {string} chatId - Chat ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Message history
     */
    async getChatHistory(chatId, options = {}) {
        throw new Error(`Chat module ${this.name} must implement getChatHistory() method`);
    }

    /**
     * Delete a chat session
     * @param {string} chatId - Chat ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteChat(chatId) {
        throw new Error(`Chat module ${this.name} must implement deleteChat() method`);
    }

    /**
     * List all chat sessions
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} Chat list
     */
    async listChats(filters = {}) {
        throw new Error(`Chat module ${this.name} must implement listChats() method`);
    }

    /**
     * Get chat statistics
     * @returns {Promise<Object>} Chat statistics
     */
    async getChatStats() {
        return {
            totalChats: this.chatSessions.size,
            totalMessages: Array.from(this.messageHistory.values()).reduce((sum, msgs) => sum + msgs.length, 0),
            activeSessions: Array.from(this.chatSessions.values()).filter(chat => chat.status === 'active').length
        };
    }
}

module.exports = IChatModule;
```

### IOllamaModule.js - Ollama Integration Interface
```javascript
// app/core/contracts/IOllamaModule.js
const IModule = require('./IModule');

/**
 * Interface for Ollama integration modules
 */
class IOllamaModule extends IModule {
    constructor() {
        super();
        this.ollamaStatus = 'unknown';
        this.availableModels = [];
        this.runningModels = new Map();
    }

    /**
     * Check Ollama service status
     * @returns {Promise<Object>} Status info
     */
    async checkStatus() {
        throw new Error(`Ollama module ${this.name} must implement checkStatus() method`);
    }

    /**
     * Start Ollama service
     * @param {Object} options - Start options
     * @returns {Promise<boolean>} Success status
     */
    async startOllama(options = {}) {
        throw new Error(`Ollama module ${this.name} must implement startOllama() method`);
    }

    /**
     * Stop Ollama service
     * @returns {Promise<boolean>} Success status
     */
    async stopOllama() {
        throw new Error(`Ollama module ${this.name} must implement stopOllama() method`);
    }

    /**
     * List available models
     * @param {boolean} refresh - Whether to refresh the list
     * @returns {Promise<Array>} Model list
     */
    async listModels(refresh = false) {
        throw new Error(`Ollama module ${this.name} must implement listModels() method`);
    }

    /**
     * Download a model
     * @param {string} modelName - Model name
     * @param {Object} options - Download options
     * @returns {Promise<Object>} Download info
     */
    async downloadModel(modelName, options = {}) {
        throw new Error(`Ollama module ${this.name} must implement downloadModel() method`);
    }

    /**
     * Remove a model
     * @param {string} modelName - Model name
     * @returns {Promise<boolean>} Success status
     */
    async removeModel(modelName) {
        throw new Error(`Ollama module ${this.name} must implement removeModel() method`);
    }

    /**
     * Generate response using a model
     * @param {string} model - Model name
     * @param {string} prompt - Input prompt
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generation result
     */
    async generateResponse(model, prompt, options = {}) {
        throw new Error(`Ollama module ${this.name} must implement generateResponse() method`);
    }

    /**
     * Get model information
     * @param {string} modelName - Model name
     * @returns {Promise<Object>} Model info
     */
    async getModelInfo(modelName) {
        throw new Error(`Ollama module ${this.name} must implement getModelInfo() method`);
    }
}

module.exports = IOllamaModule;
```

### IStorageModule.js - Storage Interface
```javascript
// app/core/contracts/IStorageModule.js
const IModule = require('./IModule');

/**
 * Interface for data storage modules
 */
class IStorageModule extends IModule {
    constructor() {
        super();
        this.storageProvider = null;
        this.isConnected = false;
    }

    /**
     * Store data
     * @param {string} key - Storage key
     * @param {*} data - Data to store
     * @param {Object} options - Storage options
     * @returns {Promise<boolean>} Success status
     */
    async store(key, data, options = {}) {
        throw new Error(`Storage module ${this.name} must implement store() method`);
    }

    /**
     * Retrieve data
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if key not found
     * @returns {Promise<*>} Stored data
     */
    async retrieve(key, defaultValue = null) {
        throw new Error(`Storage module ${this.name} must implement retrieve() method`);
    }

    /**
     * Delete data
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        throw new Error(`Storage module ${this.name} must implement delete() method`);
    }

    /**
     * Check if key exists
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} Exists status
     */
    async exists(key) {
        throw new Error(`Storage module ${this.name} must implement exists() method`);
    }

    /**
     * List all keys
     * @param {string} pattern - Key pattern (optional)
     * @returns {Promise<Array>} Key list
     */
    async listKeys(pattern = '*') {
        throw new Error(`Storage module ${this.name} must implement listKeys() method`);
    }

    /**
     * Get storage statistics
     * @returns {Promise<Object>} Storage stats
     */
    async getStorageStats() {
        throw new Error(`Storage module ${this.name} must implement getStorageStats() method`);
    }

    /**
     * Backup data
     * @param {string} backupPath - Backup location
     * @returns {Promise<Object>} Backup info
     */
    async backup(backupPath) {
        throw new Error(`Storage module ${this.name} must implement backup() method`);
    }

    /**
     * Restore data from backup
     * @param {string} backupPath - Backup location
     * @returns {Promise<boolean>} Success status
     */
    async restore(backupPath) {
        throw new Error(`Storage module ${this.name} must implement restore() method`);
    }

    /**
     * Optimize storage
     * @returns {Promise<Object>} Optimization result
     */
    async optimize() {
        return { status: 'not_implemented', message: 'Storage optimization not implemented' };
    }
}

module.exports = IStorageModule;
```

## CONTRACT VALIDATION

### ContractValidator.js - Runtime Contract Validation
```javascript
// app/core/contracts/ContractValidator.js

class ContractValidator {
    static validateModule(moduleInstance, expectedContract) {
        const errors = [];
        const warnings = [];
        
        // Check if instance implements contract
        if (!(moduleInstance instanceof expectedContract)) {
            // Check methods manually if not using inheritance
            const requiredMethods = this.getRequiredMethods(expectedContract);
            
            for (const method of requiredMethods) {
                if (typeof moduleInstance[method] !== 'function') {
                    errors.push(`Missing required method: ${method}`);
                }
            }
        }
        
        // Check module info
        if (typeof moduleInstance.getModuleInfo === 'function') {
            const info = moduleInstance.getModuleInfo();
            if (!info.name || !info.version) {
                warnings.push('Module info should include name and version');
            }
        } else {
            warnings.push('Module should implement getModuleInfo() method');
        }
        
        return { errors, warnings, isValid: errors.length === 0 };
    }
    
    static getRequiredMethods(contractClass) {
        const methods = [];
        let currentClass = contractClass;
        
        while (currentClass && currentClass !== Object) {
            const methodNames = Object.getOwnPropertyNames(currentClass.prototype);
            
            for (const methodName of methodNames) {
                if (methodName !== 'constructor' && 
                    typeof currentClass.prototype[methodName] === 'function') {
                    
                    const method = currentClass.prototype[methodName];
                    
                    // Check if method throws "must implement" error
                    if (method.toString().includes('must implement')) {
                        methods.push(methodName);
                    }
                }
            }
            
            currentClass = Object.getPrototypeOf(currentClass);
        }
        
        return methods;
    }
    
    static validateEventSchema(event, schema) {
        const errors = [];
        
        for (const [field, expectedType] of Object.entries(schema)) {
            if (!(field in event.payload)) {
                errors.push(`Missing required field: ${field}`);
                continue;
            }
            
            const actualType = typeof event.payload[field];
            
            if (Array.isArray(expectedType)) {
                // Enum validation
                if (!expectedType.includes(event.payload[field])) {
                    errors.push(`Invalid value for ${field}: expected one of [${expectedType.join(', ')}]`);
                }
            } else if (expectedType !== actualType && expectedType !== 'any') {
                errors.push(`Type mismatch for ${field}: expected ${expectedType}, got ${actualType}`);
            }
        }
        
        return { errors, isValid: errors.length === 0 };
    }
}

module.exports = ContractValidator;
```

Questi contratti di interfaccia garantiscono che tutti i moduli implementino le API standardizzate necessarie per l'interoperabilità completa nel micro-kernel, mantenendo l'isolamento e la type-safety richiesti dalla metodologia anti-degrado.