// sale.js

// Global variables
let allProducts = [];
let selectedProducts = new Set();
let customers = [];

// Initialize form
// Modify the handleConfirmedSubmit function to include the bill number
async function handleConfirmedSubmit() {
    document.getElementById('confirmationModal').style.display = 'none';
    document.getElementById('loadingSpinner').style.display = 'flex';

    try {
        const netTotal = parseFloat(document.getElementById('netTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0;
        const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
        let dueAmount = netTotal - paidAmount;
        
        const transactionType = document.querySelector('input[name="transactionType"]:checked').value;
        let grandTotal = parseFloat(document.getElementById('grandTotal').value.replace(/[^0-9.-]+/g, '')) || 0;
        let adjustedPaidAmount = paidAmount;
        
        if (transactionType === 'return') {
            grandTotal = -grandTotal;
            adjustedPaidAmount = -adjustedPaidAmount;
            dueAmount = -dueAmount;
        }

        // Get the current bill number
        const billNumber = currentBillNumber || await getCurrentSalesCount();

        // Collect all the sale data
        const saleData = {
            billNumber: billNumber,
            date: document.getElementById('date').value,
            customerName: document.getElementById('customer').value.trim(),
            customerPhone: document.getElementById('customerPhone').value.trim(),
            transactionType: transactionType,
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
            comments: document.getElementById('comments').value.trim(),
            subTotal: parseFloat(document.getElementById('subTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0,
            discountTotal: parseFloat(document.getElementById('discountTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0,
            customerDiscount: parseFloat(document.getElementById('customerDiscount').textContent.replace(/[^0-9.-]+/g, '')) || 0,
            
            grandTotal: grandTotal,
           
            paidAmount: adjustedPaidAmount,
            dueAmount: dueAmount,
            products: collectProducts(transactionType)
        };

        const result = await window.api.addSale(saleData);
        
        if (result.success) {
            // Handle printing if selected
            if (document.getElementById('printYes').checked) {
                await printReceipt();
            }
            
            // Reset form
            resetForm();
            
            // Show success message
            const successMessage = document.querySelector('#successModal .modal-body p');
            successMessage.textContent = transactionType === 'return' ? 
                'Return has been processed successfully!' : 
                'Sale has been added successfully!';
            
            document.getElementById('successModal').style.display = 'block';
            
            setTimeout(() => {
                document.getElementById('successModal').style.display = 'none';
            }, 2000);
            
            showNotification(
                transactionType === 'return' ? 
                'Return processed successfully!' : 
                'Sale saved successfully!', 
                'success'
            );
            
            // Update bill number for next transaction
            updateBillNumber();
        } else {
            throw new Error(result.message || `Failed to process ${transactionType}`);
        }
    } catch (error) {
        console.error(`Error processing transaction:`, error);
        showNotification(error.message || 'Error processing transaction. Please try again.', 'error');
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

// Update the initializeForm function to start the bill number updater
async function initializeForm() {
    try {
        // Set current date and generate invoice number
        document.getElementById('date').valueAsDate = new Date();
        
        // Start bill number updater (new)
        startBillNumberUpdater();
        
        // Load customers
        customers = await window.api.getCustomers();
        const customerDatalist = document.getElementById('customerList');
        const customerInput = document.getElementById('customer');
        
        // Create datalist if it doesn't exist
        if (!customerDatalist) {
            const datalist = document.createElement('datalist');
            datalist.id = 'customerList';
            document.body.appendChild(datalist);
        }
        customerDatalist.innerHTML = '';
        
        // Populate datalist with customer options
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.customer_name;
            option.dataset.phoneNumber = customer.phone_number;
            customerDatalist.appendChild(option);
        });
        // Load products
        allProducts = await window.api.getAllProducts();
        const stockData = await window.api.getAllStock();
        console.log('Loaded Stock Data:', stockData);

        customerInput.setAttribute('list', 'customerList');
        customerInput.setAttribute('autocomplete', 'off');
        
        // Add phone number display field
        const phoneNumberField = document.createElement('input');
        phoneNumberField.type = 'text';
        phoneNumberField.id = 'customerPhone';
        phoneNumberField.className = 'form-control mt-2';
        phoneNumberField.placeholder = 'Enter Phone Number';

        // Insert phone field after customer input
        customerInput.parentNode.insertBefore(phoneNumberField, customerInput.nextSibling);
        
        // Handle customer selection
        customerInput.addEventListener('input', function(e) {
            const selectedCustomer = customers.find(c => c.customer_name === this.value);
            if (selectedCustomer) {
                phoneNumberField.value = selectedCustomer.phone_number || '';
            } else {
                phoneNumberField.value = '';
            }
        });

        // Initialize event listeners
        initializeEventListeners();
    } catch (error) {
        console.error('Error initializing form:', error);
        showNotification('Error initializing form', 'error');
    }
}
function resetTotals() {
    document.getElementById('subTotal').textContent = formatCurrency(0);
    document.getElementById('discountTotal').textContent = formatCurrency(0);
    document.getElementById('customerDiscount').textContent = formatCurrency(0);
    document.getElementById('netTotal').textContent = formatCurrency(0);
    document.getElementById('grandTotal').value = formatCurrency(0);
    document.getElementById('paidAmount').textContent = formatCurrency(0);
    document.getElementById('change').textContent = formatCurrency(0);
}


function updateTotalsDisplay() {
    // Calculate subtotal from all products
    let subtotal = 0;
    let totalDiscount = 0;
    
    document.querySelectorAll('#productsList tr').forEach(row => {
        const total = parseFloat(row.querySelector('.total-amount').textContent.replace(/[^0-9.-]+/g, '')) || 0;
        const quantity = parseInt(row.querySelector('.quantity').value) || 0;

        
        subtotal += total;
        
        // Calculate total discount for this product
      
    });
    
    // Update subtotal display
    document.getElementById('subTotal').textContent = formatCurrency(subtotal);
    
    // Update discount total display
    document.getElementById('discountTotal').textContent = formatCurrency(totalDiscount);
    
    // Get and update customer discount display
    const customerDiscountAmount = parseFloat(document.getElementById('customerDiscount').value) || 0;
    // Keep the input field as a simple number for easy editing
    document.getElementById('customerDiscount').value = customerDiscountAmount || '';
    // Display formatted amount in totals wrapper
    document.querySelector('.totals-wrapper #customerDiscount').textContent = formatCurrency(customerDiscountAmount);
    
    // Always ensure adjustment has a default value of 0
    const adjustmentInput = document.getElementById('adjustment');
    if (!adjustmentInput.value) {
        adjustmentInput.value = '0';
    }
    const adjustment = parseFloat(adjustmentInput.value) || 0;
    
    // Calculate and update net total
    const netTotal = subtotal - totalDiscount - customerDiscountAmount + adjustment;
    document.getElementById('netTotal').textContent = formatCurrency(netTotal);
    
    // Update prominent total display with net total
    document.getElementById('grandTotal').value = formatCurrency(netTotal);
    
    // Update paid amount display and input
    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    // Keep the input field as a simple number for easy editing
    document.getElementById('paidAmount').value = paidAmount || '';
    // Display formatted amount in totals wrapper
    document.querySelector('.totals-wrapper #paidAmount').textContent = formatCurrency(paidAmount);
    
    // Calculate and update change
    const change = paidAmount - netTotal;
    document.getElementById('change').textContent = formatCurrency(change);
}

document.addEventListener('DOMContentLoaded', function() {
    // Listen for changes in product quantities and discounts
    document.getElementById('productsList').addEventListener('input', function(e) {
        if (e.target.classList.contains('quantity') ) {
            calculateProductTotal(e.target);
            updateTotalsDisplay();
        }
    });

    // Listen for changes in customer discount
    document.getElementById('customerDiscount').addEventListener('input', function() {
        updateTotalsDisplay();
    });

    // Listen for changes in adjustment
    document.getElementById('adjustment').addEventListener('input', function() {
        updateTotalsDisplay();
    });

    // Listen for changes in paid amount
    document.getElementById('paidAmount').addEventListener('input', function() {
        updateTotalsDisplay();
    });
});

// Initialize event listeners
function initializeEventListeners() {
    // Form submission
    document.getElementById('salesForm').addEventListener('submit', handleFormSubmit);
    

    const productsList = document.getElementById('productsList');
    const observer = new MutationObserver(() => {
        updateTotalsDisplay();
    });
    observer.observe(productsList, { childList: true, subtree: true });

    // Ensure adjustment input always has a value
    const adjustmentInput = document.getElementById('adjustment');
    adjustmentInput.addEventListener('blur', function() {
        if (!this.value) {
            this.value = '0';
            updateTotalsDisplay();
        }
    });
    // Modal controls
    document.querySelector('.close-btn').addEventListener('click', closeProductModal);
    document.getElementById('modalCancelBtn').addEventListener('click', closeProductModal);
    document.getElementById('addSelectedBtn').addEventListener('click', addSelectedProducts);
    document.getElementById('addProducts').addEventListener('click', openProductModal);
    
    // Confirmation modal controls
    document.getElementById('confirmCancelBtn').addEventListener('click', () => {
        document.getElementById('confirmationModal').style.display = 'none';
    });
    document.getElementById('confirmSubmitBtn').addEventListener('click', handleConfirmedSubmit);
    document.querySelectorAll('input[name="transactionType"]').forEach(radio => {
        radio.addEventListener('change', handleTransactionTypeChange);
    });
    // Amount controls
    document.getElementById('paidAmount').addEventListener('input', calculateChange);
    document.getElementById('customerDiscount').addEventListener('input', calculateNetTotal);
    document.getElementById('adjustment').addEventListener('input', calculateNetTotal);
    
    // Search control
    document.getElementById('searchProduct').addEventListener('input', handleProductSearch);
    
    // Cancel button
    document.getElementById('cancelButton').addEventListener('click', handleCancel);
    
    // F5 key handler
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F5' || e.keyCode === 116) {
            e.preventDefault();
            openProductModal();
        }
    });

    // Character counter for comments
    document.getElementById('comments').addEventListener('input', function() {
        const charCount = document.getElementById('charCount');
        charCount.textContent = `${this.value.length}/100`;
    });

    // Select all functionality
    document.getElementById('selectAll').addEventListener('change', function(e) {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
            if (e.target.checked) {
                selectedProducts.add(checkbox.value);
            } else {
                selectedProducts.delete(checkbox.value);
            }
        });
        updateSelectedCount();
    });
}

// Form submission handlers
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    // Show confirmation modal
    document.getElementById('confirmationModal').style.display = 'block';
}

