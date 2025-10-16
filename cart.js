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
  collection,
  getDocs,
  query,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.paypal.com/sdk/js?client-id=ATakrLwKAcN_2qKEz5gmggEkUlNdZT2oOwPC2m9NV-CpRAb22Rab3kYTaMPkas36s2c2b8UsJTMAukK4&currency=USD"></script>

// DOM Elements
const cartItemsList = document.getElementById("cart-items-list");
const itemCountElement = document.getElementById("item-count");
const subtotalElement = document.getElementById("subtotal");
const deliveryElement = document.getElementById("delivery");
const totalElement = document.getElementById("total");
const checkoutBtn = document.getElementById("checkout-btn");
const cartCountElements = document.querySelectorAll(".cart-count");
const guestCheckoutMessage = document.getElementById("guest-checkout-message");
const pickupCheckbox = document.getElementById("pickup-checkbox");
const addressSelectionModal = document.getElementById("address-selection-modal");
const savedAddressesList = document.getElementById("saved-addresses-list");
const addNewAddressBtn = document.getElementById("add-new-address-btn");
const confirmAddressSelectionBtn = document.getElementById("confirm-address-selection");
const addressModal = document.getElementById("address-modal");
const paymentModal = document.getElementById("payment-modal");
const confirmationModal = document.getElementById("confirmation-modal");
const orderIdSpan = document.getElementById("order-id");
const deliveryAddressDisplay = document.getElementById("delivery-address-display");
const paymentSubtotalDisplay = document.getElementById("payment-subtotal");
const deliveryFeeDisplay = document.getElementById("delivery-fee-display");
const paymentTotalDisplay = document.getElementById("payment-total");
const paypalButtonContainer = document.getElementById("paypal-button-container");

// State
let cart = [];
let unsubscribeCart = null;
let deliveryFee = 0;
let userId = null;
let selectedAddress = { street: "", city: "", province: "" };
let paypalButtons = null;
let selectedAddressId = null;

// Helper Functions
function generateOrderNumber() {
  const numbers = "0123456789";
  let result = "AM";
  for (let i = 0; i < 6; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  return result;
}

function showToast(message, type = "error") {
  document.querySelectorAll(".toast").forEach((toast) => toast.remove());
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
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
      window.location.href = `../Pages/signUp.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
    throw new Error("not_authenticated");
  }

  const uid = auth.currentUser.uid;
  const registered = await isUserRegistered(uid);
  if (!registered) {
    if (redirectToSignUp) {
      showToast("Please sign in with Google to continue.");
      window.location.href = `../Pages/signUp.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
    throw new Error("not_registered");
  }

  userId = uid;
  return true;
}

function calculateSubtotal() {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

async function validateStockBeforeCheckout() {
  try {
    for (const item of cart) {
      const productRef = doc(db, "products", item.id);
      const productSnap = await getDoc(productRef);
      if (!productSnap.exists() || productSnap.data().stock < item.quantity) {
        showToast(`Insufficient stock for ${item.name}. Please update your cart.`);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Stock validation error:", error);
    showToast("Failed to validate stock. Please try again.");
    return false;
  }
}

// Address Management
async function loadSavedAddresses() {
  if (!userId) return;
  savedAddressesList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Loading addresses...</p></div>';
  try {
    const addressesQuery = query(collection(db, "users", userId, "addresses"));
    const querySnapshot = await getDocs(addressesQuery);
    if (querySnapshot.empty) {
      savedAddressesList.innerHTML = '<div class="empty-state"><p>No saved addresses found.</p></div>';
      confirmAddressSelectionBtn.disabled = true;
      return;
    }

    let addressesHtml = "";
    querySnapshot.forEach((doc) => {
      const address = doc.data();
      const addressId = doc.id;
      addressesHtml += `
        <div class="address-card" data-address-id="${addressId}">
          <label>
            <input type="radio" name="address" value="${addressId}" />
            <div class="address-details">
              <h3>${address.label || "Address"}</h3>
              <p>${address.street}, ${address.city}, ${address.province}, ${address.postalCode || ""}</p>
              ${address.isDefault ? '<span class="address-tag">Default</span>' : ""}
            </div>
          </label>
        </div>
      `;
    });
    savedAddressesList.innerHTML = addressesHtml;

    // Enable/disable confirm button based on selection
    const addressRadios = savedAddressesList.querySelectorAll('input[name="address"]');
    addressRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        confirmAddressSelectionBtn.disabled = !savedAddressesList.querySelector('input[name="address"]:checked');
      });
    });
  } catch (error) {
    console.error("Error loading addresses:", error);
    savedAddressesList.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load addresses.</p></div>';
  }
}

