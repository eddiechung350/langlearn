"""
LangLearn - Language Learning API
Flask backend with SQLite, JWT auth, SM-2 spaced repetition
"""

import os
import json
import subprocess
import asyncio
from datetime import datetime, date, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from models import db, User, Phrase, UserProgress, init_db
from auth import hash_password, verify_password, create_token, token_required
from sm2 import sm2_next_review, quality_from_rating, get_phrases_due_for_review

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:////opt/data/langlearn.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'langlearn-secret-key-2024')

CORS(app)
init_db(app)

# ─── CLI: Init DB on startup (for Render deployment) ──────────────
with app.app_context():
    db.create_all()
    from load_content import load_japanese_phrases
    try:
        load_japanese_phrases(db, Phrase)
        print("Content loaded OK")
    except Exception as e:
        print(f"Content load: {e}")

# ─── Auth Routes ────────────────────────────────────────────────

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    name = data.get('name', '').strip()
    password = data.get('password', '')
    language = data.get('language', 'ja')
    
    if not name or not password:
        return jsonify({'error': 'Name and password are required'}), 400
    
    if len(password) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400
    
    # Check if user exists
    existing = User.query.filter_by(name=name).first()
    if existing:
        return jsonify({'error': 'Username already taken'}), 400
    
    # Create user
    user = User(
        name=name,
        password_hash=hash_password(password),
        language=language,
        last_active=date.today()
    )
    db.session.add(user)
    db.session.commit()
    
    token = create_token(user.id, user.name)
    
    return jsonify({
        'message': 'Account created successfully',
        'token': token,
        'user': user.to_dict()
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login an existing user."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    name = data.get('name', '').strip()
    password = data.get('password', '')
    
    if not name or not password:
        return jsonify({'error': 'Name and password are required'}), 400
    
    user = User.query.filter_by(name=name).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({'error': 'Invalid name or password'}), 401
    
    # Update streak and last active
    today = date.today()
    if user.last_active:
        if user.last_active == today - timedelta(days=1):
            user.streak += 1
        elif user.last_active != today:
            user.streak = 1
    else:
        user.streak = 1
    
    user.last_active = today
    db.session.commit()
    
    token = create_token(user.id, user.name)
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    })


# ─── User Routes ────────────────────────────────────────────────

