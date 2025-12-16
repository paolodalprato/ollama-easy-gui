/**
 * MCPManager.js - Component for MCP server management and visualization
 * Similar to Claude Desktop MCP interface
 */

class MCPManager {
    constructor() {
        this.servers = [];
        this.tools = [];
        this.refreshInterval = null;
        this.isEnabled = false; // MCP tools OFF by default
        this.initializeComponent();
    }

    /**
     * Initialize MCP Manager component
     */
    async initializeComponent() {
        console.log('🤖 MCPManager initializing...');

        // Setup UI container if not present
        this.ensureMCPContainer();

        // Load initial MCP server status
        await this.loadMCPStatus();

        // Setup auto-refresh every 30 seconds
        this.startAutoRefresh();
    }

    /**
     * Ensure MCP container exists in UI
     */
    ensureMCPContainer() {
        // Find or create container for MCP in right sidebar
        let mcpContainer = document.getElementById('mcp-container');

        if (!mcpContainer) {
            // Look for sidebar-right (OllamaGUI layout) or fallback to .sidebar
            const sidebar = document.querySelector('.sidebar-right') || document.querySelector('.sidebar') || document.querySelector('#sidebar');

            if (sidebar) {
                const mcpSection = document.createElement('div');
                mcpSection.id = 'mcp-section-wrapper';
                mcpSection.innerHTML = `
                    <div class="section-title mcp-section-title">
                        <span>MCP Servers</span>
                        <label class="mcp-toggle-switch" title="Enable/Disable MCP Tools">
                            <input type="checkbox" id="mcpToolsToggle">
                            <span class="mcp-toggle-slider"></span>
                        </label>
                    </div>
                    <div id="mcp-container" class="mcp-section mcp-collapsed">
                        <div class="mcp-header">
                            <h3>🤖 Connected Servers</h3>
                            <button id="mcp-refresh-btn" class="btn btn-sm" title="Refresh MCP status">
                                🔄
                            </button>
                        </div>
                        <div id="mcp-servers-list" class="mcp-servers">
                            <div class="mcp-loading">Loading MCP servers...</div>
                        </div>
                        <div id="mcp-tools-count" class="mcp-summary">
                            <small>0 tools available</small>
                        </div>
                    </div>
                `;

                // Insert after notifications section
                const notificationsSection = sidebar.querySelector('.notifications');
                if (notificationsSection) {
                    notificationsSection.parentElement.insertBefore(mcpSection, notificationsSection.nextSibling);
                } else {
                    // Fallback: insert before scroll-to-top
                    const scrollBtn = sidebar.querySelector('.scroll-to-top-container');
                    if (scrollBtn) {
                        sidebar.insertBefore(mcpSection, scrollBtn);
                    } else {
                        sidebar.appendChild(mcpSection);
                    }
                }

                mcpContainer = document.getElementById('mcp-container');
                console.log('✅ MCP container created in sidebar-right');
            } else {
                console.warn('⚠️ No sidebar found for MCP container');
            }
        }

        // Register event listener for refresh button
        const refreshBtn = document.getElementById('mcp-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshMCPStatus());
        }

        // Register event listener for MCP toggle
        const mcpToggle = document.getElementById('mcpToolsToggle');
        if (mcpToggle) {
            mcpToggle.addEventListener('change', (e) => this.toggleMCPTools(e.target.checked));
        }

        return mcpContainer;
    }

    /**
     * Toggle MCP Tools ON/OFF
     */
    toggleMCPTools(enabled) {
        this.isEnabled = enabled;

        // Sync with app state for MessageStreamManager
        if (window.app) {
            window.app.isMCPToolsEnabled = enabled;
        }

        // Show/hide MCP container
        const mcpContainer = document.getElementById('mcp-container');
        if (mcpContainer) {
            if (enabled) {
                mcpContainer.classList.remove('mcp-collapsed');
            } else {
                mcpContainer.classList.add('mcp-collapsed');
            }
        }

        // Show notification
        const message = enabled ?
            '🔧 MCP Tools ENABLED - Tools will be available for the model' :
            '🔧 MCP Tools DISABLED - Normal chat without tools';
        this.showNotification(message, enabled ? 'success' : 'info');

        console.log('🔧 MCP Tools toggled:', enabled);
    }