// Enhanced resetForm function with additional resets
function resetForm() {
    // Reset invoice number with new timestamp
   
    
    // Reset date to current date
    document.getElementById('date').valueAsDate = new Date();
    
    // Reset customer selection
    document.getElementById('customer').value = '';
    document.getElementById('customerPhone').value = '';
    

    
    // Reset to cash payment
    document.getElementById('cash').checked = true;
    
    // Reset comments
    document.getElementById('comments').value = '';
    document.getElementById('charCount').textContent = '0/100';
    
    // Clear products list
    document.getElementById('productsList').innerHTML = '';
    document.getElementById('sale').checked = true;
    // Reset amounts
    document.getElementById('grandTotal').value = '0.00';
    document.getElementById('customerDiscount').value = '0.00';
    document.getElementById('adjustment').value = '0.00';
    document.getElementById('netTotal').value = '0.00';
    document.getElementById('paidAmount').value = '';
    document.getElementById('change').value = '0.00';
    
    // Clear selected products
    selectedProducts.clear();

    // Reset search fields if they exist
    const searchProduct = document.getElementById('searchProduct');
    if (searchProduct) searchProduct.value = '';
    
    const searchQuantity = document.getElementById('searchQuantity');
    if (searchQuantity) searchQuantity.value = '1';

    // Reset select all checkbox
    const selectAll = document.getElementById('selectAll');
    if (selectAll) selectAll.checked = false;
    
    // Update selected count
    const selectedCount = document.getElementById('selectedCount');
    if (selectedCount) selectedCount.textContent = '0';
}
// Modify the handleConfirmedSubmit function to handle printing
// async function handleConfirmedSubmit() {
//     document.getElementById('confirmationModal').style.display = 'none';
//     document.getElementById('loadingSpinner').style.display = 'flex';

