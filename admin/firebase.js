// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYrVFLH2IWM3JuUfWmxyp_2LoYBzBPo7Q",
  authDomain: "amacusi-farming-1d06b.firebaseapp.com",
  projectId: "amacusi-farming-1d06b",
  storageBucket: "amacusi-farming-1d06b.firebasestorage.app",
  messagingSenderId: "213188618626",
  appId: "1:213188618626:web:6579b3b2917417c44b879b",
  measurementId: "G-QDK98N041S",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Order Status Constants
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  COMPLETED: "completed", // Added for backward compatibility
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

export const PAYMENT_METHODS = {
  CASH: "cash",
  CARD: "card",
  EFT: "eft",
};

export const COLLECTIONS = {
  ORDERS: "orders",
  USERS: "users",
  PRODUCTS: "products",
  CARTS: "carts",
};

export { db, storage, auth };
