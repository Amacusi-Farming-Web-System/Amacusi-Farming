import { domElements, currentOrders, currentProducts, currentCustomers } from './main.js';
import { 
    calculateSalesTrend, 
    calculateSalesByCategory, 
    calculateCustomerType, 
    calculateTopProducts,
    calculatePaymentMethods,
    calculatePaymentSuccess,
    calculatePaymentByTime,
    calculateProductPerformance,
    calculateCustomerData,
    calculateCustomerAcquisition,
    calculateCustomerSegments,
    calculateCustomerCategorySpending
} from './calculations.js';
import { escapeHtml, formatChartDate, formatMonthYear, calculatePercentage } from './utils.js';
import { showSalesTrendDrilldown, showCategoryDrilldown, showCustomerTypeDrilldown } from './drilldowns.js';

// Chart instances
export let salesTrendChart, salesByCategoryChart, customerTypeChart;
export let paymentMethodChart, paymentSuccessChart, paymentByTimeChart;
export let productPerformanceChart;
export let customerValueChart, customerAcquisitionChart;
export let customerValueSegmentationChart, customerCategorySpendingChart;

export function initCharts() {
    // Chart initialization if needed
}

export function showReportSection(reportType) {
    const { 
        salesReportSection, 
        paymentReportSection, 
        productReportSection, 
        customerReportSection 
    } = domElements;

    const sections = [
        { id: "sales", element: salesReportSection },
        { id: "payment", element: paymentReportSection },
        { id: "product", element: productReportSection },
        { id: "customer", element: customerReportSection },
    ];

    sections.forEach((section) => {
        if (section.element) {
            section.element.style.display =
                section.id === reportType ? "block" : "none";
        }
    });
}

export async function generateReportByType(reportType, filteredOrders, products, customers) {
    switch (reportType) {
        case "sales":
            generateSalesReport(filteredOrders, products);
            break;
        case "payment":
            generatePaymentReport(filteredOrders);
            break;
        case "product":
            generateProductReport(filteredOrders, products);
            break;
        case "customer":
            generateCustomerReport(filteredOrders, customers, products);
            break;
    }

    showReportSection(reportType);
}

// Sales Report Functions
export function generateSalesReport(orders, products) {
    const salesTrendData = calculateSalesTrend(orders);
    renderSalesTrendChart(salesTrendData);

    const salesByCategory = calculateSalesByCategory(orders, products);
    renderSalesByCategoryChart(salesByCategory);

    const customerTypeData = calculateCustomerType(orders);
    renderCustomerTypeChart(customerTypeData);

    const topProducts = calculateTopProducts(orders, products);
    renderTopProductsTable(topProducts);
}

// Payment Report Functions
export function generatePaymentReport(orders) {
    const paymentMethods = calculatePaymentMethods(orders);
    renderPaymentMethodChart(paymentMethods);

    const paymentSuccess = calculatePaymentSuccess(orders);
    renderPaymentSuccessChart(paymentSuccess);

    const paymentByTime = calculatePaymentByTime(orders);
    renderPaymentByTimeChart(paymentByTime);

    renderPaymentDetailsTable(paymentMethods);
}

// Product Report Functions
export function generateProductReport(orders, products) {
    const productPerformance = calculateProductPerformance(orders, products);
    renderProductPerformanceChart(productPerformance);
    renderProductPerformanceTable(productPerformance);
}

// Customer Report Functions
export function generateCustomerReport(orders, customers, products) {
    const customerData = calculateCustomerData(orders, customers);
    renderCustomerValueChart(customerData);
    
    const customerAcquisition = calculateCustomerAcquisition(customers);
    renderCustomerAcquisitionChart(customerAcquisition);
    
    const customerSegments = calculateCustomerSegments(customerData);
    renderCustomerValueSegmentationChart(customerSegments);
    
    const categorySpending = calculateCustomerCategorySpending(orders, products);
    renderCustomerCategorySpendingChart(categorySpending);
    
    renderTopCustomersTable(customerData);
    renderCustomerCategorySpendingTable(categorySpending);
}

