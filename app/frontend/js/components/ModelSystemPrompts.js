// ModelSystemPrompts.js - Sistema Prompts Management Module
// Extracted from ModelManager.js for GUARDRAIL ARCHITECTURE compliance
// Size: 147 lines (target: <500 lines) ✅

/**
 * ModelSystemPrompts - Manages editor and persistence of system prompts for models
 * 
 * RESPONSIBILITIES:
 * - Modal editor creation and management
 * - System prompt saving to backend API
 * - Cache invalidation coordination
 * - Model-specific prompt handling
 * 
 * DEPENDENCIES:
 * - this.app: Main application coordinator for API and notifications
 * - Backend API: /api/system-prompts/save
 * - DOM manipulation for modal management
 * 
 * ARCHITECTURE: Modular component with event-based communication
 */
class ModelSystemPrompts {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Shows the modal editor for system prompts of a specific model
     * @param {string} modelName - Model name to configure
     */
    async showSystemPromptEditor(modelName) {
        console.log(`🔧 CLICK DETECTED! Opening system prompt editor for: ${modelName}`);
        
        try {
            // Get current system prompts using cached method
            const prompts = await this.app.getSystemPrompts();
            
            let currentPrompt = '';
            if (prompts[modelName]) {
                currentPrompt = prompts[modelName];
            } else if (prompts['default']) {
                currentPrompt = prompts['default'];
            }
            
            // Create modal HTML
            const modalHTML = `
                <div id="systemPromptModal" class="modal-overlay system-prompt-modal" style="display: flex;">
                    <div class="modal-container" style="max-width: 800px; width: 90%;">
                        <div class="modal-header">
                            <h3>🔧 Prompt Base - ${modelName}</h3>
                            <button class="modal-close" onclick="app.modelManager.systemPrompts.hideSystemPromptEditor()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div style="margin-bottom: 15px; color: #666; font-size: 14px;">
                                Define the behavior and personality of the AI for this model.
                                The base prompt is automatically applied to every conversation.
                            </div>
                            <textarea
                                id="systemPromptTextarea"
                                placeholder="Enter the base prompt for ${modelName}..."
                                style="width: 100%; height: 300px; padding: 15px; border: 2px solid #e1e5e9; border-radius: 8px; font-family: monospace; font-size: 14px; resize: vertical; line-height: 1.4;"
                            >${currentPrompt}</textarea>
                            <div style="margin-top: 10px; font-size: 12px; color: #888;">
                                Example: "You are an expert ${modelName.includes('coder') ? 'programmer' : modelName.includes('med') ? 'medical advisor' : 'assistant'} specialized in..."
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="app.modelManager.systemPrompts.hideSystemPromptEditor()">
                                ❌ Cancel
                            </button>
                            <button class="btn btn-primary" onclick="app.modelManager.systemPrompts.saveSystemPrompt('${modelName}')">
                                💾 Close and Save
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Remove existing modal if any
            const existingModal = document.getElementById('systemPromptModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Add to body
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Focus textarea
            setTimeout(() => {
                const textarea = document.getElementById('systemPromptTextarea');
                if (textarea) {
                    textarea.focus();
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ Error loading system prompt:', error);
            this.app.addNotification('❌ Error loading base prompt', 'error');
        }
    }
    
    /**
     * Closes the modal editor
     */
    hideSystemPromptEditor() {
        console.log(`🚪 CLOSING system prompt editor`);
        const modal = document.getElementById('systemPromptModal');
        if (modal) {
            console.log(`🚪 Modal found, removing...`);
            modal.remove();
            console.log(`✅ Modal removed successfully`);
        } else {
            console.error(`❌ Modal not found!`);
        }
    }
    
    /**
     * Saves the system prompt for a specific model
     * @param {string} modelName - Model name
     */
    async saveSystemPrompt(modelName) {
        console.log(`🔧 SAVE BUTTON CLICKED for ${modelName}`);
        const textarea = document.getElementById('systemPromptTextarea');
        if (!textarea) {
            console.error('❌ Textarea not found');
            return;
        }
        
        const prompt = textarea.value.trim();
        console.log(`💾 Prompt length: ${prompt.length} chars`);
        
        try {
            console.log(`💾 Sending save request for ${modelName}`);
            
            const response = await fetch('/api/system-prompts/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelName, prompt })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.app.addNotification(`✅ Base prompt saved for ${modelName}`, 'success');
                
                // Invalidate cache so new prompt is loaded
                this.app.invalidateSystemPromptsCache();
                
                this.hideSystemPromptEditor();
            } else {
                throw new Error(data.error || 'Error saving');
            }
            
        } catch (error) {
            console.error('❌ Error saving system prompt:', error);
            this.app.addNotification(`❌ Error saving prompt: ${error.message}`, 'error');
        }
    }
    
    /**
     * Checks if a model has a custom system prompt
     * @param {string} modelName - Model name
     * @returns {Promise<boolean>}
     */
    async hasSystemPrompt(modelName) {
        // Use app's cached method to prevent infinite requests
        return await this.app.hasSystemPrompt(modelName);
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelSystemPrompts;
}