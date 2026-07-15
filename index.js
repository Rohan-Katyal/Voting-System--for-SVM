const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow frontend to communicate with backend
app.use(express.json()); // Parse incoming JSON payloads

// NEW: Tell Express to allow browsers to download files from the 'public' folder (like CSS and JS)
app.use(express.static(path.join(__dirname, 'public')));

// 2. API ROUTES
app.use('/api/admin', adminRoutes);
app.use('/api', apiRoutes);

// 3. FRONTEND PAGES (Updated to look inside the 'public' folder)
app.get('/admin/vote', (req, res) => res.sendFile(path.join(__dirname, 'public', 'voteSVM.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));


// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});