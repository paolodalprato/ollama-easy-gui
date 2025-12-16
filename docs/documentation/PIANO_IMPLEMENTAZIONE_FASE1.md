# PIANO IMPLEMENTAZIONE GRADUALE - FASE 1
## Dual Architecture Strategy per Refactoring Zero-Downtime

## APPROCCIO STRATEGICO

La FASE 1 implementa una **Dual Architecture** dove il sistema legacy e quello modulare coesistono permettendo:

1. **Zero interruzioni di servizio** - Sistema esistente rimane funzionale
2. **Migrazione incrementale** - Un modulo alla volta
3. **Rollback immediato** - In caso di problemi
4. **Testing parallelo** - Verifica continua del nuovo sistema
5. **Adozione graduale** - Utenti possono scegliere quale usare

## ARCHITETTURA DUAL-SYSTEM

```
OllamaGUI/
├── app/
│   ├── core/                          # 🆕 NUOVO SISTEMA MODULARE
│   │   ├── kernel/                    # Micro-kernel
│   │   ├── contracts/                 # Interface contracts
│   │   └── modules/                   # Modular implementations
│   │       ├── chat/
│   │       ├── ollama/
│   │       ├── ui/
│   │       └── storage/
│   │
│   ├── legacy/                        # 🔄 SISTEMA LEGACY MANTENUTO
│   │   ├── backend/                   # Struttura attuale preserved
│   │   └── frontend/                  # Struttura attuale preserved
│   │
│   ├── bridge/                        # 🌉 BRIDGE LAYER
│   │   ├── LegacyBridge.js           # Bridge legacy <-> modular
│   │   ├── APICompatibility.js       # API compatibility layer
│   │   └── DataMigration.js          # Data migration utilities
│   │
│   └── runtime/                       # 🎛️ RUNTIME CONTROLLER
│       ├── SystemSelector.js         # Choose legacy vs modular
│       ├── FeatureFlags.js           # Feature toggles
│       └── HealthMonitor.js          # System health monitoring
```

## FASI DI IMPLEMENTAZIONE

### STEP 1: INFRASTRUTTURA CORE (Settimana 1)
**Obiettivo**: Creare il micro-kernel funzionale

#### 1.1 Setup Directory Structure
```javascript
// Crea la struttura directory modulare
const createModularStructure = async () => {
    const dirs = [
        'app/core/kernel',
        'app/core/contracts', 
        'app/core/modules/chat',
        'app/core/modules/ollama',
        'app/core/modules/ui',
        'app/core/modules/storage',
        'app/bridge',
        'app/runtime'
    ];
    
    for (const dir of dirs) {
        await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    }
};
```

#### 1.2 Implementazione Kernel Core
```javascript
// File: app/core/kernel/Kernel.js
// Implementare il micro-kernel base con:
// - Event Bus inizializzato
// - Module Loader funzionante  
// - Config Manager base
// - Lifecycle management

// File: app/core/kernel/EventBus.js
// Event Bus completo dalla specification

// File: app/core/kernel/ModuleLoader.js  
// Module Loader completo dalla specification

// File: app/core/kernel/ConfigManager.js
// Configuration manager per moduli
```

#### 1.3 Contratti Base
```javascript
// File: app/core/contracts/IModule.js
// File: app/core/contracts/IEventHandler.js
// File: app/core/contracts/IService.js
// File: app/core/contracts/ContractValidator.js
// Implementare tutti i contratti dalla specification
```

#### 1.4 Runtime Controller
```javascript
// File: app/runtime/SystemSelector.js
class SystemSelector {
    constructor() {
        this.mode = process.env.OLLAMA_MODE || 'legacy'; // legacy | modular | hybrid
        this.featureFlags = new Map();
    }
    
    shouldUseLegacy(feature) {
        return this.mode === 'legacy' || 
               !this.featureFlags.get(`${feature}.enabled`);
    }
    
    shouldUseModular(feature) {
        return this.mode === 'modular' || 
               this.featureFlags.get(`${feature}.enabled`);
    }
}
```

**Deliverables Step 1**:
- [ ] Directory structure creata
- [ ] Kernel funzionante con test
- [ ] EventBus operativo
- [ ] ModuleLoader operativo
- [ ] Contratti definiti e validati
- [ ] Runtime controller funzionante

