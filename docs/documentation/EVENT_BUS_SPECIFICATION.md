# EVENT BUS SPECIFICATION - OllamaGUI

## ARCHITETTURA EVENT-DRIVEN

L'Event Bus rappresenta il cuore della comunicazione inter-modulare, implementando un pattern publish-subscribe type-safe con middleware pipeline.

## EVENT BUS CORE IMPLEMENTATION

### EventBus.js - Implementazione Completa
```javascript
// app/core/kernel/EventBus.js
const EventSchemas = require('../contracts/events.schema.js');
const { v4: uuidv4 } = require('uuid');

class EventBus {
    constructor(options = {}) {
        this.subscribers = new Map();        // eventType -> [subscriptions]
        this.eventHistory = [];             // For debugging and replay
        this.middlewares = [];              // Processing pipeline
        this.options = {
            maxHistorySize: options.maxHistorySize || 1000,
            enableDebugging: options.enableDebugging || false,
            strictValidation: options.strictValidation || true
        };
        this.stats = {
            eventsEmitted: 0,
            eventsProcessed: 0,
            errors: 0,
            startTime: new Date()
        };
    }

    // === SUBSCRIPTION MANAGEMENT ===
    
    subscribe(eventType, handler, options = {}) {
        if (!eventType || typeof handler !== 'function') {
            throw new Error('Invalid subscription parameters');
        }

        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, []);
        }
        
        const subscription = {
            id: uuidv4(),
            eventType,
            handler,
            moduleId: options.moduleId,
            priority: options.priority || 0,
            once: options.once || false,
            filter: options.filter, // Optional payload filtering function
            createdAt: new Date()
        };
        
        this.subscribers.get(eventType).push(subscription);
        
        // Sort by priority (higher priority first)
        this.subscribers.get(eventType).sort((a, b) => b.priority - a.priority);
        
        this.debugLog(`Subscription created for ${eventType} (${subscription.id})`);
        return subscription.id;
    }

    unsubscribe(eventType, subscriptionId) {
        const subscriptions = this.subscribers.get(eventType);
        if (!subscriptions) return false;
        
        const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
        if (index === -1) return false;
        
        subscriptions.splice(index, 1);
        
        // Clean up empty event types
        if (subscriptions.length === 0) {
            this.subscribers.delete(eventType);
        }
        
        this.debugLog(`Unsubscribed ${subscriptionId} from ${eventType}`);
        return true;
    }

    // === EVENT EMISSION ===
    
    async emit(eventType, payload = {}, metadata = {}) {
        const event = this.createEvent(eventType, payload, metadata);
        
        try {
            // Validate event schema if strict validation enabled
            if (this.options.strictValidation) {
                this.validateEvent(event);
            }

            // Process through middleware pipeline
            const processedEvent = await this.processMiddleware(event);
            
            // Store in history
            this.addToHistory(processedEvent);
            
            // Emit to subscribers
            const results = await this.emitToSubscribers(processedEvent);
            
            this.stats.eventsEmitted++;
            this.stats.eventsProcessed++;
            
            return {
                success: true,
                eventId: processedEvent.id,
                handlersCount: results.length,
                results
            };
            
        } catch (error) {
            this.stats.errors++;
            this.debugLog(`Error emitting event ${eventType}: ${error.message}`);
            throw error;
        }
    }

    createEvent(eventType, payload, metadata) {
        return {
            id: uuidv4(),
            type: eventType,
            payload: { ...payload },
            metadata: {
                timestamp: new Date().toISOString(),
                source: metadata.source || 'unknown',
                correlationId: metadata.correlationId || uuidv4(),
                ...metadata
            },
            version: '1.0'
        };
    }

    async emitToSubscribers(event) {
        const subscriptions = this.subscribers.get(event.type) || [];
        const results = [];
        
        for (const subscription of subscriptions) {
            try {
                // Apply filter if present
                if (subscription.filter && !subscription.filter(event.payload)) {
                    continue;
                }
                
                // Create execution context
                const context = {
                    subscription,
                    event,
                    eventBus: this
                };
                
                // Execute handler
                const startTime = performance.now();
                const result = await subscription.handler(event, context);
                const duration = performance.now() - startTime;
                
                results.push({
                    subscriptionId: subscription.id,
                    moduleId: subscription.moduleId,
                    result,
                    duration
                });
                
                // Remove one-time subscriptions
                if (subscription.once) {
                    this.unsubscribe(event.type, subscription.id);
                }
                
            } catch (error) {
                this.debugLog(`Handler error in ${subscription.moduleId}: ${error.message}`);
                results.push({
                    subscriptionId: subscription.id,
                    moduleId: subscription.moduleId,
                    error: error.message,
                    success: false
                });
            }
        }
        
        return results;
    }

    // === MIDDLEWARE SYSTEM ===
    
    addMiddleware(middleware, priority = 0) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        
        this.middlewares.push({ fn: middleware, priority });
        this.middlewares.sort((a, b) => b.priority - a.priority);
    }

    async processMiddleware(event) {
        let processedEvent = { ...event };
        
        for (const middleware of this.middlewares) {
            try {
                processedEvent = await middleware.fn(processedEvent, this) || processedEvent;
            } catch (error) {
                this.debugLog(`Middleware error: ${error.message}`);
                throw error;
            }
        }
        
        return processedEvent;
    }

    // === VALIDATION ===
    
    validateEvent(event) {
        const schema = EventSchemas[event.type];
        if (!schema) {
            if (this.options.strictValidation) {
                throw new Error(`No schema defined for event type: ${event.type}`);
            }
            return true;
        }
        
        return this.validatePayloadAgainstSchema(event.payload, schema);
    }

    validatePayloadAgainstSchema(payload, schema) {
        for (const [key, expectedType] of Object.entries(schema)) {
            if (!(key in payload)) {
                throw new Error(`Missing required field: ${key}`);
            }
            
            const actualType = typeof payload[key];
            
            if (Array.isArray(expectedType)) {
                // Enum validation
                if (!expectedType.includes(payload[key])) {
                    throw new Error(`Invalid enum value for ${key}: expected one of [${expectedType.join(', ')}], got ${payload[key]}`);
                }
            } else if (expectedType !== actualType && expectedType !== 'any') {
                throw new Error(`Type mismatch for ${key}: expected ${expectedType}, got ${actualType}`);
            }
        }
        
        return true;
    }

    // === HISTORY AND DEBUGGING ===
    
    addToHistory(event) {
        this.eventHistory.push(event);
        
        // Maintain max history size
        if (this.eventHistory.length > this.options.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    getEventHistory(options = {}) {
        let history = this.eventHistory;
        
        // Filter by event type
        if (options.eventType) {
            history = history.filter(event => event.type === options.eventType);
        }
        
        // Filter by time range
        if (options.since) {
            const since = new Date(options.since);
            history = history.filter(event => new Date(event.metadata.timestamp) >= since);
        }
        
        // Limit results
        if (options.limit) {
            history = history.slice(-options.limit);
        }
        
        return history;
    }

    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime.getTime(),
            subscribersCount: Array.from(this.subscribers.values()).reduce((total, subs) => total + subs.length, 0),
            eventTypesCount: this.subscribers.size,
            historySize: this.eventHistory.length
        };
    }

    debugLog(message) {
        if (this.options.enableDebugging) {
            console.log(`[EventBus] ${new Date().toISOString()} - ${message}`);
        }
    }

    // === UTILITY METHODS ===
    
    // Replay events from history
    async replayEvents(filter = () => true) {
        const eventsToReplay = this.eventHistory.filter(filter);
        const results = [];
        
        for (const event of eventsToReplay) {
            try {
                const result = await this.emitToSubscribers(event);
                results.push({ event: event.id, result });
            } catch (error) {
                results.push({ event: event.id, error: error.message });
            }
        }
        
        return results;
    }

    // Wait for specific event
    waitForEvent(eventType, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.unsubscribe(eventType, subscriptionId);
                reject(new Error(`Timeout waiting for event: ${eventType}`));
            }, timeout);
            
            const subscriptionId = this.subscribe(eventType, (event) => {
                clearTimeout(timeoutId);
                resolve(event);
            }, { once: true });
        });
    }

    // Bulk subscribe for module initialization
    bulkSubscribe(subscriptions, moduleId) {
        const subscriptionIds = [];
        
        for (const { eventType, handler, options = {} } of subscriptions) {
            const id = this.subscribe(eventType, handler, { ...options, moduleId });
            subscriptionIds.push(id);
        }
        
        return subscriptionIds;
    }

    // Clean shutdown
    shutdown() {
        this.debugLog('EventBus shutting down...');
        this.subscribers.clear();
        this.eventHistory = [];
        this.middlewares = [];
    }
}

module.exports = EventBus;
```

