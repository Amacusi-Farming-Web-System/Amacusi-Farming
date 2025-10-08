import { db, COLLECTIONS, ORDER_STATUS } from "./firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ordersList = document.getElementById("orders-list");
const statusFilter = document.getElementById("orderStatusFilter");
const searchInput = document.getElementById("orderSearch");
const cancellationFilter = document.getElementById("cancellationFilter");
const paymentMethodFilter = document.getElementById("paymentMethodFilter");
const deliveryTypeFilter = document.getElementById("deliveryTypeFilter");
const orderDetailsModal = document.getElementById("orderDetailsModal");
const orderDetailsContent = document.getElementById("orderDetailsContent");
const closeDetailsModal = document.getElementById("closeDetailsModal");
const closeDetailsBtn = document.getElementById("closeDetailsBtn");
const printOrderBtn = document.getElementById("printOrderBtn");

let allOrders = [];

// Helper function to capitalize status text
function capitalizeStatus(status) {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Initialize order management
export function initOrderManagement() {
  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        loadOrders();
        setupRealTimeUpdates();
        setupModalEvents();
        setupEventListeners();
      });
    } else {
      loadOrders();
      setupRealTimeUpdates();
      setupModalEvents();
      setupEventListeners();
    }
  } catch (error) {
    console.error("Error initializing order management:", error);
    showError("Failed to initialize order management. Please try again later.");
  }
}

function setupEventListeners() {
  // Safe event listener setup with null checks
  const filters = [
    statusFilter,
    cancellationFilter,
    paymentMethodFilter,
    deliveryTypeFilter,
  ];

  filters.forEach((filter) => {
    if (filter) {
      filter.addEventListener("change", () => applyFilters());
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => applyFilters());
  }
}

function setupModalEvents() {
  if (closeDetailsModal) {
    closeDetailsModal.addEventListener("click", () => {
      if (orderDetailsModal) orderDetailsModal.style.display = "none";
    });
  }

  if (closeDetailsBtn) {
    closeDetailsBtn.addEventListener("click", () => {
      if (orderDetailsModal) orderDetailsModal.style.display = "none";
    });
  }

  if (printOrderBtn) {
    printOrderBtn.addEventListener("click", printOrderDetails);
  }
}

async function loadOrders() {
  try {
    const q = query(
      collection(db, COLLECTIONS.ORDERS),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    allOrders = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: safeConvertToDate(data.createdAt),
        updatedAt: safeConvertToDate(data.updatedAt),
        cancelledByCustomer: isCancelledByCustomer(data),
        cancelledByAdmin: isCancelledByAdmin(data),
        isCancelled: isOrderCancelled(data),
        isPickup: data.isPickup || false,
      };
    });

    applyFilters();
  } catch (error) {
    console.error("Error loading orders:", error);
    showError("Failed to load orders. Please check console for details.");
  }
}

// Helper functions for cancellation detection
function isCancelledByCustomer(orderData) {
  return orderData.statusHistory?.some(
    (entry) => entry.status === "cancelled" && entry.changedBy === "customer"
  );
}

function isCancelledByAdmin(orderData) {
  return orderData.statusHistory?.some(
    (entry) => entry.status === "cancelled" && entry.changedBy === "admin"
  );
}

function isOrderCancelled(orderData) {
  return (
    orderData.status === "cancelled" ||
    orderData.orderStatus === "cancelled" ||
    orderData.statusHistory?.some((entry) => entry.status === "cancelled")
  );
}

function safeConvertToDate(dateValue) {
  try {
    if (!dateValue) return new Date();
    if (typeof dateValue.toDate === "function") return dateValue.toDate();
    if (dateValue instanceof Date) return dateValue;
    return new Date(dateValue);
  } catch (e) {
    console.error("Error converting date:", e);
    return new Date();
  }
}

function setupRealTimeUpdates() {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    orderBy("createdAt", "desc")
  );

  onSnapshot(
    q,
    (snapshot) => {
      allOrders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: safeConvertToDate(data.createdAt),
          updatedAt: safeConvertToDate(data.updatedAt),
          cancelledByCustomer: isCancelledByCustomer(data),
          cancelledByAdmin: isCancelledByAdmin(data),
          isCancelled: isOrderCancelled(data),
          isPickup: data.isPickup || false,
        };
      });
      applyFilters();
    },
    (error) => {
      console.error("Error in real-time listener:", error);
      showError("Error receiving order updates. Please refresh the page.");
    }
  );
}

