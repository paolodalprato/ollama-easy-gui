// SearchInterface.js - Web Search Toggle & AI Integration
class SearchInterface {
    constructor(app) {
        this.app = app;
        this.isWebSearchEnabled = false; // Default: OFF
        this.currentSearchResults = null;

        console.log('🌐 SearchInterface initialized - Web search OFF by default');
        // Toggle moved to header - no longer needed in sidebar
    }

    // Setup web search toggle in existing UI
    setupWebSearchToggle() {
        // Ensure DOM is ready before searching for elements
        const initToggle = () => {
            console.log('🔍 initToggle called, searching for .sidebar-right');
            const rightSidebar = document.querySelector('.sidebar-right');
            console.log('🔍 sidebar-right element:', rightSidebar);
            
            if (rightSidebar) {
                console.log('✅ Found sidebar-right, adding toggle...');
                this.addWebSearchToggle(rightSidebar);
                console.log('✅ Web search toggle added to sidebar-right');
            } else {
                console.warn('❌ sidebar-right not found for web search toggle, retrying...');
                // Retry after a brief delay if DOM is not ready
                setTimeout(initToggle, 100);
            }
        };
        
        // If DOM is already ready, execute immediately, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initToggle);
        } else {
            // DOM already ready or nearly ready
            setTimeout(initToggle, 50);
        }
    }

    // Adds web search toggle to UI
    addWebSearchToggle(container) {
        console.log('🔍 addWebSearchToggle called with container:', container);
        
        const toggleHTML = `
            <div class="web-search-toggle-container ${this.isWebSearchEnabled ? 'active' : 'inactive'}">
                <div class="toggle-header">
                    <span class="toggle-label">🌐 Web Search</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="webSearchToggle" ${this.isWebSearchEnabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="toggle-status ${this.isWebSearchEnabled ? 'active' : 'inactive'}" id="webSearchStatus">
                    ${this.isWebSearchEnabled ? '✅ Active - Web search enabled' : '❌ Disabled (default)'}
                </div>
                <div class="toggle-description">
                    When active, each message is first processed by the AI model to optimize the web search, then results are analyzed to generate a report.
                </div>
            </div>
        `;
        
        console.log('🔍 Toggle HTML created, length:', toggleHTML.length);
        
        // Inserts after the first element in the sidebar
        const firstChild = container.firstElementChild;
        console.log('🔍 First child of container:', firstChild);
        
        if (firstChild) {
            console.log('🔍 Inserting after first child...');
            firstChild.insertAdjacentHTML('afterend', toggleHTML);
        } else {
            console.log('🔍 No first child, prepending to container...');
            container.innerHTML = toggleHTML + container.innerHTML;
        }
        
        console.log('🔍 HTML injection completed, container innerHTML length:', container.innerHTML.length);
        
        // Debug: verify that the element is present in the DOM
        console.log('🔍 Looking for webSearchToggle element...');
        const toggleInput = document.getElementById('webSearchToggle');
        console.log('🔍 webSearchToggle element found:', toggleInput);
        
        if (toggleInput) {
            // CAPTURE PHASE event listeners to bypass event delegation
            console.log('🔍 Adding CAPTURE PHASE event listeners...');
            
            toggleInput.addEventListener('change', (e) => {
                console.log('🔄 CHANGE event - Web search toggle changed:', e.target.checked);
                e.stopPropagation(); // Previeni altri handler
                this.toggleWebSearch(e.target.checked);
            }, true); // CAPTURE PHASE
            
            toggleInput.addEventListener('click', (e) => {
                console.log('🔄 CLICK event - Web search toggle clicked:', e.target.checked);
                e.stopPropagation(); // Previeni event delegation
            }, true); // CAPTURE PHASE
            
            toggleInput.addEventListener('mousedown', (e) => {
                console.log('🔄 MOUSEDOWN detected on toggle');
                e.stopPropagation();
            }, true); // CAPTURE PHASE
            
            toggleInput.addEventListener('mouseup', (e) => {
                console.log('🔄 MOUSEUP detected on toggle');
                e.stopPropagation();
            }, true); // CAPTURE PHASE
            
            // Global test to see events on document
            document.addEventListener('click', (e) => {
                if (e.target.id === 'webSearchToggle') {
                    console.log('🌍 GLOBAL DOCUMENT CLICK on webSearchToggle detected!');
                }
            }, true);
            
            console.log('✅ CAPTURE PHASE event listeners attached to webSearchToggle');
            
        } else {
            console.error('❌ Failed to find webSearchToggle input element');
            
            // Fallback: search all inputs in the sidebar
            const allInputs = document.querySelectorAll('.sidebar-right input');
            console.log('🔍 All inputs in sidebar-right:', allInputs);
        }
    }

    // Toggle web search ON/OFF
    toggleWebSearch(enabled) {
        this.isWebSearchEnabled = enabled;

        // Update status element with classes and content (sidebar toggle)
        const statusElement = document.getElementById('webSearchStatus');
        const containerElement = document.querySelector('.web-search-toggle-container');
        const toggleInput = document.getElementById('webSearchToggle');

        if (statusElement) {
            statusElement.className = `toggle-status ${enabled ? 'active' : 'inactive'}`;
            statusElement.innerHTML = enabled ?
                '✅ Active - Web search enabled' :
                '❌ Disabled (default)';
        }

        // Update container visual feedback
        if (containerElement) {
            containerElement.className = `web-search-toggle-container ${enabled ? 'active' : 'inactive'}`;
        }

        // Sync checkbox in sidebar (if exists)
        if (toggleInput) {
            toggleInput.checked = enabled;
        }

        // Update header indicator
        if (this.app && this.app.updateWebSearchIndicator) {
            this.app.updateWebSearchIndicator(enabled);
        }

        const message = enabled ?
            '🌐 Web Search ENABLED - Queries will be processed with AI + web search' :
            '🌐 Web Search DISABLED - Normal chat mode';

        this.app.addNotification(message, enabled ? 'success' : 'info');
        console.log('🌐 Web search toggled:', enabled);
    }

    // Main method: process message with web search if active
    async processMessageWithWebSearch(userMessage) {
        if (!this.isWebSearchEnabled) {
            return null; // Web search disabled, continue with normal chat
        }
        
        try {
            console.log('🌐 Processing message with web search:', userMessage);
            
            // Step 1: AI reformulates query for search engine
            const optimizedQuery = await this.reformulateQueryForSearch(userMessage);

            // Step 2: Execute web search
            const searchResults = await this.performWebSearch(optimizedQuery);

            // Step 3: AI analyzes results and generates report
            const analysisReport = await this.analyzeSearchResults(userMessage, searchResults);
            
            return {
                originalQuery: userMessage,
                optimizedQuery,
                searchResults,
                analysisReport
            };
            
        } catch (error) {
            console.error('❌ Web search processing failed:', error);
            this.app.addNotification('❌ Error processing web search: ' + error.message, 'error');
            return null;
        }
    }

    // Step 1: AI reformulates query for search engine
    async reformulateQueryForSearch(userMessage) {
        const reformulationPrompt = `You are an assistant specialized in optimizing queries for search engines.

User request: "${userMessage}"

Your task is to reformulate this request into an optimal web search query that:
1. Is short and specific for search engines
2. Uses effective keywords
3. Includes terms that help find updated and relevant information
4. Is suitable for DuckDuckGo

Reply ONLY with the optimized query, without additional explanations.`;
        
        try {
            const response = await this.callAIModel(reformulationPrompt);
            const optimizedQuery = response.trim().replace(/["']/g, ''); // Remove quotes
            
            console.log('🤖 Query optimized:', userMessage, '->', optimizedQuery);
            return optimizedQuery;
            
        } catch (error) {
            console.warn('⚠️ Query reformulation failed, using original:', error);
            return userMessage; // Fallback to original query
        }
    }

    // Step 2: Execute web search with optimized query
    async performWebSearch(query) {
        console.log('🔍 Performing web search for:', query);
        
        const response = await fetch('/api/search/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: query, 
                maxResults: 6 // Limit for AI analysis
            })
        });

        const data = await response.json();

        if (data.success && data.results) {
            console.log(`✅ Found ${data.results.length} search results`);
            return data.results;
        } else {
            throw new Error(data.error || 'Search failed');
        }
    }
    
    // Step 3: AI analyzes search results and generates report
    async analyzeSearchResults(originalQuery, searchResults) {
        const resultsText = searchResults.map((result, index) => 
            `${index + 1}. **${result.title}** (${result.source})\n${result.snippet}\n${result.url || ''}\n`
        ).join('\n');
        
        const analysisPrompt = `You are an AI assistant specialized in analyzing web search results.

User's original question: "${originalQuery}"

Web search results:
${resultsText}

Your task is:
1. Analyze the search results in relation to the user's question
2. Synthesize the most relevant information
3. Identify any important trends or patterns
4. Provide a complete and useful answer based on the data found
5. Cite sources when appropriate

Generate a complete and well-structured analysis report.`;
        
        try {
            const analysisReport = await this.callAIModel(analysisPrompt);
            console.log('🤖 Search results analyzed, report generated');
            return analysisReport;
            
        } catch (error) {
            console.error('❌ Search results analysis failed:', error);
            // Fallback: return simple summary
            return `**Web search results for: "${originalQuery}"**\n\n${resultsText}`;
        }
    }
    
    // Calls the AI model for reformulation and analysis
    async callAIModel(prompt) {
        const currentModel = this.app.getCurrentModel();
        if (!currentModel) {
            throw new Error('No AI model available');
        }

        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: prompt,
                model: currentModel,
                chatId: 'web-search-temp', // Temporary conversation (not saved)
                stream: false // IMPORTANT: NO streaming per web search processing
            })
        });

        const data = await response.json();
        if (data.success && data.response) {
            return data.response;
        } else {
            throw new Error(data.error || 'AI model call failed');
        }
    }
    
    // Shows search results (kept for compatibility)
    // Public method to check if web search is active
    isWebSearchActive() {
        return this.isWebSearchEnabled;
    }
    
    // Method to get the last search result
    getLastSearchResults() {
        return this.currentSearchResults;
    }
    
    displayResults(results, cached = false) {
        // Kept for compatibility but no longer used in new flow
        console.log('📊 DisplayResults called (legacy method)');
    }

    // Public method: gets model compatibility status
    getModelCompatibility() {
        const models = this.app.models || [];
        
        // Web search works well with models of any size
        // but is more effective with larger models for analysis tasks
        return {
            compatible: models.length > 0,
            totalModels: models.length,
            recommendation: models.length > 0 ?
                'Web search works with all models. Larger models (7B+) provide more detailed analysis.' :
                'No model available for web search processing.',
            bestModels: models.filter(m => {
                const name = m.name?.toLowerCase() || '';
                // Identifies larger models that are better for analysis
                return name.includes('llama') || name.includes('qwen') || name.includes('mixtral') || name.includes('gemma');
            }).map(m => m.name)
        };
    }

    // Utility functions kept for compatibility
    getTypeIcon(type) {
        const icons = {
            'instant_answer': '⚡',
            'definition': '📖',
            'related_topic': '📄',
            'info': 'ℹ️',
            'news': '📰',
            'image': '🖼️'
        };
        return icons[type] || '🔍';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance to be accessible from click handlers
window.searchInterface = null;