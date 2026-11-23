/**
 * PeerFuse Main Application Logic
 * Coordinates auth, matching, and UI components
 */

// Global state
const AppState = {
  currentUser: null,
  currentMatches: [],
  currentMatchIndex: 0,
  localUsers: [],
  hasProfile: false        // true once the user has saved a profile
};

// localStorage flag: a study session ended and the buddy has not been rated yet
const FEEDBACK_DUE_KEY = 'peerfuse_feedback_due';

/**
 * Initialize the application
 */
function initApp() {
  console.log('🚀 Initializing PeerFuse...');

  // Load local users from localStorage
  loadLocalUsers();

  // Set up auth state listener
  if (window.Auth && window.PEERFUSE_AUTH) {
    window.Auth.onAuthStateChanged((user) => {
      handleAuthStateChange(user);
    });
  }

  // Set up event listeners
  setupEventListeners();

  // Check if user is already logged in
  const currentUsername = window.Auth?.LocalStorage.getCurrentUser();
  if (currentUsername) {
    showMainInterface(currentUsername);
  } else {
    showAuthScreen();
  }

  console.log('✅ PeerFuse initialized');
}

/**
 * Handle authentication state changes
 * @param {Object} user - Firebase user object
 */
function handleAuthStateChange(user) {
  if (user) {
    console.log('✅ User authenticated:', user.uid);
    AppState.currentUser = user;

    const displayName = user.displayName || user.email;
    window.Auth.LocalStorage.setCurrentUser(displayName);
    window.UI.updateUserWelcome(displayName);

    showMainInterface(displayName);
  } else {
    console.log('ℹ️ User not authenticated');
    AppState.currentUser = null;
    window.Auth.LocalStorage.removeCurrentUser();
    window.UI.updateUserWelcome(null);
    showAuthScreen();
  }
}

/**
 * Show authentication screen
 */
function showAuthScreen() {
  window.UI.show('auth-screen');
  window.UI.hide('profile-section');
  window.UI.hide('match-section');
  window.UI.hide('prequiz-section');
  window.UI.hide('session-section');
  window.UI.hide('postquiz-section');
  window.UI.hide('ai-section');
}

/**
 * Show main interface
 * @param {string} username - Current username
 */
function showMainInterface(username) {
  window.UI.hide('auth-screen');
  window.UI.updateUserWelcome(username);

  // Show navigation bar
  window.UI.show('nav-bar');

  // Show main sections
  window.UI.show('match-section');
  window.UI.show('prequiz-section');
  window.UI.show('session-section');
  window.UI.show('postquiz-section');
  window.UI.show('ai-section');

  // Load user profile
  loadUserProfile(username);

  // Setup AI event listeners (after sections are visible)
  if (window.setupAIEventListeners) {
    setTimeout(() => window.setupAIEventListeners(), 100);
  }

  // Listen for incoming match requests
  const currentUser = firebase.auth().currentUser;
  if (currentUser) {
    listenForMatchRequests(currentUser.uid);
    window.UI.show('notifications-btn'); // Show notification bell
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {


  // Auth form handlers
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }

  const signupBtn = document.getElementById('signup-btn');
  if (signupBtn) {
    signupBtn.addEventListener('click', handleSignup);
  }



  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Profile form handler
  const saveProfileBtn = document.getElementById('save-profile-btn');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', handleSaveProfile);
  }

  // Match form handler
  const findMatchBtn = document.getElementById('find-match-btn');
  if (findMatchBtn) {
    findMatchBtn.addEventListener('click', handleFindMatch);
  }

  // Pre-session quiz button
  const startPrequizBtn = document.getElementById('start-prequiz-btn');
  if (startPrequizBtn) {
    startPrequizBtn.addEventListener('click', handleStartPreQuiz);
  }

  const submitPrequizBtn = document.getElementById('submit-prequiz-btn');
  if (submitPrequizBtn) {
    submitPrequizBtn.addEventListener('click', handleSubmitPreQuiz);
  }

  // Retake resets the assessment in place (no page reload, so matches stay on screen)
  document.getElementById('retake-prequiz-btn')?.addEventListener('click', resetPreQuiz);

  // Finishing a session unlocks the buddy feedback form
  document.getElementById('end-session-btn')?.addEventListener('click', handleEndSession);

  const postquizForm = document.getElementById('postquiz-form');
  if (postquizForm) {
    postquizForm.addEventListener('submit', handlePostQuizSubmit);
  }

  // Session buttons
  const acceptMatchBtn = document.getElementById('accept-match-btn');
  if (acceptMatchBtn) {
    acceptMatchBtn.addEventListener('click', handleAcceptMatch);
  }

  const declineMatchBtn = document.getElementById('decline-match-btn');
  if (declineMatchBtn) {
    declineMatchBtn.addEventListener('click', handleDeclineMatch);
  }

  const startMeetingBtn = document.getElementById('start-meeting-btn');
  if (startMeetingBtn) {
    startMeetingBtn.addEventListener('click', handleStartMeeting);
  }

  // Notification panel
  const notificationsBtn = document.getElementById('notifications-btn');
  if (notificationsBtn) {
    notificationsBtn.addEventListener('click', toggleNotificationPanel);
  }

  const closeNotificationsBtn = document.getElementById('close-notifications-btn');
  if (closeNotificationsBtn) {
    closeNotificationsBtn.addEventListener('click', () => {
      window.UI.hide('notification-panel');
    });
  }
}

/**
 * Handle login
 */
