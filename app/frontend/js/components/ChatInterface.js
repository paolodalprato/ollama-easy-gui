/**
 * ChatInterface - Main chat UI component
 *
 * Manages the chat interface including:
 * - Conversation CRUD (create, load, delete, rename)
 * - Message display and formatting
 * - Attachment handling (delegated to AttachmentManager)
 * - Streaming responses (delegated to MessageStreamManager)
 * - Download/export functionality (delegated to ChatDownloadManager)
 *
 * @class ChatInterface
 */
class ChatInterface {
    /**
     * Create a ChatInterface instance
     * @param {Object} app - Main application instance with apiClient, models, etc.
     */
    constructor(app) {
        /** @type {Object} Main app reference */
        this.app = app;

        /** @type {string|null} Currently selected chat ID */
        this.currentChatId = null;

        /** @type {Object[]} List of chat objects */
        this.chats = [];

        /** @type {File[]} Files waiting to be attached */
        this.pendingAttachments = [];

        // Initialize UI managers (modular architecture)
        /** @type {AttachmentManager} Handles file attachments */
        this.attachmentManager = new AttachmentManager(this);

        /** @type {MessageStreamManager} Handles streaming responses */
        this.streamManager = new MessageStreamManager(this);

        /** @type {ChatDownloadManager} Handles message downloads */
        this.downloadManager = new ChatDownloadManager(this);

        console.log('💬 ChatInterface initialized with UI managers');

        // Setup download menu event listeners
        this.downloadManager.setupDownloadMenu();
    }

    // === ATTACHMENT MANAGEMENT - DELEGATED TO ATTACHMENTMANAGER ===

    openFileDialog() {
        return this.attachmentManager.openFileDialog();
    }

    handleFileSelect(e) {
        return this.attachmentManager.handleFileSelect(e);
    }

    handleDrop(e) {
        return this.attachmentManager.handleDrop(e);
    }

    addAttachments(files) {
        return this.attachmentManager.addAttachments(files);
    }

    renderAttachmentPreview() {
        return this.attachmentManager.renderAttachmentPreview();
    }

    removeAttachment(index) {
        return this.attachmentManager.removeAttachment(index);
    }

    getFileIcon(filename) {
        return this.attachmentManager.getFileIcon(filename);
    }

    // === CHAT MANAGEMENT ===

    /**
     * Save the current chat title (called on blur/enter)
     */
    async saveChatTitle() {
        const titleInput = document.getElementById('currentChatTitle');
        if (!titleInput || !this.currentChatId) return;

        const newTitle = titleInput.value.trim();
        if (!newTitle || newTitle === 'Select or create a conversation') {
            console.log('❌ Invalid title, not saving');
            return;
        }

        const currentChat = this.chats.find(chat => chat.id === this.currentChatId);
        if (!currentChat) {
            console.log('❌ Current chat not found');
            return;
        }

        if (currentChat.title === newTitle) {
            console.log('📝 Title unchanged, no save needed');
            return;
        }

        try {
            console.log(`📝 Saving chat title: "${currentChat.title}" -> "${newTitle}"`);
            const response = await this.app.apiClient.updateChatTitle(this.currentChatId, newTitle);

            if (response.success) {
                currentChat.title = newTitle;
                await this.loadChatList();
                this.app.addNotification(`✅ Title updated: "${newTitle}"`, 'success');
            } else {
                throw new Error(response.error || 'Error updating title');
            }

        } catch (error) {
            console.error('❌ Error saving chat title:', error);
            this.app.addNotification(`❌ Error saving title: ${error.message}`, 'error');
            titleInput.value = currentChat.title;
        }
    }

    /**
     * Send the current message (delegates to MessageStreamManager)
     */
    async sendMessage() {
        return this.streamManager.sendMessage();
    }

    /**
     * Show the "New Chat" modal dialog
     */
    showNewChatModal() {
        this.populateModalModelList();
        DOMUtils.setValue('newChatTitle', '');
        DOMUtils.showModal('newChatModal');
        DOMUtils.focus('newChatTitle');
    }

    async populateModalModelList() {
        const select = document.getElementById('newChatModel');
        if (!select || !this.app.models) return;

        select.innerHTML = '<option value="">Use selected model</option>';
        await this.app.getSystemPrompts();

        const sortedModels = [...this.app.models].sort((a, b) => a.name.localeCompare(b.name));

        const modelOptions = await Promise.all(sortedModels.map(async model => {
            const option = document.createElement('option');
            option.value = model.name;
            const sizeGB = (model.size / (1000**3)).toFixed(1);
            const hasCustomPrompt = await this.hasSystemPrompt(model.name);
            const asterisk = hasCustomPrompt ? ' *' : '';
            option.textContent = `${model.name}${asterisk} (${sizeGB}GB)`;

            if (model.name === this.app.currentModel) {
                option.selected = true;
            }

            return option;
        }));

        modelOptions.forEach(option => select.appendChild(option));
        console.log('📋 Modal model list populated with', this.app.models.length, 'models');
    }

