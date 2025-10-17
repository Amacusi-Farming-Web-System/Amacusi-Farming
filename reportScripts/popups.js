import { escapeHtml, formatChartDate, calculatePercentage } from './utils.js';

// Enhanced business calculation functions
function calculateCustomerLifetimeValue(customers, orders) {
    const clvData = {};
    
    customers.forEach(customer => {
        const customerOrders = orders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        
        if (customerOrders.length > 0) {
            const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const avgOrderValue = totalSpent / customerOrders.length;
            const purchaseFrequency = customerOrders.length / 12; // Assuming 12-month period
            
            // Simple CLV calculation: Avg Order Value × Purchase Frequency × Customer Lifespan
            // Using conservative 2-year lifespan for projection
            clvData[customer.id] = avgOrderValue * purchaseFrequency * 24;
        }
    });
    
    return clvData;
}

function calculateRetentionRate(customers, orders, periodMonths = 3) {
    const retentionData = {};
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - periodMonths);
    
    customers.forEach(customer => {
        const customerOrders = orders.filter(order => 
            (order.customerId === customer.id || order.userId === customer.id) &&
            order.createdAt >= cutoffDate
        );
        
        retentionData[customer.id] = customerOrders.length > 0 ? 100 : 0;
    });
    
    return retentionData;
}

function calculateAOVTrend(orders, period = 30) {
    const currentDate = new Date();
    const previousDate = new Date();
    previousDate.setDate(previousDate.getDate() - period);
    
    const currentOrders = orders.filter(order => order.createdAt >= previousDate);
    const previousOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= new Date(previousDate.setDate(previousDate.getDate() - period)) && 
               orderDate < previousDate;
    });
    
    const currentAOV = currentOrders.length > 0 ? 
        currentOrders.reduce((sum, order) => sum + order.total, 0) / currentOrders.length : 0;
    
    const previousAOV = previousOrders.length > 0 ? 
        previousOrders.reduce((sum, order) => sum + order.total, 0) / previousOrders.length : 0;
    
    const trend = previousAOV > 0 ? ((currentAOV - previousAOV) / previousAOV) * 100 : 0;
    
    return {
        current: currentAOV,
        previous: previousAOV,
        trend: trend
    };
}

// Enhanced modal management
let currentModal = null;

export function initPopups() {
    // Remove old popup event listeners
    const closeChartPopupBtn = document.getElementById('closeChartPopup');
    const chartPopupOverlay = document.getElementById('chartPopupOverlay');

    if (closeChartPopupBtn) {
        closeChartPopupBtn.removeEventListener("click", closeChartPopup);
    }
    if (chartPopupOverlay) {
        chartPopupOverlay.removeEventListener("click", closeChartPopup);
    }
    
    // Add ESC key listener for new modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCurrentModal();
        }
    });
}

export function showEnhancedChartPopup(title, segmentData, fullData, chartType) {
    closeCurrentModal(); // Close any existing modal
    
    const modal = createEnhancedModal(title, chartType);
    document.body.appendChild(modal);
    
    // Load content based on chart type
    loadEnhancedContent(modal, segmentData, fullData, chartType);
    
    // Show modal
    modal.classList.add('active');
    currentModal = modal;
    
    // Add event listeners
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => closeCurrentModal());
    
    // Tab switching
    const tabs = modal.querySelectorAll('.insight-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(modal, tab.dataset.tab));
    });
}

function createEnhancedModal(title, chartType) {
    const modal = document.createElement('div');
    modal.className = 'insight-modal';
    modal.innerHTML = `
        <header class="insight-header">
            <h2>${escapeHtml(title)}</h2>
            <button class="close-modal">
                <i class="fas fa-times"></i>
            </button>
        </header>
        
        <div class="insight-tabs">
            <button class="insight-tab active" data-tab="summary">
                <i class="fas fa-chart-line"></i> Executive Summary
            </button>
            <button class="insight-tab" data-tab="financial">
                <i class="fas fa-money-bill-wave"></i> Financial Impact
            </button>
            <button class="insight-tab" data-tab="insights">
                <i class="fas fa-chart-bar"></i> Performance Metrics
            </button>
            <button class="insight-tab" data-tab="actions">
                <i class="fas fa-rocket"></i> Recommended Actions
            </button>
        </div>
        
        <div class="insight-content">
            <div id="summary-tab" class="tab-content active">
                <!-- Summary content will be loaded here -->
            </div>
            <div id="financial-tab" class="tab-content">
                <!-- Financial content will be loaded here -->
            </div>
            <div id="insights-tab" class="tab-content">
                <!-- Insights content will be loaded here -->
            </div>
            <div id="actions-tab" class="tab-content">
                <!-- Actions content will be loaded here -->
            </div>
        </div>
    `;
    
    return modal;
}

function switchTab(modal, tabName) {
    // Update active tab
    const tabs = modal.querySelectorAll('.insight-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    modal.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active content
    const contents = modal.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));
    modal.querySelector(`#${tabName}-tab`).classList.add('active');
}

