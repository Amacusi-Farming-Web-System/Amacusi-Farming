// Product Management System
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const productsList = document.getElementById('products-list');
    const addProductBtn = document.getElementById('addProductBtn');
    const productModal = document.getElementById('productModal');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const saveProductBtn = document.getElementById('saveProductBtn');
    const productForm = document.getElementById('productForm');
    const imageUpload = document.getElementById('imageUpload');
    const productImage = document.getElementById('productImage');
    const imagePreview = document.getElementById('imagePreview');
    const uploadText = document.getElementById('uploadText');
    
    // Statistics elements
    const totalProductsEl = document.getElementById('total-products');
    const activeProductsEl = document.getElementById('active-products');
    const outofstockProductsEl = document.getElementById('outofstock-products');
    
    // Product data (in a real app, this would come from a database)
    let products = JSON.parse(localStorage.getItem('amacusi-products')) || [
        {
            id: 1,
            name: 'Free Range Chicken',
            category: 'poultry',
            price: 85,
            stock: 120,
            status: 'active',
            description: 'Humanely raised chickens with no antibiotics, perfect for restaurants.',
            image: 'ChickenProduct.jpg'
        },
        {
            id: 2,
            name: 'Grass-Fed Beef',
            category: 'beef',
            price: 120,
            stock: 85,
            status: 'active',
            description: 'Premium cuts from cattle raised on open pastures.',
            image: 'BeefProduct.jpg'
        },
        {
            id: 3,
            name: 'Natural Pork',
            category: 'pork',
            price: 95,
            stock: 0,
            status: 'inactive',
            description: 'Tender pork from pigs raised in natural environments with no growth hormones.',
            image: 'porkProduct.jpg'
        },
        {
            id: 4,
            name: 'Farm Fresh Eggs',
            category: 'eggs',
            price: 45,
            stock: 200,
            status: 'active',
            description: 'Farm fresh eggs collected daily from free-range chickens (30 eggs per tray).',
            image: 'eggProduct.jpg'
        }
    ];
    
    let currentProductId = null;
    let isEditing = false;
    
    // Initialize the app
    function init() {
        renderProducts();
        updateStatistics();
        setupEventListeners();
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Add product button
        addProductBtn.addEventListener('click', openAddProductModal);
        
        // Modal buttons
        closeModal.addEventListener('click', closeProductModal);
        cancelBtn.addEventListener('click', closeProductModal);
        
        // Save product
        saveProductBtn.addEventListener('click', saveProduct);
        
        // Image upload
        imageUpload.addEventListener('click', () => productImage.click());
        productImage.addEventListener('change', handleImageUpload);
    }
    
    // Render products to the table
    function renderProducts() {
        productsList.innerHTML = '';
        
        if (products.length === 0) {
            productsList.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 30px;">
                        No products found. Click "Add Product" to get started.
                    </td>
                </tr>
            `;
            return;
        }
        
        products.forEach(product => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${product.image}" alt="${product.name}" class="product-img"></td>
                <td>${product.name}</td>
                <td>${formatCategory(product.category)}</td>
                <td>R${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td><span class="status status-${product.status}">${formatStatus(product.status)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-outline edit-btn" data-id="${product.id}">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger delete-btn" data-id="${product.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            
            productsList.appendChild(tr);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.currentTarget.getAttribute('data-id'));
                openEditProductModal(productId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = parseInt(e.currentTarget.getAttribute('data-id'));
                deleteProduct(productId);
            });
        });
    }
    
    // Update statistics
    function updateStatistics() {
        const total = products.length;
        const active = products.filter(p => p.status === 'active').length;
        const outofstock = products.filter(p => p.stock <= 0).length;
        
        totalProductsEl.textContent = total;
        activeProductsEl.textContent = active;
        outofstockProductsEl.textContent = outofstock;
    }
    
    // Format category for display
    function formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    // Format status for display
    function formatStatus(status) {
        return status === 'active' ? 'Active' : 'Out of Stock';
    }
    
    // Open modal for adding a new product
    function openAddProductModal() {
        isEditing = false;
        currentProductId = null;
        document.getElementById('modalTitle').textContent = 'Add New Product';
        productForm.reset();
        imagePreview.style.display = 'none';
        uploadText.style.display = 'block';
        productModal.classList.add('active');
    }
    
    // Open modal for editing an existing product
    function openEditProductModal(productId) {
        isEditing = true;
        currentProductId = productId;
        document.getElementById('modalTitle').textContent = 'Edit Product';
        
        const product = products.find(p => p.id === productId);
        if (product) {
            document.getElementById('productId').value = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productStatus').value = product.status;
            
            if (product.image) {
                imagePreview.src = product.image;
                imagePreview.style.display = 'block';
                uploadText.style.display = 'none';
            } else {
                imagePreview.style.display = 'none';
                uploadText.style.display = 'block';
            }
        }
        
        productModal.classList.add('active');
    }
    
    // Close the product modal
    function closeProductModal() {
        productModal.classList.remove('active');
    }
    
    // Handle image upload
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
                uploadText.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }
    
    // Save product (add or update)
    function saveProduct() {
        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const description = document.getElementById('productDescription').value.trim();
        const status = document.getElementById('productStatus').value;
        
        // Basic validation
        if (!name || !category || isNaN(price) || isNaN(stock)) {
            alert('Please fill in all required fields');
            return;
        }
        
        const productData = {
            name,
            category,
            price,
            stock,
            description,
            status
        };
        
        // Handle image (in a real app, you would upload this to a server)
        if (productImage.files[0]) {
            productData.image = URL.createObjectURL(productImage.files[0]);
        } else if (isEditing) {
            // Keep existing image if editing and no new image was selected
            const existingProduct = products.find(p => p.id === currentProductId);
            if (existingProduct) {
                productData.image = existingProduct.image;
            }
        }
        
        if (isEditing) {
            // Update existing product
            const index = products.findIndex(p => p.id === currentProductId);
            if (index !== -1) {
                products[index] = { ...products[index], ...productData };
            }
        } else {
            // Add new product
            const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
            productData.id = newId;
            products.push(productData);
        }
        
        // Save to localStorage (in a real app, this would be an API call)
        localStorage.setItem('amacusi-products', JSON.stringify(products));
        
        // Update UI
        renderProducts();
        updateStatistics();
        closeProductModal();
    }
    
    // Delete a product
    function deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            products = products.filter(p => p.id !== productId);
            localStorage.setItem('amacusi-products', JSON.stringify(products));
            renderProducts();
            updateStatistics();
        }
    }
    
    // Initialize the application
    init();
});