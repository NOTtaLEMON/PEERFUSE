"""
PeerFuse Backend API
Flask server to handle Gemini AI requests securely
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)

# Use the latest Gemini 2.5 Flash model
model = genai.GenerativeModel('models/gemini-2.5-flash')


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
    return jsonify({'status': 'ok', 'message': 'PeerFuse Backend is running'})


@app.route('/list-models', methods=['GET'])
def list_models():
    """List all available Gemini models"""
    try:
        models = genai.list_models()
        model_names = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
        return jsonify({"models": model_names})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/generate-notes', methods=['POST'])
@app.route('/generate-flashcards', methods=['POST'])
@app.route('/generate-quiz', methods=['POST'])
def generate_content():
    """Universal content generation endpoint"""
    try:
        data = request.get_json()
        topic = data.get('topic', '').strip()
        
        if not topic:
            return jsonify({'error': 'Topic is required'}), 400
        
        # Extract content type from endpoint path
        endpoint = request.path.split('/')[-1].replace('generate-', '')
        prompt = generate_prompt(endpoint, topic)
        
        # Generate content using Gemini
        response = model.generate_content(prompt)
        
        return jsonify({
            'success': True,
            'topic': topic,
            'content': response.text
        })
        
    except Exception as e:
        print(f"Error generating content: {str(e)}")
        return jsonify({'error': f'Failed to generate content: {str(e)}'}), 500


@app.route('/generate-match-explanation', methods=['POST'])
def generate_match_explanation():
    """Generate explanation for why two users match"""
    try:
        data = request.get_json()
        user_a = data.get('userA', {})
        user_b = data.get('userB', {})
        match_score = data.get('matchScore', 0)
        breakdown = data.get('scoreBreakdown', {})
        
        if not user_a or not user_b:
            return jsonify({'error': 'Both users are required'}), 400
        
        a_name = user_a.get('name', 'Student A')
        b_name = user_b.get('name', 'Student B')
        a_strengths = ', '.join(user_a.get('strengths', [])) or 'None specified'
        a_weaknesses = ', '.join(user_a.get('weaknesses', [])) or 'None specified'
        b_strengths = ', '.join(user_b.get('strengths', [])) or 'None specified'
        b_weaknesses = ', '.join(user_b.get('weaknesses', [])) or 'None specified'
        
        # Build breakdown text
        reasons_text = '\n'.join(breakdown.get('reasons', [])) if breakdown else 'No detailed breakdown available'
        
        prompt = f"""You are a peer learning matchmaking assistant. Explain why these two students are matched together.

**Match Score: {match_score} points**

**{a_name}:**
- Strengths: {a_strengths}
- Weaknesses: {a_weaknesses}
- Availability: {user_a.get('availability', 'Not specified')}
- Primary Goal: {user_a.get('primaryGoal', 'Not specified')}
- Preferred Mode: {user_a.get('preferredMode', 'Not specified')}

**{b_name}:**
- Strengths: {b_strengths}
- Weaknesses: {b_weaknesses}
- Availability: {user_b.get('availability', 'Not specified')}
- Primary Goal: {user_b.get('primaryGoal', 'Not specified')}
- Preferred Mode: {user_b.get('preferredMode', 'Not specified')}

**Score Breakdown:**
{reasons_text}

Write a friendly, encouraging explanation (2-3 paragraphs) about:
1. How their complementary skills create a beneficial learning partnership
2. What specific topics each person can help the other with
3. Why this match score indicates they'll work well together

Keep it concise and motivating!"""
        
        response = model.generate_content(prompt)
        
        return jsonify({
            'success': True,
            'content': response.text
        })
        
    except Exception as e:
        print(f"Error generating match explanation: {str(e)}")
        return jsonify({'error': f'Failed to generate explanation: {str(e)}'}), 500


@app.route('/generate-presession-quiz', methods=['POST'])
def generate_presession_quiz():
    """Generate personalized pre-session quiz based on user's strengths and weaknesses"""
    try:
        data = request.get_json()
        strengths = data.get('strengths', [])
        weaknesses = data.get('weaknesses', [])
        
        if not strengths and not weaknesses:
            return jsonify({'error': 'Strengths and weaknesses are required'}), 400
        
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
        
        response = model.generate_content(prompt)
        
        return jsonify({
            'success': True,
            'content': response.text
        })
        
    except Exception as e:
        print(f"Error generating pre-session quiz: {str(e)}")
        return jsonify({'error': f'Failed to generate quiz: {str(e)}'}), 500


if __name__ == '__main__':
    print("🚀 Starting PeerFuse Backend Server...")
    print("✅ Gemini API key configured")
    app.run(debug=True, host='127.0.0.1', port=5000)


