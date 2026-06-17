import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

// Shadowing practice page
// Listen → Countdown → Speak → Score → Next
export default function Shadowing({ language = 'ja' }) {
  const { day } = useParams()
  const navigate = useNavigate()

  const [content, setContent] = useState(null)
  const [phrases, setPhrases] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState('listen') // listen | countdown | speak | score | done
  const [countdown, setCountdown] = useState(3)
  const [score, setScore] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [streak, setStreak] = useState(0)
  const [xpTotal, setXpTotal] = useState(0)
  const [error, setError] = useState('')

  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const countdownRef = useRef(null)
  const countdownInterval = useRef(null)

  const LANG_MAP = { ja: 'ja-JP', fr: 'fr-FR', it: 'it-IT' }

  // Load content
  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get('lang') || 'ja'
    api.get(`/${lang}/day/${day || 1}`).then(d => {
      setContent(d)
      setPhrases(d.phrases || [])
      setLoading(false)
    }).catch(() => {
      // fallback: load from API
      api.get(`/api/${lang || 'ja'}/content`).then(d => {
        const dayData = (d.days || []).find(x => x.day === parseInt(day || 1))
        if (dayData) {
          setContent(dayData)
          setPhrases(dayData.phrases || [])
        }
        setLoading(false)
      })
    })
  }, [day, language])

  // Get current phrase
  const phrase = phrases[currentIdx]

  // Play audio
  const playAudio = useCallback((url) => {
    return new Promise((resolve) => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const a = new Audio(url)
      audioRef.current = a
      a.onended = resolve
      a.onerror = resolve
      a.play().catch(resolve)
    })
  }, [])

  // Start shadowing
  const startShadow = useCallback(async () => {
    if (!phrase) return
    setPhase('listen')
    setError('')

    // Play TTS audio
    const audioUrl = `/api/tts/${phrase.language || 'ja'}/${phrase.id}`
    await playAudio(audioUrl)

    // Start countdown
    setPhase('countdown')
    setCountdown(3)
    clearInterval(countdownInterval.current)
    countdownInterval.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownInterval.current)
          setPhase('speak')
          return 0
        }
        return c - 1
      })
    }, 1000)
  }, [phrase, playAudio])

  // Speech recognition
  useEffect(() => {
    if (phase !== 'speak') return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('你的瀏覽器不支援語音識別')
      setPhase('score')
      return
    }

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.lang = LANG_MAP[phrase?.language] || 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 3

    recognition.onresult = (event) => {
      const results = Array.from(event.results[0])
      const best = results[0].transcript
      setTranscript(best)
      const simScore = similarity(phrase.romaji || '', best)
      setScore(Math.round(simScore * 100))
    }

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        setTranscript('(無語音識別結果)')
        setScore(0)
      }
    }

    recognition.onend = () => {
      if (phase === 'speak') {
        setPhase('score')
      }
    }

    try {
      recognition.start()
    } catch (e) {
      setError('無法啟動語音識別')
      setPhase('score')
    }

    return () => {
      try { recognition.stop() } catch {}
    }
  }, [phase, phrase])

  // Save result
  const saveResult = useCallback(async (finalScore) => {
    setSaving(true)
    const sm2Rating = finalScore >= 85 ? 4 : finalScore >= 70 ? 3 : finalScore >= 50 ? 2 : 1
    try {
      const res = await api.post('/api/save-result', {
        phrase_id: phrase.id,
        language: phrase.language || 'ja',
        score: finalScore,
        rating: sm2Rating
      })
      if (res.xp_earned) {
        setXpEarned(res.xp_earned)
        setXpTotal(prev => prev + res.xp_earned)
      }
      if (res.stats) {
        setStreak(res.stats.streak)
      }
    } catch (e) {
      // Silently fail
    }
    setSaving(false)
  }, [phrase])

  // Score screen
  useEffect(() => {
    if (phase === 'score' && score > 0) {
      saveResult(score)
    }
  }, [phase, score, saveResult])

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(countdownInterval.current)
      try { recognitionRef.current?.stop() } catch {}
    }
  }, [])

  // Simulate similarity (Levenshtein-based)
  function similarity(a, b) {
    if (!a || !b) return 0
    const s1 = a.toLowerCase().replace(/[^a-z]/g, '')
    const s2 = b.toLowerCase().replace(/[^a-z]/g, '')
    if (!s1 || !s2) return 0
    if (s1 === s2) return 1
    const len1 = s1.length, len2 = s2.length
    const dp = Array.from({length: len1+1}, (_, i) => [i])
    for (let j = 0; j <= len2; j++) dp[0][j] = j
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        dp[i][j] = s1[i-1] === s2[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
      }
    }
    return Math.max(0, 1 - dp[len1][len2] / Math.max(len1, len2))
  }

  const handleNext = () => {
    if (currentIdx < phrases.length - 1) {
      setCurrentIdx(i => i + 1)
      setPhase('listen')
      setScore(0)
      setTranscript('')
      setError('')
    } else {
      setPhase('done')
    }
  }

  const handleRetry = () => {
    setPhase('listen')
    setScore(0)
    setTranscript('')
    setError('')
    startShadow()
  }

  const scoreColor = score >= 85 ? '#22c55e' : score >= 70 ? '#f59e0b' : score >= 50 ? '#f97316' : '#ef4444'
  const xpColor = score >= 85 ? '🟢' : score >= 70 ? '🟡' : '🔴'

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>
  if (!phrase && phase !== 'done') return <div className="loading">無短語</div>

  // Done screen
  if (phase === 'done') {
    return (
      <div className="shadowing-done">
        <div className="done-card">
          <div className="done-icon">🎉</div>
          <h2>今日完成！</h2>
          <p>完成 {phrases.length} 個短語</p>
          <div className="done-stats">
            <div className="stat">
              <span className="stat-value">{xpTotal > 0 ? `+${xpTotal} XP` : '-'}</span>
              <span className="stat-label">經驗值</span>
            </div>
            <div className="stat">
              <span className="stat-value">{streak > 0 ? `🔥 ${streak}天` : '-'}</span>
              <span className="stat-label">連續學習</span>
            </div>
          </div>
          <button className="btn-primary" onClick={() => navigate('/')}>返回首頁</button>
        </div>
      </div>
    )
  }

  return (
    <div className="shadowing-page">
      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((currentIdx + 1) / phrases.length) * 100}%` }} />
        <span className="progress-text">{currentIdx + 1} / {phrases.length}</span>
      </div>

      {/* XP indicator */}
      {xpEarned > 0 && (
        <div className="xp-popup">+{xpEarned} XP {xpColor}</div>
      )}

      {/* Main card */}
      <div className="shadowing-card">
        {phrase && (
          <>
            {/* Native text (Japanese/French/Italian) */}
            <div className="phrase-native">
              {phrase.japanese}
            </div>

            {/* Romaji / romanization */}
            <div className="phrase-romaji">
              {phrase.romaji}
            </div>

            {/* Chinese meaning */}
            <div className="phrase-chinese">
              {phrase.chinese}
            </div>

            {/* Grammar note */}
            {phrase.grammar_note && (
              <div className="phrase-grammar">
                📝 {phrase.grammar_note}
              </div>
            )}
          </>
        )}
      </div>

      {/* Phase-specific UI */}
      <div className="shadowing-controls">
        {phase === 'listen' && (
          <button className="btn-listen" onClick={startShadow}>
            <span className="btn-icon">🔊</span>
            聽發音
          </button>
        )}

        {phase === 'countdown' && (
          <div className="countdown-display">
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-label">準備開口！</div>
          </div>
        )}

        {phase === 'speak' && (
          <div className="speak-display">
            <div className="speak-pulse">🎤</div>
            <div className="speak-label">大聲朗讀！</div>
            <div className="speak-hint">完成後會自動評分</div>
          </div>
        )}

        {phase === 'score' && (
          <div className="score-display">
            <div className="score-circle" style={{ borderColor: scoreColor }}>
              <div className="score-value" style={{ color: scoreColor }}>{score}%</div>
            </div>

            {transcript && (
              <div className="transcript-box">
                <div className="transcript-label">你說的：</div>
                <div className="transcript-text">{transcript}</div>
              </div>
            )}

            {error && (
              <div className="error-hint">{error}</div>
            )}

            {saving && <div className="saving">儲存中...</div>}

            <div className="score-buttons">
              <button className="btn-retry" onClick={handleRetry}>🔄 再讀一次</button>
              <button className="btn-next" onClick={handleNext}>
                {currentIdx < phrases.length - 1 ? '下一句 →' : '完成 ✓'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Native response example */}
      {phrase?.native_response && (
        <div className="native-response">
          <div className="nr-label">👂 你可能聽到：</div>
          <div className="nr-text">{phrase.native_response.japanese}</div>
          <div className="nr-romaji">{phrase.native_response.romaji}</div>
        </div>
      )}

      <style>{`
        .shadowing-page { max-width: 640px; margin: 0 auto; padding: 16px; }
        .progress-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .progress-fill { height: 6px; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 3px; transition: width 0.3s; }
        .progress-text { font-size: 13px; color: #888; white-space: nowrap; }
        .shadowing-card { background: #fff; border-radius: 20px; padding: 32px 24px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); margin-bottom: 24px; }
        .phrase-native { font-size: 28px; font-weight: 700; color: #1e1e2e; margin-bottom: 12px; line-height: 1.4; }
        .phrase-romaji { font-size: 16px; color: #6b7280; margin-bottom: 8px; font-style: italic; }
        .phrase-chinese { font-size: 14px; color: #9ca3af; margin-bottom: 12px; }
        .phrase-grammar { font-size: 13px; color: #a78bfa; background: #f5f3ff; padding: 8px 16px; border-radius: 12px; display: inline-block; }
        .shadowing-controls { text-align: center; margin-bottom: 24px; }
        .btn-listen { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 50px; padding: 18px 40px; font-size: 18px; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; transition: transform 0.2s, box-shadow 0.2s; }
        .btn-listen:hover { transform: scale(1.05); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
        .btn-icon { font-size: 22px; }
        .countdown-display { text-align: center; }
        .countdown-number { font-size: 96px; font-weight: 800; color: #6366f1; animation: pulse 1s infinite; }
        .countdown-label { font-size: 20px; color: #6b7280; margin-top: 8px; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        .speak-display { text-align: center; }
        .speak-pulse { font-size: 64px; animation: bounce 1s infinite; }
        .speak-label { font-size: 22px; font-weight: 600; color: #6366f1; margin: 12px 0; }
        .speak-hint { font-size: 14px; color: #9ca3af; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .score-display { text-align: center; }
        .score-circle { width: 140px; height: 140px; border-radius: 50%; border: 8px solid; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .score-value { font-size: 36px; font-weight: 800; }
        .transcript-box { background: #f9fafb; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; text-align: left; }
        .transcript-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
        .transcript-text { font-size: 15px; color: #374151; font-style: italic; }
        .error-hint { font-size: 13px; color: #ef4444; margin-bottom: 12px; }
        .saving { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
        .score-buttons { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-retry { background: #f3f4f6; color: #374151; border: none; border-radius: 12px; padding: 14px 24px; font-size: 15px; cursor: pointer; }
        .btn-next { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; border-radius: 12px; padding: 14px 28px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .native-response { background: #f8fafc; border-radius: 12px; padding: 16px; border-left: 4px solid #6366f1; }
        .nr-label { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
        .nr-text { font-size: 18px; color: #374151; font-weight: 600; margin-bottom: 4px; }
        .nr-romaji { font-size: 13px; color: #9ca3af; }
        .shadowing-done { display: flex; align-items: center; justify-content: center; min-height: 80vh; }
        .done-card { background: white; border-radius: 24px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
        .done-icon { font-size: 64px; margin-bottom: 16px; }
        .done-stats { display: flex; gap: 24px; justify-content: center; margin: 24px 0; }
        .stat { text-align: center; }
        .stat-value { font-size: 20px; font-weight: 700; color: #6366f1; display: block; }
        .stat-label { font-size: 13px; color: #6b7280; }
        .btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 12px; padding: 16px 32px; font-size: 16px; cursor: pointer; width: 100%; }
        .xp-popup { position: fixed; top: 80px; right: 20px; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 14px; animation: fadeIn 0.3s; z-index: 100; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        .loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; color: #6b7280; font-size: 16px; gap: 12px; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
