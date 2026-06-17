"""
Load Japanese phrase content from JSON files into database.
Run once to seed the database.
"""

import os
import json


def load_japanese_phrases(db, Phrase):
    """Load all Japanese phrase JSON files and insert into database."""
    content_dir = os.path.join(os.path.dirname(__file__), 'content')
    
    total_count = 0
    
    for filename in sorted(os.listdir(content_dir)):
        if filename.startswith('japanese_day') and filename.endswith('.json'):
            filepath = os.path.join(content_dir, filename)
            
            with open(filepath, 'r', encoding='utf-8') as f:
                day_data = json.load(f)
            
            # Extract day number from filename (e.g. 'japanese_day3.json' -> 3)
            import re
            match = re.search(r'japanese_day(\d+)\.json', filename)
            file_day = int(match.group(1)) if match else day_data.get('day', 1)
            
            for phrase_data in day_data.get('phrases', []):
                # Check if phrase already exists
                existing = Phrase.query.get(phrase_data['id'])
                if existing:
                    continue
                
                phrase = Phrase(
                    id=phrase_data['id'],
                    language='ja',
                    lesson_day=phrase_data.get('lesson_day', file_day),
                    japanese=phrase_data['japanese'],
                    romaji=phrase_data['romaji'],
                    chinese=phrase_data['chinese'],
                    difficulty=phrase_data.get('difficulty', 1),
                    usage_context=phrase_data.get('usage_context', '')
                )
                db.session.add(phrase)
                total_count += 1
    
    db.session.commit()
    return total_count
