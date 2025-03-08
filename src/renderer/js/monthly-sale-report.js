let reportData = [];
let filteredData = [];
let monthlyAggregatedData = [];
let currentPage = 1;
const rowsPerPage = 10;
let monthlySalesChart = null;
let paymentMethodChart = null;

// Initialize the report page
// First, ensure the HTML structure exists before initializing charts
async function initializeReport() {
    try {
        // Create chart containers first
        // createChartContainers();

        // Set default dates
        setDateToCurrentMonth('toDate');
        setDateRangeByShortcut('thisMonth');

        // Initialize event listeners
        initializeEventListeners();

        // Load Chart.js and initialize charts
        await loadChartJS();
        await initializeCharts();

        // Update report view with empty data
        updateReportView();
    } catch (error) {
        console.error('Error initializing report:', error);
        showNotification('Error initializing report: ' + error.message, 'error');
    }
}

// Separate function to create chart containers
// function createChartContainers() {
//     // First, ensure the charts container exists
//     let chartsContainer = document.querySelector('.charts-container');
//     if (!chartsContainer) {
//         chartsContainer = document.createElement('div');
//         chartsContainer.className = 'charts-container';
        
//         // Find appropriate location to insert charts container
//         const reportContent = document.querySelector('#reportContent') || document.body;
//         reportContent.appendChild(chartsContainer);
//     }

//     // Clear existing content
//     chartsContainer.innerHTML = `
//         <div class="chart-wrapper">
//             <canvas id="monthlySalesChart"></canvas>
//         </div>
//         <div class="chart-wrapper">
//             <canvas id="paymentMethodChart"></canvas>
//         </div>
//     `;

//     // Add chart styles
//     if (!document.getElementById('chartStyles')) {
//         const styleElement = document.createElement('style');
//         styleElement.id = 'chartStyles';
//         styleElement.textContent = `
//             .charts-container {
//                 display: grid;
//                 grid-template-columns: 1fr 1fr;
//                 gap: 20px;
//                 margin: 20px 0;
//                 padding: 20px;
//                 background: #fff;
//                 border-radius: 8px;
//                 box-shadow: 0 2px 4px rgba(0,0,0,0.1);
//             }
            
//             .chart-wrapper {
//                 background: #fff;
//                 padding: 15px;
//                 border-radius: 8px;
//                 box-shadow: 0 2px 4px rgba(0,0,0,0.05);
//                 min-height: 300px;
//             }
            
//             @media (max-width: 768px) {
//                 .charts-container {
//                     grid-template-columns: 1fr;
//                 }
//             }
//         `;
//         document.head.appendChild(styleElement);
//     }
// }

// Modified Chart.js initialization
async function initializeCharts() {
    try {
        const monthlySalesCtx = document.getElementById('monthlySalesChart');
        const paymentCtx = document.getElementById('paymentMethodChart');

        if (!monthlySalesCtx || !paymentCtx) {
            throw new Error('Chart containers not found');
        }

        // Initialize Monthly Sales Chart
        monthlySalesChart = new Chart(monthlySalesCtx, {
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
                    title: {
                        display: true,
                        text: 'Monthly Sales & Returns',
                        font: { size: 16 }
                    },
                    legend: { position: 'top' }
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
                            text: 'Month'
                        }
                    }
                }
            }
        });

        // Initialize Payment Method Chart
        paymentMethodChart = new Chart(paymentCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(255, 205, 86, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    title: {
                        display: true,
                        text: 'Payment Method Distribution',
                        font: { size: 16 }
                    }
                }
            }
        });

        return { monthlySalesChart, paymentMethodChart };
    } catch (error) {
        console.error('Error initializing charts:', error);
        throw new Error('Failed to initialize charts: ' + error.message);
    }
}
// Load Chart.js dynamically
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
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Chart.js'));
        document.head.appendChild(script);
    });
}

