// app.js - Main orchestrator (REFACTORED - PHASE 2)
// New app.js reduced from 2324 lines to ~400 lines

class OllamaEasyGUIApp {
    constructor() {
        // Core properties
        this.currentModel = null; // Selected model in UI
        this.loadedModel = null;  // Actually loaded model in Ollama
        this.models = [];
        this.isConnected = false;
        this.isMCPToolsEnabled = false; // MCP tools OFF by default
        // Removed currentProgressInterval - now using NotificationSystem for progress tracking
        
        // System prompts caching to prevent infinite API calls
        this.systemPromptsCache = null;
        this.systemPromptsCacheTime = 0;
        this.CACHE_TTL = 10000; // 10 seconds cache
        
        // Initialize modular components
        this.chatInterface = new ChatInterface(this);
        this.searchInterface = new SearchInterface(this);
        this.modelManager = new ModelManager(this);
        this.statusIndicator = new StatusIndicator(this);
        this.apiClient = new ApiClient();
        this.storageService = new StorageService();
        
        // Initialize managers (PHASE 3A.1: Modular architecture enhancement)
        this.chatManager = new ChatManager(this);
        this.modelManagerCoordinator = new ModelManagerCoordinator(this);
        
        // Initialize Enhanced File Access (will be setup in init)
        this.unifiedFileSelector = new UnifiedFileSelector();
        this.fileTextExtractor = new FileTextExtractor();
        
        // Initialize FileManager (PHASE 3A.1.3: File processing extraction)
        this.fileManager = new FileManager(this);
        
        // Initialize LocalModelsManager (PHASE 3A.1.4: Local models management extraction)
        this.localModelsManager = new LocalModelsManager(this);
        
        // Initialize extracted utility modules
        this.dragDropHandler = new DragDropHandler(this.chatInterface);
        this.textareaResizeHandler = new TextareaResizeHandler();
        this.notificationSystem = new NotificationSystem();
        
        // Set global references for onclick handlers
        window.chatInterface = this.chatInterface;
        window.searchInterface = this.searchInterface;
        
        console.log('🚀 Ollama Easy GUI App initializing (Modular Architecture)...');
        
        // Initialize application
        this.init();
    }

    async init() {
        // Setup event listeners
        this.setupEventListeners();
        
        // Connect to server
        this.statusIndicator.connectToServer();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start status checking
        this.startStatusChecking();
        
        // Setup Enhanced File Access (after everything else is loaded) - DELEGATED TO FILEMANAGER
        setTimeout(() => {
            console.log('🔧 Setting up Enhanced File Access after timeout...');
            this.fileManager.setupEnhancedFileAccess();
            
            // Additional fallback - try again if first attempt failed
            setTimeout(() => {
                const existingBtn = document.getElementById('enhancedFileBtn');
                if (!existingBtn) {
                    console.log('🔄 Retrying Enhanced File Access setup...');
                    this.fileManager.setupEnhancedFileAccess();
                }
            }, 2000);
        }, 1000);
        
        console.log('✅ Ollama Easy GUI App initialized successfully');
    }

