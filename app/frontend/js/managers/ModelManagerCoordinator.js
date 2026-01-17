/**
 * ModelManagerCoordinator.js - Model Management Coordination
 * 
 * EXTRACTED FROM: app.js (Phase 3A.1.2)
 * PURPOSE: Specialized coordinator for model-related functionality
 * METHODOLOGY: Analysis-First + Phoenix Transformation
 * 
 * RESPONSIBILITIES:
 * - Model selection handling and coordination
 * - Model information calculation and display
 * - Model management modal coordination
 * - Model loading, timeout calculations, and switching
 * - Local models management and sorting
 * 
 * SIZE: ~300 lines (extracted from 1,193 lines app.js)
 * ARCHITECTURE: Modular coordinator pattern with dependency injection
 */

class ModelManagerCoordinator {
    constructor(app) {
        // Dependency injection from main app
        this.app = app;
        this.modelManager = app.modelManager;
        this.apiClient = app.apiClient;
        this.storageService = app.storageService;
        
        console.log('🎯 ModelManagerCoordinator initialized - Model coordination active');
    }

    /**
     * Setup all model-related event listeners and coordination
     * MAIN ENTRY POINT for model functionality initialization
     */
    initialize() {
        console.log('🚀 ModelManagerCoordinator: Starting comprehensive initialization...');
        
        this.setupModelSelection();
        this.setupModelManagement();
        this.setupModelSorting();
        
        console.log('✅ ModelManagerCoordinator: Initialization completed successfully');
    }

    /**
     * Setup model selection dropdown handling
     * EXTRACTED FROM: app.js lines 94-115
     */
    setupModelSelection() {
        const modelSelect = document.getElementById('modelSelect');
        if (!modelSelect) {
            console.warn('⚠️ ModelManagerCoordinator: modelSelect not found');
            return;
        }

        modelSelect.addEventListener('change', (e) => {
            this.app.currentModel = e.target.value;
            this.app.updateModelInfo();
            
            // Save selection
            if (this.app.currentModel) {
                this.storageService.saveSelectedModel(this.app.currentModel);
                console.log('💾 Saved model selection:', this.app.currentModel);
                
                // Notify that model will be loaded on next message
                this.app.addNotification(
                    `💤 Model ${this.app.currentModel} selected - will be loaded on next message`,
                    'info'
                );
            }
            
            console.log('🎯 Model selected (lazy loading):', this.app.currentModel);
        });

        console.log('📋 ModelManagerCoordinator: Model selection configured');
    }

    /**
     * Setup model management modal controls
     * EXTRACTED FROM: app.js lines 120-122
     * ENHANCED: Phase 1 - Hub Search tab navigation and search functionality
     */
    setupModelManagement() {
        DOMUtils.addClickListener('manageModelsBtn', () => this.app.showModelManagementModal());
        DOMUtils.addClickListener('closeModelManagement', () => this.app.hideModelManagementModal());

        // Setup tab navigation for Model Management Modal
        this.setupModelManagementTabs();

        // Setup Hub Search functionality
        this.setupHubSearch();

        console.log('🔧 ModelManagerCoordinator: Model management controls configured');
    }

