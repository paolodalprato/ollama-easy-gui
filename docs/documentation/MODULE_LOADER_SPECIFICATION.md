# MODULE LOADER SPECIFICATION - OllamaGUI

## DYNAMIC MODULE LOADING SYSTEM

Il Module Loader implementa un sistema di caricamento dinamico dei moduli con gestione delle dipendenze, hot-reloading e validazione dei contratti.

## MODULE LOADER IMPLEMENTATION

### ModuleLoader.js - Core Implementation
```javascript
// app/core/kernel/ModuleLoader.js
const path = require('path');
const fs = require('fs').promises;
const { createRequire } = require('module');
const EventEmitter = require('events');

class ModuleLoader extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.loadedModules = new Map();           // moduleName -> moduleInstance
        this.moduleConfigs = new Map();          // moduleName -> config
        this.dependencyGraph = new Map();        // moduleName -> [dependencies]
        this.loadingPromises = new Map();        // moduleName -> Promise
        this.moduleRequireCache = new Map();     // For hot reloading
        
        this.options = {
            baseDir: options.baseDir || './modules',
            enableHotReload: options.enableHotReload || false,
            strictValidation: options.strictValidation || true,
            maxLoadTime: options.maxLoadTime || 30000,
            retryAttempts: options.retryAttempts || 3
        };
        
        this.stats = {
            modulesLoaded: 0,
            loadingErrors: 0,
            hotReloads: 0,
            startTime: new Date()
        };
        
        // File watchers for hot reload
        this.fileWatchers = new Map();
        
        console.log('📦 ModuleLoader initialized with options:', this.options);
    }

    // === MODULE LOADING ===
    
    async loadModule(moduleConfig, context = null) {
        const { name, path: modulePath, dependencies = [] } = moduleConfig;
        
        // Validate configuration
        this.validateModuleConfig(moduleConfig);
        
        // Check if already loaded
        if (this.loadedModules.has(name)) {
            console.log(`📦 Module ${name} already loaded, returning existing instance`);
            return this.loadedModules.get(name);
        }
        
        // Check if currently loading
        if (this.loadingPromises.has(name)) {
            console.log(`📦 Module ${name} currently loading, waiting...`);
            return await this.loadingPromises.get(name);
        }

        // Start loading process
        const loadingPromise = this.performModuleLoad(moduleConfig, context);
        this.loadingPromises.set(name, loadingPromise);
        
        try {
            const module = await loadingPromise;
            this.stats.modulesLoaded++;
            console.log(`✅ Module ${name} loaded successfully`);
            return module;
        } catch (error) {
            this.stats.loadingErrors++;
            console.error(`❌ Failed to load module ${name}:`, error);
            throw error;
        } finally {
            this.loadingPromises.delete(name);
        }
    }

    async performModuleLoad(moduleConfig, context) {
        const { name, path: modulePath, dependencies, version } = moduleConfig;
        
        try {
            // Store config
            this.moduleConfigs.set(name, moduleConfig);
            
            // Build dependency graph
            this.buildDependencyGraph(name, dependencies);
            
            // Load dependencies first
            if (dependencies && dependencies.length > 0) {
                await this.loadDependencies(name, dependencies, context);
            }
            
            // Resolve module path
            const resolvedPath = await this.resolveModulePath(modulePath);
            
            // Load module class with timeout
            const ModuleClass = await this.loadModuleClass(resolvedPath, name);
            
            // Validate module contract
            if (this.options.strictValidation) {
                this.validateModuleContract(ModuleClass, name);
            }
            
            // Instantiate module
            const moduleInstance = new ModuleClass();
            
            // Store module
            this.loadedModules.set(name, moduleInstance);
            
            // Setup hot reloading if enabled
            if (this.options.enableHotReload) {
                await this.setupHotReload(name, resolvedPath);
            }
            
            // Emit loaded event
            this.emit('moduleLoaded', { name, version, path: resolvedPath });
            
            return moduleInstance;
            
        } catch (error) {
            // Clean up on failure
            this.cleanupFailedLoad(name);
            throw new Error(`Failed to load module ${name}: ${error.message}`);
        }
    }

    async loadModuleClass(modulePath, moduleName) {
        const timeout = this.options.maxLoadTime;
        
        return Promise.race([
            this.dynamicImportModule(modulePath),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`Module loading timeout: ${moduleName}`)), timeout)
            )
        ]);
    }

    async dynamicImportModule(modulePath) {
        try {
            // Clear require cache for hot reloading
            if (this.moduleRequireCache.has(modulePath)) {
                delete require.cache[require.resolve(modulePath)];
                this.moduleRequireCache.delete(modulePath);
            }
            
            // Dynamic import
            let ModuleExport;
            
            if (modulePath.endsWith('.mjs') || this.isESModule(modulePath)) {
                // ES Module
                const module = await import(modulePath);
                ModuleExport = module.default || module;
            } else {
                // CommonJS Module
                ModuleExport = require(modulePath);
            }
            
            // Store in cache
            this.moduleRequireCache.set(modulePath, ModuleExport);
            
            return ModuleExport;
            
        } catch (error) {
            throw new Error(`Failed to import module at ${modulePath}: ${error.message}`);
        }
    }

    async isESModule(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return content.includes('export') || content.includes('import');
        } catch {
            return false;
        }
    }

    // === DEPENDENCY MANAGEMENT ===
    
    buildDependencyGraph(moduleName, dependencies) {
        this.dependencyGraph.set(moduleName, dependencies || []);
        
        // Check for circular dependencies
        this.detectCircularDependencies(moduleName);
    }

    detectCircularDependencies(moduleName, visited = new Set(), path = []) {
        if (visited.has(moduleName)) {
            const cycle = path.slice(path.indexOf(moduleName)).concat(moduleName);
            throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
        }
        
        visited.add(moduleName);
        path.push(moduleName);
        
        const dependencies = this.dependencyGraph.get(moduleName) || [];
        for (const dependency of dependencies) {
            this.detectCircularDependencies(dependency, visited, path);
        }
        
        visited.delete(moduleName);
        path.pop();
    }

    async loadDependencies(moduleName, dependencies, context) {
        const loadPromises = dependencies.map(async (depName) => {
            const depConfig = this.findModuleConfig(depName);
            if (!depConfig) {
                throw new Error(`Dependency ${depName} not found in configuration`);
            }
            
            return await this.loadModule(depConfig, context);
        });
        
        try {
            await Promise.all(loadPromises);
            console.log(`📦 All dependencies loaded for ${moduleName}`);
        } catch (error) {
            throw new Error(`Failed to load dependencies for ${moduleName}: ${error.message}`);
        }
    }

    // === HOT RELOADING ===
    
    async setupHotReload(moduleName, modulePath) {
        if (this.fileWatchers.has(moduleName)) {
            return; // Already watching
        }
        
        try {
            const { watch } = await import('chokidar');
            
            const watcher = watch(modulePath, { ignoreInitial: true });
            
            watcher.on('change', async () => {
                console.log(`🔄 Hot reloading module: ${moduleName}`);
                
                try {
                    await this.hotReloadModule(moduleName);
                    this.stats.hotReloads++;
                    this.emit('moduleReloaded', { name: moduleName, path: modulePath });
                } catch (error) {
                    console.error(`❌ Hot reload failed for ${moduleName}:`, error);
                    this.emit('reloadError', { name: moduleName, error: error.message });
                }
            });
            
            this.fileWatchers.set(moduleName, watcher);
            console.log(`👀 Watching ${moduleName} for changes`);
            
        } catch (error) {
            console.warn(`⚠️ Hot reload setup failed for ${moduleName}: ${error.message}`);
        }
    }

    async hotReloadModule(moduleName) {
        const moduleConfig = this.moduleConfigs.get(moduleName);
        const existingModule = this.loadedModules.get(moduleName);
        
        if (!moduleConfig || !existingModule) {
            throw new Error(`Cannot hot reload ${moduleName}: module not found`);
        }
        
        try {
            // Stop existing module
            if (typeof existingModule.stop === 'function') {
                await existingModule.stop();
            }
            
            // Remove from loaded modules
            this.loadedModules.delete(moduleName);
            
            // Reload module
            const newModule = await this.performModuleLoad(moduleConfig, existingModule.context);
            
            // Initialize new module
            if (typeof newModule.initialize === 'function') {
                await newModule.initialize(existingModule.context);
            }
            
            // Start new module
            if (typeof newModule.start === 'function') {
                await newModule.start();
            }
            
            console.log(`🔄 Successfully hot reloaded ${moduleName}`);
            
        } catch (error) {
            // Rollback on failure
            this.loadedModules.set(moduleName, existingModule);
            throw error;
        }
    }

    // === VALIDATION ===
    
    validateModuleConfig(config) {
        const required = ['name', 'path'];
        const missing = required.filter(field => !config[field]);
        
        if (missing.length > 0) {
            throw new Error(`Module config missing required fields: ${missing.join(', ')}`);
        }
        
        if (typeof config.name !== 'string' || config.name.length === 0) {
            throw new Error('Module name must be a non-empty string');
        }
        
        if (typeof config.path !== 'string') {
            throw new Error('Module path must be a string');
        }
    }

    validateModuleContract(ModuleClass, moduleName) {
        if (typeof ModuleClass !== 'function') {
            throw new Error(`Module ${moduleName} must export a constructor function`);
        }
        
        const requiredMethods = ['initialize', 'start', 'stop', 'subscribeToEvents'];
        const prototype = ModuleClass.prototype;
        
        const missingMethods = requiredMethods.filter(method => 
            typeof prototype[method] !== 'function'
        );
        
        if (missingMethods.length > 0) {
            throw new Error(
                `Module ${moduleName} missing required methods: ${missingMethods.join(', ')}`
            );
        }
        
        // Check if implements getModuleInfo
        if (typeof prototype.getModuleInfo !== 'function') {
            console.warn(`⚠️ Module ${moduleName} should implement getModuleInfo() method`);
        }
    }

    // === UTILITY METHODS ===
    
    async resolveModulePath(modulePath) {
        // Handle relative paths
        if (!path.isAbsolute(modulePath)) {
            modulePath = path.resolve(this.options.baseDir, modulePath);
        }
        
        // Check if file exists
        try {
            await fs.access(modulePath);
            return modulePath;
        } catch {
            throw new Error(`Module file not found: ${modulePath}`);
        }
    }

    findModuleConfig(moduleName) {
        return this.moduleConfigs.get(moduleName);
    }

    cleanupFailedLoad(moduleName) {
        this.loadedModules.delete(moduleName);
        this.moduleConfigs.delete(moduleName);
        this.dependencyGraph.delete(moduleName);
        
        // Close file watcher if exists
        const watcher = this.fileWatchers.get(moduleName);
        if (watcher) {
            watcher.close();
            this.fileWatchers.delete(moduleName);
        }
    }

    // === MODULE LIFECYCLE ===
    
    async unloadModule(moduleName) {
        const module = this.loadedModules.get(moduleName);
        if (!module) {
            console.warn(`⚠️ Module ${moduleName} not loaded`);
            return false;
        }
        
        try {
            // Stop module
            if (typeof module.stop === 'function') {
                await module.stop();
            }
            
            // Cleanup
            this.cleanupFailedLoad(moduleName);
            
            this.emit('moduleUnloaded', { name: moduleName });
            console.log(`🗑️ Module ${moduleName} unloaded successfully`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error unloading module ${moduleName}:`, error);
            return false;
        }
    }

    async reloadModule(moduleName) {
        const config = this.moduleConfigs.get(moduleName);
        if (!config) {
            throw new Error(`Cannot reload ${moduleName}: config not found`);
        }
        
        await this.unloadModule(moduleName);
        return await this.loadModule(config);
    }

    getLoadedModules() {
        return Array.from(this.loadedModules.keys());
    }

    getModuleInfo(moduleName) {
        const module = this.loadedModules.get(moduleName);
        if (!module) return null;
        
        const config = this.moduleConfigs.get(moduleName);
        
        return {
            name: moduleName,
            config,
            dependencies: this.dependencyGraph.get(moduleName) || [],
            info: typeof module.getModuleInfo === 'function' ? module.getModuleInfo() : {},
            loaded: true
        };
    }

    getDependencyGraph() {
        const graph = {};
        for (const [module, deps] of this.dependencyGraph.entries()) {
            graph[module] = deps;
        }
        return graph;
    }

    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime.getTime(),
            loadedModulesCount: this.loadedModules.size,
            watchersCount: this.fileWatchers.size
        };
    }

    // === SHUTDOWN ===
    
    async shutdown() {
        console.log('🛑 ModuleLoader shutting down...');
        
        // Stop all modules
        const unloadPromises = Array.from(this.loadedModules.keys()).map(name => 
            this.unloadModule(name)
        );
        
        await Promise.allSettled(unloadPromises);
        
        // Close all file watchers
        for (const watcher of this.fileWatchers.values()) {
            await watcher.close();
        }
        this.fileWatchers.clear();
        
        // Clear all maps
        this.loadedModules.clear();
        this.moduleConfigs.clear();
        this.dependencyGraph.clear();
        this.loadingPromises.clear();
        this.moduleRequireCache.clear();
        
        console.log('✅ ModuleLoader shutdown complete');
    }
}

