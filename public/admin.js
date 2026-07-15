const API_BASE = '/api/admin';
let adminID = '';
let adminName = '';
let adminPassword = '';


// Automatically run this on page load
window.onload = async () => {
  const savedID = localStorage.getItem('adminID');
  const savedPass = localStorage.getItem('adminPassword');

  if (savedID && savedPass) {
    // Attempt a silent re-login
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // IMPORTANT: Decode the password with atob() before sending it to the backend login route
        body: JSON.stringify({ adminID: savedID, adminPassword: atob(savedPass) })
      });

      if (response.ok) {
        const data = await response.json();
        
        adminID = savedID;
        // Keep the decoded password in your global variable for subsequent fetchAPI calls
        adminPassword = atob(savedPass); 
        adminName = data.name;
        
        document.getElementById('admin-name').textContent = adminName;
        document.getElementById('role-badge').textContent = data.role;
        
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard-section').classList.remove('hidden');
        
        loadCandidates();
        loadActiveClass();
      } else {
        // If credentials are bad (or changed), clear storage
        localStorage.clear();
      }
    } catch (e) {
      console.error("Auto-login failed", e);
    }
  }
};

// Toggle between Login and Signup screens
function toggleAuthView(view) {
  document.getElementById('login-form-container').classList.add('hidden');
  document.getElementById('signup-form-container').classList.add('hidden');
  
  document.getElementById(`${view}-form-container`).classList.remove('hidden');
  
  document.getElementById('login-err').textContent = '';
  document.getElementById('signup-err').textContent = '';
  document.getElementById('signup-success').innerHTML = '';
}

// Updated toggle function to handle multiple password inputs
// Bulletproof toggle password function
// Bulletproof toggle function using exact IDs
// Replace the old function completely with this one
  function togglePassword(inputId, btnElement) {
    const passInput = document.getElementById(inputId);
    
    if (!passInput) {
      console.error("Error: Could not find the input box with ID: " + inputId);
      return; 
    }
    
    if (passInput.type === 'password') {
      passInput.type = 'text';
      btnElement.textContent = 'Hide';
    } else {
      passInput.type = 'password';
      btnElement.textContent = 'Show';
    }
  }