### STEP 2: PRIMO MODULO - STORAGE (Settimana 2)
**Obiettivo**: Migrare il sistema di storage mantenendo compatibilità

#### 2.1 Implementazione StorageModule
```javascript
// File: app/core/modules/storage/StorageModule.js
const IStorageModule = require('../../contracts/IStorageModule');
const ChatStorage = require('../../../legacy/backend/core/storage/ChatStorage');

class StorageModule extends IStorageModule {
    constructor() {
        super();
        this.name = 'StorageModule';
        this.version = '1.0.0';
        this.legacyStorage = null; // Bridge to legacy system
        this.nativeStorage = null; // New modular storage
        this.useNative = false;    // Feature flag
    }
    
    async initialize(context) {
        this.context = context;
        this.config = context.config;
        
        // Initialize legacy storage for compatibility
        this.legacyStorage = new ChatStorage();
        
        // Initialize native storage
        this.nativeStorage = new ModularStorageProvider(this.config.storage);
        
        // Check feature flag
        this.useNative = context.kernel.featureFlags.get('storage.useModular');
        
        this.status = 'ready';
        console.log(`📦 StorageModule initialized (using ${this.useNative ? 'native' : 'legacy'})`);
    }
    
    async store(key, data, options = {}) {
        if (this.useNative) {
            return await this.nativeStorage.store(key, data, options);
        } else {
            return await this.legacyStorageWrapper(key, data, options);
        }
    }
    
    // Bridge methods to legacy system
    async legacyStorageWrapper(key, data, options) {
        // Convert modular API calls to legacy API
        // This maintains backward compatibility
    }
}
```

#### 2.2 Bridge Layer per Storage
```javascript
// File: app/bridge/StorageBridge.js
class StorageBridge {
    constructor(legacyStorage, modularStorage) {
        this.legacy = legacyStorage;
        this.modular = modularStorage; 
        this.migrationStatus = new Map();
    }
    
    async migrateData(fromLegacy = true) {
        if (fromLegacy) {
            // Migrate from legacy to modular
            const legacyData = await this.legacy.getAllData();
            await this.modular.bulkImport(legacyData);
        } else {
            // Rollback from modular to legacy
            const modularData = await this.modular.export();
            await this.legacy.bulkImport(modularData);
        }
    }
}
```

#### 2.3 Feature Flag Implementation
```javascript
// File: app/runtime/FeatureFlags.js
class FeatureFlags {
    constructor() {
        this.flags = new Map();
        this.loadFromConfig();
    }
    
    enable(flag) {
        this.flags.set(flag, true);
        this.persistToConfig();
        console.log(`🚀 Feature enabled: ${flag}`);
    }
    
    disable(flag) {
        this.flags.set(flag, false);
        this.persistToConfig();
        console.log(`🔄 Feature disabled: ${flag}`);
    }
    
    isEnabled(flag) {
        return this.flags.get(flag) || false;
    }
}
```

**Deliverables Step 2**:
- [ ] StorageModule implementato e testato
- [ ] Bridge layer funzionante
- [ ] Feature flags operativi
- [ ] Migrazione dati automatica
- [ ] Rollback testato e funzionante

### STEP 3: SECONDO MODULO - OLLAMA (Settimana 3)  
**Obiettivo**: Modularizzare l'integrazione Ollama

#### 3.1 OllamaModule Implementation
```javascript
// File: app/core/modules/ollama/OllamaModule.js
const IOllamaModule = require('../../contracts/IOllamaModule');

class OllamaModule extends IOllamaModule {
    constructor() {
        super();
        this.name = 'OllamaModule';
        this.legacyManager = null;
        this.modernManager = null;
    }
    
    async initialize(context) {
        // Dual implementation: legacy + modern
        this.legacyManager = require('../../../legacy/backend/core/ollama/OllamaManager');
        this.modernManager = new ModernOllamaManager(context.config.ollama);
        
        // Subscribe to events
        this.subscribeToEvents(context.eventBus);
    }
    
    subscribeToEvents(eventBus) {
        eventBus.subscribe('ollama.start.requested', this.handleStartRequest.bind(this));
        eventBus.subscribe('chat.message.sent', this.handleChatMessage.bind(this));
    }
    
    async handleStartRequest(event) {
        const result = await this.startOllama();
        
        await this.context.eventBus.emit('ollama.status.changed', {
            status: result ? 'running' : 'error',
            message: result ? 'Ollama started successfully' : 'Failed to start Ollama',
            timestamp: new Date().toISOString()
        });
    }
}
```