module.exports = ModuleLoader;
```

## MODULE LOADING STRATEGIES

### Estrategie di Caricamento
```javascript
// Strategy Pattern per diverse modalità di caricamento
class ModuleLoadingStrategy {
    static strategies = {
        // Caricamento sequenziale - più sicuro
        sequential: async (modules, loader, context) => {
            const loaded = [];
            for (const moduleConfig of modules) {
                const module = await loader.loadModule(moduleConfig, context);
                loaded.push(module);
            }
            return loaded;
        },
        
        // Caricamento parallelo - più veloce
        parallel: async (modules, loader, context) => {
            const promises = modules.map(config => 
                loader.loadModule(config, context)
            );
            return await Promise.all(promises);
        },
        
        // Caricamento lazy - carica solo quando necessario
        lazy: async (modules, loader, context) => {
            const lazyModules = new Map();
            
            for (const moduleConfig of modules) {
                lazyModules.set(moduleConfig.name, async () => {
                    return await loader.loadModule(moduleConfig, context);
                });
            }
            
            return lazyModules;
        },
        
        // Caricamento prioritario
        priority: async (modules, loader, context) => {
            // Ordina per priorità
            const sorted = modules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            
            const highPriority = sorted.filter(m => (m.priority || 0) >= 100);
            const normalPriority = sorted.filter(m => (m.priority || 0) < 100);
            
            // Carica alta priorità in sequenza
            const highLoaded = [];
            for (const config of highPriority) {
                highLoaded.push(await loader.loadModule(config, context));
            }
            
            // Carica normale priorità in parallelo
            const normalLoaded = await Promise.all(
                normalPriority.map(config => loader.loadModule(config, context))
            );
            
            return [...highLoaded, ...normalLoaded];
        }
    };
    
