// Global variables
let purchases = [];
let currentPurchase = null;
let returnProducts = [];
let purchaseReturns = [];

// Initialize the display
document.addEventListener('DOMContentLoaded', initializeDisplay);

async function initializeDisplay() {
    try {
        await Promise.all([
            fetchPurchases(),
            fetchPurchaseReturns()
        ]);
        
        initializeEventListeners();
        // document.getElementById('returnDate').valueAsDate = new Date();
        generateReturnBillNo();
    } catch (error) {
        console.error('Error initializing display:', error);
        showNotification('Error loading data', 'error');
    }
}
async function fetchPurchaseReturns() {
    showLoading(true);
    try {
        const response = await window.api.getAllPurchaseReturns();
        console.log('Purchase Returns API Response:', response); // Debug log
        
        if (!Array.isArray(response)) {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format');
        }
        
       console.log('Raw purchase returns response:', response);
purchaseReturns = response.map(returnData => ({
    ...returnData,
    returnbillNo: returnData.returnbill_no || returnData.returnbillNo, // Handle both formats
    grandTotal: Number(returnData.grandTotal || returnData.grand_total || 0),
    
    dueAmount: Number(returnData.dueAmount || returnData.due_amount || 0),
    productsreturn: Array.isArray(returnData.productsreturn) ? returnData.productsreturn : []
}));
console.log('Processed purchase returns:', purchaseReturns);
        
    } catch (error) {
        console.error('Error fetching purchase returns:', error);
        showNotification('Error fetching purchase returns data', 'error');
    } finally {
        showLoading(false);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Search button
    document.getElementById('searchBtn').addEventListener('click', searchBillNo);
    
    // Bill number search input (for pressing Enter)
    document.getElementById('searchBillNo').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchBillNo();
        }
    });
    
    // Comments character counter
    document.getElementById('comments').addEventListener('input', updateCharCount);
    
    // Cancel button
    document.getElementById('cancelButton').addEventListener('click', resetForm);
    document.getElementById('receivedAmount').addEventListener('input', updateRemainingAmount);
    // Form submission
    document.getElementById('purchaseReturnForm').addEventListener('submit', handleSubmit);
}
function updateRemainingAmount() {
    const grandTotal = parseFloat(document.getElementById('grandTotal').value.replace(/[^0-9.-]+/g, '')) || 0;
    const receivedAmount = parseFloat(document.getElementById('receivedAmount').value) || 0;
    
    // Calculate remaining amount
    const remainingAmount = Math.max(0, grandTotal - receivedAmount);
    
    // Update the remaining amount field
    document.getElementById('remainingAmount').value = formatCurrency(remainingAmount);
}
// Fetch purchases from API
async function fetchPurchases() {
    showLoading(true);
    try {
        const response = await window.api.getAllPurchases();
        console.log('API Response:', response); // Debug log
        
        if (!Array.isArray(response)) {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format');
        }
        
        purchases = response.map(purchase => ({
            ...purchase,
            grandTotal: Number(purchase.grandTotal || 0),
            paidAmount: Number(purchase.paidAmount || 0),
            dueAmount: Number(purchase.dueAmount || 0),
            taxAmount: Number(purchase.taxAmount || 0),
            products: Array.isArray(purchase.products) ? purchase.products : []
        }));
        
    } catch (error) {
        console.error('Error fetching purchases:', error);
        showNotification('Error fetching purchases data', 'error');
    } finally {
        showLoading(false);
    }
}

