# PeerFuse

**PeerFuse** is a peer-matching web app that connects students based on complementary learning strengths and weaknesses. It helps users find ideal study partners, take quizzes, exchange feedback, and access AI-powered learning tools.

## Features

- 🔐 **Firebase Authentication** - Secure email/password login
- 🧠 **Smart Profile System** - Track academic strengths and weaknesses
- 🤝 **Intelligent Matching Algorithm** - Pairs based on complementary skills
- 📊 **Pre/Post-Session Quizzes** - Measure learning progress
- ⭐ **Peer Feedback System** - Rate and review study partners
- 🤖 **AI Learning Tools** - Generate notes, flashcards, and quizzes via Gemini AI

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Auth + Realtime Database)
- **AI**: Google Gemini API
- **Architecture**: Modular JavaScript, component-based structure

## Project Structure

```
PEERFUSE/
├── index.html              # Main application page
├── ai-tools.html          # AI-powered study tools page
├── style.css              # Global styles and theming
├── backend/               # Flask API server (secure)
│   ├── app.py            # Main Flask application
│   ├── requirements.txt  # Python dependencies
│   ├── .env.example      # Environment variables template
│   └── README.md         # Backend documentation
├── js/
│   ├── config.js          # Firebase configuration
│   ├── auth.js            # Authentication logic
│   ├── matching.js        # Matching algorithm
│   ├── ui.js              # UI helpers and rendering
│   ├── firebase-helpers.js # Firebase CRUD operations
│   ├── app.js             # Main application logic
│   └── ai-tools.js        # AI integration (frontend)
└── README.md              # This file
```

## How to Run Locally

### 1. Clone the Repository
```bash
git clone https://github.com/NOTtaLEMON/PEERFUSE.git
cd PEERFUSE
```

### 2. Set Up the Backend (Flask + Gemini AI)

**Install Python dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

**Configure the Gemini API key:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your actual API key
# Get your key from: https://aistudio.google.com/app/apikey
```

Your `.env` file should contain:
```env
GOOGLE_API_KEY=your_actual_gemini_api_key_here
```

**Start the backend server:**
```bash
python app.py
```

The backend will start on `http://localhost:5000`

📖 **See [backend/README.md](backend/README.md) for detailed backend setup and API documentation**

### 3. Configure Firebase

- Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- Enable Email/Password authentication
- Create a Realtime Database
- Copy your Firebase config to `js/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-app.firebaseapp.com",
  databaseURL: "https://your-app.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 4. Run the Frontend

**Option A - Direct file access:**
```bash
# Simply open index.html in your browser
```

**Option B - Local server (recommended):**
```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx http-server -p 8000
```

Then visit `http://localhost:8000`

### 5. Test the Application

1. **Backend health check**: Visit `http://localhost:5000/health`
2. **Create an account** on the frontend
3. **Set up your profile** with strengths/weaknesses
4. **Try AI tools** to generate study materials
5. **Find a match** with complementary skills

## 🔐 Security & Best Practices

### ✅ What We Do Right

- **Environment Variables**: API keys stored in `.env` (not in code)
- **Git Security**: `.env` is in `.gitignore` and never committed
- **Backend Proxy**: Gemini API calls go through Flask backend (keys never exposed to frontend)
- **Error Handling**: Comprehensive error logging with tracebacks
- **CORS Protection**: Configured for secure frontend-backend communication

### ⚠️ Important Security Notes

**Never commit these files:**
- `.env` (contains API keys)
- `firebase-config.private.js` (if you create one)
- Any file with "secret", "key", or "private" in the name

**For production deployment:**
- Set `debug=False` in Flask
- Use environment variables on your hosting platform
- Implement Firebase Security Rules
- Enable rate limiting on API endpoints
- Use HTTPS for all communications

### 🔧 If You Accidentally Expose an API Key

1. **Immediately revoke the key**:
   - [Google AI Studio](https://aistudio.google.com/app/apikey) for Gemini
   - Firebase Console for Firebase keys

2. **Remove from Git history**:
   ```bash
   git rm --cached path/to/file
   git commit -m "Remove exposed API key"
   git push --force
   ```

3. **Generate a new key** and add it to `.env` (locally only)

## Security Notes

⚠️ **Important**: The current implementation includes API keys in the code for demo purposes only.

**For production deployment:**
- Move all API keys to environment variables
- Implement a backend proxy for Gemini API calls
- Set up Firebase Security Rules
- Use Firebase Admin SDK on the server side

## Usage Flow

1. **Sign Up/Login** → Create account or sign in
2. **Create Profile** → Enter strengths and weaknesses
3. **Take Pre-Quiz** → Rate current knowledge
4. **Find Match** → Get paired with complementary peer
5. **Study Session** → Connect via Google Meet
6. **Post-Quiz** → Measure improvement
7. **Give Feedback** → Rate your study partner
8. **AI Tools** → Generate study materials

## Matching Algorithm

The algorithm uses weighted scoring across multiple dimensions:

- **Availability** (weight: 100) - Must match for scheduling
- **Complementary Skills** (weight: 30 each) - Your weakness = their strength
- **Learning Preferences** (weights: 3-8) - Goals, frequency, personality
- **Logistics** (weights: 3-4) - Time zone, session length

## Team

- **Anand** – Matching logic, frontend architecture  
- **Rishabh** – Firebase integration  
- **Anushka & Shreya** – UI/UX and HTML design
- **Aravind** – AI Integration and Surveys

## Project Status

🚧 **Active Development** - This is a prototype under continuous improvement.

## Contributing

We welcome contributions! Areas for improvement:
- Enhanced mobile responsiveness
- Real-time chat functionality
- Video call integration
- Advanced analytics dashboard
- Machine learning for better matching

## License

This project is for educational purposes.
