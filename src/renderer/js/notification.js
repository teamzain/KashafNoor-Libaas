// notification.js

// Create a container for notifications if it doesn't exist
const createNotificationContainer = () => {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    return container;
};

// Add necessary styles to document
const addNotificationStyles = () => {
    const styleId = 'notification-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .notification {
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            width: 300px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 10px;
            animation: slideIn 0.3s ease-out forwards;
            position: relative;
            overflow: hidden;
        }

        .notification.success {
            background-color: #28a745;
        }

        .notification.error {
            background-color: #dc3545;
        }

        .notification.info {
            background-color: #17a2b8;
        }

        .notification.warning {
            background-color: #ffc107;
            color: #333;
        }

        .notification-content {
            flex-grow: 1;
            margin-right: 10px;
        }

        .notification-close {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            font-size: 18px;
            padding: 0 5px;
            opacity: 0.7;
            transition: opacity 0.2s;
        }

        .notification-close:hover {
            opacity: 1;
        }

        .notification-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background-color: rgba(255, 255, 255, 0.3);
        }

        .notification-progress-bar {
            height: 100%;
            background-color: rgba(255, 255, 255, 0.7);
            width: 100%;
            transform-origin: left;
            animation: progress 5s linear forwards;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        @keyframes progress {
            from {
                transform: scaleX(1);
            }
            to {
                transform: scaleX(0);
            }
        }
    `;
    document.head.appendChild(style);
};

// Show notification function
const showNotification = (message, type = 'info', duration = 5000) => {
    // Initialize container and styles
    const container = createNotificationContainer();
    addNotificationStyles();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Create notification content
    notification.innerHTML = `
        <div class="notification-content">
            ${message}
        </div>
        <button class="notification-close">&times;</button>
        <div class="notification-progress">
            <div class="notification-progress-bar"></div>
        </div>
    `;

    // Add to container
    container.appendChild(notification);

    // Handle close button click
    const closeBtn = notification.querySelector('.notification-close');
    const closeNotification = () => {
        notification.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    };

    closeBtn.addEventListener('click', closeNotification);

    // Auto-remove after duration
    setTimeout(closeNotification, duration);

    // Return the notification element
    return notification;
};

// Export function
window.showNotification = showNotification;