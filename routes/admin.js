// routes/admin.js
const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets');


// POST /api/admin/login - Simple endpoint to verify the password
// 1. UPDATED Login Route
router.post('/login', async (req, res) => {
  try{
    const { adminID, adminPassword } = req.body;
  
  if (!adminID || !adminPassword) {
    return res.status(400).json({ error: 'ID and Password are required.' });
  }

  const adminData = await sheetsService.verifyAdmin(adminID, adminPassword);
  
  if (adminData) {
    // Pass the name and role back for the welcome banner
    res.json({ success: true, name: adminData.name, role: adminData.role }); 
  } else {
    res.status(401).json({ error: 'Invalid ID or password.' });
  }
  }

  catch (error) {
    console.error("Login crashed:", error); // This will print the actual error to your terminal
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. NEW Signup Route
router.post('/signup', async (req, res) => {
  const { adminName, adminPassword, adminRole } = req.body;
  
  if (!adminName || !adminPassword || !adminRole) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const newAdminID = await sheetsService.addAdmin(adminName, adminPassword, adminRole);
    res.json({ success: true, adminID: newAdminID });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Authentication Middleware
// 3. UPDATED requireAuth Middleware
// Authentication Middleware
const requireAuth = async (req, res, next) => {
  const adminID = req.headers['x-admin-id']; 
  const adminPassword = req.headers['x-admin-password'];

  if (!adminID || !adminPassword) {
    return res.status(401).json({ error: 'Unauthorized: Missing credentials' });
  }

  try {
    const adminData = await sheetsService.verifyAdmin(adminID, adminPassword);
    
    // ONLY call next() on success. DO NOT send res.json() here.
    if (adminData) {
      next(); 
    } else {
      res.status(401).json({ error: 'Unauthorized: Invalid credentials' });
    }
  } catch(error) {
    console.error("Auth Middleware Error : ", error);
    res.status(500).json({error:"Server error during authentication"});
  }
};

// Protect all admin routes
router.use(requireAuth);

// GET /api/admin/candidates
router.get('/candidates', async (req, res) => {
  try {
    const candidates = await sheetsService.getAllCandidates();
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates.' });
  }
});

// POST /api/admin/candidates
router.post('/candidates', async (req, res) => {
  const { name, className } = req.body;
  if (!name || !className) return res.status(400).json({ error: 'Missing fields.' });

  try {
    const newCandidate = await sheetsService.addCandidate(name, className);
    res.status(201).json(newCandidate);
  } catch (error) {
    console.error("Google Sheets Error:", error); // <-- Add this line
    res.status(500).json({ error: 'Failed to add candidate.' });
  }
});

// PUT /api/admin/candidates/:id
router.put('/candidates/:id', async (req, res) => {
  const { name, className } = req.body;
  try {
    await sheetsService.updateCandidate(req.params.id, name, className);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update candidate.' });
  }
});

// DELETE /api/admin/candidates/:id
router.delete('/candidates/:id', async (req, res) => {
  try {
    await sheetsService.deleteCandidate(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete candidate.' });
  }
});

// Add this anywhere in routes/admin.js before the module.exports

// POST /api/admin/active-class
router.post('/active-class', async (req, res) => {
  const { activeClass } = req.body; 
  const adminID = req.headers['x-admin-id']; // Extract the admin's ID from the header
  
  // LOG the data to your terminal to debug
  console.log(`Received activeClass update: ${activeClass} for Admin ID: ${adminID}`);

  try {
    // Pass both the adminID and the activeClass to the sheet service
    await sheetsService.setActiveClass(adminID, activeClass);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(400).json({ error: 'Failed to update active class' });
  }
});

router.get('/active-class', async (req, res) => {
  const adminID = req.headers['x-admin-id']; // Extract the admin's ID from the header
  
  try {
    // Fetch only the active class assigned to this specific admin
    const activeClass = await sheetsService.getActiveClass(adminID); 
    res.json({ activeClass });
  } catch (error) {
    console.error("Error loading class:", error);
    res.status(500).json({ error: 'Failed to load' });
  }
});

module.exports = router;