/**
 * HttpResponse - Centralized HTTP Response Utility
 *
 * Eliminates duplicate response boilerplate across controllers.
 * Provides consistent JSON response format: { success: boolean, data?, error? }
 */

class HttpResponse {
    /**
     * Send a successful JSON response
     * @param {Object} res - HTTP response object
     * @param {Object} data - Response data
     * @param {number} statusCode - HTTP status code (default: 200)
     */
    static success(res, data, statusCode = 200) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    /**
     * Send an error JSON response
     * @param {Object} res - HTTP response object
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code (default: 500)
     */
    static error(res, message, statusCode = 500) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: message }));
    }

    /**
     * Send a 400 Bad Request response
     * @param {Object} res - HTTP response object
     * @param {string} message - Error message
     */
    static badRequest(res, message = 'Bad request') {
        this.error(res, message, 400);
    }

    /**
     * Send a 404 Not Found response
     * @param {Object} res - HTTP response object
     * @param {string} message - Error message
     */
    static notFound(res, message = 'Not found') {
        this.error(res, message, 404);
    }

    /**
     * Send a 500 Internal Server Error response
     * @param {Object} res - HTTP response object
     * @param {string} message - Error message
     */
    static serverError(res, message = 'Internal server error') {
        this.error(res, message, 500);
    }

    /**
     * Send a file download response
     * @param {Object} res - HTTP response object
     * @param {Buffer|string} content - File content
     * @param {string} filename - Download filename
     * @param {string} mimeType - Content MIME type
     */
    static download(res, content, filename, mimeType = 'application/octet-stream') {
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': Buffer.byteLength(content)
        });
        res.end(content);
    }

    /**
     * Send SSE (Server-Sent Events) headers
     * @param {Object} res - HTTP response object
     */
    static sseHeaders(res) {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
    }

    /**
     * Send an SSE event
     * @param {Object} res - HTTP response object
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    static sseEvent(res, event, data) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
}

module.exports = HttpResponse;
