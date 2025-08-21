import { db, auth } from "../logInScripts/firebaseAuth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export class ProfileManager {
  constructor() {
    this.user = null;
    this.orderUnsubscribe = null;
    this.initAuthListener();
    this.setupEventListeners();
  }

  initAuthListener() {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        this.user = user;
        this.loadUserProfile();
        this.loadOrders();
      } else {
        window.location.href = "pages/signUp.html";
      }
    });
  }

  async loadUserProfile() {
    try {
      const userDoc = await getDoc(doc(db, "users", this.user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        document.getElementById("user-name").textContent =
          userData.displayName || "User";
        document.getElementById("user-email").textContent = this.user.email;
        if (userData.createdAt) {
          const joinDate = userData.createdAt.toDate();
          document.getElementById("join-date").textContent =
            joinDate.getFullYear();
        }
        if (userData.photoURL) {
          document.getElementById("user-avatar").src = userData.photoURL;
        }
        document.getElementById("phone").value = userData.phoneNumber || "";
        document.getElementById("full-name").value = userData.displayName || "";
        document.getElementById("email").value = this.user.email;
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      this.showToast("Failed to load profile data", "error");
    }
  }

  async loadOrders() {
    const ordersList = document.getElementById("orders-list");
    ordersList.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading your orders...</p></div>`;

    try {
      this.orderUnsubscribe = onSnapshot(
        query(collection(db, "orders"), where("userId", "==", this.user.uid)),
        (querySnapshot) => {
          if (querySnapshot.empty) {
            ordersList.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><p>You haven't placed any orders yet</p><a href="../pages/Products.html" class="btn btn-primary">Browse Products</a></div>`;
            return;
          }

          let ordersHtml = "";
          querySnapshot.forEach((doc) => {
            const order = doc.data();
            ordersHtml += this.createOrderCard(order, doc.id);
          });
          ordersList.innerHTML = ordersHtml;
          this.setupOrderDetailModals();
        },
        (error) => {
          console.error("Error loading orders:", error);
          ordersList.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load orders. Please try again later.</p></div>`;
        }
      );
    } catch (error) {
      console.error("Error loading orders:", error);
      ordersList.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load orders. Please try again later.</p></div>`;
    }
  }

  createOrderCard(order, orderId) {
    const orderDate = order.createdAt?.toDate() || new Date();
    const formattedDate = orderDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    let statusClass = "";
    let statusText = "";
    const currentStatus = order.status || order.orderStatus || "pending";

    switch (currentStatus) {
      case "completed":
      case "delivered":
        statusClass = "status-completed";
        statusText = "Delivered";
        break;
      case "cancelled":
        statusClass = "status-cancelled";
        statusText = "Cancelled";
        break;
      case "shipped":
        statusClass = "status-shipped";
        statusText = "Shipped";
        break;
      case "processing":
        statusClass = "status-processing";
        statusText = "Processing";
        break;
      case "confirmed":
      case "preparing":
        statusClass = "status-confirmed";
        statusText =
          currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
        break;
      default:
        statusClass = "status-pending";
        statusText = "Pending";
    }

    const canCancel = ["pending", "confirmed", "processing"].includes(
      currentStatus
    );
    const itemCount = order.items ? order.items.length : 0;
    const totalAmount = order.total || 0;
    const isShipped = currentStatus === "shipped";
    const deliveryType = order.isPickup ? "Pickup" : "Delivery";

    const trackingInfo =
      isShipped && !order.isPickup
        ? `
      <div class="tracking-info">
        <p><i class="fas fa-truck"></i> ${
          order.trackingNumber
            ? `Tracking #: ${order.trackingNumber}`
            : "Estimated delivery: " + this.getDeliveryDate(order.createdAt)
        }</p>
      </div>
    `
        : "";

    return `
      <div class="order-card" data-order-id="${orderId}">
        <div class="order-header">
          <span class="order-id">Order #${orderId.substring(0, 8)}</span>
          <span class="order-date">${formattedDate}</span>
        </div>
        <div class="order-type">${deliveryType}</div>
        <div class="order-status ${statusClass}">${statusText}</div>
        <div class="order-summary">
          <span class="order-items">${itemCount} item${
      itemCount !== 1 ? "s" : ""
    }</span>
          <span class="order-total">R${totalAmount.toFixed(2)}</span>
        </div>
        ${
          canCancel
            ? `<button class="btn btn-cancel-order" data-order-id="${orderId}"><i class="fas fa-times-circle"></i> Cancel Order</button>`
            : ""
        }
        ${trackingInfo}
        <button class="btn btn-view-details">View Details</button>
      </div>
    `;
  }

  async cancelOrder(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) {
        this.showToast("Order not found", "error");
        return;
      }
      const order = orderDoc.data();
      const currentStatus = order.status || order.orderStatus;
      if (!["pending", "confirmed", "processing"].includes(currentStatus)) {
        this.showToast("Order can no longer be cancelled", "error");
        return;
      }
      await updateDoc(doc(db, "orders", orderId), {
        status: "cancelled",
        orderStatus: "cancelled",
        statusHistory: arrayUnion({
          status: "cancelled",
          changedAt: new Date().toISOString(),
          changedBy: "customer",
          reason: "Cancelled by customer",
        }),
        updatedAt: new Date().toISOString(),
      });
      this.showToast("Order cancelled successfully");
    } catch (error) {
      console.error("Error cancelling order:", error);
      this.showToast("Failed to cancel order", "error");
    }
  }

  async showOrderDetails(orderId) {
    try {
      const modal = document.getElementById("order-modal");
      const content = document.getElementById("order-details-content");
      content.innerHTML = `<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading order details...</p></div>`;
      modal.style.display = "block";
      modal.classList.add("active");

      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) {
        content.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Order not found</p></div>`;
        return;
      }

      const order = orderDoc.data();
      const orderDate = order.createdAt?.toDate() || new Date();
      const formattedDate = orderDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      let statusClass = "";
      let statusText = "";
      const currentStatus = order.status || order.orderStatus || "pending";
      switch (currentStatus) {
        case "completed":
        case "delivered":
          statusClass = "status-completed";
          statusText = "Delivered";
          break;
        case "cancelled":
          statusClass = "status-cancelled";
          statusText = "Cancelled";
          break;
        case "shipped":
          statusClass = "status-shipped";
          statusText = "Shipped";
          break;
        case "processing":
          statusClass = "status-processing";
          statusText = "Processing";
          break;
        case "confirmed":
        case "preparing":
          statusClass = "status-confirmed";
          statusText =
            currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
          break;
        default:
          statusClass = "status-pending";
          statusText = "Pending";
      }

      let itemsHtml = "";
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          itemsHtml += `<div class="order-item"><div><span>${
            item.name || "Unknown Item"
          }</span><span class="item-note">${item.quantity || 1} × R${(
            item.price || 0
          ).toFixed(2)}</span></div><span>R${(
            (item.price || 0) * (item.quantity || 1)
          ).toFixed(2)}</span></div>`;
        });
      } else {
        itemsHtml = `<p>No items found in this order</p>`;
      }

      const canCancel = ["pending", "confirmed", "processing"].includes(
        order.status || order.orderStatus
      );
      const address = order.address || {};
      const addressHtml = address.street
        ? `<p>${address.street || ""}, ${address.city || ""}, ${
            address.province || ""
          }</p>`
        : `<p>No address information available</p>`;
      const paymentMethod = order.paymentMethod || "unknown";
      const paymentMethodText =
        paymentMethod === "cash" ? "Cash on Delivery" : "Bank Transfer";
      const paymentStatus = order.paymentStatus || "pending";

      const deliveryInfo = order.isPickup
        ? `<div class="shipping-info"><h4>Pickup Information</h4><p><i class="fas fa-store"></i> Store Pickup</p><p><strong>Location:</strong> Amacusi Farming Store, Mpumalanga</p><p><strong>Instructions:</strong> Please bring your order confirmation and ID</p></div>`
        : `<div class="shipping-info"><h4>Shipping Address</h4>${addressHtml}</div>`;

      content.innerHTML = `
        <div class="order-header"><h3>Order #${orderId.substring(
          0,
          8
        )}</h3><span class="order-date">${formattedDate}</span></div>
        <div class="order-type-badge ${
          order.isPickup ? "pickup" : "delivery"
        }">${
        order.isPickup
          ? '<i class="fas fa-store"></i> Pickup'
          : '<i class="fas fa-truck"></i> Delivery'
      }</div>
        <div class="order-status-display ${statusClass}"><i class="fas ${
        statusClass === "status-completed"
          ? "fa-check-circle"
          : statusClass === "status-cancelled"
          ? "fa-times-circle"
          : statusClass === "status-shipped"
          ? "fa-truck"
          : "fa-clock"
      }"></i><span>${statusText}</span></div>
        <div class="order-items-list"><h4>Items</h4>${itemsHtml}</div>
        <div class="order-totals">
          <div class="order-total-row"><span>Subtotal:</span><span>R${(
            order.subtotal || 0
          ).toFixed(2)}</span></div>
          <div class="order-total-row"><span>Delivery Fee:</span><span>${
            (order.deliveryFee || 0) === 0
              ? "FREE"
              : `R${(order.deliveryFee || 0).toFixed(2)}`
          }</span></div>
          <div class="order-total-row total"><span>Total:</span><span>R${(
            order.total || 0
          ).toFixed(2)}</span></div>
        </div>
        ${deliveryInfo}
        <div class="payment-info"><h4>Payment Method</h4><p>${paymentMethodText}</p><p class="payment-status ${
        paymentStatus === "paid" ? "paid" : "pending"
      }">${paymentStatus === "paid" ? "Paid" : "Pending"}</p></div>
        <div class="status-history"><h4>Status History</h4>${
          order.statusHistory && order.statusHistory.length > 0
            ? order.statusHistory
                .map(
                  (entry) =>
                    `<p>${this.formatHistoryDate(entry.changedAt)} - ${
                      entry.status || "unknown"
                    } (by ${entry.changedBy || "system"})${
                      entry.reason ? ` - ${entry.reason}` : ""
                    }</p>`
                )
                .join("")
            : "<p>No status history available</p>"
        }</div>
        ${
          canCancel
            ? `<div class="order-actions"><button class="btn btn-cancel-order-details" data-order-id="${orderId}"><i class="fas fa-times-circle"></i> Cancel Order</button></div>`
            : ""
        }
      `;

      document
        .querySelector(".btn-cancel-order-details")
        ?.addEventListener("click", async (e) => {
          if (confirm("Are you sure you want to cancel this order?")) {
            await this.cancelOrder(orderId);
            modal.style.display = "none";
            modal.classList.remove("active");
          }
        });
    } catch (error) {
      console.error("Error loading order details:", error);
      const content = document.getElementById("order-details-content");
      if (content) {
        content.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load order details. Please try again later.</p><p class="error-detail">Error: ${error.message}</p></div>`;
      }
    }
  }

  getDeliveryDate(orderDate) {
    try {
      const date = orderDate?.toDate() || new Date();
      date.setDate(date.getDate() + 3);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Unknown date";
    }
  }

  formatHistoryDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  }

  setupOrderDetailModals() {
    document
      .querySelectorAll(".order-card .btn-view-details")
      .forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const orderId = btn.closest(".order-card").dataset.orderId;
          await this.showOrderDetails(orderId);
        });
      });

    document.querySelectorAll(".btn-cancel-order").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const orderId = btn.dataset.orderId;
        if (confirm("Are you sure you want to cancel this order?")) {
          await this.cancelOrder(orderId);
        }
      });
    });

    document.querySelectorAll(".order-card").forEach((card) => {
      card.addEventListener("click", async (e) => {
        if (
          e.target.closest(".btn-view-details") ||
          e.target.closest(".btn-cancel-order")
        )
          return;
        const orderId = card.dataset.orderId;
        await this.showOrderDetails(orderId);
      });
    });
  }

  setupEventListeners() {
    document.querySelectorAll(".profile-menu a").forEach((link) => {
      link.addEventListener("click", (e) => {
        if (link.getAttribute("href") === "#") return;
        e.preventDefault();
        const target = link.getAttribute("href").substring(1);
        document
          .querySelectorAll(".profile-menu li")
          .forEach((li) => li.classList.remove("active"));
        link.parentElement.classList.add("active");
        document
          .querySelectorAll(".profile-section")
          .forEach((section) => (section.style.display = "none"));
        document.getElementById(target).style.display = "block";
      });
    });

    document
      .getElementById("account-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          await updateDoc(doc(db, "users", this.user.uid), {
            displayName: document.getElementById("full-name").value,
            phoneNumber: document.getElementById("phone").value,
            updatedAt: new Date(),
          });
          this.showToast("Profile updated successfully");
          this.loadUserProfile();
        } catch (error) {
          console.error("Error updating profile:", error);
          this.showToast("Failed to update profile", "error");
        }
      });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await signOut(auth);
          window.location.href = "../index.html";
        } catch (error) {
          console.error("Error signing out:", error);
          this.showToast("Failed to log out", "error");
        }
      });

    document.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("order-modal").style.display = "none";
        document.getElementById("order-modal").classList.remove("active");
      });
    });

    window.addEventListener("click", (e) => {
      if (e.target === document.getElementById("order-modal")) {
        document.getElementById("order-modal").style.display = "none";
        document.getElementById("order-modal").classList.remove("active");
      }
    });
  }

  showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const profileManager = new ProfileManager();
});
