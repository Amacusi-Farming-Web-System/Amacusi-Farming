import { domElements, currentOrders, currentProducts, currentCustomers } from './main.js';
import { showEnhancedChartPopup } from './popups.js';
import { formatChartDate, formatMonthYear, escapeHtml, showError } from './utils.js';

export function initDrilldowns() {
    // Make summary cards clickable
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach((card, index) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            switch(index) {
                case 0: // Total Orders
                    showOrderDrilldown();
                    break;
                case 1: // Total Revenue
                    showRevenueDrilldown();
                    break;
                case 2: // Products Sold
                    showProductsDrilldown();
                    break;
                case 3: // Customers
                    showNewCustomersDrilldown();
                    break;
            }
        });
    });

    // Ensure all charts are clickable
    const chartCanvases = document.querySelectorAll('.chart-container canvas');
    chartCanvases.forEach(canvas => {
        canvas.style.cursor = 'pointer';
    });
}

// Enhanced Drill-down Functions with Full-Page Modals

// Sales Trend Drill-down
export function showSalesTrendDrilldown(date, dayData, fullData) {
    const ordersForDate = currentOrders.filter(order => {
        const orderDate = order.createdAt.toISOString().split('T')[0];
        return orderDate === date;
    });

    // Calculate enhanced metrics
    const dailyRevenue = ordersForDate.reduce((sum, order) => sum + (order.total || 0), 0);
    const orderCount = ordersForDate.length;
    const avgOrderValue = orderCount > 0 ? dailyRevenue / orderCount : 0;
    
    // Find previous period for comparison
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];
    const prevDayData = fullData.find(item => item.date === prevDateStr);
    
    // Calculate trends
    const revenueTrend = prevDayData ? ((dailyRevenue - prevDayData.total) / prevDayData.total) * 100 : 0;
    const orderTrend = prevDayData ? ((orderCount - prevDayData.count) / prevDayData.count) * 100 : 0;

    // Get unique customers for the day
    const dailyCustomers = [...new Set(ordersForDate.map(order => order.userId || order.customerId))].filter(Boolean);

    showEnhancedChartPopup(
        `Daily Sales Analysis - ${formatChartDate(date)}`,
        {
            date: date,
            dailyRevenue,
            orderCount,
            avgOrderValue,
            revenueTrend,
            orderTrend,
            orders: ordersForDate,
            customers: dailyCustomers,
            previousDay: prevDayData,
            type: 'salesTrend'
        },
        fullData,
        'salesTrend'
    );
}

// Category Drill-down
export function showCategoryDrilldown(categoryName, segmentData, fullData) {
    const categoryProducts = calculateCategoryProductSales(currentOrders, currentProducts, categoryName);
    const categoryOrders = currentOrders.filter(order => 
        order.items?.some(item => {
            const product = currentProducts.find(p => p.id === item.id);
            return product?.category === categoryName.toLowerCase();
        })
    );
    
    // Calculate enhanced metrics
    const totalCategoryRevenue = categoryOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenuePercentage = totalRevenue > 0 ? (totalCategoryRevenue / totalRevenue) * 100 : 0;
    
    // Calculate profitability metrics
    const estimatedProfit = totalCategoryRevenue * 0.4;
    const avgOrderValue = categoryOrders.length > 0 ? totalCategoryRevenue / categoryOrders.length : 0;

    // Get unique customers for this category
    const categoryCustomers = [...new Set(categoryOrders.map(order => order.userId || order.customerId))].filter(Boolean);

    showEnhancedChartPopup(
        `Category Performance Analysis - ${categoryName}`,
        {
            category: categoryName,
            totalRevenue: totalCategoryRevenue,
            revenuePercentage,
            estimatedProfit,
            avgOrderValue,
            productCount: categoryProducts.length,
            orderCount: categoryOrders.length,
            customerCount: categoryCustomers.length,
            products: categoryProducts,
            orders: categoryOrders,
            customers: categoryCustomers,
            type: 'category'
        },
        fullData,
        'category'
    );
}

