# TEMPLATE SVILUPPO MODULARE - OllamaGUI

## TEMPLATE E UTILITIES PER SVILUPPO MODULI

Questi template standardizzano lo sviluppo di nuovi moduli seguendo rigorosamente i contratti di interfaccia e i principi anti-degrado.

## MODULE TEMPLATE GENERATOR

### ModuleGenerator.js - Generatore Automatico di Moduli
```javascript
// File: app/tools/ModuleGenerator.js
const fs = require('fs').promises;
const path = require('path');

class ModuleGenerator {
    constructor() {
        this.templateDir = path.join(__dirname, 'templates');
        this.outputDir = path.join(__dirname, '../core/modules');
    }
    
    async generateModule(config) {
        const { name, type, interfaces, features } = config;
        
        console.log(`🔧 Generating module: ${name} (${type})`);
        
        // Create module directory
        const modulePath = path.join(this.outputDir, name.toLowerCase());
        await fs.mkdir(modulePath, { recursive: true });
        
        // Generate main module file
        await this.generateMainModule(modulePath, config);
        
        // Generate service layer
        if (features.includes('service')) {
            await this.generateService(modulePath, config);
        }
        
        // Generate tests
        await this.generateTests(modulePath, config);
        
        // Generate configuration
        await this.generateConfig(modulePath, config);
        
        // Generate documentation
        await this.generateDocs(modulePath, config);
        
        console.log(`✅ Module ${name} generated successfully at ${modulePath}`);
        return modulePath;
    }
    
    async generateMainModule(modulePath, config) {
        const template = await this.loadTemplate('module.main.template.js');
        const content = this.processTemplate(template, config);
        
        const fileName = `${config.name}Module.js`;
        await fs.writeFile(path.join(modulePath, fileName), content);
    }
    
    processTemplate(template, config) {
        return template
            .replace(/{{MODULE_NAME}}/g, config.name)
            .replace(/{{MODULE_TYPE}}/g, config.type)
            .replace(/{{INTERFACES}}/g, config.interfaces.join(', '))
            .replace(/{{VERSION}}/g, config.version || '1.0.0')
            .replace(/{{AUTHOR}}/g, config.author || 'OllamaGUI')
            .replace(/{{DESCRIPTION}}/g, config.description || 'Generated module');
    }
    
    async loadTemplate(templateName) {
        const templatePath = path.join(this.templateDir, templateName);
        return await fs.readFile(templatePath, 'utf8');
    }
}

// Usage example:
const generator = new ModuleGenerator();
generator.generateModule({
    name: 'Analytics',
    type: 'service',
    interfaces: ['IModule', 'IEventHandler', 'IService'],
    features: ['service', 'storage', 'ui'],
    version: '1.0.0',
    author: 'OllamaGUI Team',
    description: 'Analytics and metrics collection module'
});
```

## TEMPLATE FILES

