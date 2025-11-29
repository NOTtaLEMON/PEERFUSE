/**
 * Authentication Module
 * Handles user authentication with Firebase Auth
 */

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential object
 */
async function signUp(email, password) {
  if (!window.PEERFUSE_AUTH) {
    throw new Error('Firebase Auth not initialized');
  }
  
  try {
    const userCredential = await window.PEERFUSE_AUTH.createUserWithEmailAndPassword(email, password);
    console.log('✅ User signed up successfully:', userCredential.user.uid);
    return userCredential;
  } catch (error) {
    console.error('❌ Sign up error:', error);
    throw error;
  }
}

/**
 * Sign in an existing user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential object
 */
async function signIn(email, password) {
  if (!window.PEERFUSE_AUTH) {
    throw new Error('Firebase Auth not initialized');
  }
  
  try {
    const userCredential = await window.PEERFUSE_AUTH.signInWithEmailAndPassword(email, password);
    console.log('✅ User signed in successfully:', userCredential.user.uid);
    return userCredential;
  } catch (error) {
    console.error('❌ Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 * @returns {Promise<boolean>} Success status
 */
async function signOut() {
  if (!window.PEERFUSE_AUTH) {
    console.warn('Firebase Auth not initialized');
    return false;
  }
  
  try {
    await window.PEERFUSE_AUTH.signOut();
    console.log('✅ User signed out successfully');
    return true;
  } catch (error) {
    console.error('❌ Sign out error:', error);
    return false;
  }
}

/**
 * Get the currently signed-in user
 * @returns {Object|null} Current user object or null
 */
function getCurrentUser() {
  if (!window.PEERFUSE_AUTH) {
    console.warn('Firebase Auth not initialized');
    return null;
  }
  
  return window.PEERFUSE_AUTH.currentUser;
}

/**
 * Listen for authentication state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Function} Unsubscribe function
 */
function onAuthStateChanged(callback) {
  if (!window.PEERFUSE_AUTH) {
    console.warn('Firebase Auth not initialized');
    return () => {};
  }
  
  return window.PEERFUSE_AUTH.onAuthStateChanged(callback);
}

/**
 * Update user display name
 * @param {string} displayName - New display name
 * @returns {Promise<boolean>} Success status
 */
async function updateDisplayName(displayName) {
  const user = getCurrentUser();
  
  if (!user) {
    console.error('No user is currently signed in');
    return false;
  }
  
  try {
    await user.updateProfile({ displayName });
    console.log('✅ Display name updated:', displayName);
    return true;
  } catch (error) {
    console.error('❌ Error updating display name:', error);
    return false;
  }
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<boolean>} Success status
 */
async function sendPasswordReset(email) {
  if (!window.PEERFUSE_AUTH) {
    throw new Error('Firebase Auth not initialized');
  }
  
  try {
    await window.PEERFUSE_AUTH.sendPasswordResetEmail(email);
    console.log('✅ Password reset email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
}

/**
 * Get or set username in localStorage
 */
const LocalStorage = {
  setCurrentUser(username) {
    try {
      localStorage.setItem('currentUser', username);
      return true;
    } catch (error) {
      console.error('Error setting localStorage:', error);
      return false;
    }
  },
  
  getCurrentUser() {
    try {
      return localStorage.getItem('currentUser');
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return null;
    }
  },
  
  removeCurrentUser() {
    try {
      localStorage.removeItem('currentUser');
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },
  
  setUserProfile(profile) {
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Error saving profile to localStorage:', error);
      return false;
    }
  },
  
  getUserProfile() {
    try {
      const profile = localStorage.getItem('userProfile');
      return profile ? JSON.parse(profile) : null;
    } catch (error) {
      console.error('Error reading profile from localStorage:', error);
      return null;
    }
  }
};

// Export functions to global scope
window.Auth = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
  updateDisplayName,
  sendPasswordReset,
  LocalStorage
};
