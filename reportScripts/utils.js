import { domElements } from './main.js';

export function ensureRequiredElements() {
    const required = [
        'reportType', 'startDate', 'endDate', 'generateReport',
        'totalOrders', 'totalRevenue', 'totalProductsSold', 'totalCustomers'
    ];
    
    const missing = required.filter(id => !document.getElementById(id));
    if (missing.length > 0) {
        console.warn('Missing required elements:', missing);
        return false;
    }
    return true;
}

export function formatDateForInput(date) {
    return date.toISOString().split("T")[0];
}

export function formatChartDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

export function formatMonthYear(monthString) {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
    });
}

export function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function calculatePercentage(value, data) {
    if (Array.isArray(data)) {
        const total = data.reduce((sum, item) => {
            if (typeof item === 'number') return sum + item;
            if (item.total !== undefined) return sum + item.total;
            if (item.count !== undefined) return sum + item.count;
            return sum;
        }, 0);
        return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    } else if (typeof data === 'object') {
        const values = Object.values(data);
        const total = values.reduce((sum, item) => {
            if (typeof item === 'number') return sum + item;
            if (item.count !== undefined) return sum + item.count;
            return sum;
        }, 0);
        return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    }
    return '0.0';
}

export function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'R0.00';
    return `R${parseFloat(amount).toFixed(2)}`;
}

export function formatNumber(number) {
    if (number === null || number === undefined) return '0';
    return parseInt(number).toLocaleString();
}

export function formatDateFull(date) {
    if (!date) return 'N/A';
    try {
        const jsDate = date?.toDate?.() || new Date(date);
        if (isNaN(jsDate.getTime())) return 'N/A';
        return jsDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (error) {
        return 'N/A';
    }
}

export function getCustomerName(customer) {
    if (!customer) return 'Unknown Customer';
    
    return customer.name || 
           customer.displayName || 
           customer.fullName || 
           (customer.firstName && customer.lastName ? `${customer.firstName} ${customer.lastName}` : null) ||
           (customer.email ? customer.email.split('@')[0] : 'Unknown Customer');
}

export function getOrderStatusBadge(status) {
    const statusMap = {
        'pending': { class: 'status-pending', text: 'Pending' },
        'confirmed': { class: 'status-confirmed', text: 'Confirmed' },
        'processing': { class: 'status-processing', text: 'Processing' },
        'shipped': { class: 'status-shipped', text: 'Shipped' },
        'delivered': { class: 'status-delivered', text: 'Delivered' },
        'cancelled': { class: 'status-cancelled', text: 'Cancelled' },
        'completed': { class: 'status-completed', text: 'Completed' }
    };
    
    const statusInfo = statusMap[status?.toLowerCase()] || { class: 'status-pending', text: 'Pending' };
    return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

export function getPaymentMethodBadge(method) {
    const methodMap = {
        'cash': { class: 'payment-cash', text: 'Cash' },
        'paypal': { class: 'payment-paypal', text: 'PayPal' },
        'card': { class: 'payment-card', text: 'Card' },
        'eft': { class: 'payment-eft', text: 'EFT' }
    };
    
    const methodInfo = methodMap[method?.toLowerCase()] || { class: 'payment-cash', text: 'Cash' };
    return `<span class="payment-badge ${methodInfo.class}">${methodInfo.text}</span>`;
}

export function calculateOrderTotal(order) {
    if (order.total) return order.total;
    
    // Calculate total from items if not provided
    return (order.items || []).reduce((sum, item) => {
        return sum + ((item.price || 0) * (item.quantity || 0));
    }, 0);
}

export function calculateTotalItems(order) {
    return (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export function updateSummaryCards(orders) {
    const { totalOrdersEl, totalRevenueEl, totalProductsSoldEl, totalCustomersEl } = domElements;

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
    );
    const totalProductsSold = orders.reduce((sum, order) => {
        return (
            sum +
            (order.items || []).reduce(
                (itemSum, item) => itemSum + (item.quantity || 0),
                0
            )
        );
    }, 0);
    
    // Count unique customers who have placed orders
    const customerIds = new Set();
    orders.forEach(order => {
        if (order.customerId) customerIds.add(order.customerId);
        if (order.userId) customerIds.add(order.userId);
    });
    const totalCustomers = customerIds.size;

    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders.toLocaleString();
    if (totalRevenueEl) totalRevenueEl.textContent = `R${totalRevenue.toFixed(2)}`;
    if (totalProductsSoldEl) totalProductsSoldEl.textContent = totalProductsSold.toLocaleString();
    if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers.toLocaleString();
}

export function showError(message) {
    // Remove any existing error messages first
    document.querySelectorAll('.error-message').forEach(msg => msg.remove());
    
    const errorDiv = document.createElement("div");
    errorDiv.className = "error-message";
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    document.body.appendChild(errorDiv);

    // Add styles if not already present
    if (!document.querySelector('#error-styles')) {
        const style = document.createElement('style');
        style.id = 'error-styles';
        style.textContent = `
            .error-message {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #dc3545;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
                z-index: 10001;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                max-width: 400px;
                animation: slideInRight 0.3s ease;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        errorDiv.style.opacity = "0";
        errorDiv.style.transition = "opacity 0.5s";
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 500);
    }, 5000);
}

export function showSuccess(message) {
    // Remove any existing success messages first
    document.querySelectorAll('.success-message').forEach(msg => msg.remove());
    
    const successDiv = document.createElement("div");
    successDiv.className = "success-message";
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    document.body.appendChild(successDiv);

    // Add styles if not already present
    if (!document.querySelector('#success-styles')) {
        const style = document.createElement('style');
        style.id = 'success-styles';
        style.textContent = `
            .success-message {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                z-index: 10001;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                max-width: 400px;
                animation: slideInRight 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        successDiv.style.opacity = "0";
        successDiv.style.transition = "opacity 0.5s";
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 500);
    }, 3000);
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}

export function getDateRangeDisplay(startDate, endDate) {
    if (!startDate || !endDate) return 'No date range selected';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (!isValidDate(start) || !isValidDate(end)) {
        return 'Invalid date range';
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

export function generateRandomId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

export function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
}

export function sortBy(array, key, descending = false) {
    return array.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (descending) {
            return bVal - aVal;
        }
        return aVal - bVal;
    });
}

export function filterArray(array, filters) {
    return array.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
            if (value === null || value === undefined || value === '') return true;
            
            const itemValue = item[key];
            if (typeof value === 'string') {
                return itemValue?.toString().toLowerCase().includes(value.toLowerCase());
            }
            return itemValue === value;
        });
    });
}
