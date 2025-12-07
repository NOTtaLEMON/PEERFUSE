/**
 * Firebase Helper Functions
 * Handles all Firebase Realtime Database operations
 */

/**
 * Save a new user to the database
 * @param {Object} user - User object to save
 * @returns {Promise<string|null>} The user's database key or null on error
 */
async function saveUser(user) {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return null;
  }
  
  try {
    const ref = window.PEERFUSE_DB.ref('users').push();
    await ref.set({
      ...user,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    console.log('✅ User saved to Firebase:', ref.key);
    return ref.key;
  } catch (error) {
    console.error('❌ Error saving user:', error);
    return null;
  }
}

/**
 * Save or update a user profile
 * @param {Object} profile - Profile object to save
 * @returns {Promise<string|null>} The profile key or null on error
 */
async function saveProfile(profile) {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return null;
  }
  
  try {
    if (!profile) return null;
    
    let key = profile.uid || profile.username || profile.email;
    if (!key) {
      console.error('No valid key found for profile');
      return null;
    }
    
    // Sanitize key for Firebase (remove invalid characters: . # $ [ ] )
    key = key.replace(/[.#$\[\]]/g, '_');
    
    const normalized = {
      ...profile,
      username: profile.username || profile.uid || profile.email,
      email: profile.email || profile.username,
      updatedAt: Date.now()
    };
    
    console.log('🔍 Saving profile with key:', key);
    console.log('🔍 Profile data:', normalized);
    
    // Get existing data to preserve quiz results and other fields
    const existingDataSnapshot = await window.PEERFUSE_DB.ref('users/' + key).once('value');
    const existingData = existingDataSnapshot.val() || {};
    
    // Merge profile data - only include defined values
    const mergedData = {
      ...existingData,
      ...normalized
    };
    
    // Remove any undefined values to prevent Firebase errors
    Object.keys(mergedData).forEach(key => {
      if (mergedData[key] === undefined) {
        delete mergedData[key];
      }
    });
    
    // Only add quiz fields if they exist and are not undefined
    if (existingData.preQuizScore !== undefined || normalized.preQuizScore !== undefined) {
      const score = existingData.preQuizScore ?? normalized.preQuizScore;
      if (score !== undefined) mergedData.preQuizScore = score;
    }
    if (existingData.preQuizCorrect !== undefined || normalized.preQuizCorrect !== undefined) {
      const correct = existingData.preQuizCorrect ?? normalized.preQuizCorrect;
      if (correct !== undefined) mergedData.preQuizCorrect = correct;
    }
    if (existingData.preQuizTotal !== undefined || normalized.preQuizTotal !== undefined) {
      const total = existingData.preQuizTotal ?? normalized.preQuizTotal;
      if (total !== undefined) mergedData.preQuizTotal = total;
    }
    if (existingData.preQuizStrengthScore !== undefined || normalized.preQuizStrengthScore !== undefined) {
      const strengthScore = existingData.preQuizStrengthScore ?? normalized.preQuizStrengthScore;
      if (strengthScore !== undefined) mergedData.preQuizStrengthScore = strengthScore;
    }
    if (existingData.preQuizWeaknessScore !== undefined || normalized.preQuizWeaknessScore !== undefined) {
      const weaknessScore = existingData.preQuizWeaknessScore ?? normalized.preQuizWeaknessScore;
      if (weaknessScore !== undefined) mergedData.preQuizWeaknessScore = weaknessScore;
    }
    if (existingData.preQuizStrugglingInStrengths !== undefined || normalized.preQuizStrugglingInStrengths !== undefined) {
      const struggling = existingData.preQuizStrugglingInStrengths ?? normalized.preQuizStrugglingInStrengths;
      if (struggling !== undefined) mergedData.preQuizStrugglingInStrengths = struggling;
    }
    if (existingData.preQuizStrugglingInWeaknesses !== undefined || normalized.preQuizStrugglingInWeaknesses !== undefined) {
      const struggling = existingData.preQuizStrugglingInWeaknesses ?? normalized.preQuizStrugglingInWeaknesses;
      if (struggling !== undefined) mergedData.preQuizStrugglingInWeaknesses = struggling;
    }
    if (existingData.preQuizTimestamp !== undefined || normalized.preQuizTimestamp !== undefined) {
      const timestamp = existingData.preQuizTimestamp ?? normalized.preQuizTimestamp;
      if (timestamp !== undefined) mergedData.preQuizTimestamp = timestamp;
    }
    
    // Save to both profiles/ and users/ paths for compatibility
    await Promise.all([
      window.PEERFUSE_DB.ref('profiles/' + key).update(normalized),
      window.PEERFUSE_DB.ref('users/' + key).update(mergedData)
    ]);
    
    console.log('✅ Profile saved to profiles/' + key);
    console.log('✅ Profile saved to users/' + key);
    return key;
  } catch (error) {
    console.error('❌ Error saving profile:', error);
    return null;
  }
}

/**
 * Load a profile by username
 * @param {string} username - Username to look up
 * @returns {Promise<Object|null>} Profile object or null
 */
async function loadProfile(username) {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return null;
  }
  
  try {
    // Sanitize username for Firebase (remove invalid characters: . # $ [ ] )
    const sanitizedUsername = username.replace(/[.#$\[\]]/g, '_');
    
    const snapshot = await window.PEERFUSE_DB.ref('profiles/' + sanitizedUsername).once('value');
    const profile = snapshot.val();
    
    if (profile) {
      console.log('✅ Profile loaded:', username);
      return profile;
    }
    
    console.log('ℹ️ No profile found for:', username);
    return null;
  } catch (error) {
    console.error('❌ Error loading profile:', error);
    return null;
  }
}

/**
 * Fetch all users from Firebase
 * @returns {Promise<Array>} Array of user objects
 */
async function fetchAllUsers() {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return [];
  }
  
  try {
    const snapshot = await window.PEERFUSE_DB.ref('users').once('value');
    const data = snapshot.val();
    
    if (!data) {
      console.log('ℹ️ No users found in database');
      return [];
    }
    
    // Convert object to array and include keys
    const users = Object.keys(data).map(key => ({
      ...data[key],
      firebaseKey: key
    }));
    
    console.log(`✅ Fetched ${users.length} users from Firebase`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return [];
  }
}

/**
 * Fetch all profiles from Firebase
 * @returns {Promise<Array>} Array of profile objects
 */
async function fetchAllProfiles() {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return [];
  }
  
  try {
    const snapshot = await window.PEERFUSE_DB.ref('profiles').once('value');
    const data = snapshot.val();
    
    if (!data) {
      console.log('ℹ️ No profiles found in database');
      return [];
    }
    
    const profiles = Object.keys(data).map(key => {
      const profile = data[key];
      
      // Transform profile to ensure it has arrays for strengths/weaknesses
      // This handles both old format (individual fields) and new format (arrays)
      let strengths = profile.strengths;
      let weaknesses = profile.weaknesses;
      
      // If strengths/weaknesses aren't arrays, they might be stored as individual fields
      if (!Array.isArray(strengths)) {
        strengths = [];
        if (profile.strength1) strengths.push(profile.strength1);
        if (profile.strength2) strengths.push(profile.strength2);
      }
      
      if (!Array.isArray(weaknesses)) {
        weaknesses = [];
        if (profile.weakness1) weaknesses.push(profile.weakness1);
        if (profile.weakness2) weaknesses.push(profile.weakness2);
      }
      
      return {
        ...profile,
        strengths: strengths.filter(s => s && s.trim()),
        weaknesses: weaknesses.filter(w => w && w.trim()),
        name: profile.name || profile.username,
        profileKey: key
      };
    });
    
    console.log(`✅ Fetched ${profiles.length} profiles from Firebase`);
    return profiles;
    
    console.log(`✅ Fetched ${profiles.length} profiles from Firebase`);
    return profiles;
  } catch (error) {
    console.error('❌ Error fetching profiles:', error);
    return [];
  }
}

/**
 * Save feedback to the database
 * @param {Object} feedback - Feedback object
 * @returns {Promise<string|null>} Feedback key or null
 */
async function saveFeedback(feedback) {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return null;
  }
  
  try {
    const ref = window.PEERFUSE_DB.ref('feedbacks').push();
    await ref.set({
      ...feedback,
      createdAt: Date.now()
    });
    console.log('✅ Feedback saved:', ref.key);
    return ref.key;
  } catch (error) {
    console.error('❌ Error saving feedback:', error);
    return null;
  }
}

/**
 * Save quiz results
 * @param {Object} quizData - Quiz data object
 * @returns {Promise<string|null>} Quiz key or null
 */
async function saveQuizResults(quizData) {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return null;
  }
  
  try {
    const ref = window.PEERFUSE_DB.ref('quizzes').push();
    await ref.set({
      ...quizData,
      createdAt: Date.now()
    });
    console.log('✅ Quiz results saved:', ref.key);
    return ref.key;
  } catch (error) {
    console.error('❌ Error saving quiz results:', error);
    return null;
  }
}

