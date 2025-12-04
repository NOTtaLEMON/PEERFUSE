"""
PeerFuse Backend API
Flask server to handle Gemini AI requests securely
Production-ready with proper error handling and logging
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import logging
import traceback
import time
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for all origins (production-ready for public API)
CORS(app, 
     origins=["https://nottalemon.github.io", "http://localhost:8000", "http://127.0.0.1:8000"],
     methods=["GET", "POST", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=False)

# Configure Gemini AI with validation
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY not found in environment variables")
    raise ValueError(
        "GEMINI_API_KEY not found! Please set it in backend/.env file.\n"
        "Get your API key from: https://makersuite.google.com/app/apikey"
    )

try:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('models/gemini-2.5-flash')
    logger.info("Gemini API configured successfully with model: gemini-2.5-flash")
except Exception as e:
    logger.error(f"Failed to configure Gemini API: {str(e)}")
    raise


@app.route('/', methods=['GET'])
def root():
    """Root endpoint - welcome message"""
    return jsonify({
        'message': 'PeerFuse backend is live and ready!',
        'status': 'ok',
        'endpoints': {
            'health': '/health',
            'notes': '/generate-notes',
            'flashcards': '/generate-flashcards',
            'quiz': '/generate-quiz',
            'presession_quiz': '/generate-presession-quiz'
        }
    }), 200


def safe_generate_content(prompt, max_retries=3):
    """
    Safely generate content with retry logic for rate limits
    """
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            
            # Check if response has text
            if not hasattr(response, 'text') or not response.text:
                # Try to get text from candidates
                if hasattr(response, 'candidates') and response.candidates:
                    text = response.candidates[0].content.parts[0].text
                    # Create a simple object to return
                    class ResponseWrapper:
                        def __init__(self, txt):
                            self.text = txt
                    return ResponseWrapper(text)
                raise Exception("Empty response from Gemini API")
            
            return response
        except Exception as e:
            error_str = str(e)
            logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {error_str}")
            
            # Check if it's a rate limit error
            if '429' in error_str or 'rate limit' in error_str.lower():
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                    logger.info(f"Rate limited. Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                    continue
            
            # If not rate limit or last attempt, raise the error
            if attempt == max_retries - 1:
                logger.error(f"Final error: {error_str}\n{traceback.format_exc()}")
                raise
    
    raise Exception("Failed after maximum retries")


def generate_prompt(content_type, topic):
    """Generate appropriate prompt based on content type"""
    if content_type == "notes":
        return f"""Create comprehensive study notes for the topic: "{topic}"
        
Include:
- Key concepts and definitions
- Important points to remember
- Examples where applicable

Format the notes clearly with headings and bullet points."""
    elif content_type == "flashcards":
        return f"""Create 5 flashcard Q&A pairs for the topic: "{topic}"

Format each flashcard as:
Q: [question]
A: [answer]

Separate each pair with a blank line. Make questions clear and answers concise but complete."""
    elif content_type == "quiz":
        return f"""Create a quiz for the topic: "{topic}" with 3 questions at different difficulty levels.

Format as:
[EASY] Question
Answer: [answer]

[MEDIUM] Question
Answer: [answer]

[HARD] Question
Answer: [answer]