    /**
     * Load current MCP server status
     */
    async loadMCPStatus() {
        try {
            console.log('📡 Loading MCP server status...');

            // Load configured server list
            const serversResponse = await fetch('/api/mcp/servers');
            const serversData = await serversResponse.json();

            if (serversData.success) {
                this.servers = serversData.data.servers || [];
            }

            // Load available tools
            const toolsResponse = await fetch('/api/mcp/tools');
            const toolsData = await toolsResponse.json();

            if (toolsData.success) {
                this.tools = toolsData.data.tools || [];
            }

            // Update UI with loaded data
            this.renderMCPServers();

            console.log(`✅ MCP Status loaded: ${this.servers.length} servers, ${this.tools.length} tools`);

        } catch (error) {
            console.error('❌ Error loading MCP status:', error);
            this.renderError('Failed to load MCP status');
        }
    }

    /**
     * Render MCP server list in UI
     */
    renderMCPServers() {
        const container = document.getElementById('mcp-servers-list');
        const toolsCount = document.getElementById('mcp-tools-count');

        if (!container) return;

        if (this.servers.length === 0) {
            container.innerHTML = `
                <div class="mcp-empty">
                    <p>No MCP servers configured</p>
                    <small>Add servers in mcp-config.json</small>
                </div>
            `;
        } else {
            const serversHTML = this.servers.map(server => this.renderServerCard(server)).join('');
            container.innerHTML = `<div class="mcp-servers-grid">${serversHTML}</div>`;
        }

        // Update tools counter
        if (toolsCount) {
            const connectedCount = this.servers.filter(s => s.connected).length;
            toolsCount.innerHTML = `
                <small>
                    ${this.tools.length} tools from ${connectedCount}/${this.servers.length} servers
                </small>
            `;
        }
    }

