
import { initDataFetchers, fetchOrders, fetchProducts, fetchCustomers } from './data-fetchers.js';
import { initFilters, applyFilters, populateCategoryFilter } from './filters.js';
import { initCharts, generateReportByType, showReportSection } from './charts.js';
import { initDrilldowns } from './drilldowns.js';
import { initExports, handleExport } from './exports.js';
import { initPopups } from './popups.js';
import { ensureRequiredElements, formatDateForInput, showError, updateSummaryCards } from './utils.js';

// Global data storage
export let currentOrders = [];
export let currentProducts = [];
export let currentCustomers = [];

// Business metrics storage
export let businessMetrics = {
    aovTrend: {},
    clvProjections: {},
    retentionRates: {},
    profitabilityMetrics: {},
    customerSegments: {},
    categoryProfitability: {},
    seasonalTrends: {}
};

// DOM Elements
export const domElements = {
    reportTypeSelect: document.getElementById("reportType"),
    timePeriodSelect: document.getElementById("timePeriod"),
    customDateRange: document.getElementById("customDateRange"),
    startDateInput: document.getElementById("startDate"),
    endDateInput: document.getElementById("endDate"),
    generateReportBtn: document.getElementById("generateReport"),
    exportBtns: document.querySelectorAll(".export-btn"),
    categoryFilter: document.getElementById("categoryFilter"),
    productCategorySelect: document.getElementById("productCategory"),
    customerTypeFilter: document.getElementById("customerTypeFilter"),
    customerTypeSelect: document.getElementById("customerType"),
    paymentStatusFilter: document.getElementById("paymentStatusFilter"),
    paymentStatusSelect: document.getElementById("paymentStatus"),
    totalOrdersEl: document.getElementById("totalOrders"),
    totalRevenueEl: document.getElementById("totalRevenue"),
    totalProductsSoldEl: document.getElementById("totalProductsSold"),
    totalCustomersEl: document.getElementById("totalCustomers"),
    salesReportSection: document.getElementById("salesReport"),
    paymentReportSection: document.getElementById("paymentReport"),
    productReportSection: document.getElementById("productReport"),
    customerReportSection: document.getElementById("customerReport"),
    reportLoading: document.getElementById("reportLoading"),
    executiveSummaryCards: document.querySelector('.executive-summary-cards')
};

// Event Listeners
export function initEventListeners() {
    const { timePeriodSelect, reportTypeSelect, generateReportBtn, exportBtns } = domElements;

    if (timePeriodSelect) {
        timePeriodSelect.addEventListener("change", toggleCustomDateRange);
        timePeriodSelect.value = "custom";
        timePeriodSelect.style.display = "none";
        
        const timePeriodLabel = timePeriodSelect.previousElementSibling;
        if (timePeriodLabel && timePeriodLabel.tagName === "LABEL") {
            timePeriodLabel.style.display = "none";
        }
    }

    if (reportTypeSelect) {
        reportTypeSelect.addEventListener("change", toggleAdditionalFilters);
    }

    if (generateReportBtn) {
        generateReportBtn.addEventListener("click", generateReport);
    }

    if (exportBtns) {
        exportBtns.forEach((btn) => btn.addEventListener("click", handleExport));
    }
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

// Initialize reports
export async function initReports() {
    if (!ensureRequiredElements()) {
        showError('Required page elements not found. Please refresh the page.');
        return;
    }

    // Set default date range to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { startDateInput, endDateInput } = domElements;
    if (startDateInput) startDateInput.value = formatDateForInput(startDate);
    if (endDateInput) endDateInput.value = formatDateForInput(endDate);

    await populateCategoryFilter();
    initDataFetchers();
    initFilters();
    initCharts();
    initDrilldowns();
    initExports();
    initPopups();
    initEventListeners();
    
    await generateReport();
}

// Main report generation function
export async function generateReport() {
    try {
        if (!ensureRequiredElements()) {
            showError('Required page elements not found. Please refresh the page.');
            return;
        }

        const { generateReportBtn, reportLoading, reportTypeSelect } = domElements;
        
        // Show loading state
        if (generateReportBtn) {
            generateReportBtn.disabled = true;
            generateReportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        }
        if (reportLoading) reportLoading.style.display = "block";

        const reportType = reportTypeSelect?.value || "sales";

        // Get date range
        const { startDateInput, endDateInput } = domElements;
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
            fetchCustomers()
        ]);

        // Store data globally
        currentOrders = orders;
        currentProducts = products;
        currentCustomers = customers;

        // Calculate business metrics
        await calculateBusinessMetrics(orders, products, customers);

        // Apply filters and generate report
        const filteredOrders = applyFilters(orders, products, reportType);
        updateSummaryCards(filteredOrders);
        await generateReportByType(reportType, filteredOrders, products, customers);

    } catch (error) {
        console.error("Error generating report:", error);
        showError("Failed to generate report: " + (error.message || "Unknown error"));
    } finally {
        const { generateReportBtn, reportLoading } = domElements;
        
        // Hide loading
        if (reportLoading) reportLoading.style.display = "none";
        
        // Reset button state
        if (generateReportBtn) {
            generateReportBtn.disabled = false;
            generateReportBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Generate Report';
        }
    }
}