// Search for bill number
function searchBillNo() {
    const billNo = document.getElementById('searchBillNo').value.trim();
    
    if (!billNo) {
        showNotification('Please enter a bill number', 'error');
        return;
    }
    
    // Find matching purchase
    currentPurchase = purchases.find(p => p.billNo?.toLowerCase() === billNo.toLowerCase());
    
    // Find all returns related to this bill number - either as original bill or return bill
    const existingReturns = purchaseReturns.filter(pr => {
        const returnBillNo = (pr?.returnbillNo || pr?.returnBillNo || '').toLowerCase();
        const originalBillNo = (pr?.billNo || '').toLowerCase();
        return returnBillNo === billNo.toLowerCase() || originalBillNo === billNo.toLowerCase();
    });

    if (!currentPurchase && existingReturns.length === 0) {
        showNotification('No purchase or return found with this bill number', 'error');
        resetForm();
        return;
    }

    // If we found returns but no original purchase, use the first return's data
    if (!currentPurchase && existingReturns.length > 0) {
        const firstReturn = existingReturns[0];
        currentPurchase = purchases.find(p => p.billNo?.toLowerCase() === firstReturn.billNo?.toLowerCase());
    }

    if (!currentPurchase) {
        showNotification('Original purchase data not found', 'error');
        resetForm();
        return;
    }

    // Generate a return bill number based on the original bill number
    generateReturnBillNo(currentPurchase.billNo);
    
    // Populate form with purchase data and return history
    populateForm(existingReturns);
}