/**
 * Set current active user session
 * @param {string} username - Username
 * @returns {Promise<boolean>} Success status
 */
async function setCurrentUser(username) {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return false;
  }
  
  try {
    await window.PEERFUSE_DB.ref('sessions/current').set({
      user: username,
      timestamp: Date.now()
    });
    console.log('✅ Current user session set:', username);
    return true;
  } catch (error) {
    console.error('❌ Error setting current user:', error);
    return false;
  }
}

/**
 * Save a match to the database
 * @param {Object} matchData - Match information
 * @returns {Promise<string|null>} Match key or null
 */
async function saveMatch(matchData) {
  if (!window.PEERFUSE_DB) {
    console.warn('Firebase not initialized');
    return null;
  }
  
  try {
    const ref = window.PEERFUSE_DB.ref('matches').push();
    await ref.set({
      ...matchData,
      createdAt: Date.now(),
      status: 'active'
    });
    console.log('✅ Match saved:', ref.key);
    return ref.key;
  } catch (error) {
    console.error('❌ Error saving match:', error);
    return null;
  }
}

// Export functions to global scope
window.FirebaseHelpers = {
  saveUser,
  saveProfile,
  loadProfile,
  fetchAllUsers,
  fetchAllProfiles,
  saveFeedback,
  saveQuizResults,
  setCurrentUser,
  saveMatch
};
