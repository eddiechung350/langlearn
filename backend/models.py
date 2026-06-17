from datetime import datetime, date, timedelta
import sqlite3
from contextlib import contextmanager

DATABASE_PATH = '/opt/data/langlearn.db'

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    yield conn
    conn.commit()
    conn.close()

# ─── Schema ───────────────────────────────────────────────────────────────────

def init_db():
    with get_db() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            xp INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            last_login_date TEXT,
            daily_goal TEXT DEFAULT 'standard',
            preferred_language TEXT DEFAULT 'ja',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            phrase_id TEXT NOT NULL,
            language TEXT DEFAULT 'ja',
            rating INTEGER DEFAULT 0,
            ease_factor REAL DEFAULT 2.5,
            interval_days INTEGER DEFAULT 1,
            next_review_date TEXT,
            last_reviewed TEXT,
            times_reviewed INTEGER DEFAULT 0,
            times_correct INTEGER DEFAULT 0,
            best_score INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, phrase_id, language)
        );

        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            achievement_id TEXT NOT NULL,
            earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, achievement_id)
        );

        CREATE TABLE IF NOT EXISTS daily_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            sentences_completed INTEGER DEFAULT 0,
            xp_earned INTEGER DEFAULT 0,
            streak_earned INTEGER DEFAULT 0,
            time_spent_minutes INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, date)
        );

        CREATE TABLE IF NOT EXISTS language_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            language TEXT NOT NULL,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            phrases_mastered INTEGER DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            last_study_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, language)
        );
        """)

# ─── User ─────────────────────────────────────────────────────────────────────

def create_user(username, password_hash):
    with get_db() as db:
        cur = db.execute(
            "INSERT INTO users (username, name, password_hash) VALUES (?, ?, ?)",
            (username, username, password_hash)
        )
        user_id = cur.lastrowid
        # init language_progress for all 3 languages
        for lang in ['ja', 'fr', 'it']:
            db.execute(
                "INSERT INTO language_progress (user_id, language) VALUES (?, ?)",
                (user_id, lang)
            )
        return user_id

def get_user_by_username(username):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        return dict(row) if row else None

def get_user_by_id(user_id):
    with get_db() as db:
        row = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None

def update_user_streak(user_id):
    """Called daily. Returns True if streak increased."""
    today = date.today().isoformat()
    user = get_user_by_id(user_id)
    if not user:
        return False
    last = user.get('last_login_date')
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    if last == today:
        return False  # already logged today

    if last == yesterday:
        # continue streak
        new_streak = user['streak'] + 1
    else:
        # reset streak
        new_streak = 1

    with get_db() as db:
        db.execute(
            "UPDATE users SET streak = ?, last_login_date = ? WHERE id = ?",
            (new_streak, today, user_id)
        )
    return True

def update_user_xp(user_id, xp_delta):
    with get_db() as db:
        db.execute("UPDATE users SET xp = xp + ? WHERE id = ?", (xp_delta, user_id))
        # recalc level
        row = db.execute("SELECT xp FROM users WHERE id = ?", (user_id,)).fetchone()
        xp = row['xp']
        level = calculate_level(xp)
        db.execute("UPDATE users SET xp = ? WHERE id = ?", (xp, user_id))

def calculate_level(xp):
    if xp >= 1800: return 8
    if xp >= 1200: return 7
    if xp >= 800: return 6
    if xp >= 500: return 5
    if xp >= 300: return 4
    if xp >= 150: return 3
    if xp >= 50: return 2
    return 1

def calculate_level_name(level):
    names = {1:"初心",2:"見習",3:"入門",4:"旅客",5:"遊人",6:"熟手",7:"達人",8:"精通"}
    return names.get(level, "初心")

# ─── Progress ──────────────────────────────────────────────────────────────────

def save_phrase_progress(user_id, phrase_id, language, score, rating):
    """
    rating: 0-4 (SM-2 scale)
    Returns XP earned
    """
    with get_db() as db:
        existing = db.execute(
            "SELECT * FROM user_progress WHERE user_id=? AND phrase_id=? AND language=?",
            (user_id, phrase_id, language)
        ).fetchone()

        ease = 2.5
        interval = 1
        times_reviewed = 0
        times_correct = 0
        best_score = 0

        if existing:
            d = dict(existing)
            ease = d['ease_factor']
            times_reviewed = d['times_reviewed']
            times_correct = d['times_correct']
            best_score = d['best_score']

            # SM-2 recalc
            if rating >= 3:
                if d['times_correct'] == 0:
                    interval = 1
                elif d['times_correct'] == 1:
                    interval = 6
                else:
                    interval = int(d['interval_days'] * ease)
                times_correct += 1
            else:
                interval = 1

            ease = max(1.3, ease + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)))
            times_reviewed += 1
            best_score = max(best_score, score)
        else:
            times_reviewed = 1
            times_correct = 1 if rating >= 3 else 0
            best_score = score
            interval = 1 if rating < 3 else 1

        next_review = (date.today() + timedelta(days=interval)).isoformat()

        if existing:
            db.execute("""
                UPDATE user_progress SET
                    rating=?, ease_factor=?, interval_days=?, next_review_date=?,
                    last_reviewed=?, times_reviewed=?, times_correct=?, best_score=?
                WHERE user_id=? AND phrase_id=? AND language=?
            """, (rating, ease, interval, next_review, date.today().isoformat(),
                  times_reviewed, times_correct, best_score, user_id, phrase_id, language))
        else:
            db.execute("""
                INSERT INTO user_progress
                (user_id, phrase_id, language, rating, ease_factor, interval_days,
                 next_review_date, last_reviewed, times_reviewed, times_correct, best_score)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)
            """, (user_id, phrase_id, language, rating, ease, interval,
                  next_review, date.today().isoformat(), times_reviewed, times_correct, best_score))

    # XP calculation
    xp_earned = 10  # base
    if score >= 90:
        xp_earned += 5  # bonus for high score
    if rating >= 3:
        xp_earned += 2

    update_user_xp(user_id, xp_earned)

    # Update daily stats
    today = date.today().isoformat()
    with get_db() as db:
        existing_stat = db.execute(
            "SELECT * FROM daily_stats WHERE user_id=? AND date=?",
            (user_id, today)
        ).fetchone()
        if existing_stat:
            db.execute("""
                UPDATE daily_stats SET
                    sentences_completed = sentences_completed + 1,
                    xp_earned = xp_earned + ?,
                    streak_earned = ?
                WHERE user_id=? AND date=?
            """, (xp_earned, 1 if rating >= 3 else 0, user_id, today))
        else:
            db.execute("""
                INSERT INTO daily_stats (user_id, date, sentences_completed, xp_earned, streak_earned)
                VALUES (?, ?, 1, ?, ?)
            """, (user_id, today, xp_earned, 1 if rating >= 3 else 0))

    return xp_earned

def get_user_progress(user_id, language):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM user_progress WHERE user_id=? AND language=?",
            (user_id, language)
        ).fetchall()
        return {dict(r)['phrase_id']: dict(r) for r in rows}

def get_reviews_due(user_id, language, limit=10):
    with get_db() as db:
        today = date.today().isoformat()
        rows = db.execute("""
            SELECT * FROM user_progress
            WHERE user_id=? AND language=? AND next_review_date <= ?
            ORDER BY next_review_date ASC
            LIMIT ?
        """, (user_id, language, today, limit)).fetchall()
        return [dict(r) for r in rows]

def get_user_stats(user_id):
    with get_db() as db:
        user = db.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not user:
            return None
        user = dict(user)

        # total phrases completed (rating >= 3)
        completed = db.execute("""
            SELECT COUNT(*) as cnt FROM user_progress
            WHERE user_id=? AND times_correct >= 1
        """, (user_id,)).fetchone()['cnt']

        # total phrases learned (any interaction)
        learned = db.execute("""
            SELECT COUNT(*) as cnt FROM user_progress
            WHERE user_id=?
        """, (user_id,)).fetchone()['cnt']

        # total XP
        total_xp = db.execute("""
            SELECT SUM(xp_earned) as total FROM daily_stats WHERE user_id=?
        """, (user_id,)).fetchone()['total'] or 0

        # streak
        streak = user['streak']
        level = calculate_level(user['xp'])
        level_name = calculate_level_name(level)

        return {
            'xp': user['xp'],
            'level': level,
            'level_name': level_name,
            'streak': streak,
            'phrases_completed': completed,
            'phrases_learned': learned,
            'total_xp_earned': total_xp
        }

def get_achievements(user_id):
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM achievements WHERE user_id=?", (user_id,)
        ).fetchall()
        return [dict(r)['achievement_id'] for r in rows]

def award_achievement(user_id, achievement_id):
    with get_db() as db:
        try:
            db.execute(
                "INSERT INTO achievements (user_id, achievement_id) VALUES (?, ?)",
                (user_id, achievement_id)
            )
            return True
        except:
            return False  # already exists

def get_language_progress(user_id, language):
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM language_progress WHERE user_id=? AND language=?",
            (user_id, language)
        ).fetchone()
        return dict(row) if row else None

def update_language_progress(user_id, language, xp_delta):
    today = date.today().isoformat()
    with get_db() as db:
        lp = db.execute(
            "SELECT * FROM language_progress WHERE user_id=? AND language=?",
            (user_id, language)
        ).fetchone()
        if not lp:
            db.execute(
                "INSERT INTO language_progress (user_id, language, xp, streak_days, last_study_date) VALUES (?,?,?,?,?)",
                (user_id, language, xp_delta, 1, today)
            )
        else:
            lp = dict(lp)
            new_streak = lp['streak_days']
            if lp['last_study_date'] != today:
                yesterday = (date.today() - timedelta(days=1)).isoformat()
                if lp['last_study_date'] == yesterday:
                    new_streak = lp['streak_days'] + 1
                else:
                    new_streak = 1
            db.execute("""
                UPDATE language_progress SET
                    xp = xp + ?,
                    streak_days = ?,
                    last_study_date = ?
                WHERE user_id=? AND language=?
            """, (xp_delta, new_streak, today, user_id, language))

            # update phrases_mastered count
            mastered = db.execute("""
                SELECT COUNT(*) as cnt FROM user_progress
                WHERE user_id=? AND language=? AND times_correct >= 1
            """, (user_id, language)).fetchone()['cnt']
            db.execute("""
                UPDATE language_progress SET phrases_mastered=? WHERE user_id=? AND language=?
            """, (mastered, user_id, language))
