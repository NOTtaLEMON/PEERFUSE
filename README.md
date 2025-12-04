# PeerFuse

**PeerFuse** is a peer-linking web app that connects students based on complementary learning strengths and weaknesses. It helps users find ideal study buddies, take quizzes, exchange feedback, and access AI-powered learning tools.

## Features

- 🔐 **Firebase Authentication** - Secure email/password login
- 🧠 **Smart Profile System** - Track academic strengths and weaknesses
- 🤝 **Intelligent Buddy-Finding Algorithm** - Links you based on complementary skills
- 📊 **Pre/Post-Session Quizzes** - Measure learning progress
- ⭐ **Peer Feedback System** - Rate and review study buddies
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
├── js/
│   ├── config.js          # Firebase and API configuration
│   ├── auth.js            # Authentication logic
│   ├── matching.js        # Matching algorithm
│   ├── ui.js              # UI helpers and rendering
│   ├── firebase-helpers.js # Firebase CRUD operations
│   └── ai-tools.js        # Gemini AI integration
└── README.md              # This file
```

## How to Run Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/NOTtaLEMON/PEERFUSE.git
   cd PEERFUSE
   ```

2. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Email/Password authentication
   - Create a Realtime Database
   - Copy your config to `js/config.js`

3. **Configure Gemini AI (Optional)**
   - Get an API key from [ai.google.dev](https://ai.google.dev)
   - Add to `js/config.js`

4. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   # Or use a local server:
   python -m http.server 8000
   # Then visit http://localhost:8000
   ```

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
4. **Find Study Buddy** → Get linked with complementary peer
5. **Study Session** → Connect via video (Jitsi Meet)
6. **Post-Quiz** → Measure improvement
7. **Give Feedback** → Rate your study buddy
8. **AI Tools** → Generate study materials

## Buddy-Finding Algorithm

The algorithm uses weighted scoring across multiple dimensions:

- **Availability** (weight: 100) - Must align for scheduling
- **Complementary Skills** (weight: 30 each) - Your weakness = their strength
- **Learning Preferences** (weights: 3-8) - Goals, frequency, personality
- **Logistics** (weights: 3-4) - Time zone, session length

## Team

- **Anand** – Buddy-finding logic, frontend architecture  
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
