// DOMUtils.js - Utility for DOM manipulation
class DOMUtils {
    constructor() {
        console.log('🔧 DOMUtils initialized');
    }

    // === MODAL MANAGEMENT ===
    
    static showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            console.log('📂 Modal opened:', modalId);
        } else {
            console.warn('⚠️ Modal not found:', modalId);
        }
    }
    
    static hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            console.log('📂 Modal closed:', modalId);
        }
    }

    // === ELEMENT MANIPULATION ===
    
    static updateText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        } else {
            console.warn('⚠️ Element not found:', elementId);
        }
    }

    static updateHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        } else {
            console.warn('⚠️ Element not found:', elementId);
        }
    }

    static setValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
        } else {
            console.warn('⚠️ Element not found:', elementId);
        }
    }

    static getValue(elementId) {
        const element = document.getElementById(elementId);
        return element ? element.value : null;
    }

    static enableElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = false;
        }
    }

    static disableElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.disabled = true;
        }
    }

    // === TEXTAREA UTILITIES ===
    
    static autoResizeTextarea(textarea) {
        if (!textarea) return;
        
        // Reset height to calculate correctly
        textarea.style.height = '50px';

        // Calculate new height based on content - LIMITED TO 300px
        const newHeight = Math.min(textarea.scrollHeight, 300); 
        textarea.style.height = newHeight + 'px';
    }

    // === SCROLL UTILITIES ===
    
    static scrollToBottom(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }

    static scrollToTop(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // === EVENT LISTENERS ===
    
    static addClickListener(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', handler);
            console.log('🔗 Click listener added to:', elementId);
        } else {
            console.warn('⚠️ Element not found for click listener:', elementId);
        }
    }

    static addEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            console.log(`🔗 ${event} listener added to:`, elementId);
        } else {
            console.warn(`⚠️ Element not found for ${event} listener:`, elementId);
        }
    }

    // === UTILITY FUNCTIONS ===
    
    static createElement(tag, className = '', text = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        return element;
    }

    static focus(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.focus();
        }
    }
}

// Export for modularity
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMUtils;
}