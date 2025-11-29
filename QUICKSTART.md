# 🚀 PeerFuse - Quick Start

Get PeerFuse running in **5 minutes**!

## Step 1: Open the App (30 seconds)

```bash
# Navigate to the folder
cd path/to/PEERFUSE

# Open index.html in your browser
# OR start a simple web server:

# Python 3
python -m http.server 8000

# Then visit: http://localhost:8000
```

## Step 2: Configure Firebase (2 minutes)

1. Go to https://console.firebase.google.com/
2. Create a new project (or use existing)
3. Enable **Authentication → Email/Password**
4. Create a **Realtime Database** (test mode)
5. Copy your config from **Project Settings**
6. Paste into `js/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_KEY_HERE",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  // ... rest of your config
};
```

## Step 3: Get Gemini API Key (1 minute)

1. Visit https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Paste into `js/config.js`:

```javascript
const geminiConfig = {
  apiKey: "YOUR_GEMINI_KEY_HERE",
  model: "gemini-1.5-flash"
};
```

## Step 4: Test It! (1 minute)

1. Open the app
2. Click **"Sign Up"**
3. Enter email and password
4. Set a display name
5. Fill in strengths and weaknesses
6. Click **"Find My Match"**

## ✅ Done!

Your app is now running locally!

## 🎯 Quick Test Workflow

To test matching with yourself:

1. **Window 1:** Sign up as User A
   - Strengths: Math, Physics
   - Weaknesses: Programming
   - Availability: 2PM-6PM

2. **Incognito Window:** Sign up as User B
   - Strengths: Programming
   - Weaknesses: Math
   - Availability: 2PM-6PM

3. Click "Add Me to Pool" for both users

4. Click "Find My Match" → You should get a high score! 🎉

## 📚 Learn More

- **Full Setup Guide:** See [SETUP.md](SETUP.md)
- **Project Details:** See [README.md](README.md)
- **Summary:** See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

## 🐛 Troubleshooting

**Firebase not working?**
- Check the browser console (F12) for errors
- Verify your config keys are correct
- Make sure Email/Password auth is enabled

**AI tools not working?**
- Verify your Gemini API key
- Check browser console for errors
- Make sure the Gemini SDK loaded

**No matches found?**
- Add more users to the pool first
- Make sure availability times match
- Check that skills are complementary

## 💡 Pro Tips

- Use **browser DevTools** (F12) to debug
- Check **Firebase Console** to see your data
- Test in **incognito mode** for multiple users
- Edit matching weights in `js/config.js` to tune results

---

**Need help?** Check [SETUP.md](SETUP.md) for detailed instructions!
