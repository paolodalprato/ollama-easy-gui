// StorageService.js - Wrapper for localStorage
class StorageService {
    constructor() {
        this.prefix = 'ollamaGUI_';
        
        console.log('💾 StorageService initialized');
    }

    // === MODEL SELECTION PERSISTENCE ===
    
    saveSelectedModel(modelName) {
        if (modelName) {
            localStorage.setItem(this.prefix + 'selectedModel', modelName);
            console.log('💾 Saved model selection:', modelName);
        }
    }

    getSelectedModel() {
        const saved = localStorage.getItem(this.prefix + 'selectedModel');
        console.log('💾 Retrieved saved model:', saved);
        return saved;
    }

    clearSelectedModel() {
        localStorage.removeItem(this.prefix + 'selectedModel');
        console.log('💾 Cleared saved model selection');
    }

    // === OLLAMA SETTINGS ===
    
    saveStreamingEnabled(enabled) {
        localStorage.setItem(this.prefix + 'streamingEnabled', enabled.toString());
        console.log('💾 Saved streaming setting:', enabled);
    }
    
    getStreamingEnabled() {
        const saved = localStorage.getItem(this.prefix + 'streamingEnabled');
        const enabled = saved === 'true';
        console.log('💾 Retrieved streaming setting:', enabled);
        return enabled;
    }

    // === UI PREFERENCES ===
    
    saveUIPreference(key, value) {
        const prefKey = this.prefix + 'ui_' + key;
        localStorage.setItem(prefKey, JSON.stringify(value));
        console.log('💾 Saved UI preference:', key, value);
    }

    getUIPreference(key, defaultValue = null) {
        const prefKey = this.prefix + 'ui_' + key;
        const saved = localStorage.getItem(prefKey);
        
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.warn('⚠️ Error parsing UI preference:', key, error);
                return defaultValue;
            }
        }
        
        return defaultValue;
    }

    // === SESSION DATA ===
    
    saveSessionData(key, data) {
        const sessionKey = this.prefix + 'session_' + key;
        sessionStorage.setItem(sessionKey, JSON.stringify(data));
        console.log('💾 Saved session data:', key);
    }

    getSessionData(key, defaultValue = null) {
        const sessionKey = this.prefix + 'session_' + key;
        const saved = sessionStorage.getItem(sessionKey);
        
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (error) {
                console.warn('⚠️ Error parsing session data:', key, error);
                return defaultValue;
            }
        }
        
        return defaultValue;
    }

    clearSessionData(key) {
        const sessionKey = this.prefix + 'session_' + key;
        sessionStorage.removeItem(sessionKey);
        console.log('💾 Cleared session data:', key);
    }

    // === UTILITY METHODS ===
    
    isStorageAvailable() {
        try {
            const testKey = this.prefix + 'test';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('⚠️ localStorage not available:', error);
            return false;
        }
    }

    clearAllData() {
        // Remove all OllamaGUI data from localStorage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Remove all OllamaGUI data from sessionStorage
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                sessionKeysToRemove.push(key);
            }
        }
        
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        console.log('💾 Cleared all OllamaGUI storage data');
    }

    getStorageInfo() {
        const info = {
            localStorage: {
                available: this.isStorageAvailable(),
                keys: []
            },
            sessionStorage: {
                available: false,
                keys: []
            }
        };

        // Count localStorage keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                info.localStorage.keys.push(key);
            }
        }

        // Count sessionStorage keys
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    info.sessionStorage.keys.push(key);
                }
            }
            info.sessionStorage.available = true;
        } catch (error) {
            console.warn('⚠️ sessionStorage not available:', error);
        }

        return info;
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}