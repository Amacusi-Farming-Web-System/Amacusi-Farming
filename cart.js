// Initialize cart from localStorage
let cart = JSON.parse(localStorage.getItem("amacusi-cart")) || [];

// DOM Elements
const cartItemsList = document.getElementById("cart-items-list");
const itemCountElement = document.getElementById("item-count");
const subtotalElement = document.getElementById("subtotal");
const deliveryElement = document.getElementById("delivery");
const totalElement = document.getElementById("total");
const checkoutBtn = document.getElementById("checkout-btn");
const cartCountElements = document.querySelectorAll(".cart-count");

// Modal elements
const addressModal = document.getElementById("address-modal");
const paymentModal = document.getElementById("payment-modal");
const addressForm = document.getElementById("address-form");
const confirmAddressBtn = document.getElementById("confirm-address");
const deliveryAddressDisplay = document.getElementById(
  "delivery-address-display"
);
const deliveryFeeDisplay = document.getElementById("delivery-fee-display");
const paymentMethods = document.querySelectorAll(".payment-method");
const confirmPaymentBtn = document.getElementById("confirm-payment");

// Meat categories that need live/butchered selection
const MEAT_CATEGORIES = ["poultry", "beef", "pork"];

// Debug function
function debugCart() {
  console.log("Current Cart:", cart);
  console.log(
    "Products in Storage:",
    JSON.parse(localStorage.getItem("amacusi-products"))
  );
}

function initializeProducts() {
  if (!localStorage.getItem("amacusi-products")) {
    const defaultProducts = [
      {
        id: 1,
        name: "Free Range Chicken",
        category: "poultry",
        price: 85,
        stock: 120,
        status: "active",
        description: "Humanely raised chickens with no antibiotics.",
        image: "../images/ChickenProduct.jpg",
        unit: "chicken",
      },
      {
        id: 2,
        name: "Grass-Fed Beef",
        category: "beef",
        price: 120,
        stock: 85,
        status: "active",
        description: "Premium cuts from cattle raised on open pastures.",
        image: "../images/BeefProduct.jpg",
        unit: "kg",
      },
      {
        id: 4,
        name: "Farm Fresh Eggs",
        category: "eggs",
        price: 45,
        stock: 200,
        status: "active",
        description:
          "Farm fresh eggs collected daily from free-range chickens.",
        image: "../images/eggProduct.jpg",
        unit: "tray",
      },
      {
        id: 3,
        name: "Natural Pork",
        category: "pork",
        price: 95,
        stock: 60,
        status: "active",
        description:
          "Tender pork from pigs raised in natural environments with no growth hormones.",
        image: "../images/porkProduct.jpg",
        unit: "kg",
      },
    ];
    localStorage.setItem("amacusi-products", JSON.stringify(defaultProducts));
  }
}

// Initialize cart with products check
function initCart() {
  initializeProducts(); // Add this line
  renderCartItems();
  updateCartSummary();
  updateHeaderCartCount();
  setupModals();
}

// Update renderCartItems to handle missing products
function renderCartItems() {
  const products = JSON.parse(localStorage.getItem("amacusi-products")) || [];
  console.log("Available products:", products);

  if (cart.length === 0) {
    cartItemsList.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty</p>
        <a href="products.html" class="btn">Browse Products</a>
      </div>
    `;
    return;
  }

  let itemsHTML = "";
  let validCartItems = [];

  cart.forEach((item) => {
    const product = products.find((p) => p.id === item.id);
    if (product) {
      validCartItems.push(item);
      itemsHTML += `
        <div class="cart-item" data-id="${item.id}">
          <img src="${product.image}" alt="${
        product.name
      }" class="cart-item-img">
          <div class="cart-item-details">
            <h3 class="cart-item-name">${product.name}</h3>
            <span class="cart-item-price">R${product.price.toFixed(2)}</span>
            <div class="quantity-control">
              <button class="quantity-btn minus" data-id="${item.id}">-</button>
              <span>${item.quantity}</span>
              <button class="quantity-btn plus" data-id="${item.id}">+</button>
            </div>
            <button class="remove-item" data-id="${item.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }
  });

  // Update cart with only valid items
  if (validCartItems.length !== cart.length) {
    cart = validCartItems;
    localStorage.setItem("amacusi-cart", JSON.stringify(cart));
  }

  cartItemsList.innerHTML =
    itemsHTML ||
    `
    <div class="error">
      <p>Some items are no longer available</p>
      <a href="products.html" class="btn">Continue Shopping</a>
    </div>
  `;

  // Add event listeners...
}

