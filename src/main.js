// Update your Electron imports at the top of main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Ensure a writable database path
const dbPath = path.join(app.getPath('userData'), 'users.db');
console.log('Database Path:', dbPath); // Debugging output

// Import database functions
const db = require('./db');



let mainWindow;
function createWindow() {
    console.log('Creating main window...');
    console.log('Current directory:', __dirname);
    
    // Ensure preload.js exists
    const preloadPath = path.join(__dirname, 'preload.js');
    if (!fs.existsSync(preloadPath)) {
        console.error(`Preload script not found at: ${preloadPath}`);
    } else {
        console.log(`Preload script found at: ${preloadPath}`);
    }
    
    mainWindow = new BrowserWindow({
        width: 1500,
        height: 1300,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false // This is deprecated in newer Electron
        },
        icon: path.join(__dirname, 'logo.jpeg') 
    });

    mainWindow.setMenu(null); 
    // mainWindow.setMenuBarVisibility(false);
    // mainWindow.webContents.openDevTools();
    
    // Check if the HTML file exists
    const htmlPath = path.join(__dirname, 'renderer/login.html');
    if (!fs.existsSync(htmlPath)) {
        console.error(`HTML file not found at: ${htmlPath}`);
        // Try to load from a different location
        const alternativePath = path.join(__dirname, 'setup.html');
        if (fs.existsSync(alternativePath)) {
            console.log(`Found HTML at alternative location: ${alternativePath}`);
            mainWindow.loadFile(alternativePath);
        } else {
            // Create a basic HTML as fallback
            const tempHtml = path.join(app.getPath('temp'), 'temp-setup.html');
            fs.writeFileSync(tempHtml, `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Database Setup</title>
                </head>
                <body>
                    <h1>Database Setup</h1>
                    <p>Error: Could not find setup.html file.</p>
                </body>
                </html>
            `);
            mainWindow.loadFile(tempHtml);
        }
    } else {
        console.log(`HTML file found at: ${htmlPath}`);
        mainWindow.loadFile(htmlPath);
    }
}

