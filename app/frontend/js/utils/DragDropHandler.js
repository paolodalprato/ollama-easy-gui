// DragDropHandler.js - Extracted from app.js for size compliance
// Handles drag & drop functionality for file attachments

class DragDropHandler {
    constructor(chatInterface) {
        this.chatInterface = chatInterface;
        console.log('🎯 DragDropHandler initialized');
    }

    setup() {
        const inputContainer = document.querySelector('.chat-input-container');
        const dropZone = document.getElementById('dropZone');
        
        console.log('🎯 Setting up drag & drop...', { inputContainer: !!inputContainer, dropZone: !!dropZone });
        
        if (inputContainer && dropZone) {
            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                inputContainer.addEventListener(eventName, this.chatInterface.preventDefaults, false);
            });
            
            // Highlight drop zone when dragging over
            ['dragenter', 'dragover'].forEach(eventName => {
                inputContainer.addEventListener(eventName, () => {
                    dropZone.style.display = 'block';
                    dropZone.classList.add('dragover');
                }, false);
            });
            
            // Hide drop zone when not dragging
            ['dragleave', 'drop'].forEach(eventName => {
                inputContainer.addEventListener(eventName, () => {
                    dropZone.style.display = 'none';
                    dropZone.classList.remove('dragover');
                }, false);
            });
            
            // Handle drop event
            inputContainer.addEventListener('drop', (e) => this.chatInterface.handleDrop(e), false);
            
            console.log('✅ Drag & drop listeners set up');
        } else {
            console.warn('⚠️ Drag & drop elements not found');
        }
    }
}

// Export for modular architecture compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragDropHandler;
}