// Populate form with purchase data
function populateForm(existingReturns = []) {
    if (!currentPurchase) return;
    
    console.log('Purchase Returns Structure:', existingReturns);

    // Set supplier info
    document.getElementById('supplier').value = currentPurchase.supplierName || '';
    
    // Clear previous products
    const tbody = document.getElementById('productsList');
    tbody.innerHTML = '';
    returnProducts = [];
    
    // Add all products from the purchase
    currentPurchase.products.forEach((product, index) => {
        const row = document.createElement('tr');
        
        // Calculate total previously returned quantity for this product
        const previouslyReturned = existingReturns.reduce((total, returnDoc) => {
            // Get the products from the return document
            const returnedProducts = returnDoc.productsreturn || [];
            
            // Find the matching product in this return document
            const matchingProduct = returnedProducts.find(rp => 
                rp?.productCode?.toLowerCase() === product.productCode?.toLowerCase()
            );
            
            // Add the return quantity if found, otherwise add 0
            // Check for both returnQuantity and returnquantity
            const quantityReturned = matchingProduct ? 
                Number(matchingProduct.returnQuantity || matchingProduct.returnquantity || 0) : 0;
            
            console.log(`Product ${product.productCode}: Found return quantity: ${quantityReturned} in return doc:`, 
                returnDoc.returnBillNo || returnDoc.returnbillNo);
            
            return total + quantityReturned;
        }, 0);

        console.log(`Product ${product.productCode}: Total previously returned: ${previouslyReturned}`);
        
        // Create a return product object
        const returnProduct = {
            productId: product.productId,
            productCode: product.productCode,
            productName: product.productName,
            costPrice: Number(product.costPrice) || 0,
            purchasePack: Number(product.purchasePack) || 0,
            previouslyReturned: previouslyReturned,
            returnQuantity: 0,
            totalAmount: 0
        };
        
        returnProducts.push(returnProduct);
        
        // Calculate remaining quantity available for return
        const remainingQuantity = Math.max(0, product.purchasePack - previouslyReturned);
        
        row.innerHTML = `
            <td>${product.productCode || ''}</td>
            <td>${product.productName || ''}</td>
            <td>${formatCurrency(product.costPrice)}</td>
            <td>${product.purchasePack || 0}</td>
            <td>${previouslyReturned}</td>
            <td>
                <input type="number" 
                       class="return-quantity" 
                       min="0" 
                       max="${remainingQuantity}" 
                       value="0" 
                       data-index="${index}"
                       oninput="updateReturnQuantity(this)">
            </td>
            <td>
                <span class="total-amount" id="total-${index}">0.00</span>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Show notification about existing returns
    if (existingReturns.length > 0) {
        const totalReturned = existingReturns.reduce((sum, ret) => 
            sum + (Number(ret.grandTotal || ret.grand_total) || 0), 0);
        const returnNumbers = existingReturns
            .map(ret => ret.returnBillNo || ret.returnbillNo)
            .filter(Boolean)
            .join(', ');
        showNotification(`Found ${existingReturns.length} previous return(s) (${returnNumbers}) totaling ${formatCurrency(totalReturned)}`, 'info');
    }
}
// Update return quantity and calculate totals
function updateReturnQuantity(input) {
    const index = parseInt(input.dataset.index);
    const value = parseInt(input.value) || 0;
    const product = returnProducts[index];
    
    if (!product) return;
    
    const maxAllowed = product.purchasePack - product.previouslyReturned;
    
    // Validate input
    if (value < 0) input.value = 0;
    if (value > maxAllowed) input.value = maxAllowed;
    
    // Update return product
    product.returnQuantity = parseInt(input.value) || 0;
    product.totalAmount = product.returnQuantity * product.costPrice;
    
    // Update display
    document.getElementById(`total-${index}`).textContent = formatCurrency(product.totalAmount);
    
    // Update grand totals
    updateTotals();
}

// Update totals
function updateTotals() {
    const grandTotal = returnProducts.reduce((sum, product) => sum + product.totalAmount, 0);
    
    document.getElementById('grandTotal').value = formatCurrency(grandTotal);
    document.getElementById('returnAmount').value = formatCurrency(grandTotal);
}

// Generate return bill number
function generateReturnBillNo(originalBillNo = '') {
    if (originalBillNo) {
        // Just display the original bill number
        document.getElementById('returnBillNo').value = originalBillNo;
    } else {
        // Set empty or default value when no bill is searched
        document.getElementById('returnBillNo').value = '';
    }
}

// Update character count for comments
function updateCharCount() {
    const comments = document.getElementById('comments').value;
    document.getElementById('charCount').textContent = `${comments.length}/100`;
}

// Modify the handleSubmit function to include printing logic
// Function to validate return period (2 days)


// Preload company logo
function preloadLogo() {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            // Create a canvas to convert the image to data URL
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Store the data URL globally for later use
            window.logoDataUrl = canvas.toDataURL('image/png');
            resolve(window.logoDataUrl);
        };
        
        img.onerror = function() {
            console.warn('Failed to load logo image');
            window.logoDataUrl = null;
            resolve(null);
        };
        
        const basePath = window.location.protocol === 'file:' 
            ? "../" 
            : "../";
        img.src = `${basePath}img/logo.jpeg`; // Relative to the current HTML file
    });
}

// Function to print thermal receipt with design similar to sales return receipt
function printThermalReceipt(returnData) {
    return new Promise((resolve) => {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Define formatDateCompact function inside the print function
        function formatDateCompact(dateStr) {
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            } catch (e) {
                return dateStr; // Return original if parsing fails
            }
        }
        
        // Format currency function
        function formatCurrency(value) {
            return parseFloat(value).toFixed(2);
        }
        
        // Determine if we have a logo
        const logoHtml = window.logoDataUrl 
            ? `<img src="${window.logoDataUrl}" alt="KN" class="logo" style="max-width: 150px; max-height: 100px; margin: 0 auto 10px auto; display: block;">`
            : `<div class="text-center"><h2 style="margin: 0; font-size: 32px; font-weight: bold;">KN</h2></div>`;
        
        // Generate the HTML content for the print window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Return Receipt - ${returnData.returnbillNo}</title>
                <style>
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.4;
                        margin: -10px auto 0; /* Negative top margin */
                        padding: 3px;
                        width: 76mm;
                        font-size: 14px;
                    }
                    .text-center {
                        text-align: center;
                    }
                    .logo {
                        max-width: 150px;
                        max-height: 100px;
                        margin: 0 auto 10px auto;
                        display: block;
                    }
                    .product-table {
                        width: 100%;
                        padding-right: 3px;
                        padding-left: 0;
                        margin-left: -10px; /* Move table more to the left */
                    }
                    @media print {
                        html, body {
                            width: 80mm;
                            margin: -10px auto 0; /* Negative top margin in print */
                            padding: 3px;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                    table {
                        width: 100%;
                    }
                    .product-item {
                        margin-left: -5px; /* Keep original positioning */
                    }
                    .summary-section {
                        margin-left: -4px; /* Keep original left positioning */
                        width: 100%;
                    }
                </style>
            </head>
            <body>
                ${logoHtml}
                
                <div class="text-center">
                    <p style="margin: 2px 0; font-size: 18px; font-weight: 800;">Kashaf-Noor Libas</p>
                    <p style="margin: 2px 0; font-size: 14px;">Katchery Bazar, Sargodha</p>
                    <p style="margin: 2px 0; font-size: 14px;">0315-6709271, 0301-6709271</p>
                                     
                    <p style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; text-decoration: underline;">RETURN RECEIPT</p>
                </div>
                
                <div style="font-size: 13px; margin: 10px 0; display: flex; flex-wrap: wrap;">
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Bill No:</span>
                            <span>${returnData.returnbillNo}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Date:</span>
                            <span>${formatDateCompact(returnData.date)}</span>
                        </div>
                    </div>
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Supplier:</span>
                            <span>${returnData.supplierName}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Payment:</span>
                            <span>Cash</span>
                        </div>
                    </div>
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div class="product-table">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 1px dashed #000;">
                                <th style="width: 36%; text-align: left; padding: 3px 0; padding-left: 10px;">Product</th>
                                <th style="width: 18%; text-align: center; padding: 3px 0; position: relative; left: -5px;">Qty</th>
                                <th style="width: 15%; text-align: right; padding: 3px 0; position: relative; left: -8px;">Price</th>
                                <th style="width: 25%; text-align: right; padding: 3px 0; position: relative; left: -10px;">Amount</th>
                            </tr>
                        </thead>
                    </table>
                    
                    ${returnData.productsreturn.map((product, index) => `
                        <div class="product-item" style="display: flex; align-items: center; font-size: 13px; margin: 3px 0;">
                            <div style="width: 36%; font-weight: bold; overflow-wrap: break-word; padding-left: 10px;">${index + 1}. ${product.productName}</div>
                            <div style="width: 18%; text-align: center;">${product.returnquantity}</div>
                            <div style="width: 15%; text-align: right;">${formatCurrency(product.costPrice)}</div>
                            <div style="width: 25%; text-align: right; position: relative; left: 5px;">${formatCurrency(product.totalAmount)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="summary-section" style="display: flex; justify-content: flex-end; font-size: 13px;">
                    <div style="width: 72%;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Subtotal:</span>
                            <span style="position: relative; left: -10px;">Rs${formatCurrency(returnData.grandTotal)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 2px; margin: 2px 0 1px 0; font-weight: bold; font-size: 15px;">
                            <span>TOTAL:</span>
                            <span style="position: relative; left: -10px;">Rs${formatCurrency(returnData.grandTotal)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px; margin-top: 1px;">
                            <span style="font-weight: bold;">Received:</span>
                            <span style="position: relative; left: -10px;">Rs${formatCurrency(returnData.receiveAmount)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: bold;">Balance:</span>
                            <span style="position: relative; left: -10px;">Rs${formatCurrency(returnData.grandTotal - returnData.receiveAmount)}</span>
                        </div>
                    </div>
                </div>
                
                ${returnData.comments ? `
                    <div style="font-size: 13px; border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
                        <div style="font-weight: bold;">Comments:</div>
                        <div style="margin-top: 3px;">${returnData.comments}</div>
                    </div>
                ` : ''}
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="text-center" style="font-size: 13px; margin-top: 10px;">
                    <p style="margin: 2px 0;">Printed: ${new Date().toLocaleString()}</p>
                    <p style="margin: 12px 0 5px 0; font-style: italic; font-size: 12px;">Software by ZY Dev's</p>
                </div>
                
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; margin-right: 10px;">Print Receipt</button>
                    <button onclick="window.close()" style="padding: 8px 16px; font-size: 14px;">Close</button>
                </div>
            </body>
            </html>
        `);
        
        // Finalize the print window
        printWindow.document.close();
        printWindow.focus();
        
        // Automatically print the window
        setTimeout(() => {
            printWindow.print();
            // Automatically close after printing and resolve the promise
            printWindow.onafterprint = function() {
                printWindow.close();
                resolve();
            };
            
            // If onafterprint doesn't trigger (not supported in all browsers)
            // Resolve after a reasonable timeout
            setTimeout(() => {
                resolve();
            }, 2000);
        }, 1000);
    });
}
// Helper function to format date compactly (you might need to implement this)
function formatDateCompact(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
}
// Modify the handleSubmit function
async function handleSubmit(e) {
    e.preventDefault();
    await preloadLogo();
    
    if (!currentPurchase) {
        showNotification('Please search for a valid purchase first', 'error');
        return;
    }
    
    // Check if any items are being returned
    const hasReturns = returnProducts.some(product => product.returnQuantity > 0);
    if (!hasReturns) {
        showNotification('Please specify at least one item to return', 'error');
        return;
    }

    const grandTotal = parseFloat(document.getElementById('grandTotal').value.replace(/[^0-9.-]+/g, '')) || 0;
    const receivedAmount = parseFloat(document.getElementById('receivedAmount').value) || 0;
    const remainingAmount = Math.max(0, grandTotal - receivedAmount);
    const shouldPrint = document.getElementById('printReceipt').checked;
    
    // Get form data - align field names with database schema
    const returnData = {
        date: document.getElementById('returnDate').value,
        returnbill_no: document.getElementById('returnBillNo').value,  // The return bill number
        billNo: currentPurchase.billNo, // The original bill number we're returning items from
        supplier_name: currentPurchase.supplierName, // Changed from supplierName to supplier_name
        comments: document.getElementById('comments').value,
        grand_total: grandTotal, 
        due_amount: remainingAmount,
        receive_amount: receivedAmount,
        productsreturn: returnProducts
            .filter(product => product.returnQuantity > 0)
            .map(product => ({
                productId: product.productId,
                productCode: product.productCode,
                productName: product.productName,
                costPrice: product.costPrice,
                returnquantity: product.returnQuantity,
                totalAmount: product.totalAmount
            }))
    };
    
    // Log data being sent to API for debugging
    console.log('Sending purchase return data to API:', returnData);
    
    // Submit data to API with improved error handling
    showLoading(true);
    try {
        // Increase timeout to 30 seconds for operations with stock updates
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('API request timed out after 30 seconds')), 30000)
        );
        
        // Add additional debugging before API call
        console.log('About to call API with data:', JSON.stringify(returnData));
        
        // API call promise with explicit error handling
        const apiCall = window.api.addPurchasereturn(returnData)
            .catch(err => {
                console.error('API call rejected with error:', err);
                throw err;
            });
        
        // Race the API call against the timeout
        const result = await Promise.race([apiCall, timeout]);
        
        console.log('API call completed with result:', result);
        
        if (result && result.success) {
            showNotification('Purchase return saved successfully', 'success');
            
            // Prepare thermal receipt data - match field names used in printThermalReceipt
            const receiptData = {
                ...returnData,
                returnbillNo: returnData.returnbill_no,
                grandTotal: returnData.grand_total,
                receiveAmount: returnData.receive_amount,
                supplierName: returnData.supplier_name
            };
            
            // Print receipt if checkbox is checked
            if (shouldPrint) {
                await printThermalReceipt(receiptData);
            }
            
            // Reload the page after a short delay
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            const errorMsg = result ? result.message || 'Unknown error' : 'No response from server';
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error('Error saving purchase return:', error);
        // Log more diagnostic information
        console.log('Purchase return data that failed:', returnData);
        console.log('Current purchase object:', currentPurchase);
        showNotification(error.message || 'Error saving purchase return', 'error');
    } finally {
        showLoading(false);
    }
}

// Modify the resetForm function to hide thermal receipt
function resetForm() {
    // Existing reset logic
    document.getElementById('purchaseReturnForm').reset();
    document.getElementById('productsList').innerHTML = '';
    document.getElementById('grandTotal').value = '';
    document.getElementById('returnAmount').value = '';
    document.getElementById('receivedAmount').value = '';
    currentPurchase = null;
    returnProducts = [];
    
    // Reset date and return bill number
    document.getElementById('returnDate').valueAsDate = new Date();
    generateReturnBillNo();
    
    // Hide thermal receipt
    document.getElementById('thermal-receipt').style.display = 'none';
}
// Helper functions
function formatCurrency(amount) {
    const number = Number(amount);
    if (isNaN(number)) {
        return '0.00';
    }
    return number.toFixed(2);
}

function showLoading(show) {
    if (document.getElementById('loadingSpinner')) {
        document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
    } else if (show) {
        // Create loading spinner if it doesn't exist
        const spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.className = 'loading-spinner';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(alert, container.firstChild);
    
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

// Error handling
window.onerror = function(message, source, lineno, colno, error) {
    console.error('JS Error:', error);
    showNotification('An unexpected error occurred', 'error');
    return false;
};