#### 3.2 API Compatibility Layer
```javascript
// File: app/bridge/APICompatibility.js
class APICompatibility {
    constructor(legacyRouter, modularKernel) {
        this.legacy = legacyRouter;
        this.kernel = modularKernel;
        this.routeMap = new Map();
    }
    
    // Map legacy API routes to modular events
    setupRouteMapping() {
        this.routeMap.set('POST /api/ollama/start', {
            event: 'ollama.start.requested',
            handler: 'ollamaModule'
        });
        
        this.routeMap.set('GET /api/ollama/status', {
            event: 'ollama.status.requested', 
            handler: 'ollamaModule'
        });
    }
    
    async handleLegacyRequest(method, path, req, res) {
        const routeKey = `${method} ${path}`;
        const mapping = this.routeMap.get(routeKey);
        
        if (mapping && this.kernel.isModularEnabled()) {
            // Route to modular system
            const result = await this.kernel.eventBus.emit(mapping.event, {
                request: req,
                source: 'legacy-api'
            });
            
            res.json(result);
        } else {
            // Route to legacy system
            return false; // Let legacy handle it
        }
    }
}
```

**Deliverables Step 3**:
- [ ] OllamaModule implementato
- [ ] API compatibility layer funzionante
- [ ] Eventi Ollama mappati
- [ ] Legacy fallback operativo

### STEP 4: TERZO MODULO - CHAT (Settimana 4)
**Obiettivo**: Modularizzare la gestione chat

#### 4.1 ChatModule Implementation
```javascript
// File: app/core/modules/chat/ChatModule.js
const IChatModule = require('../../contracts/IChatModule');

class ChatModule extends IChatModule {
    subscribeToEvents(eventBus) {
        const subscriptions = [
            {
                eventType: 'chat.message.sent',
                handler: this.handleMessageSent.bind(this),
                options: { priority: 100 }
            },
            {
                eventType: 'ollama.model.changed', 
                handler: this.handleModelChange.bind(this),
                options: { priority: 50 }
            }
        ];
        
        this.bulkSubscribe(eventBus, subscriptions);
    }
    
    async handleMessageSent(event) {
        const { chatId, message, model } = event.payload;
        
        // Process message
        const response = await this.processMessage(message, model);
        
        // Store in chat history
        await this.addMessageToHistory(chatId, message, response);
        
        // Emit response event
        await this.context.eventBus.emit('chat.message.received', {
            chatId,
            response,
            model,
            timestamp: new Date().toISOString()
        });
    }
}
```

**Deliverables Step 4**:
- [ ] ChatModule implementato
- [ ] Eventi chat mappati
- [ ] Integrazione con StorageModule
- [ ] Integrazione con OllamaModule

### STEP 5: UI MODULE E INTEGRAZIONE (Settimana 5)
**Obiettivo**: Modularizzare l'interfaccia utente

#### 5.1 UIModule Implementation
```javascript
// File: app/core/modules/ui/UIModule.js
class UIModule extends IModule {
    async initialize(context) {
        // Load existing UI components as modules
        this.chatInterface = new ModularChatInterface(context);
        this.modelManager = new ModularModelManager(context);
        this.statusIndicator = new ModularStatusIndicator(context);
        
        // Subscribe to UI events
        this.subscribeToEvents(context.eventBus);
    }
    
    subscribeToEvents(eventBus) {
        eventBus.subscribe('chat.message.received', this.updateChatUI.bind(this));
        eventBus.subscribe('ollama.status.changed', this.updateStatusUI.bind(this));
        eventBus.subscribe('ui.theme.change.requested', this.handleThemeChange.bind(this));
    }
}
```

