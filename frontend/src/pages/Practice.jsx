import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, recordAudio, transcribeAudio, GROQ_API_KEY } from '../api'

export default function Practice() {
  const { phraseId } = useParams()
  const [phrase, setPhrase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [transcriptError, setTranscriptError] = useState('')
  const [rating, setRating] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [playingPhrase, setPlayingPhrase] = useState(false)

  useEffect(() => {
    loadPhrase()
  }, [phraseId])

  const loadPhrase = async () => {
    setLoading(true)
    try {
      // Find which lesson contains this phrase
      for (let day = 1; day <= 15; day++) {
        const data = await api.getLesson(day)
        const found = data.phrases.find(p => p.id === phraseId)
        if (found) {
          setPhrase(found)
          break
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const playPhrase = async () => {
    if (!phrase) return
    setPlayingPhrase(true)
    try {
      // Try Web Speech API first if Japanese voice available
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices()
        const jaVoice = voices.find(v => v.lang.startsWith('ja'))
        if (jaVoice) {
          const utterance = new SpeechSynthesisUtterance(phrase.japanese)
          utterance.lang = 'ja-JP'
          utterance.voice = jaVoice
          utterance.rate = 0.7
          utterance.onend = () => setPlayingPhrase(false)
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(utterance)
          return
        }
      }
      // Fallback: backend TTS
      const token = localStorage.getItem('langlearn_token')
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ text: phrase.japanese, voice: 'ja-JP-NanamiNeural' }),
      })
      if (res.ok) {
        const data = await res.json()
        const audio = new Audio(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${data.audio_url}`)
        audio.onended = () => setPlayingPhrase(false)
        await audio.play()
      } else {
        setPlayingPhrase(false)
      }
    } catch (err) {
      console.error('Play error:', err)
      setPlayingPhrase(false)
    }
  }

  const handleRecord = async () => {
    if (recording) return
    setTranscriptError('')
    setTranscription('')
    setAudioBlob(null)
    setRating(null)
    setSubmitted(false)

    try {
      setRecording(true)
      const blob = await recordAudio(3000)
      setAudioBlob(blob)

      // Try to transcribe with Groq
      if (GROQ_API_KEY) {
        try {
          const text = await transcribeAudio(blob)
          setTranscription(text)
        } catch (tErr) {
          setTranscriptError('翻譯失敗: ' + tErr.message)
        }
      } else {
        setTranscriptError('尚未設定 Groq API Key。請在 .env 設定 VITE_GROQ_API_KEY')
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setTranscriptError('請允許使用麥克風')
      } else {
        setTranscriptError('錄音失敗: ' + err.message)
      }
    } finally {
      setRecording(false)
    }
  }

  const handleRating = async (r) => {
    setRating(r)
    setSubmitted(true)
    try {
      await api.updateProgress(phraseId, r)
    } catch (err) {
      console.error('Progress update failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>加載中...</p>
      </div>
    )
  }

  if (!phrase) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center' }}>
          <p>找不到這個phrase</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
            返回首頁
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page">
        <div className="header" style={{ margin: -20, marginBottom: 16, borderRadius: 0 }}>
          <Link to="/" className="header-back">←</Link>
          <span className="header-title">🎤 練習發音</span>
          <div style={{ width: 40 }} />
        </div>

        <div className="practice-header">
          <div style={{ fontSize: 14, color: 'var(--text-light)' }}>
            跟著說：
          </div>
          <div className="practice-phrase">{phrase.japanese}</div>
          <div style={{ color: 'var(--lavender-dark)', fontSize: 16, fontStyle: 'italic' }}>
            {phrase.romaji}
          </div>
          <div style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 4 }}>
            {phrase.chinese}
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={playPhrase}
            disabled={playingPhrase}
          >
            {playingPhrase ? '🔊 播放中...' : '🔊 聽正確發音'}
          </button>
        </div>

        <div className="record-section">
          <button
            className={`record-btn${recording ? ' recording' : ''}`}
            onClick={handleRecord}
            disabled={recording}
          >
            {recording ? '🔴' : '🎤'}
          </button>
          <p style={{ marginTop: 12, color: 'var(--text-light)', fontSize: 14 }}>
            {recording ? '錄音中... 請說話' : '點擊錄製你的發音'}
          </p>
        </div>

        {transcriptError && (
          <div className="card" style={{ background: '#FFF3E0', borderLeft: '4px solid #FF9800' }}>
            <p style={{ fontSize: 13, color: '#E65100' }}>⚠️ {transcriptError}</p>
            {!GROQ_API_KEY && (
              <p style={{ fontSize: 12, color: '#E65100', marginTop: 8 }}>
                💡 需設定 Groq API Key 才能使用語音辨識。詳見 README.md。
              </p>
            )}
          </div>
        )}

        {transcription && (
          <div className="transcription-result">
            <div className="label">📝 你說的：</div>
            <div className="text">{transcription}</div>
          </div>
        )}

        {audioBlob && !submitted && (
          <div className="rating-section">
            <div className="rating-label">這個發音你觉得怎么样？</div>
            <div className="rating-buttons">
              <button className="rating-btn rating-1" onClick={() => handleRating(1)}>
                <span className="rating-emoji">😵</span>
                忘記了
              </button>
              <button className="rating-btn rating-2" onClick={() => handleRating(2)}>
                <span className="rating-emoji">🤔</span>
                有啲難
              </button>
              <button className="rating-btn rating-3" onClick={() => handleRating(3)}>
                <span className="rating-emoji">😊</span>
                正常
              </button>
              <button className="rating-btn rating-4" onClick={() => handleRating(4)}>
                <span className="rating-emoji">🤩</span>
                完美！
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div className="card" style={{ textAlign: 'center', background: 'var(--mint)', marginTop: 16 }}>
            <div style={{ fontSize: 32 }}>🎉</div>
            <p style={{ fontWeight: 700, marginTop: 8 }}>
              {rating >= 3 ? '太棒了！繼續加油！' : '繼續溫習，你會做得更好！'}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center' }}>
              <Link to="/" className="btn btn-secondary">
                🏠 返回首頁
              </Link>
              <Link
                to={`/lesson/${phrase.lesson_day}`}
                className="btn btn-primary"
              >
                繼續課程 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