// Setup modal event listeners
function setupModals() {
  if (!checkoutBtn) return;

  checkoutBtn.addEventListener("click", () => {
    addressModal.style.display = "block";
  });

  document.querySelectorAll(".close-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      addressModal.style.display = "none";
      paymentModal.style.display = "none";
      document.getElementById("card-modal").style.display = "none";
    });
  });

  confirmAddressBtn.addEventListener("click", () => {
    if (validateAddress()) {
      addressModal.style.display = "none";
      paymentModal.style.display = "block";
      updatePaymentModal();
    }
  });

  paymentMethods.forEach((method) => {
    method.addEventListener("click", function () {
      paymentMethods.forEach((m) => m.classList.remove("selected"));
      this.classList.add("selected");
    });
  });

  confirmPaymentBtn.addEventListener("click", processPayment);
}

// Render cart items with error handling
function renderCartItems() {
  debugCart();

  if (cart.length === 0) {
    cartItemsList.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <p>Your cart is empty</p>
        <a href="products.html" class="btn">Browse Products</a>
      </div>
    `;
    return;
  }

  let itemsHTML = "";
  const products = JSON.parse(localStorage.getItem("amacusi-products")) || [];
  console.log("Available products:", products);

  cart.forEach((item) => {
    const product = products.find((p) => p.id === item.id);
    if (product) {
      const showTypeOptions = MEAT_CATEGORIES.includes(item.category);
      const unit = product.unit || "item";

      itemsHTML += `
        <div class="cart-item" data-id="${item.id}">
          <img src="${product.image || "../images/default-product.jpg"}" alt="${
        product.name
      }" class="cart-item-img">
          <div class="cart-item-details">
            <h3 class="cart-item-name">${product.name}</h3>
            <span class="cart-item-category">${product.category}</span>
            <span class="cart-item-price">R${product.price.toFixed(
              2
            )} / ${unit}</span>
            
            ${
              showTypeOptions
                ? `
              <div class="type-selection">
                <label>
                  <input type="radio" name="type-${
                    item.id
                  }" value="butchered" ${
                    item.type === "butchered" ? "checked" : ""
                  }>
                  Butchered
                </label>
                <label>
                  <input type="radio" name="type-${item.id}" value="live" ${
                    item.type === "live" ? "checked" : ""
                  }>
                  Live
                </label>
              </div>
            `
                : ""
            }
          </div>
          <div class="cart-item-actions">
            <div class="quantity-control">
              <button class="quantity-btn minus" data-id="${item.id}">-</button>
              <input type="number" class="quantity-input" value="${
                item.quantity
              }" min="1" data-id="${item.id}">
              <button class="quantity-btn plus" data-id="${item.id}">+</button>
            </div>
            <button class="remove-item" data-id="${item.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      console.warn(`Product with id ${item.id} not found in products list`);
    }
  });

  cartItemsList.innerHTML = itemsHTML;

  document.querySelectorAll(".quantity-btn").forEach((btn) => {
    btn.addEventListener("click", handleQuantityChange);
  });

  document.querySelectorAll(".remove-item").forEach((btn) => {
    btn.addEventListener("click", removeItemFromCart);
  });

  document
    .querySelectorAll('.type-selection input[type="radio"]')
    .forEach((radio) => {
      radio.addEventListener("change", handleTypeChange);
    });
}

// Handle live/butchered selection change
function handleTypeChange(e) {
  const id = parseInt(e.target.name.split("-")[1]);
  const type = e.target.value;

  const itemIndex = cart.findIndex((item) => item.id === id);
  if (itemIndex !== -1) {
    cart[itemIndex].type = type;
    saveCart();
    updateCartSummary();
  }
}

// Validate address form
function validateAddress() {
  const street = document.getElementById("street").value.trim();
  const city = document.getElementById("city").value.trim();
  const province = document.getElementById("province").value;

  if (!street || !city || !province) {
    alert("Please fill in all address fields");
    return false;
  }
  return true;
}

