// Store sales data globally
let sales = [];

// Fetch sales from API
async function fetchSales() {
    try {
        console.log("Fetching sales...");
        const response = await window.api.getAllSales();
        
        console.log("API Response for sales:", response);
        
        if (!Array.isArray(response)) {
            console.error("Invalid response format:", response);
            throw new Error("Invalid response format");
        }
        
        sales = response;
    } catch (error) {
        console.error("Error fetching sales:", error);
        showAlert('Error fetching sales data', 'error');
    }
}
async function fetchSalesReturns() {
    try {
        const response = await window.api.getAllSalesReturns();
        console.log('Sales Returns API Response:', response);
        
        if (!Array.isArray(response)) {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format');
        }
        
       // Check this in the fetchSalesReturns function
salesReturns = response.map(returnData => ({
    ...returnData,
    returnInvoiceNo: returnData.returnInvoice_no || returnData.returnInvoiceNo,
    grandTotal: Number(returnData.grandTotal || returnData.grand_total || 0),
    dueAmount: Number(returnData.dueAmount || returnData.due_amount || 0),
    // Make sure this mapping is correct for your API response
    productsreturn: Array.isArray(returnData.productsreturn) ? returnData.productsreturn : 
                   (Array.isArray(returnData.productsReturn) ? returnData.productsReturn : [])
}));
        console.log('Processed sales returns:', salesReturns);
        
    } catch (error) {
        console.error('Error fetching sales returns:', error);
        showAlert('Error fetching sales returns data', 'error');
    }
}
// Search for invoice and populate form

// In the searchInvoice function, modify how existingReturns is found
async function searchInvoice(invoiceNumber) {
    try {
        console.log("Searching for invoice:", invoiceNumber);
        console.log("Available sales:", sales);

        const searchTerm = String(invoiceNumber).trim();
        
        const sale = sales.find(s => 
            String(s.invoiceNumber).trim().toLowerCase() === searchTerm.toLowerCase()
        );
        
        console.log("Found sale:", sale);

        if (!sale) {
            showAlert('Invoice not found', 'error');
            return;
        }

        // Debug all sales returns
        console.log("All sales returns:", salesReturns);
        
        // MODIFIED: Look for returns that reference this invoice as the returnBillNo
        const existingReturns = salesReturns.filter(sr => {
            // Check if this return has a returnBillNo matching our search term
            return String(sr.returnBillNo || sr.returnbillno || sr.return_bill_no || '').trim().toLowerCase() === searchTerm.toLowerCase();
        });

        console.log("Found existing returns with this returnBillNo:", existingReturns);

        populateFormFields(sale, existingReturns);
        enableFormFields();
        
        // Show notification about existing returns if any
        if (existingReturns.length > 0) {
            const totalReturned = existingReturns.reduce((sum, ret) => 
                sum + (Number(ret.grandTotal) || 0), 0);
            showAlert(`Found ${existingReturns.length} previous return(s) totaling ${totalReturned.toFixed(2)}`, 'info');
        }
    } catch (error) {
        console.error("Error searching invoice:", error);
        showAlert('Error searching invoice', 'error');
    }
}

