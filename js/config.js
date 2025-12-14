/**
 * PeerFuse Configuration
 * 
 * SECURITY WARNING: This file contains API keys for demo purposes only.
 * For production, move these to environment variables or a backend service.
 */

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCL4_TNQlEaAXxwfHssGJJTjMDBaMeicFY",
  authDomain: "peerfuse.firebaseapp.com",
  databaseURL: "https://peerfuse-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "peerfuse",
  storageBucket: "peerfuse.firebasestorage.app",
  messagingSenderId: "988908506888",
  appId: "1:988908506888:web:318514adde43a5b327e6bd",
  measurementId: "G-YW68EEWEC9"
};

// Gemini AI Configuration
// WARNING: In production, never expose API keys client-side!
// Implement a backend proxy to handle AI requests securely.
const geminiConfig = {
  apiKey: "AIzaSyDtzP6oMeHvOyikO5nnwnuuNbL0bJn4U_Y",
  model: "gemini-1.5-pro-latest"
};

// App Configuration
const appConfig = {
  // Matching algorithm weights
  matchingWeights: {
    compPerMatch: 80,       // Complementary skill matching
    availability: 30,       // Availability overlap
    preferredMode: 15,      // Preferred study mode
    primaryGoal: 12,        // Primary academic goal
    preferredFrequency: 12, // Session frequency
    partnerPreference: 10,  // Partner type preference
    sessionLength: 10,      // Session length
    timeZone: 10,          // Timezone compatibility
    studyPersonality: 10    // Study personality
  },
  
  // UI Configuration
  ui: {
    maxMatchResults: 10,
    animationDuration: 300,
    toastDuration: 3000
  },
  
  // Feature Flags
  features: {
    aiTools: true,
    realTimeSync: true,
    googleMeet: true,
    notifications: false
  }
};

// Export configurations
window.PEERFUSE_CONFIG = {
  firebase: firebaseConfig,
  gemini: geminiConfig,
  app: appConfig
};

// Initialize Firebase when available
if (typeof firebase !== 'undefined') {
  try {
    const app = firebase.initializeApp(firebaseConfig);
    window.PEERFUSE_FIREBASE_APP = app;
    window.PEERFUSE_DB = firebase.database(app);
    window.PEERFUSE_AUTH = firebase.auth(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn('⚠️ Firebase SDK not loaded');
}
