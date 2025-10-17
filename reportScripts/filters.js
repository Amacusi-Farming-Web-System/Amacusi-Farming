import { domElements } from './main.js';
import { fetchProducts } from './data-fetchers.js';
import { showError, escapeHtml } from './utils.js';

export function initFilters() {
    toggleCustomDateRange();
}

export function toggleCustomDateRange() {
    const { customDateRange } = domElements;
    if (!customDateRange) return;
    customDateRange.style.display = "block";
}

export function toggleAdditionalFilters() {
    const { categoryFilter, customerTypeFilter, paymentStatusFilter, reportTypeSelect } = domElements;
    if (!categoryFilter || !customerTypeFilter || !paymentStatusFilter) return;
    
    const reportType = reportTypeSelect.value;

    categoryFilter.style.display = "none";
    customerTypeFilter.style.display = "none";
    paymentStatusFilter.style.display = "none";

    if (reportType === "sales") {
        categoryFilter.style.display = "block";
        customerTypeFilter.style.display = "block";
    } else if (reportType === "payment") {
        paymentStatusFilter.style.display = "block";
    } else if (reportType === "product") {
        categoryFilter.style.display = "block";
    }
}

export async function populateCategoryFilter() {
    try {
        const { productCategorySelect } = domElements;
        const products = await fetchProducts();
        
        if (!productCategorySelect) return;

        // Clear existing options except "All Categories"
        while (productCategorySelect.options.length > 1) {
            productCategorySelect.remove(1);
        }

        // Get unique categories
        const categories = [
            ...new Set(products.map((p) => p.category).filter(Boolean)),
        ];

        // Add category options
        categories.forEach((category) => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            productCategorySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating category filter:", error);
        showError("Failed to load product categories");
    }
}

export function applyFilters(orders, products, reportType) {
    let filteredOrders = [...orders];

    switch (reportType) {
        case "sales":
            filteredOrders = filterSalesOrders(filteredOrders, products);
            break;
        case "payment":
            filteredOrders = filterPaymentOrders(filteredOrders);
            break;
        case "product":
            filteredOrders = filterProductOrders(filteredOrders, products);
            break;
    }

    return filteredOrders;
}

function filterSalesOrders(orders, products) {
    const { productCategorySelect, customerTypeSelect } = domElements;
    const categoryFilterValue = productCategorySelect?.value || "all";
    const customerTypeValue = customerTypeSelect?.value || "all";

    let filteredOrders = [...orders];

    // Filter by customer type
    if (customerTypeValue !== "all") {
        filteredOrders = filteredOrders.filter((order) => {
            const totalItems = (order.items || []).reduce(
                (sum, item) => sum + (item.quantity || 0),
                0
            );
            const isBulk = totalItems > 10;

            if (customerTypeValue === "bulk") return isBulk;
            if (customerTypeValue === "regular") return !isBulk;
            return true;
        });
    }

    // Filter by category
    if (categoryFilterValue !== "all") {
        filteredOrders = filteredOrders.filter((order) => {
            return (order.items || []).some((item) => {
                const product = products.find((p) => p.id === item.id);
                return product?.category === categoryFilterValue;
            });
        });
    }

    return filteredOrders;
}

function filterPaymentOrders(orders) {
    const { paymentStatusSelect } = domElements;
    const paymentStatusValue = paymentStatusSelect?.value || "all";
    if (paymentStatusValue === "all") return orders;

    return orders.filter((order) => {
        if (paymentStatusValue === "paid")
            return order.paymentStatus === window.PAYMENT_STATUS.PAID;
        if (paymentStatusValue === "pending")
            return order.paymentStatus === window.PAYMENT_STATUS.PENDING;
        if (paymentStatusValue === "failed")
            return order.paymentStatus === window.PAYMENT_STATUS.FAILED;
        return true;
    });
}

function filterProductOrders(orders, products) {
    const { productCategorySelect } = domElements;
    const categoryFilterValue = productCategorySelect?.value || "all";
    if (categoryFilterValue === "all") return orders;

    return orders.filter((order) => {
        return (order.items || []).some((item) => {
            const product = products.find((p) => p.id === item.id);
            return product?.category === categoryFilterValue;
        });
    });
}