    cancelNewChat() {
        DOMUtils.hideModal('newChatModal');
        console.log('❌ New chat cancelled');
    }

    /**
     * Create a new chat from modal form data
     */
    async createNewChat() {
        const title = DOMUtils.getValue('newChatTitle').trim();
        const modelSelect = document.getElementById('newChatModel');
        const selectedModel = modelSelect.value || this.app.currentModel;

        if (!title) {
            this.app.addNotification('⚠️ Enter a title for the conversation', 'warning');
            DOMUtils.focus('newChatTitle');
            return;
        }

        if (!selectedModel) {
            this.app.addNotification('⚠️ Select a model for the conversation', 'warning');
            return;
        }

        try {
            console.log('📝 Creating new chat:', title, 'with model:', selectedModel);
            const data = await this.app.apiClient.createNewChat(title, selectedModel);

            if (data.success) {
                this.app.addNotification(`✅ Conversation "${title}" created`, 'success');
                DOMUtils.hideModal('newChatModal');

                if (selectedModel && selectedModel !== this.app.currentModel) {
                    const select = document.getElementById('modelSelect');
                    if (select) {
                        select.value = selectedModel;
                        this.app.updateModelInfo();
                    }
                    this.app.addNotification(
                        `💤 Model ${selectedModel} will be loaded when you send the first message`,
                        'info'
                    );
                }

                await this.loadChatList();

                if (data.chatId) {
                    await this.selectChat(data.chatId);
                    const chatInputArea = document.getElementById('chatInputArea');
                    if (chatInputArea) {
                        chatInputArea.style.display = 'block';
                    }
                    this.app.statusIndicator.enableControls();
                }

            } else {
                throw new Error(data.error || 'Error creating chat');
            }

        } catch (error) {
            console.error('❌ Create chat error:', error);
            this.app.addNotification(`❌ Error creating chat: ${error.message}`, 'error');
        }
    }

    cancelDeleteChat() {
        DOMUtils.hideModal('deleteChatModal');
    }

    async confirmDeleteChat() {
        if (!this.currentChatId) return;

        try {
            console.log('🗑️ Deleting chat:', this.currentChatId);
            const data = await this.app.apiClient.deleteChat(this.currentChatId);

            if (data.success) {
                this.app.addNotification('✅ Conversation deleted', 'success');
                DOMUtils.hideModal('deleteChatModal');

                this.currentChatId = null;
                const titleInput = document.getElementById('currentChatTitle');
                if (titleInput) {
                    titleInput.value = 'Select or create a conversation';
                    titleInput.setAttribute('readonly', 'true');
                    titleInput.classList.add('placeholder');
                    titleInput.removeAttribute('title');
                }

                DOMUtils.disableElement('deleteChatBtn');

                const chatInputArea = document.getElementById('chatInputArea');
                if (chatInputArea) {
                    chatInputArea.style.display = 'none';
                }

                const container = document.getElementById('chatMessages');
                if (container) {
                    container.innerHTML = '<div class="welcome-message">Select or create a conversation!</div>';
                }

                await this.loadChatList();

            } else {
                throw new Error(data.error || 'Error deleting chat');
            }

        } catch (error) {
            console.error('❌ Delete chat error:', error);
            this.app.addNotification(`❌ Error deleting chat: ${error.message}`, 'error');
        }
    }

    showDeleteChatModal() {
        if (!this.currentChatId) {
            this.app.addNotification('⚠️ No chat selected', 'warning');
            return;
        }

        const currentChat = this.chats.find(chat => chat.id === this.currentChatId);
        if (currentChat) {
            DOMUtils.updateText('deleteChatTitle', currentChat.title);
            DOMUtils.showModal('deleteChatModal');
        }
    }

    /**
     * Load the list of all chats from server
     */
    async loadChatList() {
        console.log('📥 Loading chat list...');
        try {
            const data = await this.app.apiClient.getChatList();

            if (data.success) {
                this.chats = data.chats || [];
                this.renderChatList();
                console.log('✅ Chat list loaded:', this.chats.length, 'chats');
            } else {
                throw new Error(data.error || 'Error loading chats');
            }

        } catch (error) {
            console.error('❌ Load chat list error:', error);
            this.app.addNotification(`❌ Error loading chats: ${error.message}`, 'error');
        }
    }