    /**
     * Setup tab navigation in Model Management Modal
     * ADDED: Phase 1 - Hub Ollama Search (December 2025)
     */
    setupModelManagementTabs() {
        const tabs = document.querySelectorAll('.model-tabs .model-tab');
        const tabContents = document.querySelectorAll('.model-tab-content');

        if (tabs.length === 0) {
            console.warn('⚠️ ModelManagerCoordinator: Model tabs not found');
            return;
        }

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Remove active from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                // Add active to clicked tab and corresponding content
                tab.classList.add('active');
                const targetContent = document.getElementById(`tab-${targetTab}`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }

                console.log(`📑 Switched to tab: ${targetTab}`);
            });
        });

        console.log('📑 ModelManagerCoordinator: Tab navigation configured');
    }

    /**
     * Setup Hub Search button and input functionality
     * ADDED: Phase 1 - Hub Ollama Search (December 2025)
     */
    setupHubSearch() {
        const searchBtn = document.getElementById('searchModelsBtn');
        const searchInput = document.getElementById('modelSearchInput');

        if (!searchBtn) {
            console.warn('⚠️ ModelManagerCoordinator: Hub search button not found');
            return;
        }

        // Search button click
        searchBtn.addEventListener('click', () => {
            if (this.app.modelManager?.hubSearch) {
                this.app.modelManager.hubSearch.searchAvailableModels();
            } else {
                console.error('❌ ModelHubSearch not available');
                this.app.addNotification('❌ Hub search not available', 'error');
            }
        });

        // Enter key on search input
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (this.app.modelManager?.hubSearch) {
                        this.app.modelManager.hubSearch.searchAvailableModels();
                    }
                }
            });
        }

        console.log('🔍 ModelManagerCoordinator: Hub search configured');
    }

    /**
     * Setup model sorting dropdown
     * EXTRACTED FROM: app.js lines 124-130
     */
    setupModelSorting() {
        const localModelsSortBy = document.getElementById('localModelsSortBy');
        if (!localModelsSortBy) {
            console.warn('⚠️ ModelManagerCoordinator: localModelsSortBy not found');
            return;
        }

        localModelsSortBy.addEventListener('change', async () => {
            await this.app.renderLocalModelsWithSort();
        });

        console.log('🔤 ModelManagerCoordinator: Model sorting configured');
    }

    /**
     * Load and populate models in dropdown
     * EXTRACTED FROM: app.js loadModels() method
     */
    async loadModels() {
        console.log('📥 Loading models from Ollama...');
        try {
            const data = await this.apiClient.getModelsList();
            
            // Remove duplicates based on model name
            const uniqueModels = data.models?.filter((model, index, array) => 
                array.findIndex(m => m.name === model.name) === index
            ) || [];

            // Sort alphabetically by name
            uniqueModels.sort((a, b) => a.name.localeCompare(b.name));

            this.app.models = uniqueModels;
            const select = document.getElementById('modelSelect');
            
            if (this.app.models.length === 0) {
                select.innerHTML = '<option value="">No models installed</option>';
                this.app.addNotification('⚠️ No models found', 'warning');
                return;
            }

            // Clear existing options
            select.innerHTML = '<option value="">Select a model</option>';

            // Create options with system prompt indicators
            // Uses * to indicate models with custom system prompt (same as Manage Models popup)
            const modelOptions = await Promise.all(this.app.models.map(async (model) => {
                const sizeGB = (model.size / (1000**3)).toFixed(1);
                const hasSystemPrompt = await this.app.hasSystemPrompt(model.name);
                const systemPromptIndicator = hasSystemPrompt ? ' *' : '';
                
                return {
                    name: model.name,
                    display: `${model.name}${systemPromptIndicator} (${sizeGB}GB)`
                };
            }));

            // Add options to select
            modelOptions.forEach(modelOption => {
                const option = document.createElement('option');
                option.value = modelOption.name;
                option.textContent = modelOption.display;
                select.appendChild(option);
            });

            this.app.addNotification(`✅ Loaded ${this.app.models.length} models`, 'success');

            // Restore previously selected model
            this.restoreSavedModel();

        } catch (error) {
            console.error('❌ Error loading models:', error);
            this.app.addNotification('❌ Error loading models: ' + error.message, 'error');
        }
    }

    /**
     * Restore previously selected model
     * EXTRACTED FROM: app.js restoreSavedModel() method
     */
    restoreSavedModel() {
        const savedModel = this.storageService.getSelectedModel();
        
        // Try to restore saved model
        if (savedModel && this.app.models.some(m => m.name === savedModel)) {
            // Restore saved model
            const select = document.getElementById('modelSelect');
            select.value = savedModel;
            this.app.currentModel = savedModel;
            this.app.updateModelInfo();
            console.log('✅ Restored saved model:', savedModel);
        } else if (this.app.models.length > 0) {
            // Select first model if no saved model
            const select = document.getElementById('modelSelect');
            select.value = this.app.models[0].name;
            this.app.currentModel = this.app.models[0].name;
            this.app.updateModelInfo();
        }
    }

    /**
     * Update model information display
     * EXTRACTED FROM: app.js updateModelInfo() method
     */
    updateModelInfo() {
        const info = document.getElementById('modelInfo');
        if (!this.app.currentModel) {
            info.textContent = 'Select a model to see details';
            return;
        }

        const model = this.app.models.find(m => m.name === this.app.currentModel);
        if (model) {
            const sizeGB = (model.size / (1000**3)).toFixed(1);
            const modified = new Date(model.modified_at).toLocaleDateString();
            info.innerHTML = `
                <strong>${model.name}</strong><br>
                📊 Size: ${sizeGB} GB<br>
                📅 Modified: ${modified}
            `;
        } else {
            info.textContent = 'Selected model not found';
        }
    }

    /**
     * Get model information by name
     * EXTRACTED FROM: app.js getModelInfo() method
     */
    getModelInfo(modelName) {
        if (!modelName || !this.app.models) return null;
        return this.app.models.find(m => m.name === modelName);
    }

    /**
     * Check if model needs extra loading time
     * EXTRACTED FROM: app.js needsExtraLoadingTime() method
     */
    needsExtraLoadingTime(modelInfo) {
        if (!modelInfo) {
            return this.isLargeModelByName(modelInfo?.name || '');
        }
        
        const sizeBytes = modelInfo.size || 0;
        return sizeBytes > 8 * (1000**3); // > 8GB
    }

    /**
     * Check if model is large by name pattern
     * EXTRACTED FROM: app.js isLargeModelByName() method
     */
    isLargeModelByName(modelName) {
        if (!modelName) return false;
        const name = modelName.toLowerCase();
        return name.includes('70b') || name.includes('72b') || 
               name.includes('65b') || name.includes('30b') || 
               name.includes('34b') || name.includes('32b');
    }

    /**
     * Calculate frontend timeout based on model info
     * EXTRACTED FROM: app.js calculateFrontendTimeout() method
     */
    calculateFrontendTimeout(modelInfo) {
        if (!modelInfo) {
            return this.calculateTimeoutFromName(this.app.currentModel);
        }
        
        const sizeBytes = modelInfo.size || 0;
        
        if (sizeBytes > 40 * (1000**3)) return 900000;  // > 40GB: 15 minutes
        if (sizeBytes > 20 * (1000**3)) return 720000;  // > 20GB: 12 minutes
        if (sizeBytes > 8 * (1000**3))  return 600000;  // > 8GB: 10 minutes
        if (sizeBytes > 4 * (1000**3))  return 480000;  // > 4GB: 8 minutes
        if (sizeBytes > 1 * (1000**3))  return 360000;  // > 1GB: 6 minutes
        return 240000; // <= 1GB: 4 minutes
    }

    /**
     * Calculate timeout from model name patterns
     * EXTRACTED FROM: app.js calculateTimeoutFromName() method
     */
    calculateTimeoutFromName(modelName) {
        if (!modelName) return 600000; // Default 10 minutes

        const name = modelName.toLowerCase();

        if (name.includes('70b') || name.includes('72b')) return 900000; // 15 minutes
        if (name.includes('65b') || name.includes('30b') || name.includes('34b') || name.includes('32b')) return 720000; // 12 minutes
        if (name.includes('13b') || name.includes('11b') || name.includes('14b') || name.includes('15b')) return 600000; // 10 minutes
        if (name.includes('7b') || name.includes('8b') || name.includes('9b')) return 480000; // 8 minutes
        if (name.includes('3b') || name.includes('1b')) return 360000; // 6 minutes
        return 240000; // Default 4 minutes for small models
    }

    /**
     * Switch to specified model with loading coordination
     * EXTRACTED FROM: app.js switchToModel() method
     */
    async switchToModel(modelName) {
        if (!modelName) {
            throw new Error('Model name is required');
        }

        try {
            const progressId = `model_loading_${Date.now()}`;
            const modelInfo = this.getModelInfo(modelName);
            const isLargeModel = this.needsExtraLoadingTime(modelInfo);

            const loadingMessage = isLargeModel
                ? `🔄 Loading ${modelName} (large model, please wait...)`
                : `🔄 Loading ${modelName}...`;
            
            this.app.addNotification(loadingMessage, 'info', 15000);
            
            // Send model switch request (use sendMessage instead of non-existent generateText)
            const response = await this.apiClient.sendMessage(
                'test',  // Simple test message to warm up model
                modelName,
                'temp_test_chat'
            );

            if (response) {
                this.app.currentModel = modelName;      // Selected in UI
                this.app.loadedModel = modelName;       // Actually loaded in Ollama
                this.storageService.saveSelectedModel(modelName);
                
                const select = document.getElementById('modelSelect');
                if (select) {
                    select.value = modelName;
                }
                this.app.updateModelInfo();
                
                this.app.addNotification(`✅ Model ${modelName} loaded successfully`, 'success');
                
                console.log(`✅ Model loaded: ${modelName} (UI: ${this.app.currentModel}, Loaded: ${this.app.loadedModel})`);
                return true;
            }
            
        } catch (error) {
            console.error(`❌ Error switching to model ${modelName}:`, error);
            this.app.addNotification(`❌ Error loading ${modelName}: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Set current model with validation
     * EXTRACTED FROM: app.js setCurrentModel() method
     */
    setCurrentModel(modelName) {
        const modelExists = this.app.models.find(m => m.name === modelName);
        if (!modelExists) {
            console.warn(`⚠️ Model ${modelName} not found`);
            this.app.addNotification(`⚠️ Model ${modelName} no longer available`, 'warning');
            return false;
        }

        this.app.currentModel = modelName;
        this.storageService.saveSelectedModel(modelName);
        
        const select = document.getElementById('modelSelect');
        if (select) {
            select.value = modelName;
        }
        
        this.app.updateModelInfo();
        console.log(`✅ Current model set to: ${modelName}`);
        return true;
    }

    /**
     * Get current model name
     * EXTRACTED FROM: app.js getCurrentModel() method
     */
    getCurrentModel() {
        return this.app.currentModel;
    }

    /**
     * Get coordinator status for debugging
     */
    getCoordinatorStatus() {
        return {
            hasModelSelect: !!document.getElementById('modelSelect'),
            hasModelInfo: !!document.getElementById('modelInfo'),
            hasSorting: !!document.getElementById('localModelsSortBy'),
            currentModel: this.app.currentModel,
            loadedModel: this.app.loadedModel,
            modelsCount: this.app.models?.length || 0,
            isActive: true
        };
    }

    /**
     * Cleanup coordinator resources
     */
    cleanup() {
        console.log('🧹 ModelManagerCoordinator: Performing cleanup...');
        // Future: Remove event listeners if needed
        console.log('✅ ModelManagerCoordinator: Cleanup completed');
    }
}

// Export for modular loading
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelManagerCoordinator;
}