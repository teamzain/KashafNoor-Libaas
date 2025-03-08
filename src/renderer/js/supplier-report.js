// Global variables
let allSuppliers = [];
let reportData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;

// Function to close the transaction modal
function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
}

// Initialize the report page
async function initializeReport() {
    try {
        // Set default dates
        setDateToToday('toDate');
        setDateRangeByShortcut('month'); // Default to this month

        // Load suppliers for autocomplete
        await loadSuppliers();

        // Initialize event listeners
        initializeEventListeners();

        // Generate initial report (empty until filters are applied)
        updateReportView();
    } catch (error) {
        console.error('Error initializing report:', error);
        showNotification('Error initializing report', 'error');
    }
}

// Load all suppliers for autocomplete
async function loadSuppliers() {
    try {
        allSuppliers = await window.api.getSuppliers();
        console.log('Loaded suppliers:', allSuppliers);
    } catch (error) {
        console.error('Error loading suppliers:', error);
        allSuppliers = []; // Fallback to empty array
    }
}

// Initialize all event listeners
function initializeEventListeners() {
    // Date range shortcuts
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const range = this.dataset.range;
            setDateRangeByShortcut(range);
            
            // Update active state for buttons
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Generate report button
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
    
    // Table search
    document.getElementById('tableSearch').addEventListener('input', filterReportTable);
    
    // Export buttons
    document.getElementById('printBtn').addEventListener('click', printReport);
    document.getElementById('exportCsvBtn').addEventListener('click', exportReportToCsv);
    document.getElementById('exportPdfBtn').addEventListener('click', exportReportToPdf);
    
    // Pagination controls
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    
    // Supplier search with autocomplete
    const supplierSearch = document.getElementById('supplierSearch');
    supplierSearch.addEventListener('input', showSupplierSuggestions);
    supplierSearch.addEventListener('focus', function() {
        if (this.value.length > 0) {
            showSupplierSuggestions({ target: this });
        }
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!supplierSearch.contains(e.target)) {
            document.getElementById('supplierSuggestions').style.display = 'none';
        }
    });
    
    // Transaction modal controls
    document.querySelector('#transactionModal .close-btn').addEventListener('click', closeTransactionModal);
    document.getElementById('modalCloseBtn').addEventListener('click', closeTransactionModal);
    document.getElementById('printInvoiceBtn').addEventListener('click', printInvoice);
    
    // Date inputs validation
    document.getElementById('fromDate').addEventListener('change', validateDateRange);
    document.getElementById('toDate').addEventListener('change', validateDateRange);
}

// Supplier autocomplete functions
function showSupplierSuggestions(e) {
    const input = e.target.value.toLowerCase();
    const suggestionsContainer = document.getElementById('supplierSuggestions');
    
    if (input.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    const matches = allSuppliers.filter(supplier => 
        supplier.supplier_name.toLowerCase().includes(input)
    );
    
    if (matches.length > 0) {
        suggestionsContainer.innerHTML = matches
            .slice(0, 10) // Limit to 10 suggestions
            .map(supplier => 
                `<div class="suggestion-item" data-id="${supplier.id}">${supplier.supplier_name}</div>`
            )
            .join('');
        
        // Add click listeners to suggestions
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                document.getElementById('supplierSearch').value = this.textContent;
                suggestionsContainer.style.display = 'none';
            });
        });
        
        suggestionsContainer.style.display = 'block';
    } else {
        suggestionsContainer.style.display = 'none';
    }
}

// Validate date range
function validateDateRange() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
        showNotification('From date cannot be later than to date', 'error');
        document.getElementById('fromDate').value = toDate;
    }
}

// Set date range by shortcut
function setDateRangeByShortcut(range) {
    const today = new Date();
    let fromDate = new Date(today);
    
    switch (range) {
        case 'today':
            // Both dates set to today
            setDateToToday('fromDate');
            setDateToToday('toDate');
            break;
            
        case 'yesterday':
            fromDate.setDate(today.getDate() - 1);
            document.getElementById('fromDate').valueAsDate = fromDate;
            document.getElementById('toDate').valueAsDate = fromDate;
            break;
            
        case 'week':
            // Start of current week (Sunday)
            const dayOfWeek = today.getDay();
            fromDate.setDate(today.getDate() - dayOfWeek);
            document.getElementById('fromDate').valueAsDate = fromDate;
            setDateToToday('toDate');
            break;
            
        case 'month':
            // Start of current month
            fromDate.setDate(1);
            document.getElementById('fromDate').valueAsDate = fromDate;
            setDateToToday('toDate');
            break;
            
        case 'year':
            // Start of current year
            fromDate.setMonth(0, 1);
            document.getElementById('fromDate').valueAsDate = fromDate;
            setDateToToday('toDate');
            break;
    }
}