    /**
     * Render single MCP server card
     */
    renderServerCard(server) {
        const statusClass = server.connected ? 'connected' : (server.enabled ? 'disconnected' : 'disabled');
        const statusIcon = server.connected ? '🟢' : (server.enabled ? '🔴' : '⚪');
        const statusText = server.connected ? 'Connected' : (server.enabled ? 'Disconnected' : 'Disabled');

        return `
            <div class="mcp-server-card ${statusClass}" data-server="${server.name}">
                <div class="mcp-server-header">
                    <span class="mcp-server-name">${server.name}</span>
                    <span class="mcp-server-status" title="${statusText}">${statusIcon}</span>
                </div>
                <div class="mcp-server-description">
                    ${server.description || 'No description'}
                </div>
                <div class="mcp-server-details">
                    <small>
                        <code>${server.command}</code>
                        ${server.enabled ? '' : '(disabled)'}
                    </small>
                </div>
                <div class="mcp-server-actions">
                    <button class="btn btn-xs mcp-toggle-btn"
                            onclick="mcpManager.toggleServer('${server.name}', ${!server.enabled})">
                        ${server.enabled ? 'Disable' : 'Enable'}
                    </button>
                    ${server.connected ? `
                        <button class="btn btn-xs mcp-test-btn"
                                onclick="mcpManager.testServer('${server.name}')">
                            Test
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Renders loading error
     */
    renderError(message) {
        const container = document.getElementById('mcp-servers-list');
        if (container) {
            container.innerHTML = `
                <div class="mcp-error">
                    <p>❌ ${message}</p>
                    <button onclick="mcpManager.loadMCPStatus()" class="btn btn-sm">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Manual refresh of MCP status
     */
    async refreshMCPStatus() {
        const refreshBtn = document.getElementById('mcp-refresh-btn');

        if (refreshBtn) {
            refreshBtn.innerHTML = '⏳';
            refreshBtn.disabled = true;
        }

        try {
            // Force reload configuration
            const reloadResponse = await fetch('/api/mcp/reload-config', { method: 'POST' });

            if (reloadResponse.ok) {
                console.log('✅ MCP configuration reloaded');
            }

            await this.loadMCPStatus();

        } catch (error) {
            console.error('❌ Error refreshing MCP:', error);
        } finally {
            if (refreshBtn) {
                refreshBtn.innerHTML = '🔄';
                refreshBtn.disabled = false;
            }
        }
    }

    /**
     * Toggle enable/disable MCP server
     */
    async toggleServer(serverName, enable) {
        try {
            console.log(`🔄 ${enable ? 'Enabling' : 'Disabling'} server ${serverName}...`);

            const response = await fetch('/api/mcp/toggle-server', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverName, enabled: enable })
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification(
                    `Server ${serverName} ${enable ? 'enabled' : 'disabled'}`,
                    'success'
                );

                // Update local state and refresh UI
                const server = this.servers.find(s => s.name === serverName);
                if (server) {
                    server.enabled = enable;
                }

                setTimeout(() => this.refreshMCPStatus(), 500);
            } else {
                throw new Error(data.error || 'Toggle failed');
            }

        } catch (error) {
            console.error('❌ Error toggling server:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    /**
     * Test MCP server connection
     */
    async testServer(serverName) {
        try {
            console.log(`🧪 Testing server ${serverName}...`);
            this.showNotification(`Testing ${serverName}...`, 'info');

            // Reload status to verify connection
            const response = await fetch('/api/mcp/servers');
            const data = await response.json();

            if (data.success && data.data.servers) {
                const server = data.data.servers.find(s => s.name === serverName);

                if (server) {
                    if (server.connected) {
                        // Get server tools info
                        const toolsResponse = await fetch('/api/mcp/tools');
                        const toolsData = await toolsResponse.json();

                        const toolCount = toolsData.success ? toolsData.data.count : 0;
                        this.showNotification(
                            `${serverName}: Connected with ${toolCount} tools available`,
                            'success'
                        );
                    } else if (server.enabled) {
                        this.showNotification(
                            `${serverName}: Enabled but not connected. Verify MCP server is installed.`,
                            'warning'
                        );
                    } else {
                        this.showNotification(
                            `${serverName}: Server disabled`,
                            'info'
                        );
                    }
                } else {
                    this.showNotification(`Server ${serverName} not found`, 'error');
                }
            } else {
                this.showNotification('Error retrieving server status', 'error');
            }

        } catch (error) {
            console.error('❌ Error testing server:', error);
            this.showNotification(`Test error: ${error.message}`, 'error');
        }
    }

    /**
     * Show available tools details
     */
    showAvailableTools() {
        if (this.tools.length === 0) {
            this.showNotification('No MCP tools available', 'info');
            return;
        }

        const toolsList = this.tools.map(tool =>
            `• ${tool.function.name}: ${tool.function.description || 'No description'}`
        ).join('\n');

        // Show in modal or alert
        alert(`Available MCP Tools (${this.tools.length}):\n\n${toolsList}`);
    }

    /**
     * Helper to show notifications using OllamaGUI system
     */
    showNotification(message, type = 'info') {
        // Use OllamaGUI's global notification system
        if (window.app && typeof window.app.addNotification === 'function') {
            window.app.addNotification(message, type);
        } else {
            // Fallback console
            console.log(`[MCP ${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * Auto-refresh MCP server status every 30 seconds
     */
    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        this.refreshInterval = setInterval(() => {
            this.loadMCPStatus();
        }, 30000); // 30 seconds
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Cleanup when component is destroyed
     */
    destroy() {
        this.stopAutoRefresh();
    }
}

// Initialize global MCPManager when DOM is ready
let mcpManager = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize after a brief delay to ensure other components are ready
    setTimeout(() => {
        mcpManager = new MCPManager();
        window.mcpManager = mcpManager; // Make available globally
    }, 2000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPManager;
}