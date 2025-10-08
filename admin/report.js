import {
  db,
  COLLECTIONS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
} from "../admin/firebase.js";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  limit as fsLimit,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM Elements
const reportTypeSelect = document.getElementById("reportType");
const timePeriodSelect = document.getElementById("timePeriod");
const customDateRange = document.getElementById("customDateRange");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const generateReportBtn = document.getElementById("generateReport");
const exportBtns = document.querySelectorAll(".export-btn");
const categoryFilter = document.getElementById("categoryFilter");
const productCategorySelect = document.getElementById("productCategory");
const customerTypeFilter = document.getElementById("customerTypeFilter");
const customerTypeSelect = document.getElementById("customerType");
const paymentStatusFilter = document.getElementById("paymentStatusFilter");
const paymentStatusSelect = document.getElementById("paymentStatus");
const totalOrdersEl = document.getElementById("totalOrders");
const totalRevenueEl = document.getElementById("totalRevenue");
const totalProductsSoldEl = document.getElementById("totalProductsSold");
const totalCustomersEl = document.getElementById("totalCustomers");
const salesReportSection = document.getElementById("salesReport");
const paymentReportSection = document.getElementById("paymentReport");
const productReportSection = document.getElementById("productReport");
const customerReportSection = document.getElementById("customerReport");
const reportLoading = document.getElementById("reportLoading");

// Chart instances
let salesTrendChart, salesByCategoryChart, customerTypeChart;
let paymentMethodChart, paymentSuccessChart, paymentByTimeChart;
let productPerformanceChart;
let customerValueChart, customerAcquisitionChart, customerLocationChart;
let customerValueSegmentationChart, customerCategorySpendingChart;

// Event Listeners
document.addEventListener("DOMContentLoaded", initReports);
if (timePeriodSelect) {
  timePeriodSelect.addEventListener("change", toggleCustomDateRange);
  // Set default to custom and hide time period selector
  timePeriodSelect.value = "custom";
  timePeriodSelect.style.display = "none";
  // Hide the label for time period
  const timePeriodLabel = timePeriodSelect.previousElementSibling;
  if (timePeriodLabel && timePeriodLabel.tagName === "LABEL") {
    timePeriodLabel.style.display = "none";
  }
}
if (reportTypeSelect)
  reportTypeSelect.addEventListener("change", toggleAdditionalFilters);
if (generateReportBtn)
  generateReportBtn.addEventListener("click", generateReport);
if (exportBtns)
  exportBtns.forEach((btn) => btn.addEventListener("click", exportReport));

// Show custom date range by default
if (customDateRange) {
  customDateRange.style.display = "block";
}

// Initialize reports
async function initReports() {
  // Set default date range to last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  if (startDateInput)
    startDateInput.value = formatDateForInput(startDate);
  if (endDateInput) 
    endDateInput.value = formatDateForInput(endDate);

  await populateCategoryFilter();
  await generateReport();
}

function formatDateForInput(date) {
  return date.toISOString().split("T")[0];
}

function toggleCustomDateRange() {
  if (!customDateRange) return;
  // Always show custom date range since we're removing predefined periods
  customDateRange.style.display = "block";
}