// Helper to set a date input to today
function setDateToToday(inputId) {
    document.getElementById(inputId).valueAsDate = new Date();
}

async function generateReport() {
    const supplierName = document.getElementById('supplierSearch').value;
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    if (!fromDate || !toDate) {
        showNotification('Please select both from and to dates', 'error');
        return;
    }
    
    showLoadingSpinner();
    
    try {
        const params = {
            supplierName: supplierName || null,
            fromDate,
            toDate
        };
        
        // Get both purchases and returns
        const [purchases, returns] = await Promise.all([
            window.api.getSupplierTransactions(params),
            window.api.getPurchaseReturnsByDateRange(params)
        ]);
        
        // Format returns data to match transaction structure
        const formattedReturns = returns.map(ret => ({
            invoiceNumber: ret.purchaseReturnId || ret.returnBillNo,
            billNo: ret.returnBillNo,
            date: ret.date,
            supplierName: ret.supplierName,
            transactionType: 'Return',
            paymentMethod: ret.paymentMethod || 'Return Payment',
            products: ret.productsreturn,
            total: ret.grandTotal,
            paid: ret.grandTotal - ret.dueAmount,
            receiveamount: ret.receiveamount || 0,
            balance: ret.dueAmount,
            comments: ret.comments,
            purchaseReturnId: ret.purchaseReturnId
        }));
        
        // Combine and sort by date
        reportData = [...purchases, ...formattedReturns].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        filteredData = [...reportData];
        currentPage = 1;
        
        // First ensure we have all the summary elements
        createSummaryElementsIfNeeded();
        
        // Update table and summary data
        updateReportView();
        updateSummaryData();
        
        if (reportData.length === 0) {
            showNotification('No data found for the selected criteria', 'info');
        } else {
            showNotification(`${reportData.length} transactions found`, 'success');
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Error generating report', 'error');
    } finally {
        hideLoadingSpinner();
    }
}
function createSummaryElementsIfNeeded() {
    const summarySection = document.querySelector('.report-summary');
    if (!summarySection) {
        console.error('Summary section not found in DOM');
        return;
    }
    
    // Clear existing summary items
    summarySection.innerHTML = '';
    
    // Create all summary items with default values
    const summaryItems = [
        { id: 'totalTransactions', label: 'Total Transactions', defaultValue: '0', isCurrency: false },
        { id: 'totalPurchases', label: 'Total Purchases', defaultValue: 'Rs 0.00', isCurrency: true },
        { id: 'totalPurchaseDue', label: 'Total Purchase Due', defaultValue: 'Rs 0.00', isCurrency: true },
        { id: 'totalReturns', label: 'Total Return Amount', defaultValue: 'Rs 0.00', isCurrency: true, hidden: false },
        { id: 'totalReturnDue', label: 'Total Return Due', defaultValue: 'Rs 0.00', isCurrency: true, hidden: false },
        { id: 'totalPaidAmount', label: 'Total Purchase Paid Amount', defaultValue: 'Rs 0.00', isCurrency: true },
        { id: 'totalReceiveAmount', label: 'Total Receive Amount', defaultValue: 'Rs 0.00', isCurrency: true }
    ];
    
    // Add each summary item to the DOM
    summaryItems.forEach(item => {
        const summaryItemDiv = document.createElement('div');
        summaryItemDiv.className = 'summary-item';
        if (item.hidden) {
            summaryItemDiv.setAttribute('hidden', 'hidden');
        }
        
        const labelDiv = document.createElement('div');
        labelDiv.className = 'summary-label';
        labelDiv.textContent = item.label;
        
        const valueDiv = document.createElement('div');
        valueDiv.className = 'summary-value';
        valueDiv.id = item.id;
        valueDiv.textContent = item.defaultValue;
        
        summaryItemDiv.appendChild(labelDiv);
        summaryItemDiv.appendChild(valueDiv);
        summarySection.appendChild(summaryItemDiv);
    });
}

// Update the print and export functions to use the proper getElementText helper
function getElementText(id, defaultValue) {
    const element = document.getElementById(id);
    if (!element) {
        // If element doesn't exist, return formatted default value
        if (typeof defaultValue === 'number') {
            return formatCurrency(defaultValue);
        }
        return defaultValue;
    }
    return element.textContent;
}

// Initialize the page with the modified function
document.addEventListener('DOMContentLoaded', function() {
    initializeReport();
    
    // Check if summary elements exist, create them if needed
    setTimeout(() => {
        if (!document.getElementById('totalTransactions')) {
            createSummaryElementsIfNeeded();
        }
    }, 500);
});

function resetFilters() {
    document.getElementById('supplierSearch').value = '';
    setDateToToday('toDate');
    setDateRangeByShortcut('month');
    
    // Reset active button
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.range === 'month') {
            btn.classList.add('active');
        }
    });
    
    // Clear the report data
    reportData = [];
    filteredData = [];
    updateReportView();
    updateSummaryData();
    
}



