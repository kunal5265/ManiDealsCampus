/* ManiDealsCampus - Global Application Utilities & Shared Logic */

import { auth, db, onAuthStateChanged, signOut, doc, getDoc } from "./firebase-config.js";

// Global Theme and State management
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderHeaderFooter();
  hideLoader();
  setupMobileMenu();
});

// Toast notification helper
export function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast glass ${type}`;
  
  let icon = "fa-check-circle";
  if (type === "error") icon = "fa-exclamation-circle";
  if (type === "info") icon = "fa-info-circle";

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Automatically fade out and remove after 3s
  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 3000);
}

// Modal control helpers
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// Global modal close on background click
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    closeModal(e.target.id);
  }
});

// Theme Toggle logic
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
}

// Loader helper
function hideLoader() {
  const loader = document.getElementById("loader-wrapper");
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 500);
    }, 300);
  }
}

// Setup Hamburger Menu
function setupMobileMenu() {
  document.body.addEventListener("click", (e) => {
    const toggle = e.target.closest(".menu-toggle");
    if (toggle) {
      const navLinks = document.querySelector(".nav-links");
      navLinks.classList.toggle("active");
      const icon = toggle.querySelector("i");
      if (icon.classList.contains("fa-bars")) {
        icon.className = "fas fa-times";
      } else {
        icon.className = "fas fa-bars";
      }
    }
  });
}

// Render dynamic Header and Footer
function renderHeaderFooter() {
  const header = document.querySelector("header");
  const footer = document.querySelector("footer");

  // Track window scroll to toggle scrolled header class
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      header?.classList.add("scrolled");
    } else {
      header?.classList.remove("scrolled");
    }
  });

  onAuthStateChanged(auth, async (user) => {
    let isAdminUser = false;
    let userData = null;

    if (user) {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          userData = userDoc.data();
          if (userData.role === "admin") {
            isAdminUser = true;
          }
        }
      } catch (err) {
        console.error("Error reading user details:", err);
      }
    }

    if (header) {
      header.className = "glass";
      header.innerHTML = `
        <div class="container navbar">
          <a href="index.html" class="logo">
            <div class="logo-icon">M</div>
            ManiDeals<span>Campus</span>
          </a>
          <div class="menu-toggle"><i class="fas fa-bars"></i></div>
          <nav class="nav-links">
            <a href="index.html">Home</a>
            <a href="products.html">Marketplace</a>
            <a href="about.html">About</a>
            <a href="contact.html">Contact</a>
            ${user ? `<a href="dashboard.html">Dashboard</a>` : ""}
            ${user ? `<a href="exchange.html">Exchanges</a>` : ""}
            ${isAdminUser ? `<a href="admin.html" style="color: #e74c3c; font-weight: 700;">Admin</a>` : ""}
          </nav>
          <div class="nav-actions">
            <button class="btn-icon theme-toggle" id="theme-btn" title="Toggle Theme">
              <i class="fas fa-moon"></i>
            </button>
            ${user ? `
              <a href="wishlist.html" class="btn-icon" title="Wishlist"><i class="fas fa-heart"></i></a>
              <a href="profile.html" class="btn-icon" title="Profile">
                <img src="${userData?.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar">
              </a>
              <button class="btn btn-secondary" id="logout-btn">Logout</button>
            ` : `
              <a href="login.html" class="btn btn-secondary">Login</a>
              <a href="signup.html" class="btn btn-primary">Sign Up</a>
            `}
          </div>
        </div>
      `;

      // Attach event listeners
      document.getElementById("theme-btn")?.addEventListener("click", toggleTheme);
      document.getElementById("logout-btn")?.addEventListener("click", handleLogout);
    }
  });

  if (footer) {
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="index.html" class="logo">
              <div class="logo-icon">M</div>
              ManiDeals<span>Campus</span>
            </a>
            <p>The exclusive campus-only buying, selling, and exchanging platform for college students. Secure, fast, and simple.</p>
          </div>
          <div class="footer-links">
            <h4>Marketplace</h4>
            <ul>
              <li><a href="products.html">Browse Products</a></li>
              <li><a href="sell.html">Sell Items</a></li>
              <li><a href="exchange.html">Exchange Items</a></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Company</h4>
            <ul>
              <li><a href="about.html">About Us</a></li>
              <li><a href="contact.html">Contact Support</a></li>
            </ul>
          </div>
          <div class="footer-links">
            <h4>Student Links</h4>
            <ul>
              <li><a href="dashboard.html">Dashboard</a></li>
              <li><a href="profile.html">My Profile</a></li>
              <li><a href="wishlist.html">My Wishlist</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 ManiDealsCampus. All rights reserved.</p>
          <div class="social-links">
            <a href="#"><i class="fab fa-facebook-f"></i></a>
            <a href="#"><i class="fab fa-twitter"></i></a>
            <a href="#"><i class="fab fa-instagram"></i></a>
            <a href="#"><i class="fab fa-github"></i></a>
          </div>
        </div>
      </div>
    `;
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
    showToast("Successfully logged out!", "success");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Auth guard route protection helper
export function guardRoute(requiresAuth = true, redirectUrl = "login.html") {
  onAuthStateChanged(auth, (user) => {
    if (requiresAuth && !user) {
      window.location.href = redirectUrl;
    } else if (!requiresAuth && user) {
      window.location.href = "dashboard.html";
    }
  });
}