async function saveNewAddress(addressData) {
  try {
    if (addressData.saveAddress) {
      if (addressData.isDefault) {
        const addressesQuery = query(collection(db, "users", userId, "addresses"));
        const querySnapshot = await getDocs(addressesQuery);
        querySnapshot.forEach(async (doc) => {
          await updateDoc(doc.ref, { isDefault: false });
        });
      }
      await setDoc(doc(collection(db, "users", userId, "addresses")), {
        ...addressData,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error saving address:", error);
    showToast("Failed to save address.", "error");
  }
}

// PayPal Integration
function setupPayPalButton() {
  if (!paypalButtonContainer || !window.paypal) {
    console.error("PayPal SDK not loaded or container missing.");
    return;
  }

  paypalButtonContainer.innerHTML = "";
  paypalButtons = paypal.Buttons({
    createOrder: (data, actions) => {
      const subtotal = calculateSubtotal();
      const fee = pickupCheckbox.checked ? 0 : selectedAddress.province.toLowerCase() === "mpumalanga" ? 0 : 100;
      const total = subtotal + fee;
      return actions.order.create({
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: (total / 15).toFixed(2), // Convert ZAR to USD (assuming 1 USD = 15 ZAR)
              breakdown: {
                item_total: { currency_code: "USD", value: (subtotal / 15).toFixed(2) },
                shipping: { currency_code: "USD", value: (fee / 15).toFixed(2) },
              },
            },
            items: cart.map((item) => ({
              name: item.name,
              unit_amount: { currency_code: "USD", value: (item.price / 15).toFixed(2) },
              quantity: item.quantity,
            })),
          },
        ],
      });
    },
    onApprove: async (data, actions) => {
      try {
        setLoadingState(true);
        const stockValid = await validateStockBeforeCheckout();
        if (!stockValid) {
          paymentModal.style.display = "none";
          return;
        }

        const orderDetails = await actions.order.capture();
        await completePayPalOrder(orderDetails);
        showOrderConfirmation(orderDetails.id);
      } catch (error) {
        console.error("PayPal payment error:", error);
        showToast("Failed to process PayPal payment.", "error");
      } finally {
        setLoadingState(false);
      }
    },
    onError: (err) => {
      console.error("PayPal error:", err);
      showToast("An error occurred with PayPal payment.", "error");
    },
  });

  paypalButtons.render(paypalButtonContainer).catch((err) => {
    console.error("PayPal button rendering failed:", err);
    showToast("Failed to load PayPal payment option.", "error");
  });
}

// Cart Management
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
          checkoutBtn.disabled = cart.length === 0;
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
  checkoutBtn.disabled = true;
}

