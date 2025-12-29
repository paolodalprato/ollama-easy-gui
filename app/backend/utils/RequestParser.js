/**
 * RequestParser - Centralized Request Parsing Utility
 *
 * Eliminates duplicate request body parsing boilerplate across controllers.
 * Provides Promise-based body parsing with error handling.
 */

class RequestParser {
    /**
     * Parse JSON body from request
     * @param {Object} req - HTTP request object
     * @param {number} maxSize - Maximum body size in bytes (default: 10MB)
     * @returns {Promise<Object>} Parsed JSON object
     */
    static parseJSON(req, maxSize = 10 * 1024 * 1024) {
        return new Promise((resolve, reject) => {
            let body = '';
            let size = 0;

            req.on('data', chunk => {
                size += chunk.length;
                if (size > maxSize) {
                    req.destroy();
                    reject(new Error(`Request body too large (max ${maxSize / 1024 / 1024}MB)`));
                    return;
                }
                body += chunk.toString();
            });

            req.on('end', () => {
                try {
                    if (!body.trim()) {
                        resolve({});
                        return;
                    }
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (error) {
                    reject(new Error('Invalid JSON in request body'));
                }
            });

            req.on('error', error => {
                reject(error);
            });
        });
    }

    /**
     * Parse raw body from request (for multipart, binary data, etc.)
     * @param {Object} req - HTTP request object
     * @param {number} maxSize - Maximum body size in bytes (default: 50MB)
     * @returns {Promise<Buffer>} Raw body buffer
     */
    static parseRaw(req, maxSize = 50 * 1024 * 1024) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            let size = 0;

            req.on('data', chunk => {
                size += chunk.length;
                if (size > maxSize) {
                    req.destroy();
                    reject(new Error(`Request body too large (max ${maxSize / 1024 / 1024}MB)`));
                    return;
                }
                chunks.push(chunk);
            });

            req.on('end', () => {
                resolve(Buffer.concat(chunks));
            });

            req.on('error', error => {
                reject(error);
            });
        });
    }

    /**
     * Extract URL parameter from path
     * @param {string} url - Request URL
     * @param {string} basePath - Base path to strip (e.g., '/api/chat/load/')
     * @returns {string} Extracted parameter value
     */
    static extractParam(url, basePath) {
        const cleanUrl = url.split('?')[0]; // Remove query string
        const param = cleanUrl.replace(basePath, '');
        return decodeURIComponent(param);
    }

    /**
     * Extract multiple path segments
     * @param {string} url - Request URL
     * @returns {string[]} Array of path segments
     */
    static getPathSegments(url) {
        const cleanUrl = url.split('?')[0];
        return cleanUrl.split('/').filter(segment => segment.length > 0);
    }

    /**
     * Parse query string parameters
     * @param {string} url - Request URL
     * @returns {Object} Parsed query parameters
     */
    static parseQuery(url) {
        const queryStart = url.indexOf('?');
        if (queryStart === -1) return {};

        const queryString = url.slice(queryStart + 1);
        const params = {};

        queryString.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
            }
        });

        return params;
    }
}

module.exports = RequestParser;