@app.route('/api/user', methods=['GET'])
@token_required
def get_user():
    """Get current user info."""
    user = User.query.get(request.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get stats
    total_phrases = Phrase.query.filter_by(language=user.language).count()
    learned = UserProgress.query.filter_by(user_id=user.id).filter(
        UserProgress.repetitions > 0
    ).count()
    
    stats = {
        'total_phrases': total_phrases,
        'learned': learned,
        'percent': round(learned / total_phrases * 100) if total_phrases > 0 else 0
    }
    
    return jsonify({
        'user': user.to_dict(),
        'stats': stats
    })


@app.route('/api/user/settings', methods=['PUT'])
@token_required
def update_settings():
    """Update user settings (daily_goal, language)."""
    user = User.query.get(request.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    if 'daily_goal' in data:
        user.daily_goal = max(1, min(20, int(data['daily_goal'])))
    if 'language' in data:
        user.language = data['language']
    
    db.session.commit()
    
    return jsonify({'user': user.to_dict()})


# ─── Lesson Routes ──────────────────────────────────────────────

@app.route('/api/lessons', methods=['GET'])
@token_required
def get_lessons():
    """Get all lessons for user's language."""
    user = User.query.get(request.user_id)
    language = request.args.get('language', user.language)
    
    lessons = db.session.query(
        Phrase.lesson_day,
        db.func.count(Phrase.id).label('phrase_count')
    ).filter(
        Phrase.language == language
    ).group_by(Phrase.lesson_day).all()
    
    # Get progress for each day
    progress = UserProgress.query.filter_by(user_id=user.id).all()
    progress_by_day = {}
    for p in progress:
        phrase = Phrase.query.get(p.phrase_id)
        if phrase:
            day = phrase.lesson_day
            if day not in progress_by_day:
                progress_by_day[day] = {'total': 0, 'learned': 0}
            progress_by_day[day]['total'] += 1
            if p.repetitions > 0:
                progress_by_day[day]['learned'] += 1
    
    result = []
    for day, count in lessons:
        day_info = {
            'day': day,
            'phrases': count,
            'learned': progress_by_day.get(day, {}).get('learned', 0),
            'completed': progress_by_day.get(day, {}).get('total', 0) > 0 and
                        progress_by_day.get(day, {}).get('learned', 0) == count
        }
        result.append(day_info)
    
    return jsonify({'lessons': result})


@app.route('/api/lessons/<int:day>', methods=['GET'])
@token_required
def get_lesson(day):
    """Get phrases for a specific day."""
    user = User.query.get(request.user_id)
    language = request.args.get('language', user.language)
    
    phrases = Phrase.query.filter_by(
        language=language,
        lesson_day=day
    ).order_by(Phrase.id).all()
    
    # Get user's progress for these phrases
    progress = {
        p.phrase_id: p for p in
        UserProgress.query.filter_by(user_id=user.id).filter(
            UserProgress.phrase_id.in_([p.id for p in phrases])
        ).all()
    }
    
    result = []
    for phrase in phrases:
        p_data = phrase.to_dict()
        if phrase.id in progress:
            p_data['progress'] = progress[phrase.id].to_dict()
        else:
            p_data['progress'] = None
        result.append(p_data)
    
    return jsonify({
        'day': day,
        'language': language,
        'phrases': result
    })


# ─── Progress Routes ─────────────────────────────────────────────

@app.route('/api/progress', methods=['GET'])
@token_required
def get_progress():
    """Get all progress for current user."""
    progress = UserProgress.query.filter_by(user_id=request.user_id).all()
    return jsonify({'progress': [p.to_dict() for p in progress]})


@app.route('/api/progress', methods=['POST'])
@token_required
def update_progress():
    """Update progress after practicing a phrase (SM-2 rating)."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    phrase_id = data.get('phrase_id')
    rating = int(data.get('rating', 3))  # 1-4 user rating
    
    if not phrase_id:
        return jsonify({'error': 'phrase_id is required'}), 400
    
    # Get phrase
    phrase = Phrase.query.get(phrase_id)
    if not phrase:
        return jsonify({'error': 'Phrase not found'}), 404
    
    # Get or create progress
    progress = UserProgress.query.filter_by(
        user_id=request.user_id,
        phrase_id=phrase_id
    ).first()
    
    if not progress:
        progress = UserProgress(
            user_id=request.user_id,
            phrase_id=phrase_id,
            ease_factor=2.5,
            interval=0,
            repetitions=0
        )
        db.session.add(progress)
    
    # Convert user rating to SM-2 quality
    quality = quality_from_rating(rating)
    
    # Update SM-2 values
    new_ef, new_interval, new_reps = sm2_next_review(
        quality,
        progress.ease_factor,
        progress.interval,
        progress.repetitions
    )
    
    progress.ease_factor = new_ef
    progress.interval = new_interval
    progress.repetitions = new_reps
    progress.last_reviewed = datetime.utcnow()
    progress.next_review = date.today() + timedelta(days=new_interval)
    
    # Update rating history
    import json as json_lib
    history = json_lib.loads(progress.rating_history or '[]')
    history.append({'rating': rating, 'date': date.today().isoformat()})
    progress.rating_history = json_lib.dumps(history[-20:])  # Keep last 20
    
    db.session.commit()
    
    return jsonify({
        'message': 'Progress updated',
        'progress': progress.to_dict(),
        'next_review': progress.next_review.isoformat() if progress.next_review else None
    })


# ─── Review Routes ──────────────────────────────────────────────

@app.route('/api/review', methods=['GET'])
@token_required
def get_review():
    """Get phrases due for review today (SM-2 spaced repetition)."""
    user = User.query.get(request.user_id)
    limit = int(request.args.get('limit', 10))
    
    all_phrases = Phrase.query.filter_by(language=user.language).all()
    user_progress = UserProgress.query.filter_by(user_id=user.id).all()
    
    due = get_phrases_due_for_review(user_progress, all_phrases, limit)
    
    result = []
    for phrase, prog in due:
        p_data = phrase.to_dict()
        p_data['progress'] = prog.to_dict() if prog else None
        result.append(p_data)
    
    return jsonify({
        'review_count': len(result),
        'phrases': result
    })


# ─── TTS Route ─────────────────────────────────────────────────

@app.route('/api/tts', methods=['POST'])
@token_required
def generate_tts():
    """Generate TTS audio for text using Edge-TTS."""
    data = request.get_json()
    text = data.get('text', '')
    voice = data.get('voice', 'ja-JP-NanamiNeural')  # Default Japanese female
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    # Create audio directory
    audio_dir = os.path.join(os.path.dirname(__file__), 'static', 'audio')
    os.makedirs(audio_dir, exist_ok=True)
    
    # Generate filename
    filename = f"tts_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.mp3"
    filepath = os.path.join(audio_dir, filename)
    
    # Run edge-tts
    try:
        import platform
        if platform.system() == 'Windows':
            subprocess.run([
                'edge-tts',
                '--text', text,
                '--voice', voice,
                '--write-media', filepath
            ], check=True, capture_output=True)
        else:
            subprocess.run([
                'edge-tts',
                '--text', text,
                '--voice', voice,
                '--write-media', filepath
            ], check=True, capture_output=True, shell=False)
        
        audio_url = f'/static/audio/{filename}'
        return jsonify({'audio_url': audio_url, 'text': text})
    
    except Exception as e:
        return jsonify({'error': f'TTS generation failed: {str(e)}'}), 500


@app.route('/static/audio/<filename>')
def serve_audio(filename):
    """Serve generated TTS audio files."""
    audio_dir = os.path.join(os.path.dirname(__file__), 'static', 'audio')
    return send_file(os.path.join(audio_dir, filename))


# ─── Health Check ──────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'message': 'LangLearn API is running'})


# ─── Database Seeding ──────────────────────────────────────────

@app.route('/api/seed', methods=['POST'])
def seed_database():
    """Seed database with initial Japanese phrases. Run once."""
    # Check if already seeded
    if Phrase.query.first():
        return jsonify({'message': 'Database already seeded'})
    
    # Load Japanese content
    content_dir = os.path.join(os.path.dirname(__file__), 'content')
    
    # Import content loader
    from load_content import load_japanese_phrases
    count = load_japanese_phrases(db, Phrase)
    
    return jsonify({'message': f'Seeded {count} phrases'})


# ─── Error Handlers ────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
