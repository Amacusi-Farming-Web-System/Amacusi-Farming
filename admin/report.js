// report.js
// Full cleaned and fixed report script with customer insights fixes
import {
  db,
  COLLECTIONS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  auth,
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
let customerValueChart, customerAcquisitionChart, customerLocationChart, customerCategorySpendingChart;

// Event Listeners
document.addEventListener("DOMContentLoaded", initReports);
if (timePeriodSelect)
  timePeriodSelect.addEventListener("change", toggleCustomDateRange);
if (reportTypeSelect)
  reportTypeSelect.addEventListener("change", toggleAdditionalFilters);
if (generateReportBtn)
  generateReportBtn.addEventListener("click", generateReport);
if (exportBtns)
  exportBtns.forEach((btn) => btn.addEventListener("click", exportReport));

// Initialize reports
async function initReports() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  if (startDateInput)
    startDateInput.value = formatDateForInput(firstDayOfMonth);
  if (endDateInput) endDateInput.value = formatDateForInput(today);

  await populateCategoryFilter();
  await generateReport();
}

function formatDateForInput(date) {
  return date.toISOString().split("T")[0];
}

function toggleCustomDateRange() {
  if (!customDateRange) return;
  customDateRange.style.display =
    timePeriodSelect.value === "custom" ? "block" : "none";
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
    const timePeriod = timePeriodSelect?.value || "month";

    // Get date range
    let startDate, endDate;
    if (timePeriod === "custom") {
      startDate = startDateInput.value
        ? new Date(startDateInput.value)
        : new Date();
      endDate = endDateInput.value ? new Date(endDateInput.value) : new Date();
      endDate.setHours(23, 59, 59, 999);
    } else {
      const range = getDateRange(timePeriod);
      startDate = range.startDate;
      endDate = range.endDate;
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
        generateCustomerReport(filteredOrders, customers);
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
    // Reset button state
    if (generateReportBtn) {
      generateReportBtn.disabled = false;
      generateReportBtn.innerHTML =
        '<i class="fas fa-sync-alt"></i> Generate Report';
    }
    if (reportLoading) reportLoading.style.display = "none";
  }
}

// Fix: Use items field instead of products field
function calculateProductPerformance(orders, products) {
  const productMap = {};

  // Initialize product map with all products
  products.forEach((product) => {
    productMap[product.id] = {
      id: product.id,
      name: product.name,
      category: product.category || "Unknown",
      sold: 0,
      revenue: 0,
      stock: product.stock || 0,
      views: product.views || 0,
    };
  });

  // Calculate sales from orders - FIXED: Use items field
  orders.forEach((order) => {
    // Use items field instead of products field
    const orderItems = order.items || [];
    orderItems.forEach((item) => {
      if (!productMap[item.id]) {
        // Create entry if product doesn't exist in our map
        productMap[item.id] = {
          id: item.id,
          name: item.name || "Unknown Product",
          category: "Unknown",
          sold: 0,
          revenue: 0,
          stock: 0,
          views: 0,
        };
      }

      productMap[item.id].sold += item.quantity || 0;
      productMap[item.id].revenue += (item.price || 0) * (item.quantity || 0);
    });
  });

  // Convert to array and calculate conversion rate
  const performanceData = Object.values(productMap);
  performanceData.forEach((product) => {
    product.conversion =
      product.views > 0 ? (product.sold / product.views) * 100 : 0;
  });

  return performanceData.sort((a, b) => b.revenue - a.revenue);
}

// Fix: Use items field in other calculation functions too
function calculateSalesByCategory(orders, products) {
  const categoryMap = {};

  // Create product ID to category mapping
  const productCategoryMap = {};
  products.forEach((product) => {
    productCategoryMap[product.id] = product.category || "Unknown";
  });

  // Calculate sales by category - FIXED: Use items field
  orders.forEach((order) => {
    const orderItems = order.items || [];
    orderItems.forEach((item) => {
      const category = productCategoryMap[item.id] || "Unknown";
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category: category,
          total: 0,
          count: 0,
        };
      }

      categoryMap[category].total += (item.price || 0) * (item.quantity || 0);
      categoryMap[category].count += item.quantity || 0;
    });
  });

  return Object.values(categoryMap);
}