// Customer Type Drill-down
// Customer Type Drill-down
export function showCustomerTypeDrilldown(customerType, segmentData, fullData) {
    const customersInSegment = getCustomersByType(customerType);
    const segmentOrders = currentOrders.filter(order => {
        const customerId = order.customerId || order.userId;
        // Only include orders from customers in this segment
        return customersInSegment.some(customer => customer.id === customerId);
    });
    
    // Calculate enhanced metrics
    const segmentRevenue = segmentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenuePercentage = totalRevenue > 0 ? (segmentRevenue / totalRevenue) * 100 : 0;
    const avgOrderValue = segmentOrders.length > 0 ? segmentRevenue / segmentOrders.length : 0;

    console.log('Customer Type Drilldown:', {
        customerType,
        customersInSegment: customersInSegment.length,
        segmentOrders: segmentOrders.length,
        segmentRevenue,
        customers: customersInSegment.map(c => ({
            id: c.id,
            name: c.name || c.email,
            orders: currentOrders.filter(o => o.customerId === c.id || o.userId === c.id).length
        }))
    });

    showEnhancedChartPopup(
        `Customer Segment Analysis - ${customerType === 'bulk' ? 'Bulk Buyers' : 'Regular Customers'}`,
        {
            type: customerType,
            customerCount: customersInSegment.length,
            orderCount: segmentOrders.length,
            totalRevenue: segmentRevenue,
            revenuePercentage,
            avgOrderValue,
            customers: customersInSegment,
            orders: segmentOrders,
            definition: customerType === 'bulk' ? 
                'Customers with average items per order > 10' : 
                'Customers with average items per order ≤ 10'
        },
        fullData,
        'customerType'
    );
}

// Payment Method Drill-down
export function showPaymentMethodDrilldown(method, segmentData, fullData) {
    const ordersWithMethod = currentOrders.filter(order => 
        (order.paymentMethod || 'cash') === method
    );
    
    // Calculate enhanced metrics
    const successRate = segmentData.count > 0 ? (segmentData.success / segmentData.count) * 100 : 0;
    const avgTransaction = segmentData.count > 0 ? segmentData.total / segmentData.count : 0;
    const totalRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenuePercentage = totalRevenue > 0 ? (segmentData.total / totalRevenue) * 100 : 0;

    // Get customers using this payment method
    const paymentCustomers = [...new Set(ordersWithMethod.map(order => order.userId || order.customerId))].filter(Boolean);

    showEnhancedChartPopup(
        `Payment Method Analysis - ${method === 'paypal' ? 'PayPal' : 'Cash on Delivery'}`,
        {
            method: method,
            transactionCount: segmentData.count,
            successCount: segmentData.success,
            successRate,
            totalRevenue: segmentData.total,
            revenuePercentage,
            avgTransaction,
            orders: ordersWithMethod,
            customers: paymentCustomers,
            type: 'paymentMethod'
        },
        fullData,
        'paymentMethod'
    );
}

