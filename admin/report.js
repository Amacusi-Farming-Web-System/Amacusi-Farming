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
  doc,
  getDoc,
  Timestamp,
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

// Summary elements
const totalOrdersEl = document.getElementById("totalOrders");
const totalRevenueEl = document.getElementById("totalRevenue");
const totalProductsSoldEl = document.getElementById("totalProductsSold");
const totalCustomersEl = document.getElementById("totalCustomers");

// Report sections
const salesReportSection = document.getElementById("salesReport");
const paymentReportSection = document.getElementById("paymentReport");
const productReportSection = document.getElementById("productReport");
const customerReportSection = document.getElementById("customerReport");

// Chart instances
let salesTrendChart;
let salesByCategoryChart;
let customerTypeChart;
let paymentMethodChart;
let paymentSuccessChart;
let paymentByTimeChart;
let productPerformanceChart;
let customerValueChart;
let customerAcquisitionChart;
let customerLocationChart;

// Event Listeners
document.addEventListener("DOMContentLoaded", initReports);
timePeriodSelect.addEventListener("change", toggleCustomDateRange);
reportTypeSelect.addEventListener("change", toggleAdditionalFilters);
generateReportBtn.addEventListener("click", generateReport);
exportBtns.forEach((btn) => btn.addEventListener("click", exportReport));

// Initialize reports
async function initReports() {
  // Set default dates
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Format dates for input fields (YYYY-MM-DD)
  startDateInput.value = formatDateForInput(firstDayOfMonth);
  endDateInput.value = formatDateForInput(today);

  // Load initial categories
  await populateCategoryFilter();

  // Load initial report
  await generateReport();
}

function formatDateForInput(date) {
  return date.toISOString().split("T")[0];
}

function toggleCustomDateRange() {
  customDateRange.style.display =
    timePeriodSelect.value === "custom" ? "block" : "none";
}

function toggleAdditionalFilters() {
  const reportType = reportTypeSelect.value;

  // Hide all additional filters first
  categoryFilter.style.display = "none";
  customerTypeFilter.style.display = "none";
  paymentStatusFilter.style.display = "none";

  // Show relevant filters based on report type
  switch (reportType) {
    case "sales":
      categoryFilter.style.display = "block";
      customerTypeFilter.style.display = "block";
      break;
    case "payment":
      paymentStatusFilter.style.display = "block";
      break;
    case "product":
      categoryFilter.style.display = "block";
      break;
    case "customer":
      // No additional filters for customer report
      break;
  }
}

async function populateCategoryFilter() {
  try {
    const products = await fetchProducts();
    const categories = [...new Set(products.map((p) => p.category))].filter(
      (c) => c
    );

    // Clear existing options except "All Categories"
    while (productCategorySelect.options.length > 1) {
      productCategorySelect.remove(1);
    }

    // Add new category options
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      productCategorySelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error populating category filter:", error);
  }
}

