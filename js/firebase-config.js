/* ManiDealsCampus - Mock/Simulated Firebase SDK Wrapper */

// We keep isConfigured as true so that warnings don't show, since our Express API is fully configured
export const isConfigured = true;

// Mock application, database, auth and storage references
export const app = {};
export const db = {};
export const storage = {};

export const auth = {
  currentUser: null
};

// ================= AUTH LISTENERS & PERSISTENCE =================
let authListeners = [];

// Initialize current user from storage on boot
const storedUser = localStorage.getItem("userData") || sessionStorage.getItem("userData");
if (storedUser) {
  try {
    auth.currentUser = JSON.parse(storedUser);
  } catch (e) {
    console.error("Failed to parse stored user:", e);
  }
}

export function onAuthStateChanged(authObj, callback) {
  authListeners.push(callback);
  // Trigger callback asynchronously so modules register first
  setTimeout(() => {
    callback(auth.currentUser);
  }, 0);
  
  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(cb => cb !== callback);
  };
}

function notifyAuthListeners() {
  authListeners.forEach(cb => {
    try {
      cb(auth.currentUser);
    } catch (e) {
      console.error("Error in auth state listener:", e);
    }
  });
}

// Persist user session depending on settings
export const browserLocalPersistence = "local";
export const browserSessionPersistence = "session";

export async function setPersistence(authObj, persistenceMode) {
  localStorage.setItem("auth_persistence", persistenceMode);
  return true;
}

// ================= AUTHENTICATION OPERATIONS =================

// Sign Up
export async function createUserWithEmailAndPassword(authObj, email, password) {
  const response = await fetch("/api/auth/register-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Registration failed");
  }

  const result = await response.json();
  const mockUser = { uid: result.uid, email: result.email };
  
  auth.currentUser = mockUser;
  return { user: mockUser };
}

// Sign In
export async function signInWithEmailAndPassword(authObj, email, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Login failed");
  }

  const result = await response.json(); // { token, user }
  auth.currentUser = result.user;

  const persistence = localStorage.getItem("auth_persistence") || "local";
  const storageArea = persistence === "session" ? sessionStorage : localStorage;

  storageArea.setItem("token", result.token);
  storageArea.setItem("userData", JSON.stringify(result.user));

  notifyAuthListeners();
  return { user: result.user };
}

// Google Authentication Mock
export async function loginWithGoogle() {
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    throw new Error("Google login failed");
  }

  const result = await response.json();
  auth.currentUser = result.user;

  localStorage.setItem("token", result.token);
  localStorage.setItem("userData", JSON.stringify(result.user));

  notifyAuthListeners();
  return { user: result.user };
}

export class GoogleAuthProvider {}

// Sign Out
export async function signOut(authObj) {
  await fetch("/api/auth/logout", { method: "POST" });
  
  auth.currentUser = null;
  localStorage.removeItem("token");
  localStorage.removeItem("userData");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userData");
  
  notifyAuthListeners();
}

// Forgot Password
export async function resetPassword(email) {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Reset link sending failed");
  }

  return true;
}

export async function sendPasswordResetEmail(authObj, email) {
  return resetPassword(email);
}

// Email Verification
export async function sendEmailVerification(user) {
  return true; // Auto-verify
}

// ================= FIRESTORE REFERENCE CLASSES =================

class DocRef {
  constructor(db, collectionName, id) {
    this.db = db;
    this.collection = collectionName;
    this.id = id;
    this.path = `${collectionName}/${id}`;
  }
}

class CollectionRef {
  constructor(db, collectionName) {
    this.db = db;
    this.collection = collectionName;
    this.path = collectionName;
  }
}

class Query {
  constructor(collectionRef, constraints) {
    this.collection = collectionRef.collection;
    this.constraints = constraints;
  }
}

export function doc(dbObj, collectionName, id) {
  return new DocRef(dbObj, collectionName, id);
}

export function collection(dbObj, collectionName) {
  return new CollectionRef(dbObj, collectionName);
}

// ================= FIRESTORE QUERY CONSTRAINTS =================

export function query(collectionRef, ...constraints) {
  return new Query(collectionRef, constraints);
}