// Payment Status Drill-down
// Payment Status Drill-down
export function showPaymentStatusDrilldown(status, fullData) {
    const ordersWithStatus = currentOrders.filter(order => {
        // Check all possible status fields
        const orderStatus = (order.orderStatus || '').toLowerCase();
        const generalStatus = (order.status || '').toLowerCase();
        const paymentStatus = (order.paymentStatus || '').toLowerCase();
        
        // Map statuses based on your order management system
        const statusMap = {
            'success': ['delivered', 'completed', 'paid', 'success', 'successful'],
            'failed': ['cancelled', 'failed', 'declined', 'rejected'],
            'pending': ['pending', 'processing', 'confirmed', 'awaiting payment', 'preparing']
        };

        // Check all status fields
        const statusesToCheck = [orderStatus, generalStatus, paymentStatus];
        
        return statusesToCheck.some(statusValue => 
            statusValue && statusMap[status].includes(statusValue)
        );
    });
    
    console.log('Filtered orders for status:', status, {
        totalOrders: currentOrders.length,
        filteredOrders: ordersWithStatus.length,
        sampleOrders: ordersWithStatus.slice(0, 3).map(o => ({
            id: o.id,
            orderStatus: o.orderStatus,
            status: o.status,
            paymentStatus: o.paymentStatus,
            total: o.total
        }))
    });

    // Get unique customers with this payment status
    const customerIds = new Set();
    ordersWithStatus.forEach(order => {
        const customerId = order.customerId || order.userId;
        if (customerId) customerIds.add(customerId);
    });
    
    const statusCustomers = Array.from(customerIds).map(customerId => 
        currentCustomers.find(c => c.id === customerId)
    ).filter(Boolean);

    console.log('Payment Status Customers:', {
        status,
        ordersCount: ordersWithStatus.length,
        customersCount: statusCustomers.length,
        customers: statusCustomers.map(c => ({
            id: c.id,
            name: c.name || c.email,
            email: c.email
        }))
    });

    showEnhancedChartPopup(
        `${status.charAt(0).toUpperCase() + status.slice(1)} Payments - Customer Details`,
        {
            status: status,
            count: ordersWithStatus.length,
            orders: ordersWithStatus,
            customers: statusCustomers,
            type: 'paymentStatus'
        },
        fullData,
        'paymentStatus'
    );
}

// Payment Time Drill-down
export function showPaymentTimeDrilldown(timeSlot, count, fullData) {
    const ordersInTimeSlot = currentOrders.filter(order => {
        const hour = order.createdAt.getHours();
        let slot;
        if (hour >= 6 && hour < 12) slot = "Morning (6am-12pm)";
        else if (hour >= 12 && hour < 18) slot = "Afternoon (12pm-6pm)";
        else if (hour >= 18 && hour < 24) slot = "Evening (6pm-12am)";
        else slot = "Night (12am-6am)";
        return slot === timeSlot;
    });
    
    const totalRevenue = ordersInTimeSlot.reduce((sum, order) => sum + (order.total || 0), 0);
    const avgOrderValue = count > 0 ? totalRevenue / count : 0;

    // Get customers ordering in this time slot
    const timeSlotCustomers = [...new Set(ordersInTimeSlot.map(order => order.userId || order.customerId))].filter(Boolean);

    showEnhancedChartPopup(
        `Temporal Analysis - ${timeSlot}`,
        {
            timeSlot: timeSlot,
            orderCount: count,
            totalRevenue,
            avgOrderValue,
            orders: ordersInTimeSlot,
            customers: timeSlotCustomers,
            type: 'paymentTime'
        },
        fullData,
        'paymentTime'
    );
}

// Product Performance Drill-down
export function showProductDrilldown(product, fullData) {
    const productOrders = currentOrders.filter(order => 
        order.items?.some(item => item.id === product.id)
    );
    
    // Calculate enhanced metrics
    const conversionRate = product.views > 0 ? (product.sold / product.views) * 100 : 0;
    const avgPrice = product.sold > 0 ? product.revenue / product.sold : 0;
    const stockCoverage = product.stock > 0 ? (product.sold / 30) / product.stock * 100 : 0;

    // Get customers who purchased this product
    const productCustomers = [...new Set(productOrders.map(order => order.userId || order.customerId))].filter(Boolean);

    showEnhancedChartPopup(
        `Product Performance Analysis - ${product.name}`,
        {
            product: product.name,
            category: product.category,
            unitsSold: product.sold,
            totalRevenue: product.revenue,
            conversionRate,
            stock: product.stock,
            stockCoverage,
            avgPrice,
            orders: productOrders,
            customers: productCustomers,
            type: 'product'
        },
        fullData,
        'product'
    );
}