async function generateReport() {
  try {
    // Show loading state
    generateReportBtn.disabled = true;
    generateReportBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Generating...';

    // Get report parameters
    const reportType = reportTypeSelect.value;
    const timePeriod = timePeriodSelect.value;

    let startDate, endDate;

    if (timePeriod === "custom") {
      startDate = new Date(startDateInput.value);
      endDate = new Date(endDateInput.value);
      endDate.setHours(23, 59, 59, 999); // Include the entire end day
    } else {
      // Calculate dates based on time period
      const dateRange = getDateRange(timePeriod);
      startDate = dateRange.startDate;
      endDate = dateRange.endDate;
    }

    // Validate date range
    if (startDate > endDate) {
      showError("Start date cannot be after end date");
      return;
    }

    // Fetch data from Firebase
    let orders = await fetchOrders(startDate, endDate);
    const products = await fetchProducts();
    const customers = await fetchCustomers();

    // Apply additional filters based on report type
    switch (reportType) {
      case "sales":
        orders = filterSalesOrders(orders, products);
        break;
      case "payment":
        orders = filterPaymentOrders(orders);
        break;
      case "product":
        orders = filterProductOrders(orders, products);
        break;
      case "customer":
        // No additional filtering needed for customer report
        break;
    }

    // Update summary cards
    updateSummaryCards(orders, products, customers);

    // Generate the selected report
    switch (reportType) {
      case "sales":
        generateSalesReport(orders, products);
        break;
      case "payment":
        generatePaymentReport(orders);
        break;
      case "product":
        generateProductReport(orders, products);
        break;
      case "customer":
        generateCustomerReport(orders, customers);
        break;
    }

    // Show the selected report section
    showReportSection(reportType);
  } catch (error) {
    console.error("Error generating report:", error);
    showError("Failed to generate report: " + error.message);
  } finally {
    // Reset button state
    generateReportBtn.disabled = false;
    generateReportBtn.innerHTML =
      '<i class="fas fa-sync-alt"></i> Generate Report';
  }
}

function filterSalesOrders(orders, products) {
  const categoryFilterValue = productCategorySelect.value;
  const customerTypeValue = customerTypeSelect.value;

  let filteredOrders = [...orders];

  // Filter by customer type if not "all"
  if (customerTypeValue !== "all") {
    filteredOrders = filteredOrders.filter((order) => {
      const totalItems =
        order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      const isBulk = totalItems > 10;

      if (customerTypeValue === "bulk") return isBulk;
      if (customerTypeValue === "regular") return !isBulk;
      return true;
    });
  }

  // Filter by category if not "all"
  if (categoryFilterValue !== "all") {
    filteredOrders = filteredOrders.filter((order) => {
      const hasMatchingCategory = order.items?.some((item) => {
        const product = products.find((p) => p.id === item.productId);
        return product?.category === categoryFilterValue;
      });
      return hasMatchingCategory;
    });
  }

  return filteredOrders;
}

function filterPaymentOrders(orders) {
  const paymentStatusValue = paymentStatusSelect.value;

  if (paymentStatusValue === "all") return orders;

  return orders.filter((order) => {
    if (paymentStatusValue === "paid")
      return order.paymentStatus === PAYMENT_STATUS.PAID;
    if (paymentStatusValue === "pending")
      return order.paymentStatus === PAYMENT_STATUS.PENDING;
    if (paymentStatusValue === "failed")
      return order.paymentStatus === PAYMENT_STATUS.FAILED;
    return true;
  });
}