Make questions challenging but fair."""
    return f"Explain {topic}."


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        return jsonify({
            'status': 'ok',
            'message': 'PeerFuse Backend is running',
            'gemini_configured': GEMINI_API_KEY is not None
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/list-models', methods=['GET'])
def list_models():
    """List all available Gemini models"""
    try:
        logger.info("Listing available Gemini models")
        models = genai.list_models()
        model_names = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
        return jsonify({"models": model_names}), 200
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}\n{traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/generate-notes', methods=['POST', 'OPTIONS'])
@app.route('/generate-flashcards', methods=['POST', 'OPTIONS'])
@app.route('/generate-quiz', methods=['POST', 'OPTIONS'])
def generate_content():
    """Universal content generation endpoint with robust error handling"""
    # Handle preflight CORS requests
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        topic = data.get('topic', '').strip()
        
        if not topic:
            return jsonify({'error': 'Topic is required'}), 400
        
        # Extract content type from endpoint path
        endpoint = request.path.split('/')[-1].replace('generate-', '')
        logger.info(f"Generating {endpoint} for topic: {topic}")
        
        prompt = generate_prompt(endpoint, topic)
        
        # Generate content using Gemini with retry logic
        response = safe_generate_content(prompt)
        
        # Safely extract text
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        logger.info(f"Successfully generated {endpoint} for topic: {topic}")
        return jsonify({
            'success': True,
            'topic': topic,
            'content': response_text
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating content: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Failed to generate content: {str(e)}'
        }), 500




@app.route('/generate-presession-quiz', methods=['POST', 'OPTIONS'])
def generate_presession_quiz():
    """Generate personalized pre-session quiz with robust error handling"""
    # Handle preflight CORS requests
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        strengths = data.get('strengths', [])
        weaknesses = data.get('weaknesses', [])
        
        if not strengths and not weaknesses:
            return jsonify({'error': 'Strengths and weaknesses are required'}), 400
        
        logger.info(f"Generating pre-session quiz (strengths: {len(strengths)}, weaknesses: {len(weaknesses)})")
        
        strengths_text = ', '.join(strengths) if strengths else 'None specified'
        weaknesses_text = ', '.join(weaknesses) if weaknesses else 'None specified'
        
        prompt = f"""Generate a 20-question multiple choice assessment quiz for a student with the following profile:

**Strengths:** {strengths_text}
**Weaknesses:** {weaknesses_text}

Create exactly 20 multiple choice questions following these rules:

1. **Questions 1-10:** Focus on their STRENGTHS ({strengths_text})
   - Make these moderately challenging to hard (they should know this well)
   - Test deeper understanding, not just memorization
   - Mix difficulty: 3 medium, 7 hard questions

2. **Questions 11-20:** Focus on their WEAKNESSES ({weaknesses_text})
   - Make these easier to medium difficulty (they're still learning)
   - Test fundamental concepts and basics
   - Mix difficulty: 5 easy, 5 medium questions

For EACH question, provide:
- Question number (1-20)
- The question text
- 4 answer options labeled A, B, C, D
- Indicate the correct answer
- Brief explanation of why it's correct

Format each question EXACTLY like this:

**Question 1 [STRENGTH - HARD]**
Question text here?
A) Option 1
B) Option 2
C) Option 3
D) Option 4
**Correct Answer: B**
Explanation: Brief explanation here.

---

Make questions specific, practical, and relevant to each topic. Ensure variety in question types (conceptual, application, problem-solving)."""
        
        response = safe_generate_content(prompt)
        
        # Safely extract text
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        logger.info("Successfully generated pre-session quiz")
        return jsonify({
            'success': True,
            'content': response_text
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating pre-session quiz: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Failed to generate quiz: {str(e)}'
        }), 500


if __name__ == '__main__':
    import sys
    
    # Configure UTF-8 output for Windows
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except:
            pass
    
    logger.info("=" * 50)
    logger.info("PeerFuse Backend Server - Production Mode")
    logger.info("=" * 50)
    logger.info(f"Gemini API: {'Configured' if GEMINI_API_KEY else 'NOT CONFIGURED'}")
    logger.info("Model: gemini-2.5-flash")
    logger.info("Server: http://127.0.0.1:5000")
    logger.info("Endpoints: /health, /generate-notes, /generate-flashcards, /generate-quiz, /generate-presession-quiz")
    logger.info("=" * 50)
    logger.info("Server is running - Keep this terminal open!")
    logger.info("=" * 50)
    
    # Run with production settings
    app.run(
        debug=False,
        host='127.0.0.1',
        port=5000,
        use_reloader=False,
        threaded=True
    )