### 1. module.main.template.js - Base Module Template
```javascript
// File: app/tools/templates/module.main.template.js
// {{MODULE_NAME}}Module.js - Auto-generated module
// Generated on: {{TIMESTAMP}}
// Author: {{AUTHOR}}
// Description: {{DESCRIPTION}}

const IModule = require('../../contracts/IModule');
const IEventHandler = require('../../contracts/IEventHandler');
{{#if SERVICE}}const IService = require('../../contracts/IService');{{/if}}

/**
 * {{MODULE_NAME}}Module - {{DESCRIPTION}}
 * Version: {{VERSION}}
 * Interfaces: {{INTERFACES}}
 */
class {{MODULE_NAME}}Module extends IModule {
    constructor() {
        super();
        
        // Module identity
        this.name = '{{MODULE_NAME}}Module';
        this.version = '{{VERSION}}';
        this.author = '{{AUTHOR}}';
        this.dependencies = [{{#each DEPENDENCIES}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}];
        
        // Module state
        this.isInitialized = false;
        this.services = new Map();
        this.eventHandlers = new Map();
        
        // Configuration
        this.config = {};
        
        // Metrics
        this.metrics = {
            initialized: null,
            started: null,
            eventsHandled: 0,
            errors: 0,
            lastActivity: null
        };
        
        console.log(`📦 ${this.name} v${this.version} constructor initialized`);
    }

    /**
     * Initialize the module with kernel context
     * @param {Object} context - Kernel context
     */
    async initialize(context) {
        try {
            this.status = 'initializing';
            this.context = context;
            this.config = context.config.{{MODULE_NAME_LOWER}} || {};
            
            // Initialize services
            await this.initializeServices();
            
            // Setup event subscriptions
            this.subscribeToEvents(context.eventBus);
            
            // Run custom initialization
            await this.customInitialization();
            
            this.status = 'ready';
            this.isInitialized = true;
            this.metrics.initialized = new Date();
            
            console.log(`✅ ${this.name} initialized successfully`);
            
        } catch (error) {
            this.status = 'error';
            this.metrics.errors++;
            console.error(`❌ Failed to initialize ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Start the module
     */
    async start() {
        try {
            if (!this.isInitialized) {
                throw new Error(`${this.name} must be initialized before starting`);
            }
            
            this.status = 'starting';
            
            // Start services
            await this.startServices();
            
            // Run custom start logic
            await this.customStart();
            
            this.status = 'running';
            this.metrics.started = new Date();
            this.startTime = Date.now();
            
            // Emit module started event
            await this.context.eventBus.emit('system.module.started', {
                module: this.name,
                version: this.version,
                timestamp: new Date().toISOString()
            });
            
            console.log(`🚀 ${this.name} started successfully`);
            
        } catch (error) {
            this.status = 'error';
            this.metrics.errors++;
            console.error(`❌ Failed to start ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Stop the module gracefully
     */
    async stop() {
        try {
            this.status = 'stopping';
            
            // Stop services
            await this.stopServices();
            
            // Unsubscribe from events
            this.unsubscribeFromEvents();
            
            // Run custom cleanup
            await this.customStop();
            
            this.status = 'stopped';
            
            console.log(`🛑 ${this.name} stopped successfully`);
            
        } catch (error) {
            this.status = 'error';
            this.metrics.errors++;
            console.error(`❌ Error stopping ${this.name}:`, error);
            throw error;
        }
    }

    /**
     * Subscribe to events
     * @param {EventBus} eventBus 
     */
    subscribeToEvents(eventBus) {
        // Base subscriptions
        const baseSubscriptions = [
            {
                eventType: 'system.shutdown',
                handler: this.handleSystemShutdown.bind(this),
                options: { priority: 100 }
            },
            {
                eventType: 'system.config.updated',
                handler: this.handleConfigUpdate.bind(this),
                options: { priority: 50 }
            }
        ];
        
        // Custom subscriptions
        const customSubscriptions = this.getEventSubscriptions();
        
        // Bulk subscribe
        this.bulkSubscribe(eventBus, [...baseSubscriptions, ...customSubscriptions]);
    }

    /**
     * Get custom event subscriptions (override in subclass)
     * @returns {Array} Event subscriptions
     */
    getEventSubscriptions() {
        // Override this method to define custom event subscriptions
        return [
            // Example:
            // {
            //     eventType: '{{MODULE_NAME_LOWER}}.custom.event',
            //     handler: this.handleCustomEvent.bind(this),
            //     options: { priority: 100 }
            // }
        ];
    }

    /**
     * Handle system shutdown
     */
    async handleSystemShutdown(event) {
        console.log(`${this.name} received shutdown signal`);
        await this.stop();
    }

    /**
     * Handle configuration updates
     */
    async handleConfigUpdate(event) {
        const { module, config } = event.payload;
        
        if (module === this.name || module === 'all') {
            console.log(`${this.name} updating configuration`);
            await this.updateConfig(config);
        }
    }

    // === SERVICE MANAGEMENT ===

    /**
     * Initialize services (override in subclass)
     */
    async initializeServices() {
        // Override this method to initialize services
        console.log(`${this.name} initializing services...`);
    }

    /**
     * Start services
     */
    async startServices() {
        for (const [name, service] of this.services.entries()) {
            if (typeof service.start === 'function') {
                await service.start();
                console.log(`Service ${name} started in ${this.name}`);
            }
        }
    }

    /**
     * Stop services
     */
    async stopServices() {
        for (const [name, service] of this.services.entries()) {
            if (typeof service.stop === 'function') {
                await service.stop();
                console.log(`Service ${name} stopped in ${this.name}`);
            }
        }
    }

    // === CUSTOM HOOKS (Override in subclass) ===

    /**
     * Custom initialization logic
     */
    async customInitialization() {
        // Override this method for custom initialization
    }

    /**
     * Custom start logic
     */
    async customStart() {
        // Override this method for custom start logic
    }

    /**
     * Custom stop logic  
     */
    async customStop() {
        // Override this method for custom cleanup
    }

    // === UTILITY METHODS ===

    /**
     * Get module information
     */
    getModuleInfo() {
        return {
            ...super.getModuleInfo(),
            author: this.author,
            description: '{{DESCRIPTION}}',
            services: Array.from(this.services.keys()),
            eventHandlers: Array.from(this.eventHandlers.keys()),
            metrics: this.getMetrics()
        };
    }

    /**
     * Get module metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: this.getUptime(),
            status: this.status,
            servicesCount: this.services.size,
            eventHandlersCount: this.eventHandlers.size
        };
    }

    /**
     * Health check
     */
    getHealth() {
        const health = super.getHealth();
        
        // Add module-specific health checks
        health.services = {};
        for (const [name, service] of this.services.entries()) {
            health.services[name] = typeof service.getHealth === 'function' 
                ? service.getHealth() 
                : { status: 'unknown' };
        }
        
        return health;
    }
}

module.exports = {{MODULE_NAME}}Module;
```

### 2. module.service.template.js - Service Layer Template
```javascript
// File: app/tools/templates/module.service.template.js
// {{MODULE_NAME}}Service.js - Auto-generated service layer
// Generated on: {{TIMESTAMP}}

const IService = require('../../contracts/IService');

/**
 * {{MODULE_NAME}}Service - Business logic for {{MODULE_NAME}}Module
 * Version: {{VERSION}}
 */
class {{MODULE_NAME}}Service extends IService {
    constructor(config = {}) {
        super();
        this.config = config;
        this.name = '{{MODULE_NAME}}Service';
        
        // Register operations
        this.registerOperations();
        
        // Add middleware
        this.setupMiddleware();
        
        console.log(`🔧 ${this.name} service constructed`);
    }

    /**
     * Initialize the service
     */
    async initialize(config) {
        this.config = { ...this.config, ...config };
        
        // Custom initialization
        await this.customInitialization();
        
        this.isInitialized = true;
        console.log(`✅ ${this.name} service initialized`);
    }

    /**
     * Register service operations
     */
    registerOperations() {
        // Register operations here
        this.registerOperation('example', this.exampleOperation.bind(this));
        
        // Add more operations by overriding this method
        this.registerCustomOperations();
    }

    /**
     * Register custom operations (override in subclass)
     */
    registerCustomOperations() {
        // Override this method to register custom operations
    }

    /**
     * Setup middleware pipeline
     */
    setupMiddleware() {
        // Add logging middleware
        this.addMiddleware(async (params, context) => {
            console.log(`Service operation called:`, { 
                service: this.name, 
                operation: context.operation,
                timestamp: new Date().toISOString()
            });
            return params;
        });
        
        // Add validation middleware
        this.addMiddleware(async (params, context) => {
            if (!params) {
                throw new Error('Operation parameters are required');
            }
            return params;
        });
    }

    /**
     * Example operation
     */
    async exampleOperation(params, context) {
        // Implement your business logic here
        console.log(`Executing example operation in ${this.name}`);
        
        return {
            success: true,
            result: 'Operation completed',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Custom initialization (override in subclass)
     */
    async customInitialization() {
        // Override for custom initialization
    }

    /**
     * Service-specific health check
     */
    async healthCheck() {
        const baseHealth = await super.healthCheck();
        
        // Add service-specific health checks
        return {
            ...baseHealth,
            customHealthCheck: await this.customHealthCheck()
        };
    }

    /**
     * Custom health check (override in subclass)
     */
    async customHealthCheck() {
        return { status: 'healthy' };
    }
}

module.exports = {{MODULE_NAME}}Service;
```

### 3. module.test.template.js - Test Template
```javascript
// File: app/tools/templates/module.test.template.js
// {{MODULE_NAME}}Module.test.js - Auto-generated tests
// Generated on: {{TIMESTAMP}}

const {{MODULE_NAME}}Module = require('../{{MODULE_NAME}}Module');
const MockEventBus = require('../../../test/mocks/MockEventBus');
const MockKernel = require('../../../test/mocks/MockKernel');

describe('{{MODULE_NAME}}Module', () => {
    let module;
    let mockEventBus;
    let mockContext;

    beforeEach(() => {
        mockEventBus = new MockEventBus();
        mockContext = {
            eventBus: mockEventBus,
            config: {
                {{MODULE_NAME_LOWER}}: {
                    enabled: true,
                    // Add test configuration
                }
            },
            kernel: new MockKernel()
        };
        
        module = new {{MODULE_NAME}}Module();
    });

    afterEach(async () => {
        if (module.status === 'running') {
            await module.stop();
        }
    });

    describe('Constructor', () => {
        it('should initialize with correct name and version', () => {
            expect(module.name).toBe('{{MODULE_NAME}}Module');
            expect(module.version).toBe('{{VERSION}}');
            expect(module.status).toBe('uninitialized');
        });
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            await module.initialize(mockContext);
            
            expect(module.status).toBe('ready');
            expect(module.isInitialized).toBe(true);
            expect(module.context).toBe(mockContext);
        });

        it('should handle initialization errors', async () => {
            // Mock an initialization error
            module.customInitialization = jest.fn().mockRejectedValue(new Error('Init failed'));
            
            await expect(module.initialize(mockContext)).rejects.toThrow('Init failed');
            expect(module.status).toBe('error');
        });
    });

    describe('Lifecycle', () => {
        beforeEach(async () => {
            await module.initialize(mockContext);
        });

        it('should start successfully', async () => {
            await module.start();
            
            expect(module.status).toBe('running');
            expect(module.startTime).toBeDefined();
        });

        it('should stop successfully', async () => {
            await module.start();
            await module.stop();
            
            expect(module.status).toBe('stopped');
        });

        it('should not start if not initialized', async () => {
            const uninitializedModule = new {{MODULE_NAME}}Module();
            
            await expect(uninitializedModule.start()).rejects.toThrow();
        });
    });

    describe('Event Handling', () => {
        beforeEach(async () => {
            await module.initialize(mockContext);
        });

        it('should subscribe to events', () => {
            module.subscribeToEvents(mockEventBus);
            
            expect(mockEventBus.subscriptions.size).toBeGreaterThan(0);
            expect(mockEventBus.subscriptions.has('system.shutdown')).toBe(true);
        });

        it('should handle system shutdown', async () => {
            await module.start();
            
            await module.handleSystemShutdown({
                type: 'system.shutdown',
                payload: { reason: 'test' }
            });
            
            expect(module.status).toBe('stopped');
        });

        it('should handle config updates', async () => {
            const newConfig = { testSetting: 'newValue' };
            
            await module.handleConfigUpdate({
                type: 'system.config.updated',
                payload: { module: module.name, config: newConfig }
            });
            
            expect(module.config.testSetting).toBe('newValue');
        });
    });

    describe('Health and Metrics', () => {
        beforeEach(async () => {
            await module.initialize(mockContext);
        });

        it('should return module info', () => {
            const info = module.getModuleInfo();
            
            expect(info.name).toBe('{{MODULE_NAME}}Module');
            expect(info.version).toBe('{{VERSION}}');
            expect(info.author).toBe('{{AUTHOR}}');
        });

        it('should return health status', () => {
            const health = module.getHealth();
            
            expect(health.status).toBe('ready');
            expect(health.uptime).toBeDefined();
        });

        it('should track metrics', async () => {
            await module.start();
            
            const metrics = module.getMetrics();
            
            expect(metrics.initialized).toBeDefined();
            expect(metrics.started).toBeDefined();
        });
    });

    describe('Custom Operations', () => {
        beforeEach(async () => {
            await module.initialize(mockContext);
        });

        // Add tests for custom module operations
        it('should handle custom operations', () => {
            // Add custom test cases based on module functionality
            expect(true).toBe(true); // Placeholder
        });
    });
});
```

### 4. module.config.template.js - Configuration Template
```javascript
// File: app/tools/templates/module.config.template.js
// {{MODULE_NAME_LOWER}}.config.js - Auto-generated configuration
// Generated on: {{TIMESTAMP}}

/**
 * {{MODULE_NAME}}Module Configuration
 * Version: {{VERSION}}
 */
const {{MODULE_NAME}}Config = {
    // Module identification
    name: '{{MODULE_NAME}}Module',
    version: '{{VERSION}}',
    enabled: true,
    
    // Module dependencies
    dependencies: [{{#each DEPENDENCIES}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}],
    
    // Load priority (higher = loads earlier)
    priority: {{PRIORITY}},
    
    // Module-specific configuration
    settings: {
        // Add module-specific settings here
        debug: false,
        maxRetries: 3,
        timeout: 30000,
        
        // Feature flags
        features: {
            advancedMode: false,
            experimental: false
        }
    },
    
    // Service configuration
    services: {
        // Add service-specific configuration
    },
    
    // Event configuration
    events: {
        // Events this module emits
        emits: [
            '{{MODULE_NAME_LOWER}}.initialized',
            '{{MODULE_NAME_LOWER}}.started',
            '{{MODULE_NAME_LOWER}}.stopped',
            '{{MODULE_NAME_LOWER}}.error'
        ],
        
        // Events this module subscribes to
        subscribes: [
            'system.shutdown',
            'system.config.updated'
        ]
    },
    
    // API endpoints (if module exposes REST API)
    api: {
        basePath: '/api/{{MODULE_NAME_LOWER}}',
        endpoints: [
            // Define API endpoints here
        ]
    },
    
    // Storage configuration
    storage: {
        provider: 'default',
        options: {
            // Storage-specific options
        }
    },
    
    // Performance configuration
    performance: {
        maxMemoryUsage: '100MB',
        maxCpuUsage: 80, // percentage
        healthCheckInterval: 30000 // 30 seconds
    }
};

module.exports = {{MODULE_NAME}}Config;
```

## DEVELOPMENT UTILITIES

### ModuleValidator.js - Module Validation Utility
```javascript
// File: app/tools/ModuleValidator.js
const ContractValidator = require('../core/contracts/ContractValidator');

class ModuleValidator {
    static async validateNewModule(modulePath) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };
        
        try {
            // Load module
            const ModuleClass = require(modulePath);
            const moduleInstance = new ModuleClass();
            
            // Validate contract implementation
            const contractValidation = ContractValidator.validateModule(
                moduleInstance, 
                require('../core/contracts/IModule')
            );
            
            results.errors.push(...contractValidation.errors);
            results.warnings.push(...contractValidation.warnings);
            
            // Validate configuration
            const configPath = modulePath.replace('Module.js', '.config.js');
            if (await this.fileExists(configPath)) {
                const configValidation = await this.validateConfig(configPath);
                results.errors.push(...configValidation.errors);
                results.warnings.push(...configValidation.warnings);
            } else {
                results.warnings.push('No configuration file found');
            }
            
            // Validate tests
            const testPath = modulePath.replace('.js', '.test.js');
            if (await this.fileExists(testPath)) {
                const testValidation = await this.validateTests(testPath);
                results.suggestions.push(...testValidation.suggestions);
            } else {
                results.warnings.push('No test file found');
            }
            
            // Check documentation
            const docsPath = modulePath.replace('Module.js', 'README.md');
            if (!await this.fileExists(docsPath)) {
                results.suggestions.push('Consider adding README.md documentation');
            }
            
            results.valid = results.errors.length === 0;
            
        } catch (error) {
            results.valid = false;
            results.errors.push(`Module loading failed: ${error.message}`);
        }
        
        return results;
    }
    
    static async validateConfig(configPath) {
        // Validate configuration structure
        // Return validation results
    }
    
    static async validateTests(testPath) {
        // Validate test coverage and structure
        // Return validation results
    }
    
    static async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}
```

### ModuleScaffold.js - Complete Module Scaffolding
```javascript
// File: app/tools/ModuleScaffold.js
class ModuleScaffold {
    static async createComplete(config) {
        const generator = new ModuleGenerator();
        const validator = new ModuleValidator();
        
        // Generate module files
        const modulePath = await generator.generateModule(config);
        
        // Validate generated module
        const validation = await validator.validateNewModule(
            path.join(modulePath, `${config.name}Module.js`)
        );
        
        if (!validation.valid) {
            console.error('Generated module has validation errors:', validation.errors);
            throw new Error('Module generation failed validation');
        }
        
        // Create development environment
        await this.setupDevEnvironment(modulePath, config);
        
        // Generate initial documentation
        await this.generateDocumentation(modulePath, config);
        
        console.log(`🎉 Complete module scaffold created: ${config.name}`);
        console.log(`📁 Location: ${modulePath}`);
        console.log(`📋 Validation: ${validation.errors.length} errors, ${validation.warnings.length} warnings`);
        
        return {
            path: modulePath,
            validation,
            config
        };
    }
    
    static async setupDevEnvironment(modulePath, config) {
        // Create development-specific files
        // - VS Code settings
        // - Debug configuration
        // - Hot reload setup
    }
    
    static async generateDocumentation(modulePath, config) {
        // Generate README.md
        // Generate API documentation
        // Generate usage examples
    }
}
```

Questi template e utilities permettono di creare rapidamente nuovi moduli che seguono rigorosamente i contratti di interfaccia e i principi architetturali, garantendo coerenza e qualità nell'espansione del sistema modulare.