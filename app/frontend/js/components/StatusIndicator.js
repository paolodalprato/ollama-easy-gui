// StatusIndicator.js - System status indicators management
class StatusIndicator {
    constructor(app) {
        this.app = app;
        this.eventSource = null;
        this.pollingInterval = null;
        
        console.log('📊 StatusIndicator initialized');
    }

    // === CONNECTION MANAGEMENT ===
    
    connectToServer() {
        console.log('🔌 Connecting to server...');
        this.eventSource = new EventSource('/events');
        
        this.eventSource.onopen = () => {
            console.log('✅ Connected to server events');
            this.app.addNotification('✅ Connected to server', 'success');
        };
        
        this.eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('📨 Server message:', data.type, data);
            
            switch (data.type) {
                case 'status':
                    this.updateOllamaStatus(data.data);
                    break;
                case 'ollamaStatus':
                    this.handleOllamaStatusChange(data);
                    break;
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('❌ EventSource error:', error);
            this.app.addNotification('⚠️ Server connection lost - Using polling', 'warning');
            this.startPolling();
        };
    }

    async checkDirectStatus() {
        console.log('🔍 Direct status check...');
        try {
            const response = await fetch('/api/ollama/status');
            const data = await response.json();
            console.log('📊 Status data:', data);
            
            this.updateOllamaStatus(data);
            
            if (data.isRunning && this.app.models.length === 0) {
                console.log('🔄 Loading models...');
                await this.app.loadModels();
            }
            
        } catch (error) {
            console.error('❌ Direct status check failed:', error);
            this.updateOllamaStatus({
                isRunning: false,
                error: 'Connection failed'
            });
        }
    }

    startPolling() {
        // Polling disabled - UI indicator updates on demand only
        console.log('🔄 Polling disabled - UI indicator is sufficient');
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    updateOllamaStatus(status) {
        console.log('🔄 Updating Ollama status:', status);
        this.app.isConnected = status.isRunning;
        
        const indicator = document.getElementById('statusIndicator');
        
        // Ollama buttons management
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (status.isRunning) {
            console.log('✅ Ollama is running - enabling controls');
            indicator.className = 'status-indicator status-connected';
            indicator.innerHTML = '<div class="status-dot dot-green"></div><span>Ollama Connected</span>';
            
            // Ollama active: disable Start, enable Stop
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;
            
            this.enableControls();
            
            if (this.app.models.length === 0) {
                console.log('📥 No models loaded, loading now...');
                this.app.loadModels();
            }
        } else {
            console.log('❌ Ollama is not running - disabling controls');
            indicator.className = 'status-indicator status-disconnected';
            indicator.innerHTML = '<div class="status-dot dot-red blinking"></div><span>Ollama Disconnected</span>';
            
            // Ollama inactive: enable Start, disable Stop
            if (startBtn) startBtn.disabled = false;
            if (stopBtn) stopBtn.disabled = true;
            
            this.disableControls();
        }
    }

    enableControls() {
        console.log('🔓 Enabling controls');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        // refreshModelsBtn removed - no longer in UI
        const attachBtn = document.getElementById('attachBtn');

        // Check if there's an active chat before enabling message input
        const hasActiveChat = this.app.chatInterface && this.app.chatInterface.currentChatId;
        
        if (messageInput) {
            messageInput.disabled = !hasActiveChat;
            messageInput.placeholder = hasActiveChat ?
                'Type your message...' :
                'Select or create a conversation to start...';
        }
        if (sendBtn) sendBtn.disabled = !hasActiveChat;
        if (attachBtn) attachBtn.disabled = !hasActiveChat;
    }

    disableControls() {
        console.log('🔒 Disabling controls');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        // refreshModelsBtn removed - no longer in UI  
        const attachBtn = document.getElementById('attachBtn');

        if (messageInput) {
            messageInput.disabled = true;
            messageInput.placeholder = 'Ollama not available - use diagnostics from floating menu';
        }
        if (sendBtn) sendBtn.disabled = true;
        if (attachBtn) attachBtn.disabled = true;
    }

    handleOllamaStatusChange(data) { 
        this.app.addNotification(data.message, data.status === 'ERROR' ? 'error' : 'info'); 
    }

    // === OLLAMA CONTROL FUNCTIONS ===
    
    async startOllama() {
        this.app.addNotification('Ollama start command sent...', 'info');
        try {
            const response = await fetch('/api/ollama/start', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                this.app.addNotification('✅ Ollama started', 'success');
                setTimeout(() => this.checkDirectStatus(), 2000);
            } else {
                this.app.addNotification('❌ Start error: ' + data.error, 'error');
            }
        } catch (error) {
            this.app.addNotification('❌ Start error: ' + error.message, 'error');
        }
    }

    async stopOllama() {
        this.app.addNotification('Ollama stop command sent...', 'info');
        try {
            const response = await fetch('/api/ollama/stop', { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                this.app.addNotification('✅ Ollama stopped', 'success');
                // Check status after stop to update the interface
                setTimeout(() => this.checkDirectStatus(), 2000);
            } else {
                this.app.addNotification('❌ Stop error: ' + (data.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.app.addNotification('❌ Stop error: ' + error.message, 'error');
        }
    }

    // === SCROLL FUNCTIONS ===
    // Removed setupScrollDetection() - no longer needed with fixed sidebar button
    
    scrollToTop() {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.scrollTo({ top: 0, behavior: 'smooth' });
            this.app.addNotification('⬆️ Scrolled to top', 'info');
        }
    }

    getDiagnosticIcon(type) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            case 'running': return '🔄';
            default: return '•';
        }
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusIndicator;
}