/* ManiDealsCampus - Products & Details operations */

import { 
  auth, 
  db, 
  onAuthStateChanged,
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  query,
  where,
  addDoc
} from "./firebase-config.js";
import { showToast, openModal, closeModal } from "./app.js";

// Global cache of products for local client-side filtering/sorting to minimize Firestore reads
let allProducts = [];
let userWishlist = [];

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        userWishlist = userDoc.data().wishlist || [];
      }
    }

    // Determine current page
    if (document.getElementById("products-grid")) {
      initMarketplacePage();
    } else if (document.getElementById("product-detail-view")) {
      initProductDetailsPage();
    }
  });
});

/* =========================================================================
   MARKETPLACE PAGE (products.html)
   ========================================================================= */

async function initMarketplacePage() {
  const productsGrid = document.getElementById("products-grid");
  if (!productsGrid) return;

  productsGrid.innerHTML = `<div class="empty-state"><div class="loader"></div><p style="margin-top:1rem;">Fetching campus listings...</p></div>`;

  try {
    // Read URL parameters for search or categories
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get("search");
    const categoryParam = urlParams.get("category");

    // Fetch only active/approved products
    const q = query(collection(db, "products"), where("status", "==", "approved"));
    const querySnapshot = await getDocs(q);

    allProducts = [];
    querySnapshot.forEach((docSnap) => {
      allProducts.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Preset filters from URL parameters
    if (searchParam) {
      const searchBox = document.getElementById("marketplace-search-box");
      if (searchBox) searchBox.value = searchParam;
    }
    if (categoryParam) {
      const checkbox = document.querySelector(`.category-filter[value="${categoryParam}"]`);
      if (checkbox) checkbox.checked = true;
    }

    setupFilterListeners();
    applyFilters();

  } catch (err) {
    showToast("Error loading marketplace: " + err.message, "error");
  }
}

function setupFilterListeners() {
  // Listeners for inputs, checkboxes, select triggers
  document.querySelectorAll(".category-filter").forEach(cb => cb.addEventListener("change", applyFilters));
  document.getElementById("min-price")?.addEventListener("input", applyFilters);
  document.getElementById("max-price")?.addEventListener("input", applyFilters);
  document.getElementById("sort-by")?.addEventListener("change", applyFilters);
  
  const searchBox = document.getElementById("marketplace-search-box");
  if (searchBox) {
    searchBox.addEventListener("input", applyFilters);
  }
}

function applyFilters() {
  const productsGrid = document.getElementById("products-grid");
  if (!productsGrid) return;

  // 1. Gather filter states
  const queryText = document.getElementById("marketplace-search-box")?.value.toLowerCase().trim() || "";
  const minPrice = parseFloat(document.getElementById("min-price")?.value) || 0;
  const maxPrice = parseFloat(document.getElementById("max-price")?.value) || Infinity;
  const sortBy = document.getElementById("sort-by")?.value || "newest";

  const selectedCategories = [];
  document.querySelectorAll(".category-filter:checked").forEach(cb => {
    selectedCategories.push(cb.value);
  });

  // 2. Filter products locally
  let filtered = allProducts.filter(product => {
    // Category match
    if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) {
      return false;
    }
    // Price match
    if (product.price < minPrice || product.price > maxPrice) {
      return false;
    }
    // Search match (title or description)
    if (queryText) {
      const titleMatch = product.title?.toLowerCase().includes(queryText);
      const descMatch = product.description?.toLowerCase().includes(queryText);
      if (!titleMatch && !descMatch) return false;
    }
    return true;
  });

  // 3. Sort products
  if (sortBy === "newest") {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === "price-low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === "price-high") {
    filtered.sort((a, b) => b.price - a.price);
  }

  // Update UI count
  const resultsCount = document.getElementById("results-count");
  if (resultsCount) resultsCount.textContent = filtered.length;

  // 4. Render listings
  renderProductCards(filtered, productsGrid);
}

function renderProductCards(products, container) {
  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-search"></i>
        <h3>No matching listings</h3>
        <p>Try refining your search terms or filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";
  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card glass";
    
    const isWishlisted = userWishlist.includes(product.id);
    const wishlistIcon = isWishlisted ? "fas fa-heart" : "far fa-heart";
    const dateFormatted = new Date(product.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});

    card.innerHTML = `
      <div class="product-img-wrapper">
        <a href="product-details.html?id=${product.id}">
          <img class="product-card-img" src="${product.images?.[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=350&q=80'}" alt="${product.title}">
        </a>
        <span class="product-badge badge badge-buy">Buy / Sell</span>
        <button class="wishlist-btn-badge toggle-wishlist-btn" data-id="${product.id}" title="Add to Wishlist">
          <i class="${wishlistIcon}"></i>
        </button>
      </div>
      <div class="product-info">
        <span class="product-category">${product.category}</span>
        <h3 class="product-title"><a href="product-details.html?id=${product.id}">${product.title}</a></h3>
        <div class="product-meta">
          <span class="product-price">₹${product.price}</span>
          <span class="product-date"><i class="far fa-calendar"></i> ${dateFormatted}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Wire up wishlist toggles
  container.querySelectorAll(".toggle-wishlist-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pId = e.currentTarget.getAttribute("data-id");
      const icon = e.currentTarget.querySelector("i");
      await toggleWishlist(pId, icon);
    });
  });
}

// Toggle Wishlist handler
async function toggleWishlist(productId, iconElement) {
  const user = auth.currentUser;
  if (!user) {
    showToast("Please log in to manage your wishlist.", "error");
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const isCurrentlySaved = userWishlist.includes(productId);

  try {
    if (isCurrentlySaved) {
      await updateDoc(userDocRef, {
        wishlist: arrayRemove(productId)
      });
      userWishlist = userWishlist.filter(id => id !== productId);
      iconElement.className = "far fa-heart";
      showToast("Removed from wishlist.", "info");
    } else {
      await updateDoc(userDocRef, {
        wishlist: arrayUnion(productId)
      });
      userWishlist.push(productId);
      iconElement.className = "fas fa-heart";
      showToast("Added to wishlist!", "success");
    }
  } catch (err) {
    showToast("Failed to update wishlist: " + err.message, "error");
  }
}

/* =========================================================================
   PRODUCT DETAILS PAGE (product-details.html)
   ========================================================================= */

async function initProductDetailsPage() {
  const detailView = document.getElementById("product-detail-view");
  if (!detailView) return;

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (!productId) {
    detailView.innerHTML = `<div class="empty-state"><h3>Product Not Found</h3><p>Invalid product parameters.</p><a href="products.html" class="btn btn-primary">Go to Marketplace</a></div>`;
    return;
  }

  try {
    const docSnap = await getDoc(doc(db, "products", productId));
    if (!docSnap.exists()) {
      detailView.innerHTML = `<div class="empty-state"><h3>Product Not Found</h3><p>This item may have been removed or sold.</p><a href="products.html" class="btn btn-primary">Go to Marketplace</a></div>`;
      return;
    }

    const product = docSnap.data();
    
    // Fetch Seller Details
    let seller = {
      name: "Campus Seller",
      college: "Manipal Institute",
      photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80",
      phone: "",
      email: ""
    };
    
    try {
      const sellerDoc = await getDoc(doc(db, "users", product.sellerId));
      if (sellerDoc.exists()) {
        seller = sellerDoc.data();
      }
    } catch (sellerErr) {
      console.error("Failed to load seller information:", sellerErr);
    }

    // Populate Details DOM
    renderProductDetailDOM(productId, product, seller);

  } catch (err) {
    detailView.innerHTML = `<div class="empty-state"><h3>Error Loading Product</h3><p>${err.message}</p></div>`;
  }
}

function renderProductDetailDOM(productId, product, seller) {
  const mainImage = document.getElementById("details-main-img");
  const thumbList = document.getElementById("details-thumbnails");
  const title = document.getElementById("details-title");
  const category = document.getElementById("details-category");
  const price = document.getElementById("details-price");
  const desc = document.getElementById("details-desc-text");
  const dateText = document.getElementById("details-date");
  
  const sellerAvatar = document.getElementById("seller-avatar");
  const sellerName = document.getElementById("seller-name");
  const sellerMeta = document.getElementById("seller-meta-text");

  // Populate images
  if (mainImage) mainImage.src = product.images?.[0] || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80';
  
  if (thumbList && product.images) {
    thumbList.innerHTML = "";
    product.images.forEach((imgUrl, index) => {
      const img = document.createElement("img");
      img.className = `thumbnail-img ${index === 0 ? 'active' : ''}`;
      img.src = imgUrl;
      img.addEventListener("click", () => {
        document.querySelectorAll(".thumbnail-img").forEach(t => t.classList.remove("active"));
        img.classList.add("active");
        if (mainImage) mainImage.src = imgUrl;
      });
      thumbList.appendChild(img);
    });
  }

  // Populate textual content
  if (title) title.textContent = product.title;
  if (category) category.textContent = product.category;
  if (price) price.textContent = `₹${product.price}`;
  if (desc) desc.textContent = product.description;
  if (dateText) {
    const d = new Date(product.createdAt);
    dateText.textContent = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Populate seller
  if (sellerAvatar) sellerAvatar.src = seller.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80";
  if (sellerName) sellerName.textContent = seller.name;
  if (sellerMeta) sellerMeta.textContent = `${seller.college || 'MIT'} • ${seller.department || 'Student'}`;

  // Configure action buttons
  const wishlistBtn = document.getElementById("details-wishlist-btn");
  const isWishlisted = userWishlist.includes(productId);
  if (wishlistBtn) {
    wishlistBtn.innerHTML = isWishlisted ? `<i class="fas fa-heart"></i> Saved` : `<i class="far fa-heart"></i> Save to Wishlist`;
    wishlistBtn.addEventListener("click", async () => {
      const user = auth.currentUser;
      if (!user) {
        showToast("Please log in to wishlist items.", "error");
        return;
      }
      const wasWishlisted = userWishlist.includes(productId);
      const userDocRef = doc(db, "users", user.uid);
      if (wasWishlisted) {
        await updateDoc(userDocRef, { wishlist: arrayRemove(productId) });
        userWishlist = userWishlist.filter(id => id !== productId);
        wishlistBtn.innerHTML = `<i class="far fa-heart"></i> Save to Wishlist`;
        showToast("Removed from wishlist.", "info");
      } else {
        await updateDoc(userDocRef, { wishlist: arrayUnion(productId) });
        userWishlist.push(productId);
        wishlistBtn.innerHTML = `<i class="fas fa-heart"></i> Saved`;
        showToast("Added to wishlist!", "success");
      }
    });
  }

  // Purchase/Contact Button
  const buyBtn = document.getElementById("details-buy-btn");
  if (buyBtn) {
    buyBtn.addEventListener("click", () => {
      const user = auth.currentUser;
      if (!user) {
        showToast("Please log in to contact the seller.", "error");
        setTimeout(() => window.location.href = "login.html", 1500);
        return;
      }
      
      // Inject details into Contact Modal
      const modalName = document.getElementById("contact-seller-name");
      const modalPhone = document.getElementById("contact-seller-phone");
      const modalEmail = document.getElementById("contact-seller-email");

      if (modalName) modalName.textContent = seller.name;
      if (modalPhone) modalPhone.textContent = seller.phone || "Not provided";
      if (modalEmail) modalEmail.textContent = seller.email || "Not provided";

      openModal("contact-modal");
    });
  }

  // Exchange Button
  const exchangeBtn = document.getElementById("details-exchange-btn");
  if (exchangeBtn) {
    exchangeBtn.addEventListener("click", () => {
      const user = auth.currentUser;
      if (!user) {
        showToast("Please log in to initiate an exchange.", "error");
        setTimeout(() => window.location.href = "login.html", 1500);
        return;
      }

      if (user.uid === product.sellerId) {
        showToast("You cannot request an exchange on your own item!", "error");
        return;
      }

      // Configure Exchange Modal
      const itemName = document.getElementById("exchange-item-name");
      if (itemName) itemName.textContent = product.title;
      
      const form = document.getElementById("exchange-request-form");
      if (form) {
        form.onsubmit = async (e) => {
          e.preventDefault();
          const proposalText = document.getElementById("exchange-proposal").value.trim();
          if (!proposalText) {
            showToast("Please detail what you are offering to exchange.", "error");
            return;
          }

          try {
            await addDoc(collection(db, "exchanges"), {
              senderId: user.uid,
              senderName: user.displayName || "Student",
              receiverId: product.sellerId,
              receiverName: seller.name,
              targetProductId: productId,
              targetProductTitle: product.title,
              proposal: proposalText,
              status: "pending",
              createdAt: new Date().toISOString()
            });

            showToast("Exchange proposal sent successfully!", "success");
            closeModal("exchange-modal");
            form.reset();
          } catch (exErr) {
            showToast("Failed to propose exchange: " + exErr.message, "error");
          }
        };
      }

      openModal("exchange-modal");
    });
  }

  // Setup modal close hooks
  document.getElementById("close-contact-modal")?.addEventListener("click", () => closeModal("contact-modal"));
  document.getElementById("close-exchange-modal")?.addEventListener("click", () => closeModal("exchange-modal"));
}