// Customer Details Drill-down
export function showCustomerDrilldown(customer, fullData) {
    const customerOrders = currentOrders.filter(order => 
        (order.customerId === customer.id || order.userId === customer.id)
    );
    
    // Calculate enhanced metrics
    const daysSinceLastPurchase = customer.lastPurchase ? 
        Math.floor((new Date() - customer.lastPurchase) / (1000 * 60 * 60 * 24)) : null;
    const purchaseFrequency = customer.firstPurchase && customer.lastPurchase ?
        customer.orders / ((customer.lastPurchase - customer.firstPurchase) / (1000 * 60 * 60 * 24 * 30)) : 0;

    showEnhancedChartPopup(
        `Customer Profile - ${customer.name}`,
        {
            customer: customer.name,
            email: customer.email,
            totalOrders: customer.orders,
            totalSpent: customer.totalSpent,
            avgOrderValue: customer.avgOrder,
            firstPurchase: customer.firstPurchase,
            lastPurchase: customer.lastPurchase,
            daysSinceLastPurchase,
            purchaseFrequency,
            orders: customerOrders,
            type: 'customer'
        },
        fullData,
        'customer'
    );
}

// Customer Acquisition Drill-down
export function showCustomerAcquisitionDrilldown(monthData, fullData) {
    const [year, month] = monthData.month.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const newCustomers = currentCustomers.filter(customer => {
        const signupDate = customer.createdAt;
        return signupDate >= startDate && signupDate <= endDate;
    });
    
    // Calculate enhanced metrics
    const customersWithOrders = newCustomers.filter(customer => {
        const customerOrders = currentOrders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        return customerOrders.length > 0;
    });
    
    const activationRate = newCustomers.length > 0 ? 
        (customersWithOrders.length / newCustomers.length) * 100 : 0;

    showEnhancedChartPopup(
        `Customer Acquisition Analysis - ${formatMonthYear(monthData.month)}`,
        {
            period: monthData.month,
            newCustomers: monthData.count,
            activatedCustomers: customersWithOrders.length,
            activationRate,
            customers: newCustomers,
            activatedCustomersList: customersWithOrders,
            dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
            type: 'customerAcquisition'
        },
        fullData,
        'customerAcquisition'
    );
}

// Customer Value Segmentation Drill-down
export function showCustomerSegmentDrilldown(segmentData, fullData) {
    const customersInSegment = getCustomersBySegment(segmentData.segment);
    
    showEnhancedChartPopup(
        `Customer Value Analysis - ${segmentData.segment}`,
        {
            segment: segmentData.segment,
            customerCount: segmentData.count,
            definition: segmentData.definition,
            spendingRange: segmentData.spendingRange,
            customers: customersInSegment,
            type: 'customerSegment'
        },
        fullData,
        'customerSegment'
    );
}

// Customer Category Spending Drill-down
export function showCustomerCategoryDrilldown(categoryData, fullData) {
    const categoryOrders = currentOrders.filter(order => 
        order.items?.some(item => {
            const product = currentProducts.find(p => p.id === item.id);
            return product?.category === categoryData.category.toLowerCase();
        })
    );
    
    // Calculate enhanced metrics
    const estimatedProfit = categoryData.totalSpent * 0.4;
    const customersPerOrder = categoryData.orderCount > 0 ? 
        categoryData.customerCount / categoryData.orderCount : 0;

    showEnhancedChartPopup(
        `Category Spending Analysis - ${categoryData.category}`,
        {
            category: categoryData.category,
            totalSpent: categoryData.totalSpent,
            estimatedProfit,
            customerCount: categoryData.customerCount,
            orderCount: categoryData.orderCount,
            customersPerOrder,
            avgOrderValue: categoryData.averageOrderValue,
            revenuePercentage: categoryData.percentageOfRevenue,
            orders: categoryOrders,
            type: 'customerCategory'
        },
        fullData,
        'customerCategory'
    );
}

// Summary Card Drill-downs (Enhanced)
export function showOrderDrilldown() {
    const { totalOrdersEl, startDateInput, endDateInput } = domElements;
    const totalOrders = parseInt(totalOrdersEl.textContent) || 0;
    
    // Calculate order metrics
    const avgDailyOrders = calculateAverageDailyOrders(currentOrders);
    const orderTrend = calculateOrderTrend(currentOrders);
    const peakOrderDay = findPeakOrderDay(currentOrders);

    // Get unique customers
    const uniqueCustomers = [...new Set(currentOrders.map(order => order.userId || order.customerId))].filter(Boolean);

    showEnhancedChartPopup(
        'Order Performance Analysis',
        {
            totalOrders,
            avgDailyOrders,
            orderTrend,
            peakOrderDay,
            dateRange: `${startDateInput.value} to ${endDateInput.value}`,
            description: 'Comprehensive order performance and trend analysis',
            orders: currentOrders,
            customers: uniqueCustomers,
            type: 'orderSummary'
        },
        null,
        'orderSummary'
    );
}