async function signup(){
  const name = document.getElementById('signup-name').value.trim();
  const role = document.getElementById('signup-role').value.trim();
  const pass = document.getElementById('signup-pass').value.trim();
  const errText = document.getElementById('signup-err');
  const successText = document.getElementById('signup-success');
  
  errText.textContent = '';
  successText.innerHTML = '';
  if (!name || !role || !pass) {
    errText.textContent = "Please fill out all fields.";
    return;
  }
  
  errText.textContent = "Creating account...";
  
  try {
    const response = await fetch('/api/admin/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminName: name, adminRole: role, adminPassword: pass })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      errText.textContent = '';
      // Display the newly generated ID directly to the user!
      successText.innerHTML = `<strong>Account Created!</strong><br>Your Admin ID is:<br><span style="font-size: 1.2rem; color: #1e40af; display: block; margin: 10px 0;">${data.adminID}</span>Please save this ID to log in.`;
      
      // Clear inputs
      document.getElementById('signup-name').value = '';
      document.getElementById('signup-role').value = '';
      document.getElementById('signup-pass').value = '';
    } else {
      errText.textContent = data.error || "Signup failed.";
    }
    } catch (error) {
      errText.textContent = "Server error. Please try again.";
    }
}

  async function login() {
    const idInput = document.getElementById('login-id').value.trim();
    const passInput = document.getElementById('login-pass').value.trim();
    const errText = document.getElementById('login-err');
    
    if (!idInput || !passInput) {
        errText.textContent = "Please enter both ID and password.";
        return;
    }
    
    errText.textContent = "Verifying...";
    
    try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminID: idInput, adminPassword: passInput })
        });
        
        if (response.ok) {
          const data = await response.json(); 
          
          // setItem automatically overwrites, so removeItem is not needed
          localStorage.setItem('adminID', idInput);
          localStorage.setItem('adminPassword', btoa(passInput)); // Encode securely

          adminID = idInput;
          adminName = data.name; // Grab name from backend for the welcome banner
          adminPassword = passInput; // Keep the global variable unencoded
          
          document.getElementById('admin-name').textContent = adminName;
          document.getElementById('role-badge').textContent = data.role;
          
          document.getElementById('auth-section').classList.add('hidden');
          document.getElementById('dashboard-section').classList.remove('hidden');
          
          loadCandidates();
          loadActiveClass();
        } else {
          errText.textContent = "Invalid Admin ID or password.";
        }
        }
    catch (error) {
      errText.textContent = "Server error. Please try again.";
    }
  }

    function logout() {
      localStorage.clear(); // Wipes the credentials
      location.reload();    // Refreshes to show the login screen
    }

  async function loadCandidates() {
  // Grab the elements first
  const tbody = document.getElementById('candidate-tbody');
  const activeClass = document.getElementById('current-active-class').value.trim();
  
  // 1. Inject the loading state immediately BEFORE fetching data
  tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #64748b; font-weight: bold;">⏳ Loading candidates...</td></tr>';

  try {
    const data = await fetchAPI('/candidates');
    
    // Clear the loading message once data arrives
    tbody.innerHTML = ''; 

    // RESTORED SAFETY CHECK: Is the data actually an array?
    if (!Array.isArray(data)) {
      console.error("CRITICAL: Backend did not return an array! It returned:", data);
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #ef4444;">Data format error. Check console.</td></tr>';
      return; 
    }

    // FIXED: Use data.filter directly, because 'data' IS the array sent by res.json(candidates)
    const filteredCandidates = data.filter(c => 
      activeClass === "" || c.className === activeClass 
    );

    // 2. Handle the empty state gracefully
    if (filteredCandidates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8;">No candidates found for this class.</td></tr>';
      return;
    }

    // Render the candidates
    filteredCandidates.forEach(c => {
      const row = `<tr>
        <td>${c.name}</td>
        <td>${c.className || c.Class}</td> 
        <td>
          <button onclick="editCandidate('${c.id}')">Edit</button>
          <button onclick="deleteCandidate('${c.id}')">Delete</button>
        </td>
      </tr>`;
      tbody.innerHTML += row;
    });
    } catch (error) {
    console.error("Could not load candidates", error);
    document.getElementById('candidate-tbody').innerHTML = '<tr><td colspan="3" style="text-align: center; color: #ef4444;">❌ Failed to load data</td></tr>';
    }
}

    function createRow(candidate) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="display-name">${candidate.name}</span><input type="text" class="edit-name hidden" value="${candidate.name}"></td>
        <td><span class="display-class">${candidate.className}</span><input type="text" class="edit-class hidden" value="${candidate.className}"></td>
        <td>
          <button onclick="toggleEdit(this, '${candidate.id}')" class="edit-btn">Edit</button>
          <button onclick="deleteCandidate('${candidate.id}')" class="danger">Delete</button>
        </td>
      `;
      return tr;
    }

    async function addCandidate() {
      const nameInput = document.getElementById('new-name');
      const classInput = document.getElementById('new-class');
      
      const name = nameInput.value.trim();
      const className = classInput.value.trim();
      
      if (!name || !className) return alert('Fill all fields');
      
      // Target the button that triggered this function
      const btn = document.querySelector('button[onclick="addCandidate()"]');
      const originalText = btn ? btn.textContent : 'Add Candidate';
      
      if (btn) {
        // Set Loading State
        btn.textContent = 'Adding...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
      }
      
      try {
        await fetchAPI('/candidates', 'POST', { name, className });
        
        // Clear inputs on success
        nameInput.value = '';
        classInput.value = '';
        
        loadCandidates(); // Instant visual sync
      } catch (error) {
        console.error("Error adding candidate:", error);
        alert("Failed to add candidate. Please check your connection.");
      } finally {
        if (btn) {
          // Revert Loading State
          btn.textContent = originalText;
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }
      }
    }

    async function toggleEdit(btn, id) {
      const tr = btn.closest('tr');
      const isEditing = btn.innerText === 'Save';

      if (isEditing) {
        const newName = tr.querySelector('.edit-name').value;
        const newClass = tr.querySelector('.edit-class').value;
        btn.innerText = 'Saving...';
        await fetchAPI(`/candidates/${id}`, 'PUT', { name: newName, className: newClass });
        loadCandidates(); // Refresh data to confirm sync
      } else {
        tr.querySelectorAll('span').forEach(s => s.classList.add('hidden'));
        tr.querySelectorAll('input').forEach(i => i.classList.remove('hidden'));
        btn.innerText = 'Save';
      }
    }

    async function deleteCandidate(id) {
      if (!confirm('Remove this candidate?')) return;
      await fetchAPI(`/candidates/${id}`, 'DELETE');
      loadCandidates(); // Instant visual sync
    }
    // Add inside your <script> tag
    async function loadActiveClass() {
      try {
      // We use fetchAPI here so it automatically adds '/api/admin' and your auth headers
      const json = await fetchAPI('/active-class'); 
      
      // Safely set the value (fallback to empty string if missing)
      document.getElementById('current-active-class').value = json.activeClass || '';
      } catch (err) {
        console.error("Could not load active class", err);
      }
    }

    async function updateActiveClass() {
      const inputElement = document.getElementById('current-active-class');
      const newClass = inputElement.value.trim();
      
      // Target the button that triggered this function
      const btn = document.querySelector('button[onclick="updateActiveClass()"]');
      // Fallback text just in case the button isn't found immediately
      const originalText = btn ? btn.textContent : 'Update Active Class'; 
      
      if (btn) {
        // Set Loading State
        btn.textContent = 'Updating...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.style.cursor = 'not-allowed';
      }

      try {
        // Ensure the object key here ('activeClass') matches the 'const { activeClass }' in your route
        await fetchAPI('/active-class', 'POST', { activeClass: newClass });
        
        loadCandidates(); 
      } catch (error) {
        console.error("Error updating active class:", error);
        alert("Failed to update active class. Please check your connection.");
      } finally {
        if (btn) {
          // Revert Loading State
          btn.textContent = originalText;
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }
      }
    }
    // Find your existing fetchAPI function and add the new x-admin-name header
    async function fetchAPI(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
        'Content-Type': 'application/json',
        'x-admin-id': adminID,
        'x-admin-password': adminPassword
        }
    };
    
    if (body) options.body = JSON.stringify(body);
    
    const res = await fetch(`/api/admin${endpoint}`, options);
    
    if (!res.ok) {
        throw new Error('API Error: Unauthorized or failed request');
    }
    
    return res.json();
    }
    // Toggle password visibility
    
    function togglePassword(btnElement) {
      const passInput = document.getElementById(btnElement);
        // const passInput = btnElement.previousElementSibling;    
      if (passInput.type === 'password') {
          passInput.type = 'text';
          btnElement.textContent = 'Hide';
      } else {
          passInput.type = 'password';
          btnElement.textContent = 'Show';
      }
    }
    
    function launchKiosk() {
        // Opens the voting page in a new tab
        // Change 'index.html' to whatever your actual student voting page is named
      window.open('/admin/vote', '_blank'); 
    }
  // IMPORTANT: Find your existing login() function and add loadActiveClass() to it!
  // Inside login(), right below loadCandidates(); add:
  // loadActiveClass();
  