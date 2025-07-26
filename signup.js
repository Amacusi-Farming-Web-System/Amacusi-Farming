document.addEventListener("DOMContentLoaded", function () {
  const demoBtn = document.getElementById("demoGoogleBtn");
  const demoModal = document.getElementById("demoModal");
  const closeModal = document.querySelector(".close-modal");
  const demoAccounts = document.querySelectorAll(".demo-account");

  // Show modal with animation
  demoBtn.addEventListener("click", function (e) {
    e.preventDefault();
    demoModal.classList.add("active");
  });

  // Close modal when clicking X or outside
  closeModal.addEventListener("click", closeModalHandler);
  demoModal.addEventListener("click", function (e) {
    if (e.target === demoModal) {
      closeModalHandler();
    }
  });

  function closeModalHandler() {
    demoModal.classList.remove("active");
  }

  // Handle account selection
  demoAccounts.forEach((account) => {
    account.addEventListener("click", function () {
      const email = this.getAttribute("data-email");
      const name = this.querySelector("h4").textContent;
      const avatar = this.querySelector("img").src;

      // Add loading state to clicked account
      this.classList.add("loading");
      this.querySelector(".account-select").innerHTML =
        '<i class="fas fa-spinner fa-spin"></i>';

      // Simulate API call delay
      setTimeout(() => {
        simulateGoogleLogin({
          name: name,
          email: email,
          picture: avatar,
        });
        closeModalHandler();
      }, 800);
    });
  });

  // Check if already logged in
  if (localStorage.getItem("demo_user")) {
    window.location.href = "index.html";
  }
});

function simulateGoogleLogin(user) {
  // Store demo user data
  localStorage.setItem("demo_user", JSON.stringify(user));

  // Show success message
  showSuccessMessage(`Signed in as ${user.email}`);

  // Redirect after delay
  setTimeout(() => {
    window.location.href = "index.html";
  }, 2000);
}

function showSuccessMessage(message) {
  const successDiv = document.createElement("div");
  successDiv.className = "demo-success";
  successDiv.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(successDiv);

  // Trigger animation
  setTimeout(() => {
    successDiv.classList.add("active");
  }, 50);

  // Remove after 3 seconds
  setTimeout(() => {
    successDiv.classList.remove("active");
    setTimeout(() => {
      successDiv.remove();
    }, 300);
  }, 3000);
}