// Update the table footer function to account for new columns
function updateTableFooter() {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalReceiveAmount = 0;
    let totalBalance = 0;
    
    filteredData.forEach(item => {
        totalAmount += parseFloat(item.total) || 0;
        totalPaid += parseFloat(item.paid) || 0;
        totalReceiveAmount += parseFloat(item.receiveamount) || 0;
        totalBalance += parseFloat(item.balance) || 0;
    });
    
    const tfoot = document.querySelector('.report-table tfoot');
    if (tfoot) {
        tfoot.innerHTML = `
            <tr>
                <td colspan="7" class="text-right"><strong>Totals:</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalAmount)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalPaid)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalReceiveAmount)}</strong></td>
                <td class="text-right"><strong>${formatCurrency(totalBalance)}</strong></td>
                <td></td>
            </tr>
        `;
    }
}

// Update the filterReportTable function to include type in search
function filterReportTable() {
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    
    if (searchTerm.length < 1) {
        filteredData = [...reportData];
    } else {
        filteredData = reportData.filter(item => 
            item.invoiceNumber.toLowerCase().includes(searchTerm) ||
            (item.billNo && item.billNo.toLowerCase().includes(searchTerm)) ||
            item.supplierName.toLowerCase().includes(searchTerm) ||
            item.paymentMethod.toLowerCase().includes(searchTerm) ||
            (item.transactionType && item.transactionType.toLowerCase().includes(searchTerm))
        );
    }
    
    currentPage = 1;
    updateReportView();
}

// Update the table header HTML structure
const tableHTML = `
<table class="report-table">
    <thead>
        <tr>
            <th>Invoice #</th>
            <th>Bill No</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Type</th>
            <th>Payment Method</th>
            <th>Items</th>
            <th class="text-right">Total</th>
            <th class="text-right">Paid</th>
            <th class="text-right">Balance</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody id="reportData">
    </tbody>
    <tfoot>
    </tfoot>
</table>
`;

