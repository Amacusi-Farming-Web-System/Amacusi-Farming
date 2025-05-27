// Admin Dashboard General Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar navigation active state
    const currentPage = window.location.pathname.split('/').pop() || 'admin.html';
    const navLinks = document.querySelectorAll('.sidebar-menu a');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (currentPage === linkPage) {
            link.classList.add('active');
        }
        
        link.addEventListener('click', function(e) {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Logout functionality
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // In a real app, this would call your logout API
            localStorage.removeItem('adminToken');
            window.location.href = 'login.html';
        });
    }
});