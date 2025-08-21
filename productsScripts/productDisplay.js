// productDisplay.js
import { db } from "../admin/firebase.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export class ProductDisplay {
  constructor() {
    this.productContainer = document.getElementById("product-container");
    this.filterButtons = document.querySelectorAll(".filter-btn");
    this.products = [];
    this.currentFilter = "all";
    this.showLoadingState();
    this.cartItems = []; // Track cart items for stock validation
  }

  async init() {
    try {
      await this.loadProducts();
      this.setupRealTimeListener();
      this.setupEventListeners();
      this.updateCartCount();
      this.listenForCartChanges(); // New: Listen for cart changes
    } catch (error) {
      console.error("Error initializing product display:", error);
      this.showErrorState();
    }
  }

  async loadProducts() {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      this.processProducts(querySnapshot);
    } catch (error) {
      console.error("Error loading products:", error);
      throw error;
    }
  }

  setupRealTimeListener() {
    const productsRef = collection(db, "products");
    onSnapshot(productsRef, (snapshot) => {
      this.processProducts(snapshot);
      this.renderProducts(this.currentFilter);
    });
  }

  // New: Listen for cart changes to update stock validation
  listenForCartChanges() {
    const cartId = sessionStorage.getItem("cartId");
    if (!cartId) return;

    onSnapshot(doc(db, "carts", cartId), (docSnap) => {
      if (docSnap.exists()) {
        this.cartItems = docSnap.data().items || [];
        this.updateProductAvailability();
      }
    });
  }

  // New: Update product availability based on cart and stock
  updateProductAvailability() {
    const productCards = document.querySelectorAll(".product-card");
    productCards.forEach((card) => {
      const productId = card.querySelector(".cart-btn")?.dataset.id;
      if (!productId) return;

      const product = this.products.find((p) => p.id === productId);
      if (!product) return;

      const cartItem = this.cartItems.find((item) => item.id === productId);
      const cartQuantity = cartItem ? cartItem.quantity : 0;
      const availableStock = product.stock - cartQuantity;

      const addButton = card.querySelector(".cart-btn");
      if (!addButton) return;

      if (availableStock <= 0) {
        addButton.innerHTML =
          '<i class="fas fa-times-circle"></i> Out of Stock';
        addButton.classList.add("disabled");
        addButton.disabled = true;
        card.classList.add("out-of-stock");
      } else {
        addButton.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        addButton.classList.remove("disabled");
        addButton.disabled = false;
        card.classList.remove("out-of-stock");
      }

      const stockBadge = card.querySelector(".stock-badge");
      if (stockBadge) {
        if (availableStock <= 0) {
          stockBadge.textContent = "Out of Stock";
          stockBadge.className = "stock-badge out-of-stock-badge";
        } else if (availableStock <= 5) {
          stockBadge.textContent = `Only ${availableStock} left!`;
          stockBadge.className = "stock-badge";
        }
      }
    });
  }

  processProducts(querySnapshot) {
    this.products = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name && data.price !== undefined && data.status === "active") {
        this.products.push({
          id: doc.id,
          name: data.name,
          price: data.price,
          category: data.category || "uncategorized",
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          stock: data.stock || 0,
        });
      }
    });
  }

  renderProducts(filterCategory = "all") {
    this.currentFilter = filterCategory;
    this.productContainer.innerHTML = "";
    const filteredProducts =
      filterCategory === "all"
        ? this.products
        : this.products.filter((p) => p.category === filterCategory);

    if (filteredProducts.length === 0) {
      this.showNoProductsMessage(filterCategory);
      return;
    }

    filteredProducts.forEach((product) => {
      this.productContainer.appendChild(this.createProductCard(product));
    });
    this.updateProductAvailability(); // Update availability after rendering
  }

  createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.category = product.category;

    const cartItem = this.cartItems.find((item) => item.id === product.id);
    const cartQuantity = cartItem ? cartItem.quantity : 0;
    const availableStock = product.stock - cartQuantity;

    if (availableStock <= 0) {
      card.classList.add("out-of-stock");
    }

    card.innerHTML = `
      <div class="product-image-container">
        ${
          product.imageUrl
            ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-image">`
            : `<div class="product-image-placeholder"><i class="fas fa-box-open"></i></div>`
        }
        ${
          availableStock <= 5 && availableStock > 0
            ? `<span class="stock-badge">Only ${availableStock} left!</span>`
            : ""
        }
        ${
          availableStock <= 0
            ? `<span class="stock-badge out-of-stock-badge">Out of Stock</span>`
            : ""
        }
      </div>
      <div class="product-info">
        <p class="product-category">${this.formatCategory(product.category)}</p>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${
          product.description || "Farm fresh quality product"
        }</p>
        <div class="product-footer">
          <span class="price">R${product.price.toFixed(2)}</span>
          ${
            availableStock > 0
              ? `<button class="cart-btn" aria-label="Add ${product.name} to cart" data-id="${product.id}">
                  <i class="fas fa-cart-plus"></i> Add to Cart
                </button>`
              : `<button class="cart-btn disabled" disabled aria-label="Out of stock" data-id="${product.id}">
                  <i class="fas fa-times-circle"></i> Out of Stock
                </button>`
          }
        </div>
      </div>
    `;
    return card;
  }

  setupEventListeners() {
    this.filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.renderProducts(btn.dataset.category);
      });
    });

    this.productContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".cart-btn:not(.disabled)");
      if (btn) {
        this.addToCart(btn.dataset.id);
      }
    });
  }

  async addToCart(productId) {
    const product = this.products.find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;

    try {
      let cartId = sessionStorage.getItem("cartId");
      if (!cartId) {
        cartId = `guest_${Date.now()}`;
        sessionStorage.setItem("cartId", cartId);
      }

      const cartRef = doc(db, "carts", cartId);
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        const existingItem = cartSnap
          .data()
          .items.find((item) => item.id === productId);

        if (existingItem) {
          // Check if adding would exceed available stock
          const currentStock = product.stock;
          const currentQuantity = existingItem.quantity;
          if (currentQuantity >= currentStock) {
            this.showToast(`Only ${currentStock} available in stock`);
            return;
          }

          await updateDoc(cartRef, {
            items: cartSnap
              .data()
              .items.map((item) =>
                item.id === productId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
          });
        } else {
          await updateDoc(cartRef, {
            items: arrayUnion({
              id: productId,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl || "",
              quantity: 1,
            }),
          });
        }
      } else {
        await setDoc(cartRef, {
          items: [
            {
              id: productId,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl || "",
              quantity: 1,
            },
          ],
          createdAt: new Date(),
          isGuestCart: true,
        });
      }

      this.showToast(`${product.name} added to cart!`);
      this.updateCartCount();
    } catch (error) {
      console.error("Error adding to cart:", error);
      this.showToast("Failed to add item to cart");
    }
  }

  updateCartCount() {
    const cartId = sessionStorage.getItem("cartId");
    if (!cartId) {
      this.setCartCount(0);
      return;
    }

    const cartRef = doc(db, "carts", cartId);
    getDoc(cartRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const items = docSnap.data().items || [];
          const totalQuantity = items.reduce(
            (sum, item) => sum + item.quantity,
            0
          );
          this.setCartCount(totalQuantity);
        } else {
          this.setCartCount(0);
        }
      })
      .catch((error) => {
        console.error("Error fetching cart:", error);
        this.setCartCount(0);
      });
  }

  setCartCount(count) {
    const cartCountElements = document.querySelectorAll(".cart-count");
    cartCountElements.forEach((el) => {
      el.textContent = count;
    });
  }

  showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  showLoadingState() {
    this.productContainer.innerHTML = `
      <div class="loading-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading products...</p>
      </div>
    `;
  }

  showNoProductsMessage(category = "all") {
    this.productContainer.innerHTML = `
      <div class="no-products">
        <i class="fas fa-box-open"></i>
        <p>No ${
          category === "all" ? "" : this.formatCategory(category) + " "
        }products available</p>
      </div>
    `;
  }

  showErrorState() {
    this.productContainer.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load products. Please try again later.</p>
      </div>
    `;
  }

  formatCategory(category) {
    const categoryMap = {
      poultry: "Chicken",
      beef: "Beef",
      pork: "Pork",
      eggs: "Eggs",
    };
    return categoryMap[category] || category;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const productDisplay = new ProductDisplay();
  productDisplay.init();
});
