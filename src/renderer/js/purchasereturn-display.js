// Global variables
let purchaseReturns = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredReturns = [];
let selectedReturnId = null;

// Initialize the display
document.addEventListener('DOMContentLoaded', initializeDisplay);

async function initializeDisplay() {
    try {
        await fetchPurchaseReturns();
        await preloadLogo();
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing display:', error);
        showNotification('Error loading purchase returns', 'error');
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
            document.getElementById('returnDetailsModal').style.display = 'none';
            document.getElementById('paymentHistoryModal').style.display = 'none';
            document.getElementById('deleteConfirmModal').style.display = 'none';
            document.getElementById('editPaymentModal').style.display = 'none';
        });
    });
    // Delete confirmation buttons
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        document.getElementById('deleteConfirmModal').style.display = 'none';
    });

    // Edit payment modal buttons
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        document.getElementById('editPaymentModal').style.display = 'none';
    });
    
    // New payment input event
    document.getElementById('editNewPayment').addEventListener('input', calculateRemainingDue);
    
    // Save button event handler (we'll just hide the modal for now)
    document.getElementById('saveEditBtn').addEventListener('click', () => {
        document.getElementById('editPaymentModal').style.display = 'none';
        showNotification('Payment information saved successfully', 'success');
    });

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

// Fetch purchase returns from API
async function fetchPurchaseReturns() {
    showLoading(true);
    try {
        const response = await window.api.getAllPurchaseReturns();
        console.log('API Response:', response);
        
        if (!Array.isArray(response)) {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format');
        }
        
        purchaseReturns = response.map(returnItem => ({
            ...returnItem,
            grandTotal: Number(returnItem.grandTotal || 0),
            receiveAmount: Number(returnItem.receiveAmount || 0),
            dueAmount: Number(returnItem.dueAmount || 0),
            productsreturn: Array.isArray(returnItem.productsreturn) ? returnItem.productsreturn : []
        }));
        
        filteredReturns = [...purchaseReturns];
        displayPurchaseReturns();
    } catch (error) {
        console.error('Error fetching purchase returns:', error);
        showNotification('Error fetching purchase returns', 'error');
    } finally {
        showLoading(false);
    }
}

