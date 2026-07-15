const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets');

// POST /api/verify-voter
router.post('/verify-voter', async (req, res) => {
  const { VoterName, ClassName, VoterID } = req.body;

  if (!VoterName || !ClassName || !VoterID) {
    return res.status(400).json({ error: 'Missing required voter fields.' });
  }

  try {
    // Check if the voter has already voted
    const hasVoted = await sheetsService.hasVoterVoted(VoterID);
    
    if (hasVoted) {
      return res.status(403).json({ error: 'This Voter ID has already cast a vote.' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Voter verified successfully.' 
    });
  } catch (error) {
    console.error('Error verifying voter:', error);
    res.status(500).json({ error: 'Failed to verify voter identity.' });
  }
});

// GET /api/candidates?class=ClassName
router.get('/candidates', async (req, res) => {
  const className = req.query.class;

  if (!className) {
    return res.status(400).json({ error: 'Class query parameter is required.' });
  }

  try {
    const candidates = await sheetsService.getCandidatesByClass(className);
    res.status(200).json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates.' });
  }
});

// POST /api/cast-vote
router.post('/cast-vote', async (req, res) => {
  const { VoterName, VoterClass, VoterID, ChosenCandidate } = req.body;

  if (!VoterName || !VoterClass || !VoterID || !ChosenCandidate) {
    return res.status(400).json({ error: 'Missing required vote fields.' });
  }

  try {
    // Final server-side check right before appending the row
    const hasVoted = await sheetsService.hasVoterVoted(VoterID);
    
    if (hasVoted) {
      return res.status(403).json({ error: 'This Voter ID has already cast a vote.' });
    }

    await sheetsService.appendVote(VoterName, VoterClass, VoterID, ChosenCandidate);
    res.status(201).json({ success: true, message: 'Vote recorded successfully.' });
  } catch (error) {
    console.error('Error recording vote:', error);
    res.status(500).json({ error: 'Failed to record vote.' });
  }
});

// Add this anywhere in routes/api.js before the module.exports

// GET /api/active-class
router.get('/active-class', async (req, res) => {
  try {
    const activeClass = await sheetsService.getActiveClass();
    res.status(200).json({ activeClass });
  } catch (error) {
    console.error('Error fetching active class:', error);
    res.status(500).json({ error: 'Failed to fetch active class.' });
  }
});

module.exports = router;