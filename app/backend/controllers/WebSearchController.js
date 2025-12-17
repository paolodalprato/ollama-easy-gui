// WebSearchController.js - Web search with DuckDuckGo HTML scraping
// Uses html.duckduckgo.com for real search results (privacy-first, no API key required)

const https = require('https');
const { URL } = require('url');

class WebSearchController {
    constructor() {
        this.cache = new Map();
        this.rateLimitMap = new Map();
        this.maxCacheSize = 100;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.rateLimitWindow = 60 * 1000; // 1 minute
        this.maxRequestsPerWindow = 10;

        console.log('🌐 WebSearchController initialized with DuckDuckGo HTML scraping');
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
                    cached: false,
                    resultCount: results.length
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

    // Perform DuckDuckGo HTML search (real search results)
    async performDuckDuckGoSearch(query, maxResults) {
        return new Promise((resolve, reject) => {
            try {
                // Use DuckDuckGo HTML version (lite, no JS) for scraping
                const searchURL = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

                const options = {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'identity',
                        'Connection': 'keep-alive'
                    },
                    timeout: 15000
                };

                const request = https.get(searchURL, options, (response) => {
                    // Handle redirects
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        console.log('🔄 Following redirect to:', response.headers.location);
                        https.get(response.headers.location, options, (redirectResponse) => {
                            this.handleSearchResponse(redirectResponse, maxResults, resolve, reject);
                        }).on('error', reject);
                        return;
                    }

                    this.handleSearchResponse(response, maxResults, resolve, reject);
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

    // Handle the HTTP response and parse results
    handleSearchResponse(response, maxResults, resolve, reject) {
        let data = '';

        response.on('data', chunk => {
            data += chunk;
        });

        response.on('end', () => {
            try {
                const results = this.parseHTMLResults(data, maxResults);
                console.log(`✅ Parsed ${results.length} search results`);
                resolve(results);
            } catch (parseError) {
                console.error('❌ Failed to parse DuckDuckGo HTML:', parseError);
                reject(parseError);
            }
        });

        response.on('error', reject);
    }

    // Parse DuckDuckGo HTML results
    parseHTMLResults(html, maxResults) {
        const results = [];

        // DuckDuckGo HTML structure: results are in <div class="result"> or <div class="web-result">
        // Each result contains:
        // - <a class="result__a"> with href and title
        // - <a class="result__snippet"> with description

        // Pattern to match result blocks
        const resultPattern = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*result|$)/gi;

        // More specific patterns for extracting data
        const linkPattern = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i;
        const snippetPattern = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i;
        const urlPattern = /<span[^>]*class="[^"]*result__url[^"]*"[^>]*>([^<]*)<\/span>/i;

        // Alternative pattern for result links (href in uddg parameter)
        const uddgPattern = /uddg=([^&"]+)/i;

        let match;
        while ((match = resultPattern.exec(html)) !== null && results.length < maxResults) {
            const resultBlock = match[1];

            // Skip ads and non-organic results
            if (resultBlock.includes('result--ad') || resultBlock.includes('sponsored')) {
                continue;
            }

            // Extract link and title
            const linkMatch = linkPattern.exec(resultBlock);
            if (!linkMatch) continue;

            let url = linkMatch[1];
            let title = this.decodeHTMLEntities(linkMatch[2].trim());

            // DuckDuckGo wraps URLs - extract actual URL from uddg parameter
            if (url.includes('uddg=')) {
                const uddgMatch = uddgPattern.exec(url);
                if (uddgMatch) {
                    url = decodeURIComponent(uddgMatch[1]);
                }
            }

            // Skip if no valid URL
            if (!url || url.startsWith('/') || !url.startsWith('http')) {
                continue;
            }

            // Extract snippet
            const snippetMatch = snippetPattern.exec(resultBlock);
            let snippet = '';
            if (snippetMatch) {
                snippet = this.decodeHTMLEntities(
                    snippetMatch[1]
                        .replace(/<[^>]*>/g, '') // Remove HTML tags
                        .replace(/\s+/g, ' ')    // Normalize whitespace
                        .trim()
                );
            }

            // Extract display URL
            const urlMatch = urlPattern.exec(resultBlock);
            const displayUrl = urlMatch ? this.decodeHTMLEntities(urlMatch[1].trim()) : this.extractDomain(url);

            if (title && url && snippet) {
                results.push({
                    title: title,
                    url: url,
                    snippet: snippet,
                    displayUrl: displayUrl,
                    source: 'DuckDuckGo',
                    type: 'web_result'
                });
            }
        }

        // If regex didn't work, try alternative parsing
        if (results.length === 0) {
            console.log('🔄 Trying alternative HTML parsing...');
            return this.parseHTMLResultsAlternative(html, maxResults);
        }

        return results;
    }

    // Alternative parsing method for different HTML structures
    parseHTMLResultsAlternative(html, maxResults) {
        const results = [];

        // Look for links with result data
        // Pattern: <a rel="nofollow" class="result__a" href="...">Title</a>
        const allLinksPattern = /<a[^>]*href="\/l\/\?uddg=([^"&]+)[^"]*"[^>]*>([^<]+)<\/a>/gi;
        const snippetBlockPattern = /<td[^>]*class="[^"]*result-snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/gi;

        // Collect all snippets
        const snippets = [];
        let snippetMatch;
        while ((snippetMatch = snippetBlockPattern.exec(html)) !== null) {
            snippets.push(this.decodeHTMLEntities(
                snippetMatch[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
            ));
        }

        // Match links with snippets
        let linkMatch;
        let index = 0;
        while ((linkMatch = allLinksPattern.exec(html)) !== null && results.length < maxResults) {
            const url = decodeURIComponent(linkMatch[1]);
            const title = this.decodeHTMLEntities(linkMatch[2].trim());

            if (url && url.startsWith('http') && title && title.length > 3) {
                results.push({
                    title: title,
                    url: url,
                    snippet: snippets[index] || 'No description available',
                    displayUrl: this.extractDomain(url),
                    source: 'DuckDuckGo',
                    type: 'web_result'
                });
                index++;
            }
        }

        return results;
    }

    // Decode HTML entities
    decodeHTMLEntities(text) {
        const entities = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&nbsp;': ' ',
            '&#x27;': "'",
            '&#x2F;': '/',
            '&#x60;': '`',
            '&#x3D;': '='
        };

        return text.replace(/&[#\w]+;/g, entity => entities[entity] || entity);
    }

    // Extract domain from URL
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return url.substring(0, 50);
        }
    }

    // Rate limiting check
    checkRateLimit(clientIP) {
        const now = Date.now();
        const clientHistory = this.rateLimitMap.get(clientIP) || [];

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
            provider: 'DuckDuckGo HTML',
            method: 'Web scraping (no API key required)',
            cache_size: this.cache.size,
            rate_limit_entries: this.rateLimitMap.size,
            privacy_first: true
        }));
    }
}

module.exports = WebSearchController;
