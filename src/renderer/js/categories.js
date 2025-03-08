// js/categories.js
let currentEditingId = null;
let allCategories = [];
let allSubcategories = [];

// Load Categories and Subcategories
async function loadCategories() {
    try {
        const [categories, subcategories] = await Promise.all([
            safeApiCall(() => window.api.getCategories()),
            safeApiCall(() => window.api.fetchSubcategories())
        ]);
        allCategories = categories;
        allSubcategories = subcategories;
        displayCategories(categories, subcategories);
    } catch (error) {
        console.error('Error loading data:', error);
        window.showErrorModal('Failed to load categories. Please try again.');
    }
}

// Display Categories in Table
function displayCategories(categories, subcategories) {
    const tbody = document.getElementById('categoryTableBody');
    if (!tbody) {
        console.error('Category table body not found');
        return;
    }
    
    tbody.innerHTML = '';

    categories.forEach(category => {
        const relatedSubcategories = subcategories.filter(sub => sub.category_id === category.category_id);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${category.category_id}</td>
            <td>${category.category_name}</td>
            <td>${category.created_at || '-'}</td>
            <td>${relatedSubcategories.map(sub => sub.subcategory_id).join(', ') || '-'}</td>
            <td>${relatedSubcategories.map(sub => sub.subcategory_name).join(', ') || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="editCategory(${category.category_id})" class="btn btn-primary">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteCategory(${category.category_id})" class="btn btn-delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    <button onclick="showAddSubcategory(${category.category_id})" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Add Sub Category
                    </button>
                </div>
            </td>
        `;
    });
}

// Filter Categories
function filterCategories() {
    const searchTerm = document.getElementById('searchField').value.toLowerCase();
    const filteredCategories = allCategories.filter(category => 
        category.category_name.toLowerCase().includes(searchTerm)
    );
    displayCategories(filteredCategories, allSubcategories);
}

// Edit Category
async function editCategory(id) {
    const category = allCategories.find(c => c.category_id === id);
    if (category) {
        currentEditingId = id;
        document.getElementById('categoryName').value = category.category_name;
        document.getElementById('modalTitle').textContent = 'Edit Category';
        toggleCategoryModal(true);
    } else {
        console.error('Category not found:', id);
        window.showErrorModal('Category not found');
    }
}

// Delete Category
async function deleteCategory(id) {
    window.showDeleteConfirmModal('Are you sure you want to delete this category?', async () => {
        try {
            await safeApiCall(() => window.api.deleteCategory(id));
            await loadCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            window.showErrorModal('Failed to delete category. Please try again.');
        }
    });
}

// Show Add Subcategory Modal
function showAddSubcategory(categoryId) {
    console.log('Opening subcategory modal for category:', categoryId);
    
    const subcategoryModal = document.getElementById('subcategoryModal');
    const subcategoryCategoryId = document.getElementById('subcategoryCategoryId');
    const subcategoryName = document.getElementById('subcategoryName');

    if (!subcategoryModal || !subcategoryCategoryId || !subcategoryName) {
        console.error('Required subcategory modal elements not found');
        return;
    }

    subcategoryCategoryId.value = categoryId;
    subcategoryName.value = '';
    subcategoryModal.style.display = 'flex';
    console.log('Subcategory modal opened');
}

// Toggle Category Modal
function toggleCategoryModal(show) {
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    } else {
        console.error('Category modal not found');
    }
}

// Toggle Subcategory Modal
function toggleSubcategoryModal(show) {
    const modal = document.getElementById('subcategoryModal');
    if (modal) {
        modal.style.display = show ? 'flex' : 'none';
    } else {
        console.error('Subcategory modal not found');
    }
}

// Safe API Call Wrapper
async function safeApiCall(apiCall) {
    window.showLoader(4000);
    try {
        return await apiCall();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    } finally {
        setTimeout(window.hideLoader, 1000);
    }
}

// Initialize Categories Module
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM Elements
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const categoryForm = document.getElementById('categoryForm');
    const subcategoryForm = document.getElementById('subcategoryForm');
    const cancelBtn = document.getElementById('cancelBtn');
    const subcategoryCancelBtn = document.getElementById('subcategoryCancelBtn');
    const searchField = document.getElementById('searchField');

    // Add Category Button Click Handler
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            currentEditingId = null;
            document.getElementById('categoryName').value = '';
            document.getElementById('modalTitle').textContent = 'Add Category';
            toggleCategoryModal(true);
        });
    }

    // Category Form Submit Handler
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryName = document.getElementById('categoryName').value.trim();
            
            if (!categoryName) {
                window.showErrorModal('Please enter a category name');
                return;
            }

            try {
                if (currentEditingId) {
                    await safeApiCall(() => window.api.updateCategory(currentEditingId, categoryName));
                } else {
                    await safeApiCall(() => window.api.addCategory(categoryName));
                }
                toggleCategoryModal(false);
                await loadCategories();
            } catch (error) {
                console.error('Error saving category:', error);
                window.showErrorModal('Failed to save category. Please try again.');
            }
        });
    }

    // Subcategory Form Submit Handler
    if (subcategoryForm) {
        subcategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryId = document.getElementById('subcategoryCategoryId').value;
            const subcategoryName = document.getElementById('subcategoryName').value.trim();
            
            if (!subcategoryName) {
                window.showErrorModal('Please enter a subcategory name');
                return;
            }

            try {
                await safeApiCall(() => window.api.addSubcategory({ 
                    categoryId: parseInt(categoryId), 
                    subcategoryName 
                }));
                toggleSubcategoryModal(false);
                await loadCategories();
            } catch (error) {
                console.error('Error adding subcategory:', error);
                window.showErrorModal('Failed to add subcategory. Please try again.');
            }
        });
    }

    // Cancel Button Handlers
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => toggleCategoryModal(false));
    }

    if (subcategoryCancelBtn) {
        subcategoryCancelBtn.addEventListener('click', () => toggleSubcategoryModal(false));
    }

    // Search Field Handler
    if (searchField) {
        searchField.addEventListener('input', filterCategories);
    }

    // Initial Load
    loadCategories();
});