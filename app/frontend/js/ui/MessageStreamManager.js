/**
 * MessageStreamManager - Real-time Message Streaming & Processing
 *
 * Manages message sending, real-time streaming, processing indicators,
 * and stream control functionality
 * Extracted from ChatInterface.js for modular architecture compliance
 *
 * Dependencies:
 * - ChatInterface: Parent component reference
 * - App: API client, notification system, model management
 * - MCPToolsRenderer: MCP tool UI rendering
 */

class MessageStreamManager {
    constructor(chatInterface) {
        this.chatInterface = chatInterface;
        this.app = chatInterface.app;

        // Stream control state
        this.currentStreamController = null;
        this.currentStreamElement = null;
        this.currentProcessingIndicator = null;
        this.accumulatedContent = '';

        // MCP tools renderer
        this.mcpRenderer = new MCPToolsRenderer();

        console.log('🌊 MessageStreamManager initialized');
    }

    /**
     * Send message with streaming response
     */
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message || !this.app.currentModel) {
            this.app.addNotification('⚠️ Select a model and write a message', 'warning');
            return;
        }

        const originalMessage = message;
        messageInput.disabled = true;
        messageInput.style.opacity = '0.6';

        // Add processing indicator
        const processingIndicator = this.createProcessingIndicator(originalMessage);
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.appendChild(processingIndicator);
            DOMUtils.scrollToBottom('chatMessages');
        }

        this.currentProcessingIndicator = processingIndicator;

        try {
            // Handle model switching (lazy loading)
            await this.handleModelSwitch();

            // Ensure we have an active chat
            await this.ensureActiveChat();

            // Upload attachments if present
            await this.uploadPendingAttachments();

            // Start streaming
            await this.startStreaming(message);

        } catch (error) {
            console.error('❌ Send message error:', error);
        } finally {
            this.cleanupAfterSend(messageInput);
        }
    }

    /**
     * Create processing indicator element
     */
    createProcessingIndicator(message) {
        const indicator = document.createElement('div');
        indicator.className = 'message-processing-indicator';
        indicator.innerHTML = `
            <div style="
                background: #e3f2fd;
                border: 1px solid #bbdefb;
                border-radius: 8px;
                padding: 12px;
                margin: 10px 0;
                display: flex;
                align-items: center;
                gap: 10px;
                font-style: italic;
                color: #1976d2;
            ">
                <div style="
                    width: 16px;
                    height: 16px;
                    border: 2px solid #1976d2;
                    border-radius: 50%;
                    border-top-color: transparent;
                    animation: spin 1s linear infinite;
                "></div>
                <span id="processing-status-text">Your message: "${message.length > 50 ? message.substring(0, 50) + '...' : message}" has been sent...</span>
            </div>
        `;
        return indicator;
    }

    /**
     * Handle model switching (lazy loading)
     */
    async handleModelSwitch() {
        const selectedModel = document.getElementById('modelSelect').value || this.app.currentModel;
        if (selectedModel && selectedModel !== this.app.loadedModel) {
            this.updateProcessingIndicator(`🔄 Loading model ${selectedModel}...`);
            console.log(`🔄 Lazy loading: switching from ${this.app.loadedModel} to ${selectedModel}`);

            try {
                await this.app.switchToModel(selectedModel);
                this.updateProcessingIndicator(`✅ Model ${selectedModel} loaded - processing message...`);
            } catch (error) {
                this.updateProcessingIndicator(`❌ Error loading model ${selectedModel}`);
                throw error;
            }
        } else {
            this.updateProcessingIndicator(`🧠 Processing message with ${selectedModel || this.app.currentModel}...`);
        }
    }

    /**
     * Ensure we have an active chat
     */
    async ensureActiveChat() {
        if (!this.chatInterface.currentChatId) {
            this.app.addNotification('📝 Creating new chat...', 'info');
            const newChatData = await this.app.apiClient.createNewChat(
                `Chat ${new Date().toLocaleString()}`,
                this.app.currentModel
            );

            if (!newChatData.success) {
                throw new Error('Unable to create new chat');
            }

            this.chatInterface.currentChatId = newChatData.chatId;
            await this.chatInterface.loadChatList();
        }
    }

    /**
     * Upload pending attachments
     */
    async uploadPendingAttachments() {
        if (this.chatInterface.pendingAttachments.length === 0) return;

        this.updateProcessingIndicator(`📎 Uploading ${this.chatInterface.pendingAttachments.length} attachments...`);

        const uploadedAttachments = [];
        for (const file of this.chatInterface.pendingAttachments) {
            console.log(`📎 Uploading attachment: ${file.name}`);
            const uploadResult = await this.app.apiClient.uploadFile(this.chatInterface.currentChatId, file);

            if (uploadResult.success) {
                uploadedAttachments.push({
                    filename: uploadResult.filename,
                    originalName: uploadResult.originalName,
                    size: uploadResult.size
                });
                console.log(`✅ Uploaded: ${file.name} -> ${uploadResult.filename}`);
            } else {
                console.error(`❌ Failed to upload ${file.name}:`, uploadResult.error);
                this.app.addNotification(`❌ Upload error ${file.name}`, 'error');
            }
        }

        // Clear pending attachments
        this.chatInterface.pendingAttachments = [];
        this.chatInterface.attachmentManager.renderAttachmentPreview();

        if (uploadedAttachments.length > 0) {
            this.app.addNotification(`✅ ${uploadedAttachments.length} attachments uploaded`, 'success');
        }
    }

    /**
     * Start streaming response
     */
    async startStreaming(message) {
        const sendProgressId = `message_send_${Date.now()}`;
        this.app.notificationSystem.addProgressNotification(
            sendProgressId,
            '📤 Starting response streaming...',
            'info'
        );

        const streamingMessageElement = this.createStreamingMessageElement();
        this.currentStreamElement = streamingMessageElement;
        this.accumulatedContent = '';

        const mcpEnabled = this.mcpRenderer.isMCPEnabled();
        console.log(`🤖 [MCP] isMCPEnabled() = ${mcpEnabled}`);
        if (mcpEnabled) {
            this.updateProcessingIndicator(`🤖 MCP active - preparing tools...`);
        }

        this.currentStreamController = this.app.apiClient.sendMessageStream(
            message,
            this.app.currentModel,
            this.chatInterface.currentChatId,

            // onChunk
            (content, chunkData) => {
                this.updateStreamingMessage(streamingMessageElement, content);
                this.updateProcessingIndicator(`🧠 Response incoming... (${chunkData.chunkNumber} chunks)`);
            },

            // onComplete
            (completeData) => {
                console.log('✅ Streaming completed:', completeData);
                this.finalizeStreamingMessage(streamingMessageElement);

                if (completeData.toolsUsed || completeData.mcpIterations > 1) {
                    this.mcpRenderer.appendMCPBadge(streamingMessageElement, completeData);
                }

                this.app.notificationSystem.completeProgressNotification(
                    sendProgressId,
                    `✅ Response complete (${completeData.totalChunks || completeData.totalLength} characters)`,
                    'success'
                );

                setTimeout(() => {
                    this.chatInterface.loadChatMessages(completeData.chatId);
                }, 500);
                this.clearCurrentStream();
            },

            // onError
            (error) => {
                console.error('❌ Streaming error:', error);
                this.handleStreamingError(streamingMessageElement, error);
                this.app.notificationSystem.completeProgressNotification(
                    sendProgressId,
                    error.message.includes('cancelled') ? '⏹️ Streaming stopped' : '❌ Error during streaming',
                    error.message.includes('cancelled') ? 'warning' : 'error'
                );
                this.clearCurrentStream();
                throw error;
            },

            // MCP Options
            {
                enableMCP: mcpEnabled,
                onMCPStatus: (data) => {
                    if (data.enabled) {
                        this.updateProcessingIndicator(`🤖 MCP active - ${data.toolCount} tools available`);
                        this.app.addNotification(`🤖 MCP: ${data.toolCount} tools available`, 'info');
                    }
                },
                onToolCall: (data) => {
                    this.updateProcessingIndicator(`🔧 Executing tool: ${data.name}...`);
                    this.mcpRenderer.showToolCallIndicator(streamingMessageElement, data);
                },
                onToolResult: (data) => {
                    if (data.success) {
                        this.updateProcessingIndicator(`✅ Tool ${data.name} completed`);
                    } else {
                        this.updateProcessingIndicator(`❌ Tool ${data.name} failed: ${data.error}`);
                    }
                    this.mcpRenderer.updateToolResultIndicator(streamingMessageElement, data);
                }
            }
        );
    }

    /**
     * Cleanup after sending message
     */
    cleanupAfterSend(messageInput) {
        const processingIndicator = document.querySelector('.message-processing-indicator');
        if (processingIndicator) {
            processingIndicator.remove();
        }

        this.currentProcessingIndicator = null;

        messageInput.value = '';
        messageInput.disabled = false;
        messageInput.style.opacity = '1';
        messageInput.focus();
    }

    /**
     * Update processing indicator text
     */
    updateProcessingIndicator(newMessage) {
        if (this.currentProcessingIndicator) {
            const statusText = this.currentProcessingIndicator.querySelector('#processing-status-text');
            if (statusText) {
                statusText.textContent = newMessage;
            }
        }
    }

    /**
     * Create streaming message element in chat
     */
    createStreamingMessageElement() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return null;

        const existingIndicator = chatMessages.querySelector('.message-processing-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message ai-message streaming';
        messageElement.innerHTML = `
            <div class="message-avatar">
                <img src="icon/ollama.png" alt="AI" />
                <span class="message-model">${this.app.currentModel || 'AI'}</span>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <div class="streaming-indicator">
                        <span class="streaming-dots">●●●</span>
                        Response incoming...
                    </div>
                </div>
                <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
            </div>
        `;

        chatMessages.appendChild(messageElement);
        DOMUtils.scrollToBottom('chatMessages');

        return messageElement;
    }

    /**
     * Update streaming message with new content
     */
    updateStreamingMessage(messageElement, newContent) {
        if (!messageElement) return;

        this.accumulatedContent += newContent;

        const messageText = messageElement.querySelector('.message-text');
        if (messageText) {
            const formattedContent = this.formatStreamingContent(this.accumulatedContent);
            messageText.innerHTML = `<div class="streaming-content">${formattedContent}</div>`;
            DOMUtils.scrollToBottom('chatMessages');
        }
    }

    /**
     * Finalize streaming message
     */
    finalizeStreamingMessage(messageElement) {
        if (!messageElement) return;

        messageElement.classList.remove('streaming');

        const messageText = messageElement.querySelector('.message-text');
        if (messageText) {
            const streamingContent = messageText.querySelector('.streaming-content');
            if (streamingContent) {
                const finalContent = this.chatInterface.formatMessage(streamingContent.textContent);
                messageText.innerHTML = finalContent;
            }
        }

        console.log('✅ Streaming message finalized');
    }

    /**
     * Stop current streaming operation
     */
    stopCurrentStream() {
        console.log('⏹️ Stopping current stream...');

        if (this.currentStreamController) {
            try {
                this.currentStreamController.abort();
                console.log('✅ Stream controller aborted');
            } catch (error) {
                console.warn('⚠️ Error aborting stream controller:', error);
            }
        }

        if (this.currentStreamElement) {
            const messageText = this.currentStreamElement.querySelector('.message-text');
            if (messageText) {
                const currentContent = messageText.textContent || 'Response stopped by user.';
                messageText.innerHTML = `
                    <div class="streaming-stopped">
                        ${this.chatInterface.formatMessage(currentContent)}
                        <div class="stop-indicator">⏹️ <em>Streaming stopped by user</em></div>
                    </div>
                `;
            }

            this.currentStreamElement.classList.remove('streaming');
            this.currentStreamElement.classList.add('stopped');
        }

        const processingIndicator = document.querySelector('.message-processing-indicator');
        if (processingIndicator) {
            processingIndicator.remove();
        }

        this.clearCurrentStream();
        this.app.addNotification('⏹️ Streaming stopped', 'warning');
    }

    /**
     * Clear current stream references
     */
    clearCurrentStream() {
        this.currentStreamController = null;
        this.currentStreamElement = null;
        this.currentProcessingIndicator = null;
        console.log('🧹 Stream references cleared');
    }

    /**
     * Handle streaming errors
     */
    handleStreamingError(messageElement, error) {
        console.error('❌ Streaming error:', error);

        if (!messageElement) return;

        const messageText = messageElement.querySelector('.message-text');
        if (messageText) {
            let errorMessage = 'Error while generating response.';

            if (error.message.includes('cancelled') || error.message.includes('aborted')) {
                errorMessage = 'Response stopped by user.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Timeout while generating response.';
            } else if (error.message.includes('model')) {
                errorMessage = 'AI model error. Try with a different model.';
            }

            messageText.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">❌</div>
                    <div class="error-text">${errorMessage}</div>
                    <div class="error-details">${error.message}</div>
                </div>
            `;
        }

        messageElement.classList.remove('streaming');
        messageElement.classList.add('error');
    }

    /**
     * Format streaming content
     */
    formatStreamingContent(content) {
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

    // Delegated MCP methods for backwards compatibility
    isMCPEnabled() {
        return this.mcpRenderer.isMCPEnabled();
    }

    showToolCallIndicator(messageElement, toolData) {
        return this.mcpRenderer.showToolCallIndicator(messageElement, toolData);
    }

    updateToolResultIndicator(messageElement, resultData) {
        return this.mcpRenderer.updateToolResultIndicator(messageElement, resultData);
    }

    appendMCPBadge(messageElement, completeData) {
        return this.mcpRenderer.appendMCPBadge(messageElement, completeData);
    }
}
