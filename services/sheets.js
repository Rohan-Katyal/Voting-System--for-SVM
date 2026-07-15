const { google } = require('googleapis');
require('dotenv').config();

// Format the private key to handle newline characters from the .env file
console.log("Starts with:", process.env.GOOGLE_PRIVATE_KEY.substring(0, 35));
console.log("Ends with:", process.env.GOOGLE_PRIVATE_KEY.slice(-35));
const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const getCandidatesByClass = async (className) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Candidates!A2:C', // Assumes row 1 is headers (ID, Name, Class)
  });

  const rows = response.data.values || [];
  
  // Map rows to objects and filter by the requested class
  return rows
    .map(row => ({
      id: row[0],
      name: row[1],
      className: row[2]
    }))
    .filter(candidate => candidate.className === className);
};

const appendVote = async (voterName, voterClass, voterId, chosenCandidate) => {
  const timestamp = new Date().toISOString();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Votes!A:E',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[timestamp, voterName, voterClass, voterId, chosenCandidate]],
    },
  });
};

// Add this new function below your existing getCandidatesByClass function

const hasVoterVoted = async (voterId) => {
  // We only need to fetch Column D (VoterID) to minimize data transfer
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Votes!D2:D', 
  });

  const rows = response.data.values || [];
  
  // rows is an array of arrays (e.g., [ ['ID001'], ['ID002'] ])
  // Convert both to strings to ensure strict comparison
  return rows.some(row => row[0] === String(voterId));
};

// Add these functions to your existing services/sheets.js

const getAllCandidates = async () => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Candidates!A2:C',
  });
  
  return (response.data.values || [])
    .filter(row => row[0] && row[1]) // Filter out cleared/empty rows
    .map(row => ({
      id: row[0],
      name: row[1],
      className: row[2]
    }));
};

// Helper to find the exact spreadsheet row number for a given Candidate ID
const findCandidateRowIndex = async (id) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Candidates!A:C',
  });
  const rows = response.data.values || [];
  return rows.findIndex(row => row[0] === String(id));
};

const addCandidate = async (name, className) => {
  const id = Date.now().toString(); // Generate a simple unique ID
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Candidates!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[id, name, className]],
    },
  });
  return { id, name, className };
};

const updateCandidate = async (id, name, className) => {
  const rowIndex = await findCandidateRowIndex(id);
  if (rowIndex === -1) throw new Error('Candidate not found.');
  
  const sheetRow = rowIndex + 1; // Array index is 0-based, Sheets rows are 1-based
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Candidates!A${sheetRow}:C${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[id, name, className]],
    },
  });
};

const deleteCandidate = async (id) => {
  const rowIndex = await findCandidateRowIndex(id);
  if (rowIndex === -1) throw new Error('Candidate not found.');
  
  const sheetRow = rowIndex + 1;
  
  // Clear the cells to remove the candidate safely
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `Candidates!A${sheetRow}:C${sheetRow}`,
  });
};
// Add these functions below your existing ones in services/sheets.js

 // Helper function to find which row an admin is on
const getAdminRowIndex = async (adminID) => {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Admins!A:A', // Search only the ID column
  });
  const rows = response.data.values || [];
  return rows.findIndex(row => row[0] === String(adminID));
};

 // UPDATED: Get active class for a specific admin
const getActiveClass = async (adminID) => {
  const rowIndex = await getAdminRowIndex(adminID);
  if (rowIndex === -1) return ''; 
  
  const sheetRow = rowIndex + 1;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Admins!E${sheetRow}`, // Column E is the ActiveClass column
  });
  const rows = response.data.values || [];
  return rows.length > 0 ? rows[0][0] : '';
};

// UPDATED: Set active class for a specific admin
const setActiveClass = async (adminID, className) => {
  const rowIndex = await getAdminRowIndex(adminID);
  if (rowIndex === -1) throw new Error('Admin not found');
  
  const sheetRow = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Admins!E${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[className]],
    },
  });
};

// Add this below your existing functions in services/sheets.js

// 1. UPDATED verifyAdmin
const verifyAdmin = async (adminID, adminPassword) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Admins!A:D', // Now reading all 4 columns
    });
    
    const rows = response.data.values || [];
    
    for (let i = 1; i < rows.length; i++) {
      const sheetID = (rows[i][0] || '').trim();
      const sheetName = (rows[i][1] || '').trim();
      const sheetPass = (rows[i][2] || '').trim();
      const sheetRole = (rows[i][3] || '').trim();

      if (sheetID === adminID && sheetPass === adminPassword) {
        // Return both name and role so the frontend banner still works!
        return { name: sheetName, role: sheetRole }; 
      }
    }
    return false;
  } catch (error) {
    console.error('Error verifying admin:', error);
    return false;
  }
};

// 2. NEW addAdmin (Sign up function)
const addAdmin = async (adminName, adminPassword, adminRole) => {
  // Generate random AdminID: Removes spaces and adds 4 random digits
  const cleanName = adminName.replace(/\s+/g, '');
  const cleanRole = adminRole.replace(/\s+/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  
  const adminID = `${cleanName}${randomNum}@${cleanRole}`;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Admins!A:D',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[adminID, adminName, adminPassword, adminRole]],
    },
  });
  
  return adminID; // Return the generated ID back to the user
};



// Update your module.exports at the bottom to include the new functions:
module.exports = {
  getCandidatesByClass,
  appendVote,
  hasVoterVoted,
  getAllCandidates,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  getActiveClass,   
  setActiveClass,
  verifyAdmin,
  addAdmin  
};