    setupEventListeners() {
        console.log('📋 Setting up event listeners...');
        
        // === MAIN CONTROL BUTTONS ===
        // checkStatusBtn removed - automatic status checking disabled
        // refreshModelsBtn and debugBtn removed - duplicate functionality with status bar and dropdown
        DOMUtils.addClickListener('startBtn', () => this.statusIndicator.startOllama());
        DOMUtils.addClickListener('stopBtn', () => this.statusIndicator.stopOllama());
        DOMUtils.addClickListener('shutdownBtn', () => this.shutdown());

        // === CHAT CONTROLS ===
        // PHASE 3A.1.1: Chat management delegated to ChatManager
        this.chatManager.initialize();

        // === MODEL MANAGEMENT ===
        // PHASE 3A.1.2: Model management delegated to ModelManagerCoordinator
        this.modelManagerCoordinator.initialize();

        // === MESSAGE INPUT & CHAT TITLE EDITING ===
        // PHASE 3A.1.1: Moved to ChatManager.initialize()

        // === MODAL CONTROLS ===
        DOMUtils.addClickListener('cancelNewChat', () => this.chatInterface.cancelNewChat());
        DOMUtils.addClickListener('confirmNewChat', () => this.chatInterface.createNewChat());
        DOMUtils.addClickListener('cancelDelete', () => this.chatInterface.cancelDeleteChat());
        DOMUtils.addClickListener('confirmDelete', () => this.chatInterface.confirmDeleteChat());

        // === ABOUT MODAL ===
        DOMUtils.addClickListener('logoBtn', () => {
            const aboutModal = document.getElementById('aboutModal');
            if (aboutModal) aboutModal.classList.add('show');
        });

        // === FOOTER LINKS ===
        DOMUtils.addClickListener('creditsLink', (e) => {
            e.preventDefault();
            const aboutModal = document.getElementById('aboutModal');
            if (aboutModal) aboutModal.classList.add('show');
        });

        DOMUtils.addClickListener('systemLogLink', (e) => {
            e.preventDefault();
            if (window.logViewer) {
                window.logViewer.open();
            } else {
                this.addNotification('Log viewer not available', 'warning');
            }
        });

        // === SIDEBAR TOGGLES ===
        DOMUtils.addClickListener('toggleLeftSidebar', () => {
            const sidebar = document.querySelector('.sidebar-left');
            const reopenBtn = document.getElementById('reopenLeftSidebar');
            if (sidebar) {
                sidebar.classList.add('hidden');
                reopenBtn?.classList.add('visible');
            }
        });

        DOMUtils.addClickListener('reopenLeftSidebar', () => {
            const sidebar = document.querySelector('.sidebar-left');
            const reopenBtn = document.getElementById('reopenLeftSidebar');
            if (sidebar) {
                sidebar.classList.remove('hidden');
                reopenBtn?.classList.remove('visible');
            }
        });

        DOMUtils.addClickListener('toggleRightSidebar', () => {
            const sidebar = document.querySelector('.sidebar-right');
            const reopenBtn = document.getElementById('reopenRightSidebar');
            if (sidebar) {
                sidebar.classList.add('hidden');
                reopenBtn?.classList.add('visible');
            }
        });

        DOMUtils.addClickListener('reopenRightSidebar', () => {
            const sidebar = document.querySelector('.sidebar-right');
            const reopenBtn = document.getElementById('reopenRightSidebar');
            if (sidebar) {
                sidebar.classList.remove('hidden');
                reopenBtn?.classList.remove('visible');
            }
        });

        // === WEB SEARCH TOGGLE IN HEADER ===
        DOMUtils.addClickListener('webSearchIndicator', () => {
            if (this.searchInterface) {
                const newState = !this.searchInterface.isWebSearchEnabled;
                this.searchInterface.toggleWebSearch(newState);
                this.updateWebSearchIndicator(newState);
            }
        });

        // === FIXED SCROLL TO TOP ===
        DOMUtils.addClickListener('scrollToTopBtn', () => this.statusIndicator.scrollToTop());

        // Removed floating controls and scroll detection - using fixed button in sidebar
        
        // === DRAG & DROP SETUP ===
        this.dragDropHandler.setup();
        
        // === TEXTAREA RESIZE SETUP ===
        this.textareaResizeHandler.setup();
        
        // Streaming always active (like official Ollama)
        
        console.log('✅ Event listeners set up');
    }

    // Streaming always active (toggle removed)

    async restartOllamaWithNewSettings() {
        try {
            this.addNotification('🔄 Restarting Ollama with new settings...', 'info');

            // Stop Ollama
            await this.statusIndicator.stopOllama();

            // Wait a moment
            setTimeout(async () => {
                // Restart Ollama
                await this.statusIndicator.startOllama();
                this.addNotification('✅ Ollama restarted successfully', 'success');
            }, 2000);

        } catch (error) {
            console.error('❌ Error during restart:', error);
            this.addNotification('❌ Error during restart: ' + error.message, 'error');
        }
    }