// Update payment modal with address and fee info
function updatePaymentModal() {
  const street = document.getElementById("street").value;
  const city = document.getElementById("city").value;
  const province = document.getElementById("province").value;

  const deliveryFee = province === "mpumalanga" ? 0 : 100;
  const total = calculateSubtotal() + deliveryFee;

  deliveryAddressDisplay.textContent = `${street}, ${city}, ${formatProvince(
    province
  )}`;
  deliveryFeeDisplay.textContent =
    deliveryFee === 0 ? "FREE" : `R${deliveryFee.toFixed(2)}`;
  document.getElementById(
    "payment-subtotal"
  ).textContent = `R${calculateSubtotal().toFixed(2)}`;
  document.getElementById("payment-total").textContent = `R${total.toFixed(2)}`;
}

// Process payment
function processPayment() {
  const selectedMethod = document.querySelector(".payment-method.selected");
  if (!selectedMethod) {
    alert("Please select a payment method");
    return;
  }

  const paymentMethod = selectedMethod.dataset.method;

  if (paymentMethod === "eft") {
    paymentModal.style.display = "none";
    document.getElementById("card-modal").style.display = "block";
    initCardInputs();
  } else {
    completeOrder(paymentMethod);
  }
}

// Initialize card input formatting
function initCardInputs() {
  document
    .getElementById("card-number")
    .addEventListener("input", function (e) {
      this.value = this.value
        .replace(/\s/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim();
    });

  document
    .getElementById("card-expiry")
    .addEventListener("input", function (e) {
      this.value = this.value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d)/, "$1/$2");
    });

  document
    .getElementById("submit-card")
    .addEventListener("click", function (e) {
      e.preventDefault();
      if (validateCardDetails()) {
        completeOrder("eft");
      }
    });
}

// Validate card details
function validateCardDetails() {
  const cardNumber = document
    .getElementById("card-number")
    .value.replace(/\s/g, "");
  const expiry = document.getElementById("card-expiry").value;
  const cvc = document.getElementById("card-cvc").value;
  const name = document.getElementById("card-name").value.trim();

  if (!cardNumber || cardNumber.length < 16) {
    alert("Please enter a valid 16-digit card number");
    return false;
  }

  if (!expiry || expiry.length < 5 || !expiry.includes("/")) {
    alert("Please enter a valid expiry date in MM/YY format");
    return false;
  }

  if (!cvc || cvc.length < 3) {
    alert("Please enter a valid 3-digit CVC");
    return false;
  }

  if (!name) {
    alert("Please enter the name on card");
    return false;
  }

  return true;
}

// Complete order
function completeOrder(paymentMethod) {
  const street = document.getElementById("street").value;
  const city = document.getElementById("city").value;
  const province = document.getElementById("province").value;
  const deliveryFee = province === "mpumalanga" ? 0 : 100;

  const order = {
    id: Date.now(),
    date: new Date().toISOString(),
    items: [...cart],
    address: { street, city, province },
    subtotal: calculateSubtotal(),
    deliveryFee,
    total: calculateSubtotal() + deliveryFee,
    paymentMethod,
    status: "completed",
  };

  const orders = JSON.parse(localStorage.getItem("amacusi-orders")) || [];
  orders.push(order);
  localStorage.setItem("amacusi-orders", JSON.stringify(orders));

  cart = [];
  localStorage.setItem("amacusi-cart", JSON.stringify(cart));
  showOrderConfirmation(order);
}