//     try {
//         const netTotal = parseFloat(document.getElementById('netTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0;
//         const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
//         let dueAmount = netTotal - paidAmount;
        
//         const transactionType = document.querySelector('input[name="transactionType"]:checked').value;
//         let grandTotal = parseFloat(document.getElementById('grandTotal').value.replace(/[^0-9.-]+/g, '')) || 0;
//         let adjustedPaidAmount = paidAmount;
        
//         if (transactionType === 'return') {
//             grandTotal = -grandTotal;
//             adjustedPaidAmount = -adjustedPaidAmount;
//             dueAmount = -dueAmount;
//         }

//         // Collect all the sale data
//         const saleData = {
//             date: document.getElementById('date').value,
//             customerName: document.getElementById('customer').value.trim(),
//             customerPhone: document.getElementById('customerPhone').value.trim(),
//             transactionType: transactionType,
//             paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
//             comments: document.getElementById('comments').value.trim(),
//             subTotal: parseFloat(document.getElementById('subTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0,
//             discountTotal: parseFloat(document.getElementById('discountTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0,
//             customerDiscount: parseFloat(document.getElementById('customerDiscount').textContent.replace(/[^0-9.-]+/g, '')) || 0,
            
//             grandTotal: grandTotal,
           
//             paidAmount: adjustedPaidAmount,
//             dueAmount: dueAmount,
//             products: collectProducts(transactionType)
//         };

//         const result = await window.api.addSale(saleData);
        
//         if (result.success) {
//             // Handle printing if selected
//             if (document.getElementById('printYes').checked) {
//                 await printReceipt();
//             }
            