function loadEnhancedContent(modal, segmentData, fullData, chartType) {
    switch(chartType) {
        case 'customerSegment':
            loadCustomerSegmentContent(modal, segmentData, fullData);
            break;
        case 'salesTrend':
            loadSalesTrendContent(modal, segmentData, fullData);
            break;
        case 'customerType':
            loadCustomerTypeContent(modal, segmentData, fullData);
            break;
        case 'customerAcquisition':
            loadCustomerAcquisitionContent(modal, segmentData, fullData);
            break;
        case 'category':
            loadCategoryContent(modal, segmentData, fullData);
            break;
        case 'paymentMethod':
            loadPaymentMethodContent(modal, segmentData, fullData);
            break;
                case 'paymentStatus':
            console.log('Payment Status Data:', {
                status: segmentData.status,
                customersCount: segmentData.customers ? segmentData.customers.length : 0,
                customers: segmentData.customers,
                ordersCount: segmentData.orders ? segmentData.orders.length : 0
            });
            loadPaymentStatusContent(modal, segmentData, fullData);
            break;
        case 'paymentTime':
            loadPaymentTimeContent(modal, segmentData, fullData);
            break;
        case 'product':
            loadProductContent(modal, segmentData, fullData);
            break;
        case 'customer':
            loadCustomerContent(modal, segmentData, fullData);
            break;
        case 'orderSummary':
            loadOrderSummaryContent(modal, segmentData, fullData);
            break;
        case 'revenueSummary':
            loadRevenueSummaryContent(modal, segmentData, fullData);
            break;
        case 'productsSummary':
            loadProductsSummaryContent(modal, segmentData, fullData);
            break;
        case 'customerCategory':
            loadCustomerCategoryContent(modal, segmentData, fullData);
            break;
        case 'newCustomers':
            loadNewCustomersContent(modal, segmentData, fullData);
            break;
        default:
            loadDefaultContent(modal, segmentData, fullData);
    }
}