## MIDDLEWARE PRECONFIGURATE

### LoggingMiddleware.js
```javascript
function loggingMiddleware(event, eventBus) {
    console.log(`[EventBus] ${event.type} (${event.id}) - ${JSON.stringify(event.payload)}`);
    return event; // Pass through unchanged
}

module.exports = loggingMiddleware;
```

### ValidationMiddleware.js
```javascript
function validationMiddleware(event, eventBus) {
    // Additional custom validation beyond schema
    if (event.type.startsWith('system.') && !event.metadata.source) {
        throw new Error('System events must specify source');
    }
    
    return event;
}

module.exports = validationMiddleware;
```

### SecurityMiddleware.js
```javascript
function securityMiddleware(event, eventBus) {
    // Sanitize sensitive data
    if (event.payload.password) {
        event.payload.password = '[REDACTED]';
    }
    
    if (event.payload.apiKey) {
        event.payload.apiKey = '[REDACTED]';
    }
    
    return event;
}

module.exports = securityMiddleware;
```

## EVENTI TIPIZZATI SPECIFICI PER OLLAMAGUI

### events.schema.js - Extended Schema
```javascript
const EventSchemas = {
    // === CHAT EVENTS ===
    'chat.created': {
        chatId: 'string',
        title: 'string',
        model: 'string',
        timestamp: 'string'
    },
    
    'chat.message.sent': {
        chatId: 'string',
        messageId: 'string',
        content: 'string',
        attachments: 'object', // array
        model: 'string',
        timestamp: 'string'
    },
    
    'chat.message.received': {
        chatId: 'string',
        messageId: 'string',
        response: 'string',
        model: 'string',
        processingTime: 'number',
        timestamp: 'string'
    },
    
    'chat.deleted': {
        chatId: 'string',
        title: 'string',
        timestamp: 'string'
    },
    
    // === OLLAMA EVENTS ===
    'ollama.status.changed': {
        status: ['running', 'stopped', 'starting', 'error'],
        previousStatus: ['running', 'stopped', 'starting', 'error'],
        message: 'string',
        details: 'object'
    },
    
    'ollama.model.download.started': {
        modelName: 'string',
        size: 'number',
        timestamp: 'string'
    },
    
    'ollama.model.download.progress': {
        modelName: 'string',
        progress: 'number', // 0-100
        downloaded: 'number',
        total: 'number',
        speed: 'number'
    },
    
    'ollama.model.download.completed': {
        modelName: 'string',
        size: 'number',
        duration: 'number',
        timestamp: 'string'
    },
    
    'ollama.model.removed': {
        modelName: 'string',
        timestamp: 'string'
    },
    
    // === UI EVENTS ===
    'ui.theme.changed': {
        theme: ['light', 'dark', 'auto'],
        previousTheme: ['light', 'dark', 'auto'],
        timestamp: 'string'
    },
    
    'ui.chat.selected': {
        chatId: 'string',
        previousChatId: 'string',
        timestamp: 'string'
    },
    
    'ui.model.selected': {
        modelName: 'string',
        previousModel: 'string',
        timestamp: 'string'
    },
    
    // === STORAGE EVENTS ===
    'storage.chat.saved': {
        chatId: 'string',
        operation: ['create', 'update', 'delete'],
        size: 'number',
        timestamp: 'string'
    },
    
    'storage.error': {
        operation: 'string',
        error: 'string',
        details: 'object',
        timestamp: 'string'
    },
    
    // === SYSTEM EVENTS ===
    'system.startup': {
        version: 'string',
        modules: 'object', // array of module names
        timestamp: 'string'
    },
    
    'system.shutdown': {
        reason: 'string',
        timestamp: 'string'
    },
    
    'system.error': {
        module: 'string',
        error: 'string',
        stack: 'string',
        severity: ['low', 'medium', 'high', 'critical'],
        timestamp: 'string'
    },
    
    'system.performance': {
        module: 'string',
        metric: 'string',
        value: 'number',
        unit: 'string',
        timestamp: 'string'
    }
};

module.exports = EventSchemas;
```

## UTILIZZO PRATICO NEI MODULI

### Esempio: ChatModule Event Handling
```javascript
// In ChatModule.js
subscribeToEvents(eventBus) {
    // Subscribe to relevant events
    eventBus.subscribe('chat.message.sent', this.handleMessageSent.bind(this));
    eventBus.subscribe('ollama.status.changed', this.handleOllamaStatus.bind(this));
    eventBus.subscribe('ui.model.selected', this.handleModelChange.bind(this));
}

async handleMessageSent(event) {
    const { chatId, content, model } = event.payload;
    
    // Process message through Ollama
    const response = await this.processMessage(content, model);
    
    // Emit response event
    await this.context.eventBus.emit('chat.message.received', {
        chatId,
        messageId: this.generateMessageId(),
        response,
        model,
        processingTime: performance.now() - event.metadata.timestamp,
        timestamp: new Date().toISOString()
    });
}
```

Questo Event Bus fornisce la base solida per comunicazione type-safe, debug avanzato e middleware personalizzabili.