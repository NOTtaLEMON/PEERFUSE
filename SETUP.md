# PeerFuse Setup Guide

This guide will help you get PeerFuse up and running locally.

## 📋 Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- A text editor or IDE (VS Code recommended)
- (Optional) A local web server for testing
- A Firebase account (free tier works)
- A Google AI Studio account for Gemini API

## 🚀 Quick Start

### Option 1: Direct Browser Open (Simplest)

1. Download or clone the repository
2. Navigate to the `PEERFUSE` folder
3. Open `index.html` directly in your browser

**Note:** Some features may require a web server due to CORS restrictions.

### Option 2: Local Web Server (Recommended)

#### Using Python:
```bash
# Navigate to the PEERFUSE directory
cd path/to/PEERFUSE

# Python 3
python -m http.server 8000

# Then visit: http://localhost:8000
```

#### Using Node.js (with http-server):
```bash
# Install http-server globally (once)
npm install -g http-server

# Navigate to the PEERFUSE directory
cd path/to/PEERFUSE

# Start server
http-server -p 8000

# Then visit: http://localhost:8000
```

#### Using VS Code Live Server:
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

## 🔥 Firebase Configuration

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Follow the setup wizard
4. Enable **Email/Password** authentication:
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"

### Step 2: Create Realtime Database

1. Go to Realtime Database in Firebase Console
2. Click "Create Database"
3. Start in **test mode** (we'll secure it later)
4. Choose a database location

### Step 3: Get Your Config

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click the web icon (</>) to create a web app
4. Copy the `firebaseConfig` object

### Step 4: Update Config File

Open `js/config.js` and replace the `firebaseConfig` with your values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 5: Secure Your Database (Important!)

Replace your Firebase Realtime Database rules with:

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "profiles": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "matches": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "feedbacks": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "quizzes": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 🤖 Gemini AI Configuration

### Step 1: Get API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

### Step 2: Update Config File

Open `js/config.js` and update:

```javascript
const geminiConfig = {
  apiKey: "YOUR_GEMINI_API_KEY_HERE",
  model: "gemini-1.5-flash"
};
```

**⚠️ Security Warning:** Never commit API keys to public repositories!

For production, implement a backend proxy:

```javascript
// Instead of calling Gemini directly, call your backend:
async function generateNotes(topic) {
  const response = await fetch('/api/generate-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic })
  });
  return await response.json();
}
```

## 📁 Project Structure

```
PEERFUSE/
├── index.html              # Main application page
├── ai-tools.html          # AI tools page
├── style.css              # Global styles
├── README.md              # Project overview
├── SETUP.md               # This file
│
└── js/
    ├── config.js          # Firebase & Gemini configuration
    ├── auth.js            # Authentication logic
    ├── matching.js        # Matching algorithm
    ├── ui.js              # UI helpers
    ├── firebase-helpers.js # Firebase CRUD operations
    ├── app.js             # Main application logic
    └── ai-tools.js        # AI integration
```

## 🧪 Testing the App

### 1. Test Authentication

1. Open the app
2. Click "Sign Up"
3. Enter email and password
4. Set a display name
5. You should see the main interface

### 2. Test Profile Creation

1. Fill in your strengths and weaknesses
2. Click "Save Profile"
3. Check Firebase Console → Realtime Database to see your data

### 3. Test Matching

1. Add yourself to the matching pool
2. Open the app in a private/incognito window
3. Sign up as a different user
4. Add that user to the pool with complementary skills
5. Click "Find My Match"
6. You should see a match result

### 4. Test AI Tools

1. Navigate to AI Tools page
2. Enter a topic (e.g., "Calculus")
3. Click "Notes", "Flashcards", or "Quiz"
4. AI-generated content should appear

## 🐛 Troubleshooting

### Firebase Not Working

**Problem:** `Firebase not initialized` in console

**Solutions:**
- Check that Firebase SDKs are loading (check browser console)
- Verify your config in `js/config.js`
- Make sure you're using the correct Firebase SDK version
- Check that your Firebase project is active

### Authentication Errors

**Problem:** Sign up/login fails

**Solutions:**
- Ensure Email/Password auth is enabled in Firebase
- Check browser console for specific error messages
- Verify your Firebase config is correct
- Clear browser cache and try again

### AI Tools Not Working

**Problem:** `Gemini API not initialized` or generation fails

**Solutions:**
- Verify your Gemini API key is correct
- Check that the Gemini SDK is loading
- Ensure you haven't exceeded API quota
- Open browser console to see specific errors
- Try using a CDN version of the Gemini SDK instead

### Matching Not Finding Results

**Problem:** "No matches found"

**Solutions:**
- Add more users to the pool first
- Check that users have complementary skills
- Adjust your preferences to be less restrictive
- Verify that availability times match

### Styles Not Loading

**Problem:** Page looks broken or unstyled

**Solutions:**
- Check that `style.css` is in the same directory as `index.html`
- Clear browser cache
- Open browser console and check for 404 errors
- Verify file paths are correct

## 📱 Mobile Testing

1. Start a local server
2. Find your computer's local IP:
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`
3. On your phone, navigate to: `http://YOUR_IP:8000`
4. Test responsiveness and touch interactions

## 🔒 Security Checklist Before Deployment

- [ ] Move API keys to environment variables
- [ ] Set up Firebase Security Rules
- [ ] Implement rate limiting
- [ ] Use HTTPS only
- [ ] Implement backend API proxy for Gemini
- [ ] Add input validation on all forms
- [ ] Sanitize user inputs
- [ ] Add CSRF protection
- [ ] Implement proper error handling
- [ ] Add logging and monitoring

## 📚 Next Steps

1. ✅ Get the app running locally
2. ✅ Configure Firebase and Gemini
3. ✅ Test all features
4. 📖 Read the [README.md](README.md) for feature details
5. 🎨 Customize styles in `style.css`
6. 🔧 Modify matching weights in `js/config.js`
7. 🚀 Deploy to production (see DEPLOYMENT.md)

## 💡 Tips

- Use browser DevTools (F12) to debug issues
- Check the console for errors and logs
- Test in incognito mode to simulate multiple users
- Use Firebase Console to inspect database contents
- Monitor Gemini API usage to avoid quota limits

## 🆘 Getting Help

If you run into issues:

1. Check the browser console for errors
2. Review Firebase Console for authentication/database issues
3. Verify all config files are correct
4. Try clearing browser cache
5. Test in a different browser
6. Check that all files are in the correct locations

## 📝 Common Customizations

### Change Theme Colors

Edit `style.css`:

```css
:root {
  --primary: #2B6CB0;        /* Change to your color */
  --primary-dark: #2C5282;   /* Darker shade */
  --page-bg: #f0f6ff;        /* Background color */
}
```

### Adjust Matching Weights

Edit `js/config.js`:

```javascript
matchingWeights: {
  availability: 100,      // Higher = more important
  compPerMatch: 30,       // Per complementary skill pair
  preferredMode: 8,
  // ... adjust as needed
}
```

### Add More Topics

Modify the quiz generation or add predefined topics in `js/app.js`

---

**Ready to start?** Follow the Quick Start section above!