function toggleAdditionalFilters() {
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

async function populateCategoryFilter() {
  try {
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

async function generateReport() {
  try {
    // Show loading state
    if (generateReportBtn) {
      generateReportBtn.disabled = true;
      generateReportBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Generating...';
    }
    if (reportLoading) reportLoading.style.display = "block";

    const reportType = reportTypeSelect?.value || "sales";

    // Get date range from custom inputs
    let startDate, endDate;
    if (startDateInput.value) {
      startDate = new Date(startDateInput.value);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }

    if (endDateInput.value) {
      endDate = new Date(endDateInput.value);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Validate date range
    if (startDate > endDate) {
      showError("Start date cannot be after end date");
      return;
    }

    // Fetch data
    const [orders, products, customers] = await Promise.all([
      fetchOrders(startDate, endDate),
      fetchProducts(),
      fetchCustomers(),
    ]);

    // Apply filters based on report type
    let filteredOrders = [...orders];
    if (reportType === "sales") {
      filteredOrders = filterSalesOrders(filteredOrders, products);
    } else if (reportType === "payment") {
      filteredOrders = filterPaymentOrders(filteredOrders);
    } else if (reportType === "product") {
      filteredOrders = filterProductOrders(filteredOrders, products);
    }

    // Update summary cards
    updateSummaryCards(filteredOrders, products, customers);

    // Generate the specific report
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

    // Show the correct report section
    showReportSection(reportType);
  } catch (error) {
    console.error("Error generating report:", error);
    showError(
      "Failed to generate report: " + (error.message || "Unknown error")
    );
  } finally {
    // Hide loading
    if (reportLoading) reportLoading.style.display = "none";
    
    // Reset button state
    if (generateReportBtn) {
      generateReportBtn.disabled = false;
      generateReportBtn.innerHTML =
        '<i class="fas fa-sync-alt"></i> Generate Report';
    }
  }
}

// Data fetching functions
async function fetchOrders(startDate, endDate) {
  try {
    const ordersRef = collection(db, COLLECTIONS.ORDERS);
    const q = query(
      ordersRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate)),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    showError('Failed to fetch orders data');
    return [];
  }
}

async function fetchProducts() {
  try {
    const productsRef = collection(db, COLLECTIONS.PRODUCTS);
    const querySnapshot = await getDocs(productsRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching products:', error);
    showError('Failed to fetch products data');
    return [];
  }
}

async function fetchCustomers() {
  try {
    const customersRef = collection(db, COLLECTIONS.USERS);
    const querySnapshot = await getDocs(customersRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to Date objects
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      lastLogin: doc.data().lastLogin?.toDate?.() || null
    }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    showError('Failed to fetch customers data');
    return [];
  }
}

function filterSalesOrders(orders, products) {
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
  const categoryFilterValue = productCategorySelect?.value || "all";
  if (categoryFilterValue === "all") return orders;

  return orders.filter((order) => {
    return (order.items || []).some((item) => {
      const product = products.find((p) => p.id === item.id);
      return product?.category === categoryFilterValue;
    });
  });
}

function updateSummaryCards(orders, products, customers) {
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
  if (totalRevenueEl)
    totalRevenueEl.textContent = `R${totalRevenue.toFixed(2)}`;
  if (totalProductsSoldEl)
    totalProductsSoldEl.textContent = totalProductsSold.toLocaleString();
  if (totalCustomersEl)
    totalCustomersEl.textContent = totalCustomers.toLocaleString();
}

function showReportSection(reportType) {
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

// Sales Report Functions
function generateSalesReport(orders, products) {
  const salesTrendData = calculateSalesTrend(orders);
  renderSalesTrendChart(salesTrendData);

  const salesByCategory = calculateSalesByCategory(orders, products);
  renderSalesByCategoryChart(salesByCategory);

  const customerTypeData = calculateCustomerType(orders);
  renderCustomerTypeChart(customerTypeData);

  const topProducts = calculateTopProducts(orders, products);
  renderTopProductsTable(topProducts);
}

function calculateSalesTrend(orders) {
  const dailySales = {};

  orders.forEach((order) => {
    const date = order.createdAt.toISOString().split("T")[0];
    if (!dailySales[date]) {
      dailySales[date] = {
        date: date,
        total: 0,
        count: 0,
      };
    }

    dailySales[date].total += order.total || 0;
    dailySales[date].count++;
  });

  return Object.values(dailySales).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
}

function calculateSalesByCategory(orders, products) {
  const categorySales = {};
  
  orders.forEach(order => {
    order.items?.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product?.category) {
        if (!categorySales[product.category]) {
          categorySales[product.category] = 0;
        }
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        categorySales[product.category] += itemTotal;
      }
    });
  });
  
  return Object.entries(categorySales).map(([category, total]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    total
  })).sort((a, b) => b.total - a.total);
}

function calculateCustomerType(orders) {
  const customerTypes = {
    bulk: { count: 0, total: 0 },
    regular: { count: 0, total: 0 },
  };

  orders.forEach((order) => {
    const totalItems = (order.items || []).reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    const isBulk = totalItems > 10;
    const type = isBulk ? "bulk" : "regular";

    customerTypes[type].count++;
    customerTypes[type].total += order.total || 0;
  });

  return customerTypes;
}

function calculateTopProducts(orders, products, limit = 10) {
  const productSales = {};
  
  orders.forEach(order => {
    order.items?.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product) {
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
  
  const sortedProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
  
  const totalRevenue = sortedProducts.reduce((sum, product) => sum + product.revenue, 0);
  
  return sortedProducts.map(product => ({
    ...product,
    percentage: totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0
  }));
}

// Chart Rendering Functions
function renderSalesTrendChart(data) {
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
            text: "Number of Orders",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });
}

function renderSalesByCategoryChart(data) {
  const ctx = document.getElementById("salesByCategoryChart");
  if (!ctx) return;

  if (salesByCategoryChart) {
    salesByCategoryChart.destroy();
  }

  salesByCategoryChart = new Chart(ctx, {
    type: "bar",
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
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Revenue (R)",
          },
        },
      },
    },
  });
}