// Initialize event listeners
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
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    
    // Print button
    document.getElementById('printBtn').addEventListener('click', printReport);
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', resetFilters);
    
    // Table search
    document.getElementById('tableSearch').addEventListener('input', filterReportTable);
    
    // Export buttons
    document.getElementById('exportCsvBtn').addEventListener('click', exportReportToCsv);
    document.getElementById('exportPdfBtn').addEventListener('click', exportReportToPdf);
    
    // Pagination controls
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    
    // Monthly details modal controls
    document.querySelector('#monthlyDetailsModal .close-btn').addEventListener('click', closeMonthlyDetailsModal);
    document.getElementById('modalCloseBtn').addEventListener('click', closeMonthlyDetailsModal);
    document.getElementById('printMonthlyBtn').addEventListener('click', printMonthlyDetails);
    
    // Date inputs validation
    document.getElementById('fromDate').addEventListener('change', validateDateRange);
    document.getElementById('toDate').addEventListener('change', validateDateRange);
}

// Print report
function printReport() {
    if (filteredData.length === 0) {
        showNotification('No data to print', 'error');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const printContent = `
        <html>
        <head>
            <title>Monthly Sales Report - ${formatDate(new Date())}</title>
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
                <h1>Monthly Sales Report</h1>
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
                        <th>Month</th>
                        <th>Total Transactions</th>
                        <th>Sales Count</th>
                        <th>Return Count</th>
                        <th>Sales Amount</th>
                        <th>Returns Amount</th>
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
                            <td>${formatCurrency(item.returnsAmount)}</td>
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
                        <td>${document.getElementById('footerReturnsAmount').textContent}</td>
                        <td>${document.getElementById('footerNetAmount').textContent}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated from Monthly Sales Report Module</p>
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
        case 'thisMonth':
            // Start of current month
            fromDate.setMonth(today.getMonth(), 1);
            document.getElementById('fromDate').valueAsDate = fromDate;
            document.getElementById('toDate').valueAsDate = today;
            break;
            
        case 'lastMonth':
            // Start of last month
            fromDate.setMonth(today.getMonth() - 1, 1);
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
            document.getElementById('fromDate').valueAsDate = fromDate;
            document.getElementById('toDate').valueAsDate = lastMonthEnd;
            break;
            
        case 'thisYear':
            // Start of current year
            fromDate.setMonth(0, 1);
            document.getElementById('fromDate').valueAsDate = fromDate;
            document.getElementById('toDate').valueAsDate = today;
            break;
    }
}

// Helper to set a date input to the current month
function setDateToCurrentMonth(inputId) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById(inputId).valueAsDate = firstDayOfMonth;
}

// Generate report based on filters
// Update the generateReport function to match the backend parameters
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
        // Format parameters to match backend expectations
        const params = {
            fromDate: fromDate,
            toDate: toDate,
            paymentMethod: paymentMethod || null,
            transactionType: transactionType ? capitalizeFirstLetter(transactionType) : null
        };
        
        // Fetch data from backend
        reportData = await window.api.getMonthlySalesData(params);
        
        // Since backend handles aggregation, we just need to format the data
        monthlyAggregatedData = reportData;
        
        // Apply any additional frontend filters
        applyFilters();
        
        // Reset to first page
        currentPage = 1;
        
        // Update views
        updateReportView();
        updateCharts();
        updateSummaryData();
        
        // Show success message
        if (monthlyAggregatedData.length === 0) {
            showNotification('No data found for the selected criteria', 'info');
        } else {
            showNotification(`Data found for ${monthlyAggregatedData.length} months`, 'success');
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('Error generating report: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}


function aggregateMonthlyData() {
    // Since the SQL query now handles aggregation, we can simplify this function
    monthlyAggregatedData = reportData.map(data => ({
        ...data,
        // Ensure all numeric fields are properly parsed
        totalTransactions: parseInt(data.totalTransactions),
        salesCount: parseInt(data.salesCount),
        returnCount: parseInt(data.returnCount),
        salesAmount: parseFloat(data.salesAmount),
        returnsAmount: parseFloat(data.returnsAmount),
        netAmount: parseFloat(data.netAmount)
    }));

    // Sort by date
    monthlyAggregatedData.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Apply filters
function applyFilters() {
    // Since main filtering is handled by SQL, we only need to handle additional frontend filters
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    
    if (!searchTerm) {
        filteredData = [...monthlyAggregatedData];
        return;
    }
    
    filteredData = monthlyAggregatedData.filter(item => 
        formatDate(item.date).toLowerCase().includes(searchTerm)
    );
}

// Helper function to capitalize first letter (for transaction type)
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

// Update the formatDate function to handle the new date format
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short'
    });
}


// Reset all filters
function resetFilters() {
    document.getElementById('paymentMethod').value = '';
    document.getElementById('transactionType').value = '';
    setDateToCurrentMonth('toDate');
    setDateRangeByShortcut('thisMonth');
    
    // Reset active button
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.range === 'thisMonth') {
            btn.classList.add('active');
        }
    });
    
    // Clear the report data
    reportData = [];
    monthlyAggregatedData = [];
    filteredData = [];
    updateReportView();
    updateCharts();
    updateSummaryData();
}

// Filter report table based on search
function filterReportTable() {
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    
    if (searchTerm.length < 1) {
        filteredData = [...monthlyAggregatedData];
    } else {
        filteredData = monthlyAggregatedData.filter(item => 
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
                <td colspan="8" class="text-center">No data found. Adjust your filters or generate a new report.</td>
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
                <td>${formatCurrency(item.returnsAmount)}</td>
                <td>${formatCurrency(item.netAmount)}</td>
                <td>
                    <button class="btn btn-sm action-btn" onclick="viewMonthlyDetails('${item.date}')">
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
    let totalReturnsAmount = 0;
    let totalNetAmount = 0;
    
    filteredData.forEach(item => {
        totalSalesCount += item.salesCount;
        totalReturnCount += item.returnCount;
        totalSalesAmount += item.salesAmount;
        totalReturnsAmount += item.returnsAmount;
        totalNetAmount += item.netAmount;
    });
    
    const tfoot = document.querySelector('#reportTable tfoot');
    tfoot.innerHTML = `
        <tr>
            <td colspan="2" class="text-right"><strong>Totals:</strong></td>
            <td>${totalSalesCount}</td>
            <td>${totalReturnCount}</td>
            <td>${formatCurrency(totalSalesAmount)}</td>
            <td>${formatCurrency(totalReturnsAmount)}</td>
            <td>${formatCurrency(totalNetAmount)}</td>
        </tr>
    `;
}

// Update the summary section with totals
function updateSummaryData() {
    let totalTransactions = 0;
    let totalSales = 0;
    let totalReturns = 0;
    let netAmount = 0;
    
    filteredData.forEach(item => {
        totalTransactions += item.totalTransactions;
        totalSales += item.salesAmount;
        totalReturns += item.returnsAmount;
    });
    
    netAmount = totalSales - totalReturns;
    
    document.getElementById('totalTransactions').textContent = totalTransactions;
    document.getElementById('totalSales').textContent = formatCurrency(totalSales);
    document.getElementById('totalReturns').textContent = formatCurrency(totalReturns);
    document.getElementById('netAmount').textContent = formatCurrency(netAmount);
}

// Update charts with filtered data
function updateCharts() {
    if (!monthlySalesChart || !paymentMethodChart) {
        console.warn('Charts not initialized, skipping update');
        return;
    }
    
    if (filteredData.length === 0) {
        resetCharts();
        return;
    }
    
    // Update monthly sales/returns chart
    const months = filteredData.map(month => formatDate(month.date));
    const salesData = filteredData.map(month => month.salesAmount);
    const returnsData = filteredData.map(month => month.returnsAmount);
    
    monthlySalesChart.data.labels = months;
    monthlySalesChart.data.datasets[0].data = salesData;
    monthlySalesChart.data.datasets[1].data = returnsData;
    monthlySalesChart.update();
   
    
    // Update payment method chart
    const paymentMethodMap = new Map();
    reportData.forEach(transaction => {
        const method = transaction.paymentMethod;
        if (!paymentMethodMap.has(method)) {
            paymentMethodMap.set(method, 0);
        }
        paymentMethodMap.set(method, paymentMethodMap.get(method) + parseFloat(transaction.total));
    });
    
    const paymentLabels = Array.from(paymentMethodMap.keys());
    const paymentValues = Array.from(paymentMethodMap.values());
    
    paymentMethodChart.data.labels = paymentLabels;
    paymentMethodChart.data.datasets[0].data = paymentValues;
    paymentMethodChart.update();
}

// Reset charts
function resetCharts() {
    if (monthlySalesChart) {
        monthlySalesChart.data.labels = [];
        monthlySalesChart.data.datasets[0].data = [];
        monthlySalesChart.data.datasets[1].data = [];
        monthlySalesChart.update();
    }
    
    if (paymentMethodChart) {
        paymentMethodChart.data.labels = [];
        paymentMethodChart.data.datasets[0].data = [];
        paymentMethodChart.update();
    }
}

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
        month: 'short' 
    });
}

async function viewMonthlyDetails(date) {
    try {
        const [year, month] = date.split('-');
        const monthData = await window.api.getMonthlyTransactionDetails({ year, month });
        
        // Add CSS styles dynamically
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .modal-content {
                width: 95%;
                max-width: 1400px;
                background: #fff;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                padding: 24px;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 24px;
                padding-bottom: 16px;
                border-bottom: 1px solid #eee;
            }

            .modal-header h2 {
                font-size: 24px;
                color: #2c3e50;
                margin: 0;
            }

            .modal-actions {
                display: flex;
                gap: 12px;
            }

            .btn {
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 500;
                transition: all 0.3s ease;
            }

            .btn-primary {
                background: #3498db;
                color: white;
            }

            .btn-secondary {
                background: #95a5a6;
                color: white;
            }

            .btn-info {
                background: #2980b9;
                color: white;
            }

            .btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .summary-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 32px;
            }

            .summary-card {
                background: #f8fafc;
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                transition: transform 0.3s ease;
            }

            .summary-card:hover {
                transform: translateY(-5px);
            }

            .summary-card h3 {
                color: #64748b;
                font-size: 16px;
                margin-bottom: 12px;
            }

            .large-number {
                font-size: 28px;
                font-weight: bold;
                margin: 8px 0;
            }

            .sub-text {
                font-size: 14px;
                color: #94a3b8;
            }

            .positive { color: #10b981; }
            .negative { color: #ef4444; }

            .transactions-container {
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
            }

            .table-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid #eee;
            }

            .search-input {
                padding: 8px 16px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                width: 300px;
                font-size: 14px;
            }

            .table-responsive {
                overflow-x: auto;
            }

            .transaction-table {
                width: 100%;
                border-collapse: collapse;
            }

            .transaction-table th {
                background: #f8fafc;
                padding: 12px 16px;
                text-align: left;
                font-weight: 600;
                color: #64748b;
                border-bottom: 2px solid #e2e8f0;
            }

            .transaction-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                color: #334155;
            }

            .transaction-table tbody tr:hover {
                background: #f8fafc;
            }

            .return-row {
                background: #fef2f2;
            }

            .badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }

            .badge-success {
                background: #dcfce7;
                color: #15803d;
            }

            .badge-danger {
                background: #fee2e2;
                color: #b91c1c;
            }

            .total-row {
                background: #f8fafc;
                font-weight: 600;
            }

            .text-right {
                text-align: right;
            }
            
            /* Product details popup styles */
            .product-details-popup {
                display: none;
                position: fixed;
                z-index: 1001;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                max-width: 900px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 25px rgba(0, 0, 0, 0.15);
                padding: 20px;
            }
            
            .product-details-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            
            .product-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .product-table th {
                background: #f8fafc;
                padding: 10px;
                text-align: left;
                border-bottom: 2px solid #e2e8f0;
            }
            
            .product-table td {
                padding: 10px;
                border-bottom: 1px solid #f1f5f9;
            }
            
            .overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
            }
        `;
        document.head.appendChild(styleElement);

        const modal = document.getElementById('monthlyDetailsModal');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Transactions for ${formatDate(date)}</h2>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="printMonthlyDetails()">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="btn btn-primary close-btn" onclick="closeMonthlyDetailsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="modal-body">
                    <div class="summary-cards">
                        <div class="summary-card">
                            <h3>Transactions</h3>
                            <p class="large-number">${monthData.totalTransactions}</p>
                            <p class="sub-text">Sales: ${monthData.salesCount} | Returns: ${monthData.returnCount}</p>
                        </div>
                        <div class="summary-card">
                            <h3>Total Items</h3>
                            <p class="large-number">${monthData.totalItems}</p>
                        </div>
                        <div class="summary-card">
                            <h3>Sales Amount</h3>
                            <p class="large-number positive">${formatCurrency(monthData.salesAmount)}</p>
                        </div>
                        <div class="summary-card">
                            <h3>Returns Amount</h3>
                            <p class="large-number negative">${formatCurrency(monthData.returnsAmount)}</p>
                        </div>
                        <div class="summary-card">
                            <h3>Net Amount</h3>
                            <p class="large-number ${monthData.netAmount >= 0 ? 'positive' : 'negative'}">
                                ${formatCurrency(monthData.netAmount)}
                            </p>
                        </div>
                    </div>

                    <div class="transactions-container">
                        <div class="table-header">
                            <h3>Transaction Details</h3>
                            <input type="text" id="transactionSearch" 
                                   placeholder="Search transactions..." 
                                   class="search-input">
                        </div>
                        <div class="table-responsive">
                            <table class="transaction-table">
                                <thead>
                                    <tr>
                                        <th>Time</th>
                                        <th>Invoice #</th>
                                        <th>Customer</th>
                                        <th>Type</th>
                                        <th>Payment Method</th>
                                        <th class="text-right">Items</th>
                                        <th class="text-right">Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${monthData.transactions.map(t => `
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
                                            <td>
                                                <button class="btn btn-info btn-sm" 
                                                        onclick="viewMonthlyProductDetails('${t.invoiceNumber}', '${t.transactionType}')">
                                                    <i class="fas fa-eye"></i> Items
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr class="total-row">
                                        <td colspan="5"><strong>Total</strong></td>
                                        <td class="text-right"><strong>${monthData.totalItems}</strong></td>
                                        <td class="text-right ${monthData.netAmount >= 0 ? 'positive' : 'negative'}">
                                            <strong>${formatCurrency(monthData.netAmount)}</strong>
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Product Details Popup -->
            <div id="productDetailsPopup" class="product-details-popup">
                <div class="product-details-header">
                    <h3 id="invoiceLabel">Product Details</h3>
                    <button class="btn btn-secondary" onclick="closeProductDetailsPopup()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="product-table">
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
                            <!-- Product rows will be populated here -->
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Overlay -->
            <div id="overlay" class="overlay"></div>
        `;

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

    } catch (error) {
        console.error('Error displaying monthly details:', error);
        showNotification('Error loading monthly details: ' + error.message, 'error');
    }
}

// Function to view product details for monthly transactions
async function viewMonthlyProductDetails(invoiceNumber, transactionType) {
    try {
        showLoadingSpinner();
        
        // Get product details from the database
        const products = await window.api.getProductDetails(invoiceNumber, transactionType);
        
        if (!products || products.length === 0) {
            showNotification('No products found for this transaction', 'info');
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
        
        // Show the overlay and product details popup
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('productDetailsPopup').style.display = 'block';
        
    } catch (error) {
        console.error('Error retrieving product details:', error);
        showNotification('Error retrieving product details: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// Function to close the product details popup for monthly view
function closeProductDetailsPopup() {
    document.getElementById('productDetailsPopup').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

// Close monthly details modal
function closeMonthlyDetailsModal() {
    document.getElementById('monthlyDetailsModal').style.display = 'none';
    // Also ensure product details popup is closed
    closeProductDetailsPopup();
}

// Print monthly details
function printMonthlyDetails() {
    const productDetailsShown = document.getElementById('productDetailsPopup').style.display !== 'none';
    const invoiceLabel = productDetailsShown ? document.getElementById('invoiceLabel').textContent : '';
    
    const date = document.querySelector('.modal-header h2').textContent.replace('Transactions for ', '');
    
    const printWindow = window.open('', '_blank');
    
    // Create print content
    let printContent = `
        <html>
        <head>
            <title>${date}${productDetailsShown ? ' - ' + invoiceLabel : ''}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 30px; }
                h1, h2, h3 { text-align: center; color: #333; }
                .header { margin-bottom: 20px; }
                .summary { margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .return-row { background-color: #fff0f0; }
                .footer { margin-top: 30px; font-size: 12px; text-align: center; }
                .text-right { text-align: right; }
                .total-row { background-color: #f9f9f9; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${productDetailsShown ? 'Product Details' : 'Monthly Sales Report'}</h1>
                <h2>${productDetailsShown ? invoiceLabel : date}</h2>
                <p>Printed on: ${formatDate(new Date())}</p>
            </div>
    `;
    
    if (productDetailsShown) {
        // Print only the product details
        const productTable = document.querySelector('.product-table').cloneNode(true);
        
        printContent += `
            <div class="products">
                <table>
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
                    <tbody>
                        ${document.getElementById('productTableBody').innerHTML}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        // Get summary data
        const summaryCards = document.querySelectorAll('.summary-card');
        const summaryData = {};
        
        summaryCards.forEach(card => {
            const title = card.querySelector('h3').textContent;
            const value = card.querySelector('.large-number').textContent;
            summaryData[title] = value;
        });
        
        // Get transactions table
        const transactionsTable = document.querySelector('.transaction-table').cloneNode(true);
        
        // Remove the action column for printing
        const headerRow = transactionsTable.querySelector('thead tr');
        headerRow.removeChild(headerRow.lastElementChild);
        
        const rows = transactionsTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.lastElementChild) {
                row.removeChild(row.lastElementChild);
            }
        });
        
        // Remove the empty cell in the footer
        const footerRow = transactionsTable.querySelector('tfoot tr');
        if (footerRow && footerRow.lastElementChild) {
            footerRow.removeChild(footerRow.lastElementChild);
        }
        
        printContent += `
            <div class="summary">
                <h3>Summary</h3>
                <table>
                    <tr>
                        <th>Total Transactions</th>
                        <th>Total Items</th>
                        <th>Sales Amount</th>
                        <th>Returns Amount</th>
                        <th>Net Amount</th>
                    </tr>
                    <tr>
                        <td>${summaryData['Transactions'] || 'N/A'}</td>
                        <td>${summaryData['Total Items'] || 'N/A'}</td>
                        <td>${summaryData['Sales Amount'] || 'N/A'}</td>
                        <td>${summaryData['Returns Amount'] || 'N/A'}</td>
                        <td>${summaryData['Net Amount'] || 'N/A'}</td>
                    </tr>
                </table>
            </div>
            
            <div class="transactions">
                <h3>Transactions</h3>
                ${transactionsTable.outerHTML}
            </div>
        `;
    }
    
    printContent += `
            <div class="footer">
                <p>Report generated from Monthly Sales Report Module</p>
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

// Close monthly details modal
function closeMonthlyDetailsModal() {
    document.getElementById('monthlyDetailsModal').style.display = 'none';
}

// Print monthly details
// function printMonthlyDetails() {
//     const date = document.getElementById('modalMonth').textContent;
//     const monthData = monthlyAggregatedData.find(d => formatDate(d.date) === date);
    
//     if (!monthData) {
//         showNotification('Cannot find data for selected month', 'error');
//         return;
//     }
    
//     const printWindow = window.open('', '_blank');
    
//     // Create print content
//     const printContent = `
//         <html>
//         <head>
//             <title>Monthly Sales Details - ${date}</title>
//             <style>
//                 body { font-family: Arial, sans-serif; margin: 30px; }
//                 h1, h2, h3 { text-align: center; color: #333; }
//                 .header { margin-bottom: 20px; }
//                 .summary { margin-bottom: 20px; }
//                 table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
//                 th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
//                 th { background-color: #f2f2f2; }
//                 .return-row { background-color: #fff0f0; }
//                 .footer { margin-top: 30px; font-size: 12px; text-align: center; }
//             </style>
//         </head>
//         <body>
//             <div class="header">
//                 <h1>Monthly Sales Report</h1>
//                 <h2>${date}</h2>
//                 <p>Printed on: ${formatDate(new Date())}</p>
//             </div>
            
//             <div class="summary">
//                 <h3>Summary</h3>
//                 <table>
//                     <tr>
//                         <th>Total Transactions</th>
//                         <th>Sales Count</th>
//                         <th>Return Count</th>
//                         <th>Net Amount</th>
//                     </tr>
//                     <tr>
//                         <td>${monthData.totalTransactions}</td>
//                         <td>${monthData.salesCount}</td>
//                         <td>${monthData.returnCount}</td>
//                         <td>${formatCurrency(monthData.netAmount)}</td>
//                     </tr>
//                 </table>
//             </div>
            
//             <div class="transactions">
//                 <h3>Transactions</h3>
//                 <table>
//                     <thead>
//                         <tr>
//                             <th>Invoice #</th>
//                             <th>Time</th>
//                             <th>Customer</th>
//                             <th>Type</th>
//                             <th>Payment Method</th>
//                             <th>Items</th>
//                             <th>Total</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         ${monthData.transactions.map(transaction => `
//                             <tr class="${transaction.transactionType === 'Return' ? 'return-row' : ''}">
//                                 <td>${transaction.invoiceNumber}</td>
//                                 <td>${transaction.time}</td>
//                                 <td>${transaction.customerName}</td>
//                                 <td>${transaction.transactionType}</td>
//                                 <td>${transaction.paymentMethod}</td>
//                                 <td>${transaction.itemCount}</td>
//                                 <td>${formatCurrency(transaction.total)}</td>
//                             </tr>
//                         `).join('')}
//                     </tbody>
//                 </table>
//             </div>
            
//             <div class="payment-summary">
//                 <h3>Payment Method Summary</h3>
//                 <table>
//                     <thead>
//                         <tr>
//                             <th>Payment Method</th>
//                             <th>Transaction Count</th>
//                             <th>Amount</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         ${Array.from(createPaymentMethodSummary(monthData.transactions)).map(([method, data]) => `
//                             <tr>
//                                 <td>${method}</td>
//                                 <td>${data.count}</td>
//                                 <td>${formatCurrency(data.amount)}</td>
//                             </tr>
//                         `).join('')}
//                     </tbody>
//                 </table>
//             </div>
            
//             <div class="footer">
//                 <p>Report generated from Monthly Sales Report Module</p>
//             </div>
//         </body>
//         </html>
//     `;
    
//     printWindow.document.write(printContent);
//     printWindow.document.close();
    
//     // Add delay to ensure content is loaded
//     setTimeout(() => {
//         printWindow.print();
//         printWindow.close();
//     }, 500);
// }

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
        'Month', 
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
    link.setAttribute('download', `monthly_sales_report_${formatDateForFilename(new Date())}.csv`);
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
    
    // Create print content - similar to printReport
    const printContent = `
        <html>
        <head>
            <title>Monthly Sales Report - ${formatDate(new Date())}</title>
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
                <h1>Monthly Sales Report</h1>
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
                        <th>Month</th>
                        <th>Total Transactions</th>
                        <th>Sales Count</th>
                        <th>Return Count</th>
                        <th>Sales Amount</th>
                        <th>Returns Amount</th>
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
                            <td>${formatCurrency(item.returnsAmount)}</td>
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
                        <td>${document.getElementById('footerReturnsAmount').textContent}</td>
                        <td>${document.getElementById('footerNetAmount').textContent}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Report generated from Monthly Sales Report Module</p>
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



// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeReport();
});