export function showRevenueDrilldown() {
    const { totalRevenueEl, startDateInput, endDateInput } = domElements;
    const totalRevenue = parseFloat(totalRevenueEl.textContent.replace('R', '').replace(',', '')) || 0;
    
    // Calculate revenue metrics
    const avgDailyRevenue = calculateAverageDailyRevenue(currentOrders);
    const revenueTrend = calculateRevenueTrend(currentOrders);
    const revenueByCategory = calculateRevenueByCategory(currentOrders, currentProducts);

    // Get unique customers
    const uniqueCustomers = [...new Set(currentOrders.map(order => order.userId || order.customerId))].filter(Boolean);

    showEnhancedChartPopup(
        'Revenue Performance Analysis',
        {
            totalRevenue,
            avgDailyRevenue,
            revenueTrend,
            revenueByCategory,
            dateRange: `${startDateInput.value} to ${endDateInput.value}`,
            description: 'Revenue breakdown and performance trends',
            orders: currentOrders,
            customers: uniqueCustomers,
            type: 'revenueSummary'
        },
        null,
        'revenueSummary'
    );
}

export function showProductsDrilldown() {
    const { totalProductsSoldEl, startDateInput, endDateInput } = domElements;
    const totalProducts = parseInt(totalProductsSoldEl.textContent) || 0;
    
    // Calculate product metrics
    const avgProductsPerOrder = calculateAvgProductsPerOrder(currentOrders);
    const topSellingProducts = calculateTopProducts(currentOrders, currentProducts, 5);
    const inventoryTurnover = calculateInventoryTurnover(currentProducts, currentOrders);

    showEnhancedChartPopup(
        'Product Sales Analysis',
        {
            totalProducts,
            avgProductsPerOrder,
            topSellingProducts,
            inventoryTurnover,
            dateRange: `${startDateInput.value} to ${endDateInput.value}`,
            description: 'Product sales performance and inventory analysis',
            orders: currentOrders,
            products: currentProducts,
            type: 'productsSummary'
        },
        null,
        'productsSummary'
    );
}

// New Customers Drill-down (Table View)
export async function showNewCustomersDrilldown() {
    try {
        const { startDateInput, endDateInput } = domElements;
        const startDate = startDateInput.value ? new Date(startDateInput.value) : new Date();
        const endDate = endDateInput.value ? new Date(endDateInput.value) : new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const newCustomers = findNewCustomers(currentCustomers, currentOrders, startDate, endDate);
        
        showEnhancedChartPopup(
            'New Customer Analysis',
            {
                newCustomers: newCustomers,
                dateRange: `${startDateInput.value} to ${endDateInput.value}`,
                totalNewCustomers: newCustomers.length,
                type: 'newCustomers'
            },
            null,
            'newCustomers'
        );
        
    } catch (error) {
        console.error('Error loading new customers:', error);
        showError('Failed to load new customer details');
    }
}