// Display purchase returns with pagination
function displayPurchaseReturns() {
    const tbody = document.getElementById('purchaseReturnsList');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReturns = filteredReturns.slice(startIndex, endIndex);
    
    if (paginatedReturns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">No purchase returns found</td>
            </tr>
        `;
        return;
    }

    paginatedReturns.forEach(returnItem => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${formatDate(returnItem.date || '')}</td>
            <td>${returnItem.returnBillNo || ''}</td>
            <td>${returnItem.supplierName || ''}</td>
            <td>${formatCurrency(returnItem.grandTotal)}</td>
            <td>${formatCurrency(returnItem.dueAmount)}</td>
        <td>${formatCurrency(returnItem.receiveAmount)}</td>
              <td></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-secondary" onclick="viewReturnDetails(${returnItem.purchaseReturnId})">
                        <i class="fas fa-eye"></i>
                    </button>
<button class="btn btn-sm btn-primary" onclick="viewPaymentHistory('${returnItem.purchaseReturnId}')">
<i class="fas fa-history"></i>
</button>
<button class="btn btn-sm btn-success" onclick="editReturnPayment('${returnItem.purchaseReturnId}')">
<i class="fas fa-edit"></i>
</button>
                  <button class="btn btn-icon btn-primary" onclick="printReturnReceipt('${returnItem.returnBillNo}')">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="confirmDelete('${returnItem.returnBillNo}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination();
}




// Edit return payment
function editReturnPayment(purchaseReturnId) {
    console.log('Editing return payment for ID:', purchaseReturnId, 'Type:', typeof purchaseReturnId);
    
    // Make sure purchaseReturnId is compared as a string for consistent comparison
    const returnItem = purchaseReturns.find(p => String(p.purchaseReturnId) === String(purchaseReturnId));
    
    if (!returnItem) {
        showNotification('Purchase return not found', 'error');
        console.error('Return not found for ID:', purchaseReturnId, 'Available IDs:', purchaseReturns.map(p => p.purchaseReturnId));
        return;
    }
    
    // Store the selected return ID for later use (keep as string for now)
    selectedReturnId = purchaseReturnId;
    console.log('Selected Return ID set to:', selectedReturnId);
    
    // Populate the edit payment modal
    document.getElementById('editReturnBillNo').textContent = returnItem.returnBillNo;
    document.getElementById('editSupplier').textContent = returnItem.supplierName;
    document.getElementById('editGrandTotal').textContent = formatCurrency(returnItem.grandTotal);
    document.getElementById('editPreviousReceived').textContent = formatCurrency(returnItem.receiveAmount);
    document.getElementById('editCurrentDue').textContent = formatCurrency(returnItem.dueAmount);
    
    // Clear the new payment input and set remaining due equal to current due
    document.getElementById('editNewPayment').value = '';
    document.getElementById('editRemainingDue').textContent = formatCurrency(returnItem.dueAmount);
    
    // Show the edit payment modal
    document.getElementById('editPaymentModal').style.display = 'block';
}


// Calculate remaining due based on new payment amount
function calculateRemainingDue() {
    const currentDueEl = document.getElementById('editCurrentDue');
    const newPaymentEl = document.getElementById('editNewPayment');
    const remainingDueEl = document.getElementById('editRemainingDue');
    
    const currentDue = parseFloat(currentDueEl.textContent) || 0;
    const newPayment = parseFloat(newPaymentEl.value) || 0;
    
    // Calculate remaining due
    let remainingDue = Math.max(currentDue - newPayment, 0).toFixed(2);
    
    // Display remaining due
    remainingDueEl.textContent = formatCurrency(remainingDue);
    
    // Validate input
    if (newPayment > currentDue) {
        newPaymentEl.classList.add('invalid-input');
        showNotification('Payment amount cannot exceed due amount', 'warning');
    } else {
        newPaymentEl.classList.remove('invalid-input');
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
// Print return receipt
function printReturnReceipt(returnBillNo) {
    return new Promise((resolve) => {
        const returnItem = purchaseReturns.find(p => p.returnBillNo === returnBillNo);
        if (!returnItem) {
            showNotification('Purchase return not found', 'error');
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
        const formattedDate = formatDateCompact(new Date(returnItem.date).toLocaleDateString());
        
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
                <title>Purchase Return Receipt - ${returnItem.returnBillNo}</title>
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
                        margin-left: -5px; /* More shift left */
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
                                     
                    <p style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; text-decoration: underline;">PURCHASE RETURN RECEIPT</p>
                </div>
                
                <div style="font-size: 13px; margin: 10px 0; display: flex; flex-wrap: wrap;">
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Return #:</span>
                            <span>${returnItem.returnBillNo}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Date:</span>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Supplier:</span>
                            <span>${returnItem.supplierName}</span>
                        </div>
                    </div>
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div class="product-table">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 1px dashed #000;">
                                <th style="width: 36%; text-align: left; padding: 3px 0;">Product</th>
                                <th style="width: 18%; text-align: center; padding: 3px 0; position: relative; left: -5px;">Qty</th>
                                <th style="width: 15%; text-align: right; padding: 3px 0; position: relative; left: -8px;">Price</th>
                                <th style="width: 25%; text-align: right; padding: 3px 0; position: relative; left: -10px;">Amount</th>
                            </tr>
                        </thead>
                    </table>
                    
                    ${returnItem.productsreturn.map((product, index) => `
                        <div class="product-item" style="display: flex; align-items: center; font-size: 13px; margin: 3px 0;">
                            <div style="width: 36%; font-weight: bold; overflow-wrap: break-word;">${index + 1}. ${product.productName || ''}</div>
                            <div style="width: 18%; text-align: center;">${product.returnQuantity || 0}</div>
                            <div style="width: 15%; text-align: right;">${parseFloat(product.costPrice).toFixed(2)}</div>
                            <div style="width: 25%; text-align: right; position: relative; left: 5px;">${parseFloat(product.totalAmount).toFixed(2)}</div>
                        </div>
                   
                    `).join('')}
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="summary-section" style="display: flex; justify-content: flex-end; font-size: 13px;">
                    <div style="width: 72%;">
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 2px; margin: 2px 0 1px 0; font-weight: bold; font-size: 15px;">
                            <span>TOTAL:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(returnItem.grandTotal).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px; margin-top: 1px;">
                            <span style="font-weight: bold;">Received:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(returnItem.receiveAmount).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: bold;">Due:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(returnItem.dueAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                ${returnItem.comments ? `
                    <div style="font-size: 13px; border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
                        <div style="font-weight: bold;">Comments:</div>
                        <div style="margin-top: 3px;">${returnItem.comments}</div>
                    </div>
                ` : ''}
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="text-center" style="font-size: 13px; margin-top: 10px;">
                    <p style="margin: 6px 0;">Printed: ${new Date().toLocaleString()}</p>
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

// View return details
async function viewReturnDetails(purchaseReturnId) {
    showLoading(true);
    try {
        const returnItem = purchaseReturns.find(p => p.purchaseReturnId === purchaseReturnId);
        if (!returnItem) {
            throw new Error('Purchase return not found');
        }
        
        document.getElementById('modalReturnBillNo').textContent = returnItem.returnBillNo;
        document.getElementById('modalDate').textContent = formatDate(returnItem.date);
        document.getElementById('modalSupplier').textContent = returnItem.supplierName;
        document.getElementById('modalComments').textContent = returnItem.comments || '';
        
        const tbody = document.getElementById('modalProductsList');
        tbody.innerHTML = returnItem.productsreturn.map(product => `
            <tr>
                <td>${product.productCode || ''}</td>
                <td>${product.productName || ''}</td>
                <td>${formatCurrency(product.costPrice)}</td>
                <td>${product.returnQuantity || 0}</td>
                <td>${formatCurrency(product.totalAmount)}</td>
            </tr>
        `).join('');
        
        document.getElementById('modalGrandTotal').textContent = formatCurrency(returnItem.grandTotal);
        document.getElementById('modalDueAmount').textContent = formatCurrency(returnItem.dueAmount);
        
        document.getElementById('returnDetailsModal').style.display = 'block';
    } catch (error) {
        console.error('Error viewing return details:', error);
        showNotification('Error loading return details', 'error');
    } finally {
        showLoading(false);
    }
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    filteredReturns = purchaseReturns.filter(returnItem => 
        returnItem.returnBillNo.toLowerCase().includes(searchTerm) ||
        returnItem.supplierName.toLowerCase().includes(searchTerm)
    );
    currentPage = 1;
    displayPurchaseReturns();
}

// Date filter functionality
function handleDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }
    
    filteredReturns = purchaseReturns.filter(returnItem => {
        const returnDate = returnItem.date.split('T')[0];
        return returnDate >= startDate && returnDate <= endDate;
    });
    
    currentPage = 1;
    displayPurchaseReturns();
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    filteredReturns = [...purchaseReturns];
    currentPage = 1;
    displayPurchaseReturns();
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

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
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
    const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayPurchaseReturns();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Confirm delete
function confirmDelete(returnBillNo) {
    // Find the purchase return object using returnBillNo
    const returnItem = purchaseReturns.find(p => p.returnBillNo === returnBillNo);
    
    if (!returnItem) {
        showNotification('Purchase return not found', 'error');
        return;
    }
    
    document.getElementById('deleteConfirmModal').style.display = 'block';
    // Pass the purchaseReturnId to the deleteReturn function
    document.getElementById('confirmDeleteBtn').onclick = () => deleteReturn(returnItem.purchaseReturnId);
}
// Replace your existing saveEditBtn event handler with this one
document.getElementById('saveEditBtn').addEventListener('click', async () => {
    try {
        // Get the selectedReturnId that was set in editReturnPayment function
        if (!selectedReturnId) {
            showNotification('Invalid return ID. Please try again.', 'error');
            return;
        }
        
        console.log('Saving with purchaseReturnId:', selectedReturnId, 'Type:', typeof selectedReturnId);
        
        const newPayment = parseFloat(document.getElementById('editNewPayment').value) || 0;
        const currentDue = parseFloat(document.getElementById('editCurrentDue').textContent.replace(/[^0-9.-]+/g, '')) || 0;
        const previousReceived = parseFloat(document.getElementById('editPreviousReceived').textContent.replace(/[^0-9.-]+/g, '')) || 0;
        
        // Validate input
        if (newPayment <= 0) {
            showNotification('Payment amount must be greater than zero', 'error');
            return;
        }
        
        if (newPayment > currentDue) {
            showNotification('Payment amount cannot exceed due amount', 'error');
            return;
        }
        
        showLoading(true);
        
        // Calculate new values
        const paidAmount = previousReceived + newPayment;
        const dueAmount = currentDue - newPayment;
        
        // Find the return item by ID
        const returnItem = purchaseReturns.find(p => String(p.purchaseReturnId) === String(selectedReturnId));
        if (!returnItem) {
            throw new Error(`Purchase return not found for ID: ${selectedReturnId}`);
        }
        
        // Convert the purchaseReturnId to a number for database operations
        const purchaseReturnIdNumber = parseInt(selectedReturnId, 10);
        
        // Send payment data to the main process
        const result = await window.api.updatePurchaseReturnPayment({
            purchaseReturnId: purchaseReturnIdNumber, // Use the numeric value
            returnBillNo: returnItem.returnBillNo, // We'll still pass this but it won't be used for invoice_number
            paidAmount: paidAmount,
            dueAmount: dueAmount,
            newPayment: newPayment,
            notes: 'Manual payment update'
        });
        
        if (result.success) {
            // Update the local data
            const returnIndex = purchaseReturns.findIndex(r => String(r.purchaseReturnId) === String(selectedReturnId));
            if (returnIndex !== -1) {
                purchaseReturns[returnIndex].receiveAmount = paidAmount;
                purchaseReturns[returnIndex].dueAmount = dueAmount;
                
                // Also update the filtered array
                const filteredIndex = filteredReturns.findIndex(r => String(r.purchaseReturnId) === String(selectedReturnId));
                if (filteredIndex !== -1) {
                    filteredReturns[filteredIndex].receiveAmount = paidAmount;
                    filteredReturns[filteredIndex].dueAmount = dueAmount;
                }
                
                // Refresh the display
                displayPurchaseReturns();
            }
            
            // Hide the modal
            document.getElementById('editPaymentModal').style.display = 'none';
            showNotification('Payment information saved successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to update payment');
        }
    } catch (error) {
        console.error('Error saving payment:', error);
        showNotification(error.message || 'Error saving payment', 'error');
    } finally {
        showLoading(false);
    }
});
// Fetch payment history for a return
// Fetch payment history for a return
async function viewPaymentHistory(purchaseReturnId) {
    showLoading(true);
    try {
        // Try to find the return item but don't throw an error if not found
        const returnItem = purchaseReturns.find(p => String(p.purchaseReturnId) === String(purchaseReturnId));
        
        // Use purchaseReturnId to fetch payment history
        const result = await window.api.getreturnPaymentHistory(purchaseReturnId);
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch payment history');
        }
        
        const paymentHistory = result.data;
        
        // Populate the payment history modal
        const tbody = document.getElementById('paymentHistoryList');
        tbody.innerHTML = '';
        
        if (paymentHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="no-data">No payment history found</td>
                </tr>
            `;
        } else {
            paymentHistory.forEach(payment => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatDate(payment.paymentDate)}</td>
                    <td>${formatCurrency(payment.paymentAmount)}</td>
                    <td>${payment.notes || ''}</td>
                    <td>${new Date(payment.timestamp).toLocaleString()}</td>
                `;
                tbody.appendChild(row);
            });
        }
        
        // Use the returnBillNo from return item if found, otherwise use a placeholder
        document.getElementById('historyReturnBillNo').textContent = 
            returnItem ? returnItem.returnBillNo : 'Payment History';
        document.getElementById('paymentHistoryModal').style.display = 'block';
    } catch (error) {
        console.error('Error fetching payment history:', error);
        showNotification('Error fetching payment history', 'error');
    } finally {
        showLoading(false);
    }
}
// Delete purchase return
async function deleteReturn(purchaseReturnId) {
    showLoading(true);
    try {
        const result = await window.api.deletePurchaseReturn(purchaseReturnId);
        if (result.success) {
            // After successful deletion, update the arrays
            purchaseReturns = purchaseReturns.filter(p => p.purchaseReturnId !== purchaseReturnId);
            filteredReturns = filteredReturns.filter(p => p.purchaseReturnId !== purchaseReturnId);
            
            displayPurchaseReturns();
            document.getElementById('deleteConfirmModal').style.display = 'none';
            showNotification('Purchase return deleted successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to delete purchase return');
        }
    } catch (error) {
        console.error('Error deleting purchase return:', error);
        showNotification(error.message || 'Error deleting purchase return', 'error');
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














// Update the displayPurchaseReturns function to pass purchaseReturnId to viewReturnDetails
