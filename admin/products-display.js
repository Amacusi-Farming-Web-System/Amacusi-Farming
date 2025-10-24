import { auth, db } from "../logInScripts/firebaseAuth.js";
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  arrayUnion,
  increment,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", function () {
  // Load products
  const products = JSON.parse(localStorage.getItem("amacusi-products")) || [
    {
      id: 1,
      name: "Free Range Chicken",
      category: "Chicken",
      price: 85,
      stock: 120,
      status: "active",
      description: "Humanely raised chickens with no antibiotics.",
      image: "../Images/ChickenProduct.jpg",
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
      image: "../Images/BeefProduct.jpg",
      unit: "kg"
    },
    {
      id: 3,
      name: "Natural Pork",
      category: "pork",
      price: 95,
      stock: 60,
      status: "active",
      description: "Tender pork from pigs raised in natural environments with no growth hormones.",
      image: "../Images/PorkProduct.jpg",
      unit: "kg"
    },
    {
      id: 4,
      name: "Farm Fresh Eggs",
      category: "eggs",
      price: 45,
      stock: 200,
      status: "active",
      description: "Farm fresh eggs collected daily from free-range chickens (30 eggs per tray).",
      image: "../Images/eggProduct.jpg",
      unit: "tray"
    },
    {
      id: 5,
      name: "Organic Goat Meat",
      category: "goat",
      price: 110,
      stock: 50,
      status: "active",
      description: "Lean and flavorful goat meat from free-range goats.",
      image: "../Images/GoatProduct.jpg",
      unit: "kg"
    },
  ];

  // Initialize
  renderProducts();
  setupEventListeners();

  function renderProducts(category = "all") {
    const container = document.getElementById("product-container");
    container.innerHTML = "";

    const filteredProducts = products.filter(
      (product) =>
        (category === "all" || product.category === category) &&
        product.status === "active"
    );

    if (filteredProducts.length === 0) {
      container.innerHTML = '<p class="no-products">No products available</p>';
      return;
    }

    filteredProducts.forEach((product) => {
      const productCard = document.createElement("article");
      productCard.className = "product-card";
      productCard.innerHTML = `
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}" onerror="this.src='../Images/default-product.jpg'">
        </div>
        <div class="product-info">
          <span class="product-type">${formatCategory(product.category)}</span>
          <h2>${product.name}</h2>
          <p class="product-description">${product.description}</p>
          <div class="product-actions">
            <div class="price">R${product.price} <span>/ ${product.unit}</span></div>
            <button class="cart-btn" 
                    data-id="${product.id}" 
                    data-name="${product.name}" 
                    data-price="${product.price}"
                    data-category="${product.category}"
                    data-image="${product.image}">
              <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
          </div>
        </div>
      `;
      container.appendChild(productCard);
    });

    attachCartEvents();
  }

  function attachCartEvents() {
    document.querySelectorAll(".cart-btn").forEach((button) => {
      button.addEventListener("click", async function () {
        const productId = this.dataset.id;
        const productName = this.dataset.name;
        const productPrice = parseFloat(this.dataset.price);
        const productCategory = this.dataset.category;
        const productImage = this.dataset.image;

        try {
          await addToCart(productId, productName, productPrice, productCategory, productImage);
          
          // Show success feedback
          this.innerHTML = '<i class="fas fa-check"></i> Added!';
          this.disabled = true;
          setTimeout(() => {
            this.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
            this.disabled = false;
          }, 2000);
          
        } catch (error) {
          console.error("Error adding to cart:", error);
          alert("Failed to add item to cart. Please try again.");
        }
      });
    });
  }

  async function addToCart(productId, productName, productPrice, productCategory, productImage) {
    // Get or create cart ID
    let cartId = sessionStorage.getItem("cartId");
    
    if (!cartId) {
      cartId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("cartId", cartId);
    }

    const cartRef = doc(db, "carts", cartId);
    const cartSnap = await getDoc(cartRef);

    const cartItem = {
      id: productId,
      name: productName,
      price: productPrice,
      category: productCategory,
      imageUrl: productImage,
      quantity: 1,
      addedAt: new Date().toISOString()
    };

    if (cartSnap.exists()) {
      // Update existing cart
      const cartData = cartSnap.data();
      const existingItemIndex = cartData.items.findIndex(item => item.id === productId);
      
      if (existingItemIndex > -1) {
        // Update quantity if item exists
        const updatedItems = [...cartData.items];
        updatedItems[existingItemIndex].quantity += 1;
        
        await updateDoc(cartRef, {
          items: updatedItems,
          updatedAt: serverTimestamp()
        });
      } else {
        // Add new item
        await updateDoc(cartRef, {
          items: arrayUnion(cartItem),
          updatedAt: serverTimestamp()
        });
      }
    } else {
      // Create new cart
      await setDoc(cartRef, {
        items: [cartItem],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // Update cart count in header
    updateCartCount();
  }

  async function updateCartCount() {
    const cartId = sessionStorage.getItem("cartId");
    if (!cartId) {
      document.querySelectorAll(".cart-count").forEach(el => el.textContent = "0");
      return;
    }

    try {
      const cartRef = doc(db, "carts", cartId);
      const cartSnap = await getDoc(cartRef);
      
      if (cartSnap.exists()) {
        const cartData = cartSnap.data();
        const totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
        document.querySelectorAll(".cart-count").forEach(el => el.textContent = totalItems);
      } else {
        document.querySelectorAll(".cart-count").forEach(el => el.textContent = "0");
      }
    } catch (error) {
      console.error("Error updating cart count:", error);
      document.querySelectorAll(".cart-count").forEach(el => el.textContent = "0");
    }
  }

  function setupEventListeners() {
    document.querySelectorAll(".filter-btn").forEach((button) => {
      button.addEventListener("click", function () {
        document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");
        renderProducts(this.dataset.category);
      });
    });
  }

  function formatCategory(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  // Initialize cart count on page load
  updateCartCount();
});