// Fix: Use items field in top products calculation
function calculateTopProducts(orders, products) {
  const productSales = {};

  // Create product ID to name mapping
  const productNameMap = {};
  products.forEach((product) => {
    productNameMap[product.id] = product.name;
  });

  // Calculate product sales - FIXED: Use items field
  orders.forEach((order) => {
    const orderItems = order.items || [];
    orderItems.forEach((item) => {
      if (!productSales[item.id]) {
        productSales[item.id] = {
          id: item.id,
          name: productNameMap[item.id] || item.name || "Unknown",
          category:
            products.find((p) => p.id === item.id)?.category || "Unknown",
          quantity: 0,
          revenue: 0,
        };
      }

      productSales[item.id].quantity += item.quantity || 0;
      productSales[item.id].revenue += (item.price || 0) * (item.quantity || 0);
    });
  });

  const topProducts = Object.values(productSales).sort(
    (a, b) => b.revenue - a.revenue
  );
  const totalRevenue = topProducts.reduce(
    (sum, product) => sum + product.revenue,
    0
  );

  // Calculate percentage of total sales
  topProducts.forEach((product) => {
    product.percentage =
      totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
  });

  return topProducts.slice(0, 10);
}

async function fetchOrders(startDate, endDate) {
  try {
    const ordersQuery = window.firestore.query(
      window.firestore.collection(window.db, window.COLLECTIONS.ORDERS),
      window.firestore.where(
        "createdAt",
        ">=",
        window.firestore.Timestamp.fromDate(startDate)
      ),
      window.firestore.where(
        "createdAt",
        "<=",
        window.firestore.Timestamp.fromDate(endDate)
      ),
      window.firestore.orderBy("createdAt", "desc"),
      window.firestore.fsLimit(1000)
    );

    const querySnapshot = await window.firestore.getDocs(ordersQuery);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt:
          data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now()),
      };
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    showError("Failed to fetch orders");
    return [];
  }
}

async function fetchProducts() {
  try {
    const querySnapshot = await window.firestore.getDocs(
      window.firestore.collection(window.db, window.COLLECTIONS.PRODUCTS)
    );
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching products:", error);
    showError("Failed to fetch products");
    return [];
  }
}

async function fetchCustomers() {
  try {
    const querySnapshot = await window.firestore.getDocs(
      window.firestore.collection(window.db, window.COLLECTIONS.USERS)
    );
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        // Convert Firestore Timestamp to Date if it exists
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || Date.now())
      };
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    showError("Failed to fetch customers");
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

