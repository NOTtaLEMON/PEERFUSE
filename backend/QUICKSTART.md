# 🚀 PeerFuse Backend - Quick Reference

## Setup (First Time)

```bash
# 1. Navigate to backend folder
cd backend

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file
cp .env.example .env

# 4. Add your API key to .env
# Get key from: https://aistudio.google.com/app/apikey
nano .env  # or use any text editor

# 5. Start the server
python app.py
```

## Environment Variables

**File:** `backend/.env` (create from `.env.example`)

```env
GOOGLE_API_KEY=your_actual_api_key_here
```

## Running the Server

```bash
# Development mode (with auto-reload)
python app.py

# Production mode
# Edit app.py and set debug=False, then:
python app.py
```

## Testing the API

```bash
# Health check
curl http://localhost:5000/health

# Generate notes
curl -X POST http://localhost:5000/generate-notes \
  -H "Content-Type: application/json" \
  -d '{"topic": "Python Functions"}'
```

## Common Commands

```bash
# Check if server is running
curl http://localhost:5000/health

# List installed packages
pip list

# Update dependencies
pip install --upgrade -r requirements.txt

# Check for security issues
pip check
```

## Troubleshooting

### "API key not found" Error
```bash
# Check if .env exists
ls -la .env

# Verify .env content
cat .env

# Should contain:
# GOOGLE_API_KEY=your_actual_key
```

### "Module not found" Error
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

### Port 5000 Already in Use
```bash
# Find and kill the process
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

## File Structure

```
backend/
├── app.py              # Main Flask application
├── requirements.txt    # Python dependencies
├── .env.example        # Template for environment variables
├── .env               # Your actual API keys (DO NOT COMMIT!)
├── .gitignore         # Git ignore rules
├── setup.py           # Automated setup script
└── README.md          # Detailed documentation
```

## API Endpoints

| Endpoint | Method | Body | Purpose |
|----------|--------|------|---------|
| `/health` | GET | - | Health check |
| `/list-models` | GET | - | List available models |
| `/generate-notes` | POST | `{"topic": "..."}` | Generate study notes |
| `/generate-flashcards` | POST | `{"topic": "..."}` | Generate flashcards |
| `/generate-quiz` | POST | `{"topic": "..."}` | Generate quiz |
| `/generate-match-explanation` | POST | `{"userA": {...}, "userB": {...}}` | Match explanation |
| `/generate-presession-quiz` | POST | `{"strengths": [...], "weaknesses": [...]}` | Pre-session quiz |

## Security Reminders

### ✅ DO
- Keep `.env` file locally only
- Add `.env` to `.gitignore`
- Use environment variables for secrets
- Rotate API keys regularly

### ❌ DON'T
- Commit `.env` file to Git
- Share API keys in chat/email
- Hardcode API keys in source code
- Push secrets to GitHub

## Getting Help

- **Backend Docs:** `backend/README.md`
- **Security Guide:** `SECURITY.md`
- **Full Setup:** `README.md` in root
- **Issues:** Create issue on GitHub

## Quick Links

- 🔑 [Get Gemini API Key](https://aistudio.google.com/app/apikey)
- 📖 [Google Gemini Docs](https://ai.google.dev/)
- 🔥 [Firebase Console](https://console.firebase.google.com)
- 🐍 [Flask Documentation](https://flask.palletsprojects.com/)

---

**Need more help?** See `backend/README.md` for detailed instructions.
