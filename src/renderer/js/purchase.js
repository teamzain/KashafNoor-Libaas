// Global variables
let allProducts = [];
let selectedProducts = new Set();
let suppliers = [];

// Initialize form
async function initializeForm() {
    try {
        // Set current date and generate invoice number
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('invoiceNumber').value = 'INV-' + Date.now();
        
        // Load suppliers
        suppliers = await window.api.getSuppliers();
        const supplierSelect = document.getElementById('supplier');
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.supplier_name;
            option.textContent = supplier.supplier_name;
            supplierSelect.appendChild(option);
        });

        // Load products and stock
        allProducts = await window.api.getAllProducts();
        try {
            const stockData = await window.api.getAllStock();
            console.log('Loaded Stock Data:', stockData);
        } catch (stockError) {
            console.error('Error loading stock data:', stockError);
            showNotification('Warning: Could not load stock data', 'warning');
        }

        // Initialize event listeners
        initializeEventListeners();
                // Preload logo in the background
                preloadLogo();
    } catch (error) {
        console.error('Error initializing form:', error);
        showNotification('Error initializing form', 'error');
    }
}



// Initialize event listeners
function initializeEventListeners() {
    // Form submission
    document.getElementById('purchaseForm').addEventListener('submit', handleFormSubmit);
    
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
    
    // Tax controls
    document.querySelectorAll('input[name="taxType"]').forEach(radio => {
        radio.addEventListener('change', handleTaxTypeChange);
    });
    document.getElementById('taxAmount').addEventListener('input', handleTaxAmountChange);
    
    // Amount controls
    document.getElementById('paidAmount').addEventListener('input', calculateGrandTotal);
    
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



    document.querySelectorAll('input[name="discountType"]').forEach(radio => {
        radio.addEventListener('change', handleDiscountTypeChange);
    });
    document.getElementById('discountAmount').addEventListener('input', handleDiscountAmountChange);
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
    document.getElementById('invoiceNumber').value = 'INV-' + Date.now();
    
    // Reset date to current date
    document.getElementById('date').valueAsDate = new Date();
    
    // Reset supplier selection
    document.getElementById('supplier').value = '';
    
    // Reset bill number
    document.getElementById('billNo').value = '';
    
    // Reset to cash payment
    document.getElementById('cash').checked = true;
    
    // Reset comments
    document.getElementById('comments').value = '';
    document.getElementById('charCount').textContent = '0/100';
    
    // Reset tax
    document.getElementById('taxValue').checked = true;
    document.getElementById('taxAmount').value = '';
    document.getElementById('taxDisplay').textContent = 'Tax: 0.00';
    
    // Clear products list
    document.getElementById('productsList').innerHTML = '';
    
    // Reset amounts
    document.getElementById('grandTotal').value = '0.00';
    document.getElementById('paidAmount').value = '';
    document.getElementById('dueAmount').value = '0.00';

    document.getElementById('discountValue').checked = true;
    document.getElementById('discountAmount').value = '';
    document.getElementById('discountDisplay').textContent = 'Discount: 0.00';
    
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

// Updated handleConfirmedSubmit function

// Handle cancel button
function handleCancel(e) {
    // Prevent any default behavior
    e.preventDefault();
    
    if (hasFormChanges()) {
        // Show confirmation modal for cancel
        document.getElementById('confirmationModal').style.display = 'block';
        
        const modalTitle = document.querySelector('#confirmationModal .modal-header h2');
        const modalBody = document.querySelector('#confirmationModal .modal-body p');
        const confirmBtn = document.getElementById('confirmSubmitBtn');
        
        modalTitle.textContent = 'Confirm Cancel';
        modalBody.textContent = 'Are you sure you want to cancel? All entered data will be lost.';
        confirmBtn.textContent = 'Yes, Cancel';
        
        // Clone and replace the confirm button to remove old event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new event listener for cancellation
        newConfirmBtn.addEventListener('click', function() {
            // Close all modals
            closeAllModals();
            // Reset the form
            resetForm();
            
            // Show a cancellation notification
            showNotification('Form has been cancelled. No data was saved.', 'info');
        });
        
        // Clone and replace the cancel button in the modal
        const cancelBtn = document.getElementById('confirmCancelBtn');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newCancelBtn.addEventListener('click', function() {
            document.getElementById('confirmationModal').style.display = 'none';
        });
    } else {
        // If no changes, just reset the form
        resetForm();
        showNotification('Form has been reset.', 'info');
    }
    
    return false;
}

// Updated handleConfirmedSubmit function to handle printing
async function handleConfirmedSubmit() {
    document.getElementById('confirmationModal').style.display = 'none';
    document.getElementById('loadingSpinner').style.display = 'flex';

    try {
        const purchaseData = {
            invoiceNumber: document.getElementById('invoiceNumber').value,
            date: document.getElementById('date').value,
            billNo: document.getElementById('billNo').value,
            supplierName: document.getElementById('supplier').value,
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
            comments: document.getElementById('comments').value,
            taxType: document.querySelector('input[name="taxType"]:checked').value,
            taxAmount: parseFloat(document.getElementById('taxAmount').value) || 0,
            grandTotal: parseFloat(document.getElementById('grandTotal').value) || 0,
            paidAmount: parseFloat(document.getElementById('paidAmount').value) || 0,
            dueAmount: parseFloat(document.getElementById('dueAmount').value) || 0,
            discountType: document.querySelector('input[name="discountType"]:checked').value,
            discountAmount: parseFloat(document.getElementById('discountAmount').value) || 0,
            products: collectProducts()
        };

        const result = await window.api.addPurchase(purchaseData);
        
        if (result.success) {
            // Check if print is selected
            const shouldPrint = document.getElementById('printYes').checked;
            
            // If print is selected, call printPurchaseInvoice before anything else
            if (shouldPrint) {
                // Print first
                await printPurchaseInvoice(purchaseData);
            }
            
            // Reset the form after saving
            resetForm();
            
            // Show success modal
            document.getElementById('successModal').style.display = 'block';
            
            // Hide success modal after delay
            setTimeout(() => {
                document.getElementById('successModal').style.display = 'none';
            }, 2000);
            
            // Show success notification
            showNotification('Purchase saved successfully!', 'success');
        } else {
            throw new Error(result.message || 'Failed to save purchase');
        }
    } catch (error) {
        console.error('Error saving purchase:', error);
        showNotification(error.message || 'Error saving purchase. Please try again.', 'error');
    } finally {
        document.getElementById('loadingSpinner').style.display = 'none';
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
function printPurchaseInvoice(purchaseData) {
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
        const formattedDate = formatDateCompact(new Date(purchaseData.date).toLocaleDateString());
        
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
                <title>Purchase Invoice - ${purchaseData.invoiceNumber}</title>
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
                                     
                    <p style="margin: 12px 0 8px 0; font-size: 16px; font-weight: bold; text-decoration: underline;">PURCHASE INVOICE</p>
                </div>
                
                <div style="font-size: 13px; margin: 10px 0; display: flex; flex-wrap: wrap;">
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Bill No:</span>
                            <span>${purchaseData.billNo}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Date:</span>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                    <div style="width: 50%;">
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Supplier:</span>
                            <span>${purchaseData.supplierName}</span>
                        </div>
                        <div class="receipt-info" style="display: flex; justify-content: flex-start; margin-bottom: 4px;">
                            <span style="font-weight: bold; width: 65px;">Payment:</span>
                            <span>${purchaseData.paymentMethod}</span>
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

    
    ${purchaseData.products.map((product, index) => `
        <div class="product-item" style="display: flex; align-items: center; font-size: 13px; margin: 3px 0;">
            <div style="width: 36%; font-weight: bold; overflow-wrap: break-word;">${index + 1}. ${product.productName}</div>
            <div style="width: 18%; text-align: center;">${product.purchasePack}${product.focPack ? '+' + product.focPack : ''}</div>
            <div style="width: 15%; text-align: right;">${product.costPrice.toFixed(2)}</div>
            <div style="width: 25%; text-align: right;  position: relative; left: 5px;">${product.totalAmount.toFixed(2)}</div>
        </div>
        <div style="font-size: 12px; color: #555; margin-bottom: 2px; padding-left: 8px;">
            ${product.purchaseUnitQty ? 'Units: ' + product.purchaseUnitQty : ''}${product.focUnit ? ', FOC: ' + product.focUnit : ''}
        </div>
    `).join('')}
</div>

                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="summary-section" style="display: flex; justify-content: flex-end; font-size: 13px;">
    <div style="width: 72%;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
            <span style="font-weight: bold;">Subtotal:</span>
            <span style="position: relative; left: -10px;">Rs${(purchaseData.grandTotal - purchaseData.taxAmount + purchaseData.discountAmount).toFixed(2)}</span>
        </div>
        
        ${purchaseData.taxAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
            <span style="font-weight: bold;">Tax ${purchaseData.taxType === 'percentage' ? '(' + purchaseData.taxAmount + '%)' : ''}:</span>
            <span style="position: relative; left: -10px;">Rs${purchaseData.taxAmount.toFixed(2)}</span>
        </div>` : ''}
        
        ${purchaseData.discountAmount > 0 ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 1px;">
            <span style="font-weight: bold;">Discount ${purchaseData.discountType === 'percentage' ? '(' + purchaseData.discountAmount + '%)' : ''}:</span>
            <span style="position: relative; left: -10px;">Rs${purchaseData.discountAmount.toFixed(2)}</span>
        </div>` : ''}
        
        <div style="display: flex; justify-content: space-between; border-top: 1px dashed #000; padding-top: 2px; margin: 2px 0 1px 0; font-weight: bold; font-size: 15px;">
            <span>TOTAL:</span>
            <span style="position: relative; left: -10px;">Rs${purchaseData.grandTotal.toFixed(2)}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 1px; margin-top: 1px;">
            <span style="font-weight: bold;">Paid:</span>
            <span style="position: relative; left: -10px;">Rs${purchaseData.paidAmount.toFixed(2)}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: bold;">Due:</span>
            <span style="position: relative; left: -10px;">Rs${purchaseData.dueAmount.toFixed(2)}</span>
        </div>
    </div>
</div>

                ${purchaseData.comments ? `
                    <div style="font-size: 13px; border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px;">
                        <div style="font-weight: bold;">Comments:</div>
                        <div style="margin-top: 3px;">${purchaseData.comments}</div>
                    </div>
                ` : ''}
                
                <div style="border-top: 1px dashed #000; margin: 10px 0 6px 0;"></div>
                
                <div class="text-center" style="font-size: 13px; margin-top: 10px;">
                    <p style="margin: 6px 0; font-weight: bold;">Thank you for your business!</p>
                    <p style="margin: 12px 0 5px 0; font-style: italic; font-size: 12px;">Software by ZY Dev's</p>
                </div>
                
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; margin-right: 10px;">Print Invoice</button>
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
// Helper function to collect product data with stock quantities
function collectProducts() {
    const products = [];
    document.querySelectorAll('#productsList tr').forEach(row => {
        const product = {
            productCode: row.cells[0].textContent.trim(),
            productName: row.cells[1].textContent.trim(),
          
          
          
            costPrice: parseFloat(row.querySelector('.cost-price').value) || 0,
            purchasePack: parseInt(row.querySelector('.purchase-pack').value) || 0,
            totalAmount: parseFloat(row.querySelector('.total-amount').textContent.replace(/[^0-9.-]+/g, '')) || 0,
           
        };

        // Validate the product data
        if (!product.productCode || !product.productName) {
            throw new Error('Invalid product data detected');
        }

        products.push(product);
    });
    return products;
}
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
         product.genericName?.toLowerCase().includes(searchTerm) ||
         product.companyName?.toLowerCase().includes(searchTerm))
    );
    displaySearchResults(filteredProducts);
}

// Display products in search results
async function displaySearchResults(products) {
    const tbody = document.getElementById('searchResults');
    const stockData = await window.api.getAllStock(); // Fetch stock data

    tbody.innerHTML = products.map(product => {
        const stockItem = stockData.find(stock => stock.product_code === product.productCode);
        const stockQuantity = stockItem ? stockItem.quantity : 'N/A';

        return `
            <tr>
                <td class="checkbox-cell">
                    <input type="checkbox" class="product-checkbox" value="${product.productCode}">
                </td>
                <td>${product.productCode || ''}</td>
                <td>${product.productName || ''}</td>
                <td>${stockQuantity}</td>
            </tr>
        `;
    }).join('');

    addTableEventListeners(tbody);
}


// Add event listeners to table
function addTableEventListeners(tbody) {
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = this.querySelector('.product-checkbox');
                checkbox.checked = !checkbox.checked;
                handleCheckboxChange(checkbox);
            }
        });
    });

    tbody.querySelectorAll('.product-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function(e) {
            e.stopPropagation();
            handleCheckboxChange(this);
        });
    });
}

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
        if (row.cells[0].textContent === productCode) {
            return row;
        }
    }
    return null;
}

