import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

// Review page - SM-2 spaced repetition practice
export default function Review() {
  const [phrases, setPhrases] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState('intro') // intro | listen | speak | score | done
  const [score, setScore] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [countdown, setCountdown] = useState(3)
  const [saving, setSaving] = useState(false)
  const [xpTotal, setXpTotal] = useState(0)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/review?limit=10').then(d => {
      setPhrases(d.phrases || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const phrase = phrases[currentIdx]
  const LANG_MAP = { ja: 'ja-JP', fr: 'fr-FR', it: 'it-IT' }

  // Play audio
  const playAudio = useCallback((url) => {
    return new Promise((resolve) => {
      const a = new Audio(url)
      a.onended = resolve
      a.onerror = resolve
      a.play().catch(resolve)
    })
  }, [])

  const startReview = useCallback(async () => {
    if (!phrase) return
    setPhase('listen')
    setError('')
    const audioUrl = `/api/tts/${phrase.language || 'ja'}/${phrase.id}`
    await playAudio(audioUrl)
    setPhase('countdown')
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval)
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
    if (!SR) { setError('不支援語音'); setPhase('score'); return }

    const recognition = new SR()
    recognition.lang = LANG_MAP[phrase?.language] || 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const best = event.results[0][0].transcript
      setTranscript(best)
      const sim = similarity(phrase.romaji || '', best)
      setScore(Math.round(sim * 100))
    }
    recognition.onerror = () => setTranscript('(無語音)')
    recognition.onend = () => { if (phase === 'speak') setPhase('score') }

    try { recognition.start() } catch { setError('無法啟動'); setPhase('score') }
    return () => { try { recognition.stop() } catch {} }
  }, [phase, phrase])

  // Save result
  useEffect(() => {
    if (phase === 'score' && score > 0) {
      setSaving(true)
      const rating = score >= 85 ? 4 : score >= 70 ? 3 : score >= 50 ? 2 : 1
      api.post('/save-result', {
        phrase_id: phrase.id,
        language: phrase.language || 'ja',
        score,
        rating
      }).then(res => {
        if (res.xp_earned) setXpTotal(t => t + res.xp_earned)
      }).catch(() => {})
      setSaving(false)
    }
  }, [phase, score, phrase])

  function similarity(a, b) {
    if (!a || !b) return 0
    const s1 = a.toLowerCase().replace(/[^a-z]/g, '')
    const s2 = b.toLowerCase().replace(/[^a-z]/g, '')
    if (!s1 || !s2) return 0
    if (s1 === s2) return 1
    const len1 = s1.length, len2 = s2.length
    const dp = Array.from({length: len1+1}, (_, i) => [i])
    for (let j = 0; j <= len2; j++) dp[0][j] = j
    for (let i = 1; i <= len1; i++)
      for (let j = 1; j <= len2; j++)
        dp[i][j] = s1[i-1] === s2[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return Math.max(0, 1 - dp[len1][len2] / Math.max(len1, len2))
  }

  const handleNext = () => {
    if (currentIdx < phrases.length - 1) {
      setCurrentIdx(i => i + 1)
      setPhase('intro')
      setScore(0)
      setTranscript('')
      setError('')
    } else {
      setPhase('done')
    }
  }

  const scoreColor = score >= 85 ? '#22c55e' : score >= 70 ? '#f59e0b' : '#ef4444'

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>

  if (phrases.length === 0) return (
    <div className="review-empty">
      <div className="empty-icon">🎉</div>
      <h2>沒有需要複習的句子</h2>
      <p>太棒了！所有句子都已經掌握。</p>
      <Link to="/" className="btn-back">返回首頁</Link>
    </div>
  )

  if (phase === 'done') return (
    <div className="review-done">
      <div className="done-icon">🎉</div>
      <h2>複習完成！</h2>
      <p>完成 {phrases.length} 句複習</p>
      <div className="done-xp">+{xpTotal} XP</div>
      <Link to="/" className="btn-back">返回首頁</Link>
    </div>
  )

  if (phase === 'intro') return (
    <div className="review-intro">
      <div className="intro-badge">🔁 複習模式</div>
      <h2>準備好複習了嗎？</h2>
      <p>有 {phrases.length} 句需要複習</p>
      <div className="intro-phrase">
        <div className="intro-native">{phrase.japanese}</div>
        <div className="intro-romaji">{phrase.romaji}</div>
      </div>
      <button className="btn-start" onClick={startReview}>開始 🔊</button>
    </div>
  )

  return (
    <div className="review-page">
      <div className="review-progress">{currentIdx + 1} / {phrases.length}</div>
      <div className="review-card">
        <div className="phrase-native">{phrase.japanese}</div>
        <div className="phrase-romaji">{phrase.romaji}</div>
        <div className="phrase-chinese">{phrase.chinese}</div>
      </div>

      {phase === 'listen' && <div className="phase-hint">🔊 請聆聽...</div>}
      {phase === 'countdown' && <div className="countdown">{countdown}</div>}
      {phase === 'speak' && <div className="speak-phase">🎤 請朗讀！</div>}
      {phase === 'score' && (
        <div className="score-phase">
          <div className="score-circle" style={{ borderColor: scoreColor }}>
            <div className="score-val" style={{ color: scoreColor }}>{score}%</div>
          </div>
          {transcript && <div className="transcript">你說的：{transcript}</div>}
          {saving && <div className="saving">儲存中...</div>}
          <div className="score-btns">
            <button className="btn-next" onClick={handleNext}>{currentIdx < phrases.length - 1 ? '下一句 →' : '完成 ✓'}</button>
          </div>
        </div>
      )}

      <style>{`
        .review-page { max-width: 640px; margin: 0 auto; padding: 20px; }
        .review-progress { text-align: center; font-size: 13px; color: #9ca3af; margin-bottom: 16px; }
        .review-card { background: white; border-radius: 20px; padding: 32px 24px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); margin-bottom: 24px; }
        .phrase-native { font-size: 26px; font-weight: 700; color: #1e1e2e; margin-bottom: 10px; }
        .phrase-romaji { font-size: 15px; color: #6b7280; margin-bottom: 8px; font-style: italic; }
        .phrase-chinese { font-size: 14px; color: #9ca3af; }
        .countdown { font-size: 96px; font-weight: 800; color: #6366f1; text-align: center; animation: pulse 1s infinite; }
        .speak-phase { font-size: 24px; color: #6366f1; text-align: center; animation: bounce 1s infinite; }
        .score-phase { text-align: center; }
        .score-circle { width: 120px; height: 120px; border-radius: 50%; border: 6px solid; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .score-val { font-size: 32px; font-weight: 800; }
        .transcript { font-size: 14px; color: #6b7280; font-style: italic; margin-bottom: 12px; }
        .saving { font-size: 13px; color: #9ca3af; margin-bottom: 12px; }
        .score-btns { display: flex; justify-content: center; }
        .btn-next { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; border-radius: 12px; padding: 14px 32px; font-size: 16px; cursor: pointer; }
        .phase-hint { text-align: center; color: #6b7280; font-size: 16px; }
        .review-intro, .review-empty, .review-done { max-width: 400px; margin: 80px auto; text-align: center; padding: 20px; }
        .intro-badge, .empty-icon, .done-icon { font-size: 48px; margin-bottom: 16px; }
        .intro-phrase { background: #f9fafb; border-radius: 16px; padding: 20px; margin: 20px 0; }
        .intro-native { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .intro-romaji { font-size: 14px; color: #6b7280; }
        .btn-start, .btn-back { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 12px; padding: 16px 32px; font-size: 16px; cursor: pointer; display: inline-block; text-decoration: none; margin-top: 16px; }
        .done-xp { font-size: 24px; font-weight: 700; color: #6366f1; margin: 12px 0; }
        .loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; color: #6b7280; gap: 12px; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
    </div>
  )
}
