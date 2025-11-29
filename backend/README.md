# PeerFuse Backend

Flask backend server for handling Gemini AI requests securely.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure API key:**
   - Copy `.env.example` to `.env`
   - Add your Gemini API key to `.env`:
     ```
     GEMINI_API_KEY=your_actual_api_key_here
     ```

3. **Run the server:**
   ```bash
   python app.py
   ```

   Server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/health`
- Returns: `{"status": "ok", "message": "PeerFuse Backend is running"}`

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
- Body: `{"userA": {...}, "userB": {...}}`
- Returns: `{"success": true, "content": "..."}`

## Security

- ✅ API key stored in `.env` file (not committed to git)
- ✅ CORS enabled for frontend requests
- ✅ No API keys exposed to frontend
- ✅ Error handling for all endpoints

## Development

The server runs in debug mode by default. For production, set `debug=False` in `app.py`.
