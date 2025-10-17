
export function calculateSalesTrend(orders) {
    const dailySales = {};

    orders.forEach((order) => {
        const date = order.createdAt.toISOString().split("T")[0];
        if (!dailySales[date]) {
            dailySales[date] = {
                date: date,
                total: 0,
                count: 0,
                orders: [],
                customers: new Set()
            };
        }

        dailySales[date].total += order.total || 0;
        dailySales[date].count++;
        dailySales[date].orders.push(order);
        if (order.userId || order.customerId) {
            dailySales[date].customers.add(order.userId || order.customerId);
        }
    });

    return Object.values(dailySales).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
    );
}

export function calculateSalesByCategory(orders, products) {
    const categorySales = {};
    
    orders.forEach(order => {
        order.items?.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product?.category) {
                if (!categorySales[product.category]) {
                    categorySales[product.category] = {
                        total: 0,
                        orders: [],
                        products: new Set(),
                        customers: new Set()
                    };
                }
                const itemTotal = (item.price || 0) * (item.quantity || 0);
                categorySales[product.category].total += itemTotal;
                categorySales[product.category].orders.push(order);
                categorySales[product.category].products.add(product.id);
                if (order.userId || order.customerId) {
                    categorySales[product.category].customers.add(order.userId || order.customerId);
                }
            }
        });
    });
    
    return Object.entries(categorySales).map(([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        total: data.total,
        orders: data.orders,
        productCount: data.products.size,
        customerCount: data.customers.size
    })).sort((a, b) => b.total - a.total);
}

export function calculateCustomerType(orders) {
    const customerTypes = {
        bulk: { count: 0, total: 0, orders: [], customers: new Set() },
        regular: { count: 0, total: 0, orders: [], customers: new Set() },
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
        customerTypes[type].orders.push(order);
        if (order.userId || order.customerId) {
            customerTypes[type].customers.add(order.userId || order.customerId);
        }
    });

    // Convert Sets to Arrays for easier handling
    customerTypes.bulk.customers = Array.from(customerTypes.bulk.customers);
    customerTypes.regular.customers = Array.from(customerTypes.regular.customers);

    return customerTypes;
}

export function calculateTopProducts(orders, products, limit = 10) {
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
                        revenue: 0,
                        orders: [],
                        customers: new Set()
                    };
                }
                productSales[product.id].quantity += item.quantity || 0;
                productSales[product.id].revenue += (item.price || 0) * (item.quantity || 0);
                productSales[product.id].orders.push(order);
                if (order.userId || order.customerId) {
                    productSales[product.id].customers.add(order.userId || order.customerId);
                }
            }
        });
    });
    
    const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    
    const totalRevenue = sortedProducts.reduce((sum, product) => sum + product.revenue, 0);
    
    return sortedProducts.map(product => ({
        ...product,
        percentage: totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0,
        customerCount: product.customers.size
    }));
}

export function calculatePaymentMethods(orders) {
    const paymentMethods = {};

    orders.forEach((order) => {
        const method = order.paymentMethod || "cash";
        
        if (!paymentMethods[method]) {
            paymentMethods[method] = {
                method: method,
                count: 0,
                success: 0,
                total: 0,
                orders: [],
                customers: new Set()
            };
        }

        paymentMethods[method].count++;
        paymentMethods[method].total += order.total || 0;
        paymentMethods[method].orders.push(order);
        if (order.userId || order.customerId) {
            paymentMethods[method].customers.add(order.userId || order.customerId);
        }

        // Enhanced payment success detection
        const isSuccess = order.orderStatus === 'delivered' || 
                         order.orderStatus === 'completed' || 
                         order.paymentStatus === 'paid' || 
                         order.paymentStatus === 'completed' ||
                         (method === 'cash' && order.orderStatus !== 'cancelled');
        
        if (isSuccess) {
            paymentMethods[method].success++;
        }
    });

    // Convert Sets to Arrays
    Object.values(paymentMethods).forEach(method => {
        method.customers = Array.from(method.customers);
    });

    return Object.values(paymentMethods);
}

export function calculatePaymentSuccess(orders) {
    let success = 0,
        failed = 0,
        pending = 0;
    
    const successOrders = [];
    const failedOrders = [];
    const pendingOrders = [];

    orders.forEach((order) => {
        if (order.orderStatus === 'delivered' || order.orderStatus === 'completed' || 
            order.paymentStatus === 'paid' || order.paymentStatus === 'completed') {
            success++;
            successOrders.push(order);
        } else if (order.orderStatus === 'cancelled' || 
                   order.paymentStatus === 'failed' || 
                   order.paymentStatus === 'cancelled') {
            failed++;
            failedOrders.push(order);
        } else {
            pending++;
            pendingOrders.push(order);
        }
    });

    return { 
        success, 
        failed, 
        pending,
        successOrders,
        failedOrders,
        pendingOrders
    };
}

