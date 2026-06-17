from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

def create_app():
    app = Flask(__name__, static_folder='../frontend/dist', static_url_path='')
    CORS(app)

    # Register blueprints
    from routes.auth_routes import auth_bp
    from routes.sentences_routes import sentences_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(sentences_bp)

    @app.route('/')
    def index():
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/<path:path>')
    def static_files(path):
        file_path = os.path.join(app.static_folder, path)
        if os.path.exists(file_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    @app.route('/api/tts/<language>/<phrase_id>')
    def tts_proxy(language, phrase_id):
        """Proxy TTS audio from edge-tts service"""
        from flask import request
        audio_dir = os.path.join(os.path.dirname(__file__), 'audio', language)
        file_path = os.path.join(audio_dir, f'{phrase_id}.mp3')
        if os.path.exists(file_path):
            return send_from_directory(audio_dir, f'{phrase_id}.mp3', mimetype='audio/mpeg')
        return jsonify({'error': 'Audio not found'}), 404

    @app.route('/api/tts/generate', methods=['POST'])
    def generate_tts():
        """Generate TTS audio for a phrase"""
        import subprocess
        import json

        data = request.get_json()
        text = data.get('text', '')
        voice = data.get('voice', 'ja-JP-NanamiNeural')
        phrase_id = data.get('phrase_id', 'test')
        language = data.get('language', 'ja')

        if not text:
            return jsonify({'error': 'No text'}), 400

        audio_dir = os.path.join(os.path.dirname(__file__), 'audio', language)
        os.makedirs(audio_dir, exist_ok=True)
        output_path = os.path.join(audio_dir, f'{phrase_id}.mp3')

        try:
            result = subprocess.run([
                sys.executable, '-m', 'edge_tts',
                '--text', text,
                '--voice', voice,
                '--write-media', output_path
            ], capture_output=True, timeout=30)

            if result.returncode == 0 and os.path.exists(output_path):
                size = os.path.getsize(output_path)
                return jsonify({
                    'success': True,
                    'path': f'/api/tts/{language}/{phrase_id}',
                    'size': size
                })
            else:
                return jsonify({
                    'error': 'TTS generation failed',
                    'details': result.stderr.decode()
                }), 500
        except subprocess.TimeoutExpired:
            return jsonify({'error': 'TTS timeout'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok'})

    return app

# Init DB
from models import init_db
init_db()

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
