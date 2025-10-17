import { domElements } from './main.js';
import { showError, showSuccess, escapeHtml, calculatePercentage } from './utils.js';
import { getSpendingRange } from './calculations.js';

export function initExports() {
    // Export initialization if needed
}

export function handleExport(event) {
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

export function exportSalesReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showError("PDF export library not loaded");
        return;
    }

    const doc = new jsPDF();
    let yPosition = 15;

    // Add title and header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text("AMACUSI FARMING - SALES REPORT", 105, yPosition, { align: "center" });
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const { startDateInput, endDateInput } = domElements;
    const dateRange = `${startDateInput.value} to ${endDateInput.value}`;
    doc.text(`Report Period: ${dateRange}`, 105, yPosition, { align: "center" });
    yPosition += 15;

    doc.setTextColor(76, 175, 80);
    doc.setFontSize(16);
    doc.text("EXECUTIVE SUMMARY", 14, yPosition);
    yPosition += 10;

    // Summary table with enhanced data
    const { totalOrdersEl, totalRevenueEl, totalProductsSoldEl, totalCustomersEl } = domElements;
    const totalOrders = parseInt(totalOrdersEl.textContent) || 0;
    const totalRevenue = parseFloat(totalRevenueEl.textContent.replace('R', '').replace(',', '')) || 0;
    const totalProducts = parseInt(totalProductsSoldEl.textContent) || 0;
    const totalCustomers = parseInt(totalCustomersEl.textContent) || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const summaryData = [
        ["Total Orders", totalOrders.toLocaleString()],
        ["Total Revenue", `R${totalRevenue.toFixed(2)}`],
        ["Products Sold", totalProducts.toLocaleString()],
        ["Active Customers", totalCustomers.toLocaleString()],
        ["Average Order Value", `R${avgOrderValue.toFixed(2)}`],
        ["Date Range", dateRange],
        ["Report Generated", new Date().toLocaleDateString()]
    ];
    
    doc.autoTable({
        head: [['Metric', 'Value']],
        body: summaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: {
            fillColor: [76, 175, 80],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 10,
            cellPadding: 5,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Sales Trends Section
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("SALES TRENDS ANALYSIS", 14, yPosition);
    yPosition += 8;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text("Daily revenue and order patterns showing business performance over time", 14, yPosition);
    yPosition += 10;

    // Top Products Section
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("TOP PERFORMING PRODUCTS", 14, yPosition);
    yPosition += 8;

    const topProductsTable = document.getElementById("topProductsTable");
    if (topProductsTable) {
        doc.autoTable({
            html: topProductsTable,
            startY: yPosition,
            theme: "grid",
            headStyles: {
                fillColor: [54, 162, 235],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
    }

    // Category Performance
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("CATEGORY PERFORMANCE", 14, yPosition);
    yPosition += 8;

    // Get category data from chart
    const salesByCategoryChart = window.salesByCategoryChart;
    if (salesByCategoryChart && salesByCategoryChart.data && salesByCategoryChart.data.labels) {
        const categoryData = salesByCategoryChart.data.labels.map((label, index) => [
            label,
            `R${salesByCategoryChart.data.datasets[0].data[index].toFixed(2)}`,
            `${calculatePercentage(salesByCategoryChart.data.datasets[0].data[index], salesByCategoryChart.data.datasets[0].data)}%`
        ]);

        doc.autoTable({
            head: [['Category', 'Revenue', 'Market Share']],
            body: categoryData,
            startY: yPosition,
            theme: "grid",
            headStyles: {
                fillColor: [153, 102, 255],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
            }
        });
        yPosition = doc.lastAutoTable.finalY + 10;
    }

    // Customer Insights
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("CUSTOMER INSIGHTS", 14, yPosition);
    yPosition += 8;

    const customerTypeChart = window.customerTypeChart;
    if (customerTypeChart && customerTypeChart.data) {
        const customerTypeData = customerTypeChart.data.labels.map((label, index) => [
            label,
            customerTypeChart.data.datasets[0].data[index],
            `${calculatePercentage(customerTypeChart.data.datasets[0].data[index], customerTypeChart.data.datasets[0].data)}%`
        ]);

        doc.autoTable({
            head: [['Customer Type', 'Orders', 'Distribution']],
            body: customerTypeData,
            startY: yPosition,
            theme: "grid",
            headStyles: {
                fillColor: [255, 159, 64],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
            }
        });
    }

    // Add footer with timestamp
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
        doc.text("Amacusi Farming - Confidential Business Report", 105, 293, { align: "center" });
    }

    // Save the PDF
    doc.save(`amacusi-sales-report-${new Date().toISOString().split("T")[0]}.pdf`);
    showSuccess("Sales report exported successfully!");
}

export function exportPaymentReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showError("PDF export library not loaded");
        return;
    }

    const doc = new jsPDF();
    let yPosition = 15;

    // Add title and header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text("AMACUSI FARMING - PAYMENT REPORT", 105, yPosition, { align: "center" });
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const { startDateInput, endDateInput } = domElements;
    const dateRange = `${startDateInput.value} to ${endDateInput.value}`;
    doc.text(`Report Period: ${dateRange}`, 105, yPosition, { align: "center" });
    yPosition += 15;

    // Executive Summary
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(16);
    doc.text("PAYMENT OVERVIEW", 14, yPosition);
    yPosition += 10;

    const { totalOrdersEl, totalRevenueEl } = domElements;
    const totalOrders = parseInt(totalOrdersEl.textContent) || 0;
    const totalRevenue = parseFloat(totalRevenueEl.textContent.replace('R', '').replace(',', '')) || 0;

    const paymentSummaryData = [
        ["Total Transactions", totalOrders.toLocaleString()],
        ["Total Processed", `R${totalRevenue.toFixed(2)}`],
        ["Date Range", dateRange],
        ["Report Generated", new Date().toLocaleDateString()]
    ];
    
    doc.autoTable({
        head: [['Metric', 'Value']],
        body: paymentSummaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: {
            fillColor: [54, 162, 235],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 10,
            cellPadding: 5,
        }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Payment Method Analysis
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("PAYMENT METHOD ANALYSIS", 14, yPosition);
    yPosition += 8;

    const paymentDetailsTable = document.getElementById("paymentDetailsTable");
    doc.autoTable({
        html: paymentDetailsTable,
        startY: yPosition,
        theme: "grid",
        headStyles: {
            fillColor: [76, 175, 80],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 9,
            cellPadding: 4,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Payment Success Rates
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("PAYMENT SUCCESS ANALYSIS", 14, yPosition);
    yPosition += 8;

    const paymentSuccessChart = window.paymentSuccessChart;
    if (paymentSuccessChart && paymentSuccessChart.data) {
        const successData = paymentSuccessChart.data.labels.map((label, index) => [
            label,
            paymentSuccessChart.data.datasets[0].data[index],
            `${calculatePercentage(paymentSuccessChart.data.datasets[0].data[index], paymentSuccessChart.data.datasets[0].data)}%`
        ]);

        doc.autoTable({
            head: [['Status', 'Count', 'Percentage']],
            body: successData,
            startY: yPosition,
            theme: "grid",
            headStyles: {
                fillColor: [255, 159, 64],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
            }
        });
    }

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
        doc.text("Amacusi Farming - Confidential Business Report", 105, 293, { align: "center" });
    }

    doc.save(`amacusi-payment-report-${new Date().toISOString().split("T")[0]}.pdf`);
    showSuccess("Payment report exported successfully!");
}

export function exportProductReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showError("PDF export library not loaded");
        return;
    }

    const doc = new jsPDF();
    let yPosition = 15;

    // Add title and header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text("AMACUSI FARMING - PRODUCT PERFORMANCE REPORT", 105, yPosition, { align: "center" });
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const { startDateInput, endDateInput } = domElements;
    const dateRange = `${startDateInput.value} to ${endDateInput.value}`;
    doc.text(`Report Period: ${dateRange}`, 105, yPosition, { align: "center" });
    yPosition += 15;

    // Executive Summary
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(16);
    doc.text("PRODUCT PERFORMANCE OVERVIEW", 14, yPosition);
    yPosition += 10;

    const { totalProductsSoldEl, totalRevenueEl } = domElements;
    const totalProductsSold = parseInt(totalProductsSoldEl.textContent) || 0;
    const totalRevenue = parseFloat(totalRevenueEl.textContent.replace('R', '').replace(',', '')) || 0;

    const productSummaryData = [
        ["Total Products Sold", totalProductsSold.toLocaleString()],
        ["Total Revenue", `R${totalRevenue.toFixed(2)}`],
        ["Average Product Value", `R${(totalRevenue / totalProductsSold || 0).toFixed(2)}`],
        ["Date Range", dateRange],
        ["Report Generated", new Date().toLocaleDateString()]
    ];
    
    doc.autoTable({
        head: [['Metric', 'Value']],
        body: productSummaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: {
            fillColor: [255, 159, 64],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 10,
            cellPadding: 5,
        }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Product Performance Details
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("PRODUCT PERFORMANCE DETAILS", 14, yPosition);
    yPosition += 8;

    const productPerformanceTable = document.getElementById("productPerformanceTable");
    doc.autoTable({
        html: productPerformanceTable,
        startY: yPosition,
        theme: "grid",
        headStyles: {
            fillColor: [153, 102, 255],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        }
    });

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
        doc.text("Amacusi Farming - Confidential Business Report", 105, 293, { align: "center" });
    }

    doc.save(`amacusi-product-report-${new Date().toISOString().split("T")[0]}.pdf`);
    showSuccess("Product report exported successfully!");
}

export function exportCustomerReport() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showError("PDF export library not loaded");
        return;
    }

    const doc = new jsPDF();
    let yPosition = 15;

    // Add title and header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text("AMACUSI FARMING - CUSTOMER INSIGHTS REPORT", 105, yPosition, { align: "center" });
    yPosition += 10;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const { startDateInput, endDateInput } = domElements;
    const dateRange = `${startDateInput.value} to ${endDateInput.value}`;
    doc.text(`Report Period: ${dateRange}`, 105, yPosition, { align: "center" });
    yPosition += 15;

    // Executive Summary
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(16);
    doc.text("CUSTOMER OVERVIEW", 14, yPosition);
    yPosition += 10;

    const { totalCustomersEl, totalRevenueEl, totalOrdersEl } = domElements;
    const totalCustomers = parseInt(totalCustomersEl.textContent) || 0;
    const totalRevenue = parseFloat(totalRevenueEl.textContent.replace('R', '').replace(',', '')) || 0;
    const totalOrders = parseInt(totalOrdersEl.textContent) || 0;

    const customerSummaryData = [
        ["Active Customers", totalCustomers.toLocaleString()],
        ["Total Orders", totalOrders.toLocaleString()],
        ["Total Revenue", `R${totalRevenue.toFixed(2)}`],
        ["Average Customer Value", `R${(totalRevenue / totalCustomers || 0).toFixed(2)}`],
        ["Date Range", dateRange],
        ["Report Generated", new Date().toLocaleDateString()]
    ];
    
    doc.autoTable({
        head: [['Metric', 'Value']],
        body: customerSummaryData,
        startY: yPosition,
        theme: "grid",
        headStyles: {
            fillColor: [153, 102, 255],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 10,
            cellPadding: 5,
        }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Top Customers
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("TOP CUSTOMERS", 14, yPosition);
    yPosition += 8;

    const topCustomersTable = document.getElementById("topCustomersTable");
    doc.autoTable({
        html: topCustomersTable,
        startY: yPosition,
        theme: "grid",
        headStyles: {
            fillColor: [76, 175, 80],
            textColor: 255,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        }
    });

    yPosition = doc.lastAutoTable.finalY + 15;

    // Customer Value Segmentation
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(14);
    doc.text("CUSTOMER VALUE SEGMENTATION", 14, yPosition);
    yPosition += 8;

    const customerValueSegmentationChart = window.customerValueSegmentationChart;
    if (customerValueSegmentationChart && customerValueSegmentationChart.data) {
        const segmentData = customerValueSegmentationChart.data.labels.map((label, index) => [
            label,
            customerValueSegmentationChart.data.datasets[0].data[index],
            `${calculatePercentage(customerValueSegmentationChart.data.datasets[0].data[index], customerValueSegmentationChart.data.datasets[0].data)}%`,
            getSpendingRange(label)
        ]);

        doc.autoTable({
            head: [['Segment', 'Customers', 'Percentage', 'Spending Range']],
            body: segmentData,
            startY: yPosition,
            theme: "grid",
            headStyles: {
                fillColor: [54, 162, 235],
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
            }
        });
    }

    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated on ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
        doc.text("Amacusi Farming - Confidential Business Report", 105, 293, { align: "center" });
    }

    doc.save(`amacusi-customer-report-${new Date().toISOString().split("T")[0]}.pdf`);
    showSuccess("Customer report exported successfully!");
}
