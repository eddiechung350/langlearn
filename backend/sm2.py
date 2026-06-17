"""
SM-2 Spaced Repetition Algorithm
Based on the SuperMemo 2 algorithm by Piotr Wozniak.

Quality ratings:
0 - Complete blackout, no recall
1 - Incorrect response, but remembered upon seeing answer
2 - Incorrect response, but felt it was easy to recall once shown
3 - Correct response with serious difficulty
4 - Correct response after hesitation
5 - Perfect response with no hesitation
"""

def sm2_next_review(quality, ease_factor=2.5, interval=0, repetitions=0):
    """
    Calculate next review date using SM-2 algorithm.
    
    Args:
        quality: Rating 0-5 (0=forgot, 3=normal, 5=easy)
        ease_factor: Difficulty multiplier (min 1.3, default 2.5)
        interval: Days until next review
        repetitions: Number of successful repetitions
    
    Returns:
        tuple: (new_ease_factor, new_interval, new_repetitions)
    """
    if quality < 3:
        # Failed - reset
        return ease_factor, 1, 0
    
    # Successful recall
    if repetitions == 0:
        new_interval = 1
    elif repetitions == 1:
        new_interval = 6
    else:
        new_interval = round(interval * ease_factor)
    
    # Adjust ease factor
    new_ease = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    new_ease = max(1.3, new_ease)  # Minimum ease factor
    
    new_repetitions = repetitions + 1
    
    return new_ease, new_interval, new_repetitions


def get_phrases_due_for_review(progress_records, all_phrases, limit=10):
    """
    Get phrases that are due for review today.
    
    Args:
        progress_records: List of UserProgress records for user
        all_phrases: List of all Phrase records
    
    Returns:
        List of phrases due for review, ordered by priority (overdue first)
    """
    from datetime import datetime, date
    
    today = date.today()
    due_phrases = []
    
    # Build a dict of progress by phrase_id
    progress_by_phrase = {p.phrase_id: p for p in progress_records}
    
    for phrase in all_phrases:
        if phrase.id in progress_by_phrase:
            p = progress_by_phrase[phrase.id]
            if p.next_review and p.next_review <= today:
                # Calculate how overdue
                overdue_days = (today - p.next_review).days
                due_phrases.append((phrase, p, overdue_days))
        else:
            # Never reviewed - treat as new, give low priority
            due_phrases.append((phrase, None, -999))
    
    # Sort: overdue first (most overdue first), then never reviewed
    due_phrases.sort(key=lambda x: x[2] if x[2] != -999 else 9999, reverse=True)
    
    return [(p[0], p[1]) for p in due_phrases[:limit]]


def quality_from_rating(rating):
    """
    Convert user rating (1-4) to SM-2 quality (0-5).
    
    User ratings:
    1 = 忘記了 (Forgot) -> quality 0
    2 = 困難 (Difficult) -> quality 2
    3 = 正常 (Normal) -> quality 3
    4 = 容易 (Easy) -> quality 5
    """
    mapping = {1: 0, 2: 2, 3: 3, 4: 5}
    return mapping.get(rating, 3)