export function calculatePaymentByTime(orders) {
    const timeSlots = {
        "Morning (6am-12pm)": { count: 0, orders: [], customers: new Set() },
        "Afternoon (12pm-6pm)": { count: 0, orders: [], customers: new Set() },
        "Evening (6pm-12am)": { count: 0, orders: [], customers: new Set() },
        "Night (12am-6am)": { count: 0, orders: [], customers: new Set() },
    };

    orders.forEach((order) => {
        const hour = order.createdAt.getHours();
        let timeSlot;

        if (hour >= 6 && hour < 12) timeSlot = "Morning (6am-12pm)";
        else if (hour >= 12 && hour < 18) timeSlot = "Afternoon (12pm-6pm)";
        else if (hour >= 18 && hour < 24) timeSlot = "Evening (6pm-12am)";
        else timeSlot = "Night (12am-6am)";

        timeSlots[timeSlot].count++;
        timeSlots[timeSlot].orders.push(order);
        if (order.userId || order.customerId) {
            timeSlots[timeSlot].customers.add(order.userId || order.customerId);
        }
    });

    // Convert Sets to Arrays
    Object.values(timeSlots).forEach(slot => {
        slot.customers = Array.from(slot.customers);
    });

    return timeSlots;
}

export function calculateProductPerformance(orders, products) {
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
            price: product.price || 0,
            status: product.status || 'active',
            orders: [],
            customers: new Set()
        };
    });
    
    // Calculate sales data
    orders.forEach(order => {
        order.items?.forEach(item => {
            if (productStats[item.id]) {
                productStats[item.id].sold += item.quantity || 0;
                productStats[item.id].revenue += (item.price || 0) * (item.quantity || 0);
                productStats[item.id].orders.push(order);
                if (order.userId || order.customerId) {
                    productStats[item.id].customers.add(order.userId || order.customerId);
                }
            }
        });
    });
    
    // Calculate conversion rates and profitability
    Object.values(productStats).forEach(product => {
        const estimatedViews = product.sold > 0 ? product.sold / 0.05 : 100;
        product.views = estimatedViews;
        product.conversion = product.views > 0 ? (product.sold / product.views) * 100 : 0;
        product.estimatedProfit = product.revenue * 0.4;
        product.profitMargin = product.revenue > 0 ? (product.estimatedProfit / product.revenue) * 100 : 0;
        product.customerCount = product.customers.size;
    });
    
    return Object.values(productStats)
        .filter(product => product.sold > 0 || product.status === 'active')
        .sort((a, b) => b.revenue - a.revenue);
}

export function calculateCustomerData(orders, customers) {
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
            
            let customerName = 'Unknown Customer';
            
            if (order.userName) {
                customerName = order.userName;
            } else if (customer) {
                customerName = customer.name || 
                              customer.displayName || 
                              customer.fullName || 
                              (customer.firstName && customer.lastName ? `${customer.firstName} ${customer.lastName}` : null) ||
                              'Unknown Customer';
            }
            
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
                orderHistory: [],
                lastPurchase: null,
                firstPurchase: null,
                signupDate: customer?.createdAt || order.createdAt
            };
        }
        
        if (customerId && customerStats[customerId]) {
            customerStats[customerId].orders++;
            customerStats[customerId].totalSpent += order.total || 0;
            customerStats[customerId].orderHistory.push(order);
            
            const orderDate = order.createdAt;
            if (!customerStats[customerId].lastPurchase || orderDate > customerStats[customerId].lastPurchase) {
                customerStats[customerId].lastPurchase = orderDate;
            }
            if (!customerStats[customerId].firstPurchase || orderDate < customerStats[customerId].firstPurchase) {
                customerStats[customerId].firstPurchase = orderDate;
            }
        }
    });
    
    // Calculate average order value and customer metrics
    Object.values(customerStats).forEach(customer => {
        customer.avgOrder = customer.orders > 0 ? customer.totalSpent / customer.orders : 0;
        
        if (customer.lastPurchase) {
            customer.daysSinceLastPurchase = Math.floor((new Date() - customer.lastPurchase) / (1000 * 60 * 60 * 24));
        }
        
        if (customer.daysSinceLastPurchase <= 30) {
            customer.status = 'Active';
        } else if (customer.daysSinceLastPurchase <= 90) {
            customer.status = 'At Risk';
        } else {
            customer.status = 'Inactive';
        }
    });
    
    return Object.values(customerStats)
        .filter(customer => customer.orders > 0)
        .sort((a, b) => b.totalSpent - a.totalSpent);
}

