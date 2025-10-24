import { db, storage } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// DOM Elements
const productsList = document.getElementById("products-list");
const addProductBtn = document.getElementById("addProductBtn");
const productForm = document.getElementById("productForm");
const saveProductBtn = document.getElementById("saveProductBtn");
const productModal = document.getElementById("productModal");
const closeModal = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const imageUpload = document.getElementById("imageUpload");
const productImage = document.getElementById("productImage");
const imagePreview = document.getElementById("imagePreview");
const uploadText = document.getElementById("uploadText");
const totalProducts = document.getElementById("total-products");
const activeProducts = document.getElementById("active-products");
const outofstockProducts = document.getElementById("outofstock-products");

// Variables
let editMode = false;
let currentProductId = null;
let imageFile = null;

// Validation Messages
const validationMessages = {
  image: {
    required: "Product image is required",
    type: "Please select a valid image file (JPEG, PNG, GIF, WEBP)",
    size: "Image must be smaller than 20MB",
    dimensions: "Image should be at least 300x300 pixels for best quality"
  },
  description: {
    required: "Product description is required",
    minLength: "Description should be at least 20 characters long",
    maxLength: "Description should not exceed 500 characters"
  },
  name: {
    required: "Product name is required",
    minLength: "Product name should be at least 3 characters long"
  },
  price: {
    required: "Price is required",
    min: "Price must be greater than 0"
  },
  stock: {
    required: "Stock quantity is required",
    min: "Stock quantity cannot be negative"
  }
};

// Event Listeners
addProductBtn.addEventListener("click", openAddProductModal);
closeModal.addEventListener("click", closeModalFunc);
cancelBtn.addEventListener("click", closeModalFunc);
saveProductBtn.addEventListener("click", saveProduct);
imageUpload.addEventListener("click", () => productImage.click());
productImage.addEventListener("change", handleImageUpload);

// Form validation event listeners
document.getElementById('productName').addEventListener('blur', validateName);
document.getElementById('productDescription').addEventListener('blur', validateDescription);
document.getElementById('productDescription').addEventListener('input', validateDescription);
document.getElementById('productPrice').addEventListener('blur', validatePrice);
document.getElementById('productStock').addEventListener('blur', validateStock);

// Functions
function openAddProductModal() {
  editMode = false;
  document.getElementById("modalTitle").textContent = "Add New Product";
  productForm.reset();
  imagePreview.style.display = "none";
  uploadText.style.display = "block";
  imageFile = null;
  
  // Clear any existing validation messages
  clearAllValidationMessages();
  
  productModal.style.display = "flex";
}

function closeModalFunc() {
  productModal.style.display = "none";
  clearAllValidationMessages();
}

// Validation Functions
function validateName() {
  const nameInput = document.getElementById('productName');
  const name = nameInput.value.trim();
  const errorElement = document.getElementById('nameError') || createErrorElement('productName', 'nameError');
  
  clearValidationMessage(errorElement);
  
  if (!name) {
    showValidationError(errorElement, validationMessages.name.required);
    return false;
  }
  
  if (name.length < 3) {
    showValidationError(errorElement, validationMessages.name.minLength);
    return false;
  }
  
  showValidationSuccess(errorElement);
  return true;
}

function validateDescription() {
  const descInput = document.getElementById('productDescription');
  const description = descInput.value.trim();
  const errorElement = document.getElementById('descriptionError') || createErrorElement('productDescription', 'descriptionError');
  
  clearValidationMessage(errorElement);
  
  if (!description) {
    showValidationError(errorElement, validationMessages.description.required);
    return false;
  }
  
  if (description.length < 20) {
    showValidationError(errorElement, validationMessages.description.minLength);
    return false;
  }
  
  if (description.length > 500) {
    showValidationError(errorElement, validationMessages.description.maxLength);
    return false;
  }
  
  showValidationSuccess(errorElement);
  return true;
}

function validatePrice() {
  const priceInput = document.getElementById('productPrice');
  const price = parseFloat(priceInput.value);
  const errorElement = document.getElementById('priceError') || createErrorElement('productPrice', 'priceError');
  
  clearValidationMessage(errorElement);
  
  if (isNaN(price)) {
    showValidationError(errorElement, validationMessages.price.required);
    return false;
  }
  
  if (price <= 0) {
    showValidationError(errorElement, validationMessages.price.min);
    return false;
  }
  
  showValidationSuccess(errorElement);
  return true;
}

