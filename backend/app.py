"""
PeerFuse Backend API
Flask server that calls an AI model (Qwen by default) for study materials, keeping the API key server-side
Production-ready with proper error handling and logging
"""

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
import re
import requests
import os
import json
import logging
import traceback
import time
import random
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

# CORS: only the origins in ALLOWED_ORIGINS (comma-separated) may call this API from a
# browser. The default covers the local dev server; for a hosted frontend, set
# ALLOWED_ORIGINS to its address (for example https://your-site.example).
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    'ALLOWED_ORIGINS', 'http://localhost:8000,http://127.0.0.1:8000'
).split(',') if o.strip()]
CORS(app, resources={
    r"/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Request limits: reject oversized bodies (413) before they reach the AI provider
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024
MAX_TOPIC_LENGTH = 200
MAX_SKILLS = 10
MAX_SKILL_LENGTH = 100

# Debug-only routes (such as /list-models) stay off unless explicitly enabled
ENABLE_DEBUG_ROUTES = os.getenv('ENABLE_DEBUG_ROUTES', 'false').lower() == 'true'

# AI provider settings. Any OpenAI-compatible chat API works (Groq, Alibaba Model
# Studio, OpenRouter, a local server); the defaults point at Qwen on Groq.
AI_API_KEY = os.getenv('AI_API_KEY')
AI_BASE_URL = os.getenv('AI_BASE_URL', 'https://api.groq.com/openai/v1').rstrip('/')
AI_MODEL = os.getenv('AI_MODEL', 'qwen/qwen3.8-27b')
AI_MAX_TOKENS = int(os.getenv('AI_MAX_TOKENS', '4096'))
AI_TIMEOUT_SECONDS = 120
if not AI_API_KEY:
    logger.error("AI_API_KEY not found in environment variables")
    raise ValueError(
        "AI_API_KEY not found! Please set it in backend/.env (and on Render).\n"
        "For Qwen on Groq, create a key at https://console.groq.com/keys"
    )
logger.info(f"AI provider configured: model {AI_MODEL} at {AI_BASE_URL}")

# Simple in-memory cache to reduce API calls (cleared on restart)
request_cache = {}
MAX_CACHE_SIZE = 50  # Limit cache to save memory

# --- Per-user usage cap (rolling 24h window) ---------------------------------
# OFF by default so the demo runs unrestricted. To enable in production set
# USAGE_CAP_ENABLED=true, FIREBASE_DATABASE_URL, FIREBASE_SERVICE_ACCOUNT_JSON,
# install firebase-admin (see requirements.txt), and make the frontend send the
# Firebase ID token as "Authorization: Bearer <token>" (and allow that header in CORS).
#
# Capacity calculation (theoretical, for scalability discussion):
#   cap per user         = 65 requests / 24h (typical use is ~60: 2 req/min x 30 min)
#   400 active users/day = 65 x 400 = 26,000 requests/day (~18 requests/min averaged)
#   worst case, every request retried 3x (see safe_generate_content) = 78,000/day
#   The AI provider's limits apply per account, so the account's quota must cover this.
USAGE_CAP_ENABLED = os.getenv('USAGE_CAP_ENABLED', 'false').lower() == 'true'
USAGE_CAP_LIMIT = 65
USAGE_WINDOW_SECONDS = 24 * 60 * 60
_firebase_ready = False


def _apply_usage_window(timestamps, now):
    """Drop timestamps older than the window; add `now` if there is room.

    Returns (updated_timestamps, allowed, seconds_until_next_free_use).
    Timestamps are stored oldest-first, so the oldest entry is at the front.
    """
    fresh = [t for t in (timestamps or []) if now - t < USAGE_WINDOW_SECONDS]
    if len(fresh) >= USAGE_CAP_LIMIT:
        return fresh, False, int(fresh[0] + USAGE_WINDOW_SECONDS - now) + 1
    fresh.append(now)
    return fresh, True, 0


def _init_firebase():
    """Lazy Firebase Admin setup so the demo path needs no extra dependency."""
    global _firebase_ready
    if _firebase_ready:
        return
    import firebase_admin
    from firebase_admin import credentials
    cred = credentials.Certificate(json.loads(os.environ['FIREBASE_SERVICE_ACCOUNT_JSON']))
    firebase_admin.initialize_app(cred, {'databaseURL': os.environ['FIREBASE_DATABASE_URL']})
    _firebase_ready = True


def clean_skill_list(value):
    """Validate a list of skills from a request: at most MAX_SKILLS short strings.

    Returns (skills, error); error is a message for the client, or None when valid.
    """
    if value is None:
        return [], None
    if not isinstance(value, list) or len(value) > MAX_SKILLS:
        return None, f'Skills must be a list of at most {MAX_SKILLS} items'
    skills = []
    for item in value:
        if not isinstance(item, str):
            return None, 'Each skill must be text'
        text = item.strip()
        if len(text) > MAX_SKILL_LENGTH:
            return None, f'Each skill must be at most {MAX_SKILL_LENGTH} characters'
        if text:
            skills.append(text)
    return skills, None


def enforce_usage_cap():
    """Return None if the request may proceed, else a (response, status) to send back."""
    if not USAGE_CAP_ENABLED:
        return None

    token = request.headers.get('Authorization', '').removeprefix('Bearer ').strip()
    if not token:
        return jsonify({'success': False, 'error': 'Login required'}), 401
    try:
        from firebase_admin import auth, db
        _init_firebase()
        uid = auth.verify_id_token(token)['uid']
    except Exception as e:
        logger.warning(f"ID token verification failed: {str(e)}")
        return jsonify({'success': False, 'error': 'Invalid login'}), 401

    outcome = {}

    # Transaction step: prune old timestamps, add this request if there is room,
    # and return the new list to store. Records the outcome in `outcome`.
    def update(current):
        # Firebase may run this more than once if the data changed meanwhile
        timestamps, allowed, retry_after = _apply_usage_window(current, time.time())
        outcome.update(allowed=allowed, retry_after=retry_after)
        return timestamps

    db.reference(f'usage/{uid}').transaction(update)

    if not outcome['allowed']:
        return jsonify({
            'success': False,
            'error': 'Daily AI limit reached',
            'retry_after_seconds': outcome['retry_after']
        }), 429
    return None


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


class AIServiceError(Exception):
    """The AI provider answered with an HTTP error; .code holds the HTTP status."""

    # Keep the HTTP status as .code so is_retryable can decide whether to retry
    def __init__(self, code, message):
        super().__init__(f"{code} {message}")
        self.code = code


# Some Qwen hosts put the model's reasoning inside <think>...</think>; it is not
# part of the answer, so it is removed before the text is returned
THINK_BLOCK = re.compile(r'<think>.*?</think>', re.DOTALL | re.IGNORECASE)


# Send one prompt to the OpenAI-compatible chat API and return the answer text.
# Raises AIServiceError for HTTP errors, TimeoutError / ConnectionError for network
# trouble, and EmptyResponseError when the answer contains no text.
def call_ai(prompt):
    body = {
        'model': AI_MODEL,
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.7,
        'max_tokens': AI_MAX_TOKENS,
    }
    if 'groq.com' in AI_BASE_URL:
        # Qwen on Groq writes out its reasoning by default; switch that off
        body['reasoning_effort'] = 'none'

    try:
        resp = requests.post(
            f'{AI_BASE_URL}/chat/completions',
            json=body,
            headers={'Authorization': f'Bearer {AI_API_KEY}'},
            timeout=AI_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout as e:
        raise TimeoutError(f'AI request timed out: {e}') from e
    except requests.exceptions.RequestException as e:
        raise ConnectionError(f'AI request could not connect: {e}') from e

    if resp.status_code != 200:
        try:
            detail = resp.json().get('error', {})
            message = detail.get('message') if isinstance(detail, dict) else str(detail)
        except ValueError:
            message = resp.text[:300]
        raise AIServiceError(resp.status_code, message or resp.reason)

    try:
        text = resp.json()['choices'][0]['message'].get('content') or ''
    except (ValueError, KeyError, IndexError, TypeError, AttributeError):
        text = ''
    text = THINK_BLOCK.sub('', text).strip()
    if not text:
        raise EmptyResponseError('AI returned empty output')
    return text


MAX_BACKOFF_SECONDS = 8
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
RETRYABLE_TEXT_MARKERS = ('429', 'rate limit', 'resource exhausted', '503', 'unavailable', 'timed out', 'deadline')
# Billing and daily-quota errors also arrive as 429 but do not clear by waiting
NON_RETRYABLE_TEXT_MARKERS = ('credits are depleted', 'billing', 'prepayment', 'per day', 'quota exceeded for quota metric')


class EmptyResponseError(Exception):
    """The AI answered with no text; worth another try."""


def is_retryable(error):
    """Retry only problems that may pass: rate limits, server trouble, timeouts.

    Bad requests, bad API keys and missing models fail the same way every time,
    so retrying them only wastes calls.
    """
    if isinstance(error, (EmptyResponseError, TimeoutError, ConnectionError)):
        return True
    text = str(error).lower()
    # A 429 can also mean the account is out of credits or quota for the day;
    # waiting a few seconds will not fix that, so give up at once
    if any(marker in text for marker in NON_RETRYABLE_TEXT_MARKERS):
        return False
    status = getattr(error, 'code', None)
    if isinstance(status, int):
        return status in RETRYABLE_STATUS_CODES
    return any(marker in text for marker in RETRYABLE_TEXT_MARKERS)


def safe_generate_content(prompt, max_retries=3):
    """
    Generate content with the AI provider. Retries only temporary errors, waiting longer each
    time (capped, with a little randomness); successful answers are cached by a
    normalized form of the prompt.
    """
    # Normalize so prompts that differ only in case or spacing share one cache entry
    cache_key = hash(' '.join(prompt.lower().split()))
    if cache_key in request_cache:
        logger.info("Returning cached response")
        return request_cache[cache_key]

    for attempt in range(max_retries):
        try:
            text = call_ai(prompt)

            # Wrap response to keep interface consistent
            class ResponseWrapper:
                # Store the answer text as .text, the shape the routes expect
                def __init__(self, txt):
                    self.text = txt

            wrapped = ResponseWrapper(text)

            # Cache successful response
            if len(request_cache) < MAX_CACHE_SIZE:
                request_cache[cache_key] = wrapped
            else:
                request_cache.clear()
                request_cache[cache_key] = wrapped
                logger.info("Cache cleared to save memory")

            return wrapped

        except Exception as e:
            error_str = str(e)
            logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {error_str}")

            if attempt == max_retries - 1 or not is_retryable(e):
                logger.error(f"Giving up: {error_str}\n{traceback.format_exc()}")
                raise

            wait_time = min(2 ** attempt, MAX_BACKOFF_SECONDS) + random.uniform(0, 0.5)
            logger.info(f"Temporary error. Waiting {wait_time:.1f}s before retry...")
            time.sleep(wait_time)

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
            'ai_configured': AI_API_KEY is not None,
            'model': AI_MODEL
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Health check failed'}), 500


@app.route('/list-models', methods=['GET'])
def list_models():
    """List the models the configured AI provider offers (debug only)"""
    if not ENABLE_DEBUG_ROUTES:
        return jsonify({'error': 'Not found'}), 404
    try:
        resp = requests.get(f'{AI_BASE_URL}/models',
                            headers={'Authorization': f'Bearer {AI_API_KEY}'},
                            timeout=30)
        resp.raise_for_status()
        model_names = [m.get('id') for m in resp.json().get('data', [])]
        return jsonify({"models": model_names}), 200
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to list models"}), 500

@app.route('/generate-notes', methods=['POST', 'OPTIONS'])
@app.route('/generate-flashcards', methods=['POST', 'OPTIONS'])
@app.route('/generate-quiz', methods=['POST', 'OPTIONS'])
def generate_content():
    """Universal content generation endpoint with robust error handling"""
    # Handle preflight CORS requests
    if request.method == 'OPTIONS':
        return '', 200

    try:
        blocked = enforce_usage_cap()
        if blocked:
            return blocked

        data = request.get_json(silent=True)
        if not isinstance(data, dict) or not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        topic = data.get('topic', '')
        if not isinstance(topic, str):
            return jsonify({'error': 'Topic must be text'}), 400
        topic = topic.strip()

        if not topic:
            return jsonify({'error': 'Topic is required'}), 400
        if len(topic) > MAX_TOPIC_LENGTH:
            return jsonify({'error': f'Topic must be at most {MAX_TOPIC_LENGTH} characters'}), 400

        # Extract content type from endpoint path
        endpoint = request.path.split('/')[-1].replace('generate-', '')
        logger.info(f"Generating {endpoint} for topic: {topic}")
        
        prompt = generate_prompt(endpoint, topic)
        
        # Generate content using the AI provider with retry logic
        response = safe_generate_content(prompt)
        
        # Safely extract text
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        logger.info(f"Successfully generated {endpoint} for topic: {topic}")
        return jsonify({
            'success': True,
            'topic': topic,
            'content': response_text
        }), 200
        
    except HTTPException as e:
        # Client errors such as 413 (body too large) keep their own status
        return jsonify({'success': False, 'error': e.name}), e.code
    except Exception as e:
        logger.error(f"Error generating content: {str(e)}\n{traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate content'
        }), 500




@app.route('/generate-presession-quiz', methods=['POST', 'OPTIONS'])
def generate_presession_quiz():
    """Generate personalized pre-session quiz with robust error handling"""
    if request.method == 'OPTIONS':
        return '', 200

    try:
        blocked = enforce_usage_cap()
        if blocked:
            return blocked

        data = request.get_json(silent=True)
        if not isinstance(data, dict) or not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        strengths, error = clean_skill_list(data.get('strengths'))
        if error:
            return jsonify({'error': error}), 400
        weaknesses, error = clean_skill_list(data.get('weaknesses'))
        if error:
            return jsonify({'error': error}), 400

        if not strengths and not weaknesses:
            return jsonify({'error': 'Strengths and weaknesses are required'}), 400

        logger.info(
            f"Generating pre-session quiz (strengths: {len(strengths)}, weaknesses: {len(weaknesses)})"
        )

        strengths_text = ', '.join(strengths) if strengths else 'None specified'
        weaknesses_text = ', '.join(weaknesses) if weaknesses else 'None specified'

        prompt = f"""You MUST create EXACTLY 20 questions. Not 5, not 10, but TWENTY (20) questions total.

STUDENT: Strengths: {strengths_text} | Weaknesses: {weaknesses_text}

MANDATORY: Generate questions 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, and 20.

FORMAT for EVERY question:
Question [N] [STRENGTH/WEAKNESS - DIFFICULTY]
[Question text]?
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Correct Answer: [A/B/C/D]
Explanation: [Brief explanation]

Questions 1-10: STRENGTHS ({strengths_text}) - challenging
Questions 11-20: WEAKNESSES ({weaknesses_text}) - easier

GENERATE ALL 20 NOW - DO NOT STOP UNTIL YOU REACH QUESTION 20:"""

        response = safe_generate_content(prompt)
        response_text = response.text if hasattr(response, 'text') else str(response)

        logger.info("Successfully generated pre-session quiz")
        return jsonify({
            'success': True,
            'content': response_text
        }), 200

    except HTTPException as e:
        return jsonify({'success': False, 'error': e.name}), e.code
    except Exception as e:
        logger.error(
            f"Error generating pre-session quiz: {str(e)}\n{traceback.format_exc()}"
        )
        return jsonify({
            'success': False,
            'error': 'Failed to generate quiz'
        }), 500

if __name__ == '__main__':
    import sys
    
    # Configure UTF-8 output for Windows
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except Exception:
            pass
    
    logger.info("=" * 50)
    logger.info("PeerFuse Backend Server - Production Mode")
    logger.info("=" * 50)
    logger.info(f"AI API: {'Configured' if AI_API_KEY else 'NOT CONFIGURED'}")
    logger.info(f"Model: {AI_MODEL} ({AI_BASE_URL})")
    logger.info("Server: http://127.0.0.1:5000")
    logger.info("Endpoints: /health, /generate-notes, /generate-flashcards, /generate-quiz, /generate-presession-quiz")
    logger.info("=" * 50)
    logger.info("Server is running - Keep this terminal open!")
    logger.info("=" * 50)
    
    # Run with production settings
    port = int(os.environ.get('PORT', 5000))
    app.run(
        debug=False,
        host='0.0.0.0',  # Listen on all interfaces for cloud deployment
        port=port,
        use_reloader=False,
        threaded=True
    )


