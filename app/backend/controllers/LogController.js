/**
 * LogController.js - API endpoints per gestione log
 */

const logger = require('../core/logging/LoggingService');

class LogController {

    /**
     * GET /api/logs/files - Lista file di log disponibili
     */
    static getLogFiles(req, res) {
        try {
            const files = logger.getLogFiles();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: {
                    files,
                    count: files.length
                }
            }));

        } catch (error) {
            logger.error('Error getting log files', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    /**
     * GET /api/logs/read/:filename - Leggi contenuto file di log
     */
    static readLogFile(req, res, filename) {
        try {
            // Parse query parameters
            const url = new URL(req.url, `http://${req.headers.host}`);
            const options = {
                level: url.searchParams.get('level'),
                search: url.searchParams.get('search'),
                offset: parseInt(url.searchParams.get('offset')) || 0,
                limit: parseInt(url.searchParams.get('limit')) || 100
            };

            const result = logger.readLog(filename, options);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: result
            }));

        } catch (error) {
            logger.error('Error reading log file', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    /**
     * GET /api/logs/category/:category - Leggi log per categoria
     */
    static getLogsByCategory(req, res, category) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const options = {
                level: url.searchParams.get('level'),
                search: url.searchParams.get('search'),
                offset: parseInt(url.searchParams.get('offset')) || 0,
                limit: parseInt(url.searchParams.get('limit')) || 100
            };

            const result = logger.getLogsByCategory(category, options);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: result
            }));

        } catch (error) {
            logger.error('Error getting logs by category', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    /**
     * GET /api/logs/stats - Statistiche log
     */
    static getLogStats(req, res) {
        try {
            const stats = logger.getStats();

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                data: stats
            }));

        } catch (error) {
            logger.error('Error getting log stats', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    /**
     * DELETE /api/logs/clear - Cancella log (opzionale per categoria)
     */
    static clearLogs(req, res) {
        let body = '';

        req.on('data', chunk => body += chunk);

        req.on('end', () => {
            try {
                let category = null;

                // Parse body if present
                if (body && body.trim()) {
                    try {
                        const data = JSON.parse(body);
                        category = data.category;
                    } catch (e) {
                        // Invalid JSON or no category - clear all
                    }
                }

                console.log(`🗑️ Clearing logs - category: ${category || 'all'}`);

                const result = logger.clearLogs(category);

                console.log(`🗑️ Clear result:`, result);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: result.success,
                    data: result
                }));

            } catch (error) {
                console.error('❌ Error clearing logs:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: error.message
                }));
            }
        });

        req.on('error', (error) => {
            console.error('❌ Request error clearing logs:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        });
    }

    /**
     * Router per gestire le richieste log
     */
    static handleRequest(req, res, pathname) {
        const method = req.method;

        // GET /api/logs/files
        if (method === 'GET' && pathname === '/api/logs/files') {
            return LogController.getLogFiles(req, res);
        }

        // GET /api/logs/stats
        if (method === 'GET' && pathname === '/api/logs/stats') {
            return LogController.getLogStats(req, res);
        }

        // GET /api/logs/read/:filename
        if (method === 'GET' && pathname.startsWith('/api/logs/read/')) {
            const filename = pathname.replace('/api/logs/read/', '');
            return LogController.readLogFile(req, res, filename);
        }

        // GET /api/logs/category/:category
        if (method === 'GET' && pathname.startsWith('/api/logs/category/')) {
            const category = pathname.replace('/api/logs/category/', '');
            return LogController.getLogsByCategory(req, res, category);
        }

        // DELETE /api/logs/clear
        if (method === 'DELETE' && pathname === '/api/logs/clear') {
            return LogController.clearLogs(req, res);
        }

        // POST /api/logs/clear (alternative)
        if (method === 'POST' && pathname === '/api/logs/clear') {
            return LogController.clearLogs(req, res);
        }

        // Route not found
        return false;
    }
}

module.exports = LogController;