// Chart Rendering Functions
export function renderSalesTrendChart(data) {
    const ctx = document.getElementById("salesTrendChart");
    if (!ctx) return;

    if (salesTrendChart) {
        salesTrendChart.destroy();
    }

    salesTrendChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map((item) => formatChartDate(item.date)),
            datasets: [
                {
                    label: "Daily Revenue (R)",
                    data: data.map((item) => item.total),
                    backgroundColor: "rgba(76, 175, 80, 0.2)",
                    borderColor: "rgba(76, 175, 80, 1)",
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true,
                },
                {
                    label: "Number of Orders",
                    data: data.map((item) => item.count),
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 2,
                    tension: 0.1,
                    yAxisID: "y1",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Revenue (R)",
                    },
                    grid: {
                        drawBorder: false,
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: "right",
                    title: {
                        display: true,
                        text: "Number of Orders",
                    },
                    grid: {
                        drawOnChartArea: false,
                        drawBorder: false,
                    },
                },
                x: {
                    grid: {
                        drawBorder: false,
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            elements: {
                point: {
                    radius: 3,
                    hoverRadius: 6
                }
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const datasetIndex = element.datasetIndex;
                    const index = element.index;
                    const date = data[index].date;
                    
                    showSalesTrendDrilldown(date, data[index], data);
                }
            },
        },
    });
}