// Calculate enhanced business metrics
async function calculateBusinessMetrics(orders, products, customers) {
    // Import calculation functions dynamically
    const { 
        calculateAOVTrend, 
        calculateCLVProjections, 
        calculateRetentionRates, 
        calculateProfitabilityMetrics,
        calculateCategoryProfitability,
        calculateSeasonalTrends,
        calculateCustomerSegments,
        getSpendingRange
    } = await import('./calculations.js');

    // Store functions globally for use in other modules
    window.calculateCustomerSegments = calculateCustomerSegments;
    window.getSpendingRange = getSpendingRange;

    businessMetrics = {
        aovTrend: calculateAOVTrend(orders),
        clvProjections: calculateCLVProjections(customers, orders),
        retentionRates: calculateRetentionRates(customers, orders),
        profitabilityMetrics: calculateProfitabilityMetrics(orders, products),
        categoryProfitability: calculateCategoryProfitability(orders, products),
        seasonalTrends: calculateSeasonalTrends(orders),
        customerSegments: calculateEnhancedCustomerSegments(customers, orders, calculateCustomerSegments)
    };

    // Update executive summary cards
    updateExecutiveSummaryCards();
}

function calculateEnhancedCustomerSegments(customers, orders, calculateCustomerSegments) {
    // First calculate base segments
    const customerData = calculateCustomerDataForSegments(customers, orders);
    const baseSegments = calculateCustomerSegments(customerData);
    
    const enhancedSegments = {};
    
    baseSegments.forEach(segment => {
        const segmentCustomers = getCustomersForSegment(customers, orders, segment.segment);
        
        const segmentRevenue = segmentCustomers.reduce((sum, customer) => {
            const customerOrders = orders.filter(order => 
                order.customerId === customer.id || order.userId === customer.id
            );
            return sum + customerOrders.reduce((orderSum, order) => orderSum + (order.total || 0), 0);
        }, 0);
        
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        enhancedSegments[segment.segment] = {
            ...segment,
            customers: segmentCustomers,
            totalRevenue: segmentRevenue,
            revenuePercentage: totalRevenue > 0 ? (segmentRevenue / totalRevenue) * 100 : 0,
            avgCLV: calculateSegmentAvgCLV(segmentCustomers, businessMetrics.clvProjections)
        };
    });
    
    return enhancedSegments;
}

// Helper function to calculate customer data for segments
function calculateCustomerDataForSegments(customers, orders) {
    const customerStats = {};
    
    customers.forEach(customer => {
        const customerOrders = orders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        
        const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        customerStats[customer.id] = {
            id: customer.id,
            orders: customerOrders.length,
            totalSpent: totalSpent
        };
    });
    
    return Object.values(customerStats);
}

