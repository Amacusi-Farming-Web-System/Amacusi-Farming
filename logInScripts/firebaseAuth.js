// firebaseauth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// import your Firestore user storing helper (keeps existing behaviour)
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
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
auth.languageCode = "en";
const db = getFirestore(app);

/**
 * Sign in with Google helper (used by signup page)
 * - stores user in Firestore via storeUsers()
 * - returns the signed-in user object on success
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Ensure the user is stored in Firestore (your helper)
    try {
      await storeUsers(user, db);
    } catch (storeErr) {
      // If storeUsers fails fallback to creating a minimal user doc
      console.warn("storeUsers failed - creating fallback user doc:", storeErr);
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: user.displayName || null,
          email: user.email || null,
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    return user;
  } catch (error) {
    // Surface friendly error (caller can show toasts)
    console.error("Google sign-in failed:", error);
    throw error;
  }
}

/**
 * Check if a user is registered in Firestore users collection
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<boolean>}
 */
export async function isUserRegistered(uid) {
  if (!uid) return false;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    return snap.exists();
  } catch (error) {
    console.error("isUserRegistered error:", error);
    // In doubt, return false (forces sign-in)
    return false;
  }
}

// If there's a button with id "googleSignInBtn" on the page, attach the sign-in flow
const signInBtn = document.getElementById("googleSignInBtn");
if (signInBtn) {
  signInBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signInWithGoogle();
      // Successful sign-in: redirect to home (your previous behaviour)
      window.location.href = "index.html";
    } catch (err) {
      // You may display UI toast instead of alert in production
      alert("Sign in failed. See console for details.");
    }
  });
}

// Export core objects for other scripts
export { auth, db, provider, onAuthStateChanged };
