// ChatInterface.js - Chat interface management (REFACTORED - PHASE 3A.2)
class ChatInterface {
    constructor(app) {
        this.app = app;
        this.currentChatId = null;
        this.chats = [];
        this.pendingAttachments = [];
        
        // Initialize UI managers (PHASE 3A.2: Modular architecture)
        this.attachmentManager = new AttachmentManager(this);
        this.streamManager = new MessageStreamManager(this);
        
        console.log('💬 ChatInterface initialized with UI managers');
        
        // Setup download menu event listeners
        this.setupDownloadMenu();
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
    
    async saveChatTitle() {
        const titleInput = document.getElementById('currentChatTitle');
        if (!titleInput || !this.currentChatId) return;
        
        const newTitle = titleInput.value.trim();
        if (!newTitle || newTitle === 'Select or create a conversation') {
            console.log('❌ Invalid title, not saving');
            return;
        }
        
        // Find current chat to compare title
        const currentChat = this.chats.find(chat => chat.id === this.currentChatId);
        if (!currentChat) {
            console.log('❌ Current chat not found');
            return;
        }
        
        // If title hasn't changed, do nothing
        if (currentChat.title === newTitle) {
            console.log('📝 Title unchanged, no save needed');
            return;
        }
        
        try {
            console.log(`📝 Saving chat title: "${currentChat.title}" -> "${newTitle}"`);
            
            const response = await this.app.apiClient.updateChatTitle(this.currentChatId, newTitle);
            
            if (response.success) {
                // Update local chat
                currentChat.title = newTitle;
                
                // Reload chat list to reflect the change
                await this.loadChatList();
                
                this.app.addNotification(`✅ Title updated: "${newTitle}"`, 'success');
                console.log('✅ Chat title updated successfully');
            } else {
                throw new Error(response.error || 'Error updating title');
            }

        } catch (error) {
            console.error('❌ Error saving chat title:', error);
            this.app.addNotification(`❌ Error saving title: ${error.message}`, 'error');
            
            // Restore original title
            titleInput.value = currentChat.title;
        }
    }
    
    async sendMessage() {
        return this.streamManager.sendMessage();
    }
    
    showNewChatModal() {
        // Populate model list in modal
        this.populateModalModelList();

        // Clean the form
        DOMUtils.setValue('newChatTitle', '');

        // Show modal and focus
        DOMUtils.showModal('newChatModal');
        DOMUtils.focus('newChatTitle');
    }
    
    async populateModalModelList() {
        const select = document.getElementById('newChatModel');
        if (!select || !this.app.models) return;
        
        // Clear and add default option
        select.innerHTML = '<option value="">Use selected model</option>';
        
        // Pre-load system prompts cache before processing models
        await this.app.getSystemPrompts();
        
        // Add all available models with system prompt indicators
        // Apply same deduplication and sorting as ModelManagerCoordinator
        const sortedModels = [...this.app.models].sort((a, b) => a.name.localeCompare(b.name));
        
        const modelOptions = await Promise.all(sortedModels.map(async model => {
            const option = document.createElement('option');
            option.value = model.name;
            const sizeGB = (model.size / (1000**3)).toFixed(1);
            
            // Check if it has a custom system prompt
            const hasCustomPrompt = await this.hasSystemPrompt(model.name);
            const asterisk = hasCustomPrompt ? ' *' : '';
            option.textContent = `${model.name}${asterisk} (${sizeGB}GB)`;
            
            // Select current model if present
            if (model.name === this.app.currentModel) {
                option.selected = true;
            }
            
            return option;
        }));
        
        // Add all options to select
        modelOptions.forEach(option => select.appendChild(option));
        
        console.log('📋 Modal model list populated with', this.app.models.length, 'models');
    }
    
    cancelNewChat() {
        DOMUtils.hideModal('newChatModal');
        console.log('❌ New chat cancelled');
    }
    
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

                // Close modal
                DOMUtils.hideModal('newChatModal');

                // If selected model differs from active one, update UI only (lazy loading)
                if (selectedModel && selectedModel !== this.app.currentModel) {
                    console.log(`📋 New chat will use model ${selectedModel}, updating UI but not loading yet (lazy loading)`);

                    // Update UI only
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

                // Reload chat list
                await this.loadChatList();

                // Select the new chat
                if (data.chatId) {
                    await this.selectChat(data.chatId);

                    // Show input area and enable controls now that we have an active chat
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
        console.log('❌ Delete chat cancelled');
    }
    
    async confirmDeleteChat() {
        if (!this.currentChatId) return;
        
        try {
            console.log('🗑️ Deleting chat:', this.currentChatId);
            
            const data = await this.app.apiClient.deleteChat(this.currentChatId);
            
            if (data.success) {
                this.app.addNotification('✅ Conversation deleted', 'success');

                // Close modal
                DOMUtils.hideModal('deleteChatModal');

                // Reset current chat
                this.currentChatId = null;
                const titleInput = document.getElementById('currentChatTitle');
                if (titleInput) {
                    titleInput.value = 'Select or create a conversation';
                    titleInput.setAttribute('readonly', 'true');
                    titleInput.classList.add('placeholder');
                    titleInput.removeAttribute('title');
                }

                DOMUtils.disableElement('deleteChatBtn');

                // Hide input area since no chat is selected
                const chatInputArea = document.getElementById('chatInputArea');
                if (chatInputArea) {
                    chatInputArea.style.display = 'none';
                }

                // Clear messages
                const container = document.getElementById('chatMessages');
                if (container) {
                    container.innerHTML = '<div class="welcome-message">Select or create a conversation!</div>';
                }

                // Reload chat list
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
    
    async loadChatList() {
        console.log('📥 Loading chat list...');
        try {
            console.log('🌐 Calling getChatList API...');
            const data = await this.app.apiClient.getChatList();
            console.log('📡 API response:', data);
            
            if (data.success) {
                this.chats = data.chats || [];
                console.log('💾 Chats saved in this.chats:', this.chats.length, 'chats');
                console.log('📋 First 3 chats:', this.chats.slice(0, 3));

                this.renderChatList();
                console.log('✅ Chat list loaded:', this.chats.length, 'chats');
            } else {
                console.error('❌ API returned error:', data.error);
                throw new Error(data.error || 'Error loading chats');
            }

        } catch (error) {
            console.error('❌ Load chat list error:', error);
            this.app.addNotification(`❌ Error loading chats: ${error.message}`, 'error');
        }
    }
    
    renderChatList() {
        console.log('🖼️ renderChatList() called with', this.chats.length, 'chats');
        console.log('📋 Chat array:', this.chats);
        
        const container = document.getElementById('chatList');
        if (!container) {
            console.error('❌ Container chatList not found in DOM!');
            return;
        }
        
        console.log('✅ Container chatList found:', container);
        
        if (this.chats.length === 0) {
            console.log('📝 No chats - showing welcome message');
            container.innerHTML = `
                <div class="welcome-message">
                    <p>📝 Your conversations will appear here</p>
                    <p><small>All saved locally for privacy</small></p>
                </div>
            `;
            return;
        }

        console.log('🎨 Rendering', this.chats.length, 'chats in UI');

        container.innerHTML = this.chats.map(chat => `
            <div class="chat-item ${chat.id === this.currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-meta">
                    <span>${chat.messageCount || 0} messages</span>
                    <span>${new Date(chat.lastModified).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
        
        // Add click listeners
        container.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const chatId = item.getAttribute('data-chat-id');
                this.selectChat(chatId);
            });
        });
    }
    
    async selectChat(chatId) {
        console.log('📂 Selecting chat:', chatId);
        this.currentChatId = chatId;
        
        // Remove previous attachments section if exists
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
            
            // Show input area and enable message controls now that chat is selected
            const chatInputArea = document.getElementById('chatInputArea');
            if (chatInputArea) {
                chatInputArea.style.display = 'block';
            }
            this.app.statusIndicator.enableControls();
            
            // Load chat messages
            await this.loadChatMessages(chatId);
            
            // If chat has a different model than active one, update interface but don't load yet
            if (chat.model && chat.model !== this.app.currentModel) {
                console.log(`📋 Chat uses model ${chat.model}, showing in UI but not loading yet (lazy loading)`);
                
                // Update only interface to show chat model
                const select = document.getElementById('modelSelect');
                if (select) {
                    select.value = chat.model;
                    this.app.updateModelInfo(); // Update model info in interface
                }
                
                // Show indicator that model will change on next message
                if (chat.model !== this.app.loadedModel) {
                    this.app.addNotification(
                        `💤 Model ${chat.model} will be loaded when you send the next message`,
                        'info'
                    );
                }
            }
        }
        
        this.renderChatList(); // Update active state
    }
    
    async loadChatMessages(chatId) {
        console.log('📥 Loading messages for chat:', chatId);
        try {
            const data = await this.app.apiClient.loadChat(chatId);
            console.log('📥 API response data:', { 
                success: data.success, 
                messagesCount: data.messages?.length,
                messages: data.messages 
            });
            
            if (data.success) {
                this.renderChatMessages(data.messages || []);
                
                // Update local chat object with metadata from server (including model)
                const chatIndex = this.chats.findIndex(c => c.id === chatId);
                if (chatIndex !== -1 && data.metadata) {
                    this.chats[chatIndex] = { ...this.chats[chatIndex], ...data.metadata };
                    console.log('📋 Updated chat metadata with model:', data.metadata.model);
                }
                
                // Load chat attachments if present
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
            console.log('📋 Rendering message:', {
                role: message.role,
                hasContent: !!message.content,
                attachments: message.attachments,
                attachmentsLength: message.attachments ? message.attachments.length : 'undefined'
            });
            
            const attachmentHtml = this.renderMessageAttachments(message.attachments || [], this.currentChatId);
            console.log('📋 Generated attachment HTML length:', attachmentHtml.length);
            
            // Add download button only for assistant messages
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
        
        // Setup event delegation per download buttons
        this.setupDownloadButtonHandlers();
        
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
    
    formatMessage(content) {
        // Basic formatting - can be enhanced later
        return content.replace(/\n/g, '<br>');
    }

    // === DOWNLOAD MENU FUNCTIONS ===
    
    setupDownloadButtonHandlers() {
        const chatContainer = document.getElementById('chatMessages');
        if (!chatContainer) return;
        
        // Remove existing listeners to avoid duplicates
        chatContainer.removeEventListener('click', this.downloadButtonClickHandler);
        
        // Add new event delegation listener
        this.downloadButtonClickHandler = (event) => {
            const downloadBtn = event.target.closest('.download-response-btn');
            if (downloadBtn) {
                event.preventDefault();
                event.stopPropagation();
                const timestamp = downloadBtn.getAttribute('data-timestamp');
                console.log('📥 Download button clicked for message:', timestamp);
                this.showDownloadMenu(event, timestamp);
            }
        };
        
        chatContainer.addEventListener('click', this.downloadButtonClickHandler);
    }
    
    setupDownloadMenu() {
        const downloadMenu = document.getElementById('downloadMenu');
        if (!downloadMenu) return;
        
        // Event listeners for menu options
        downloadMenu.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.download-menu-item');
            if (menuItem) {
                const format = menuItem.getAttribute('data-format');
                const timestamp = downloadMenu.getAttribute('data-message-timestamp');
                this.downloadMessage(timestamp, format);
                this.hideDownloadMenu();
            }
        });
        
        // Close menu if click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.download-response-btn') && !e.target.closest('.download-menu')) {
                this.hideDownloadMenu();
            }
        });
    }
    
    showDownloadMenu(event, messageTimestamp) {
        event.stopPropagation();
        const downloadMenu = document.getElementById('downloadMenu');
        if (!downloadMenu) return;
        
        // Position menu relative to viewport (always visible)
        const rect = event.target.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const menuHeight = 120; // approximate menu height
        const menuWidth = 140; // approximate menu width
        
        let left = rect.left;
        let top = rect.bottom + 5;
        
        // Adjust position if goes out of viewport bounds
        if (left + menuWidth > viewportWidth) {
            left = viewportWidth - menuWidth - 10;
        }
        if (top + menuHeight > viewportHeight) {
            top = rect.top - menuHeight - 5; // Show above button
        }
        
        downloadMenu.style.left = `${left}px`;
        downloadMenu.style.top = `${top}px`;
        downloadMenu.setAttribute('data-message-timestamp', messageTimestamp);
        downloadMenu.classList.add('show');
    }
    
    hideDownloadMenu() {
        const downloadMenu = document.getElementById('downloadMenu');
        if (downloadMenu) {
            downloadMenu.classList.remove('show');
        }
    }
    
    async downloadMessage(messageTimestamp, format) {
        if (!this.currentChatId) {
            this.app.addNotification('❌ No chat selected', 'error');
            return;
        }
        
        try {
            console.log('📥 Downloading message:', { timestamp: messageTimestamp, format });
            
            const response = await fetch('/api/chat/download-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: this.currentChatId,
                    messageTimestamp: messageTimestamp,
                    format: format
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            let extension;
            switch(format) {
                case 'markdown': extension = 'md'; break;
                case 'pdf': extension = 'pdf'; break;
                case 'docx': extension = 'docx'; break;
                default: extension = format;
            }
            const filename = `message_${messageTimestamp}.${extension}`;
            
            // Create download link
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = filename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(downloadLink.href);
            
            this.app.addNotification(`📥 Message downloaded: ${filename}`, 'success');

        } catch (error) {
            console.error('❌ Download error:', error);
            this.app.addNotification(`❌ Download error: ${error.message}`, 'error');
        }
    }

    // === UTILITY FUNCTIONS ===
    
    updateProcessingIndicator(newMessage) {
        return this.streamManager.updateProcessingIndicator(newMessage);
    }
    
    // Create a streaming message element in chat
    createStreamingMessageElement() {
        return this.streamManager.createStreamingMessageElement();
    }
    
    // Update streaming message with new content
    updateStreamingMessage(messageElement, newContent) {
        return this.streamManager.updateStreamingMessage(messageElement, newContent);
    }
    
    // Finalize streaming message
    finalizeStreamingMessage(messageElement) {
        return this.streamManager.finalizeStreamingMessage(messageElement);
    }
    
    // === STREAM CONTROL METHODS ===
    
    stopCurrentStream() {
        return this.streamManager.stopCurrentStream();
    }
    
    clearCurrentStream() {
        return this.streamManager.clearCurrentStream();
    }
    
    // Removed setStopButtonEnabled - button is always active
    
    // Handle streaming error
    handleStreamingError(messageElement, error) {
        return this.streamManager.handleStreamingError(messageElement, error);
    }
    
    async hasSystemPrompt(modelName) {
        // Use app's cached method to prevent infinite requests
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