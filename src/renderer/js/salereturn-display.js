// Global variables
let salesReturns = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredReturns = [];

// Initialize the display
document.addEventListener('DOMContentLoaded', initializeDisplay);

async function initializeDisplay() {
    try {
        await fetchSalesReturns();
        await preloadLogo();
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing display:', error);
        showNotification('Error loading sales returns', 'error');
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
            document.getElementById('deleteConfirmModal').style.display = 'none';
        });
    });

    // Delete confirmation buttons
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
        document.getElementById('deleteConfirmModal').style.display = 'none';
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

async function fetchSalesReturns() {
    showLoading(true);
    try {
        const response = await window.api.getAllSalesReturns();
        console.log('API Response:', response);
        
        if (response.success === false) {
            throw new Error(response.message || 'API error');
        }
        
        if (!Array.isArray(response)) {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format');
        }
        
        salesReturns = response;
        filteredReturns = [...salesReturns];
        displaySalesReturns();
    } catch (error) {
        console.error('Error fetching sales returns:', error);
        showNotification(error.message || 'Error fetching sales returns', 'error');
    } finally {
        showLoading(false);
    }
}

// Display sales returns with pagination
function displaySalesReturns() {
    const tbody = document.getElementById('salesReturnsList');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedReturns = filteredReturns.slice(startIndex, endIndex);
    
    if (paginatedReturns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="no-data">No sales returns found</td>
            </tr>
        `;
        return;
    }

    paginatedReturns.forEach(returnItem => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${formatDate(returnItem.date || '')}</td>
            <td>${returnItem.returnBillNo || ''}</td>
            <td>${returnItem.customerName || ''}</td>
            <td>${formatCurrency(returnItem.grandTotal)}</td>
            <td>${returnItem.comments || ''}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-secondary" onclick="viewReturnDetails(${returnItem.salesReturnId})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon btn-primary" onclick="printReturnReceipt('${returnItem.returnBillNo}')">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updatePagination();
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
function printReturnReceipt(returnBillNo) {
    return new Promise((resolve) => {
        const returnItem = salesReturns.find(p => p.returnBillNo === returnBillNo);
        if (!returnItem) {
            showNotification('Sales return not found', 'error');
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
                <title>Sales Return Receipt - ${returnItem.returnBillNo}</title>
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
                                     
                    <p style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; text-decoration: underline;">SALES RETURN RECEIPT</p>
                </div>
                
                <div style="font-size: 13px; margin: 10px 0;">
                    <div style="display: flex; flex-wrap: wrap;">
                        <div style="width: 45%;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: bold; margin-right: 2px;">Return #:</span>
                                <span>${returnItem.returnBillNo}</span>
                            </div>
                        </div>
                        <div style="width: 55%;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: bold; margin-right: 2px;">Customer:</span>
                                <span>${returnItem.customerName}</span>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap;">
                        <div style="width: 45%;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: bold; margin-right: 2px;">Date:</span>
                                <span>${formattedDate}</span>
                            </div>
                        </div>
                        <div style="width: 55%;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: bold; margin-right: 2px;">Invoice #:</span>
                                <span>${returnItem.originalInvoiceNo || ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div class="product-table">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 1px dashed #000;">
                                <th style="width: 36%; text-align: left; padding: 3px 0; position: relative; left: 10px;">Product</th>
                                <th style="width: 18%; text-align: center; padding: 3px 0; position: relative; left: -5px;">Qty</th>
                                <th style="width: 15%; text-align: right; padding: 3px 0; position: relative; left: -8px;">Price</th>
                                <th style="width: 25%; text-align: right; padding: 3px 0; position: relative; left: -10px;">Amount</th>
                            </tr>
                        </thead>
                    </table>
                    
                    ${returnItem.productsreturn.map((product, index) => `
                        <div class="product-item" style="display: flex; align-items: center; font-size: 13px; margin: 3px 0;">
                            <div style="width: 36%; font-weight: bold; overflow-wrap: break-word; position: relative; left: 10px;">${index + 1}. ${product.productName || ''}</div>
                            <div style="width: 18%; text-align: center;">${product.returnQuantity || 0}</div>
                            <div style="width: 15%; text-align: right;">${parseFloat(product.salePrice).toFixed(2)}</div>
                            <div style="width: 25%; text-align: right; position: relative; left: 5px;">${parseFloat(product.totalAmount).toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="summary-section" style="display: flex; justify-content: flex-end; font-size: 13px;">
                    <div style="width: 72%;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Subtotal:</span>
                            <span style="position: relative; left: -10px;">Rs${(returnItem.productsreturn.reduce((sum, product) => 
                                sum + (parseFloat(product.totalAmount) || 0), 0)).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 2px; margin: 2px 0 1px 0; font-weight: bold; font-size: 15px;">
                            <span>TOTAL:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(returnItem.grandTotal).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px; margin-top: 1px;">
                            <span style="font-weight: bold;">Paid:</span>
                            <span style="position: relative; left: -10px;">Rs${(parseFloat(returnItem.grandTotal) - parseFloat(returnItem.dueAmount)).toFixed(2)}</span>
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
                    <p style="margin: 2px 0;">Printed: ${new Date().toLocaleString()}</p>
                    <p style="margin: 6px 0; font-weight: 800; font-size: 12px;">Thanks For Choosing Kashaf-Noor Libas</p>
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
async function viewReturnDetails(salesReturnId) {
    showLoading(true);
    try {
        const returnItem = salesReturns.find(p => p.salesReturnId === salesReturnId);
        if (!returnItem) {
            throw new Error('Sales return not found');
        }
        
        document.getElementById('modalReturnBillNo').textContent = returnItem.returnBillNo;
        document.getElementById('modalDate').textContent = formatDate(returnItem.date);
        document.getElementById('modalCustomer').textContent = returnItem.customerName;
        document.getElementById('modalPhoneNumber').textContent = returnItem.customerPhone || '';
        document.getElementById('modalComments').textContent = returnItem.comments || '';
        
        const tbody = document.getElementById('modalProductsList');
        tbody.innerHTML = returnItem.productsreturn.map(product => `
            <tr>
                <td>${product.productCode || ''}</td>
                <td>${product.productName || ''}</td>
                <td>${formatCurrency(product.salePrice)}</td>
                <td>${product.returnQuantity || 0}</td>
                <td>${formatCurrency(product.totalAmount)}</td>
            </tr>
        `).join('');
        
        document.getElementById('modalGrandTotal').textContent = formatCurrency(returnItem.grandTotal);
        document.getElementById('modalDueAmount').textContent = formatCurrency(returnItem.dueAmount);
        document.getElementById('modalPaidAmount').textContent = formatCurrency(returnItem.paidAmount);
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
    filteredReturns = salesReturns.filter(returnItem => 
        returnItem.returnBillNo.toLowerCase().includes(searchTerm) ||
        returnItem.customerName.toLowerCase().includes(searchTerm) ||
        (returnItem.originalInvoiceNo && returnItem.originalInvoiceNo.toLowerCase().includes(searchTerm))
    );
    currentPage = 1;
    displaySalesReturns();
}

// Date filter functionality
function handleDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }
    
    filteredReturns = salesReturns.filter(returnItem => {
        const returnDate = returnItem.date.split('T')[0];
        return returnDate >= startDate && returnDate <= endDate;
    });
    
    currentPage = 1;
    displaySalesReturns();
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    filteredReturns = [...salesReturns];
    currentPage = 1;
    displaySalesReturns();
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
    displaySalesReturns();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Confirm delete
function confirmDelete(returnBillNo) {
    // Find the sales return object using returnBillNo
    const returnItem = salesReturns.find(p => p.returnBillNo === returnBillNo);
    
    if (!returnItem) {
        showNotification('Sales return not found', 'error');
        return;
    }
    
    document.getElementById('deleteConfirmModal').style.display = 'block';
    // Pass the salesReturnId to the deleteReturn function
    document.getElementById('confirmDeleteBtn').onclick = () => deleteReturn(returnItem.salesReturnId);
}

// Delete sales return
async function deleteReturn(salesReturnId) {
    showLoading(true);
    try {
        const result = await window.api.deleteSalesReturn(salesReturnId);
        if (result.success) {
            // After successful deletion, update the arrays
            salesReturns = salesReturns.filter(p => p.salesReturnId !== salesReturnId);
            filteredReturns = filteredReturns.filter(p => p.salesReturnId !== salesReturnId);
            
            displaySalesReturns();
            document.getElementById('deleteConfirmModal').style.display = 'none';
            showNotification('Sales return deleted successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to delete sales return');
        }
    } catch (error) {
        console.error('Error deleting sales return:', error);
        showNotification(error.message || 'Error deleting sales return', 'error');
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