#### 5.2 System Toggle Interface
```javascript
// File: app/runtime/SystemToggle.js
class SystemToggle {
    constructor() {
        this.currentMode = 'legacy';
        this.availableModes = ['legacy', 'modular', 'hybrid'];
    }
    
    async switchToModular() {
        try {
            // Initialize modular system
            await this.kernel.initialize();
            
            // Migrate current state  
            await this.bridge.migrateCurrentState();
            
            // Switch mode
            this.currentMode = 'modular';
            
            // Update UI
            this.updateModeIndicator();
            
            console.log('✅ Switched to modular system');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to switch to modular:', error);
            await this.rollbackToLegacy();
            return false;
        }
    }
    
    async rollbackToLegacy() {
        this.currentMode = 'legacy';
        await this.bridge.rollbackState();
        this.updateModeIndicator();
        console.log('🔄 Rolled back to legacy system');
    }
}
```

**Deliverables Step 5**:
- [ ] UIModule implementato
- [ ] System toggle UI
- [ ] Mode indicator
- [ ] Rollback interface

## TESTING STRATEGY

### Dual Testing Approach
```javascript
// File: tests/dual-system.test.js
describe('Dual System Testing', () => {
    it('should maintain API compatibility', async () => {
        // Test same endpoints work in both systems
        const legacyResponse = await legacyAPI.get('/api/chat/list');
        const modularResponse = await modularAPI.get('/api/chat/list'); 
        
        expect(legacyResponse.data).toEqual(modularResponse.data);
    });
    
    it('should migrate data correctly', async () => {
        // Test data migration is lossless
        const originalData = await legacyStorage.getAllData();
        await bridge.migrateToModular();
        const migratedData = await modularStorage.getAllData();
        
        expect(originalData).toEqual(migratedData);
    });
    
    it('should rollback successfully', async () => {
        // Test rollback restores exact state
        const preState = await captureSystemState();
        await systemToggle.switchToModular();
        await systemToggle.rollbackToLegacy();
        const postState = await captureSystemState();
        
        expect(preState).toEqual(postState);
    });
});
```

### Integration Testing
```javascript
// File: tests/integration.test.js
describe('Integration Testing', () => {
    it('should handle cross-system communication', async () => {
        // Test legacy -> modular -> legacy event flow
        await legacySystem.triggerChatMessage();
        await waitForEvent('chat.message.processed');
        const result = await legacySystem.getChatResponse();
        
        expect(result).toBeDefined();
    });
});
```

## MONITORING E HEALTH CHECKS

### System Health Monitor
```javascript
// File: app/runtime/HealthMonitor.js
class HealthMonitor {
    constructor() {
        this.legacyHealth = new LegacyHealthChecker();
        this.modularHealth = new ModularHealthChecker();
        this.alerts = [];
    }
    
    async runHealthCheck() {
        const results = {
            legacy: await this.legacyHealth.check(),
            modular: await this.modularHealth.check(),
            bridge: await this.bridgeHealth.check(),
            timestamp: new Date().toISOString()
        };
        
        // Detect issues
        this.detectIssues(results);
        
        return results;
    }
    
    detectIssues(results) {
        if (!results.legacy.healthy && this.currentMode === 'legacy') {
            this.alert('CRITICAL: Legacy system unhealthy');
        }
        
        if (!results.modular.healthy && this.currentMode === 'modular') {
            this.alert('CRITICAL: Modular system unhealthy');
        }
        
        if (!results.bridge.healthy) {
            this.alert('WARNING: Bridge layer issues detected');
        }
    }
}
```

## SUCCESS METRICS

### FASE 1 Success Criteria:
- [ ] **Zero Downtime**: Sistema funziona durante migrazione
- [ ] **Data Integrity**: Nessuna perdita di dati
- [ ] **API Compatibility**: Tutti gli endpoint legacy funzionano
- [ ] **Performance**: Nessun degrado delle performance
- [ ] **Rollback Capability**: Rollback completo in <30 secondi
- [ ] **User Experience**: UX identica o migliore
- [ ] **Test Coverage**: >90% test coverage su entrambi i sistemi

### Monitoring Dashboard
- Sistema attivo (Legacy/Modular/Hybrid)
- Health status di tutti i moduli
- Performance metrics comparison
- Error rates per system
- Migration progress
- Rollback history

La FASE 1 stabilisce la base solida per una migrazione graduale senza rischi, permettendo di validare ogni componente prima di procedere con la migrazione completa.