//             // Reset form
//             resetForm();
            
//             // Show success message
//             const successMessage = document.querySelector('#successModal .modal-body p');
//             successMessage.textContent = transactionType === 'return' ? 
//                 'Return has been processed successfully!' : 
//                 'Sale has been added successfully!';
            
//             document.getElementById('successModal').style.display = 'block';
            
//             setTimeout(() => {
//                 document.getElementById('successModal').style.display = 'none';
//             }, 2000);
            
//             showNotification(
//                 transactionType === 'return' ? 
//                 'Return processed successfully!' : 
//                 'Sale saved successfully!', 
//                 'success'
//             );
//         } else {
//             throw new Error(result.message || `Failed to process ${transactionType}`);
//         }
//     } catch (error) {
//         console.error(`Error processing transaction:`, error);
//         showNotification(error.message || 'Error processing transaction. Please try again.', 'error');
//     } finally {
//         document.getElementById('loadingSpinner').style.display = 'none';
//     }
// }

// Function to preload logo as base64 with fallback options
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
            console.warn('Failed to load logo from primary path, trying fallback');
            // Try fallback location
            const fallbackImg = new Image();
            fallbackImg.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = fallbackImg.width;
                canvas.height = fallbackImg.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(fallbackImg, 0, 0);
                window.logoDataUrl = canvas.toDataURL('image/png');
                resolve(window.logoDataUrl);
            };
            
            fallbackImg.onerror = function() {
                console.warn('Failed to load logo from all paths');
                window.logoDataUrl = null;
                resolve(null);
            };
            
            // Try another common location
            fallbackImg.src = './img/logo.jpeg';
        };
        
        // Try multiple possible paths for the logo
        const basePath = window.location.protocol === 'file:' 
            ? "../" 
            : "../";
        
        // Try with the path from the current location
        img.src = `${basePath}img/logo.jpeg`;
    });
}

// Initialize logo preloading on app start
document.addEventListener('DOMContentLoaded', function() {
    preloadLogo().then(() => {
        console.log("Logo loaded:", window.logoDataUrl ? "Success" : "Failed");
    });
});

async function getCurrentSalesCount() {
    try {
        const sales = await window.api.getAllSales();
        // Check if we have any sales
        if (sales && sales.length > 0) {
            // Get the highest invoice number and add 1
            const maxInvoiceNumber = Math.max(...sales.map(sale => 
                typeof sale.invoiceNumber === 'number' ? 
                sale.invoiceNumber : 
                parseInt(sale.invoiceNumber) || 0
            ));
            return maxInvoiceNumber + 1;
        } else {
            return 1; // Start with 1 if no sales exist
        }
    } catch (error) {
        console.error('Error fetching sales count:', error);
        // Fallback to timestamp if we can't get the count
        return `BILL-${Date.now()}`;
    }
}
// Add a variable to store the current bill number
let currentBillNumber = null;

// Function to update the bill number every second
function startBillNumberUpdater() {
    updateBillNumber();
    // Update the bill number every second
    setInterval(updateBillNumber, 1000);
}

// Function to update the bill number
async function updateBillNumber() {
    const count = await getCurrentSalesCount();
    currentBillNumber = count;
    // If you want to display the bill number somewhere in the UI (optional)
    const billNumberElement = document.getElementById('billNumber');
    if (billNumberElement) {
        billNumberElement.textContent = `#${currentBillNumber}`;
    }
}