async function handleLogin() {
  const email = document.getElementById('auth-email')?.value;
  const password = document.getElementById('auth-password')?.value;

  if (!email || !password) {
    window.UI.showToast('Please enter email and password', 'error');
    return;
  }

  if (!window.UI.isValidEmail(email)) {
    window.UI.showToast('Please enter a valid email', 'error');
    return;
  }

  try {
    const userCredential = await window.Auth.signIn(email, password);
    const displayName = userCredential.user.displayName || email;

    window.Auth.LocalStorage.setCurrentUser(displayName);
    window.UI.showToast('Login successful!', 'success');

    showMainInterface(displayName);
  } catch (error) {
    console.error('Login error:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
    const errorMessage = getAuthErrorMessage(error.code);
    window.UI.showToast(errorMessage, 'error');
  }
}

/**
 * Handle signup
 */
async function handleSignup() {
  const email = document.getElementById('auth-email')?.value;
  const password = document.getElementById('auth-password')?.value;
  const usernameField = document.getElementById('auth-username');
  const usernameRow = document.getElementById('auth-username-row');

  // Show username field if not already shown
  if (usernameRow && usernameRow.classList.contains('hidden')) {
    window.UI.show('auth-username-row');
    const passwordField = document.getElementById('auth-password');
    if (passwordField) passwordField.placeholder = 'Choose a password (at least 6 characters)';
    usernameField?.focus();
    window.UI.showToast('Please enter a display name to complete signup', 'info');
    return;
  }

  const username = usernameField?.value?.trim();

  if (!email || !password) {
    window.UI.showToast('Please enter email and password', 'error');
    return;
  }

  if (!username || username.length < 2) {
    window.UI.showToast('Please enter a valid username (at least 2 characters)', 'error');
    return;
  }

  if (!window.UI.isValidEmail(email)) {
    window.UI.showToast('Please enter a valid email', 'error');
    return;
  }

  const passwordValidation = window.UI.validatePassword(password);
  if (!passwordValidation.isValid) {
    window.UI.showToast(passwordValidation.message, 'error');
    return;
  }

  try {
    await window.Auth.signUp(email, password);
    await window.Auth.updateDisplayName(username);
    window.Auth.LocalStorage.setCurrentUser(username);

    window.UI.showToast('Welcome to PeerFuse!', 'success');
    showMainInterface(username);

    // Show profile section for first-time setup
    window.UI.show('profile-section');
  } catch (error) {
    console.error('Signup error:', error);
    const errorMessage = getAuthErrorMessage(error.code);
    window.UI.showToast(errorMessage, 'error');
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    await window.Auth.signOut();
    window.Auth.LocalStorage.removeCurrentUser();

    AppState.currentUser = null;
    AppState.currentMatches = [];

    window.UI.showToast('Logged out successfully', 'success');
    showAuthScreen();
  } catch (error) {
    console.error('Logout error:', error);
    window.UI.showToast('Error logging out', 'error');
  }
}

/**
 * Handle save profile
 */
async function handleSaveProfile() {
  const currentUsername = window.Auth.LocalStorage.getCurrentUser();
  if (!currentUsername) {
    window.UI.showToast('Please log in first', 'error');
    return;
  }

  // Get form values with new IDs
  const newUsername = document.getElementById('profile-username')?.value?.trim() || '';
  const strength1 = document.getElementById('profile-strength1')?.value || '';
  const strength2 = document.getElementById('profile-strength2')?.value || '';
  const weakness1 = document.getElementById('profile-weakness1')?.value || '';
  const weakness2 = document.getElementById('profile-weakness2')?.value || '';
  const availability = document.getElementById('profile-availability')?.value || '';
  const mode = document.getElementById('profile-mode')?.value || '';
  const goal = document.getElementById('profile-goal')?.value || '';
  const frequency = document.getElementById('profile-frequency')?.value || '';
  const sessionLength = document.getElementById('profile-session-length')?.value || '';
  const partnerPreference = document.getElementById('profile-partner-preference')?.value || '';
  const studyPersonality = document.getElementById('profile-study-personality')?.value || '';
  const timezone = document.getElementById('profile-timezone')?.value || '';

  if (!newUsername || newUsername.length < 2) {
    window.UI.showToast('Please enter a valid username (at least 2 characters)', 'error');
    return;
  }

  // Store a clean value for matching and the user's own text for display
  const strengthSkills = window.FirebaseHelpers.buildSkillLists([strength1, strength2]);
  const weaknessSkills = window.FirebaseHelpers.buildSkillLists([weakness1, weakness2]);
  const strengths = strengthSkills.clean;
  const weaknesses = weaknessSkills.clean;

  if (strengths.length === 0 || weaknesses.length === 0) {
    window.UI.showToast('Please enter at least one strength and one weakness', 'error');
    return;
  }

  if (!availability || !mode || !goal || !frequency || !sessionLength || !partnerPreference || !studyPersonality || !timezone) {
    window.UI.showToast('Please fill in all required fields', 'error');
    return;
  }

  // Update username if changed
  if (newUsername !== currentUsername) {
    try {
      await window.Auth.updateDisplayName(newUsername);
      window.Auth.LocalStorage.setCurrentUser(newUsername);
      window.UI.updateUserWelcome(newUsername);
    } catch (error) {
      console.error('Error updating username:', error);
      window.UI.showToast('Error updating username', 'error');
      return;
    }
  }

  const profile = {
    username: newUsername,
    email: AppState.currentUser?.email || firebase.auth().currentUser?.email,
    uid: AppState.currentUser?.uid,
    strengths,
    weaknesses,
    strengthsOriginal: strengthSkills.original,
    weaknessesOriginal: weaknessSkills.original,
    availability,
    preferredMode: mode,
    primaryGoal: goal,
    preferredFrequency: frequency,
    sessionLength,
    partnerPreference,
    studyPersonality,
    timeZone: timezone
  };

  try {
    // Save to Firebase
    if (window.FirebaseHelpers) {
      await window.FirebaseHelpers.saveProfile(profile);
    }

    // Save to localStorage
    window.Auth.LocalStorage.setUserProfile(profile);

    // Clear confirmation: "updated" when editing, "created" the first time
    const wasEditing = AppState.hasProfile;
    const message = wasEditing ? 'Profile updated ✓' : 'Profile created ✓';
    window.UI.showStatus('profile-status', message, 'success');
    window.UI.showToast(message, 'success', 4000);
    document.getElementById('profile-status')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    AppState.hasProfile = true;
    setProfileMode(true);
    syncMatchFormWithProfile(profile);

    // Switch to Edit Profile button
    const createProfileBtn = document.getElementById('create-profile-btn');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (createProfileBtn) window.UI.hide('create-profile-btn');
    if (editProfileBtn) window.UI.show('edit-profile-btn');

    // Return to the main sections once the confirmation has been seen
    setTimeout(() => {
      showMainSections();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2000);
  } catch (error) {
    console.error('Error saving profile:', error);
    window.UI.showStatus('profile-status', 'Error saving profile. Please try again.', 'error');
  }
}

/**
 * Handle find match - now uses saved profile data
 */
async function handleFindMatch() {
  const currentUsername = window.Auth.LocalStorage.getCurrentUser();
  if (!currentUsername) {
    window.UI.showToast('Please log in first', 'error');
    return;
  }

  // Get user profile
  let profile = window.Auth.LocalStorage.getUserProfile();
  if (!profile || !profile.strengths || !profile.weaknesses) {
    window.UI.showToast('Please create your profile first', 'error');
    window.UI.show('profile-section');
    document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  window.UI.showLoading('result');

  // Build target user from profile with optional matching preferences
  const targetUser = {
    name: currentUsername,
    username: currentUsername,
    strengths: profile.strengths,
    weaknesses: profile.weaknesses,
    availability: profile.availability,
    preferredMode: profile.preferredMode,
    primaryGoal: profile.primaryGoal,
    preferredFrequency: profile.preferredFrequency,
    timeZone: profile.timeZone,
    // The search form starts from the profile; the user may adjust it per search
    partnerPreference: document.getElementById('partnerPreference')?.value || profile.partnerPreference,
    sessionLength: document.getElementById('sessionLength')?.value || profile.sessionLength,
    studyPersonality: document.getElementById('studyPersonality')?.value || profile.studyPersonality
  };

  try {
    // Fetch users from Firebase
    let candidates = [];

    if (!window.FirebaseHelpers) {
      throw new Error('Firebase helpers not initialized. Please refresh the page.');
    }

    try {
      const profiles = await window.FirebaseHelpers.fetchAllProfiles();
      if (profiles && Array.isArray(profiles)) {
        candidates = profiles.filter(p => p); // Remove nulls
        console.log('✅ Fetched profiles from Firebase:', candidates.length);
      } else {
        console.warn('⚠️ FirebaseHelpers.fetchAllProfiles returned no data');
      }
    } catch (fbError) {
      console.warn('⚠️ Firebase fetch failed, continuing with local users:', fbError);
    }

    // Merge with local users
    if (AppState.localUsers && Array.isArray(AppState.localUsers)) {
      candidates = [...candidates, ...AppState.localUsers];
    }
    console.log('✅ Total candidates after merge:', candidates.length);

    if (candidates.length === 0) {
      window.UI.hideLoading('result');
      document.getElementById('result').innerHTML = '<p class="text-muted">No other users in the matching pool yet. Be the first to create a profile!</p>';
      return;
    }

    // Debug: Log targetUser
    console.log('🔍 Target user for matching:', targetUser);

    // Find matches using exclusion list
    if (!window.Matching || !window.Matching.findRematch) {
      throw new Error('Matching algorithm not initialized');
    }

    const matches = window.Matching.findRematch(
      targetUser,
      candidates,
      [], // No rejected IDs for now
      10
    );
    console.log('🟢 Matching result:', matches);

    if (!matches.matches || matches.matches.length === 0) {
      window.UI.hideLoading('result');
      document.getElementById('result').innerHTML = '<p class="text-muted">No compatible matches found. Check back later as more users join!</p>';
      window.UI.showToast('No compatible matches at this time', 'info');
      return;
    }

    // Store matches in state
    AppState.currentMatches = matches.matches;
    AppState.currentMatchIndex = 0;

    // Display best match with request button
    const bestMatch = matches.matches[0];
    renderMatchCard(bestMatch, 'Best match found');

    // Save match to Firebase
    if (window.FirebaseHelpers) {
      await window.FirebaseHelpers.saveMatch({
        user1: targetUser.name || targetUser.username,
        user2: bestMatch.user.name || bestMatch.user.username,
        score: bestMatch.score,
        breakdown: bestMatch.breakdown
      });
    }

    window.UI.showToast('Match found!', 'success');
  } catch (error) {
    console.error('❌ Error in handleFindMatch:', error);
    window.UI.hideLoading('result');
    document.getElementById('result').innerHTML = `<p class="text-danger">Error finding match: ${error.message || error}</p>`;
    window.UI.showToast('Failed to find matches. Please try again.', 'error');
  }
}

/**
 * Show next match in the list (2nd best, 3rd best, etc.)
 */
function showNextMatch() {
  if (!AppState.currentMatches || AppState.currentMatches.length === 0) {
    window.UI.showToast('No more matches available', 'info');
    return;
  }

  AppState.currentMatchIndex++;

  if (AppState.currentMatchIndex >= AppState.currentMatches.length) {
    // Cycled through all matches
    document.getElementById('result').innerHTML = `
      <div style="padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius); text-align: center;">
        <h3 style="color: var(--error); margin: 0 0 12px 0;">⚠️ No More Matches</h3>
        <p style="color: var(--text-secondary); margin: 0;">
          You've reviewed all compatible matches. Check back later!
        </p>
      </div>
    `;
    window.UI.showToast('You\'ve reviewed all compatible matches', 'info');
    return;
  }

  const match = AppState.currentMatches[AppState.currentMatchIndex];
  renderMatchCard(match, `Match #${AppState.currentMatchIndex + 1}`);
}

/**
 * Show one match in the result area with its score, reasons and actions.
 * Names go through UI.displayNameFor, so another student's email is never shown.
 * @param {Object} match - {user, score, breakdown} from the matcher
 * @param {string} heading - e.g. "Best match found" or "Match #2"
 */
function renderMatchCard(match, heading) {
  const esc = window.UI.escapeHtml;
  const badge = window.Matching.getMatchQualityBadge(match.score);
  const reasons = match.breakdown?.reasons?.length
    ? match.breakdown.reasons.map(r => `<li>${esc(r)}</li>`).join('')
    : '<li>Complementary skills and preferences</li>';

  document.getElementById('result').innerHTML = `
    <div class="match-card">
      <div class="match-card-head">
        <div>
          <p class="match-card-label">${esc(heading)}</p>
          <h3 class="match-card-name">${esc(window.UI.displayNameFor(match.user))}</h3>
        </div>
        <div class="match-card-score">
          <span class="match-points">${match.score} pts</span>
          <span class="match-badge">${badge.emoji} ${esc(badge.text)}</span>
        </div>
      </div>
      <h4 class="match-why-title">Why you match</h4>
      <ul class="match-why">${reasons}</ul>
      <div class="match-actions">
        <button type="button" id="send-match-request-btn">📩 Send Match Request</button>
        <button type="button" id="rematch-btn" class="btn-secondary">🔄 Try Another Match</button>
      </div>
    </div>
  `;

  document.getElementById('send-match-request-btn')?.addEventListener('click', async () => {
    await sendMatchRequest(match);
  });
  document.getElementById('rematch-btn')?.addEventListener('click', showNextMatch);
}

/**
 * Start a session with a matched peer
 * @param {string} peerName - Peer's name
 */
function startSession(peerName) {
  const sessionInfo = document.getElementById('session-info');
  if (!sessionInfo) return;

  // Generate a unique Jitsi Meet room
  const meetingRoomId = generateMeetingId();
  const meetLink = `https://meet.jit.si/PeerFuse-${meetingRoomId}`;

  sessionInfo.innerHTML = `
    <p><strong>Session Partner:</strong> ${window.UI.escapeHtml(peerName)}</p>
    <p><strong>Status:</strong> <span style="color: var(--success);">● Active</span></p>
    <p><strong>Video Meeting Link (Jitsi):</strong></p>
    <div style="background: white; padding: 12px; border-radius: 8px; margin: 8px 0;">
      <a href="${meetLink}" target="_blank" style="color: var(--primary); font-weight: 600;">${meetLink}</a>
    </div>
    <button onclick="window.open('${meetLink}', '_blank')" style="margin-top: 12px;">Join Meeting</button>
    <button onclick="endSession('${window.UI.escapeHtml(peerName)}')" class="btn-danger" style="margin-top: 12px; margin-left: 8px;">End Session</button>
    <p class="text-muted" style="margin-top: 12px; font-size: 13px;">
      💡 Tip: Discuss the topics you both want to focus on, teach each other, and take notes!
    </p>
  `;

  window.UI.showToast('Session started! Opening meeting...', 'success');

  // Scroll to session section
  document.getElementById('session-section')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * End current session
 * @param {string} peerName - Peer's name
 */
function endSession(peerName) {
  const sessionInfo = document.getElementById('session-info');
  if (sessionInfo) {
    sessionInfo.innerHTML = `
      <p class="text-muted">Session with ${window.UI.escapeHtml(peerName)} ended.</p>
      <p>Please complete the post-session quiz and feedback below!</p>
    `;
  }

  // Unlock the buddy feedback form now that the session is over
  handleEndSession();
}

/**
 * Handle pre-quiz submit
 * @param {Event} e - Submit event
 */
function handlePreQuizSubmit(e) {
  // This function is deprecated and no longer used
  // The quiz uses handleSubmitPreQuiz which properly handles radio button selections
  console.warn('handlePreQuizSubmit called but deprecated. Using handleSubmitPreQuiz instead.');
  handleSubmitPreQuiz();
}

/**
 * Start pre-session quiz - generate AI questions
 */
async function handleStartPreQuiz() {
  const startDiv = document.getElementById('prequiz-start');
  const quizDiv = document.getElementById('prequiz-quiz');
  const statusDiv = document.getElementById('prequiz-status');

  try {
    // Get current user profile
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      window.UI.showToast('Please log in first', 'error');
      return;
    }

    // Use UID as the key (same as saveProfile does)
    const userKey = currentUser.uid;
    console.log('🔍 Looking up profile with UID:', userKey);

    const userRef = firebase.database().ref(`users/${userKey}`);
    const snapshot = await userRef.once('value');
    let profile = snapshot.val();

    // Fallback to localStorage if Firebase profile not found
    if (!profile) {
      console.log('Profile not found in Firebase, checking localStorage...');
      profile = window.Auth.LocalStorage.getUserProfile();
    }

    console.log('Profile data:', profile);
    console.log('Strengths:', profile?.strengths);
    console.log('Weaknesses:', profile?.weaknesses);

    if (!profile || !profile.strengths || profile.strengths.length === 0 || !profile.weaknesses || profile.weaknesses.length === 0) {
      console.error('Profile check failed:', {
        hasProfile: !!profile,
        strengths: profile?.strengths,
        weaknesses: profile?.weaknesses
      });
      window.UI.showToast('Please complete your profile first with at least one strength and one weakness', 'error');
      return;
    }

    // Show loading
    statusDiv.innerHTML = `
      <div class="ai-loading" style="text-align: center; padding: 40px;">
        <div class="spinner" style="margin: 0 auto 16px;"></div>
        <p style="color: var(--primary); font-weight: 600; margin-bottom: 8px;">Generating personalized quiz questions...</p>
        <p style="color: var(--muted); font-size: 14px;">This may take up to 2 minutes. Please wait...</p>
        <div class="loading-dots" style="margin-top: 12px;">
          <span style="animation: pulse 1.5s ease-in-out infinite;">●</span>
          <span style="animation: pulse 1.5s ease-in-out 0.2s infinite;">●</span>
          <span style="animation: pulse 1.5s ease-in-out 0.4s infinite;">●</span>
        </div>
      </div>
    `;
    statusDiv.className = 'status';
    window.UI.show('prequiz-status');

    // Generate quiz via backend
    const response = await fetch('https://peerfuse-1.onrender.com/generate-presession-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strengths: profile.strengths || [],
        weaknesses: profile.weaknesses || []
      })
    });

    if (!response.ok) {
      // The backend sends a short, safe explanation (e.g. "The AI is busy...")
      let message = 'Failed to generate quiz. Please try again.';
      try {
        const body = await response.json();
        if (body && body.error) message = body.error;
      } catch (e) { /* response was not JSON */ }
      const serverError = new Error(message);
      serverError.fromServer = true;
      throw serverError;
    }

    const data = await response.json();

    console.log('🎯 Quiz API response:', data);

    if (!data.content) {
      throw new Error('No quiz content returned from API');
    }

    // Parse and display questions
    displayPreQuizQuestions(data.content);

    // Switch views
    window.UI.hide('prequiz-start');
    window.UI.hide('prequiz-results');
    window.UI.show('submit-prequiz-btn');
    window.UI.show('prequiz-quiz');
    window.UI.hide('prequiz-status');

  } catch (error) {
    console.error('Error generating quiz:', error);
    statusDiv.textContent = error.fromServer ? error.message : 'Failed to generate quiz. Please try again.';
    statusDiv.className = 'status error';
  }
}

