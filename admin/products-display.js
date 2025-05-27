document.addEventListener('DOMContentLoaded', function() {
    // Load products from shared localStorage
    function loadProducts() {
        return JSON.parse(localStorage.getItem('amacusi-products')) || [
            // Default products if none exist
            {
                id: 1,
                name: 'Free Range Chicken',
                category: 'poultry',
                price: 85,
                stock: 120,
                status: 'active',
                description: 'Humanely raised chickens with no antibiotics, perfect for restaurants.',
                image: 'ChickenProduct.jpg',
                unit: 'chicken'
            },
            {
                id: 2,
                name: 'Grass-Fed Beef',
                category: 'beef',
                price: 120,
                stock: 85,
                status: 'active',
                description: 'Premium cuts from cattle raised on open pastures.',
                image: 'BeefProduct.jpg',
                unit: 'kg'
            },
            {
                id: 3,
                name: 'Natural Pork',
                category: 'pork',
                price: 95,
                stock: 0,
                status: 'inactive',
                description: 'Tender pork from pigs raised in natural environments with no growth hormones.',
                image: 'porkProduct.jpg',
                unit: 'kg'
            },
            {
                id: 4,
                name: 'Farm Fresh Eggs',
                category: 'eggs',
                price: 45,
                stock: 200,
                status: 'active',
                description: 'Farm fresh eggs collected daily from free-range chickens (30 eggs per tray).',
                image: 'eggProduct.jpg',
                unit: 'tray'
            }
        ];
    }

    // Initialize the page
    const products = loadProducts();
    renderProducts();
    setupEventListeners();

    function renderProducts(category = 'all') {
        const container = document.getElementById('product-container');
        container.innerHTML = '';

        // Filter products by category and active status
        const filteredProducts = products.filter(product => 
            (category === 'all' || product.category === category) && 
            product.status === 'active'
        );

        if (filteredProducts.length === 0) {
            container.innerHTML = '<p class="no-products">No products available in this category</p>';
            return;
        }

        filteredProducts.forEach(product => {
            const productCard = document.createElement('article');
            productCard.className = 'product-card';
            productCard.dataset.category = product.category;
            
            productCard.innerHTML = `
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
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
                                data-price="${product.price}">
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(productCard);
        });

        // Reattach cart event listeners
        attachCartEvents();
    }

    function setupEventListeners() {
        // Category filter buttons
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(btn => 
                    btn.classList.remove('active'));
                this.classList.add('active');
                const category = this.dataset.category;
                renderProducts(category);
            });
        });
    }

    function attachCartEvents() {
        document.querySelectorAll('.cart-btn').forEach(button => {
            button.addEventListener('click', function() {
                // This would be handled by your existing cart.js
                console.log('Add to cart:', {
                    id: this.dataset.id,
                    name: this.dataset.name,
                    price: this.dataset.price
                });
                
                // Example cart counter update
                const cartCount = document.querySelector('.cart-count');
                cartCount.textContent = parseInt(cartCount.textContent || '0') + 1;
            });
        });
    }

    function formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    // Listen for storage events to update products when admin makes changes
    window.addEventListener('storage', function(event) {
        if (event.key === 'amacusi-products') {
            const products = loadProducts();
            renderProducts();
        }
    });
});