function filterProductOrders(orders, products) {
  const categoryFilterValue = productCategorySelect.value;

  if (categoryFilterValue === "all") return orders;

  return orders.filter((order) => {
    return order.items?.some((item) => {
      const product = products.find((p) => p.id === item.productId);
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
      // Get start of week (Sunday)
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
  }

  return { startDate, endDate };
}

async function fetchOrders(startDate, endDate) {
  try {
    const ordersQuery = query(
      collection(db, COLLECTIONS.ORDERS),
      where("createdAt", ">=", Timestamp.fromDate(startDate)),
      where("createdAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(ordersQuery);
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
    showError("Failed to fetch orders: " + error.message);
    return [];
  }
}

async function fetchProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    showError("Failed to fetch products: " + error.message);
    return [];
  }
}

async function fetchCustomers() {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching customers:", error);
    showError("Failed to fetch customers: " + error.message);
    return [];
  }
}

function updateSummaryCards(orders, products, customers) {
  // Calculate summary metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.total || 0),
    0
  );
  const totalProductsSold = orders.reduce(
    (sum, order) =>
      sum +
      (order.items?.reduce(
        (itemSum, item) => itemSum + (item.quantity || 0),
        0
      ) || 0),
    0
  );
  const totalCustomers = [
    ...new Set(orders.map((order) => order.customerId || order.userId)),
  ].length;

  // Update DOM elements
  totalOrdersEl.textContent = totalOrders.toLocaleString();
  totalRevenueEl.textContent = `R${totalRevenue.toFixed(2)}`;
  totalProductsSoldEl.textContent = totalProductsSold.toLocaleString();
  totalCustomersEl.textContent = totalCustomers.toLocaleString();
}

function showReportSection(reportType) {
  // Hide all sections first
  salesReportSection.style.display = "none";
  paymentReportSection.style.display = "none";
  productReportSection.style.display = "none";
  customerReportSection.style.display = "none";

  // Show the selected section
  switch (reportType) {
    case "sales":
      salesReportSection.style.display = "block";
      break;
    case "payment":
      paymentReportSection.style.display = "block";
      break;
    case "product":
      productReportSection.style.display = "block";
      break;
    case "customer":
      customerReportSection.style.display = "block";
      break;
  }
}

function generateSalesReport(orders, products) {
  // 1. Sales Trend Chart (Daily/Monthly)
  const salesTrendData = calculateSalesTrend(orders);
  renderSalesTrendChart(salesTrendData);

  // 2. Sales by Category
  const salesByCategory = calculateSalesByCategory(orders, products);
  renderSalesByCategoryChart(salesByCategory);

  // 3. Customer Type (Bulk vs Regular)
  const customerTypeData = calculateCustomerType(orders);
  renderCustomerTypeChart(customerTypeData);

  // 4. Top Selling Products Table
  const topProducts = calculateTopProducts(orders, products);
  renderTopProductsTable(topProducts);
}

function generatePaymentReport(orders) {
  // 1. Payment Method Distribution
  const paymentMethods = calculatePaymentMethods(orders);
  renderPaymentMethodChart(paymentMethods);

  // 2. Payment Success Rate
  const paymentSuccess = calculatePaymentSuccess(orders);
  renderPaymentSuccessChart(paymentSuccess);

  // 3. Payment by Time of Day
  const paymentByTime = calculatePaymentByTime(orders);
  renderPaymentByTimeChart(paymentByTime);

  // 4. Payment Method Details Table
  renderPaymentDetailsTable(paymentMethods);
}

function generateProductReport(orders, products) {
  // 1. Product Performance Chart
  const productPerformance = calculateProductPerformance(orders, products);
  renderProductPerformanceChart(productPerformance);

  // 2. Product Performance Table
  renderProductPerformanceTable(productPerformance);
}

function generateCustomerReport(orders, customers) {
  // 1. Customer Value Segmentation
  const customerValue = calculateCustomerValue(orders, customers);
  renderCustomerValueChart(customerValue);

  // 2. Customer Acquisition
  const customerAcquisition = calculateCustomerAcquisition(customers);
  renderCustomerAcquisitionChart(customerAcquisition);

  // 3. Customer Location
  const customerLocation = calculateCustomerLocation(customers);
  renderCustomerLocationChart(customerLocation);

  // 4. Top Customers Table
  renderTopCustomersTable(customerValue);
}

// Sales Report Calculations
function calculateSalesTrend(orders) {
  // Group orders by day
  const dailySales = {};

  orders.forEach((order) => {
    const date = order.createdAt.toISOString().split("T")[0];
    if (!dailySales[date]) {
      dailySales[date] = {
        date,
        total: 0,
        count: 0,
      };
    }
    dailySales[date].total += order.total || 0;
    dailySales[date].count++;
  });

  // Convert to array and sort by date
  return Object.values(dailySales).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
}

function calculateSalesByCategory(orders, products) {
  const categoryMap = {};

  // First create a product ID to category map
  const productCategoryMap = {};
  products.forEach((product) => {
    productCategoryMap[product.id] = product.category || "Unknown";
  });

  // Then calculate sales by category
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const category = productCategoryMap[item.productId] || "Unknown";
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
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

function calculateCustomerType(orders) {
  const customerTypes = {
    bulk: { count: 0, total: 0 },
    regular: { count: 0, total: 0 },
  };

  orders.forEach((order) => {
    const totalItems =
      order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    const isBulk = totalItems > 10;
    const type = isBulk ? "bulk" : "regular";
    customerTypes[type].count++;
    customerTypes[type].total += order.total || 0;
  });

  return customerTypes;
}

function calculateTopProducts(orders, products) {
  const productSales = {};

  // Create a product ID to name map
  const productNameMap = {};
  products.forEach((product) => {
    productNameMap[product.id] = product.name;
  });

  // Calculate sales per product
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = {
          id: item.productId,
          name: productNameMap[item.productId] || "Unknown",
          category:
            products.find((p) => p.id === item.productId)?.category ||
            "Unknown",
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[item.productId].quantity += item.quantity || 0;
      productSales[item.productId].revenue +=
        (item.price || 0) * (item.quantity || 0);
    });
  });

  const topProducts = Object.values(productSales).sort(
    (a, b) => b.revenue - a.revenue
  );

  // Calculate percentage of total sales
  const totalRevenue = topProducts.reduce(
    (sum, product) => sum + product.revenue,
    0
  );
  topProducts.forEach((product) => {
    product.percentage =
      totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
  });

  return topProducts.slice(0, 10); // Return top 10 products
}

