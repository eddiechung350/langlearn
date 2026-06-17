import json
import os
from flask import Blueprint, request, jsonify
from routes.auth_routes import token_required

sentences_bp = Blueprint('sentences', __name__, url_prefix='/api')

CONTENT_DIR = '/opt/data/workspace/langlearn/backend/content'

def load_content(language):
    path = os.path.join(CONTENT_DIR, f'sentences_{language}.json')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)

@sentences_bp.route('/languages', methods=['GET'])
def get_languages():
    """List all available languages"""
    return jsonify({
        'languages': [
            {'code': 'ja', 'name': '日本語', 'name_en': 'Japanese', 'flag': '🗾'},
            {'code': 'fr', 'name': 'Français', 'name_en': 'French', 'flag': '🇫🇷'},
            {'code': 'it', 'name': 'Italiano', 'name_en': 'Italian', 'flag': '🇮🇹'},
        ]
    })

@sentences_bp.route('/<language>/content', methods=['GET'])
@token_required
def get_content(language):
    """Get all content for a language (days + phrases)"""
    content = load_content(language)
    if not content:
        return jsonify({'error': 'Language not found'}), 404
    return jsonify(content)

@sentences_bp.route('/<language>/day/<int:day>', methods=['GET'])
@token_required
def get_day(language, day):
    """Get phrases for a specific day"""
    content = load_content(language)
    if not content:
        return jsonify({'error': 'Language not found'}), 404
    for d in content['days']:
        if d['day'] == day:
            return jsonify(d)
    return jsonify({'error': 'Day not found'}), 404

@sentences_bp.route('/<language>/scenes', methods=['GET'])
@token_required
def get_scenes(language):
    """Get all scenes for a language"""
    content = load_content(language)
    if not content:
        return jsonify({'error': 'Language not found'}), 404
    scenes = [{'id': d['scene'], 'name': d['scene_name'], 'day': d['day']} for d in content['days']]
    return jsonify({'scenes': scenes})

@sentences_bp.route('/<language>/phrase/<phrase_id>', methods=['GET'])
@token_required
def get_phrase(language, phrase_id):
    """Get a specific phrase by ID"""
    content = load_content(language)
    if not content:
        return jsonify({'error': 'Language not found'}), 404
    for d in content['days']:
        for p in d['phrases']:
            if p['id'] == phrase_id:
                return jsonify(p)
    return jsonify({'error': 'Phrase not found'}), 404

@sentences_bp.route('/progress', methods=['GET'])
@token_required
def get_progress():
    """Get user's overall progress across all languages"""
    from models import get_user_stats, get_user_progress, get_achievements, get_language_progress
    user_id = request.user_id
    language = request.args.get('language', 'ja')

    stats = get_user_stats(user_id)
    progress = get_user_progress(user_id, language)
    achievements = get_achievements(user_id)
    lp = get_language_progress(user_id, language)

    return jsonify({
        'stats': stats,
        'progress': progress,
        'achievements': achievements,
        'language_progress': lp
    })

@sentences_bp.route('/review', methods=['GET'])
@token_required
def get_review_phrases():
    """Get phrases due for review (SM-2)"""
    from models import get_reviews_due, get_user_progress
    user_id = request.user_id
    language = request.args.get('language', 'ja')
    limit = int(request.args.get('limit', 10))

    due = get_reviews_due(user_id, language, limit)
    all_progress = get_user_progress(user_id, language)

    # Get phrase details
    content = load_content(language)
    if not content:
        return jsonify({'phrases': []})

    phrase_map = {}
    for d in content['days']:
        for p in d['phrases']:
            phrase_map[p['id']] = p

    result = []
    for item in due:
        pid = item['phrase_id']
        if pid in phrase_map:
            phrase = phrase_map[pid]
            phrase['user_progress'] = {
                'rating': item.get('rating', 0),
                'ease_factor': item.get('ease_factor', 2.5),
                'interval_days': item.get('interval_days', 1),
                'next_review_date': item.get('next_review_date'),
                'times_reviewed': item.get('times_reviewed', 0),
                'times_correct': item.get('times_correct', 0),
                'best_score': item.get('best_score', 0),
            }
            result.append(phrase)

    return jsonify({'phrases': result})

