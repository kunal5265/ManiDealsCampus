/* ManiDealsCampus - Product Listing Posting and Editing */

import { 
  auth, 
  db, 
  storage, 
  onAuthStateChanged, 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "./firebase-config.js";
import { guardRoute, showToast } from "./app.js";

// Check authentication status
guardRoute(true);

let isEditing = false;
let editProductId = null;
let existingImages = [];

onAuthStateChanged(auth, (user) => {
  if (user) {
    initSellPage();
  }
});

async function initSellPage() {
  const form = document.getElementById("sell-product-form");
  if (!form) return;

  const titleHeader = document.getElementById("sell-page-title");
  const submitBtn = document.getElementById("sell-submit-btn");

  // Check if we are editing an existing product
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("edit");

  if (editId) {
    isEditing = true;
    editProductId = editId;
    if (titleHeader) titleHeader.textContent = "Edit Product Listing";
    if (submitBtn) submitBtn.textContent = "Save Changes";
    await loadProductForEdit(editId);
  }

  // Handle Form Submission
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const title = document.getElementById("product-title").value.trim();
    const description = document.getElementById("product-desc").value.trim();
    const category = document.getElementById("product-category").value;
    const price = parseFloat(document.getElementById("product-price").value);
    const imageFiles = document.getElementById("product-images").files;

    if (!title || !description || !category || isNaN(price)) {
      showToast("Please fill in all listing details.", "error");
      return;
    }

    // Require image on creation
    if (!isEditing && imageFiles.length === 0) {
      showToast("Please upload at least one image of your product.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing... Please wait";

    try {
      const user = auth.currentUser;
      let imageUrls = [...existingImages];

      // Upload new images if selected
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const path = `products/${user.uid}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, path);
          
          const result = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(result.ref);
          imageUrls.push(url);
        }
      }

      if (isEditing) {
        // Save edits (maintain pending status for review if title/price changed)
        await updateDoc(doc(db, "products", editProductId), {
          title,
          description,
          category,
          price,
          images: imageUrls,
          status: "pending", // Reset status to pending for review
          updatedAt: new Date().toISOString()
        });
        showToast("Product listing updated and sent for review!", "success");
      } else {
        // Create new item (starts as pending admin approval)
        await addDoc(collection(db, "products"), {
          title,
          description,
          category,
          price,
          sellerId: user.uid,
          sellerName: user.displayName || "Student",
          images: imageUrls,
          status: "pending",
          createdAt: new Date().toISOString()
        });
        showToast("Product listed successfully! Pending admin approval.", "success");
      }

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);

    } catch (err) {
      showToast("Operation failed: " + err.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = isEditing ? "Save Changes" : "Post Product";
    }
  });
}

// Load current product state for editing
async function loadProductForEdit(productId) {
  try {
    const docSnap = await getDoc(doc(db, "products", productId));
    if (!docSnap.exists()) {
      showToast("Listing not found.", "error");
      setTimeout(() => window.location.href = "dashboard.html", 1500);
      return;
    }

    const product = docSnap.data();
    
    // Ensure current user is the owner
    if (product.sellerId !== auth.currentUser.uid) {
      showToast("Unauthorized.", "error");
      window.location.href = "dashboard.html";
      return;
    }

    // Populate fields
    document.getElementById("product-title").value = product.title || "";
    document.getElementById("product-desc").value = product.description || "";
    document.getElementById("product-category").value = product.category || "";
    document.getElementById("product-price").value = product.price || 0;

    existingImages = product.images || [];

    // Show image preview thumbnails
    const previewContainer = document.getElementById("existing-preview-images");
    if (previewContainer && existingImages.length > 0) {
      previewContainer.innerHTML = "<h4>Existing Images:</h4>";
      const list = document.createElement("div");
      list.style.display = "flex";
      list.style.gap = "10px";
      list.style.marginTop = "10px";

      existingImages.forEach((imgUrl, index) => {
        const item = document.createElement("div");
        item.style.position = "relative";
        
        const img = document.createElement("img");
        img.src = imgUrl;
        img.style.width = "70px";
        img.style.height = "70px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        
        // Remove button
        const del = document.createElement("button");
        del.innerHTML = "×";
        del.style.position = "absolute";
        del.style.top = "-5px";
        del.style.right = "-5px";
        del.style.background = "#e74c3c";
        del.style.color = "#fff";
        del.style.border = "none";
        del.style.borderRadius = "50%";
        del.style.width = "20px";
        del.style.height = "20px";
        del.style.cursor = "pointer";
        del.style.display = "flex";
        del.style.alignItems = "center";
        del.style.justifyContent = "center";

        del.addEventListener("click", (e) => {
          e.preventDefault();
          existingImages.splice(index, 1);
          item.remove();
        });

        item.appendChild(img);
        item.appendChild(del);
        list.appendChild(item);
      });
      previewContainer.appendChild(list);
    }

  } catch (err) {
    showToast("Failed to load product details: " + err.message, "error");
  }
}