    async loadInitialData() {
        console.log('📥 Loading initial data...');
        
        try {
            // Load chat list first - CRITICAL FIX
            console.log('📋 Loading chat list...');
            await this.chatInterface.loadChatList();
            
            // Load models after chat list
            console.log('📦 Loading models...');
            await this.modelManagerCoordinator.loadModels();
            
            // Load storage stats
            console.log('📊 Loading storage stats...');
            await this.loadStorageStats();
            
            console.log('✅ Initial data loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.addNotification('❌ Error loading initial data: ' + error.message, 'error');
        }
        
        // Force initial status check
        setTimeout(() => {
            console.log('🔍 Forced initial check...');
            this.statusIndicator.checkDirectStatus();
        }, 1000);
    }

    // Streaming always active - no loading necessary

    startStatusChecking() {
        // Status checking removed - UI indicator is sufficient
        console.log('🔄 Status checking disabled - using UI indicator only');
    }

    // === MODEL MANAGEMENT ===

    // PHASE 3A.1.2: Model management delegated to ModelManagerCoordinator
    async loadModels() {
        return await this.modelManagerCoordinator.loadModels();
    }

    restoreSavedModel() {
        return this.modelManagerCoordinator.restoreSavedModel();
    }

    updateModelInfo() {
        return this.modelManagerCoordinator.updateModelInfo();
    }

    // === UTILITY FUNCTIONS ===
    // PHASE 3A.1.2: Model utility functions delegated to ModelManagerCoordinator

    getModelInfo(modelName) {
        return this.modelManagerCoordinator.getModelInfo(modelName);
    }

    needsExtraLoadingTime(modelInfo) {
        return this.modelManagerCoordinator.needsExtraLoadingTime(modelInfo);
    }

    isLargeModelByName(modelName) {
        return this.modelManagerCoordinator.isLargeModelByName(modelName);
    }

    calculateFrontendTimeout(modelInfo) {
        return this.modelManagerCoordinator.calculateFrontendTimeout(modelInfo);
    }

    calculateTimeoutFromName(modelName) {
        return this.modelManagerCoordinator.calculateTimeoutFromName(modelName);
    }

    // Model methods delegated to ModelManagerCoordinator - REMOVED DUPLICATE IMPLEMENTATIONS

    // Model methods delegated to ModelManagerCoordinator
    async switchToModel(modelName) {
        return await this.modelManagerCoordinator.switchToModel(modelName);
    }

    setCurrentModel(modelName) {
        return this.modelManagerCoordinator.setCurrentModel(modelName);
    }

    getCurrentModel() {
        return this.modelManagerCoordinator.getCurrentModel();
    }

    // REMOVED: showModelLoadingProgress() - replaced with realistic progress notifications
    // The fake progress bar was misleading users about actual loading time
    // Now using NotificationSystem.addProgressNotification() for honest feedback

    // REMOVED: hideModelLoadingProgress() - no longer needed with new notification system
    // Progress notifications are automatically managed by NotificationSystem

    async loadStorageStats() {
        console.log('📊 Loading storage stats...');
        try {
            const data = await this.apiClient.getChatStats();
            
            if (data.success) {
                DOMUtils.updateText('totalChats', data.stats.totalChats || 0);
                DOMUtils.updateText('totalMessages', data.stats.totalMessages || 0);
                
                let sizeInMB;
                if (data.stats.totalSizeBytes && !isNaN(data.stats.totalSizeBytes)) {
                    sizeInMB = (data.stats.totalSizeBytes / (1024*1024)).toFixed(2);
                } else if (data.stats.totalSize && !isNaN(data.stats.totalSize)) {
                    sizeInMB = (data.stats.totalSize / (1024*1024)).toFixed(2);
                } else {
                    sizeInMB = '0.00';
                }
                
                DOMUtils.updateText('totalSize', sizeInMB + ' MB');
                
                console.log('✅ Storage stats updated');
            }
            
        } catch (error) {
            console.error('❌ Error loading storage stats:', error);
            DOMUtils.updateText('totalChats', '0');
            DOMUtils.updateText('totalMessages', '0');
            DOMUtils.updateText('totalSize', '0.00 MB');
        }
    }

    // === LOCAL MODELS MANAGEMENT - DELEGATED TO LOCALMODELSMANAGER ===
    
    // Delegation methods to LocalModelsManager
    showModelManagementModal() {
        return this.localModelsManager.showModelManagementModal();
    }
    
    hideModelManagementModal() {
        return this.localModelsManager.hideModelManagementModal();
    }

    async loadLocalModels() {
        return this.localModelsManager.loadLocalModels();
    }

    async refreshLocalModels() {
        return this.localModelsManager.refreshLocalModels();
    }

    async renderLocalModelsWithSort() {
        return this.localModelsManager.renderLocalModelsWithSort();
    }

    sortLocalModels(models, sortBy) {
        return this.localModelsManager.sortLocalModels(models, sortBy);
    }

    determineModelCategories(modelName) {
        return this.localModelsManager.determineModelCategories(modelName);
    }

    async removeModel(modelName) {
        return this.localModelsManager.removeModel(modelName);
    }

    hideModal(modalId) {
        return this.localModelsManager.hideModal(modalId);
    }

    async shutdown() {
        return this.localModelsManager.shutdown();
    }

    async runDebug() {
        return this.localModelsManager.runDebug();
    }


    // === DRAG & DROP FUNCTIONALITY === 
    // Moved to DragDropHandler.js for size compliance

    // === TEXTAREA RESIZE FUNCTIONALITY ===
    // Moved to TextareaResizeHandler.js for size compliance

    // === NOTIFICATION SYSTEM ===
    // Moved to NotificationSystem.js for size compliance
    addNotification(message, type = 'info', duration = 5000) {
        return this.notificationSystem.addNotification(message, type, duration);
    }

    // === WEB SEARCH INDICATOR UPDATE ===
    updateWebSearchIndicator(enabled) {
        const indicator = document.getElementById('webSearchIndicator');
        if (indicator) {
            if (enabled) {
                indicator.classList.remove('web-search-inactive');
                indicator.classList.add('web-search-active');
            } else {
                indicator.classList.remove('web-search-active');
                indicator.classList.add('web-search-inactive');
            }
        }
    }

    // === ENHANCED FILE ACCESS - DELEGATED TO FILEMANAGER ===
    
    // Delegation methods to FileManager
    setupEnhancedFileAccess() {
        return this.fileManager.setupEnhancedFileAccess();
    }
    
    addFileSelectionButton() {
        return this.fileManager.addFileSelectionButton();
    }

    showEnhancedFileSelection() {
        return this.fileManager.showEnhancedFileSelection();
    }

    async handleFileSelection(selection) {
        return this.fileManager.handleFileSelection(selection);
    }

    updateFileButtonStatus(fileCount, mode) {
        return this.fileManager.updateFileButtonStatus(fileCount, mode);
    }

    showFilePreview(files, mode) {
        return this.fileManager.showFilePreview(files, mode);
    }

    getFileIcon(mimeType) {
        return this.fileManager.getFileIcon(mimeType);
    }

    async processImmediateFile(file) {
        return this.fileManager.processImmediateFile(file);
    }

    async processParallelFiles(files) {
        return this.fileManager.processParallelFiles(files);
    }

    async processBatchFiles(files) {
        return this.fileManager.processBatchFiles(files);
    }

    storeExtractedText(filename, text) {
        return this.fileManager.storeExtractedText(filename, text);
    }

    // === SYSTEM PROMPT HELPERS WITH CACHING ===
    
    async getSystemPrompts() {
        const now = Date.now();
        
        // Return cached data if still valid
        if (this.systemPromptsCache && (now - this.systemPromptsCacheTime) < this.CACHE_TTL) {
            return this.systemPromptsCache;
        }
        
        try {
            const response = await fetch('/api/system-prompts/list');
            const data = await response.json();
            
            if (data.success && data.prompts) {
                this.systemPromptsCache = data.prompts;
                this.systemPromptsCacheTime = now;
                return data.prompts;
            }
            
            return {};
        } catch (error) {
            console.warn('⚠️ Error getting system prompts:', error);
            return this.systemPromptsCache || {};
        }
    }
    
    async hasSystemPrompt(modelName) {
        try {
            const prompts = await this.getSystemPrompts();
            
            // Check if model has specific prompt (not default)
            return prompts[modelName] && prompts[modelName] !== prompts['default'];
        } catch (error) {
            console.warn('⚠️ Error checking system prompts:', error);
            return false;
        }
    }
    
    // Method to invalidate cache when prompts are updated
    invalidateSystemPromptsCache() {
        this.systemPromptsCache = null;
        this.systemPromptsCacheTime = 0;
    }

}

// === GLOBALS FOR COMPONENT ACCESS ===
let app;

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM loaded, starting Ollama Easy GUI...');
    app = new OllamaEasyGUIApp();
    window.app = app; // Expose globally for MCPManager and other components
});