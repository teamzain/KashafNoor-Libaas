// Global variables
let sales = [];
let currentPage = 1;
const itemsPerPage = 10;
let filteredSales = [];

// Initialize the display
document.addEventListener('DOMContentLoaded', initializeDisplay);

async function initializeDisplay() {
    try {
        await fetchSales();
        await preloadLogo();
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing display:', error);
        showNotification('Error loading sales', 'error');
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
            document.getElementById('saleDetailsModal').style.display = 'none';
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

// Debug helper function
function debugSales() {
    console.log('Current sales array:', JSON.stringify(sales, null, 2));
    console.log('Sales array length:', sales.length);
    
    // Check the invoice numbers in the array
    if (sales.length > 0) {
        console.log('Available invoice numbers:', sales.map(s => s.invoiceNumber));
    }
    
    // Check what properties are available on the first sale object
    if (sales.length > 0) {
        console.log('First sale object keys:', Object.keys(sales[0]));
        console.log('First sale object:', sales[0]);
    }
}

// Fetch sales from API
async function fetchSales() {
    showLoading(true);
    try {
        const response = await window.api.getAllSales();
        console.log('API Response:', response);
        
        if (!Array.isArray(response)) {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format');
        }
        
        // Log the raw response to see exactly what we're getting
        console.log('Raw first sale from API:', response.length > 0 ? response[0] : 'No sales');
        
        // Check for non-string invoice numbers
        const nonStringInvoices = response.filter(sale => sale.invoiceNumber !== undefined && typeof sale.invoiceNumber !== 'string');
        if (nonStringInvoices.length > 0) {
            console.warn('Found sales with non-string invoice numbers:', nonStringInvoices);
        }
        
        sales = response.map(sale => ({
            ...sale,
            // Ensure invoiceNumber is always a string
            invoiceNumber: sale.invoiceNumber ? String(sale.invoiceNumber) : '',
            grandTotal: Number(sale.grandTotal || 0),
            paidAmount: Number(sale.paidAmount || 0),
            dueAmount: Number(sale.dueAmount || 0),
            taxAmount: Number(sale.taxAmount || 0),
            discount: Number(sale.discount || 0),
            products: Array.isArray(sale.products) ? sale.products.map(product => ({
                ...product,
                salePrice: product.rate || 0,
                totalAmount: product.total || 0
            })) : []
        }));
        
        // Debug the processed sales array
        debugSales();
        
        filteredSales = [...sales];
        displaySales();
    } catch (error) {
        console.error('Error fetching sales:', error);
        showNotification('Error fetching sales', 'error');
    } finally {
        showLoading(false);
    }
}

// Helper function to find a sale by invoice number with robust comparison
// Helper function to find a sale by invoice number with robust comparison
function findSaleByInvoiceNumber(invoiceNumber) {
    if (!invoiceNumber) {
        return null;
    }
    
    // Try exact match first
    let sale = sales.find(s => s.invoiceNumber === invoiceNumber);
    
    // If not found and the invoiceNumber is a string, try case-insensitive match
    if (!sale && typeof invoiceNumber === 'string') {
        const normalizedInvoice = invoiceNumber.trim().toLowerCase();
        sale = sales.find(s => 
            typeof s.invoiceNumber === 'string' && 
            s.invoiceNumber.trim().toLowerCase() === normalizedInvoice
        );
    }
    
    return sale;
}

// Display sales with pagination
function displaySales() {
    const tbody = document.getElementById('salesList');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSales = filteredSales.slice(startIndex, endIndex);
    
    if (paginatedSales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="no-data">No sales found</td>
            </tr>
        `;
        return;
    }

    paginatedSales.forEach(sale => {
        const row = document.createElement('tr');
        const status = getPaymentStatus(
            Number(sale.paidAmount || 0), 
            Number(sale.grandTotal || 0)
        );
        
        row.innerHTML = `
            <td>${formatDate(sale.date || '')}</td>
            <td>${sale.invoiceNumber || ''}</td>
            <td>${sale.customerName || ''}</td>
            <td>${sale.paymentMethod || ''}</td>
            <td>${formatCurrency(sale.grandTotal)}</td>
            <td>${formatCurrency(sale.paidAmount)}</td>
            <td>${formatCurrency(Number(sale.grandTotal || 0) - Number(sale.paidAmount || 0))}</td>
            <td><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-icon btn-secondary" onclick="viewSaleDetails('${sale.invoiceNumber}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-icon btn-primary" onclick="printSaleReceipt('${sale.invoiceNumber}')">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="confirmDelete('${sale.invoiceNumber}')">
                        <i class="fas fa-trash"></i>
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

function printSaleReceipt(invoiceNumber) {
    return new Promise((resolve) => {
        const sale = findSaleByInvoiceNumber(invoiceNumber);
        if (!sale) {
            showNotification('Sale not found', 'error');
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
        const formattedDate = formatDateCompact(new Date(sale.date).toLocaleDateString());
        
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
                <title>Sale Receipt - ${sale.invoiceNumber}</title>
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
                                     
                    <p style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; text-decoration: underline;">SALE RECEIPT</p>
                </div>
                
                <div style="font-size: 13px; margin: 10px 0;">
                    <div style="display: flex; flex-wrap: wrap;">
                        <div style="width: 45%;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: bold; margin-right: 2px;">Invoice #:</span>
                                <span>${sale.invoiceNumber}</span>
                            </div>
                        </div>
                        <div style="width: 55%;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: bold; margin-right: 2px;">Customer:</span>
                                <span>${sale.customerName}</span>
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
                                <span style="font-weight: bold; margin-right: 2px;">Payment:</span>
                                <span>${sale.paymentMethod}</span>
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
                    
                    ${sale.products.map((product, index) => `
                        <div class="product-item" style="display: flex; align-items: center; font-size: 13px; margin: 3px 0;">
                            <div style="width: 36%; font-weight: bold; overflow-wrap: break-word; position: relative; left: 10px;">${index + 1}. ${product.productName || ''}</div>
                            <div style="width: 18%; text-align: center;">${product.quantity || 0}</div>
                            <div style="width: 15%; text-align: right;">${parseFloat(product.salePrice || product.rate).toFixed(2)}</div>
                            <div style="width: 25%; text-align: right; position: relative; left: 5px;">${parseFloat(product.totalAmount || product.total).toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="summary-section" style="display: flex; justify-content: flex-end; font-size: 13px;">
                    <div style="width: 72%;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Subtotal:</span>
                            <span style="position: relative; left: -10px;">Rs${(sale.products.reduce((sum, product) => 
                                sum + (parseFloat(product.totalAmount || product.total) || 0), 0)).toFixed(2)}</span>
                        </div>
                        
                        ${(sale.taxAmount && sale.taxAmount > 0) ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Tax ${sale.taxType === 'percentage' ? '(' + sale.taxAmount + '%)' : ''}:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(sale.taxAmount || 0).toFixed(2)}</span>
                        </div>` : ''}
                        
                        ${(sale.discount && sale.discount > 0) ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Discount ${sale.discountType === 'percentage' ? '(' + sale.discount + '%)' : ''}:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(sale.discount || 0).toFixed(2)}</span>
                        </div>` : ''}
                        
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 2px; margin: 2px 0 1px 0; font-weight: bold; font-size: 15px;">
                            <span>TOTAL:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(sale.grandTotal).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px; margin-top: 1px;">
                            <span style="font-weight: bold;">Paid:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(sale.paidAmount).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: bold;">Due:</span>
                            <span style="position: relative; left: -10px;">Rs${(parseFloat(sale.grandTotal) - parseFloat(sale.paidAmount)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                ${sale.comments ? `
                    <div style="font-size: 13px; border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
                        <div style="font-weight: bold;">Comments:</div>
                        <div style="margin-top: 3px;">${sale.comments}</div>
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
async function viewSaleDetails(invoiceNumber) {
    showLoading(true);
    try {
        console.log('Looking for invoice number:', invoiceNumber);
        console.log('Current sales array length:', sales.length);
        
        // Check if we have any sales with the given invoice number
        const matchingSales = sales.filter(s => s.invoiceNumber === invoiceNumber);
        console.log('Matching sales count:', matchingSales.length);
        
        if (matchingSales.length > 0) {
            console.log('Matched sale:', matchingSales[0]);
        } else {
            // Log the first few characters of each invoice number to check for whitespace issues
            console.log('Available invoice numbers (with details):', 
                sales.map(s => ({ 
                    invoice: s.invoiceNumber, 
                    length: typeof s.invoiceNumber === 'string' ? s.invoiceNumber.length : 'not a string',
                    firstChars: typeof s.invoiceNumber === 'string' ? 
                                JSON.stringify(s.invoiceNumber.slice(0, 3)) : 
                                `type: ${typeof s.invoiceNumber}`
                }))
            );
        }
        
        const sale = findSaleByInvoiceNumber(invoiceNumber);
        if (!sale) {
            throw new Error('Sale not found');
        }
        
        document.getElementById('modalInvoiceNo').textContent = sale.invoiceNumber;
        document.getElementById('modalDate').textContent = formatDate(sale.date);
        document.getElementById('modalCustomer').textContent = sale.customerName;
        document.getElementById('modalPhoneNumber').textContent = sale.customerPhone;
        document.getElementById('modalPaymentMethod').textContent = sale.paymentMethod;
        
        const tbody = document.getElementById('modalProductsList');
        tbody.innerHTML = sale.products.map(product => `
            <tr>
                <td>${product.productCode || ''}</td>
                <td>${product.productName || ''}</td>
                <td>${formatCurrency(product.salePrice || product.rate)}</td>
                <td>${product.quantity || 0}</td>
                <td>${formatCurrency(product.totalAmount || product.total)}</td>
            </tr>
        `).join('');
        
        // Calculate the subtotal using the appropriate property
        const subTotal = sale.products.reduce((sum, product) => 
            sum + (parseFloat(product.totalAmount || product.total) || 0), 0);
        document.getElementById('modalSubTotal').textContent = formatCurrency(subTotal);
        document.getElementById('modalPaidAmount').textContent = formatCurrency(sale.paidAmount || 0);
        document.getElementById('modalDiscount').textContent = formatCurrency(sale.discount || 0);
        document.getElementById('modalGrandTotal').textContent = formatCurrency(sale.grandTotal);
        
        document.getElementById('saleDetailsModal').style.display = 'block';
    } catch (error) {
        console.error('Error viewing sale details:', error);
        showNotification('Error loading sale details', 'error');
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

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    filteredSales = sales.filter(sale => 
        (sale.invoiceNumber && sale.invoiceNumber.toLowerCase().includes(searchTerm)) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm))
    );
    currentPage = 1;
    displaySales();
}

// Date filter functionality
function handleDateFilter() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showNotification('Please select both start and end dates', 'error');
        return;
    }
    
    filteredSales = sales.filter(sale => {
        if (!sale.date) return false;
        const saleDate = sale.date.split('T')[0];
        return saleDate >= startDate && saleDate <= endDate;
    });
    
    currentPage = 1;
    displaySales();
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    filteredSales = [...sales];
    currentPage = 1;
    displaySales();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
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
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displaySales();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Confirm delete
function confirmDelete(invoiceNumber) {
    document.getElementById('deleteConfirmModal').style.display = 'block';
    document.getElementById('confirmDeleteBtn').onclick = () => deleteSale(invoiceNumber);
}

// Delete sale
async function deleteSale(invoiceNumber) {
    showLoading(true);
    try {
        const result = await window.api.deleteSale(invoiceNumber);
        if (result.success) {
            sales = sales.filter(s => s.invoiceNumber !== invoiceNumber);
            filteredSales = filteredSales.filter(s => s.invoiceNumber !== invoiceNumber);
            
            displaySales();
            document.getElementById('deleteConfirmModal').style.display = 'none';
            showNotification('Sale deleted successfully', 'success');
        } else {
            throw new Error(result.message || 'Failed to delete sale');
        }
    } catch (error) {
        console.error('Error deleting sale:', error);
        showNotification(error.message || 'Error deleting sale', 'error');
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