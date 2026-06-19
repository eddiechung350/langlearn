import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'

// Shadowing practice page
// Listen → Replay → Countdown → Speak → Score → Next
export default function Shadowing({ language = 'ja' }) {
  const { day } = useParams()
  const navigate = useNavigate()

  const [content, setContent] = useState(null)
  const [phrases, setPhrases] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [phase, setPhase] = useState('guide') // guide | listen | replay | countdown | speak | score | done
  const [countdown, setCountdown] = useState(5)
  const [score, setScore] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [streak, setStreak] = useState(0)
  const [xpTotal, setXpTotal] = useState(0)
  const [error, setError] = useState('')
  const [audioPlayed, setAudioPlayed] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // Milestone popup state
  const [milestone, setMilestone] = useState(null)

  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const countdownInterval = useRef(null)

  const LANG_MAP = { ja: 'ja-JP', fr: 'fr-FR', it: 'it-IT' }

  // Load content
  useEffect(() => {
    const lang = new URLSearchParams(window.location.search).get('lang') || 'ja'
    api.get(`/${lang}/day/${day || 1}`).then(d => {
      setContent(d)
      setPhrases(d.phrases || [])
      setLoading(false)
      // Show milestone if returning user completed this day before
      checkMilestone(lang, day || 1)
    }).catch(() => {
      api.get(`/${lang || 'ja'}/content`).then(d => {
        const dayData = (d.days || []).find(x => x.day === parseInt(day || 1))
        if (dayData) {
          setContent(dayData)
          setPhrases(dayData.phrases || [])
        }
        setLoading(false)
      })
    })
  }, [day, language])

  // Check if this is first time user is seeing this day
  const checkMilestone = (lang, dayNum) => {
    const key = `langlearn_day_${lang}_${dayNum}_seen`
    const completedKey = `langlearn_day_${lang}_${dayNum}_completed`
    if (!localStorage.getItem(key)) {
      // First time seeing this day
      localStorage.setItem(key, 'true')
      if (dayNum > 1 && !localStorage.getItem(completedKey)) {
        // Show "unlocked" milestone for day 2+
        setMilestone({
          type: 'unlock',
          day: dayNum,
          scene: phrases[0]?.scene_name || `Day ${dayNum}`
        })
      }
    }
  }

  const phrase = phrases[currentIdx]

  // Play TTS audio
  const playAudio = useCallback(() => {
    return new Promise((resolve) => {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const lang = new URLSearchParams(window.location.search).get('lang') || 'ja'
      const a = new Audio(`/api/tts/${lang}/${phrase.id}`)
      audioRef.current = a
      a.onended = () => {
        setAudioPlayed(true)
        resolve()
      }
      a.onerror = () => {
        setAudioPlayed(true)
        resolve()
      }
      a.play().catch(() => {
        setAudioPlayed(true)
        resolve()
      })
    })
  }, [phrase])

  // Start shadowing flow
  const startShadow = useCallback(async () => {
    if (!phrase) return
    setPhase('listen')
    setError('')
    setAudioPlayed(false)
    await playAudio()
    setPhase('replay')
  }, [phrase, playAudio])

  // Replay audio
  const handleReplay = async () => {
    setAudioPlayed(false)
    await playAudio()
    setPhase('replay')
  }

  // Start countdown then speak
  const startCountdown = useCallback(() => {
    setPhase('countdown')
    setCountdown(5)
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
  }, [])

  // Speech recognition
  useEffect(() => {
    if (phase !== 'speak') return

    setIsRecording(true)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('你的瀏覽器不支援語音識別')
      setIsRecording(false)
      setPhase('score')
      return
    }

    const recognition = new SR()
    recognitionRef.current = recognition
    const lang = new URLSearchParams(window.location.search).get('lang') || 'ja'
    recognition.lang = LANG_MAP[lang] || 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 3

    recognition.onresult = (event) => {
      const results = Array.from(event.results[0])
      const best = results[0].transcript
      setTranscript(best)
      const simScore = similarity(phrase.romaji || '', best)
      setScore(Math.round(simScore * 100))
      setIsRecording(false)
    }

    recognition.onerror = (e) => {
      setIsRecording(false)
      if (e.error !== 'no-speech') {
        setTranscript('(無語音識別結果)')
        setScore(0)
      }
    }

    recognition.onend = () => {
      setIsRecording(false)
      if (phase === 'speak') {
        setPhase('score')
      }
    }

    try {
      recognition.start()
    } catch (e) {
      setError('無法啟動語音識別')
      setIsRecording(false)
      setPhase('score')
    }

    return () => {
      setIsRecording(false)
      try { recognition.stop() } catch {}
    }
  }, [phase, phrase])

  // Save result
  const saveResult = useCallback(async (finalScore) => {
    setSaving(true)
    const sm2Rating = finalScore >= 85 ? 4 : finalScore >= 70 ? 3 : finalScore >= 50 ? 2 : 1
    try {
      const res = await api.post('/save-result', {
        phrase_id: phrase.id,
        language: phrase.language || 'ja',
        score: finalScore,
        rating: sm2Rating
      })
      if (res.xp_earned) {
        setXpEarned(prev => prev + res.xp_earned)
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
    if (phase === 'score' && score >= 0) {
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

  const handleNext = async () => {
    if (currentIdx < phrases.length - 1) {
      setCurrentIdx(i => i + 1)
      setPhase('listen')
      setScore(0)
      setTranscript('')
      setError('')
      setAudioPlayed(false)
    } else {
      // Day completed!
      const lang = new URLSearchParams(window.location.search).get('lang') || 'ja'
      localStorage.setItem(`langlearn_day_${lang}_${day}_completed`, 'true')
      setMilestone({
        type: 'complete',
        day: day,
        xp: xpTotal,
        streak: streak
      })
      setPhase('done')
    }
  }

  const handleRetry = () => {
    setPhase('listen')
    setScore(0)
    setTranscript('')
    setError('')
    setAudioPlayed(false)
    startShadow()
  }

  const handleSkip = () => {
    // Allow skip on 0 score - treat as 50% for learning purposes
    setScore(50)
    setTranscript('(已跳過)')
    setError('')
  }

  const handleDismissMilestone = () => {
    setMilestone(null)
  }

  const scoreColor = score >= 85 ? '#22c55e' : score >= 70 ? '#f59e0b' : score >= 50 ? '#f97316' : score >= 1 ? '#ef4444' : '#9ca3af'
  const xpColor = score >= 85 ? '🟢' : score >= 70 ? '🟡' : score >= 50 ? '🟠' : '🔴'

  if (loading) return <div className="loading"><div className="spinner" /> 載入中...</div>
  if (!phrase && phase !== 'done') return <div className="loading">無短語</div>

  // ========== FIRST-TIME GUIDE ==========
  if (phase === 'guide') {
    return (
      <div className="shadowing-page">
        <div className="guide-overlay" onClick={startShadow}>
          <div className="guide-card" onClick={e => e.stopPropagation()}>
            <div className="guide-icon">🎧</div>
            <h2>第一次學習？</h2>
            <div className="guide-steps">
              <div className="guide-step">
                <span className="step-num">1</span>
                <span>🔊 聽示範發音</span>
              </div>
              <div className="guide-step">
                <span className="step-num">2</span>
                <span>🔁 可隨時重播</span>
              </div>
              <div className="guide-step">
                <span className="step-num">3</span>
                <span>🎤 大聲朗讀</span>
              </div>
              <div className="guide-step">
                <span className="step-num">4</span>
                <span>📊 即時評分</span>
              </div>
            </div>
            <button className="guide-start-btn" onClick={startShadow}>
              知道了，開始！▶
            </button>
          </div>
        </div>
        <style>{guideStyles}</style>
      </div>
    )
  }

  // ========== DONE SCREEN ==========
  if (phase === 'done') {
    return (
      <div className="shadowing-page">
        <div className="shadowing-done">
          <div className="done-card">
            <div className="done-icon">🎉</div>
            <h2>完成！</h2>
            <p>完成 Day {day} · {phrases.length} 個短語</p>
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

        {/* Milestone celebration overlay */}
        {milestone && (
          <div className="milestone-overlay" onClick={handleDismissMilestone}>
            <div className="milestone-card" onClick={e => e.stopPropagation()}>
              <div className="milestone-icon">{milestone.type === 'complete' ? '🏆' : '🔓'}</div>
              {milestone.type === 'complete' ? (
                <>
                  <h2>Day {milestone.day} 完成！</h2>
                  <p>你今日學會了 {phrases.length} 個句子</p>
                  <div className="milestone-xp">+{milestone.xp} XP</div>
                </>
              ) : (
                <>
                  <h2>解鎖 Day {milestone.day}！</h2>
                  <p>{milestone.scene}</p>
                </>
              )}
              <button className="guide-start-btn" onClick={handleDismissMilestone}>
                太好了！
              </button>
            </div>
          </div>
        )}
        <style>{doneStyles}</style>
      </div>
    )
  }

  // ========== MAIN LEARNING INTERFACE ==========
  return (
    <div className="shadowing-page">
      {/* Milestone celebration overlay */}
      {milestone && (
        <div className="milestone-overlay" onClick={handleDismissMilestone}>
          <div className="milestone-card" onClick={e => e.stopPropagation()}>
            <div className="milestone-icon">{milestone.type === 'complete' ? '🏆' : '🔓'}</div>
            {milestone.type === 'complete' ? (
              <>
                <h2>Day {milestone.day} 完成！</h2>
                <p>你今日學會了 {phrases.length} 個句子</p>
                <div className="milestone-xp">+{xpTotal} XP</div>
              </>
            ) : (
              <>
                <h2>解鎖 Day {milestone.day}！</h2>
                <p>{milestone.scene}</p>
              </>
            )}
            <button className="guide-start-btn" onClick={handleDismissMilestone}>
              太好了！
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((currentIdx + 1) / phrases.length) * 100}%` }} />
        <span className="progress-text">Day {day} · {currentIdx + 1} / {phrases.length}</span>
      </div>

      {/* XP indicator */}
      {xpEarned > 0 && (
        <div className="xp-popup">+{xpEarned} XP {xpColor}</div>
      )}

      {/* Main card */}
      <div className="shadowing-card">
        {phrase && (
          <>
            <div className="phrase-native">
              {phrase.japanese}
            </div>
            <div className="phrase-romaji">
              {phrase.romaji}
            </div>
            <div className="phrase-chinese">
              {phrase.chinese}
            </div>
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
          <div className="listen-state">
            <div className="listen-icon">🔊</div>
            <div className="listen-label">播放中...</div>
          </div>
        )}

        {phase === 'replay' && (
          <div className="replay-state">
            <button className="btn-replay" onClick={handleReplay}>
              <span>🔊</span> 重聽一次
            </button>
            <button className="btn-start-speak" onClick={startCountdown}>
              ▶ 我讀了！
            </button>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="countdown-display">
            <div className="countdown-number">{countdown}</div>
            <div className="countdown-label">準備好了！</div>
          </div>
        )}

        {phase === 'speak' && (
          <div className="speak-display">
            <div className={`speak-pulse ${isRecording ? 'recording' : ''}`}>🎤</div>
            <div className="speak-label">大聲朗讀！</div>
            <div className="speak-hint">說完後自動評分</div>
          </div>
        )}

        {phase === 'score' && (
          <div className="score-display">
            <div className="score-circle" style={{ borderColor: scoreColor }}>
              <div className="score-value" style={{ color: scoreColor }}>
                {score > 0 ? `${score}%` : '?'}
              </div>
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
              {score === 0 && (
                <button className="btn-skip" onClick={handleSkip}>跳過 ✓</button>
              )}
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
        .listen-state { text-align: center; padding: 20px; }
        .listen-icon { font-size: 48px; animation: pulse 1s infinite; }
        .listen-label { font-size: 16px; color: #6b7280; margin-top: 8px; }
        .replay-state { display: flex; flex-direction: column; gap: 12px; align-items: center; }
        .btn-replay { background: #f3f4f6; color: #374151; border: 2px solid #e5e7eb; border-radius: 50px; padding: 14px 28px; font-size: 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .btn-replay:hover { border-color: #6366f1; background: #eef2ff; }
        .btn-start-speak { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 50px; padding: 16px 36px; font-size: 18px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .btn-start-speak:hover { transform: scale(1.05); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
        .countdown-display { text-align: center; }
        .countdown-number { font-size: 96px; font-weight: 800; color: #6366f1; animation: pulse 1s infinite; }
        .countdown-label { font-size: 20px; color: #6b7280; margin-top: 8px; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        .speak-display { text-align: center; }
        .speak-pulse { font-size: 64px; animation: bounce 1s infinite; }
        .speak-pulse.recording { animation: recordingPulse 0.5s infinite; }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes recordingPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.2);opacity:0.7} }
        .speak-label { font-size: 22px; font-weight: 600; color: #6366f1; margin: 12px 0; }
        .speak-hint { font-size: 14px; color: #9ca3af; }
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
        .btn-skip { background: #fef3c7; color: #92400e; border: none; border-radius: 12px; padding: 14px 24px; font-size: 15px; cursor: pointer; }
        .btn-next { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; border-radius: 12px; padding: 14px 28px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .native-response { background: #f8fafc; border-radius: 12px; padding: 16px; border-left: 4px solid #6366f1; }
        .nr-label { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
        .nr-text { font-size: 18px; color: #374151; font-weight: 600; margin-bottom: 4px; }
        .nr-romaji { font-size: 13px; color: #9ca3af; }
        .xp-popup { position: fixed; top: 80px; right: 20px; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 14px; animation: fadeIn 0.3s; z-index: 100; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        .loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; color: #6b7280; font-size: 16px; gap: 12px; }
        .spinner { width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}

const guideStyles = `
  .guide-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .guide-card { background: white; border-radius: 24px; padding: 36px 28px; max-width: 380px; width: 100%; text-align: center; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
  .guide-icon { font-size: 56px; margin-bottom: 16px; }
  .guide-card h2 { font-size: 24px; font-weight: 800; color: #1e1e2e; margin: 0 0 20px; }
  .guide-steps { text-align: left; margin-bottom: 28px; }
  .guide-step { display: flex; align-items: center; gap: 14px; padding: 12px 0; font-size: 16px; color: #374151; border-bottom: 1px solid #f3f4f6; }
  .guide-step:last-child { border-bottom: none; }
  .step-num { width: 28px; height: 28px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
  .guide-start-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 14px; padding: 16px 32px; font-size: 17px; font-weight: 700; cursor: pointer; width: 100%; transition: transform 0.2s; }
  .guide-start-btn:hover { transform: scale(1.03); }
`

const doneStyles = `
  .shadowing-done { display: flex; align-items: center; justify-content: center; min-height: 80vh; }
  .done-card { background: white; border-radius: 24px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); width: 100%; }
  .done-icon { font-size: 64px; margin-bottom: 16px; }
  .done-card h2 { font-size: 28px; font-weight: 800; color: #1e1e2e; margin: 0 0 8px; }
  .done-card p { font-size: 15px; color: #6b7280; margin: 0 0 24px; }
  .done-stats { display: flex; gap: 24px; justify-content: center; margin: 24px 0; }
  .stat { text-align: center; }
  .stat-value { font-size: 20px; font-weight: 700; color: #6366f1; display: block; }
  .stat-label { font-size: 13px; color: #6b7280; }
  .btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 12px; padding: 16px 32px; font-size: 16px; cursor: pointer; width: 100%; }
  .milestone-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .milestone-card { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 28px; padding: 40px 32px; max-width: 360px; width: 100%; text-align: center; color: white; animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes popIn { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
  .milestone-icon { font-size: 72px; margin-bottom: 16px; }
  .milestone-card h2 { font-size: 26px; font-weight: 800; margin: 0 0 10px; }
  .milestone-card p { font-size: 15px; opacity: 0.9; margin: 0 0 24px; }
  .milestone-xp { font-size: 32px; font-weight: 800; margin-bottom: 24px; }
`
