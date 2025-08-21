// order-history.js - Complete version
import { getUserOrderHistory } from "./cart.js";
import { ORDER_STATUS } from "./firestore.js";

const ordersContainer = document.getElementById("orders-container");
const statusFilter = document.getElementById("historyStatusFilter");
const searchInput = document.getElementById("orderHistorySearch");
const emptyState = document.getElementById("empty-state");

// Initialize order history
async function initOrderHistory() {
  const userId = localStorage.getItem("userId");

  if (!userId) {
    showLoginPrompt();
    return;
  }

  loadOrderHistory();
  setupEventListeners();
}

async function loadOrderHistory(filter = "all") {
  try {
    const orders = await getUserOrderHistory(localStorage.getItem("userId"));

    if (orders.length === 0) {
      showEmptyState();
      return;
    }

    const filteredOrders =
      filter === "all"
        ? orders
        : orders.filter((order) => order.orderStatus === filter);

    renderOrders(filteredOrders);
  } catch (error) {
    console.error("Error loading order history:", error);
    showError("Failed to load your orders");
  }
}

function renderOrders(orders) {
  if (orders.length === 0) {
    showEmptyState();
    return;
  }

  ordersContainer.innerHTML = "";
  orders.forEach((order) => {
    renderOrderCard(order);
  });
}

function renderOrderCard(order) {
  const orderCard = document.createElement("div");
  orderCard.className = "order-card";
  orderCard.dataset.status = order.orderStatus;
  orderCard.dataset.id = order.id;

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const orderDate = new Date(order.createdAt).toLocaleDateString();

  orderCard.innerHTML = `
    <div class="order-header">
      <div>
        <h3>Order #${order.id.substring(0, 8)}</h3>
        <p>${orderDate} • ${totalItems} items</p>
      </div>
      <span class="status-badge ${order.orderStatus}">
        ${order.orderStatus}
      </span>
    </div>
    
    <div class="order-body">
      <div class="order-items-preview">
        ${order.items
          .slice(0, 3)
          .map(
            (item) => `
          <div class="order-item">
            <img src="${item.imageUrl || "../images/default-product.jpg"}" 
                 alt="${item.name}" class="item-image">
            <span class="item-name">${item.name}</span>
            <span class="item-quantity">×${item.quantity}</span>
          </div>
        `
          )
          .join("")}
        ${
          order.items.length > 3
            ? `
          <div class="more-items">
            +${order.items.length - 3} more items
          </div>
        `
            : ""
        }
      </div>
      
      <div class="order-summary">
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>R${order.subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span>Delivery:</span>
          <span>R${order.deliveryFee.toFixed(2)}</span>
        </div>
        <div class="summary-row total">
          <span>Total:</span>
          <span>R${order.total.toFixed(2)}</span>
        </div>
      </div>
    </div>
    
    <div class="order-footer">
      <button class="btn btn-outline view-details" data-id="${order.id}">
        View Details
      </button>
      ${
        order.orderStatus === ORDER_STATUS.DELIVERED
          ? `
        <button class="btn btn-primary leave-review" data-id="${order.id}">
          Leave Review
        </button>
      `
          : ""
      }
      ${
        order.trackingNumber
          ? `
        <a href="#" class="track-package" data-tracking="${order.trackingNumber}">
          <i class="fas fa-truck"></i> Track Package
        </a>
      `
          : ""
      }
    </div>
  `;

  ordersContainer.appendChild(orderCard);

  // Add event listeners
  orderCard
    .querySelector(".view-details")
    .addEventListener("click", () => viewOrderDetails(order.id));

  if (orderCard.querySelector(".leave-review")) {
    orderCard
      .querySelector(".leave-review")
      .addEventListener("click", () => leaveReview(order.id));
  }
}

function viewOrderDetails(orderId) {
  // Implement detailed order view
  console.log("Viewing order:", orderId);
  alert(`Showing details for order ${orderId}`);
}

function leaveReview(orderId) {
  // Implement review functionality
  console.log("Leaving review for order:", orderId);
  alert(`Review form for order ${orderId}`);
}

function setupEventListeners() {
  statusFilter.addEventListener("change", () =>
    loadOrderHistory(statusFilter.value)
  );

  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const cards = ordersContainer.querySelectorAll(".order-card");

    cards.forEach((card) => {
      const matches = card.textContent.toLowerCase().includes(searchTerm);
      card.style.display = matches ? "" : "none";
    });
  });
}

function showEmptyState() {
  ordersContainer.innerHTML = "";
  emptyState.style.display = "block";
}

function showLoginPrompt() {
  ordersContainer.innerHTML = `
    <div class="login-prompt">
      <i class="fas fa-user-lock"></i>
      <h3>Please log in to view your order history</h3>
      <a href="login.html" class="btn btn-primary">Login</a>
    </div>
  `;
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  ordersContainer.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initOrderHistory);
