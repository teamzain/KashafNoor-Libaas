// DOM Elements
const backupSettingsForm = document.getElementById('backupSettingsForm');
const backupLocationInput = document.getElementById('backupLocation');
const browseLocationBtn = document.getElementById('browseLocation');
const autoBackupCheck = document.getElementById('autoBackup');
const backupFrequencySelect = document.getElementById('backupFrequency');
const createBackupBtn = document.getElementById('createBackupBtn');
const backupListElement = document.getElementById('backupList');
const statusAlert = document.getElementById('statusAlert');
const noBackupsMessage = document.getElementById('noBackupsMessage');

// Modal elements - safely get modals or create fallbacks
let restoreModal, deleteModal;
let confirmRestoreBtn, confirmDeleteBtn;

// Check if modals exist and initialize them
function initializeModals() {
    const restoreModalElement = document.getElementById('restoreModal');
    const deleteModalElement = document.getElementById('deleteModal');
    
    if (restoreModalElement) {
        restoreModal = new bootstrap.Modal(restoreModalElement);
        confirmRestoreBtn = document.getElementById('confirmRestoreBtn');
    } else {
        console.warn('Restore modal not found in the DOM');
        // Create a simple confirm function as fallback
        restoreModal = {
            show: () => {
                if (confirm('Are you sure you want to restore this backup? This will replace your current database.')) {
                    handleRestoreBackup(currentBackupPath);
                }
            },
            hide: () => {}
        };
    }
    
    if (deleteModalElement) {
        deleteModal = new bootstrap.Modal(deleteModalElement);
        confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    } else {
        console.warn('Delete modal not found in the DOM');
        // Create a simple confirm function as fallback
        deleteModal = {
            show: () => {
                if (confirm('Are you sure you want to delete this backup? This cannot be undone.')) {
                    handleDeleteBackup(currentBackupPath);
                }
            },
            hide: () => {}
        };
    }
    
    // Add event listeners if the elements exist
    if (confirmRestoreBtn) {
        confirmRestoreBtn.addEventListener('click', () => {
            restoreModal.hide();
            handleRestoreBackup(currentBackupPath);
        });
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            deleteModal.hide();
            handleDeleteBackup(currentBackupPath);
        });
    }
}

// Current backup being acted upon
let currentBackupPath = null;

// Handle restore backup
async function handleRestoreBackup(backupPath) {
    try {
        showAlert('Restoring database...', 'info');
        
        const result = await window.api.database.restoreBackup(backupPath);
        
        if (result.success) {
            showAlert('Database restored successfully. The application will now restart.', 'success');
            
            // Give user time to read the message before restarting
            setTimeout(() => {
                window.api.app.restart();
            }, 3000);
        } else {
            showAlert(result.message || 'Failed to restore backup', 'danger');
        }
    } catch (error) {
        showAlert('Failed to restore backup: ' + error.message, 'danger');
    }
}

// Handle delete backup
async function handleDeleteBackup(backupPath) {
    try {
        showAlert('Deleting backup...', 'info');
        
        const result = await window.api.database.deleteBackup(backupPath);
        
        if (result.success) {
            showAlert('Backup deleted successfully', 'success');
            loadBackupList();
        } else {
            showAlert(result.message || 'Failed to delete backup', 'danger');
        }
    } catch (error) {
        showAlert('Failed to delete backup: ' + error.message, 'danger');
    }
}

// Initialize the page
async function initPage() {
    try {
        console.log('Initializing page...');
        
        // Initialize modals
        initializeModals();
        
        // Check if API is available
        if (!window.api || !window.api.database) {
            showAlert('API not available. Please check your preload script configuration.', 'danger');
            console.error('API is not available in window object. Preload script might not be working properly.');
            return;
        }
        
        // Load backup settings
        const settings = await window.api.database.getBackupSettings();
        console.log('Loaded settings:', settings);
        
        // Update form with settings
        backupLocationInput.value = settings.backupLocation || '';
        autoBackupCheck.checked = settings.autoBackup || false;
        backupFrequencySelect.value = settings.backupFrequency || 'weekly';
        
        // Load and display backup list
        await loadBackupList();

        // Schedule auto-backup check
        setInterval(checkAutoBackup, 60000); // Check every minute
    } catch (error) {
        console.error('Error initializing page:', error);
        showAlert('Failed to load settings: ' + (error.message || 'Unknown error'), 'danger');
    }
}