// Updated printReceipt function to use the current bill number
function printReceipt() {
    return new Promise(async (resolve) => {
        // Get form data
        const date = document.getElementById('date').value;
        
        // Use the current bill number instead of invoice number
        const billNumber = currentBillNumber || await getCurrentSalesCount();
        
        const customerName = document.getElementById('customer').value || 'Walk-in Customer';
        const customerPhone = document.getElementById('customerPhone').value || '';
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value || 'Cash';
        const comments = document.getElementById('comments').value || '';
        
        // Get totals
        const subtotal = parseFloat(document.getElementById('subTotal').textContent.replace(/[^0-9.-]+/g, '')) || 0;
        const discountAmount = parseFloat(document.getElementById('customerDiscount').value) || 0;
        const grandTotal = parseFloat(document.getElementById('grandTotal').value.replace(/[^0-9.-]+/g, '')) || 0;
        const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
        const dueAmount = grandTotal - paidAmount;
        
        // Format date
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
        const formattedDate = formatDateCompact(new Date(date).toLocaleDateString());
        
        // Collect products
        const products = [];
        document.querySelectorAll('#productsList tr').forEach(row => {
            const productName = row.cells[2].textContent.trim();
            const productCode = row.cells[1].textContent.trim();
            const quantity = parseInt(row.querySelector('.quantity').value) || 0;
            const price = parseFloat(row.cells[3].textContent.replace(/[^0-9.-]+/g, '')) || 0;
            const total = parseFloat(row.querySelector('.total-amount').textContent.replace(/[^0-9.-]+/g, '')) || 0;
            
            products.push({
                productName,
                productCode,
                quantity,
                price,
                totalAmount: total
            });
        });
        
        // Create print window
        const printWindow = window.open('', '_blank');
        
        // Determine if we have a logo
        const logoHtml = window.logoDataUrl 
            ? `<img src="${window.logoDataUrl}" alt="KN" class="logo" style="max-width: 150px; max-height: 100px; margin: 0 auto 10px auto; display: block;">`
            : `<div class="text-center"><h2 style="margin: 0; font-size: 32px; font-weight: bold;">KN</h2></div>`;
        
        // Generate HTML for printing with Bill Number instead of Invoice Number
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Sales Bill - #${billNumber}</title>
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
                                     
                    <p style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; text-decoration: underline;">SALES BILL</p>
                </div>
                
                <div style="font-size: 13px; margin: 10px 0; display: flex; flex-wrap: wrap;">
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Bill No:</span>
                            <span>#${billNumber}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Date:</span>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px; margin-left: -10px;">
                            <span style="font-weight: bold; width: 65px;">Customer:</span>
                            <span>${customerName}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px; margin-left: -10px;">
                            <span style="font-weight: bold; width: 65px;">Payment:</span>
                            <span>${paymentMethod}</span>
                        </div>
                    </div>
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                
                <div class="product-table">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead>
                            <tr style="border-bottom: 1px dashed #000;">
                                <th style="width: 36%; text-align: left; padding: 3px 0; position: relative; left: 5px;">Product</th>
                                <th style="width: 18%; text-align: center; padding: 3px 0; position: relative; left: -5px;">Qty</th>
                                <th style="width: 15%; text-align: right; padding: 3px 0; position: relative; left: -8px;">Price</th>
                                <th style="width: 25%; text-align: right; padding: 3px 0; position: relative; left: -10px;">Amount</th>
                            </tr>
                        </thead>
                    </table>
                    
                    ${products.map((product, index) => `
                        <div class="product-item" style="display: flex; align-items: center; font-size: 13px; margin: 3px 0;">
                            <div style="width: 36%; font-weight: bold; overflow-wrap: break-word; position: relative; left: 5px;">${index + 1}. ${product.productName}</div>
                            <div style="width: 18%; text-align: center;">${product.quantity}</div>
                            <div style="width: 15%; text-align: right;">${product.price.toFixed(2)}</div>
                            <div style="width: 25%; text-align: right; position: relative; left: 5px;">${product.totalAmount.toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="summary-section" style="display: flex; justify-content: flex-end; font-size: 13px;">
                    <div style="width: 72%;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Subtotal:</span>
                            <span style="position: relative; left: -10px;">Rs${subtotal.toFixed(2)}</span>
                        </div>
                        
                        ${discountAmount > 0 ? `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
                            <span style="font-weight: bold;">Discount:</span>
                            <span style="position: relative; left: -10px;">Rs${discountAmount.toFixed(2)}</span>
                        </div>` : ''}
                        
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 2px; margin: 2px 0 1px 0; font-weight: bold; font-size: 15px;">
                            <span>TOTAL:</span>
                            <span style="position: relative; left: -10px;">Rs${grandTotal.toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1px; margin-top: 1px;">
                            <span style="font-weight: bold;">Paid:</span>
                            <span style="position: relative; left: -10px;">Rs${paidAmount.toFixed(2)}</span>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between;">
                            <span style="font-weight: bold;">Due:</span>
                            <span style="position: relative; left: -10px;">Rs${dueAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                ${comments ? `
                    <div style="font-size: 13px; border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
                        <div style="font-weight: bold;">Comments:</div>
                        <div style="margin-top: 3px;">${comments}</div>
                    </div>
                ` : ''}
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="text-center" style="font-size: 13px; margin-top: 10px;">
                    <p style="margin: 6px 0; font-size: 12px;">Product must be returned within 7 days</p>
                    <p style="margin: 6px 0; font-weight: bold;">Thanks For Choosing Kashaf-Noor Libas</p>
                    <p style="margin: 12px 0 5px 0; font-style: italic; font-size: 12px;">Software by ZY Dev's</p>
                </div>
                
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; margin-right: 10px;">Print Bill</button>
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

// Modify collectProducts to handle return scenario


// Modal functions
function openProductModal() {
    const modal = document.getElementById('productsModal');
    modal.style.display = 'block';
    
    document.getElementById('searchProduct').value = '';
    document.getElementById('searchQuantity').value = '1';
    selectedProducts.clear();
    updateSelectedCount();
    
    displaySearchResults(allProducts);
    document.getElementById('searchProduct').focus();
}

function closeProductModal() {
    document.getElementById('productsModal').style.display = 'none';
    selectedProducts.clear();
    updateSelectedCount();
}

// Search handling
function handleProductSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredProducts = allProducts.filter(product => 
        (product.productName?.toLowerCase().includes(searchTerm) ||
         product.productCode?.toLowerCase().includes(searchTerm) ||
      
         product.companyName?.toLowerCase().includes(searchTerm))
    );
    displaySearchResults(filteredProducts);
}

// Display products in search results
// Display products in search results
async function displaySearchResults(products) {
    const tbody = document.getElementById('searchResults');
    const stockData = await window.api.getAllStock(); // Fetch stock data

    tbody.innerHTML = products.map(product => {
        const stockItem = stockData.find(stock => stock.product_code === product.productCode);
        const stockQuantity = stockItem ? stockItem.quantity : 0;
        const isOutOfStock = stockQuantity <= 0;

        // Calculate pack quantity if pack unit is available and greater than zero
        let packQuantity = 'N/A';
        if (stockItem && product.purchaseConvUnit > 0) {
            packQuantity = (stockQuantity / product.purchaseConvUnit).toFixed(2);
        }

        return `
            <tr class="${isOutOfStock ? 'out-of-stock' : ''}">
                <td class="checkbox-cell">
                    <input type="checkbox" 
                           class="product-checkbox" 
                           value="${product.productCode}"
                           ${isOutOfStock ? 'disabled' : ''}
                           title="${isOutOfStock ? 'Out of stock' : ''}">
                </td>
                <td>${product.productCode || ''}</td>
                <td>${product.productName || ''}</td>
                <td>${formatCurrency(product.salePrice)}</td>
              
                <td>${product.companyName || ''}</td>
        
                <td>${product.rackNo || ''}</td>
                <td class="${isOutOfStock ? 'text-danger' : ''}">${stockQuantity}</td>
         
            </tr>
        `;
    }).join('');

    // Add table event listeners
    addTableEventListeners(tbody);

    // Update selectAll checkbox behavior
    updateSelectAllBehavior();
}

// Modified addTableEventListeners function
function addTableEventListeners(tbody) {
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', function(e) {
            // Only handle click if the row is not out of stock
            if (!this.classList.contains('out-of-stock') && e.target.tagName !== 'INPUT') {
                const checkbox = this.querySelector('.product-checkbox');
                if (!checkbox.disabled) {
                    checkbox.checked = !checkbox.checked;
                    handleCheckboxChange(checkbox);
                }
            }
        });
    });

    tbody.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            if (!this.disabled) {
                e.stopPropagation();
                handleCheckboxChange(this);
            }
        });
    });
}

// New function to update selectAll checkbox behavior
function updateSelectAllBehavior() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const allCheckboxes = document.querySelectorAll('.product-checkbox:not(:disabled)');
    const checkedCheckboxes = document.querySelectorAll('.product-checkbox:checked:not(:disabled)');
    
    // Update selectAll state based on available products
    selectAllCheckbox.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
    
    // Update selectAll click handler
    selectAllCheckbox.onclick = function() {
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
            if (selectAllCheckbox.checked) {
                selectedProducts.add(checkbox.value);
            } else {
                selectedProducts.delete(checkbox.value);
            }
        });
        updateSelectedCount();
    };
}

// Add this CSS to your existing styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .out-of-stock {
        background-color: #f8f9fa;
        opacity: 0.7;
    }
    
    .out-of-stock td {
        color: #6c757d;
    }
    
    .text-danger {
        color: #dc3545 !important;
    }
    
    .product-checkbox:disabled {
        cursor: not-allowed;
        opacity: 0.5;
    }
    
    .out-of-stock .product-checkbox {
        cursor: not-allowed;
    }
`;
document.head.appendChild(styleSheet);

// Handle checkbox changes
function handleCheckboxChange(checkbox) {
    if (checkbox.checked) {
        selectedProducts.add(checkbox.value);
    } else {
        selectedProducts.delete(checkbox.value);
        document.getElementById('selectAll').checked = false;
    }
    updateSelectedCount();
}

function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = selectedProducts.size;
}

// Add selected products to main form
function addSelectedProducts() {
    if (selectedProducts.size === 0) {
        showNotification('Please select at least one product', 'error');
        return;
    }

    const quantity = parseInt(document.getElementById('searchQuantity').value) || 1;
    const tbody = document.getElementById('productsList');
    
    selectedProducts.forEach(productCode => {
        const product = allProducts.find(p => p.productCode === productCode);
        if (product) {
            // Check if product already exists in the list
            const existingRow = findExistingProductRow(product.productCode);
            if (existingRow) {
                updateExistingProduct(existingRow, quantity);
            } else {
                addProductToList(product, quantity, tbody);
            }
        }
    });
    
    closeProductModal();
    calculateGrandTotal();
}

function findExistingProductRow(productCode) {
    const tbody = document.getElementById('productsList');
    const rows = tbody.getElementsByTagName('tr');
    
    for (let row of rows) {
        if (row.cells[1].textContent === productCode) {
            return row;
        }
    }
    return null;
}

function updateExistingProduct(row, additionalQuantity) {
    const quantityInput = row.querySelector('.quantity');
    const currentQuantity = parseInt(quantityInput.value) || 0;
    const newQuantity = currentQuantity + additionalQuantity;
    
    quantityInput.value = newQuantity;
    calculateProductTotal(quantityInput);
}

function addProductToList(product, quantity, tbody) {
    const row = document.createElement('tr');
    const rate = parseFloat(product.salePrice) || 0;
    
    row.innerHTML = `
        <td>${tbody.children.length + 1}</td>
        <td>${product.productCode || ''}</td>
        <td>${product.productName || ''}</td>
        <td>${formatCurrency(rate)}</td>
        <td>
            <input type="number" class="quantity" value="${quantity}" 
                   min="1" oninput="calculateProductTotal(this)">
        </td>
    
     
        <td class="total-amount">0.00</td>
        <td>
            <button type="button" class="btn btn-secondary btn-sm" onclick="removeProduct(this)">
                Remove
            </button>
        </td>
    `;
    tbody.appendChild(row);
    calculateProductTotal(row.querySelector('.quantity'));
    updateTotalsDisplay();
}

function calculateProductTotal(input) {
    const row = input.closest('tr');
    const rate = parseFloat(row.cells[3].textContent.replace(/[^0-9.-]+/g, '')) || 0;
    const quantity = parseInt(row.querySelector('.quantity').value) || 0;
   

    let total = rate * quantity;
    

    
    // Apply percentage discount
    row.querySelector('.total-amount').textContent = formatCurrency(total);
    
    // Update all totals displays
    updateTotalsDisplay();
}

function updateDiscounts(input) {
    const row = input.closest('tr');
    const rate = parseFloat(row.cells[3].textContent) || 0;
    const quantity = parseInt(row.querySelector('.quantity').value) || 0;




    calculateProductTotal(row.querySelector('.quantity'));
}

// Calculate grand total
function calculateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.total-amount').forEach(cell => {
        grandTotal += parseFloat(cell.textContent) || 0;
    });

    document.getElementById('grandTotal').value = formatCurrency(grandTotal);
    
    calculateNetTotal();
}

function calculateNetTotal() {
    const grandTotal = parseFloat(document.getElementById('grandTotal').value) || 0;
    const customerDiscount = parseFloat(document.getElementById('customerDiscount').value) || 0;
    const adjustment = parseFloat(document.getElementById('adjustment').value) || 0;

    let netTotal = grandTotal - customerDiscount + adjustment;

    document.getElementById('netTotal').value = formatCurrency(netTotal);

    calculateChange();
}

function calculateChange() {
    const netTotal = parseFloat(document.getElementById('netTotal').value) || 0;
    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;

    const change = paidAmount - netTotal;

    document.getElementById('change').value = formatCurrency(change);
}

// Form validation
function validateForm() {
    if (document.querySelectorAll('#productsList tr').length === 0) {
        showNotification('Please add at least one product', 'error');
        return false;
    }

    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    const transactionType = document.querySelector('input[name="transactionType"]:checked').value;
    
    if (transactionType === 'sale' && paidAmount <= 0) {
        showNotification('Please enter a valid paid amount', 'error');
        return false;
    } else if (transactionType === 'return' && paidAmount < 0) {
        showNotification('Paid amount cannot be negative for returns', 'error');
        return false;
    }

    return true;
}

// Remove product from list
function removeProduct(button) {
    if (confirm('Are you sure you want to remove this product?')) {
        button.closest('tr').remove();
        calculateGrandTotal();
    }
}

// Fix for the collectProducts function at line 540
function collectProducts(transactionType = 'sale') {
    const products = [];
    document.querySelectorAll('#productsList tr').forEach(row => {
        const quantity = parseInt(row.querySelector('.quantity').value) || 1;
        const adjustedQuantity = transactionType === 'return' ? -quantity : quantity;
        
        // Get the total directly from the element with class 'total-amount'
        const totalElement = row.querySelector('.total-amount');
        const total = totalElement ? parseFloat(totalElement.textContent.replace(/[^0-9.-]+/g, '')) || 0 : 0;
        
        const product = {
            productCode: row.cells[1].textContent.trim(),
            productName: row.cells[2].textContent.trim(),
            rate: parseFloat(row.cells[3].textContent.replace(/[^0-9.-]+/g, '')) || 0,
            quantity: adjustedQuantity,
            total: total
        };

        products.push(product);
    });
    return products;
}

// Fix for the showNotification function at line 893
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.alert');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    
    // Look for different potential containers, in case '.container' doesn't exist
    const container = document.querySelector('.container') || 
                     document.querySelector('.content') || 
                     document.querySelector('main') || 
                     document.body;
    
    if (container) {
        container.insertBefore(notification, container.firstChild);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    } else {
        // Fallback - if no container found, just append to body
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Handle cancel button
function handleCancel() {
    if (hasFormChanges()) {
        document.getElementById('confirmationModal').style.display = 'block';
        
        const modalTitle = document.querySelector('#confirmationModal .modal-header h2');
        const modalBody = document.querySelector('#confirmationModal .modal-body p');
        const confirmBtn = document.getElementById('confirmSubmitBtn');
        
        modalTitle.textContent = 'Confirm Cancel';
        modalBody.textContent = 'Are you sure you want to cancel? All entered data will be lost.';
        confirmBtn.textContent = 'Yes, Cancel';
        
        confirmBtn.onclick = () => {
            location.reload();
        };
        
        document.getElementById('confirmCancelBtn').onclick = () => {
            document.getElementById('confirmationModal').style.display = 'none';
        };
    } else {
        location.reload();
    }
}

// Format currency
function formatCurrency(value) {
    return `Rs${parseFloat(value).toFixed(2)}`;
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Function to show success message
function showSuccessMessage() {
    document.getElementById('successModal').style.display = 'block';
    setTimeout(() => {
        document.getElementById('successModal').style.display = 'none';
        location.reload();
    }, 2000);
}

// Function to close all modals
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Handle keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Close modals on Escape key
    if (e.key === 'Escape') {
        closeAllModals();
    }
    
    // Handle enter key
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        
        // If search input is focused, trigger search
        if (e.target.id === 'searchProduct') {
            handleProductSearch({ target: e.target });
        }
    }
});