export function renderSalesByCategoryChart(data) {
    const ctx = document.getElementById("salesByCategoryChart");
    if (!ctx) return;

    if (salesByCategoryChart) {
        salesByCategoryChart.destroy();
    }

    salesByCategoryChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: data.map((item) => item.category),
            datasets: [
                {
                    label: "Revenue by Category (R)",
                    data: data.map((item) => item.total),
                    backgroundColor: [
                        "rgba(76, 175, 80, 0.7)",
                        "rgba(54, 162, 235, 0.7)",
                        "rgba(255, 206, 86, 0.7)",
                        "rgba(75, 192, 192, 0.7)",
                        "rgba(153, 102, 255, 0.7)",
                        "rgba(255, 159, 64, 0.7)",
                    ],
                    borderColor: [
                        "rgba(76, 175, 80, 1)",
                        "rgba(54, 162, 235, 1)",
                        "rgba(255, 206, 86, 1)",
                        "rgba(75, 192, 192, 1)",
                        "rgba(153, 102, 255, 1)",
                        "rgba(255, 159, 64, 1)",
                    ],
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: R${value.toFixed(2)} (${percentage}%)`;
                        },
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const segmentData = data[index];
                    showCategoryDrilldown(segmentData.category, segmentData, data);
                }
            },
        },
    });
}

export function renderCustomerTypeChart(data) {
    const ctx = document.getElementById("customerTypeChart");
    if (!ctx) return;

    if (customerTypeChart) {
        customerTypeChart.destroy();
    }

    const chartData = {
        bulk: data.bulk || { count: 0, total: 0 },
        regular: data.regular || { count: 0, total: 0 }
    };

    customerTypeChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Bulk Buyers", "Regular Customers"],
            datasets: [
                {
                    data: [chartData.bulk.count, chartData.regular.count],
                    backgroundColor: [
                        "rgba(54, 162, 235, 0.7)",
                        "rgba(76, 175, 80, 0.7)",
                    ],
                    borderColor: ["rgba(54, 162, 235, 1)", "rgba(76, 175, 80, 1)"],
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            const segmentData = chartData[context.label.toLowerCase().includes('bulk') ? 'bulk' : 'regular'];
                            const avgSpend = segmentData.count > 0 ? segmentData.total / segmentData.count : 0;
                            return [
                                `${label}: ${value} orders (${percentage}%)`,
                                `Total Revenue: R${segmentData.total.toFixed(2)}`,
                                `Avg. Order: R${avgSpend.toFixed(2)}`
                            ];
                        },
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const segmentType = index === 0 ? 'bulk' : 'regular';
                    const segmentData = chartData[segmentType];
                    showCustomerTypeDrilldown(segmentType, segmentData, chartData);
                }
            },
        },
    });
}

export function renderTopProductsTable(data) {
    const tbody = document.querySelector("#topProductsTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No products found</td></tr>';
        return;
    }

    data.forEach((product) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.category)}</td>
            <td>${(product.quantity || 0).toLocaleString()}</td>
            <td>R${(product.revenue || 0).toFixed(2)}</td>
            <td>${(product.percentage || 0).toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
    });
}

export function renderPaymentMethodChart(data) {
    const ctx = document.getElementById("paymentMethodChart");
    if (!ctx) return;

    if (paymentMethodChart) {
        paymentMethodChart.destroy();
    }

    // Filter out methods with zero counts for better visualization
    const displayData = data.filter(item => item.count > 0);
    
    if (displayData.length === 0) {
        ctx.parentElement.innerHTML = '<p class="text-center">No payment data available for the selected period</p>';
        return;
    }

    paymentMethodChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: displayData.map((item) => {
                if (item.method === 'paypal') return 'PayPal';
                if (item.method === 'cash') return 'Cash on Delivery';
                return item.method.toUpperCase();
            }),
            datasets: [
                {
                    data: displayData.map((item) => item.count),
                    backgroundColor: [
                        "rgba(76, 175, 80, 0.7)",
                        "rgba(54, 162, 235, 0.7)",
                    ],
                    borderColor: [
                        "rgba(76, 175, 80, 1)",
                        "rgba(54, 162, 235, 1)",
                    ],
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            const methodData = displayData[context.dataIndex];
                            const successRate = methodData.count > 0 ? (methodData.success / methodData.count) * 100 : 0;
                            return [
                                `${label}: ${value} transactions (${percentage}%)`,
                                `Success Rate: ${successRate.toFixed(1)}%`,
                                `Total Revenue: R${methodData.total.toFixed(2)}`
                            ];
                        },
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const segmentData = displayData[index];
                    // Import and call payment method drilldown
                    import('./drilldowns.js').then(module => {
                        module.showPaymentMethodDrilldown(segmentData.method, segmentData, displayData);
                    });
                }
            },
        },
    });
}

export function renderPaymentSuccessChart(data) {
    const ctx = document.getElementById("paymentSuccessChart");
    if (!ctx) return;

    if (paymentSuccessChart) {
        paymentSuccessChart.destroy();
    }

    paymentSuccessChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Successful", "Failed", "Pending"],
            datasets: [
                {
                    data: [data.success, data.failed, data.pending],
                    backgroundColor: [
                        "rgba(76, 175, 80, 0.7)",
                        "rgba(255, 99, 132, 0.7)",
                        "rgba(255, 206, 86, 0.7)",
                    ],
                    borderColor: [
                        "rgba(76, 175, 80, 1)",
                        "rgba(255, 99, 132, 1)",
                        "rgba(255, 206, 86, 1)",
                    ],
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} payments (${percentage}%)`;
                        },
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const status = index === 0 ? 'success' : index === 1 ? 'failed' : 'pending';
                    // Import and call payment status drilldown
                    import('./drilldowns.js').then(module => {
                        module.showPaymentStatusDrilldown(status, data);
                    });
                }
            },
        },
    });
}

export function renderPaymentByTimeChart(data) {
    const ctx = document.getElementById("paymentByTimeChart");
    if (!ctx) return;

    if (paymentByTimeChart) {
        paymentByTimeChart.destroy();
    }

    const timeSlots = Object.keys(data);
    const timeSlotData = Object.values(data);

    paymentByTimeChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: timeSlots,
            datasets: [
                {
                    label: "Number of Payments",
                    data: timeSlotData.map(slot => slot.count),
                    backgroundColor: "rgba(54, 162, 235, 0.7)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Number of Payments",
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const timeSlot = timeSlots[index];
                    const slotData = timeSlotData[index];
                    // Import and call payment time drilldown
                    import('./drilldowns.js').then(module => {
                        module.showPaymentTimeDrilldown(timeSlot, slotData.count, data);
                    });
                }
            },
        },
    });
}

