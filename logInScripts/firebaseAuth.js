// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { storeUsers } from "./user.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYrVFLH2IWM3JuUfWmxyp_2LoYBzBPo7Q",
  authDomain: "amacusi-farming-1d06b.firebaseapp.com",
  projectId: "amacusi-farming-1d06b",
  storageBucket: "amacusi-farming-1d06b.firebasestorage.app",
  messagingSenderId: "213188618626",
  appId: "1:213188618626:web:6579b3b2917417c44b879b",
  measurementId: "G-QDK98N041S",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const provider = new GoogleAuthProvider();
const auth = getAuth(app);
const db = getFirestore(app);
auth.languageCode = "en";

const signInBtn = document.getElementById("googleSignInBtn");

signInBtn.addEventListener("click", async function () {
  try {
    const result = await signInWithPopup(auth, provider);
    // This gives you a Google Access Token. You can use it to access the Google API.
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential.accessToken;
    const user = result.user;
    console.log("User signed in:", user);

    // Store user in Firestore
    await storeUsers(user, db);

    // Redirect or show success message
    alert("Successfully signed in!");
    // window.location.href = "/dashboard.html"; // Uncomment to redirect
  } catch (error) {
    // Improved error handling
    console.error("Full error object:", error);

    const errorCode = error.code;
    const errorMessage = error.message;

    // Safer way to get email if available
    const email =
      error.email || (error.customData && error.customData.email) || "unknown";

    // The AuthCredential type that was used.
    const credential = GoogleAuthProvider.credentialFromError(error);

    // Show user-friendly error message
    let userMessage = "Sign-in failed. ";
    switch (errorCode) {
      case "auth/popup-closed-by-user":
        userMessage += "You closed the sign-in window.";
        break;
      case "auth/account-exists-with-different-credential":
        userMessage += "An account already exists with this email.";
        break;
      default:
        userMessage += errorMessage;
    }

    alert(userMessage);
    console.error("Error details:", {
      errorCode,
      errorMessage,
      email,
      credential,
    });
  }
});
