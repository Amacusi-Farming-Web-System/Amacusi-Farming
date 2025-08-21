import { auth } from "../admin/firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function updateAuthUI(user) {
  // Update profile icons
  document.querySelectorAll(".fa-user").forEach((icon) => {
    const link = icon.closest("a");
    if (link) {
      link.href = user ? "../pages/profile.html" : "../pages/signUp.html";
      link.setAttribute("aria-label", user ? "My Profile" : "Sign In");
    }
  });

  // Update guest messages
  document.querySelectorAll("#guest-checkout-message").forEach((msg) => {
    msg.style.display = user ? "none" : "block";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
  });
});