export function renderPaymentDetailsTable(data) {
    const tableBody = document.querySelector("#paymentDetailsTable tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    // Filter out methods with zero counts
    const displayData = data.filter(method => method.count > 0);

    if (displayData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No payment data found for the selected period</td></tr>';
        return;
    }

    displayData.forEach((method) => {
        const successRate = method.count > 0 ? (method.success / method.count) * 100 : 0;
        const avgAmount = method.count > 0 ? method.total / method.count : 0;

        // Format method name
        const methodName = method.method === 'paypal' ? 'PayPal' : 
                          method.method === 'cash' ? 'Cash on Delivery' : 
                          method.method.toUpperCase();

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${methodName}</td>
            <td>${method.count.toLocaleString()}</td>
            <td>${successRate.toFixed(1)}%</td>
            <td>R${avgAmount.toFixed(2)}</td>
            <td>R${method.total.toFixed(2)}</td>
        `;
        tableBody.appendChild(row);
    });
}

export function renderProductPerformanceChart(data) {
    const ctx = document.getElementById("productPerformanceChart");
    if (!ctx) return;

    if (productPerformanceChart) {
        productPerformanceChart.destroy();
    }

    // Get top 10 products for the chart
    const topProducts = data.slice(0, 10);

    productPerformanceChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: topProducts.map((p) =>
                p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name
            ),
            datasets: [
                {
                    label: "Revenue (R)",
                    data: topProducts.map((p) => p.revenue),
                    backgroundColor: "rgba(76, 175, 80, 0.7)",
                    borderColor: "rgba(76, 175, 80, 1)",
                    borderWidth: 1,
                },
                {
                    label: "Units Sold",
                    data: topProducts.map((p) => p.sold),
                    backgroundColor: "rgba(54, 162, 235, 0.7)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1,
                    type: "line",
                    yAxisID: "y1",
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Revenue (R)",
                    },
                },
                y1: {
                    beginAtZero: true,
                    position: "right",
                    title: {
                        display: true,
                        text: "Units Sold",
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const element = elements[0];
                    const datasetIndex = element.datasetIndex;
                    const index = element.index;
                    
                    // Only drill down on product bars (dataset 0), not the line
                    if (datasetIndex === 0) {
                        const product = topProducts[index];
                        // Import and call product drilldown
                        import('./drilldowns.js').then(module => {
                            module.showProductDrilldown(product, data);
                        });
                    }
                }
            },
        },
    });
}

export function renderProductPerformanceTable(data) {
    const tbody = document.querySelector("#productPerformanceTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No product data found</td></tr>';
        return;
    }

    data.forEach((product) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(product.name)}</td>
            <td>${escapeHtml(product.category)}</td>
            <td>${(product.sold || 0).toLocaleString()}</td>
            <td>R${(product.revenue || 0).toFixed(2)}</td>
            <td>${(product.stock || 0).toLocaleString()}</td>
            <td>${(product.conversion || 0).toFixed(2)}%</td>
        `;
        tbody.appendChild(row);
    });
}

export function renderCustomerValueChart(data) {
    const ctx = document.getElementById("customerValueChart");
    if (!ctx) return;

    if (customerValueChart) {
        customerValueChart.destroy();
    }

    // Get top 15 customers for the chart
    const topCustomers = data.slice(0, 15);

    customerValueChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: topCustomers.map(c => 
                c.name.length > 20 ? c.name.substring(0, 20) + "..." : c.name
            ),
            datasets: [
                {
                    label: "Total Spent (R)",
                    data: topCustomers.map(c => c.totalSpent),
                    backgroundColor: "rgba(153, 102, 255, 0.7)",
                    borderColor: "rgba(153, 102, 255, 1)",
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Total Spent (R)",
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const customer = topCustomers[index];
                    // Import and call customer drilldown
                    import('./drilldowns.js').then(module => {
                        module.showCustomerDrilldown(customer, data);
                    });
                }
            },
        },
    });
}

export function renderCustomerAcquisitionChart(data) {
    const ctx = document.getElementById("customerAcquisitionChart");
    if (!ctx) return;

    if (customerAcquisitionChart) {
        customerAcquisitionChart.destroy();
    }

    customerAcquisitionChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: data.map((item) => formatMonthYear(item.month)),
            datasets: [
                {
                    label: "New Customers",
                    data: data.map((item) => item.count),
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "New Customers",
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const monthData = data[index];
                    // Import and call customer acquisition drilldown
                    import('./drilldowns.js').then(module => {
                        module.showCustomerAcquisitionDrilldown(monthData, data);
                    });
                }
            },
        },
    });
}

