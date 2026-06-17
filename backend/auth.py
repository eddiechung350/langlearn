import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, current_app

SECRET_KEY = 'langlearn-secret-key-change-in-production-2024'
ALGORITHM = 'HS256'
TOKEN_EXPIRY_HOURS = 24 * 30  # 30 days


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))


def create_token(user_id: int, user_name: str) -> str:
    """Create a JWT token for a user."""
    payload = {
        'user_id': user_id,
        'user_name': user_name,
        'exp': datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict | None:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator to require a valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Add user info to request
        request.user_id = payload['user_id']
        request.user_name = payload['user_name']
        
        return f(*args, **kwargs)
    
    return decorated