/**
 * Prepare AI text for the quiz: keep maths ($...$, $$...$$, \(...\), \[...\])
 * untouched so KaTeX can typeset it, strip markdown bold/italic and code
 * backticks from the rest, and escape HTML so AI output cannot inject markup.
 * @param {string} text - Raw text from the AI
 * @returns {string} HTML-safe text with maths left in its delimiters
 */
function cleanGeminiText(text) {
  if (!text) return '';

  // Odd entries of the split are maths segments; leave them exactly as written
  const parts = String(text).split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g);
  const cleaned = parts.map((part, i) => {
    if (i % 2 === 1) return part;
    return part
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1');
  }).join('').replace(/\s+/g, ' ').trim();

  const escape = (window.UI && window.UI.escapeHtml) ? window.UI.escapeHtml : (s) => s;
  return escape(cleaned);
}

/**
 * Typeset any maths inside an element with KaTeX (loaded in index.html).
 * Does nothing if KaTeX has not loaded, so the plain text still shows.
 * @param {HTMLElement} element - Container whose text may contain maths
 */
function renderQuizMath(element) {
  if (!element || typeof window.renderMathInElement !== 'function') return;
  window.renderMathInElement(element, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\(', right: '\)', display: false },
      { left: '\[', right: '\]', display: true }
    ],
    throwOnError: false
  });
}

