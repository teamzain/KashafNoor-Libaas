document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    function switchTab(tabId) {
        // Remove active class from all tabs and panes
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        // Add active class to selected tab and pane
        const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
        const selectedPane = document.getElementById(tabId);
        
        if (selectedTab && selectedPane) {
            selectedTab.classList.add('active');
            selectedPane.classList.add('active');
        }
    }

    // Add click event listeners to tab buttons
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    // Common utility functions
    window.showLoader = function(minDuration = 4000) {
        if (window.loaderTimeout) {
            clearTimeout(window.loaderTimeout);
        }

        document.getElementById('overlay').style.display = 'block';
        document.getElementById('loader').style.display = 'block';

        window.loaderTimeout = setTimeout(hideLoader, minDuration);
    };

    window.hideLoader = function() {
        if (window.loaderTimeout) {
            clearTimeout(window.loaderTimeout);
        }

        document.getElementById('overlay').style.display = 'none';
        document.getElementById('loader').style.display = 'none';
    };

    window.showErrorModal = function(message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorModal.style.display = 'flex';
    };

    window.closeErrorModal = function() {
        const errorModal = document.getElementById('errorModal');
        errorModal.style.display = 'none';
    };

    window.showDeleteConfirmModal = function(message, onConfirm) {
        const deleteModal = document.getElementById('deleteConfirmModal');
        const deleteMessage = document.getElementById('deleteConfirmMessage');
        deleteMessage.textContent = message;
        deleteModal.style.display = 'flex';

        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('cancelDeleteBtn');

        const confirmHandler = async () => {
            await onConfirm();
            deleteModal.style.display = 'none';
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };

        const cancelHandler = () => {
            deleteModal.style.display = 'none';
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };

        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    };
    function showAddSubcategory(categoryId) {
        const subcategoryModal = document.getElementById('subcategoryModal');
        const subcategoryCategoryId = document.getElementById('subcategoryCategoryId');
        const subcategoryName = document.getElementById('subcategoryName');
        
        if (subcategoryModal && subcategoryCategoryId && subcategoryName) {
            subcategoryCategoryId.value = categoryId;
            subcategoryName.value = '';
            subcategoryModal.style.display = 'flex';
        } else {
            console.error('Subcategory modal elements not found');
        }
    }
    
    // Update the toggleModal function
    function toggleModal(modalId, show) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = show ? 'flex' : 'none';
        } else {
            console.error(`Modal with id ${modalId} not found`);
        }
    }
    window.api = {
        // Supplier API
        getSuppliers: async () => {
          // Continuation of js/main.js API implementations

          await new Promise(resolve => setTimeout(resolve, 1500));
          return [
              { supplier_id: 1, supplier_name: 'Tech Supplies Inc', email: 'contact@techsupplies.com', address: '123 Tech Street', phone_number: '(555) 123-4567' },
              { supplier_id: 2, supplier_name: 'Global Vendors', email: 'info@globalvendors.com', address: '456 Global Avenue', phone_number: '(555) 987-6543' }
          ];
      },
      addSupplier: async (supplier) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      },
      updateSupplier: async (supplier) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      },
      deleteSupplier: async (id) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      },

      // Generics API
      getGenerics: async () => {
          await new Promise(resolve => setTimeout(resolve, 1500));
          return [
              { generic_id: 1, generic_name: 'Paracetamol' },
              { generic_id: 2, generic_name: 'Ibuprofen' }
          ];
      },
      addGeneric: async (generic) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      },
      updateGeneric: async (generic) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      },
      deleteGeneric: async (id) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      },

      // Line Items API
      getLineItems: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return [
            { id: 1, name: 'Product A' },
            { id: 2, name: 'Product B' }
        ];
    },
      addLineItem: async (lineItem) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      },
      updateLineItem: async (lineItem) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      },
      deleteLineItem: async (id) => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { success: true };
      }
,
        
        // Categories API
        getCategories: async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return [
                { category_id: 1, category_name: 'Electronics', created_at: '2024-01-27' },
                { category_id: 2, category_name: 'Clothing', created_at: '2024-01-27' }
            ];
        },
        fetchSubcategories: async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return [
                { subcategory_id: 1, category_id: 1, subcategory_name: 'Smartphones' },
                { subcategory_id: 2, category_id: 1, subcategory_name: 'Laptops' }
            ];
        },
        addCategory: async (name) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        },
        updateCategory: async (id, name) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        },
        deleteCategory: async (id) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        },
        addSubcategory: async (data) => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return { success: true };
        }
   ,  getCompanies: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return [
            { company_id: 1, company_name: 'Tech Solutions' },
            { company_id: 2, company_name: 'Global Innovations' }
        ];
    },
    addCompany: async (company) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true };
    },
    updateCompany: async (company) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true };
    },
    deleteCompany: async (id) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true };
    },

    getCompanies: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return [
            { company_id: 1, company_name: 'Tech Solutions' },
            { company_id: 2, company_name: 'Global Innovations' }
        ];
    },
    addCompany: async (company) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true };
    },
    updateCompany: async (company) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true };
    },
    deleteCompany: async (id) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return { success: true };
    }
  };
});