@sentences_bp.route('/save-result', methods=['POST'])
@token_required
def save_result():
    """Save phrase practice result with SM-2 scoring"""
    from models import save_phrase_progress, update_language_progress, award_achievement, get_user_stats
    user_id = request.user_id
    data = request.get_json()

    phrase_id = data.get('phrase_id')
    language = data.get('language', 'ja')
    score = int(data.get('score', 0))  # 0-100 from speech recognition
    rating = data.get('rating', 0)      # 0-4 SM-2 scale

    if not phrase_id:
        return jsonify({'error': 'phrase_id required'}), 400

    xp_earned = save_phrase_progress(user_id, phrase_id, language, score, rating)
    update_language_progress(user_id, language, xp_earned)

    # Check achievements
    stats = get_user_stats(user_id)

    # Achievement: First phrase
    award_achievement(user_id, 'first_phrase')

    # Achievement: 10 phrases
    if stats['phrases_learned'] >= 10:
        award_achievement(user_id, 'learned_10')

    # Achievement: 50 phrases
    if stats['phrases_learned'] >= 50:
        award_achievement(user_id, 'learned_50')

    # Achievement: 7-day streak
    if (stats.get('streak') or 0) >= 7:
        award_achievement(user_id, 'streak_7')

    # Achievement: 30-day streak
    if (stats.get('streak') or 0) >= 30:
        award_achievement(user_id, 'streak_30')

    # Achievement: XP milestones
    if stats['xp'] >= 100:
        award_achievement(user_id, 'xp_100')
    if stats['xp'] >= 500:
        award_achievement(user_id, 'xp_500')

    # Achievement: perfect score
    if score >= 95:
        award_achievement(user_id, 'perfect_score')

    return jsonify({
        'xp_earned': xp_earned,
        'stats': stats
    })

@sentences_bp.route('/achievements', methods=['GET'])
@token_required
def get_achievements_list():
    """Get all achievements (earned and unearned)"""
    from models import get_achievements, award_achievement
    user_id = request.user_id
    earned = set(get_achievements(user_id))

    ALL_ACHIEVEMENTS = [
        {'id': 'first_phrase', 'name': '起步', 'desc': '完成第一句', 'icon': '🎯', 'xp': 10},
        {'id': 'learned_10', 'name': '十句達人', 'desc': '學會10句', 'icon': '📚', 'xp': 50},
        {'id': 'learned_50', 'name': '五十句大師', 'desc': '學會50句', 'icon': '🏆', 'xp': 200},
        {'id': 'streak_7', 'name': '一週坚持', 'desc': '連續7天', 'icon': '🔥', 'xp': 100},
        {'id': 'streak_30', 'name': '一個月堅持', 'desc': '連續30天', 'icon': '💎', 'xp': 500},
        {'id': 'xp_100', 'name': '初学者', 'desc': '獲得100 XP', 'icon': '⭐', 'xp': 0},
        {'id': 'xp_500', 'name': '进阶者', 'desc': '獲得500 XP', 'icon': '🌟', 'xp': 0},
        {'id': 'perfect_score', 'name': '完美發音', 'desc': '獲得95分以上', 'icon': '👑', 'xp': 50},
    ]

    result = []
    for a in ALL_ACHIEVEMENTS:
        result.append({
            **a,
            'earned': a['id'] in earned
        })

    return jsonify({'achievements': result})

@sentences_bp.route('/daily-stats', methods=['GET'])
@token_required
def get_daily_stats():
    """Get user's daily stats (for calendar view)"""
    import sqlite3
    from models import DATABASE_PATH
    user_id = request.user_id

    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT date, sentences_completed, xp_earned, streak_earned
        FROM daily_stats
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT 30
    """, (user_id,)).fetchall()
    conn.close()

    return jsonify({
        'stats': [dict(r) for r in rows]
    })

@sentences_bp.route('/leaderboard', methods=['GET'])
@token_required
def get_leaderboard():
    """Get XP leaderboard"""
    import sqlite3
    from models import DATABASE_PATH

    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("""
        SELECT username, xp, streak FROM users
        ORDER BY xp DESC
        LIMIT 20
    """).fetchall()
    conn.close()

    return jsonify({
        'leaderboard': [dict(r) for r in rows]
    })