// Helper function to get customers for a specific segment
function getCustomersForSegment(customers, orders, segment) {
    return customers.filter(customer => {
        const customerOrders = orders.filter(order => 
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

// Helper function to calculate average CLV for a segment
function calculateSegmentAvgCLV(segmentCustomers, clvProjections) {
    if (segmentCustomers.length === 0) return 0;
    
    const totalCLV = segmentCustomers.reduce((sum, customer) => {
        const clv = clvProjections[customer.id]?.projected || 0;
        return sum + clv;
    }, 0);
    
    return totalCLV / segmentCustomers.length;
}

function updateExecutiveSummaryCards() {
    const { executiveSummaryCards } = domElements;
    if (!executiveSummaryCards) return;

    const { aovTrend, profitabilityMetrics, retentionRates, clvProjections } = businessMetrics;
    
    const avgCLV = Object.values(clvProjections).length > 0 ? 
        Object.values(clvProjections).reduce((sum, clv) => sum + clv.projected, 0) / Object.values(clvProjections).length : 0;

    executiveSummaryCards.innerHTML = `
        <div class="executive-card performance-high">
            <div class="executive-icon">
                <i class="fas fa-chart-line"></i>
            </div>
            <div class="executive-content">
                <h3>Average Order Value</h3>
                <div class="executive-value">R${aovTrend.current?.toFixed(2) || '0.00'}</div>
                <div class="executive-trend ${aovTrend.trend >= 0 ? 'trend-up' : 'trend-down'}">
                    <i class="fas fa-arrow-${aovTrend.trend >= 0 ? 'up' : 'down'}"></i>
                    ${Math.abs(aovTrend.trend || 0).toFixed(1)}%
                </div>
                <div class="executive-subtitle">vs previous period</div>
            </div>
        </div>

        <div class="executive-card performance-medium">
            <div class="executive-icon">
                <i class="fas fa-percentage"></i>
            </div>
            <div class="executive-content">
                <h3>Gross Margin</h3>
                <div class="executive-value">${profitabilityMetrics.grossMargin?.toFixed(1) || '0.0'}%</div>
                <div class="progress-bar-executive">
                    <div class="progress-fill" style="width: ${Math.min(profitabilityMetrics.grossMargin || 0, 100)}%"></div>
                </div>
                <div class="executive-subtitle">R${profitabilityMetrics.grossProfit?.toFixed(0) || '0'} gross profit</div>
            </div>
        </div>

        <div class="executive-card performance-high">
            <div class="executive-icon">
                <i class="fas fa-users"></i>
            </div>
            <div class="executive-content">
                <h3>Customer Retention</h3>
                <div class="executive-value">${retentionRates.activeRate?.toFixed(1) || '0.0'}%</div>
                <div class="retention-breakdown">
                    <span class="retention-item active">${retentionRates.activeCustomers || 0} Active</span>
                    <span class="retention-item risk">${retentionRates.atRiskCustomers || 0} At Risk</span>
                    <span class="retention-item churned">${retentionRates.churnedCustomers || 0} Churned</span>
                </div>
            </div>
        </div>

        <div class="executive-card performance-low">
            <div class="executive-icon">
                <i class="fas fa-user-tie"></i>
            </div>
            <div class="executive-content">
                <h3>Avg. Customer Value</h3>
                <div class="executive-value">R${avgCLV.toFixed(0)}</div>
                <div class="executive-subtitle">Lifetime value projection</div>
                <div class="value-segments">
                    <div class="segment-item premium">Premium: ${Object.values(clvProjections).filter(c => c.segment === 'Premium').length}</div>
                    <div class="segment-item high">High: ${Object.values(clvProjections).filter(c => c.segment === 'High').length}</div>
                </div>
            </div>
        </div>
    `;
}

// Make business metrics available globally
window.businessMetrics = businessMetrics;
window.currentOrders = currentOrders;
window.currentProducts = currentProducts;
window.currentCustomers = currentCustomers;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initReports);