function validateStock() {
  const stockInput = document.getElementById('productStock');
  const stock = parseInt(stockInput.value);
  const errorElement = document.getElementById('stockError') || createErrorElement('productStock', 'stockError');
  
  clearValidationMessage(errorElement);
  
  if (isNaN(stock)) {
    showValidationError(errorElement, validationMessages.stock.required);
    return false;
  }
  
  if (stock < 0) {
    showValidationError(errorElement, validationMessages.stock.min);
    return false;
  }
  
  showValidationSuccess(errorElement);
  return true;
}

function validateImage() {
  const errorElement = document.getElementById('imageError') || createErrorElement('imageUpload', 'imageError');
  
  clearValidationMessage(errorElement);
  
  if (!imageFile && !editMode) {
    showValidationError(errorElement, validationMessages.image.required);
    return false;
  }
  
  if (imageFile) {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(imageFile.type)) {
      showValidationError(errorElement, validationMessages.image.type);
      return false;
    }
    
    // Check file size (20MB max)
    if (imageFile.size > 20 * 1024 * 1024) {
      showValidationError(errorElement, validationMessages.image.size);
      return false;
    }
    
    // Check image dimensions (client-side check)
    const img = new Image();
    img.onload = function() {
      if (this.width < 300 || this.height < 300) {
        const dimensionError = document.getElementById('imageError');
        if (dimensionError) {
          dimensionError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${validationMessages.image.dimensions} (Current: ${this.width}x${this.height})`;
          dimensionError.style.display = 'block';
          dimensionError.className = 'validation-error warning';
        }
      }
    };
    img.src = URL.createObjectURL(imageFile);
  }
  
  showValidationSuccess(errorElement);
  return true;
}

// Validation Helper Functions
function createErrorElement(afterElementId, errorElementId) {
  const afterElement = document.getElementById(afterElementId);
  const errorElement = document.createElement('div');
  errorElement.id = errorElementId;
  errorElement.className = 'validation-error';
  afterElement.parentNode.insertBefore(errorElement, afterElement.nextSibling);
  return errorElement;
}

function showValidationError(errorElement, message) {
  errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  errorElement.style.display = 'block';
  errorElement.className = 'validation-error error';
}

function showValidationSuccess(errorElement) {
  errorElement.innerHTML = `<i class="fas fa-check-circle"></i> Valid`;
  errorElement.style.display = 'block';
  errorElement.className = 'validation-error success';
}

function clearValidationMessage(errorElement) {
  errorElement.style.display = 'none';
  errorElement.innerHTML = '';
}

function clearAllValidationMessages() {
  const validationErrors = document.querySelectorAll('.validation-error');
  validationErrors.forEach(error => {
    error.style.display = 'none';
    error.innerHTML = '';
  });
}

function validateAllFields() {
  const isNameValid = validateName();
  const isDescriptionValid = validateDescription();
  const isPriceValid = validatePrice();
  const isStockValid = validateStock();
  const isImageValid = validateImage();
  const isCategoryValid = document.getElementById('productCategory').value !== '';

  if (!isCategoryValid) {
    const categoryError = document.getElementById('categoryError') || createErrorElement('productCategory', 'categoryError');
    showValidationError(categoryError, 'Please select a product category');
  } else {
    const categoryError = document.getElementById('categoryError');
    if (categoryError) {
      showValidationSuccess(categoryError);
    }
  }

  return isNameValid && isDescriptionValid && isPriceValid && isStockValid && isImageValid && isCategoryValid;
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  imageFile = file;
  const reader = new FileReader();
  reader.onload = function (event) {
    imagePreview.src = event.target.result;
    imagePreview.style.display = "block";
    uploadText.style.display = "none";

    // Ensure proper image display
    imagePreview.style.maxWidth = "100%";
    imagePreview.style.maxHeight = "200px";
    imagePreview.style.objectFit = "contain";
    
    // Validate the image after loading
    setTimeout(() => validateImage(), 100);
  };
  reader.readAsDataURL(file);
}

async function uploadImage(file) {
  try {
    // Show loading state
    imageUpload.classList.add("loading");
    uploadText.innerHTML =
      '<i class="fas fa-spinner spinner"></i> Uploading...';

    // Create storage reference with sanitized filename
    const sanitizedFilename = file.name
      .replace(/[^a-z0-9.]/gi, "_")
      .toLowerCase();
    const storageRef = ref(
      storage,
      `products/${Date.now()}_${sanitizedFilename}`
    );

    // Upload with progress monitoring
    const uploadTask = uploadBytesResumable(storageRef, file);

    // Wait for upload to complete
    const snapshot = await uploadTask;
    console.log("Upload completed", snapshot);

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("File available at", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("Upload error:", error);
    imageUpload.classList.add("error");
    uploadText.textContent = "Upload failed. Click to try again.";
    throw error;
  } finally {
    imageUpload.classList.remove("loading");
  }
}

async function saveProduct() {
  // Validate all fields before proceeding
  if (!validateAllFields()) {
    showToast("Please fix all validation errors before saving", "error");
    return;
  }

  // Get form values
  const productName = document.getElementById("productName").value.trim();
  const productCategory = document.getElementById("productCategory").value;
  const productPrice = parseFloat(
    document.getElementById("productPrice").value
  );
  const productStock = parseInt(document.getElementById("productStock").value);
  const productDescription = document
    .getElementById("productDescription")
    .value.trim();
  const productStatus = document.getElementById("productStatus").value;

  // Disable button during save
  saveProductBtn.disabled = true;
  saveProductBtn.innerHTML = '<i class="fas fa-spinner spinner"></i> Saving...';

  try {
    let imageUrl = "";

    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (uploadError) {
        alert("Image upload failed. Please try again.");
        saveProductBtn.disabled = false;
        saveProductBtn.innerHTML = '<i class="fas fa-save"></i> Save Product';
        return;
      }
    } else if (editMode && currentProductId) {
      // Keep existing image if editing and no new image selected
      const existingProduct = await getDoc(doc(db, "products", currentProductId));
      if (existingProduct.exists()) {
        imageUrl = existingProduct.data().imageUrl || "";
      }
    }

    // Prepare product data
    const productData = {
      name: productName,
      category: productCategory,
      price: productPrice,
      stock: productStock,
      description: productDescription,
      status: productStatus,
      createdAt: new Date(),
    };

    // Only add imageUrl if it exists
    if (imageUrl) {
      productData.imageUrl = imageUrl;
    }

    // Save to Firestore
    if (editMode && currentProductId) {
      await updateDoc(doc(db, "products", currentProductId), productData);
      showToast("Product updated successfully", "success");
    } else {
      await addDoc(collection(db, "products"), productData);
      showToast("Product added successfully", "success");
    }

    closeModalFunc();
  } catch (error) {
    console.error("Error saving product:", error);
    showToast("Error saving product. Please try again.", "error");
  } finally {
    saveProductBtn.disabled = false;
    saveProductBtn.innerHTML = '<i class="fas fa-save"></i> Save Product';
  }
}

function showToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas ${
      type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
    }"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setupProductListeners() {
  const productsRef = collection(db, "products");
  onSnapshot(productsRef, (snapshot) => {
    productsList.innerHTML = "";
    let total = 0;
    let active = 0;
    let outOfStock = 0;

    snapshot.forEach((doc) => {
      const product = doc.data();
      total++;
      if (product.status === "active") active++;
      if (product.stock <= 0) outOfStock++;
      renderProductRow(doc.id, product);
    });

    totalProducts.textContent = total;
    activeProducts.textContent = active;
    outofstockProducts.textContent = outOfStock;
  });
}

function renderProductRow(id, product) {
  const row = document.createElement("tr");
  row.setAttribute("data-product", id);

  row.innerHTML = `
    <td>
      ${
        product.imageUrl
          ? `<img src="${product.imageUrl}" class="product-thumbnail" alt="${product.name}">`
          : '<div class="no-image">No Image</div>'
      }
    </td>
    <td>${product.name}</td>
    <td>${product.category}</td>
    <td>R${product.price.toFixed(2)}</td>
    <td class="${product.stock <= 5 ? "low-stock" : ""}">${product.stock}</td>
    <td>
      <span class="status-badge ${
        product.status === "active" ? "active" : "inactive"
      }">
        ${product.status === "active" ? "Active" : "Inactive"}
      </span>
    </td>
    <td>
      <button class="btn btn-edit" data-id="${id}">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="btn btn-danger btn-delete" data-id="${id}">
        <i class="fas fa-trash"></i> Delete
      </button>
    </td>
  `;

  productsList.appendChild(row);

  row
    .querySelector(".btn-edit")
    .addEventListener("click", () => editProduct(id, product));
  row
    .querySelector(".btn-delete")
    .addEventListener("click", () => deleteProduct(id));
}

function editProduct(id, product) {
  editMode = true;
  currentProductId = id;

  document.getElementById("modalTitle").textContent = "Edit Product";
  document.getElementById("productId").value = id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productCategory").value = product.category;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productStock").value = product.stock;
  document.getElementById("productDescription").value =
    product.description || "";
  document.getElementById("productStatus").value = product.status;

  if (product.imageUrl) {
    imagePreview.src = product.imageUrl;
    imagePreview.style.display = "block";
    uploadText.style.display = "none";
  } else {
    imagePreview.style.display = "none";
    uploadText.style.display = "block";
  }

  // Validate all fields when editing
  setTimeout(() => {
    validateName();
    validateDescription();
    validatePrice();
    validateStock();
    validateImage();
  }, 100);

  productModal.style.display = "flex";
}

async function deleteProduct(id) {
  if (
    confirm(
      "Are you sure you want to delete this product? This action cannot be undone."
    )
  ) {
    try {
      await deleteDoc(doc(db, "products", id));
      showToast("Product deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting product:", error);
      showToast("Error deleting product", "error");
    }
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  setupProductListeners();

  // Add toast styles dynamically
  const style = document.createElement("style");
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 1001;
      opacity: 1;
      transition: opacity 0.3s;
    }
    .toast-success {
      background-color: var(--primary);
    }
    .toast-error {
      background-color: var(--error);
    }
    .toast.fade-out {
      opacity: 0;
    }
    .low-stock {
      color: #e74c3c;
      font-weight: bold;
    }
    
    /* Validation Styles */
    .validation-error {
      display: none;
      padding: 8px 12px;
      margin-top: 5px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .validation-error.error {
      background-color: #ffebee;
      color: #c62828;
      border-left: 3px solid #c62828;
    }
    
    .validation-error.success {
      background-color: #e8f5e9;
      color: #2e7d32;
      border-left: 3px solid #2e7d32;
    }
    
    .validation-error.warning {
      background-color: #fff3e0;
      color: #ef6c00;
      border-left: 3px solid #ef6c00;
    }
    
    .validation-error i {
      margin-right: 5px;
    }
    
    /* Form field styling for validation states */
    .form-control.error {
      border-color: #c62828;
      box-shadow: 0 0 0 2px rgba(198, 40, 40, 0.1);
    }
    
    .form-control.success {
      border-color: #2e7d32;
      box-shadow: 0 0 0 2px rgba(46, 125, 50, 0.1);
    }
    
    .file-upload.error {
      border-color: #c62828;
      background-color: rgba(198, 40, 40, 0.05);
    }
    
    .file-upload.success {
      border-color: #2e7d32;
      background-color: rgba(46, 125, 50, 0.05);
    }
    
    /* Character counter for description */
    .char-counter {
      text-align: right;
      font-size: 0.75rem;
      color: #666;
      margin-top: 5px;
    }
    
    .char-counter.warning {
      color: #ef6c00;
    }
    
    .char-counter.error {
      color: #c62828;
    }
  `;
  document.head.appendChild(style);

  // Add character counter for description
  const descriptionInput = document.getElementById('productDescription');
  const charCounter = document.createElement('div');
  charCounter.className = 'char-counter';
  charCounter.textContent = '0/500';
  descriptionInput.parentNode.insertBefore(charCounter, descriptionInput.nextSibling);

  descriptionInput.addEventListener('input', function() {
    const length = this.value.length;
    charCounter.textContent = `${length}/500`;
    
    if (length > 450 && length <= 500) {
      charCounter.className = 'char-counter warning';
    } else if (length > 500) {
      charCounter.className = 'char-counter error';
    } else {
      charCounter.className = 'char-counter';
    }
  });
});