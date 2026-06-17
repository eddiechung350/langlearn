import bcrypt
from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os

SECRET = os.environ.get('SECRET_KEY', 'langlearn-secret-2026')
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def create_token(user_id, username):
    return jwt.encode(
        {'user_id': user_id, 'username': username},
        SECRET, algorithm='HS256'
    )

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'No token'}), 401
        try:
            payload = jwt.decode(token, SECRET, algorithms=['HS256'])
            request.user_id = payload['user_id']
            request.username = payload['username']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    from models import create_user, get_user_by_username
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    if len(username) < 3:
        return jsonify({'error': '用户名最少3个字'}), 400
    if len(password) < 6:
        return jsonify({'error': '密码最少6个字'}), 400
    if get_user_by_username(username):
        return jsonify({'error': '呢個名被人用咗'}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user_id = create_user(username, pw_hash)
    token = create_token(user_id, username)
    return jsonify({
        'token': token,
        'user': {'id': user_id, 'username': username}
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    from models import get_user_by_username
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    user = get_user_by_username(username)
    if not user:
        return jsonify({'error': '用戶名或密碼錯誤'}), 401

    if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'error': '用戶名或密碼錯誤'}), 401

    token = create_token(user['id'], username)
    return jsonify({
        'token': token,
        'user': {'id': user['id'], 'username': username}
    })

@auth_bp.route('/me', methods=['GET'])
@token_required
def me():
    from models import get_user_by_id, calculate_level, calculate_level_name
    user = get_user_by_id(request.user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'user': {
            'id': user['id'],
            'username': user['username'],
            'xp': user['xp'],
            'level': calculate_level(user['xp']),
            'level_name': calculate_level_name(calculate_level(user['xp'])),
            'streak': user['streak'],
            'preferred_language': user.get('preferred_language', 'ja'),
        }
    })
