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
 */

class MessageStreamManager {
    constructor(chatInterface) {
        this.chatInterface = chatInterface;
        this.app = chatInterface.app;
        
        // Stream control state
        this.currentStreamController = null;
        this.currentStreamElement = null;
        this.currentProcessingIndicator = null;
        this.accumulatedContent = ''; // Accumulate streaming content

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
        
        // Store original message and show "processing" indicator instead of clearing
        const originalMessage = message;
        messageInput.disabled = true;
        messageInput.style.opacity = '0.6';
        
        // Add visual indicator that shows actual system status
        const processingIndicator = document.createElement('div');
        processingIndicator.className = 'message-processing-indicator';
        processingIndicator.innerHTML = `
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
                <span id="processing-status-text">Your message: "${originalMessage.length > 50 ? originalMessage.substring(0, 50) + '...' : originalMessage}" has been sent...</span>
            </div>
        `;
        
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.appendChild(processingIndicator);
            DOMUtils.scrollToBottom('chatMessages');
        }
        
        // Store reference to update status
        this.currentProcessingIndicator = processingIndicator;
        
        try {
            // Check if selected model in interface is different from the one actually loaded in Ollama
            const selectedModel = document.getElementById('modelSelect').value || this.app.currentModel;
            if (selectedModel && selectedModel !== this.app.loadedModel) {
                // Update processing indicator to show model loading
                this.updateProcessingIndicator(`🔄 Loading model ${selectedModel}...`);
                
                console.log(`🔄 Lazy loading: switching from ${this.app.loadedModel} to ${selectedModel}`);
                
                try {
                    await this.app.switchToModel(selectedModel);
                    // Update indicator after model is loaded
                    this.updateProcessingIndicator(`✅ Model ${selectedModel} loaded - processing message...`);
                } catch (error) {
                    this.updateProcessingIndicator(`❌ Error loading model ${selectedModel}`);
                    throw error; // Stop sending message if model switch fails
                }
            } else {
                // Model already loaded, processing message directly
                this.updateProcessingIndicator(`🧠 Processing message with ${selectedModel || this.app.currentModel}...`);
            }
            
            // If there's no active chat, create one first
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
                await this.chatInterface.loadChatList(); // Update chat list
            }
            
            // Message to send
            let finalMessage = message;

