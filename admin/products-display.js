document.addEventListener("DOMContentLoaded", function () {
  // Load products
  const products = JSON.parse(localStorage.getItem("amacusi-products")) || [
    // Default products
    {
      id: 1,
      name: "Free Range Chicken",
      category: "poultry",
      price: 85,
      stock: 120,
      status: "active",
      description: "Humanely raised chickens with no antibiotics.",
      image: "Images/ChickenProduct.jpg",
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
    image: "Images/BeefProduct.jpg",
    unit: "kg"
  },
  {
    id: 3,
    name: "Natural Pork",
    category: "pork",
    price: 95,
    stock: 0,
    status: "inactive",
    description: "Tender pork from pigs raised in natural environments with no growth hormones.",
    image: "Images/PorkProduct.jpg",
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
    image: "Images/EggProduct.jpg",
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
    image: "Images/GoatProduct.jpg",
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
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-info">
          <span class="product-type">${formatCategory(product.category)}</span>
          <h2>${product.name}</h2>
          <p class="product-description">${product.description}</p>
          <div class="product-actions">
            <div class="price">R${product.price} <span>/ ${
        product.unit
      }</span></div>
            <button class="cart-btn" 
                    data-id="${product.id}" 
                    data-name="${product.name}" 
                    data-price="${product.price}"
                    data-category="${product.category}">
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
      button.addEventListener("click", function () {
        const productId = parseInt(this.dataset.id);
        const productName = this.dataset.name;
        const productPrice = parseFloat(this.dataset.price);
        const productCategory = this.dataset.category;

        if (window.addToCart) {
          window.addToCart(
            productId,
            productName,
            productPrice,
            productCategory
          );
        } else {
          console.error("addToCart function not found");
          // Fallback: Update localStorage directly
          let cart = JSON.parse(localStorage.getItem("amacusi-cart")) || [];
          cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 1,
            category: productCategory,
          });
          localStorage.setItem("amacusi-cart", JSON.stringify(cart));

          // Update cart count
          document.querySelectorAll(".cart-count").forEach((el) => {
            el.textContent = (parseInt(el.textContent) || 0) + 1;
          });
        }
      });
    });
  }

  function setupEventListeners() {
    document.querySelectorAll(".filter-btn").forEach((button) => {
      button.addEventListener("click", function () {
        document
          .querySelectorAll(".filter-btn")
          .forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");
        renderProducts(this.dataset.category);
      });
    });
  }

  function formatCategory(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
});
