// ModelManager.js - Model Management Coordinator (REFACTORED)
// Size: 180 lines (target: <500 lines) ✅ COMPLIANCE ACHIEVED
// Delegates to modular components: SystemPrompts, HubSearch, LocalModelsManager

/**
 * ModelManager - Coordinator for model management
 *
 * RESPONSIBILITIES:
 * - Modal management and tab switching
 * - Coordination between modular components
 * - Operation tracking and stop functionality
 * - Interface delegation to specific components
 *
 * MODULAR ARCHITECTURE:
 * - ModelSystemPrompts: System prompts management
 * - ModelHubSearch: Search and download from hub
 * - LocalModelsManager: Installed models management
 * 
 * COMPLIANCE: File <500 lines, modular separation achieved
 */
class ModelManager {
    constructor(app) {
        this.app = app;
        
        console.log('🎯 ModelManager initialized - Modular Architecture');
        this.currentOperation = null; // Track current operations for stopping
        
        // Initialize modular components
        this.systemPrompts = new ModelSystemPrompts(app);
        this.hubSearch = new ModelHubSearch(app);
        this.localManager = new LocalModelsManager(app);
        
        console.log('✅ ModelManager modules initialized: SystemPrompts, HubSearch, LocalManager');
    }
    
    // Stop current model operation
    stopCurrentOperation() {
        if (this.currentOperation) {
            console.log('⏹️ Stopping model operation...');
            // Add specific stop logic for model operations here
            this.currentOperation = null;
            return true;
        }
        return false;
    }

    // === MODEL MANAGEMENT MODAL ===
    
    showModelManagementModal() {
        const modal = document.getElementById('modelManagementModal');
        if (modal) {
            modal.classList.add('show');
            // Load initial data - delegate to LocalModelsManager
            this.localManager.loadLocalModels();
        }
    }
    
    hideModelManagementModal() {
        const modal = document.getElementById('modelManagementModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    switchModelTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.model-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        if (tabName === 'download') {
            document.getElementById('downloadTab').classList.add('active');
        } else if (tabName === 'manage') {
            document.getElementById('manageTab').classList.add('active');
            this.localManager.loadLocalModels(); // Delegate to LocalModelsManager
        }
    }

    // === DELEGATION METHODS FOR BACKWARD COMPATIBILITY ===
    // These methods maintain existing interface while delegating to modules
    
    /**
     * HUB SEARCH DELEGATION
     */
    async searchAvailableModels() {
        return await this.hubSearch.searchAvailableModels();
    }
    
    renderAvailableModels(models) {
        return this.hubSearch.renderAvailableModels(models);
    }
    
    async downloadModel(modelName) {
        return await this.hubSearch.downloadModel(modelName);
    }
    
    showDownloadProgress(modelName) {
        return this.hubSearch.showDownloadProgress(modelName);
    }
    
    hideDownloadProgress() {
        return this.hubSearch.hideDownloadProgress();
    }
    
    /**
     * LOCAL MODELS DELEGATION
     */
    async loadLocalModels() {
        return await this.localManager.loadLocalModels();
    }
    
    async renderLocalModels(models) {
        return await this.localManager.renderLocalModels(models);
    }
    
    sortLocalModels(models, sortBy) {
        return this.localManager.sortLocalModels(models, sortBy);
    }
    
    determineModelCategories(modelName) {
        return this.localManager.determineModelCategories(modelName);
    }
    
    async removeModel(modelName, modelSize) {
        return await this.localManager.removeModel(modelName, modelSize);
    }
    
    /**
     * SYSTEM PROMPTS DELEGATION
     */
    async showSystemPromptEditor(modelName) {
        return await this.systemPrompts.showSystemPromptEditor(modelName);
    }
    
    hideSystemPromptEditor() {
        return this.systemPrompts.hideSystemPromptEditor();
    }
    
    async saveSystemPrompt(modelName) {
        return await this.systemPrompts.saveSystemPrompt(modelName);
    }
    
    async hasSystemPrompt(modelName) {
        return await this.systemPrompts.hasSystemPrompt(modelName);
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelManager;
}