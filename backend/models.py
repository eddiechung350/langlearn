from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    language = db.Column(db.String(10), default='ja')  # ja, fr, es, zh
    daily_goal = db.Column(db.Integer, default=5)  # phrases per day
    streak = db.Column(db.Integer, default=0)  # consecutive days
    last_active = db.Column(db.Date, nullable=True)
    
    progress = db.relationship('UserProgress', backref='user', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'language': self.language,
            'daily_goal': self.daily_goal,
            'streak': self.streak,
            'last_active': self.last_active.isoformat() if self.last_active else None
        }


class Phrase(db.Model):
    __tablename__ = 'phrases'
    
    id = db.Column(db.String(20), primary_key=True)  # e.g., "jp_001"
    language = db.Column(db.String(10), nullable=False)  # ja, fr, es
    lesson_day = db.Column(db.Integer, nullable=False)  # 1-15
    japanese = db.Column(db.String(200), nullable=False)
    romaji = db.Column(db.String(200), nullable=False)
    chinese = db.Column(db.String(200), nullable=False)
    audio_path = db.Column(db.String(500), nullable=True)
    difficulty = db.Column(db.Integer, default=1)  # 1-3
    usage_context = db.Column(db.String(500), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'language': self.language,
            'lesson_day': self.lesson_day,
            'japanese': self.japanese,
            'romaji': self.romaji,
            'chinese': self.chinese,
            'difficulty': self.difficulty,
            'usage_context': self.usage_context
        }


class UserProgress(db.Model):
    __tablename__ = 'user_progress'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    phrase_id = db.Column(db.String(20), db.ForeignKey('phrases.id'), nullable=False)
    ease_factor = db.Column(db.Float, default=2.5)  # SM-2 ease factor
    interval = db.Column(db.Integer, default=0)  # days until next review
    repetitions = db.Column(db.Integer, default=0)  # successful reps
    next_review = db.Column(db.Date, nullable=True)
    last_reviewed = db.Column(db.DateTime, nullable=True)
    rating_history = db.Column(db.Text, default='[]')  # JSON array of ratings
    
    phrase = db.relationship('Phrase', backref='progress_records')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'phrase_id': self.phrase_id,
            'ease_factor': self.ease_factor,
            'interval': self.interval,
            'repetitions': self.repetitions,
            'next_review': self.next_review.isoformat() if self.next_review else None,
            'last_reviewed': self.last_reviewed.isoformat() if self.last_reviewed else None,
            'rating_history': self.rating_history
        }


def init_db(app):
    """Initialize database with app context."""
    db.init_app(app)
    with app.app_context():
        db.create_all()