// Payment Report Calculations
function calculatePaymentMethods(orders) {
  const paymentMethods = {};

  // Initialize all payment methods
  Object.values(PAYMENT_METHODS).forEach((method) => {
    paymentMethods[method] = {
      method,
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
        method,
        count: 0,
        success: 0,
        total: 0,
      };
    }

    paymentMethods[method].count++;
    paymentMethods[method].total += order.total || 0;

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      paymentMethods[method].success++;
    }
  });

  return Object.values(paymentMethods).filter((method) => method.count > 0);
}

function calculatePaymentSuccess(orders) {
  let success = 0;
  let failed = 0;
  let pending = 0;

  orders.forEach((order) => {
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      success++;
    } else if (order.paymentStatus === PAYMENT_STATUS.FAILED) {
      failed++;
    } else if (order.paymentStatus === PAYMENT_STATUS.PENDING) {
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

// Product Report Calculations
function calculateProductPerformance(orders, products) {
  const performanceData = [];

  // Create a map of product IDs to their data
  const productMap = {};
  products.forEach((product) => {
    productMap[product.id] = {
      id: product.id,
      name: product.name,
      category: product.category,
      sold: 0,
      revenue: 0,
      stock: product.stock || 0,
      views: product.views || 0,
    };
  });

  // Calculate sales data
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      if (productMap[item.productId]) {
        productMap[item.productId].sold += item.quantity || 0;
        productMap[item.productId].revenue +=
          (item.price || 0) * (item.quantity || 0);
      }
    });
  });

  // Convert to array and calculate conversion rate
  Object.values(productMap).forEach((data) => {
    data.conversion = data.views > 0 ? (data.sold / data.views) * 100 : 0;
    performanceData.push(data);
  });

  return performanceData.sort((a, b) => b.revenue - a.revenue);
}

// Customer Report Calculations
function calculateCustomerValue(orders, customers) {
  const customerData = {};

  // Initialize customer data
  customers.forEach((customer) => {
    customerData[customer.id] = {
      id: customer.id,
      name:
        customer.name ||
        customer.email ||
        `Customer ${customer.id.substring(0, 6)}`,
      email: customer.email,
      orders: 0,
      totalSpent: 0,
      lastPurchase: null,
    };
  });

  // Calculate customer metrics
  orders.forEach((order) => {
    const customerId = order.customerId || order.userId;
    if (customerData[customerId]) {
      customerData[customerId].orders++;
      customerData[customerId].totalSpent += order.total || 0;

      const orderDate = order.createdAt;
      if (
        !customerData[customerId].lastPurchase ||
        orderDate > customerData[customerId].lastPurchase
      ) {
        customerData[customerId].lastPurchase = orderDate;
      }
    }
  });

  // Calculate average order value
  Object.values(customerData).forEach((customer) => {
    customer.avgOrder =
      customer.orders > 0 ? customer.totalSpent / customer.orders : 0;
  });

  return Object.values(customerData).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );
}