function applyFilters() {
  const status = statusFilter ? statusFilter.value : "all";
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const cancellationType = cancellationFilter
    ? cancellationFilter.value
    : "all";
  const paymentMethod = paymentMethodFilter ? paymentMethodFilter.value : "all";
  const deliveryType = deliveryTypeFilter ? deliveryTypeFilter.value : "all";

  let filteredOrders = [...allOrders];

  // Apply status filter
  if (status !== "all") {
    filteredOrders = filteredOrders.filter(
      (order) => order.orderStatus === status || order.status === status
    );
  }

  // Apply cancellation type filter
  if (cancellationType !== "all") {
    switch (cancellationType) {
      case "customer_cancelled":
        filteredOrders = filteredOrders.filter(
          (order) => order.cancelledByCustomer
        );
        break;
      case "admin_cancelled":
        filteredOrders = filteredOrders.filter(
          (order) => order.cancelledByAdmin && !order.cancelledByCustomer
        );
        break;
      case "any_cancelled":
        filteredOrders = filteredOrders.filter((order) => order.isCancelled);
        break;
      case "not_cancelled":
        filteredOrders = filteredOrders.filter((order) => !order.isCancelled);
        break;
    }
  }

  // Apply payment method filter
  if (paymentMethod !== "all") {
    filteredOrders = filteredOrders.filter(
      (order) => order.paymentMethod === paymentMethod
    );
  }

  // Apply delivery type filter
  if (deliveryType !== "all") {
    if (deliveryType === "pickup") {
      filteredOrders = filteredOrders.filter(
        (order) => order.isPickup === true
      );
    } else if (deliveryType === "delivery") {
      filteredOrders = filteredOrders.filter(
        (order) => order.isPickup !== true
      );
    }
  }

  // Apply search filter
  if (searchTerm) {
    filteredOrders = filteredOrders.filter((order) => {
      return (
        order.id.toLowerCase().includes(searchTerm) ||
        (order.userEmail &&
          order.userEmail.toLowerCase().includes(searchTerm)) ||
        (order.customerEmail &&
          order.customerEmail.toLowerCase().includes(searchTerm)) ||
        (order.customerId &&
          order.customerId.toLowerCase().includes(searchTerm)) ||
        (order.address?.street &&
          order.address.street.toLowerCase().includes(searchTerm)) ||
        (order.address?.city &&
          order.address.city.toLowerCase().includes(searchTerm)) ||
        (order.paymentMethod &&
          order.paymentMethod.toLowerCase().includes(searchTerm)) ||
        (order.orderStatus &&
          order.orderStatus.toLowerCase().includes(searchTerm)) ||
        (order.status && order.status.toLowerCase().includes(searchTerm))
      );
    });
  }

  renderOrders(filteredOrders);
}

function renderOrders(orders) {
  if (!ordersList) return;

  ordersList.innerHTML = "";

  if (!orders || orders.length === 0) {
    ordersList.innerHTML = `
      <tr>
        <td colspan="9" class="text-center">No orders found</td>
      </tr>
    `;
    return;
  }

  orders.forEach((order) => {
    renderOrderRow(order);
  });
}

