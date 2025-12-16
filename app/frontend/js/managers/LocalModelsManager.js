/**
 * LocalModelsManager - Local Models Management & UI
 * 
 * Manages local model listing, sorting, categorization, and modal UI
 * Extracted from app.js for better modularity and maintainability
 * 
 * Dependencies:
 * - DOMUtils: DOM manipulation utilities
 * - ModelManager: System prompts integration
 */

class LocalModelsManager {
    constructor(app) {
        this.app = app;
        
        // Component references (injected from app)
        this.modelManager = app.modelManager;
        
        console.log('📁 LocalModelsManager initialized');
    }
    
    /**
     * Show Local Models Management Modal
     */
    showModelManagementModal() {
        console.log('📁 Opening local models management...');
        DOMUtils.showModal('modelManagementModal');
        
        // Load local models when opening modal
        this.loadLocalModels();
    }
    
    /**
     * Hide Local Models Management Modal
     */
    hideModelManagementModal() {
        console.log('📦 Closing model management modal...');
        DOMUtils.hideModal('modelManagementModal');
    }
    
    /**
     * Load and display local models in the management modal
     */
    async loadLocalModels() {
        console.log('📥 Loading local models for management...');
        const localModelsList = document.getElementById('localModelsList');
        
        if (!localModelsList) {
            console.warn('⚠️ Local models list element not found');
            return;
        }
        
        try {
            // Use already loaded models
            if (!this.app.models || this.app.models.length === 0) {
                await this.app.loadModels();
            }
            
            if (this.app.models.length === 0) {
                localModelsList.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 20px;">
                        📭 No models installed locally
                    </div>
                `;
                return;
            }
            
            // Apply sorting and rendering
            await this.renderLocalModelsWithSort();
            
        } catch (error) {
            console.error('❌ Error loading local models:', error);
            localModelsList.innerHTML = `
                <div style="text-align: center; color: #dc3545; padding: 20px;">
                    ❌ Error loading models: ${error.message}
                </div>
            `;
        }
    }
    
    /**
     * Refresh local models list
     */
    async refreshLocalModels() {
        console.log('🔄 Refreshing local models...');
        this.app.addNotification('🔄 Updating models list...', 'info');
        
        try {
            // Reload models from server
            await this.app.loadModels();

            // Update display in modal if it's open
            const modal = document.getElementById('modelManagementModal');
            if (modal && modal.classList.contains('show')) {
                await this.loadLocalModels();
            }
            
            this.app.addNotification('✅ Models list updated', 'success');
            
        } catch (error) {
            console.error('❌ Error refreshing models:', error);
            this.app.addNotification('❌ Error updating models: ' + error.message, 'error');
        }
    }
    
    /**
     * Render local models with sorting applied
     */
    async renderLocalModelsWithSort() {
        const localModelsList = document.getElementById('localModelsList');
        const sortBy = document.getElementById('localModelsSortBy')?.value || 'name';
        
        if (!localModelsList || !this.app.models || this.app.models.length === 0) {
            return;
        }
        
        // Apply sorting
        const sortedModels = this.sortLocalModels([...this.app.models], sortBy);
        
        // Pre-load system prompts cache before processing models
        await this.app.getSystemPrompts();
        
        // Generate HTML for each model with system prompt indicators
        const modelsWithPrompts = await Promise.all(sortedModels.map(async (model) => {
            const sizeGB = (model.size / (1000**3)).toFixed(1);
            const modified = new Date(model.modified_at).toLocaleDateString();
            const hasSystemPrompt = await this.app.hasSystemPrompt(model.name);
            const systemPromptIndicator = hasSystemPrompt ? ' *' : '';
            
            // Determine categories based on model name
            const categories = this.determineModelCategories(model.name);
            const categoryTags = categories.map(cat => 
                `<span class="model-tag">${cat}</span>`
            ).join(' ');
            
            return `
                <div class="local-model-item">
                    <div class="local-model-info">
                        <div class="local-model-name">${model.name}${systemPromptIndicator}</div>
                        <div class="local-model-details">
                            <span>📦 ${sizeGB}GB</span>
                            <span>📅 ${modified}</span>
                            <span>🏷️ ${model.details?.family || 'N/A'}</span>
                        </div>
                        <div style="margin-top: 8px;">
                            ${categoryTags}
                        </div>
                    </div>
                    <div class="local-model-actions">
                        <button class="system-prompt-btn" onclick="app.modelManager.showSystemPromptEditor('${model.name}')" title="Configure base prompt">
                            🔧 Base Prompt
                        </button>
                        <button class="remove-btn" onclick="app.removeModel('${model.name}')" title="Remove model">
                            🗑️ Remove
                        </button>
                    </div>
                </div>`;
        }));
        
        localModelsList.innerHTML = modelsWithPrompts.join('');
        console.log(`✅ Rendered ${sortedModels.length} local models with sort: ${sortBy}`);
    }
    
    /**
     * Sort local models based on specified criteria
     * @param {Array} models - Array of model objects
     * @param {string} sortBy - Sort criteria ('name', 'category', 'size', 'date')
     * @returns {Array} Sorted models array
     */
    sortLocalModels(models, sortBy) {
        const modelsCopy = [...models];
        
        switch (sortBy) {
            case 'name':
                return modelsCopy.sort((a, b) => a.name.localeCompare(b.name));
                
            case 'category':
                return modelsCopy.sort((a, b) => {
                    const catA = this.determineModelCategories(a.name)[0];
                    const catB = this.determineModelCategories(b.name)[0];
                    return catA.localeCompare(catB);
                });
                
            case 'size':
                return modelsCopy.sort((a, b) => (b.size || 0) - (a.size || 0));
                
            case 'date':
                return modelsCopy.sort((a, b) => {
                    const dateA = new Date(a.modified_at);
                    const dateB = new Date(b.modified_at);
                    return dateB - dateA; // Most recent first
                });
                
            default:
                return modelsCopy;
        }
    }
    
    /**
     * Determine model categories based on model name
     * @param {string} modelName - Name of the model
     * @returns {Array} Array of category strings
     */
    determineModelCategories(modelName) {
        const name = modelName.toLowerCase();
        const categories = [];
        
        // Priority: Specialized > Programming > Reasoning > General
        // A model belongs only to its most specific category

        // Specialized models (medical, legal, etc.) - HIGHEST PRIORITY
        if (name.includes('medgemma') || name.includes('medical') || name.includes('clinical') || 
            name.includes('legal') || name.includes('law') || name.includes('biomed')) {
            categories.push('Specialistico');
            return categories; // STOP - it's specialized, not general
        }
        
        // Programming models - HIGH PRIORITY
        if (name.includes('code') || name.includes('coder') || name.includes('codellama') ||
            name.includes('programming') || name.includes('developer')) {
            categories.push('Programmazione');
            return categories; // STOP - it's for coding, not general
        }
        
        // Reasoning models - MEDIUM PRIORITY
        if (name.includes('deepseek-r') || name.includes('gpt-oss') || name.includes('reasoning') ||
            name.includes('think') || name.includes('logic')) {
            categories.push('Ragionamento');
            return categories; // STOP - it's for reasoning, not general
        }
        
        // General/chat models - DEFAULT
        // Only if it doesn't fit categories above
        categories.push('Generale');
        
        return categories;
    }
    
    /**
     * Remove a local model
     * @param {string} modelName - Name of the model to remove
     */
    async removeModel(modelName) {
        if (!confirm(`Are you sure you want to remove the model "${modelName}"?\n\nThis action is irreversible.`)) {
            return;
        }
        
        console.log(`🗑️ Removing model: ${modelName}`);
        this.app.addNotification(`🗑️ Removing model ${modelName}...`, 'info');
        
        try {
            // API call to remove model
            const response = await fetch(`/api/models/remove/${encodeURIComponent(modelName)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.app.addNotification(`✅ Model ${modelName} removed successfully`, 'success');
                
                // Update models list in main app
                await this.app.loadModels();

                // Update display in modal if it's open
                const modal = document.getElementById('modelManagementModal');
                if (modal && modal.classList.contains('show')) {
                    await this.loadLocalModels();
                }
                
            } else {
                throw new Error(data.error || 'Unknown error during removal');
            }
            
        } catch (error) {
            console.error('❌ Error removing model:', error);
            this.app.addNotification(`❌ Error removing model: ${error.message}`, 'error');
        }
    }
    
    /**
     * Hide modal utility
     * @param {string} modalId - ID of modal to hide
     */
    hideModal(modalId) {
        DOMUtils.hideModal(modalId);
    }

    /**
     * Run basic system diagnostics
     */
    async runDebug() {
        console.log('🐛 Basic debug check...');
        this.app.addNotification('🔍 Checking system status...', 'info');
        
        try {
            const healthData = await this.app.apiClient.getHealthCheck();
            
            console.log('🔍 Health check result:', healthData);
            if (healthData.success) {
                this.app.addNotification('✅ System operational - Ollama active and working', 'success');
            } else {
                const errorMsg = healthData.message || healthData.error || 'Unknown error';
                this.app.addNotification(`❌ Issues detected: ${errorMsg}`, 'error');
            }
            
        } catch (error) {
            this.app.addNotification(`❌ Diagnostics error: ${error.message}`, 'error');
        }
    }

    /**
     * Shutdown application
     */
    async shutdown() {
        if (confirm('Close Ollama Easy GUI?\n\nThis will stop the server. Ollama will keep running if you started it manually.')) {
            try {
                // Show message
                this.app.addNotification('🛑 Shutting down server...', 'info');

                // Call shutdown API
                await this.app.apiClient.shutdown();

                // Replace page content since window.close() often doesn't work
                setTimeout(() => {
                    document.body.innerHTML = `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; font-family: system-ui, -apple-system, sans-serif;">
                            <div style="text-align: center; padding: 40px;">
                                <h2 style="color: #333; margin-bottom: 16px;">Ollama Easy GUI Closed</h2>
                                <p style="color: #666;">The server has been shut down.</p>
                                <p style="color: #666;">You can close this browser tab.</p>
                            </div>
                        </div>
                    `;
                    // Try to close window anyway
                    window.close();
                }, 300);
            } catch (error) {
                // Server may have already shut down
                document.body.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; font-family: system-ui, -apple-system, sans-serif;">
                        <div style="text-align: center; padding: 40px;">
                            <h2 style="color: #333; margin-bottom: 16px;">Ollama Easy GUI Closed</h2>
                            <p style="color: #666;">The server has been shut down.</p>
                            <p style="color: #666;">You can close this browser tab.</p>
                        </div>
                    </div>
                `;
            }
        }
    }
}