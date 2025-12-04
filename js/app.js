/**
 * PeerFuse Main Application Logic
 * Coordinates auth, matching, and UI components
 */

// Global state
const AppState = {
  currentUser: null,
  currentMatches: [],
  currentMatchIndex: 0,
  localUsers: []
};

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
  // Beta warning close button
  const closeBetaWarning = document.getElementById('close-beta-warning');
  if (closeBetaWarning) {
    closeBetaWarning.addEventListener('click', () => {
      const betaWarning = document.getElementById('beta-warning');
      if (betaWarning) {
        betaWarning.style.display = 'none';
        localStorage.setItem('betaWarningDismissed', 'true');
      }
    });
  }

  // Check if beta warning was previously dismissed
  const betaWarning = document.getElementById('beta-warning');
  if (betaWarning && localStorage.getItem('betaWarningDismissed') === 'true') {
    betaWarning.style.display = 'none';
  }

  // Auth form handlers
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }

  const signupBtn = document.getElementById('signup-btn');
  if (signupBtn) {
    signupBtn.addEventListener('click', handleSignup);
  }

  const setUsernameBtn = document.getElementById('set-username-btn');
  if (setUsernameBtn) {
    setUsernameBtn.addEventListener('click', completeSignup);
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

  // Quiz form handlers
  const prequizForm = document.getElementById('prequiz-form');
  if (prequizForm) {
    prequizForm.addEventListener('submit', handlePreQuizSubmit);
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

  if (!email || !password) {
    window.UI.showToast('Please enter email and password', 'error');
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
    
    // Show username input
    window.UI.show('auth-username-row');
    window.UI.show('set-username-btn');
    window.UI.hide('login-btn');
    window.UI.hide('signup-btn');
    
    window.UI.showToast('Account created! Please set your display name.', 'success');
  } catch (error) {
    console.error('Signup error:', error);
    const errorMessage = getAuthErrorMessage(error.code);
    window.UI.showToast(errorMessage, 'error');
  }
}

/**
 * Complete signup with username
 */
async function completeSignup() {
  const username = document.getElementById('auth-username')?.value;

  if (!username || username.trim().length < 2) {
    window.UI.showToast('Please enter a valid username (at least 2 characters)', 'error');
    return;
  }

  try {
    await window.Auth.updateDisplayName(username);
    window.Auth.LocalStorage.setCurrentUser(username);
    
    window.UI.showToast('Welcome to PeerFuse!', 'success');
    showMainInterface(username);
    
    // Show profile section for first-time setup
    window.UI.show('profile-section');
  } catch (error) {
    console.error('Error setting username:', error);
    window.UI.showToast('Error setting username. Please try again.', 'error');
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
  const strength1 = document.getElementById('profile-strength1')?.value || '';
  const strength2 = document.getElementById('profile-strength2')?.value || '';
  const weakness1 = document.getElementById('profile-weakness1')?.value || '';
  const weakness2 = document.getElementById('profile-weakness2')?.value || '';
  const availability = document.getElementById('profile-availability')?.value || '';
  const mode = document.getElementById('profile-mode')?.value || '';
  const goal = document.getElementById('profile-goal')?.value || '';
  const frequency = document.getElementById('profile-frequency')?.value || '';
  const timezone = document.getElementById('profile-timezone')?.value || '';

  const strengths = [strength1, strength2].filter(s => s.trim()).map(s => s.trim());
  const weaknesses = [weakness1, weakness2].filter(w => w.trim()).map(w => w.trim());

  if (strengths.length === 0 || weaknesses.length === 0) {
    window.UI.showToast('Please enter at least one strength and one weakness', 'error');
    return;
  }

  if (!availability || !mode || !goal || !frequency || !timezone) {
    window.UI.showToast('Please fill in all required fields', 'error');
    return;
  }

  const profile = {
    username: currentUsername,
    email: AppState.currentUser?.email || firebase.auth().currentUser?.email,
    uid: AppState.currentUser?.uid,
    strengths,
    weaknesses,
    availability,
    preferredMode: mode,
    primaryGoal: goal,
    preferredFrequency: frequency,
    timeZone: timezone
  };

  try {
    // Save to Firebase
    if (window.FirebaseHelpers) {
      await window.FirebaseHelpers.saveProfile(profile);
    }

    // Save to localStorage
    window.Auth.LocalStorage.setUserProfile(profile);

    window.UI.showStatus('profile-status', 'Profile saved successfully!', 'success');
    window.UI.showToast('Profile saved!', 'success');

    // Switch to Edit Profile button
    const createProfileBtn = document.getElementById('create-profile-btn');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    if (createProfileBtn) window.UI.hide('create-profile-btn');
    if (editProfileBtn) window.UI.show('edit-profile-btn');

    // Show main sections and hide profile section
    setTimeout(() => {
      window.UI.hide('profile-section');
      window.UI.show('match-section');
      window.UI.show('prequiz-section');
      window.UI.show('session-section');
      window.UI.show('postquiz-section');
      window.UI.show('feedback-section');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1500);
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
    // Get optional preferences from matching form
    partnerPreference: document.getElementById('partnerPreference')?.value || 'No Preference',
    sessionLength: document.getElementById('sessionLength')?.value || '1 hour',
    studyPersonality: document.getElementById('studyPersonality')?.value || 'Flexible'
  };

  try {
    // Fetch users from Firebase
    let candidates = [];
    if (window.FirebaseHelpers) {
      const profiles = await window.FirebaseHelpers.fetchAllProfiles();
      candidates = profiles;
    }

    // Merge with local users
    candidates = [...candidates, ...AppState.localUsers];

    if (candidates.length === 0) {
      document.getElementById('result').innerHTML = '<p class="text-muted">No other users in the matching pool yet. Be the first to create a profile!</p>';
      return;
    }

    // Find matches
    const matches = window.Matching.findBestMatch(targetUser, candidates);

    if (!matches || matches.length === 0) {
      document.getElementById('result').innerHTML = '<p class="text-muted">No compatible matches found. Check back later as more users join!</p>';
      return;
    }

    // Store matches in state
    AppState.currentMatches = matches;
    AppState.currentMatchIndex = 0;

    // Display best match with request button
    const bestMatch = matches[0];
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="match-card" style="padding: 20px; background: linear-gradient(135deg, var(--primary-light), var(--primary)); color: white; border-radius: var(--radius); margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; color: white;">Best Match Found!</h3>
        <p style="font-size: 32px; font-weight: 700; margin: 8px 0; color: white;">${bestMatch.score} points</p>
        <p style="margin: 0; color: white;"><strong>${window.UI.escapeHtml(bestMatch.user.name || bestMatch.user.username)}</strong></p>
      </div>
      <div style="padding: 16px; background: rgba(var(--primary-rgb), 0.05); border-radius: var(--radius); margin-bottom: 16px;">
        <h4 style="color: var(--primary-dark); margin-bottom: 12px;">Why you match:</h4>
        <ul style="line-height: 1.8;">
          ${bestMatch.breakdown?.reasons?.map(r => `<li>${r}</li>`).join('') || '<li>Complementary skills and preferences</li>'}
        </ul>
      </div>
      <button id="send-match-request-btn" style="width: 100%; padding: 14px; font-size: 16px; font-weight: 600;">
        📩 Send Match Request
      </button>
    `;
    
    // Add click handler for send request button
    document.getElementById('send-match-request-btn')?.addEventListener('click', async () => {
      await sendMatchRequest(bestMatch);
    });

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
    console.error('Error finding match:', error);
    document.getElementById('result').innerHTML = '<p class="error">Error finding match. Please try again.</p>';
  }
}

/**
 * Show next match in the list
 */
function showNextMatch() {
  if (!AppState.currentMatches || AppState.currentMatches.length === 0) {
    window.UI.showToast('No more matches available', 'info');
    return;
  }

  AppState.currentMatchIndex++;
  
  if (AppState.currentMatchIndex >= AppState.currentMatches.length) {
    AppState.currentMatchIndex = 0;
    window.UI.showToast('Showing first match again', 'info');
  }

  const match = AppState.currentMatches[AppState.currentMatchIndex];
  window.UI.renderMatchResult(match, 'result');
}

/**
 * Start a session with a matched peer
 * @param {string} peerName - Peer's name
 */
function startSession(peerName) {
  const sessionInfo = document.getElementById('session-info');
  if (!sessionInfo) return;

  // Generate a random Google Meet-style link
  const meetCode = Math.random().toString(36).substring(2, 12);
  const meetLink = `https://meet.google.com/${meetCode}`;

  sessionInfo.innerHTML = `
    <p><strong>Session Partner:</strong> ${window.UI.escapeHtml(peerName)}</p>
    <p><strong>Status:</strong> <span style="color: var(--success);">● Active</span></p>
    <p><strong>Google Meet Link:</strong></p>
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

  window.UI.showToast('Session ended', 'info');
  
  // Scroll to post-quiz section
  document.getElementById('postquiz-section')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Handle pre-quiz submit
 * @param {Event} e - Submit event
 */
function handlePreQuizSubmit(e) {
  e.preventDefault();

  const formData = window.UI.getFormData('prequiz-form');
  
  console.log('Pre-quiz submitted:', formData);
  
  // Save to Firebase
  if (window.FirebaseHelpers) {
    window.FirebaseHelpers.saveQuizResults({
      type: 'pre-quiz',
      user: window.Auth.LocalStorage.getCurrentUser(),
      responses: formData
    });
  }

  window.UI.showStatus('prequiz-status', 'Pre-quiz submitted! You can now find a match.', 'success');
  window.UI.showToast('Pre-quiz completed!', 'success');
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse and display questions
    displayPreQuizQuestions(data.content);
    
    // Switch views
    window.UI.hide('prequiz-start');
    window.UI.show('prequiz-quiz');
    window.UI.hide('prequiz-status');
    
  } catch (error) {
    console.error('Error generating quiz:', error);
    statusDiv.textContent = 'Failed to generate quiz. Please try again.';
    statusDiv.className = 'status error';
  }
}

/**
 * Clean and format text from Gemini (remove LaTeX, special symbols, etc.)
 * @param {string} text - Raw text from Gemini
 * @returns {string} Cleaned text
 */
function cleanGeminiText(text) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove LaTeX math delimiters and convert to readable text
  // Inline math: $...$ or \(...\)
  cleaned = cleaned.replace(/\$([^$]+)\$/g, '$1');
  cleaned = cleaned.replace(/\\\(([^)]+)\\\)/g, '$1');
  
  // Block math: $$...$$ or \[...\]
  cleaned = cleaned.replace(/\$\$([^$]+)\$\$/g, '$1');
  cleaned = cleaned.replace(/\\\[([^\]]+)\\\]/g, '$1');
  
  // Remove markdown bold/italic that might not render
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  
  // Remove code backticks
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  
  // Convert common LaTeX symbols to readable text
  cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  cleaned = cleaned.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
  cleaned = cleaned.replace(/\\times/g, '×');
  cleaned = cleaned.replace(/\\div/g, '÷');
  cleaned = cleaned.replace(/\\pm/g, '±');
  cleaned = cleaned.replace(/\\leq/g, '≤');
  cleaned = cleaned.replace(/\\geq/g, '≥');
  cleaned = cleaned.replace(/\\neq/g, '≠');
  cleaned = cleaned.replace(/\\approx/g, '≈');
  cleaned = cleaned.replace(/\\infty/g, '∞');
  cleaned = cleaned.replace(/\\alpha/g, 'α');
  cleaned = cleaned.replace(/\\beta/g, 'β');
  cleaned = cleaned.replace(/\\gamma/g, 'γ');
  cleaned = cleaned.replace(/\\pi/g, 'π');
  cleaned = cleaned.replace(/\\theta/g, 'θ');
  cleaned = cleaned.replace(/\\sum/g, '∑');
  cleaned = cleaned.replace(/\\int/g, '∫');
  
  // Remove any remaining backslash commands
  cleaned = cleaned.replace(/\\[a-zA-Z]+/g, '');
  cleaned = cleaned.replace(/\\{/g, '');
  cleaned = cleaned.replace(/\\}/g, '');
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Display pre-quiz questions
 */
function displayPreQuizQuestions(quizContent) {
  const questionsDiv = document.getElementById('prequiz-questions');
  
  // Parse the quiz content
  const questions = parseQuizContent(quizContent);
  
  let html = '<div class="quiz-questions">';
  
  questions.forEach((q, index) => {
    // Clean the text to remove LaTeX and formatting symbols
    const cleanQuestion = cleanGeminiText(q.question);
    const cleanOptions = q.options.map(opt => cleanGeminiText(opt));
    
    html += `
      <div class="question-block" style="margin-bottom: 24px; padding: 16px; background: rgba(var(--primary-rgb), 0.04); border-radius: var(--radius-sm);">
        <p style="font-weight: 600; margin-bottom: 12px;">${cleanQuestion}</p>
        ${q.difficulty ? `<p style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">${q.difficulty}</p>` : ''}
        <div class="options" style="margin-left: 12px;">
          ${cleanOptions.map((opt, i) => `
            <label style="display: block; margin-bottom: 8px; cursor: pointer;">
              <input type="radio" name="q${index}" value="${String.fromCharCode(65 + i)}" required style="margin-right: 8px;">
              ${opt}
            </label>
          `).join('')}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  questionsDiv.innerHTML = html;
  
  // Store questions for grading
  window.preQuizQuestions = questions;
}

/**
 * Parse quiz content from AI response
 */
function parseQuizContent(content) {
  const questions = [];
  const questionBlocks = content.split(/\*\*Question \d+/).filter(b => b.trim());
  
  questionBlocks.forEach((block, blockIndex) => {
    const lines = block.split('\n').filter(l => l.trim());
    
    // Extract difficulty - try multiple patterns
    let difficulty = '';
    const difficultyMatch1 = block.match(/\[(STRENGTH|WEAKNESS)\s*-\s*(EASY|MEDIUM|HARD)\]/i);
    const difficultyMatch2 = block.match(/\[([^\]]+)\]/); // Any text in brackets
    
    if (difficultyMatch1) {
      difficulty = difficultyMatch1[0];
    } else if (difficultyMatch2) {
      difficulty = difficultyMatch2[0];
    }
    
    // Try to determine from position (questions 1-10 are strengths, 11-20 are weaknesses)
    if (!difficulty.toUpperCase().includes('STRENGTH') && !difficulty.toUpperCase().includes('WEAKNESS')) {
      if (blockIndex < 10) {
        difficulty = '[STRENGTH]';
      } else {
        difficulty = '[WEAKNESS]';
      }
    }
    
    console.log(`Block ${blockIndex + 1} difficulty:`, difficulty);
    
    // Extract question text (first non-empty line after difficulty)
    let questionText = '';
    let options = [];
    let correctAnswer = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!questionText && line && !line.includes('[') && !line.startsWith('**')) {
        questionText = line;
      } else if (line.match(/^[A-D]\)/)) {
        options.push(line);
      } else if (line.includes('Correct Answer:')) {
        correctAnswer = line.match(/[A-D]/)?.[0] || '';
      }
    }
    
    if (questionText && options.length === 4) {
      questions.push({
        question: questionText,
        difficulty,
        options,
        correctAnswer
      });
    }
  });
  
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

  // Show results
  window.UI.hide('prequiz-quiz');
  window.UI.show('prequiz-results');
  window.UI.showToast(`Quiz completed! You scored ${percentage}%`, 'success');
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
    <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, var(--primary-light), var(--primary)); color: white; border-radius: var(--radius); margin-bottom: 16px;">
      <h2 style="font-size: 48px; margin: 0; color: white;">${profile.preQuizScore}%</h2>
      <p style="margin: 8px 0 0 0; color: white;">Previous Score: ${profile.preQuizCorrect} / ${profile.preQuizTotal}</p>
      <p style="font-size: 12px; color: rgba(255,255,255,0.8); margin: 4px 0 0 0;">
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
  const matchRelevance = document.getElementById('match-relevance')?.value;
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
    
    // Reset slider to default
    const slider = document.getElementById('match-relevance');
    if (slider) {
      slider.value = 3;
      const display = document.getElementById('relevance-display');
      if (display) display.textContent = '3';
      // Update emoji highlighting
      document.querySelectorAll('.slider-emoji').forEach((emoji, index) => {
        if (index === 2) {
          emoji.classList.add('active');
        } else {
          emoji.classList.remove('active');
        }
      });
    }
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

      // Populate profile form if profile exists
      if (profile.strengths && profile.strengths.length > 0) {
        const strength1El = document.getElementById('profile-strength1');
        const strength2El = document.getElementById('profile-strength2');
        if (strength1El) strength1El.value = profile.strengths[0] || '';
        if (strength2El) strength2El.value = profile.strengths[1] || '';
      }

      if (profile.weaknesses && profile.weaknesses.length > 0) {
        const weakness1El = document.getElementById('profile-weakness1');
        const weakness2El = document.getElementById('profile-weakness2');
        if (weakness1El) weakness1El.value = profile.weaknesses[0] || '';
        if (weakness2El) weakness2El.value = profile.weaknesses[1] || '';
      }

      // Populate other profile fields
      const availabilityEl = document.getElementById('profile-availability');
      const modeEl = document.getElementById('profile-mode');
      const goalEl = document.getElementById('profile-goal');
      const frequencyEl = document.getElementById('profile-frequency');
      const timezoneEl = document.getElementById('profile-timezone');

      if (availabilityEl && profile.availability) availabilityEl.value = profile.availability;
      if (modeEl && profile.preferredMode) modeEl.value = profile.preferredMode;
      if (goalEl && profile.primaryGoal) goalEl.value = profile.primaryGoal;
      if (frequencyEl && profile.preferredFrequency) frequencyEl.value = profile.preferredFrequency;
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
      
      // Hide other sections and show profile section prominently
      window.UI.hide('match-section');
      window.UI.hide('prequiz-section');
      window.UI.hide('session-section');
      window.UI.hide('postquiz-section');
      window.UI.hide('ai-section');
      window.UI.show('profile-section');
    }
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
}

