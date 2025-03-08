


// Add this at the very top of your JavaScript file
const toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const menuToggle = document.querySelector('.menu-toggle');
    const menuToggleIcon = menuToggle.querySelector('i');

    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        
        // Toggle main content shift if it exists
        if (mainContent) {
            mainContent.classList.toggle('shifted');
        }

        // Toggle menu icon
        if (menuToggleIcon) {
            if (sidebar.classList.contains('collapsed')) {
                menuToggleIcon.classList.remove('fa-times');
                menuToggleIcon.classList.add('fa-bars');
            } else {
                menuToggleIcon.classList.remove('fa-bars');
                menuToggleIcon.classList.add('fa-times');
            }
        }
    }
};

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add click event listener to menu toggle button
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }

    // Setup other event listeners
    setupSidebarEvents();
});

function setupSidebarEvents() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const userProfile = document.querySelector('.user-profile');
    const profileMenu = document.querySelector('.profile-menu');

    // Close sidebar when clicking outside
    if (sidebar) {
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && 
                !e.target.matches('.menu-toggle, .menu-toggle *')) {
                sidebar.classList.add('collapsed');
                if (mainContent) {
                    mainContent.classList.remove('shifted');
                }
            }
        });

        // Prevent sidebar clicks from closing it
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Handle profile menu toggle
    if (userProfile && profileMenu) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            profileMenu?.classList.remove('active');
        });
    }
}

// Reports dropdown functionality
function toggleReportsDropdown(element) {
    if (!element) return;
    
    const dropdown = element.nextElementSibling;
    if (!dropdown) return;
    
    const isActive = dropdown.classList.contains('active');
    
    // Close any open dropdowns
    const allDropdownTriggers = document.querySelectorAll('.dropdown-trigger');
    const allDropdowns = document.querySelectorAll('.reports-dropdown');
    
    allDropdownTriggers.forEach(trigger => trigger.classList.remove('active'));
    allDropdowns.forEach(dd => dd.classList.remove('active'));

    // Toggle current dropdown
    if (!isActive) {
        dropdown.classList.add('active');
        element.classList.add('active');
    }
}// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize sidebar functionality after fetching the template
    initializeSidebar();
});

// Function to initialize all sidebar-related functionality
function initializeSidebar() {
    // Fetch sidebar template if it's not already in the page
    if (!document.querySelector('.sidebar')) {
        fetch('sidebar.html')
            .then(response => response.text())
            .then(html => {
                document.body.insertAdjacentHTML('afterbegin', html);
                setupEventListeners();
            })
            .catch(error => {
                console.error('Error loading sidebar:', error);
            });
    } else {
        setupEventListeners();
    }
}

// Setup all event listeners
function setupEventListeners() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const menuToggle = document.querySelector('.menu-toggle');
    const userProfile = document.querySelector('.user-profile');
    const profileMenu = document.querySelector('.profile-menu');

    if (!sidebar || !menuToggle) {
        console.error('Required elements not found. Check if sidebar and menu toggle elements exist.');
        return;
    }

    // Ensure menuToggleIcon exists
    const menuToggleIcon = menuToggle.querySelector('i') || menuToggle;

    // Define toggleSidebar in the global scope
    window.toggleSidebar = function() {
        sidebar.classList.toggle('active');
        if (mainContent) {
            mainContent.classList.toggle('shifted');
        }
        
        if (menuToggleIcon.classList.contains('fa-bars')) {
            menuToggleIcon.classList.remove('fa-bars');
            menuToggleIcon.classList.add('fa-times');
        } else {
            menuToggleIcon.classList.remove('fa-times');
            menuToggleIcon.classList.add('fa-bars');
        }
    };

    // Add click event listener to menu toggle
    menuToggle.addEventListener('click', window.toggleSidebar);

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
            if (mainContent) {
                mainContent.classList.remove('shifted');
            }
            menuToggleIcon.classList.remove('fa-times');
            menuToggleIcon.classList.add('fa-bars');
        }
    });

    // Handle profile menu if it exists
    if (userProfile && profileMenu) {
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            profileMenu.classList.remove('active');
        });
    }

    // Prevent sidebar clicks from closing it
    sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// Reports dropdown functionality
function toggleReportsDropdown(element) {
    if (!element) return;
    
    const dropdown = element.nextElementSibling;
    if (!dropdown) return;
    
    const isActive = dropdown.classList.contains('active');
    
    // Close any open dropdowns
    const allDropdownTriggers = document.querySelectorAll('.dropdown-trigger');
    const allDropdowns = document.querySelectorAll('.reports-dropdown');
    
    allDropdownTriggers.forEach(trigger => trigger.classList.remove('active'));
    allDropdowns.forEach(dd => dd.classList.remove('active'));

    // Toggle current dropdown
    if (!isActive) {
        dropdown.classList.add('active');
        element.classList.add('active');
    }
}