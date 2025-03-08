let editingCompanyId = null;
let allCompanies = [];

async function loadCompanies() {
    try {
        const companies = await safeApiCall(window.api.getCompanies);
        allCompanies = companies;
        displayCompanies(companies);
    } catch (error) {
        console.error('Error loading companies:', error);
        window.showErrorModal('Failed to load companies. Please try again.');
    }
}

function displayCompanies(companies) {
    const companyTableBody = document.getElementById('companyTableBody');
    if (!companyTableBody) {
        console.error('Company table body not found');
        return;
    }

    companyTableBody.innerHTML = '';
    companies.forEach(company => {
        const row = companyTableBody.insertRow();
        row.innerHTML = `
            <td>${company.company_id}</td>
            <td>${company.company_name}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="editCompany(${company.company_id})" class="btn btn-primary">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteCompany(${company.company_id})" class="btn btn-delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
    });
}

function filterCompanies() {
    const searchTerm = document.getElementById('companySearchField').value.toLowerCase();
    const filteredCompanies = allCompanies.filter(company => 
        company.company_name.toLowerCase().includes(searchTerm)
    );
    displayCompanies(filteredCompanies);
}

async function editCompany(companyId) {
    try {
        const company = allCompanies.find(c => String(c.company_id) === String(companyId));
        if (company) {
            document.getElementById('companyName').value = company.company_name;
            document.getElementById('formTitle').textContent = 'Edit Company';
            editingCompanyId = companyId;
            toggleCompanyModal(true);
        }
    } catch (error) {
        console.error('Error editing company:', error);
        window.showErrorModal('Failed to load company details. Please try again.');
    }
}

function deleteCompany(companyId) {
    window.showDeleteConfirmModal('Are you sure you want to delete this company?', async () => {
        try {
            await safeApiCall(() => window.api.deleteCompany(companyId));
            await loadCompanies();
        } catch (error) {
            console.error('Error deleting company:', error);
            window.showErrorModal('Failed to delete company. Please try again.');
        }
    });
}

function toggleCompanyModal(show) {
    const modal = document.getElementById('companyModal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    } else {
        console.error('Company modal not found');
    }
}

// Initialize Companies Module
document.addEventListener('DOMContentLoaded', () => {
    const addCompanyBtn = document.getElementById('addCompanyBtn');
    const companyForm = document.getElementById('companyForm');
    const cancelCompanyBtn = document.getElementById('cancelCompanyBtn');
    const companySearchField = document.getElementById('companySearchField');

    if (addCompanyBtn) {
        addCompanyBtn.addEventListener('click', () => {
            document.getElementById('formTitle').textContent = 'Add Company';
            document.getElementById('companyName').value = '';
            editingCompanyId = null;
            toggleCompanyModal(true);
        });
    }

    if (companyForm) {
       // Update the companyForm submit event listener in companies.js
companyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const companyName = document.getElementById('companyName').value.trim();

    if (!companyName) {
        window.showErrorModal('Please enter a company name');
        return;
    }

    try {
        if (editingCompanyId) {
            // Update existing company
            await safeApiCall(() => window.api.updateCompany({
                company_id: editingCompanyId,
                companyName: companyName  // Changed from company_name to companyName
            }));
        } else {
            // Add new company
            await safeApiCall(() => window.api.addCompany({
                companyName: companyName  // Changed from company_name to companyName
            }));
        }
        
        toggleCompanyModal(false);
        await loadCompanies();
        document.getElementById('companyName').value = '';
        editingCompanyId = null;
    } catch (error) {
        console.error('Error saving company:', error);
        window.showErrorModal('Failed to save company. Please try again.');
    }
});
    }

    if (cancelCompanyBtn) {
        cancelCompanyBtn.addEventListener('click', () => {
            toggleCompanyModal(false);
        });
    }

    if (companySearchField) {
        companySearchField.addEventListener('input', filterCompanies);
    }

    // Initial load
    loadCompanies();
});