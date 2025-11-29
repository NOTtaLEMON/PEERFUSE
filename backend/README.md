# PeerFuse Backend

Flask backend server for handling Gemini AI requests securely.

## 🔐 Security Features

- ✅ API key stored in `.env` file (never committed to git)
- ✅ Environment variables loaded via `python-dotenv`
- ✅ CORS enabled for frontend requests
- ✅ No API keys exposed to frontend
- ✅ Comprehensive error handling with logging
- ✅ `.env` file in `.gitignore`

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- A Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This will install:
- `flask` - Web framework
- `flask-cors` - CORS handling
- `google-generativeai` - Gemini AI SDK
- `python-dotenv` - Environment variable management

### 2. Configure API Key

**Step 1:** Copy the example environment file:
```bash
cp .env.example .env
```

**Step 2:** Edit `.env` and add your Gemini API key:
```env
GOOGLE_API_KEY=your_actual_api_key_here
```

**⚠️ IMPORTANT:** Never commit the `.env` file to git! It's already in `.gitignore`.

### 3. Run the Server

```bash
python app.py
```

The server will start on `http://localhost:5000`

You should see:
```
==================================================
🚀 PeerFuse Backend Server
==================================================
✅ Gemini API configured
✅ Model: gemini-2.5-flash
🌐 Server: http://127.0.0.1:5000
📝 Endpoints: /health, /generate-notes, /generate-flashcards, /generate-quiz
==================================================
```

## 📡 API Endpoints

### Health Check
- **GET** `/health`
- Returns: `{"status": "ok", "message": "PeerFuse Backend is running"}`

### List Available Models
- **GET** `/list-models`
- Returns: List of available Gemini models

### Generate Notes
- **POST** `/generate-notes`
- Body: `{"topic": "Integration"}`
- Returns: `{"success": true, "topic": "Integration", "content": "..."}`

### Generate Flashcards
- **POST** `/generate-flashcards`
- Body: `{"topic": "Python Functions"}`
- Returns: `{"success": true, "topic": "Python Functions", "content": "..."}`

### Generate Quiz
- **POST** `/generate-quiz`
- Body: `{"topic": "Data Structures"}`
- Returns: `{"success": true, "topic": "Data Structures", "content": "..."}`

### Generate Match Explanation
- **POST** `/generate-match-explanation`
- Body: `{"userA": {...}, "userB": {...}, "matchScore": 85, "scoreBreakdown": {...}}`
- Returns: `{"success": true, "content": "..."}`

### Generate Pre-Session Quiz
- **POST** `/generate-presession-quiz`
- Body: `{"strengths": ["Math", "Physics"], "weaknesses": ["English", "History"]}`
- Returns: `{"success": true, "content": "..."}`

## 🔒 Security Best Practices

### If You Accidentally Committed Your API Key

**1. Invalidate the exposed key:**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Delete the exposed API key
- Generate a new one

**2. Remove from Git history:**
```bash
# Remove the file from Git cache
git rm --cached backend/.env

# Commit the removal
git commit -m "Remove exposed API key"

# Push to remote
git push
```

**3. Add the new key to `.env` (locally only)**

### Environment Variable Naming

The backend accepts both variable names for flexibility:
- `GOOGLE_API_KEY` (recommended, matches Google's SDK conventions)
- `GEMINI_API_KEY` (backwards compatibility)

## 🛠️ Development

### Debug Mode
The server runs in debug mode by default. For production deployment:

```python
app.run(debug=False, host='0.0.0.0', port=5000)
```

### Error Logging
All errors are logged with full tracebacks to help with debugging:
```python
try:
    # API call
except Exception as e:
    traceback.print_exc()  # Prints full error details
```

### CORS Configuration
Currently allows all origins. For production, restrict to your domain:
```python
CORS(app, origins=["https://yourdomain.com"])
```

## 📝 Testing the API

Using curl:
```bash
# Health check
curl http://localhost:5000/health

# Generate notes
curl -X POST http://localhost:5000/generate-notes \
  -H "Content-Type: application/json" \
  -d '{"topic": "Machine Learning"}'
```

Using the frontend:
1. Start the backend server (`python app.py`)
2. Open `index.html` in your browser
3. Use the AI Tools section

## ❓ Troubleshooting

### "API key not found" Error
- Ensure `.env` file exists in the `backend/` directory
- Check that `GOOGLE_API_KEY` is set in `.env`
- Verify no extra spaces around the key

### CORS Errors
- Make sure `flask-cors` is installed
- Check that the frontend is making requests to `http://localhost:5000`

### Import Errors
- Run `pip install -r requirements.txt`
- Ensure you're in the correct virtual environment

## 📄 License

Part of the PeerFuse project - a peer learning platform powered by AI.