function updateExistingProduct(row, additionalQuantity) {
    const purchasePackInput = row.querySelector('.purchase-pack');
    const currentQuantity = parseInt(purchasePackInput.value) || 0;
    const newQuantity = currentQuantity + additionalQuantity;
    
    purchasePackInput.value = newQuantity;
    calculateProductTotal(purchasePackInput);
}

function addProductToList(product, quantity, tbody) {
    const row = document.createElement('tr');
    const retailPricePerUnit = parseFloat(product.salePrice) || 0;
    
    row.innerHTML = `
        <td>${product.productCode || ''}</td>
        <td>${product.productName || ''}</td>
        <td>
            <input type="number" class="cost-price" " 
                   step="0.01" onchange="calculateProductTotal(this)" ">
        </td>
        <td>
            <input type="number" class="purchase-pack" value="${quantity}" 
                   min="1" onchange="calculateProductTotal(this)">
        </td>
        <td class="total-amount">0.00</td>
        <td>
            <button type="button" class="btn btn-secondary btn-sm" onclick="removeProduct(this)">
                Remove
            </button>
        </td>
    `;
    tbody.appendChild(row);
    calculateProductTotal(row.querySelector('.cost-price'));
}
function calculateFOCUnit(input) {
    const row = input.closest('tr');
    const focPack = parseFloat(input.value) || 0;
    const qtyPerPack = parseInt(row.children[3].textContent) || 1;
    const focUnit = focPack * qtyPerPack;
    
    row.querySelector('.foc-unit').value = focUnit;
}
// Calculate total for a single product
function calculateProductTotal(input) {
    const row = input.closest('tr');
    const costPrice = parseFloat(row.querySelector('.cost-price').value) || 0;
    const purchasePack = parseInt(row.querySelector('.purchase-pack').value) || 0;
    
    const total = costPrice * purchasePack;
    row.querySelector('.total-amount').textContent = formatCurrency(total);
    
    calculateGrandTotal();
}

