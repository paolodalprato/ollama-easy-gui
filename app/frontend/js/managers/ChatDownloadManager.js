/**
 * ChatDownloadManager - Message download and export functionality
 *
 * Handles:
 * - Download menu display and positioning
 * - Message export in various formats (Markdown, DOCX, PDF)
 * - Download link creation and cleanup
 */

class ChatDownloadManager {
    constructor(chatInterface) {
        this.chatInterface = chatInterface;
        this.downloadButtonClickHandler = null;
    }

    /**
     * Setup download button handlers via event delegation
     */
    setupDownloadButtonHandlers() {
        const chatContainer = document.getElementById('chatMessages');
        if (!chatContainer) return;

        // Remove existing listeners to avoid duplicates
        if (this.downloadButtonClickHandler) {
            chatContainer.removeEventListener('click', this.downloadButtonClickHandler);
        }

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

    /**
     * Setup download menu event listeners
     */
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

    /**
     * Show download menu at the appropriate position
     * @param {Event} event - Click event
     * @param {string} messageTimestamp - Message timestamp identifier
     */
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

    /**
     * Hide the download menu
     */
    hideDownloadMenu() {
        const downloadMenu = document.getElementById('downloadMenu');
        if (downloadMenu) {
            downloadMenu.classList.remove('show');
        }
    }

    /**
     * Download a message in the specified format
     * @param {string} messageTimestamp - Message timestamp identifier
     * @param {string} format - Export format (markdown, docx, pdf)
     */
    async downloadMessage(messageTimestamp, format) {
        const currentChatId = this.chatInterface.currentChatId;
        const app = this.chatInterface.app;

        if (!currentChatId) {
            app.addNotification('❌ No chat selected', 'error');
            return;
        }

        try {
            console.log('📥 Downloading message:', { timestamp: messageTimestamp, format });

            const response = await fetch('/api/chat/download-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatId: currentChatId,
                    messageTimestamp: messageTimestamp,
                    format: format
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const extension = this.getExtensionForFormat(format);
            const filename = `message_${messageTimestamp}.${extension}`;

            // Create download link
            this.triggerDownload(blob, filename);

            app.addNotification(`📥 Message downloaded: ${filename}`, 'success');

        } catch (error) {
            console.error('❌ Download error:', error);
            app.addNotification(`❌ Download error: ${error.message}`, 'error');
        }
    }

    /**
     * Get file extension for a given format
     * @param {string} format - Export format
     * @returns {string} File extension
     */
    getExtensionForFormat(format) {
        const extensions = {
            'markdown': 'md',
            'pdf': 'pdf',
            'docx': 'docx',
            'txt': 'txt'
        };
        return extensions[format] || format;
    }

    /**
     * Trigger file download via temporary link
     * @param {Blob} blob - File content as blob
     * @param {string} filename - Download filename
     */
    triggerDownload(blob, filename) {
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatDownloadManager;
} else if (typeof window !== 'undefined') {
    window.ChatDownloadManager = ChatDownloadManager;
}