            // Upload attachments if present
            const uploadedAttachments = [];
            if (this.chatInterface.pendingAttachments.length > 0) {
                this.updateProcessingIndicator(`📎 Uploading ${this.chatInterface.pendingAttachments.length} attachments...`);
                
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
            
            // Use real-time streaming for better UX
            const sendProgressId = `message_send_${Date.now()}`;
            this.app.notificationSystem.addProgressNotification(
                sendProgressId,
                '📤 Starting response streaming...',
                'info'
            );

            // Create streaming response placeholder in chat
            const streamingMessageElement = this.createStreamingMessageElement();
            this.currentStreamElement = streamingMessageElement; // Track current stream
            this.accumulatedContent = ''; // Reset accumulator for new stream

            // Check if MCP is enabled
            const mcpEnabled = this.isMCPEnabled();
            console.log(`🤖 [MCP] isMCPEnabled() = ${mcpEnabled}`);
            if (window.mcpManager) {
                console.log(`🤖 [MCP] mcpManager.servers =`, window.mcpManager.servers);
            }
            if (mcpEnabled) {
                this.updateProcessingIndicator(`🤖 MCP active - preparing tools...`);
            }

            // Stop button always active - no need to enable/disable

            // Start streaming
            this.currentStreamController = this.app.apiClient.sendMessageStream(
                finalMessage,
                this.app.currentModel,
                this.chatInterface.currentChatId,

                // onChunk - called for each piece of response
                (content, chunkData) => {
                    this.updateStreamingMessage(streamingMessageElement, content);
                    this.updateProcessingIndicator(`🧠 Response incoming... (${chunkData.chunkNumber} chunks)`);
                },

                // onComplete - called when streaming is done
                (completeData) => {
                    console.log('✅ Streaming completed:', completeData);
                    this.finalizeStreamingMessage(streamingMessageElement);

                    // Add MCP badge if tools were used
                    if (completeData.toolsUsed || completeData.mcpIterations > 1) {
                        this.appendMCPBadge(streamingMessageElement, completeData);
                    }

                    this.app.notificationSystem.completeProgressNotification(
                        sendProgressId,
                        `✅ Response complete (${completeData.totalChunks || completeData.totalLength} characters)`,
                        'success'
                    );

                    // Reload messages to show the saved conversation
                    setTimeout(() => {
                        this.chatInterface.loadChatMessages(completeData.chatId);
                    }, 500);
                    this.clearCurrentStream(); // Clear stream references
                },

                // onError - called if streaming fails
                (error) => {
                    console.error('❌ Streaming error:', error);
                    this.handleStreamingError(streamingMessageElement, error);
                    this.app.notificationSystem.completeProgressNotification(
                        sendProgressId,
                        error.message.includes('cancelled') ? '⏹️ Streaming stopped' : '❌ Error during streaming',
                        error.message.includes('cancelled') ? 'warning' : 'error'
                    );
                    this.clearCurrentStream(); // Clear stream references
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
                        this.showToolCallIndicator(streamingMessageElement, data);
                    },
                    onToolResult: (data) => {
                        if (data.success) {
                            this.updateProcessingIndicator(`✅ Tool ${data.name} completed`);
                        } else {
                            this.updateProcessingIndicator(`❌ Tool ${data.name} failed: ${data.error}`);
                        }
                        this.updateToolResultIndicator(streamingMessageElement, data);
                    }
                }
            );
            
        } catch (error) {
            console.error('❌ Send message error:', error);
            // Error already handled in progress notification above
        } finally {
            // Remove processing indicator
            const processingIndicator = document.querySelector('.message-processing-indicator');
            if (processingIndicator) {
                processingIndicator.remove();
            }
            
            // Clear reference
            this.currentProcessingIndicator = null;
            
            // Clear input only after processing is complete
            messageInput.value = '';
            messageInput.disabled = false;
            messageInput.style.opacity = '1';
            messageInput.focus();
        }
    }

    /**
     * Update processing indicator text
     * @param {string} newMessage - New status message
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
     * @returns {Element} Streaming message DOM element
     */
    createStreamingMessageElement() {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return null;

        // Remove processing indicator if exists
        const existingIndicator = chatMessages.querySelector('.message-processing-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Create streaming message element
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
     * @param {Element} messageElement - Streaming message element
     * @param {string} newContent - New content to append
     */
    updateStreamingMessage(messageElement, newContent) {
        if (!messageElement) return;

        // Accumulate content instead of replacing it
        this.accumulatedContent += newContent;

        const messageText = messageElement.querySelector('.message-text');
        if (messageText) {
            // Format accumulated content (preserve line breaks, handle markdown, etc.)
            const formattedContent = this.formatStreamingContent(this.accumulatedContent);
            messageText.innerHTML = `<div class="streaming-content">${formattedContent}</div>`;

            // Auto-scroll to bottom during streaming
            DOMUtils.scrollToBottom('chatMessages');
        }
    }

    /**
     * Finalize streaming message (remove streaming indicators)
     * @param {Element} messageElement - Streaming message element
     */
    finalizeStreamingMessage(messageElement) {
        if (!messageElement) return;

        // Remove streaming class and indicators
        messageElement.classList.remove('streaming');

        const messageText = messageElement.querySelector('.message-text');
        if (messageText) {
            const streamingContent = messageText.querySelector('.streaming-content');
            if (streamingContent) {
                // Convert streaming content to final formatted content
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

        // Abort the current stream controller
        if (this.currentStreamController) {
            try {
                this.currentStreamController.abort();
                console.log('✅ Stream controller aborted');
            } catch (error) {
                console.warn('⚠️ Error aborting stream controller:', error);
            }
        }

        // Finalize current streaming message if exists
        if (this.currentStreamElement) {
            // Add a "stopped by user" indicator
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

        // Clear processing indicator
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
     * @param {Element} messageElement - Streaming message element
     * @param {Error} error - Error object
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
     * Format streaming content (preserve formatting during streaming)
     * @param {string} content - Raw streaming content
     * @returns {string} Formatted HTML content
     */
    formatStreamingContent(content) {
        if (!content) return '';

        // Escape HTML entities first to prevent XSS and rendering issues
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        // Basic formatting for streaming (more will be applied at finalization)
        return escaped
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== MCP Integration Methods ==========

    /**
     * Check if MCP is enabled
     * @returns {boolean} True if MCP toggle is ON and has connected servers
     */
    isMCPEnabled() {
        // Check if MCP toggle is enabled in app AND mcpManager has connected servers
        if (window.app && window.app.isMCPToolsEnabled && window.mcpManager) {
            const servers = window.mcpManager.servers || [];
            const connectedServers = servers.filter(s => s.connected);
            return connectedServers.length > 0;
        }
        return false;
    }

    /**
     * Show tool call indicator in message
     * @param {Element} messageElement - Message DOM element
     * @param {Object} toolData - Tool call data
     */
    showToolCallIndicator(messageElement, toolData) {
        if (!messageElement) return;

        let toolsContainer = messageElement.querySelector('.mcp-tools-container');
        if (!toolsContainer) {
            toolsContainer = document.createElement('div');
            toolsContainer.className = 'mcp-tools-container';

            const messageContent = messageElement.querySelector('.message-content');
            if (messageContent) {
                messageContent.appendChild(toolsContainer);
            }
        }

        const toolIndicator = document.createElement('div');
        toolIndicator.className = 'mcp-tool-indicator executing';
        toolIndicator.id = `tool-${toolData.name}-${Date.now()}`;
        toolIndicator.innerHTML = `
            <div class="tool-header">
                <span class="tool-icon">🔧</span>
                <span class="tool-name">${this.escapeHtml(toolData.name)}</span>
                <span class="tool-status">Executing...</span>
            </div>
            <div class="tool-args collapsed">
                <code>${this.escapeHtml(JSON.stringify(toolData.arguments, null, 2))}</code>
            </div>
        `;

        // Toggle args visibility on click
        const toolHeader = toolIndicator.querySelector('.tool-header');
        toolHeader.style.cursor = 'pointer';
        toolHeader.addEventListener('click', () => {
            toolIndicator.querySelector('.tool-args').classList.toggle('collapsed');
        });

        toolsContainer.appendChild(toolIndicator);
        this.currentToolIndicator = toolIndicator;
    }

    /**
     * Update tool result indicator
     * @param {Element} messageElement - Message DOM element
     * @param {Object} resultData - Tool result data
     */
    updateToolResultIndicator(messageElement, resultData) {
        if (!messageElement) return;

        // Find the current tool indicator
        const toolIndicator = this.currentToolIndicator ||
            messageElement.querySelector('.mcp-tool-indicator.executing');

        if (toolIndicator) {
            toolIndicator.classList.remove('executing');
            toolIndicator.classList.add(resultData.success ? 'success' : 'error');

            const statusEl = toolIndicator.querySelector('.tool-status');
            if (statusEl) {
                statusEl.textContent = resultData.success ? '✅ Completed' : '❌ Error';
            }

            // Add result preview if available
            if (resultData.result) {
                const resultPreview = document.createElement('div');
                resultPreview.className = 'tool-result collapsed';
                const resultStr = typeof resultData.result === 'string'
                    ? resultData.result
                    : JSON.stringify(resultData.result, null, 2);
                resultPreview.innerHTML = `
                    <div class="result-label">Result:</div>
                    <code>${this.escapeHtml(resultStr.substring(0, 500))}${resultStr.length > 500 ? '...' : ''}</code>
                `;
                toolIndicator.appendChild(resultPreview);
            }
        }

        this.currentToolIndicator = null;
    }

    /**
     * Append MCP badge to message
     * @param {Element} messageElement - Message DOM element
     * @param {Object} completeData - Completion data with MCP info
     */
    appendMCPBadge(messageElement, completeData) {
        if (!messageElement) return;

        const badge = document.createElement('div');
        badge.className = 'mcp-badge';
        badge.innerHTML = `
            <span class="badge-icon">🤖</span>
            <span class="badge-text">MCP Enhanced</span>
            <span class="badge-info">${completeData.mcpIterations || 1} iterations</span>
        `;

        const messageContent = messageElement.querySelector('.message-content');
        if (messageContent) {
            messageContent.appendChild(badge);
        } else {
            messageElement.appendChild(badge);
        }

        console.log(`🤖 Added MCP badge to message`);
    }
}