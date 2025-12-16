// WebSearchController.js - Gestione ricerca web con DuckDuckGo
const https = require('https');
const { URL } = require('url');

class WebSearchController {
    constructor() {
        this.cache = new Map(); // Simple in-memory cache
        this.rateLimitMap = new Map(); // Rate limiting per IP
        this.maxCacheSize = 100;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.rateLimitWindow = 60 * 1000; // 1 minute
        this.maxRequestsPerWindow = 10;
        
        console.log('🌐 WebSearchController initialized with privacy-first DuckDuckGo');
    }

    // Main search endpoint
    async search(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { query, maxResults = 5 } = JSON.parse(body);
                
                if (!query || query.trim().length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Query is required' 
                    }));
                    return;
                }

                // Check rate limiting
                const clientIP = req.connection.remoteAddress || 'unknown';
                if (!this.checkRateLimit(clientIP)) {
                    res.writeHead(429, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Rate limit exceeded. Try again later.' 
                    }));
                    return;
                }

                // Check cache first
                const cacheKey = `${query.toLowerCase()}_${maxResults}`;
                const cachedResult = this.getFromCache(cacheKey);
                
                if (cachedResult) {
                    console.log('🔍 Search cache hit for:', query);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        query,
                        results: cachedResult,
                        cached: true
                    }));
                    return;
                }

                console.log('🔍 Searching web for:', query);
                const results = await this.performDuckDuckGoSearch(query, maxResults);
                
                // Cache successful results
                if (results.length > 0) {
                    this.addToCache(cacheKey, results);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    query,
                    results,
                    cached: false
                }));

            } catch (error) {
                console.error('❌ Search error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: 'Search failed: ' + error.message 
                }));
            }
        });
    }

    // Perform DuckDuckGo instant answer search
    async performDuckDuckGoSearch(query, maxResults) {
        return new Promise((resolve, reject) => {
            try {
                // Use DuckDuckGo Instant Answer API (privacy-respecting)
                const searchURL = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
                
                const request = https.get(searchURL, { timeout: 10000 }, (response) => {
                    let data = '';
                    
                    response.on('data', chunk => {
                        data += chunk;
                    });
                    
                    response.on('end', () => {
                        try {
                            const searchData = JSON.parse(data);
                            const results = this.formatDuckDuckGoResults(searchData, maxResults);
                            resolve(results);
                        } catch (parseError) {
                            console.error('❌ Failed to parse DuckDuckGo response:', parseError);
                            reject(parseError);
                        }
                    });
                });
                
                request.on('timeout', () => {
                    request.destroy();
                    reject(new Error('Search request timeout'));
                });
                
                request.on('error', (error) => {
                    reject(error);
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // Format DuckDuckGo results into consistent structure
    formatDuckDuckGoResults(data, maxResults) {
        const results = [];
        
        // Add instant answer if available
        if (data.Abstract && data.AbstractText) {
            results.push({
                title: data.Heading || 'Instant Answer',
                url: data.AbstractURL || '',
                snippet: data.AbstractText,
                type: 'instant_answer',
                source: data.AbstractSource || 'DuckDuckGo'
            });
        }
        
        // Add definition if available
        if (data.Definition && data.DefinitionText) {
            results.push({
                title: 'Definition',
                url: data.DefinitionURL || '',
                snippet: data.DefinitionText,
                type: 'definition',
                source: data.DefinitionSource || 'Dictionary'
            });
        }
        
        // Add related topics
        if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
            for (let topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
                if (topic.FirstURL && topic.Text) {
                    results.push({
                        title: this.extractTitle(topic.Text),
                        url: topic.FirstURL,
                        snippet: topic.Text,
                        type: 'related_topic',
                        source: 'DuckDuckGo'
                    });
                }
            }
        }
        
        // Add infobox data if available
        if (data.Infobox && data.Infobox.content) {
            for (let item of data.Infobox.content.slice(0, 2)) {
                if (item.data_type === 'string' && item.value) {
                    results.push({
                        title: item.label || 'Information',
                        url: '',
                        snippet: item.value,
                        type: 'info',
                        source: 'DuckDuckGo'
                    });
                }
            }
        }
        
        return results.slice(0, maxResults);
    }

    // Extract title from text snippet
    extractTitle(text) {
        const parts = text.split(' - ');
        return parts[0] || text.substring(0, 60) + '...';
    }

    // Rate limiting check
    checkRateLimit(clientIP) {
        const now = Date.now();
        const clientHistory = this.rateLimitMap.get(clientIP) || [];
        
        // Remove old entries outside the window
        const validEntries = clientHistory.filter(timestamp => 
            now - timestamp < this.rateLimitWindow
        );
        
        if (validEntries.length >= this.maxRequestsPerWindow) {
            return false;
        }
        
        validEntries.push(now);
        this.rateLimitMap.set(clientIP, validEntries);
        return true;
    }

    // Cache management
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    addToCache(key, data) {
        // Simple LRU: if cache is full, remove oldest entry
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    // Clear cache endpoint
    async clearCache(req, res) {
        this.cache.clear();
        this.rateLimitMap.clear();
        
        console.log('🗑️ Search cache cleared');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Cache cleared successfully'
        }));
    }

    // Search status endpoint
    async getStatus(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            provider: 'DuckDuckGo',
            cache_size: this.cache.size,
            rate_limit_entries: this.rateLimitMap.size,
            privacy_first: true
        }));
    }
}

module.exports = WebSearchController;