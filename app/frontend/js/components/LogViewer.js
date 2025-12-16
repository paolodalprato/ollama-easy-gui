/**
 * LogViewer.js - Component for log visualization in UI
 */

class LogViewer {
    constructor() {
        this.isOpen = false;
        this.currentCategory = 'all';
        this.logs = [];
        this.autoRefresh = false;
        this.refreshInterval = null;

        this.createModal();
        this.setupEventListeners();
    }

    /**
     * Creates the modal for log visualization
     */
    createModal() {
        // Check if modal already exists
        if (document.getElementById('logViewerModal')) return;

        const modalHTML = `
            <div id="logViewerModal" class="modal">
                <div class="modal-content log-viewer-modal">
                    <div class="modal-header">
                        <span>System Log</span>
                        <button id="closeLogViewer" class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Controls -->
                        <div class="log-controls">
                            <div class="log-filters">
                                <select id="logCategorySelect">
                                    <option value="all">All categories</option>
                                    <option value="ollamagui">App</option>
                                    <option value="mcp">MCP</option>
                                    <option value="chat">Chat</option>
                                    <option value="models">Models</option>
                                </select>
                                <input type="text" id="logSearchInput" placeholder="Search logs...">
                            </div>
                            <div class="log-actions">
                                <label class="auto-refresh-label">
                                    <input type="checkbox" id="logAutoRefresh">
                                    Auto-refresh
                                </label>
                                <button id="logRefreshBtn" class="btn btn-primary btn-sm">Refresh</button>
                                <button id="logClearBtn" class="btn btn-danger btn-sm">Delete Log Files</button>
                            </div>
                        </div>

                        <!-- Stats -->
                        <div class="log-stats">
                            <span id="logStatsText">Loading statistics...</span>
                        </div>

                        <!-- Log entries -->
                        <div id="logEntriesContainer" class="log-entries">
                            <div class="log-loading">Loading logs...</div>
                        </div>

                        <!-- File list -->
                        <div class="log-files-section">
                            <h4>Available log files:</h4>
                            <div id="logFilesList" class="log-files-list">
                                <div class="log-loading">Loading files...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.addStyles();
    }

    /**
     * Adds CSS styles for the log viewer
     */
    addStyles() {
        if (document.getElementById('logViewerStyles')) return;

        const styles = `
            <style id="logViewerStyles">
                .log-viewer-modal {
                    max-width: 900px;
                    width: 95%;
                    max-height: 90vh;
                }

                .log-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }

