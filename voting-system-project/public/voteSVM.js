// public/voter.js
const API_BASE_URL = '/api';

let session = { name: '', className: '', id: '', selectedCandidate: null };

const screens = {
  login: document.getElementById('login-screen'),
  ballot: document.getElementById('ballot-screen'),
  success: document.getElementById('success-screen')
};

function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');
}

// Auto-load the locked class from the Admin settings
async function initializeVotingKiosk() {
  const classSelect = document.getElementById('voter-class');
  try {
    const response = await fetch(`${API_BASE_URL}/active-class`);
    const data = await response.json();
    
    if (data.activeClass) {
      classSelect.innerHTML = `<option value="${data.activeClass}">${data.activeClass}</option>`;
      session.className = data.activeClass; 
    } else {
      classSelect.innerHTML = `<option value="">No active class set by Admin</option>`;
    }
  } catch (error) {
    classSelect.innerHTML = `<option value="">Error loading class</option>`;
  }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const errorDiv = document.getElementById('login-error');
  const btn = document.getElementById('proceed-btn');
  
  // 1. Grab all three values from the DOM
  session.name = document.getElementById('voter-name').value.trim();
  session.id = document.getElementById('voter-id').value.trim();
  // We must explicitly pull the value from our new readonly input!
  session.className = document.getElementById('voter-class').value.trim();

  // 2. Prevent submission if the class field is still showing a loading or error state
  if (session.className.includes('Loading') || session.className.includes('No active') || session.className.includes('Connecting')) {
    errorDiv.textContent = 'Please wait for a valid class to load before proceeding.';
    return;
  }

  errorDiv.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Verifying...';

  try {
    const response = await fetch(`${API_BASE_URL}/verify-voter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        VoterName: session.name, 
        ClassName: session.className, 
        VoterID: session.id 
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Verification failed');

    await loadCandidates(session.className);
    showScreen('ballot');
  } catch (err) {
    errorDiv.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Proceed to Ballot';
  }
});

async function loadCandidates(className) {
  const listContainer = document.getElementById('candidate-list');
  listContainer.innerHTML = '<p style="text-align: center;">Loading candidates...</p>';

  try {
    const response = await fetch(`${API_BASE_URL}/candidates?class=${encodeURIComponent(className)}`);
    const candidates = await response.json();

    if (candidates.length === 0) {
      listContainer.innerHTML = '<p style="text-align: center; color: red;">No candidates found for this class.</p>';
      return;
    }

    listContainer.innerHTML = ''; 

    candidates.forEach(candidate => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      card.textContent = candidate.name; 
      
      card.addEventListener('click', () => selectCandidate(candidate, card));
      listContainer.appendChild(card);
    });
  } catch (err) {
    listContainer.innerHTML = '<p style="text-align: center; color: red;">Failed to load candidates.</p>';
  }
}

function selectCandidate(candidate, cardElement) {
  session.selectedCandidate = candidate.name;
  document.querySelectorAll('.candidate-card').forEach(el => el.classList.remove('selected'));
  cardElement.classList.add('selected');
  document.getElementById('submit-vote-btn').disabled = false;
}

document.getElementById('submit-vote-btn').addEventListener('click', async () => {
  const errorDiv = document.getElementById('vote-error');
  const btn = document.getElementById('submit-vote-btn');

  errorDiv.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Casting Vote...';

  try {
    const response = await fetch(`${API_BASE_URL}/cast-vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        VoterName: session.name, VoterClass: session.className,
        VoterID: session.id, ChosenCandidate: session.selectedCandidate
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to cast vote');

    showScreen('success');
  } catch (err) {
    errorDiv.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Submit Vote';
  }
});

function resetSession() {
  session = { name: session.name, className: session.className, id: '', selectedCandidate: null };
  document.getElementById('voter-id').value = ''; 
  document.getElementById('voter-name').value = '';
  document.getElementById('login-error').textContent = '';
  document.getElementById('vote-error').textContent = '';
  document.getElementById('submit-vote-btn').disabled = true;
  document.getElementById('submit-vote-btn').textContent = 'Submit Vote';
  showScreen('login');
}

async function handleProceedToBallot(event) {
  // 1. Instantly check if the admin is still logged in
  const activeAdmin = localStorage.getItem('adminID');
  
  if (!activeAdmin) {
    alert("Voting is currently closed.\nAn administrator must be logged in to activate this kiosk.");
    window.location.href = '/admin'; // Redirects out of the voting area
    return; // Stops the rest of the function from running
  }

  // ... [Your existing logic to verify the student's ID and proceed to the ballot goes here] ...
}
  // 1. The function to fetch the class
  // Variable to track the state so we only update the UI when the class actually changes
let currentVoterClass = null; 
let isFetchingClass = false;

function startClassPolling() {
  const adminID = localStorage.getItem('adminID');
  const encodedPass = localStorage.getItem('adminPassword');

  if (!adminID || !encodedPass) return; 

  const classInput = document.getElementById('voter-class'); 
  if (!classInput) return;

  const fetchActiveStatus = async () => {
    if (isFetchingClass) return; 
    isFetchingClass = true;

    try {
      const response = await fetch('/api/admin/active-class', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminID,
          'x-admin-password': atob(encodedPass) 
        }
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedClass = data.activeClass || "No Active class set by Admin !!";

        if (fetchedClass !== currentVoterClass) {
          if (fetchedClass !== "") {
            // Show the loading transition
            classInput.value = "Loading Class........";
            
            setTimeout(() => {
              classInput.value = fetchedClass;
              currentVoterClass = fetchedClass; 
            }, 1500);

          } else {
            classInput.value = "No active class set by Admin !!";
            currentVoterClass = fetchedClass;
          }
        }
      }
    } catch (error) {
      if (currentVoterClass !== "error_state") {
        classInput.value = "No active class set by Admin";
        currentVoterClass = "error_state";
      }
    } finally {
      isFetchingClass = false; 
    }
  };

  // Run the first check instantly
  fetchActiveStatus();

  // Keep checking every 5 seconds
  setInterval(fetchActiveStatus, 5000);
}

// 2. The Voting Page Initialization
window.onload = () => {
  const activeAdmin = localStorage.getItem('adminID');
  
  // Security Check: Kick them out if not logged in
  if (!activeAdmin) {
    alert("Voting is currently closed.\nAn administrator must be logged in to activate this kiosk.");
    window.location.href = '/admin'; // Redirect back to admin login
    return; 
  }
  
  // Since we are inside voteSVm.js, we can call the function directly!
  startClassPolling();
};

// Call the initialization immediately
initializeVotingKiosk();