function renderOrderRow(order) {
  const row = document.createElement("tr");

  if (order.isCancelled) {
    row.classList.add("cancelled-order");
    if (order.cancelledByCustomer) {
      row.classList.add("customer-cancelled");
    } else if (order.cancelledByAdmin) {
      row.classList.add("admin-cancelled");
    }
  }

  const displayStatus = capitalizeStatus(order.orderStatus || order.status || "pending");
  const deliveryTypeBadge = order.isPickup
    ? '<span class="delivery-badge pickup"><i class="fas fa-store"></i> Pickup</span>'
    : '<span class="delivery-badge delivery"><i class="fas fa-truck"></i> Delivery</span>';

  row.innerHTML = `
    <td>${order.id.substring(0, 8)}...</td>
    <td>${formatDate(order.createdAt)}</td>
    <td>${
      order.userName || order.userEmail || order.customerEmail || "N/A"
    }</td>
    <td>${
      order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    }</td>
    <td>R${(order.total || 0).toFixed(2)}</td>
    <td>
      <span class="status-badge ${displayStatus.toLowerCase()} ${
    order.isCancelled ? "cancelled" : ""
  }">
        ${displayStatus} 
        ${
          order.cancelledByCustomer
            ? "(Customer)"
            : order.cancelledByAdmin
            ? "(Admin)"
            : ""
        }
      </span>
    </td>
    <td>${(order.paymentMethod || "N/A").toUpperCase()} - ${
    order.paymentStatus || "N/A"
  }</td>
    <td>${deliveryTypeBadge}</td>
    <td class="actions-cell">
      <button class="btn btn-view" data-id="${order.id}">
        <i class="fas fa-eye"></i> View
      </button>
      ${
        order.isCancelled
          ? '<span class="status-locked"><i class="fas fa-lock"></i> Locked</span>'
          : `
            <select class="status-select" data-id="${order.id}">
              ${Object.entries(ORDER_STATUS)
                .filter(([key, value]) => value !== "cancelled")
                .map(
                  ([key, value]) => `
                  <option value="${value}" ${
                    (order.orderStatus || order.status) === value ? "selected" : ""
                  }>
                    ${capitalizeStatus(value)}
                  </option>
                `
                )
                .join("")}
            </select>
          `
      }
    </td>
  `;

  ordersList.appendChild(row);

  row
    .querySelector(".btn-view")
    ?.addEventListener("click", () => viewOrderDetails(order.id));

  if (!order.isCancelled) {
    row.querySelector(".status-select")?.addEventListener("change", (e) => {
      updateOrderStatus(order.id, e.target.value);
    });
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const orderDoc = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
    if (!orderDoc.exists()) {
      showError("Order not found");
      return;
    }

    const orderData = orderDoc.data();

    if (isOrderCancelled(orderData)) {
      showError("Cannot update status - order has been cancelled");
      return;
    }

    const updates = {
      orderStatus: newStatus,
      status: newStatus,
      statusHistory: arrayUnion({
        status: newStatus,
        changedAt: new Date().toISOString(),
        changedBy: "admin",
        note: `Status changed from ${
          orderData.orderStatus || orderData.status
        } to ${newStatus}`,
      }),
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === ORDER_STATUS.SHIPPED && !orderData.isPickup) {
      updates.trackingNumber = `AMAC-${Date.now().toString().slice(-8)}`;
      updates.deliveryStatus = "in_transit";
    }

    if (newStatus === ORDER_STATUS.DELIVERED && !orderData.isPickup) {
      updates.deliveryStatus = "delivered";
      updates.deliveredAt = new Date().toISOString();
    }

    await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), updates);
    showSuccess(`Order status updated to ${capitalizeStatus(newStatus)}`);
  } catch (error) {
    console.error("Error updating order status:", error);
    showError("Failed to update order status. Please try again.");
  }
}

async function viewOrderDetails(orderId) {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.ORDERS, orderId));
    if (docSnap.exists()) {
      const order = docSnap.data();
      showOrderModal({
        ...order,
        id: orderId,
        createdAt: safeConvertToDate(order.createdAt),
        updatedAt: safeConvertToDate(order.updatedAt),
        deliveredAt: safeConvertToDate(order.deliveredAt),
        cancelledByCustomer: isCancelledByCustomer(order),
        cancelledByAdmin: isCancelledByAdmin(order),
        isCancelled: isOrderCancelled(order),
        isPickup: order.isPickup || false,
      });
    } else {
      showError("Order not found");
    }
  } catch (error) {
    console.error("Error fetching order:", error);
    showError("Failed to load order details. Please try again.");
  }
}