// Scroll to matching section without hiding other sections
function scrollToMatching() {
  const matchSection = document.getElementById('match-section');
  if (matchSection) {
    matchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Export functions for inline onclick handlers
window.showNextMatch = showNextMatch;
window.showSection = showSection;
window.scrollToMatching = scrollToMatching;
window.startSession = startSession;
window.endSession = endSession;

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
 * Send a match request to another user
 */
async function sendMatchRequest(match) {
  try {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    const userKey = currentUser.uid;
    const userName = currentUser.displayName || currentUser.email;
    
    // Get partner's UID
    const partnerKey = match.user.uid;
    if (!partnerKey) {
      window.UI.showToast('Cannot send request - partner UID not found', 'error');
      return;
    }

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
    document.getElementById('match-partner-name').textContent = match.user.name || match.user.username;
    
    window.UI.showToast('Match request sent! Waiting for response...', 'success');
    
    // Listen for acceptance
    listenForMatchAcceptance(userKey, match);
  } catch (error) {
    console.error('Error sending match request:', error);
    window.UI.showToast('Failed to send match request', 'error');
  }
}

/**
 * Listen for match acceptance
 */
function listenForMatchAcceptance(userKey, match) {
  const sessionRef = firebase.database().ref(`sessions/${userKey}`);
  sessionRef.on('value', (snapshot) => {
    const session = snapshot.val();
    if (session && session.status === 'accepted') {
      // Match was accepted!
      window.UI.hide('session-waiting');
      window.UI.show('session-ready');
      document.getElementById('session-partner-name').textContent = match.user.name || match.user.username;
      
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

    // Generate a unique Google Meet link (using a simple UUID-based room ID)
    const meetingRoomId = generateMeetingId();
    const meetLink = `https://meet.google.com/${meetingRoomId}`;
    
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
    
    window.UI.showToast('Match accepted! You can now start your meeting.', 'success');
    
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

    // Update session to show meeting started
    await sessionRef.update({ meetingStarted: true });
    
    // Show the meeting link
    const linkContainer = document.getElementById('meeting-link-container');
    const linkElement = document.getElementById('meeting-link');
    
    linkElement.href = session.meetLink;
    linkElement.textContent = session.meetLink;
    
    window.UI.show('meeting-link-container');
    
    // Notify the other user
    const partnerKey = session.user1 === userKey ? session.user2 : session.user1;
    await firebase.database().ref(`notifications/${partnerKey}`).set({
      type: 'meeting-ready',
      message: 'Your study buddy has started the meeting!',
      meetLink: session.meetLink,
      timestamp: Date.now()
    });
    
    window.UI.showToast('Meeting link generated! Opening in new tab...', 'success');
    
    // Open the meeting in a new tab
    setTimeout(() => {
      window.open(session.meetLink, '_blank');
    }, 1000);
    
  } catch (error) {
    console.error('Error starting meeting:', error);
    window.UI.showToast('Failed to start meeting', 'error');
  }
}

/**
 * Generate a random meeting ID for Google Meet
 */
function generateMeetingId() {
  // Google Meet uses format like: abc-defg-hij
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part1 = Array.from({length: 3}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part3 = Array.from({length: 3}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}-${part2}-${part3}`;
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
 * Initialize rating slider with emoji feedback
 */
function initRatingSlider() {
  const slider = document.getElementById('match-relevance');
  const display = document.getElementById('relevance-display');
  const emojis = document.querySelectorAll('.slider-emoji');
  
  if (!slider || !display) return;
  
  function updateSlider(value) {
    display.textContent = value;
    
    // Update emoji highlighting
    emojis.forEach((emoji, index) => {
      const emojiValue = index + 1;
      if (emojiValue === parseInt(value)) {
        emoji.classList.add('active');
      } else {
        emoji.classList.remove('active');
      }
    });
  }
  
  // Initialize on page load
  updateSlider(slider.value);
  
  // Update on slider change (both 'input' and 'change' for live updates)
  slider.addEventListener('input', (e) => {
    updateSlider(e.target.value);
  });
  
  slider.addEventListener('change', (e) => {
    updateSlider(e.target.value);
  });
  
  // Allow clicking emojis to set value
  emojis.forEach((emoji, index) => {
    emoji.addEventListener('click', () => {
      const value = index + 1;
      slider.value = value;
      updateSlider(value);
    });
  });
}

// Initialize slider when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRatingSlider);
} else {
  initRatingSlider();
}
