const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Database helper
const DB_PATH = path.join(__dirname, 'data', 'db.json');

function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return { users: [], products: [], exchanges: [], notifications: [], activity: [] };
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return { users: [], products: [], exchanges: [], notifications: [], activity: [] };
  }
}

function writeDB(data) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Serve static uploads
app.use('/uploads', express.static(uploadDir));

// Serve static frontend assets
app.use(express.static(__dirname));

// ================= AUTHENTICATION APIs =================

// Register Auth (Initial phase)
app.post('/api/auth/register-auth', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const db = readDB();
  const existingUser = db.users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "An account with this email already exists" });
  }

  const uid = 'user-' + Date.now() + '-' + Math.round(Math.random() * 1000);
  
  // Create a placeholder user entry that setDoc will later complete
  db.users.push({
    uid,
    email,
    password, // Store plaintext for mock validation
    createdAt: new Date().toISOString()
  });
  writeDB(db);

  res.status(200).json({ uid, email });
});

// Login User
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user || user.password !== password) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  // Generate a mock token
  const token = 'mock-jwt-token-' + user.uid;
  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({
    token,
    user: userWithoutPassword
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ success: true });
});

// Google Login Mock
app.post('/api/auth/google', (req, res) => {
  const db = readDB();
  let user = db.users.find(u => u.uid === 'student-uid');
  if (!user) {
    user = {
      uid: "student-uid",
      name: "Aditya Sen",
      email: "student@manipal.edu",
      phone: "9876543210",
      college: "Manipal Institute of Technology",
      department: "Computer Science",
      year: "3rd Year",
      photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
      role: "student",
      wishlist: [],
      createdAt: new Date().toISOString(),
      password: "student123"
    };
    db.users.push(user);
    writeDB(db);
  }

  const token = 'mock-google-token-' + user.uid;
  const { password: _, ...userWithoutPassword } = user;
  res.status(200).json({ token, user: userWithoutPassword });
});

// Forgot Password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ message: "No student account found with this email" });
  }
  res.status(200).json({ success: true, message: "Reset link sent" });
});

// ================= FIRESTORE SIMULATED APIs =================

// Get collection documents with constraints filtering
app.get('/api/db/:collection', (req, res) => {
  const colName = req.params.collection;
  const db = readDB();
  if (!db[colName]) {
    db[colName] = [];
  }

  let items = [...db[colName]];

  // Handle constraints
  if (req.query.constraints) {
    try {
      const constraints = JSON.parse(req.query.constraints);
      
      constraints.forEach(c => {
        if (c.type === 'where') {
          const { field, operator, value } = c;
          
          items = items.filter(item => {
            const itemVal = item[field];
            if (operator === '==') return itemVal === value;
            if (operator === '!=') return itemVal !== value;
            if (operator === '>') return itemVal > value;
            if (operator === '<') return itemVal < value;
            if (operator === '>=') return itemVal >= value;
            if (operator === '<=') return itemVal <= value;
            if (operator === 'array-contains') return Array.isArray(itemVal) && itemVal.includes(value);
            return true;
          });
        }
      });

      // Handle sorting and limits if needed
      constraints.forEach(c => {
        if (c.type === 'orderBy') {
          const { field, direction } = c;
          items.sort((a, b) => {
            const valA = a[field];
            const valB = b[field];
            if (direction === 'desc') {
              return valA > valB ? -1 : valA < valB ? 1 : 0;
            } else {
              return valA < valB ? -1 : valA > valB ? 1 : 0;
            }
          });
        }
      });

      // Handle limit constraint last
      const limitConstraint = constraints.find(c => c.type === 'limit');
      if (limitConstraint) {
        items = items.slice(0, parseInt(limitConstraint.n));
      }

    } catch (err) {
      console.error("Error parsing constraints:", err);
    }
  }

  res.status(200).json(items);
});

// Get document
app.get('/api/db/:collection/:id', (req, res) => {
  const { collection: colName, id } = req.params;
  const db = readDB();
  
  if (!db[colName]) {
    return res.status(404).json({ message: "Collection not found" });
  }

  // Try finding by 'id' or 'uid' depending on collection type
  const item = db[colName].find(x => x.id === id || x.uid === id);
  if (!item) {
    return res.status(404).json({ message: "Document not found" });
  }

  res.status(200).json(item);
});

// Set document (PUT)
app.put('/api/db/:collection/:id', (req, res) => {
  const { collection: colName, id } = req.params;
  const data = req.body;
  const db = readDB();

  if (!db[colName]) {
    db[colName] = [];
  }

  const index = db[colName].findIndex(x => x.id === id || x.uid === id);
  
  const docData = { ...data };
  if (colName === 'users') {
    docData.uid = id;
  } else {
    docData.id = id;
  }

  if (index >= 0) {
    // Merge existing values like password if writing profile
    const existing = db[colName][index];
    db[colName][index] = { ...existing, ...docData };
  } else {
    db[colName].push(docData);
  }

  writeDB(db);
  res.status(200).json(docData);
});

// Update document (PATCH)
app.patch('/api/db/:collection/:id', (req, res) => {
  const { collection: colName, id } = req.params;
  const data = req.body;
  const db = readDB();

  if (!db[colName]) {
    return res.status(404).json({ message: "Collection not found" });
  }

  const index = db[colName].findIndex(x => x.id === id || x.uid === id);
  if (index === -1) {
    return res.status(404).json({ message: "Document not found" });
  }

  const item = db[colName][index];

  // Process updates, handling arrayUnion and arrayRemove
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && value.__type === 'arrayUnion') {
      const currentArray = Array.isArray(item[key]) ? item[key] : [];
      const newItems = value.elements.filter(el => !currentArray.includes(el));
      item[key] = [...currentArray, ...newItems];
    } else if (value && typeof value === 'object' && value.__type === 'arrayRemove') {
      const currentArray = Array.isArray(item[key]) ? item[key] : [];
      item[key] = currentArray.filter(el => !value.elements.includes(el));
    } else {
      item[key] = value;
    }
  }

  db[colName][index] = item;
  writeDB(db);
  res.status(200).json(item);
});

// Add document (POST)
app.post('/api/db/:collection', (req, res) => {
  const colName = req.params.collection;
  const data = req.body;
  const db = readDB();

  if (!db[colName]) {
    db[colName] = [];
  }

  const id = colName.substring(0, 4) + '-' + Date.now() + '-' + Math.round(Math.random() * 1000);
  const docData = { id, ...data };
  
  db[colName].push(docData);
  writeDB(db);
  res.status(200).json(docData);
});

// Delete document (DELETE)
app.delete('/api/db/:collection/:id', (req, res) => {
  const { collection: colName, id } = req.params;
  const db = readDB();

  if (!db[colName]) {
    return res.status(404).json({ message: "Collection not found" });
  }

  const initialLen = db[colName].length;
  db[colName] = db[colName].filter(x => x.id !== id && x.uid !== id);

  if (db[colName].length === initialLen) {
    return res.status(404).json({ message: "Document not found" });
  }

  writeDB(db);
  res.status(200).json({ success: true });
});

// ================= STORAGE FILE UPLOAD API =================
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(200).json({ url: fileUrl });
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 ManiDealsCampus local backend API listening on http://localhost:${PORT}`);
});
