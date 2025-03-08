// customer-report.js

// Global variables
let allCustomers = [];
let reportData = [];
let filteredData = [];
let currentPage = 1;
const rowsPerPage = 10;

// Initialize the report page
async function initializeReport() {
    try {
        // Set default dates
        setDateToToday('toDate');
        setDateRangeByShortcut('month'); // Default to this month

        // Load customers for autocomplete
        await loadCustomers();

        // Initialize event listeners
        initializeEventListeners();

        // Generate initial report (empty until filters are applied)
        updateReportView();
    } catch (error) {
        console.error('Error initializing report:', error);
        showNotification('Error initializing report', 'error');
    }
}

// Load all customers for autocomplete
async function loadCustomers() {
    try {
        allCustomers = await window.api.getCustomers();
        console.log('Loaded customers:', allCustomers);
    } catch (error) {
        console.error('Error loading customers:', error);
        allCustomers = []; // Fallback to empty array
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
    
    // Customer search with autocomplete
    const customerSearch = document.getElementById('customerSearch');
    customerSearch.addEventListener('input', showCustomerSuggestions);
    customerSearch.addEventListener('focus', function() {
        if (this.value.length > 0) {
            showCustomerSuggestions({ target: this });
        }
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!customerSearch.contains(e.target)) {
            document.getElementById('customerSuggestions').style.display = 'none';
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

// Customer autocomplete functions
function showCustomerSuggestions(e) {
    const input = e.target.value.toLowerCase();
    const suggestionsContainer = document.getElementById('customerSuggestions');
    
    if (input.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    const matches = allCustomers.filter(customer => 
        customer.customer_name.toLowerCase().includes(input)
    );
    
    if (matches.length > 0) {
        suggestionsContainer.innerHTML = matches
            .slice(0, 10) // Limit to 10 suggestions
            .map(customer => 
                `<div class="suggestion-item" data-id="${customer.id}">${customer.customer_name}</div>`
            )
            .join('');
        
        // Add click listeners to suggestions
        suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', function() {
                document.getElementById('customerSearch').value = this.textContent;
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
    const customerName = document.getElementById('customerSearch').value;
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    if (!fromDate || !toDate) {
        showNotification('Please select both from and to dates', 'error');
        return;
    }
    
    showLoadingSpinner();
    
    try {
        // Fetch data based on filters
        const params = {
            customerName: customerName || null,
            fromDate,
            toDate
        };
        
        // Fetch both sales and returns data using your IPC channels
        const [salesData, returnsData] = await Promise.all([
            window.api.customer.getTransactions(params),
            window.api.getAllSalesReturns()
        ]);

        // Filter returns data based on date range and customer if specified
        const filteredReturns = returnsData.filter(returnItem => {
            const returnDate = new Date(returnItem.date);
            const start = new Date(fromDate);
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999); // Include the entire end day
            
            const customerMatch = !customerName || 
                returnItem.customerName.toLowerCase().includes(customerName.toLowerCase());
            
            return returnDate >= start && 
                   returnDate <= end && 
                   customerMatch;
        });

        // Process returns data to match transaction format, ensuring correct data fields
        // Make sure each return is only represented once with transactionType = 'Return'
        const processedReturns = filteredReturns.map(returnItem => ({
            invoiceNumber: returnItem.returnBillNo,
            salesReturnId: returnItem.salesReturnId, // Store the salesReturnId for reference
            date: returnItem.date,
            customerName: returnItem.customerName,
            transactionType: 'Return', // Explicitly mark as Return
            paymentMethod: 'Return', // Use consistent value for payment method
            itemCount: returnItem.productsreturn ? returnItem.productsreturn.length : 0,
            total: returnItem.grandTotal,
            paid: returnItem.paidAmount || 0,
            balance: returnItem.dueAmount || 0,
            products: returnItem.productsreturn || [],
            comments: returnItem.comments
        }));

        // Process sales data to ensure correct type - filter out any that might be misclassified returns
        const processedSales = (salesData || [])
            .filter(sale => !sale.paymentMethod || sale.paymentMethod.toLowerCase() !== 'return')
            .map(sale => ({
                ...sale,
                transactionType: 'Sale' // Explicitly mark as Sale
            }));

        // Combine and sort both types of transactions by date
        reportData = [...processedSales, ...processedReturns].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        filteredData = [...reportData];
        currentPage = 1;
        
        // Update view with combined data
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


function updateSummaryData() {
    let totalTransactions = filteredData.length;
    let totalSales = 0;
    let totalReturns = 0;
    let totalReturnAmount = 0;
    let totalDues = 0;
    let totalPaid = 0;  // Add this variable to track total paid amount
    let salesCount = 0;
    let returnsCount = 0;
    
    // Calculate totals and dues
    filteredData.forEach(item => {
        const itemTotal = parseFloat(item.total) || 0;
        const itemBalance = parseFloat(item.balance) || 0;
        const itemPaid = parseFloat(item.paid) || 0;  // Track paid amount
        
        if (item.transactionType === 'Sale') {
            totalSales += itemTotal;
            totalDues += itemBalance; // Use balance for dues calculation
            totalPaid += itemPaid;    // Add paid amount to total
            salesCount++;
        } else if (item.transactionType === 'Return') {
            totalReturnAmount += itemTotal;
            // For returns, we reduce the dues (customer gets money back)
            totalDues -= itemBalance;
            totalPaid -= itemPaid;    // Subtract return payments from total paid
            returnsCount++;
        }
    });
    
    const netAmount = totalSales - totalReturnAmount;
    
    // Update individual elements
    const updateElement = (id, value, isCurrency = true) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = isCurrency ? formatCurrency(value) : value;
        }
    };

    // Update transaction counts
    updateElement('totalTransactions', totalTransactions, false);
    const breakdownElement = document.getElementById('transactionBreakdown');
    if (breakdownElement) {
        breakdownElement.textContent = `Sales: ${salesCount}, Returns: ${returnsCount}`;
    }

    // Update monetary values
    updateElement('totalSales', totalSales);
    updateElement('totalReturns', totalReturnAmount);
    updateElement('netAmount', netAmount);
    updateElement('totalDues', totalDues);
    updateElement('totalPaid', totalPaid);  // Add this line to update the total paid card

    // Update status messages
    const profitStatusElement = document.getElementById('profitStatus');
    if (profitStatusElement) {
        if (netAmount >= 0) {
            profitStatusElement.textContent = '(Profit)';
            profitStatusElement.className = 'text-success';
        } else {
            profitStatusElement.textContent = '(Loss)';
            profitStatusElement.className = 'text-danger';
        }
    }

    // Update dues status
    const duesStatusElement = document.getElementById('duesStatus');
    if (duesStatusElement) {
        if (totalDues > 0) {
            duesStatusElement.textContent = '(Customer has to pay)';
            duesStatusElement.className = 'text-danger';
        } else if (totalDues < 0) {
            duesStatusElement.textContent = '(Amount to return to customer)';
            duesStatusElement.className = 'text-success';
        } else {
            duesStatusElement.textContent = '(No dues)';
            duesStatusElement.className = 'text-success';
        }
    }
}

// Consolidated updateTableFooter function to properly handle both sales and returns
function updateTableFooter() {
    let totalAmount = 0;
    let salesTotalPaid = 0;
    let returnsTotalPaid = 0;
    let totalBalance = 0;
    
    filteredData.forEach(item => {
        // Use a safer way to parse numbers
        const itemTotal = parseFloat(item.total) || 0;
        const itemPaid = parseFloat(item.paid) || 0;
        const itemBalance = parseFloat(item.balance) || 0;
        
        if (item.transactionType === 'Sale') {
            totalAmount += itemTotal;
            salesTotalPaid += itemPaid;
            totalBalance += itemBalance;
        } else if (item.transactionType === 'Return') {
            // For returns, subtract from the total amount
            totalAmount -= itemTotal;
            returnsTotalPaid += itemPaid;
            totalBalance -= itemBalance;
        }
    });
    
    // Update footer cells
    document.getElementById('footerTotal').textContent = formatCurrency(totalAmount);
    document.getElementById('footerPaid').textContent = formatCurrency(salesTotalPaid - returnsTotalPaid);
    document.getElementById('footerBalance').textContent = formatCurrency(totalBalance);
}



// Modified updateReportView function to better distinguish between sale and return rows
// Modified updateReportView function to correctly handle return IDs
function updateReportView(customerTransactions = null) {
    const tbody = document.getElementById('reportData');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">No data found. Adjust your filters or generate a new report.</td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginatedData.map((item) => {
            // Get adjusted paid amount if it's a sale
            let displayPaid = item.paid;
            let displayBalance = item.balance;
            
            if (customerTransactions && item.transactionType === 'Sale') {
                const customerTrans = customerTransactions[item.customerName];
                if (customerTrans) {
                    const sale = customerTrans.sales.find(s => 
                        s.invoiceNumber === item.invoiceNumber
                    );
                    if (sale && sale.adjustedPaid !== undefined) {
                        displayPaid = sale.adjustedPaid;
                        displayBalance = Math.max(0, item.total - displayPaid);
                    }
                }
            }

            // Add visual distinction for returns vs sales
            const rowClass = item.transactionType === 'Return' ? 'return-row' : '';
            const badgeClass = item.transactionType === 'Sale' ? 'badge-success' : 'badge-warning';
            
            // Store the appropriate ID based on transaction type
            // For returns, we'll use salesReturnId instead of invoiceNumber
            const idToUse = item.transactionType === 'Return' ? 
                            (item.salesReturnId || item.invoiceNumber) : 
                            item.invoiceNumber;

            return `
                <tr class="${rowClass}">
                    <td>${item.invoiceNumber}</td>
                    <td>${formatDate(item.date)}</td>
                    <td>${item.customerName}</td>
                    <td>
                        <span class="badge ${badgeClass}">
                            ${item.transactionType}
                        </span>
                    </td>
                    <td>${item.paymentMethod}</td>
                    <td>${item.itemCount}</td>
                    <td>${formatCurrency(item.total)}</td>
                    <td>${formatCurrency(displayPaid)}</td>
                    <td>${formatCurrency(displayBalance)}</td>
                    <td>
                        <button class="btn btn-sm action-btn view-transaction" data-invoice="${idToUse}" data-type="${item.transactionType}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Add event listeners to view buttons
        tbody.querySelectorAll('.view-transaction').forEach(button => {
            button.addEventListener('click', function() {
                const invoiceNumber = this.getAttribute('data-invoice');
                const transactionType = this.getAttribute('data-type');
                viewTransactionDetails(invoiceNumber, transactionType);
            });
        });
    }
    
    updateTableFooter(customerTransactions);
    updatePaginationControls();
}

// Modified viewTransactionDetails to properly handle both sale and return transactions
// Modified viewTransactionDetails to properly handle both sale and return transactions
async function viewTransactionDetails(invoiceNumber, transactionType) {
    showLoadingSpinner();
    try {
        let transaction;
        
        // Different approach based on transaction type
        if (transactionType === 'Return') {
            // For returns, we need to fetch the actual return data from the API
            const returnsData = await window.api.getAllSalesReturns();
            transaction = returnsData.find(r => String(r.salesReturnId) === String(invoiceNumber));
            
            if (!transaction) {
                throw new Error(`Return transaction not found for invoice number: ${invoiceNumber}`);
            }
            
            // Map the return data to match the expected format
            transaction = {
                invoiceNumber: transaction.returnBillNo,
                date: transaction.date,
                customerName: transaction.customerName,
                transactionType: 'Return',
                paymentMethod: 'Return',
                total: transaction.grandTotal,
                paid: transaction.paidAmount,
                balance: transaction.dueAmount,
                products: transaction.productsreturn.map(p => ({
                    name: p.productName,
                    rate: p.salePrice,
                    returnQuantity: p.returnQuantity,
                    total: p.totalAmount
                }))
            };
        } else {
            // For sales, use the existing method of finding in local data
            transaction = filteredData.find(t => 
                String(t.invoiceNumber) === String(invoiceNumber) && 
                t.transactionType === 'Sale'
            );
            
            if (!transaction) {
                throw new Error(`Sale transaction not found for invoice number: ${invoiceNumber}`);
            }
        }

        // Update modal content
        const setModalContent = (elementId, value, defaultValue = 'N/A') => {
            const element = document.getElementById(elementId);
            if (element) {
                const displayValue = value !== null && value !== undefined ? value : defaultValue;
                element.textContent = displayValue;
            }
        };

        // Populate modal fields
        setModalContent('modalInvoiceNumber', transaction.invoiceNumber);
        setModalContent('modalDate', formatDate(transaction.date));
        setModalContent('modalCustomer', transaction.customerName);
        setModalContent('modalType', transaction.transactionType);
        setModalContent('modalPaymentMethod', transaction.paymentMethod);
        
        // Set status based on transaction type
        let statusText = 'N/A';
        if (transaction.transactionType === 'Sale') {
            statusText = transaction.paid >= transaction.total ? 'Paid' : 
                      transaction.paid > 0 ? 'Partial' : 'Unpaid';
        } else {
            statusText = 'Returned';
        }
        setModalContent('modalStatus', statusText);

        // Set financial details
        setModalContent('modalGrandTotal', formatCurrency(transaction.total));
        setModalContent('modalDiscount', formatCurrency(0)); // Set appropriate value if available
        setModalContent('modalAdjustment', formatCurrency(0)); // Set appropriate value if available
        setModalContent('modalNetTotal', formatCurrency(transaction.total));
        setModalContent('modalPaidAmount', formatCurrency(transaction.paid));
        setModalContent('modalBalance', formatCurrency(transaction.balance));
        setModalContent('modalComments', transaction.comments || 'No comments');

        // Update products list - handle different field names for sales vs returns
        const productsList = document.getElementById('modalProductsList');
        if (productsList) {
            const products = transaction.products || [];
            if (products.length > 0) {
                productsList.innerHTML = products.map((product, index) => {
                    // Handle different field names between sales and returns
                    const productName = product.productName || product.name || 'N/A';
                    const price = product.salePrice || product.rate || 0;
                    const quantity = transaction.transactionType === 'Return' ? 
                                    (product.returnQuantity || 0) : 
                                    (product.quantity || 0);
                    const discount = product.discount || 0;
                    const total = product.totalAmount || product.total || 0;
                    
                    return `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${productName}</td>
                            <td>${formatCurrency(price)}</td>
                            <td>${quantity}</td>
                            <td>${formatCurrency(discount)}</td>
                            <td>${formatCurrency(total)}</td>
                        </tr>
                    `;
                }).join('');
            } else {
                productsList.innerHTML = '<tr><td colspan="6" class="text-center">No products found</td></tr>';
            }
        }

        // Show modal
        const modal = document.getElementById('transactionModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            throw new Error('Transaction modal element not found');
        }

    } catch (error) {
        console.error('Error displaying transaction details:', error);
        showNotification(`Error: ${error.message}`, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// function updateSummaryData() {
//     let totalTransactions = filteredData.length;
//     let totalSales = 0;
//     let totalReturns = 0;
//     let totalReturnAmount = 0;
//     let totalDues = 0;
//     let salesCount = 0;
//     let returnsCount = 0;
    
//     // Calculate totals and dues
//     filteredData.forEach(item => {
//         if (item.transactionType === 'Sale') {
//             totalSales += parseFloat(item.total);
//             totalDues += parseFloat(item.balance); // Use balance for dues calculation
//             salesCount++;
//         } else if (item.transactionType === 'Return') {
//             totalReturns++;
//             totalReturnAmount += parseFloat(item.total);
//             returnsCount++;
//         }
//     });
    
//     const netAmount = totalSales - totalReturnAmount;
    
//     // Update individual elements
//     const updateElement = (id, value, isCurrency = true) => {
//         const element = document.getElementById(id);
//         if (element) {
//             element.textContent = isCurrency ? formatCurrency(value) : value;
//         }
//     };

//     // Update transaction counts
//     updateElement('totalTransactions', totalTransactions, false);
//     const breakdownElement = document.getElementById('transactionBreakdown');
//     if (breakdownElement) {
//         breakdownElement.textContent = `Sales: ${salesCount}, Returns: ${returnsCount}`;
//     }

//     // Update monetary values
//     updateElement('totalSales', totalSales);
//     updateElement('totalReturns', totalReturnAmount);
//     updateElement('netAmount', netAmount);
//     updateElement('totalDues', totalDues);

//     // Update status messages
//     const profitStatusElement = document.getElementById('profitStatus');
//     if (profitStatusElement) {
//         if (netAmount >= 0) {
//             profitStatusElement.textContent = '(Profit)';
//             profitStatusElement.className = 'text-success';
//         } else {
//             profitStatusElement.textContent = '(Loss)';
//             profitStatusElement.className = 'text-danger';
//         }
//     }

//     // Update dues status
//     const duesStatusElement = document.getElementById('duesStatus');
//     if (duesStatusElement) {
//         if (totalDues > 0) {
//             duesStatusElement.textContent = '(Customer has to pay)';
//             duesStatusElement.className = 'text-danger';
//         } else if (totalDues < 0) {
//             duesStatusElement.textContent = '(Amount to return to customer)';
//             duesStatusElement.className = 'text-success';
//         } else {
//             duesStatusElement.textContent = '(No dues)';
//             duesStatusElement.className = 'text-success';
//         }
//     }
// }



// Reset all filters
function resetFilters() {
    document.getElementById('customerSearch').value = '';
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

// Filter report table based on search
function filterReportTable() {
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    
    if (searchTerm.length < 1) {
        filteredData = [...reportData];
    } else {
        filteredData = reportData.filter(item => 
            item.invoiceNumber.toLowerCase().includes(searchTerm) ||
            item.customerName.toLowerCase().includes(searchTerm) ||
            item.paymentMethod.toLowerCase().includes(searchTerm) ||
            item.transactionType.toLowerCase().includes(searchTerm)
        );
    }
    
    // Reset to first page
    currentPage = 1;
    updateReportView();
}

// function updateTableFooter() {
//     let totalAmount = 0;
//     let totalPaid = 0;
//     let totalBalance = 0;
    
//     filteredData.forEach(item => {
//         totalAmount += parseFloat(item.total);
//         totalPaid += parseFloat(item.paid);
//         totalBalance += parseFloat(item.balance);
//     });
    
//     document.getElementById('footerTotal').textContent = formatCurrency(totalAmount);
//     document.getElementById('footerPaid').textContent = formatCurrency(totalPaid);
//     document.getElementById('footerBalance').textContent = formatCurrency(totalBalance);
// }

// Update the summary section with totals
// function updateSummaryData() {
//     let totalTransactions = filteredData.length;
//     let totalSales = 0;
//     let totalReturns = 0;
//     let totalReturnAmount = 0;
    
//     filteredData.forEach(item => {
//         if (item.transactionType === 'Sale') {
//             totalSales += parseFloat(item.total);
//         } else if (item.transactionType === 'Return') {
//             totalReturns++;
//             totalReturnAmount += parseFloat(item.total);
//         }
//     });
    
//     const netAmount = totalSales - totalReturnAmount;
    
//     // Update summary cards HTML
//     document.getElementById('summaryCards').innerHTML = `
//         <div class="summary-card">
//             <h3>Total Transactions</h3>
//             <p id="totalTransactions">${totalTransactions}</p>
//             <small>(Sales: ${totalTransactions - totalReturns}, Returns: ${totalReturns})</small>
//         </div>
//         <div class="summary-card">
//             <h3>Total Sales</h3>
//             <p id="totalSales">${formatCurrency(totalSales)}</p>
//         </div>
//         <div class="summary-card">
//             <h3>Total Returns</h3>
//             <p id="totalReturns">${formatCurrency(totalReturnAmount)}</p>
//         </div>
//         <div class="summary-card">
//             <h3>Net Amount</h3>
//             <p id="netAmount">${formatCurrency(netAmount)}</p>
//             <small class="${netAmount >= 0 ? 'text-success' : 'text-danger'}">
//                 (${netAmount >= 0 ? 'Profit' : 'Loss'})
//             </small>
//         </div>
//     `;
// }

// New function to calculate customer dues
function calculateCustomerDues(customerName) {
    let totalDues = 0;
    
    // Filter transactions for this customer
    const customerTransactions = filteredData.filter(t => t.customerName === customerName);
    
    customerTransactions.forEach(transaction => {
        if (transaction.transactionType === 'Sale') {
            // For sales, add unpaid amount to dues
            totalDues += (transaction.total - transaction.paid);
        } else if (transaction.transactionType === 'Return') {
            // For returns, subtract the return amount from dues
            totalDues -= transaction.total;
        }
    });
    
    return totalDues;
}



// Add these styles to your existing styles
const additionalStyles = `
    .dues-row {
        background-color: #fff3cd;
    }
    .dues-row:hover {
        background-color: #ffe5d0;
    }
    .text-danger {
        color: #dc3545;
    }
    .bg-warning {
        background-color: #fff3cd;
    }
    .bg-success {
        background-color: #d4edda;
    }
`;
// Add this CSS to your stylesheet
const styles = `
    .return-row {
        background-color: #fff3e0;
    }
    .return-row:hover {
        background-color: #ffe0b2;
    }
    .summary-card {
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        background-color: white;
    }
    .summary-card small {
        display: block;
        margin-top: 0.5rem;
        color: #666;
    }
    .text-success {
        color: #28a745;
    }
    .text-danger {
        color: #dc3545;
    }
    .badge-warning {
        background-color: #ffc107;
        color: #000;
    }
    .badge-success {
        background-color: #28a745;
        color: #fff;
    }
`;
// Update pagination controls based on current data
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    // Update page info text
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    // Update button states
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages || totalPages === 0;
}

// Change current page
function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage > 0 && newPage <= totalPages) {
        currentPage = newPage;
        updateReportView();
    }
}

function exportReportToPdf() {
    if (filteredData.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    
    // Create PDF-like content
    const printContent = `
        <html>
        <head>
            <title>Customer Report - ${formatDate(new Date())}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; }
                h1 { text-align: center; color: #333; }
                .header { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .filters { margin-bottom: 20px; }
                .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
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
                <h1>Customer Report</h1>
                <p>Generated on: ${formatDate(new Date())}</p>
            </div>
            
            <div class="filters">
                <p><strong>Customer:</strong> ${document.getElementById('customerSearch').value || 'All Customers'}</p>
                <p><strong>Date Range:</strong> ${document.getElementById('fromDate').value} to ${document.getElementById('toDate').value}</p>
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <h3>Total Transactions</h3>
                    <p>${document.getElementById('totalTransactions').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Sales</h3>
                    <p>${document.getElementById('totalSales').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Returns</h3>
                    <p>${document.getElementById('totalReturns').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Net Amount</h3>
                    <p>${document.getElementById('netAmount').textContent}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Payment Method</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                            <td>${item.invoiceNumber}</td>
                            <td>${formatDate(item.date)}</td>
                            <td>${item.customerName}</td>
                            <td>${item.transactionType}</td>
                            <td>${item.paymentMethod}</td>
                            <td>${item.itemCount}</td>
                            <td>${formatCurrency(item.total)}</td>
                            <td>${formatCurrency(item.paid)}</td>
                            <td>${formatCurrency(item.balance)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="6" class="text-right"><strong>Totals:</strong></td>
                        <td>${document.getElementById('footerTotal').textContent}</td>
                        <td>${document.getElementById('footerPaid').textContent}</td>
                        <td>${document.getElementById('footerBalance').textContent}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated from Customer Report Module</p>
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
function closeTransactionModal() {
    document.getElementById('transactionModal').style.display = 'none';
}

// Print report
function printReport() {
    const printWindow = window.open('', '_blank');
    
    // Create print content
    const printContent = `
        <html>
        <head>
            <title>Customer Report - ${formatDate(new Date())}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; }
                h1 { text-align: center; color: #333; }
                .header { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .filters { margin-bottom: 20px; }
                .summary { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .summary-item { padding: 10px; border: 1px solid #ddd; flex: 1; margin: 0 5px; }
                .text-right { text-align: right; }
                .footer { margin-top: 30px; font-size: 12px; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Customer Report</h1>
                <p>Generated on: ${formatDate(new Date())}</p>
            </div>
            
            <div class="filters">
                <p><strong>Customer:</strong> ${document.getElementById('customerSearch').value || 'All Customers'}</p>
                <p><strong>Date Range:</strong> ${document.getElementById('fromDate').value} to ${document.getElementById('toDate').value}</p>
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <h3>Total Transactions</h3>
                    <p>${document.getElementById('totalTransactions').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Sales</h3>
                    <p>${document.getElementById('totalSales').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Returns</h3>
                    <p>${document.getElementById('totalReturns').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Net Amount</h3>
                    <p>${document.getElementById('netAmount').textContent}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Type</th>
                        <th>Payment Method</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Balance</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                            <td>${item.invoiceNumber}</td>
                            <td>${formatDate(item.date)}</td>
                            <td>${item.customerName}</td>
                            <td>${item.transactionType}</td>
                            <td>${item.paymentMethod}</td>
                            <td>${item.itemCount}</td>
                            <td>${formatCurrency(item.total)}</td>
                            <td>${formatCurrency(item.paid)}</td>
                            <td>${formatCurrency(item.balance)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="6" class="text-right"><strong>Totals:</strong></td>
                        <td>${document.getElementById('footerTotal').textContent}</td>
                        <td>${document.getElementById('footerPaid').textContent}</td>
                        <td>${document.getElementById('footerBalance').textContent}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated from Dispenso - Customer Report Module</p>
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
    const customerName = document.getElementById('modalCustomer').textContent;
    const type = document.getElementById('modalType').textContent;
    const paymentMethod = document.getElementById('modalPaymentMethod').textContent;
    const status = document.getElementById('modalStatus').textContent;
    
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
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Dispenso</h1>
                <h2>${type === 'Sale' ? 'Sales Invoice' : 'Return Invoice'}</h2>
            </div>
            
            <div class="invoice-details">
                <div>
                    <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                </div>
                <div>
                    <p><strong>Customer:</strong> ${customerName}</p>
                    <p><strong>Status:</strong> ${status}</p>
                    <p><strong>Printed On:</strong> ${formatDate(new Date())}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Sr.</th>
                        <th>Product</th>
                        <th>Rate</th>
                        <th>Quantity</th>
                        <th>Discount</th>
                        <th>Total</th>
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
                    <span>Discount:</span>
                    <span>${document.getElementById('modalDiscount').textContent}</span>
                </div>
                <div class="summary-row">
                    <span>Adjustment:</span>
                    <span>${document.getElementById('modalAdjustment').textContent}</span>
                </div>
                <div class="summary-row total-row">
                    <span>Net Total:</span>
                    <span>${document.getElementById('modalNetTotal').textContent}</span>
                </div>
                <div class="summary-row">
                    <span>Paid Amount:</span>
                    <span>${document.getElementById('modalPaidAmount').textContent}</span>
                </div>
                <div class="summary-row">
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
                <p>Dispenso - Pharmacy Management System</p>
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

// Export report to CSV
function exportReportToCsv() {
    if (filteredData.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    // Create CSV headers
    const headers = ['Invoice #', 'Date', 'Customer', 'Type', 'Payment Method', 'Items', 'Total', 'Paid', 'Balance'];
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    filteredData.forEach(item => {
        const row = [
            `"${item.invoiceNumber}"`,
            `"${formatDate(item.date)}"`,
            `"${item.customerName}"`,
            `"${item.transactionType}"`,
            `"${item.paymentMethod}"`,
            item.itemCount,
            item.total,
            item.paid,
            item.balance
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_report_${formatDateForFilename(new Date())}.csv`);
    document.body.appendChild(link);
    
    // Trigger download and remove link
    link.click();
    document.body.removeChild(link);
}

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

// Helper function to format currency
function formatCurrency(value) {
    // Convert value to a number and handle invalid inputs
    const amount = parseFloat(value) || 0;
    
    // Format number to standard number format with commas
    const formatted = amount.toLocaleString('en', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
    
    return `Rs ${formatted}`;
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

document.addEventListener('DOMContentLoaded', initializeReport);