export function calculateCustomerAcquisition(customers) {
    const monthlyAcquisition = {};
    
    customers.forEach(customer => {
        let createdAt;
        if (customer.createdAt && typeof customer.createdAt.toDate === 'function') {
            createdAt = customer.createdAt.toDate();
        } else if (customer.createdAt instanceof Date) {
            createdAt = customer.createdAt;
        } else {
            return;
        }
        
        const monthYear = createdAt.toISOString().substring(0, 7);
        if (!monthlyAcquisition[monthYear]) {
            monthlyAcquisition[monthYear] = {
                count: 0,
                customers: []
            };
        }
        monthlyAcquisition[monthYear].count++;
        monthlyAcquisition[monthYear].customers.push(customer);
    });
    
    return Object.entries(monthlyAcquisition)
        .map(([month, data]) => ({
            month,
            count: data.count,
            customers: data.customers
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateCustomerSegments(customerData) {
    const segments = {
        "High Value": { count: 0, definition: "Customers who have spent more than R1000 total", customers: [] },
        "Medium Value": { count: 0, definition: "Customers who have spent between R500 and R1000 total", customers: [] },
        "Low Value": { count: 0, definition: "Customers who have spent less than R500 total", customers: [] },
        "New/Inactive": { count: 0, definition: "Customers with no orders yet", customers: [] },
    };

    customerData.forEach((customer) => {
        if (customer.orders === 0) {
            segments["New/Inactive"].count++;
            segments["New/Inactive"].customers.push(customer);
        } else if (customer.totalSpent > 1000) {
            segments["High Value"].count++;
            segments["High Value"].customers.push(customer);
        } else if (customer.totalSpent > 500) {
            segments["Medium Value"].count++;
            segments["Medium Value"].customers.push(customer);
        } else {
            segments["Low Value"].count++;
            segments["Low Value"].customers.push(customer);
        }
    });

    return Object.entries(segments).map(([segment, data]) => ({
        segment,
        count: data.count,
        definition: data.definition,
        customers: data.customers,
        spendingRange: getSpendingRange(segment)
    }));
}

export function getSpendingRange(segment) {
    switch(segment) {
        case "High Value": return "> R1000";
        case "Medium Value": return "R500 - R1000";
        case "Low Value": return "< R500";
        case "New/Inactive": return "No orders";
        default: return "";
    }
}

export function calculateCustomerCategorySpending(orders, products) {
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
                        customerCount: new Set(),
                        unitsSold: 0,
                        orders: []
                    };
                }
                
                categorySpending[category].totalSpent += amount;
                categorySpending[category].customerCount.add(order.customerId || order.userId);
                categorySpending[category].unitsSold += item.quantity || 0;
                categorySpending[category].orders.push(order);
            }
        });
        
        Object.keys(categorySpending).forEach(category => {
            categorySpending[category].orderCount++;
        });
    });
    
    const totalRevenue = Object.values(categorySpending).reduce((sum, cat) => sum + cat.totalSpent, 0);
    
    return Object.values(categorySpending).map(cat => ({
        ...cat,
        customerCount: cat.customerCount.size,
        averageOrderValue: cat.orderCount > 0 ? cat.totalSpent / cat.orderCount : 0,
        percentageOfRevenue: totalRevenue > 0 ? (cat.totalSpent / totalRevenue) * 100 : 0,
        estimatedProfit: cat.totalSpent * 0.4,
        profitMargin: 40,
        crossSellOpportunity: calculateCrossSellOpportunity(cat, categorySpending)
    })).sort((a, b) => b.totalSpent - a.totalSpent);
}

// New Business Metrics Calculations
export function calculateAOVTrend(orders) {
    if (orders.length === 0) return { current: 0, trend: 0, history: [] };
    
    const weeklyAOV = {};
    orders.forEach(order => {
        const week = getWeekNumber(order.createdAt);
        if (!weeklyAOV[week]) {
            weeklyAOV[week] = { total: 0, count: 0 };
        }
        weeklyAOV[week].total += order.total || 0;
        weeklyAOV[week].count++;
    });
    
    const weeks = Object.keys(weeklyAOV).sort();
    const history = weeks.map(week => ({
        week,
        aov: weeklyAOV[week].count > 0 ? weeklyAOV[week].total / weeklyAOV[week].count : 0
    }));
    
    const currentAOV = history.length > 0 ? history[history.length - 1].aov : 0;
    const previousAOV = history.length > 1 ? history[history.length - 2].aov : currentAOV;
    const trend = previousAOV > 0 ? ((currentAOV - previousAOV) / previousAOV) * 100 : 0;
    
    return { current: currentAOV, trend, history };
}

