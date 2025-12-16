/**
 * LoggingService.js - Sistema di logging centralizzato per OllamaGUI
 *
 * Features:
 * - Log separati per categoria (app, mcp, errors)
 * - Rotazione automatica log
 * - Livelli di logging (debug, info, warn, error)
 * - Formattazione consistente con timestamp
 */

const fs = require('fs');
const path = require('path');

class LoggingService {
    constructor() {
        this.logsDir = path.join(__dirname, '../../../data/logs');
        this.maxFileSize = 5 * 1024 * 1024; // 5MB per file
        this.maxFiles = 5; // Mantieni max 5 file per categoria

        // Log categories
        this.categories = {
            app: 'ollamagui',
            mcp: 'mcp',
            error: 'errors',
            chat: 'chat',
            model: 'models'
        };

        // Ensure logs directory exists
        this.ensureLogsDirectory();

        // Initialize log files
        this.logStreams = {};

        console.log('[LoggingService] Initialized - Logs directory:', this.logsDir);
    }

    /**
     * Ensure logs directory exists
     */
    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    /**
     * Get current log filename for category
     */
    getLogFilename(category) {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return path.join(this.logsDir, `${category}_${date}.log`);
    }

    /**
     * Format log entry
     */
    formatEntry(level, category, message, data = null) {
        const timestamp = new Date().toISOString();
        let entry = `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;

        if (data) {
            try {
                const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                entry += `\n  Data: ${dataStr}`;
            } catch (e) {
                entry += `\n  Data: [Serialization Error]`;
            }
        }

        return entry + '\n';
    }

    /**
     * Write log entry to file
     */
    writeLog(category, level, message, data = null) {
        try {
            const filename = this.getLogFilename(category);
            const entry = this.formatEntry(level, category, message, data);

            // Check file size and rotate if needed
            this.checkAndRotate(filename, category);

            // Append to log file
            fs.appendFileSync(filename, entry);

            // Also output to console in development
            if (process.env.NODE_ENV !== 'production') {
                const consoleMethod = level === 'error' ? 'error' : (level === 'warn' ? 'warn' : 'log');
                console[consoleMethod](`[${category.toUpperCase()}] ${message}`);
            }

        } catch (error) {
            console.error('[LoggingService] Error writing log:', error.message);
        }
    }

    /**
     * Check file size and rotate if needed
     */
    checkAndRotate(filename, category) {
        try {
            if (fs.existsSync(filename)) {
                const stats = fs.statSync(filename);
                if (stats.size > this.maxFileSize) {
                    this.rotateLog(filename, category);
                }
            }
        } catch (error) {
            console.error('[LoggingService] Error checking log rotation:', error.message);
        }
    }

    /**
     * Rotate log file
     */
    rotateLog(filename, category) {
        try {
            const date = new Date().toISOString().split('T')[0];
            const timestamp = Date.now();
            const rotatedName = path.join(this.logsDir, `${category}_${date}_${timestamp}.log`);

            fs.renameSync(filename, rotatedName);

            // Cleanup old files
            this.cleanupOldLogs(category);

        } catch (error) {
            console.error('[LoggingService] Error rotating log:', error.message);
        }
    }

    /**
     * Cleanup old log files beyond max retention
     */
    cleanupOldLogs(category) {
        try {
            const files = fs.readdirSync(this.logsDir)
                .filter(f => f.startsWith(category) && f.endsWith('.log'))
                .map(f => ({
                    name: f,
                    path: path.join(this.logsDir, f),
                    mtime: fs.statSync(path.join(this.logsDir, f)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            // Remove files beyond max retention
            if (files.length > this.maxFiles) {
                files.slice(this.maxFiles).forEach(f => {
                    fs.unlinkSync(f.path);
                    console.log(`[LoggingService] Removed old log: ${f.name}`);
                });
            }

        } catch (error) {
            console.error('[LoggingService] Error cleaning up logs:', error.message);
        }
    }

    // ========== PUBLIC LOGGING METHODS ==========

    /**
     * Log application events
     */
    app(level, message, data = null) {
        this.writeLog(this.categories.app, level, message, data);
    }

    /**
     * Log MCP events
     */
    mcp(level, message, data = null) {
        this.writeLog(this.categories.mcp, level, message, data);
    }

    /**
     * Log errors
     */
    error(message, error = null) {
        const errorData = error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : null;
        this.writeLog(this.categories.error, 'error', message, errorData);
    }

    /**
     * Log chat events
     */
    chat(level, message, data = null) {
        this.writeLog(this.categories.chat, level, message, data);
    }

    /**
     * Log model events
     */
    model(level, message, data = null) {
        this.writeLog(this.categories.model, level, message, data);
    }

    // ========== CONVENIENCE METHODS ==========

    info(message, data = null) {
        this.app('info', message, data);
    }

    warn(message, data = null) {
        this.app('warn', message, data);
    }

    debug(message, data = null) {
        this.app('debug', message, data);
    }

    // ========== LOG READING METHODS ==========

    /**
     * Get available log files
     */
    getLogFiles() {
        try {
            const files = fs.readdirSync(this.logsDir)
                .filter(f => f.endsWith('.log'))
                .map(f => {
                    const stats = fs.statSync(path.join(this.logsDir, f));
                    const parts = f.replace('.log', '').split('_');
                    return {
                        name: f,
                        category: parts[0],
                        date: parts[1],
                        size: stats.size,
                        sizeFormatted: this.formatBytes(stats.size),
                        modified: stats.mtime
                    };
                })
                .sort((a, b) => b.modified - a.modified);

            return files;

        } catch (error) {
            console.error('[LoggingService] Error getting log files:', error.message);
            return [];
        }
    }

    /**
     * Read log file contents
     */
    readLog(filename, options = {}) {
        try {
            const filepath = path.join(this.logsDir, filename);

            // Security check - prevent path traversal
            if (!filepath.startsWith(this.logsDir)) {
                throw new Error('Invalid log file path');
            }

            if (!fs.existsSync(filepath)) {
                return { entries: [], total: 0 };
            }

            const content = fs.readFileSync(filepath, 'utf8');
            let entries = content.split('\n').filter(line => line.trim());

            // Apply filters
            if (options.level) {
                entries = entries.filter(e => e.includes(`[${options.level.toUpperCase()}]`));
            }

            if (options.search) {
                const searchLower = options.search.toLowerCase();
                entries = entries.filter(e => e.toLowerCase().includes(searchLower));
            }

            // Pagination
            const total = entries.length;
            const offset = options.offset || 0;
            const limit = options.limit || 100;

            // Return newest first
            entries = entries.reverse().slice(offset, offset + limit);

            return {
                entries,
                total,
                offset,
                limit,
                hasMore: (offset + limit) < total
            };

        } catch (error) {
            console.error('[LoggingService] Error reading log:', error.message);
            return { entries: [], total: 0, error: error.message };
        }
    }

    /**
     * Get logs by category (from today's file)
     */
    getLogsByCategory(category, options = {}) {
        const filename = `${category}_${new Date().toISOString().split('T')[0]}.log`;
        return this.readLog(filename, options);
    }

    /**
     * Clear logs for category
     */
    clearLogs(category = null) {
        try {
            const files = fs.readdirSync(this.logsDir)
                .filter(f => f.endsWith('.log') && (!category || f.startsWith(category)));

            files.forEach(f => {
                fs.unlinkSync(path.join(this.logsDir, f));
            });

            return { success: true, cleared: files.length };

        } catch (error) {
            console.error('[LoggingService] Error clearing logs:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get logging statistics
     */
    getStats() {
        try {
            const files = this.getLogFiles();
            const totalSize = files.reduce((sum, f) => sum + f.size, 0);

            const byCategory = {};
            files.forEach(f => {
                if (!byCategory[f.category]) {
                    byCategory[f.category] = { count: 0, size: 0 };
                }
                byCategory[f.category].count++;
                byCategory[f.category].size += f.size;
            });

            return {
                totalFiles: files.length,
                totalSize: totalSize,
                totalSizeFormatted: this.formatBytes(totalSize),
                byCategory,
                logsDir: this.logsDir
            };

        } catch (error) {
            console.error('[LoggingService] Error getting stats:', error.message);
            return { error: error.message };
        }
    }
}

// Singleton instance
const loggingService = new LoggingService();

module.exports = loggingService;