                .log-filters {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .log-filters select, .log-filters input {
                    padding: 8px 12px;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    font-size: 13px;
                }

                .log-filters input {
                    min-width: 200px;
                }

                .log-actions {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }

                .auto-refresh-label {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                    cursor: pointer;
                }

                .log-stats {
                    background: #f8f9fa;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 12px;
                }

                .log-entries {
                    background: #1e1e1e;
                    color: #d4d4d4;
                    font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
                    font-size: 12px;
                    padding: 12px;
                    border-radius: 8px;
                    max-height: 400px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    word-break: break-all;
                }

                .log-entry {
                    padding: 4px 0;
                    border-bottom: 1px solid #333;
                }

                .log-entry:last-child {
                    border-bottom: none;
                }

                .log-entry.level-debug { color: #9cdcfe; }
                .log-entry.level-info { color: #4ec9b0; }
                .log-entry.level-warn { color: #dcdcaa; }
                .log-entry.level-error { color: #f14c4c; }

                .log-timestamp {
                    color: #808080;
                    margin-right: 8px;
                }

                .log-level {
                    font-weight: bold;
                    margin-right: 8px;
                }

                .log-category {
                    color: #c586c0;
                    margin-right: 8px;
                }

                .log-files-section {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid #dee2e6;
                }

                .log-files-section h4 {
                    margin: 0 0 12px 0;
                    font-size: 13px;
                    color: #333;
                }

                .log-files-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }

                .log-file-item {
                    background: #f8f9fa;
                    border: 1px solid #dee2e6;
                    border-radius: 4px;
                    padding: 6px 10px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .log-file-item:hover {
                    background: #e9ecef;
                    border-color: #adb5bd;
                }

                .log-file-item .file-name {
                    font-weight: 500;
                }

                .log-file-item .file-size {
                    color: #666;
                    margin-left: 8px;
                }

                .log-loading {
                    text-align: center;
                    padding: 20px;
                    color: #808080;
                }

                .log-empty {
                    text-align: center;
                    padding: 40px;
                    color: #666;
                }

                .btn-sm {
                    padding: 6px 12px;
                    font-size: 12px;
                }
            </style>
        `;

        document.head.insertAdjacentHTML('beforeend', styles);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        document.getElementById('closeLogViewer')?.addEventListener('click', () => this.close());

        // Refresh button
        document.getElementById('logRefreshBtn')?.addEventListener('click', () => this.loadLogs());

        // Clear button
        document.getElementById('logClearBtn')?.addEventListener('click', () => this.clearLogs());

        // Category filter
        document.getElementById('logCategorySelect')?.addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.loadLogs();
        });

        // Search input
        document.getElementById('logSearchInput')?.addEventListener('input', this.debounce(() => {
            this.loadLogs();
        }, 300));

        // Auto-refresh checkbox
        document.getElementById('logAutoRefresh')?.addEventListener('change', (e) => {
            this.autoRefresh = e.target.checked;
            if (this.autoRefresh) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });

        // Click outside to close
        document.getElementById('logViewerModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'logViewerModal') {
                this.close();
            }
        });
    }

    /**
     * Debounce helper
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Open the log viewer
     */
    open() {
        const modal = document.getElementById('logViewerModal');
        if (modal) {
            modal.classList.add('show');
            this.isOpen = true;
            this.loadLogs();
            this.loadStats();
            this.loadFiles();
        }
    }

    /**
     * Close the log viewer
     */
    close() {
        const modal = document.getElementById('logViewerModal');
        if (modal) {
            modal.classList.remove('show');
            this.isOpen = false;
            this.stopAutoRefresh();
        }
    }

    /**
     * Load log entries
     */
    async loadLogs() {
        const container = document.getElementById('logEntriesContainer');
        if (!container) return;

        container.innerHTML = '<div class="log-loading">Loading logs...</div>';

        try {
            const searchInput = document.getElementById('logSearchInput');
            const search = searchInput?.value || '';

            let url;
            if (this.currentCategory === 'all') {
                // Load from all categories (use app logs as default)
                url = `/api/logs/category/ollamagui?limit=200`;
            } else {
                url = `/api/logs/category/${this.currentCategory}?limit=200`;
            }

            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success && data.data.entries) {
                this.renderLogs(data.data.entries);
            } else {
                container.innerHTML = '<div class="log-empty">No logs found</div>';
            }

        } catch (error) {
            console.error('Error loading logs:', error);
            container.innerHTML = '<div class="log-empty">Error loading logs</div>';
        }
    }

    /**
     * Render log entries
     */
    renderLogs(entries) {
        const container = document.getElementById('logEntriesContainer');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = '<div class="log-empty">No logs found</div>';
            return;
        }

        const html = entries.map(entry => {
            // Parse log entry format: [timestamp] [LEVEL] [category] message
            const match = entry.match(/\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*(.*)/);

            if (match) {
                const [, timestamp, level, category, message] = match;
                const levelClass = `level-${level.toLowerCase()}`;

                return `
                    <div class="log-entry ${levelClass}">
                        <span class="log-timestamp">${timestamp}</span>
                        <span class="log-level">[${level}]</span>
                        <span class="log-category">[${category}]</span>
                        <span class="log-message">${this.escapeHtml(message)}</span>
                    </div>
                `;
            }

            return `<div class="log-entry">${this.escapeHtml(entry)}</div>`;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Load log statistics
     */
    async loadStats() {
        const statsEl = document.getElementById('logStatsText');
        if (!statsEl) return;

        try {
            const response = await fetch('/api/logs/stats');
            const data = await response.json();

            if (data.success) {
                const stats = data.data;
                statsEl.textContent = `${stats.totalFiles} log files | ${stats.totalSizeFormatted} total`;
            }

        } catch (error) {
            console.error('Error loading stats:', error);
            statsEl.textContent = 'Statistics not available';
        }
    }

    /**
     * Load available log files
     */
    async loadFiles() {
        const container = document.getElementById('logFilesList');
        if (!container) return;

        try {
            const response = await fetch('/api/logs/files');
            const data = await response.json();

            if (data.success && data.data.files.length > 0) {
                const html = data.data.files.map(file => `
                    <div class="log-file-item" data-filename="${file.name}">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${file.sizeFormatted}</span>
                    </div>
                `).join('');

                container.innerHTML = html;

                // Add click handlers
                container.querySelectorAll('.log-file-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const filename = item.dataset.filename;
                        this.loadFileContent(filename);
                    });
                });
            } else {
                container.innerHTML = '<div class="log-empty">No log files</div>';
            }

        } catch (error) {
            console.error('Error loading files:', error);
            container.innerHTML = '<div class="log-empty">Error loading files</div>';
        }
    }

    /**
     * Load specific file content
     */
    async loadFileContent(filename) {
        const container = document.getElementById('logEntriesContainer');
        if (!container) return;

        container.innerHTML = '<div class="log-loading">Loading file...</div>';

        try {
            const response = await fetch(`/api/logs/read/${filename}?limit=500`);
            const data = await response.json();

            if (data.success && data.data.entries) {
                this.renderLogs(data.data.entries);
            } else {
                container.innerHTML = '<div class="log-empty">Empty file</div>';
            }

        } catch (error) {
            console.error('Error loading file:', error);
            container.innerHTML = '<div class="log-empty">Error loading file</div>';
        }
    }

    /**
     * Clear logs
     */
    async clearLogs() {
        if (!confirm('Are you sure you want to delete all logs?')) return;

        try {
            const category = this.currentCategory === 'all' ? null : this.currentCategory;

            const response = await fetch('/api/logs/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category })
            });

            const data = await response.json();

            if (data.success) {
                this.loadLogs();
                this.loadStats();
                this.loadFiles();

                if (window.app) {
                    window.app.addNotification('Logs deleted successfully', 'success');
                }
            }

        } catch (error) {
            console.error('Error clearing logs:', error);
            if (window.app) {
                window.app.addNotification('Error deleting logs', 'error');
            }
        }
    }

    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            if (this.isOpen) {
                this.loadLogs();
            }
        }, 5000); // 5 seconds
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
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize global LogViewer
let logViewer = null;

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        logViewer = new LogViewer();
        window.logViewer = logViewer;
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogViewer;
}