export function calculateCLVProjections(customers, orders) {
    const clvData = {};
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    customers.forEach(customer => {
        const customerOrders = orders.filter(order => 
            order.customerId === customer.id || order.userId === customer.id
        );
        
        if (customerOrders.length > 0) {
            const totalSpent = customerOrders.reduce((sum, order) => sum + (order.total || 0), 0);
            const avgOrderValue = totalSpent / customerOrders.length;
            const purchaseFrequency = customerOrders.length / 3;
            
            const projectedCLV = avgOrderValue * purchaseFrequency * 12;
            
            clvData[customer.id] = {
                current: totalSpent,
                projected: projectedCLV,
                growthPotential: projectedCLV - totalSpent,
                segment: getCLVSegment(projectedCLV),
                avgOrderValue: avgOrderValue,
                purchaseFrequency: purchaseFrequency
            };
        }
    });
    
    return clvData;
}

export function calculateRetentionRates(customers, orders) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    let activeCustomers = 0;
    let atRiskCustomers = 0;
    let churnedCustomers = 0;
    
    customers.forEach(customer => {
        const customerOrders = orders.filter(order => 
            (order.customerId === customer.id || order.userId === customer.id) &&
            order.createdAt >= threeMonthsAgo
        );
        
        if (customerOrders.length >= 2) {
            activeCustomers++;
        } else if (customerOrders.length === 1) {
            atRiskCustomers++;
        } else {
            churnedCustomers++;
        }
    });
    
    const total = customers.length;
    return {
        activeRate: (activeCustomers / total) * 100,
        atRiskRate: (atRiskCustomers / total) * 100,
        churnRate: (churnedCustomers / total) * 100,
        activeCustomers,
        atRiskCustomers,
        churnedCustomers
    };
}

export function calculateProfitabilityMetrics(orders, products) {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    const cogs = totalRevenue * 0.6;
    const grossProfit = totalRevenue - cogs;
    const grossMargin = (grossProfit / totalRevenue) * 100;
    
    const operatingExpenses = totalRevenue * 0.2;
    const netProfit = grossProfit - operatingExpenses;
    const netMargin = (netProfit / totalRevenue) * 100;
    
    return {
        totalRevenue,
        cogs,
        grossProfit,
        grossMargin,
        operatingExpenses,
        netProfit,
        netMargin
    };
}

export function calculateCategoryProfitability(orders, products) {
    const categoryData = {};
    
    orders.forEach(order => {
        order.items?.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product?.category) {
                const category = product.category.charAt(0).toUpperCase() + product.category.slice(1);
                if (!categoryData[category]) {
                    categoryData[category] = {
                        revenue: 0,
                        units: 0,
                        estimatedProfit: 0,
                        margin: 0,
                        products: new Set()
                    };
                }
                
                const itemRevenue = (item.price || 0) * (item.quantity || 0);
                const itemCost = itemRevenue * 0.6;
                const itemProfit = itemRevenue - itemCost;
                
                categoryData[category].revenue += itemRevenue;
                categoryData[category].units += item.quantity || 0;
                categoryData[category].estimatedProfit += itemProfit;
                categoryData[category].products.add(product.id);
            }
        });
    });
    
    Object.keys(categoryData).forEach(category => {
        const data = categoryData[category];
        data.margin = data.revenue > 0 ? (data.estimatedProfit / data.revenue) * 100 : 0;
        data.productCount = data.products.size;
        data.avgProductValue = data.units > 0 ? data.revenue / data.units : 0;
    });
    
    return categoryData;
}

export function calculateSeasonalTrends(orders, periodMonths = 12) {
    const monthlyData = {};
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - periodMonths);
    
    orders.filter(order => order.createdAt >= cutoffDate).forEach(order => {
        const monthYear = order.createdAt.toISOString().substring(0, 7);
        
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = {
                revenue: 0,
                orders: 0,
                customers: new Set()
            };
        }
        
        monthlyData[monthYear].revenue += order.total || 0;
        monthlyData[monthYear].orders++;
        monthlyData[monthYear].customers.add(order.customerId || order.userId);
    });
    
    return Object.entries(monthlyData)
        .map(([month, data]) => ({
            month,
            revenue: data.revenue,
            orders: data.orders,
            customers: data.customers.size,
            aov: data.orders > 0 ? data.revenue / data.orders : 0
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

// Helper functions
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
}

function getCLVSegment(clv) {
    if (clv > 5000) return "Premium";
    if (clv > 2000) return "High";
    if (clv > 500) return "Medium";
    return "Low";
}

function calculateCrossSellOpportunity(category, allCategories) {
    const totalCustomers = Object.values(allCategories).reduce((sum, cat) => sum + cat.customerCount, 0);
    const customerPenetration = (category.customerCount / totalCustomers) * 100;
    
    return Math.min(100, customerPenetration * 1.5);
}