function renderCartItems() {
  if (cart.length === 0) {
    renderEmptyCart();
    return;
  }

  let html = "";
  cart.forEach((item) => {
    html += `
      <div class="cart-item" data-id="${item.id}">
        <img src="${item.imageUrl || '../Images/default-product.jpg'}" alt="${item.name}" class="cart-item-img" />
        <div class="cart-item-details">
          <h3 class="cart-item-name">${item.name}</h3>
          <p class="cart-item-category">${item.category || "General"}</p>
          <p class="cart-item-price">R${item.price.toFixed(2)}</p>
        </div>
        <div class="cart-item-actions">
          <div class="quantity-control">
            <button class="quantity-btn decrease" data-id="${item.id}">-</button>
            <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-id="${item.id}" />
            <button class="quantity-btn increase" data-id="${item.id}">+</button>
          </div>
          <button class="remove-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
  });
  cartItemsList.innerHTML = html;
  updateCartSummary();
}

function updateHeaderCartCount(count) {
  cartCountElements.forEach((el) => {
    el.textContent = count;
  });
}

function updateCartSummary() {
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = calculateSubtotal();
  const isPickup = pickupCheckbox.checked;
  const fee = isPickup ? 0 : selectedAddress.province.toLowerCase() === "mpumalanga" ? 0 : 100;
  deliveryFee = fee;

  itemCountElement.textContent = `${itemCount} item${itemCount !== 1 ? "s" : ""}`;
  subtotalElement.textContent = `R${subtotal.toFixed(2)}`;
  deliveryElement.textContent = fee === 0 ? "FREE" : `R${fee.toFixed(2)}`;
  totalElement.textContent = `R${(subtotal + fee).toFixed(2)}`;
}

// Order Processing
async function completeCashOrder() {
  try {
    setLoadingState(true);
    await requireLoggedInAndRegistered();

    const stockValid = await validateStockBeforeCheckout();
    if (!stockValid) {
      paymentModal.style.display = "none";
      return;
    }

    const isPickup = pickupCheckbox.checked;
    const { street, city, province } = isPickup ? {} : selectedAddress;
    const batch = writeBatch(db);
    const uid = auth.currentUser.uid;
    const orderId = generateOrderNumber();

    cart.forEach((item) => {
      const productRef = doc(db, "products", item.id);
      batch.update(productRef, { stock: increment(-item.quantity) });
    });

    const subtotal = calculateSubtotal();
    const fee = isPickup ? 0 : province.toLowerCase() === "mpumalanga" ? 0 : 100;
    const orderData = {
      id: orderId,
      userId: uid,
      userEmail: auth.currentUser.email,
      userName: auth.currentUser.displayName || "Customer",
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
    paymentModal.style.display = "none";
  } finally {
    setLoadingState(false);
  }
}

async function completePayPalOrder(orderDetails) {
  try {
    setLoadingState(true);
    const stockValid = await validateStockBeforeCheckout();
    if (!stockValid) {
      paymentModal.style.display = "none";
      return;
    }

    const isPickup = pickupCheckbox.checked;
    const { street, city, province } = isPickup ? {} : selectedAddress;
    const batch = writeBatch(db);
    const uid = auth.currentUser.uid;
    const orderId = orderDetails.id;

    cart.forEach((item) => {
      const productRef = doc(db, "products", item.id);
      batch.update(productRef, { stock: increment(-item.quantity) });
    });

    const subtotal = calculateSubtotal();
    const fee = isPickup ? 0 : province.toLowerCase() === "mpumalanga" ? 0 : 100;
    const orderData = {
      id: orderId,
      userId: uid,
      userEmail: auth.currentUser.email,
      userName: auth.currentUser.displayName || "Customer",
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
      paymentMethod: "paypal",
      paymentStatus: "completed",
      paypalOrderId: orderDetails.id,
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
  } catch (error) {
    console.error("PayPal order processing failed:", error);
    showToast("Failed to process PayPal order.");
  } finally {
    setLoadingState(false);
  }
}

function showOrderConfirmation(orderId) {
  paymentModal.style.display = "none";
  addressSelectionModal.style.display = "none";
  addressModal.style.display = "none";
  orderIdSpan.textContent = orderId;
  confirmationModal.style.display = "block";
  cart = [];
  renderEmptyCart();
}

function updatePaymentModal() {
  const isPickup = pickupCheckbox.checked;
  const { street, city, province } = selectedAddress;
  const subtotal = calculateSubtotal();
  const fee = isPickup ? 0 : province.toLowerCase() === "mpumalanga" ? 0 : 100;
  deliveryFee = fee;

  deliveryAddressDisplay.textContent = isPickup ? "Store Pickup" : `${street}, ${city}, ${province}`;
  paymentSubtotalDisplay.textContent = `R${subtotal.toFixed(2)}`;
  deliveryFeeDisplay.textContent = fee === 0 ? "FREE" : `R${fee.toFixed(2)}`;
  paymentTotalDisplay.textContent = `R${(subtotal + fee).toFixed(2)}`;
}

// Event Listeners
function setupSecureCheckout() {
  checkoutBtn.addEventListener("click", async () => {
    try {
      await requireLoggedInAndRegistered();
      if (pickupCheckbox.checked) {
        selectedAddress = { street: "", city: "", province: "" };
        updatePaymentModal();
        paymentModal.style.display = "block";
      } else {
        addressSelectionModal.style.display = "block";
        await loadSavedAddresses();
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  });

  addNewAddressBtn.addEventListener("click", () => {
    addressSelectionModal.style.display = "none";
    addressModal.style.display = "block";
    document.getElementById("street").value = "";
    document.getElementById("city").value = "";
    document.getElementById("province").value = "";
    document.getElementById("save-address-checkbox").checked = true;
  });

  confirmAddressSelectionBtn.addEventListener("click", async () => {
    const selectedRadio = savedAddressesList.querySelector('input[name="address"]:checked');
    if (selectedRadio) {
      const addressId = selectedRadio.value;
      selectedAddressId = addressId;
      const addressDoc = await getDoc(doc(db, "users", userId, "addresses", addressId));
      if (addressDoc.exists()) {
        selectedAddress = addressDoc.data();
        updatePaymentModal();
        addressSelectionModal.style.display = "none";
        paymentModal.style.display = "block";
      }
    }
  });

  document.getElementById("confirm-address").addEventListener("click", async () => {
    const street = document.getElementById("street").value.trim();
    const city = document.getElementById("city").value.trim();
    const province = document.getElementById("province").value;
    const saveAddress = document.getElementById("save-address-checkbox").checked;

    if (!street || !city || !province) {
      showToast("Please fill in all required address fields.", "error");
      return;
    }

    selectedAddress = { street, city, province };
    if (saveAddress) {
      await saveNewAddress({
        label: "Address",
        street,
        city,
        province,
        postalCode: "",
        isDefault: false,
        saveAddress,
      });
    }

    updatePaymentModal();
    addressModal.style.display = "none";
    paymentModal.style.display = "block";
  });

  document.querySelectorAll(".payment-method").forEach((method) => {
    method.addEventListener("click", async () => {
      try {
        await requireLoggedInAndRegistered();
        document.querySelectorAll(".payment-method").forEach((m) => m.classList.remove("selected"));
        method.classList.add("selected");
        if (method.dataset.method === "paypal") {
          paypalButtonContainer.style.display = "block";
          if (!paypalButtons) {
            setupPayPalButton();
          }
        } else {
          paypalButtonContainer.style.display = "none";
        }
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

        const selectedMethod = document.querySelector(".payment-method.selected")?.dataset.method;
        if (!selectedMethod) {
          showToast("Please select a payment method.");
          return;
        }

        if (selectedMethod === "cash") {
          await completeCashOrder();
        } else if (selectedMethod === "paypal") {
          showToast("Please complete the PayPal payment above.");
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

  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      addressSelectionModal.style.display = "none";
      addressModal.style.display = "none";
      paymentModal.style.display = "none";
      confirmationModal.style.display = "none";
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target === addressSelectionModal) addressSelectionModal.style.display = "none";
    if (e.target === addressModal) addressModal.style.display = "none";
    if (e.target === paymentModal) paymentModal.style.display = "none";
  });
}

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initCart();
    setupSecureCheckout();

    onAuthStateChanged(auth, (user) => {
      if (user) {
        userId = user.uid;
        if (guestCheckoutMessage) guestCheckoutMessage.style.display = "none";
        if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
        setTimeout(() => {
          setupPayPalButton();
        }, 1000);
      } else {
        userId = null;
        if (guestCheckoutMessage) guestCheckoutMessage.style.display = "block";
        if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;
        if (paypalButtonContainer) paypalButtonContainer.innerHTML = "";
      }
    });

    window.addEventListener("beforeunload", () => {
      if (unsubscribeCart) unsubscribeCart();
    });
  } catch (error) {
    console.error("Initialization error:", error);
    showToast("System error. Please refresh the page.");
  }
});