// Global variables
let purchases = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredPurchases = [];
let currentEditInvoice = null;

// Initialize the display
document.addEventListener('DOMContentLoaded', initializeDisplay);

async function initializeDisplay() {
    try {
        await fetchPurchases();
        await preloadLogo();
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing display:', error);
        showNotification('Error loading purchases', 'error');
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Search input
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Date filters
    document.getElementById('filterBtn').addEventListener('click', handleDateFilter);
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('purchaseDetailsModal').style.display = 'none';
            document.getElementById('deleteConfirmModal').style.display = 'none';
            document.getElementById('paymentEditModal').style.display = 'none';
            document.getElementById('paymentHistoryModal').style.display = 'none';
        });
    });

    // Delete confirmation buttons
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        document.getElementById('deleteConfirmModal').style.display = 'none';
    });

    // Edit payment buttons
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        document.getElementById('paymentEditModal').style.display = 'none';
    });
    
    document.getElementById('savePaymentBtn').addEventListener('click', savePaymentUpdate);
    
    // New payment input calculation
    document.getElementById('editNewPayment').addEventListener('input', calculateRemainingDue);

    // Close modals when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Calculate remaining due amount based on new payment
function calculateRemainingDue() {
    const grandTotal = parseFloat(document.getElementById('editGrandTotal').value) || 0;
    const paidAmount = parseFloat(document.getElementById('editPaidAmount').value) || 0;
    const newPayment = parseFloat(document.getElementById('editNewPayment').value) || 0;
    
    // Calculate remaining due
    const remainingDue = Math.max(0, grandTotal - (paidAmount + newPayment)).toFixed(2);
    document.getElementById('editRemainingDue').value = remainingDue;
}

// Fetch purchases from API
async function fetchPurchases() {
    showLoading(true);
    try {
        const response = await window.api.getAllPurchases();
        console.log('API Response:', response);
        
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
        
        filteredPurchases = [...purchases];
        displayPurchases();
    } catch (error) {
        console.error('Error fetching purchases:', error);
        showNotification('Error fetching purchases', 'error');
    } finally {
        showLoading(false);
    }
}

