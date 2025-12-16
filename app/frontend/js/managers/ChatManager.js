/**
 * ChatManager.js - Chat Management Coordination
 * 
 * EXTRACTED FROM: app.js (Phase 3A.1.1)
 * PURPOSE: Specialized manager per chat-related functionality coordination
 * METHODOLOGY: Analysis-First + Phoenix Transformation
 * 
 * RESPONSIBILITIES:
 * - Chat controls event listeners setup
 * - Message input handling coordination  
 * - Chat title editing management
 * - Bridge between UI events and ChatInterface component
 * 
 * SIZE: ~200 righe (extracted from 1,235 righe app.js)
 * ARCHITECTURE: Modular manager pattern con dependency injection
 */

class ChatManager {
    constructor(app) {
        // Dependency injection del main app
        this.app = app;
        this.chatInterface = app.chatInterface;
        
        console.log('🗣️ ChatManager initialized - Chat coordination active');
    }

    /**
     * Setup all chat-related event listeners
     * EXTRACTED FROM: app.js setupEventListeners() lines 87-103
     */
    setupChatControls() {
        console.log('📋 ChatManager: Setting up chat controls...');
        
        this.setupChatButtons();
        this.setupMessageInput();
        this.setupChatTitleEditing();
        this.setupFileInput();
        
        console.log('✅ ChatManager: Chat controls setup completed');
    }

    /**
     * Setup chat action buttons
     * EXTRACTED FROM: app.js lines 87-91
     */
    setupChatButtons() {
        // Chat control buttons
        DOMUtils.addClickListener('sendBtn', () => this.chatInterface.sendMessage());
        DOMUtils.addClickListener('newChatBtn', () => this.chatInterface.showNewChatModal());
        DOMUtils.addClickListener('stopStreamBtn', () => this.chatInterface.stopCurrentStream());
        DOMUtils.addClickListener('deleteChatBtn', () => this.chatInterface.showDeleteChatModal());
        
        console.log('🔘 ChatManager: Chat buttons configured');
    }

    /**
     * Setup message input event handling  
     * EXTRACTED FROM: app.js lines 128-143
     */
    setupMessageInput() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) {
            console.warn('⚠️ ChatManager: messageInput not found');
            return;
        }

        // Enter key handling for message sending
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.chatInterface.sendMessage();
            }
        });
        
        // Auto-resize textarea as user types
        messageInput.addEventListener('input', (e) => {
            DOMUtils.autoResizeTextarea(e.target);
        });

        console.log('⌨️ ChatManager: Message input configured');
    }

    /**
     * Setup chat title editing functionality
     * EXTRACTED FROM: app.js lines 145-160
     */
    setupChatTitleEditing() {
        const chatTitle = document.getElementById('currentChatTitle');
        if (!chatTitle) {
            console.warn('⚠️ ChatManager: currentChatTitle not found');
            return;
        }

        // Save title on Enter key press
        chatTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.chatInterface.saveChatTitle();
            }
        });
        
        // Save title when element loses focus
        chatTitle.addEventListener('blur', () => {
            this.chatInterface.saveChatTitle();
        });

        console.log('✏️ ChatManager: Chat title editing configured');
    }

    /**
     * Setup file input for attachments
     * EXTRACTED FROM: app.js lines 99-103
     */
    setupFileInput() {
        const fileInput = document.getElementById('fileInput');
        if (!fileInput) {
            console.warn('⚠️ ChatManager: fileInput not found');
            return;
        }

        // Handle file selection changes
        fileInput.addEventListener('change', (e) => {
            this.chatInterface.handleFileSelect(e);
        });

        console.log('📎 ChatManager: File input configured');
    }

    /**
     * Setup attachment button (coordination with ChatInterface)
     * EXTRACTED FROM: app.js lines 93-94
     */
    setupAttachmentButton() {
        DOMUtils.addClickListener('attachBtn', () => this.chatInterface.openFileDialog());
        console.log('📁 ChatManager: Attachment button configured');
    }

    /**
     * Coordinate all chat-related setup
     * MAIN ENTRY POINT for chat functionality initialization
     */
    initialize() {
        console.log('🚀 ChatManager: Starting comprehensive initialization...');
        
        this.setupChatControls();
        this.setupAttachmentButton();
        
        console.log('✅ ChatManager: Initialization completed successfully');
    }

    /**
     * Get chat status for debugging/monitoring
     * UTILITY METHOD for system diagnostics
     */
    getChatStatus() {
        return {
            hasMessageInput: !!document.getElementById('messageInput'),
            hasChatTitle: !!document.getElementById('currentChatTitle'),
            hasFileInput: !!document.getElementById('fileInput'),
            chatInterface: !!this.chatInterface,
            isActive: true
        };
    }

    /**
     * Cleanup event listeners (for potential future use)
     * MAINTENANCE METHOD for clean shutdowns
     */
    cleanup() {
        console.log('🧹 ChatManager: Performing cleanup...');
        // Future: Remove event listeners if needed
        console.log('✅ ChatManager: Cleanup completed');
    }
}

// Export per modular loading
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatManager;
}