// Check if auto backup should run
async function checkAutoBackup() {
    try {
        const settings = await window.api.database.getBackupSettings();
        
        if (settings.autoBackup) {
            const lastBackupDate = settings.lastBackupDate;
            const frequency = settings.backupFrequency;
            
            const isDue = window.api.database.isBackupDue(lastBackupDate, frequency);
            
            if (isDue) {
                console.log('Auto backup is due, creating backup...');
                const result = await window.api.database.createBackup();
                
                if (result.success) {
                    console.log('Auto backup created successfully');
                    showAlert('Auto backup created successfully', 'success');
                    loadBackupList();
                } else {
                    console.error('Auto backup failed:', result.message);
                    showAlert('Auto backup failed: ' + result.message, 'danger');
                }
            }
        }
    } catch (error) {
        console.error('Error checking auto backup:', error);
    }
}

// Load and display backup list
async function loadBackupList() {
    try {
        console.log('Loading backup list...');
        const backups = await window.api.database.listBackups();
        console.log('Loaded backups:', backups);
        
        // Clear current list
        backupListElement.innerHTML = '';
        
        if (backups.length === 0) {
            noBackupsMessage.classList.remove('d-none');
            return;
        }
        
        noBackupsMessage.classList.add('d-none');
        
        // Sort backups by date (newest first)
        backups.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Add each backup to the list
        backups.forEach(backup => {
            const backupDate = new Date(backup.date).toLocaleString();
            const backupSize = formatBytes(backup.size);
            
            const backupItem = document.createElement('div');
            backupItem.className = 'card backup-card';
            backupItem.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Backup ${backupDate}</h5>
                    <p class="card-text">Size: ${backupSize}</p>
                    <p class="card-text text-muted small">${backup.path}</p>
                    <div class="backup-actions">
                        <button class="btn btn-primary btn-sm restore-btn" data-path="${backup.path}">Restore</button>
                        <button class="btn btn-danger btn-sm delete-btn" data-path="${backup.path}">Delete</button>
                    </div>
                </div>
            `;
            
            backupListElement.appendChild(backupItem);
        });
        
        // Add event listeners to the buttons
        document.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentBackupPath = btn.getAttribute('data-path');
                restoreModal.show();
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentBackupPath = btn.getAttribute('data-path');
                deleteModal.show();
            });
        });
    } catch (error) {
        console.error('Error loading backup list:', error);
        showAlert('Failed to load backups: ' + (error.message || 'Unknown error'), 'danger');
    }
}

// Format bytes to human-readable size
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Show status alert
function showAlert(message, type = 'info') {
    if (!statusAlert) {
        console.error('Status alert element not found');
        console.log(message);
        return;
    }
    
    statusAlert.textContent = message;
    statusAlert.className = `alert alert-${type} mt-3`;
    statusAlert.classList.remove('d-none');
    
    // Hide alert after 5 seconds
    setTimeout(() => {
        statusAlert.classList.add('d-none');
    }, 5000);
}

// Event Listeners
if (browseLocationBtn) {
    browseLocationBtn.addEventListener('click', async () => {
        try {
            // Show directory selection dialog via main process
            const dirPath = await window.api.dialog.selectDirectory();
            
            if (dirPath) {
                backupLocationInput.value = dirPath;
                showAlert('Backup location set successfully!', 'success');
            }
        } catch (error) {
            showAlert('Failed to select backup location: ' + error.message, 'danger');
        }
    });
}

if (backupSettingsForm) {
    backupSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const settings = {
                backupLocation: backupLocationInput.value,
                autoBackup: autoBackupCheck.checked,
                backupFrequency: backupFrequencySelect.value
            };
            
            const success = await window.api.database.saveBackupSettings(settings);
            
            if (success) {
                showAlert('Settings saved successfully', 'success');
            } else {
                showAlert('Failed to save settings', 'danger');
            }
        } catch (error) {
            showAlert('Error saving settings: ' + error.message, 'danger');
        }
    });
}

if (createBackupBtn) {
    createBackupBtn.addEventListener('click', async () => {
        try {
            showAlert('Creating backup...', 'info');
            
            const options = {
                location: backupLocationInput.value
            };
            
            const result = await window.api.database.createBackup(options);
            
            if (result.success) {
                showAlert('Backup created successfully', 'success');
                loadBackupList();
            } else {
                showAlert(result.message || 'Failed to create backup', 'danger');
            }
        } catch (error) {
            showAlert('Failed to create backup: ' + error.message, 'danger');
        }
    });
}

// Add console error handler for debugging
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initPage,
        loadBackupList,
        formatBytes,
        showAlert
    };
}