// js/suppliers.js
let currentEditingSupplierId = null;
let allSuppliers = [];

async function loadSuppliers() {
    try {
        const suppliers = await safeApiCall(window.api.getSuppliers);
        allSuppliers = suppliers;
        displaySuppliers(suppliers);
    } catch (error) {
        console.error('Error loading suppliers:', error);
    }
}

function displaySuppliers(suppliers) {
    const supplierTableBody = document.getElementById('supplierTableBody');
    supplierTableBody.innerHTML = '';

    suppliers.forEach(supplier => {
        const row = supplierTableBody.insertRow();
        row.innerHTML = `
            <td>${supplier.supplier_id}</td>
            <td>${supplier.supplier_name}</td>
            <td>${supplier.email}</td>
            <td>${supplier.address}</td>
            <td>${supplier.phone_number}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="editSupplier(${supplier.supplier_id})" class="btn btn-primary">Edit</button>
                    <button onclick="deleteSupplier(${supplier.supplier_id})" class="btn">Delete</button>
                </div>
            </td>
        `;
    });
}

function editSupplier(id) {
    const supplier = allSuppliers.find(s => s.supplier_id === id);

    if (supplier) {
        document.getElementById('supplierName').value = supplier.supplier_name;
        document.getElementById('email').value = supplier.email;
        document.getElementById('address').value = supplier.address;
        document.getElementById('phoneNumber').value = supplier.phone_number;

        document.getElementById('supplierModalTitle').innerText = 'Edit Supplier';
        currentEditingSupplierId = id;
        toggleSupplierModal(true);
    }
}

function deleteSupplier(id) {
    window.showDeleteConfirmModal('Are you sure you want to delete this supplier?', async () => {
        try {
            await safeApiCall(() => window.api.deleteSupplier(id));
            await loadSuppliers();
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

function filterSuppliers() {
    const searchTerm = document.getElementById('supplierSearchField').value.toLowerCase();
    const filteredSuppliers = allSuppliers.filter(supplier => 
        supplier.supplier_name.toLowerCase().includes(searchTerm) ||
        supplier.email.toLowerCase().includes(searchTerm)
    );
    displaySuppliers(filteredSuppliers);
}

function toggleSupplierModal(show) {
    const modal = document.getElementById('supplierModal');
    modal.style.display = show ? 'flex' : 'none';
}

function resetSupplierForm() {
    document.getElementById('supplierForm').reset();
    currentEditingSupplierId = null;
}

async function safeApiCall(apiCall) {
    window.showLoader(4000);
    try {
        return await apiCall();
    } catch (error) {
        console.error('Error:', error);
        window.showErrorModal('An error occurred. Please try again.');
        throw error;
    } finally {
        setTimeout(window.hideLoader, 1000);
    }
}

// Initialize Supplier Module
document.addEventListener('DOMContentLoaded', () => {
    const addSupplierBtn = document.getElementById('addSupplierBtn');
    const saveSupplierBtn = document.getElementById('saveSupplier');
    const cancelSupplierBtn = document.getElementById('cancelSupplier');

    addSupplierBtn.addEventListener('click', () => {
        resetSupplierForm();
        document.getElementById('supplierModalTitle').innerText = 'Add Supplier';
        currentEditingSupplierId = null;
        toggleSupplierModal(true);
    });

    cancelSupplierBtn.addEventListener('click', () => {
        resetSupplierForm();
        toggleSupplierModal(false);
    });

    saveSupplierBtn.addEventListener('click', async () => {
        const supplierName = document.getElementById('supplierName').value;
        const email = document.getElementById('email').value;
        const address = document.getElementById('address').value;
        const phoneNumber = document.getElementById('phoneNumber').value;

        if (!supplierName || !email || !address || !phoneNumber) {
            window.showErrorModal('Please fill in all fields');
            return;
        }

        const supplier = { supplierName, email, address, phoneNumber };

        try {
            if (currentEditingSupplierId) {
                supplier.supplier_id = currentEditingSupplierId;
                await safeApiCall(() => window.api.updateSupplier(supplier));
            } else {
                await safeApiCall(() => window.api.addSupplier(supplier));
            }

            resetSupplierForm();
            toggleSupplierModal(false);
            await loadSuppliers();
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Initial load
    loadSuppliers();
});