function calculateCustomerAcquisition(customers) {
  const acquisitionData = {};

  customers.forEach((customer) => {
    const date =
      customer.createdAt?.toISOString().split("T")[0] ||
      new Date().toISOString().split("T")[0];
    if (!acquisitionData[date]) {
      acquisitionData[date] = 0;
    }
    acquisitionData[date]++;
  });

  return Object.entries(acquisitionData)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calculateCustomerLocation(customers) {
  const locationData = {};

  customers.forEach((customer) => {
    const location =
      customer.address?.province || customer.location || "Unknown";
    if (!locationData[location]) {
      locationData[location] = 0;
    }
    locationData[location]++;
  });

  return Object.entries(locationData).map(([location, count]) => ({
    location,
    count,
  }));
}

// Chart Rendering Functions
function renderSalesTrendChart(data) {
  const ctx = document.getElementById("salesTrendChart");
  if (!ctx) return;

  if (salesTrendChart) {
    salesTrendChart.destroy();
  }

  salesTrendChart = new Chart(ctx.getContext("2d"), {
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

  salesByCategoryChart = new Chart(ctx.getContext("2d"), {
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

  customerTypeChart = new Chart(ctx.getContext("2d"), {
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

function renderPaymentMethodChart(data) {
  const ctx = document.getElementById("paymentMethodChart");
  if (!ctx) return;

  if (paymentMethodChart) {
    paymentMethodChart.destroy();
  }

  paymentMethodChart = new Chart(ctx.getContext("2d"), {
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

  paymentSuccessChart = new Chart(ctx.getContext("2d"), {
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

  paymentByTimeChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [
        {
          label: "Number of Transactions",
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
            text: "Number of Transactions",
          },
        },
      },
    },
  });
}

function renderProductPerformanceChart(data) {
  const ctx = document.getElementById("productPerformanceChart");
  if (!ctx) return;

  if (productPerformanceChart) {
    productPerformanceChart.destroy();
  }

  // Get top 10 products for the chart
  const topProducts = data.slice(0, 10);

  productPerformanceChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: topProducts.map(
        (item) =>
          item.name.substring(0, 20) + (item.name.length > 20 ? "..." : "")
      ),
      datasets: [
        {
          label: "Revenue (R)",
          data: topProducts.map((item) => item.revenue),
          backgroundColor: "rgba(76, 175, 80, 0.7)",
          borderColor: "rgba(76, 175, 80, 1)",
          borderWidth: 1,
          yAxisID: "y",
        },
        {
          label: "Units Sold",
          data: topProducts.map((item) => item.sold),
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
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
          position: "left",
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

function renderCustomerValueChart(data) {
  const ctx = document.getElementById("customerValueChart");
  if (!ctx) return;

  if (customerValueChart) {
    customerValueChart.destroy();
  }

  // Segment customers by value
  const segments = {
    "High Value": 0,
    "Medium Value": 0,
    "Low Value": 0,
    "New/Inactive": 0,
  };

  data.forEach((customer) => {
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

  customerValueChart = new Chart(ctx.getContext("2d"), {
    type: "pie",
    data: {
      labels: Object.keys(segments),
      datasets: [
        {
          data: Object.values(segments),
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

function renderCustomerAcquisitionChart(data) {
  const ctx = document.getElementById("customerAcquisitionChart");
  if (!ctx) return;

  if (customerAcquisitionChart) {
    customerAcquisitionChart.destroy();
  }

  customerAcquisitionChart = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: {
      labels: data.map((item) => formatChartDate(item.date)),
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

function renderCustomerLocationChart(data) {
  const ctx = document.getElementById("customerLocationChart");
  if (!ctx) return;

  if (customerLocationChart) {
    customerLocationChart.destroy();
  }

  customerLocationChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: data.map((item) => item.location),
      datasets: [
        {
          label: "Customers by Location",
          data: data.map((item) => item.count),
          backgroundColor: "rgba(75, 192, 192, 0.7)",
          borderColor: "rgba(75, 192, 192, 1)",
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
            text: "Number of Customers",
          },
        },
      },
    },
  });
}

// Table Rendering Functions
function renderTopProductsTable(data) {
  const tableBody = document.querySelector("#topProductsTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-center">No products found</td></tr>';
    return;
  }

  data.forEach((product) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${product.quantity.toLocaleString()}</td>
      <td>R${product.revenue.toFixed(2)}</td>
      <td>${product.percentage.toFixed(1)}%</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderPaymentDetailsTable(data) {
  const tableBody = document.querySelector("#paymentDetailsTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-center">No payment data found</td></tr>';
    return;
  }

  data.forEach((method) => {
    const successRate =
      method.count > 0 ? (method.success / method.count) * 100 : 0;
    const avgAmount = method.count > 0 ? method.total / method.count : 0;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${method.method.toUpperCase()}</td>
      <td>${method.count.toLocaleString()}</td>
      <td>${successRate.toFixed(1)}%</td>
      <td>R${avgAmount.toFixed(2)}</td>
      <td>R${method.total.toFixed(2)}</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderProductPerformanceTable(data) {
  const tableBody = document.querySelector("#productPerformanceTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="text-center">No product data found</td></tr>';
    return;
  }

  data.forEach((product) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${product.sold.toLocaleString()}</td>
      <td>R${product.revenue.toFixed(2)}</td>
      <td>${product.stock.toLocaleString()}</td>
      <td>${product.conversion.toFixed(2)}%</td>
    `;
    tableBody.appendChild(row);
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
      '<tr><td colspan="5" class="text-center">No customer data found</td></tr>';
    return;
  }

  topCustomers.forEach((customer) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${customer.name}</td>
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
  doc.text("Summary", 14, 35);

  doc.setFontSize(12);
  doc.text(`Total Orders: ${totalOrdersEl.textContent}`, 14, 45);
  doc.text(`Total Revenue: ${totalRevenueEl.textContent}`, 14, 55);
  doc.text(`Products Sold: ${totalProductsSoldEl.textContent}`, 14, 65);
  doc.text(`Customers: ${totalCustomersEl.textContent}`, 14, 75);

  // Add top products table
  doc.setFontSize(14);
  doc.text("Top Selling Products", 14, 90);

  const topProductsTable = document.getElementById("topProductsTable");
  doc.autoTable({
    html: topProductsTable,
    startY: 95,
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

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  document.body.appendChild(errorDiv);

  // Add styles if not already present
  if (!document.querySelector("style#error-styles")) {
    const style = document.createElement("style");
    style.id = "error-styles";
    style.textContent = `
      .error-message {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
      }
      .error-message i {
        font-size: 18px;
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    errorDiv.style.opacity = "0";
    errorDiv.style.transition = "opacity 0.5s";
    setTimeout(() => errorDiv.remove(), 500);
  }, 3000);
}

function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
  document.body.appendChild(successDiv);

  // Add styles if not already present
  if (!document.querySelector("style#success-styles")) {
    const style = document.createElement("style");
    style.id = "success-styles";
    style.textContent = `
      .success-message {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
      }
      .success-message i {
        font-size: 18px;
      }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => {
    successDiv.style.opacity = "0";
    successDiv.style.transition = "opacity 0.5s";
    setTimeout(() => successDiv.remove(), 500);
  }, 3000);
}