// Display purchases with pagination
function displayPurchases() {
    const tbody = document.getElementById('purchasesList');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPurchases = filteredPurchases.slice(startIndex, endIndex);
    
    if (paginatedPurchases.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="no-data">No purchases found</td>
            </tr>
        `;
        return;
    }

    paginatedPurchases.forEach(purchase => {
        const row = document.createElement('tr');
        const status = getPaymentStatus(
            Number(purchase.paidAmount || 0), 
            Number(purchase.grandTotal || 0)
        );
        
        row.innerHTML = `
            <td>${formatDate(purchase.date || '')}</td>
            <td>${purchase.invoiceNumber || ''}</td>
            <td>${purchase.billNo || ''}</td>
            <td>${purchase.supplierName || ''}</td>
            <td>${purchase.paymentMethod || ''}</td>
            <td>${formatCurrency(purchase.grandTotal)}</td>
            <td>${formatCurrency(purchase.paidAmount)}</td>
            <td>${formatCurrency(Number(purchase.grandTotal || 0) - Number(purchase.paidAmount || 0))}</td>
            <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-secondary" onclick="viewPurchaseDetails('${purchase.invoiceNumber}')">
                        <i class="fas fa-eye"></i>
                    </button>
                     <button class="btn btn-icon btn-info" onclick="viewPaymentHistory('${purchase.invoiceNumber}')">
                        <i class="fas fa-history"></i>
                    </button>

                    <button class="btn btn-icon btn-warning" onclick="editPayment('${purchase.invoiceNumber}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-icon btn-primary" onclick="printPurchaseReceipt('${purchase.invoiceNumber}')">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="confirmDelete('${purchase.invoiceNumber}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination();
}


async function viewPaymentHistory(invoiceNumber) {
    showLoading(true);
    try {
        const purchase = purchases.find(p => p.invoiceNumber === invoiceNumber);
        if (!purchase) {
            throw new Error('Purchase not found');
        }
        
        // Get payment history from API
        const result = await window.api.getPaymentHistory(invoiceNumber);
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch payment history');
        }
        
        const paymentHistory = result.data || [];
        
        // Fill in the basic purchase info
        document.getElementById('historyInvoiceNo').textContent = purchase.invoiceNumber;
        document.getElementById('historySupplier').textContent = purchase.supplierName;
        document.getElementById('historyGrandTotal').textContent = formatCurrency(purchase.grandTotal);
        
        // Fill the payment history table
        const tbody = document.getElementById('paymentHistoryList');
        
        if (paymentHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-history">No payment history found for this invoice</td>
                </tr>
            `;
        } else {
            tbody.innerHTML = paymentHistory.map(payment => {
                // Format date and time
                const dateTime = new Date(payment.timestamp || payment.paymentDate);
                const date = formatDate(payment.paymentDate);
                const time = dateTime.toLocaleTimeString();
                
                return `
                    <tr>
                        <td>${date}</td>
                        <td>${formatCurrency(payment.paymentAmount)}</td>
                        <td>${payment.notes || ''}</td>
                      
                    </tr>
                `;
            }).join('');
        }
        
        // Calculate totals
        const totalPaid = purchase.paidAmount;
        const remaining = Math.max(0, purchase.grandTotal - totalPaid);
        
        document.getElementById('historyTotalPaid').textContent = formatCurrency(totalPaid);
        document.getElementById('historyRemaining').textContent = formatCurrency(remaining);
        
        // Show the modal
        document.getElementById('paymentHistoryModal').style.display = 'block';
    } catch (error) {
        console.error('Error viewing payment history:', error);
        showNotification('Error loading payment history', 'error');
    } finally {
        showLoading(false);
    }
}



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
// Add this to your initialization code or document ready function
preloadLogo().then(() => {
    console.log("Logo loaded:", window.logoDataUrl ? "Success" : "Failed");
});

function printPurchaseReceipt(invoiceNumber) {
    return new Promise((resolve) => {
        const purchase = purchases.find(p => p.invoiceNumber === invoiceNumber);
        if (!purchase) {
            showNotification('Purchase not found', 'error');
            return;
        }

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
        
        // Format date using the local function
        const formattedDate = formatDateCompact(new Date(purchase.date).toLocaleDateString());
        
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
                <title>Purchase Receipt - ${purchase.invoiceNumber}</title>
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
                        margin-left: 5px; /* Adjusted to move more to the right */
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
                                     
                    <p style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; text-decoration: underline;">PURCHASE RECEIPT</p>
                </div>
                
                <div style="font-size: 13px; margin: 10px 0; display: flex; flex-wrap: wrap;">
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Bill No:</span>
                            <span>${purchase.billNo}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Date:</span>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Invoice #:</span>
                            <span>${purchase.invoiceNumber}</span>
                        </div>
                    </div>
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Supplier:</span>
                            <span>${purchase.supplierName}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Payment:</span>
                            <span>${purchase.paymentMethod}</span>
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
                    
                    ${purchase.products.map((product, index) => `
                        <div class="product-item" style="display: flex; align-items: center; font-size: 13px; margin: 3px 0;">
                            <div style="width: 36%; font-weight: bold; overflow-wrap: break-word; padding-left: 10px;">${index + 1}. ${product.productName || ''}</div>
                            <div style="width: 18%; text-align: center;">${product.purchasePack || 0}${product.focPack ? '+' + product.focPack : ''}</div>
                            <div style="width: 15%; text-align: right;">${parseFloat(product.costPrice).toFixed(2)}</div>
                            <div style="width: 25%; text-align: right; position: relative; left: 5px;">${parseFloat(product.totalAmount).toFixed(2)}</div>
                        </div>
                        <div style="font-size: 12px; color: #555; margin-bottom: 2px; padding-left: 18px;">
                            ${product.purchaseUnitQty ? 'Units: ' + product.purchaseUnitQty : ''}${product.focUnit ? (product.purchaseUnitQty ? ', ' : '') + 'FOC: ' + product.focUnit : ''}
                        </div>
                    `).join('')}
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="summary-section" style="display: flex; justify-content: flex-end; font-size: 13px;">
                    <div style="width: 72%;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Subtotal:</span>
                            <span style="position: relative; left: -10px;">Rs${(purchase.products.reduce((sum, product) => sum + (parseFloat(product.totalAmount) || 0), 0)).toFixed(2)}</span>
                        </div>
                        
                        ${purchase.taxAmount > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Tax ${purchase.taxType === 'percentage' ? '(' + purchase.taxAmount + '%)' : ''}:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(purchase.taxAmount).toFixed(2)}</span>
                        </div>` : ''}
                        
                        ${purchase.discountAmount > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Discount ${purchase.discountType === 'percentage' ? '(' + purchase.discountAmount + '%)' : ''}:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(purchase.discountAmount).toFixed(2)}</span>
                        </div>` : ''}
                        
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 2px; margin: 2px 0 1px 0; font-weight: bold; font-size: 15px;">
                            <span>TOTAL:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(purchase.grandTotal).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px; margin-top: 1px;">
                            <span style="font-weight: bold;">Paid:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(purchase.paidAmount).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: bold;">Due:</span>
                            <span style="position: relative; left: -10px;">Rs${(parseFloat(purchase.grandTotal) - parseFloat(purchase.paidAmount)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                ${purchase.comments ? `
                    <div style="font-size: 13px; border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
                        <div style="font-weight: bold;">Comments:</div>
                        <div style="margin-top: 3px;">${purchase.comments}</div>
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
// Edit payment
function editPayment(invoiceNumber) {
    const purchase = purchases.find(p => p.invoiceNumber === invoiceNumber);
    if (!purchase) {
        showNotification('Purchase not found', 'error');
        return;
    }
    
    currentEditInvoice = invoiceNumber;
    
    // Fill in the edit form
    document.getElementById('editInvoiceNo').textContent = purchase.invoiceNumber;
    document.getElementById('editSupplier').textContent = purchase.supplierName;
    document.getElementById('editGrandTotal').value = formatCurrency(purchase.grandTotal);
    document.getElementById('editPaidAmount').value = formatCurrency(purchase.paidAmount);
    document.getElementById('editDueAmount').value = formatCurrency(purchase.grandTotal - purchase.paidAmount);
    document.getElementById('editNewPayment').value = '';
    document.getElementById('editRemainingDue').value = formatCurrency(purchase.grandTotal - purchase.paidAmount);
    
    // Show the modal
    document.getElementById('paymentEditModal').style.display = 'block';
}

async function savePaymentUpdate() {
    if (!currentEditInvoice) {
        showNotification('No purchase selected for update', 'error');
        return;
    }
    
    const newPayment = parseFloat(document.getElementById('editNewPayment').value);
    if (isNaN(newPayment) || newPayment <= 0) {
        showNotification('Please enter a valid payment amount', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const purchase = purchases.find(p => p.invoiceNumber === currentEditInvoice);
        if (!purchase) {
            throw new Error('Purchase record not found');
        }

        const updatedPaidAmount = parseFloat(purchase.paidAmount) + newPayment;
        const updatedDueAmount = Math.max(0, purchase.grandTotal - updatedPaidAmount);
        
        // Check if purchase exists in database before updating
        // Note: We're using invoiceNumber but the database uses purchase_id
        const checkResult = await window.api.checkPurchaseExists(currentEditInvoice);
        
        if (!checkResult || !checkResult.success) {
            // Alternatively, we could try to proceed without checking
            console.warn('Purchase record not found in database with ID check, proceeding anyway');
            // If you want to fail instead, uncomment the next line
            // throw new Error('Purchase record not found in database');
        }
        
        const result = await window.api.updatePurchasePayment({
            invoiceNumber: currentEditInvoice, // This is used as purchase_id in the database
            purchase_id: currentEditInvoice,   // Add this explicitly for clarity
            paidAmount: updatedPaidAmount,
            dueAmount: updatedDueAmount,
            newPayment: newPayment,
            // Add these fields to ensure proper reference
            supplierName: purchase.supplierName,
            date: purchase.date,
            paymentMethod: purchase.paymentMethod || 'Cash'
        });
        
        if (result.success) {
            // Update local data
            purchase.paidAmount = updatedPaidAmount;
            purchase.dueAmount = updatedDueAmount;
            
            // Refresh display
            displayPurchases();
            
            // Close modal
            document.getElementById('paymentEditModal').style.display = 'none';
            
            showNotification('Payment updated successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to update payment');
        }
    } catch (error) {
        console.error('Error updating payment:', error);
        showNotification(error.message || 'Error updating payment', 'error');
    } finally {
        showLoading(false);
    }
}

// Helper functions
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

function formatCurrency(amount) {
    const number = Number(amount);
    if (isNaN(number)) {
        return '0.00';
    }
    return number.toFixed(2);
}

function getPaymentStatus(paidAmount, totalAmount) {
    const paid = Number(paidAmount) || 0;
    const total = Number(totalAmount) || 0;
    
    if (paid >= total) return 'PAID';
    if (paid > 0) return 'PARTIAL';
    return 'UNPAID';
}

// View purchase details
async function viewPurchaseDetails(invoiceNumber) {
    showLoading(true);
    try {
        const purchase = purchases.find(p => p.invoiceNumber === invoiceNumber);
        if (!purchase) {
            throw new Error('Purchase not found');
        }
        
        document.getElementById('modalInvoiceNo').textContent = purchase.invoiceNumber;
        document.getElementById('modalDate').textContent = formatDate(purchase.date);
        document.getElementById('modalSupplier').textContent = purchase.supplierName;
        document.getElementById('modalPaymentMethod').textContent = purchase.paymentMethod;
        
        const tbody = document.getElementById('modalProductsList');
        tbody.innerHTML = purchase.products.map(product => `
            <tr>
                <td>${product.productCode || ''}</td>
                <td>${product.productName || ''}</td>
                <td>${formatCurrency(product.costPrice)}</td>
                <td>${product.purchasePack || 0}</td>
                <td>${formatCurrency(product.totalAmount)}</td>
            </tr>
        `).join('');
        
        const subTotal = purchase.products.reduce((sum, product) => 
            sum + (parseFloat(product.totalAmount) || 0), 0);
        document.getElementById('modalSubTotal').textContent = formatCurrency(subTotal);
        document.getElementById('modalTaxAmount').textContent = formatCurrency(purchase.taxAmount);
        document.getElementById('modalGrandTotal').textContent = formatCurrency(purchase.grandTotal);
        
        document.getElementById('purchaseDetailsModal').style.display = 'block';
    } catch (error) {
        console.error('Error viewing purchase details:', error);
        showNotification('Error loading purchase details', 'error');
    } finally {
        showLoading(false);
    }
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    filteredPurchases = purchases.filter(purchase => 
        purchase.invoiceNumber.toLowerCase().includes(searchTerm) ||
        purchase.supplierName.toLowerCase().includes(searchTerm) ||
        purchase.billNo.toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    displayPurchases();
}

// Date filter functionality
function handleDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }
    
    filteredPurchases = purchases.filter(purchase => {
        const purchaseDate = purchase.date.split('T')[0];
        return purchaseDate >= startDate && purchaseDate <= endDate;
    });
    
    currentPage = 1;
    displayPurchases();
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    filteredPurchases = [...purchases];
    currentPage = 1;
    displayPurchases();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    let paginationHTML = '';
    
    if (totalPages > 1) {
        paginationHTML += `
            <button ${currentPage === 1 ? 'disabled' : ''} 
                    onclick="changePage(${currentPage - 1})">
                Previous
            </button>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 || 
                i === totalPages || 
                (i >= currentPage - 1 && i <= currentPage + 1)
            ) {
                paginationHTML += `
                    <button class="${currentPage === i ? 'active' : ''}" 
                            onclick="changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (
                i === currentPage - 2 ||
                i === currentPage + 2
            ) {
                paginationHTML += '<span class="pagination-dots">...</span>';
            }
        }
        
        paginationHTML += `
            <button ${currentPage === totalPages ? 'disabled' : ''} 
                    onclick="changePage(${currentPage + 1})">
                Next
            </button>
        `;
    }
    
    pagination.innerHTML = paginationHTML;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayPurchases();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Confirm delete
function confirmDelete(invoiceNumber) {
    document.getElementById('deleteConfirmModal').style.display = 'block';
    document.getElementById('confirmDeleteBtn').onclick = () => deletePurchase(invoiceNumber);
}

// Delete purchase
async function deletePurchase(invoiceNumber) {
    showLoading(true);
    try {
        const result = await window.api.deletePurchase(invoiceNumber);
        if (result.success) {
            purchases = purchases.filter(p => p.invoiceNumber !== invoiceNumber);
            filteredPurchases = filteredPurchases.filter(p => p.invoiceNumber !== invoiceNumber);
            
            displayPurchases();
            document.getElementById('deleteConfirmModal').style.display = 'none';
            showNotification('Purchase deleted successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to delete purchase');
        }
    } catch (error) {
        console.error('Error deleting purchase:', error);
        showNotification(error.message || 'Error deleting purchase', 'error');
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
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

// Initialize when the window loads
window.addEventListener('load', initializeDisplay);