// Helper functions for drill-downs
export function getCustomersByType(customerType) {
    console.log('getCustomersByType called with:', customerType);
    console.log('Total customers:', currentCustomers.length);
    console.log('Total orders:', currentOrders.length);
    
    const result = currentCustomers.filter(customer => {
        const customerOrders = currentOrders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        
        console.log(`Customer ${customer.id} (${customer.email}): ${customerOrders.length} orders`);
        
        if (customerOrders.length === 0) {
            console.log(`- Excluding: No orders`);
            return false;
        }
        
        const totalItems = customerOrders.reduce((sum, order) => 
            sum + (order.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0
        );
        
        const avgItemsPerOrder = totalItems / customerOrders.length;
        const isBulk = avgItemsPerOrder > 10;
        
        console.log(`- Total items: ${totalItems}, Avg per order: ${avgItemsPerOrder}, Is bulk: ${isBulk}`);
        
        const matches = customerType === 'bulk' ? isBulk : !isBulk;
        console.log(`- Matches ${customerType}: ${matches}`);
        
        return matches;
    });
    
    console.log(`Found ${result.length} customers for type ${customerType}`);
    return result;
}

export function getCustomersBySegment(segment) {
    return currentCustomers.filter(customer => {
        const customerOrders = currentOrders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        
        const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        switch(segment) {
            case "High Value": return totalSpent > 1000;
            case "Medium Value": return totalSpent > 500 && totalSpent <= 1000;
            case "Low Value": return totalSpent <= 500 && totalSpent > 0;
            case "New/Inactive": return totalSpent === 0;
            default: return false;
        }
    });
}

export function calculateCategoryProductSales(orders, products, categoryName) {
    const productSales = {};
    
    orders.forEach(order => {
        order.items?.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product && product.category === categoryName.toLowerCase()) {
                if (!productSales[product.id]) {
                    productSales[product.id] = {
                        id: product.id,
                        name: product.name,
                        category: product.category,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[product.id].quantity += item.quantity || 0;
                productSales[product.id].revenue += (item.price || 0) * (item.quantity || 0);
            }
        });
    });
    
    const categoryProducts = Object.values(productSales);
    const totalCategoryRevenue = categoryProducts.reduce((sum, product) => sum + product.revenue, 0);
    
    return categoryProducts.map(product => ({
        ...product,
        percentage: totalCategoryRevenue > 0 ? (product.revenue / totalCategoryRevenue) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);
}

// Enhanced calculation helpers
function calculateAverageDailyOrders(orders) {
    if (orders.length === 0) return 0;
    
    const dates = [...new Set(orders.map(order => order.createdAt.toISOString().split('T')[0]))];
    return (orders.length / dates.length).toFixed(1);
}

function calculateOrderTrend(orders) {
    if (orders.length < 2) return 0;
    
    const sortedOrders = orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const firstHalf = sortedOrders.slice(0, Math.floor(orders.length / 2));
    const secondHalf = sortedOrders.slice(Math.floor(orders.length / 2));
    
    const firstHalfAvg = firstHalf.length;
    const secondHalfAvg = secondHalf.length;
    
    return firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
}

function findPeakOrderDay(orders) {
    if (orders.length === 0) return 'No data';
    
    const dayCounts = {};
    orders.forEach(order => {
        const day = order.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    
    return Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0];
}

function calculateAverageDailyRevenue(orders) {
    if (orders.length === 0) return 0;
    
    const dates = [...new Set(orders.map(order => order.createdAt.toISOString().split('T')[0]))];
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    return totalRevenue / dates.length;
}

function calculateRevenueTrend(orders) {
    if (orders.length < 2) return 0;
    
    const sortedOrders = orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const firstHalf = sortedOrders.slice(0, Math.floor(orders.length / 2));
    const secondHalf = sortedOrders.slice(Math.floor(orders.length / 2));
    
    const firstHalfRevenue = firstHalf.reduce((sum, order) => sum + (order.total || 0), 0);
    const secondHalfRevenue = secondHalf.reduce((sum, order) => sum + (order.total || 0), 0);
    
    return firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;
}

function calculateRevenueByCategory(orders, products) {
    const categoryRevenue = {};
    
    orders.forEach(order => {
        order.items?.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product?.category) {
                const category = product.category.charAt(0).toUpperCase() + product.category.slice(1);
                const itemTotal = (item.price || 0) * (item.quantity || 0);
                categoryRevenue[category] = (categoryRevenue[category] || 0) + itemTotal;
            }
        });
    });
    
    return categoryRevenue;
}

function calculateAvgProductsPerOrder(orders) {
    if (orders.length === 0) return 0;
    
    const totalProducts = orders.reduce((sum, order) => 
        sum + (order.items || []).reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 0
    );
    
    return (totalProducts / orders.length).toFixed(1);
}