export function where(field, operator, value) {
  return { type: "where", field, operator, value };
}

export function orderBy(field, direction = "asc") {
  return { type: "orderBy", field, direction };
}

export function limit(n) {
  return { type: "limit", n };
}

export function arrayUnion(...elements) {
  return { __type: "arrayUnion", elements };
}

export function arrayRemove(...elements) {
  return { __type: "arrayRemove", elements };
}

// ================= FIRESTORE DATABASE ACTIONS =================

// Get document
export async function getDoc(docRef) {
  const response = await fetch(`/api/db/${docRef.collection}/${docRef.id}`);
  
  if (response.status === 404) {
    return {
      exists: () => false,
      data: () => null,
      id: docRef.id
    };
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch document ${docRef.path}`);
  }

  const data = await response.json();
  return {
    exists: () => true,
    data: () => data,
    id: docRef.id
  };
}

// Set document
export async function setDoc(docRef, data) {
  const response = await fetch(`/api/db/${docRef.collection}/${docRef.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to set document");
  }

  const savedData = await response.json();

  // If updating logged-in student user profile details, keep local cache current
  if (docRef.collection === "users" && auth.currentUser && auth.currentUser.uid === docRef.id) {
    auth.currentUser = { ...auth.currentUser, ...savedData };
    
    const persistence = localStorage.getItem("auth_persistence") || "local";
    const storageArea = persistence === "session" ? sessionStorage : localStorage;
    storageArea.setItem("userData", JSON.stringify(auth.currentUser));
    
    notifyAuthListeners();
  }

  return savedData;
}

// Update document (PATCH)
export async function updateDoc(docRef, data) {
  const response = await fetch(`/api/db/${docRef.collection}/${docRef.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to update document");
  }

  const savedData = await response.json();

  // Sync logged in user profile updates
  if (docRef.collection === "users" && auth.currentUser && auth.currentUser.uid === docRef.id) {
    auth.currentUser = { ...auth.currentUser, ...savedData };
    
    const persistence = localStorage.getItem("auth_persistence") || "local";
    const storageArea = persistence === "session" ? sessionStorage : localStorage;
    storageArea.setItem("userData", JSON.stringify(auth.currentUser));
    
    notifyAuthListeners();
  }

  return savedData;
}

// Add document (POST)
export async function addDoc(collectionRef, data) {
  const response = await fetch(`/api/db/${collectionRef.collection}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to add document");
  }

  const savedData = await response.json();
  return {
    id: savedData.id,
    data: () => savedData
  };
}

// Delete document
export async function deleteDoc(docRef) {
  const response = await fetch(`/api/db/${docRef.collection}/${docRef.id}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    throw new Error(`Failed to delete document ${docRef.path}`);
  }

  return true;
}

// Get collection documents
export async function getDocs(queryOrCollection) {
  const collectionName = queryOrCollection.collection;
  const url = new URL(`/api/db/${collectionName}`, window.location.origin);
  
  if (queryOrCollection.constraints) {
    url.searchParams.append("constraints", JSON.stringify(queryOrCollection.constraints));
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to query collection ${collectionName}`);
  }

  const items = await response.json();
  const docs = items.map(item => {
    const id = item.id || item.uid;
    return {
      id,
      data: () => {
        // Exclude ID fields for Firebase data() equivalence
        const { id: _, uid: __, ...rest } = item;
        return rest;
      },
      exists: () => true
    };
  });

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback) => docs.forEach(callback)
  };
}

// ================= STORAGE OPERATIONS =================

class StorageRef {
  constructor(storage, path) {
    this.storage = storage;
    this.path = path;
    this.url = "";
  }
}

export function ref(storageObj, path) {
  return new StorageRef(storageObj, path);
}

export async function uploadBytes(storageRef, file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("path", storageRef.path);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("File upload failed");
  }

  const result = await response.json();
  storageRef.url = result.url; // Save dynamic file URL back to the ref object

  return {
    ref: storageRef
  };
}

export async function getDownloadURL(storageRef) {
  // Return uploaded local server URL path, or default placeholder if not uploaded
  return storageRef.url || `/uploads/${storageRef.path.split("/").pop()}`;
}