    static async execute(strategy, modules, loader, context) {
        const strategyFn = this.strategies[strategy];
        if (!strategyFn) {
            throw new Error(`Unknown loading strategy: ${strategy}`);
        }
        
        console.log(`📦 Loading ${modules.length} modules with ${strategy} strategy`);
        const startTime = performance.now();
        
        try {
            const result = await strategyFn(modules, loader, context);
            const duration = performance.now() - startTime;
            console.log(`✅ Modules loaded in ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`❌ Module loading failed after ${duration.toFixed(2)}ms:`, error);
            throw error;
        }
    }
}

module.exports = ModuleLoadingStrategy;
```

## MODULE REGISTRY

### ModuleRegistry.js - Central Module Registration
```javascript
class ModuleRegistry {
    constructor() {
        this.registry = new Map();
        this.aliases = new Map();
        this.versions = new Map();
    }
    
    register(moduleName, moduleInstance, version = '1.0.0') {
        // Store module
        this.registry.set(moduleName, moduleInstance);
        
        // Store version info
        if (!this.versions.has(moduleName)) {
            this.versions.set(moduleName, []);
        }
        this.versions.get(moduleName).push({
            version,
            instance: moduleInstance,
            registeredAt: new Date()
        });
        
        console.log(`📋 Module ${moduleName}@${version} registered`);
    }
    
    get(moduleName) {
        // Check direct name
        if (this.registry.has(moduleName)) {
            return this.registry.get(moduleName);
        }
        
        // Check alias
        const aliasName = this.aliases.get(moduleName);
        if (aliasName && this.registry.has(aliasName)) {
            return this.registry.get(aliasName);
        }
        
        return null;
    }
    
    addAlias(alias, moduleName) {
        if (!this.registry.has(moduleName)) {
            throw new Error(`Cannot create alias for unregistered module: ${moduleName}`);
        }
        
        this.aliases.set(alias, moduleName);
        console.log(`🏷️ Alias ${alias} -> ${moduleName} created`);
    }
    
    list() {
        return Array.from(this.registry.keys());
    }
    
    getVersions(moduleName) {
        return this.versions.get(moduleName) || [];
    }
}

module.exports = ModuleRegistry;
```

Questo Module Loader fornisce un sistema robusto e flessibile per il caricamento dinamico dei moduli con supporto completo per dipendenze, hot-reloading e strategie di caricamento multiple.