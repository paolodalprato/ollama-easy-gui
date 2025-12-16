// ModelHubSearch.js - Hub Search & Download Module  
// Extracted from ModelManager.js for GUARDRAIL ARCHITECTURE compliance
// Size: 173 lines (target: <500 lines) ✅

/**
 * ModelHubSearch - Manages model search and download from Ollama Hub
 * 
 * RESPONSIBILITIES:
 * - Model search with category and term filters
 * - Hub API integration for model discovery
 * - Download orchestration with progress management
 * - Model card rendering and UI interaction
 * 
 * DEPENDENCIES:
 * - this.app: Main application coordinator for API and notifications
 * - Backend API: /api/models/search, /api/models/download
 * - DOM elements: modelSearchInput, modelGrid, downloadProgress
 * 
 * ARCHITECTURE: Modular component with event-based communication
 */
class ModelHubSearch {
    constructor(app) {
        this.app = app;
        this.progressPollingInterval = null;
    }
    
    /**
     * Searches available models in Ollama hub
     * Handles search term and category filtering
     */
    async searchAvailableModels() {
        console.log('🔍 Searching available models...');
        const searchInput = document.getElementById('modelSearchInput');
        const categorySelect = document.getElementById('modelCategorySelect');
        const gridContainer = document.getElementById('modelGrid');
        const searchBtn = document.getElementById('searchModelsBtn');
        
        const searchTerm = searchInput.value.trim();
        const category = categorySelect.value;
        
        console.log(`🔍 Search params: term="${searchTerm}", category="${category}"`);
        
        // Disable search button during request
        searchBtn.disabled = true;
        searchBtn.textContent = '🔄 Searching...';
        
        // Show loading
        gridContainer.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;">
                <div class="spinner" style="margin: 0 auto 10px;"></div>
                Searching models...
            </div>
        `;
        
        try {
            const requestBody = { searchTerm, category };
            console.log('📤 Request body:', requestBody);
            
            const response = await fetch('/api/models/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
            
            console.log('📥 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const responseText = await response.text();
            console.log('📥 Response text:', responseText);
            
            const data = JSON.parse(responseText);
            console.log('📥 Parsed data:', data);
            
            if (data.success) {
                await this.renderAvailableModels(data.models);
                this.app.addNotification(`✅ Found ${data.models_found} models`, 'success');
            } else {
                throw new Error(data.error || 'Error searching models');
            }
            
        } catch (error) {
            console.error('❌ Search models error:', error);
            gridContainer.innerHTML = `
                <div style="text-align: center; color: #dc3545; padding: 20px; grid-column: 1 / -1;">
                    ❌ Search error: ${error.message}<br>
                    <small>Check the console for details</small>
                </div>
            `;
            this.app.addNotification('❌ Error searching models: ' + error.message, 'error');
        } finally {
            // Re-enable search button
            searchBtn.disabled = false;
            searchBtn.textContent = '🔍 Search';
        }
    }
    
    /**
     * Renders the grid of available models for download
     * @param {Array} models - Array of models from hub
     */
    async renderAvailableModels(models) {
        const container = document.getElementById('modelGrid');

        if (models.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #666; padding: 20px; grid-column: 1 / -1;">
                    📭 No models found with search criteria
                </div>
            `;
            return;
        }

        // Get local models to check which are already installed
        let localModelNames = [];
        try {
            const response = await fetch('/api/models/list');
            const data = await response.json();
            if (data.success && data.data) {
                // Extract base model names (without tags like :latest, :7b, etc.)
                localModelNames = data.data.map(m => {
                    const name = m.name || '';
                    return name.split(':')[0].toLowerCase();
                });
            }
        } catch (error) {
            console.warn('Could not fetch local models for comparison:', error);
        }

