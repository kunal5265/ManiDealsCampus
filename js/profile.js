/* ManiDealsCampus - Profile Management Logic */

import { 
  auth, 
  db, 
  storage, 
  onAuthStateChanged, 
  doc, 
  getDoc, 
  updateDoc, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "./firebase-config.js";
import { guardRoute, showToast } from "./app.js";

// Guard page for authenticated users
guardRoute(true);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    setupProfileForm(user);
    setupAvatarUpload(user);
  }
});

async function setupProfileForm(user) {
  const form = document.getElementById("profile-edit-form");
  if (!form) return;

  try {
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const userData = docSnap.data();

      // Populate input elements
      document.getElementById("profile-name").value = userData.name || "";
      document.getElementById("profile-phone").value = userData.phone || "";
      document.getElementById("profile-college").value = userData.college || "";
      document.getElementById("profile-dept").value = userData.department || "";
      document.getElementById("profile-year").value = userData.year || "";
      document.getElementById("profile-email").value = userData.email || ""; // read-only

      const avatarPreview = document.getElementById("profile-avatar-preview");
      if (avatarPreview) {
        avatarPreview.src = userData.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
      }
    }

    // Submit handler
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const name = document.getElementById("profile-name").value.trim();
      const phone = document.getElementById("profile-phone").value.trim();
      const college = document.getElementById("profile-college").value;
      const dept = document.getElementById("profile-dept").value.trim();
      const year = document.getElementById("profile-year").value;

      if (!name || !phone || !college || !dept) {
        showToast("Please fill all required profile fields.", "error");
        return;
      }

      try {
        await updateDoc(doc(db, "users", user.uid), {
          name,
          phone,
          college,
          department: dept,
          year
        });
        showToast("Profile details updated successfully!", "success");
      } catch (err) {
        showToast("Failed to update profile: " + err.message, "error");
      }
    });

  } catch (err) {
    showToast("Error retrieving profile: " + err.message, "error");
  }
}

// Upload Avatar file to Firebase Storage
function setupAvatarUpload(user) {
  const avatarInput = document.getElementById("avatar-file-input");
  const avatarPreview = document.getElementById("profile-avatar-preview");

  if (!avatarInput) return;

  avatarInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      showToast("Please choose a valid image file.", "error");
      return;
    }

    // Show dynamic loader state on avatar
    if (avatarPreview) avatarPreview.style.opacity = "0.5";

    try {
      const storageRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}.jpg`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Update Firestore user record
      await updateDoc(doc(db, "users", user.uid), {
        photo: downloadURL
      });

      // Update local DOM
      if (avatarPreview) {
        avatarPreview.src = downloadURL;
        avatarPreview.style.opacity = "1";
      }
      showToast("Profile picture updated!", "success");

    } catch (err) {
      if (avatarPreview) avatarPreview.style.opacity = "1";
      showToast("Upload failed: " + err.message, "error");
    }
  });
}