function calculateInventoryTurnover(products, orders) {
    const totalCost = products.reduce((sum, product) => sum + (product.cost || 0) * (product.stock || 0), 0);
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    return totalCost > 0 ? (totalRevenue / totalCost).toFixed(2) : 0;
}

// Existing functions for table-based drill-downs
export function findNewCustomers(customers, orders, startDate, endDate) {
    const customerOrders = {};
    
    // Group orders by customer
    orders.forEach(order => {
        const customerId = order.customerId || order.userId;
        if (customerId) {
            if (!customerOrders[customerId]) {
                customerOrders[customerId] = [];
            }
            customerOrders[customerId].push(order);
        }
    });

    // Find customers who signed up or made first purchase in date range
    return customers.filter(customer => {
        const customerId = customer.id;
        const customerOrderHistory = customerOrders[customerId] || [];
        
        // Check if customer signed up in date range
        const signupDate = customer.createdAt;
        const signedUpInRange = signupDate >= startDate && signupDate <= endDate;
        
        // Check if first order is in date range
        const firstOrder = customerOrderHistory.sort((a, b) => a.createdAt - b.createdAt)[0];
        const firstOrderInRange = firstOrder && firstOrder.createdAt >= startDate && firstOrder.createdAt <= endDate;
        
        return signedUpInRange || firstOrderInRange;
    }).map(customer => {
        const customerId = customer.id;
        const customerOrderHistory = customerOrders[customerId] || [];
        const totalOrders = customerOrderHistory.length;
        const totalSpent = customerOrderHistory.reduce((sum, order) => sum + (order.total || 0), 0);
        const firstOrder = customerOrderHistory.sort((a, b) => a.createdAt - b.createdAt)[0];
        
        return {
            id: customer.id,
            name: customer.name || customer.displayName || customer.email?.split('@')[0] || 'Unknown',
            email: customer.email || 'No email',
            signupDate: customer.createdAt,
            firstOrderDate: firstOrder?.createdAt || null,
            totalOrders: totalOrders,
            totalSpent: totalSpent,
            status: totalOrders > 0 ? 'Active' : 'Registered'
        };
    });
}

export function viewCustomerDetails(customerId) {
    const customer = currentCustomers.find(c => c.id === customerId);
    if (customer) {
        const customerOrders = currentOrders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        
        showEnhancedChartPopup(
            `Customer Profile - ${customer.name || 'Unknown Customer'}`,
            {
                name: customer.name || 'Unknown',
                email: customer.email || 'No email',
                signupDate: customer.createdAt ? customer.createdAt.toLocaleDateString() : 'Unknown',
                lastLogin: customer.lastLogin ? customer.lastLogin.toLocaleDateString() : 'Never',
                totalOrders: customerOrders.length,
                totalSpent: customerOrders.reduce((sum, order) => sum + (order.total || 0), 0),
                orders: customerOrders,
                type: 'customerDetails'
            },
            null,
            'customerDetails'
        );
    } else {
        showError('Customer details not found');
    }
}

// Make functions available globally for HTML onclick handlers
window.viewCustomerDetails = viewCustomerDetails;
window.showCustomerSegmentDrilldown = showCustomerSegmentDrilldown;
window.showSalesTrendDrilldown = showSalesTrendDrilldown;
window.showCategoryDrilldown = showCategoryDrilldown;
window.showCustomerTypeDrilldown = showCustomerTypeDrilldown;
window.showPaymentMethodDrilldown = showPaymentMethodDrilldown;
window.showPaymentStatusDrilldown = showPaymentStatusDrilldown;
window.showPaymentTimeDrilldown = showPaymentTimeDrilldown;
window.showProductDrilldown = showProductDrilldown;
window.showCustomerDrilldown = showCustomerDrilldown;
window.showCustomerAcquisitionDrilldown = showCustomerAcquisitionDrilldown;
window.showCustomerCategoryDrilldown = showCustomerCategoryDrilldown;