/**
 * Display pre-quiz questions
 */
function displayPreQuizQuestions(quizContent) {
  const questionsDiv = document.getElementById('prequiz-questions');

  console.log('🔍 Quiz content received:', quizContent);

  // Parse the quiz content
  const questions = parseQuizContent(quizContent);

  console.log('✅ Parsed questions:', questions.length, questions);

  if (questions.length === 0) {
    questionsDiv.innerHTML = '<p class="text-danger">Failed to parse quiz questions. Please try again.</p>';
    return;
  }

  let html = '<div class="quiz-questions">';

  questions.forEach((q, index) => {
    // Clean the text to remove LaTeX and formatting symbols
    const cleanQuestion = cleanGeminiText(q.question);
    const cleanOptions = q.options.map(opt => cleanGeminiText(opt));

    html += `
      <div class="question-block" id="qblock-${index}">
        <p class="question-text"><span class="question-number">${index + 1}.</span> ${cleanQuestion}</p>
        ${q.difficulty ? `<span class="quiz-tag">${cleanGeminiText(q.difficulty.replace(/[\[\]]/g, '').toLowerCase())}</span>` : ''}
        <div class="options">
          ${cleanOptions.map((opt, i) => `
            <label class="quiz-option" data-letter="${String.fromCharCode(65 + i)}">
              <input type="radio" name="q${index}" value="${String.fromCharCode(65 + i)}" required>
              <span>${opt}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  });

  html += '</div>';
  questionsDiv.innerHTML = html;
  renderQuizMath(questionsDiv);

  // Store questions for grading
  window.preQuizQuestions = questions;
}

/**
 * Parse quiz content from AI response
 */
function parseQuizContent(content) {
  const questions = [];

  console.log('🔍 Starting quiz parsing...');
  console.log('📄 Content length:', content.length);
  console.log('📝 First 500 chars:', content.substring(0, 500));

  // Strip any preamble text before the first question
  const firstQuestionIndex = content.search(/Question\s+1\b/i);
  if (firstQuestionIndex > 0) {
    console.log('✂️ Removing preamble text (first', firstQuestionIndex, 'chars)');
    content = content.substring(firstQuestionIndex);
  }

  // Primary strategy: Split by "Question N" pattern using multiple approaches
  let blocks = [];

  // Try approach 1: Split at the start of each "Question N [...]" line
  // This uses a positive lookahead to split right before each Question marker
  const approach1 = content.split(/(?=\nQuestion\s+\d+)/);
  const blocks1 = approach1
    .map(b => b.trim())
    .filter(b => b && /^Question\s+\d+/i.test(b));

  console.log('📦 Approach 1 (split by \\nQuestion): found', blocks1.length, 'blocks');

  // Try approach 2: Use regex to match each complete question block
  const questionPattern = /Question\s+\d+[\s\S]*?(?=Question\s+\d+|$)/gi;
  const blocks2 = content.match(questionPattern) || [];
  console.log('📦 Approach 2 (regex match): found', blocks2.length, 'blocks');

  // Use whichever approach found more blocks
  blocks = blocks1.length >= blocks2.length ? blocks1 : blocks2.map(b => b.trim());

  console.log('✅ Using blocks from best approach:', blocks.length);

  if (blocks.length === 0) {
    console.error('❌ No question blocks found in content!');
    return [];
  }

  blocks.forEach((block, blockIndex) => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    if (lines.length === 0) {
      console.log(`⚠️ Block ${blockIndex + 1}: Empty block, skipping`);
      return;
    }

    // Extract difficulty from bracket notation like [STRENGTH - HARD]
    let difficulty = '';
    const difficultyMatch = block.match(/\[(STRENGTH|WEAKNESS)\s*(?:-\s*(EASY|MEDIUM|HARD))?\]/i);
    if (difficultyMatch) {
      difficulty = difficultyMatch[0];
    } else {
      // fallback by block index (first 10 -> strengths)
      difficulty = blockIndex < 10 ? '[STRENGTH]' : '[WEAKNESS]';
    }

    // Find the first non-empty line that looks like question text (skip headers that start with "Question")
    let questionText = '';
    let questionLineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^Question\b/i.test(line)) continue;
      if (/^\[.*\]$/.test(line)) continue;
      // Assume the first remaining line is the question
      questionText = line;
      questionLineIndex = i;
      break;
    }

    if (!questionText) {
      console.log(`⚠️ Block ${blockIndex + 1}: No question text found`);
      return;
    }

    // Extract answer options (accept formats like "A) ...", "A. ...", "A:" with or without spaces)
    const options = [];
    let correctAnswer = '';
    let explanation = '';

    // More flexible option regex that handles various formats
    const optionRegex = /^([A-D])\s*[\)\.:\-]\s*(.*)$/i;
    const correctRegex = /(?:Correct\s*Answer|Answer)\s*[:\-]?\s*([A-D])/i;
    const explanationRegex = /Explanation\s*[:\-]?\s*(.+)/i;

    for (let i = questionLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];

      // Skip "---" separators
      if (line === '---' || line.startsWith('---')) continue;

      const optMatch = line.match(optionRegex);
      if (optMatch) {
        // optMatch[1] = letter, optMatch[2] = option text
        const optionText = optMatch[2].trim();
        if (optionText) {  // Only add non-empty options
          options.push(optionText);
        }
        continue;
      }

      const corr = line.match(correctRegex);
      if (corr && corr[1]) {
        correctAnswer = corr[1].toUpperCase();
        continue;
      }

      const expl = line.match(explanationRegex);
      if (expl && expl[1]) {
        explanation = expl[1].trim();
        continue;
      }
    }

    // If correctAnswer not found in lines, also try to find it anywhere in the block
    if (!correctAnswer) {
      const anyCorr = block.match(/(?:Correct\s*Answer|Answer)\s*[:\-]?\s*([A-D])/i);
      if (anyCorr && anyCorr[1]) correctAnswer = anyCorr[1].toUpperCase();
    }

    // Only add if we have question and at least 4 options
    if (questionText && options.length >= 4) {
      // Trim to first 4 options in case extras are present
      questions.push({
        question: questionText,
        difficulty,
        options: options.slice(0, 4),
        correctAnswer,
        explanation
      });
      console.log(`✅ Block ${blockIndex + 1}: Successfully parsed question`);
    } else {
      console.log(`⚠️ Block ${blockIndex + 1}: Insufficient data (text: ${!!questionText}, options: ${options.length})`);
    }
  });

  console.log(`✅ Parsed ${questions.length} questions from quiz content`);
  console.log('📋 Questions array:', questions);

  if (questions.length === 0) {
    console.error('❌ No questions parsed! Raw content:', content);
  }

  return questions;
}

/**
 * Submit and grade pre-quiz
 */
