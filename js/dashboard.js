/* ManiDealsCampus - Dashboard Operations */

import { 
  auth, 
  db, 
  onAuthStateChanged,
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  deleteDoc 
} from "./firebase-config.js";
import { guardRoute, showToast } from "./app.js";

// Check authentication status
guardRoute(true);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    updateDashboardProfile(user);
    await loadDashboardStats(user.uid);
    await loadMyProducts(user.uid);
    loadNotifications(user.uid);
    loadRecentActivity(user.uid);
  }
});

// Update sidebar profile card
async function updateDashboardProfile(user) {
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      const avatar = document.getElementById("db-user-avatar");
      const name = document.getElementById("db-user-name");
      const tag = document.getElementById("db-user-tag");
      const college = document.getElementById("db-user-college");
      const dept = document.getElementById("db-user-dept");
      const year = document.getElementById("db-user-year");

      if (avatar) avatar.src = userData.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
      if (name) name.textContent = userData.name || "Student";
      if (tag) tag.textContent = userData.role === "admin" ? "Campus Admin" : "Student Member";
      if (college) college.textContent = userData.college || "N/A";
      if (dept) dept.textContent = userData.department || "N/A";
      if (year) year.textContent = userData.year || "N/A";
    }
  } catch (err) {
    console.error("Error updates profile card:", err);
  }
}

// Load statistics widgets
async function loadDashboardStats(userId) {
  try {
    // 1. My Listings
    const productsQ = query(collection(db, "products"), where("sellerId", "==", userId));
    const productsSnap = await getDocs(productsQ);
    const listingCount = productsSnap.size;
    const statListings = document.getElementById("stat-my-listings");
    if (statListings) statListings.textContent = listingCount;

    // 2. Exchanges count (either sender or receiver)
    const sentExchangesQ = query(collection(db, "exchanges"), where("senderId", "==", userId));
    const recvExchangesQ = query(collection(db, "exchanges"), where("receiverId", "==", userId));
    
    const [sentSnap, recvSnap] = await Promise.all([
      getDocs(sentExchangesQ),
      getDocs(recvExchangesQ)
    ]);
    const exchangeCount = sentSnap.size + recvSnap.size;
    const statExchanges = document.getElementById("stat-exchanges");
    if (statExchanges) statExchanges.textContent = exchangeCount;

    // 3. Wishlist Count
    const userDoc = await getDoc(doc(db, "users", userId));
    const wishlistCount = userDoc.exists() ? (userDoc.data().wishlist?.length || 0) : 0;
    const statWishlist = document.getElementById("stat-wishlist");
    if (statWishlist) statWishlist.textContent = wishlistCount;

    // 4. Views or active offers (default placeholder for stats details)
    const statViews = document.getElementById("stat-views");
    if (statViews) statViews.textContent = Math.floor(Math.random() * 50) + 10; // Simulated demo views
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

// Load My Products table
async function loadMyProducts(userId) {
  const tableBody = document.getElementById("my-products-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading products...</td></tr>`;

  try {
    const q = query(collection(db, "products"), where("sellerId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem;">No products listed yet. <a href="sell.html" style="color:var(--secondary); font-weight:600;">Sell something now!</a></td></tr>`;
      return;
    }

    tableBody.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      const tr = document.createElement("tr");
      tr.id = `row-${docSnap.id}`;
      
      const badgeClass = product.status === "approved" ? "badge-approved" : "badge-pending";
      const statusText = product.status || "pending";

      tr.innerHTML = `
        <td>
          <div class="td-product-info">
            <img class="td-product-img" src="${product.images?.[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=80&q=80'}" alt="Product">
            <div class="td-product-title">
              <h4>${product.title}</h4>
              <span>${product.category}</span>
            </div>
          </div>
        </td>
        <td><strong>₹${product.price}</strong></td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
        <td>
          <div class="table-actions">
            <a href="sell.html?edit=${docSnap.id}" class="table-btn table-btn-edit" title="Edit Listing">
              <i class="fas fa-edit"></i>
            </a>
            <button class="table-btn table-btn-delete delete-product-btn" data-id="${docSnap.id}" title="Delete Listing">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Attach click listeners for delete buttons
    document.querySelectorAll(".delete-product-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const productId = e.currentTarget.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this listing?")) {
          handleDeleteProduct(productId);
        }
      });
    });

  } catch (err) {
    showToast("Error loading listings: " + err.message, "error");
  }
}

// Delete product handler
async function handleDeleteProduct(productId) {
  try {
    await deleteDoc(doc(db, "products", productId));
    showToast("Product deleted successfully!", "success");
    document.getElementById(`row-${productId}`)?.remove();
    // Refresh stats
    const user = auth.currentUser;
    if (user) loadDashboardStats(user.uid);
  } catch (err) {
    showToast("Failed to delete product: " + err.message, "error");
  }
}

// Load notifications feed (mock demo notification details)
function loadNotifications(userId) {
  const notificationsList = document.getElementById("notifications-list");
  if (!notificationsList) return;

  notificationsList.innerHTML = `
    <div class="activity-item">
      <div class="activity-icon-wrapper">
        <div class="activity-icon"><i class="fas fa-bell"></i></div>
      </div>
      <div class="activity-details">
        <h5>Welcome to ManiDealsCampus!</h5>
        <p>Explore listings, buy, sell, or exchange items inside your campus safely.</p>
        <span class="activity-time">Just now</span>
      </div>
    </div>
  `;
}

// Load Recent Activity (mock demo log events)
function loadRecentActivity(userId) {
  const activityList = document.getElementById("activity-list");
  if (!activityList) return;

  activityList.innerHTML = `
    <div class="activity-item">
      <div class="activity-icon-wrapper">
        <div class="activity-icon"><i class="fas fa-user-check"></i></div>
        <div class="activity-line"></div>
      </div>
      <div class="activity-details">
        <h5>Joined ManiDealsCampus</h5>
        <p>Your profile was successfully created and verified.</p>
        <span class="activity-time">Member since 2026</span>
      </div>
    </div>
  `;
}