        container.innerHTML = models.map(model => {
            // Check if model is already installed locally
            const modelBaseName = model.name.split(':')[0].toLowerCase();
            const isInstalled = localModelNames.includes(modelBaseName);

            return `
            <div class="model-card ${isInstalled ? 'installed' : ''}" data-model="${model.name}">
                <div class="model-card-header">
                    <div>
                        <div class="model-name">
                            ${model.name}
                            ${isInstalled ? '<span class="installed-badge">✓ Installed</span>' : ''}
                        </div>
                        <div class="model-size">${model.size}</div>
                    </div>
                </div>
                <div class="model-description">${model.description}</div>
                <div class="model-tags">
                    ${model.category.map(cat => `<span class="model-tag">${cat}</span>`).join('')}
                </div>
                <div class="model-actions">
                    <div class="model-rating">
                        ${'⭐'.repeat(Math.floor(model.rating || 4))} ${model.rating || 4.0}
                    </div>
                    ${isInstalled
                        ? `<button class="download-btn installed" disabled>✓ Present</button>`
                        : `<button class="download-btn" onclick="app.modelManager.hubSearch.downloadModel('${model.name}')">📥 Download</button>`
                    }
                </div>
            </div>
        `}).join('');
    }
    
    /**
     * Starts the download of a model from hub
     * @param {string} modelName - Model name to download
     */
    async downloadModel(modelName) {
        console.log(`📥 Starting download: ${modelName}`);
        this.app.addNotification(`📥 Starting download ${modelName}...`, 'info');

        // Show progress bar
        this.showDownloadProgress(modelName);

        // Disable download button for this model
        const modelCard = document.querySelector(`[data-model="${modelName}"]`);
        const downloadBtn = modelCard?.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.textContent = '⏳ Downloading...';
        }

        // Start progress polling
        this.startProgressPolling();

        try {
            const response = await fetch('/api/models/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelName })
            });

            const data = await response.json();

            if (data.success) {
                this.app.addNotification(`✅ ${modelName} downloaded successfully`, 'success');
                // Refresh local models list - delegate to LocalModelsManager
                if (this.app.modelManager.localManager) {
                    await this.app.modelManager.localManager.loadLocalModels();
                }
                await this.app.loadModels(); // Refresh main model selector
            } else {
                throw new Error(data.error || 'Download failed');
            }

        } catch (error) {
            console.error('❌ Download error:', error);
            this.app.addNotification(`❌ Download error ${modelName}: ${error.message}`, 'error');
        } finally {
            // Stop polling and hide progress
            this.stopProgressPolling();
            this.hideDownloadProgress();

            // Re-enable button (re-query in case DOM changed)
            const finalModelCard = document.querySelector(`[data-model="${modelName}"]`);
            const finalDownloadBtn = finalModelCard?.querySelector('.download-btn');
            if (finalDownloadBtn) {
                finalDownloadBtn.disabled = false;
                finalDownloadBtn.textContent = '📥 Download';
            }
        }
    }

    /**
     * Start polling for download progress
     */
    startProgressPolling() {
        // Clear any existing interval
        this.stopProgressPolling();

        // Poll every 500ms
        this.progressPollingInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/models/download-progress/');
                const data = await response.json();

                if (data.success) {
                    this.updateProgressUI(data);

                    // Stop polling if download is complete or errored
                    if (!data.active && (data.status === 'completed' || data.status === 'error')) {
                        this.stopProgressPolling();
                    }
                }
            } catch (error) {
                console.error('❌ Progress polling error:', error);
            }
        }, 500);
    }

    /**
     * Stop polling for download progress
     */
    stopProgressPolling() {
        if (this.progressPollingInterval) {
            clearInterval(this.progressPollingInterval);
            this.progressPollingInterval = null;
        }
    }

    /**
     * Update progress UI with current download state
     * @param {Object} progress - Progress data from API
     */
    updateProgressUI(progress) {
        const percentageSpan = document.getElementById('downloadPercentage');
        const progressBar = document.getElementById('downloadProgressBar');
        const detailsSpan = document.getElementById('downloadDetails');

        if (percentageSpan) {
            percentageSpan.textContent = `${progress.percentage}%`;
        }

        if (progressBar) {
            progressBar.style.width = `${progress.percentage}%`;
        }

        if (detailsSpan) {
            detailsSpan.textContent = progress.details || 'Download in progress...';
        }
    }
    
    /**
     * Shows the download progress bar
     * @param {string} modelName - Model name being downloaded
     */
    showDownloadProgress(modelName) {
        const progressContainer = document.getElementById('downloadProgress');
        const modelSpan = document.getElementById('downloadingModel');
        const percentageSpan = document.getElementById('downloadPercentage');
        const progressBar = document.getElementById('downloadProgressBar');
        const detailsSpan = document.getElementById('downloadDetails');
        
        if (progressContainer && modelSpan) {
            progressContainer.classList.add('show');
            modelSpan.textContent = `Downloading ${modelName}`;
            percentageSpan.textContent = '0%';
            progressBar.style.width = '0%';
            detailsSpan.textContent = 'Initializing download...';
        }
    }
    
    /**
     * Hides the download progress bar
     */
    hideDownloadProgress() {
        const progressContainer = document.getElementById('downloadProgress');
        if (progressContainer) {
            progressContainer.classList.remove('show');
        }
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelHubSearch;
}