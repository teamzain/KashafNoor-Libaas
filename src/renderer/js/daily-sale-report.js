
let reportData = [];
let filteredData = [];
let dailyAggregatedData = [];
let currentPage = 1;
const rowsPerPage = 10;
let dailySalesChart = null;
let paymentMethodChart = null;

// Initialize the report page
async function initializeReport() {
    try {
        // Set default dates
        setDateToToday('toDate');
        setDateRangeByShortcut('month'); // Default to this month

        // Initialize event listeners
        initializeEventListeners();

        // Initialize charts
        await initializeCharts();

        // Update report view with empty data
        updateReportView();
    } catch (error) {
        console.error('Error initializing report:', error);
        showNotification('Error initializing report: ' + error.message, 'error');
    }
}






// Initialize event listeners - after printReport is defined
function initializeEventListeners() {
    // Date range shortcuts
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const range = this.dataset.range;
            setDateRangeByShortcut(range);
            
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Generate report button
    document.getElementById('generateReportBtn')?.addEventListener('click', generateReport);
    
    // Print button - now printReport is defined before this
    document.getElementById('printBtn')?.addEventListener('click', printReport);
    
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
    
    // Daily details modal controls
    document.querySelector('#dailyDetailsModal .close-btn').addEventListener('click', closeDailyDetailsModal);
    document.getElementById('modalCloseBtn').addEventListener('click', closeDailyDetailsModal);
    document.getElementById('printDailyBtn').addEventListener('click', printDailyDetails);
    
    // Date inputs validation
    document.getElementById('fromDate').addEventListener('change', validateDateRange);
    document.getElementById('toDate').addEventListener('change', validateDateRange);
}

