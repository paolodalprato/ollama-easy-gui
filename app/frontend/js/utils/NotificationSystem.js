// NotificationSystem.js - Extracted from app.js for size compliance
// Handles user notifications with auto-removal and type styling

class NotificationSystem {
    constructor() {
        this.progressNotifications = new Map(); // Track progress notifications
        console.log('📢 NotificationSystem initialized with progress support');
    }

    addNotification(message, type = 'info', duration = 5000) {
        const notificationArea = document.getElementById('notifications');
        if (!notificationArea) {
            console.warn('Notification area not found');
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="close-btn" onclick="this.parentElement.remove()">&times;</button>
        `;

        notificationArea.appendChild(notification);
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }

        console.log(`📢 Notification: ${type.toUpperCase()} - ${message}`);
    }

    // Create a progress notification that can be updated
    addProgressNotification(id, message, type = 'info') {
        const notificationArea = document.getElementById('notifications');
        if (!notificationArea) {
            console.warn('Notification area not found');
            return null;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type} progress-notification`;
        notification.setAttribute('data-progress-id', id);
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <div class="progress-spinner" style="
                    display: inline-block;
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    animation: spin 1s ease-in-out infinite;
                    margin-left: 8px;
                ">
                </div>
            </div>
            <button class="close-btn" onclick="this.parentElement.remove()">&times;</button>
        `;

        notificationArea.appendChild(notification);
        this.progressNotifications.set(id, notification);
        
        console.log(`📢 Progress notification created: ${id} - ${message}`);
        return notification;
    }

    // Update progress notification message
    updateProgressNotification(id, message) {
        const notification = this.progressNotifications.get(id);
        if (notification) {
            const messageSpan = notification.querySelector('.notification-message');
            if (messageSpan) {
                messageSpan.textContent = message;
                console.log(`📢 Progress updated: ${id} - ${message}`);
            }
        }
    }

    // Complete and remove progress notification
    completeProgressNotification(id, finalMessage, finalType = 'success', duration = 3000) {
        const notification = this.progressNotifications.get(id);
        if (notification) {
            // Remove spinner and update message
            const spinner = notification.querySelector('.progress-spinner');
            if (spinner) {
                spinner.remove();
            }
            
            const messageSpan = notification.querySelector('.notification-message');
            if (messageSpan) {
                messageSpan.textContent = finalMessage;
            }
            
            // Update notification class
            notification.className = `notification ${finalType}`;
            
            // Auto-remove after duration
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                    this.progressNotifications.delete(id);
                }
            }, duration);
            
            console.log(`📢 Progress completed: ${id} - ${finalMessage}`);
        }
    }

    // Remove progress notification (for cancellation/error)
    removeProgressNotification(id) {
        const notification = this.progressNotifications.get(id);
        if (notification && notification.parentElement) {
            notification.remove();
            this.progressNotifications.delete(id);
            console.log(`📢 Progress notification removed: ${id}`);
        }
    }
}

// Add CSS for spinner animation if not already present
if (!document.querySelector('#notification-spinner-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-spinner-styles';
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .progress-notification .notification-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }
    `;
    document.head.appendChild(style);
}

// Export for modular architecture compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}