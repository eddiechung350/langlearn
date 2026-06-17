#!/usr/bin/env python3
"""
Batch TTS generator for all survival phrases.
Generates audio for Japanese, French, and Italian phrases.
"""
import subprocess
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
VOICES = {
    'ja': 'ja-JP-NanamiNeural',
    'fr': 'fr-FR-DeniseNeural',
    'it': 'it-IT-ElsaNeural'
}

def generate_audio(phrase_id, language, text, output_dir, voice, retry=2):
        output_path = output_dir / f'{phrase_id}.mp3'
        if output_path.exists():
            size = output_path.stat().st_size
            if size > 5000:  # At least 5KB
                return phrase_id, language, True, size

        for attempt in range(retry):
            try:
                result = subprocess.run([
                    sys.executable, '-m', 'edge_tts',
                    '--text', text,
                    '--voice', voice,
                    '--write-media', str(output_path)
                ], capture_output=True, timeout=30)

                if result.returncode == 0 and output_path.exists():
                    size = output_path.stat().st_size
                    if size > 5000:
                        return phrase_id, language, True, size
            except Exception as e:
                if attempt == retry - 1:
                    return phrase_id, language, False, str(e)
                time.sleep(1)
        return phrase_id, language, False, 'timeout'

def main():
    # Load content
    content_dir = BACKEND_DIR / 'content'
    languages = ['ja', 'fr', 'it']

    all_phrases = []
    for lang in languages:
        path = content_dir / f'sentences_{lang}.json'
        if not path.exists():
            print(f"Missing: {path}")
            continue
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        for day in data['days']:
            for phrase in day['phrases']:
                # Use the Japanese text field for TTS (it's the native text)
                native_text = phrase.get('japanese', '')
                all_phrases.append({
                    'phrase_id': phrase['id'],
                    'language': lang,
                    'text': native_text,
                    'voice': VOICES[lang]
                })

    print(f"Total phrases: {len(all_phrases)}")

    # Create output dirs
    audio_base = BACKEND_DIR / 'audio'
    for lang in languages:
        (audio_base / lang).mkdir(parents=True, exist_ok=True)

    # Generate with thread pool
    success = 0
    failed = []
    total = len(all_phrases)

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(
                generate_audio,
                p['phrase_id'], p['language'], p['text'],
                audio_base / p['language'],
                p['voice']
            ): p
            for p in all_phrases
        }

        for i, future in enumerate(as_completed(futures), 1):
            phrase_id, lang, ok, result = future.result()
            if ok:
                success += 1
                print(f"[{i}/{total}] ✅ {lang}: {phrase_id} ({result} bytes)")
            else:
                failed.append((phrase_id, lang, result))
                print(f"[{i}/{total}] ❌ {lang}: {phrase_id} - {result}")

    print(f"\n=== Done ===")
    print(f"Success: {success}/{total}")
    if failed:
        print(f"Failed: {len(failed)}")
        for pid, lang, err in failed:
            print(f"  {lang}: {pid} - {err}")
    else:
        print("All phrases generated! 🎉")

if __name__ == '__main__':
    main()