// Update the print and export functions to include new columns
function exportReportToCsv() {
    if (filteredData.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    const headers = ['Invoice #', 'Bill No', 'Date', 'Supplier', 'Type', 'Payment Method', 'Items', 'Total', 'Paid', 'Receive Amount', 'Balance'];
    
    let csvContent = headers.join(',') + '\n';
    
    filteredData.forEach(item => {
        const row = [
        `"${item.transactionType === 'Return' ? (item.purchaseReturnId || item.invoiceNumber) : item.invoiceNumber}"`,
        `"${item.billNo || item.invoiceNumber}"`,
            `"${formatDate(item.date)}"`,
            `"${item.supplierName}"`,
            `"${item.transactionType || 'Purchase'}"`,
            `"${item.paymentMethod}"`,
            item.products ? item.products.length : 0,
            item.total,
            item.paid,
            item.receiveamount || 0,
            item.balance
        ];
        csvContent += row.join(',') + '\n';
    });
    
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `supplier_report_${formatDateForFilename(new Date())}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
}
// Add CSS styles for alignment
const styles = `
<style>
    .text-right {
        text-align: right !important;
    }
    .text-center {
        text-align: center !important;
    }
    .report-table th, .report-table td {
        padding: 8px;
    }
    .report-table tfoot td {
        border-top: 2px solid #dee2e6;
        font-weight: bold;
    }
</style>
`;
function formatCurrency(value) {
    // Convert value to a number and handle invalid inputs
    const amount = parseFloat(value) || 0;
    
    // Format number to standard number format with commas
    const formatted = Math.abs(amount).toLocaleString('en', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
    
    if (amount < 0) {
        return `(-Rs ${formatted}) 💰`; // Added money bag emoji for amounts supplier needs to give
    }
    return `Rs ${formatted}`;
}

function updateSummaryData() {
    // Set up counters for all metrics
    let totalTransactions = filteredData.length;
    let totalPurchases = 0;
    let totalReturns = 0;
    let totalPurchaseDue = 0;
    let totalReturnDue = 0;
    let totalPaidAmount = 0;
    let totalReceiveAmount = 0;
    
    // Calculate metrics from filtered data
    filteredData.forEach(item => {
        if (item.transactionType === 'Return') {
            // Handle return transactions
            totalReturns += parseFloat(item.total) || 0;
            totalReturnDue += parseFloat(item.balance) || 0;
            // Do NOT add return payments to totalPaidAmount
        } else {
            // Handle purchase transactions
            totalPurchases += parseFloat(item.total) || 0;
            totalPurchaseDue += parseFloat(item.balance) || 0;
            // Only add purchase payments to totalPaidAmount
            totalPaidAmount += parseFloat(item.paid) || 0;
        }
        
        // Calculate receive amount for all transactions
        totalReceiveAmount += parseFloat(item.receiveamount) || 0;
    });
    
    // Calculate net dues
    const totalDueAmount = totalPurchaseDue - totalReturnDue;
    
    // Update summary display elements
    const updateElement = (id, value, formatAsCurrency = true) => {
        const element = document.getElementById(id);
        if (element) {
            if (typeof value === 'number' && formatAsCurrency) {
                element.textContent = formatCurrency(value);
            } else {
                element.textContent = value;
            }
        }
    };
    
    // Update transaction count without currency formatting
    updateElement('totalTransactions', totalTransactions, false);
    
    // Update monetary values with currency formatting
    updateElement('totalPurchases', totalPurchases);
    updateElement('totalReturns', totalReturns);
    updateElement('totalPurchaseDue', totalPurchaseDue);
    updateElement('totalReturnDue', totalReturnDue);
    updateElement('totalPaidAmount', totalPaidAmount);
    updateElement('totalReceiveAmount', totalReceiveAmount);
    updateElement('totalDueAmount', totalDueAmount);
    
    // Add visual styling for due amounts
    const dueAmountElement = document.getElementById('totalDueAmount');
    if (dueAmountElement) {
        if (totalDueAmount < 0) {
            dueAmountElement.classList.add('supplier-owes');
            dueAmountElement.title = 'Supplier has balance to give';
        } else {
            dueAmountElement.classList.remove('supplier-owes');
            dueAmountElement.title = '';
        }
    }
}
// Add CSS styles for the supplier-owes class
const styles2 = document.createElement('style');
styles2.textContent = `
    .supplier-owes {
        color: #2e7d32;
        background-color: #e8f5e9;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px dashed #2e7d32;
        position: relative;
    }

    .supplier-owes::after {
        content: "Supplier has balance to give";
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        background-color: #e8f5e9;
        padding: 2px 6px;
        border-radius: 3px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s;
    }

    .supplier-owes:hover::after {
        opacity: 1;
    }

    .total-due {
        position: relative;
    }

    .total-due.negative {
        background-color: #e8f5e9;
        border: 2px solid #2e7d32;
    }
`;

document.head.appendChild(styles2);

document.querySelector('.report-table thead tr').innerHTML = `
      <th>Invoice #</th>
            <th>Bill No</th>
            <th>Date</th>
            <th>Supplier</th>
            <th>Type</th>
            <th>Payment Method</th>
            <th>Items</th>
            <th class="text-right">Total</th>
            <th class="text-right">Paid</th>
            <th class="text-right">Balance</th>
            <th>Actions</th>
`;

// Update the viewTransactionDetails function to handle return products correctly
// Make sure this function is updated to include the receiveamount field
// Update the viewTransactionDetails function to handle return products correctly
function viewTransactionDetails(invoiceNumber, transactionType) {
    showLoadingSpinner();
    
    try {
        console.log("Looking for:", invoiceNumber, transactionType);
        console.log("Available data:", filteredData);
        
        let transaction;
        
        if (transactionType === 'Return') {
            // For return transactions, first try to find by purchaseReturnId
            transaction = filteredData.find(t => 
                (t.purchaseReturnId && t.purchaseReturnId.toString() === invoiceNumber.toString()) || 
                (t.invoiceNumber && t.invoiceNumber.toString() === invoiceNumber.toString() && 
                 t.transactionType === 'Return')
            );
        } else {
            // For normal purchases, find by invoiceNumber
            transaction = filteredData.find(t => 
                t.invoiceNumber && t.invoiceNumber.toString() === invoiceNumber.toString()
            );
        }
        
        if (!transaction) {
            console.error('Transaction not found with:', invoiceNumber, transactionType);
            showNotification('Transaction details not found', 'error');
            hideLoadingSpinner();
            return;
        }
        
        // Define setModalContent function
        const setModalContent = (elementId, value, defaultValue = 'N/A') => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value || defaultValue;
            }
        };
        
        // For returns, display the purchaseReturnId in the modal
        if (transaction.transactionType === 'Return') {
            setModalContent('modalInvoiceNumber', transaction.purchaseReturnId || transaction.invoiceNumber);
        } else {
            setModalContent('modalInvoiceNumber', transaction.invoiceNumber);
        }
        setModalContent('modalDate', formatDate(transaction.date));
        setModalContent('modalSupplier', transaction.supplierName);
        setModalContent('modalType', transaction.transactionType || 'Purchase');
        setModalContent('modalPaymentMethod', transaction.paymentMethod);
        setModalContent('modalStatus', transaction.paymentStatus);

        const productsList = document.getElementById('modalProductsList');
        if (productsList) {
            if (transaction.transactionType === 'Return') {
                // Handle return products
                const returnProducts = transaction.products || transaction.productsreturn || [];
                productsList.innerHTML = returnProducts.map((product, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${product.productName || 'N/A'}</td>
                        <td>${formatCurrency(product.costPrice || 0)}</td>
                        <td>${product.returnquantity || 0}</td>
                        <td class="text-right">${formatCurrency(product.totalAmount || 0)}</td>
                    </tr>
                `).join('');
            } else {
                // Handle regular purchase products
                const products = transaction.products || [];
                productsList.innerHTML = products.map((product, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${product.productName || 'N/A'}</td>
                        <td>${formatCurrency(product.costPrice || 0)}</td>
                        <td>${product.purchasePack || 0}</td>
                        <td class="text-right">${formatCurrency(product.totalAmount || 0)}</td>
                    </tr>
                `).join('');
            }

            if (!productsList.innerHTML) {
                productsList.innerHTML = '<tr><td colspan="5">No products found</td></tr>';
            }
        }
            
        // Update summary values
        setModalContent('modalGrandTotal', formatCurrency(parseFloat(transaction.total) || 0));
        setModalContent('modalTaxAmount', formatCurrency(parseFloat(transaction.taxAmount) || 0));
        setModalContent('modalPaidAmount', formatCurrency(parseFloat(transaction.paid) || 0));
        setModalContent('modalReceiveAmount', formatCurrency(parseFloat(transaction.receiveamount) || 0));
        setModalContent('modalBalance', formatCurrency(parseFloat(transaction.balance) || 0));
        
        // Show comments
        setModalContent('modalComments', transaction.comments, 'No comments added.');
        
        const modal = document.getElementById('transactionModal');
        if (modal) {
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error displaying transaction details:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Update table header to include receive amount column
document.querySelector('.report-table thead tr').innerHTML = `
    <th>Invoice #</th>
    <th>Bill No</th>
    <th>Date</th>
    <th>Supplier</th>
    <th>Type</th>
    <th>Payment Method</th>
    <th>Items</th>
    <th class="text-right">Total</th>
    <th class="text-right">Paid</th>
    <th class="text-right">Receive Amt</th>
    <th class="text-right">Balance</th>
    <th>Actions</th>
`;
// Function to change page sequentially
// Function to change page with logging
function changePage(increment) {
    console.log("Current page before change:", currentPage);
    console.log("Attempting to change by:", increment);
    
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    
    // Calculate new page number
    const newPage = currentPage + increment;
    console.log("Calculated new page:", newPage);
    
    // Validate new page number is within bounds
    if (newPage >= 1 && newPage <= totalPages) {
        // Directly set the current page
        currentPage = newPage;
        console.log("New page set to:", currentPage);
        
        // Update the view with the new page data
        updateReportView();
    } else {
        console.log("New page out of bounds, not changing");
    }
}

// Update the report view
function updateReportView() {
    console.log("Updating report view for page:", currentPage);
    
    const tbody = document.getElementById('reportData');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    console.log("Showing records from index", startIndex, "to", endIndex);
    console.log("Number of records to display:", paginatedData.length);
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center">No data found. Adjust your filters or generate a new report.</td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginatedData.map((item) => `
        <tr class="${item.transactionType === 'Return' ? 'return-row' : ''}">
            <td>${item.transactionType === 'Return' ? (item.purchaseReturnId || item.invoiceNumber) : item.invoiceNumber}</td>
            <td>${item.billNo || item.invoiceNumber}</td>
            <td>${formatDate(item.date)}</td>
            <td>${item.supplierName}</td>
            <td>${item.transactionType || 'Purchase'}</td>
            <td>${item.transactionType === 'Return' ? (item.paymentMethod || 'Return Payment') : item.paymentMethod}</td>
            <td class="text-center">${item.products ? item.products.length : 0}</td>
            <td class="text-right">${formatCurrency(item.total)}</td>
            <td class="text-right">${formatCurrency(item.paid)}</td>
            <td class="text-right">${formatCurrency(item.receiveamount)}</td>
            <td class="text-right">${formatCurrency(item.balance)}</td>
            <td>
                <button class="btn btn-sm action-btn" onclick="viewTransactionDetails('${item.transactionType === 'Return' ? (item.purchaseReturnId || item.invoiceNumber) : item.invoiceNumber}', '${item.transactionType || 'Purchase'}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
    }
    
    // Update table footer and pagination after data is rendered
    updateTableFooter();
    updatePaginationControls();
}

// Simpler pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    console.log("Total pages:", totalPages);
    
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    // Update page info text
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    console.log("Updated page info to:", pageInfo.textContent);
    
    // Update button states
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
    console.log("Prev button disabled:", prevBtn.disabled);
    console.log("Next button disabled:", nextBtn.disabled);
}