function getDateRange(period) {
  const today = new Date();
  const startDate = new Date(today);
  const endDate = new Date(today);

  switch (period) {
    case "today":
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "week":
      startDate.setDate(today.getDate() - today.getDay());
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(today.getDate() + (6 - today.getDay()));
      endDate.setHours(23, 59, 59, 999);
      break;
    case "month":
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(today.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "quarter":
      const quarter = Math.floor(today.getMonth() / 3);
      startDate.setMonth(quarter * 3, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(quarter * 3 + 3, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "year":
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setMonth(11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
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
  const totalCustomers = new Set(
    orders.map((order) => order.customerId || order.userId)
  ).size;

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

function generateProductReport(orders, products) {
  const productPerformance = calculateProductPerformance(orders, products);
  renderProductPerformanceChart(productPerformance);
  renderProductPerformanceTable(productPerformance);
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

  // Initialize all payment methods
  Object.values(window.PAYMENT_METHODS || {}).forEach((method) => {
    paymentMethods[method] = {
      method: method,
      count: 0,
      success: 0,
      total: 0,
    };
  });

  // Calculate payment method stats
  orders.forEach((order) => {
    const method = order.paymentMethod || "unknown";
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

    if (order.paymentStatus === window.PAYMENT_STATUS.PAID) {
      paymentMethods[method].success++;
    }
  });

  return Object.values(paymentMethods).filter((method) => method.count > 0);
}

function calculatePaymentSuccess(orders) {
  let success = 0,
    failed = 0,
    pending = 0;

  orders.forEach((order) => {
    if (order.paymentStatus === window.PAYMENT_STATUS.PAID) {
      success++;
    } else if (order.paymentStatus === window.PAYMENT_STATUS.FAILED) {
      failed++;
    } else if (order.paymentStatus === window.PAYMENT_STATUS.PENDING) {
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

  paymentMethodChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: data.map((item) => item.method.toUpperCase()),
      datasets: [
        {
          data: data.map((item) => item.count),
          backgroundColor: [
            "rgba(76, 175, 80, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
          ],
  borderColor: [
            "rgba(76, 175, 80, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
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
  const tbody = document.querySelector("#paymentDetailsTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">No payment data found</td></tr>';
    return;
  }

  data.forEach((method) => {
    const successRate =
      method.count > 0 ? ((method.success / method.count) * 100).toFixed(1) : 0;
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${escapeHtml(method.method.toUpperCase())}</td>
            <td>${method.count.toLocaleString()}</td>
            <td>${method.success.toLocaleString()}</td>
            <td>${successRate}%</td>
            <td>R${method.total.toFixed(2)}</td>
        `;
    tbody.appendChild(row);
  });
}

function generateCustomerReport(orders, customers) {
  const customerValue = calculateCustomerValue(orders, customers);
  renderCustomerValueChart(customerValue);

  const customerAcquisition = calculateCustomerAcquisition(customers);
  renderCustomerAcquisitionChart(customerAcquisition);

  // REPLACE LOCATION CHART WITH VALUE SEGMENTATION CHART
  const customerValueSegmentation = calculateCustomerValueSegmentation(customerValue);
  renderCustomerValueSegmentationChart(customerValueSegmentation);

  const customerCategorySpending = calculateCustomerCategorySpending(orders, customers);
  renderCustomerCategorySpendingChart(customerCategorySpending);
  renderCustomerCategorySpendingTable(customerCategorySpending);

  renderCustomerDetailsTable(customerValue);
}

function calculateCustomerValue(orders, customers) {
  const customerOrders = {};

  // Group orders by customer
  orders.forEach((order) => {
    const customerId = order.customerId || order.userId;
    if (!customerId) return;

    if (!customerOrders[customerId]) {
      customerOrders[customerId] = {
        customerId: customerId,
        totalSpent: 0,
        orderCount: 0,
        lastPurchase: new Date(0),
      };
    }

    customerOrders[customerId].totalSpent += order.total || 0;
    customerOrders[customerId].orderCount++;
    
    // Update last purchase date
    const orderDate = order.createdAt;
    if (orderDate > customerOrders[customerId].lastPurchase) {
      customerOrders[customerId].lastPurchase = orderDate;
    }
  });

  // Get customer details and categorize
  const customerValues = Object.values(customerOrders).map((customer) => {
    const customerData = customers.find((c) => c.id === customer.customerId);
    
    // FIXED: Enhanced customer name detection with more field possibilities
    let customerName = "Unknown Customer";
    let customerEmail = "No email";
    
    if (customerData) {
      // Try multiple possible field names for customer name
      if (customerData.name) {
        customerName = customerData.name;
      } else if (customerData.displayName) {
        customerName = customerData.displayName;
      } else if (customerData.firstName || customerData.lastName) {
        customerName = `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim();
      } else if (customerData.email) {
        customerName = customerData.email.split('@')[0]; // Use username part of email
      }
      
      // Get email from various possible fields
      if (customerData.email) {
        customerEmail = customerData.email;
      }
    }
    
    const customerType = customer.totalSpent > 1000 ? "Premium" : 
                        customer.totalSpent > 500 ? "Regular" : "Casual";
    
    return {
      ...customer,
      name: customerName,
      email: customerEmail,
      customerType: customerType
    };
  });

  // Sort by total spent
  return customerValues.sort((a, b) => b.totalSpent - a.totalSpent);
}

function calculateCustomerCategorySpending(orders, customers) {
  const customerCategories = {
    Premium: { totalSpent: 0, orderCount: 0, customerCount: 0 },
    Regular: { totalSpent: 0, orderCount: 0, customerCount: 0 },
    Casual: { totalSpent: 0, orderCount: 0, customerCount: 0 }
  };

  const customerValues = calculateCustomerValue(orders, customers);
  
  customerValues.forEach(customer => {
    const category = customer.customerType;
    customerCategories[category].totalSpent += customer.totalSpent;
    customerCategories[category].orderCount += customer.orderCount;
    customerCategories[category].customerCount++;
  });

  // Calculate averages and percentages
  const totalRevenue = Object.values(customerCategories).reduce((sum, cat) => sum + cat.totalSpent, 0);
  
  return Object.entries(customerCategories).map(([category, data]) => ({
    category,
    totalSpent: data.totalSpent,
    averageOrderValue: data.orderCount > 0 ? data.totalSpent / data.orderCount : 0,
    orderCount: data.orderCount,
    customerCount: data.customerCount,
    percentageOfRevenue: totalRevenue > 0 ? (data.totalSpent / totalRevenue) * 100 : 0
  }));
}

function calculateCustomerAcquisition(customers) {
  const monthlyAcquisition = {};

  customers.forEach((customer) => {
    const monthYear = customer.createdAt.toISOString().substring(0, 7); // YYYY-MM format
    if (!monthlyAcquisition[monthYear]) {
      monthlyAcquisition[monthYear] = {
        month: monthYear,
        count: 0,
      };
    }
    monthlyAcquisition[monthYear].count++;
  });

  return Object.values(monthlyAcquisition).sort((a, b) =>
    a.month.localeCompare(b.month)
  );
}

function calculateCustomerValueSegmentation(customers) {
  const valueSegments = {
    "Premium (R1000+)": 0,
    "Regular (R500-R999)": 0,
    "Casual (< R500)": 0,
    "New (No purchases)": 0
  };

  customers.forEach((customer) => {
    const totalSpent = customer.totalSpent || 0;
    
    if (totalSpent === 0) {
      valueSegments["New (No purchases)"]++;
    } else if (totalSpent >= 1000) {
      valueSegments["Premium (R1000+)"]++;
    } else if (totalSpent >= 500) {
      valueSegments["Regular (R500-R999)"]++;
    } else {
      valueSegments["Casual (< R500)"]++;
    }
  });

  return Object.entries(valueSegments)
    .map(([segment, count]) => ({ segment, count }))
    .filter(item => item.count > 0); // Only show segments with customers
}

function renderCustomerValueChart(data) {
  const ctx = document.getElementById("customerValueChart");
  if (!ctx) return;

  if (customerValueChart) {
    customerValueChart.destroy();
  }

  // Get top 10 customers by value
  const topCustomers = data.slice(0, 10);

  customerValueChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: topCustomers.map((c) =>
        c.name.length > 20 ? c.name.substring(0, 20) + "..." : c.name
      ),
      datasets: [
        {
          label: "Total Spent (R)",
          data: topCustomers.map((c) => c.totalSpent),
          backgroundColor: "rgba(76, 175, 80, 0.7)",
          borderColor: "rgba(76, 175, 80, 1)",
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

function renderCustomerCategorySpendingChart(data) {
  const ctx = document.getElementById("customerCategorySpendingChart");
  if (!ctx) return;

  if (customerCategorySpendingChart) {
    customerCategorySpendingChart.destroy();
  }

  customerCategorySpendingChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map(item => item.category),
      datasets: [
        {
          label: "Total Spent (R)",
          data: data.map(item => item.totalSpent),
          backgroundColor: "rgba(76, 175, 80, 0.7)",
          borderColor: "rgba(76, 175, 80, 1)",
          borderWidth: 1,
        },
        {
          label: "Customers Count",
          data: data.map(item => item.customerCount),
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
          type: "line",
          yAxisID: "y1",
        }
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
        y1: {
          beginAtZero: true,
          position: "right",
          title: {
            display: true,
            text: "Customers Count",
          },
          grid: {
            drawOnChartArea: false,
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

  if (customerLocationChart) {
    customerLocationChart.destroy();
  }

  customerLocationChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: data.map((item) => item.segment),
      datasets: [
        {
          data: data.map((item) => item.count),
          backgroundColor: [
            "rgba(76, 175, 80, 0.7)",      // Green - Premium
            "rgba(54, 162, 235, 0.7)",     // Blue - Regular
            "rgba(255, 206, 86, 0.7)",     // Yellow - Casual
            "rgba(153, 102, 255, 0.7)",    // Purple - New
          ],
          borderColor: [
            "rgba(76, 175, 80, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(153, 102, 255, 1)",
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
              return `${label}: ${value} customers (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

function renderCustomerDetailsTable(data) {
  const tbody = document.querySelector("#topCustomersTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center">No customer data found</td></tr>';
    return;
  }

  // Get top 20 customers
  const topCustomers = data.slice(0, 20);

topCustomers.forEach((customer) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${escapeHtml(customer.name)}</td>
            <td>${escapeHtml(customer.email)}</td>
            <!-- REMOVE LOCATION COLUMN -->
            <td>${customer.orderCount.toLocaleString()}</td>
            <td>R${customer.totalSpent.toFixed(2)}</td>
            <td>R${(customer.totalSpent / customer.orderCount).toFixed(2)}</td>
            <td>${customer.lastPurchase.toLocaleDateString()}</td>
        `;
    tbody.appendChild(row);
  });
}

function formatChartDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthYear(monthYear) {
  const [year, month] = monthYear.split("-");
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function exportReport(event) {
  const reportType = event.target.dataset.report;
  
  // Get the current date for the filename
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const filename = `${reportType}_report_${dateStr}_${timeStr}`;

  exportToCSV(reportType, filename);
}

function exportToCSV(reportType, filename) {
  let csvContent = "";
  let table;

  switch (reportType) {
    case "sales":
      table = document.getElementById("topProductsTable");
      break;
    case "payment":
      table = document.getElementById("paymentDetailsTable");
      break;
    case "product":
      table = document.getElementById("productPerformanceTable");
      break;
    case "customer":
      table = document.getElementById("topCustomersTable");
      break;
  }

  if (!table) {
    showError("No data available to export");
    return;
  }

  // Get headers
  const headers = [];
  table.querySelectorAll("thead th").forEach((th) => {
    headers.push(th.textContent.trim());
  });
  csvContent += headers.join(",") + "\n";

  // Get rows
  table.querySelectorAll("tbody tr").forEach((tr) => {
    const row = [];
    tr.querySelectorAll("td").forEach((td) => {
      let text = td.textContent.trim();
      // Escape commas and quotes in CSV
      if (text.includes(",") || text.includes('"')) {
        text = '"' + text.replace(/"/g, '""') + '"';
      }
      row.push(text);
    });
    csvContent += row.join(",") + "\n";
  });

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showError(message) {
  // Create or show error notification
  let errorEl = document.getElementById("errorNotification");
  if (!errorEl) {
    errorEl = document.createElement("div");
    errorEl.id = "errorNotification";
    errorEl.className = "error-notification";
    errorEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #f44336;
            color: white;
            padding: 15px;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
    document.body.appendChild(errorEl);
  }

  errorEl.textContent = message;
  errorEl.style.display = "block";

  // Auto hide after 5 seconds
  setTimeout(() => {
    errorEl.style.display = "none";
  }, 5000);
}

// Initialize reports when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReports);
} else {
  initReports();
}