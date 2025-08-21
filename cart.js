// cart.js
import {
  auth,
  db,
  isUserRegistered,
  onAuthStateChanged,
} from "./logInScripts/firebaseAuth.js";
import {
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  increment,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ======================
// DOM Elements
// ======================
const cartItemsList = document.getElementById("cart-items-list");
const itemCountElement = document.getElementById("item-count");
const subtotalElement = document.getElementById("subtotal");
const deliveryElement = document.getElementById("delivery");
const totalElement = document.getElementById("total");
const checkoutBtn = document.getElementById("checkout-btn");
const cartCountElements = document.querySelectorAll(".cart-count");
const guestCheckoutMessage = document.getElementById("guest-checkout-message");
const pickupCheckbox = document.getElementById("pickup-checkbox");

// Modals
const addressModal = document.getElementById("address-modal");
const paymentModal = document.getElementById("payment-modal");
const confirmationModal = document.getElementById("confirmation-modal");
const orderIdSpan = document.getElementById("order-id");

// New DOM elements for payment modal
const deliveryAddressDisplay = document.getElementById(
  "delivery-address-display"
);
const paymentSubtotalDisplay = document.getElementById("payment-subtotal");
const deliveryFeeDisplay = document.getElementById("delivery-fee-display");
const paymentTotalDisplay = document.getElementById("payment-total");

// ======================
// State
// ======================
let cart = [];
let unsubscribeCart = null;
let deliveryFee = 0;
let userId = null;
let selectedAddress = { street: "", city: "", province: "" };

// ======================
// Helper Functions
// ======================
function generateOrderNumber() {
  const numbers = "0123456789";
  let result = "AM"; // Fixed prefix

  // Generate 6 random numbers
  for (let i = 0; i < 6; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return result;
}

function showToast(message, type = "error") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }, 100);
}

function setLoadingState(loading) {
  const buttons = document.querySelectorAll("button");
  buttons.forEach((btn) => {
    if (loading) {
      btn.disabled = true;
      btn.classList.add("loading");
    } else {
      btn.disabled = false;
      btn.classList.remove("loading");
    }
  });
}

async function requireLoggedInAndRegistered(redirectToSignUp = true) {
  if (!auth.currentUser) {
    if (redirectToSignUp) {
      showToast("You must sign in to continue.");
      window.location.href = `../pages/signUp.html?redirect=${encodeURIComponent(
        window.location.href
      )}`;
    }
    throw new Error("not_authenticated");
  }

  const uid = auth.currentUser.uid;
  const registered = await isUserRegistered(uid);
  if (!registered) {
    if (redirectToSignUp) {
      showToast("Please sign in with Google to continue.");
      window.location.href = `../pages/signUp.html?redirect=${encodeURIComponent(
        window.location.href
      )}`;
    }
    throw new Error("not_registered");
  }

  userId = uid;
  return true;
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    userId = user.uid;
    if (guestCheckoutMessage) guestCheckoutMessage.style.display = "none";
    if (checkoutBtn) checkoutBtn.disabled = false;
  } else {
    userId = null;
    if (guestCheckoutMessage) guestCheckoutMessage.style.display = "block";
    if (checkoutBtn) checkoutBtn.disabled = false;
  }
});

// ======================
// Cart Management
// ======================
async function initCart() {
  const cartId = sessionStorage.getItem("cartId");
  if (!cartId) {
    renderEmptyCart();
    return;
  }

  unsubscribeCart = onSnapshot(
    doc(db, "carts", cartId),
    (docSnap) => {
      try {
        if (docSnap.exists()) {
          cart = docSnap.data().items || [];
          renderCartItems();
          updateCartSummary();
        } else {
          cart = [];
          renderEmptyCart();
        }
      } catch (err) {
        console.error("Cart snapshot handler failed:", err);
        showToast("Failed to load cart. Please refresh.");
      }
    },
    (err) => {
      console.error("Cart snapshot error:", err);
      showToast("Failed to load cart. Please refresh.");
    }
  );
}

function renderEmptyCart() {
  cartItemsList.innerHTML = `
    <div class="empty-cart">
      <i class="fas fa-shopping-cart"></i>
      <p>Your cart is empty</p>
      <a href="products.html" class="btn">Browse Products</a>
    </div>
  `;
  updateHeaderCartCount(0);
}