// Show order confirmation
function showOrderConfirmation(order) {
  const itemsList = order.items
    .map(
      (item) => `
    <div class="order-item">
      <span>${item.name} (${item.type || "standard"})</span>
      <span>${item.quantity} × R${getProductById(item.id).price.toFixed(
        2
      )}</span>
    </div>
  `
    )
    .join("");

  const confirmationHTML = `
    <div class="confirmation-modal">
      <div class="confirmation-content">
        <div class="confirmation-header">
          <i class="fas fa-check-circle"></i>
          <h2>Order #${order.id} Confirmed!</h2>
        </div>
        
        <div class="order-summary">
          <h3>Order Summary</h3>
          <div class="order-items">
            ${itemsList}
          </div>
          <div class="order-totals">
            <div class="order-row">
              <span>Subtotal:</span>
              <span>R${order.subtotal.toFixed(2)}</span>
            </div>
            <div class="order-row">
              <span>Delivery Fee:</span>
              <span>${
                order.deliveryFee === 0
                  ? "FREE"
                  : `R${order.deliveryFee.toFixed(2)}`
              }</span>
            </div>
            <div class="order-row total">
              <span>Total:</span>
              <span>R${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="order-details">
          <div class="detail-group">
            <h4>Delivery Address</h4>
            <p>${order.address.street}, ${order.address.city}, ${formatProvince(
    order.address.province
  )}</p>
          </div>
          <div class="detail-group">
            <h4>Payment Method</h4>
            <p>${formatPaymentMethod(order.paymentMethod)}</p>
            ${
              order.paymentMethod === "eft"
                ? '<p><i class="fas fa-lock"></i> Payment processed securely</p>'
                : ""
            }
          </div>
        </div>

        <button id="close-confirmation" class="btn">Continue Shopping</button>
      </div>
    </div>
  `;

  const confirmationEl = document.createElement("div");
  confirmationEl.innerHTML = confirmationHTML;
  document.body.appendChild(confirmationEl);

  document
    .getElementById("close-confirmation")
    .addEventListener("click", () => {
      window.location.href = "products.html";
    });
}

// Update cart summary
function updateCartSummary() {
  const subtotal = calculateSubtotal();
  const province = document.getElementById("province")?.value || "other";
  const deliveryFee = province === "mpumalanga" ? 0 : 100;
  const total = subtotal + deliveryFee;

  itemCountElement.textContent = `${getTotalQuantity()} ${
    getTotalQuantity() === 1 ? "item" : "items"
  }`;
  subtotalElement.textContent = `R${subtotal.toFixed(2)}`;
  deliveryElement.textContent =
    deliveryFee === 0 ? "FREE" : `R${deliveryFee.toFixed(2)}`;
  totalElement.textContent = `R${total.toFixed(2)}`;
  checkoutBtn.disabled = cart.length === 0;
}

// Helper functions
function calculateSubtotal() {
  return cart.reduce((sum, item) => {
    const product = getProductById(item.id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
}

function getTotalQuantity() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getProductById(id) {
  const products = JSON.parse(localStorage.getItem("amacusi-products")) || [];
  return products.find((product) => product.id === id);
}

function updateHeaderCartCount() {
  const totalQuantity = getTotalQuantity();
  cartCountElements.forEach((element) => {
    element.textContent = totalQuantity;
  });
}

function showCartNotification(productName) {
  const notification = document.createElement("div");
  notification.className = "cart-notification";
  notification.innerHTML = `
    <i class="fas fa-check-circle"></i>
    ${productName} added to cart
  `;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add("show"), 10);
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);
}

function handleQuantityChange(e) {
  const id = parseInt(e.currentTarget.dataset.id);
  const isPlus = e.currentTarget.classList.contains("plus");

  const itemIndex = cart.findIndex((item) => item.id === id);
  if (itemIndex !== -1) {
    if (isPlus) {
      cart[itemIndex].quantity += 1;
    } else if (cart[itemIndex].quantity > 1) {
      cart[itemIndex].quantity -= 1;
    }

    saveCart();
    updateCartSummary();
    updateHeaderCartCount();
  }
}

function removeItemFromCart(e) {
  const id = parseInt(e.currentTarget.dataset.id);
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  renderCartItems();
  updateCartSummary();
  updateHeaderCartCount();
}

function saveCart() {
  localStorage.setItem("amacusi-cart", JSON.stringify(cart));
}

function formatProvince(province) {
  return province === "mpumalanga" ? "Mpumalanga" : "Other Province";
}

function formatPaymentMethod(method) {
  return method === "cash" ? "Cash on Delivery" : "EFT/Bank Transfer";
}

// Global addToCart function
window.addToCart = function (
  productId,
  productName,
  productPrice,
  productCategory
) {
  const existingItem = cart.find(
    (item) => item.id === productId && item.type === undefined
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: productId,
      name: productName,
      price: parseFloat(productPrice),
      quantity: 1,
      category: productCategory,
      type: MEAT_CATEGORIES.includes(productCategory) ? "butchered" : undefined,
    });
  }

  localStorage.setItem("amacusi-cart", JSON.stringify(cart));
  updateHeaderCartCount();
  showCartNotification(productName);
};

// Initialize on page load
if (document.getElementById("cart-items-list")) {
  document.addEventListener("DOMContentLoaded", initCart);
}
