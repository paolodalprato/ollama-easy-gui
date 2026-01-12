/**
 * MCPToolsRenderer - MCP Tool UI Rendering
 *
 * Handles visual representation of MCP tool execution:
 * - Tool call indicators
 * - Tool result display
 * - MCP badges
 *
 * Extracted from MessageStreamManager for better modularity.
 */

class MCPToolsRenderer {
    constructor() {
        this.currentToolIndicator = null;
    }

    /**
     * Check if MCP is enabled
     * @returns {boolean} True if MCP toggle is ON and has connected servers
     */
    isMCPEnabled() {
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
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPToolsRenderer;
} else if (typeof window !== 'undefined') {
    window.MCPToolsRenderer = MCPToolsRenderer;
}