// Check if form has changes
function hasFormChanges() {
    const productsList = document.getElementById('productsList');
    const customer = document.getElementById('customer');
   
    const comments = document.getElementById('comments');
    
    return productsList.children.length > 0 || 
           customer.value !== '' || 
         
           comments.value !== '';
}

// Handle window resize for responsive tables
window.addEventListener('resize', function() {
    const tables = document.querySelectorAll('.table-responsive');
    tables.forEach(table => {
        if (table.scrollWidth > table.clientWidth) {
            table.style.overflowX = 'auto';
        } else {
            table.style.overflowX = 'hidden';
        }
    });
});

// Error handling
window.onerror = function(message, source, lineno, colno, error) {
    console.error('JS Error:', error);
    showNotification('An unexpected error occurred. Please try again.', 'error');
    return false;
};

// Warn before leaving page with changes
window.addEventListener('beforeunload', function(e) {
    if (hasFormChanges()) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Clean up function
function cleanup() {
    // Remove all event listeners
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.replaceWith(modal.cloneNode(true));
    });
    
    // Clear global variables
    allProducts = [];
    selectedProducts.clear();
    customers = [];
}
// Handle transaction type change
function handleTransactionTypeChange(e) {
    const transactionType = e.target.value;
    const formTitle = document.querySelector('.form-header h2') || 
                      document.createElement('h2');
    
    if (!document.querySelector('.form-header h2')) {
        formTitle.className = 'form-title';
        document.querySelector('.form-header').prepend(formTitle);
    }
    
    if (transactionType === 'return') {
        formTitle.textContent = 'Process Return';
        document.getElementById('salesForm').classList.add('return-form');
    } else {
        formTitle.textContent = 'New Sale';
        document.getElementById('salesForm').classList.remove('return-form');
    }
    
    // Update labels and validation for return
    updateFormForTransactionType(transactionType);
}

// Update form UI based on transaction type
function updateFormForTransactionType(type) {
    const paidAmountLabel = document.querySelector('label[for="paidAmount"]');
    const changeLabel = document.querySelector('label[for="change"]');
    
    if (type === 'return') {
        paidAmountLabel.textContent = 'Refund Amount';
        changeLabel.textContent = 'Balance';
    } else {
        paidAmountLabel.textContent = 'Paid Amount';
        changeLabel.textContent = 'Change';
    }
}

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', initializeForm);

// Clean up before unload
window.addEventListener('unload', cleanup);