export function renderCustomerValueSegmentationChart(data) {
    const ctx = document.getElementById("customerValueSegmentationChart");
    if (!ctx) return;

    if (customerValueSegmentationChart) {
        customerValueSegmentationChart.destroy();
    }

    customerValueSegmentationChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: data.map((item) => item.segment),
            datasets: [
                {
                    data: data.map((item) => item.count),
                    backgroundColor: [
                        "rgba(76, 175, 80, 0.7)",    // High Value - Green
                        "rgba(54, 162, 235, 0.7)",   // Medium Value - Blue
                        "rgba(255, 206, 86, 0.7)",   // Low Value - Yellow
                        "rgba(201, 203, 207, 0.7)",  // New/Inactive - Gray
                    ],
                    borderColor: [
                        "rgba(76, 175, 80, 1)",
                        "rgba(54, 162, 235, 1)",
                        "rgba(255, 206, 86, 1)",
                        "rgba(201, 203, 207, 1)",
                    ],
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || "";
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            
                            // Add value definitions to tooltip
                            let definition = "";
                            switch(label) {
                                case "High Value":
                                    definition = " (Spent > R1000)";
                                    break;
                                case "Medium Value":
                                    definition = " (Spent R500-R1000)";
                                    break;
                                case "Low Value":
                                    definition = " (Spent < R500)";
                                    break;
                                case "New/Inactive":
                                    definition = " (No orders yet)";
                                    break;
                            }
                            
                            return `${label}: ${value} customers (${percentage}%)${definition}`;
                        },
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const segmentData = data[index];
                    // Import and call customer segment drilldown
                    import('./drilldowns.js').then(module => {
                        module.showCustomerSegmentDrilldown(segmentData, data);
                    });
                }
            },
        },
    });
}

export function renderCustomerCategorySpendingChart(data) {
    const ctx = document.getElementById("customerCategorySpendingChart");
    if (!ctx) return;

    if (customerCategorySpendingChart) {
        customerCategorySpendingChart.destroy();
    }

    customerCategorySpendingChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.map((item) => item.category),
            datasets: [
                {
                    label: "Total Spent (R)",
                    data: data.map((item) => item.totalSpent),
                    backgroundColor: "rgba(255, 159, 64, 0.7)",
                    borderColor: "rgba(255, 159, 64, 1)",
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Total Spent (R)",
                    },
                },
            },
            onClick: (evt, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const categoryData = data[index];
                    // Import and call customer category drilldown
                    import('./drilldowns.js').then(module => {
                        module.showCustomerCategoryDrilldown(categoryData, data);
                    });
                }
            },
        },
    });
}

export function renderCustomerCategorySpendingTable(data) {
    const tbody = document.querySelector("#customerCategorySpendingTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No customer category data found</td></tr>';
        return;
    }

    data.forEach((category) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(category.category)}</td>
            <td>R${category.totalSpent.toFixed(2)}</td>
            <td>R${category.averageOrderValue.toFixed(2)}</td>
            <td>${category.orderCount.toLocaleString()}</td>
            <td>${category.percentageOfRevenue.toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
    });
}

export function renderTopCustomersTable(data) {
    const tableBody = document.querySelector("#topCustomersTable tbody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    // Get top 10 customers
    const topCustomers = data.slice(0, 10);

    if (topCustomers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No customer data found</td></tr>';
        return;
    }

    topCustomers.forEach((customer) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(customer.name)}</td>
            <td>${escapeHtml(customer.email)}</td>
            <td>${customer.orders.toLocaleString()}</td>
            <td>R${customer.totalSpent.toFixed(2)}</td>
            <td>R${customer.avgOrder.toFixed(2)}</td>
            <td>${customer.lastPurchase ? customer.lastPurchase.toLocaleDateString() : "Never"}</td>
        `;
        tableBody.appendChild(row);
    });
}
