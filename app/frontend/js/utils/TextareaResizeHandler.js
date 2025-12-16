// TextareaResizeHandler.js - Extracted from app.js for size compliance  
// Handles textarea resize functionality with intuitive upward growth

class TextareaResizeHandler {
    constructor() {
        this.isResizing = false;
        this.startY = 0;
        this.startHeight = 0;
        console.log('📏 TextareaResizeHandler initialized');
    }

    setup() {
        const resizeHandle = document.getElementById('textareaResizeHandle');
        const textarea = document.getElementById('messageInput');
        const chatMessages = document.querySelector('.chat-messages');
        
        console.log('📏 Setting up textarea resize...', { resizeHandle: !!resizeHandle, textarea: !!textarea, chatMessages: !!chatMessages });
        
        if (resizeHandle && textarea && chatMessages) {
            console.log('✅ All elements found, setting up INVERTED FLEX resize functionality');
            
            // Visual feedback on hover
            resizeHandle.addEventListener('mouseenter', () => {
                resizeHandle.style.transform = 'scale(1.1)';
                resizeHandle.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
            });
            
            resizeHandle.addEventListener('mouseleave', () => {
                if (!this.isResizing) {
                    resizeHandle.style.transform = 'scale(1)';
                    resizeHandle.style.backgroundColor = 'transparent';
                }
            });
            
            resizeHandle.addEventListener('mousedown', (e) => this.handleMouseDown(e, textarea, chatMessages));
            
            // Enable smooth auto-resize for content
            textarea.addEventListener('input', () => this.handleAutoResize(textarea));
            
            console.log('✅ INVERTED FLEX textarea resize listeners set up');
        } else {
            console.warn('⚠️ Textarea resize elements not found');
        }
    }

    handleMouseDown(e, textarea, chatMessages) {
        console.log('🖱️ Mousedown on resize handle');
        this.isResizing = true;
        this.startY = e.clientY;
        this.startHeight = parseInt(document.defaultView.getComputedStyle(textarea).height, 10);
        console.log('📏 Starting resize:', { startY: this.startY, startHeight: this.startHeight });
        
        // Store scroll position before resize
        const wasAtBottom = chatMessages.scrollTop >= (chatMessages.scrollHeight - chatMessages.clientHeight - 10);
        
        const handleMouseMove = (e) => this.handleMouseMove(e, textarea, chatMessages);
        const handleMouseUp = (e) => this.handleMouseUp(e, handleMouseMove, handleMouseUp);
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Enhanced visual feedback during resize
        const inputContainer = document.querySelector('.chat-input-container');
        const resizeHandle = document.getElementById('textareaResizeHandle');
        document.body.style.cursor = 'ns-resize';
        resizeHandle.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
        if (inputContainer) {
            inputContainer.classList.add('resizing');
        }
        
        e.preventDefault();
    }

    handleMouseMove(e, textarea, chatMessages) {
        if (!this.isResizing) return;
        
        // CORRECTED: Intuitive gesture mapping - drag UP to make bigger (upward visual growth)
        const deltaY = this.startY - e.clientY; // Positive when dragging UP
        const newHeight = Math.max(50, Math.min(500, this.startHeight + deltaY));
        const heightDelta = newHeight - this.startHeight;
        
        console.log('📏 Intuitive resizing:', { 
            gesture: deltaY > 0 ? 'UP' : 'DOWN',
            deltaY, 
            heightDelta,
            newHeight, 
            currentY: e.clientY 
        });
        
        // Store current scroll position and chat height
        const currentScrollTop = chatMessages.scrollTop;
        const previousChatHeight = chatMessages.clientHeight;
        
        // Update textarea height
        textarea.style.height = newHeight + 'px';
        
        // UX ENHANCEMENT: Compensate scroll position for better visual experience
        requestAnimationFrame(() => {
            const newChatHeight = chatMessages.clientHeight;
            const chatHeightDelta = previousChatHeight - newChatHeight;
            
            // If chat area got smaller due to textarea growth, adjust scroll to maintain content visibility
            if (chatHeightDelta > 0 && deltaY > 0) {
                // Dragging UP (making textarea bigger) - compensate scroll upward
                chatMessages.scrollTop = currentScrollTop + (chatHeightDelta * 0.8);
            }
            
            // Maintain "at bottom" behavior if user was at bottom
            const wasAtBottom = currentScrollTop >= (chatMessages.scrollHeight - previousChatHeight - 10);
            if (wasAtBottom) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        });
    }

    handleMouseUp(e, handleMouseMove, handleMouseUp) {
        console.log('🖱️ Mouseup - ending resize');
        this.isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Restore visual state
        const inputContainer = document.querySelector('.chat-input-container');
        const resizeHandle = document.getElementById('textareaResizeHandle');
        const textarea = document.getElementById('messageInput');
        
        document.body.style.cursor = '';
        resizeHandle.style.backgroundColor = 'transparent';
        resizeHandle.style.transform = 'scale(1)';
        if (inputContainer) {
            inputContainer.classList.remove('resizing');
        }
        
        // Log final state
        const finalHeight = parseInt(textarea.style.height || textarea.offsetHeight, 10);
        console.log('✅ Resize completed. Final height:', finalHeight + 'px');
    }

    handleAutoResize(textarea) {
        // Reset height to measure scrollHeight accurately
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.max(50, Math.min(500, scrollHeight));
        textarea.style.height = newHeight + 'px';
    }
}

// Export for modular architecture compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextareaResizeHandler;
}