function handleSubmitPreQuiz() {
  const questions = window.preQuizQuestions || [];
  if (questions.length === 0) {
    window.UI.showToast('No questions to grade', 'error');
    return;
  }

  // Every question must be answered before grading
  document.querySelectorAll('.question-block.unanswered').forEach(b => b.classList.remove('unanswered'));
  const unanswered = questions
    .map((q, index) => index)
    .filter(index => !document.querySelector(`input[name="q${index}"]:checked`));
  if (unanswered.length > 0) {
    unanswered.forEach(index => document.getElementById(`qblock-${index}`)?.classList.add('unanswered'));
    document.getElementById(`qblock-${unanswered[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.UI.showToast(`Please answer every question first (${unanswered.length} left)`, 'warning', 4000);
    return;
  }

  let correct = 0;
  let strengthCorrect = 0;
  let weaknessCorrect = 0;
  let strengthTotal = 0;
  let weaknessTotal = 0;

  questions.forEach((q, index) => {
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    const isCorrect = selected && selected.value === q.correctAnswer;

    // More flexible difficulty detection
    const isStrength = q.difficulty.toUpperCase().includes('STRENGTH');
    const isWeakness = q.difficulty.toUpperCase().includes('WEAKNESS');

    console.log(`Q${index + 1}: ${q.difficulty} - Strength: ${isStrength}, Weakness: ${isWeakness}, Correct: ${isCorrect}`);

    if (isCorrect) {
      correct++;
      if (isStrength) strengthCorrect++;
      if (isWeakness) weaknessCorrect++;
    }

    if (isStrength) strengthTotal++;
    if (isWeakness) weaknessTotal++;
  });

  console.log(`Totals - Strength: ${strengthCorrect}/${strengthTotal}, Weakness: ${weaknessCorrect}/${weaknessTotal}`);

  const percentage = Math.round((correct / questions.length) * 100);
  const strengthPct = strengthTotal > 0 ? Math.round((strengthCorrect / strengthTotal) * 100) : 0;
  const weaknessPct = weaknessTotal > 0 ? Math.round((weaknessCorrect / weaknessTotal) * 100) : 0;

  // Display results
  const scoreDiv = document.getElementById('prequiz-score');
  const breakdownDiv = document.getElementById('prequiz-breakdown');

  scoreDiv.innerHTML = `
    <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, var(--primary-light), var(--primary)); color: white; border-radius: var(--radius); margin-bottom: 16px;">
      <h2 style="font-size: 48px; margin: 0; color: white;">${percentage}%</h2>
      <p style="margin: 8px 0 0 0; color: white;">Overall Score: ${correct} / ${questions.length}</p>
    </div>
  `;

  breakdownDiv.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div style="padding: 16px; background: rgba(var(--primary-rgb), 0.1); border-radius: var(--radius-sm); text-align: center;">
        <h4 style="margin: 0 0 8px 0; color: var(--primary-dark);">Strengths</h4>
        <p style="font-size: 24px; font-weight: 600; margin: 0; color: var(--text-dark);">${strengthPct}%</p>
        <p style="font-size: 14px; color: var(--muted); margin: 4px 0 0 0;">${strengthCorrect} / ${strengthTotal} correct</p>
        ${strengthTotal === 0 ? '<p style="font-size: 12px; color: var(--error); margin-top: 4px;">No strength questions detected</p>' : ''}
      </div>
      <div style="padding: 16px; background: rgba(var(--primary-rgb), 0.1); border-radius: var(--radius-sm); text-align: center;">
        <h4 style="margin: 0 0 8px 0; color: var(--primary-dark);">Weaknesses</h4>
        <p style="font-size: 24px; font-weight: 600; margin: 0; color: var(--text-dark);">${weaknessPct}%</p>
        <p style="font-size: 14px; color: var(--muted); margin: 4px 0 0 0;">${weaknessCorrect} / ${weaknessTotal} correct</p>
        ${weaknessTotal === 0 ? '<p style="font-size: 12px; color: var(--error); margin-top: 4px;">No weakness questions detected</p>' : ''}
      </div>
    </div>
  `;

  // Save results to Firebase as part of user profile
  const currentUser = firebase.auth().currentUser;
  if (currentUser) {
    const userKey = currentUser.uid;

    // Determine if user is struggling in their strengths/weaknesses
    const strugglingInStrengths = strengthPct < 50;
    const strugglingInWeaknesses = weaknessPct < 50;

    const quizData = {
      preQuizScore: percentage,
      preQuizCorrect: correct,
      preQuizTotal: questions.length,
      preQuizStrengthScore: strengthPct,
      preQuizWeaknessScore: weaknessPct,
      preQuizStrugglingInStrengths: strugglingInStrengths,
      preQuizStrugglingInWeaknesses: strugglingInWeaknesses,
      preQuizTimestamp: Date.now()
    };

    // Update both users/ and profiles/ paths
    Promise.all([
      firebase.database().ref(`users/${userKey}`).update(quizData),
      firebase.database().ref(`profiles/${userKey}`).update(quizData)
    ]).then(() => {
      console.log('✅ Quiz results saved to profile');
    }).catch(error => {
      console.error('❌ Error saving quiz results:', error);
    });
  }

  // Show results above the questions, which now show what was right or wrong
  showAnswerReview(questions);
  window.UI.hide('submit-prequiz-btn');
  window.UI.show('prequiz-results');
  document.getElementById('prequiz-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.UI.showToast(`Quiz completed! You scored ${percentage}%`, 'success');
}

/**
 * After grading, mark each question: the correct option in green, a wrong
 * choice in red, lock the answers and show the explanation.
 * @param {Array} questions - Parsed questions with correctAnswer and explanation
 */
function showAnswerReview(questions) {
  questions.forEach((q, index) => {
    const block = document.getElementById(`qblock-${index}`);
    if (!block) return;
    const selected = block.querySelector('input:checked')?.value;
    const gotIt = selected === q.correctAnswer;

    block.querySelectorAll('.quiz-option').forEach(label => {
      const letter = label.dataset.letter;
      label.querySelector('input').disabled = true;
      if (letter === q.correctAnswer) label.classList.add('opt-correct');
      else if (letter === selected) label.classList.add('opt-wrong');
    });
    block.classList.add(gotIt ? 'answered-right' : 'answered-wrong');

    const note = document.createElement('p');
    note.className = 'q-explanation';
    const verdict = gotIt ? '✓ Correct.' : `✗ The answer is ${q.correctAnswer || '?'}.`;
    note.innerHTML = `<strong>${verdict}</strong> ${q.explanation ? cleanGeminiText(q.explanation) : ''}`;
    block.appendChild(note);
    renderQuizMath(note);
  });
}

/**
 * Start the assessment again without reloading the page (matches stay on screen)
 */
function resetPreQuiz() {
  window.preQuizQuestions = [];
  const questionsDiv = document.getElementById('prequiz-questions');
  if (questionsDiv) questionsDiv.innerHTML = '';
  window.UI.hide('prequiz-results');
  window.UI.hide('prequiz-quiz');
  window.UI.hide('prequiz-status');
  window.UI.show('submit-prequiz-btn');
  window.UI.show('prequiz-start');
  document.getElementById('prequiz-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Display pre-quiz results summary
 * @param {Object} profile - User profile object containing quiz results
 */
function displayPreQuizResults(profile) {
  const scoreDiv = document.getElementById('prequiz-score');
  const breakdownDiv = document.getElementById('prequiz-breakdown');

  if (!scoreDiv || !breakdownDiv) return;

  // Check if quiz data exists in profile
  if (!profile.preQuizScore && profile.preQuizScore !== 0) return;

  scoreDiv.innerHTML = `
    <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, var(--accent-light), var(--accent)); color: var(--text-on-accent); border-radius: var(--radius); margin-bottom: 16px;">
      <h2 style="font-size: 48px; margin: 0; color: var(--text-on-accent);">${profile.preQuizScore}%</h2>
      <p style="margin: 8px 0 0 0; color: var(--text-on-accent);">Previous Score: ${profile.preQuizCorrect} / ${profile.preQuizTotal}</p>
      <p style="font-size: 12px; color: var(--text-on-accent); opacity: 0.8; margin: 4px 0 0 0;">
        ${new Date(profile.preQuizTimestamp).toLocaleDateString()}
      </p>
    </div>
  `;

  breakdownDiv.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
      <div style="padding: 16px; background: rgba(var(--primary-rgb), 0.1); border-radius: var(--radius-sm); text-align: center;">
        <h4 style="margin: 0 0 8px 0; color: var(--primary-dark);">Strengths</h4>
        <p style="font-size: 24px; font-weight: 600; margin: 0; color: var(--text-dark);">${profile.preQuizStrengthScore}%</p>
        ${profile.preQuizStrugglingInStrengths ? '<p style="font-size: 12px; color: var(--error); margin-top: 4px;">⚠️ Needs improvement</p>' : '<p style="font-size: 12px; color: var(--success); margin-top: 4px;">✓ Good performance</p>'}
      </div>
      <div style="padding: 16px; background: rgba(var(--primary-rgb), 0.1); border-radius: var(--radius-sm); text-align: center;">
        <h4 style="margin: 0 0 8px 0; color: var(--primary-dark);">Weaknesses</h4>
        <p style="font-size: 24px; font-weight: 600; margin: 0; color: var(--text-dark);">${profile.preQuizWeaknessScore}%</p>
        ${profile.preQuizStrugglingInWeaknesses ? '<p style="font-size: 12px; color: var(--error); margin-top: 4px;">⚠️ Needs improvement</p>' : '<p style="font-size: 12px; color: var(--success); margin-top: 4px;">✓ Good performance</p>'}
      </div>
    </div>
  `;

  // Show the results section
  window.UI.hide('prequiz-quiz');
  window.UI.show('prequiz-results');
}

/**
 * Handle post-quiz submit
 * @param {Event} e - Submit event
 */
async function handlePostQuizSubmit(e) {
  e.preventDefault();

  // Get all form values
  const matchRelevance = document.querySelector('input[name="match-relevance"]:checked')?.value;
  const goalsMatch = document.querySelector('input[name="goals-match"]:checked')?.value;
  const bestThing = document.getElementById('best-thing')?.value;
  const leastFav = document.getElementById('least-fav')?.value;
  const improvement = document.getElementById('improvement')?.value;
  const featureRequest = document.getElementById('feature-request')?.value;
  const additionalComments = document.getElementById('additional-comments')?.value;

  // Validate required fields
  if (!matchRelevance || !goalsMatch || !bestThing || !leastFav || !improvement) {
    window.UI.showToast('Please complete all required fields', 'error');
    return;
  }

  const currentUser = firebase.auth().currentUser;
  if (!currentUser) {
    window.UI.showToast('Please log in to submit feedback', 'error');
    return;
  }

  const feedbackData = {
    userId: currentUser.uid,
    userEmail: currentUser.email,
    matchRelevance: parseInt(matchRelevance),
    goalsMatch: goalsMatch,
    bestThing: bestThing,
    leastFavorite: leastFav,
    improvementSuggestion: improvement,
    featureRequest: featureRequest || 'None',
    additionalComments: additionalComments || '',
    timestamp: Date.now(),
    submittedAt: new Date().toISOString()
  };

  try {
    // Save to Firebase under 'feedback' collection
    const feedbackRef = firebase.database().ref('feedback').push();
    await feedbackRef.set(feedbackData);

    window.UI.showStatus('feedback-status', 'Thank you for your feedback! 🎉', 'success');
    window.UI.showToast('Feedback submitted successfully!', 'success');

    // Clear form
    window.UI.clearForm('postquiz-form');

    // Feedback for this session is done; lock the form until the next session
    try { localStorage.removeItem(FEEDBACK_DUE_KEY); } catch (e) { /* storage unavailable */ }
    setTimeout(hideFeedbackForm, 2500);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    window.UI.showStatus('feedback-status', 'Failed to submit feedback. Please try again.', 'error');
    window.UI.showToast('Error submitting feedback', 'error');
  }
}

/**
 * Load user profile
 * @param {string} username - Username to load
 */
async function loadUserProfile(username) {
  try {
    // Get current user to use UID
    const currentUser = firebase.auth().currentUser;
    let profile = null;

    if (currentUser && window.FirebaseHelpers) {
      // Load by UID instead of username
      const userKey = currentUser.uid;
      const snapshot = await firebase.database().ref(`users/${userKey}`).once('value');
      profile = snapshot.val();
      console.log('🔍 Loaded profile for UID:', userKey, profile);
    }

    // Fallback to localStorage
    if (!profile) {
      profile = window.Auth.LocalStorage.getUserProfile();
      console.log('🔍 Loaded profile from localStorage:', profile);

      // If we have a localStorage profile but not in Firebase, sync it
      if (profile && currentUser) {
        console.log('📤 Syncing localStorage profile to Firebase...');
        profile.uid = currentUser.uid;
        profile.email = currentUser.email;
        if (window.FirebaseHelpers) {
          await window.FirebaseHelpers.saveProfile(profile);
        }
      }
    }

    const createProfileBtn = document.getElementById('create-profile-btn');
    const editProfileBtn = document.getElementById('edit-profile-btn');

    if (profile && (profile.strengths?.length > 0 || profile.weaknesses?.length > 0)) {
      console.log('✅ Profile exists, showing Edit Profile button');
      // User has a profile - show Edit Profile button
      if (createProfileBtn) window.UI.hide('create-profile-btn');
      if (editProfileBtn) window.UI.show('edit-profile-btn');
      AppState.hasProfile = true;
      setProfileMode(true);
      syncMatchFormWithProfile(profile);

      // Populate profile form if profile exists (the user's own text, falling back to
      // the stored value for profiles saved before originals were kept)
      const strengthLabels = profile.strengthsOriginal?.length ? profile.strengthsOriginal : profile.strengths;
      const weaknessLabels = profile.weaknessesOriginal?.length ? profile.weaknessesOriginal : profile.weaknesses;

      if (strengthLabels && strengthLabels.length > 0) {
        const strength1El = document.getElementById('profile-strength1');
        const strength2El = document.getElementById('profile-strength2');
        if (strength1El) strength1El.value = strengthLabels[0] || '';
        if (strength2El) strength2El.value = strengthLabels[1] || '';
      }

      if (weaknessLabels && weaknessLabels.length > 0) {
        const weakness1El = document.getElementById('profile-weakness1');
        const weakness2El = document.getElementById('profile-weakness2');
        if (weakness1El) weakness1El.value = weaknessLabels[0] || '';
        if (weakness2El) weakness2El.value = weaknessLabels[1] || '';
      }

      // Populate other profile fields
      const availabilityEl = document.getElementById('profile-availability');
      const modeEl = document.getElementById('profile-mode');
      const goalEl = document.getElementById('profile-goal');
      const frequencyEl = document.getElementById('profile-frequency');
      const sessionLengthEl = document.getElementById('profile-session-length');
      const partnerPreferenceEl = document.getElementById('profile-partner-preference');
      const studyPersonalityEl = document.getElementById('profile-study-personality');
      const timezoneEl = document.getElementById('profile-timezone');

      if (availabilityEl && profile.availability) availabilityEl.value = profile.availability;
      if (modeEl && profile.preferredMode) modeEl.value = profile.preferredMode;
      if (goalEl && profile.primaryGoal) goalEl.value = profile.primaryGoal;
      if (frequencyEl && profile.preferredFrequency) frequencyEl.value = profile.preferredFrequency;
      if (sessionLengthEl && profile.sessionLength) sessionLengthEl.value = profile.sessionLength;
      if (partnerPreferenceEl && profile.partnerPreference) partnerPreferenceEl.value = profile.partnerPreference;
      if (studyPersonalityEl && profile.studyPersonality) studyPersonalityEl.value = profile.studyPersonality;
      if (timezoneEl && profile.timeZone) timezoneEl.value = profile.timeZone;

      // Display pre-quiz results if available (check new field names)
      if (profile.preQuizScore || profile.preQuizScore === 0) {
        console.log('📊 Pre-quiz results found in profile');
        displayPreQuizResults(profile);
      }
    } else {
      console.log('⚠️ No profile found, showing Create Profile button');
      // New user - show Create Profile button and auto-open profile section
      if (createProfileBtn) window.UI.show('create-profile-btn');
      if (editProfileBtn) window.UI.hide('edit-profile-btn');
      AppState.hasProfile = false;
      setProfileMode(false);

      // Hide other sections and show profile section prominently
      window.UI.hide('match-section');
      window.UI.hide('prequiz-section');
      window.UI.hide('session-section');
      window.UI.hide('postquiz-section');
      window.UI.hide('ai-section');
      window.UI.show('profile-section');
    }

    restoreFeedbackState();
    applyNavHash();
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

/**
 * Load local users from localStorage
 */
function loadLocalUsers() {
  try {
    const stored = localStorage.getItem('peerfuse_users');
    if (stored) {
      AppState.localUsers = JSON.parse(stored);
      console.log(`Loaded ${AppState.localUsers.length} local users`);
    }
  } catch (error) {
    console.error('Error loading local users:', error);
    AppState.localUsers = [];
  }
}

/**
 * Save local users to localStorage
 */
function saveLocalUsers() {
  try {
    localStorage.setItem('peerfuse_users', JSON.stringify(AppState.localUsers));
  } catch (error) {
    console.error('Error saving local users:', error);
  }
}

/**
 * Get user-friendly auth error message
 * @param {string} errorCode - Firebase error code
 * @returns {string} User-friendly error message
 */
function getAuthErrorMessage(errorCode) {
  const messages = {
    'auth/email-already-in-use': 'This email is already registered. Please log in instead.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Contact support.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/timeout': 'Request timed out. Please try again.',
    'auth/missing-password': 'Please enter a password.',
    'auth/internal-error': 'An internal error occurred. Please try again.'
  };

  // Log unknown error codes for debugging
  if (!messages[errorCode] && errorCode) {
    console.warn('Unknown auth error code:', errorCode);
  }

  return messages[errorCode] || `Authentication failed: ${errorCode || 'Unknown error'}. Please try again.`;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

/**
 * Show a specific section and hide others (for navigation)
 */
function showSection(sectionId) {
  const sections = [
    'profile-section',
    'matching-section',
    'quiz-builder-section',
    'flashcard-section',
    'match-section',
    'prequiz-section',
    'session-section',
    'postquiz-section',
    'ai-section'
  ];

  sections.forEach(id => {
    if (id === sectionId) {
      window.UI.show(id);
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.UI.hide(id);
    }
  });

  // If showing profile section, populate username field
  if (sectionId === 'profile-section') {
    const currentUser = firebase.auth().currentUser;
    if (currentUser && currentUser.displayName) {
      const usernameField = document.getElementById('profile-username');
      if (usernameField) {
        usernameField.value = currentUser.displayName;
      }
    }
  }
}

/**
 * Go to Find Study Buddy. Before a profile exists there is nothing to match
 * on, so ask the user to create one first instead of doing nothing.
 */
function scrollToMatching() {
  if (!AppState.hasProfile) {
    window.UI.showToast('Create your profile first', 'warning', 4000);
    showSection('profile-section');
    return;
  }
  showMainSections();
  document.getElementById('match-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Show the main working sections (and hide the profile form)
 */
function showMainSections() {
  window.UI.hide('profile-section');
  ['match-section', 'prequiz-section', 'session-section', 'postquiz-section'].forEach(id => window.UI.show(id));
}

/**
 * Title the profile form for creating (first time) or editing (afterwards)
 * @param {boolean} editing - true when a profile already exists
 */
function setProfileMode(editing) {
  const title = document.getElementById('profile-title');
  const subtitle = document.getElementById('profile-subtitle');
  const saveBtn = document.getElementById('save-profile-btn');
  if (title) title.textContent = editing ? '📋 Edit Your Profile' : '📋 Create Your Learning Profile';
  if (subtitle) {
    subtitle.textContent = editing
      ? 'Update your strengths, weaknesses and study preferences'
      : 'Tell us about your academic strengths and areas where you need help';
  }
  if (saveBtn) saveBtn.textContent = editing ? 'Save Changes' : 'Save Profile';
}

/**
 * Start the Find Buddy options from the saved profile, so a search uses the
 * choices the user picked (e.g. "Collaborative") rather than a default
 * @param {Object} profile - Saved profile
 */
function syncMatchFormWithProfile(profile) {
  if (!profile) return;
  const fields = {
    partnerPreference: profile.partnerPreference,
    sessionLength: profile.sessionLength,
    studyPersonality: profile.studyPersonality
  };
  Object.entries(fields).forEach(([id, value]) => {
    const select = document.getElementById(id);
    if (select && value && [...select.options].some(o => o.value === value)) select.value = value;
  });
}

/**
 * Open the section named in the address (links from the AI Tools page use
 * index.html#profile and index.html#match), then clear it from the address
 */
function applyNavHash() {
  const hash = window.location.hash;
  if (hash === '#profile') showSection('profile-section');
  else if (hash === '#match') scrollToMatching();
  else return;
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

/**
 * Start new search - reset state and find fresh matches
 */
async function startNewSearch() {
  try {
    // Reset AppState
    AppState.currentMatches = [];
    AppState.currentMatchIndex = 0;

    const currentUser = firebase.auth().currentUser;
    if (currentUser && window.FirebaseHelpers) {
      // Clear rejection history
      await window.FirebaseHelpers.clearRejectedMatches(currentUser.uid);
      window.UI.showToast('Search history cleared. Finding new matches...', 'info');
    }

    // Call findMatch to search again
    await findMatch();
  } catch (error) {
    console.error('Error starting new search:', error);
    window.UI.showToast('Error starting new search', 'error');
  }
}

// Export for inline handlers
window.startNewSearch = startNewSearch;

/**
 * Toggle notification panel
 */
function toggleNotificationPanel() {
  const panel = document.getElementById('notification-panel');
  if (panel.classList.contains('hidden')) {
    window.UI.show('notification-panel');
  } else {
    window.UI.hide('notification-panel');
  }
}

/**
 * Update notification UI
 */
function updateNotificationUI(request) {
  const notificationList = document.getElementById('notification-list');
  const badge = document.getElementById('notification-badge');

  if (request) {
    // Show badge
    window.UI.show('notification-badge');
    badge.textContent = '1';

    // Create notification item
    notificationList.innerHTML = `
      <div class="notification-item">
        <h4>🤝 New Match Request</h4>
        <p><strong>${window.UI.escapeHtml(request.fromName || 'Someone')}</strong> wants to study with you!</p>
        <p style="font-size: 12px; color: var(--muted);">Match Score: ${request.matchScore || 'N/A'}</p>
        <div class="notification-actions">
          <button id="notif-accept-btn" style="background: var(--success);">✓ Accept</button>
          <button id="notif-decline-btn" style="background: var(--error);">✗ Decline</button>
        </div>
      </div>
    `;

    // Add event listeners
    document.getElementById('notif-accept-btn')?.addEventListener('click', async () => {
      await handleAcceptMatch();
      window.UI.hide('notification-panel');
    });

    document.getElementById('notif-decline-btn')?.addEventListener('click', async () => {
      await handleDeclineMatch();
      window.UI.hide('notification-panel');
    });
  } else {
    // Hide badge
    window.UI.hide('notification-badge');
    notificationList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">No notifications</p>';
  }
}

/**
 * Listen for incoming match requests
 */
function listenForMatchRequests(userKey) {
  const requestRef = firebase.database().ref(`matchRequests/${userKey}`);
  requestRef.on('value', (snapshot) => {
    const request = snapshot.val();

    // Update notification UI
    updateNotificationUI(request);

    if (request) {
      // Show pending request UI in session section
      window.UI.hide('session-info');
      window.UI.hide('session-waiting');
      window.UI.show('session-pending');

      document.getElementById('requester-name').textContent = request.fromName || 'Someone';

      window.UI.showToast('New match request received!', 'success');
    }
  });
}

/**
 * Name shown to other students: the display name, never the email
 * @param {Object} user - Firebase auth user
 * @returns {string} Display name, or a neutral label if none is set
 */
function publicName(user) {
  return (user && user.displayName && user.displayName.trim()) || 'A PeerFuse student';
}

/**
 * Send a match request to another user
 */
async function sendMatchRequest(match) {
  try {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    const userKey = currentUser.uid;
    const userName = publicName(currentUser);

    // Get partner's UID
    const partnerKey = match.user.uid;
    if (!partnerKey) {
      window.UI.showToast('Cannot send request - partner UID not found', 'error');
      return;
    }

    // Clear any existing session data before sending new request
    await firebase.database().ref(`sessions/${userKey}`).remove();

    // Create match request
    await firebase.database().ref(`matchRequests/${partnerKey}`).set({
      from: userKey,
      fromName: userName,
      matchScore: match.score,
      timestamp: Date.now()
    });

    // Show waiting state
    window.UI.hide('session-info');
    window.UI.show('session-waiting');
    document.getElementById('match-partner-name').textContent = window.UI.displayNameFor(match.user);

    window.UI.showToast('Match request sent! Waiting for response...', 'success');

    // Listen for acceptance
    listenForMatchAcceptance(userKey, match);
  } catch (error) {
    console.error('Error sending match request:', error);
    window.UI.showToast('Failed to send match request', 'error');
  }
}

/**
 * Handle rematch request - reject current match and find next one
 * @param {Object} currentMatch - Current match to reject
 */
async function handleRematchRequest(currentMatch) {
  try {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      window.UI.showToast('Please log in first', 'error');
      return;
    }

    const userId = currentUser.uid;
    const rejectedUserId = currentMatch.user.uid || currentMatch.user.username;

    // Track rejection in Firebase
    if (window.FirebaseHelpers) {
      const rejected = await window.FirebaseHelpers.rejectMatch(userId, rejectedUserId);
      if (!rejected) {
        window.UI.showToast('Could not track rejection', 'warning');
      }
    }

    window.UI.showToast('Finding alternative matches...', 'info');

    // Fetch current user profile
    const userSnapshot = await firebase.database().ref(`users/${userId}`).once('value');
    const currentUserProfile = userSnapshot.val();

    if (!currentUserProfile) {
      window.UI.showToast('Could not load your profile', 'error');
      return;
    }

    // Fetch ALL user profiles (fresh fetch)
    let allCandidates = [];
    const profilesSnapshot = await firebase.database().ref('profiles').once('value');
    const profilesData = profilesSnapshot.val();

    if (profilesData) {
      allCandidates = Object.entries(profilesData).map(([uid, profile]) => ({
        uid,
        ...profile
      }));
    }

    console.log(`Found ${allCandidates.length} total candidates for rematch`);

    // Get rejected IDs to exclude
    const rejectedIds = window.FirebaseHelpers 
      ? await window.FirebaseHelpers.getRejectedMatchIds(userId)
      : [rejectedUserId];

    console.log(`Excluding ${rejectedIds.length} rejected matches:`, rejectedIds);

    // Use findRematch with exclusion list
    const rematchResult = window.Matching.findRematch(
      currentUserProfile,
      allCandidates,
      rejectedIds,
      10
    );

    console.log('Rematch result:', rematchResult);

    if (rematchResult.status === 'no_matches' || !rematchResult.matches || rematchResult.matches.length === 0) {
      // No more matches available
      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = `
        <div style="padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius); text-align: center;">
          <h3 style="color: var(--error); margin: 0 0 12px 0;">⚠️ No More Matches</h3>
          <p style="color: var(--text-secondary); margin: 0;">
            ${rematchResult.message || 'You\'ve reviewed all compatible matches. Check back later!'}
          </p>
        </div>
      `;

      window.UI.showToast('No more matches available', 'info');
      return;
    }

    // Display first alternative match
    const bestRematch = rematchResult.matches[0];
    AppState.currentMatches = rematchResult.matches;
    AppState.currentMatchIndex = 0;

    renderMatchCard(bestRematch, 'Next match');

    window.UI.showToast(`Found next match!`, 'success');
  } catch (error) {
    console.error('Error handling rematch request:', error);
    window.UI.showToast('Failed to find alternative matches', 'error');
    document.getElementById('result').innerHTML = `
      <div style="padding: 20px; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius); text-align: center;">
        <p style="color: var(--error);">Error finding alternative match. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Listen for match acceptance
 */
function listenForMatchAcceptance(userKey, match) {
  const sessionRef = firebase.database().ref(`sessions/${userKey}`);
  sessionRef.on('value', async (snapshot) => {
    const session = snapshot.val();
    if (session && session.status === 'accepted') {
      // Check if we need to regenerate link (fix for old Google Meet links)
      if (session.meetLink && session.meetLink.includes('meet.google.com')) {
        console.log('Fixing old Google Meet link...');
        const meetingRoomId = generateMeetingId();
        const newMeetLink = `https://meet.jit.si/PeerFuse-${meetingRoomId}`;

        // Update both users' sessions
        const partnerKey = session.user1 === userKey ? session.user2 : session.user1;
        await Promise.all([
          sessionRef.update({ meetLink: newMeetLink }),
          firebase.database().ref(`sessions/${partnerKey}`).update({ meetLink: newMeetLink })
        ]);
        return; // Will trigger again with updated link
      }

      // Match was accepted!
      window.UI.hide('session-waiting');
      window.UI.show('session-ready');
      document.getElementById('session-partner-name').textContent = window.UI.displayNameFor(match.user);

      window.UI.showToast('Match accepted! Click to start your meeting.', 'success');

      // Stop listening
      sessionRef.off();
    }
  });
}

/**
 * Handle accepting a match request
 */
async function handleAcceptMatch() {
  try {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    const userKey = currentUser.uid;

    // Get the pending match request
    const requestRef = firebase.database().ref(`matchRequests/${userKey}`);
    const snapshot = await requestRef.once('value');
    const request = snapshot.val();

    if (!request) {
      window.UI.showToast('No pending match request', 'error');
      return;
    }

    // Generate a unique Jitsi Meet room link
    const meetingRoomId = generateMeetingId();
    const meetLink = `https://meet.jit.si/PeerFuse-${meetingRoomId}`;

    // Create session data
    const sessionData = {
      user1: request.from,
      user2: userKey,
      meetLink: meetLink,
      status: 'accepted',
      createdAt: Date.now()
    };

    // Save session to both users
    await Promise.all([
      firebase.database().ref(`sessions/${request.from}`).set(sessionData),
      firebase.database().ref(`sessions/${userKey}`).set(sessionData),
      requestRef.remove() // Remove the request
    ]);

    // Show session ready UI
    window.UI.hide('session-pending');
    window.UI.hide('session-info');
    window.UI.show('session-ready');

    document.getElementById('session-partner-name').textContent = request.fromName || 'Your study buddy';

    window.UI.showToast('Match accepted! Click to start your meeting.', 'success');

    // Listen for when partner clicks "Start Meeting"
    listenForMeetingStart(userKey);
  } catch (error) {
    console.error('Error accepting match:', error);
    window.UI.showToast('Failed to accept match', 'error');
  }
}

/**
 * Handle declining a match request
 */
async function handleDeclineMatch() {
  try {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    const userKey = currentUser.uid;
    await firebase.database().ref(`matchRequests/${userKey}`).remove();

    window.UI.hide('session-pending');
    window.UI.show('session-info');

    window.UI.showToast('Match request declined', 'success');
  } catch (error) {
    console.error('Error declining match:', error);
  }
}

/**
 * Handle starting the meeting
 */
async function handleStartMeeting() {
  try {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    const userKey = currentUser.uid;
    const sessionRef = firebase.database().ref(`sessions/${userKey}`);
    const snapshot = await sessionRef.once('value');
    const session = snapshot.val();

    if (!session || !session.meetLink) {
      window.UI.showToast('No active session found', 'error');
      return;
    }

    // Use the Jitsi link from session
    const meetLink = session.meetLink;

    // Update session to show meeting started
    await sessionRef.update({ meetingStarted: true });

    // Show the meeting link
    const linkContainer = document.getElementById('meeting-link-container');
    const linkElement = document.getElementById('meeting-link');

    linkElement.href = meetLink;
    linkElement.textContent = meetLink;

    window.UI.show('meeting-link-container');

    // Notify the other user
    const partnerKey = session.user1 === userKey ? session.user2 : session.user1;
    await firebase.database().ref(`notifications/${partnerKey}`).set({
      type: 'meeting-ready',
      message: 'Your study buddy has started the meeting!',
      meetLink: meetLink,
      timestamp: Date.now()
    });

    window.UI.showToast('Opening video meeting...', 'success');

    // Open the meeting in a new tab
    setTimeout(() => {
      window.open(meetLink, '_blank');
    }, 500);

  } catch (error) {
    console.error('Error starting meeting:', error);
    window.UI.showToast('Failed to start meeting', 'error');
  }
}

/**
 * Generate a random meeting ID for Jitsi Meet
 */
function generateMeetingId() {
  // Generate a unique room ID using timestamp + random string
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomStr}`;
}

/**
 * Listen for meeting start from partner
 */
function listenForMeetingStart(userKey) {
  const notifRef = firebase.database().ref(`notifications/${userKey}`);
  notifRef.on('value', (snapshot) => {
    const notif = snapshot.val();
    if (notif && notif.type === 'meeting-ready') {
      // Show notification
      window.UI.showToast('Your partner started the meeting!', 'success');

      // Show the meeting link
      const linkContainer = document.getElementById('meeting-link-container');
      const linkElement = document.getElementById('meeting-link');

      linkElement.href = notif.meetLink;
      linkElement.textContent = notif.meetLink;

      window.UI.show('meeting-link-container');

      // Clear the notification
      notifRef.remove();
    }
  });
}

/**
 * Open the buddy feedback form (after a session has ended)
 */
function showFeedbackForm() {
  window.UI.hide('feedback-locked');
  window.UI.show('feedback-subsection');
}

/**
 * Lock the feedback form again until the next session ends
 */
function hideFeedbackForm() {
  window.UI.hide('feedback-subsection');
  window.UI.show('feedback-locked');
  window.UI.clearStatus('feedback-status');
}

/**
 * The user finished a study session: remember that feedback is due (this
 * survives a page reload) and open the feedback form.
 */
function handleEndSession() {
  try { localStorage.setItem(FEEDBACK_DUE_KEY, '1'); } catch (e) { /* storage unavailable */ }
  showFeedbackForm();
  window.UI.showToast('Session finished. Please rate your study buddy.', 'success', 4000);
  document.getElementById('feedback-subsection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * On load, reopen the feedback form if a session ended but was not rated yet
 */
function restoreFeedbackState() {
  let due = false;
  try { due = localStorage.getItem(FEEDBACK_DUE_KEY) === '1'; } catch (e) { /* storage unavailable */ }
  if (due) showFeedbackForm(); else hideFeedbackForm();
}

/**
 * Fix old Google Meet sessions by replacing with Jitsi links
 * Uses a lock to ensure only one user updates the link
 */
async function fixOldGoogleMeetSessions(userKey) {
  try {
    const sessionRef = firebase.database().ref(`sessions/${userKey}`);
    const snapshot = await sessionRef.once('value');
    const session = snapshot.val();

    if (session && session.meetLink && session.meetLink.includes('meet.google.com')) {
      console.log('🔧 Old Google Meet session detected...');

      // Use user1 as the one who fixes the link (to avoid race condition)
      if (session.user1 !== userKey) {
        console.log('⏳ Waiting for partner to fix the link...');
        return; // Let user1 handle the fix
      }

      console.log('🔧 Generating new Jitsi link...');

      // Generate new Jitsi link using session timestamp for consistency
      const meetingRoomId = `${session.createdAt}-${Math.random().toString(36).substring(2, 8)}`;
      const newMeetLink = `https://meet.jit.si/PeerFuse-${meetingRoomId}`;

      // Update both users' sessions
      const partnerKey = session.user2;
      await Promise.all([
        sessionRef.update({ meetLink: newMeetLink }),
        firebase.database().ref(`sessions/${partnerKey}`).update({ meetLink: newMeetLink })
      ]);

      console.log('✅ Session updated with Jitsi link:', newMeetLink);
    }
  } catch (error) {
    console.error('Error fixing old session:', error);
  }
}