function populateFormFields(sale, existingReturns = []) {
    document.getElementById('customer').value = sale.customerName;
    document.getElementById('customerPhone').value = sale.customerPhone;
    document.getElementById('returnDate').valueAsDate = new Date();
    document.getElementById('returnInvoiceNumber').value = sale.invoiceNumber;
    
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';
    
    // Collect all returned products from returns matching this returnBillNo
    let returnedProductsForThisBill = [];
    
    console.log(`Processing ${existingReturns.length} existing returns for returnBillNo matching ${sale.invoiceNumber}`);
    
    // Process returns that match the returnBillNo
    existingReturns.forEach((sr, index) => {
        console.log(`Return #${index + 1} for returnBillNo matching ${sale.invoiceNumber}:`, sr);
        
        // Try every possible field name for product arrays
        const possibleProductFields = ['productsreturn', 'productsReturn', 'products_return', 'products'];
        
        for (const field of possibleProductFields) {
            if (Array.isArray(sr[field]) && sr[field].length > 0) {
                console.log(`Found products in field "${field}" for this return bill:`, sr[field]);
                returnedProductsForThisBill = [...returnedProductsForThisBill, ...sr[field]];
            }
        }
        
        // Also check for any arrays in the object that might contain product data
        Object.keys(sr).forEach(key => {
            if (Array.isArray(sr[key]) && !possibleProductFields.includes(key)) {
                // If array items have productCode, productName, or returnQuantity, they're likely products
                if (sr[key].length > 0 && 
                    (sr[key][0].productCode || sr[key][0].productName || sr[key][0].returnQuantity)) {
                    console.log(`Adding products from field "${key}" for this return bill`);
                    returnedProductsForThisBill = [...returnedProductsForThisBill, ...sr[key]];
                }
            }
        });
    });
    
    console.log("All returned products found for this return bill:", returnedProductsForThisBill);
    
    sale.products.forEach(product => {
        console.log(`Processing product: ${product.productName} (${product.productCode})`);
        
        // MODIFIED: Find matching returned products from returns with matching returnBillNo
        const matchingReturns = returnedProductsForThisBill.filter(rp => {
            const originalCode = String(product.productCode || '').toLowerCase();
            const returnedCode = String(rp.productCode || rp.product_code || '').toLowerCase();
            
            const codesMatch = originalCode === returnedCode;
            if (codesMatch) {
                console.log(`Found match for ${originalCode} in returns with matching returnBillNo:`, rp);
            }
            return codesMatch;
        });
        
        console.log(`Matching returns for ${product.productCode} in returns with matching returnBillNo:`, matchingReturns);
        
        // Calculate total previously returned quantity for returns with matching returnBillNo
        const previouslyReturned = matchingReturns.reduce((total, rp) => {
            const qty = Number(rp.returnQuantity || rp.return_quantity || rp.quantity || 0);
            console.log(`Adding quantity ${qty} from returns with matching returnBillNo:`, rp);
            return total + qty;
        }, 0);
        
        console.log(`Previously returned quantity for ${product.productName} in returns with matching returnBillNo: ${previouslyReturned}`);

        // Calculate remaining quantity available for return
        const remainingQuantity = Math.max(0, product.quantity - previouslyReturned);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.productCode}</td>
            <td>${product.productName}</td>
            <td>${product.rate}</td>
            <td>${product.quantity}</td>
            <td>${previouslyReturned}</td>
            <td>
                <input type="number" 
                       class="return-quantity" 
                       min="0" 
                       max="${remainingQuantity}"
                       value="0"
                       data-original-quantity="${product.quantity}"
                       data-previously-returned="${previouslyReturned}"
                       onchange="handleQuantityChange(this)"
                       onInput="handleQuantityChange(this)">
            </td>
            <td class="product-total">0</td>
        `;
        
        // Add a visual indicator and disable if no quantity available
        if (remainingQuantity === 0) {
            const input = row.querySelector('.return-quantity');
            input.disabled = true;
            input.classList.add('fully-returned');
            input.title = 'All items have been returned';
        }
        
        productsList.appendChild(row);
    });
    
    calculateTotals();
}

// Calculate totals based on return quantities
function calculateTotals() {
    let grandTotal = 0;
    
    document.querySelectorAll('#productsList tr').forEach(row => {
        const salePrice = parseFloat(row.cells[2].textContent);
        const returnQuantity = parseFloat(row.querySelector('.return-quantity').value);
        const total = salePrice * returnQuantity;
        
        row.querySelector('.product-total').textContent = total.toFixed(2);
        grandTotal += total;
    });
    
    document.getElementById('grandTotal').value = grandTotal.toFixed(2);
    updateDueAmount();
}

// Update due amount when paid amount changes
function updateDueAmount() {
    const grandTotal = parseFloat(document.getElementById('grandTotal').value) || 0;
    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    document.getElementById('dueAmount').value = (grandTotal - paidAmount).toFixed(2);
}

// Enable form fields after search
function enableFormFields() {
    document.getElementById('returnDate').disabled = false;
    document.getElementById('paidAmount').disabled = false;
    document.getElementById('comments').disabled = false;
    document.querySelectorAll('.return-quantity').forEach(input => input.disabled = false);
}

// Show alert message
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => alertDiv.remove(), 3000);
}

// Function to format date compactly
function formatDateCompact(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
    });
}

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

// Generate receipt for sales return
function printThermalReceipt(salesReturnData) {
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
        
        // Format date using the local function
        const formattedDate = formatDateCompact(new Date(salesReturnData.date).toLocaleDateString());
        
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
                <title>Return Receipt - ${salesReturnData.returnInvoiceNo}</title>
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
                                     
                    <p style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; text-decoration: underline;">RETURN RECEIPT</p>
                </div>
                
                <div style="font-size: 13px; margin: 10px 0;">
                    <div style="display: flex; flex-wrap: wrap;">
                        <div style="width: 45%;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: bold; margin-right: 2px;">Invoice #:</span>
                                <span>${salesReturnData.returnInvoiceNo}</span>
                            </div>
                        </div>
                        <div style="width: 55%;">
                            <div style="display: flex; align-items: center; margin-bottom: 4px;">
                                <span style="font-weight: bold; margin-right: 2px;">Customer:</span>
                                <span>${salesReturnData.customerName}</span>
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
                                <span>Cash</span>
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
                    
                    ${salesReturnData.productsReturn.map((product, index) => `
                        <div class="product-item" style="display: flex; align-items: center; font-size: 13px; margin: 3px 0;">
                            <div style="width: 36%; font-weight: bold; overflow-wrap: break-word; position: relative; left: 10px;">${index + 1}. ${product.productName}</div>
                            <div style="width: 18%; text-align: center;">${product.returnQuantity}</div>
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
                            <span style="position: relative; left: -10px;">Rs${parseFloat(salesReturnData.grandTotal).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 2px; margin: 2px 0 1px 0; font-weight: bold; font-size: 15px;">
                            <span>TOTAL:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(salesReturnData.grandTotal).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px; margin-top: 1px;">
                            <span style="font-weight: bold;">Refunded:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(salesReturnData.paidAmount).toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: bold;">Balance:</span>
                            <span style="position: relative; left: -10px;">Rs${parseFloat(salesReturnData.dueAmount).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                ${salesReturnData.comments ? `
                    <div style="font-size: 13px; border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
                        <div style="font-weight: bold;">Comments:</div>
                        <div style="margin-top: 3px;">${salesReturnData.comments}</div>
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

// Update the handleSubmit function to include printing
async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    const productsReturn = getReturnProductsData();
    if (productsReturn.length === 0) {
        showAlert('Please specify at least one item to return', 'error');
        return;
    }

    const salesReturnData = {
        date: document.getElementById('returnDate').value,
        returnInvoiceNo: document.getElementById('returnInvoiceNumber').value,
        customerName: document.getElementById('customer').value,
        customerPhone: document.getElementById('customerPhone').value,
        comments: document.getElementById('comments').value,
        grandTotal: parseFloat(document.getElementById('grandTotal').value) || 0,
        paidAmount: parseFloat(document.getElementById('paidAmount').value) || 0,
        dueAmount: parseFloat(document.getElementById('dueAmount').value) || 0,
        productsReturn: productsReturn
    };

    showLoading(true);

    try {
        // Check if print option is selected
        const printOption = document.querySelector('input[name="printOption"]:checked').value;
        
        // If print is selected, print before saving
        if (printOption === 'yes') {
            // Preload logo first if needed
            if (!window.logoDataUrl) {
                await preloadLogo();
            }
            
            // Then print receipt
            await printThermalReceipt(salesReturnData);
        }
        
        // Now save the return
        const result = await window.api.addSalesReturn(salesReturnData);
        
        if (result.success) {
            showAlert('Sales return saved successfully. Reloading...', 'success');
            
            // Set a short timeout to allow the alert to be visible before reload
            setTimeout(() => {
                window.location.reload();
            }, 1500); // 1.5 seconds delay before reload
        } else {
            throw new Error(result.message || 'Failed to save sales return');
        }
    } catch (error) {
        console.error('Error saving sales return:', error);
        showAlert(error.message || 'Error saving sales return', 'error');
    } finally {
        showLoading(false);
    }
}

// Add this to your initialization code
document.addEventListener("DOMContentLoaded", () => {
    // Add the print option radio buttons to the form
    const actionsDiv = document.querySelector('.actions');
    const printOptionsDiv = document.createElement('div');
    printOptionsDiv.className = 'print-options';
    printOptionsDiv.innerHTML = `
        <label class="form-label">Print Receipt?</label>
        <div class="radio-group">
            <label>
                <input type="radio" name="printOption" value="yes"> Yes
            </label>
            <label>
                <input type="radio" name="printOption" value="no" checked> No
            </label>
        </div>
    `;
    
    // Insert before the actions div
    if (actionsDiv) {
        actionsDiv.parentNode.insertBefore(printOptionsDiv, actionsDiv);
    }
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .print-options {
            margin-bottom: 15px;
        }
        .radio-group {
            display: flex;
            gap: 20px;
        }
        .radio-group label {
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
        }
        #receiptContent {
            display: none;
            font-family: monospace;
            font-size: 12px;
            width: 80mm;
        }
        .text-center {
            text-align: center;
        }
    `;
    document.head.appendChild(style);
    
    // Preload the logo
    preloadLogo().then(() => {
        console.log("Logo loaded:", window.logoDataUrl ? "Success" : "Failed");
    });
});
// Update the handleSubmit function to include printing
// async function handleSubmit(e) {
//     e.preventDefault();
    
//     if (!validateForm()) {
//         return;
//     }

//     const productsReturn = getReturnProductsData();
//     if (productsReturn.length === 0) {
//         showAlert('Please specify at least one item to return', 'error');
//         return;
//     }

//     const salesReturnData = {
//         date: document.getElementById('returnDate').value,
//         returnInvoiceNo: document.getElementById('returnInvoiceNumber').value,
//         customerName: document.getElementById('customer').value,
//         customerPhone: document.getElementById('customerPhone').value,
//         comments: document.getElementById('comments').value,
//         grandTotal: parseFloat(document.getElementById('grandTotal').value) || 0,
//         paidAmount: parseFloat(document.getElementById('paidAmount').value) || 0,
//         dueAmount: parseFloat(document.getElementById('dueAmount').value) || 0,
//         productsReturn: productsReturn
//     };

//     showLoading(true);

//     try {
//         // Check if print option is selected
//         const printOption = document.querySelector('input[name="printOption"]:checked').value;
        
//         // Generate receipt content in any case (we'll need it if printing)
//         generateReceipt(salesReturnData);
        
//         // If print is selected, print before saving
//         if (printOption === 'yes') {
//             await printThermalReceipt();
//         }
        
//         // Now save the return
//         const result = await window.api.addSalesReturn(salesReturnData);
        
//         if (result.success) {
//             showAlert('Sales return saved successfully. Reloading...', 'success');
            
//             // Set a short timeout to allow the alert to be visible before reload
//             setTimeout(() => {
//                 window.location.reload();
//             }, 1500); // 1.5 seconds delay before reload
//         } else {
//             throw new Error(result.message || 'Failed to save sales return');
//         }
//     } catch (error) {
//         console.error('Error saving sales return:', error);
//         showAlert(error.message || 'Error saving sales return', 'error');
//     } finally {
//         showLoading(false);
//     }
// }

// Validate form data
function validateForm() {


    if (!document.getElementById('returnDate').value) {
        showAlert('Please select a return date', 'error');
        return false;
    }

    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    const grandTotal = parseFloat(document.getElementById('grandTotal').value) || 0;
    
    if (paidAmount < 0) {
        showAlert('Paid amount cannot be negative', 'error');
        return false;
    }

    if (paidAmount > grandTotal) {
        showAlert('Paid amount cannot exceed grand total', 'error');
        return false;
    }

    return true;
}

// Get return products data
function getReturnProductsData() {
    const productsReturn = [];
    
    document.querySelectorAll('#productsList tr').forEach(row => {
        const returnQuantity = parseInt(row.querySelector('.return-quantity').value) || 0;
        
        if (returnQuantity > 0) {
            productsReturn.push({
                productCode: row.cells[0].textContent,
                productName: row.cells[1].textContent,
                salePrice: parseFloat(row.cells[2].textContent),
                returnQuantity: returnQuantity,
                totalAmount: parseFloat(row.querySelector('.product-total').textContent)
            });
        }
    });
    return productsReturn;
}

// Reset form after successful submission
function resetForm() {
    document.getElementById('salesReturnForm').reset();
    document.getElementById('productsList').innerHTML = '';
    document.getElementById('customer').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('grandTotal').value = '';
    document.getElementById('paidAmount').value = '';
    document.getElementById('dueAmount').value = '';
    document.getElementById('returnDate').valueAsDate = new Date();
    document.getElementById('searchInvoiceNo').value = '';
}

// Show/hide loading spinner
function showLoading(show) {
    if (document.getElementById('loadingSpinner')) {
        document.getElementById('loadingSpinner').style.display = show ? 'flex' : 'none';
    } else if (show) {
        const spinner = document.createElement('div');
        spinner.id = 'loadingSpinner';
        spinner.className = 'loading-spinner';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await Promise.all([
            fetchSales(),
            fetchSalesReturns()
        ]);
        
        document.getElementById('searchBtn').addEventListener('click', () => {
            const searchInput = document.getElementById('searchInvoiceNo');
            const invoiceNumber = searchInput.value.trim();
            
            if (invoiceNumber) {
                searchInvoice(invoiceNumber);
            } else {
                showAlert('Please enter an invoice number', 'info');
            }
        });
        
        document.getElementById('paidAmount').addEventListener('input', updateDueAmount);
        document.getElementById('salesReturnForm').addEventListener('submit', handleSubmit);
        document.getElementById('cancelButton').addEventListener('click', resetForm);
        document.getElementById('comments').addEventListener('input', function() {
            document.getElementById('charCount').textContent = `${this.value.length}/100`;
        });
    } catch (error) {
        console.error('Error initializing:', error);
        showAlert('Error loading data', 'error');
    }
});


function handleQuantityChange(input) {
    const originalQuantity = parseFloat(input.dataset.originalQuantity) || 0;
    const previouslyReturned = parseFloat(input.dataset.previouslyReturned) || 0;
    const currentValue = parseFloat(input.value) || 0;
    
    // Calculate remaining quantity
    const remainingQuantity = originalQuantity - previouslyReturned;
    
    // If no quantity remains, disable the input
    if (remainingQuantity <= 0) {
        input.disabled = true;
        input.classList.add('fully-returned');
        input.title = 'All items have been returned';
        input.value = 0;
    }
    
    // Ensure value doesn't exceed remaining quantity
    if (currentValue > remainingQuantity) {
        input.value = remainingQuantity;
        showAlert(`Cannot return more than remaining quantity (${remainingQuantity})`, 'warning');
    }
    
    calculateTotals();
}