function renderCustomerTypeChart(data) {
  const ctx = document.getElementById("customerTypeChart");
  if (!ctx) return;

  if (customerTypeChart) {
    customerTypeChart.destroy();
  }

  customerTypeChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Bulk Buyers", "Regular Customers"],
      datasets: [
        {
          data: [data.bulk.count, data.regular.count],
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
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function renderTopProductsTable(data) {
  const tbody = document.querySelector("#topProductsTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">No products found</td></tr>';
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

// Payment Report Functions
function generatePaymentReport(orders) {
  const paymentMethods = calculatePaymentMethods(orders);
  renderPaymentMethodChart(paymentMethods);

  const paymentSuccess = calculatePaymentSuccess(orders);
  renderPaymentSuccessChart(paymentSuccess);

  const paymentByTime = calculatePaymentByTime(orders);
  renderPaymentByTimeChart(paymentByTime);

  renderPaymentDetailsTable(paymentMethods);
}

function calculatePaymentMethods(orders) {
  const paymentMethods = {};

  // Initialize with only PayPal and Cash (based on your cart.js)
  const availableMethods = {
    'paypal': { method: 'paypal', count: 0, success: 0, total: 0 },
    'cash': { method: 'cash', count: 0, success: 0, total: 0 }
  };

  // Calculate payment method stats
  orders.forEach((order) => {
    const method = order.paymentMethod || "cash"; // Default to cash if not specified
    
    // Only process PayPal and Cash methods
    if (method === 'paypal' || method === 'cash') {
      if (!paymentMethods[method]) {
        paymentMethods[method] = {
          method: method,
          count: 0,
          success: 0,
          total: 0,
        };
      }

      paymentMethods[method].count++;
      paymentMethods[method].total += order.total || 0;

      if (order.paymentStatus === window.PAYMENT_STATUS.PAID || 
          order.paymentStatus === 'completed' || 
          order.paymentStatus === 'paid') {
        paymentMethods[method].success++;
      }
    }
  });

  // Ensure both methods are included even if count is 0
  Object.keys(availableMethods).forEach(method => {
    if (!paymentMethods[method]) {
      paymentMethods[method] = availableMethods[method];
    }
  });

  return Object.values(paymentMethods);
}

function calculatePaymentSuccess(orders) {
  let success = 0,
    failed = 0,
    pending = 0;

  orders.forEach((order) => {
    if (order.paymentStatus === window.PAYMENT_STATUS.PAID || 
        order.paymentStatus === 'completed' || 
        order.paymentStatus === 'paid') {
      success++;
    } else if (order.paymentStatus === window.PAYMENT_STATUS.FAILED || 
               order.paymentStatus === 'failed') {
      failed++;
    } else if (order.paymentStatus === window.PAYMENT_STATUS.PENDING || 
               order.paymentStatus === 'pending') {
      pending++;
    }
  });

  return { success, failed, pending };
}

function calculatePaymentByTime(orders) {
  const timeSlots = {
    "Morning (6am-12pm)": 0,
    "Afternoon (12pm-6pm)": 0,
    "Evening (6pm-12am)": 0,
    "Night (12am-6am)": 0,
  };

  orders.forEach((order) => {
    const hour = order.createdAt.getHours();
    let timeSlot;

    if (hour >= 6 && hour < 12) timeSlot = "Morning (6am-12pm)";
    else if (hour >= 12 && hour < 18) timeSlot = "Afternoon (12pm-6pm)";
    else if (hour >= 18 && hour < 24) timeSlot = "Evening (6pm-12am)";
    else timeSlot = "Night (12am-6am)";

    timeSlots[timeSlot]++;
  });

  return timeSlots;
}

function renderPaymentMethodChart(data) {
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
        // Format method names nicely
        if (item.method === 'paypal') return 'PayPal';
        if (item.method === 'cash') return 'Cash on Delivery';
        return item.method.toUpperCase();
      }),
      datasets: [
        {
          data: displayData.map((item) => item.count),
          backgroundColor: [
            "rgba(76, 175, 80, 0.7)",  // Green for PayPal
            "rgba(54, 162, 235, 0.7)", // Blue for Cash
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
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function renderPaymentSuccessChart(data) {
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
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function renderPaymentByTimeChart(data) {
  const ctx = document.getElementById("paymentByTimeChart");
  if (!ctx) return;

  if (paymentByTimeChart) {
    paymentByTimeChart.destroy();
  }

  paymentByTimeChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          label: "Number of Payments",
          data: Object.values(data),
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
    },
  });
}

function renderPaymentDetailsTable(data) {
  const tableBody = document.querySelector("#paymentDetailsTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  // Filter out methods with zero counts
  const displayData = data.filter(method => method.count > 0);

  if (displayData.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-center">No payment data found for the selected period</td></tr>';
    return;
  }

  displayData.forEach((method) => {
    const successRate =
      method.count > 0 ? (method.success / method.count) * 100 : 0;
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

// Product Report Functions
function generateProductReport(orders, products) {
  const productPerformance = calculateProductPerformance(orders, products);
  renderProductPerformanceChart(productPerformance);
  renderProductPerformanceTable(productPerformance);
}

function calculateProductPerformance(orders, products) {
  const productStats = {};
  
  // Initialize with all products
  products.forEach(product => {
    productStats[product.id] = {
      id: product.id,
      name: product.name,
      category: product.category,
      sold: 0,
      revenue: 0,
      stock: product.stock || 0,
      views: product.views || 0
    };
  });
  
  // Calculate sales data
  orders.forEach(order => {
    order.items?.forEach(item => {
      if (productStats[item.id]) {
        productStats[item.id].sold += item.quantity || 0;
        productStats[item.id].revenue += (item.price || 0) * (item.quantity || 0);
      }
    });
  });
  
  // Calculate conversion rates
  Object.values(productStats).forEach(product => {
    product.conversion = product.views > 0 ? (product.sold / product.views) * 100 : 0;
  });
  
  return Object.values(productStats)
    .filter(product => product.sold > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

function renderProductPerformanceChart(data) {
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
    },
  });
}

function renderProductPerformanceTable(data) {
  const tbody = document.querySelector("#productPerformanceTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">No product data found</td></tr>';
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

// Customer Report Functions
function generateCustomerReport(orders, customers, products) {
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

function calculateCustomerData(orders, customers) {
  const customerStats = {};
  
  // Create a map of customers for easy lookup
  const customerMap = new Map();
  customers.forEach(customer => {
    customerMap.set(customer.id, customer);
  });
  
  // Initialize with customers who have placed orders
  orders.forEach(order => {
    const customerId = order.customerId || order.userId;
    if (customerId && !customerStats[customerId]) {
      const customer = customerMap.get(customerId);
      
      // Get customer name from multiple possible sources
      let customerName = 'Unknown Customer';
      
      // First try to get name from order data (most reliable)
      if (order.userName) {
        customerName = order.userName;
      } 
      // Then try customer record
      else if (customer) {
        customerName = customer.name || 
                      customer.displayName || 
                      customer.fullName || 
                      (customer.firstName && customer.lastName ? `${customer.firstName} ${customer.lastName}` : null) ||
                      'Unknown Customer';
      }
      // Fallback: use email username
      if (customerName === 'Unknown Customer' && customer?.email) {
        customerName = customer.email.split('@')[0];
        customerName = customerName.charAt(0).toUpperCase() + customerName.slice(1);
      }
      
      customerStats[customerId] = {
        id: customerId,
        name: customerName,
        email: customer?.email || order.userEmail || 'No email',
        orders: 0,
        totalSpent: 0,
        lastPurchase: null,
        firstPurchase: null
      };
    }
    
    if (customerId && customerStats[customerId]) {
      customerStats[customerId].orders++;
      customerStats[customerId].totalSpent += order.total || 0;
      
      const orderDate = order.createdAt;
      if (!customerStats[customerId].lastPurchase || orderDate > customerStats[customerId].lastPurchase) {
        customerStats[customerId].lastPurchase = orderDate;
      }
      if (!customerStats[customerId].firstPurchase || orderDate < customerStats[customerId].firstPurchase) {
        customerStats[customerId].firstPurchase = orderDate;
      }
    }
  });
  
  // Calculate average order value
  Object.values(customerStats).forEach(customer => {
    customer.avgOrder = customer.orders > 0 ? customer.totalSpent / customer.orders : 0;
  });
  
  return Object.values(customerStats)
    .filter(customer => customer.orders > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

function calculateCustomerAcquisition(customers) {
  const monthlyAcquisition = {};
  
  customers.forEach(customer => {
    // Handle both Date objects and Firestore Timestamps
    let createdAt;
    if (customer.createdAt && typeof customer.createdAt.toDate === 'function') {
      // It's a Firestore Timestamp
      createdAt = customer.createdAt.toDate();
    } else if (customer.createdAt instanceof Date) {
      // It's already a Date object
      createdAt = customer.createdAt;
    } else {
      // No valid creation date, skip this customer
      return;
    }
    
    const monthYear = createdAt.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyAcquisition[monthYear]) {
      monthlyAcquisition[monthYear] = 0;
    }
    monthlyAcquisition[monthYear]++;
  });
  
  return Object.entries(monthlyAcquisition)
    .map(([month, count]) => ({
      month,
      count
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function calculateCustomerSegments(customerData) {
  const segments = {
    "High Value": 0,
    "Medium Value": 0,
    "Low Value": 0,
    "New/Inactive": 0,
  };

  customerData.forEach((customer) => {
    if (customer.orders === 0) {
      segments["New/Inactive"]++;
    } else if (customer.totalSpent > 1000) {
      segments["High Value"]++;
    } else if (customer.totalSpent > 500) {
      segments["Medium Value"]++;
    } else {
      segments["Low Value"]++;
    }
  });

  return Object.entries(segments).map(([segment, count]) => ({
    segment,
    count
  }));
}

function calculateCustomerCategorySpending(orders, products) {
  const categorySpending = {};
  
  orders.forEach(order => {
    order.items?.forEach(item => {
      const product = products.find(p => p.id === item.id);
      if (product?.category) {
        const category = product.category;
        const amount = (item.price || 0) * (item.quantity || 0);
        
        if (!categorySpending[category]) {
          categorySpending[category] = {
            category: category.charAt(0).toUpperCase() + category.slice(1),
            totalSpent: 0,
            orderCount: 0,
            customerCount: new Set()
          };
        }
        
        categorySpending[category].totalSpent += amount;
        categorySpending[category].customerCount.add(order.customerId || order.userId);
      }
    });
    
    // Count orders per category
    Object.keys(categorySpending).forEach(category => {
      categorySpending[category].orderCount++;
    });
  });
  
  const totalRevenue = Object.values(categorySpending).reduce((sum, cat) => sum + cat.totalSpent, 0);
  
  return Object.values(categorySpending).map(cat => ({
    ...cat,
    customerCount: cat.customerCount.size,
    averageOrderValue: cat.orderCount > 0 ? cat.totalSpent / cat.orderCount : 0,
    percentageOfRevenue: totalRevenue > 0 ? (cat.totalSpent / totalRevenue) * 100 : 0
  })).sort((a, b) => b.totalSpent - a.totalSpent);
}

function calculateCustomerTypeFromOrder(order) {
  const totalItems = (order.items || []).reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );
  return totalItems > 10 ? "bulk" : "regular";
}

function renderCustomerValueChart(data) {
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
    },
  });
}

function renderCustomerAcquisitionChart(data) {
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
    },
  });
}

function renderCustomerValueSegmentationChart(data) {
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
            "rgba(76, 175, 80, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(201, 203, 207, 0.7)",
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
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function renderCustomerCategorySpendingChart(data) {
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
    },
  });
}

function renderCustomerCategorySpendingTable(data) {
  const tbody = document.querySelector("#customerCategorySpendingTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">No customer category data found</td></tr>';
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

function renderTopCustomersTable(data) {
  const tableBody = document.querySelector("#topCustomersTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  // Get top 10 customers
  const topCustomers = data.slice(0, 10);

  if (topCustomers.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">No customer data found</td></tr>';
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
      <td>${
        customer.lastPurchase
          ? customer.lastPurchase.toLocaleDateString()
          : "Never"
      }</td>
    `;
    tableBody.appendChild(row);
  });
}

// Export Functions
function exportReport(event) {
  const reportType = event.target.dataset.report;

  switch (reportType) {
    case "sales":
      exportSalesReport();
      break;
    case "payment":
      exportPaymentReport();
      break;
    case "product":
      exportProductReport();
      break;
    case "customer":
      exportCustomerReport();
      break;
  }
}

function exportSalesReport() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    showError("PDF export library not loaded");
    return;
  }

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text("Amacusi Farming - Sales Report", 105, 15, { align: "center" });

  // Add date range
  doc.setFontSize(12);
  const dateRange = `${startDateInput.value} to ${endDateInput.value}`;
  doc.text(`Date Range: ${dateRange}`, 105, 25, { align: "center" });

  // Add summary
  doc.setFontSize(14);
  doc.text("Summary", 14, 40);
  
  const summaryData = [
    ["Total Orders", totalOrdersEl.textContent],
    ["Total Revenue", totalRevenueEl.textContent],
    ["Products Sold", totalProductsSoldEl.textContent],
    ["Customers", totalCustomersEl.textContent]
  ];
  
  doc.autoTable({
    head: [['Metric', 'Value']],
    body: summaryData,
    startY: 45,
    theme: "grid",
    headStyles: {
      fillColor: [76, 175, 80],
      textColor: 255,
    },
  });

  // Add top products table
  doc.setFontSize(14);
  doc.text("Top Selling Products", 14, doc.lastAutoTable.finalY + 15);

  const topProductsTable = document.getElementById("topProductsTable");
  doc.autoTable({
    html: topProductsTable,
    startY: doc.lastAutoTable.finalY + 20,
    theme: "grid",
    headStyles: {
      fillColor: [76, 175, 80],
      textColor: 255,
    },
  });

  // Save the PDF
  doc.save(
    `amacusi-sales-report-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

function exportPaymentReport() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    showError("PDF export library not loaded");
    return;
  }

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text("Amacusi Farming - Payment Report", 105, 15, { align: "center" });

  // Add date range
  doc.setFontSize(12);
  const dateRange = `${startDateInput.value} to ${endDateInput.value}`;
  doc.text(`Date Range: ${dateRange}`, 105, 25, { align: "center" });

  // Add payment method details table
  doc.setFontSize(14);
  doc.text("Payment Method Analysis", 14, 35);

  const paymentDetailsTable = document.getElementById("paymentDetailsTable");
  doc.autoTable({
    html: paymentDetailsTable,
    startY: 40,
    theme: "grid",
    headStyles: {
      fillColor: [54, 162, 235],
      textColor: 255,
    },
  });

  // Save the PDF
  doc.save(
    `amacusi-payment-report-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

function exportProductReport() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    showError("PDF export library not loaded");
    return;
  }

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text("Amacusi Farming - Product Performance Report", 105, 15, {
    align: "center",
  });

  // Add date range
  doc.setFontSize(12);
  const dateRange = `${startDateInput.value} to ${endDateInput.value}`;
  doc.text(`Date Range: ${dateRange}`, 105, 25, { align: "center" });

  // Add product performance table
  doc.setFontSize(14);
  doc.text("Product Performance", 14, 35);

  const productPerformanceTable = document.getElementById(
    "productPerformanceTable"
  );
  doc.autoTable({
    html: productPerformanceTable,
    startY: 40,
    theme: "grid",
    headStyles: {
      fillColor: [255, 159, 64],
      textColor: 255,
    },
  });

  // Save the PDF
  doc.save(
    `amacusi-product-report-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

function exportCustomerReport() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    showError("PDF export library not loaded");
    return;
  }

  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text("Amacusi Farming - Customer Insights Report", 105, 15, {
    align: "center",
  });

  // Add date range
  doc.setFontSize(12);
  const dateRange = `${startDateInput.value} to ${endDateInput.value}`;
  doc.text(`Date Range: ${dateRange}`, 105, 25, { align: "center" });

  // Add top customers table
  doc.setFontSize(14);
  doc.text("Top Customers", 14, 35);

  const topCustomersTable = document.getElementById("topCustomersTable");
  doc.autoTable({
    html: topCustomersTable,
    startY: 40,
    theme: "grid",
    headStyles: {
      fillColor: [153, 102, 255],
      textColor: 255,
    },
  });

  // Save the PDF
  doc.save(
    `amacusi-customer-report-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

// Utility Functions
function formatChartDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthYear(monthString) {
  const [year, month] = monthString.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  document.body.appendChild(errorDiv);

  setTimeout(() => {
    errorDiv.style.opacity = "0";
    errorDiv.style.transition = "opacity 0.5s";
    setTimeout(() => errorDiv.remove(), 500);
  }, 5000);
}

function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  document.body.appendChild(successDiv);

  setTimeout(() => {
    successDiv.style.opacity = "0";
    successDiv.style.transition = "opacity 0.5s";
    setTimeout(() => successDiv.remove(), 500);
  }, 3000);
}