// Add the missing printReport function
function printReport() {
    if (filteredData.length === 0) {
        showNotification('No data to print', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const printContent = `
        <html>
        <head>
            <title>Daily Sales Report - ${formatDate(new Date())}</title>
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
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Daily Sales Report</h1>
                <p>Generated on: ${formatDate(new Date())}</p>
            </div>
            
            <div class="filters">
                <p><strong>Date Range:</strong> ${document.getElementById('fromDate').value} to ${document.getElementById('toDate').value}</p>
                <p><strong>Payment Method:</strong> ${document.getElementById('paymentMethod').value || 'All Payment Methods'}</p>
                <p><strong>Transaction Type:</strong> ${document.getElementById('transactionType').value || 'All Transactions'}</p>
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
                    <h3>Sales Paid</h3>
                    <p>${document.getElementById('totalSalePaid').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Sales Due</h3>
                    <p>${document.getElementById('totalSaleDue').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Returns</h3>
                    <p>${document.getElementById('totalReturns').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Returns Paid</h3>
                    <p>${document.getElementById('totalReturnPaid').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Returns Due</h3>
                    <p>${document.getElementById('totalReturnDue').textContent}</p>
                </div>
                <div class="summary-item">
                    <h3>Net Amount</h3>
                    <p>${document.getElementById('netAmount').textContent}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Total Transactions</th>
                        <th>Sales Count</th>
                        <th>Return Count</th>
                        <th>Sales Amount</th>
                        <th>Sales Paid</th>
                        <th>Sales Due</th>
                        <th>Returns Amount</th>
                        <th>Returns Paid</th>
                        <th>Returns Due</th>
                        <th>Net Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                            <td>${formatDate(item.date)}</td>
                            <td>${item.totalTransactions}</td>
                            <td>${item.salesCount}</td>
                            <td>${item.returnCount}</td>
                            <td>${formatCurrency(item.salesAmount)}</td>
                            <td>${formatCurrency(item.salePaidAmount)}</td>
                            <td>${formatCurrency(item.saleDueAmount)}</td>
                            <td>${formatCurrency(item.returnsAmount)}</td>
                            <td>${formatCurrency(item.returnPaidAmount)}</td>
                            <td>${formatCurrency(item.returnDueAmount)}</td>
                            <td>${formatCurrency(item.netAmount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" class="text-right"><strong>Totals:</strong></td>
                        <td>${document.getElementById('footerSalesCount').textContent}</td>
                        <td>${document.getElementById('footerReturnCount').textContent}</td>
                        <td>${document.getElementById('footerSalesAmount').textContent}</td>
                        <td>${document.getElementById('footerSalePaid').textContent}</td>
                        <td>${document.getElementById('footerSaleDue').textContent}</td>
                        <td>${document.getElementById('footerReturnsAmount').textContent}</td>
                        <td>${document.getElementById('footerReturnPaid').textContent}</td>
                        <td>${document.getElementById('footerReturnDue').textContent}</td>
                        <td>${document.getElementById('footerNetAmount').textContent}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated from Daily Sales Report Module</p>
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

// Generate report based on filters
async function generateReport() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const transactionType = document.getElementById('transactionType').value;
    
    if (!fromDate || !toDate) {
        showNotification('Please select both from and to dates', 'error');
        return;
    }
    
    showLoadingSpinner();
    
    try {
        // Fetch data based on filters
        const params = {
            fromDate,
            toDate,
            paymentMethod: paymentMethod || null,
            transactionType: transactionType || null
        };
        
        reportData = await window.api.getDailySalesData(params);
        
        // Create daily aggregated data
        aggregateDailyData();
        
        // Apply filters
        applyFilters();
        
        // Reset to first page
        currentPage = 1;
        
        // Update view
        updateReportView();
        updateCharts();
        updateSummaryData();
        
        // Show success message
        if (dailyAggregatedData.length === 0) {
            showNotification('No data found for the selected criteria', 'info');
        } else {
            showNotification(`Data found for ${dailyAggregatedData.length} days`, 'success');
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Error generating report: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}


// Modify the aggregateDailyData function to track paid and due amounts
function aggregateDailyData() {
    const dailyMap = new Map();
    
    reportData.forEach(transaction => {
        const dateStr = transaction.date.split('T')[0];
        const transType = transaction.transactionType;
        const amount = parseFloat(transaction.total);
        const paidAmount = parseFloat(transaction.paidAmount || 0);
        const dueAmount = parseFloat(transaction.dueAmount || 0);
        
        if (!dailyMap.has(dateStr)) {
            dailyMap.set(dateStr, {
                date: dateStr,
                totalTransactions: 0,
                salesCount: 0,
                returnCount: 0,
                salesAmount: 0,
                returnsAmount: 0,
                netAmount: 0,
                salePaidAmount: 0,
                saleDueAmount: 0,
                returnPaidAmount: 0,
                returnDueAmount: 0,
                transactions: []
            });
        }
        
        const dayData = dailyMap.get(dateStr);
        dayData.totalTransactions++;
        dayData.transactions.push(transaction);
        
        if (transType === 'Return') {
            dayData.returnCount++;
            dayData.returnsAmount += Math.abs(amount);
    dayData.netAmount -= Math.abs(amount);
            dayData.returnPaidAmount += Math.abs(paidAmount);
            dayData.returnDueAmount += Math.abs(dueAmount);
        } else {
            dayData.salesCount++;
            dayData.salesAmount += amount;
            dayData.netAmount += amount;
            dayData.salePaidAmount += paidAmount;
            dayData.saleDueAmount += dueAmount;
        }
    });
    
    // Convert Map to Array and sort by date
    dailyAggregatedData = Array.from(dailyMap.values()).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
    );
}


// Apply filters
function applyFilters() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const transactionType = document.getElementById('transactionType').value;
    
    if (!paymentMethod && !transactionType) {
        filteredData = [...dailyAggregatedData];
        return;
    }
    
    // Filter daily aggregated data
    filteredData = dailyAggregatedData.map(dayData => {
        // Deep copy to avoid modifying original data
        const filteredDay = {...dayData, transactions: []};
        
        // Filter transactions
        const filteredTransactions = dayData.transactions.filter(transaction => {
            if (paymentMethod && transaction.paymentMethod !== paymentMethod) return false;
            if (transactionType && transaction.transactionType !== transactionType) return false;
            return true;
        });
        
        if (filteredTransactions.length === 0) {
            return null; // No transactions match filter criteria
        }
        
        // Recalculate aggregates based on filtered transactions
        filteredDay.transactions = filteredTransactions;
        filteredDay.totalTransactions = filteredTransactions.length;
        filteredDay.salesCount = filteredTransactions.filter(t => t.transactionType === 'Sale').length;
        filteredDay.returnCount = filteredTransactions.filter(t => t.transactionType === 'Return').length;
        
        // Sales calculations
        const salesTransactions = filteredTransactions.filter(t => t.transactionType === 'Sale');
        filteredDay.salesAmount = salesTransactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
        filteredDay.salePaidAmount = salesTransactions.reduce((sum, t) => sum + parseFloat(t.paidAmount || 0), 0);
        filteredDay.saleDueAmount = salesTransactions.reduce((sum, t) => sum + parseFloat(t.dueAmount || 0), 0);
        
        // Returns calculations
        const returnTransactions = filteredTransactions.filter(t => t.transactionType === 'Return');
        filteredDay.returnsAmount = returnTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.total || 0)), 0);
        filteredDay.returnPaidAmount = returnTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.paidAmount || 0)), 0);
        filteredDay.returnDueAmount = returnTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.dueAmount || 0)), 0);
        
        // Net amount
        filteredDay.netAmount = filteredDay.salesAmount - filteredDay.returnsAmount;
        
        return filteredDay;
    }).filter(day => day !== null); // Remove days with no matching transactions
}

// Reset all filters
function resetFilters() {
    document.getElementById('paymentMethod').value = '';
    document.getElementById('transactionType').value = '';
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
    dailyAggregatedData = [];
    filteredData = [];
    updateReportView();
    updateCharts();
    updateSummaryData();
}

// Filter report table based on search
function filterReportTable() {
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    
    if (searchTerm.length < 1) {
        filteredData = [...dailyAggregatedData];
    } else {
        filteredData = dailyAggregatedData.filter(item => 
            formatDate(item.date).toLowerCase().includes(searchTerm)
        );
    }
    
    // Reset to first page
    currentPage = 1;
    updateReportView();
    updateSummaryData();
}

// Update the report table view
function updateReportView() {
    const tbody = document.getElementById('reportData');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    if (paginatedData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="12" class="text-center">No data found. Adjust your filters or generate a new report.</td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginatedData.map((item, index) => `
            <tr>
                <td>${formatDate(item.date)}</td>
                <td>${item.totalTransactions}</td>
                <td>${item.salesCount}</td>
                <td>${item.returnCount}</td>
                <td>${formatCurrency(item.salesAmount)}</td>
                <td>${formatCurrency(item.salePaidAmount)}</td>
                <td>${formatCurrency(item.saleDueAmount)}</td>
                <td>${formatCurrency(item.returnsAmount)}</td>
                <td>${formatCurrency(item.returnPaidAmount)}</td>
                <td>${formatCurrency(item.returnDueAmount)}</td>
                <td>${formatCurrency(item.netAmount)}</td>
                <td>
                    <button class="btn btn-sm action-btn" onclick="viewDailyDetails('${item.date}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
    
    // Update footer totals
    updateTableFooter();
    
    // Update pagination controls
    updatePaginationControls();
}
function updateTableFooter() {
    let totalSalesCount = 0;
    let totalReturnCount = 0;
    let totalSalesAmount = 0;
    let totalSalePaidAmount = 0;
    let totalSaleDueAmount = 0;
    let totalReturnsAmount = 0;
    let totalReturnPaidAmount = 0;
    let totalReturnDueAmount = 0;
    let totalNetAmount = 0;
    
    filteredData.forEach(item => {
        totalSalesCount += item.salesCount;
        totalReturnCount += item.returnCount;
        totalSalesAmount += item.salesAmount;
        totalSalePaidAmount += item.salePaidAmount;
        totalSaleDueAmount += item.saleDueAmount;
        totalReturnsAmount += item.returnsAmount;
        totalReturnPaidAmount += item.returnPaidAmount;
        totalReturnDueAmount += item.returnDueAmount;
        totalNetAmount += item.netAmount;
    });
    
    // Update the footer HTML directly with proper column alignment
    const tfoot = document.querySelector('#reportTable tfoot');
    tfoot.innerHTML = `
        <tr>
            <td colspan="2" class="text-right"><strong>Totals:</strong></td>
            <td>${totalSalesCount}</td>
            <td>${totalReturnCount}</td>
            <td>${formatCurrency(totalSalesAmount)}</td>
            <td>${formatCurrency(totalSalePaidAmount)}</td>
            <td>${formatCurrency(totalSaleDueAmount)}</td>
            <td>${formatCurrency(totalReturnsAmount)}</td>
            <td>${formatCurrency(totalReturnPaidAmount)}</td>
            <td>${formatCurrency(totalReturnDueAmount)}</td>
            <td>${formatCurrency(totalNetAmount)}</td>
            <td></td>
        </tr>
    `;
}

// Update the summary section with totals
function updateSummaryData() {
    let totalTransactions = 0;
    let totalSales = 0;
    let totalSalePaid = 0;
    let totalSaleDue = 0;
    let totalReturns = 0;
    let totalReturnPaid = 0;
    let totalReturnDue = 0;
    let netAmount = 0;
    
    filteredData.forEach(item => {
        totalTransactions += item.totalTransactions;
        totalSales += item.salesAmount;
        totalSalePaid += item.salePaidAmount;
        totalSaleDue += item.saleDueAmount;
        totalReturns += item.returnsAmount;
        totalReturnPaid += item.returnPaidAmount;
        totalReturnDue += item.returnDueAmount;
    });
    
    netAmount = totalSales - totalReturns;
    
    document.getElementById('totalTransactions').textContent = totalTransactions;
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalSalePaid').textContent = formatCurrency(totalSalePaid);
    document.getElementById('totalSaleDue').textContent = formatCurrency(totalSaleDue);
    document.getElementById('totalReturns').textContent = formatCurrency(totalReturns);
    document.getElementById('totalReturnPaid').textContent = formatCurrency(totalReturnPaid);
    document.getElementById('totalReturnDue').textContent = formatCurrency(totalReturnDue);
    document.getElementById('netAmount').textContent = formatCurrency(netAmount);
}


// Update charts with filtered data
// Initialize the charts with proper configuration and error handling

// Reset charts

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
// Loading spinner functions
function showLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoadingSpinner() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// Format currency helper function
function formatCurrency(amount) {
    return 'Rs' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

// Format date helper function
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Enhanced view daily details function
// Enhanced view daily details function with product details
function viewDailyDetails(date) {
    const dayData = dailyAggregatedData.find(d => d.date === date);
    if (!dayData) {
        showNotification('Cannot find data for selected date', 'error');
        return;
    }

    // Calculate totals for the day
    const totals = dayData.transactions.reduce((acc, t) => {
        const amount = parseFloat(t.total);
        if (t.transactionType === 'Sale') {
            acc.salesAmount += amount;
            acc.salesCount++;
            acc.salePaidAmount += parseFloat(t.paidAmount || 0);
            acc.saleDueAmount += parseFloat(t.dueAmount || 0);
        } else {
            acc.returnsAmount += amount;
            acc.returnCount++;
            acc.returnPaidAmount += parseFloat(t.paidAmount || 0);
            acc.returnDueAmount += parseFloat(t.dueAmount || 0);
        }
        acc.totalItems += parseInt(t.itemCount);
        return acc;
    }, { 
        salesAmount: 0, 
        returnsAmount: 0, 
        salesCount: 0, 
        returnCount: 0, 
        totalItems: 0,
        salePaidAmount: 0,
        saleDueAmount: 0,
        returnPaidAmount: 0,
        returnDueAmount: 0
    });

    const modal = document.getElementById('dailyDetailsModal');
    modal.innerHTML = `
        <div class="modal-content" style="width: 95%; max-width: 1400px;">
            <div class="modal-header">
                <h2>Transactions for ${formatDate(date)}</h2>
                <div class="modal-actions">
                    <button class="btn btn-secondary" id="printDailyBtn">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button class="btn btn-primary close-btn" id="modalCloseBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="modal-body">
                <div class="summary-cards">
                    <div class="summary-card">
                        <h3>Transactions</h3>
                        <p class="large-number">${totals.salesCount + totals.returnCount}</p>
                        <p class="sub-text">Sales: ${totals.salesCount} | Returns: ${totals.returnCount}</p>
                    </div>
                    <div class="summary-card">
                        <h3>Total Items</h3>
                        <p class="large-number">${totals.totalItems}</p>
                    </div>
                    <div class="summary-card">
                        <h3>Sales Amount</h3>
                        <p class="large-number positive">${formatCurrency(totals.salesAmount)}</p>
                       
                    </div>
                    <div class="summary-card">
                        <h3>Returns Amount</h3>
                        <p class="large-number negative">${formatCurrency(totals.returnsAmount)}</p>
                       
                    </div>
                    <div class="summary-card">
                        <h3>Net Amount</h3>
                        <p class="large-number ${(totals.salesAmount + totals.returnsAmount) >= 0 ? 'positive' : 'negative'}">
    ${formatCurrency(totals.salesAmount + totals.returnsAmount)}
</p>
                    </div>


                     <div class="summary-card">
                        <h3>Sales  Paid Amount</h3>
                           <p class="large-number positive">${formatCurrency(totals.salePaidAmount)}</p>
                           
                    </div>
                    <div class="summary-card">
                        <h3>Sales  Due Amount</h3>
                           <p class="large-number positive"> ${formatCurrency(totals.saleDueAmount)}</p>
                         
                    </div>


                     <div class="summary-card">
                        <h3>Returns Paid Amount</h3>
                           <p class="large-number negative">${formatCurrency(totals.returnPaidAmount)}</p>
                         
                    </div>


                       <div class="summary-card">
                        <h3>Returns Due Amount</h3>
                           <p class="large-number negative"> ${formatCurrency(totals.returnDueAmount)}</p>
                         
                    </div>










                    
                </div>

                <div class="transactions-container">
                    <div class="table-header">
                        <h3>Transaction Details</h3>
                        <input type="text" id="transactionSearch" 
                               placeholder="Search transactions..." 
                               class="form-control search-input">
                    </div>
                    <div class="table-responsive">
                        <table class="table transaction-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Invoice #</th>
                                    <th>Customer</th>
                                    <th>Type</th>
                                    <th>Payment Method</th>
                                    <th class="text-right">Items</th>
                                    <th class="text-right">Total Amount</th>
                                    <th class="text-right">Paid Amount</th>
                                    <th class="text-right">Due Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dayData.transactions.map(t => `
                                    <tr class="${t.transactionType === 'Return' ? 'return-row' : ''}">
                                        <td>${t.time}</td>
                                        <td>${t.invoiceNumber}</td>
                                        <td>${t.customerName}</td>
                                        <td>
                                            <span class="badge ${t.transactionType === 'Return' ? 'badge-danger' : 'badge-success'}">
                                                ${t.transactionType}
                                            </span>
                                        </td>
                                        <td>${t.paymentMethod}</td>
                                        <td class="text-right">${t.itemCount}</td>
                                        <td class="text-right ${t.transactionType === 'Return' ? 'negative' : 'positive'}">
                                            ${formatCurrency(t.total)}
                                        </td>
                                        <td class="text-right ${t.transactionType === 'Return' ? 'negative' : 'positive'}">
                                            ${formatCurrency(t.paidAmount || 0)}
                                        </td>
                                        <td class="text-right ${t.transactionType === 'Return' ? 'negative' : 'positive'}">
                                            ${formatCurrency(t.dueAmount || 0)}
                                        </td>
                                        <td>
                                            <button class="btn btn-sm action-btn" onclick="viewProductDetails('${t.invoiceNumber}', '${t.transactionType}')">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="5"><strong>Total</strong></td>
                                    <td class="text-right"><strong>${totals.totalItems}</strong></td>
                                    <td class="text-right ${(totals.salesAmount + totals.returnsAmount) >= 0 ? 'positive' : 'negative'}">
    <strong>${formatCurrency(totals.salesAmount + totals.returnsAmount)}</strong>
</td>
                                    <td class="text-right">
                                        <strong>${formatCurrency(totals.salePaidAmount - totals.returnPaidAmount)}</strong>
                                    </td>
                                    <td class="text-right">
                                        <strong>${formatCurrency(totals.saleDueAmount - totals.returnDueAmount)}</strong>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                
                <!-- Product details container -->
                <div id="productDetailsContainer" class="product-details-container" style="display: none;">
                    <div class="product-details-header">
                        <h3>Product Details - <span id="invoiceLabel"></span></h3>
                        <button class="btn btn-sm btn-secondary" onclick="closeProductDetails()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table product-table">
                            <thead>
                                <tr>
                                    <th>Product Code</th>
                                    <th>Description</th>
                                    <th class="text-right">Quantity</th>
                                    <th class="text-right">Unit Price</th>
                                    <th class="text-right">Discount</th>
                                    <th class="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody id="productTableBody">
                                <!-- Product rows will be inserted here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add the necessary styles
    const modalStyles = `
        <style>
            .transactions-container {
                margin-top: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                padding: 20px;
            }

            .table-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }

            .search-input {
                width: 250px;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }

            .transaction-table {
                width: 100%;
                border-collapse: collapse;
            }

            .transaction-table th,
            .transaction-table td {
                padding: 12px;
                border-bottom: 1px solid #eee;
            }

            .transaction-table thead th {
                background: #f8f9fa;
                font-weight: 600;
                text-transform: uppercase;
                font-size: 0.85rem;
                color: #495057;
            }

            .text-right {
                text-align: right;
            }

            .return-row {
                background-color: #fff5f5;
            }

            .total-row {
                background-color: #f8f9fa;
                font-weight: bold;
            }

            .total-row td {
                border-top: 2px solid #dee2e6;
            }

            .badge {
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
            }

            .badge-success {
                background: #d4edda;
                color: #155724;
            }

            .badge-danger {
                background: #f8d7da;
                color: #721c24;
            }

            .table-responsive {
                overflow-x: auto;
                max-height: 600px;
                overflow-y: auto;
            }

            .transaction-table thead th,
            .product-table thead th {
                position: sticky;
                top: 0;
                background: #f8f9fa;
                z-index: 1;
            }
            
            /* Product details styles */
            .product-details-container {
                margin-top: 30px;
                background: #f9f9f9;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                padding: 20px;
                border-left: 4px solid #4e73df;
            }
            
            .product-details-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            
            .product-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .product-table th,
            .product-table td {
                padding: 10px;
                border-bottom: 1px solid #eee;
            }
            
            .positive {
                color: #28a745;
            }
            
            .negative {
                color: #dc3545;
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', modalStyles);
    modal.style.display = 'block';

    // Initialize search functionality
    const searchInput = document.getElementById('transactionSearch');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('.transaction-table tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
    
    // Add event listeners for buttons
    document.getElementById('printDailyBtn').addEventListener('click', printDailyDetails);
    document.getElementById('modalCloseBtn').addEventListener('click', closeDailyDetailsModal);
}

// Function to view product details
async function viewProductDetails(invoiceNumber, transactionType) {
    try {
        
        showLoadingSpinner();
        
        // Get product details from the database
        const products = await window.api.getProductDetails(invoiceNumber, transactionType);
        
        if (!products || products.length === 0) {
            showNotification(`No products found for Invoice #${invoiceNumber}`, 'info');
            hideLoadingSpinner();
            return;
        }
        // Update the invoice label
        document.getElementById('invoiceLabel').textContent = `Invoice #${invoiceNumber} (${transactionType})`;
        
        // Calculate totals
        let totalQuantity = 0;
        let grandTotal = 0;
        
        // Populate the product table
        const productTableBody = document.getElementById('productTableBody');
        productTableBody.innerHTML = products.map(product => {
            // Handle different property names between sales and returns
            const isReturn = transactionType.toLowerCase() === 'return';
            
            // Extract values based on whether it's a sale or return
            const productId = product.productCode || product.productId || 'N/A';
            const productName = product.productName || product.description || 'N/A';
            
            // For quantity, check all possible properties
            const quantity = parseFloat(
                isReturn ? (product.returnQuantity || 0) : (product.quantity || 0)
            );
            
            // For unit price, check all possible properties
            const unitPrice = parseFloat(
                isReturn ? (product.salePrice || product.rate || 0) : (product.rate || product.unitPrice || product.price || 0)
            );
            
            // For discount, check all possible properties
            const discount = parseFloat(
                product.unitDiscount || product.percentageDiscount || product.discount || 0
            );
            
            // For total, calculate or use provided value
            let total;
            if (product.total || product.totalAmount) {
                total = parseFloat(product.total || product.totalAmount);
            } else {
                total = quantity * unitPrice - discount;
            }
            
            // Update running totals
            if (!isNaN(quantity)) totalQuantity += quantity;
            if (!isNaN(total)) grandTotal += total;
            
            return `
                <tr>
                    <td>${productId}</td>
                    <td>${productName}</td>
                    <td class="text-right">${isNaN(quantity) ? 'N/A' : quantity}</td>
                    <td class="text-right">${isNaN(unitPrice) ? 'N/A' : formatCurrency(unitPrice)}</td>
                    <td class="text-right">${isNaN(discount) ? 'N/A' : formatCurrency(discount)}</td>
                    <td class="text-right">${isNaN(total) ? 'N/A' : formatCurrency(total)}</td>
                </tr>
            `;
        }).join('') + `
            <tr class="total-row">
                <td colspan="2"><strong>Total</strong></td>
                <td class="text-right"><strong>${isNaN(totalQuantity) ? 'N/A' : totalQuantity}</strong></td>
                <td></td>
                <td></td>
                <td class="text-right"><strong>${isNaN(grandTotal) ? 'N/A' : formatCurrency(grandTotal)}</strong></td>
            </tr>
        `;
        
        // Make sure the product details container is styled as a popup
        const productDetailsContainer = document.getElementById('productDetailsContainer');
        productDetailsContainer.style.display = 'block';
        productDetailsContainer.style.position = 'fixed';
        productDetailsContainer.style.zIndex = '1000'; // Higher than the main modal
        productDetailsContainer.style.top = '50%';
        productDetailsContainer.style.left = '50%';
        productDetailsContainer.style.transform = 'translate(-50%, -50%)';
        productDetailsContainer.style.backgroundColor = 'white';
        productDetailsContainer.style.padding = '20px';
        productDetailsContainer.style.borderRadius = '5px';
        productDetailsContainer.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
        productDetailsContainer.style.maxWidth = '80%';
        productDetailsContainer.style.maxHeight = '80%';
        productDetailsContainer.style.overflow = 'auto';
        
    } catch (error) {
        console.error('Error retrieving product details:', error);
        showNotification('Error retrieving product details: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Function to close product details
function closeProductDetails() {
    document.getElementById('productDetailsContainer').style.display = 'none';
}

// Function to close product details
function closeProductDetails() {
    document.getElementById('productDetailsContainer').style.display = 'none';
}

// Function to print daily details
function printDailyDetails() {
    // Get the modal content and headers
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent) {
        showNotification('Cannot find modal content to print', 'error');
        return;
    }
    
    const dateTitle = modalContent.querySelector('h2').textContent;
    const productDetailsShown = document.getElementById('productDetailsContainer').style.display !== 'none';
    const invoiceLabel = productDetailsShown ? document.getElementById('invoiceLabel').textContent : '';
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    // Start building print content
    let printContent = `
        <html>
        <head>
            <title>${dateTitle}${productDetailsShown ? ' - ' + invoiceLabel : ''}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; }
                h1, h2, h3 { color: #333; }
                .header { margin-bottom: 20px; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
                .summary-item { padding: 15px; border: 1px solid #ddd; background: #f9f9f9; }
                .text-right { text-align: right; }
                .positive { color: #28a745; }
                .negative { color: #dc3545; }
                .footer { margin-top: 30px; font-size: 12px; text-align: center; }
                .badge { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; }
                .badge-success { background: #d4edda; color: #155724; }
                .badge-danger { background: #f8d7da; color: #721c24; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${dateTitle}</h1>
                <p>Generated on: ${formatDate(new Date())}</p>
            </div>
    `;
    
    // Add summary cards
    const summaryCards = document.querySelectorAll('.summary-card');
    if (summaryCards.length > 0) {
        printContent += `
            <div class="summary">
                ${Array.from(summaryCards).map(card => `
                    <div class="summary-item">
                        <h3>${card.querySelector('h3').textContent}</h3>
                        <p>${card.querySelector('.large-number').textContent}</p>
                        ${card.querySelector('.sub-text') ? `<p>${card.querySelector('.sub-text').textContent}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Add either transaction table or product details based on what's shown
    if (!productDetailsShown) {
        // Print the transaction table
        const transactionTable = document.querySelector('.transaction-table').cloneNode(true);
        
        // Remove the action column from the print view
        const headerRow = transactionTable.querySelector('thead tr');
        headerRow.removeChild(headerRow.lastElementChild);
        
        const rows = transactionTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.lastElementChild) {
                row.removeChild(row.lastElementChild);
            }
        });
        
        // Remove the empty cell in the footer
        const footerRow = transactionTable.querySelector('tfoot tr');
        if (footerRow && footerRow.lastElementChild) {
            footerRow.removeChild(footerRow.lastElementChild);
        }
        
        printContent += `
            <h2>Transaction Details</h2>
            <div>${transactionTable.outerHTML}</div>
        `;
    } else {
        // Print the product details
        const productTable = document.querySelector('.product-table').cloneNode(true);
        
        printContent += `
            <h2>Product Details - ${invoiceLabel}</h2>
            <div>${productTable.outerHTML}</div>
        `;
    }
    
    // Add footer and close HTML
    printContent += `
            <div class="footer">
                <p>Report generated from Daily Sales Report Module</p>
            </div>
        </body>
        </html>
    `;
    
    // Write to the new window, close document writing, and trigger print
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Add delay to ensure content is loaded before printing
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}
function updatePaymentMethodDistribution(transactions) {
    const paymentMethods = {};
    transactions.forEach(transaction => {
        const method = transaction.paymentMethod;
        if (!paymentMethods[method]) {
            paymentMethods[method] = 0;
        }
        paymentMethods[method] += parseFloat(transaction.total);
    });

    const labels = Object.keys(paymentMethods);
    const data = Object.values(paymentMethods);

    if (paymentMethodChart) {
        paymentMethodChart.data.labels = labels;
        paymentMethodChart.data.datasets[0].data = data;
        paymentMethodChart.update();
    }
}
// New function to update single day view
function updateSingleDayView(dayData) {
    // Hide the eye button column since we're showing details directly
    document.querySelectorAll('.action-btn').forEach(btn => btn.style.display = 'none');
    
    // Expand the main table to show transaction details
    const tbody = document.getElementById('reportData');
    tbody.innerHTML = dayData.transactions.map(transaction => `
        <tr class="${transaction.transactionType === 'Return' ? 'return-row' : ''}">
            <td>${transaction.time}</td>
            <td>${transaction.invoiceNumber}</td>
            <td>${transaction.customerName}</td>
            <td>
                <span class="badge ${transaction.transactionType === 'Return' ? 'badge-danger' : 'badge-success'}">
                    ${transaction.transactionType}
                </span>
            </td>
            <td>${transaction.paymentMethod}</td>
            <td>${transaction.itemCount}</td>
            <td class="amount ${transaction.transactionType === 'Return' ? 'negative' : 'positive'}">
                ${formatCurrency(transaction.total)}
            </td>
            <td class="amount ${transaction.transactionType === 'Return' ? 'negative' : 'positive'}">
                ${formatCurrency(transaction.paidAmount || 0)}
            </td>
            <td class="amount ${transaction.transactionType === 'Return' ? 'negative' : 'positive'}">
                ${formatCurrency(transaction.dueAmount || 0)}
            </td>
        </tr>
    `).join('');

    // Update column headers for transaction view
    const thead = document.querySelector('#reportTable thead tr');
    thead.innerHTML = `
        <th>Time</th>
        <th>Invoice #</th>
        <th>Customer</th>
        <th>Type</th>
        <th>Payment Method</th>
        <th>Items</th>
        <th>Total Amount</th>
        <th>Paid Amount</th>
        <th>Due Amount</th>
    `;

    // Update hourly chart
    updateHourlyChart(dayData.transactions);
}

// New function to update hourly chart

// Close daily details modal
function closeDailyDetailsModal() {
    document.getElementById('dailyDetailsModal').style.display = 'none';
}


// Helper function to create payment method summary map
function createPaymentMethodSummary(transactions) {
    const paymentMethodMap = new Map();
    transactions.forEach(transaction => {
        const method = transaction.paymentMethod;
        if (!paymentMethodMap.has(method)) {
            paymentMethodMap.set(method, { count: 0, amount: 0 });
        }
        const data = paymentMethodMap.get(method);
        data.count++;
        data.amount += parseFloat(transaction.total);
        paymentMethodMap.set(method, data);
    });
    return paymentMethodMap;
}

// Export report to CSV
function exportReportToCsv() {
    if (filteredData.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    const headers = [
        'Date', 
        'Total Transactions', 
        'Sales Count', 
        'Return Count',
        'Sales Amount',
        'Returns Amount',
        'Net Amount'
    ];
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    filteredData.forEach(item => {
        const row = [
            formatDate(item.date),
            item.totalTransactions,
            item.salesCount,
            item.returnCount,
            item.salesAmount,
            item.returnsAmount,
            item.netAmount
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    // Create and trigger download
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daily_sales_report_${formatDateForFilename(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export report to PDF
function exportReportToPdf() {
    if (filteredData.length === 0) {
        showNotification('No data to export', 'error');
        return;
    }
    
    // Create printable content that will be converted to PDF
    const printWindow = window.open('', '_blank');
    
    // Safely get element text content with fallback
    const getElementTextContent = (id) => {
        const element = document.getElementById(id);
        return element ? element.textContent : 'N/A';
    };
    
    // Safely get element value with fallback
    const getElementValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value : 'N/A';
    };
    
    // Create print content - make sure it matches the updated layout from printReport
    const printContent = `
        <html>
        <head>
            <title>Daily Sales Report - ${formatDate(new Date())}</title>
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
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Daily Sales Report</h1>
                <p>Generated on: ${formatDate(new Date())}</p>
            </div>
            
            <div class="filters">
                <p><strong>Date Range:</strong> ${getElementValue('fromDate')} to ${getElementValue('toDate')}</p>
                <p><strong>Payment Method:</strong> ${getElementValue('paymentMethod') || 'All Payment Methods'}</p>
                <p><strong>Transaction Type:</strong> ${getElementValue('transactionType') || 'All Transactions'}</p>
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <h3>Total Transactions</h3>
                    <p>${getElementTextContent('totalTransactions')}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Sales</h3>
                    <p>${getElementTextContent('totalSales')}</p>
                </div>
                <div class="summary-item">
                    <h3>Sales Paid</h3>
                    <p>${getElementTextContent('totalSalePaid')}</p>
                </div>
                <div class="summary-item">
                    <h3>Sales Due</h3>
                    <p>${getElementTextContent('totalSaleDue')}</p>
                </div>
                <div class="summary-item">
                    <h3>Total Returns</h3>
                    <p>${getElementTextContent('totalReturns')}</p>
                </div>
                <div class="summary-item">
                    <h3>Returns Paid</h3>
                    <p>${getElementTextContent('totalReturnPaid')}</p>
                </div>
                <div class="summary-item">
                    <h3>Returns Due</h3>
                    <p>${getElementTextContent('totalReturnDue')}</p>
                </div>
                <div class="summary-item">
                    <h3>Net Amount</h3>
                    <p>${getElementTextContent('netAmount')}</p>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Total Transactions</th>
                        <th>Sales Count</th>
                        <th>Return Count</th>
                        <th>Sales Amount</th>
                        <th>Sales Paid</th>
                        <th>Sales Due</th>
                        <th>Returns Amount</th>
                        <th>Returns Paid</th>
                        <th>Returns Due</th>
                        <th>Net Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map(item => `
                        <tr>
                            <td>${formatDate(item.date)}</td>
                            <td>${item.totalTransactions}</td>
                            <td>${item.salesCount}</td>
                            <td>${item.returnCount}</td>
                            <td>${formatCurrency(item.salesAmount)}</td>
                            <td>${formatCurrency(item.salePaidAmount)}</td>
                            <td>${formatCurrency(item.saleDueAmount)}</td>
                            <td>${formatCurrency(item.returnsAmount)}</td>
                            <td>${formatCurrency(item.returnPaidAmount)}</td>
                            <td>${formatCurrency(item.returnDueAmount)}</td>
                            <td>${formatCurrency(item.netAmount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" class="text-right"><strong>Totals:</strong></td>
                        <td>${getElementTextContent('footerSalesCount')}</td>
                        <td>${getElementTextContent('footerReturnCount')}</td>
                        <td>${getElementTextContent('footerSalesAmount')}</td>
                        <td>${getElementTextContent('footerSalePaid')}</td>
                        <td>${getElementTextContent('footerSaleDue')}</td>
                        <td>${getElementTextContent('footerReturnsAmount')}</td>
                        <td>${getElementTextContent('footerReturnPaid')}</td>
                        <td>${getElementTextContent('footerReturnDue')}</td>
                        <td>${getElementTextContent('footerNetAmount')}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated from Daily Sales Report Module</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Add delay to ensure content is loaded, then print to PDF
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
}

// Helper function to format date for filenames
function formatDateForFilename(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeReport();
});

function updateHourlyChart(transactions) {
    // Create hourly aggregates
    const hourlyData = {};
    transactions.forEach(transaction => {
        const hour = transaction.time.split(':')[0];
        if (!hourlyData[hour]) {
            hourlyData[hour] = { 
                sales: 0, 
                returns: 0, 
                count: 0 
            };
        }
        
        if (transaction.transactionType === 'Sale') {
            hourlyData[hour].sales += parseFloat(transaction.total);
        } else {
            hourlyData[hour].returns += parseFloat(transaction.total);
        }
        hourlyData[hour].count++;
    });

    // Convert to array and sort by hour
    const chartData = Object.entries(hourlyData)
        .map(([hour, data]) => ({
            hour: `${hour}:00`,
            ...data
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

    // Update chart
    if (hourlyTransactionChart) {
        hourlyTransactionChart.data.labels = chartData.map(d => d.hour);
        hourlyTransactionChart.data.datasets = [
            {
                label: 'Sales',
                data: chartData.map(d => d.sales),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)'
            },
            {
                label: 'Returns',
                data: chartData.map(d => d.returns),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)'
            }
        ];
        hourlyTransactionChart.update();
    }
}

// Add necessary styles
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .modal-content {
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-height: 90vh;
            overflow-y: auto;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .large-number {
            font-size: 24px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
        
        .chart-container {
            margin: 30px 0;
            height: 300px;
        }
        
        .badge {
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .badge-success { background: #d4edda; color: #155724; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        
        .return-row { background-color: #fff5f5; }
        
        .transactions-table {
            margin-top: 30px;
        }
    </style>
`);

async function initializeCharts() {
    try {
        await loadChartJS();
        
        // Get the canvas context safely
        const dailySalesCanvas = document.getElementById('dailySalesChart');
        if (!dailySalesCanvas) {
            throw new Error('Daily sales chart canvas not found');
        }
        const dailySalesCtx = dailySalesCanvas.getContext('2d');

        // Destroy existing chart instance if it exists
        if (dailySalesChart instanceof Chart) {
            dailySalesChart.destroy();
        }

        // Create new chart with proper configuration
        dailySalesChart = new Chart(dailySalesCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Sales',
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        data: []
                    },
                    {
                        label: 'Returns',
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        data: []
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount (Rs)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });

        // Add error handling for chart creation
        if (!dailySalesChart) {
            throw new Error('Failed to create daily sales chart');
        }

    } catch (error) {
        console.error('Error initializing charts:', error);
        showNotification('Error initializing charts: ' + error.message, 'error');
    }
}

// Update charts with proper error handling and data validation
function updateCharts() {
    try {
        if (!dailySalesChart) {
            console.warn('Charts not initialized, attempting to initialize...');
            initializeCharts();
            return;
        }

        if (!Array.isArray(filteredData) || filteredData.length === 0) {
            resetCharts();
            return;
        }

        // Prepare data with validation
        const dates = filteredData.map(day => formatDate(day.date));
        const salesData = filteredData.map(day => parseFloat(day.salesAmount) || 0);
        const returnsData = filteredData.map(day => parseFloat(day.returnsAmount) || 0);

        // Update chart data safely
        dailySalesChart.data.labels = dates;
        dailySalesChart.data.datasets[0].data = salesData;
        dailySalesChart.data.datasets[1].data = returnsData;

        // Ensure proper animation and update
        dailySalesChart.options.animation = {
            duration: 750,
            easing: 'easeInOutQuart'
        };

        // Update the chart with error handling
        try {
            dailySalesChart.update('active');
        } catch (updateError) {
            console.error('Error updating chart:', updateError);
            // Attempt to recover by reinitializing
            initializeCharts();
        }

    } catch (error) {
        console.error('Error in updateCharts:', error);
        showNotification('Error updating charts: ' + error.message, 'error');
    }
}

// Reset charts with proper cleanup
function resetCharts() {
    try {
        if (dailySalesChart) {
            dailySalesChart.data.labels = [];
            dailySalesChart.data.datasets[0].data = [];
            dailySalesChart.data.datasets[1].data = [];
            dailySalesChart.update('none');
        }
    } catch (error) {
        console.error('Error resetting charts:', error);
        showNotification('Error resetting charts: ' + error.message, 'error');
    }
}

// Enhanced Chart.js loader with integrity check and timeout
function loadChartJS() {
    return new Promise((resolve, reject) => {
        if (window.Chart) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.8.0/chart.min.js';
        script.integrity = "sha512-sW/w8s4RWTdFFSduOTGtk4isV1+190E/GghVffMA9XczdJ2MDzSzLEubKAs5h0wzgSJOQTRYyaz73L3d6RtJSg==";
        script.crossOrigin = "anonymous";

        // Add timeout for script loading
        const timeout = setTimeout(() => {
            reject(new Error('Chart.js load timeout'));
        }, 10000);

        script.onload = () => {
            clearTimeout(timeout);
            if (window.Chart) {
                resolve();
            } else {
                reject(new Error('Chart.js failed to initialize'));
            }
        };

        script.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load Chart.js'));
        };

        document.head.appendChild(script);
    });
}