    renderChatList() {
        const container = document.getElementById('chatList');
        if (!container) return;

        if (this.chats.length === 0) {
            container.innerHTML = `
                <div class="welcome-message">
                    <p>📝 Your conversations will appear here</p>
                    <p><small>All saved locally for privacy</small></p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.chats.map(chat => `
            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-meta">
                    <span>${chat.messageCount || 0} messages</span>
                    <span>${new Date(chat.lastModified).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.getAttribute('data-chat-id');
                this.selectChat(chatId);
            });
        });
    }

    /**
     * Select and load a chat by ID
     */
    async selectChat(chatId) {
        console.log('📂 Selecting chat:', chatId);
        this.currentChatId = chatId;

        const existingSection = document.querySelector('.chat-attachments-section');
        if (existingSection) {
            existingSection.remove();
        }

        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            const titleInput = document.getElementById('currentChatTitle');
            if (titleInput) {
                titleInput.value = chat.title;
                titleInput.removeAttribute('readonly');
                titleInput.classList.remove('placeholder');
                titleInput.title = 'Click to edit title (Enter or click outside to save)';
            }

            DOMUtils.enableElement('deleteChatBtn');

            const chatInputArea = document.getElementById('chatInputArea');
            if (chatInputArea) {
                chatInputArea.style.display = 'block';
            }
            this.app.statusIndicator.enableControls();

            await this.loadChatMessages(chatId);

            if (chat.model && chat.model !== this.app.currentModel) {
                const select = document.getElementById('modelSelect');
                if (select) {
                    select.value = chat.model;
                    this.app.updateModelInfo();
                }

                if (chat.model !== this.app.loadedModel) {
                    this.app.addNotification(
                        `💤 Model ${chat.model} will be loaded when you send the next message`,
                        'info'
                    );
                }
            }
        }

        this.renderChatList();
    }

    async loadChatMessages(chatId) {
        console.log('📥 Loading messages for chat:', chatId);
        try {
            const data = await this.app.apiClient.loadChat(chatId);

            if (data.success) {
                this.renderChatMessages(data.messages || []);

                const chatIndex = this.chats.findIndex(c => c.id === chatId);
                if (chatIndex !== -1 && data.metadata) {
                    this.chats[chatIndex] = { ...this.chats[chatIndex], ...data.metadata };
                }

                if (data.metadata && data.metadata.hasAttachments) {
                    await this.loadChatAttachments(chatId);
                }

            } else {
                throw new Error(data.error || 'Error loading messages');
            }

        } catch (error) {
            console.error('❌ Load messages error:', error);
            this.app.addNotification(`❌ Error loading messages: ${error.message}`, 'error');
        }
    }

    renderChatMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = '<div class="welcome-message">Start a new conversation!</div>';
            return;
        }

        container.innerHTML = messages.map(message => {
            const attachmentHtml = this.renderMessageAttachments(message.attachments || [], this.currentChatId);
            const downloadButton = message.role === 'assistant' ?
                `<button class="download-response-btn" data-timestamp="${message.timestamp}" title="Download response">Download</button>` : '';

            return `
            <div class="message ${message.role}">
                <div class="message-content">
                    ${this.formatMessage(message.content)}
                    ${downloadButton}
                </div>
                ${attachmentHtml}
                <div class="message-time">${new Date(message.timestamp).toLocaleString()}</div>
            </div>
            `;
        }).join('');

        this.downloadManager.setupDownloadButtonHandlers();
        DOMUtils.scrollToBottom('chatMessages');
    }

    renderMessageAttachments(attachments, chatId) {
        return this.attachmentManager.renderMessageAttachments(attachments, chatId);
    }

    isImageFile(filename) {
        return this.attachmentManager.isImageFile(filename);
    }

    async loadChatAttachments(chatId) {
        return this.attachmentManager.loadChatAttachments(chatId);
    }

    showChatAttachments(chatId, attachments) {
        return this.attachmentManager.showChatAttachments(chatId, attachments);
    }

    /**
     * Format message content for display (XSS-safe)
     */
    formatMessage(content) {
        if (!content) return '';

        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        return escaped
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    // === DOWNLOAD MENU - DELEGATED ===

    setupDownloadButtonHandlers() {
        return this.downloadManager.setupDownloadButtonHandlers();
    }

    setupDownloadMenu() {
        return this.downloadManager.setupDownloadMenu();
    }

    showDownloadMenu(event, messageTimestamp) {
        return this.downloadManager.showDownloadMenu(event, messageTimestamp);
    }

    hideDownloadMenu() {
        return this.downloadManager.hideDownloadMenu();
    }

    async downloadMessage(messageTimestamp, format) {
        return this.downloadManager.downloadMessage(messageTimestamp, format);
    }

    // === STREAM CONTROL - DELEGATED ===

    updateProcessingIndicator(newMessage) {
        return this.streamManager.updateProcessingIndicator(newMessage);
    }

    createStreamingMessageElement() {
        return this.streamManager.createStreamingMessageElement();
    }

    updateStreamingMessage(messageElement, newContent) {
        return this.streamManager.updateStreamingMessage(messageElement, newContent);
    }

    finalizeStreamingMessage(messageElement) {
        return this.streamManager.finalizeStreamingMessage(messageElement);
    }

    stopCurrentStream() {
        return this.streamManager.stopCurrentStream();
    }

    clearCurrentStream() {
        return this.streamManager.clearCurrentStream();
    }

    handleStreamingError(messageElement, error) {
        return this.streamManager.handleStreamingError(messageElement, error);
    }

    async hasSystemPrompt(modelName) {
        return await this.app.hasSystemPrompt(modelName);
    }

    preventDefaults(e) {
        return this.attachmentManager.preventDefaults(e);
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatInterface;
}
