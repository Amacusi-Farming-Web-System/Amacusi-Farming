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

// Event Listeners
addProductBtn.addEventListener("click", openAddProductModal);
closeModal.addEventListener("click", closeModalFunc);
cancelBtn.addEventListener("click", closeModalFunc);
saveProductBtn.addEventListener("click", saveProduct);
imageUpload.addEventListener("click", () => productImage.click());
productImage.addEventListener("change", handleImageUpload);

// Functions
function openAddProductModal() {
  editMode = false;
  document.getElementById("modalTitle").textContent = "Add New Product";
  productForm.reset();
  imagePreview.style.display = "none";
  uploadText.style.display = "block";
  imageFile = null;
  productModal.style.display = "flex";
}

function closeModalFunc() {
  productModal.style.display = "none";
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.match("image.*")) {
    alert("Please select an image file (JPEG, PNG, GIF)");
    return;
  }

  // Validate file size (5MB max)
  if (file.size > 20 * 1024 * 1024) {
    alert("Image must be smaller than 20MB");
    return;
  }

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

  // Validate inputs
  if (
    !productName ||
    !productCategory ||
    isNaN(productPrice) ||
    isNaN(productStock)
  ) {
    alert("Please fill in all required fields with valid values");
    return;
  }

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
  `;
  document.head.appendChild(style);
});