// Handle tax type change
function handleTaxTypeChange() {
    const taxInput = document.getElementById('taxAmount');
    const taxLabel = document.querySelector('label[for="taxAmount"]');
    
    if (this.value === 'percentage') {
        taxInput.placeholder = 'Enter percentage (e.g., 5 for 5%)';
        taxLabel.textContent = 'Tax Percentage';
        taxInput.step = '0.01';
        taxInput.min = '0';
        taxInput.max = '100';
    } else {
        taxInput.placeholder = 'Enter tax amount';
        taxLabel.textContent = 'Tax Amount';
        taxInput.step = '0.01';
        taxInput.min = '0';
        taxInput.removeAttribute('max');
    }
    
    taxInput.value = '';
    calculateGrandTotal();
}

// Handle tax amount change
function handleTaxAmountChange() {
    const taxType = document.querySelector('input[name="taxType"]:checked').value;
    if (taxType === 'percentage' && this.value > 100) {
        this.value = 100;
    }
    calculateGrandTotal();
}

// Calculate grand total with tax
function calculateGrandTotal() {
    let subtotal = 0;
    document.querySelectorAll('.total-amount').forEach(cell => {
        subtotal += parseFloat(cell.textContent) || 0;
    });

    // Calculate tax
    const taxType = document.querySelector('input[name="taxType"]:checked').value;
    const taxAmount = parseFloat(document.getElementById('taxAmount').value) || 0;
    
    let taxValue = 0;
    if (taxType === 'percentage') {
        taxValue = (subtotal * (taxAmount / 100));
    } else {
        taxValue = taxAmount;
    }

    // Calculate discount
    const discountType = document.querySelector('input[name="discountType"]:checked').value;
    const discountAmount = parseFloat(document.getElementById('discountAmount').value) || 0;
    
    let discountValue = 0;
    if (discountType === 'percentage') {
        discountValue = (subtotal * (discountAmount / 100));
    } else {
        discountValue = discountAmount;
    }

    // Update displays
    document.getElementById('taxDisplay').textContent = 
        `Tax: ${formatCurrency(taxValue)} (${taxType === 'percentage' ? taxAmount + '%' : 'Fixed'})`;
    
    document.getElementById('discountDisplay').textContent = 
        `Discount: ${formatCurrency(discountValue)} (${discountType === 'percentage' ? discountAmount + '%' : 'Fixed'})`;

    // Calculate grand total with tax and discount
    const grandTotal = subtotal + taxValue - discountValue;
    document.getElementById('grandTotal').value = formatCurrency(grandTotal);
    
    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    document.getElementById('dueAmount').value = formatCurrency(grandTotal - paidAmount);
}


