/* ManiDealsCampus - Authentication Handlers */

import { 
  auth, 
  db,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  doc, 
  setDoc, 
  getDoc 
} from "./firebase-config.js";
import { showToast, guardRoute } from "./app.js";

// Handle user Sign Up
export async function signUpUser(email, password, name, phone, college, department, year) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send email verification
    try {
      await sendEmailVerification(user);
      showToast("Verification email sent! Please check your inbox.", "info");
    } catch (verifErr) {
      console.error("Email verification send failed:", verifErr);
    }

    // Save student details to Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      phone: phone,
      college: college,
      department: department,
      year: year,
      photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80", // Default avatar
      role: "student",
      createdAt: new Date().toISOString()
    });

    showToast("Account created successfully!", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);
  } catch (error) {
    showToast(error.message, "error");
    throw error;
  }
}

// Handle user Sign In
export async function loginUser(email, password, rememberMe) {
  try {
    // Set authentication persistence
    const persistenceMode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceMode);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showToast("Welcome back!", "success");
    
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
    return userCredential.user;
  } catch (error) {
    showToast(error.message, "error");
    throw error;
  }
}

// Handle Google Login
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user has an existing Firestore entry
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // Create a default Firestore record for new Google users
      await setDoc(userDocRef, {
        uid: user.uid,
        name: user.displayName || "College Student",
        email: user.email,
        phone: user.phoneNumber || "",
        college: "Manipal Institute of Technology", // Fallback default
        department: "General Science",
        year: "1st Year",
        photo: user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        role: "student",
        createdAt: new Date().toISOString()
      });
    }

    showToast("Successfully logged in with Google!", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1200);
  } catch (error) {
    showToast(error.message, "error");
  }
}

// Handle Password Reset
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("Password reset email sent! Please check your inbox.", "success");
  } catch (error) {
    showToast(error.message, "error");
    throw error;
  }
}