function renderCartItems() {
  if (!cart || cart.length === 0) {
    renderEmptyCart();
    return;
  }

  cartItemsList.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.imageUrl || "../images/default-product.jpg"}" alt="${
        item.name
      }" class="cart-item-img" />
      <div class="cart-item-details">
        <h3 class="cart-item-name">${item.name}</h3>
        <span class="cart-item-price">R${item.price.toFixed(2)}</span>
      </div>
      <div class="cart-item-actions">
        <div class="quantity-control">
          <button class="quantity-btn minus" data-id="${item.id}">-</button>
          <input type="number" class="quantity-input" value="${
            item.quantity
          }" min="1" data-id="${item.id}" />
          <button class="quantity-btn plus" data-id="${item.id}">+</button>
        </div>
        <button class="remove-item" data-id="${
          item.id
        }" aria-label="Remove item">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `
    )
    .join("");

  attachCartItemEvents();
}

// ======================
// Cart Item Events
// ======================
function attachCartItemEvents() {
  // Quantity buttons
  document.querySelectorAll(".quantity-btn").forEach((btn) => {
    btn.addEventListener("click", handleQuantityChange);
  });

  // Quantity inputs
  document.querySelectorAll(".quantity-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      e.target.value = Math.max(1, parseInt(e.target.value) || 1);
      handleQuantityInputChange(e);
    });
  });

  // Remove buttons
  document.querySelectorAll(".remove-item").forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", removeItemFromCart);
    }
  });
}

async function handleQuantityChange(e) {
  try {
    await requireLoggedInAndRegistered();
    setLoadingState(true);

    const button = e.target.closest("button");
    if (!button || !button.dataset.id) {
      console.error("Quantity change: could not resolve button or dataset.id");
      return;
    }

    const id = button.dataset.id;
    const idx = cart.findIndex((i) => i.id === id);
    if (idx === -1) return;

    // Check stock for increase
    if (button.classList.contains("plus")) {
      const productRef = doc(db, "products", id);
      const productSnap = await getDoc(productRef);
      const availableStock = productSnap.exists()
        ? productSnap.data().stock
        : 0;

      if (cart[idx].quantity >= availableStock) {
        showToast(`Only ${availableStock} available in stock`);
        return;
      }
      cart[idx].quantity++;
    } else {
      cart[idx].quantity = Math.max(1, cart[idx].quantity - 1);
    }

    await updateCartOnServer();
  } catch (err) {
    console.error("Quantity change failed:", err);
    if (
      err.message !== "not_authenticated" &&
      err.message !== "not_registered"
    ) {
      showToast("Failed to update quantity. Please try again.");
    }
  } finally {
    setLoadingState(false);
  }
}

async function handleQuantityInputChange(e) {
  try {
    await requireLoggedInAndRegistered();
    setLoadingState(true);

    const id = e.target.dataset.id;
    const idx = cart.findIndex((i) => i.id === id);
    if (idx === -1) return;

    const newQuantity = parseInt(e.target.value) || 1;

    // Check stock
    const productRef = doc(db, "products", id);
    const productSnap = await getDoc(productRef);
    const availableStock = productSnap.exists() ? productSnap.data().stock : 0;

    if (newQuantity > availableStock) {
      showToast(`Only ${availableStock} available in stock`);
      e.target.value = availableStock;
      cart[idx].quantity = availableStock;
    } else {
      cart[idx].quantity = newQuantity;
    }

    await updateCartOnServer();
  } catch (err) {
    console.error("Quantity input failed:", err);
    renderCartItems();
    if (
      err.message !== "not_authenticated" &&
      err.message !== "not_registered"
    ) {
      showToast("Failed to update quantity. Please try again.");
    }
  } finally {
    setLoadingState(false);
  }
}

async function removeItemFromCart(e) {
  let button = e.target.closest("button") || e.currentTarget;

  if (!button || !button.dataset.id) {
    console.error("Could not find button or ID for removal");
    return;
  }

  try {
    await requireLoggedInAndRegistered();
    setLoadingState(true);

    const id = button.dataset.id;
    cart = cart.filter((item) => item.id !== id);
    await updateCartOnServer();
  } catch (err) {
    console.error("Remove item failed:", err);
    if (
      err.message !== "not_authenticated" &&
      err.message !== "not_registered"
    ) {
      showToast("Failed to remove item. Please try again.");
    }
  } finally {
    setLoadingState(false);
  }
}

// ======================
// Update cart in Firestore
// ======================
async function updateCartOnServer() {
  const cartId = sessionStorage.getItem("cartId");
  if (!cartId) {
    console.warn("No cartId in sessionStorage; skipping update.");
    return;
  }

  try {
    await updateDoc(doc(db, "carts", cartId), { items: cart });
    updateCartSummary();
  } catch (err) {
    console.error("Failed to update cart:", err);
    showToast("Unable to update cart. Please try again.");
  }
}

