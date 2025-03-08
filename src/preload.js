const { contextBridge, ipcRenderer } = require('electron');
console.log("✅ Preload script is running!");

contextBridge.exposeInMainWorld('api', {
  getLogoPath: () => path.join(__dirname, "src/img/logo.png"),
    addUser: (user) => ipcRenderer.invoke('signup:addUser', user),
    getAllUsersDetails: () => ipcRenderer.invoke('get-all-users-details'),
    deleteUser: (userId) => ipcRenderer.invoke('delete-user', userId),
    validateUser: (credentials) => ipcRenderer.invoke('login:validateUser', credentials),
    getAllUsers: () => ipcRenderer.invoke('getAllUsers'),
    updatePassword: (data) => ipcRenderer.invoke('update-password', data),
    addSale: (saleData) => ipcRenderer.invoke('sale:add', saleData),
    
      getSales: () => ipcRenderer.invoke('sales:getAll'),
      getSaleById: (id) => ipcRenderer.invoke('sale:getById', id),
      getSupplierTransactions: (params) => ipcRenderer.invoke('supplier:getTransactions', params),
      getSupplierTransactionDetails: (transactionId) => ipcRenderer.invoke('supplier:getTransactionDetails', transactionId),
      getAllSales: () => ipcRenderer.invoke('sales:getAll'),
      addSalesReturn: (data) => ipcRenderer.invoke('add-sales-return', data),
      getAllSalesReturns: () => ipcRenderer.invoke('salesReturn:getAll'),
      salesReturn: {
        getByDateRange: (params) => ipcRenderer.invoke('salesReturn:getByDateRange', params)
    },
    customer: {
        getTransactions: (params) => ipcRenderer.invoke('customer:getTransactions', params),
        getTransactionDetails: (params) => ipcRenderer.invoke('customer:getTransactionDetails', params)
    },
    addSupplier: (supplier) => ipcRenderer.invoke('supplier:addSupplier', supplier),
    getSuppliers: () => ipcRenderer.invoke('supplier:getSuppliers'),
    deleteSupplier: (id) => ipcRenderer.invoke('supplier:deleteSupplier', id),
    updateSupplier: (supplier) => ipcRenderer.invoke('supplier:update-supplier', supplier), // Pass entire supplier object
    getMonthlySalesData: (params) => ipcRenderer.invoke('sales:getMonthlyData', params),
    // Add this to your existing contextBridge exposures
  getMonthlyTransactionDetails: (params) => ipcRenderer.invoke('sales:getMonthlyTransactionDetails', params),
  getDailySalesData: (params) => ipcRenderer.invoke('sales:getDailyData', params),
// Add this to preload.js where your other API exposures are defined
getProductDetails: (invoiceNumber, transactionType) => 
  ipcRenderer.invoke('products:getDetails', invoiceNumber, transactionType),
    addCompany: (company) => ipcRenderer.invoke('company:addCompany', company),
    getCompanies: () => ipcRenderer.invoke('company:getCompanies'),
    deleteCompany: (id) => ipcRenderer.invoke('company:deleteCompany', id),
    updateCompany: (company) => ipcRenderer.invoke('company:updateCompany', company),
    // getCustomerTransactions: (params) => ipcRenderer.invoke('customer:getTransactions', params),
    // getTransactionDetails: (transactionId) => ipcRenderer.invoke('transaction:getDetails', transactionId),
    getLastBarcode: async () => {
      try {
          return await ipcRenderer.invoke('get-last-barcode');
      } catch (error) {
          console.error('Error getting last barcode:', error);
          throw error;
      }
  },
  saveLastBarcode: async (barcode) => {
      try {
          return await ipcRenderer.invoke('save-last-barcode', barcode);
      } catch (error) {
          console.error('Error saving last barcode:', error);
          throw error;
      }
  },
    
    addCategory: (categoryName) => ipcRenderer.invoke('category:addCategory', categoryName),
    getCategories: () => ipcRenderer.invoke('category:getCategories'),
    updateCategory: (categoryId, newCategoryName) => ipcRenderer.invoke('update-category', categoryId, newCategoryName),

    deleteCategory: (categoryId) => ipcRenderer.invoke('delete-category', categoryId),

    addSubcategory: (data) => ipcRenderer.invoke('addSubcategory', data),
    fetchSubcategories: () => ipcRenderer.invoke('fetch-subcategories'),  // Make sure the IPC channel matches here
    deleteSubcategory: (subcategoryId) => ipcRenderer.invoke('delete-subcategory', subcategoryId),
    updateSubcategory: (subcategoryId, newName) => ipcRenderer.invoke('update-subcategory', subcategoryId, newName),
 
  
    fetchUserProfile: (username, password) => ipcRenderer.invoke('fetch-user-profile', { username, password }),
    getUserProfile: (username, password) => ipcRenderer.invoke('getUserProfile', username, password),
    insertProduct: (productData) => ipcRenderer.invoke('product:insertProduct', productData),
    getAllProducts: () => ipcRenderer.invoke('product:getAllProducts'),
    deleteProduct: (id) => ipcRenderer.invoke('product:deleteProduct', id),
    updateProduct: (id, productData) => ipcRenderer.invoke('product:updateProduct', { id, productData }),
    getCustomers: () => ipcRenderer.invoke('get-customers'),
    addCustomer: (customer) => ipcRenderer.invoke('add-customer', customer),
    updateCustomer: (customer) => ipcRenderer.invoke('update-customer', customer),
    deleteCustomer: (customerId) => ipcRenderer.invoke('delete-customer', customerId),
    addPurchase: (purchaseData) => ipcRenderer.invoke('purchase:add', purchaseData),
  getAllPurchases: () => ipcRenderer.invoke('purchase:getAll'),
  deletePurchase: (invoiceNumber) => ipcRenderer.invoke('purchase:delete', invoiceNumber),
  addPurchasereturn: (data) => ipcRenderer.invoke('add-purchase-return', data),
  getAllPurchaseReturns: () => ipcRenderer.invoke('purchaseReturn:getAll'),
  getAllStock: () => ipcRenderer.invoke('stock:getAll'),
  deletePurchaseReturn: (purchaseReturnId) => ipcRenderer.invoke('purchaseReturn:delete', purchaseReturnId),
  getPurchaseReturnsByDateRange: (params) => ipcRenderer.invoke('purchaseReturn:getByDateRange', params),
  getExpenses: () => ipcRenderer.invoke('get-expenses'),
    addExpense: (expense) => ipcRenderer.invoke('add-expense', expense),
    updateExpense: (expense) => ipcRenderer.invoke('update-expense', expense),
    deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),
    updatePurchasePayment: (paymentData) => ipcRenderer.invoke('update-purchase-payment', paymentData),
    getPaymentHistory: (invoiceNumber) => ipcRenderer.invoke('purchase:getPaymentHistory', invoiceNumber),

  backup: {
    getConfig: () => ipcRenderer.invoke('backup:getConfig'),
    setConfig: (config) => ipcRenderer.invoke('backup:setConfig', config),
    runNow: () => ipcRenderer.invoke('backup:runNow'),
    selectDirectory: () => ipcRenderer.invoke('backup:selectDirectory'),
    getHistory: (limit) => ipcRenderer.invoke('backup:getHistory', limit),
    restore: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
    clearHistory: () => ipcRenderer.invoke('backup:clearHistory')
  },
  on: {
    backupCompleted: (callback) => {
      // Remove any existing listeners to prevent duplicates
      ipcRenderer.removeAllListeners('backup:completed');
      // Add the new listener
      ipcRenderer.on('backup:completed', (event, data) => callback(data));
    },
    backupFailed: (callback) => {
      // Remove any existing listeners to prevent duplicates
      ipcRenderer.removeAllListeners('backup:failed');
      //Add the new listener
      ipcRenderer.on('backup:failed', (event, data) => callback(data));
    }
  },
  getDatabaseLocation: () => ipcRenderer.invoke('config:getDatabaseLocation'),
  openDirectory: (dirPath) => ipcRenderer.invoke('system:openDirectory', dirPath),
  updatePurchaseReturnPayment: (paymentData) => ipcRenderer.invoke('update-purchase-return-payment', paymentData),
    getreturnPaymentHistory: (returnBillNo) => ipcRenderer.invoke('purchase:getreturnPaymentHistory', returnBillNo),
    deleteSale: (invoiceNumber) => ipcRenderer.invoke('sale:delete', invoiceNumber),
    checkPurchaseExists: (invoiceNumber) => {
      return ipcRenderer.invoke('check-purchase-exists', invoiceNumber);
  },
});