function showOrderModal(order) {
  if (!orderDetailsContent) return;

  const itemsHtml =
    order.items
      ?.map(
        (item) => `
    <div class="order-item">
      <img src="${item.imageUrl || "../images/default-product.jpg"}" alt="${
          item.name
        }" class="item-image">
      <div class="item-details">
        <h4>${item.name}</h4>
        <p>Quantity: ${item.quantity}</p>
        <p>Price: R${item.price?.toFixed(2) || "0.00"}</p>
        <p>Total: R${(item.price * item.quantity)?.toFixed(2) || "0.00"}</p>
      </div>
    </div>
  `
      )
      .join("") || "<p>No items found</p>";

  const cancellationDetails = order.statusHistory?.find(
    (entry) => entry.status === "cancelled"
  );
  const displayStatus = capitalizeStatus(order.orderStatus || order.status || "pending");

  const deliveryInfo = order.isPickup
    ? `<div class="order-details-section">
      <h4><i class="fas fa-store"></i> Pickup Information</h4>
      <p><strong>Type:</strong> Store Pickup</p>
      <p><strong>Pickup Location:</strong> Amacusi Farming Store, Mpumalanga</p>
      <p><strong>Instructions:</strong> Please bring your order confirmation and ID</p>
    </div>`
    : `<div class="order-details-section">
      <h4><i class="fas fa-truck"></i> Delivery Address</h4>
      <p><strong>Type:</strong> Home Delivery</p>
      <p>${order.address?.street || "N/A"}</p>
      <p>${order.address?.city || "N/A"}, ${
        order.address?.province || "N/A"
      }</p>
      ${
        order.trackingNumber
          ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>`
          : ""
      }
    </div>`;

  orderDetailsContent.innerHTML = `
    <div class="order-details-section">
      <h3>Order #${order.id || "N/A"}</h3>
      <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
      <p><strong>Status:</strong> 
        <span class="status-badge ${displayStatus.toLowerCase()} ${
    order.isCancelled ? "cancelled" : ""
  }">
          ${displayStatus} 
          ${
            order.cancelledByCustomer
              ? "(Customer Cancelled)"
              : order.cancelledByAdmin
              ? "(Admin Cancelled)"
              : ""
          }
        </span>
      </p>
      <p><strong>Type:</strong> 
        <span class="delivery-badge ${order.isPickup ? "pickup" : "delivery"}">
          ${
            order.isPickup
              ? '<i class="fas fa-store"></i> Pickup'
              : '<i class="fas fa-truck"></i> Delivery'
          }
        </span>
      </p>
      
      ${
        order.isCancelled
          ? `
        <div class="alert alert-warning">
          <i class="fas fa-lock"></i> This order has been cancelled and cannot be modified
        </div>
      `
          : ""
      }
    </div>

    ${
      cancellationDetails
        ? `
      <div class="order-details-section cancelled-details">
        <h4><i class="fas fa-ban"></i> Cancellation Details</h4>
        <p><strong>Cancelled by:</strong> ${
          cancellationDetails.changedBy || "Unknown"
        }</p>
        <p><strong>Date:</strong> ${formatDate(
          cancellationDetails.changedAt
        )}</p>
        ${
          cancellationDetails.reason
            ? `<p><strong>Reason:</strong> ${cancellationDetails.reason}</p>`
            : ""
        }
        ${
          cancellationDetails.note
            ? `<p><strong>Note:</strong> ${cancellationDetails.note}</p>`
            : ""
        }
      </div>
    `
        : ""
    }

    <div class="order-details-section">
      <h4>Customer Information</h4>
      <p><strong>Name:</strong> ${order.userName || "N/A"}</p>
      <p><strong>Email:</strong> ${
        order.userEmail || order.customerEmail || "N/A"
      }</p>
      <p><strong>Phone:</strong> ${
        order.userPhone || order.customerPhone || "N/A"
      }</p>
      <p><strong>Customer ID:</strong> ${order.customerId || "N/A"}</p>
    </div>

    ${deliveryInfo}

    <div class="order-details-section">
      <h4>Order Items (${order.items?.length || 0})</h4>
      <div class="order-items-list">
        ${itemsHtml}
      </div>
    </div>

    <div class="order-details-section">
      <h4>Payment Information</h4>
      <p><strong>Method:</strong> ${(
        order.paymentMethod || "N/A"
      ).toUpperCase()}</p>
      <p><strong>Status:</strong> ${order.paymentStatus || "N/A"}</p>
      <p><strong>Subtotal:</strong> R${(order.subtotal || 0).toFixed(2)}</p>
      <p><strong>Delivery Fee:</strong> ${
        order.isPickup
          ? "FREE (Pickup)"
          : `R${(order.deliveryFee || 0).toFixed(2)}`
      }</p>
      <p><strong>Total:</strong> R${(order.total || 0).toFixed(2)}</p>
    </div>

    <div class="order-details-section">
      <h4>Status History</h4>
      ${
        order.statusHistory?.length > 0
          ? order.statusHistory
              .map(
                (entry) => `
          <p>${formatDate(entry.changedAt)} - ${capitalizeStatus(entry.status)} (by ${
                  entry.changedBy || "system"
                })
          ${entry.reason ? ` - ${entry.reason}` : ""}
          ${entry.note ? ` - ${entry.note}` : ""}</p>
        `
              )
              .join("")
          : "<p>No status history available</p>"
      }
    </div>
  `;

  if (orderDetailsModal) {
    orderDetailsModal.style.display = "block";
  }
}

function formatDate(date) {
  if (!date) return "N/A";
  try {
    const jsDate = date?.toDate?.() || new Date(date);
    if (isNaN(jsDate.getTime())) return "N/A";
    return jsDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "N/A";
  }
}

function printOrderDetails() {
  if (!orderDetailsContent) return;
  const printContent = orderDetailsContent.innerHTML;
  const originalContent = document.body.innerHTML;
  document.body.innerHTML = `<div class="print-container">${printContent}</div>`;
  window.print();
  document.body.innerHTML = originalContent;
  if (orderDetailsModal) orderDetailsModal.style.display = "block";
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>${message}</span>`;
  document.body.appendChild(errorDiv);
  setTimeout(() => {
    errorDiv.classList.add("fade-out");
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
}

function showSuccess(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "success-message";
  successDiv.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
  document.body.appendChild(successDiv);
  setTimeout(() => {
    successDiv.classList.add("fade-out");
    setTimeout(() => successDiv.remove(), 300);
  }, 3000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOrderManagement);
} else {
  initOrderManagement();
}