// Initialize the database before creating the window
app.whenReady().then(async () => {
    try {
        await db.initializeDatabase();
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Failed to initialize database:', err);
    }
    
    createWindow();
    setupDatabaseBackupHandlers();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


// Add this function to your existing main.js file

function setupDatabaseBackupHandlers() {
    // Get database path from the db module
    const dbPath = db.getDatabasePath();
    
    // Handle getting the database path
    ipcMain.handle('config:getDatabaseLocation', () => {
      return dbPath;
    });
  
    ipcMain.handle('backup:getHistory', async (event, limit) => {
        try {
          const config = getBackupConfig();
          // Use the retention policy from config, or default to 10
          const historyLimit = limit || (config.retention || 10);
          return await db.getBackupHistory(historyLimit);
        } catch (error) {
          console.error('Error retrieving backup history:', error);
          return { error: error.message };
        }
      });
      
    // Handle setting backup configuration
// In your setupDatabaseBackupHandlers function, update the backup:setConfig handler


    // Handle manual backup request
  // This section should be added to your setupDatabaseBackupHandlers function

// Add event emitter for backup events
// Fix for the backup:setConfig handler in setupDatabaseBackupHandlers function
ipcMain.handle('backup:setConfig', async (event, config) => {
    try {
      // Save backup config to a JSON file
      const configPath = path.join(app.getPath('userData'), 'backup-config.json');
      
      // Include lastBackup if it exists in the current config
      let currentConfig = {};
      if (fs.existsSync(configPath)) {
        currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      
      const newConfig = {
        ...currentConfig, 
        ...config,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
      
      // If there's an existing backup interval, clear it
      if (global.backupInterval) {
        clearInterval(global.backupInterval);
        global.backupInterval = null;
        console.log('Previous backup interval cleared');
      }
      
      // Set up new backup interval if enabled
      if (config.enabled && config.interval > 0) {
        // Convert minutes to milliseconds (fix: ensure we're using minutes)
        const intervalMs = config.interval * 60 * 1000;
        
        global.backupInterval = setInterval(async () => {
          console.log(`Running scheduled automatic backup at ${new Date().toISOString()}`);
          try {
            const backupResult = await performBackup(config.directory, 'auto');
            
            // Update the config with the latest backup time
            const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            updatedConfig.lastBackup = new Date().toISOString();
            fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
            
            // Notify the renderer process about the successful backup
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('backup:completed', {
                timestamp: new Date().toISOString(),
                path: backupResult.path,
                size: backupResult.size,
                type: 'auto'
              });
            }
          } catch (err) {
            console.error('Scheduled backup failed:', err);
            // Notify the renderer process about the failed backup
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('backup:failed', {
                timestamp: new Date().toISOString(),
                error: err.message,
                type: 'auto'
              });
            }
          }
        }, intervalMs);
        
        console.log(`Automatic backup scheduled every ${config.interval} minutes (${intervalMs}ms)`);
        
        // Run an immediate automatic backup when enabled (optional)
        if (!currentConfig.enabled) {
          setTimeout(async () => {
            try {
              console.log('Running initial automatic backup after enabling');
              const backupResult = await performBackup(config.directory, 'auto');
              
              // Update the config with the latest backup time
              const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              updatedConfig.lastBackup = new Date().toISOString();
              fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
              
              // Notify the renderer process about the successful backup
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('backup:completed', {
                  timestamp: new Date().toISOString(),
                  path: backupResult.path,
                  size: backupResult.size,
                  type: 'auto'
                });
              }
            } catch (err) {
              console.error('Initial automatic backup failed:', err);
            }
          }, 5000); // Run 5 seconds after enabling
        }
      } else {
        console.log('Automatic backups disabled');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error setting backup config:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Updated performBackup function to ensure type is properly passed and recorded
  async function performBackup(backupDir, backupType = 'manual') {
    try {
      // Create a timestamp for the backup file
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const backupFileName = `database-backup-${timestamp}-${backupType}.db`;
      const backupFilePath = path.join(backupDir, backupFileName);
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Get the database path from the db module
      const dbPath = db.getDatabasePath();
      
      // Copy the database file
      fs.copyFileSync(dbPath, backupFilePath);
      
      // Get file size
      const stats = fs.statSync(backupFilePath);
      const fileSizeInBytes = stats.size;
      
      // Log the backup in the database with the type
      await db.logBackup(backupFilePath, fileSizeInBytes, 'success', backupType);
      
      console.log(`Database backed up to: ${backupFilePath} (${fileSizeInBytes} bytes, type: ${backupType})`);
      return { 
        path: backupFilePath, 
        size: fileSizeInBytes,
        timestamp: new Date().toISOString(),
        type: backupType
      };
    } catch (error) {
      console.error('Backup failed:', error);
      // Log the failed backup attempt
      if (error.path) {
        await db.logBackup(error.path, 0, 'failed', backupType);
      }
      throw error;
    }
  }
  
  // Handle manual backup request
  ipcMain.handle('backup:runNow', async (event) => {
    try {
      const configPath = path.join(app.getPath('userData'), 'backup-config.json');
      let backupDir = app.getPath('documents'); // Default
      
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        backupDir = config.directory || backupDir;
      }
      
      // Specify 'manual' as the backup type
      const backupResult = await performBackup(backupDir, 'manual');
      
      // Update the last backup time in the config
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.lastBackup = new Date().toISOString();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }
      
      // Notify the renderer process about the successful backup
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('backup:completed', {
          timestamp: new Date().toISOString(),
          path: backupResult.path,
          size: backupResult.size,
          type: 'manual'
        });
      }
      
      return { success: true, path: backupResult.path };
    } catch (error) {
      console.error('Error running backup:', error);
      // Notify the renderer process about the failed backup
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('backup:failed', {
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
      return { success: false, error: error.message };
    }
  });
  

    
    // Handle backup directory selection
    ipcMain.handle('backup:selectDirectory', async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Backup Directory'
      });
      
      if (!result.canceled) {
        return result.filePaths[0];
      }
      return null;
    });
    
    // Handle getting the current backup config
    ipcMain.handle('backup:getConfig', () => {
      try {
        const configPath = path.join(app.getPath('userData'), 'backup-config.json');
        if (fs.existsSync(configPath)) {
          return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } else {
          // Return default config
          return {
            enabled: false,
            interval: 24, // Default: daily (24 hours)
            directory: app.getPath('documents')
          };
        }
      } catch (error) {
        console.error('Error getting backup config:', error);
        return {
          enabled: false,
          interval: 24,
          directory: app.getPath('documents')
        };
      }
    });
    // Add these to your setupDatabaseBackupHandlers function

// Handle restoring a backup
ipcMain.handle('backup:restore', async (event, backupPath) => {
    try {
      // Get the current database path
      const dbPath = db.getDatabasePath();
      
      // Create a backup of the current database before restoring
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const preRestoreBackupPath = path.join(
        path.dirname(dbPath), 
        `pre-restore-backup-${timestamp}.db`
      );
      
      // Copy current database to backup location
      fs.copyFileSync(dbPath, preRestoreBackupPath);
      
      // Verify that the backup file exists
      if (!fs.existsSync(backupPath)) {
        return { 
          success: false, 
          error: 'Backup file not found' 
        };
      }
      
      // Close the database connection to prevent file locks
      await db.close();
      
      // Copy the backup file to the current database location
      fs.copyFileSync(backupPath, dbPath);
      
      // Reopen the database connection
      await db.open();
      
      // Log the restoration
      await db.logBackup(backupPath, fs.statSync(backupPath).size, 'restored');
      
      return { 
        success: true,
        message: `Database restored from ${backupPath}`,
        preRestoreBackup: preRestoreBackupPath
      };
    } catch (error) {
      console.error('Error restoring backup:', error);
      // Try to reopen the database if it was closed
      try {
        await db.open();
      } catch (reopenError) {
        console.error('Error reopening database after restore failure:', reopenError);
      }
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
  
  // Handle clearing backup history
  ipcMain.handle('backup:clearHistory', async () => {
    try {
      // Create a function in your db module to clear history
      // This only clears the log entries, not the actual backup files
      await db.clearBackupHistory();
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing backup history:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
  
  // Handle opening directory in file explorer
  ipcMain.handle('system:openDirectory', async (event, dirPath) => {
    try {
      // shell is imported from electron at the top of your file
      // Import it with: const { app, ipcMain, dialog, shell } = require('electron');
      await shell.openPath(dirPath);
      return { success: true };
    } catch (error) {
      console.error('Error opening directory:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });
  }
  // Add this to your main.js
function getBackupConfig() {
    try {
      const configPath = path.join(app.getPath('userData'), 'backup-config.json');
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } else {
        // Return default config
        return {
          enabled: false,
          interval: 24, // Default: daily (24 hours)
          directory: app.getPath('documents'),
          retention: 10
        };
      }
    } catch (error) {
      console.error('Error reading backup config:', error);
      return {
        enabled: false,
        interval: 24,
        directory: app.getPath('documents'),
        retention: 10
      };
    }
  }
  
  // Function to perform the actual backup
  // Update the performBackup function to accept a type parameter

  
  // Make sure to call setupDatabaseBackupHandlers() after app.whenReady() in your existing code
  // app.whenReady().then(async () => {
  //   await db.initializeDatabase();
  //   createWindow();
  //   setupDatabaseBackupHandlers(); // Add this line
  // });

// Function to set up all the database backup IPC handlers
const { updatePurchaseReturnPayment } = require('./db.js');
// In your main process IPC handler:
ipcMain.handle('update-purchase-return-payment', async (event, paymentData) => {
    try {
        // Validate payment data
        if (!paymentData.purchaseReturnId) {
            throw new Error('Purchase return ID is required');
        }
        
        if (isNaN(paymentData.paidAmount) || paymentData.paidAmount < 0) {
            throw new Error('Invalid paid amount');
        }
        
        if (isNaN(paymentData.dueAmount) || paymentData.dueAmount < 0) {
            throw new Error('Invalid due amount');
        }
        
        if (isNaN(paymentData.newPayment) || paymentData.newPayment <= 0) {
            throw new Error('Invalid payment amount');
        }
        
        // Call database function with correct parameters
        const result = await updatePurchaseReturnPayment(
            paymentData.purchaseReturnId,
            paymentData.returnBillNo,
            paymentData.paidAmount,
            paymentData.dueAmount,
            paymentData.newPayment,
            paymentData.notes || 'Payment update'
        );
        
        return { success: true, data: result };
    } catch (error) {
        console.error('Error updating purchase return payment:', error);
        return { success: false, message: error.message };
    }
});


const { getPurchaseReturnPaymentHistory } = require('./db.js');

// Handle getting payment history
ipcMain.handle('purchase:getreturnPaymentHistory', async (_, purchasereturn_id) => {
    try {
        const history = await getPurchaseReturnPaymentHistory(purchasereturn_id);
        return { success: true, data: history };
    } catch (error) {
        console.error('Error fetching payment history:', error);
        return { success: false, message: 'Failed to fetch payment history' };
    }
});

const { addPurchase, getAllPurchases,deletePurchase } = require('./db');
const { addSupplier, getSuppliers, deleteSupplier, updateSupplier } = require('./db');
const { findUser, getAllUsers, updatePassword } = require('./db');
const { addCompany, getCompanies, deleteCompany, updateCompany } = require('./db');
const { addCustomer, getCustomers, deleteCustomer, updateCustomer } = require('./db');
const { addCategory, getCategories, deleteCategory, updateCategory } = require('./db');
const { addSubcategory, getAllSubcategories, deleteSubcategory, updateSubcategoryInDB } = require('./db');
const { updateProduct, deleteProduct, getAllStock, getTransactionDetailssupplier, getSupplierTransactions, getTransactionDetails, getCustomerTransactions } = require('./db');
const { getAllProducts } = require('./db');
const { insertProduct,checkPurchaseExists } = require('./db');
// IPC handler for database communication
const { addUser,validateUser,deleteUser,getAllUsersDetails} = require('./db');
ipcMain.handle('signup:addUser', async (event, user) => {
    try {
        const userId = await addUser(user);
        return { success: true, userId };
    } catch (error) {
        return { success: false, error: error.message };
    }
});



// Get all users with details
ipcMain.handle('get-all-users-details', async () => {
    try {
        return await getAllUsersDetails();
    } catch (error) {
        console.error('Error getting user details:', error);
        throw error;
    }
});

// Delete user
ipcMain.handle('delete-user', async (event, userId) => {
    try {
        await deleteUser(userId);
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('login:validateUser', async (event, { username, password }) => {
    try {
        const user = await findUser(username, password);

        if (username === 'admin') {
            return { success: true, role: 'admin', user };
        } else {
            return { success: true, role: 'user', user };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Fetch all users for displaying in the "Change Username" page
ipcMain.handle('getAllUsers', async (event) => {
    try {
        const users = await getAllUsers(); // Fetch all users
        return { success: true, users }; // Send users data to the frontend
    } catch (error) {
        return { success: false, error: error.message };
    }
});


// Handle password change request
ipcMain.handle('update-password', async (event, { userId, newPassword }) => {  // Make sure this matches the renderer code
    try {
        const result = await updatePassword(userId, newPassword);
        return { success: true, message: result.message };
    } catch (error) {
        return { success: false, error: error.message };
    }
});



ipcMain.handle('user:validate', async (event, credentials) => {
    try {
        const result = await validateUser(credentials);
        return result;
    } catch (error) {
        return { success: false, error: error.message };
    }
});












// // Fetch all users for displaying in the "Change Username" page
// ipcMain.handle('getAllUsers', async (event) => {
//     try {
//         const users = await getAllUsers(); // Fetch all users
//         return { success: true, users }; // Send users data to the frontend
//     } catch (error) {
//         return { success: false, error: error.message };
//     }
// });


ipcMain.handle('supplier:addSupplier', async (event, supplier) => {
    try {
        const supplierId = await addSupplier(supplier); // Call the function to add supplier
        return { success: true, supplierId }; // Return success with supplierId
    } catch (error) {
        return { success: false, error: error.message }; // Return error if any
    }
});

ipcMain.handle('supplier:getSuppliers', async () => {
    try {
        const suppliers = await getSuppliers();
 // Call the DB method to get all suppliers
        return suppliers;
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        return [];  // Return an empty array in case of error
    }
});

// Handle deleting a supplier

ipcMain.handle('supplier:deleteSupplier', async (event, supplierId) => {
    console.log(`Attempting to delete supplier with ID: ${supplierId}`);  // Log the received supplierId
    try {
        const result = await deleteSupplier(supplierId);
        console.log('Delete result:', result);  // Log the result of the delete operation
        return result;  // Send result back to renderer
    } catch (error) {
        console.error('Error deleting supplier:', error.message);  // Log the error
        return { success: false, error: error.message };  // Send error message to renderer
    }
});


// Ensure this handler is registered in main.js
ipcMain.handle('supplier:update-supplier', async (event, supplier) => {
    try {
        const result = await updateSupplier(supplier);  // Pass the entire supplier object, including supplier_id
        return result;  // Send back the result to the renderer
    } catch (error) {
        console.error('Error updating supplier:', error);
        return { success: false, error: error.message };
    }
});




ipcMain.handle('company:getCompanies', async () => {
    try {
        const companies = await getCompanies();
        return companies;
    } catch (error) {
        console.error('Error fetching companies:', error);
        return [];
    }
});

// Handle adding a company
ipcMain.handle('company:addCompany', async (event, company) => {
    try {
        const companyId = await addCompany(company);
        return { success: true, companyId };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handle deleting a company
ipcMain.handle('company:deleteCompany', async (event, companyId) => {
    try {
        const result = await deleteCompany(companyId);
        return result;
    } catch (error) {
        console.error('Error deleting company:', error.message);
        return { success: false, error: error.message };
    }
});

// In main.js
ipcMain.handle('company:updateCompany', async (event, company) => {
    console.log('Received company data for update:', company);

    try {
        // Validate company data
        if (!company || !company.company_id || !company.companyName) {
            console.error('Invalid company data:', company);
            throw new Error('Invalid company data.');
        }

        const result = await updateCompany({
            company_id: company.company_id,
            companyName: company.companyName
        });
        return result;
    } catch (error) {
        console.error('Error updating company:', error.message);
        throw error;
    }
});



// Handle adding a category
ipcMain.handle('category:addCategory', async (event, categoryName) => {
    try {
        const categoryId = await addCategory(categoryName);
        return { success: true, categoryId };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handle fetching categories
ipcMain.handle('category:getCategories', async () => {
    try {
        const categories = await getCategories();
        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
});


// Handle updating a category
ipcMain.handle('update-category', async (event, categoryId, newCategoryName) => {
    try {
        const result = await updateCategory(categoryId, newCategoryName);
        return { success: result };
    } catch (error) {
        console.error('Error updating category:', error.message);
        return { success: false, error: error.message };
    }
});


// Handle deleting a category
ipcMain.handle('delete-category', async (event, categoryId) => {
    try {
        const result = await deleteCategory(categoryId);
        return { success: result };
    } catch (error) {
        console.error('Error deleting category:', error.message);
        return { success: false, error: error.message };
    }
});



// Register the handler for the 'addSubcategory' event
ipcMain.handle('addSubcategory', async (event, data) => {
    const { categoryId, subcategoryName } = data;

    console.log("Received categoryId:", categoryId, "Received subcategoryName:", subcategoryName);  // Log received data

    try {
        const result = await addSubcategory(categoryId, subcategoryName);
        return { success: true, subcategoryId: result.subcategoryId };
    } catch (error) {
        return { success: false, error: error.message };
    }
});




ipcMain.handle('fetch-subcategories', async () => {
    try {
        const subcategories = await getAllSubcategories();
        return subcategories;
    } catch (error) {
        return { error: error.message };
    }
});


ipcMain.handle('delete-subcategory', async (event, subcategoryId) => {
    try {
        const result = await deleteSubcategory(subcategoryId);
        if (result.changes > 0) {  // Check if any rows were affected
            return { success: true };
        } else {
            return { success: false, error: 'Subcategory not found' };
        }
    } catch (error) {
        console.error('Error deleting subcategory:', error);
        return { success: false, error: 'Failed to delete subcategory' };
    }
});


ipcMain.handle('update-subcategory', async (event, subcategoryId, newName) => {
    try {
        const result = await updateSubcategoryInDB(subcategoryId, newName);
        if (result.affectedRows > 0) {
            return { success: true };
        } else {
            return { success: false, error: 'Subcategory not found or name is the same' };
        }
    } catch (error) {
        console.error('Error updating subcategory:', error);
        return { success: false, error: 'Failed to update subcategory' };
    }
});


ipcMain.handle('check-purchase-exists', async (event, invoiceNumber) => {
    try {
        return await checkPurchaseExists(invoiceNumber);
    } catch (error) {
        console.error('Error checking if purchase exists:', error);
        return { success: false, message: error.message };
    }
});


ipcMain.handle('product:insertProduct', async (event, productData) => {
    try {
        const productId = await insertProduct(productData);  // Call insertProduct to save data
        return { success: true, productId };  // Return success with product ID
    } catch (error) {
        console.error('Error inserting product:', error);
        return { success: false, error: error.message || 'Unknown error' };  // Return error message
    }
});



ipcMain.handle('product:getAllProducts', async () => {
    try {
        return await getAllProducts();
    } catch (error) {
        console.error('Error fetching products:', error);
        return { success: false, message: 'Failed to fetch products' };
    }
});

  ipcMain.handle('product:deleteProduct', async (event, id) => {
    try {
      return await deleteProduct(id);
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, message: 'Failed to delete product' };
    }
  });
  ipcMain.handle('product:updateProduct', async (event, { id, productData }) => {
    try {
      return await updateProduct(id, productData);
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, message: 'Failed to update product' };
    }
  });



// Handle getting all customers
ipcMain.handle('get-customers', async () => {
    try {
        const customers = await getCustomers();
        return customers;
    } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
    }
});

// Handle adding a new customer
ipcMain.handle('add-customer', async (event, customer) => {
    try {
        const result = await addCustomer(customer);
        return result;
    } catch (error) {
        console.error('Error adding customer:', error);
        return { success: false, error: error.message };
    }
});

// Handle updating an existing customer
ipcMain.handle('update-customer', async (event, customer) => {
    try {
        const result = await updateCustomer(customer);
        return result;
    } catch (error) {
        console.error('Error updating customer:', error);
        return { success: false, error: error.message };
    }
});

// Handle deleting a customer
ipcMain.handle('delete-customer', async (event, customerId) => {
    try {
        const result = await deleteCustomer(customerId);
        return result;
    } catch (error) {
        console.error('Error deleting customer:', error);
        return { success: false, error: error.message };
    }
});



// Purchase handlers
ipcMain.handle('purchase:add', async (event, purchaseData) => {
    try {
        return await addPurchase(purchaseData);
    } catch (error) {
        console.error('Error adding purchase:', error);
        return { success: false, message: 'Failed to add purchase' };
    }
});


ipcMain.handle('purchase:getAll', async () => {
    try {
        return await getAllPurchases();
    } catch (error) {
        console.error('Error fetching purchases:', error);
        return { success: false, message: 'Failed to fetch purchases' };
    }
});

ipcMain.handle('purchase:delete', async (event, invoiceNumber) => {
    try {
        const result = await deletePurchase(invoiceNumber);
        return result;
    } catch (error) {
        console.error('Error deleting purchase:', error);
        throw error;
    }
});

ipcMain.handle('stock:getAll', async () => {
    try {
        return await getAllStock();
    } catch (error) {
        console.error('Error fetching stock:', error);
        return { success: false, message: 'Failed to fetch stock data' };
    }
});


const { addPurchasereturn } = require('./db');
ipcMain.handle('add-purchase-return', async (event, purchasereturnData) => {
    try {
        const result = await addPurchasereturn(purchasereturnData);
        return result;
    } catch (error) {
        console.error('Error adding purchase return:', error);
        return { success: false, message: error.message };
    }
});
const { getAllPurchaseReturns } = require('./db');
ipcMain.handle('purchaseReturn:getAll', async () => {
    try {
        return await getAllPurchaseReturns();
    } catch (error) {
        console.error('Error fetching purchase returns:', error);
        return { success: false, message: 'Failed to fetch purchase returns' };
    }
});

const { deletePurchaseReturn } = require('./db');
ipcMain.handle('purchaseReturn:delete', async (event, purchaseReturnId) => {
    try {
        const result = await deletePurchaseReturn(purchaseReturnId);
        return result;
    } catch (error) {
        console.error('Error deleting purchase return:', error);
        throw error;
    }


});

const { deleteSale} = require('./db.js');
ipcMain.handle('sale:delete', async (event, invoiceNumber) => {
    try {
        const result = await deleteSale(invoiceNumber);
        return result;
    } catch (error) {
        console.error('Error deleting sale:', error);
        return { 
            success: false, 
            message: error.message || 'Error deleting sale'
        };
    }
});

const { addSale,getSaleById,getSales,saveLastBarcode,getLastBarcode} = require('./db');

// Sale handlers
ipcMain.handle('sale:add', async (event, saleData) => {
    try {
        return await addSale(saleData);
    } catch (error) {
        console.error('Error adding sale:', error);
        return { success: false, message: 'Failed to add sale' };
    }
});
ipcMain.handle('get-last-barcode', async () => {
    try {
        const lastBarcode = await getLastBarcode();
        return lastBarcode;
    } catch (error) {
        console.error('Error in get-last-barcode:', error);
        throw error;
    }
});

ipcMain.handle('save-last-barcode', async (event, barcode) => {
    try {
        await saveLastBarcode(barcode);
        return true;
    } catch (error) {
        console.error('Error in save-last-barcode:', error);
        throw error;
    }
});
// ipcMain.handle('sales:getAll', async () => {
//     try {
//       return await getSales();
//     } catch (error) {
//       console.error('Error getting sales:', error);
//       return [];
//     }
//   });
  
  ipcMain.handle('sale:getById', async (event, id) => {
    try {
      return await getSaleById(id);
    } catch (error) {
      console.error('Error getting sale:', error);
      return null;
    }
  });


  // main.js
ipcMain.handle('supplier:getTransactions', async (event, params) => {
    try {
        return await db.getSupplierTransactions(params);
    } catch (error) {
        console.error('Error fetching supplier transactions:', error);
        throw error; // This will propagate the error back to the renderer
    }
});

ipcMain.handle('supplier:getTransactionDetails', async (event, transactionId) => {
    try {
        return await db.getTransactionDetailssupplier(transactionId);
    } catch (error) {
        console.error('Error fetching supplier transaction details:', error);
        throw error; // This will propagate the error back to the renderer
    }
});
const {
    getSalesReturnsByDateRange,

} = require('./db');

// Sales return handler
ipcMain.handle('salesReturn:getByDateRange', async (event, { fromDate, toDate, customerName }) => {
    try {
        const returns = await getSalesReturnsByDateRange(fromDate, toDate, customerName);
        return returns;
    } catch (error) {
        console.error('Error fetching sales returns by date range:', error);
        throw error;
    }
});
const {
    getPurchaseReturnsByDateRange,
} = require('./db');

// Purchase return handler for IPC
ipcMain.handle('purchaseReturn:getByDateRange', async (event, { fromDate, toDate, supplierName }) => {
    try {
        const returns = await getPurchaseReturnsByDateRange(fromDate, toDate, supplierName);
        return returns;
    } catch (error) {
        console.error('Error fetching purchase returns by date range:', error);
        throw error;
    }
});

// // Customer transactions handler
// ipcMain.handle('customer:getTransactions', async (event, params) => {
//     try {
//         const transactions = await getCustomerTransactions(params);
//         return transactions;
//     } catch (error) {
//         console.error('Error fetching customer transactions:', error);
//         throw error;
//     }
// });

// Transaction details handler
ipcMain.handle('customer:getTransactionDetails', async (event, { transactionId, transactionType }) => {
    try {
        const details = await getTransactionDetails(transactionId, transactionType);
        return details;
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        throw error;
    }
});

const { getAllSales} = require('./db');

  ipcMain.handle('sales:getAll', async () => {
    try {
        return await getAllSales();
    } catch (error) {
        console.error('Error fetching sales:', error);
        return { success: false, message: 'Failed to fetch sales' };
    }
});

const { addSalesReturn } = require('./db');

ipcMain.handle('add-sales-return', async (event, salesReturnData) => {
    try {
        const result = await addSalesReturn(salesReturnData);
        return result;
    } catch (error) {
        console.error('Error adding sales return:', error);
        return { success: false, message: error.message };
    }
});



const { getAllSalesReturns } = require('./db');

ipcMain.handle('salesReturn:getAll', async () => {
    try {
        return await getAllSalesReturns();
    } catch (error) {
        console.error('Error fetching sales returns:', error);
        return { success: false, message: 'Failed to fetch sales returns' };
    }
});

// New handlers for customer transactions
ipcMain.handle('customer:getTransactions', async (event, params) => {
    try {
        return await getCustomerTransactions(params);
    } catch (error) {
        console.error('Error fetching customer transactions:', error);
        return { success: false, message: 'Failed to fetch customer transactions' };
    }
});

ipcMain.handle('transaction:getDetails', async (event, transactionId) => {
    try {
        return await getTransactionDetails(transactionId);
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        return { success: false, message: 'Failed to fetch transaction details' };
    }
});

const { getMonthlySalesData } = require('./db');

ipcMain.handle('sales:getMonthlyData', async (event, params) => {
    try {
        return await getMonthlySalesData(params);
    } catch (error) {
        console.error('Error retrieving monthly sales data:', error);
        return [];
    }
});


const { getMonthlyTransactionDetails,getDailySalesData ,getProductDetails} = require('./db');

// Add this to your existing ipcMain handlers
ipcMain.handle('sales:getMonthlyTransactionDetails', async (event, params) => {
    try {
        return await getMonthlyTransactionDetails(params);
    } catch (error) {
        console.error('Error retrieving monthly transaction details:', error);
        return [];
    }
});
ipcMain.handle('sales:getDailyData', async (event, params) => {
    try {
        return await getDailySalesData(params);
    } catch (error) {
        console.error('Error retrieving daily sales data:', error);
        return [];
    }
});
// Add this to main.js where your other IPC handlers are defined
ipcMain.handle('products:getDetails', async (event, invoiceNumber, transactionType) => {
    try {
        // Add a function to get product details in your db.js file
        return await getProductDetails(invoiceNumber, transactionType);
    } catch (error) {
        console.error('Error retrieving product details:', error);
        return null;
    }
});

const { addExpense, getExpenses, updateExpense, deleteExpense } = require('./db.js');

// Handle getting all expenses
ipcMain.handle('get-expenses', async () => {
    try {
        const expenses = await getExpenses();
        return expenses;
    } catch (error) {
        console.error('Error fetching expenses:', error);
        return [];
    }
});

// Handle adding a new expense
ipcMain.handle('add-expense', async (event, expense) => {
    // Log what's received in the main process
    console.log('Main process received expense:', expense);
    
    try {
        // Pass the expense object directly to the database function
        const result = await addExpense(expense);
        return result;
    } catch (error) {
        console.error('Error adding expense:', error);
        return { success: false, error: error.message };
    }
});
// Handle updating an existing expense
ipcMain.handle('update-expense', async (event, expense) => {
    try {
        const result = await updateExpense(expense);
        return result;
    } catch (error) {
        console.error('Error updating expense:', error);
        return { success: false, error: error.message };
    }
});

// Handle deleting an expense
ipcMain.handle('delete-expense', async (event, expenseId) => {
    try {
        const result = await deleteExpense(expenseId);
        return result;
    } catch (error) {
        console.error('Error deleting expense:', error);
        return { success: false, error: error.message };
    }
});


const {updatePurchasePayment } = require('./db.js');
ipcMain.handle('update-purchase-payment', async (event, paymentData) => {
    try {
      // Validate payment data
      if (!paymentData.invoiceNumber) {
        throw new Error('Invoice number is required');
      }
      
      if (isNaN(paymentData.paidAmount) || paymentData.paidAmount < 0) {
        throw new Error('Invalid paid amount');
      }
      
      if (isNaN(paymentData.dueAmount) || paymentData.dueAmount < 0) {
        throw new Error('Invalid due amount');
      }
      
      if (isNaN(paymentData.newPayment) || paymentData.newPayment <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      // Call database function to update payment
      const result = await updatePurchasePayment(
        paymentData.invoiceNumber,
        paymentData.paidAmount,
        paymentData.dueAmount,
        paymentData.newPayment
      );
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error updating purchase payment:', error);
      return { success: false, message: error.message };
    }
  });
  
  const {getPaymentHistory } = require('./db.js');
  ipcMain.handle('purchase:getPaymentHistory', async (_, invoiceNumber) => {
    try {
        const history = await getPaymentHistory(invoiceNumber);
        return { success: true, data: history };
    } catch (error) {
        console.error('Error fetching payment history:', error);
        return { success: false, message: 'Failed to fetch payment history' };
    }
});