function loadCustomerSegmentContent(modal, segmentData, fullData) {
    const { currentOrders, currentCustomers } = window;
    
    // Calculate enhanced metrics
    const clvData = calculateCustomerLifetimeValue(currentCustomers, currentOrders);
    const retentionData = calculateRetentionRate(currentCustomers, currentOrders);
    const aovTrend = calculateAOVTrend(currentOrders);
    
    const segmentCustomers = getCustomersBySegment(segmentData.segment);
    const segmentRevenue = segmentCustomers.reduce((sum, customer) => {
        const customerOrders = currentOrders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        return sum + customerOrders.reduce((orderSum, order) => orderSum + (order.total || 0), 0);
    }, 0);
    
    const totalRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenueConcentration = totalRevenue > 0 ? (segmentRevenue / totalRevenue) * 100 : 0;
    
    // Create customers list HTML
    const customersList = segmentCustomers.length > 0 ? 
        segmentCustomers.map(customer => {
            const customerOrders = currentOrders.filter(order => 
                order.customerId === customer.id || order.userId === customer.id
            );
            const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const lastOrder = customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            const avgOrderValue = customerOrders.length > 0 ? totalSpent / customerOrders.length : 0;
            
            return `
                <div class="customer-item">
                    <div class="customer-header">
                        <div class="customer-info">
                            <h4>${customer.name || customer.displayName || customer.email?.split('@')[0] || 'Unknown Customer'}</h4>
                            <p class="customer-email">${customer.email || 'No email'}</p>
                        </div>
                        <div class="customer-stats">
                            <span class="total-spent">R${totalSpent.toFixed(2)}</span>
                            <span class="order-count">${customerOrders.length} orders</span>
                        </div>
                    </div>
                    <div class="customer-details">
                        <div class="customer-meta">
                            <span class="signup-date">Joined: ${customer.createdAt ? customer.createdAt.toLocaleDateString() : 'Unknown'}</span>
                            ${lastOrder ? `<span class="last-order">Last order: ${lastOrder.createdAt.toLocaleDateString()}</span>` : ''}
                            <span class="avg-order">Avg Order: R${avgOrderValue.toFixed(2)}</span>
                        </div>
                        ${customerOrders.length > 0 ? `
                            <div class="recent-orders">
                                <strong>Recent Orders (Last 3):</strong>
                                ${customerOrders.slice(0, 3).map(order => `
                                    <div class="recent-order">
                                        <span class="order-date">${order.createdAt.toLocaleDateString()}</span>
                                        <span class="order-amount">R${(order.total || 0).toFixed(2)}</span>
                                        <span class="order-status ${(order.orderStatus || 'pending').toLowerCase()}">${order.orderStatus || 'pending'}</span>
                                    </div>
                                `).join('')}
                                ${customerOrders.length > 3 ? `
                                    <div class="more-orders">+ ${customerOrders.length - 3} more orders</div>
                                ` : ''}
                            </div>
                        ` : '<div class="no-orders">No orders yet</div>'}
                    </div>
                </div>
            `;
        }).join('') : '<p class="no-data">No customers found in this segment</p>';

    // Load summary tab with customer details
    const summaryTab = modal.querySelector('#summary-tab');
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Segment Overview</h3>
                    <span class="metric-trend trend-up">
                        <i class="fas fa-arrow-up"></i> ${revenueConcentration.toFixed(1)}%
                    </span>
                </div>
                <div class="metric-value">${segmentData.customerCount} Customers</div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Market Share</span>
                        <span>${revenueConcentration.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${revenueConcentration}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Financial Performance</h3>
                </div>
                <div class="metric-value">R${segmentRevenue.toLocaleString()}</div>
                <div class="metric-trend trend-up">
                    ${revenueConcentration.toFixed(1)}% of Total Revenue
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Customer Value</h3>
                </div>
                <div class="metric-value">R${(segmentRevenue / segmentData.customerCount).toLocaleString()}</div>
                <div class="metric-trend">
                    Average Revenue per Customer
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-users"></i>
                <h3 class="section-title">Customer Details (${segmentCustomers.length})</h3>
            </div>
            <div class="section-content">
                <div class="customers-list">
                    ${customersList}
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-bullseye"></i>
                <h3 class="section-title">Key Performance Indicators</h3>
            </div>
            <div class="section-content">
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <div class="comparison-value">${calculateSegmentRetention(segmentCustomers, currentOrders)}%</div>
                        <div class="comparison-label">Retention Rate</div>
                    </div>
                    <div class="comparison-item">
                        <div class="comparison-value">R${calculateAverageCLV(segmentCustomers, clvData).toLocaleString()}</div>
                        <div class="comparison-label">Avg. Lifetime Value</div>
                    </div>
                    <div class="comparison-item">
                        <div class="comparison-value">${calculatePurchaseFrequency(segmentCustomers, currentOrders)}x</div>
                        <div class="comparison-label">Purchase Frequency</div>
                    </div>
                    <div class="comparison-item">
                        <div class="comparison-value">${calculateDaysSinceLastPurchase(segmentCustomers, currentOrders)}</div>
                        <div class="comparison-label">Avg. Days Since Last Purchase</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load financial tab
    const financialTab = modal.querySelector('#financial-tab');
    financialTab.innerHTML = `
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-chart-pie"></i>
                <h3 class="section-title">Revenue Concentration Analysis</h3>
            </div>
            <div class="section-content">
                <div class="metric-grid">
                    <div class="metric-card">
                        <h4 class="metric-title">Revenue Distribution</h4>
                        <div class="progress-container">
                            <div class="progress-label">
                                <span>${segmentData.segment} Segment</span>
                                <span>${revenueConcentration.toFixed(1)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${revenueConcentration}%"></div>
                            </div>
                        </div>
                        <div class="progress-container">
                            <div class="progress-label">
                                <span>Other Segments</span>
                                <span>${(100 - revenueConcentration).toFixed(1)}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${100 - revenueConcentration}%"></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="metric-card">
                        <h4 class="metric-title">Profitability Metrics</h4>
                        <div class="comparison-grid">
                            <div class="comparison-item">
                                <div class="comparison-value">42%</div>
                                <div class="comparison-label">Gross Margin</div>
                            </div>
                            <div class="comparison-item">
                                <div class="comparison-value">R${(segmentRevenue * 0.42).toLocaleString()}</div>
                                <div class="comparison-label">Estimated Profit</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-user-tie"></i>
                <h3 class="section-title">Top 5 Customers in This Segment</h3>
            </div>
            <div class="section-content">
                <div class="top-customers-list">
                    ${segmentCustomers
                        .sort((a, b) => {
                            const aOrders = currentOrders.filter(order => order.customerId === a.id || order.userId === a.id);
                            const bOrders = currentOrders.filter(order => order.customerId === b.id || order.userId === b.id);
                            const aTotal = aOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                            const bTotal = bOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                            return bTotal - aTotal;
                        })
                        .slice(0, 5)
                        .map(customer => {
                            const customerOrders = currentOrders.filter(order => 
                                order.customerId === customer.id || order.userId === customer.id
                            );
                            const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                            const lastOrder = customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                            
                            return `
                                <div class="top-customer-item">
                                    <div class="top-customer-info">
                                        <h5>${customer.name || customer.displayName || customer.email?.split('@')[0] || 'Unknown Customer'}</h5>
                                        <p class="customer-email">${customer.email || 'No email'}</p>
                                    </div>
                                    <div class="top-customer-stats">
                                        <div class="customer-revenue">R${totalSpent.toFixed(2)}</div>
                                        <div class="customer-orders">${customerOrders.length} orders</div>
                                        ${lastOrder ? `<div class="last-order">Last: ${lastOrder.createdAt.toLocaleDateString()}</div>` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Load actions tab
    const actionsTab = modal.querySelector('#actions-tab');
    actionsTab.innerHTML = `
        <div class="action-grid">
            <div class="action-card priority-high">
                <div class="action-header">
                    <h4 class="action-title">High-Impact Initiatives</h4>
                    <span class="priority-badge">Priority 1</span>
                </div>
                <ul class="action-list">
                    <li>
                        <i class="fas fa-crown"></i>
                        Implement VIP Program with exclusive benefits for top ${Math.min(5, segmentCustomers.length)} customers
                    </li>
                    <li>
                        <i class="fas fa-user-tie"></i>
                        Assign dedicated account managers for customers spending > R2000
                    </li>
                    <li>
                        <i class="fas fa-gift"></i>
                        Create personalized gift packages for loyal customers
                    </li>
                    <li>
                        <i class="fas fa-bullhorn"></i>
                        Launch targeted upselling campaigns to increase average order value
                    </li>
                </ul>
            </div>
            
            <div class="action-card priority-medium">
                <div class="action-header">
                    <h4 class="action-title">Growth Opportunities</h4>
                    <span class="priority-badge">Priority 2</span>
                </div>
                <ul class="action-list">
                    <li>
                        <i class="fas fa-arrow-up"></i>
                        Upsell premium product categories (${Math.round(100 - revenueConcentration)}% untapped potential)
                    </li>
                    <li>
                        <i class="fas fa-users"></i>
                        Launch referral program targeting similar high-value customer profiles
                    </li>
                    <li>
                        <i class="fas fa-box"></i>
                        Develop custom product bundles (R2,000+ value) for this segment
                    </li>
                    <li>
                        <i class="fas fa-chart-line"></i>
                        Implement CLV optimization strategies for at-risk customers
                    </li>
                </ul>
            </div>
            
            <div class="action-card priority-low">
                <div class="action-header">
                    <h4 class="action-title">Risk Mitigation</h4>
                    <span class="priority-badge">Priority 3</span>
                </div>
                <ul class="action-list">
                    <li>
                        <i class="fas fa-bell"></i>
                        Monitor ${segmentCustomers.filter(c => {
                            const customerOrders = currentOrders.filter(order => 
                                order.customerId === c.id || order.userId === c.id
                            );
                            const lastOrder = customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                            return lastOrder && ((new Date() - lastOrder.createdAt) / (1000 * 60 * 60 * 24)) > 45;
                        }).length} customers with >45 days since last purchase
                    </li>
                    <li>
                        <i class="fas fa-chart-line"></i>
                        Analyze customers showing decreased order values for intervention
                    </li>
                    <li>
                        <i class="fas fa-envelope"></i>
                        Implement targeted re-engagement campaigns for inactive customers
                    </li>
                    <li>
                        <i class="fas fa-shield-alt"></i>
                        Develop retention strategies for customers at risk of churn
                    </li>
                </ul>
            </div>
        </div>
    `;
}

// Content loading functions for other chart types
function loadSalesTrendContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    
    // Create orders list HTML
    const ordersList = segmentData.orders && segmentData.orders.length > 0 ? 
        segmentData.orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <strong>Order #${order.id || 'N/A'}</strong>
                    <span class="order-amount">R${(order.total || 0).toFixed(2)}</span>
                </div>
                <div class="order-details">
                    <div class="customer-info">
                        <i class="fas fa-user"></i>
                        ${order.userName || order.customerName || 'Unknown Customer'}
                        ${order.userEmail ? `(${order.userEmail})` : ''}
                    </div>
                    <div class="order-items">
                        ${(order.items || []).map(item => `
                            <div class="order-item-line">
                                ${item.name || 'Unknown Product'} × ${item.quantity || 1}
                                <span class="item-total">R${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-meta">
                        <span class="payment-method">${order.paymentMethod || 'cash'}</span>
                        <span class="order-status ${(order.orderStatus || '').toLowerCase()}">${order.orderStatus || 'pending'}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p class="no-data">No orders found for this date</p>';

    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Daily Performance</h3>
                    <span class="metric-trend ${segmentData.revenueTrend >= 0 ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-arrow-${segmentData.revenueTrend >= 0 ? 'up' : 'down'}"></i> ${Math.abs(segmentData.revenueTrend).toFixed(1)}%
                    </span>
                </div>
                <div class="metric-value">R${segmentData.dailyRevenue.toLocaleString()}</div>
                <div class="metric-trend">
                    ${segmentData.orderCount} Orders • R${segmentData.avgOrderValue.toFixed(2)} Avg. Order
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Customer Activity</h3>
                </div>
                <div class="metric-value">${segmentData.customers ? segmentData.customers.length : 0}</div>
                <div class="metric-trend">
                    Unique Customers
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-calendar-alt"></i>
                <h3 class="section-title">Date Analysis</h3>
            </div>
            <div class="section-content">
                <p><strong>Analysis Date:</strong> ${formatChartDate(segmentData.date)}</p>
                <p><strong>Performance:</strong> ${segmentData.revenueTrend >= 0 ? 'Above' : 'Below'} average daily revenue</p>
                <p><strong>Order Efficiency:</strong> ${segmentData.avgOrderValue > 500 ? 'High' : segmentData.avgOrderValue > 200 ? 'Medium' : 'Low'} value orders</p>
            </div>
        </div>

        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-receipt"></i>
                <h3 class="section-title">Orders Details (${segmentData.orders ? segmentData.orders.length : 0})</h3>
            </div>
            <div class="section-content">
                <div class="orders-list">
                    ${ordersList}
                </div>
            </div>
        </div>
    `;
}
function loadCustomerTypeContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    const financialTab = modal.querySelector('#financial-tab');
    const actionsTab = modal.querySelector('#actions-tab');
    
    // Create customers list HTML
    const customersList = segmentData.customers && segmentData.customers.length > 0 ? 
        segmentData.customers.map(customer => {
            // Use the actual orders from the segment data, not refiltering
            const customerOrders = segmentData.orders.filter(order => 
                order.customerId === customer.id || order.userId === customer.id
            );
            
            console.log(`Customer ${customer.id}: ${customerOrders.length} orders`, customerOrders);
            
            const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const lastOrder = customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            const avgOrderValue = customerOrders.length > 0 ? totalSpent / customerOrders.length : 0;
            
            return `
                <div class="customer-item">
                    <div class="customer-header">
                        <div class="customer-info">
                            <h4>${customer.name || customer.displayName || customer.email?.split('@')[0] || 'Unknown Customer'}</h4>
                            <p class="customer-email">${customer.email || 'No email'}</p>
                        </div>
                        <div class="customer-stats">
                            <span class="total-spent">R${totalSpent.toFixed(2)}</span>
                            <span class="order-count">${customerOrders.length} orders</span>
                        </div>
                    </div>
                 
                </div>
            `;
        }).join('') : '<p class="no-data">No customers found in this segment</p>';

    // Rest of the function remains the same...
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Customer Segment</h3>
                </div>
                <div class="metric-value">${segmentData.customerCount} Customers</div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Revenue Contribution</span>
                        <span>${segmentData.revenuePercentage.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${segmentData.revenuePercentage}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Financial Impact</h3>
                </div>
                <div class="metric-value">R${segmentData.totalRevenue.toLocaleString()}</div>
                <div class="metric-trend">
                    R${segmentData.avgOrderValue.toFixed(2)} Average Order Value
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Order Volume</h3>
                </div>
                <div class="metric-value">${segmentData.orderCount}</div>
                <div class="metric-trend">
                    Total Orders
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-info-circle"></i>
                <h3 class="section-title">Segment Definition</h3>
            </div>
            <div class="section-content">
                <p><strong>${segmentData.type === 'bulk' ? 'Bulk Buyers' : 'Regular Customers'}:</strong> ${segmentData.definition}</p>
                <p><strong>Criteria:</strong> ${segmentData.type === 'bulk' ? 'Customers with average items per order > 10' : 'Customers with average items per order ≤ 10'}</p>
            </div>
        </div>

        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-users"></i>
                <h3 class="section-title">Customer Details (${segmentData.customers ? segmentData.customers.length : 0})</h3>
            </div>
            <div class="section-content">
                <div class="customers-list">
                    ${customersList}
                </div>
            </div>
        </div>
    `;

    // Financial Tab - Use the same approach for top customers
    const topCustomersList = segmentData.customers
        ?.sort((a, b) => {
            const aOrders = segmentData.orders.filter(order => order.customerId === a.id || order.userId === a.id);
            const bOrders = segmentData.orders.filter(order => order.customerId === b.id || order.userId === b.id);
            const aTotal = aOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const bTotal = bOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            return bTotal - aTotal;
        })
        .slice(0, 5)
        .map(customer => {
            const customerOrders = segmentData.orders.filter(order => 
                order.customerId === customer.id || order.userId === customer.id
            );
            const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const lastOrder = customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            
            return `
                <div class="top-customer-item">
                    <div class="top-customer-info">
                        <h5>${customer.name || customer.displayName || customer.email?.split('@')[0] || 'Unknown Customer'}</h5>
                        <p class="customer-email">${customer.email || 'No email'}</p>
                    </div>
                    <div class="top-customer-stats">
                        <div class="customer-revenue">R${totalSpent.toFixed(2)}</div>
                        <div class="customer-orders">${customerOrders.length} orders</div>
                        ${lastOrder ? `<div class="last-order">Last: ${lastOrder.createdAt.toLocaleDateString()}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('') || '<p class="no-data">No customers found</p>';




}

function loadPaymentMethodContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    
    const ordersList = segmentData.orders && segmentData.orders.length > 0 ? 
        segmentData.orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <strong>Order #${order.id || 'N/A'}</strong>
                    <span class="order-amount">R${(order.total || 0).toFixed(2)}</span>
                </div>
                <div class="order-details">
                    <div class="customer-info">
                        <i class="fas fa-user"></i>
                        ${order.userName || order.customerName || 'Unknown Customer'}
                        ${order.userEmail ? `(${order.userEmail})` : ''}
                    </div>
                    <div class="order-meta">
                        <span class="payment-method">${order.paymentMethod || 'cash'}</span>
                        <span class="order-status ${(order.orderStatus || '').toLowerCase()}">${order.orderStatus || 'pending'}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p class="no-data">No orders found for this payment method</p>';

    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Payment Method</h3>
                </div>
                <div class="metric-value">${segmentData.transactionCount} Transactions</div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Success Rate</span>
                        <span>${segmentData.successRate.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${segmentData.successRate}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Revenue</h3>
                </div>
                <div class="metric-value">R${segmentData.totalRevenue.toLocaleString()}</div>
                <div class="metric-trend">
                    ${segmentData.revenuePercentage.toFixed(1)}% of Total • R${segmentData.avgTransaction.toFixed(2)} Avg.
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-info-circle"></i>
                <h3 class="section-title">Payment Method Details</h3>
            </div>
            <div class="section-content">
                <p><strong>Method:</strong> ${segmentData.method === 'paypal' ? 'PayPal' : 'Cash on Delivery'}</p>
                <p><strong>Successful Transactions:</strong> ${segmentData.successCount} out of ${segmentData.transactionCount}</p>
                <p><strong>Average Transaction Value:</strong> R${segmentData.avgTransaction.toFixed(2)}</p>
            </div>
        </div>

        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-receipt"></i>
                <h3 class="section-title">Recent Transactions (${segmentData.orders ? segmentData.orders.length : 0})</h3>
            </div>
            <div class="section-content">
                <div class="orders-list">
                    ${ordersList}
                </div>
            </div>
        </div>
    `;
}



function loadPaymentStatusContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    
    // Create simple customers list - ONLY show customers
    const customersList = segmentData.customers && segmentData.customers.length > 0 ? 
        segmentData.customers.map(customer => {
            // Find orders for this customer with the specific status
            const customerOrders = segmentData.orders.filter(order => 
                (order.customerId === customer.id || order.userId === customer.id)
            );
            
            const failedOrdersCount = customerOrders.length;
            const totalFailedAmount = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            
            return `
                <div class="customer-card">
                    <div class="customer-card-header">
                        <div class="customer-main-info">
                            <h4>${customer.name || customer.displayName || customer.email?.split('@')[0] || 'Unknown Customer'}</h4>
                            <p class="customer-email">${customer.email || 'No email'}</p>
                        </div>
                        <div class="customer-financial-stats">
                            <div class="financial-stat">
                                <span class="stat-value">${failedOrdersCount}</span>
                                <span class="stat-label">Failed Orders</span>
                            </div>
                            <div class="financial-stat">
                                <span class="stat-value">R${totalFailedAmount.toFixed(2)}</span>
                                <span class="stat-label">Total Amount</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="customer-card-body">
                        <div class="customer-meta-info">
                            <div class="meta-item">
                                <i class="fas fa-calendar-plus"></i>
                                <span>Joined: ${customer.createdAt ? customer.createdAt.toLocaleDateString() : 'Unknown'}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>Status: ${segmentData.status.charAt(0).toUpperCase() + segmentData.status.slice(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('') : '<div class="no-data-message"><i class="fas fa-users-slash"></i> No customers found with this payment status</div>';

    // SIMPLE layout - only show customers
    summaryTab.innerHTML = `
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-users"></i>
                <h3 class="section-title">Customers with ${segmentData.status.charAt(0).toUpperCase() + segmentData.status.slice(1)} Payments</h3>
                <span class="section-badge">${segmentData.customers ? segmentData.customers.length : 0} customers</span>
            </div>
            <div class="section-content">
                <div class="customers-grid">
                    ${customersList}
                </div>
            </div>
        </div>
    `;
}


function loadPaymentTimeContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Time Slot</h3>
                </div>
                <div class="metric-value">${segmentData.timeSlot}</div>
                <div class="metric-trend">
                    ${segmentData.orderCount} Orders
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Revenue</h3>
                </div>
                <div class="metric-value">R${segmentData.totalRevenue.toLocaleString()}</div>
                <div class="metric-trend">
                    R${segmentData.avgOrderValue.toFixed(2)} Avg. Order
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-info-circle"></i>
                <h3 class="section-title">Time Analysis</h3>
            </div>
            <div class="section-content">
                <p><strong>Peak Performance:</strong> ${segmentData.timeSlot.includes('Morning') ? 'Early business hours' : segmentData.timeSlot.includes('Afternoon') ? 'Lunch and afternoon' : segmentData.timeSlot.includes('Evening') ? 'Evening shopping' : 'Late night'}</p>
                <p><strong>Customer Behavior:</strong> ${segmentData.avgOrderValue > 500 ? 'High-value purchases' : 'Regular shopping patterns'}</p>
            </div>
        </div>
    `;
}

// Add similar content loading functions for other chart types...
function loadCustomerAcquisitionContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    
    const customersList = segmentData.customers && segmentData.customers.length > 0 ? 
        segmentData.customers.map(customer => `
            <div class="customer-item">
                <div class="customer-header">
                    <div class="customer-info">
                        <h4>${customer.name || customer.displayName || customer.email?.split('@')[0] || 'Unknown Customer'}</h4>
                        <p class="customer-email">${customer.email || 'No email'}</p>
                    </div>
                    <div class="customer-stats">
                        <span class="signup-date">Joined: ${customer.createdAt ? customer.createdAt.toLocaleDateString() : 'Unknown'}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p class="no-data">No customers found for this period</p>';

    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">New Customers</h3>
                </div>
                <div class="metric-value">${segmentData.newCustomers}</div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Activation Rate</span>
                        <span>${segmentData.activationRate.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${segmentData.activationRate}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-info-circle"></i>
                <h3 class="section-title">Acquisition Period</h3>
            </div>
            <div class="section-content">
                <p><strong>Period:</strong> ${segmentData.period}</p>
                <p><strong>Date Range:</strong> ${segmentData.dateRange}</p>
                <p><strong>Activated Customers:</strong> ${segmentData.activatedCustomers} out of ${segmentData.newCustomers}</p>
            </div>
        </div>

        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-users"></i>
                <h3 class="section-title">New Customers (${segmentData.customers ? segmentData.customers.length : 0})</h3>
            </div>
            <div class="section-content">
                <div class="customers-list">
                    ${customersList}
                </div>
            </div>
        </div>
    `;
}

function loadCustomerCategoryContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Category Spending</h3>
                </div>
                <div class="metric-value">${segmentData.category}</div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Revenue Share</span>
                        <span>${segmentData.revenuePercentage.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${segmentData.revenuePercentage}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Financials</h3>
                </div>
                <div class="metric-value">R${segmentData.totalSpent.toLocaleString()}</div>
                <div class="metric-trend">
                    R${segmentData.estimatedProfit.toLocaleString()} Estimated Profit
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-info-circle"></i>
                <h3 class="section-title">Category Analysis</h3>
            </div>
            <div class="section-content">
                <p><strong>Customer Count:</strong> ${segmentData.customerCount}</p>
                <p><strong>Order Count:</strong> ${segmentData.orderCount}</p>
                <p><strong>Average Order Value:</strong> R${segmentData.avgOrderValue.toFixed(2)}</p>
                <p><strong>Customers per Order:</strong> ${segmentData.customersPerOrder.toFixed(2)}</p>
            </div>
        </div>
    `;
}

function loadCategoryContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Category Performance</h3>
                </div>
                <div class="metric-value">${segmentData.category}</div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Revenue Share</span>
                        <span>${segmentData.revenuePercentage.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${segmentData.revenuePercentage}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Financials</h3>
                </div>
                <div class="metric-value">R${segmentData.totalRevenue.toLocaleString()}</div>
                <div class="metric-trend">
                    R${segmentData.estimatedProfit.toLocaleString()} Estimated Profit
                </div>
            </div>
        </div>
    `;
}

function loadProductContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Product Performance</h3>
                </div>
                <div class="metric-value">${segmentData.product}</div>
                <div class="progress-container">
                    <div class="progress-label">
                        <span>Conversion Rate</span>
                        <span>${segmentData.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(segmentData.conversionRate, 100)}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Sales</h3>
                </div>
                <div class="metric-value">${segmentData.unitsSold} Units</div>
                <div class="metric-trend">
                    R${segmentData.totalRevenue.toLocaleString()} Revenue
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-info-circle"></i>
                <h3 class="section-title">Product Details</h3>
            </div>
            <div class="section-content">
                <p><strong>Category:</strong> ${segmentData.category}</p>
                <p><strong>Stock Level:</strong> ${segmentData.stock} units</p>
                <p><strong>Stock Coverage:</strong> ${segmentData.stockCoverage.toFixed(1)}%</p>
                <p><strong>Average Price:</strong> R${segmentData.avgPrice.toFixed(2)}</p>
            </div>
        </div>
    `;
}


function loadCustomerContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    
    const ordersList = segmentData.orders && segmentData.orders.length > 0 ? 
        segmentData.orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <strong>Order #${order.id || 'N/A'}</strong>
                    <span class="order-amount">R${(order.total || 0).toFixed(2)}</span>
                </div>
                <div class="order-details">
                    <div class="order-meta">
                        <span class="order-date">${order.createdAt.toLocaleDateString()}</span>
                        <span class="order-status ${(order.orderStatus || '').toLowerCase()}">${order.orderStatus || 'pending'}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p class="no-data">No orders found for this customer</p>';

    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Customer Profile</h3>
                </div>
                <div class="metric-value">${segmentData.customer}</div>
                <div class="metric-trend">
                    ${segmentData.totalOrders} Total Orders
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Lifetime Value</h3>
                </div>
                <div class="metric-value">R${segmentData.totalSpent.toLocaleString()}</div>
                <div class="metric-trend">
                    R${segmentData.avgOrderValue.toFixed(2)} Avg. Order
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-info-circle"></i>
                <h3 class="section-title">Customer Details</h3>
            </div>
            <div class="section-content">
                <p><strong>Email:</strong> ${segmentData.email}</p>
                <p><strong>First Purchase:</strong> ${segmentData.firstPurchase ? segmentData.firstPurchase.toLocaleDateString() : 'N/A'}</p>
                <p><strong>Last Purchase:</strong> ${segmentData.lastPurchase ? segmentData.lastPurchase.toLocaleDateString() : 'N/A'}</p>
                <p><strong>Days Since Last Purchase:</strong> ${segmentData.daysSinceLastPurchase || 'N/A'}</p>
                <p><strong>Purchase Frequency:</strong> ${segmentData.purchaseFrequency ? segmentData.purchaseFrequency.toFixed(2) : 'N/A'} per month</p>
            </div>
        </div>

        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-receipt"></i>
                <h3 class="section-title">Order History (${segmentData.orders ? segmentData.orders.length : 0})</h3>
            </div>
            <div class="section-content">
                <div class="orders-list">
                    ${ordersList}
                </div>
            </div>
        </div>
    `;
}


function loadOrderSummaryContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Total Orders</h3>
                    <span class="metric-trend ${segmentData.orderTrend >= 0 ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-arrow-${segmentData.orderTrend >= 0 ? 'up' : 'down'}"></i> ${Math.abs(segmentData.orderTrend).toFixed(1)}%
                    </span>
                </div>
                <div class="metric-value">${segmentData.totalOrders}</div>
                <div class="metric-trend">
                    ${segmentData.avgDailyOrders} Average Daily Orders
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Peak Performance</h3>
                </div>
                <div class="metric-value">${segmentData.peakOrderDay}</div>
                <div class="metric-trend">
                    Highest Order Volume Day
                </div>
            </div>
        </div>
    `;
}

function loadRevenueSummaryContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Total Revenue</h3>
                    <span class="metric-trend ${segmentData.revenueTrend >= 0 ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-arrow-${segmentData.revenueTrend >= 0 ? 'up' : 'down'}"></i> ${Math.abs(segmentData.revenueTrend).toFixed(1)}%
                    </span>
                </div>
                <div class="metric-value">R${segmentData.totalRevenue.toLocaleString()}</div>
                <div class="metric-trend">
                    R${segmentData.avgDailyRevenue.toFixed(2)} Average Daily Revenue
                </div>
            </div>
        </div>
    `;
}

function loadProductsSummaryContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Products Sold</h3>
                </div>
                <div class="metric-value">${segmentData.totalProducts}</div>
                <div class="metric-trend">
                    ${segmentData.avgProductsPerOrder} Average per Order
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-header">
                    <h3 class="metric-title">Inventory Efficiency</h3>
                </div>
                <div class="metric-value">${segmentData.inventoryTurnover}x</div>
                <div class="metric-trend">
                    Inventory Turnover Ratio
                </div>
            </div>
        </div>
    `;
}

function loadDefaultContent(modal, segmentData, fullData) {
    const summaryTab = modal.querySelector('#summary-tab');
    summaryTab.innerHTML = `
        <div class="metric-grid">
            <div class="metric-card highlight">
                <div class="metric-header">
                    <h3 class="metric-title">Data Analysis</h3>
                </div>
                <div class="metric-value">Detailed View</div>
                <div class="metric-trend">
                    Click on chart elements to view detailed information
                </div>
            </div>
        </div>
        
        <div class="insight-section">
            <div class="section-header">
                <i class="fas fa-info-circle"></i>
                <h3 class="section-title">Information</h3>
            </div>
            <div class="section-content">
                <p>This drill-down provides comprehensive analysis of the selected data segment. Use the tabs above to explore different aspects of the data including financial impact, performance metrics, and actionable recommendations.</p>
            </div>
        </div>
    `;
}

// Helper functions for enhanced calculations
function getCustomersBySegment(segment) {
    const { currentCustomers, currentOrders } = window;
    
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

function calculateSegmentRetention(customers, orders) {
    const periodMonths = 3;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - periodMonths);
    
    const activeCustomers = customers.filter(customer => {
        const customerOrders = orders.filter(order => 
            (order.customerId === customer.id || order.userId === customer.id) &&
            order.createdAt >= cutoffDate
        );
        return customerOrders.length > 0;
    });
    
    return customers.length > 0 ? Math.round((activeCustomers.length / customers.length) * 100) : 0;
}

function calculateAverageCLV(customers, clvData) {
    const totalCLV = customers.reduce((sum, customer) => sum + (clvData[customer.id] || 0), 0);
    return customers.length > 0 ? Math.round(totalCLV / customers.length) : 0;
}

function calculatePurchaseFrequency(customers, orders) {
    const totalOrders = customers.reduce((sum, customer) => {
        const customerOrders = orders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        return sum + customerOrders.length;
    }, 0);
    
    return customers.length > 0 ? (totalOrders / customers.length).toFixed(1) : 0;
}

function calculateDaysSinceLastPurchase(customers, orders) {
    const now = new Date();
    const totalDays = customers.reduce((sum, customer) => {
        const customerOrders = orders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        
        if (customerOrders.length === 0) return sum + 999; // Large number for no purchases
        
        const lastOrder = customerOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const daysSince = Math.floor((now - new Date(lastOrder.createdAt)) / (1000 * 60 * 60 * 24));
        return sum + daysSince;
    }, 0);
    
    return customers.length > 0 ? Math.round(totalDays / customers.length) : 0;
}

function closeCurrentModal() {
    if (currentModal) {
        currentModal.remove();
        currentModal = null;
    }
}

export { closeCurrentModal as closeChartPopup };