// ======================
// Cart Summary
// ======================
function calculateSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartSummary() {
  const subtotal = calculateSubtotal();
  const isPickup = pickupCheckbox?.checked || false;
  const province = document.getElementById("province")?.value || "other";

  deliveryFee = isPickup
    ? 0
    : province.toLowerCase() === "mpumalanga"
    ? 0
    : 100;

  itemCountElement.textContent = `${cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  )} items`;
  subtotalElement.textContent = `R${subtotal.toFixed(2)}`;
  deliveryElement.textContent =
    deliveryFee === 0 ? "FREE" : `R${deliveryFee.toFixed(2)}`;
  totalElement.textContent = `R${(subtotal + deliveryFee).toFixed(2)}`;

  updateHeaderCartCount();
}

function updateHeaderCartCount(count) {
  const total =
    typeof count === "number"
      ? count
      : cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountElements.forEach((el) => (el.textContent = total));
}

// ======================
// Stock Validation
// ======================
async function validateStockBeforeCheckout() {
  try {
    const stockChecks = cart.map(async (item) => {
      const productRef = doc(db, "products", item.id);
      const productSnap = await getDoc(productRef);
      return {
        id: item.id,
        name: item.name,
        available: productSnap.exists() ? productSnap.data().stock : 0,
        requested: item.quantity,
      };
    });

    const results = await Promise.all(stockChecks);
    const outOfStockItems = results.filter(
      (item) => item.requested > item.available
    );

    if (outOfStockItems.length > 0) {
      const message = outOfStockItems
        .map((item) => `${item.name} (only ${item.available} available)`)
        .join(", ");
      showToast(`Some items are out of stock: ${message}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Stock validation failed:", error);
    showToast("Failed to check product availability. Please try again.");
    return false;
  }
}

// ======================
// Checkout Flow
// ======================
function setupSecureCheckout() {
  if (!checkoutBtn) return;

  checkoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      setLoadingState(true);

      if (!auth.currentUser) {
        showToast("Please sign in to proceed to checkout.");
        window.location.href = `../pages/signUp.html?redirect=${encodeURIComponent(
          window.location.href
        )}`;
        return;
      }

      const uid = auth.currentUser.uid;
      const registered = await isUserRegistered(uid);
      if (!registered) {
        showToast("Please complete Google sign-in to continue.");
        window.location.href = `../pages/signUp.html?redirect=${encodeURIComponent(
          window.location.href
        )}`;
        return;
      }

      if (!cart || cart.length === 0) {
        showToast("Your cart is empty.");
        return;
      }

      const stockValid = await validateStockBeforeCheckout();
      if (!stockValid) return;

      const isPickup = pickupCheckbox?.checked || false;

      if (isPickup) {
        selectedAddress = {};
        updatePaymentModal();
        paymentModal.style.display = "block";
      } else {
        addressModal.style.display = "block";
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      showToast("Failed to start checkout. Please try again.");
    } finally {
      setLoadingState(false);
    }
  });

  const confirmAddressBtn = document.getElementById("confirm-address");
  if (confirmAddressBtn) {
    confirmAddressBtn.addEventListener("click", async () => {
      try {
        setLoadingState(true);
        await requireLoggedInAndRegistered();

        const street = document.getElementById("street").value.trim();
        const city = document.getElementById("city").value.trim();
        const province = document.getElementById("province").value;

        if (!street || !city || !province) {
          showToast("Please complete all address fields.");
          return;
        }

        selectedAddress = { street, city, province };
        updatePaymentModal();
        addressModal.style.display = "none";
        paymentModal.style.display = "block";
      } catch (err) {
        console.error("Address confirmation error:", err);
        showToast("Failed to confirm address. Please try again.");
      } finally {
        setLoadingState(false);
      }
    });
  }

  document.querySelectorAll(".payment-method").forEach((method) => {
    method.addEventListener("click", async () => {
      try {
        await requireLoggedInAndRegistered(false);
        document
          .querySelectorAll(".payment-method")
          .forEach((m) => m.classList.remove("selected"));
        method.classList.add("selected");
      } catch (err) {
        showToast("Please sign in to select a payment method.");
      }
    });
  });

  const confirmPaymentBtn = document.getElementById("confirm-payment");
  if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener("click", async () => {
      try {
        setLoadingState(true);
        await requireLoggedInAndRegistered();

        const selectedMethod = document.querySelector(
          ".payment-method.selected"
        )?.dataset.method;
        if (!selectedMethod) {
          showToast("Please select a payment method.");
          return;
        }

        if (selectedMethod === "cash") {
          await completeCashOrder();
        } else {
          showToast("This payment method is coming soon.");
        }
      } catch (err) {
        console.error("Payment confirmation error:", err);
        showToast("Failed to process payment. Please try again.");
      } finally {
        setLoadingState(false);
      }
    });
  }

  if (pickupCheckbox) {
    pickupCheckbox.addEventListener("change", () => {
      updateCartSummary();
      if (paymentModal.style.display === "block") {
        updatePaymentModal();
      }
    });
  }
}

// ======================
// Order Processing
// ======================
async function completeCashOrder() {
  try {
    setLoadingState(true);
    await requireLoggedInAndRegistered();

    const stockValid = await validateStockBeforeCheckout();
    if (!stockValid) {
      if (paymentModal) paymentModal.style.display = "none";
      return;
    }

    const isPickup = pickupCheckbox?.checked || false;
    const { street, city, province } = isPickup ? {} : selectedAddress;
    const batch = writeBatch(db);
    const uid = auth.currentUser.uid;
    const orderId = generateOrderNumber(); // Now generates "AM" followed by 6 numbers

    cart.forEach((item) => {
      const productRef = doc(db, "products", item.id);
      batch.update(productRef, { stock: increment(-item.quantity) });
    });

    const subtotal = calculateSubtotal();
    const fee = isPickup
      ? 0
      : province.toLowerCase() === "mpumalanga"
      ? 0
      : 100;
    const orderData = {
      id: orderId,
      userId: uid,
      userEmail: auth.currentUser.email, // Added: Store user email
      userName: auth.currentUser.displayName || "Customer", // Added: Store user name
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl || null,
      })),
      subtotal,
      deliveryFee: fee,
      total: subtotal + fee,
      status: "pending",
      paymentMethod: "cash",
      paymentStatus: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPickup,
    };

    if (!isPickup) {
      orderData.address = { street, city, province };
    }

    batch.set(doc(db, "orders", orderId), orderData);

    const cartId = sessionStorage.getItem("cartId");
    if (cartId) {
      batch.delete(doc(db, "carts", cartId));
      sessionStorage.removeItem("cartId");
    }

    await batch.commit();
    showOrderConfirmation(orderId);
  } catch (error) {
    console.error("Order processing failed:", error);
    showToast(`Failed to place order: ${error.message}`);
    if (paymentModal) paymentModal.style.display = "none";
  } finally {
    setLoadingState(false);
  }
}

// ======================
// UI Updates
// ======================
function updatePaymentModal() {
  const isPickup = pickupCheckbox?.checked || false;
  const { street, city, province } = selectedAddress;
  const subtotal = calculateSubtotal();
  const fee = isPickup ? 0 : province.toLowerCase() === "mpumalanga" ? 0 : 100;
  deliveryFee = fee;

  if (deliveryAddressDisplay) {
    deliveryAddressDisplay.textContent = isPickup
      ? "Store Pickup"
      : `${street}, ${city}, ${province}`;
  }
  if (paymentSubtotalDisplay) {
    paymentSubtotalDisplay.textContent = `R${subtotal.toFixed(2)}`;
  }
  if (deliveryFeeDisplay) {
    deliveryFeeDisplay.textContent = fee === 0 ? "FREE" : `R${fee.toFixed(2)}`;
  }
  if (paymentTotalDisplay) {
    paymentTotalDisplay.textContent = `R${(subtotal + fee).toFixed(2)}`;
  }
}

function showOrderConfirmation(orderId) {
  if (paymentModal) paymentModal.style.display = "none";
  if (orderIdSpan) orderIdSpan.textContent = orderId;
  if (confirmationModal) confirmationModal.style.display = "block";
}

// ======================
// Initialization
// ======================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initCart();
    setupSecureCheckout();

    window.addEventListener("click", (e) => {
      if (e.target === addressModal) addressModal.style.display = "none";
      if (e.target === paymentModal) paymentModal.style.display = "none";
    });

    document.querySelectorAll(".close-modal").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (addressModal) addressModal.style.display = "none";
        if (paymentModal) paymentModal.style.display = "none";
      });
    });

    window.addEventListener("beforeunload", () => {
      if (unsubscribeCart) unsubscribeCart();
    });
  } catch (error) {
    console.error("Initialization error:", error);
    showToast("System error. Please refresh the page.");
  }
});