// Make sure event listeners are properly set
function resetPaginationListeners() {
    console.log("Resetting pagination listeners");
    
    // Remove any existing event listeners
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    prevBtn.replaceWith(prevBtn.cloneNode(true));
    nextBtn.replaceWith(nextBtn.cloneNode(true));
    
    // Add fresh event listeners
    document.getElementById('prevPage').addEventListener('click', function() {
        console.log("Prev button clicked");
        changePage(-1);
    });
    
    document.getElementById('nextPage').addEventListener('click', function() {
        console.log("Next button clicked");
        changePage(1);
    });
}

// Call this after page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize other things
    initializeReport();
    
    // Reset pagination listeners
    setTimeout(resetPaginationListeners, 1000);
});
function exportReportToPdf() {
    if (filteredData.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    // Make sure summary elements exist
    createSummaryElementsIfNeeded();
    
    const printWindow = window.open('', '_blank');
    
    // Calculate summary values directly for PDF export
    const totalPurchases = filteredData.filter(i => i.transactionType !== 'Return').reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const totalReturns = filteredData.filter(i => i.transactionType === 'Return').reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const totalPaidAmount = filteredData.filter(i => i.transactionType !== 'Return').reduce((sum, item) => sum + (parseFloat(item.paid) || 0), 0);
    const totalReceiveAmount = filteredData.reduce((sum, item) => sum + (parseFloat(item.receiveamount) || 0), 0);
    const totalPurchaseDue = filteredData.filter(i => i.transactionType !== 'Return').reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0);
    const totalReturnDue = filteredData.filter(i => i.transactionType === 'Return').reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0);
    
    // Create PDF-like content
    const printContent = `
        <html>
        <head>
            <title>Supplier Report - ${formatDate(new Date())}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; }
                h1 { text-align: center; color: #333; }
                .header { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .filters { margin-bottom: 20px; }
                .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
                .summary-item { padding: 15px; border: 1px solid #ddd; background: #f9f9f9; }
                .text-right { text-align: right; }
                .footer { margin-top: 30px; font-size: 12px; text-align: center; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Supplier Report</h1>
                <p>Generated on: ${formatDate(new Date())}</p>
            </div>
            
            <div class="filters">
                <p><strong>Supplier:</strong> ${document.getElementById('supplierSearch')?.value || 'All Suppliers'}</p>
                <p><strong>Date Range:</strong> ${document.getElementById('fromDate')?.value || ''} to ${document.getElementById('toDate')?.value || ''}</p>
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <h3>Total Transactions</h3>
                    <p>${filteredData.length}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Purchases</h3>
                    <p>${formatCurrency(totalPurchases)}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Returns</h3>
                    <p>${formatCurrency(totalReturns)}</p>
                </div>
                <div class="summary-item">
                    <h3>Purchase Due Amount</h3>
                    <p>${formatCurrency(totalPurchaseDue)}</p>
                </div>
                <div class="summary-item">
                    <h3>Return Due Amount</h3>
                    <p>${formatCurrency(totalReturnDue)}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Purchase Paid Amount</h3>
                    <p>${formatCurrency(totalPaidAmount)}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Receive Amount</h3>
                    <p>${formatCurrency(totalReceiveAmount)}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Invoice #</th>
                        <th>Bill No</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Type</th>
                        <th>Payment Method</th>
                        <th>Items</th>
                        <th class="text-right">Total</th>
                        <th class="text-right">Paid</th>
                        <th class="text-right">Receive Amt</th>
                        <th class="text-right">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                           <td>${item.invoiceNumber}</td>
                           <td>${item.transactionType === 'Return' && item.purchaseReturnId ? item.purchaseReturnId : (item.billNo || item.invoiceNumber)}</td>
                            <td>${formatDate(item.date)}</td>
                            <td>${item.supplierName}</td>
                            <td>${item.transactionType || 'Purchase'}</td>
                            <td>${item.paymentMethod}</td>
                            <td>${item.products ? item.products.length : 0}</td>
                            <td class="text-right">${formatCurrency(item.total)}</td>
                            <td class="text-right">${formatCurrency(item.paid)}</td>
                            <td class="text-right">${formatCurrency(item.receiveamount || 0)}</td>
                            <td class="text-right">${formatCurrency(item.balance)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="7" class="text-right"><strong>Totals:</strong></td>
                        <td class="text-right">${formatCurrency(filteredData.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0))}</td>
                        <td class="text-right">${formatCurrency(filteredData.filter(item => item.transactionType !== 'Return').reduce((sum, item) => sum + (parseFloat(item.paid) || 0), 0))}</td>
                        <td class="text-right">${formatCurrency(filteredData.reduce((sum, item) => sum + (parseFloat(item.receiveamount) || 0), 0))}</td>
                        <td class="text-right">${formatCurrency(filteredData.reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0))}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated from Supplier Report Module</p>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px;">Print PDF</button>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Notify user
    showNotification('PDF ready for printing', 'success');
}

// Print report
function printReport() {
    if (filteredData.length === 0) {
        showNotification('No data to print', 'error');
        return;
    }
    
    // Calculate summary values directly for printing
    const totalPurchases = filteredData.filter(i => i.transactionType !== 'Return').reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const totalReturns = filteredData.filter(i => i.transactionType === 'Return').reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const totalPaidAmount = filteredData.filter(i => i.transactionType !== 'Return').reduce((sum, item) => sum + (parseFloat(item.paid) || 0), 0);
    const totalReceiveAmount = filteredData.reduce((sum, item) => sum + (parseFloat(item.receiveamount) || 0), 0);
    const totalPurchaseDue = filteredData.filter(i => i.transactionType !== 'Return').reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0);
    const totalReturnDue = filteredData.filter(i => i.transactionType === 'Return').reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0);
    
    const printWindow = window.open('', '_blank');
    
    // Create print content
    const printContent = `
        <html>
        <head>
            <title>Supplier Report - ${formatDate(new Date())}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; }
                h1 { text-align: center; color: #333; }
                .header { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .filters { margin-bottom: 20px; }
                .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
                .summary-item { padding: 10px; border: 1px solid #ddd; background: #f9f9f9; }
                .text-right { text-align: right; }
                .footer { margin-top: 30px; font-size: 12px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Supplier Report</h1>
                <p>Generated on: ${formatDate(new Date())}</p>
            </div>
            
            <div class="filters">
                <p><strong>Supplier:</strong> ${document.getElementById('supplierSearch')?.value || 'All Suppliers'}</p>
                <p><strong>Date Range:</strong> ${document.getElementById('fromDate')?.value || ''} to ${document.getElementById('toDate')?.value || ''}</p>
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <h3>Total Transactions</h3>
                    <p>${filteredData.length}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Purchases</h3>
                    <p>${formatCurrency(totalPurchases)}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Returns</h3>
                    <p>${formatCurrency(totalReturns)}</p>
                </div>
                <div class="summary-item">
                    <h3>Purchase Due Amount</h3>
                    <p>${formatCurrency(totalPurchaseDue)}</p>
                </div>
                <div class="summary-item">
                    <h3>Return Due Amount</h3>
                    <p>${formatCurrency(totalReturnDue)}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Purchase Paid Amount</h3>
                    <p>${formatCurrency(totalPaidAmount)}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Receive Amount</h3>
                    <p>${formatCurrency(totalReceiveAmount)}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Invoice #</th>
                        <th>Bill No</th>
                        <th>Date</th>
                        <th>Supplier</th>
                        <th>Type</th>
                        <th>Payment Method</th>
                        <th>Items</th>
                        <th class="text-right">Total</th>
                        <th class="text-right">Paid</th>
                        <th class="text-right">Receive Amt</th>
                        <th class="text-right">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                           <td>${item.invoiceNumber}</td>
                           <td>${item.transactionType === 'Return' && item.purchaseReturnId ? item.purchaseReturnId : (item.billNo || item.invoiceNumber)}</td>
                            <td>${formatDate(item.date)}</td>
                            <td>${item.supplierName}</td>
                            <td>${item.transactionType || 'Purchase'}</td>
                            <td>${item.paymentMethod}</td>
                            <td>${item.products ? item.products.length : 0}</td>
                            <td class="text-right">${formatCurrency(item.total)}</td>
                            <td class="text-right">${formatCurrency(item.paid)}</td>
                            <td class="text-right">${formatCurrency(item.receiveamount || 0)}</td>
                            <td class="text-right">${formatCurrency(item.balance)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="7" class="text-right"><strong>Totals:</strong></td>
                        <td class="text-right">${formatCurrency(filteredData.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0))}</td>
                        <td class="text-right">${formatCurrency(filteredData.filter(item => item.transactionType !== 'Return').reduce((sum, item) => sum + (parseFloat(item.paid) || 0), 0))}</td>
                        <td class="text-right">${formatCurrency(filteredData.reduce((sum, item) => sum + (parseFloat(item.receiveamount) || 0), 0))}</td>
                        <td class="text-right">${formatCurrency(filteredData.reduce((sum, item) => sum + (parseFloat(item.balance) || 0), 0))}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated from Supplier Report Module</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Add delay to ensure content is loaded
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}
// Print invoice from modal
function printInvoice() {
    const invoiceNumber = document.getElementById('modalInvoiceNumber').textContent;
    const date = document.getElementById('modalDate').textContent;
    const supplierName = document.getElementById('modalSupplier').textContent;
    const type = document.getElementById('modalType') ? document.getElementById('modalType').textContent : 'Purchase';
    const paymentMethod = document.getElementById('modalPaymentMethod').textContent;
    const status = document.getElementById('modalStatus') ? document.getElementById('modalStatus').textContent : 'N/A';
    
    const printWindow = window.open('', '_blank');
    
    // Create print content
    const printContent = `
        <html>
        <head>
            <title>Invoice ${invoiceNumber}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; }
                .header { text-align: center; margin-bottom: 30px; }
                h1 { color: #333; }
                .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .invoice-details div { flex: 1; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { margin-left: auto; width: 40%; margin-top: 20px; }
                .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
                .total-row { font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; }
                .footer { margin-top: 40px; font-size: 12px; text-align: center; }
                .comments { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 10px; }
                .text-right { text-align: right; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Supplier Invoice</h1>
            </div>
            
            <div class="invoice-details">
                <div>
                    <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                </div>
                <div>
                    <p><strong>Supplier:</strong> ${supplierName}</p>
                    <p><strong>Type:</strong> ${type}</p>
                    <p><strong>Status:</strong> ${status}</p>
                    <p><strong>Printed On:</strong> ${formatDate(new Date())}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Sr.</th>
                        <th>Product</th>
                        <th>Cost Price</th>
                        <th>Quantity</th>
                        <th class="text-right">Total Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${document.getElementById('modalProductsList').innerHTML}
                </tbody>
            </table>
            
            <div class="summary">
                <div class="summary-row">
                    <span>Grand Total:</span>
                    <span>${document.getElementById('modalGrandTotal').textContent}</span>
                </div>
                <div class="summary-row">
                    <span>Tax Amount:</span>
                    <span>${document.getElementById('modalTaxAmount').textContent}</span>
                </div>
                <div class="summary-row">
                    <span>Paid Amount:</span>
                    <span>${document.getElementById('modalPaidAmount').textContent}</span>
                </div>
                ${document.getElementById('modalReceiveAmount') ? `
                <div class="summary-row">
                    <span>Receive Amount:</span>
                    <span>${document.getElementById('modalReceiveAmount').textContent}</span>
                </div>
                ` : ''}
                <div class="summary-row total-row">
                    <span>Balance:</span>
                    <span>${document.getElementById('modalBalance').textContent}</span>
                </div>
            </div>
            
            <div class="comments">
                <h4>Comments</h4>
                <p>${document.getElementById('modalComments').textContent}</p>
            </div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Supplier Report Module</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Add delay to ensure content is loaded
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}


// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Helper function to format date for filenames
function formatDateForFilename(date) {
    return date.toISOString().split('T')[0];
}

// Alternative simpler version if locale formatting isn't working as expected
function formatCurrencySimple(value) {
    const amount = parseFloat(value) || 0;
    
    // Convert to string with 2 decimal places
    let numStr = amount.toFixed(2);
    
    // Split the decimal and whole number parts
    let parts = numStr.split('.');
    let wholePart = parts[0];
    let decimalPart = parts[1];
    
    // Add thousands separators
    wholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return `Rs ${wholePart}.${decimalPart}`;
}

// Show loading spinner
function showLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

// Hide loading spinner
function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// // Show notification
// function showNotification(message, type = 'info') {
//     // Assuming a notification system is in place
//     if (window.showToast) {
//         window.showToast(message, type);
//     } else {
//         // Fallback to alert for now
//         alert(message);
//     }
// }

// Initialize the page when DOM is ready
document.addEventListener('DOMContentLoaded', initializeReport);