// Form validation
function validateForm() {
    if (!document.getElementById('supplier').value) {
        showNotification('Please select a supplier', 'error');
        return false;
    }

    if (document.querySelectorAll('#productsList tr').length === 0) {
        showNotification('Please add at least one product', 'error');
        return false;
    }

    const paidAmount = parseFloat(document.getElementById('paidAmount').value) || 0;
    if (paidAmount <= 0) {
        showNotification('Please enter a valid paid amount', 'error');
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

// Show notification
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.alert');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertBefore(notification, container.firstChild);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Handle cancel button
// Handle cancel button

// Format currency
function formatCurrency(amount) {
    return (parseFloat(amount) || 0).toFixed(2);
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
    const supplier = document.getElementById('supplier');
    const billNo = document.getElementById('billNo');
    const comments = document.getElementById('comments');
    const taxAmount = document.getElementById('taxAmount');
    
    return productsList.children.length > 0 || 
           supplier.value !== '' || 
           billNo.value !== '' ||
           comments.value !== '' ||
           taxAmount.value !== '';
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
    suppliers = [];
}

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', initializeForm);

// Clean up before unload
window.addEventListener('unload', cleanup);


function handleDiscountTypeChange() {
    const discountInput = document.getElementById('discountAmount');
    const discountLabel = document.querySelector('label[for="discountAmount"]');
    
    if (this.value === 'percentage') {
        discountInput.placeholder = 'Enter percentage (e.g., 5 for 5%)';
        discountLabel.textContent = 'Discount Percentage';
        discountInput.step = '0.01';
        discountInput.min = '0';
        discountInput.max = '100';
    } else {
        discountInput.placeholder = 'Enter discount amount';
        discountLabel.textContent = 'Discount Amount';
        discountInput.step = '0.01';
        discountInput.min = '0';
        discountInput.removeAttribute('max');
    }
    
    discountInput.value = '';
    calculateGrandTotal();
}

function handleDiscountAmountChange() {
    const discountType = document.querySelector('input[name="discountType"]:checked').value;
    if (discountType === 'percentage' && this.value > 100) {
        this.value = 100;
    }
    calculateGrandTotal();
}